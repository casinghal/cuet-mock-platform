import { useState, useEffect, useRef, useCallback } from "react";

const MODES = {
  quick:    { label:"Quick Practice", q:15, secs:1080, tag:"15 Questions \u00b7 18 Minutes", maxT:4000 },
  standard: { label:"Standard Test",  q:30, secs:2160, tag:"30 Questions \u00b7 36 Minutes", maxT:7000 },
  full:     { label:"Full Mock Test", q:50, secs:3600, tag:"50 Questions \u00b7 60 Minutes", maxT:10000 },
};
const DIFFS = {
  easy:   { label:"Easy",   color:"#16a34a", bg:"#dcfce7", desc:"Simple vocab, direct questions" },
  medium: { label:"Medium", color:"#d97706", bg:"#fef3c7", desc:"Moderate vocab, some inference" },
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
  "Attempt Reading Comprehension first \u2014 it carries the highest weight in CUET English (101).",
  "For synonyms/antonyms, eliminate two obviously wrong options first, then decide between the remaining two.",
  "In sentence rearrangement, the topic sentence never begins with a pronoun or a conjunction.",
  "CUET deducts 1 mark per wrong answer. If you are unsure, leave it blank \u2014 skipping costs 0.",
  "For fill-in-the-blank, always read the full sentence before selecting. Context is the deciding factor.",
  "Factual RC passages have direct answers. Literary passages require you to infer from tone and implication.",
  "Mark for Review if you have a strong instinct \u2014 return after finishing all other questions.",
  "Train to pace at 1.2 minutes per question. 50 questions, 60 minutes \u2014 every second matters.",
];

function buildTestPrompt(mode, diff) {
  const d = {
    quick:    { rc:[1,4],  sa:4,  cw:3,  sr:2, mf:0, vg:2 },
    standard: { rc:[2,10], sa:6,  cw:7,  sr:4, mf:2, vg:1 },
    full:     { rc:[3,16], sa:10, cw:12, sr:7, mf:3, vg:2 },
  }[mode];
  const total = MODES[mode].q;
  const ptypes = ["factual","narrative","literary"].slice(0,d.rc[0]).join(", ");
  const ddesc = { easy:"simple vocabulary, direct factual questions, obvious inference", medium:"moderate vocabulary above HSC level, some inference required, plausible distractors", hard:"advanced GRE-level vocabulary, complex literary passages, abstract inference, tricky distractors" }[diff];
  return `You are a senior CUET UG English-101 paper setter for the National Testing Agency (NTA). Create a complete practice test.\n\nDifficulty: ${diff} \u2014 ${ddesc}\nTotal: ${total} questions\n\nQuestion distribution:\n- Reading Comprehension: ${d.rc[0]} passage(s), ${d.rc[1]} questions total. Types: ${ptypes}. Each passage 220-265 words, original content.\n- Synonyms & Antonyms: ${d.sa} questions \u2014 mix of "Choose the SYNONYM of WORD:" and "Choose the ANTONYM of WORD:"\n- Choose Correct Word: ${d.cw} fill-in-the-blank, one blank per sentence\n- Sentence Rearrangement: ${d.sr} questions \u2014 four sentences labeled P Q R S, options are 4 distinct orderings\n${d.mf>0?`- Match the Following: ${d.mf} questions \u2014 Column A (4 items) matched with Column B (4 items), options show 4 different match combinations`:""}\n- Vocabulary & Grammar: ${d.vg} question(s) \u2014 error identification, idiom meaning, or correct word usage\n\nSTRICT RULES:\n1. Total must equal exactly ${total} questions\n2. Every question: exactly 4 options A B C D \u2014 exactly one correct\n3. All options must be genuinely plausible \u2014 zero obviously wrong distractors\n4. Passages go in a SEPARATE "passages" array \u2014 questions reference by passage_id only\n5. Sentence rearrangement: show P Q R S as separate labelled sentences, options are orderings like "PQRS"\n6. Explanation: 1-2 sentences max\n\nReturn ONLY valid compact JSON, no markdown, no preamble:\n{"passages":[{"id":"P1","type":"factual","text":"passage text"}],"questions":[{"id":1,"topic":"reading_comprehension","passage_id":"P1","question":"...?","options":{"A":"...","B":"...","C":"...","D":"..."},"correct":"A","explanation":"..."},{"id":${d.rc[1]+1},"topic":"synonyms_antonyms","question":"Choose the SYNONYM of ELOQUENT:","options":{"A":"Silent","B":"Articulate","C":"Confused","D":"Verbose"},"correct":"B","explanation":"Eloquent means fluent and persuasive."}]}`;
}

function buildAdvisoryPrompt(res, name) {
  const tperf = Object.entries(res.topicStats).sort(([,a],[,b])=>(a.correct/a.total||0)-(b.correct/b.total||0)).map(([t,s])=>`${TOPICS[t]?.label||t}: ${s.correct}/${s.total} correct (${s.total?Math.round(s.correct/s.total*100):0}%)`).join("\n");
  const wrongs = (res.questionResults||[]).filter(q=>q.status==="wrong").slice(0,6).map(q=>`[${TOPICS[q.topic]?.abbr||q.topic}] "${(q.question||"").slice(0,65)}..." \u2014 chose ${q.userAnswer}, correct: ${q.correct}`).join("\n");
  return `CUET English coaching session. Student: ${name} (Class 12, CUET UG 2026).\n\nScore: ${res.score}/${res.maxScore} (${res.percentage}%)\nCorrect: ${res.correct} | Wrong: ${res.wrong} | Skipped: ${res.unattempted}\nMarking: +5 correct, -1 wrong, 0 skipped\n\nTopic performance (weakest first):\n${tperf}\n\nSample wrong answers:\n${wrongs||"None"}\n\nWrite a coaching advisory in 300-360 words. Four paragraphs, no bullets, no headers:\nPara 1: Honest assessment of the score in CUET context.\nPara 2: 2-3 weakest areas and exactly what practice will fix each gap.\nPara 3: Attempt strategy for next test.\nPara 4: One specific daily practice habit for 14 days.\n\nWrite like a results-focused exam coach. No motivational filler.`;
}

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

async function callAI(prompt, max_tokens) {
  const res = await fetch("/api/anthropic-proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, max_tokens }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "API error");
  return data;
}

export default function CUETPlatform() {
  const [user,setUser]=useState(null);
  const [authMode,setAuthMode]=useState("login");
  const [authForm,setAuthForm]=useState({name:"",email:"",password:""});
  const [authErr,setAuthErr]=useState("");
  const [screen,setScreen]=useState("auth");
  const [mode,setMode]=useState("standard");
  const [difficulty,setDifficulty]=useState("medium");
  const [questions,setQuestions]=useState([]);
  const [passages,setPassages]=useState([]);
  const [currentQ,setCurrentQ]=useState(0);
  const [answers,setAnswers]=useState({});
  const [markedReview,setMarkedReview]=useState(new Set());
  const [visited,setVisited]=useState(new Set());
  const [selectedOpt,setSelectedOpt]=useState(null);
  const [timeLeft,setTimeLeft]=useState(2160);
  const [tipIdx,setTipIdx]=useState(0);
  const [results,setResults]=useState(null);
  const [history,setHistory]=useState([]);
  const [advisory,setAdvisory]=useState("");
  const [loadingAdv,setLoadingAdv]=useState(false);
  const [genError,setGenError]=useState("");
  const [reviewOpen,setReviewOpen]=useState(null);
  const timerRef=useRef(null);
  const submitRef=useRef(null);

  const doSubmit=useCallback(()=>{
    clearInterval(timerRef.current);
    const q=questions[currentQ];
    const finalAns=selectedOpt&&q?{...answers,[q.id]:selectedOpt}:{...answers};
    const r=computeResults(questions,finalAns);
    setResults(r);
    if(user){
      const entry={id:Date.now().toString(),date:new Date().toISOString(),mode,difficulty,score:r.score,maxScore:r.maxScore,percentage:r.percentage,correct:r.correct,wrong:r.wrong,unattempted:r.unattempted,qCount:questions.length};
      const h=[entry,...getHist(user.id)].slice(0,30);
      saveHist(user.id,h);setHistory(h);
    }
    setScreen("results");
  },[questions,currentQ,answers,selectedOpt,user,mode,difficulty]);

  useEffect(()=>{submitRef.current=doSubmit;},[doSubmit]);

  useEffect(()=>{
    if(screen==="exam"){
      timerRef.current=setInterval(()=>{setTimeLeft(t=>{if(t<=1){clearInterval(timerRef.current);submitRef.current?.();return 0;}return t-1;});},1000);
    }
    return()=>clearInterval(timerRef.current);
  },[screen]);

  useEffect(()=>{
    if(screen==="generating"){const t=setInterval(()=>setTipIdx(i=>(i+1)%TIPS.length),3800);return()=>clearInterval(t);}
  },[screen]);

  const handleAuth=()=>{
    setAuthErr("");
    const users=getUsers();
    const{name,email,password}=authForm;
    if(!email.trim()||!password){setAuthErr("Email and password are required.");return;}
    if(authMode==="register"){
      if(!name.trim()){setAuthErr("Full name is required.");return;}
      if(users[email]){setAuthErr("Account already exists. Please sign in.");return;}
      if(password.length<6){setAuthErr("Password must be at least 6 characters.");return;}
      const nu={id:Date.now().toString(),name:name.trim(),email:email.trim(),created:new Date().toISOString()};
      saveUsers({...users,[email]:{...nu,password}});
      setUser(nu);setHistory([]);setScreen("dashboard");
    }else{
      const u=users[email.trim()];
      if(!u||u.password!==password){setAuthErr("Invalid email or password.");return;}
      const{password:_,...safe}=u;
      setUser(safe);setHistory(getHist(u.id));setScreen("dashboard");
    }
  };

  const handleLogout=()=>{clearInterval(timerRef.current);setUser(null);setScreen("auth");setAuthForm({name:"",email:"",password:""});};

  const goTo=useCallback((idx)=>{
    const qid=questions[idx]?.id;
    if(qid!=null)setVisited(v=>new Set([...v,qid]));
    setCurrentQ(idx);setSelectedOpt(answers[questions[idx]?.id]||null);
  },[questions,answers]);

  const saveAndNext=()=>{const q=questions[currentQ];if(selectedOpt&&q)setAnswers(a=>({...a,[q.id]:selectedOpt}));if(currentQ<questions.length-1)goTo(currentQ+1);};
  const markAndNext=()=>{const q=questions[currentQ];if(selectedOpt&&q)setAnswers(a=>({...a,[q.id]:selectedOpt}));if(q)setMarkedReview(m=>{const s=new Set(m);s.add(q.id);return s;});if(currentQ<questions.length-1)goTo(currentQ+1);};
  const clearResponse=()=>{const q=questions[currentQ];setSelectedOpt(null);if(q){setAnswers(a=>{const n={...a};delete n[q.id];return n;});setMarkedReview(m=>{const s=new Set(m);s.delete(q.id);return s;});}};

  const generateTest=async()=>{
    setGenError("");setScreen("generating");
    try{
      const data=await callAI(buildTestPrompt(mode,difficulty),MODES[mode].maxT);
      const txt=data.content.filter(b=>b.type==="text").map(b=>b.text).join("");
      const clean=txt.replace(/```json\n?|```\n?/g,"").trim();
      const parsed=JSON.parse(clean);
      const qs=parsed.questions||[];const ps=parsed.passages||[];
      if(!qs.length)throw new Error("No questions returned. Please try again.");
      setPassages(ps);setQuestions(qs);setAnswers({});setMarkedReview(new Set());
      setVisited(new Set([qs[0]?.id]));setCurrentQ(0);setSelectedOpt(null);
      setResults(null);setAdvisory("");setTimeLeft(MODES[mode].secs);setScreen("exam");
    }catch(e){setGenError("Generation failed: "+e.message);setScreen("dashboard");}
  };

  const getAdvisory=async()=>{
    if(!results)return;setLoadingAdv(true);
    try{
      const data=await callAI(buildAdvisoryPrompt(results,user?.name||"Student"),1000);
      const txt=data.content.filter(b=>b.type==="text").map(b=>b.text).join("");
      setAdvisory(txt);setScreen("advisory");
    }catch{setAdvisory("Advisory unavailable. Please try again.");setScreen("advisory");}
    finally{setLoadingAdv(false);}
  };

  const q=questions[currentQ];
  const passage=q?.passage_id?passages.find(p=>p.id===q.passage_id):null;
  const answeredCount=Object.keys(answers).length;
  const timerRed=timeLeft<300,timerAmber=timeLeft<600&&!timerRed;
  const tColor=timerRed?"#dc2626":timerAmber?"#b45309":"#1e3a8a";

  if(screen==="auth")return(
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#0f172a 0%,#1e3a8a 55%,#1d4ed8 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <div style={{marginBottom:20,textAlign:"center"}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:10,background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:8,padding:"8px 18px",marginBottom:10}}>
          <div style={{fontWeight:900,fontSize:17,color:"white",letterSpacing:2}}>NTA</div>
          <div style={{width:1,height:22,background:"rgba(255,255,255,0.25)"}}/>
          <div style={{color:"rgba(255,255,255,0.9)",fontSize:13,fontWeight:600}}>CUET (UG) 2026</div>
        </div>
        <div style={{color:"rgba(255,255,255,0.5)",fontSize:12}}>English \u2014 Section I (Language) \u00b7 Mock Test Platform</div>
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
        {authMode==="register"&&<div style={{marginBottom:14}}><label style={{display:"block",fontSize:12,fontWeight:700,color:"#374151",marginBottom:5,textTransform:"uppercase",letterSpacing:0.5}}>Full Name</label><input value={authForm.name} onChange={e=>setAuthForm(f=>({...f,name:e.target.value}))} placeholder="Your full name" style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e2e8f0",borderRadius:7,fontSize:14,boxSizing:"border-box",outline:"none"}}/></div>}
        <div style={{marginBottom:14}}><label style={{display:"block",fontSize:12,fontWeight:700,color:"#374151",marginBottom:5,textTransform:"uppercase",letterSpacing:0.5}}>Email Address</label><input type="email" value={authForm.email} onChange={e=>setAuthForm(f=>({...f,email:e.target.value}))} placeholder="you@email.com" style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e2e8f0",borderRadius:7,fontSize:14,boxSizing:"border-box",outline:"none"}}/></div>
        <div style={{marginBottom:authErr?"12px":"20px"}}><label style={{display:"block",fontSize:12,fontWeight:700,color:"#374151",marginBottom:5,textTransform:"uppercase",letterSpacing:0.5}}>Password</label><input type="password" value={authForm.password} onChange={e=>setAuthForm(f=>({...f,password:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&handleAuth()} placeholder="Minimum 6 characters" style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e2e8f0",borderRadius:7,fontSize:14,boxSizing:"border-box",outline:"none"}}/></div>
        {authErr&&<div style={{background:"#fef2f2",border:"1px solid #fecaca",color:"#dc2626",padding:"9px 12px",borderRadius:6,fontSize:13,marginBottom:16}}>{authErr}</div>}
        <button onClick={handleAuth} style={{width:"100%",padding:"12px",background:"linear-gradient(135deg,#1e3a8a,#1d4ed8)",color:"white",border:"none",borderRadius:8,fontSize:15,fontWeight:800,cursor:"pointer"}}>{authMode==="login"?"Sign In \u2192":"Create Account \u2192"}</button>
        <div style={{textAlign:"center",marginTop:14,fontSize:12,color:"#94a3b8"}}>{authMode==="login"?"New here? ":"Have an account? "}<button onClick={()=>setAuthMode(authMode==="login"?"register":"login")} style={{background:"none",border:"none",color:"#1d4ed8",cursor:"pointer",fontWeight:700,fontSize:12,textDecoration:"underline"}}>{authMode==="login"?"Register for free":"Sign in instead"}</button></div>
      </div>
    </div>
  );

  if(screen==="dashboard"){
    const best=history.length?Math.max(...history.map(t=>t.percentage)):null;
    const avg=history.length?Math.round(history.reduce((s,t)=>s+t.percentage,0)/history.length):null;
    const totalDone=history.reduce((s,t)=>s+(t.qCount||0),0);
    return(
      <div style={{minHeight:"100vh",background:"#eef2f7",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
        <div style={{background:"linear-gradient(135deg,#0f172a,#1e3a8a)",padding:"11px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{background:"white",borderRadius:4,padding:"4px 10px",fontWeight:900,fontSize:13,color:"#1a56db",letterSpacing:1.5}}>NTA</div>
            <div style={{color:"white"}}><div style={{fontWeight:700,fontSize:15}}>CUET (UG) 2026 \u2014 English (101)</div><div style={{fontSize:11,opacity:0.55}}>Mock Test Practice Platform</div></div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{textAlign:"right",color:"white"}}><div style={{fontWeight:700,fontSize:14}}>{user?.name}</div><div style={{fontSize:11,opacity:0.5}}>{user?.email}</div></div>
            <button onClick={handleLogout} style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",color:"white",padding:"6px 14px",borderRadius:5,cursor:"pointer",fontSize:12,fontWeight:600}}>Logout</button>
          </div>
        </div>
        <div style={{maxWidth:900,margin:"0 auto",padding:"22px 20px"}}>
          <div style={{marginBottom:18}}><h1 style={{margin:0,fontSize:21,fontWeight:900,color:"#0f172a"}}>Welcome, {user?.name?.split(" ")[0]}</h1><p style={{margin:"4px 0 0",color:"#64748b",fontSize:14}}>CUET English \u2014 Section I \u00b7 Language Test (101)</p></div>
          {history.length>0&&<div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:18}}>{[{v:history.length,l:"Tests Taken",c:"#1d4ed8"},{v:(best||0)+"%",l:"Best Score",c:"#16a34a"},{v:(avg||0)+"%",l:"Avg Score",c:"#d97706"},{v:totalDone,l:"Questions Done",c:"#7c3aed"}].map(({v,l,c})=><div key={l} style={{background:"white",borderRadius:9,padding:"14px 16px",boxShadow:"0 1px 4px rgba(0,0,0,0.07)",borderTop:`3px solid ${c}`}}><div style={{fontSize:26,fontWeight:900,color:c,lineHeight:1.1}}>{v}</div><div style={{fontSize:12,color:"#64748b",marginTop:3}}>{l}</div></div>)}</div>}
          <div style={{background:"white",borderRadius:11,padding:24,boxShadow:"0 1px 4px rgba(0,0,0,0.07)",marginBottom:18}}>
            <h2 style={{margin:"0 0 18px",fontSize:17,fontWeight:800,color:"#0f172a"}}>Start a New Test</h2>
            <div style={{marginBottom:18}}><div style={{fontSize:12,fontWeight:700,color:"#64748b",marginBottom:10,textTransform:"uppercase",letterSpacing:0.8}}>Test Mode</div><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>{Object.entries(MODES).map(([k,m])=><div key={k} onClick={()=>setMode(k)} style={{border:`2px solid ${mode===k?"#1d4ed8":"#e2e8f0"}`,borderRadius:9,padding:"14px 12px",cursor:"pointer",background:mode===k?"#eff6ff":"white",transition:"all 0.15s",userSelect:"none"}}><div style={{fontWeight:800,fontSize:14,color:mode===k?"#1d4ed8":"#1e293b"}}>{m.label}</div><div style={{fontSize:11,color:"#94a3b8",marginTop:4}}>{m.tag}</div></div>)}</div></div>
            <div style={{marginBottom:22}}><div style={{fontSize:12,fontWeight:700,color:"#64748b",marginBottom:10,textTransform:"uppercase",letterSpacing:0.8}}>Difficulty</div><div style={{display:"flex",gap:10}}>{Object.entries(DIFFS).map(([k,d])=><button key={k} onClick={()=>setDifficulty(k)} style={{flex:1,padding:"11px 8px",border:`2px solid ${difficulty===k?d.color:"#e2e8f0"}`,borderRadius:8,cursor:"pointer",background:difficulty===k?d.bg:"white",color:difficulty===k?d.color:"#374151",fontWeight:800,fontSize:14,transition:"all 0.15s"}}>{d.label}<div style={{fontSize:10,fontWeight:500,marginTop:2,opacity:0.75}}>{d.desc}</div></button>)}</div></div>
            {genError&&<div style={{background:"#fef2f2",border:"1px solid #fecaca",color:"#dc2626",padding:"10px 14px",borderRadius:6,fontSize:13,marginBottom:14}}>{genError}</div>}
            <button onClick={generateTest} style={{width:"100%",padding:"14px",background:"linear-gradient(135deg,#1e3a8a,#1d4ed8)",color:"white",border:"none",borderRadius:9,fontSize:16,fontWeight:900,cursor:"pointer"}}>Generate &amp; Start Test \u2192</button>
          </div>
          {history.length>0?<div style={{background:"white",borderRadius:11,padding:20,boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}><h2 style={{margin:"0 0 14px",fontSize:16,fontWeight:800,color:"#0f172a"}}>Test History</h2><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><thead><tr style={{background:"#f8fafc"}}>{["Date & Time","Mode","Level","Score","Correct","Wrong","Skipped"].map(h=><th key={h} style={{padding:"8px 10px",textAlign:"left",fontWeight:700,color:"#374151",borderBottom:"2px solid #e2e8f0",whiteSpace:"nowrap",fontSize:12}}>{h}</th>)}</tr></thead><tbody>{history.map(t=><tr key={t.id} style={{borderBottom:"1px solid #f1f5f9"}}><td style={{padding:"9px 10px",color:"#64748b",whiteSpace:"nowrap",fontSize:12}}>{new Date(t.date).toLocaleDateString("en-IN",{day:"2-digit",month:"short"})}&nbsp;{new Date(t.date).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}</td><td style={{padding:"9px 10px",textTransform:"capitalize",fontWeight:600}}>{t.mode}</td><td style={{padding:"9px 10px"}}><span style={{background:DIFFS[t.difficulty]?.bg,color:DIFFS[t.difficulty]?.color,padding:"2px 9px",borderRadius:12,fontSize:11,fontWeight:700}}>{t.difficulty}</span></td><td style={{padding:"9px 10px",fontWeight:900,color:t.percentage>=70?"#16a34a":t.percentage>=50?"#d97706":"#dc2626"}}>{t.score}/{t.maxScore} ({t.percentage}%)</td><td style={{padding:"9px 10px",color:"#16a34a",fontWeight:700}}>\u2713 {t.correct}</td><td style={{padding:"9px 10px",color:"#dc2626",fontWeight:700}}>\u2717 {t.wrong}</td><td style={{padding:"9px 10px",color:"#94a3b8"}}>{t.unattempted}</td></tr>)}</tbody></table></div></div>:<div style={{textAlign:"center",padding:"38px 20px",background:"white",borderRadius:11,boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}><div style={{fontSize:42,marginBottom:12}}>📝</div><div style={{fontWeight:800,fontSize:16,color:"#1e293b"}}>No tests taken yet</div><div style={{fontSize:14,color:"#64748b",marginTop:5}}>Start your first test above to begin tracking performance</div></div>}
        </div>
      </div>
    );
  }

  if(screen==="generating")return(
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#0f172a,#1e3a8a)",display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <div style={{background:"white",borderRadius:14,padding:"36px 38px",maxWidth:460,width:"100%",textAlign:"center",boxShadow:"0 24px 64px rgba(0,0,0,0.4)"}}>
        <div style={{width:54,height:54,border:"5px solid #e2e8f0",borderTop:"5px solid #1d4ed8",borderRadius:"50%",margin:"0 auto 20px",animation:"spin 0.9s linear infinite"}}/>
        <div style={{fontSize:19,fontWeight:900,color:"#0f172a",marginBottom:6}}>Building Your {MODES[mode]?.label}</div>
        <div style={{fontSize:14,color:"#64748b",marginBottom:5}}>{MODES[mode]?.q} questions \u00b7 {DIFFS[difficulty]?.label} difficulty</div>
        <div style={{fontSize:12,color:"#94a3b8",marginBottom:24}}>AI is writing authentic CUET questions. Takes 15-30 seconds.</div>
        <div style={{background:"#f0f7ff",border:"1px solid #bfdbfe",borderRadius:9,padding:"14px 16px",textAlign:"left"}}>
          <div style={{fontSize:10,fontWeight:800,color:"#1d4ed8",letterSpacing:1.5,marginBottom:6,textTransform:"uppercase"}}>Exam Strategy Tip</div>
          <div style={{fontSize:13,color:"#1e3a8a",lineHeight:1.75}}>{TIPS[tipIdx]}</div>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if(screen==="exam"&&q){
    const qst=qId=>getQStatus(qId,answers,markedReview,visited);
    const qstyle=qId=>{const s=QS[qst(qId)];return{width:33,height:33,background:s.bg,border:`2px solid ${s.border}`,color:s.text,borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,cursor:"pointer",flexShrink:0};};
    return(
      <div style={{minHeight:"100vh",background:"#d1d5db",fontFamily:"'Segoe UI',system-ui,sans-serif",fontSize:14,display:"flex",flexDirection:"column"}}>
        <div style={{background:"linear-gradient(135deg,#0f172a,#1e3a8a)",padding:"7px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}><div style={{background:"white",borderRadius:3,padding:"3px 9px",fontWeight:900,fontSize:13,color:"#1a56db",letterSpacing:1.5}}>NTA</div><div style={{color:"white",fontSize:14,fontWeight:700}}>CUET (UG) \u2014 2026 | Common University Entrance Test (Undergraduate)</div></div>
          <div style={{color:"rgba(255,255,255,0.75)",fontSize:12}}>Candidate: <strong style={{color:"white"}}>{user?.name}</strong></div>
        </div>
        <div style={{background:"#bfdbfe",padding:"7px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"2px solid #93c5fd",flexShrink:0,flexWrap:"wrap",gap:8}}>
          <div style={{fontSize:13,fontWeight:700,color:"#1e40af"}}>Section: LANGUAGE (ENGLISH) | Question Type: Multiple Choice Questions (MCQ)</div>
          <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:12,fontWeight:600,color:"#1e40af"}}>Time Remaining:</span><span style={{fontFamily:"'Courier New',monospace",fontSize:20,fontWeight:900,color:tColor,background:"white",padding:"3px 12px",borderRadius:3,border:`2px solid ${tColor}`,animation:timerRed?"blink 1s infinite":"none"}}>{fmtTime(timeLeft)}</span></div>
        </div>
        <div style={{display:"flex",flex:1,overflow:"hidden",minHeight:0}}>
          <div style={{flex:1,padding:14,overflowY:"auto",background:"#f0f0f0"}}>
            <div style={{background:"white",border:"1px solid #d1d5db",borderRadius:3,padding:"9px 14px",marginBottom:10,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontWeight:900,color:"#1e293b",fontSize:16}}>Q. {currentQ+1}</span><span style={{color:"#94a3b8",fontSize:12}}>of {questions.length}</span><span style={{background:TOPICS[q.topic]?.color+"18",color:TOPICS[q.topic]?.color||"#374151",fontSize:11,fontWeight:800,padding:"2px 8px",borderRadius:10,border:`1px solid ${TOPICS[q.topic]?.color||"#374151"}30`}}>{TOPICS[q.topic]?.label||q.topic}</span></div>
              <div style={{fontSize:12,color:"#374151"}}><span style={{color:"#16a34a",fontWeight:700}}>+5</span> Correct &nbsp;<span style={{color:"#dc2626",fontWeight:700}}>-1</span> Wrong &nbsp;<span style={{color:"#94a3b8"}}>0</span> Unattempted</div>
            </div>
            {passage&&<div style={{background:"#fefce8",border:"1px solid #fde68a",borderRadius:3,padding:"12px 15px",marginBottom:10}}><div style={{fontSize:10,fontWeight:800,color:"#92400e",letterSpacing:1.5,marginBottom:7,textTransform:"uppercase"}}>Read the Following Passage Carefully \u2014 {(passage.type||"").toUpperCase()}</div><div style={{maxHeight:180,overflowY:"auto"}}><p style={{margin:0,lineHeight:1.9,color:"#1c1917",fontSize:13.5}}>{passage.text}</p></div></div>}
            <div style={{background:"white",border:"1px solid #d1d5db",borderRadius:3,padding:"15px",marginBottom:10}}><p style={{margin:0,fontSize:15,lineHeight:1.9,color:"#1e293b",fontWeight:500}}>{q.question}</p></div>
            <div style={{background:"white",border:"1px solid #d1d5db",borderRadius:3,overflow:"hidden"}}>
              {["A","B","C","D"].map((opt,oi)=>{const sel=selectedOpt===opt;return(<div key={opt} onClick={()=>setSelectedOpt(opt)} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"13px 16px",cursor:"pointer",background:sel?"#eff6ff":"white",borderBottom:oi<3?"1px solid #f1f5f9":"none",borderLeft:sel?"3px solid #1d4ed8":"3px solid transparent",transition:"all 0.1s",userSelect:"none"}}><div style={{width:20,height:20,borderRadius:"50%",flexShrink:0,marginTop:2,border:sel?"2px solid #1d4ed8":"2px solid #9ca3af",background:sel?"#1d4ed8":"white",display:"flex",alignItems:"center",justifyContent:"center"}}>{sel&&<div style={{width:8,height:8,borderRadius:"50%",background:"white"}}/>}</div><span style={{fontSize:14,lineHeight:1.75,color:sel?"#1e40af":"#1e293b"}}><strong style={{marginRight:6,color:sel?"#1e40af":"#374151"}}>{opt}.</strong>{q.options?.[opt]||""}</span></div>);} )}
            </div>
          </div>
          <div style={{width:198,background:"white",borderLeft:"2px solid #d1d5db",display:"flex",flexDirection:"column",flexShrink:0,overflow:"hidden"}}>
            <div style={{background:"linear-gradient(135deg,#1e3a8a,#1d4ed8)",color:"white",fontWeight:800,fontSize:11,padding:"7px 10px",textAlign:"center",letterSpacing:1,textTransform:"uppercase",flexShrink:0}}>Question Palette</div>
            <div style={{padding:"9px 12px",borderBottom:"1px solid #f1f5f9",display:"flex",alignItems:"center",gap:8,flexShrink:0}}><div style={{width:30,height:30,borderRadius:"50%",background:"linear-gradient(135deg,#1e3a8a,#1d4ed8)",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:900,fontSize:14,flexShrink:0}}>{user?.name?.[0]?.toUpperCase()}</div><div style={{fontSize:11,fontWeight:600,color:"#1e293b",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.name}</div></div>
            <div style={{flex:1,overflowY:"auto",padding:10}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:5,marginBottom:14}}>{questions.map((qi,idx)=><div key={qi.id} onClick={()=>goTo(idx)} style={{...qstyle(qi.id),outline:idx===currentQ?"3px solid #f59e0b":"none",outlineOffset:1}}>{idx+1}</div>)}</div>
              <div style={{fontSize:11,color:"#374151"}}><div style={{fontWeight:700,marginBottom:6,fontSize:10,textTransform:"uppercase",letterSpacing:0.5,color:"#94a3b8"}}>Legend</div>{[["not_visited","Not Visited"],["not_answered","Not Answered"],["answered","Answered"],["review","Marked for Review"],["answered_review","Answered & Marked"]].map(([s,l])=><div key={s} style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}><div style={{width:16,height:16,background:QS[s].bg,border:`2px solid ${QS[s].border}`,borderRadius:2,flexShrink:0}}/><span style={{fontSize:10.5}}>{l}</span></div>)}</div>
            </div>
            <div style={{padding:10,borderTop:"1px solid #e2e8f0",flexShrink:0}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:8}}><div style={{background:"#dcfce7",padding:"7px",borderRadius:5,textAlign:"center"}}><div style={{fontWeight:900,fontSize:18,color:"#16a34a"}}>{answeredCount}</div><div style={{fontSize:9,color:"#166534",textTransform:"uppercase",letterSpacing:0.5}}>Answered</div></div><div style={{background:"#fef3c7",padding:"7px",borderRadius:5,textAlign:"center"}}><div style={{fontWeight:900,fontSize:18,color:"#d97706"}}>{questions.length-answeredCount}</div><div style={{fontSize:9,color:"#92400e",textTransform:"uppercase",letterSpacing:0.5}}>Remaining</div></div></div>
              <button onClick={()=>{if(window.confirm(`Submit test?\n\n${answeredCount} answered \u00b7 ${questions.length-answeredCount} unattempted\n\nThis cannot be undone.`))doSubmit();}} style={{width:"100%",padding:"9px",background:"linear-gradient(135deg,#7f1d1d,#dc2626)",color:"white",border:"none",borderRadius:4,fontWeight:900,fontSize:13,cursor:"pointer",letterSpacing:0.5}}>SUBMIT TEST</button>
            </div>
          </div>
        </div>
        <div style={{background:"white",borderTop:"2px solid #d1d5db",padding:"9px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,flexWrap:"wrap",gap:8}}>
          <div style={{display:"flex",gap:8,alignItems:"center"}}><button onClick={()=>currentQ>0&&goTo(currentQ-1)} disabled={currentQ===0} style={{padding:"8px 16px",background:currentQ===0?"#f8fafc":"#e2e8f0",border:"1px solid #d1d5db",borderRadius:3,cursor:currentQ===0?"not-allowed":"pointer",fontSize:13,color:currentQ===0?"#94a3b8":"#374151",fontWeight:600}}>\u25c4 Back</button><button onClick={clearResponse} style={{padding:"8px 14px",background:"transparent",border:"none",color:"#dc2626",cursor:"pointer",fontSize:13,textDecoration:"underline",fontWeight:600}}>Clear Response</button></div>
          <div style={{display:"flex",gap:8}}><button onClick={markAndNext} style={{padding:"9px 16px",background:"linear-gradient(135deg,#4c1d95,#7c3aed)",color:"white",border:"none",borderRadius:3,cursor:"pointer",fontSize:13,fontWeight:700}}>Mark for Review &amp; Next \u25ba</button><button onClick={saveAndNext} style={{padding:"9px 22px",background:"linear-gradient(135deg,#1e3a8a,#1d4ed8)",color:"white",border:"none",borderRadius:3,cursor:"pointer",fontSize:14,fontWeight:900}}>Save &amp; Next \u25ba</button></div>
        </div>
        <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
      </div>
    );
  }

  if(screen==="results"&&results){
    const sc=results.percentage>=70?"#16a34a":results.percentage>=50?"#d97706":"#dc2626";
    return(
      <div style={{minHeight:"100vh",background:"#eef2f7",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
        <div style={{background:"linear-gradient(135deg,#0f172a,#1e3a8a)",padding:"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
          <div style={{color:"white",fontWeight:700,fontSize:15}}>CUET (UG) 2026 \u2014 English (101) | Test Results</div>
          <button onClick={()=>setScreen("dashboard")} style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",color:"white",padding:"6px 14px",borderRadius:4,cursor:"pointer",fontSize:12,fontWeight:600}}>\u2190 Dashboard</button>
        </div>
        <div style={{maxWidth:820,margin:"0 auto",padding:"22px 20px"}}>
          <div style={{background:"white",borderRadius:12,padding:"28px 24px",boxShadow:"0 4px 20px rgba(0,0,0,0.08)",marginBottom:18,textAlign:"center",borderTop:`5px solid ${sc}`}}>
            <div style={{fontSize:12,fontWeight:700,color:"#94a3b8",letterSpacing:1.5,marginBottom:8,textTransform:"uppercase"}}>Your Score</div>
            <div style={{fontSize:68,fontWeight:900,color:sc,lineHeight:1}}>{results.score}</div>
            <div style={{fontSize:16,color:"#94a3b8",marginBottom:14}}>out of {results.maxScore} marks</div>
            <div style={{display:"inline-block",background:sc+"15",color:sc,fontWeight:900,fontSize:22,padding:"5px 22px",borderRadius:40,border:`1px solid ${sc}30`,marginBottom:22}}>{results.percentage}%</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,maxWidth:480,margin:"0 auto"}}>{[{v:results.correct,l:"Correct",c:"#16a34a",p:`+${results.correct*5}`},{v:results.wrong,l:"Wrong",c:"#dc2626",p:`-${results.wrong}`},{v:results.unattempted,l:"Skipped",c:"#94a3b8",p:"0"}].map(({v,l,c,p})=><div key={l} style={{background:"#f8fafc",borderRadius:9,padding:"12px 8px"}}><div style={{fontSize:28,fontWeight:900,color:c}}>{v}</div><div style={{fontSize:12,color:"#64748b"}}>{l}</div><div style={{fontSize:11,color:c,fontWeight:700,marginTop:2}}>{p} marks</div></div>)}</div>
          </div>
          <div style={{background:"white",borderRadius:11,padding:22,boxShadow:"0 1px 4px rgba(0,0,0,0.07)",marginBottom:14}}>
            <h2 style={{margin:"0 0 18px",fontSize:16,fontWeight:900,color:"#0f172a"}}>Topic-wise Performance</h2>
            {Object.entries(results.topicStats).map(([t,s])=>{const acc=s.total?Math.round(s.correct/s.total*100):0;const tc=TOPICS[t];const bc=acc>=70?"#16a34a":acc>=50?"#d97706":"#dc2626";return(<div key={t} style={{marginBottom:16}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{background:tc?.color+"18",color:tc?.color||"#374151",fontSize:10,fontWeight:800,padding:"2px 7px",borderRadius:10}}>{tc?.abbr||t}</span><span style={{fontSize:13,fontWeight:600,color:"#374151"}}>{tc?.label||t}</span></div><div style={{display:"flex",gap:10,alignItems:"center"}}><span style={{fontSize:11,color:"#94a3b8"}}>{s.correct}/{s.total}</span><span style={{fontSize:14,fontWeight:900,color:bc,minWidth:40,textAlign:"right"}}>{acc}%</span></div></div><div style={{background:"#f1f5f9",borderRadius:100,height:9,overflow:"hidden"}}><div style={{height:"100%",borderRadius:100,background:bc,width:acc+"%",transition:"width 0.7s ease"}}/></div><div style={{display:"flex",gap:12,marginTop:4,fontSize:11}}><span style={{color:"#16a34a"}}>\u2713 {s.correct}</span><span style={{color:"#dc2626"}}>\u2717 {s.wrong}</span><span style={{color:"#94a3b8"}}>\u2014 {s.unattempted} skipped</span></div></div>);})}
          </div>
          <div style={{background:"white",borderRadius:11,padding:20,boxShadow:"0 1px 4px rgba(0,0,0,0.07)",marginBottom:16}}>
            <h2 style={{margin:"0 0 14px",fontSize:16,fontWeight:900,color:"#0f172a"}}>Question-by-Question Review</h2>
            {results.questionResults.map((qr,i)=>{const isOpen=reviewOpen===qr.id;const sc2={correct:"#16a34a",wrong:"#dc2626",unattempted:"#94a3b8"}[qr.status];const sbg={correct:"#dcfce7",wrong:"#fee2e2",unattempted:"#f8fafc"}[qr.status];const psg=qr.passage_id?passages.find(p=>p.id===qr.passage_id):null;return(<div key={qr.id} style={{border:`1px solid ${sc2}30`,borderRadius:7,marginBottom:8,overflow:"hidden"}}><div onClick={()=>setReviewOpen(isOpen?null:qr.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",cursor:"pointer",background:sbg,userSelect:"none"}}><div style={{width:26,height:26,borderRadius:"50%",background:sc2,color:"white",fontWeight:900,fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</div><div style={{flex:1,fontSize:13,color:"#1e293b",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{(qr.question||"").slice(0,85)}{(qr.question||"").length>85?"...":""}</div><div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}><span style={{background:TOPICS[qr.topic]?.color+"18",color:TOPICS[qr.topic]?.color,fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:8}}>{TOPICS[qr.topic]?.abbr}</span><span style={{fontSize:11,fontWeight:700,color:sc2,textTransform:"uppercase",minWidth:60}}>{qr.status}</span><span style={{fontSize:12,color:sc2}}>{isOpen?"\u25b2":"\u25bc"}</span></div></div>{isOpen&&<div style={{padding:"14px 16px",borderTop:`1px solid ${sc2}20`,background:"white"}}>{psg&&<div style={{background:"#fefce8",border:"1px solid #fde68a",borderRadius:5,padding:"10px 12px",marginBottom:12,fontSize:12,lineHeight:1.8,color:"#1c1917",maxHeight:120,overflowY:"auto"}}>{psg.text}</div>}<p style={{margin:"0 0 12px",fontSize:14,fontWeight:600,color:"#1e293b",lineHeight:1.7}}>{qr.question}</p>{["A","B","C","D"].map(opt=>{const isC=opt===qr.correct,uW=opt===qr.userAnswer&&!isC;return(<div key={opt} style={{padding:"8px 12px",borderRadius:5,marginBottom:5,fontSize:13,background:isC?"#dcfce7":uW?"#fee2e2":"#f8fafc",border:`1px solid ${isC?"#16a34a":uW?"#dc2626":"#e2e8f0"}`,color:isC?"#14532d":uW?"#7f1d1d":"#374151"}}><strong>{opt}.</strong> {qr.options?.[opt]}{isC?" \u2713":""}{uW?" \u2717 Your Answer":""}</div>);})}{qr.explanation&&<div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:5,padding:"10px 12px",marginTop:10,fontSize:12.5,color:"#1e40af",lineHeight:1.6}}><strong>Explanation: </strong>{qr.explanation}</div>}</div>}</div>);})}
          </div>
          <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
            <button onClick={getAdvisory} disabled={loadingAdv} style={{flex:2,minWidth:200,padding:"14px",background:loadingAdv?"#94a3b8":"linear-gradient(135deg,#4c1d95,#7c3aed)",color:"white",border:"none",borderRadius:9,fontSize:15,fontWeight:900,cursor:loadingAdv?"not-allowed":"pointer"}}>{loadingAdv?"Generating Coaching Advisory...":"Get AI Coaching Advisory \u2192"}</button>
            <button onClick={()=>setScreen("dashboard")} style={{flex:1,minWidth:140,padding:"14px",background:"white",color:"#1d4ed8",border:"2px solid #1d4ed8",borderRadius:9,fontSize:14,fontWeight:700,cursor:"pointer"}}>Take New Test</button>
          </div>
        </div>
      </div>
    );
  }

  if(screen==="advisory")return(
    <div style={{minHeight:"100vh",background:"#eef2f7",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <div style={{background:"linear-gradient(135deg,#3b0764,#7c3aed)",padding:"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
        <div style={{color:"white",fontWeight:700,fontSize:15}}>AI Coaching Advisory \u2014 CUET English (101)</div>
        <div style={{display:"flex",gap:8}}><button onClick={()=>setScreen("results")} style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",color:"white",padding:"6px 14px",borderRadius:4,cursor:"pointer",fontSize:12,fontWeight:600}}>\u2190 Results</button><button onClick={()=>setScreen("dashboard")} style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",color:"white",padding:"6px 14px",borderRadius:4,cursor:"pointer",fontSize:12,fontWeight:600}}>Dashboard</button></div>
      </div>
      <div style={{maxWidth:760,margin:"0 auto",padding:"26px 20px"}}>
        {results&&<div style={{display:"flex",gap:10,marginBottom:18,flexWrap:"wrap"}}>{[{v:`${results.score}/${results.maxScore}`,l:"Score",c:"#1d4ed8"},{v:`${results.percentage}%`,l:"Percentage",c:results.percentage>=70?"#16a34a":results.percentage>=50?"#d97706":"#dc2626"},{v:results.correct,l:"Correct",c:"#16a34a"},{v:results.wrong,l:"Wrong",c:"#dc2626"}].map(({v,l,c})=><div key={l} style={{background:"white",borderRadius:8,padding:"10px 16px",boxShadow:"0 1px 4px rgba(0,0,0,0.07)",textAlign:"center",minWidth:80}}><div style={{fontSize:20,fontWeight:900,color:c}}>{v}</div><div style={{fontSize:11,color:"#64748b"}}>{l}</div></div>)}</div>}
        <div style={{background:"white",borderRadius:13,padding:"28px 30px",boxShadow:"0 4px 20px rgba(0,0,0,0.08)",borderLeft:"5px solid #7c3aed",marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20,paddingBottom:16,borderBottom:"1px solid #f1f5f9"}}><div style={{width:42,height:42,borderRadius:"50%",background:"linear-gradient(135deg,#4c1d95,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:20,flexShrink:0}}>🎓</div><div><div style={{fontWeight:900,fontSize:16,color:"#1e293b"}}>Coaching Advisory \u2014 {user?.name}</div><div style={{fontSize:12,color:"#94a3b8",marginTop:2}}>Based on your latest CUET English (101) test performance</div></div></div>
          <div style={{fontSize:15,lineHeight:2.0,color:"#1e293b",whiteSpace:"pre-wrap"}}>{advisory}</div>
        </div>
        <div style={{display:"flex",gap:12,flexWrap:"wrap"}}><button onClick={generateTest} style={{flex:1,minWidth:180,padding:"13px",background:"linear-gradient(135deg,#1e3a8a,#1d4ed8)",color:"white",border:"none",borderRadius:9,fontSize:15,fontWeight:900,cursor:"pointer"}}>Start Next Test \u2192</button><button onClick={()=>setScreen("dashboard")} style={{flex:1,minWidth:140,padding:"13px",background:"white",color:"#374151",border:"2px solid #e2e8f0",borderRadius:9,fontSize:14,fontWeight:700,cursor:"pointer"}}>\u2190 Dashboard</button></div>
      </div>
    </div>
  );

  return null;
}
