// داخل ملف VotingPage.tsx
import { getCandidatesLive, Candidate, Gender } from '@/lib/data'; // استبدل الدالة القديمة بـ getCandidatesLive

// داخل المكون:
const [candidatesList, setCandidatesList] = useState<Candidate[]>([]);

useEffect(() => {
  getCandidatesLive(validGender).then(setCandidatesList);
}, [validGender, refreshKey]);

// في جزء الـ Map:
{candidatesList.map((c, i) => (
  <CandidateCard
    key={`${c.id}-${refreshKey}`}
    candidate={c}
    lang={lang}
    rank={i} // الترتيب الآن صحيح وحي
    // ... بقية الـ Props
  />
))}
