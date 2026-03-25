import { getStore } from "@netlify/blobs";

export default async (req: Request) => {
  const url = new URL(req.url);
  const gender = url.searchParams.get("gender");
  
  if (!gender || !['male', 'female'].includes(gender)) {
    return new Response(JSON.stringify({ error: "Invalid gender" }), { status: 400 });
  }
  
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || 
             req.headers.get("client-ip") || 
             "unknown";
  
  const ipStore = getStore("voter-ips");
  const ipKey = `${ip}:${gender}`;
  
  const existingVote = await ipStore.get(ipKey);
  
  if (!existingVote) {
    return new Response(
      JSON.stringify({ hasVoted: false, candidateId: null }),
      { headers: { "Content-Type": "application/json" } }
    );
  }
  
  const record = JSON.parse(existingVote);
  const elapsed = (Date.now() - record.timestamp) / 1000;
  
  if (elapsed >= 3600) {
    // انتهت الساعة، نحذف السجل
    await ipStore.delete(ipKey);
    return new Response(
      JSON.stringify({ hasVoted: false, candidateId: null }),
      { headers: { "Content-Type": "application/json" } }
    );
  }
  
  const minutesLeft = Math.floor((3600 - elapsed) / 60);
  const secondsLeft = Math.floor((3600 - elapsed) % 60);
  
  return new Response(
    JSON.stringify({ 
      hasVoted: true, 
      candidateId: record.candidateId,
      cooldown: { minutes: minutesLeft, seconds: secondsLeft }
    }),
    { headers: { "Content-Type": "application/json" } }
  );
};
