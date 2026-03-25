import { getStore } from "@netlify/blobs";

// دالة لتوليد مفتاح الجلسة بناءً على IP + نوع التصويت
function getIpKey(req: Request, gender: string): string {
  const ip = req.headers.get('x-forwarded-for') || 
             req.headers.get('x-real-ip') || 
             'unknown';
  // نأخذ أول IP إذا كان هناك عدة IPs (مثل x-forwarded-for: client, proxy1, proxy2)
  const firstIp = ip.split(',')[0].trim();
  return `ip:${firstIp}:${gender}`;
}

export default async (req: Request) => {
  const url = new URL(req.url);
  const candidateId = url.searchParams.get("id");
  const action = url.searchParams.get("action"); // 'vote', 'undo', أو 'set'

  if (!candidateId) {
    return new Response("Missing ID", { status: 400 });
  }

  // استخراج الجنس من المعرف (m- أو f-)
  const gender = candidateId.startsWith('m-') ? 'male' : 'female';
  const ipKey = getIpKey(req, gender);

  const store = getStore("candidate-votes");
  const ipStore = getStore("voter-ips"); // لتخزين عناوين IP التي صوّتت

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
    let newVotes = currentVotes as number;

    if (action === "vote") {
      // التحقق: هل هذا IP صوّت بالفعل لهذا الجنس؟
      const ipVoted = await ipStore.get(ipKey);
      if (ipVoted) {
        return new Response(
          JSON.stringify({ 
            error: "ip_voted", 
            message: "You have already voted from this device/network" 
          }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }
      
      newVotes += 1;
      
      // تسجيل IP مع وقت التصويت (تنتهي تلقائياً بعد ساعة)
      await ipStore.set(ipKey, JSON.stringify({
        timestamp: Date.now(),
        candidateId,
        gender
      }), { ttl: 3600 }); // تنتهي تلقائياً بعد ساعة
      
    } else if (action === "undo") {
      // التحقق: هل هذا IP صوّت لنفس المرشح؟
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
      
      // التحقق من مرور ساعة
      const elapsed = (Date.now() - record.timestamp) / 1000;
      if (elapsed < 3600) {
        const minutesLeft = Math.floor((3600 - elapsed) / 60);
        const secondsLeft = Math.floor((3600 - elapsed) % 60);
        return new Response(
          JSON.stringify({ 
            error: "cooldown", 
            minutesLeft, 
            secondsLeft,
            message: `Please wait ${minutesLeft} minutes and ${secondsLeft} seconds before undoing`
          }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }
      
      newVotes = Math.max(0, newVotes - 1);
      
      // حذف سجل IP
      await ipStore.delete(ipKey);
      
    } else if (action === "set") {
      // إجراء خاص بالأدمن
      const { value, password } = await req.json();
      if (password !== "Danger-MaN") {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }
      if (typeof value !== "number" || isNaN(value)) {
        return new Response(
          JSON.stringify({ error: "Invalid value" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      newVotes = value;
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid action" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    await store.set(candidateId, JSON.stringify(newVotes));
    return new Response(
      JSON.stringify({ votes: newVotes }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response("Method not allowed", { status: 405 });
};
