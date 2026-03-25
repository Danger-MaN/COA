import { getStore } from "@netlify/blobs";
import { randomBytes } from "crypto";

// توليد معرف جلسة عشوائي
function generateSessionId(): string {
  return randomBytes(32).toString('hex');
}

// الحصول على IP العميل (مع مراعاة الـ proxy)
function getClientIP(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers.get('cf-connecting-ip') || 'unknown';
}

export default async (req: Request) => {
  const url = new URL(req.url);
  const candidateId = url.searchParams.get("id");
  const action = url.searchParams.get("action");

  // التحقق من وجود candidateId
  if (req.method === "POST" && !candidateId) {
    return new Response("Missing ID", { status: 400 });
  }

  const votesStore = getStore("candidate-votes");
  const sessionsStore = getStore("sessions");
  
  // جلب/إنشاء معرف الجلسة من الكوكيز
  let sessionId: string;
  const cookieHeader = req.headers.get("cookie");
  let existingSession = false;
  
  if (cookieHeader) {
    const match = cookieHeader.match(/sessionId=([^;]+)/);
    if (match) {
      sessionId = match[1];
      existingSession = true;
    }
  }
  
  if (!existingSession) {
    sessionId = generateSessionId();
  }
  
  // جلب IP العميل
  const clientIP = getClientIP(req);
  
  // تخزين IP آخر مرة للجلسة (للتحقق)
  const sessionKey = `session:${sessionId}`;
  let sessionData: any = null;
  try {
    const stored = await sessionsStore.get(sessionKey, { type: "json" });
    if (stored) sessionData = stored;
  } catch (e) { /* ignore */ }
  
  // التحقق من تطابق IP (لمنع سرقة الجلسة)
  if (sessionData && sessionData.ip !== clientIP && existingSession) {
    // IP غير مطابق، نعتبر أنها محاولة اختراق ونرفض
    return new Response(
      JSON.stringify({ error: "session_mismatch" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }
  
  // تحديث بيانات الجلسة إذا كانت جديدة أو IP تغير
  if (!sessionData || sessionData.ip !== clientIP) {
    sessionData = {
      ip: clientIP,
      votes: sessionData?.votes || {},
      createdAt: sessionData?.createdAt || Date.now()
    };
    await sessionsStore.set(sessionKey, JSON.stringify(sessionData));
  }
  
  // دالة مساعدة لإنشاء رد مع الكوكيز
  function createResponse(data: any, status = 200, setSessionCookie = !existingSession) {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (setSessionCookie) {
      headers["Set-Cookie"] = `sessionId=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 365}`;
    }
    return new Response(JSON.stringify(data), { status, headers });
  }
  
  // GET: جلب الأصوات
  if (req.method === "GET") {
    if (candidateId) {
      const votes = await votesStore.get(candidateId, { type: "json" }) || 0;
      return createResponse({ votes }, 200, false);
    } else {
      // جلب جميع الأصوات
      const allKeys = await votesStore.list();
      const votesMap: Record<string, number> = {};
      for (const key of allKeys) {
        const val = await votesStore.get(key, { type: "json" }) || 0;
        votesMap[key] = val;
      }
      return createResponse(votesMap, 200, false);
    }
  }
  
  // POST: تحديث الأصوات (تصويت أو تراجع)
  if (req.method === "POST") {
    if (!candidateId || !action) {
      return createResponse({ error: "Missing id or action" }, 400);
    }
    
    const gender = candidateId.startsWith('m-') ? 'male' : 'female';
    const voteKey = `${gender}:${sessionId}`;
    
    // جلب حالة التصويت لهذه الجلسة
    let userVote = sessionData.votes?.[voteKey] || null;
    
    if (action === "vote") {
      // التحقق من وجود تصويت سابق
      if (userVote) {
        return createResponse({ error: "already_voted" }, 403);
      }
      
      // تحديث عدد الأصوات
      let currentVotes = await votesStore.get(candidateId, { type: "json" }) || 0;
      currentVotes += 1;
      await votesStore.set(candidateId, JSON.stringify(currentVotes));
      
      // تسجيل التصويت في الجلسة
      if (!sessionData.votes) sessionData.votes = {};
      sessionData.votes[voteKey] = {
        candidateId,
        timestamp: Date.now()
      };
      await sessionsStore.set(sessionKey, JSON.stringify(sessionData));
      
      return createResponse({ votes: currentVotes }, 200);
    }
    
    if (action === "undo") {
      // التحقق من وجود تصويت لهذا المرشح
      if (!userVote || userVote.candidateId !== candidateId) {
        return createResponse({ error: "no_vote_to_undo" }, 403);
      }
      
      // التحقق من مرور ساعة
      const elapsed = (Date.now() - userVote.timestamp) / 1000;
      if (elapsed < 3600) {
        const minutesLeft = Math.floor((3600 - elapsed) / 60);
        const secondsLeft = Math.floor((3600 - elapsed) % 60);
        return createResponse({ 
          error: "cooldown", 
          minutesLeft, 
          secondsLeft 
        }, 403);
      }
      
      // تحديث عدد الأصوات
      let currentVotes = await votesStore.get(candidateId, { type: "json" }) || 0;
      if (currentVotes > 0) currentVotes -= 1;
      await votesStore.set(candidateId, JSON.stringify(currentVotes));
      
      // إزالة سجل التصويت من الجلسة
      delete sessionData.votes[voteKey];
      await sessionsStore.set(sessionKey, JSON.stringify(sessionData));
      
      return createResponse({ votes: currentVotes }, 200);
    }
    
    if (action === "set") {
      // إجراء خاص بالأدمن
      const { value, password } = await req.json();
      if (password !== "Danger-MaN") {
        return createResponse({ error: "Unauthorized" }, 401);
      }
      if (typeof value !== "number" || isNaN(value)) {
        return createResponse({ error: "Invalid value" }, 400);
      }
      await votesStore.set(candidateId, JSON.stringify(value));
      return createResponse({ votes: value }, 200);
    }
    
    return createResponse({ error: "Invalid action" }, 400);
  }
  
  return createResponse({ error: "Method not allowed" }, 405);
};
