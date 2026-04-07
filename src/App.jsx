import { useState, useEffect, useRef, useCallback } from "react";

// ─── Constants ───────────────────────────────────────────────
const MODES = {
  quick:    { label:"Quick Practice", q:15, secs:1080, tag:"15 Questions · 18 Minutes" },
  standard: { label:"Standard Test",  q:30, secs:2160, tag:"30 Questions · 36 Minutes" },
  full:     { label:"Full Mock Test", q:50, secs:3600, tag:"50 Questions · 60 Minutes" },
};
// Per-combination token ceilings — no explanations in generation (lazy on review)
// Haiku = 120 tokens/sec, AbortController = 25s = 3000 tokens max safe ceiling
const MAX_TOKENS = {
  quick:    { easy:1600, medium:2000, hard:2500 },
  standard: { easy:1600, medium:2000, hard:2500 }, // per 15Q split-half
  full:     { easy:2000, medium:2400, hard:2900 }, // per 17Q split-third
};
const DIFFS = {
  easy:   { label:"Easy",   color:"#16a34a", bg:"#dcfce7", desc:"Simple vocab, direct questions" },
  medium: { label:"Medium", color:"#d97706", bg:"#fef3c7", desc:"Moderate inference required" },
  hard:   { label:"Hard",   color:"#dc2626", bg:"#fee2e2", desc:"GRE-level, complex passages" },
};
const TOPICS = {
  reading_comprehension:  { label:"Reading Comprehension", abbr:"RC", color:"#2563eb" },
  synonyms_antonyms:      { label:"Synonyms & Antonyms",   abbr:"SA", color:"#7c3aed" },
  choose_correct_word:    { label:"Choose Correct Word",   abbr:"CW", color:"#059669" },
  sentence_rearrangement: { label:"Sentence Rearrangement",abbr:"SR", color:"#b45309" },
  match_following:        { label:"Match the Following",   abbr:"MF", color:"#dc2626" },
  vocabulary_grammar:     { label:"Vocabulary & Grammar",  abbr:"VG", color:"#db2777" },
};
const QS = {
  not_visited:     { bg:"#ffffff", border:"#9ca3af", text:"#374151" },
  not_answered:    { bg:"#fca5a5", border:"#dc2626", text:"#7f1d1d" },
  answered:        { bg:"#86efac", border:"#16a34a", text:"#14532d" },
  review:          { bg:"#c4b5fd", border:"#7c3aed", text:"#4c1d95" },
  answered_review: { bg:"#7c3aed", border:"#5b21b6", text:"#ffffff" },
};
const TIPS = [
  "Attempt Reading Comprehension first — it carries the highest weight in CUET English (101).",
  "For synonyms/antonyms, eliminate two obviously wrong options first, then choose between the remaining two.",
  "In sentence rearrangement, the opening sentence never begins with a pronoun or a conjunction.",
  "CUET deducts 1 mark per wrong answer. If you are unsure, skip it — unattempted costs 0.",
  "For fill-in-the-blank, always read the full sentence before selecting. Context decides.",
  "Factual RC passages have direct answers. Literary passages require inference from tone and implication.",
  "Mark for Review if you have a strong instinct — return after finishing all confident questions.",
  "Target 1.2 minutes per question. 50 questions, 60 minutes — every second matters.",
];

// ─── Prompt builders ─────────────────────────────────────────
function buildTestPrompt(mode, diff) {
  const d = {
    quick:    { rc:[1,4],  sa:4,  cw:3,  sr:2, mf:0, vg:2 },
    standard: { rc:[2,10], sa:6,  cw:7,  sr:4, mf:2, vg:1 },
  }[mode];
  const total = MODES[mode].q;
  const ptypes = ["factual","narrative","literary"].slice(0,d.rc[0]).join(", ");
  const ddesc = { easy:"simple vocabulary, direct factual questions, straightforward inference", medium:"moderate vocabulary above Class 12 level, some inference required, plausible distractors", hard:"advanced GRE-level vocabulary, complex literary passages, abstract inference, highly plausible distractors" }[diff];
  return `You are a senior CUET UG English (101) paper setter for the National Testing Agency (NTA), India. Create a complete practice test.

Difficulty: ${diff} — ${ddesc}
Total: exactly ${total} questions

Distribution:
- Reading Comprehension: ${d.rc[0]} passage(s), ${d.rc[1]} questions. Types: ${ptypes}. Each passage 120-150 words, original, information-dense.
- Synonyms & Antonyms: ${d.sa} questions — alternate between SYNONYM and ANTONYM tasks
- Choose Correct Word: ${d.cw} fill-in-the-blank sentences, one blank each
- Sentence Rearrangement: ${d.sr} questions — show sentences as P/Q/R/S individually, options are 4 distinct orderings like PQRS, QPSR, etc.
${d.mf>0?`- Match the Following: ${d.mf} questions — Column A (4 items) + Column B (4 items), 4 match-combination options`:""}
- Vocabulary & Grammar: ${d.vg} question(s) — error spotting, idiom meaning, or correct usage

RULES:
1. Exactly ${total} questions total
2. Every question: exactly 4 options A, B, C, D — exactly one correct answer
3. All distractors must be plausible — no obviously wrong options
4. Passages go in a separate "passages" array — questions use passage_id only, never repeat passage text
5. Do NOT include an explanation field in any question

Return ONLY valid JSON, no markdown fences, no commentary:
{"passages":[{"id":"P1","type":"factual","text":"..."}],"questions":[{"id":1,"topic":"reading_comprehension","passage_id":"P1","question":"...","options":{"A":"...","B":"...","C":"...","D":"..."},"correct":"A"}]}`;
}

function buildSplitPrompt(diff, part, count) {
  // part: "first"(17Q) | "second"(17Q) | "third"(16Q) — for Full Mock 3-way split
  const ddesc = { easy:"simple vocabulary, direct factual questions, straightforward inference", medium:"moderate vocabulary above Class 12 level, some inference required, plausible distractors", hard:"advanced GRE-level vocabulary, complex literary passages, abstract inference, highly plausible distractors" }[diff];
  const dist = part==="first"
    ? `- Reading Comprehension: 1 passage (factual, 120-150 words), 3 questions\n- Synonyms & Antonyms: 3 questions (mix SYNONYM/ANTONYM)\n- Choose Correct Word: 3 fill-in-the-blank\n- Sentence Rearrangement: 2 questions (P/Q/R/S format)\n- Match the Following: 1 question\n- Vocabulary & Grammar: 1 question`
    : part==="second"
    ? `- Reading Comprehension: 1 passage (narrative, 120-150 words), 3 questions\n- Synonyms & Antonyms: 3 questions (mix SYNONYM/ANTONYM)\n- Choose Correct Word: 3 fill-in-the-blank\n- Sentence Rearrangement: 2 questions (P/Q/R/S format)\n- Match the Following: 1 question\n- Vocabulary & Grammar: 1 question`
    : part==="third"
    ? `- Reading Comprehension: 1 passage (literary, 120-150 words), 3 questions\n- Synonyms & Antonyms: 2 questions (mix SYNONYM/ANTONYM)\n- Choose Correct Word: 3 fill-in-the-blank\n- Sentence Rearrangement: 2 questions (P/Q/R/S format)\n- Match the Following: 1 question\n- Vocabulary & Grammar: 1 question`
    : `- Synonyms & Antonyms: 4 questions (mix SYNONYM/ANTONYM)\n- Choose Correct Word: 4 fill-in-the-blank\n- Sentence Rearrangement: 3 questions (P/Q/R/S format)\n- Match the Following: 1 question`;
  return `You are a senior CUET UG English (101) paper setter for the National Testing Agency (NTA), India. Create a batch of practice questions.

Difficulty: ${diff} — ${ddesc}
Total: exactly ${count} questions

Distribution:
${dist}

RULES:
1. Exactly ${count} questions total — no more, no less
2. Every question: exactly 4 options A, B, C, D — exactly one correct
3. All distractors must be plausible
4. Passages go in a separate "passages" array — questions use passage_id only
5. Sentence rearrangement: P/Q/R/S shown as separate labelled sentences, options are ordering strings
6. Match the Following: Column A (4 items) + Column B (4 items), 4 match-combination options
7. Do NOT include an explanation field in any question

Return ONLY valid JSON, no markdown, no commentary:
{"passages":[{"id":"P1","type":"factual","text":"..."}],"questions":[{"id":1,"topic":"reading_comprehension","passage_id":"P1","question":"...","options":{"A":"...","B":"...","C":"...","D":"..."},"correct":"A"}]}`;
}

function buildStandardSplitPrompt(diff, half) {
  // half: "first"(15Q) | "second"(15Q) — for Standard Test 2-way split
  const ddesc = { easy:"simple vocabulary, direct factual questions, straightforward inference", medium:"moderate vocabulary above Class 12 level, some inference required, plausible distractors", hard:"advanced GRE-level vocabulary, complex literary passages, abstract inference, highly plausible distractors" }[diff];
  const dist = half==="first"
    ? `- Reading Comprehension: 1 passage (factual, 120-150 words), 4 questions\n- Synonyms & Antonyms: 3 questions (mix SYNONYM/ANTONYM)\n- Choose Correct Word: 4 fill-in-the-blank\n- Sentence Rearrangement: 2 questions (P/Q/R/S format)\n- Match the Following: 1 question\n- Vocabulary & Grammar: 1 question`
    : `- Reading Comprehension: 1 passage (narrative/literary, 120-150 words), 4 questions\n- Synonyms & Antonyms: 3 questions (mix SYNONYM/ANTONYM)\n- Choose Correct Word: 3 fill-in-the-blank\n- Sentence Rearrangement: 2 questions (P/Q/R/S format)\n- Match the Following: 1 question\n- Vocabulary & Grammar: 2 questions`;
  return `You are a senior CUET UG English (101) paper setter for the National Testing Agency (NTA), India. Create a batch of practice questions.

Difficulty: ${diff} — ${ddesc}
Total: exactly 15 questions

Distribution:
${dist}

RULES:
1. Exactly 15 questions total — no more, no less
2. Every question: exactly 4 options A, B, C, D — exactly one correct
3. All distractors must be plausible
4. Passages go in a separate "passages" array — questions use passage_id only
5. Sentence rearrangement: P/Q/R/S shown as separate labelled sentences, options are ordering strings
6. Match the Following: Column A (4 items) + Column B (4 items), 4 match-combination options
7. Do NOT include an explanation field in any question

Return ONLY valid JSON, no markdown, no commentary:
{"passages":[{"id":"P1","type":"factual","text":"..."}],"questions":[{"id":1,"topic":"reading_comprehension","passage_id":"P1","question":"...","options":{"A":"...","B":"...","C":"...","D":"..."},"correct":"A"}]}`;
}

function buildAdvisoryPrompt(res, name) {
  const tperf = Object.entries(res.topicStats).sort(([,a],[,b])=>(a.correct/a.total||0)-(b.correct/b.total||0)).map(([t,s])=>`${TOPICS[t]?.label||t}: ${s.correct}/${s.total} correct (${s.total?Math.round(s.correct/s.total*100):0}%)`).join("\n");
  const wrongs = (res.questionResults||[]).filter(q=>q.status==="wrong").slice(0,6).map(q=>`[${TOPICS[q.topic]?.abbr||q.topic}] "${(q.question||"").slice(0,65)}..." — chose ${q.userAnswer}, correct: ${q.correct}`).join("\n");
  return `CUET English coaching session. Student: ${name} (Class 12, CUET UG 2026).

Score: ${res.score}/${res.maxScore} (${res.percentage}%)
Correct: ${res.correct} (+${res.correct*5} marks) | Wrong: ${res.wrong} (-${res.wrong} marks) | Skipped: ${res.unattempted}
Marking scheme: +5 correct, -1 wrong, 0 skipped

Topic performance (weakest first):
${tperf}

Sample wrong answers:
${wrongs||"None — all errors were skipped"}

Write a coaching advisory of 300-360 words across four paragraphs. No bullet points. No headers. No numbered lists.

Para 1: Honest, specific assessment. State what the score means in the context of CUET 2026 competition. Not a pep talk.
Para 2: Name the 2-3 weakest topic areas. Explain exactly what the wrong answers reveal about the gap. Give one specific practice exercise per gap.
Para 3: Attempt strategy for the next test — which topic type to start with, rough time allocation per topic type, when to skip and when to guess, the arithmetic of skipping vs risking a wrong answer.
Para 4: One concrete daily habit for the next 14 days. Name a specific resource, activity, or drill. Not a general suggestion.

Tone: direct, coach-to-student, no flattery, no filler phrases like "great effort" or "you can do it".`;
}

// ─── Utilities ───────────────────────────────────────────────
const fmtTime = s => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

function computeResults(questions, answers) {
  let pts=0,correct=0,wrong=0,unattempted=0;
  const topicStats={};
  const questionResults=questions.map(q=>{
    const ua=answers[q.id], t=q.topic;
    if(!topicStats[t]) topicStats[t]={total:0,correct:0,wrong:0,unattempted:0};
    topicStats[t].total++;
    let status;
    if(!ua){unattempted++;topicStats[t].unattempted++;status="unattempted";}
    else if(ua===q.correct){correct++;pts+=5;topicStats[t].correct++;status="correct";}
    else{wrong++;pts-=1;topicStats[t].wrong++;status="wrong";}
    return {...q,userAnswer:ua,status};
  });
  const max=questions.length*5;
  return{score:pts,maxScore:max,correct,wrong,unattempted,percentage:max>0?Math.round(Math.max(0,pts)/max*100):0,topicStats,questionResults};
}

function getQStatus(qId,answers,marked,visited){
  const ans=!!answers[qId],mk=marked.has(qId),seen=visited.has(qId);
  if(!seen) return "not_visited";
  if(ans&&mk) return "answered_review";
  if(ans) return "answered";
  if(mk) return "review";
  return "not_answered";
}

const getUsers=()=>{try{return JSON.parse(localStorage.getItem("cuet_ux")||"{}");}catch{return{};}};
const saveUsers=u=>localStorage.setItem("cuet_ux",JSON.stringify(u));
const getHist=id=>{try{return JSON.parse(localStorage.getItem(`cuet_h_${id}`)||"[]");}catch{return[];}};
const saveHist=(id,h)=>localStorage.setItem(`cuet_h_${id}`,JSON.stringify(h));
const getSession=()=>{try{return JSON.parse(localStorage.getItem("cuet_session")||"null");}catch{return null;}};
const saveSession=u=>localStorage.setItem("cuet_session",JSON.stringify(u));
const clearSession=()=>localStorage.removeItem("cuet_session");

async function callAI(prompt, max_tokens, retries=2) {
  for(let attempt=0; attempt<=retries; attempt++){
    try{
      const res = await fetch("/.netlify/functions/anthropic-proxy", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({prompt, max_tokens}),
      });
      // If HTML response (Netlify error page), throw descriptive error
      const contentType = res.headers.get("content-type")||"";
      if(!contentType.includes("application/json")){
        const text = await res.text();
        if(text.includes("<html") || text.includes("<!DOCTYPE")){
          throw new Error("Server returned an error page. Please try again.");
        }
        throw new Error("Unexpected server response format.");
      }
      const data = await res.json();
      if(!res.ok){
        // Rate limit — wait and retry
        if(res.status===429 && attempt<retries){
          await new Promise(r=>setTimeout(r, 2000*(attempt+1)));
          continue;
        }
        throw new Error(data.error?.message||`Server error (${res.status})`);
      }
      return data;
    }catch(e){
      if(attempt===retries) throw e;
      await new Promise(r=>setTimeout(r, 1500*(attempt+1)));
    }
  }
}

const parseAI = txt => {
  const clean = txt.replace(/```json\n?|```\n?/g,"").trim();
  const p = JSON.parse(clean);
  return {passages:p.passages||[], questions:p.questions||[]};
};

// ─── Main Component ──────────────────────────────────────────
export default function CUETPlatform() {
  // Restore session on mount — fixes page refresh logout
  const [user,setUser]       = useState(()=>getSession());
  const [authMode,setAuthMode] = useState("login");
  const [authForm,setAuthForm] = useState({name:"",email:"",password:""});
  const [authErr,setAuthErr]   = useState("");
  const [screen,setScreen]     = useState(()=>getSession()?"dashboard":"auth");
  const [mode,setMode]         = useState("standard");
  const [difficulty,setDifficulty] = useState("medium");
  const [questions,setQuestions]   = useState([]);
  const [passages,setPassages]     = useState([]);
  const [currentQ,setCurrentQ]     = useState(0);
  const [answers,setAnswers]       = useState({});
  const [markedReview,setMarkedReview] = useState(new Set());
  const [visited,setVisited]           = useState(new Set());
  const [selectedOpt,setSelectedOpt]   = useState(null);
  const [timeLeft,setTimeLeft]         = useState(2160);
  const [tipIdx,setTipIdx]             = useState(0);
  const [genStage,setGenStage]         = useState("");
  const [results,setResults]           = useState(null);
  const [history,setHistory]           = useState(()=>{ const s=getSession(); return s?getHist(s.id):[]; });
  const [advisory,setAdvisory]         = useState("");
  const [loadingAdv,setLoadingAdv]     = useState(false);
  const [genError,setGenError]         = useState("");
  const [reviewOpen,setReviewOpen]     = useState(null);
  const [showWarn,setShowWarn]         = useState(false);
  const [showReview,setShowReview]     = useState(false);
  const timerRef  = useRef(null);
  const submitRef = useRef(null);


  // Inject global responsive styles once
  useEffect(()=>{
    const style = document.createElement("style");
    style.id = "cuet-responsive";
    style.textContent = `
      * { box-sizing: border-box; }
      body { margin: 0; padding: 0; }
      @media (max-width: 768px) {
        .exam-main { flex-direction: column !important; }
        .exam-palette { width: 100% !important; max-height: 220px !important; border-left: none !important; border-top: 2px solid #d1d5db !important; order: -1; }
        .exam-palette-grid { grid-template-columns: repeat(8, 1fr) !important; }
        .exam-question { padding: 10px !important; }
        .dashboard-grid-4 { grid-template-columns: repeat(2, 1fr) !important; }
        .dashboard-grid-3 { grid-template-columns: 1fr !important; }
        .diff-row { flex-direction: column !important; }
        .diff-row button { flex: none !important; }
        .toolbar-row { flex-direction: column !important; gap: 8px !important; }
        .toolbar-row > div { justify-content: center !important; }
        .results-grid { grid-template-columns: 1fr !important; }
        .advisory-scores { flex-wrap: wrap !important; }
      }
      @media (max-width: 480px) {
        .exam-palette-grid { grid-template-columns: repeat(6, 1fr) !important; }
        .mode-grid { grid-template-columns: 1fr !important; }
        .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
      }
    `;
    if(!document.getElementById("cuet-responsive")) document.head.appendChild(style);
    return ()=>{};
  },[]);

  // Prevent accidental navigation during exam
  useEffect(()=>{
    if(screen==="exam"){
      const handler = e => { e.preventDefault(); e.returnValue=""; };
      window.addEventListener("beforeunload", handler);
      return ()=>window.removeEventListener("beforeunload", handler);
    }
  },[screen]);

  const doSubmit=useCallback(()=>{
    clearInterval(timerRef.current);
    const q=questions[currentQ];
    const finalAns=selectedOpt&&q?{...answers,[q.id]:selectedOpt}:{...answers};
    const r=computeResults(questions,finalAns);
    setResults(r);
    if(user){
      const entry={id:Date.now().toString(),date:new Date().toISOString(),mode,difficulty,score:r.score,maxScore:r.maxScore,percentage:r.percentage,correct:r.correct,wrong:r.wrong,unattempted:r.unattempted,qCount:questions.length};
      const h=[entry,...getHist(user.id)].slice(0,30);
      saveHist(user.id,h); setHistory(h);
    }
    setScreen("results");
  },[questions,currentQ,answers,selectedOpt,user,mode,difficulty]);

  useEffect(()=>{ submitRef.current=doSubmit; },[doSubmit]);

  // Timer with 5-minute warning
  useEffect(()=>{
    if(screen==="exam"){
      setShowWarn(false);
      timerRef.current=setInterval(()=>{
        setTimeLeft(t=>{
          if(t===300) setShowWarn(true);
          if(t<=1){clearInterval(timerRef.current);submitRef.current?.();return 0;}
          return t-1;
        });
      },1000);
    }
    return()=>clearInterval(timerRef.current);
  },[screen]);

  useEffect(()=>{
    if(screen==="generating"){const t=setInterval(()=>setTipIdx(i=>(i+1)%TIPS.length),3800);return()=>clearInterval(t);}
  },[screen]);

  // Auto-generate advisory when results loads
  useEffect(()=>{
    if(screen==="results"&&results&&!advisory&&!loadingAdv){
      setLoadingAdv(true);
      callAI(buildAdvisoryPrompt(results,user?.name||"Student"),1200)
        .then(data=>{const txt=data.content.filter(b=>b.type==="text").map(b=>b.text).join("");setAdvisory(txt);})
        .catch(()=>setAdvisory("Advisory could not be generated at this time."))
        .finally(()=>setLoadingAdv(false));
    }
  },[screen,results]);

  // ─── Auth ──────────────────────────────────────────────────
  const handleAuth=()=>{
    setAuthErr("");
    const users=getUsers();
    const{name,email,password}=authForm;
    if(!email.trim()||!password){setAuthErr("Email and password are required.");return;}
    if(authMode==="register"){
      if(!name.trim()){setAuthErr("Full name is required.");return;}
      if(users[email.trim()]){setAuthErr("An account already exists with this email.");return;}
      if(password.length<6){setAuthErr("Password must be at least 6 characters.");return;}
      const nu={id:Date.now().toString(),name:name.trim(),email:email.trim(),created:new Date().toISOString()};
      saveUsers({...users,[email.trim()]:{...nu,password}});
      saveSession(nu);
      setUser(nu); setHistory([]); setScreen("dashboard");
    }else{
      const u=users[email.trim()];
      if(!u||u.password!==password){setAuthErr("Invalid email or password.");return;}
      const{password:_,...safe}=u;
      saveSession(safe);
      setUser(safe); setHistory(getHist(u.id)); setScreen("dashboard");
    }
  };

  const abandonTest=()=>{
    if(!window.confirm("Exit this test?\n\nYour progress will be saved as Incomplete in your history. You can start a new test with any difficulty from the dashboard.")) return;
    clearInterval(timerRef.current);
    // Score whatever has been answered so far
    const q=questions[currentQ];
    const finalAns=selectedOpt&&q?{...answers,[q.id]:selectedOpt}:{...answers};
    const r=computeResults(questions,finalAns);
    if(user){
      const entry={id:Date.now().toString(),date:new Date().toISOString(),mode,difficulty,
        score:r.score,maxScore:r.maxScore,percentage:r.percentage,
        correct:r.correct,wrong:r.wrong,unattempted:r.unattempted,qCount:questions.length,
        abandoned:true};
      const h=[entry,...getHist(user.id)].slice(0,30);
      saveHist(user.id,h); setHistory(h);
    }
    setScreen("dashboard");
  };

  const handleLogout=()=>{
    clearInterval(timerRef.current);
    clearSession();
    setUser(null); setScreen("auth");
    setAuthForm({name:"",email:"",password:""});
    setQuestions([]); setResults(null); setAdvisory("");
  };

  // ─── Navigation ────────────────────────────────────────────
  const goTo=useCallback((idx)=>{
    const qid=questions[idx]?.id;
    if(qid!=null) setVisited(v=>new Set([...v,qid]));
    setCurrentQ(idx); setSelectedOpt(answers[questions[idx]?.id]||null);
  },[questions,answers]);

  const saveAndNext=()=>{
    const q=questions[currentQ];
    if(selectedOpt&&q) setAnswers(a=>({...a,[q.id]:selectedOpt}));
    if(currentQ<questions.length-1) goTo(currentQ+1);
  };
  const markAndNext=()=>{
    const q=questions[currentQ];
    if(selectedOpt&&q) setAnswers(a=>({...a,[q.id]:selectedOpt}));
    if(q) setMarkedReview(m=>{const s=new Set(m);s.add(q.id);return s;});
    if(currentQ<questions.length-1) goTo(currentQ+1);
  };
  const clearResponse=()=>{
    const q=questions[currentQ];
    setSelectedOpt(null);
    if(q){setAnswers(a=>{const n={...a};delete n[q.id];return n;});setMarkedReview(m=>{const s=new Set(m);s.delete(q.id);return s;});}
  };

  // ─── Generate Test ─────────────────────────────────────────
  const generateTest=async()=>{
    setGenError(""); setScreen("generating");
    try{
      let allPassages=[],allQuestions=[];
      if(mode==="full"){
        // 4-way parallel split: 13+13+12+12 = 50Q, each call ~2000 tokens → ~21s safely within 25s limit
        setGenStage("Preparing your Full Mock paper across all sections. Please wait.");
        const [d1,d2,d3,d4]=await Promise.all([
          callAI(buildSplitPrompt(difficulty,"first",13),MAX_TOKENS.full[difficulty]),
          callAI(buildSplitPrompt(difficulty,"second",13),MAX_TOKENS.full[difficulty]),
          callAI(buildSplitPrompt(difficulty,"third",12),MAX_TOKENS.full[difficulty]),
          callAI(buildSplitPrompt(difficulty,"fourth",12),MAX_TOKENS.full[difficulty]),
        ]);
        setGenStage("Finalising your Full Mock Test paper...");
        const r1=parseAI(d1.content.filter(b=>b.type==="text").map(b=>b.text).join(""));
        const r2=parseAI(d2.content.filter(b=>b.type==="text").map(b=>b.text).join(""));
        const r3=parseAI(d3.content.filter(b=>b.type==="text").map(b=>b.text).join(""));
        const r4=parseAI(d4.content.filter(b=>b.type==="text").map(b=>b.text).join(""));
        const o2=r1.questions.length;
        const o3=o2+r2.questions.length;
        const o4=o3+r3.questions.length;
        const r2qs=r2.questions.map(q=>({...q,id:q.id+o2}));
        const r3qs=r3.questions.map(q=>({...q,id:q.id+o3}));
        const r4qs=r4.questions.map(q=>({...q,id:q.id+o4}));
        const r2ps=r2.passages.map(p=>({...p,id:p.id+"b"}));
        const r3ps=r3.passages.map(p=>({...p,id:p.id+"c"}));
        r2qs.forEach(q=>{if(q.passage_id)q.passage_id=q.passage_id+"b";});
        r3qs.forEach(q=>{if(q.passage_id)q.passage_id=q.passage_id+"c";});
        allPassages=[...r1.passages,...r2ps,...r3ps];
        allQuestions=[...r1.questions,...r2qs,...r3qs,...r4qs];
      }else if(mode==="standard"){
        // 2-way parallel split: 15+15 = 30Q, each call ~2000 tokens → ~17s safely within 25s limit
        setGenStage("Preparing your test paper...");
        const [d1,d2]=await Promise.all([
          callAI(buildStandardSplitPrompt(difficulty,"first"),MAX_TOKENS.standard[difficulty]),
          callAI(buildStandardSplitPrompt(difficulty,"second"),MAX_TOKENS.standard[difficulty]),
        ]);
        setGenStage("Finalising your Standard Test paper...");
        const r1=parseAI(d1.content.filter(b=>b.type==="text").map(b=>b.text).join(""));
        const r2=parseAI(d2.content.filter(b=>b.type==="text").map(b=>b.text).join(""));
        const offset=r1.questions.length;
        const r2qs=r2.questions.map(q=>({...q,id:q.id+offset}));
        const r2ps=r2.passages.map(p=>({...p,id:p.id+"b"}));
        r2qs.forEach(q=>{if(q.passage_id)q.passage_id=q.passage_id+"b";});
        allPassages=[...r1.passages,...r2ps];
        allQuestions=[...r1.questions,...r2qs];
      }else{
        // Quick Practice — single call, 15Q
        setGenStage("Preparing your test paper...");
        const data=await callAI(buildTestPrompt(mode,difficulty),MAX_TOKENS[mode][difficulty]);
        const r=parseAI(data.content.filter(b=>b.type==="text").map(b=>b.text).join(""));
        allPassages=r.passages; allQuestions=r.questions;
      }
      if(!allQuestions.length) throw new Error("No questions were returned. Please try again.");
      setPassages(allPassages); setQuestions(allQuestions);
      setAnswers({}); setMarkedReview(new Set());
      setVisited(new Set([allQuestions[0]?.id]));
      setCurrentQ(0); setSelectedOpt(null);
      setResults(null); setAdvisory(""); setGenStage("");
      setTimeLeft(MODES[mode].secs); setScreen("exam");
    }catch(e){
      setGenError("Generation failed: "+e.message);
      setGenStage(""); setScreen("dashboard");
    }
  };

  // ─── Advisory ──────────────────────────────────────────────
  const getAdvisory=async()=>{
    if(!results) return;
    setLoadingAdv(true);
    try{
      const data=await callAI(buildAdvisoryPrompt(results,user?.name||"Student"),1200);
      const txt=data.content.filter(b=>b.type==="text").map(b=>b.text).join("");
      setAdvisory(txt); setScreen("advisory");
    }catch{
      setAdvisory("Advisory unavailable. Please try again."); setScreen("advisory");
    }finally{setLoadingAdv(false);}
  };

  const q=questions[currentQ];
  const passage=q?.passage_id?passages.find(p=>p.id===q.passage_id):null;
  const answeredCount=Object.keys(answers).length;
  const timerRed=timeLeft<300, timerAmber=timeLeft<600&&!timerRed;
  const tColor=timerRed?"#dc2626":timerAmber?"#b45309":"#1e3a8a";

  // ════════════════════════════════════════════════════════
  //  AUTH SCREEN
  // ════════════════════════════════════════════════════════
  if(screen==="auth") return(
    <div style={{minHeight:"100vh",background:"#F8FAFC",fontFamily:"Inter,system-ui,sans-serif"}}>
      {/* Top nav band */}
      <div style={{background:"#0F1C2E",padding:"10px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{background:"white",borderRadius:4,padding:"3px 10px",fontWeight:900,fontSize:13,color:"#0F1C2E",letterSpacing:2}}>NTA</div>
        <div style={{color:"rgba(255,255,255,0.6)",fontSize:12,fontWeight:500,letterSpacing:"0.06em"}}>CUET (UG) 2026</div>
      </div>
      {/* Center content */}
      <div style={{maxWidth:400,margin:"0 auto",padding:"56px 24px 24px"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <h1 style={{margin:"0 0 8px",fontSize:20,fontWeight:700,color:"#0F1C2E",lineHeight:1.3}}>CUET English Mock Test Series — 2026</h1>
          <p style={{margin:"0 0 4px",fontSize:13,color:"#334155"}}>Section I — Language Proficiency (English)</p>
          <p style={{margin:0,fontSize:11,color:"#94A3B8",fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase"}}>Accuron Education</p>
        </div>
        <div style={{background:"white",border:"1px solid #E2E8F0",borderRadius:8,padding:"28px 24px",boxShadow:"0 1px 3px rgba(0,0,0,0.08),0 1px 2px rgba(0,0,0,0.04)"}}>
          {authMode==="register"&&(
            <div style={{marginBottom:16}}>
              <label style={{display:"block",fontSize:11,fontWeight:600,color:"#64748B",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.06em"}}>Full Name</label>
              <input value={authForm.name} onChange={e=>setAuthForm(f=>({...f,name:e.target.value}))} placeholder="Your full name" style={{width:"100%",padding:"9px 12px",border:"1px solid #E2E8F0",borderRadius:6,fontSize:14,boxSizing:"border-box",outline:"none",color:"#0F1C2E",background:"#F8FAFC"}} onFocus={e=>e.target.style.borderColor="#4338CA"} onBlur={e=>e.target.style.borderColor="#E2E8F0"}/>
            </div>
          )}
          <div style={{marginBottom:16}}>
            <label style={{display:"block",fontSize:11,fontWeight:600,color:"#64748B",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.06em"}}>Email</label>
            <input type="email" value={authForm.email} onChange={e=>setAuthForm(f=>({...f,email:e.target.value}))} placeholder="you@email.com" style={{width:"100%",padding:"9px 12px",border:"1px solid #E2E8F0",borderRadius:6,fontSize:14,boxSizing:"border-box",outline:"none",color:"#0F1C2E",background:"#F8FAFC"}} onFocus={e=>e.target.style.borderColor="#4338CA"} onBlur={e=>e.target.style.borderColor="#E2E8F0"}/>
          </div>
          <div style={{marginBottom:authErr?"12px":"20px"}}>
            <label style={{display:"block",fontSize:11,fontWeight:600,color:"#64748B",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.06em"}}>Password</label>
            <input type="password" value={authForm.password} onChange={e=>setAuthForm(f=>({...f,password:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&handleAuth()} placeholder="Minimum 6 characters" style={{width:"100%",padding:"9px 12px",border:"1px solid #E2E8F0",borderRadius:6,fontSize:14,boxSizing:"border-box",outline:"none",color:"#0F1C2E",background:"#F8FAFC"}} onFocus={e=>e.target.style.borderColor="#4338CA"} onBlur={e=>e.target.style.borderColor="#E2E8F0"}/>
          </div>
          {authErr&&<div style={{background:"#FFF1F1",border:"1px solid #FCA5A5",color:"#DC2626",padding:"9px 12px",borderRadius:6,fontSize:13,marginBottom:16,lineHeight:1.5}}>{authErr}</div>}
          <button onClick={handleAuth} style={{width:"100%",height:44,background:"#0F1C2E",color:"white",border:"none",borderRadius:6,fontSize:14,fontWeight:600,cursor:"pointer",letterSpacing:"0.02em",transition:"background 0.15s"}} onMouseEnter={e=>e.target.style.background="#1E2D42"} onMouseLeave={e=>e.target.style.background="#0F1C2E"}>
            Continue
          </button>
          {/* Divider */}
          <div style={{display:"flex",alignItems:"center",gap:12,margin:"20px 0 16px"}}>
            <div style={{flex:1,height:1,background:"#E2E8F0"}}/>
            <span style={{fontSize:11,color:"#94A3B8",letterSpacing:"0.04em",whiteSpace:"nowrap"}}>or continue with</span>
            <div style={{flex:1,height:1,background:"#E2E8F0"}}/>
          </div>
          {/* Social login */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
            {[{name:"Google",icon:"G"},{name:"Facebook",icon:"f"}].map(({name,icon})=>(
              <button key={name} onClick={()=>alert("Social login is coming soon. Please use email to sign in.")} style={{padding:"9px 12px",border:"1px solid #E2E8F0",borderRadius:6,background:"white",cursor:"pointer",fontSize:13,fontWeight:500,color:"#334155",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"border-color 0.15s"}} onMouseEnter={e=>e.target.style.borderColor="#CBD5E1"} onMouseLeave={e=>e.target.style.borderColor="#E2E8F0"}>
                <span style={{width:18,height:18,borderRadius:3,background:name==="Google"?"#EA4335":"#1877F2",color:"white",fontSize:11,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{icon}</span>
                {name}
              </button>
            ))}
          </div>
          <div style={{textAlign:"center",fontSize:13,color:"#94A3B8"}}>
            {authMode==="login"?(<>New here?{" "}<button onClick={()=>{setAuthMode("register");setAuthErr("");}} style={{background:"none",border:"none",color:"#4338CA",cursor:"pointer",fontWeight:600,fontSize:13,padding:0,textDecoration:"underline"}}>Create your practice account</button></>):(<>Have an account?{" "}<button onClick={()=>{setAuthMode("login");setAuthErr("");}} style={{background:"none",border:"none",color:"#4338CA",cursor:"pointer",fontWeight:600,fontSize:13,padding:0,textDecoration:"underline"}}>Sign in instead</button></>)}
          </div>
        </div>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════
  //  DASHBOARD
  // ════════════════════════════════════════════════════════
  if(screen==="dashboard"){
    const best=history.filter(t=>!t.abandoned).length?Math.max(...history.filter(t=>!t.abandoned).map(t=>t.percentage)):null;
    const avg=history.filter(t=>!t.abandoned).length?Math.round(history.filter(t=>!t.abandoned).reduce((s,t)=>s+t.percentage,0)/history.filter(t=>!t.abandoned).length):null;
    const totalDone=history.reduce((s,t)=>s+(t.qCount||0),0);
    const bestColor=best===null?"#4338CA":best>=70?"#059669":best>=50?"#D97706":"#DC2626";
    const avgColor=avg===null?"#4338CA":avg>=70?"#059669":avg>=50?"#D97706":"#DC2626";
    return(
      <div style={{minHeight:"100vh",background:"#F8FAFC",fontFamily:"Inter,system-ui,sans-serif"}}>
        {/* Header */}
        <div style={{background:"#0F1C2E",padding:"10px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <div style={{background:"white",borderRadius:4,padding:"3px 10px",fontWeight:900,fontSize:13,color:"#0F1C2E",letterSpacing:2}}>NTA</div>
            <div style={{color:"white"}}>
              <div style={{fontWeight:600,fontSize:14,lineHeight:1.3}}>CUET (UG) 2026 — English (101)</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.45)"}}>Accuron Education</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <div style={{textAlign:"right",color:"white"}}>
              <div style={{fontWeight:600,fontSize:13}}>{user?.name}</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>{user?.email}</div>
            </div>
            <button onClick={handleLogout} style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",color:"rgba(255,255,255,0.8)",padding:"6px 14px",borderRadius:5,cursor:"pointer",fontSize:12,fontWeight:500,transition:"background 0.15s"}} onMouseEnter={e=>e.target.style.background="rgba(255,255,255,0.15)"} onMouseLeave={e=>e.target.style.background="rgba(255,255,255,0.08)"}>Logout</button>
          </div>
        </div>

        <div style={{maxWidth:880,margin:"0 auto",padding:"28px 20px"}}>
          {/* Stats strip */}
          {history.filter(t=>!t.abandoned).length>0&&(
            <div style={{marginBottom:28}}>
              <div style={{fontSize:11,fontWeight:600,color:"#64748B",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:12}}>Your Practice Summary</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}} className="stats-grid">
                {[
                  {v:best!==null?best+"%":"—",l:"Best Score",c:bestColor},
                  {v:avg!==null?avg+"%":"—",l:"Average Score",c:avgColor},
                  {v:history.length,l:"Tests Taken",c:"#4338CA"},
                ].map(({v,l,c})=>(
                  <div key={l} style={{background:"white",border:"1px solid #E2E8F0",borderRadius:8,padding:"16px 18px",borderLeft:`4px solid ${c}`,boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
                    <div style={{fontSize:28,fontWeight:700,color:c,lineHeight:1.1}}>{v}</div>
                    <div style={{fontSize:11,fontWeight:600,color:"#64748B",marginTop:5,textTransform:"uppercase",letterSpacing:"0.06em"}}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Test Paper */}
          <div style={{background:"white",border:"1px solid #E2E8F0",borderRadius:8,padding:"24px",boxShadow:"0 1px 3px rgba(0,0,0,0.06)",marginBottom:24}}>
            <div style={{fontSize:16,fontWeight:600,color:"#0F1C2E",marginBottom:20}}>New Test Paper</div>

            {/* Mode tiles */}
            <div style={{marginBottom:20}}>
              <div style={{fontSize:11,fontWeight:600,color:"#64748B",marginBottom:10,textTransform:"uppercase",letterSpacing:"0.06em"}}>Test Mode</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}} className="mode-grid">
                {Object.entries(MODES).map(([k,m])=>(
                  <div key={k} onClick={()=>setMode(k)} style={{border:`${mode===k?"2px solid #4338CA":"1px solid #E2E8F0"}`,borderRadius:8,padding:"14px 12px",cursor:"pointer",background:mode===k?"#EEF2FF":"white",transition:"box-shadow 0.1s,border-color 0.1s",userSelect:"none",position:"relative",boxShadow:mode===k?"none":"0 1px 2px rgba(0,0,0,0.04)"}} onMouseEnter={e=>{if(mode!==k)e.currentTarget.style.boxShadow="0 2px 8px rgba(0,0,0,0.10)";}} onMouseLeave={e=>{if(mode!==k)e.currentTarget.style.boxShadow="0 1px 2px rgba(0,0,0,0.04)";}}>
                    {mode===k&&<div style={{position:"absolute",top:8,right:8,width:7,height:7,borderRadius:"50%",background:"#4338CA"}}/>}
                    <div style={{fontWeight:600,fontSize:14,color:mode===k?"#4338CA":"#0F1C2E",marginBottom:3}}>{m.label}</div>
                    <div style={{fontSize:11,color:"#94A3B8"}}>{m.tag}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Difficulty tiles */}
            <div style={{marginBottom:24}}>
              <div style={{fontSize:11,fontWeight:600,color:"#64748B",marginBottom:10,textTransform:"uppercase",letterSpacing:"0.06em"}}>Difficulty Level</div>
              <div style={{display:"flex",gap:8}} className="diff-row">
                {Object.entries(DIFFS).map(([k,d])=>(
                  <button key={k} onClick={()=>setDifficulty(k)} style={{flex:1,padding:"13px 8px",border:`${difficulty===k?"2px solid "+d.color:"1px solid #E2E8F0"}`,borderRadius:8,cursor:"pointer",background:difficulty===k?d.bg:"white",color:difficulty===k?d.color:"#334155",fontWeight:600,fontSize:14,transition:"box-shadow 0.1s",position:"relative",boxShadow:difficulty===k?"none":"0 1px 2px rgba(0,0,0,0.04)"}} onMouseEnter={e=>{if(difficulty!==k)e.currentTarget.style.boxShadow="0 2px 8px rgba(0,0,0,0.10)";}} onMouseLeave={e=>{if(difficulty!==k)e.currentTarget.style.boxShadow="0 1px 2px rgba(0,0,0,0.04)";}}>
                    {difficulty===k&&<div style={{position:"absolute",top:7,right:7,width:6,height:6,borderRadius:"50%",background:d.color}}/>}
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {genError&&<div style={{background:"#FFF1F1",border:"1px solid #FCA5A5",color:"#DC2626",padding:"10px 14px",borderRadius:6,fontSize:13,marginBottom:16,lineHeight:1.6}}>{genError}<br/><span style={{fontSize:12,color:"#94A3B8"}}>Check your connection and try again. For persistent errors, try Easy difficulty first.</span></div>}

            <button onClick={generateTest} style={{width:"100%",height:44,background:"#0F1C2E",color:"white",border:"none",borderRadius:6,fontSize:14,fontWeight:600,cursor:"pointer",letterSpacing:"0.02em",transition:"background 0.15s"}} onMouseEnter={e=>e.target.style.background="#1E2D42"} onMouseLeave={e=>e.target.style.background="#0F1C2E"}>
              Begin Test →
            </button>
          </div>

          {/* Test History */}
          {history.length>0?(
            <div style={{background:"white",border:"1px solid #E2E8F0",borderRadius:8,padding:"20px 24px",boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
                <div style={{fontSize:14,fontWeight:600,color:"#0F1C2E"}}>Test History</div>
                <div style={{fontSize:11,color:"#94A3B8"}}>{history.length} record{history.length!==1?"s":""}</div>
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead>
                    <tr style={{borderBottom:"1px solid #E2E8F0"}}>
                      {["Date & Time","Mode","Difficulty","Score","Correct","Wrong","Skipped"].map(h=>(
                        <th key={h} style={{padding:"8px 10px",textAlign:"left",fontSize:11,fontWeight:600,color:"#64748B",textTransform:"uppercase",letterSpacing:"0.06em",whiteSpace:"nowrap"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((t,i)=>{
                      const sc=t.percentage>=70?"#059669":t.percentage>=50?"#D97706":"#DC2626";
                      return(
                        <tr key={t.id} style={{borderBottom:"1px solid #F1F5F9"}}>
                          <td style={{padding:"10px",color:"#64748B",whiteSpace:"nowrap",fontSize:12}}>
                            {new Date(t.date).toLocaleDateString("en-IN",{day:"2-digit",month:"short"})},{" "}
                            {new Date(t.date).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}
                          </td>
                          <td style={{padding:"10px"}}>
                            <span style={{background:"#F1F5F9",color:"#334155",fontSize:11,fontWeight:600,padding:"2px 9px",borderRadius:4,letterSpacing:"0.02em"}}>{t.mode?.charAt(0).toUpperCase()+t.mode?.slice(1)}</span>
                            {t.abandoned&&<span style={{marginLeft:6,background:"#FEF3C7",color:"#92400E",fontSize:10,fontWeight:600,padding:"1px 7px",borderRadius:4}}>Incomplete</span>}
                          </td>
                          <td style={{padding:"10px"}}>
                            <span style={{background:DIFFS[t.difficulty]?.bg,color:DIFFS[t.difficulty]?.color,padding:"2px 9px",borderRadius:4,fontSize:11,fontWeight:600}}>{t.difficulty?.charAt(0).toUpperCase()+t.difficulty?.slice(1)}</span>
                          </td>
                          <td style={{padding:"10px",fontWeight:700,color:sc,fontSize:13}}>{t.percentage}%</td>
                          <td style={{padding:"10px",color:"#059669",fontWeight:600}}>{t.correct}</td>
                          <td style={{padding:"10px",color:"#DC2626",fontWeight:600}}>{t.wrong}</td>
                          <td style={{padding:"10px",color:"#94A3B8"}}>{t.unattempted}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ):(
            <div style={{textAlign:"center",padding:"48px 20px",background:"white",border:"1px solid #E2E8F0",borderRadius:8}}>
              <div style={{fontSize:13,fontWeight:600,color:"#0F1C2E",marginBottom:6}}>No tests taken yet</div>
              <div style={{fontSize:13,color:"#64748B",maxWidth:340,margin:"0 auto"}}>Select a mode and difficulty above to generate your first test and begin tracking your preparation.</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════
  //  GENERATING SCREEN
  // ════════════════════════════════════════════════════════
  if(screen==="generating") return(
    <div style={{minHeight:"100vh",background:"#F8FAFC",display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"Inter,system-ui,sans-serif"}}>
      <div style={{background:"white",border:"1px solid #E2E8F0",borderRadius:8,padding:"40px 40px",maxWidth:440,width:"100%",boxShadow:"0 4px 16px rgba(0,0,0,0.08)"}}>
        {/* Tags */}
        <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:28}}>
          <span style={{background:"#EEF2FF",color:"#4338CA",fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:4,textTransform:"uppercase",letterSpacing:"0.06em"}}>{MODES[mode]?.q} Questions</span>
          <span style={{background:DIFFS[difficulty]?.bg,color:DIFFS[difficulty]?.color,fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:4,textTransform:"uppercase",letterSpacing:"0.06em"}}>{DIFFS[difficulty]?.label}</span>
        </div>
        {/* Progress bar */}
        <div style={{background:"#E2E8F0",borderRadius:4,height:3,overflow:"hidden",marginBottom:24,position:"relative"}}>
          <div style={{position:"absolute",top:0,height:"100%",background:"#4338CA",borderRadius:4,animation:"indeterminate 2.2s ease-in-out infinite"}}/>
        </div>
        {/* Status */}
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:15,fontWeight:600,color:"#0F1C2E",marginBottom:6}}>{MODES[mode]?.label}</div>
          <div style={{fontSize:13,color:"#64748B",lineHeight:1.6}}>Preparing your test paper. Please do not close this tab.</div>
        </div>
      </div>
      <style>{`@keyframes indeterminate{0%{left:-50%;width:50%}50%{left:30%;width:70%}100%{left:100%;width:50%}}`}</style>
    </div>
  );

  // ════════════════════════════════════════════════════════
  //  EXAM SCREEN
  // ════════════════════════════════════════════════════════
  if(screen==="exam"&&q){
    const qst=qId=>getQStatus(qId,answers,markedReview,visited);
    const qstyle=qId=>{const s=QS[qst(qId)];return{width:32,height:32,background:s.bg,border:`2px solid ${s.border}`,color:s.text,borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,cursor:"pointer",flexShrink:0};};
    return(
      <div style={{minHeight:"100vh",background:"#EAECEF",fontFamily:"Inter,system-ui,sans-serif",fontSize:14,display:"flex",flexDirection:"column"}}>
        {/* 5-minute warning */}
        {showWarn&&(
          <div style={{background:"#DC2626",color:"white",textAlign:"center",padding:"9px 16px",fontWeight:600,fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",gap:12}}>
            Only 5 minutes remaining — review your marked questions now.
            <button onClick={()=>setShowWarn(false)} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"white",padding:"2px 10px",borderRadius:4,cursor:"pointer",fontSize:12}}>Dismiss</button>
          </div>
        )}
        {/* NTA Header */}
        <div style={{background:"#0F1C2E",padding:"8px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{background:"white",borderRadius:3,padding:"2px 9px",fontWeight:900,fontSize:12,color:"#0F1C2E",letterSpacing:2}}>NTA</div>
            <div style={{color:"rgba(255,255,255,0.85)",fontSize:12,fontWeight:500}}>CUET (UG) — 2026 | Section I — English (101)</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <div style={{textAlign:"right"}}>
              <div style={{color:"rgba(255,255,255,0.85)",fontSize:12}}>Candidate: <strong style={{color:"white"}}>{user?.name}</strong></div>
              <button onClick={abandonTest} style={{background:"none",border:"none",color:"rgba(255,255,255,0.35)",cursor:"pointer",fontSize:11,padding:0,textAlign:"right",display:"block",marginLeft:"auto",textDecoration:"none"}} onMouseEnter={e=>e.target.style.color="rgba(255,255,255,0.7)"} onMouseLeave={e=>e.target.style.color="rgba(255,255,255,0.35)"}>Exit</button>
            </div>
            <div style={{background:"white",padding:"5px 14px",borderRadius:4,fontFamily:"'Courier New',monospace",fontSize:18,fontWeight:900,color:tColor,letterSpacing:1,animation:timerRed?"blink 1s infinite":"none",border:`1px solid ${tColor}30`}}>
              {fmtTime(timeLeft)}
            </div>
          </div>
        </div>
        {/* Section label bar */}
        <div style={{background:"#F1F5F9",padding:"7px 20px",borderBottom:"1px solid #E2E8F0",flexShrink:0}}>
          <span style={{fontSize:11,fontWeight:600,color:"#64748B",letterSpacing:"0.04em"}}>SECTION: LANGUAGE (ENGLISH) | Multiple Choice (Single Correct) | {DIFFS[difficulty]?.label?.toUpperCase()} DIFFICULTY</span>
        </div>
        {/* Main layout */}
        <div style={{display:"flex",flex:1,overflow:"hidden",minHeight:0}} className="exam-main">
          {/* Question area */}
          <div style={{flex:1,padding:14,overflowY:"auto",background:"#EAECEF"}}>
            {/* Q header */}
            <div style={{background:"white",border:"1px solid #E2E8F0",borderRadius:6,padding:"9px 14px",marginBottom:10,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontWeight:700,color:"#0F1C2E",fontSize:15}}>Q.{currentQ+1}</span>
                <span style={{color:"#94A3B8",fontSize:12}}>of {questions.length}</span>
                <span style={{background:TOPICS[q.topic]?.color+"15",color:TOPICS[q.topic]?.color||"#334155",fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:4}}>{TOPICS[q.topic]?.label||q.topic}</span>
              </div>
              <div style={{fontSize:12,color:"#334155"}}>
                <span style={{color:"#059669",fontWeight:700}}>+5</span> Correct &nbsp;
                <span style={{color:"#DC2626",fontWeight:700}}>-1</span> Wrong &nbsp;
                <span style={{color:"#94A3B8",fontWeight:600}}>0</span> Skipped
              </div>
            </div>
            {/* Passage */}
            {passage&&(
              <div style={{background:"#EEF2FF",borderLeft:"3px solid #4338CA",borderRadius:6,padding:"12px 15px",marginBottom:10}}>
                <div style={{fontSize:10,fontWeight:600,color:"#64748B",letterSpacing:"0.08em",marginBottom:8,textTransform:"uppercase"}}>Read the Following Passage</div>
                <div style={{maxHeight:200,overflowY:"auto"}}>
                  <p style={{margin:0,lineHeight:1.8,color:"#1E293B",fontSize:14}}>{passage.text}</p>
                </div>
              </div>
            )}
            {/* Question text */}
            <div style={{background:"white",border:"1px solid #E2E8F0",borderRadius:6,padding:"15px",marginBottom:10}}>
              <p style={{margin:0,fontSize:15,lineHeight:1.85,color:"#1E293B",fontWeight:500}}>{q.question}</p>
            </div>
            {/* Options — CUET square boxes */}
            <div style={{background:"white",border:"1px solid #E2E8F0",borderRadius:6,overflow:"hidden"}}>
              {["A","B","C","D"].map((opt,oi)=>{
                const sel=selectedOpt===opt;
                return(
                  <div key={opt} onClick={()=>setSelectedOpt(opt)} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"13px 16px",cursor:"pointer",background:sel?"#EEF2FF":"white",borderBottom:oi<3?"1px solid #F1F5F9":"none",borderLeft:sel?"4px solid #4338CA":"4px solid transparent",transition:"background 0.1s",userSelect:"none"}}>
                    {/* Square indicator — NTA CUET standard */}
                    <div style={{width:18,height:18,borderRadius:2,flexShrink:0,marginTop:3,border:sel?"2px solid #4338CA":"2px solid #94A3B8",background:sel?"#4338CA":"white",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {sel&&<div style={{width:8,height:8,background:"white",borderRadius:1}}/>}
                    </div>
                    <span style={{fontSize:14,lineHeight:1.75,color:sel?"#3730A3":"#1E293B"}}>
                      <strong style={{marginRight:7,color:sel?"#4338CA":"#64748B"}}>{opt}.</strong>{q.options?.[opt]||""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Palette panel */}
          <div style={{width:200,background:"white",borderLeft:"1px solid #E2E8F0",display:"flex",flexDirection:"column",flexShrink:0,overflow:"hidden"}} className="exam-palette">
            <div style={{background:"#0F1C2E",color:"white",fontWeight:600,fontSize:11,padding:"8px 10px",textAlign:"center",letterSpacing:"0.08em",textTransform:"uppercase",flexShrink:0}}>Question Palette</div>
            <div style={{padding:"10px 12px",borderBottom:"1px solid #F1F5F9",display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
              <div style={{width:28,height:28,borderRadius:"50%",background:"#0F1C2E",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:700,fontSize:13,flexShrink:0}}>{user?.name?.[0]?.toUpperCase()}</div>
              <div style={{fontSize:11,fontWeight:600,color:"#0F1C2E",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.name}</div>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:10}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:4,marginBottom:16}} className="exam-palette-grid">
                {questions.map((qi,idx)=>(
                  <div key={qi.id} onClick={()=>goTo(idx)} style={{...qstyle(qi.id),outline:idx===currentQ?"3px solid #D97706":"none",outlineOffset:1}}>{idx+1}</div>
                ))}
              </div>
              {/* Colour guide */}
              <div>
                <div style={{fontSize:10,fontWeight:600,color:"#94A3B8",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Colour Guide</div>
                {[["not_visited","Not Visited"],["not_answered","Not Answered"],["answered","Answered"],["review","Marked – Review"],["answered_review","Answered + Marked"]].map(([s,l])=>(
                  <div key={s} style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
                    <div style={{width:14,height:14,background:QS[s].bg,border:`2px solid ${QS[s].border}`,borderRadius:2,flexShrink:0}}/>
                    <span style={{fontSize:10,color:"#64748B"}}>{l}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Counters + submit */}
            <div style={{padding:10,borderTop:"1px solid #E2E8F0",flexShrink:0}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:8}}>
                <div style={{background:"#ECFDF5",padding:"7px",borderRadius:5,textAlign:"center"}}><div style={{fontWeight:700,fontSize:17,color:"#059669"}}>{answeredCount}</div><div style={{fontSize:9,color:"#065F46",textTransform:"uppercase",letterSpacing:"0.04em"}}>Answered</div></div>
                <div style={{background:"#FEF3C7",padding:"7px",borderRadius:5,textAlign:"center"}}><div style={{fontWeight:700,fontSize:17,color:"#D97706"}}>{questions.length-answeredCount}</div><div style={{fontSize:9,color:"#78350F",textTransform:"uppercase",letterSpacing:"0.04em"}}>Remaining</div></div>
              </div>
              <button onClick={()=>{if(window.confirm(`Submit test?\n\nAnswered: ${answeredCount}\nUnattempted: ${questions.length-answeredCount}\n\nThis cannot be undone.`))doSubmit();}} style={{width:"100%",padding:"9px",background:"#DC2626",color:"white",border:"none",borderRadius:4,fontWeight:700,fontSize:12,cursor:"pointer",letterSpacing:"0.04em",transition:"background 0.15s"}} onMouseEnter={e=>e.target.style.background="#B91C1C"} onMouseLeave={e=>e.target.style.background="#DC2626"}>SUBMIT TEST</button>
            </div>
          </div>
        </div>
        {/* Bottom toolbar */}
        <div style={{background:"white",borderTop:"1px solid #E2E8F0",padding:"9px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,flexWrap:"wrap",gap:8}} className="toolbar-row">
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <button onClick={()=>currentQ>0&&goTo(currentQ-1)} disabled={currentQ===0} style={{padding:"7px 16px",background:"white",border:"1px solid #E2E8F0",borderRadius:5,cursor:currentQ===0?"not-allowed":"pointer",fontSize:13,color:currentQ===0?"#94A3B8":"#334155",fontWeight:500}}>◄ Back</button>
            <button onClick={clearResponse} style={{padding:"7px 14px",background:"transparent",border:"none",color:"#DC2626",cursor:"pointer",fontSize:13,fontWeight:500,textDecoration:"underline"}}>Clear Response</button>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={markAndNext} style={{padding:"8px 16px",background:"#D97706",color:"white",border:"none",borderRadius:5,cursor:"pointer",fontSize:13,fontWeight:600,transition:"background 0.15s"}} onMouseEnter={e=>e.target.style.background="#B45309"} onMouseLeave={e=>e.target.style.background="#D97706"}>Mark for Review &amp; Next ►</button>
            <button onClick={saveAndNext} style={{padding:"8px 20px",background:"#0F1C2E",color:"white",border:"none",borderRadius:5,cursor:"pointer",fontSize:13,fontWeight:600,transition:"background 0.15s"}} onMouseEnter={e=>e.target.style.background="#1E2D42"} onMouseLeave={e=>e.target.style.background="#0F1C2E"}>Save &amp; Next ►</button>
          </div>
        </div>
        <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════
  //  RESULTS SCREEN
  // ════════════════════════════════════════════════════════
  if(screen==="results"&&results){
    const sc=results.percentage>=70?"#059669":results.percentage>=50?"#D97706":"#DC2626";
    return(
      <div style={{minHeight:"100vh",background:"#F8FAFC",fontFamily:"Inter,system-ui,sans-serif"}}>
        {/* Header */}
        <div style={{background:"#0F1C2E",padding:"10px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
          <div style={{color:"white",fontWeight:600,fontSize:14}}>Test Performance Report</div>
          <button onClick={()=>setScreen("dashboard")} style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",color:"rgba(255,255,255,0.8)",padding:"6px 14px",borderRadius:5,cursor:"pointer",fontSize:12,fontWeight:500}}>← Dashboard</button>
        </div>

        {!showReview?(
          <div style={{maxWidth:800,margin:"0 auto",padding:"28px 20px"}}>
            {/* Score card */}
            <div style={{background:"white",border:"1px solid #E2E8F0",borderRadius:8,padding:"32px 24px",boxShadow:"0 1px 3px rgba(0,0,0,0.06)",marginBottom:20,textAlign:"center"}}>
              <div style={{fontSize:11,fontWeight:600,color:"#64748B",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:12}}>Your Score</div>
              <div style={{fontSize:32,fontWeight:700,color:"#0F1C2E",marginBottom:4}}>{results.score}/{results.maxScore}</div>
              <div style={{fontSize:48,fontWeight:700,color:sc,lineHeight:1.1,marginBottom:16}}>{results.percentage}%</div>
              {/* Stat pills */}
              <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
                {[{v:results.correct,l:"Correct",c:"#059669"},{v:results.wrong,l:"Wrong",c:"#DC2626"},{v:results.unattempted,l:"Skipped",c:"#94A3B8"}].map(({v,l,c})=>(
                  <div key={l} style={{background:"#F8FAFC",border:"1px solid #E2E8F0",borderRadius:6,padding:"10px 20px",minWidth:90}}>
                    <div style={{fontSize:22,fontWeight:700,color:c}}>{v}</div>
                    <div style={{fontSize:11,color:"#64748B",fontWeight:600,marginTop:2}}>{l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Topic breakdown — table */}
            <div style={{background:"white",border:"1px solid #E2E8F0",borderRadius:8,padding:"20px 24px",boxShadow:"0 1px 3px rgba(0,0,0,0.06)",marginBottom:20}}>
              <div style={{fontSize:14,fontWeight:600,color:"#0F1C2E",marginBottom:16}}>Topic Performance</div>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead>
                  <tr style={{borderBottom:"1px solid #E2E8F0"}}>
                    {["Topic","Attempted","Correct","Accuracy"].map(h=>(
                      <th key={h} style={{padding:"8px 10px",textAlign:"left",fontSize:11,fontWeight:600,color:"#64748B",textTransform:"uppercase",letterSpacing:"0.06em"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(results.topicStats).sort(([,a],[,b])=>(a.correct/a.total||0)-(b.correct/b.total||0)).map(([t,s])=>{
                    const acc=s.total?Math.round(s.correct/s.total*100):0;
                    const ac=acc>=70?"#059669":acc>=50?"#D97706":"#DC2626";
                    return(
                      <tr key={t} style={{borderBottom:"1px solid #F1F5F9"}}>
                        <td style={{padding:"10px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <span style={{background:TOPICS[t]?.color+"15",color:TOPICS[t]?.color||"#334155",fontSize:10,fontWeight:600,padding:"1px 7px",borderRadius:4}}>{TOPICS[t]?.abbr||t}</span>
                            <span style={{fontSize:13,color:"#334155"}}>{TOPICS[t]?.label||t}</span>
                          </div>
                        </td>
                        <td style={{padding:"10px",color:"#64748B",fontSize:13}}>{s.total}</td>
                        <td style={{padding:"10px",color:"#059669",fontWeight:600,fontSize:13}}>{s.correct}</td>
                        <td style={{padding:"10px",fontWeight:700,color:ac,fontSize:13}}>{acc}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Performance Analysis (auto-generated advisory) */}
            <div style={{background:"white",border:"1px solid #E2E8F0",borderRadius:8,padding:"20px 24px",boxShadow:"0 1px 3px rgba(0,0,0,0.06)",marginBottom:24,borderLeft:"4px solid #4338CA"}}>
              <div style={{fontSize:11,fontWeight:600,color:"#64748B",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:12}}>Performance Analysis</div>
              {loadingAdv?(
                <div style={{display:"flex",alignItems:"center",gap:10,color:"#64748B",fontSize:13}}>
                  <div style={{width:16,height:16,border:"2px solid #E2E8F0",borderTop:"2px solid #4338CA",borderRadius:"50%",animation:"spin 0.8s linear infinite",flexShrink:0}}/>
                  Generating your analysis...
                </div>
              ):advisory?(
                <div style={{fontSize:14,lineHeight:2.0,color:"#334155",whiteSpace:"pre-wrap"}}>{advisory}</div>
              ):(
                <div style={{fontSize:13,color:"#94A3B8"}}>Analysis will appear here momentarily.</div>
              )}
            </div>

            {/* Action buttons */}
            <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
              <button onClick={()=>setShowReview(true)} style={{flex:1,minWidth:160,height:44,background:"white",color:"#0F1C2E",border:"2px solid #0F1C2E",borderRadius:6,fontSize:14,fontWeight:600,cursor:"pointer",transition:"background 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.background="#F8FAFC";}} onMouseLeave={e=>{e.currentTarget.style.background="white";}}>Review Answers</button>
              <button onClick={()=>setScreen("dashboard")} style={{flex:1,minWidth:160,height:44,background:"#0F1C2E",color:"white",border:"none",borderRadius:6,fontSize:14,fontWeight:600,cursor:"pointer",transition:"background 0.15s"}} onMouseEnter={e=>e.target.style.background="#1E2D42"} onMouseLeave={e=>e.target.style.background="#0F1C2E"}>New Test Paper</button>
            </div>
          </div>
        ):(
          // ─── Review Panel ───────────────────────────────────
          <div style={{maxWidth:920,margin:"0 auto",padding:"28px 20px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
              <div style={{fontSize:14,fontWeight:600,color:"#0F1C2E"}}>Answer Review — {results.questionResults.length} Questions</div>
              <button onClick={()=>setShowReview(false)} style={{background:"none",border:"1px solid #E2E8F0",color:"#334155",padding:"6px 14px",borderRadius:5,cursor:"pointer",fontSize:12,fontWeight:500}}>← Back to Results</button>
            </div>
            {results.questionResults.map((qr,i)=>{
              const isOpen=reviewOpen===qr.id;
              const sc2={correct:"#059669",wrong:"#DC2626",unattempted:"#94A3B8"}[qr.status];
              const sbg={correct:"#ECFDF5",wrong:"#FFF1F1",unattempted:"#F8FAFC"}[qr.status];
              const psg=qr.passage_id?passages.find(p=>p.id===qr.passage_id):null;
              return(
                <div key={qr.id} style={{border:"1px solid #E2E8F0",borderRadius:8,marginBottom:8,overflow:"hidden",borderLeft:`4px solid ${sc2}`}}>
                  <div onClick={()=>setReviewOpen(isOpen?null:qr.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 16px",cursor:"pointer",background:sbg,userSelect:"none"}}>
                    <div style={{width:24,height:24,borderRadius:4,background:sc2,color:"white",fontWeight:700,fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</div>
                    <div style={{flex:1,fontSize:13,color:"#334155",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{(qr.question||"").slice(0,100)}{(qr.question||"").length>100?"...":""}</div>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                      <span style={{background:TOPICS[qr.topic]?.color+"15",color:TOPICS[qr.topic]?.color,fontSize:10,fontWeight:600,padding:"1px 6px",borderRadius:4}}>{TOPICS[qr.topic]?.abbr}</span>
                      <span style={{fontSize:11,fontWeight:600,color:sc2,textTransform:"uppercase",letterSpacing:"0.04em"}}>{qr.status}</span>
                      <span style={{fontSize:11,color:"#94A3B8"}}>{isOpen?"▲":"▼"}</span>
                    </div>
                  </div>
                  {isOpen&&(
                    <div style={{background:"white",borderTop:"1px solid #E2E8F0"}}>
                      {psg&&(
                        <div style={{background:"#EEF2FF",borderLeft:"3px solid #4338CA",padding:"12px 16px",margin:"14px 16px 0",borderRadius:6,fontSize:13,lineHeight:1.8,color:"#1E293B",maxHeight:140,overflowY:"auto"}}>{psg.text}</div>
                      )}
                      <div style={{padding:"14px 16px"}}>
                        <p style={{margin:"0 0 12px",fontSize:14,fontWeight:500,color:"#1E293B",lineHeight:1.7}}>{qr.question}</p>
                        {["A","B","C","D"].map(opt=>{
                          const isC=opt===qr.correct,uW=opt===qr.userAnswer&&!isC;
                          return(
                            <div key={opt} style={{padding:"9px 12px",borderRadius:6,marginBottom:5,fontSize:13,background:isC?"#ECFDF5":uW?"#FFF1F1":"#F8FAFC",border:`1px solid ${isC?"#059669":uW?"#DC2626":"#E2E8F0"}`,color:isC?"#065F46":uW?"#7F1D1D":"#334155"}}>
                              <div style={{display:"flex",alignItems:"center",gap:8}}>
                                <strong>{opt}.</strong> {qr.options?.[opt]}
                                {isC&&<span style={{fontSize:11,fontWeight:600,color:"#059669",marginLeft:"auto"}}>Correct Answer</span>}
                                {uW&&<span style={{fontSize:11,fontWeight:600,color:"#DC2626",marginLeft:"auto"}}>Your Answer</span>}
                              </div>
                            </div>
                          );
                        })}
                        {qr.explanation&&<div style={{background:"#F8FAFC",border:"1px solid #E2E8F0",borderRadius:6,padding:"10px 13px",marginTop:10,fontSize:13,color:"#334155",lineHeight:1.65}}><span style={{fontSize:11,fontWeight:600,color:"#64748B",textTransform:"uppercase",letterSpacing:"0.04em",display:"block",marginBottom:4}}>Explanation</span>{qr.explanation}</div>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <button onClick={()=>setShowReview(false)} style={{marginTop:8,padding:"10px 24px",background:"#0F1C2E",color:"white",border:"none",borderRadius:6,fontSize:13,fontWeight:600,cursor:"pointer"}}>← Back to Results</button>
          </div>
        )}
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════
  //  ADVISORY SCREEN (kept for fallback)
  // ════════════════════════════════════════════════════════
  if(screen==="advisory") return(
    <div style={{minHeight:"100vh",background:"#F8FAFC",fontFamily:"Inter,system-ui,sans-serif"}}>
      <div style={{background:"#0F1C2E",padding:"10px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
        <div style={{color:"white",fontWeight:600,fontSize:14}}>Performance Analysis — CUET English (101)</div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setScreen("results")} style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",color:"rgba(255,255,255,0.8)",padding:"6px 14px",borderRadius:5,cursor:"pointer",fontSize:12,fontWeight:500}}>← Results</button>
          <button onClick={()=>setScreen("dashboard")} style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",color:"rgba(255,255,255,0.8)",padding:"6px 14px",borderRadius:5,cursor:"pointer",fontSize:12,fontWeight:500}}>Dashboard</button>
        </div>
      </div>
      <div style={{maxWidth:760,margin:"0 auto",padding:"28px 20px"}}>
        <div style={{background:"white",border:"1px solid #E2E8F0",borderRadius:8,padding:"28px 30px",boxShadow:"0 1px 3px rgba(0,0,0,0.06)",borderLeft:"4px solid #4338CA",marginBottom:16}}>
          <div style={{fontSize:11,fontWeight:600,color:"#64748B",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:16}}>Performance Analysis — {user?.name}</div>
          <div style={{fontSize:14,lineHeight:2.0,color:"#334155",whiteSpace:"pre-wrap"}}>{advisory}</div>
        </div>
        <div style={{display:"flex",gap:12}}>
          <button onClick={generateTest} style={{flex:1,height:44,background:"#0F1C2E",color:"white",border:"none",borderRadius:6,fontSize:14,fontWeight:600,cursor:"pointer"}}>Start Next Test →</button>
          <button onClick={()=>setScreen("dashboard")} style={{flex:1,height:44,background:"white",color:"#334155",border:"1px solid #E2E8F0",borderRadius:6,fontSize:14,fontWeight:500,cursor:"pointer"}}>← Dashboard</button>
        </div>
      </div>
    </div>
  );

  return null;
}
