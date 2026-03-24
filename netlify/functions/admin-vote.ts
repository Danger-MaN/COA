import { getStore } from '@netlify/blobs';

export const config = {
  path: '/admin-vote',
  method: 'POST'
};

export default async (req: Request) => {
  const { candidateId, votes, password } = await req.json();

  // التحقق من الرقم السري
  if (password !== 'Danger-MaN') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!candidateId || votes === undefined || isNaN(votes)) {
    return new Response(JSON.stringify({ error: 'Invalid data' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const store = getStore('votes');
    await store.set(candidateId, votes.toString());
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
