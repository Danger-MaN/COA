import { getStore } from "@netlify/blobs";

// ===== إعدادات المدة الزمنية (بالساعات) =====
const VOTE_BLOCK_HOURS = 24;
const UNDO_COOLDOWN_HOURS = 1;
// ============================================

// ===== إعدادات الأمان =====
const ENABLE_COUNTRY_FILTER = true;   // تشغيل/إيقاف فلترة الدول
const ENABLE_FINGERPRINT = true;      // تشغيل/إيقاف استخدام بصمة المتصفح
// ==========================

const VOTE_BLOCK_DURATION = VOTE_BLOCK_HOURS * 3600;
const UNDO_COOLDOWN_DURATION = UNDO_COOLDOWN_HOURS * 3600;

// قائمة الدول المسموحة
const ALLOWED_COUNTRIES = new Set([
  'SA', 'AE', 'KW', 'QA', 'BH', 'OM',
  'EG', 'JO', 'LB', 'PS', 'SY', 'IQ',
  'LY', 'TN', 'DZ', 'MA', 'MR', 'SD',
  'YE', 'SO', 'DJ',
  'TR', 'IR', 'PK', 'AF',
]);

// --- دوال استخراج IP ---
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

// --- دوال البصمة ---
function getFpKey(req: Request, gender: string, fingerprint?: string): string | null {
  if (!ENABLE_FINGERPRINT || !fingerprint) return null;
  return `fp:${fingerprint}:${gender}`;
}

function getIpKey(req: Request, gender: string): string {
  const ip = getRealIp(req);
  return `ip:${ip}:${gender}`;
}

// --- دوال التحقق من الدولة ---
async function getUserCountry(ip: string): Promise<{ country: string | null; allowed: boolean; message?: string }> {
  try {
    const response = await fetch(`https://ipinfo.io/${ip}/json`);
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

// --- الوظيفة الرئيسية ---
export default async (req: Request) => {
  const url = new URL(req.url);
  const candidateId = url.searchParams.get("id");
  const action = url.searchParams.get("action");

  if (!candidateId) {
    return new Response("Missing ID", { status: 400 });
  }

  const gender = candidateId.startsWith('m-') ? 'male' : 'female';
  const realIp = getRealIp(req);

  // فلترة الدول (للتصويت فقط)
  if (action === 'vote' && ENABLE_COUNTRY_FILTER) {
    const { allowed, country, message } = await getUserCountry(realIp);
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: "country_not_allowed", country, message }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  const store = getStore("candidate-votes");
  const ipStore = getStore("voter-ips");
  let currentVotes = (await store.get(candidateId, { type: "json" })) || 0;

  // GET: جلب الأصوات الحالية
  if (req.method === "GET") {
    return new Response(
      JSON.stringify({ votes: currentVotes }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // POST: تحديث الأصوات
  if (req.method === "POST") {
    // قراءة جسم الطلب لاستخراج البصمة
    let body: any = {};
    try {
      body = await req.json();
    } catch (e) {}
    const fingerprint = body.fingerprint;
    const ipKey = getIpKey(req, gender);
    const fpKey = getFpKey(req, gender, fingerprint);
    let newVotes = currentVotes as number;

    if (action === "vote") {
      // التحقق من وجود أي قيد سابق (IP أو بصمة)
      const existingIp = await ipStore.get(ipKey);
      const existingFp = fpKey ? await ipStore.get(fpKey) : null;
      if (existingIp || existingFp) {
        return new Response(
          JSON.stringify({ error: "already_voted" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }

      newVotes += 1;
      const voteData = JSON.stringify({ timestamp: Date.now(), candidateId, gender });

      // تخزين السجل تحت كلا المفتاحين (إذا كان fpKey موجوداً)
      await ipStore.set(ipKey, voteData, { ttl: VOTE_BLOCK_DURATION });
      if (fpKey) {
        await ipStore.set(fpKey, voteData, { ttl: VOTE_BLOCK_DURATION });
      }
    } 
    else if (action === "undo") {
      // البحث عن السجل: أولاً بالبصمة، ثم بالـ IP
      let record = null;
      let usedKey = null;
      if (fpKey) {
        record = await ipStore.get(fpKey);
        if (record) usedKey = fpKey;
      }
      if (!record) {
        record = await ipStore.get(ipKey);
        if (record) usedKey = ipKey;
      }
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

      // حذف السجل من كلا المفتاحين
      await ipStore.delete(ipKey);
      if (fpKey) {
        await ipStore.delete(fpKey);
      }
    } 
    else if (action === "set") {
      const { value, password } = body;
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
