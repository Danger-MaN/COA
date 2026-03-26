import { getStore } from "@netlify/blobs";

// ===== إعدادات المدة الزمنية (بالساعات) =====
const VOTE_BLOCK_HOURS = 24;    // ساعات منع التصويت المتكرر (1 = ساعة، 24 = يوم)
const UNDO_COOLDOWN_HOURS = 1;  // ساعات الانتظار قبل السماح بالتراجع
// ============================================

// ===== إعدادات الأمان =====
const ENABLE_COUNTRY_FILTER = true;   // تشغيل/إيقاف فلترة الدول (true = تشغيل)
const ENABLE_FINGERPRINT = true;      // تشغيل/إيقاف استخدام بصمة المتصفح
// ==========================

// تحويل الساعات إلى ثواني
const VOTE_BLOCK_DURATION = VOTE_BLOCK_HOURS * 3600;
const UNDO_COOLDOWN_DURATION = UNDO_COOLDOWN_HOURS * 3600;

// قائمة الدول المسموحة في الشرق الأوسط والعالم العربي
const ALLOWED_COUNTRIES = new Set([
  'SA', 'AE', 'KW', 'QA', 'BH', 'OM',
  'EG', 'JO', 'LB', 'PS', 'SY', 'IQ',
  'LY', 'TN', 'DZ', 'MA', 'MR', 'SD',
  'YE', 'SO', 'DJ',
  'TR', 'IR', 'PK', 'AF',
]);

// دالة لاستخراج IP الحقيقي
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

// دالة للتحقق من موقع المستخدم باستخدام IPinfo
async function getUserCountry(ip: string): Promise<{ country: string | null; allowed: boolean; message?: string }> {
  try {
    const response = await fetch(`https://ipinfo.io/${ip}/json`, {
      headers: {
        // يمكنك إضافة مفتاح API إذا كان لديك لزيادة الحدود
        // 'Authorization': 'Bearer your_token'
      }
    });
    
    if (!response.ok) {
      console.error(`IPinfo API error: ${response.status}`);
      return { country: null, allowed: true };
    }
    
    const data = await response.json();
    const country = data.country;
    
    if (!country) {
      return { country: null, allowed: true };
    }
    
    const allowed = ALLOWED_COUNTRIES.has(country);
    const countryName = data.country_name || country;
    
    return {
      country,
      allowed,
      message: allowed ? undefined : `التصويت مقتصر على دول الشرق الأوسط فقط. دولتك: ${countryName}`
    };
  } catch (error) {
    console.error('Error checking user country:', error);
    return { country: null, allowed: true };
  }
}

// دالة للتحقق من وجود بروكسي أو VPN
async function isProxyOrVpn(ip: string): Promise<boolean> {
  try {
    const response = await fetch(`https://ipinfo.io/${ip}/json`);
    const data = await response.json();
    
    return data.privacy?.vpn === true || 
           data.privacy?.proxy === true || 
           data.privacy?.tor === true ||
           data.hosting === true;
  } catch (error) {
    console.error('Error checking proxy:', error);
    return false;
  }
}

// دالة لتوليد مفتاح الزائر (IP + بصمة)
function getVisitorKey(req: Request, gender: string, fingerprint?: string): string {
  const ip = getRealIp(req);
  if (ENABLE_FINGERPRINT && fingerprint) {
    return `visitor:${ip}:${fingerprint}:${gender}`;
  }
  return `visitor:${ip}:${gender}`;
}

export default async (req: Request) => {
  const url = new URL(req.url);
  const candidateId = url.searchParams.get("id");
  const action = url.searchParams.get("action");

  if (!candidateId) {
    return new Response("Missing ID", { status: 400 });
  }

  const gender = candidateId.startsWith('m-') ? 'male' : 'female';
  const realIp = getRealIp(req);

  // التحقق من موقع المستخدم (للتصويت فقط، إذا كانت الفلترة مفعلة)
  if (action === 'vote' && ENABLE_COUNTRY_FILTER) {
    const { allowed, country, message } = await getUserCountry(realIp);
    if (!allowed) {
      return new Response(
        JSON.stringify({ 
          error: "country_not_allowed", 
          country,
          message: message || "التصويت مقتصر على دول الشرق الأوسط فقط"
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
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
    // قراءة جسم الطلب لاستخراج البصمة
    let body: any = {};
    try {
      body = await req.json();
    } catch (e) {
      // إذا لم يكن هناك جسم صالح، نستمر بدون بصمة
    }
    const fingerprint = body.fingerprint;
    const visitorKey = getVisitorKey(req, gender, fingerprint);
    
    let newVotes = currentVotes as number;

    if (action === "vote") {
      const existing = await ipStore.get(visitorKey);
      if (existing) {
        return new Response(
          JSON.stringify({ error: "ip_voted" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }
      
      newVotes += 1;
      await ipStore.set(visitorKey, JSON.stringify({
        timestamp: Date.now(),
        candidateId,
        gender
      }), { ttl: VOTE_BLOCK_DURATION });
      
    } else if (action === "undo") {
      const record = await ipStore.get(visitorKey);
      if (!record) {
        return new Response(
          JSON.stringify({ error: "no_vote_to_undo" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }
      
      const voteData = JSON.parse(record);
      if (voteData.candidateId !== candidateId) {
        return new Response(
          JSON.stringify({ error: "wrong_candidate" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }
      
      const elapsed = (Date.now() - voteData.timestamp) / 1000;
      if (elapsed < UNDO_COOLDOWN_DURATION) {
        const minutesLeft = Math.floor((UNDO_COOLDOWN_DURATION - elapsed) / 60);
        const secondsLeft = Math.floor((UNDO_COOLDOWN_DURATION - elapsed) % 60);
        return new Response(
          JSON.stringify({ error: "cooldown", minutesLeft, secondsLeft }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }
      
      newVotes = Math.max(0, newVotes - 1);
      await ipStore.delete(visitorKey);
      
    } else if (action === "set") {
      const { value, password } = body;
      if (password !== "Danger-MaN") {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
      }
      if (typeof value !== "number" || isNaN(value)) {
        return new Response(JSON.stringify({ error: "Invalid value" }), { status: 400 });
      }
      newVotes = value;
    } else {
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
