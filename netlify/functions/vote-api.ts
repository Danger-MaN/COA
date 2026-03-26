import { getStore } from "@netlify/blobs";

// ===== إعدادات المدة الزمنية (بالساعات) =====
const VOTE_BLOCK_HOURS = 24;
const UNDO_COOLDOWN_HOURS = 1;
// ============================================
const VOTE_BLOCK_DURATION = VOTE_BLOCK_HOURS * 3600;
const UNDO_COOLDOWN_DURATION = UNDO_COOLDOWN_HOURS * 3600;

// ===== إعدادات التحقق =====
const ENABLE_COUNTRY_CHECK = false;   // تفعيل/تعطيل فحص الدولة
const ENABLE_PROXY_CHECK = true;      // تفعيل/تعطيل فحص VPN/بروكسي عبر IPQualityScore
// ==========================

// 🔑 ضع مفتاح API الخاص بك هنا (احصل عليه من ipqualityscore.com)
const IPQS_API_KEY = "eg1ysGyj3T9rlaCxmUkw8MmJtdQ0XZWK";  // استبدل هذا بالمفتاح الحقيقي

// قائمة الدول المسموحة (احتياطي)
const ALLOWED_COUNTRIES = new Set([
  'SA', 'AE', 'KW', 'QA', 'BH', 'OM',
  'EG', 'JO', 'LB', 'PS', 'SY', 'IQ',
  'LY', 'TN', 'DZ', 'MA', 'MR', 'SD',
  'YE', 'SO', 'DJ',
  'TR', 'IR', 'PK', 'AF',
]);

// ==================== دوال استخراج IP ====================
function getRealIp(req: Request): string {
  const headers = [
    'x-forwarded-for',
    'x-real-ip',
    'cf-connecting-ip',
    'fastly-client-ip',
    'x-original-forwarded-for',
    'true-client-ip'
  ];
  
  for (const header of headers) {
    const value = req.headers.get(header);
    if (value && value.trim() !== '') {
      const ips = value.split(',').map(ip => ip.trim());
      for (const ip of ips) {
        if (!isPrivateIp(ip) && ip !== 'unknown') {
          return ip;
        }
      }
      return ips[0];
    }
  }
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function isPrivateIp(ip: string): boolean {
  if (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') return true;
  const parts = ip.split('.');
  if (parts.length === 4) {
    const first = parseInt(parts[0], 10);
    const second = parseInt(parts[1], 10);
    if (first === 10) return true;
    if (first === 172 && second >= 16 && second <= 31) return true;
    if (first === 192 && second === 168) return true;
    if (first === 127) return true;
    if (first === 169 && second === 254) return true;
  }
  return false;
}
// =======================================================

// فحص الدولة (غير مستخدم حاليًا)
async function getUserCountry(ip: string): Promise<{ country: string | null; allowed: boolean; message?: string }> {
  if (!ENABLE_COUNTRY_CHECK) return { country: null, allowed: true };
  try {
    const response = await fetch(`https://ipinfo.io/${ip}/json`);
    if (!response.ok) {
      console.error(`IPinfo API error: ${response.status}`);
      return { country: null, allowed: true };
    }
    const data = await response.json();
    const country = data.country;
    if (!country) return { country: null, allowed: true };
    const allowed = ALLOWED_COUNTRIES.has(country);
    const countryName = data.country_name || country;
    return {
      country,
      allowed,
      //message: allowed ? undefined : `التصويت مقتصر على دول الشرق الأوسط فقط. دولتك: ${countryName}`
      message: allowed ? undefined : 'لا يمكنك التصويت في الوقت الحالي'
    };
  } catch (error) {
    console.error('Error checking user country:', error);
    return { country: null, allowed: true };
  }
}

// فحص VPN باستخدام IPQualityScore (المفتاح مكتوب داخل الكود)
async function isProxyOrVpnWithIpqs(ip: string): Promise<boolean> {
  if (!ENABLE_PROXY_CHECK) return false;
  // التحقق من أن المفتاح موجود وليس السلسلة التوجيهية
  if (!IPQS_API_KEY || IPQS_API_KEY === "ضع_المفتاح_هنا") {
    console.warn('IPQS_API_KEY not set or still placeholder, proxy check disabled');
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
    console.log(`IPQS result for ${ip}:`, JSON.stringify(data));

    if (!data.success) {
      console.warn(`IPQS API returned success=false for ${ip}`);
      return false;
    }
    
    // نمنع أي IP يُصنف كـ proxy, vpn, tor, أو درجة احتيال عالية
    // سنمنع أيضاً إذا كانت risk_score > 0 أو fraud_score > 0 (لأقصى حماية)
    const isProxy = data.proxy === true;
    const isVpn = data.vpn === true;
    const isTor = data.tor === true;
    const isFraud = data.fraud_score > 0;     // أي درجة احتيال > 0 تعتبر مشبوهة
    const isHighRisk = data.risk_score > 0;   // أي درجة مخاطرة > 0 تعتبر مشبوهة

    // إذا كانت البيانات لا تحتوي على هذه الحقول، نمنع بشكل افتراضي؟ لا، فقط نمنع إذا تم تحديدها
    const isSuspicious = isProxy || isVpn || isTor || isFraud || isHighRisk;
    
    if (isSuspicious) {
      console.log(`IP ${ip} blocked because: proxy=${isProxy}, vpn=${isVpn}, tor=${isTor}, fraud_score=${data.fraud_score}, risk_score=${data.risk_score}`);
    }
    return isSuspicious;
  } catch (error) {
    console.error('Error checking proxy with IPQS:', error);
    return false; // في حالة الخطأ، نسمح (يمكن تغيير إلى true لمنع كل التصويت عند فشل API)
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

  if (!candidateId) {
    return new Response("Missing ID", { status: 400 });
  }

  const gender = candidateId.startsWith('m-') ? 'male' : 'female';
  const ipKey = getIpKey(req, gender);
  const realIp = getRealIp(req);

  // التحقق من التصويت فقط
  if (action === 'vote') {
    // 1. فحص الدولة (إذا كان مفعلاً)
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
    return new Response(
      JSON.stringify({ votes: currentVotes }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  if (req.method === "POST") {
    let newVotes = currentVotes as number;

    if (action === "vote") {
      const ipVoted = await ipStore.get(ipKey);
      if (ipVoted) {
        return new Response(
          JSON.stringify({ error: "ip_voted" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }
      newVotes += 1;
      await ipStore.set(ipKey, JSON.stringify({
        timestamp: Date.now(),
        candidateId,
        gender
      }), { ttl: VOTE_BLOCK_DURATION });
    } 
    else if (action === "undo") {
      const ipRecord = await ipStore.get(ipKey);
      if (!ipRecord) {
        return new Response(
          JSON.stringify({ error: "no_vote_to_undo" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }
      const record = JSON.parse(ipRecord);
      if (record.candidateId !== candidateId) {
        return new Response(
          JSON.stringify({ error: "wrong_candidate" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }
      const elapsed = (Date.now() - record.timestamp) / 1000;
      if (elapsed < UNDO_COOLDOWN_DURATION) {
        const minutesLeft = Math.floor((UNDO_COOLDOWN_DURATION - elapsed) / 60);
        const secondsLeft = Math.floor((UNDO_COOLDOWN_DURATION - elapsed) % 60);
        return new Response(
          JSON.stringify({ error: "cooldown", minutesLeft, secondsLeft }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }
      newVotes = Math.max(0, newVotes - 1);
      await ipStore.delete(ipKey);
    } 
    else if (action === "set") {
      const { value, password } = await req.json();
      if (password !== "Danger-MaN") {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
      }
      if (typeof value !== "number" || isNaN(value)) {
        return new Response(JSON.stringify({ error: "Invalid value" }), { status: 400 });
      }
      newVotes = value;
    } 
    else {
      return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400 });
    }

    await store.set(candidateId, JSON.stringify(newVotes));
    return new Response(
      JSON.stringify({ votes: newVotes }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response("Method not allowed", { status: 405 });
};
