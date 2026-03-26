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

// دالة لاستخراج IP الحقيقي (كما هي)
function getRealIp(req: Request): string { /* ... */ }
function isPrivateIp(ip: string): boolean { /* ... */ }

// دالة للتحقق من الدولة (كما هي)
async function getUserCountry(ip: string): Promise<{ country: string | null; allowed: boolean; message?: string }> { /* ... */ }

// دالة لتوليد مفتاح الزائر (IP + Fingerprint)
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

  // التحقق من موقع المستخدم (إذا كانت الفلترة مفعلة)
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

  if (req.method === "GET") {
    return new Response(JSON.stringify({ votes: currentVotes }), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  if (req.method === "POST") {
    let body: any = {};
    try {
      body = await req.json();
    } catch (e) {}
    const fingerprint = body.fingerprint;
    const visitorKey = getVisitorKey(req, gender, fingerprint);
    let newVotes = currentVotes as number;

    if (action === "vote") {
      const existing = await ipStore.get(visitorKey);
      if (existing) {
        return new Response(JSON.stringify({ error: "ip_voted" }), { status: 403, headers: { "Content-Type": "application/json" } });
      }
      newVotes += 1;
      await ipStore.set(visitorKey, JSON.stringify({ timestamp: Date.now(), candidateId, gender }), { ttl: VOTE_BLOCK_DURATION });
    } else if (action === "undo") {
      const record = await ipStore.get(visitorKey);
      if (!record) {
        return new Response(JSON.stringify({ error: "no_vote_to_undo" }), { status: 403, headers: { "Content-Type": "application/json" } });
      }
      const data = JSON.parse(record);
      if (data.candidateId !== candidateId) {
        return new Response(JSON.stringify({ error: "wrong_candidate" }), { status: 403, headers: { "Content-Type": "application/json" } });
      }
      const elapsed = (Date.now() - data.timestamp) / 1000;
      if (elapsed < UNDO_COOLDOWN_DURATION) {
        const minutesLeft = Math.floor((UNDO_COOLDOWN_DURATION - elapsed) / 60);
        const secondsLeft = Math.floor((UNDO_COOLDOWN_DURATION - elapsed) % 60);
        return new Response(JSON.stringify({ error: "cooldown", minutesLeft, secondsLeft }), { status: 403, headers: { "Content-Type": "application/json" } });
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
    return new Response(JSON.stringify({ votes: newVotes }), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  return new Response("Method not allowed", { status: 405 });
};
