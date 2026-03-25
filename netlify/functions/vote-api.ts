import { getStore } from "@netlify/blobs";

// دوال مساعدة
function getClientIP(req: Request): string {
  const xForwardedFor = req.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  return req.headers.get('x-real-ip') || 'unknown';
}

function generateSessionId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export default async (req: Request) => {
  const url = new URL(req.url);
  const candidateId = url.searchParams.get("id");
  const action = url.searchParams.get("action");

  // استرجاع الجنس من المعرف
  const gender = candidateId?.startsWith('m-') ? 'male' : candidateId?.startsWith('f-') ? 'female' : null;
  
  // الحصول على IP العميل
  const clientIP = getClientIP(req);
  
  // الحصول على sessionId من الكوكيز
  const cookieHeader = req.headers.get('cookie') || '';
  let sessionId = cookieHeader.match(/sessionId=([^;]+)/)?.[1] || null;
  
  // إذا لم يوجد sessionId، ننشئ واحدًا جديدًا
  const isNewSession = !sessionId;
  if (!sessionId) {
    sessionId = generateSessionId();
  }

  const votesStore = getStore("candidate-votes");
  const sessionsStore = getStore("vote-sessions");

  // GET: جلب الأصوات
  if (req.method === "GET") {
    if (candidateId) {
      const votes = await votesStore.get(candidateId, { type: "json" });
      return new Response(
        JSON.stringify({ votes: votes || 0 }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Set-Cookie": isNewSession ? `sessionId=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 365}` : ''
          }
        }
      );
    } else {
      // جلب كل الأصوات (للإدارة)
      const allKeys = await votesStore.list();
      const votesMap: Record<string, number> = {};
      for (const key of allKeys) {
        const val = await votesStore.get(key, { type: "json" });
        votesMap[key] = val || 0;
      }
      return new Response(
        JSON.stringify(votesMap),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Set-Cookie": isNewSession ? `sessionId=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 365}` : ''
          }
        }
      );
    }
  }

  // POST: تصويت أو تراجع
  if (req.method === "POST") {
    if (!candidateId || !action || !gender) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // جلب حالة الجلسة للمستخدم لهذا الجنس
    const sessionKey = `${sessionId}:${gender}`;
    const existingVote = await sessionsStore.get(sessionKey, { type: "json" }) as { 
      candidateId: string; 
      timestamp: number;
      ip: string;
    } | null;

    if (action === "vote") {
      // التحقق من عدم وجود تصويت سابق
      if (existingVote) {
        return new Response(
          JSON.stringify({ error: "already_voted", message: "You have already voted in this category" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }

      // تحديث عدد الأصوات
      let currentVotes = (await votesStore.get(candidateId, { type: "json" })) || 0;
      currentVotes += 1;
      await votesStore.set(candidateId, currentVotes);

      // تخزين حالة التصويت مع IP ووقت التصويت
      await sessionsStore.set(sessionKey, JSON.stringify({
        candidateId,
        timestamp: Date.now(),
        ip: clientIP
      }));

      return new Response(
        JSON.stringify({ success: true, votes: currentVotes }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Set-Cookie": `sessionId=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 365}`
          }
        }
      );
    } 
    else if (action === "undo") {
      // التحقق من وجود تصويت سابق
      if (!existingVote) {
        return new Response(
          JSON.stringify({ error: "no_vote_to_undo", message: "No vote to undo" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }

      // التحقق من أن المستخدم هو صاحب التصويت (عن طريق IP)
      if (existingVote.ip !== clientIP) {
        return new Response(
          JSON.stringify({ error: "unauthorized", message: "You can only undo your own vote" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }

      // التحقق من مرور ساعة على الأقل
      const elapsed = (Date.now() - existingVote.timestamp) / 1000;
      if (elapsed < 3600) {
        const minutesLeft = Math.floor((3600 - elapsed) / 60);
        const secondsLeft = Math.floor((3600 - elapsed) % 60);
        return new Response(
          JSON.stringify({ 
            error: "cooldown", 
            message: "You can only undo after one hour",
            minutesLeft,
            secondsLeft
          }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }

      // التحقق من أن التصويت هو لنفس المرشح
      if (existingVote.candidateId !== candidateId) {
        return new Response(
          JSON.stringify({ error: "wrong_candidate", message: "You voted for a different candidate" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }

      // تحديث عدد الأصوات
      let currentVotes = (await votesStore.get(candidateId, { type: "json" })) || 0;
      if (currentVotes > 0) currentVotes -= 1;
      await votesStore.set(candidateId, currentVotes);

      // حذف حالة التصويت
      await sessionsStore.delete(sessionKey);

      return new Response(
        JSON.stringify({ success: true, votes: currentVotes }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    else if (action === "set" && candidateId === "admin") {
      // إجراء خاص بالأدمن (تعديل الأصوات يدويًا)
      const { value, password } = await req.json();
      if (password !== "Danger-MaN") {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }
      // هنا يمكن إضافة منطق لتعديل الأصوات لمرشح محدد
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ error: "Method not allowed" }),
    { status: 405, headers: { "Content-Type": "application/json" } }
  );
};
