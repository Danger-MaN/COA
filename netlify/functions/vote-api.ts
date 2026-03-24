import { getStore } from "@netlify/blobs";

export default async (req: Request) => {
  const url = new URL(req.url);
  const candidateId = url.searchParams.get("id");
  const action = url.searchParams.get("action"); // 'vote', 'undo', أو 'set'

  if (!candidateId) {
    return new Response("Missing ID", { status: 400 });
  }

  const store = getStore("candidate-votes");
  let currentVotes = (await store.get(candidateId, { type: "json" })) || 0;

  if (req.method === "POST") {
    let newVotes = currentVotes as number;

    if (action === "vote") {
      newVotes += 1;
    } else if (action === "undo") {
      newVotes = Math.max(0, newVotes - 1);
    } else if (action === "set") {
      // إجراء خاص بالأدمن: نقرأ القيمة والرقم السري من جسم الطلب
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

  // GET: جلب الأصوات الحالية
  return new Response(
    JSON.stringify({ votes: currentVotes }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};
