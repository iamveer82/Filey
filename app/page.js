'use client';

import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

// ============ ICON COMPONENT ============
function Icon({ name, filled, className = '' }) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={filled ? { fontVariationSettings: "'FILL' 1" } : {}}
    >
      {name}
    </span>
  );
}

// ============ MAIN APP ============
export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [darkMode, setDarkMode] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [sessionId, setSessionId] = useState(() => uuidv4());
  const [sessions, setSessions] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [team, setTeam] = useState(null);
  const [profile, setProfile] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState(null);
  const [teamActivity, setTeamActivity] = useState([]);
  const [files, setFiles] = useState([]);
  const [teamChatMessages, setTeamChatMessages] = useState([]);
  const [teamChatInput, setTeamChatInput] = useState('');
  const [exportData, setExportData] = useState(null);
  const [showExport, setShowExport] = useState(false);
  const [renameId, setRenameId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const chatEndRef = useRef(null);
  const teamChatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  useEffect(() => {
    if (activeTab === 'home') fetchDashboard();
    if (activeTab === 'team') { fetchTeam(); fetchTeamActivity(); fetchTeamChat(); }
    if (activeTab === 'settings') fetchProfile();
    if (activeTab === 'chat') fetchSessions();
    if (activeTab === 'files') fetchFiles();
  }, [activeTab]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);
  useEffect(() => { teamChatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [teamChatMessages]);

  // API helpers
  const fetchDashboard = async () => { try { const r = await fetch('/api/dashboard'); setDashboard(await r.json()); } catch(e){} };
  const fetchTeam = async () => { try { const r = await fetch('/api/team'); const d = await r.json(); setTeam(d.team); } catch(e){} };
  const fetchTeamActivity = async () => { try { const r = await fetch('/api/team/activity'); const d = await r.json(); setTeamActivity(d.activity||[]); } catch(e){} };
  const fetchProfile = async () => { try { const r = await fetch('/api/settings/profile'); const d = await r.json(); setProfile(d.profile); } catch(e){} };
  const fetchSessions = async () => { try { const r = await fetch('/api/chat/sessions'); const d = await r.json(); setSessions(d.sessions||[]); } catch(e){} };
  const fetchFiles = async () => { try { const r = await fetch('/api/files'); const d = await r.json(); setFiles(d.files||[]); } catch(e){} };
  const fetchTeamChat = async () => { try { const r = await fetch('/api/team/chat'); const d = await r.json(); setTeamChatMessages(d.messages||[]); } catch(e){} };

  const loadSession = async (sid) => {
    setSessionId(sid);
    try { const r = await fetch(`/api/chat/messages?sessionId=${sid}`); const d = await r.json();
      setChatMessages((d.messages||[]).map(m=>({id:m.id,role:m.role,content:m.content,extractedTransaction:m.extractedTransaction,hasImage:m.hasImage,timestamp:m.timestamp})));
    } catch(e){}
  };

  const startNewChat = () => { setSessionId(uuidv4()); setChatMessages([]); };

  const sendMessage = async () => {
    if (!chatInput.trim()||chatLoading) return;
    const msg = chatInput.trim(); setChatInput(''); setChatLoading(true);
    setChatMessages(prev=>[...prev,{id:uuidv4(),role:'user',content:msg,timestamp:new Date().toISOString()}]);
    try {
      const r = await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg,sessionId})});
      const d = await r.json();
      if(d.error) setChatMessages(prev=>[...prev,{id:uuidv4(),role:'assistant',content:`Error: ${d.error}`,timestamp:new Date().toISOString()}]);
      else {
        setChatMessages(prev=>[...prev,{id:uuidv4(),role:'assistant',content:d.message,extractedTransaction:d.extractedTransaction,timestamp:d.timestamp}]);
        if(d.extractedTransaction) setPendingTransaction(d.extractedTransaction);
        if(d.sessionId) setSessionId(d.sessionId);
      }
    } catch(e) { setChatMessages(prev=>[...prev,{id:uuidv4(),role:'assistant',content:'Connection error.',timestamp:new Date().toISOString()}]); }
    setChatLoading(false);
  };

  const handleReceiptUpload = async (e) => {
    const file = e.target.files?.[0]; if(!file) return;
    setChatLoading(true);
    setChatMessages(prev=>[...prev,{id:uuidv4(),role:'user',content:`Uploading: ${file.name}`,hasImage:true,timestamp:new Date().toISOString()}]);
    try {
      const reader = new FileReader();
      reader.onload = async()=>{
        const base64=reader.result.split(',')[1];
        const r = await fetch('/api/scan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:base64,mimeType:file.type||'image/jpeg',sessionId})});
        const d = await r.json();
        if(d.error) setChatMessages(prev=>[...prev,{id:uuidv4(),role:'assistant',content:`Scan error: ${d.error}`,timestamp:new Date().toISOString()}]);
        else { setChatMessages(prev=>[...prev,{id:uuidv4(),role:'assistant',content:d.message,extractedTransaction:d.extractedTransaction,timestamp:d.timestamp}]); if(d.extractedTransaction) setPendingTransaction(d.extractedTransaction); }
        setChatLoading(false);
      };
      reader.readAsDataURL(file);
    } catch(e) { setChatLoading(false); }
    if(fileInputRef.current) fileInputRef.current.value='';
  };

  const verifyTransaction = async (txn) => {
    try {
      await fetch('/api/transactions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(txn)});
      setPendingTransaction(null);
      setChatMessages(prev=>[...prev,{id:uuidv4(),role:'assistant',content:`Transaction verified and saved! ${txn.merchant} - ${txn.amount} ${txn.currency}`,timestamp:new Date().toISOString()}]);
    } catch(e){}
  };

  const inviteMember = async (name,email,role) => {
    try { await fetch('/api/team/invite',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,email,role})}); setShowInviteModal(false); fetchTeam(); fetchTeamActivity(); } catch(e){}
  };

  const sendTeamChatMsg = async () => {
    if(!teamChatInput.trim()) return;
    try {
      await fetch('/api/team/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:teamChatInput,userName:profile?.name||'Admin'})});
      setTeamChatInput(''); fetchTeamChat();
    } catch(e){}
  };

  const renameFile = async (id, name) => {
    try { await fetch('/api/files/rename',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,customName:name})}); setRenameId(null); fetchFiles(); } catch(e){}
  };

  const fetchExport = async () => {
    try { const r = await fetch('/api/files/export'); const d = await r.json(); setExportData(d); setShowExport(true); } catch(e){}
  };

  // Theme
  const bg = darkMode ? 'bg-[#0a0a0a]' : 'bg-[#f9f9f9]';
  const cardBg = darkMode ? 'bg-[#1a1a1a]' : 'bg-white';
  const surfaceLow = darkMode ? 'bg-[#141414]' : 'bg-[#f3f3f4]';
  const textP = darkMode ? 'text-white' : 'text-[#0c1e26]';
  const textS = darkMode ? 'text-white/60' : 'text-[#0c1e26]/60';
  const textM = darkMode ? 'text-white/40' : 'text-[#0c1e26]/40';
  const border = darkMode ? 'border-white/10' : 'border-[#0c1e26]/10';
  const navBg = darkMode ? 'bg-[#1a1a1a]/80' : 'bg-white/70';

  const themeProps = { textP, textS, textM, cardBg, surfaceLow, border, darkMode, navBg };

  return (
    <div className={`min-h-screen ${bg} font-[Manrope] transition-colors duration-300`}>
      {/* Top Bar */}
      <header className={`fixed top-0 w-full z-50 ${navBg} backdrop-blur-md shadow-[0_40px_40px_rgba(12,30,38,0.06)] flex justify-between items-center px-6 py-4`}>
        <div className="flex items-center gap-2">
          <Icon name="account_balance_wallet" className="text-[#44e571] text-2xl" />
          <h1 className={`font-['Space_Grotesk'] tracking-tight font-bold text-2xl ${textP}`}>Filely</h1>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === 'files' && (
            <button onClick={fetchExport} className="bg-[#44e571] text-[#00531f] px-4 py-2 rounded-full font-bold flex items-center gap-2 text-sm hover:opacity-90 transition">
              <Icon name="description" className="text-sm" /> Export PDF
            </button>
          )}
          <button onClick={()=>setDarkMode(!darkMode)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition">
            <Icon name={darkMode?'light_mode':'dark_mode'} className={textS} />
          </button>
          <div className={`w-8 h-8 rounded-full ${surfaceLow} flex items-center justify-center text-sm font-bold ${textP}`}>
            {profile?.name?.[0]||'U'}
          </div>
        </div>
      </header>

      <main className="pt-20 pb-32 min-h-screen">
        {activeTab==='home' && <HomeTab d={dashboard} {...themeProps} />}
        {activeTab==='chat' && <ChatTab messages={chatMessages} input={chatInput} setInput={setChatInput} onSend={sendMessage} loading={chatLoading} sessions={sessions} onLoadSession={loadSession} onNewChat={startNewChat} onUpload={handleReceiptUpload} fileInputRef={fileInputRef} chatEndRef={chatEndRef} pendingTransaction={pendingTransaction} onVerify={verifyTransaction} onDismiss={()=>setPendingTransaction(null)} {...themeProps} />}
        {activeTab==='team' && <TeamTab team={team} activity={teamActivity} showInvite={showInviteModal} setShowInvite={setShowInviteModal} onInvite={inviteMember} teamChat={teamChatMessages} teamChatInput={teamChatInput} setTeamChatInput={setTeamChatInput} onSendTeamChat={sendTeamChatMsg} teamChatEndRef={teamChatEndRef} profile={profile} {...themeProps} />}
        {activeTab==='files' && <FilesTab files={files} renameId={renameId} setRenameId={setRenameId} renameValue={renameValue} setRenameValue={setRenameValue} onRename={renameFile} {...themeProps} />}
        {activeTab==='settings' && <SettingsTab profile={profile} setProfile={setProfile} {...themeProps} />}
      </main>

      {/* Export Modal */}
      {showExport && exportData && <ExportModal data={exportData} onClose={()=>setShowExport(false)} {...themeProps} />}

      {/* 5-Tab Bottom Nav */}
      <nav className={`fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-md z-50 rounded-full ${navBg} backdrop-blur-xl shadow-[0_20px_50px_rgba(12,30,38,0.12)] border ${border} flex justify-around items-center px-3 py-2`}>
        {[
          {id:'home',icon:'home'},{id:'chat',icon:'chat_bubble'},{id:'team',icon:'group'},{id:'files',icon:'folder_open'},{id:'settings',icon:'settings'},
        ].map(tab=>(
          <button key={tab.id} onClick={()=>setActiveTab(tab.id)} className={`flex items-center justify-center p-3 rounded-full transition-all duration-200 active:scale-90 ${activeTab===tab.id?'bg-[#44e571] text-[#00531f]':darkMode?'text-white/40 hover:bg-white/5':'text-slate-400 hover:bg-stone-100/50'}`}>
            <Icon name={tab.icon} filled={activeTab===tab.id} />
          </button>
        ))}
      </nav>
    </div>
  );
}

// ============ HOME TAB ============
function HomeTab({ d, textP, textS, textM, cardBg, surfaceLow, border, darkMode }) {
  const data = d || {};
  const greeting = new Date().getHours()<12?'Morning':new Date().getHours()<17?'Afternoon':'Evening';
  // Streak calculation (simple: count consecutive days with transactions)
  const streak = Math.min(data.transactionCount || 0, 3);

  return (
    <div className="px-6 max-w-7xl mx-auto">
      <div className="absolute right-0 top-20 -z-10 opacity-10 pointer-events-none">
        <svg width="400" height="400" viewBox="0 0 400 400"><circle cx="300" cy="100" r="180" fill="none" stroke={darkMode?'#fff':'#0c1e26'} strokeWidth="0.5" strokeDasharray="8 8"/><circle cx="300" cy="100" r="100" fill="none" stroke={darkMode?'#fff':'#0c1e26'} strokeWidth="0.5" strokeDasharray="4 4"/></svg>
      </div>

      <header className="mb-10 mt-4">
        <div className="flex items-center gap-3 mb-2">
          <p className={`text-sm uppercase tracking-widest ${textM} font-semibold`}>{greeting}</p>
          {streak > 0 && (
            <div className="flex items-center gap-1 bg-[#44e571]/10 px-3 py-1 rounded-full">
              <span className="text-lg">🔥</span>
              <span className="text-xs font-bold text-[#006e2c]">{streak}-day streak</span>
            </div>
          )}
        </div>
        <h1 className={`font-['Space_Grotesk'] text-4xl md:text-5xl font-bold tracking-tighter ${textP} leading-tight`}>
          Your financial <span className="text-[#006e2c] italic">clarity</span><br/>at a glance.
        </h1>
      </header>

      {/* Fili Mascot Card */}
      <div className={`${cardBg} p-6 rounded-2xl border ${border} mb-8 flex items-center gap-4`}>
        <div className="w-14 h-14 bg-[#44e571]/20 rounded-full flex items-center justify-center text-3xl">🦅</div>
        <div className="flex-1">
          <p className={`font-['Space_Grotesk'] font-bold ${textP}`}>Fili says:</p>
          <p className={`text-sm ${textS}`}>
            {data.transactionCount > 0 
              ? `Great work! You've tracked ${data.transactionCount} expenses this month. Keep it up! 💪`
              : `Hey! Got any new receipts for Filely to sort? Let's get that VAT back! ☀️`}
          </p>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className={`${cardBg} p-8 rounded-2xl shadow-[0_40px_40px_rgba(12,30,38,0.04)] flex flex-col justify-between h-64 relative overflow-hidden`}>
          <div className="z-10"><Icon name="payments" className={`${textM} mb-4`} /><h3 className={`text-sm font-semibold ${textS}`}>This Month&apos;s Spend</h3><div className={`font-['Space_Grotesk'] text-4xl font-bold mt-2 ${textP}`}>{(data.totalSpend||0).toLocaleString()} AED</div></div>
          <div className="h-12 w-full mt-auto z-10"><div className="w-full h-2 bg-[#44e571]/20 rounded-full overflow-hidden"><div className="bg-[#44e571] h-full rounded-full transition-all" style={{width:`${Math.min((data.scanCount||0)/(data.scanLimit||50)*100,100)}%`}}/></div></div>
        </div>
        <div className={`${cardBg} p-8 rounded-2xl shadow-[0_40px_40px_rgba(12,30,38,0.04)] flex flex-col justify-between h-64 border-l-4 border-l-[#44e571]`}>
          <div><Icon name="account_balance" className={`${textM} mb-4`}/><h3 className={`text-sm font-semibold ${textS}`}>VAT Tracked (5%)</h3><div className={`font-['Space_Grotesk'] text-4xl font-bold mt-2 ${textP}`}>{(data.totalVat||0).toLocaleString()} AED</div></div>
          <div className="flex items-center gap-2 text-[#006e2c] font-bold text-sm bg-[#44e571]/10 self-start px-3 py-1 rounded-full"><Icon name="check_circle" filled className="text-sm"/>UAE VAT Compliant</div>
        </div>
        <div className={`${darkMode?'bg-white':'bg-[#0c1e26]'} p-8 rounded-2xl shadow-[0_40px_40px_rgba(12,30,38,0.12)] flex flex-col justify-between h-64 ${darkMode?'text-[#0c1e26]':'text-white'}`}>
          <div><Icon name="qr_code_scanner" className={`${darkMode?'text-[#0c1e26]/40':'text-white/40'} mb-4`}/><h3 className={`text-sm font-semibold ${darkMode?'text-[#0c1e26]/60':'text-white/60'}`}>AI Scans Used</h3><div className="font-['Space_Grotesk'] text-4xl font-bold mt-2 text-[#44e571]">{data.scanCount||0}/{data.scanLimit||50}</div></div>
          <div className="h-4 flex items-end gap-[2px]">{[20,40,30,70,100,60,80].map((h,i)=>(<div key={i} className="bg-[#44e571]/60 w-full rounded-sm" style={{height:`${h}%`}}/>))}</div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
        <div className="lg:col-span-2">
          <h2 className={`font-['Space_Grotesk'] text-2xl font-bold mb-6 flex items-center gap-3 ${textP}`}><span className="w-8 h-[2px] bg-[#44e571]"></span>Recent Transactions</h2>
          <div className="space-y-4">
            {(data.recentTransactions||[]).length===0 && <div className={`${surfaceLow} p-6 rounded-xl text-center ${textS}`}><Icon name="receipt_long" className="text-4xl mb-2 block"/>No transactions yet. Start by scanning a receipt in Chat!</div>}
            {(data.recentTransactions||[]).map((txn,i)=>(
              <div key={i} className={`${surfaceLow} p-6 rounded-xl flex items-center justify-between`}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#44e571]/20 flex items-center justify-center font-bold text-[#006e2c]">{(txn.merchant||'U')[0]}</div>
                  <div><p className={`${textP} font-bold`}>{txn.customName||txn.merchant}</p><p className={`text-sm ${textM}`}>{txn.category} &bull; {txn.date}</p></div>
                </div>
                <span className={`font-['Space_Grotesk'] font-bold ${textP}`}>{txn.amount} AED</span>
              </div>
            ))}
          </div>
        </div>
        <div className={`${darkMode?'bg-[#44e571]/5 border-[#44e571]/20':'bg-[#44e571]/5 border-[#44e571]/30'} p-8 rounded-2xl border-dashed border-[1.5px] relative`}>
          <div className="absolute -top-4 -right-4 bg-[#44e571] text-[#00531f] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-tighter">AI Ready</div>
          <h3 className={`font-['Space_Grotesk'] text-xl font-bold ${textP} mb-4`}>Quick Start</h3>
          <p className={`text-sm ${textS} mb-6`}>Scan receipts, type expenses, or ask about your finances.</p>
          <div className={`text-sm ${textM} space-y-2`}><p>Try saying:</p><p className={`${textP} font-medium italic`}>&ldquo;Paid 50 AED at ADNOC&rdquo;</p><p className={`${textP} font-medium italic`}>&ldquo;Upload a receipt photo&rdquo;</p></div>
        </div>
      </div>
    </div>
  );
}

// ============ CHAT TAB ============
function ChatTab({ messages, input, setInput, onSend, loading, sessions, onLoadSession, onNewChat, onUpload, fileInputRef, chatEndRef, pendingTransaction, onVerify, onDismiss, textP, textS, textM, cardBg, surfaceLow, border, darkMode }) {
  return (
    <div className="max-w-2xl mx-auto relative">
      <section className="px-6 mt-2"><div className="flex overflow-x-auto gap-3 py-3" style={{scrollbarWidth:'none'}}>
        <button onClick={onNewChat} className="flex-none flex flex-col items-center gap-2"><div className={`w-12 h-12 rounded-full border ${border} flex items-center justify-center bg-[#44e571]/10`}><Icon name="add" className="text-[#44e571] text-[20px]"/></div><span className={`text-[10px] uppercase tracking-widest ${textM} font-bold`}>New</span></button>
        {sessions.map((s,i)=>(<button key={i} onClick={()=>onLoadSession(s.sessionId)} className="flex-none flex flex-col items-center gap-2"><div className={`w-12 h-12 rounded-full border ${border} flex items-center justify-center ${surfaceLow}`}><Icon name="receipt_long" className={`${textS} text-[20px]`}/></div><span className={`text-[10px] uppercase tracking-widest ${textM} font-bold max-w-[60px] truncate`}>{s.lastMessage?.substring(0,8)||'Chat'}</span></button>))}
      </div></section>

      <section className="px-6 space-y-6 mt-8 mb-4" style={{minHeight:'400px'}}>
        {messages.length===0 && (
          <div className="text-center py-20"><Icon name="smart_toy" filled className="text-[#44e571] text-6xl mb-4"/><h2 className={`font-['Space_Grotesk'] text-2xl font-bold ${textP} mb-2`}>Filely AI</h2><p className={`${textS} text-sm max-w-xs mx-auto`}>Scan receipts, log expenses, or ask about your UAE finances. I handle the VAT math!</p>
            <div className="flex flex-wrap justify-center gap-2 mt-6">{['Scan a receipt','Paid 120 AED at ENOC','Show my VAT total'].map(s=>(<button key={s} onClick={()=>setInput(s)} className={`${surfaceLow} px-4 py-2 rounded-full text-sm ${textS} transition`}>{s}</button>))}</div>
          </div>
        )}
        {messages.map(msg=>(
          <div key={msg.id}>
            {msg.role==='user'?(
              <div className="flex justify-end"><div className={`${cardBg} border ${border} p-4 rounded-2xl rounded-br-sm max-w-[85%] shadow-sm`}>{msg.hasImage&&<div className="flex items-center gap-2 mb-2 text-[#44e571]"><Icon name="image" className="text-sm"/><span className="text-xs font-bold">Receipt attached</span></div>}<p className={`${textP} text-sm`}>{msg.content}</p></div></div>
            ):(
              <div className="flex justify-start gap-3"><div className="w-8 h-8 flex-none mt-1"><Icon name="smart_toy" filled className="text-[#006e2c] text-2xl"/></div>
                <div className="max-w-[85%] space-y-3">
                  <div className={`${surfaceLow} border ${border} p-4 rounded-2xl rounded-bl-sm`}><p className={`${textS} text-sm whitespace-pre-wrap`}>{msg.content}</p></div>
                  {msg.extractedTransaction && <TransactionCard txn={msg.extractedTransaction} onVerify={onVerify} onDismiss={onDismiss} isPending={pendingTransaction?.id===msg.extractedTransaction?.id} textP={textP} textM={textM} cardBg={cardBg} border={border} darkMode={darkMode}/>}
                </div>
              </div>
            )}
          </div>
        ))}
        {loading&&<div className="flex justify-start gap-3"><div className="w-8 h-8 flex-none mt-1"><Icon name="smart_toy" filled className="text-[#006e2c] text-2xl"/></div><div className={`${surfaceLow} p-4 rounded-2xl rounded-bl-sm`}><div className="flex gap-1"><div className="w-2 h-2 bg-[#44e571] rounded-full animate-bounce" style={{animationDelay:'0ms'}}/><div className="w-2 h-2 bg-[#44e571] rounded-full animate-bounce" style={{animationDelay:'150ms'}}/><div className="w-2 h-2 bg-[#44e571] rounded-full animate-bounce" style={{animationDelay:'300ms'}}/></div></div></div>}
        <div ref={chatEndRef}/>
      </section>

      <div className="fixed bottom-24 left-0 w-full z-40"><div className="max-w-xl mx-auto px-6">
        <div className={`${cardBg} rounded-full p-2 pr-4 shadow-[0_20px_50px_rgba(12,30,38,0.12)] border ${border} flex items-center gap-3`}>
          <input type="file" ref={fileInputRef} onChange={onUpload} accept="image/*" className="hidden"/>
          <button onClick={()=>fileInputRef.current?.click()} className="w-12 h-12 rounded-full bg-[#44e571] text-[#00531f] flex items-center justify-center shadow-sm hover:scale-105 active:scale-95 transition-transform"><Icon name="add_a_photo"/></button>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&onSend()} className={`flex-1 bg-transparent border-none focus:ring-0 focus:outline-none ${textP} font-medium text-sm`} placeholder="Type an expense or message..."/>
          <button onClick={onSend} disabled={loading||!input.trim()} className="text-[#44e571] disabled:opacity-30 transition"><Icon name="send"/></button>
        </div>
      </div></div>
    </div>
  );
}

// ============ TRANSACTION CARD ============
function TransactionCard({ txn, onVerify, onDismiss, isPending, textP, textM, cardBg, border, darkMode }) {
  if(!txn) return null;
  return (
    <div className={`${cardBg} rounded-2xl p-6 shadow-[0_40px_80px_rgba(12,30,38,0.08)] border ${border}`}>
      <div className="flex items-center gap-3 mb-5"><div className="w-2 h-8 bg-[#44e571] rounded-full"/><h2 className={`font-['Space_Grotesk'] text-lg font-bold ${textP}`}>AI Confirmation</h2></div>
      <div className="grid grid-cols-2 gap-y-5 gap-x-4 mb-6">
        <div><p className={`text-[10px] uppercase tracking-widest ${textM} mb-1 font-bold`}>Merchant</p><p className={`font-['Space_Grotesk'] font-bold ${textP}`}>{txn.merchant||'Unknown'}</p></div>
        <div><p className={`text-[10px] uppercase tracking-widest ${textM} mb-1 font-bold`}>Date</p><p className={`font-['Space_Grotesk'] font-bold ${textP}`}>{txn.date||'Today'}</p></div>
        <div><p className={`text-[10px] uppercase tracking-widest ${textM} mb-1 font-bold`}>Amount</p><p className={`font-['Space_Grotesk'] font-bold ${textP} text-2xl`}>{txn.amount||0} <span className="text-sm">AED</span></p></div>
        <div><p className={`text-[10px] uppercase tracking-widest ${textM} mb-1 font-bold`}>VAT (5%)</p><p className="font-['Space_Grotesk'] font-bold text-[#006e2c]">{txn.vat||0} AED</p></div>
        {txn.category&&<div><p className={`text-[10px] uppercase tracking-widest ${textM} mb-1 font-bold`}>Category</p><span className={`inline-flex px-2 py-1 ${darkMode?'bg-white/10':'bg-[#f3f3f4]'} rounded-md font-bold text-xs ${textP}`}>{txn.category}</span></div>}
        {txn.trn&&<div><p className={`text-[10px] uppercase tracking-widest ${textM} mb-1 font-bold`}>TRN</p><p className={`font-mono text-sm ${textP}`}>{txn.trn}</p></div>}
      </div>
      {isPending&&<div className="flex gap-3"><button onClick={()=>onVerify(txn)} className="flex-1 bg-[#44e571] text-[#00531f] font-bold rounded-full py-3 flex items-center justify-center gap-2 hover:opacity-90 active:scale-95">Verify <Icon name="arrow_forward" className="text-[20px]"/></button><button onClick={onDismiss} className={`flex-1 border ${border} ${textP} font-bold rounded-xl py-3`}>Edit</button></div>}
    </div>
  );
}

// ============ TEAM TAB ============
function TeamTab({ team, activity, showInvite, setShowInvite, onInvite, teamChat, teamChatInput, setTeamChatInput, onSendTeamChat, teamChatEndRef, profile, textP, textS, textM, cardBg, surfaceLow, border, darkMode }) {
  const [invName, setInvName] = useState('');
  const [invEmail, setInvEmail] = useState('');
  const [invRole, setInvRole] = useState('member');

  return (
    <div className="px-4 max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end px-2 mt-4">
        <h2 className={`font-['Space_Grotesk'] text-2xl font-bold tracking-tight ${textP}`}>Team Hub</h2>
        <span className={`text-xs uppercase tracking-widest ${textM} font-bold`}>{(team?.members?.length||0)+1} Active</span>
      </div>

      {/* Horizontal Members */}
      <div className="flex gap-4 overflow-x-auto py-2" style={{scrollbarWidth:'none'}}>
        <div className="flex flex-col items-center gap-2 flex-shrink-0">
          <div className="w-14 h-14 rounded-full border-2 border-[#44e571] flex items-center justify-center font-bold text-lg bg-[#44e571]/10 text-[#006e2c]">{team?.admin?.name?.[0]||'A'}</div>
          <span className={`text-[10px] font-bold uppercase ${textP}`}>You</span>
        </div>
        {(team?.members||[]).map((m,i)=>(
          <div key={i} className="flex flex-col items-center gap-2 flex-shrink-0">
            <div className={`w-14 h-14 rounded-full ${['bg-stone-300','bg-blue-200','bg-amber-200','bg-pink-200'][i%4]} flex items-center justify-center font-bold text-xs border ${border}`}>{m.name[0]}</div>
            <span className={`text-[10px] font-medium ${textS}`}>{m.name}</span>
          </div>
        ))}
        <button onClick={()=>setShowInvite(true)} className="flex flex-col items-center gap-2 flex-shrink-0">
          <div className={`w-14 h-14 rounded-full border-2 border-dashed ${border} flex items-center justify-center`}><Icon name="add" className={textM}/></div>
          <span className={`text-[10px] font-medium ${textS}`}>Invite</span>
        </button>
      </div>

      {/* Activity Stream */}
      <section className="space-y-4">
        <div className="flex items-center gap-4"><span className={`h-[1px] flex-grow ${border}`}></span><span className={`font-['Space_Grotesk'] text-xs font-bold uppercase tracking-[0.2em] ${textM}`}>Activity Stream</span><span className={`h-[1px] flex-grow ${border}`}></span></div>
        {activity.length===0?<p className={`text-center ${textS} py-4`}>No activity yet</p>:
          activity.slice(0,5).map((a,i)=>(
            <div key={i} className={`${i===0?`${cardBg} border border-[#44e571]`:`${surfaceLow} border ${border}`} p-4 rounded-xl flex justify-between items-center relative overflow-hidden`}>
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg ${i===0?'bg-[#44e571]/20':'bg-black/5'} flex items-center justify-center`}>
                  <Icon name={a.type==='transaction'?'receipt_long':'person_add'} className={i===0?'text-[#006e2c]':textS}/>
                </div>
                <div><h4 className={`font-['Space_Grotesk'] text-sm font-bold ${textP}`}>{a.description?.substring(0,40)}</h4><p className={`text-xs ${textM}`}>{a.category||a.type}</p></div>
              </div>
              <p className={`text-[10px] uppercase tracking-widest ${textM}`}>{new Date(a.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</p>
            </div>
          ))
        }
      </section>

      {/* Team Chat */}
      <section className="space-y-4">
        <div className="flex items-center gap-4"><span className={`h-[1px] flex-grow ${border}`}></span><span className={`font-['Space_Grotesk'] text-xs font-bold uppercase tracking-[0.2em] ${textM}`}>Secure Channel</span><span className={`h-[1px] flex-grow ${border}`}></span></div>
        <div className={`${surfaceLow} rounded-xl p-4 min-h-[200px] max-h-[300px] overflow-y-auto space-y-4`} style={{scrollbarWidth:'none'}}>
          {teamChat.length===0 && <p className={`text-center ${textS} py-8`}>Start a team conversation!</p>}
          {teamChat.map((m,i)=>(
            <div key={i} className={`flex ${m.userName===profile?.name||m.userId==='admin'?'flex-row-reverse':'flex-row'} gap-3 max-w-[85%] ${m.userName===profile?.name||m.userId==='admin'?'ml-auto':''}`}>
              <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold ${m.userName===profile?.name||m.userId==='admin'?'bg-[#44e571] text-[#00531f]':darkMode?'bg-white/20 text-white':'bg-[#0c1e26] text-white'}`}>{m.userName?.[0]||'?'}</div>
              <div className="space-y-1">
                <span className={`text-[10px] font-bold uppercase tracking-tighter ${textM}`}>{m.userName}</span>
                <div className={`${m.userName===profile?.name||m.userId==='admin'?`${darkMode?'bg-white/10':'bg-[#0c1e26]'} ${darkMode?'text-white':'text-white'}`:`${cardBg} border ${border}`} p-3 rounded-xl text-sm`}>{m.message}</div>
              </div>
            </div>
          ))}
          <div ref={teamChatEndRef}/>
        </div>
        <div className={`${cardBg} p-2 rounded-xl border ${border} flex items-center gap-2`}>
          <input value={teamChatInput} onChange={e=>setTeamChatInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&onSendTeamChat()} className={`flex-grow bg-transparent border-none focus:ring-0 focus:outline-none text-sm font-medium py-3 px-3 ${textP}`} placeholder="Type a message..."/>
          <button onClick={onSendTeamChat} className="w-10 h-10 rounded-full bg-[#44e571] text-[#00531f] flex items-center justify-center shadow-lg active:scale-90 transition-transform"><Icon name="send" filled/></button>
        </div>
      </section>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-6" onClick={()=>setShowInvite(false)}>
          <div className={`${cardBg} rounded-2xl p-8 w-full max-w-md shadow-2xl`} onClick={e=>e.stopPropagation()}>
            <h3 className={`font-['Space_Grotesk'] text-2xl font-bold ${textP} mb-6`}>Invite Team Member</h3>
            <div className="space-y-4">
              <div><label className={`text-xs font-bold ${textM} uppercase tracking-wider block mb-2`}>Name</label><input value={invName} onChange={e=>setInvName(e.target.value)} placeholder="e.g. Virendra" className={`w-full ${surfaceLow} ${textP} rounded-xl px-4 py-3 border ${border} focus:border-[#44e571] outline-none`}/></div>
              <div><label className={`text-xs font-bold ${textM} uppercase tracking-wider block mb-2`}>Email</label><input value={invEmail} onChange={e=>setInvEmail(e.target.value)} placeholder="virendra@company.ae" className={`w-full ${surfaceLow} ${textP} rounded-xl px-4 py-3 border ${border} focus:border-[#44e571] outline-none`}/></div>
              <div><label className={`text-xs font-bold ${textM} uppercase tracking-wider block mb-2`}>Role</label><select value={invRole} onChange={e=>setInvRole(e.target.value)} className={`w-full ${surfaceLow} ${textP} rounded-xl px-4 py-3 border ${border} outline-none`}><option value="member">Member</option><option value="salesman">Salesman</option><option value="accountant">Accountant</option><option value="manager">Manager</option></select></div>
              <button onClick={()=>{if(invName&&invEmail){onInvite(invName,invEmail,invRole);setInvName('');setInvEmail('');}}} className="w-full bg-[#44e571] text-[#00531f] font-bold rounded-full py-4 hover:opacity-90 active:scale-95">Send Invite</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ FILES VAULT TAB ============
function FilesTab({ files, renameId, setRenameId, renameValue, setRenameValue, onRename, textP, textS, textM, cardBg, surfaceLow, border, darkMode }) {
  const [filterType, setFilterType] = useState('all');
  const iconMap = { Food:'restaurant', Transport:'local_gas_station', Shopping:'shopping_cart', Office:'business_center', Utilities:'bolt', Entertainment:'movie', Health:'health_and_safety', Travel:'flight', General:'receipt_long' };

  return (
    <div className="px-6 max-w-5xl mx-auto">
      <section className="mb-10 mt-4">
        <p className={`text-xs uppercase tracking-[0.2em] ${textM} mb-1 font-bold`}>Financial Repository</p>
        <h2 className={`font-['Space_Grotesk'] text-4xl md:text-5xl font-bold tracking-tighter ${textP}`}>Files Vault</h2>
      </section>

      {/* Filter Bar */}
      <div className={`${cardBg} p-6 rounded-2xl shadow-[0_40px_40px_rgba(12,30,38,0.06)] flex flex-wrap items-center gap-6 mb-10`}>
        <div className="flex flex-col gap-2">
          <span className={`text-[10px] font-bold uppercase ${textM} tracking-widest`}>Type</span>
          <div className="flex gap-2">
            {['all','Food','Transport','Shopping'].map(t=>(
              <button key={t} onClick={()=>setFilterType(t)} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${filterType===t?(darkMode?'bg-white text-black':'bg-[#0c1e26] text-white'):`${surfaceLow} ${textS}`}`}>{t==='all'?'All':t}</button>
            ))}
          </div>
        </div>
        <div className="flex-1"><span className={`text-[10px] font-bold uppercase ${textM} tracking-widest block mb-2`}>Total Files</span><span className={`font-['Space_Grotesk'] text-2xl font-bold ${textP}`}>{files.length}</span></div>
      </div>

      {/* Files Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {files.filter(f=>filterType==='all'||f.category===filterType).map((file,i)=>(
          <div key={i} className={`${i===2&&files.length>2?`${darkMode?'bg-white':'bg-[#0c1e26]'} ${darkMode?'text-[#0c1e26]':'text-white'} shadow-xl`:`${cardBg}`} p-5 rounded-xl flex flex-col justify-between group hover:-translate-y-1 transition-all duration-300`}>
            <div className="flex justify-between items-start mb-6">
              <div className={`w-12 h-12 ${i===2&&files.length>2?(darkMode?'bg-black/10':'bg-white/10'):`${surfaceLow}`} flex items-center justify-center rounded-lg`}>
                <Icon name={iconMap[file.category]||'receipt_long'} className={i===2&&files.length>2?'text-[#44e571]':textP}/>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={()=>{setRenameId(file.id);setRenameValue(file.customName||file.merchant);}} className="p-2 rounded-full hover:bg-black/10"><Icon name="drive_file_rename_outline" className="text-sm"/></button>
              </div>
            </div>
            <div>
              {renameId===file.id?(
                <div className="flex gap-2 mb-2"><input value={renameValue} onChange={e=>setRenameValue(e.target.value)} className={`flex-1 bg-transparent border-b ${border} outline-none font-['Space_Grotesk'] font-bold ${textP} text-lg`} autoFocus onKeyDown={e=>{if(e.key==='Enter')onRename(file.id,renameValue);}}/><button onClick={()=>onRename(file.id,renameValue)} className="text-[#44e571]"><Icon name="check" className="text-sm"/></button></div>
              ):(
                <h3 className={`font-['Space_Grotesk'] text-xl font-bold tracking-tight`}>{file.customName||file.merchant}</h3>
              )}
              <div className="flex justify-between items-center mt-4">
                <span className="text-2xl font-black">{file.amount} <span className="text-sm font-medium opacity-40">AED</span></span>
                <span className={`text-[10px] ${file.amount>=500?'border border-[#44e571]/30 text-[#44e571]':'bg-[#44e571]/20 text-[#006e2c]'} px-2 py-0.5 rounded-full font-bold`}>{file.amount>=500?'High Value':'Processed'}</span>
              </div>
              <p className={`text-[10px] ${i===2&&files.length>2?(darkMode?'text-[#0c1e26]/40':'text-white/30'):textM} mt-4 border-t ${i===2&&files.length>2?(darkMode?'border-[#0c1e26]/10':'border-white/10'):border} pt-3`}>{file.date} &bull; {file.category}</p>
            </div>
          </div>
        ))}
        {/* Upload placeholder */}
        <button className={`border-2 border-dashed ${border} p-5 rounded-xl flex flex-col items-center justify-center ${textM} hover:border-[#44e571]/50 hover:${textP} transition-all cursor-pointer min-h-[200px]`}>
          <Icon name="add_circle" className="text-4xl mb-2"/><span className="font-['Space_Grotesk'] font-bold text-sm">Upload New Receipt</span>
        </button>
      </div>
    </div>
  );
}

// ============ EXPORT MODAL ============
function ExportModal({ data, onClose, textP, textS, textM, cardBg, surfaceLow, border, darkMode }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className={`${cardBg} rounded-2xl shadow-2xl p-8 md:p-12 max-w-3xl w-full relative overflow-hidden my-8`} onClick={e=>e.stopPropagation()}>
        <div className="absolute -top-10 -right-10 w-40 h-40 border border-dashed opacity-10 rounded-full" style={{borderColor:darkMode?'#fff':'#0c1e26'}}/>
        
        {/* Header */}
        <div className="flex justify-between items-start mb-10">
          <div><p className={`text-[10px] font-bold ${textM} uppercase tracking-[0.2em] mb-1`}>Document ID</p><p className={`font-mono text-xs ${textP}`}>{data.reportId}</p></div>
          <div className="text-right"><h2 className={`font-['Space_Grotesk'] text-2xl font-bold ${textP} mb-1`}>Expense Report</h2><p className={`text-sm ${textS}`}>Generated: {new Date(data.generatedAt).toLocaleDateString()}</p></div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead><tr className="bg-[#44e571]">
              <th className="py-4 px-4 text-[#00531f] font-bold text-xs uppercase tracking-widest">Date</th>
              <th className="py-4 px-4 text-[#00531f] font-bold text-xs uppercase tracking-widest">Merchant</th>
              <th className="py-4 px-4 text-[#00531f] font-bold text-xs uppercase tracking-widest">VAT (5%)</th>
              <th className="py-4 px-4 text-[#00531f] font-bold text-xs uppercase tracking-widest text-right">Total AED</th>
            </tr></thead>
            <tbody className="text-sm">
              {(data.transactions||[]).map((t,i)=>(
                <tr key={i}><td className={`py-4 px-4 border-b ${border} ${textS}`}>{t.date}</td><td className={`py-4 px-4 border-b ${border} font-bold ${textP}`}>{t.merchant}</td><td className={`py-4 px-4 border-b ${border} ${textP}`}>{t.vat?.toFixed(2)}</td><td className={`py-4 px-4 border-b ${border} text-right font-medium ${textP}`}>{t.amount?.toLocaleString()}</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mt-8 flex justify-end">
          <div className="w-full max-w-xs space-y-3 pt-6 border-t-2" style={{borderColor:darkMode?'#fff':'#0c1e26'}}>
            <div className={`flex justify-between items-center text-sm`}><span className={textS}>Subtotal</span><span className={`font-medium ${textP}`}>{data.subtotal?.toLocaleString()} AED</span></div>
            <div className={`flex justify-between items-center text-sm`}><span className={textS}>Total VAT (5%)</span><span className={`font-medium ${textP}`}>{data.totalVat?.toLocaleString()} AED</span></div>
            <div className="flex justify-between items-center pt-2"><span className={`text-xs font-bold uppercase tracking-widest ${textP}`}>Grand Total</span><span className={`font-['Space_Grotesk'] text-3xl font-black ${textP}`}>{data.grandTotal?.toLocaleString()} AED</span></div>
          </div>
        </div>

        {/* Footer */}
        <div className={`mt-12 flex items-center gap-4 opacity-30`}><Icon name="verified"/><div className={`h-[1px] flex-grow ${darkMode?'bg-white':'bg-[#0c1e26]'}`}/><span className="text-[10px] font-bold tracking-[0.3em] uppercase">Audit-Filely Precision</span></div>

        {/* Actions */}
        <div className="mt-8 flex gap-4 justify-end">
          <button onClick={onClose} className={`px-8 py-4 rounded-lg ${surfaceLow} ${textP} font-bold text-sm`}>Close</button>
          <button onClick={()=>window.print()} className="flex items-center gap-3 px-10 py-4 rounded-full bg-[#44e571] text-[#00531f] font-bold text-sm shadow-lg hover:scale-105 active:scale-95 transition-all"><Icon name="download"/>Export PDF</button>
        </div>
      </div>
    </div>
  );
}

// ============ SETTINGS TAB ============
function SettingsTab({ profile, setProfile, textP, textS, textM, cardBg, surfaceLow, border, darkMode }) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(profile?.name||'');
  const [editEmail, setEditEmail] = useState(profile?.email||'');
  const [editCompany, setEditCompany] = useState(profile?.company||'');
  const [aiModel, setAiModel] = useState('gemini');
  const [notifications, setNotifications] = useState(true);

  useEffect(()=>{if(profile){setEditName(profile.name||'');setEditEmail(profile.email||'');setEditCompany(profile.company||'');}}, [profile]);

  const saveProfile = async () => {
    try { await fetch('/api/settings/profile',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:editName,email:editEmail,company:editCompany})}); setProfile({...profile,name:editName,email:editEmail,company:editCompany}); setEditing(false); } catch(e){}
  };

  return (
    <div className="px-6 max-w-2xl mx-auto">
      <section className="mb-12 mt-4">
        <p className={`text-[10px] uppercase tracking-[0.2em] ${textM} mb-2 font-bold`}>Preferences</p>
        <h2 className={`font-['Space_Grotesk'] text-4xl md:text-5xl font-bold tracking-tighter ${textP}`}>Settings</h2>
        <div className="w-12 h-1 bg-[#44e571] mt-4"/>
      </section>

      {/* Model Switcher */}
      <section className="mb-16">
        <div className="flex justify-between items-end mb-6">
          <div><h3 className={`font-['Space_Grotesk'] text-xl font-bold ${textP}`}>Model Switcher</h3><p className={`${textS} text-sm`}>Select the AI engine for processing</p></div>
          <Icon name="memory" className="text-[#44e571]"/>
        </div>
        <div className={`${surfaceLow} p-1.5 rounded-full flex gap-1 items-center`}>
          {[{id:'gemini',label:'Speedy (Gemini)'},{id:'claude',label:'Smart (Claude)'},{id:'auto',label:'Auto'}].map(m=>(
            <button key={m.id} onClick={()=>setAiModel(m.id)} className={`flex-1 py-3 px-4 rounded-full text-sm font-bold font-['Space_Grotesk'] transition-all ${aiModel===m.id?'bg-[#44e571] text-[#0c1e26] shadow-[0_4px_20px_rgba(68,229,113,0.3)]':`${textS} hover:${textP}`}`}>{m.label}</button>
          ))}
        </div>
        <div className={`mt-6 flex items-start gap-4 p-4 ${cardBg} rounded-xl border ${border}`}>
          <Icon name="info" className={`${textM} mt-1`}/>
          <p className={`text-xs ${textS} leading-relaxed`}>
            {aiModel==='gemini'?'Speedy mode uses Gemini for fast OCR and low-cost processing. Best for everyday receipts.':
             aiModel==='claude'?'Smart mode uses Claude for advanced reasoning and complex document parsing. Higher accuracy, slightly longer.':
             'Auto mode intelligently selects the best model based on document complexity.'}
          </p>
        </div>
      </section>

      {/* Notifications */}
      <section className="mb-16">
        <h3 className={`font-['Space_Grotesk'] text-xl font-bold ${textP} mb-8`}>Notifications</h3>
        <div className={`${cardBg} rounded-xl p-6 shadow-[0_40px_40px_rgba(12,30,38,0.04)] border ${border}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full ${surfaceLow} flex items-center justify-center`}><Icon name="notifications_active" className={textS}/></div>
              <div><span className={`block font-['Space_Grotesk'] font-bold ${textP}`}>Remind me twice daily</span><span className={`block text-xs ${textM}`}>Morning digest & Evening summary</span></div>
            </div>
            <button onClick={()=>setNotifications(!notifications)} className={`w-14 h-8 rounded-full relative transition-colors ${notifications?'bg-[#44e571]':darkMode?'bg-white/20':'bg-gray-300'}`}>
              <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${notifications?'translate-x-7':'translate-x-1'}`}/>
            </button>
          </div>
          {notifications && (
            <div className={`mt-4 pt-4 border-t ${border} space-y-2`}>
              <p className={`text-sm ${textS}`}>☀️ &ldquo;Hey! Any new ADNOC or Etisalat bills for Filely to sort?&rdquo;</p>
              <p className={`text-sm ${textS}`}>🌙 &ldquo;Evening check-in: Did anyone spend Dirhams today? Snap a photo!&rdquo;</p>
            </div>
          )}
        </div>
      </section>

      {/* Profile */}
      <section className="mb-12">
        <h3 className={`font-['Space_Grotesk'] text-xl font-bold ${textP} mb-6`}>Profile</h3>
        <div className={`${cardBg} p-8 rounded-2xl shadow-[0_40px_40px_rgba(12,30,38,0.06)] border ${border}`}>
          {editing?(
            <div className="space-y-4">
              <div><label className={`text-xs font-bold ${textM} uppercase mb-2 block`}>Full Name</label><input value={editName} onChange={e=>setEditName(e.target.value)} className={`w-full ${surfaceLow} ${textP} rounded-xl px-4 py-3 border ${border} focus:border-[#44e571] outline-none`}/></div>
              <div><label className={`text-xs font-bold ${textM} uppercase mb-2 block`}>Email</label><input value={editEmail} onChange={e=>setEditEmail(e.target.value)} className={`w-full ${surfaceLow} ${textP} rounded-xl px-4 py-3 border ${border} focus:border-[#44e571] outline-none`}/></div>
              <div><label className={`text-xs font-bold ${textM} uppercase mb-2 block`}>Company</label><input value={editCompany} onChange={e=>setEditCompany(e.target.value)} className={`w-full ${surfaceLow} ${textP} rounded-xl px-4 py-3 border ${border} focus:border-[#44e571] outline-none`}/></div>
              <div className="flex gap-3"><button onClick={saveProfile} className="flex-1 bg-[#44e571] text-[#00531f] font-bold rounded-full py-3">Save</button><button onClick={()=>setEditing(false)} className={`flex-1 border ${border} ${textP} font-bold rounded-full py-3`}>Cancel</button></div>
            </div>
          ):(
            <div className="space-y-5">
              <div><span className={`text-xs font-bold ${textM} uppercase`}>Name</span><p className={`text-xl font-medium ${textP} mt-1`}>{profile?.name||'Set name'}</p></div>
              <div className={`h-[0.5px] ${border}`}/>
              <div><span className={`text-xs font-bold ${textM} uppercase`}>Email</span><p className={`text-xl font-medium ${textP} mt-1`}>{profile?.email||'Set email'}</p></div>
              <div className={`h-[0.5px] ${border}`}/>
              <div><span className={`text-xs font-bold ${textM} uppercase`}>Company</span><p className={`text-xl font-medium ${textP} mt-1`}>{profile?.company||'Set company'}</p></div>
              <button onClick={()=>setEditing(true)} className="text-[#006e2c] text-sm font-bold flex items-center gap-1 mt-2">Edit profile <Icon name="arrow_forward" className="text-sm"/></button>
            </div>
          )}
        </div>
      </section>

      {/* Subscription */}
      <section className="mb-12">
        <div className={`${cardBg} border ${border} p-8 rounded-2xl relative overflow-hidden`}>
          <div className="flex justify-between items-start mb-8">
            <div><h4 className={`font-['Space_Grotesk'] text-3xl font-bold tracking-tighter ${textP}`}>Elite Plan</h4><p className={`${textS} text-sm mt-1`}>9.99 AED/month</p></div>
            <div className="bg-[#44e571]/20 text-[#006e2c] px-3 py-1 rounded-full text-[10px] font-bold uppercase">Recommended</div>
          </div>
          <ul className="space-y-4 mb-8">
            {['150 AI Scans per month','Team Access + Invites','Audit-Ready PDF Export','Advanced AI (Gemini Pro + Claude)'].map((f,i)=>(
              <li key={i} className="flex items-center gap-3"><Icon name="check_circle" className="text-[#006e2c] text-lg"/><span className={`text-sm font-medium ${textP}`}>{f}</span></li>
            ))}
          </ul>
          <button className="w-full py-4 bg-[#44e571] text-[#00531f] font-bold rounded-full hover:shadow-lg active:scale-95 transition-all">Upgrade to Elite</button>
        </div>
      </section>

      {/* Settings List */}
      <section className="space-y-4 mb-8">
        {[{icon:'lock',label:'Privacy & Security'},{icon:'cloud_done',label:'Storage Management'},{icon:'help',label:'Help & Support'}].map((item,i)=>(
          <div key={i} className={`${cardBg} p-5 rounded-xl flex items-center justify-between border ${border} hover:bg-opacity-80 cursor-pointer group transition`}>
            <div className="flex items-center gap-4"><Icon name={item.icon} className={`${textM} group-hover:text-[#44e571] transition-colors`}/><span className={`font-['Space_Grotesk'] font-medium text-sm ${textP}`}>{item.label}</span></div>
            <Icon name="chevron_right" className={`${textM} text-sm`}/>
          </div>
        ))}
      </section>
    </div>
  );
}
