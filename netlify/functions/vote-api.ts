import { getStore } from "@netlify/blobs";

// ===== إعدادات المدة الزمنية (بالساعات) =====
const VOTE_BLOCK_HOURS = 24;
const UNDO_COOLDOWN_HOURS = 1;
// ============================================

// ===== إعدادات الأمان =====
const ENABLE_COUNTRY_FILTER = true;
const ENABLE_FINGERPRINT = true;
// ==========================

const VOTE_BLOCK_DURATION = VOTE_BLOCK_HOURS * 3600;
const UNDO_COOLDOWN_DURATION = UNDO_COOLDOWN_HOURS * 3600;

const ALLOWED_COUNTRIES = new Set([...]);

function getRealIp(req: Request): string { /* ... */ }
function isPrivateIp(ip: string): boolean { /* ... */ }
async function getUserCountry(ip: string): Promise<{ country: string | null; allowed: boolean; message?: string }> { /* ... */ }

function getIpKey(req: Request, gender: string): string {
  const ip = getRealIp(req);
  return `ip:${ip}:${gender}`;
}

function getFpKey(req: Request, gender: string, fingerprint?: string): string | null {
  if (!ENABLE_FINGERPRINT || !fingerprint) return null;
  return `fp:${fingerprint}:${gender}`;
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

  // فلترة الدول
  if (action === 'vote' && ENABLE_COUNTRY_FILTER) {
    const { allowed, country, message } = await getUserCountry(realIp);
    if (!allowed) {
      return new Response(JSON.stringify({ error: "country_not_allowed", country, message }), { status: 403 });
    }
  }

  const store = getStore("candidate-votes");
  const ipStore = getStore("voter-ips");
  let currentVotes = (await store.get(candidateId, { type: "json" })) || 0;

  if (req.method === "GET") {
    return new Response(JSON.stringify({ votes: currentVotes }), { status: 200 });
  }

  if (req.method === "POST") {
    let body: any = {};
    try {
      body = await req.json();
    } catch (e) {
      console.error("Failed to parse JSON body:", e);
    }
    const fingerprint = body.fingerprint;
    const ipKey = getIpKey(req, gender);
    const fpKey = getFpKey(req, gender, fingerprint);
    let newVotes = currentVotes as number;

    try {
      if (action === "vote") {
        const existingIp = await ipStore.get(ipKey);
        const existingFp = fpKey ? await ipStore.get(fpKey) : null;
        if (existingIp || existingFp) {
          return new Response(JSON.stringify({ error: "already_voted" }), { status: 403 });
        }

        newVotes += 1;
        const voteData = JSON.stringify({ timestamp: Date.now(), candidateId, gender });

        await ipStore.set(ipKey, voteData, { ttl: VOTE_BLOCK_DURATION });
        if (fpKey) {
          await ipStore.set(fpKey, voteData, { ttl: VOTE_BLOCK_DURATION });
        }
      } 
      else if (action === "undo") {
        let record = null;
        if (fpKey) record = await ipStore.get(fpKey);
        if (!record) record = await ipStore.get(ipKey);
        if (!record) {
          return new Response(JSON.stringify({ error: "no_vote_to_undo" }), { status: 403 });
        }

        const voteData = JSON.parse(record);
        if (voteData.candidateId !== candidateId) {
          return new Response(JSON.stringify({ error: "wrong_candidate" }), { status: 403 });
        }

        const elapsed = (Date.now() - voteData.timestamp) / 1000;
        if (elapsed < UNDO_COOLDOWN_DURATION) {
          const minutesLeft = Math.floor((UNDO_COOLDOWN_DURATION - elapsed) / 60);
          const secondsLeft = Math.floor((UNDO_COOLDOWN_DURATION - elapsed) % 60);
          return new Response(JSON.stringify({ error: "cooldown", minutesLeft, secondsLeft }), { status: 403 });
        }

        newVotes = Math.max(0, newVotes - 1);
        await ipStore.delete(ipKey);
        if (fpKey) await ipStore.delete(fpKey);
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
      return new Response(JSON.stringify({ votes: newVotes }), { status: 200 });
    } catch (err) {
      console.error("Error in vote/undo logic:", err);
      return new Response(JSON.stringify({ error: "server_error", details: err.message }), { status: 500 });
    }
  }

  return new Response("Method not allowed", { status: 405 });
};
