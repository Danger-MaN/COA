
import { getStore } from "@netlify/blobs";

export default async (req: Request) => {
  const url = new URL(req.url);
  const candidateId = url.searchParams.get("id");
  const action = url.searchParams.get("action"); // 'vote' أو 'undo' أو 'get'

  if (!candidateId) return new Response("Missing ID", { status: 400 });

  const store = getStore("candidate-votes");
  const currentVotes = (await store.get(candidateId, { type: "json" })) || 0;

  if (req.method === "POST") {
    let newVotes = currentVotes as number;
    if (action === "vote") {
      newVotes += 1;
    } else if (action === "undo") {
      newVotes = Math.max(0, newVotes - 1);
    }
    await store.set(candidateId, JSON.stringify(newVotes));
    return new Response(JSON.stringify({ votes: newVotes }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }

  // في حالة جلب البيانات فقط (GET)
  return new Response(JSON.stringify({ votes: currentVotes }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};
