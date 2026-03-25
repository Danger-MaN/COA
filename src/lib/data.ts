// ... الكود السابق كما هو ...

/* ── دوال جديدة تعتمد على السيرفر فقط ── */

export async function checkIfVoted(gender: Gender): Promise<{ hasVoted: boolean; candidateId: string | null; cooldown?: { minutes: number; seconds: number } }> {
  // هذه الدالة ستستدعي API مخصص للتحقق من حالة IP
  try {
    const response = await fetch(`/.netlify/functions/check-vote?gender=${gender}`);
    const data = await response.json();
    return data;
  } catch {
    return { hasVoted: false, candidateId: null };
  }
}

export async function castVoteServer(candidateId: string, gender: Gender): Promise<{ success: boolean; votes?: number; error?: string; cooldown?: { minutes: number; seconds: number } }> {
  try {
    const response = await fetch(`/.netlify/functions/vote-api?id=${candidateId}&action=vote`, {
      method: 'POST'
    });
    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.error, cooldown: data.cooldown };
    }
    return { success: true, votes: data.votes };
  } catch {
    return { success: false, error: 'network_error' };
  }
}

export async function undoVoteServer(candidateId: string, gender: Gender): Promise<{ success: boolean; votes?: number; error?: string; cooldown?: { minutes: number; seconds: number } }> {
  try {
    const response = await fetch(`/.netlify/functions/vote-api?id=${candidateId}&action=undo`, {
      method: 'POST'
    });
    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.error, cooldown: data.cooldown };
    }
    return { success: true, votes: data.votes };
  } catch {
    return { success: false, error: 'network_error' };
  }
}

// إزالة الدوال القديمة (hasVoted, getVotedCandidateId, castVote, undoVote) أو تركها للتوافق مع إظهار أنها deprecated
