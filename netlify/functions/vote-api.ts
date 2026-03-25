import { getStore } from "@netlify/blobs";

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

// التحقق من أن IP ليس بروكسي أو VPN باستخدام IPinfo
async function isProxyOrVpn(ip: string): Promise<boolean> {
  try {
    // يمكنك استخدام IPinfo.io أو ipapi.co
    const response = await fetch(`https://ipinfo.io/${ip}/json`, {
      headers: {
        // إذا كان لديك مفتاح API، أضفه هنا
        // 'Authorization': 'Bearer your_token'
      }
    });
    const data = await response.json();
    
    // التحقق من وجود بروكسي أو VPN (حسب البيانات التي يعيدها IPinfo)
    return data.privacy?.vpn === true || 
           data.privacy?.proxy === true || 
           data.privacy?.tor === true ||
           data.hosting === true;
  } catch (error) {
    console.error('Error checking proxy:', error);
    return false; // في حالة الخطأ، نسمح بالتصويت (أو يمكنك رفضه)
  }
}

// دالة لتوليد مفتاح IP
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

  // التحقق من أن IP ليس بروكسي (اختياري - يمكن تفعيله)
  // const isProxy = await isProxyOrVpn(realIp);
  // if (isProxy && action === 'vote') {
  //   return new Response(JSON.stringify({ error: "proxy_detected", message: "VPN/Proxy not allowed" }), { status: 403 });
  // }

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
      }), { ttl: 3600 });
      
    } else if (action === "undo") {
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
      if (elapsed < 3600) {
        const minutesLeft = Math.floor((3600 - elapsed) / 60);
        const secondsLeft = Math.floor((3600 - elapsed) % 60);
        return new Response(
          JSON.stringify({ error: "cooldown", minutesLeft, secondsLeft }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }
      
      newVotes = Math.max(0, newVotes - 1);
      await ipStore.delete(ipKey);
      
    } else if (action === "set") {
      const { value, password } = await req.json();
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
