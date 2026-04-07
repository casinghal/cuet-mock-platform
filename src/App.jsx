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
  quick:    { easy:2500, medium:2800, hard:3200 },
  standard: { easy:2500, medium:2800, hard:3200 }, // per 15Q split-half
  full:     { easy:2800, medium:3200, hard:3800 }, // per 17Q split-third
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
- Reading Comprehension: ${d.rc[0]} passage(s), ${d.rc[1]} questions. Types: ${ptypes}. Each passage 80-100 words for hard difficulty, 120-150 words for easy/medium, original, information-dense.
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
    ? `- Reading Comprehension: 1 passage (factual, 80-100 words), 5 questions\n- Synonyms & Antonyms: 3 questions (mix SYNONYM/ANTONYM)\n- Choose Correct Word: 4 fill-in-the-blank\n- Sentence Rearrangement: 2 questions (P/Q/R/S format)\n- Match the Following: 2 questions\n- Vocabulary & Grammar: 1 question`
    : part==="second"
    ? `- Reading Comprehension: 1 passage (narrative, 80-100 words), 5 questions\n- Synonyms & Antonyms: 3 questions (mix SYNONYM/ANTONYM)\n- Choose Correct Word: 4 fill-in-the-blank\n- Sentence Rearrangement: 2 questions (P/Q/R/S format)\n- Match the Following: 2 questions\n- Vocabulary & Grammar: 1 question`
    : `- Reading Comprehension: 1 passage (literary, 80-100 words), 6 questions\n- Synonyms & Antonyms: 4 questions (mix SYNONYM/ANTONYM)\n- Choose Correct Word: 3 fill-in-the-blank\n- Sentence Rearrangement: 2 questions (P/Q/R/S format)\n- Match the Following: 1 question`;
  return `You are a senior CUET UG English (101) paper setter for(the National Testing Agency (NTA), India. Create a batch of practice questions.

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
    ? `- Reading Comprehension: 1 passage (factual, 80-100 words), 4 questions\n- Synonyms & Antonyms: 3 questions (mix SYNONYM/ANTONYM)\n- Choose Correct Word: 4 fill-in-the-blank\n- Sentence Rearrangement: 2 questions (P/Q/R/S format)\n- Match the Following: 1 question\n- Vocabulary & Grammar: 1 question`
    : `- Reading Comprehension: 1 passage (narrative/literary, 80-100 words), 4 questions\n- Synonyms & Antonyms: 3 questions (mix SYNONYM/ANTONYM)\n- Choose Correct Word: 3 fill-in-the-blank\n- Sentence Rearrangement: 2 questions (P/Q/R/S format)\n- Match the Following: 1 question\n- Vocabulary & Grammar: 2 questions`;
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
        // 3-way parallel split: 17+17+16 = 50Q, each call ~2500 tokens → ~21s safely within 25s limit
        setGenStage("Preparing your Full Mock paper across all sections. Please wait.");
        const [d1,d2,d3]=await Promise.all([
          callAI(buildSplitPrompt(difficulty,"first",17),MAX_TOKENS.full[difficulty]),
          callAI(buildSplitPrompt(difficulty,"second",17),MAX_TOKENS.full[difficulty]),
          callAI(buildSplitPrompt(difficulty,"third",16),MAX_TOKENS.full[difficulty]),
        ]);
        setGenStage("Finalising your Full Mock Test paper...");
        const r1=parseAI(d1.content.filter(b=>b.type==="text").map(b=>b.text).join(""));
        const r2=parseAI(d2.content.filter(b=>b.type==="text").map(b=>b.text).join(""));
        const r3=parseAI(d3.content.filter(b=>b.type==="text").map(b=>b.text).join(""));
        const o2=r1.questions.length, o3=r1.questions.length+r2.questions.length;
        const r2qs=r2.questions.map(q=>({...q,id:q.id+o2}));
        const r3qs=r3.questions.map(q=>({...q,id:q.id+o3}));
        const r2ps=r2.passages.map(p=>({...p,id:p.id+"b"}));
        const r3ps=r3.passages.map(p=>({...p,id:p.id+"c"}));
        r2qs.forEach(q=>{if(q.passage_id)q.passage_id=q.passage_id+"b";});
        r3qs.forEach(q=>{if(q.passage_id)q.passage_id=q.passage_id+"c";});
        allPassages=[...r1.passages,...r2ps,...r3ps];
        allQuestions=[...r1.questions,...r2qs,...r3qs];
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
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#0f172a 0%,#1e3a8a 55%,#1d4ed8 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <div style={{marginBottom:20,textAlign:"center"}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:10,background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:8,padding:"8px 18px",marginBottom:8}}>
          <div style={{fontWeight:900,fontSize:17,color:"white",letterSpacing:2}}>NTA</div>
          <div style={{width:1,height:22,background:"rgba(255,255,255,0.25)"}}/>
          <div style={{color:"rgba(255,255,255,0.9)",fontSize:13,fontWeight:600}}>CUET (UG) 2026</div>
        </div>
        <div style={{color:"rgba(255,255,255,0.5)",fontSize:12}}>English — Section I (Language) · Mock Test Platform</div>
      </div>
      <div style={{background:"white",borderRadius:14,padding:"30px 34px",width:"100%",maxWidth:390,boxShadow:"0 24px 64px rgba(0,0,0,0.45)"}}>
        <div style={{textAlign:"center",marginBottom:22}}>
          <div style={{fontSize:21,fontWeight:900,color:"#0f172a"}}>Student Login</div>
          <div style={{fontSize:13,color:"#64748b",marginTop:3}}>Practice for CUET English (101)</div>
        </div>
        <div style={{display:"flex",background:"#f1f5f9",borderRadius:7,padding:3,marginBottom:22,gap:3}}>
          {[["login","Sign In"],["register","Register"]].map(([m,l])=>(
            <button key={m} onClick={()=>{setAuthMode(m);setAuthErr("");}} style={{flex:1,padding:"9px 0",border:"none",borderRadius:5,cursor:"pointer",fontWeight:700,fontSize:13,background:authMode===m?"white":"transparent",color:authMode===m?"#1e3a8a":"#64748b",boxShadow:authMode===m?"0 1px 5px rgba(0,0,0,0.10)":"none",transition:"all 0.15s"}}>{l}</button>
          ))}
        </div>
        {authMode==="register"&&(
          <div style={{marginBottom:14}}>
            <label style={{display:"block",fontSize:12,fontWeight:700,color:"#374151",marginBottom:5,textTransform:"uppercase",letterSpacing:0.5}}>Full Name</label>
            <input value={authForm.name} onChange={e=>setAuthForm(f=>({...f,name:e.target.value}))} placeholder="Your full name" style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e2e8f0",borderRadius:7,fontSize:14,boxSizing:"border-box",outline:"none"}} onFocus={e=>e.target.style.borderColor="#1d4ed8"} onBlur={e=>e.target.style.borderColor="#e2e8f0"}/>
          </div>
        )}
        <div style={{marginBottom:14}}>
          <label style={{display:"block",fontSize:12,fontWeight:700,color:"#374151",marginBottom:5,textTransform:"uppercase",letterSpacing:0.5}}>Email Address</label>
          <input type="email" value={authForm.email} onChange={e=>setAuthForm(f=>({...f,email:e.target.value}))} placeholder="you@email.com" style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e2e8f0",borderRadius:7,fontSize:14,boxSizing:"border-box",outline:"none"}} onFocus={e=>e.target.style.borderColor="#1d4ed8"} onBlur={e=>e.target.style.borderColor="#e2e8f0"}/>
        </div>
        <div style={{marginBottom:authErr?"12px":"20px"}}>
          <label style={{display:"block",fontSize:12,fontWeight:700,color:"#374151",marginBottom:5,textTransform:"uppercase",letterSpacing:0.5}}>Password</label>
          <input type="password" value={authForm.password} onChange={e=>setAuthForm(f=>({...f,password:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&handleAuth()} placeholder="Minimum 6 characters" style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e2e8f0",borderRadius:7,fontSize:14,boxSizing:"border-box",outline:"none"}} onFocus={e=>e.target.style.borderColor="#1d4ed8"} onBlur={e=>e.target.style.borderColor="#e2e8f0"}/>
        </div>
        {authErr&&<div style={{background:"#fef2f2",border:"1px solid #fecaca",color:"#dc2626",padding:"9px 12px",borderRadius:6,fontSize:13,marginBottom:16,lineHeight:1.5}}>{authErr}</div>}
        <button onClick={handleAuth} style={{width:"100%",padding:"12px",background:"linear-gradient(135deg,#1e3a8a,#1d4ed8)",color:"white",border:"none",borderRadius:8,fontSize:15,fontWeight:800,cursor:"pointer",letterSpacing:0.3}}>{authMode==="login"?"Sign In →":"Create Account →"}</button>
        <div style={{textAlign:"center",marginTop:14,fontSize:12,color:"#94a3b8"}}>{authMode==="login"?"New here? ":"Have an account? "}<button onClick={()=>setAuthMode(authMode==="login"?"register":"login")} style={{background:"none",border:"none",color:"#1d4ed8",cursor:"pointer",fontWeight:700,fontSize:12,textDecoration:"underline"}}>{authMode==="login"?"Register for free":"Sign in instead"}</button></div>
      </div>
      <div style={{marginTop:16,color:"rgba(255,255,255,0.25)",fontSize:11,textAlign:"center"}}>Your account is stored securely. No payment required to access.</div>
    </div>
  );

  // ════════════════════════════════════════════════════════
  //  DASHBOARD
  // ════════════════════════════════════════════════════════
  if(screen==="dashboard"){
    const best=history.length?Math.max(...history.map(t=>t.percentage)):null;
    const avg=history.length?Math.round(history.reduce((s,t)=>s+t.percentage,0)/history.length):null;
    const totalDone=history.reduce((s,t)=>s+(t.qCount||0),0);
    const streak=history.length;
    return(
      <div style={{minHeight:"100vh",background:"#eef2f7",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
        {/* Header */}
        <div style={{background:"linear-gradient(135deg,#0f172a,#1e3a8a)",padding:"11px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{background:"white",borderRadius:4,padding:"4px 10px",fontWeight:900,fontSize:13,color:"#1a56db",letterSpacing:1.5}}>NTA</div>
            <div style={{color:"white"}}><div style={{fontWeight:700,fontSize:15}}>CUET (UG) 2026 — English (101)</div><div style={{fontSize:11,opacity:0.5}}>Mock Test Practice Platform</div></div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{textAlign:"right",color:"white"}}><div style={{fontWeight:700,fontSize:14}}>{user?.name}</div><div style={{fontSize:11,opacity:0.45}}>{user?.email}</div></div>
            <button onClick={handleLogout} style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",color:"white",padding:"6px 14px",borderRadius:5,cursor:"pointer",fontSize:12,fontWeight:600}}>Logout</button>
          </div>
        </div>

        <div style={{maxWidth:900,margin:"0 auto",padding:"22px 20px"}}>
          {/* Welcome row */}
          <div style={{marginBottom:18,display:"flex",alignItems:"flex-end",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
            <div>
              <h1 style={{margin:0,fontSize:22,fontWeight:900,color:"#0f172a"}}>Welcome back, {user?.name?.split(" ")[0]}</h1>
              <p style={{margin:"4px 0 0",color:"#64748b",fontSize:14}}>CUET English (101) — Section I · Language Proficiency Test</p>
            </div>
            {history.length>0&&<div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:8,padding:"8px 16px",textAlign:"center"}}><div style={{fontSize:20,fontWeight:900,color:"#1d4ed8"}}>{streak}</div><div style={{fontSize:11,color:"#3b82f6"}}>Tests Taken</div></div>}
          </div>

          {/* Stats cards */}
          {history.length>0&&(
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:18}}>
              {[{v:(best||0)+"%",l:"Best Score",c:"#16a34a",sub:best>=70?"Above target":"Target: 70%"},{v:(avg||0)+"%",l:"Average Score",c:avg>=70?"#16a34a":avg>=50?"#d97706":"#dc2626",sub:avg>=70?"Consistent":"Needs work"},{v:totalDone,l:"Questions Attempted",c:"#7c3aed",sub:"Total practice"}]
                .map(({v,l,c,sub})=>(
                  <div key={l} style={{background:"white",borderRadius:10,padding:"16px 18px",boxShadow:"0 1px 4px rgba(0,0,0,0.07)",borderTop:`3px solid ${c}`}}>
                    <div style={{fontSize:28,fontWeight:900,color:c,lineHeight:1.1}}>{v}</div>
                    <div style={{fontSize:13,fontWeight:700,color:"#1e293b",marginTop:2}}>{l}</div>
                    <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>{sub}</div>
                  </div>
                ))}
            </div>
          )}

          {/* New Test Card */}
          <div style={{background:"white",borderRadius:12,padding:26,boxShadow:"0 1px 4px rgba(0,0,0,0.07)",marginBottom:18,border:"1px solid #e2e8f0"}}>
            <h2 style={{margin:"0 0 6px",fontSize:17,fontWeight:900,color:"#0f172a"}}>Start a New Test</h2>
            <p style={{margin:"0 0 20px",fontSize:13,color:"#64748b"}}>Select mode and difficulty, then click Generate. Every test is drawn from our curated question bank. Combinations never repeat.</p>

            {/* Mode selector */}
            <div style={{marginBottom:18}}>
              <div style={{fontSize:12,fontWeight:700,color:"#94a3b8",marginBottom:10,textTransform:"uppercase",letterSpacing:0.8}}>Test Mode</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
                {Object.entries(MODES).map(([k,m])=>(
                  <div key={k} onClick={()=>setMode(k)} style={{border:`2px solid ${mode===k?"#1d4ed8":"#e2e8f0"}`,borderRadius:10,padding:"14px 12px",cursor:"pointer",background:mode===k?"#eff6ff":"#fafafa",transition:"all 0.15s",userSelect:"none",position:"relative"}}>
                    {mode===k&&<div style={{position:"absolute",top:8,right:8,width:8,height:8,borderRadius:"50%",background:"#1d4ed8"}}/>}
                    <div style={{fontWeight:800,fontSize:14,color:mode===k?"#1d4ed8":"#1e293b"}}>{m.label}</div>
                    <div style={{fontSize:11,color:"#94a3b8",marginTop:4}}>{m.tag}</div>
                    {k==="full"&&<div style={{fontSize:10,color:"#7c3aed",fontWeight:700,marginTop:4}}>Comprehensive coverage</div>}
                  </div>
                ))}
              </div>
            </div>

            {/* Difficulty selector */}
            <div style={{marginBottom:22}}>
              <div style={{fontSize:12,fontWeight:700,color:"#94a3b8",marginBottom:10,textTransform:"uppercase",letterSpacing:0.8}}>Difficulty Level</div>
              <div style={{display:"flex",gap:10}}>
                {Object.entries(DIFFS).map(([k,d])=>(
                  <button key={k} onClick={()=>setDifficulty(k)} style={{flex:1,padding:"12px 8px",border:`2px solid ${difficulty===k?d.color:"#e2e8f0"}`,borderRadius:9,cursor:"pointer",background:difficulty===k?d.bg:"#fafafa",color:difficulty===k?d.color:"#374151",fontWeight:800,fontSize:14,transition:"all 0.15s",position:"relative"}}>
                    {difficulty===k&&<div style={{position:"absolute",top:6,right:6,width:7,height:7,borderRadius:"50%",background:d.color}}/>}
                    {d.label}
                    <div style={{fontSize:10,fontWeight:500,marginTop:3,opacity:0.8}}>{d.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Selection summary */}
            <div style={{background:"#f8fafc",borderRadius:8,padding:"10px 14px",marginBottom:16,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
              <span style={{fontSize:13,color:"#64748b"}}>Selected:</span>
              <span style={{background:"#dbeafe",color:"#1d4ed8",fontSize:12,fontWeight:700,padding:"2px 10px",borderRadius:20}}>{MODES[mode].label}</span>
              <span style={{background:DIFFS[difficulty].bg,color:DIFFS[difficulty].color,fontSize:12,fontWeight:700,padding:"2px 10px",borderRadius:20}}>{DIFFS[difficulty].label}</span>
              <span style={{fontSize:12,color:"#94a3b8",marginLeft:"auto"}}>{MODES[mode].tag}</span>
            </div>

            {genError&&<div style={{background:"#fef2f2",border:"1px solid #fecaca",color:"#dc2626",padding:"10px 14px",borderRadius:7,fontSize:13,marginBottom:14,lineHeight:1.6}}>{genError}<br/><span style={{fontSize:12,opacity:0.8}}>Check your internet connection and try again. If the problem persists, try a lower difficulty or shorter mode.</span></div>}

            <button onClick={generateTest} style={{width:"100%",padding:"15px",background:"linear-gradient(135deg,#1e3a8a,#1d4ed8)",color:"white",border:"none",borderRadius:10,fontSize:16,fontWeight:900,cursor:"pointer",letterSpacing:0.4,boxShadow:"0 4px 12px rgba(29,78,216,0.3)"}}>
              Generate &amp; Start Test →
            </button>
          </div>

          {/* Test History */}
          {history.length>0?(
            <div style={{background:"white",borderRadius:12,padding:20,boxShadow:"0 1px 4px rgba(0,0,0,0.07)",border:"1px solid #e2e8f0"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                <h2 style={{margin:0,fontSize:16,fontWeight:800,color:"#0f172a"}}>Test History</h2>
                <span style={{fontSize:12,color:"#94a3b8"}}>{history.length} test{history.length!==1?"s":""} completed</span>
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead><tr style={{background:"#f8fafc"}}>
                    {["Date & Time","Mode","Difficulty","Score","Correct","Wrong","Skipped"].map(h=>(
                      <th key={h} style={{padding:"9px 10px",textAlign:"left",fontWeight:700,color:"#374151",borderBottom:"2px solid #e2e8f0",whiteSpace:"nowrap",fontSize:11,textTransform:"uppercase",letterSpacing:0.3}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {history.map((t,i)=>(
                      <tr key={t.id} style={{borderBottom:"1px solid #f1f5f9",background:i===0?"#fafbff":"white"}}>
                        <td style={{padding:"10px",color:"#64748b",whiteSpace:"nowrap",fontSize:12}}>
                          {new Date(t.date).toLocaleDateString("en-IN",{day:"2-digit",month:"short"})}&nbsp;
                          {new Date(t.date).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}
                          {i===0&&<span style={{background:"#dbeafe",color:"#1d4ed8",fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:10,marginLeft:6}}>Latest</span>}
                        </td>
                        <td style={{padding:"10px",color:"#1e293b"}}>
                          <span style={{textTransform:"capitalize",fontWeight:600}}>{t.mode}</span>
                          {t.abandoned&&<span style={{marginLeft:6,background:"#fef3c7",color:"#b45309",fontSize:10,fontWeight:700,padding:"1px 7px",borderRadius:10,border:"1px solid #fde68a"}}>Incomplete</span>}
                        </td>
                        <td style={{padding:"10px"}}><span style={{background:DIFFS[t.difficulty]?.bg,color:DIFFS[t.difficulty]?.color,padding:"2px 9px",borderRadius:12,fontSize:11,fontWeight:700}}>{t.difficulty}</span></td>
                        <td style={{padding:"10px",fontWeight:900,color:t.percentage>=70?"#16a34a":t.percentage>=50?"#d97706":"#dc2626",fontSize:14}}>{t.score}/{t.maxScore} <span style={{fontSize:12}}>({t.percentage}%)</span></td>
                        <td style={{padding:"10px",color:"#16a34a",fontWeight:700}}>✓ {t.correct}</td>
                        <td style={{padding:"10px",color:"#dc2626",fontWeight:700}}>✗ {t.wrong}</td>
                        <td style={{padding:"10px",color:"#94a3b8"}}>{t.unattempted}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ):(
            <div style={{textAlign:"center",padding:"40px 20px",background:"white",borderRadius:12,boxShadow:"0 1px 4px rgba(0,0,0,0.07)",border:"1px solid #e2e8f0"}}>
              <div style={{fontSize:48,marginBottom:12}}>📝</div>
              <div style={{fontWeight:800,fontSize:17,color:"#1e293b"}}>No tests taken yet</div>
              <div style={{fontSize:14,color:"#64748b",marginTop:6,maxWidth:320,margin:"8px auto 0"}}>Select a mode and difficulty above and generate your first test to start tracking your CUET preparation.</div>
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
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#0f172a,#1e3a8a)",display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <div style={{background:"white",borderRadius:14,padding:"36px 38px",maxWidth:480,width:"100%",textAlign:"center",boxShadow:"0 24px 64px rgba(0,0,0,0.4)"}}>
        <div style={{width:56,height:56,border:"5px solid #e2e8f0",borderTop:"5px solid #1d4ed8",borderRadius:"50%",margin:"0 auto 20px",animation:"spin 0.9s linear infinite"}}/>
        <div style={{fontSize:19,fontWeight:900,color:"#0f172a",marginBottom:6}}>Building Your {MODES[mode]?.label}</div>
        <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:16}}>
          <span style={{background:"#dbeafe",color:"#1d4ed8",fontSize:12,fontWeight:700,padding:"3px 10px",borderRadius:20}}>{MODES[mode]?.q} Questions</span>
          <span style={{background:DIFFS[difficulty]?.bg,color:DIFFS[difficulty]?.color,fontSize:12,fontWeight:700,padding:"3px 10px",borderRadius:20}}>{DIFFS[difficulty]?.label}</span>
        </div>
        {genStage&&<div style={{fontSize:13,color:"#1d4ed8",fontWeight:600,marginBottom:8,background:"#eff6ff",padding:"8px 14px",borderRadius:6}}>{genStage}</div>}
        <div style={{fontSize:12,color:"#94a3b8",marginBottom:24}}>{mode==="full"?"Preparing your Full Mock paper across all sections. Please wait.":"Preparing your personalised test paper. This takes a moment."}</div>
        <div style={{background:"#f0f7ff",border:"1px solid #bfdbfe",borderRadius:9,padding:"14px 16px",textAlign:"left"}}>
          <div style={{fontSize:10,fontWeight:800,color:"#1d4ed8",letterSpacing:1.5,marginBottom:7,textTransform:"uppercase"}}>Exam Strategy Tip</div>
          <div style={{fontSize:13,color:"#1e3a8a",lineHeight:1.8}}>{TIPS[tipIdx]}</div>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ════════════════════════════════════════════════════════
  //  EXAM SCREEN
  // ════════════════════════════════════════════════════════
  if(screen==="exam"&&q){
    const qst=qId=>getQStatus(qId,answers,markedReview,visited);
    const qstyle=qId=>{const s=QS[qst(qId)];return{width:32,height:32,background:s.bg,border:`2px solid ${s.border}`,color:s.text,borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,cursor:"pointer",flexShrink:0};};
    return(
      <div style={{minHeight:"100vh",background:"#d1d5db",fontFamily:"'Segoe UI',system-ui,sans-serif",fontSize:14,display:"flex",flexDirection:"column"}}>
        {/* 5-minute warning overlay */}
        {showWarn&&(
          <div style={{position:"fixed",top:0,left:0,right:0,zIndex:1000,background:"#dc2626",color:"white",textAlign:"center",padding:"10px",fontWeight:800,fontSize:14,animation:"fadeIn 0.3s ease"}}>
            ⚠ Only 5 minutes remaining — review your marked questions now.
            <button onClick={()=>setShowWarn(false)} style={{marginLeft:16,background:"rgba(255,255,255,0.2)",border:"none",color:"white",padding:"3px 10px",borderRadius:4,cursor:"pointer",fontSize:12}}>Dismiss</button>
          </div>
        )}
        {/* NTA Header */}
        <div style={{background:"linear-gradient(135deg,#0f172a,#1e3a8a)",padding:"7px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,marginTop:showWarn?40:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{background:"white",borderRadius:3,padding:"3px 9px",fontWeight:900,fontSize:13,color:"#1a56db",letterSpacing:1.5}}>NTA</div>
            <div style={{color:"white",fontSize:13,fontWeight:700}}>CUET (UG) — 2026 | Common University Entrance Test (Undergraduate)</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{color:"rgba(255,255,255,0.75)",fontSize:12}}>Candidate: <strong style={{color:"white"}}>{user?.name}</strong></div>
            <button onClick={abandonTest}
              style={{background:"rgba(255,200,0,0.15)",border:"1px solid rgba(255,200,0,0.5)",color:"#fde68a",
                padding:"5px 14px",borderRadius:4,cursor:"pointer",fontSize:12,fontWeight:700,letterSpacing:0.3}}>
              Exit Test ✕
            </button>
          </div>
        </div>
        {/* Section / Timer strip */}
        <div style={{background:"#bfdbfe",padding:"7px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"2px solid #93c5fd",flexShrink:0,flexWrap:"wrap",gap:8}}>
          <div style={{fontSize:13,fontWeight:700,color:"#1e40af"}}>Section: LANGUAGE (ENGLISH) | MCQ | {DIFFS[difficulty]?.label} Difficulty</div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:12,fontWeight:600,color:"#1e40af"}}>Time Remaining:</span>
            <span style={{fontFamily:"'Courier New',monospace",fontSize:20,fontWeight:900,color:tColor,background:"white",padding:"3px 12px",borderRadius:3,border:`2px solid ${tColor}`,animation:timerRed?"blink 1s infinite":"none"}}>{fmtTime(timeLeft)}</span>
          </div>
        </div>
        {/* Main layout */}
        <div style={{display:"flex",flex:1,overflow:"hidden",minHeight:0}} className="exam-main">
          {/* Question area */}
          <div style={{flex:1,padding:14,overflowY:"auto",background:"#f0f0f0"}}>
            {/* Q header */}
            <div style={{background:"white",border:"1px solid #d1d5db",borderRadius:3,padding:"9px 14px",marginBottom:10,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontWeight:900,color:"#1e293b",fontSize:16}}>Q. {currentQ+1}</span>
                <span style={{color:"#94a3b8",fontSize:12}}>of {questions.length}</span>
                <span style={{background:TOPICS[q.topic]?.color+"18",color:TOPICS[q.topic]?.color||"#374151",fontSize:11,fontWeight:800,padding:"2px 8px",borderRadius:10,border:`1px solid ${TOPICS[q.topic]?.color||"#374151"}25`}}>{TOPICS[q.topic]?.label||q.topic}</span>
              </div>
              <div style={{fontSize:12,color:"#374151"}}>
                <span style={{color:"#16a34a",fontWeight:700}}>+5</span> Correct &nbsp;
                <span style={{color:"#dc2626",fontWeight:700}}>-1</span> Wrong &nbsp;
                <span style={{color:"#94a3b8",fontWeight:600}}>0</span> Skipped
              </div>
            </div>
            {/* Passage */}
            {passage&&(
              <div style={{background:"#fefce8",border:"1px solid #fde68a",borderRadius:3,padding:"12px 15px",marginBottom:10}}>
                <div style={{fontSize:10,fontWeight:800,color:"#92400e",letterSpacing:1.5,marginBottom:7,textTransform:"uppercase"}}>Read the Following Passage Carefully — {(passage.type||"").toUpperCase()}</div>
                <div style={{maxHeight:190,overflowY:"auto"}}>
                  <p style={{margin:0,lineHeight:1.95,color:"#1c1917",fontSize:13.5}}>{passage.text}</p>
                </div>
              </div>
            )}
            {/* Question text */}
            <div style={{background:"white",border:"1px solid #d1d5db",borderRadius:3,padding:"15px",marginBottom:10}}>
              <p style={{margin:0,fontSize:15,lineHeight:1.9,color:"#1e293b",fontWeight:500}}>{q.question}</p>
            </div>
            {/* Options */}
            <div style={{background:"white",border:"1px solid #d1d5db",borderRadius:3,overflow:"hidden"}}>
              {["A","B","C","D"].map((opt,oi)=>{
                const sel=selectedOpt===opt;
                return(
                  <div key={opt} onClick={()=>setSelectedOpt(opt)} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"13px 16px",cursor:"pointer",background:sel?"#eff6ff":"white",borderBottom:oi<3?"1px solid #f1f5f9":"none",borderLeft:sel?"4px solid #1d4ed8":"4px solid transparent",transition:"all 0.1s",userSelect:"none"}}>
                    <div style={{width:20,height:20,borderRadius:"50%",flexShrink:0,marginTop:3,border:sel?"2px solid #1d4ed8":"2px solid #9ca3af",background:sel?"#1d4ed8":"white",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {sel&&<div style={{width:8,height:8,borderRadius:"50%",background:"white"}}/>}
                    </div>
                    <span style={{fontSize:14,lineHeight:1.75,color:sel?"#1e40af":"#1e293b"}}>
                      <strong style={{marginRight:7,color:sel?"#1e40af":"#374151"}}>{opt}.</strong>{q.options?.[opt]||""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Palette panel */}
          <div style={{width:200,background:"white",borderLeft:"2px solid #d1d5db",display:"flex",flexDirection:"column",flexShrink:0,overflow:"hidden"}} className="exam-palette">
            <div style={{background:"linear-gradient(135deg,#1e3a8a,#1d4ed8)",color:"white",fontWeight:800,fontSize:11,padding:"7px 10px",textAlign:"center",letterSpacing:1,textTransform:"uppercase",flexShrink:0}}>Question Palette</div>
            <div style={{padding:"9px 12px",borderBottom:"1px solid #f1f5f9",display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
              <div style={{width:30,height:30,borderRadius:"50%",background:"linear-gradient(135deg,#1e3a8a,#1d4ed8)",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:900,fontSize:14,flexShrink:0}}>{user?.name?.[0]?.toUpperCase()}</div>
              <div style={{fontSize:11,fontWeight:600,color:"#1e293b",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.name}</div>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:10}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:4,marginBottom:14}} className="exam-palette-grid">
                {questions.map((qi,idx)=>(
                  <div key={qi.id} onClick={()=>goTo(idx)} style={{...qstyle(qi.id),outline:idx===currentQ?"3px solid #f59e0b":"none",outlineOffset:1}}>{idx+1}</div>
                ))}
              </div>
              <div style={{fontSize:11,color:"#374151"}}>
                <div style={{fontWeight:700,marginBottom:6,fontSize:10,textTransform:"uppercase",letterSpacing:0.5,color:"#94a3b8"}}>Colour Guide</div>
                {[["not_visited","Not Visited"],["not_answered","Not Answered"],["answered","Answered"],["review","Marked – Review"],["answered_review","Answered + Marked"]].map(([s,l])=>(
                  <div key={s} style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
                    <div style={{width:15,height:15,background:QS[s].bg,border:`2px solid ${QS[s].border}`,borderRadius:2,flexShrink:0}}/>
                    <span style={{fontSize:10}}>{l}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Live counters + submit */}
            <div style={{padding:10,borderTop:"1px solid #e2e8f0",flexShrink:0}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:8}}>
                <div style={{background:"#dcfce7",padding:"7px",borderRadius:5,textAlign:"center"}}><div style={{fontWeight:900,fontSize:17,color:"#16a34a"}}>{answeredCount}</div><div style={{fontSize:9,color:"#166534",textTransform:"uppercase",letterSpacing:0.3}}>Answered</div></div>
                <div style={{background:"#fef3c7",padding:"7px",borderRadius:5,textAlign:"center"}}><div style={{fontWeight:900,fontSize:17,color:"#d97706"}}>{questions.length-answeredCount}</div><div style={{fontSize:9,color:"#92400e",textTransform:"uppercase",letterSpacing:0.3}}>Remaining</div></div>
              </div>
              <button onClick={()=>{if(window.confirm(`Submit test?

Answered: ${answeredCount}
Unattempted: ${questions.length-answeredCount}

You cannot undo this.`))doSubmit();}} style={{width:"100%",padding:"9px",background:"linear-gradient(135deg,#7f1d1d,#dc2626)",color:"white",border:"none",borderRadius:4,fontWeight:900,fontSize:13,cursor:"pointer",letterSpacing:0.5}}>SUBMIT TEST</button>
            </div>
          </div>
        </div>
        {/* Bottom toolbar */}
        <div style={{background:"white",borderTop:"2px solid #d1d5db",padding:"9px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,flexWrap:"wrap",gap:8}} className="toolbar-row">
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <button onClick={()=>currentQ>0&&goTo(currentQ-1)} disabled={currentQ===0} style={{padding:"8px 16px",background:currentQ===0?"#f8fafc":"#e2e8f0",border:"1px solid #d1d5db",borderRadius:3,cursor:currentQ===0?"not-allowed":"pointer",fontSize:13,color:currentQ===0?"#94a3b8":"#374151",fontWeight:600}}>◄ Back</button>
            <button onClick={clearResponse} style={{padding:"8px 14px",background:"transparent",border:"none",color:"#dc2626",cursor:"pointer",fontSize:13,textDecoration:"underline",fontWeight:600}}>Clear Response</button>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={markAndNext} style={{padding:"9px 16px",background:"linear-gradient(135deg,#4c1d95,#7c3aed)",color:"white",border:"none",borderRadius:3,cursor:"pointer",fontSize:13,fontWeight:700}}>Mark for Review &amp; Next ►</button>
            <button onClick={saveAndNext} style={{padding:"9px 22px",background:"linear-gradient(135deg,#1e3a8a,#1d4ed8)",color:"white",border:"none",borderRadius:3,cursor:"pointer",fontSize:14,fontWeight:900}}>Save &amp; Next ►</button>
          </div>
        </div>
        <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0.5}} @keyframes fadeIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}`}</style>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════
  //  RESULTS SCREEN
  // ════════════════════════════════════════════════════════
  if(screen==="results"&&results){
    const sc=results.percentage>=70?"#16a34a":results.percentage>=50?"#d97706":"#dc2626";
    const ctxMsg = results.percentage>=80?"Strong performance. Well above typical qualifying range."
      :results.percentage>=70?"On target. You are within the competitive zone for most universities."
      :results.percentage>=50?"Below competitive range. Significant improvement needed before exam day."
      :"Critical gap. Foundational work required across multiple topic types.";
    return(
      <div style={{minHeight:"100vh",background:"#eef2f7",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
        <div style={{background:"linear-gradient(135deg,#0f172a,#1e3a8a)",padding:"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
          <div style={{color:"white",fontWeight:700,fontSize:15}}>CUET (UG) 2026 — English (101) | Test Results</div>
          <button onClick={()=>setScreen("dashboard")} style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",color:"white",padding:"6px 14px",borderRadius:4,cursor:"pointer",fontSize:12,fontWeight:600}}>← Dashboard</button>
        </div>
        <div style={{maxWidth:820,margin:"0 auto",padding:"22px 20px"}}>
          {/* Score card */}
          <div style={{background:"white",borderRadius:12,padding:"28px 24px",boxShadow:"0 4px 20px rgba(0,0,0,0.08)",marginBottom:16,textAlign:"center",borderTop:`5px solid ${sc}`}}>
            <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",letterSpacing:1.5,marginBottom:8,textTransform:"uppercase"}}>Your Score</div>
            <div style={{fontSize:70,fontWeight:900,color:sc,lineHeight:1}}>{results.score}</div>
            <div style={{fontSize:16,color:"#94a3b8",marginBottom:10}}>out of {results.maxScore} marks</div>
            <div style={{display:"inline-block",background:sc+"15",color:sc,fontWeight:900,fontSize:24,padding:"5px 24px",borderRadius:40,border:`1px solid ${sc}30`,marginBottom:16}}>{results.percentage}%</div>
            {/* CUET context message */}
            <div style={{background:"#f8fafc",borderRadius:8,padding:"10px 16px",marginBottom:20,fontSize:13,color:"#374151",fontWeight:600,maxWidth:500,margin:"0 auto 20px"}}>{ctxMsg}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,maxWidth:480,margin:"0 auto"}}>
              {[{v:results.correct,l:"Correct",c:"#16a34a",p:`+${results.correct*5} marks`},{v:results.wrong,l:"Wrong",c:"#dc2626",p:`-${results.wrong} marks`},{v:results.unattempted,l:"Skipped",c:"#94a3b8",p:"0 marks"}]
                .map(({v,l,c,p})=>(
                  <div key={l} style={{background:"#f8fafc",borderRadius:9,padding:"14px 8px"}}>
                    <div style={{fontSize:30,fontWeight:900,color:c}}>{v}</div>
                    <div style={{fontSize:12,color:"#64748b",fontWeight:600}}>{l}</div>
                    <div style={{fontSize:11,color:c,fontWeight:700,marginTop:3}}>{p}</div>
                  </div>
                ))}
            </div>
          </div>
          {/* Topic performance */}
          <div style={{background:"white",borderRadius:11,padding:22,boxShadow:"0 1px 4px rgba(0,0,0,0.07)",marginBottom:14}}>
            <h2 style={{margin:"0 0 18px",fontSize:16,fontWeight:900,color:"#0f172a"}}>Topic-wise Performance</h2>
            {Object.entries(results.topicStats).sort(([,a],[,b])=>(a.correct/a.total||0)-(b.correct/b.total||0)).map(([t,s])=>{
              const acc=s.total?Math.round(s.correct/s.total*100):0;
              const tc=TOPICS[t];
              const bc=acc>=70?"#16a34a":acc>=50?"#d97706":"#dc2626";
              return(
                <div key={t} style={{marginBottom:18}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{background:tc?.color+"18",color:tc?.color||"#374151",fontSize:10,fontWeight:800,padding:"2px 7px",borderRadius:10,border:`1px solid ${tc?.color||"#374151"}25`}}>{tc?.abbr||t}</span>
                      <span style={{fontSize:13,fontWeight:600,color:"#374151"}}>{tc?.label||t}</span>
                      {acc<50&&<span style={{fontSize:10,color:"#dc2626",fontWeight:700,background:"#fee2e2",padding:"1px 6px",borderRadius:8}}>Needs Work</span>}
                    </div>
                    <div style={{display:"flex",gap:12,alignItems:"center"}}>
                      <span style={{fontSize:11,color:"#94a3b8"}}>{s.correct}/{s.total}</span>
                      <span style={{fontSize:15,fontWeight:900,color:bc,minWidth:42,textAlign:"right"}}>{acc}%</span>
                    </div>
                  </div>
                  <div style={{background:"#f1f5f9",borderRadius:100,height:10,overflow:"hidden"}}>
                    <div style={{height:"100%",borderRadius:100,background:bc,width:acc+"%",transition:"width 0.8s ease"}}/>
                  </div>
                  <div style={{display:"flex",gap:14,marginTop:4,fontSize:11}}>
                    <span style={{color:"#16a34a"}}>✓ {s.correct} correct</span>
                    <span style={{color:"#dc2626"}}>✗ {s.wrong} wrong</span>
                    <span style={{color:"#94a3b8"}}>— {s.unattempted} skipped</span>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Question review */}
          <div style={{background:"white",borderRadius:11,padding:20,boxShadow:"0 1px 4px rgba(0,0,0,0.07)",marginBottom:16}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
              <h2 style={{margin:0,fontSize:16,fontWeight:900,color:"#0f172a"}}>Question Review</h2>
              <span style={{fontSize:12,color:"#94a3b8"}}>Click any question to expand</span>
            </div>
            {results.questionResults.map((qr,i)=>{
              const isOpen=reviewOpen===qr.id;
              const sc2={correct:"#16a34a",wrong:"#dc2626",unattempted:"#94a3b8"}[qr.status];
              const sbg={correct:"#f0fdf4",wrong:"#fff1f1",unattempted:"#f8fafc"}[qr.status];
              const psg=qr.passage_id?passages.find(p=>p.id===qr.passage_id):null;
              return(
                <div key={qr.id} style={{border:`1px solid ${sc2}30`,borderRadius:8,marginBottom:8,overflow:"hidden"}}>
                  <div onClick={()=>setReviewOpen(isOpen?null:qr.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",cursor:"pointer",background:sbg,userSelect:"none"}}>
                    <div style={{width:26,height:26,borderRadius:"50%",background:sc2,color:"white",fontWeight:900,fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</div>
                    <div style={{flex:1,fontSize:13,color:"#1e293b",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{(qr.question||"").slice(0,90)}{(qr.question||"").length>90?"...":""}</div>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                      <span style={{background:TOPICS[qr.topic]?.color+"18",color:TOPICS[qr.topic]?.color,fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:8}}>{TOPICS[qr.topic]?.abbr}</span>
                      <span style={{fontSize:11,fontWeight:800,color:sc2,textTransform:"uppercase"}}>{qr.status}</span>
                      <span style={{fontSize:11,color:"#94a3b8"}}>{isOpen?"▲":"▼"}</span>
                    </div>
                  </div>
                  {isOpen&&(
                    <div style={{padding:"14px 16px",borderTop:`1px solid ${sc2}20`,background:"white"}}>
                      {psg&&<div style={{background:"#fefce8",border:"1px solid #fde68a",borderRadius:5,padding:"10px 12px",marginBottom:12,fontSize:12,lineHeight:1.85,color:"#1c1917",maxHeight:130,overflowY:"auto"}}>{psg.text}</div>}
                      <p style={{margin:"0 0 12px",fontSize:14,fontWeight:600,color:"#1e293b",lineHeight:1.7}}>{qr.question}</p>
                      {["A","B","C","D"].map(opt=>{
                        const isC=opt===qr.correct, uW=opt===qr.userAnswer&&!isC;
                        return(
                          <div key={opt} style={{padding:"9px 12px",borderRadius:6,marginBottom:5,fontSize:13,background:isC?"#dcfce7":uW?"#fee2e2":"#f8fafc",border:`1px solid ${isC?"#16a34a":uW?"#dc2626":"#e2e8f0"}`,color:isC?"#14532d":uW?"#7f1d1d":"#374151"}}>
                            <strong style={{marginRight:6}}>{opt}.</strong>{qr.options?.[opt]}{isC?" ✓":""}{uW?" ✗ Your Answer":""}
                          </div>
                        );
                      })}
                      {qr.explanation&&<div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:6,padding:"10px 13px",marginTop:10,fontSize:13,color:"#1e40af",lineHeight:1.65}}><strong>Why: </strong>{qr.explanation}</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {/* Action buttons */}
          <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
            <button onClick={getAdvisory} disabled={loadingAdv} style={{flex:2,minWidth:200,padding:"15px",background:loadingAdv?"#94a3b8":"linear-gradient(135deg,#4c1d95,#7c3aed)",color:"white",border:"none",borderRadius:10,fontSize:15,fontWeight:900,cursor:loadingAdv?"not-allowed":"pointer",boxShadow:loadingAdv?"none":"0 4px 12px rgba(124,58,237,0.3)"}}>
              {loadingAdv?"Preparing Performance Advisory...":"Get Performance Advisory →"}
            </button>
            <button onClick={()=>setScreen("dashboard")} style={{flex:1,minWidth:140,padding:"15px",background:"white",color:"#1d4ed8",border:"2px solid #1d4ed8",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer"}}>Take New Test</button>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════
  //  ADVISORY SCREEN
  // ════════════════════════════════════════════════════════
  if(screen==="advisory") return(
    <div style={{minHeight:"100vh",background:"#eef2f7",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <div style={{background:"linear-gradient(135deg,#3b0764,#7c3aed)",padding:"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
        <div style={{color:"white",fontWeight:700,fontSize:15}}>Performance Advisory — CUET English (101)</div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setScreen("results")} style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",color:"white",padding:"6px 14px",borderRadius:4,cursor:"pointer",fontSize:12,fontWeight:600}}>← Results</button>
          <button onClick={()=>setScreen("dashboard")} style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",color:"white",padding:"6px 14px",borderRadius:4,cursor:"pointer",fontSize:12,fontWeight:600}}>Dashboard</button>
        </div>
      </div>
      <div style={{maxWidth:760,margin:"0 auto",padding:"26px 20px"}}>
        {results&&(
          <div style={{display:"flex",gap:10,marginBottom:18,flexWrap:"wrap"}}>
            {[{v:`${results.score}/${results.maxScore}`,l:"Score",c:"#1d4ed8"},{v:`${results.percentage}%`,l:"Percentage",c:results.percentage>=70?"#16a34a":results.percentage>=50?"#d97706":"#dc2626"},{v:results.correct,l:"Correct",c:"#16a34a"},{v:results.wrong,l:"Wrong",c:"#dc2626"},{v:results.unattempted,l:"Skipped",c:"#94a3b8"}]
              .map(({v,l,c})=>(
                <div key={l} style={{background:"white",borderRadius:9,padding:"10px 16px",boxShadow:"0 1px 4px rgba(0,0,0,0.07)",textAlign:"center",minWidth:80}}>
                  <div style={{fontSize:20,fontWeight:900,color:c}}>{v}</div>
                  <div style={{fontSize:11,color:"#64748b",fontWeight:600}}>{l}</div>
                </div>
              ))}
          </div>
        )}
        <div style={{background:"white",borderRadius:13,padding:"28px 30px",boxShadow:"0 4px 20px rgba(0,0,0,0.08)",borderLeft:"5px solid #7c3aed",marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20,paddingBottom:16,borderBottom:"1px solid #f1f5f9"}}>
            <div style={{width:44,height:44,borderRadius:"50%",background:"linear-gradient(135deg,#4c1d95,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:22,flexShrink:0}}>🎓</div>
            <div>
              <div style={{fontWeight:900,fontSize:16,color:"#1e293b"}}>Coaching Advisory — {user?.name}</div>
              <div style={{fontSize:12,color:"#94a3b8",marginTop:2}}>Personalised analysis based on your actual wrong answers and topic gaps</div>
            </div>
          </div>
          <div style={{fontSize:15,lineHeight:2.05,color:"#1e293b",whiteSpace:"pre-wrap"}}>{advisory}</div>
        </div>
        <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:8,padding:"12px 16px",marginBottom:16,fontSize:13,color:"#1e40af",lineHeight:1.7}}>
          <strong>Tip:</strong> Save this advisory by copying the text or taking a screenshot. Run at least 3 tests before your next advisory for more accurate gap analysis.
        </div>
        <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
          <button onClick={generateTest} style={{flex:1,minWidth:180,padding:"14px",background:"linear-gradient(135deg,#1e3a8a,#1d4ed8)",color:"white",border:"none",borderRadius:10,fontSize:15,fontWeight:900,cursor:"pointer",boxShadow:"0 4px 12px rgba(29,78,216,0.25)"}}>Start Next Test →</button>
          <button onClick={()=>setScreen("dashboard")} style={{flex:1,minWidth:140,padding:"14px",background:"white",color:"#374151",border:"2px solid #e2e8f0",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer"}}>← Dashboard</button>
        </div>
      </div>
    </div>
  );

  return null;
}
