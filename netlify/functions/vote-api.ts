import { getStore } from "@netlify/blobs";

export default async (req: Request) => {
  const url = new URL(req.url);
  const candidateId = url.searchParams.get("id");
  const action = url.searchParams.get("action"); // 'vote', 'undo'

  if (!candidateId) {
    return new Response("Missing ID", { status: 400 });
  }

  // الحصول على عنوان IP الخاص بالزائر
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || 
             req.headers.get("client-ip") || 
             "unknown";
  
  // استخدام مخازن منفصلة
  const votesStore = getStore("candidate-votes");
  const ipStore = getStore("voter-ips");
  
  // جلب الأصوات الحالية للمرشح
  let currentVotes = (await votesStore.get(candidateId, { type: "json" })) || 0;

  // جلب الجنس من الـ candidateId (يبدأ بـ m- أو f-)
  const gender = candidateId.startsWith("m-") ? "male" : "female";
  const ipKey = `${ip}:${gender}`; // مفتاح فريد لكل IP + جنس

  if (req.method === "POST") {
    // التحقق من وجود IP في السجل (لنفس الجنس)
    const existingVote = await ipStore.get(ipKey);
    
    if (action === "vote") {
      if (existingVote) {
        const record = JSON.parse(existingVote);
        const elapsed = (Date.now() - record.timestamp) / 1000;
        if (elapsed < 3600) {
          // لا يزال في فترة التهدئة
          const minutesLeft = Math.floor((3600 - elapsed) / 60);
          const secondsLeft = Math.floor((3600 - elapsed) % 60);
          return new Response(
            JSON.stringify({ 
              error: "cooldown", 
              message: `لا يمكن التصويت مرة أخرى إلا بعد ساعة. الوقت المتبقي: ${minutesLeft} دقيقة ${secondsLeft} ثانية`,
              minutesLeft,
              secondsLeft
            }),
            { status: 403, headers: { "Content-Type": "application/json" } }
          );
        } else {
          // انتهت الساعة، نحذف السجل القديم ونسمح بالتصويت
          await ipStore.delete(ipKey);
        }
      }
      
      // تسجيل التصويت
      const newVotes = (currentVotes as number) + 1;
      await votesStore.set(candidateId, JSON.stringify(newVotes));
      
      // تسجيل IP مع وقت التصويت
      await ipStore.set(ipKey, JSON.stringify({ 
        candidateId, 
        timestamp: Date.now(),
        gender 
      }));
      
      return new Response(
        JSON.stringify({ votes: newVotes, success: true }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
      
    } else if (action === "undo") {
      if (!existingVote) {
        return new Response(
          JSON.stringify({ error: "no_vote_to_undo", message: "لا يوجد تصويت سابق لهذا الجهاز" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }
      
      const record = JSON.parse(existingVote);
      const elapsed = (Date.now() - record.timestamp) / 1000;
      
      // التحقق من مرور ساعة
      if (elapsed < 3600) {
        const minutesLeft = Math.floor((3600 - elapsed) / 60);
        const secondsLeft = Math.floor((3600 - elapsed) % 60);
        return new Response(
          JSON.stringify({ 
            error: "cooldown", 
            message: `لا يمكن التراجع إلا بعد ساعة. الوقت المتبقي: ${minutesLeft} دقيقة ${secondsLeft} ثانية`,
            minutesLeft,
            secondsLeft
          }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }
      
      // التراجع عن التصويت
      let newVotes = (currentVotes as number) - 1;
      if (newVotes < 0) newVotes = 0;
      await votesStore.set(candidateId, JSON.stringify(newVotes));
      
      // حذف سجل IP
      await ipStore.delete(ipKey);
      
      return new Response(
        JSON.stringify({ votes: newVotes, success: true }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    
    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // GET: جلب الأصوات الحالية
  return new Response(
    JSON.stringify({ votes: currentVotes }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};
