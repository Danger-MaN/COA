import { getStore } from "@netlify/blobs";

// ===== إعدادات المدة الزمنية (بالساعات) =====
const VOTE_BLOCK_HOURS = 24;
const UNDO_COOLDOWN_HOURS = 1;
// ============================================
const VOTE_BLOCK_DURATION = VOTE_BLOCK_HOURS * 3600;
const UNDO_COOLDOWN_DURATION = UNDO_COOLDOWN_HOURS * 3600;

// ===== إعدادات التحقق =====
const ENABLE_COUNTRY_CHECK = false;   // تفعيل/تعطيل فحص الدولة
const ENABLE_PROXY_CHECK = true;      // تفعيل/تعطيل فحص VPN/بروكسي
// ==========================

// مفتاح IPQualityScore (يفضل وضعه في متغيرات البيئة)
// يمكنك تعيينه هنا مباشرة للتجربة، لكن في الإنتاج استخدم process.env
const IPQS_API_KEY = process.env.IPQS_API_KEY || "eg1ysGyj3T9rlaCxmUkw8MmJtdQ0XZWK"; // ضع المفتاح هنا إذا أردت التجربة

// قائمة الدول المسموحة (إن أردت استخدامها)
const ALLOWED_COUNTRIES = new Set([
  'SA','AE','KW','QA','BH','OM',
  'EG','JO','LB','PS','SY','IQ',
  'LY','TN','DZ','MA','MR','SD',
  'YE','SO','DJ',
  'TR','IR','PK','AF',
]);

// دوال استخراج IP (نفس السابق)
function getRealIp(req: Request): string { ... } // احتفظ بها كما هي
function isPrivateIp(ip: string): boolean { ... }

// فحص الدولة (مثل السابق)
async function getUserCountry(ip: string): Promise<{ country: string | null; allowed: boolean; message?: string }> {
  if (!ENABLE_COUNTRY_CHECK) return { country: null, allowed: true };
  // ... الكود كما هو
}

// فحص VPN باستخدام IPQualityScore
async function isProxyOrVpnWithIpqs(ip: string): Promise<boolean> {
  if (!ENABLE_PROXY_CHECK) return false;
  if (!IPQS_API_KEY) {
    console.warn('IPQS_API_KEY not set, proxy check disabled');
    return false;
  }
  try {
    const url = `https://ipqualityscore.com/api/json/ip/${IPQS_API_KEY}/${ip}`;
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`IPQS API error: ${response.status}`);
      return false;
    }
    const data = await response.json();
    console.log(`IPQS result for ${ip}:`, data); // لتتبع النتائج في Netlify logs

    if (!data.success) {
      console.warn(`IPQS API returned success=false for ${ip}`);
      return false;
    }

    // نقبل أي من المؤشرات التالية كـ "بروكسي أو VPN"
    const isProxy = data.proxy === true;
    const isVpn = data.vpn === true;
    const isTor = data.tor === true;
    const isFraud = data.fraud_score > 75;  // درجة احتيال عالية

    // يمكننا أيضاً منع الـ IP إذا كان risk_score عالي
    const isHighRisk = data.risk_score > 75;

    return isProxy || isVpn || isTor || isFraud || isHighRisk;
  } catch (error) {
    console.error('Error checking proxy with IPQS:', error);
    return false; // في حالة الخطأ، نسمح بالتصويت (أو يمكننا الرفض)
  }
}

function getIpKey(req: Request, gender: string): string {
  const realIp = getRealIp(req);
  return `ip:${realIp}:${gender}`;
}

export default async (req: Request) => {
  const url = new URL(req.url);
  const candidateId = url.searchParams.get("id");
  const action = url.searchParams.get("action");

  if (!candidateId) return new Response("Missing ID", { status: 400 });

  const gender = candidateId.startsWith('m-') ? 'male' : 'female';
  const ipKey = getIpKey(req, gender);
  const realIp = getRealIp(req);

  if (action === 'vote') {
    // 1. فحص الدولة (إن كان مفعلاً)
    if (ENABLE_COUNTRY_CHECK) {
      const { allowed, message } = await getUserCountry(realIp);
      if (!allowed) {
        return new Response(
          JSON.stringify({ error: "country_not_allowed", message: message || "لا يمكنك التصويت في الوقت الحالي" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // 2. فحص VPN/بروكسي
    if (ENABLE_PROXY_CHECK) {
      const isProxy = await isProxyOrVpnWithIpqs(realIp);
      if (isProxy) {
        return new Response(
          JSON.stringify({ error: "proxy_vpn_detected", message: "لا يمكن التصويت باستخدام VPN أو بروكسي" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }
    }
  }

  const store = getStore("candidate-votes");
  const ipStore = getStore("voter-ips");
  let currentVotes = (await store.get(candidateId, { type: "json" })) || 0;

  if (req.method === "GET") {
    return new Response(JSON.stringify({ votes: currentVotes }), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  if (req.method === "POST") {
    let newVotes = currentVotes;

    if (action === "vote") {
      const ipVoted = await ipStore.get(ipKey);
      if (ipVoted) {
        return new Response(JSON.stringify({ error: "ip_voted" }), { status: 403, headers: { "Content-Type": "application/json" } });
      }
      newVotes += 1;
      await ipStore.set(ipKey, JSON.stringify({ timestamp: Date.now(), candidateId, gender }), { ttl: VOTE_BLOCK_DURATION });
    } 
    else if (action === "undo") {
      const ipRecord = await ipStore.get(ipKey);
      if (!ipRecord) {
        return new Response(JSON.stringify({ error: "no_vote_to_undo" }), { status: 403 });
      }
      const record = JSON.parse(ipRecord);
      if (record.candidateId !== candidateId) {
        return new Response(JSON.stringify({ error: "wrong_candidate" }), { status: 403 });
      }
      const elapsed = (Date.now() - record.timestamp) / 1000;
      if (elapsed < UNDO_COOLDOWN_DURATION) {
        const minutesLeft = Math.floor((UNDO_COOLDOWN_DURATION - elapsed) / 60);
        const secondsLeft = Math.floor((UNDO_COOLDOWN_DURATION - elapsed) % 60);
        return new Response(JSON.stringify({ error: "cooldown", minutesLeft, secondsLeft }), { status: 403 });
      }
      newVotes = Math.max(0, newVotes - 1);
      await ipStore.delete(ipKey);
    } 
    else if (action === "set") {
      const { value, password } = await req.json();
      if (password !== "Danger-MaN") return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
      if (typeof value !== "number" || isNaN(value)) return new Response(JSON.stringify({ error: "Invalid value" }), { status: 400 });
      newVotes = value;
    } else {
      return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400 });
    }

    await store.set(candidateId, JSON.stringify(newVotes));
    return new Response(JSON.stringify({ votes: newVotes }), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  return new Response("Method not allowed", { status: 405 });
};
