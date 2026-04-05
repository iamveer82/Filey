'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Toggle dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Fetch data on mount and tab change
  useEffect(() => {
    if (activeTab === 'home') fetchDashboard();
    if (activeTab === 'team') { fetchTeam(); fetchTeamActivity(); }
    if (activeTab === 'settings') fetchProfile();
    if (activeTab === 'chat') fetchSessions();
  }, [activeTab]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // API helpers
  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/dashboard');
      const data = await res.json();
      setDashboard(data);
    } catch (e) { console.error(e); }
  };

  const fetchTeam = async () => {
    try {
      const res = await fetch('/api/team');
      const data = await res.json();
      setTeam(data.team);
    } catch (e) { console.error(e); }
  };

  const fetchTeamActivity = async () => {
    try {
      const res = await fetch('/api/team/activity');
      const data = await res.json();
      setTeamActivity(data.activity || []);
    } catch (e) { console.error(e); }
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/settings/profile');
      const data = await res.json();
      setProfile(data.profile);
    } catch (e) { console.error(e); }
  };

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/chat/sessions');
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (e) { console.error(e); }
  };

  const loadSession = async (sid) => {
    setSessionId(sid);
    try {
      const res = await fetch(`/api/chat/messages?sessionId=${sid}`);
      const data = await res.json();
      setChatMessages((data.messages || []).map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        extractedTransaction: m.extractedTransaction,
        hasImage: m.hasImage,
        timestamp: m.timestamp,
      })));
    } catch (e) { console.error(e); }
  };

  const startNewChat = () => {
    setSessionId(uuidv4());
    setChatMessages([]);
  };

  // Send chat message
  const sendMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim();
    setChatInput('');
    setChatLoading(true);

    const userMsg = { id: uuidv4(), role: 'user', content: msg, timestamp: new Date().toISOString() };
    setChatMessages(prev => [...prev, userMsg]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, sessionId }),
      });
      const data = await res.json();

      if (data.error) {
        setChatMessages(prev => [...prev, { id: uuidv4(), role: 'assistant', content: `Error: ${data.error}`, timestamp: new Date().toISOString() }]);
      } else {
        const aiMsg = {
          id: uuidv4(),
          role: 'assistant',
          content: data.message,
          extractedTransaction: data.extractedTransaction,
          timestamp: data.timestamp,
        };
        setChatMessages(prev => [...prev, aiMsg]);
        if (data.extractedTransaction) {
          setPendingTransaction(data.extractedTransaction);
        }
        if (data.sessionId) setSessionId(data.sessionId);
      }
    } catch (e) {
      setChatMessages(prev => [...prev, { id: uuidv4(), role: 'assistant', content: 'Connection error. Please try again.', timestamp: new Date().toISOString() }]);
    }
    setChatLoading(false);
  };

  // Handle receipt upload
  const handleReceiptUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setChatLoading(true);
    const userMsg = { id: uuidv4(), role: 'user', content: `Uploading receipt: ${file.name}`, hasImage: true, timestamp: new Date().toISOString() };
    setChatMessages(prev => [...prev, userMsg]);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result.split(',')[1];
        const mimeType = file.type || 'image/jpeg';

        const res = await fetch('/api/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64, mimeType, sessionId }),
        });
        const data = await res.json();

        if (data.error) {
          setChatMessages(prev => [...prev, { id: uuidv4(), role: 'assistant', content: `Scan error: ${data.error}`, timestamp: new Date().toISOString() }]);
        } else {
          const aiMsg = {
            id: uuidv4(),
            role: 'assistant',
            content: data.message,
            extractedTransaction: data.extractedTransaction,
            timestamp: data.timestamp,
          };
          setChatMessages(prev => [...prev, aiMsg]);
          if (data.extractedTransaction) {
            setPendingTransaction(data.extractedTransaction);
          }
        }
        setChatLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (e) {
      setChatMessages(prev => [...prev, { id: uuidv4(), role: 'assistant', content: 'Failed to upload receipt.', timestamp: new Date().toISOString() }]);
      setChatLoading(false);
    }
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Verify (save) transaction
  const verifyTransaction = async (txn) => {
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(txn),
      });
      const data = await res.json();
      setPendingTransaction(null);
      setChatMessages(prev => [...prev, {
        id: uuidv4(),
        role: 'assistant',
        content: `Transaction verified and saved! ${txn.merchant} - ${txn.amount} ${txn.currency}`,
        timestamp: new Date().toISOString(),
      }]);
    } catch (e) {
      console.error(e);
    }
  };

  // Invite team member
  const inviteMember = async (name, email, role) => {
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, role }),
      });
      const data = await res.json();
      setShowInviteModal(false);
      fetchTeam();
      fetchTeamActivity();
    } catch (e) { console.error(e); }
  };

  // Theme classes
  const bg = darkMode ? 'bg-[#0a0a0a]' : 'bg-[#f9f9f9]';
  const cardBg = darkMode ? 'bg-[#1a1a1a]' : 'bg-white';
  const surfaceLow = darkMode ? 'bg-[#141414]' : 'bg-[#f3f3f4]';
  const textPrimary = darkMode ? 'text-white' : 'text-[#0c1e26]';
  const textSecondary = darkMode ? 'text-white/60' : 'text-[#0c1e26]/60';
  const textMuted = darkMode ? 'text-white/40' : 'text-[#0c1e26]/40';
  const borderColor = darkMode ? 'border-white/10' : 'border-[#0c1e26]/10';
  const navBg = darkMode ? 'bg-[#1a1a1a]/80' : 'bg-white/70';

  return (
    <div className={`min-h-screen ${bg} font-[Manrope] transition-colors duration-300`}>
      {/* Top App Bar */}
      <header className={`fixed top-0 w-full z-50 ${navBg} backdrop-blur-md shadow-[0_40px_40px_rgba(12,30,38,0.06)] flex justify-between items-center px-6 py-4`}>
        <div className="flex items-center gap-2">
          <Icon name="smart_toy" className="text-emerald-500 text-2xl" />
          <h1 className={`font-['Space_Grotesk'] tracking-tighter font-bold text-2xl ${textPrimary}`}>Filely</h1>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition">
            <Icon name={darkMode ? 'light_mode' : 'dark_mode'} className={textSecondary} />
          </button>
          <div className={`w-8 h-8 rounded-full ${surfaceLow} flex items-center justify-center text-sm font-bold ${textPrimary}`}>
            {profile?.name?.[0] || 'U'}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 pb-32 min-h-screen">
        {activeTab === 'home' && <HomeTab dashboard={dashboard} textPrimary={textPrimary} textSecondary={textSecondary} textMuted={textMuted} cardBg={cardBg} surfaceLow={surfaceLow} borderColor={borderColor} darkMode={darkMode} />}
        {activeTab === 'chat' && (
          <ChatTab
            messages={chatMessages}
            input={chatInput}
            setInput={setChatInput}
            onSend={sendMessage}
            loading={chatLoading}
            sessions={sessions}
            onLoadSession={loadSession}
            onNewChat={startNewChat}
            onUpload={handleReceiptUpload}
            fileInputRef={fileInputRef}
            chatEndRef={chatEndRef}
            pendingTransaction={pendingTransaction}
            onVerify={verifyTransaction}
            onDismiss={() => setPendingTransaction(null)}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            textMuted={textMuted}
            cardBg={cardBg}
            surfaceLow={surfaceLow}
            borderColor={borderColor}
            darkMode={darkMode}
          />
        )}
        {activeTab === 'team' && (
          <TeamTab
            team={team}
            activity={teamActivity}
            showInvite={showInviteModal}
            setShowInvite={setShowInviteModal}
            onInvite={inviteMember}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            textMuted={textMuted}
            cardBg={cardBg}
            surfaceLow={surfaceLow}
            borderColor={borderColor}
            darkMode={darkMode}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsTab
            profile={profile}
            setProfile={setProfile}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            textMuted={textMuted}
            cardBg={cardBg}
            surfaceLow={surfaceLow}
            borderColor={borderColor}
            darkMode={darkMode}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className={`fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-50 rounded-full ${navBg} backdrop-blur-md shadow-[0_20px_50px_rgba(12,30,38,0.12)] flex justify-around items-center px-4 py-3`}>
        {[
          { id: 'home', icon: 'home' },
          { id: 'chat', icon: 'chat_bubble' },
          { id: 'team', icon: 'group' },
          { id: 'settings', icon: 'settings' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center justify-center p-3 rounded-full transition-all duration-200 active:scale-90 ${
              activeTab === tab.id
                ? 'bg-[#44e571] text-[#00531f]'
                : darkMode ? 'text-white/40 hover:bg-white/5' : 'text-slate-400 hover:bg-stone-100/50'
            }`}
          >
            <Icon name={tab.icon} filled={activeTab === tab.id} />
          </button>
        ))}
      </nav>
    </div>
  );
}

// ============ HOME TAB ============
function HomeTab({ dashboard, textPrimary, textSecondary, textMuted, cardBg, surfaceLow, borderColor, darkMode }) {
  const d = dashboard || {};
  const greeting = new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening';

  return (
    <div className="px-6 max-w-7xl mx-auto">
      {/* Decorative orbital */}
      <div className="absolute right-0 top-20 -z-10 opacity-10 pointer-events-none">
        <svg width="400" height="400" viewBox="0 0 400 400">
          <circle cx="300" cy="100" r="180" fill="none" stroke={darkMode ? '#fff' : '#0c1e26'} strokeWidth="0.5" strokeDasharray="8 8" />
          <circle cx="300" cy="100" r="100" fill="none" stroke={darkMode ? '#fff' : '#0c1e26'} strokeWidth="0.5" strokeDasharray="4 4" />
        </svg>
      </div>

      {/* Hero */}
      <header className="mb-12 mt-4">
        <p className={`text-sm uppercase tracking-widest ${textMuted} mb-2 font-semibold`}>{greeting}</p>
        <h1 className={`font-['Space_Grotesk'] text-4xl md:text-5xl font-bold tracking-tighter ${textPrimary} leading-tight`}>
          Your financial <span className="text-[#006e2c] italic">clarity</span><br />at a glance.
        </h1>
      </header>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {/* Monthly Spend */}
        <div className={`${cardBg} p-8 rounded-2xl border border-transparent ${darkMode ? 'border-white/5' : ''} shadow-[0_40px_40px_rgba(12,30,38,0.04)] flex flex-col justify-between h-64 relative overflow-hidden`}>
          <div className="z-10">
            <Icon name="payments" className={`${textMuted} mb-4`} />
            <h3 className={`text-sm font-semibold ${textSecondary}`}>This Month&apos;s Spend</h3>
            <div className={`font-['Space_Grotesk'] text-4xl font-bold mt-2 ${textPrimary}`}>
              {(d.totalSpend || 0).toLocaleString()} AED
            </div>
          </div>
          <div className="h-12 w-full mt-auto z-10 flex items-end gap-1">
            <div className="w-full h-2 bg-[#44e571]/20 rounded-full overflow-hidden">
              <div className="bg-[#44e571] h-full rounded-full transition-all" style={{ width: `${Math.min((d.scanCount || 0) / (d.scanLimit || 10) * 100, 100)}%` }} />
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-[0.03] pointer-events-none">
            <Icon name="trending_up" className="text-[120px]" />
          </div>
        </div>

        {/* VAT Tracked */}
        <div className={`${cardBg} p-8 rounded-2xl shadow-[0_40px_40px_rgba(12,30,38,0.04)] flex flex-col justify-between h-64 border-l-4 border-l-[#44e571]`}>
          <div>
            <Icon name="account_balance" className={`${textMuted} mb-4`} />
            <h3 className={`text-sm font-semibold ${textSecondary}`}>VAT Tracked (5%)</h3>
            <div className={`font-['Space_Grotesk'] text-4xl font-bold mt-2 ${textPrimary}`}>
              {(d.totalVat || 0).toLocaleString()} AED
            </div>
          </div>
          <div className="flex items-center gap-2 text-[#006e2c] font-bold text-sm bg-[#44e571]/10 self-start px-3 py-1 rounded-full">
            <Icon name="check_circle" filled className="text-sm" />
            UAE VAT Compliant
          </div>
        </div>

        {/* Scan Usage */}
        <div className={`${darkMode ? 'bg-white' : 'bg-[#0c1e26]'} p-8 rounded-2xl shadow-[0_40px_40px_rgba(12,30,38,0.12)] flex flex-col justify-between h-64 ${darkMode ? 'text-[#0c1e26]' : 'text-white'}`}>
          <div>
            <Icon name="qr_code_scanner" className={`${darkMode ? 'text-[#0c1e26]/40' : 'text-white/40'} mb-4`} />
            <h3 className={`text-sm font-semibold ${darkMode ? 'text-[#0c1e26]/60' : 'text-white/60'}`}>AI Scans Used</h3>
            <div className="font-['Space_Grotesk'] text-4xl font-bold mt-2 text-[#44e571]">
              {d.scanCount || 0}/{d.scanLimit || 10}
            </div>
          </div>
          <div className="h-4 flex items-end gap-[2px]">
            {[20, 40, 30, 70, 100, 60, 80].map((h, i) => (
              <div key={i} className="bg-[#44e571]/60 w-full rounded-sm transition-all" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
        <div className="lg:col-span-2">
          <h2 className={`font-['Space_Grotesk'] text-2xl font-bold mb-6 flex items-center gap-3 ${textPrimary}`}>
            <span className="w-8 h-[2px] bg-[#44e571]"></span>
            Recent Transactions
          </h2>
          <div className="space-y-4">
            {(d.recentTransactions || []).length === 0 && (
              <div className={`${surfaceLow} p-6 rounded-xl text-center ${textSecondary}`}>
                <Icon name="receipt_long" className="text-4xl mb-2 block" />
                No transactions yet. Start by scanning a receipt in Chat!
              </div>
            )}
            {(d.recentTransactions || []).map((txn, i) => (
              <div key={i} className={`${surfaceLow} p-6 rounded-xl flex items-center justify-between group hover:${cardBg} transition-colors border border-transparent hover:${borderColor}`}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#44e571]/20 flex items-center justify-center font-bold text-[#006e2c]">
                    {(txn.merchant || 'U')[0]}
                  </div>
                  <div>
                    <p className={`${textPrimary} font-bold`}>{txn.merchant}</p>
                    <p className={`text-sm ${textMuted}`}>{txn.category} &bull; {txn.date}</p>
                  </div>
                </div>
                <span className={`font-['Space_Grotesk'] font-bold ${textPrimary}`}>{txn.amount} AED</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Card */}
        <div className={`${darkMode ? 'bg-[#44e571]/5 border-[#44e571]/20' : 'bg-[#44e571]/5 border-[#44e571]/30'} p-8 rounded-2xl border-dashed border-[1.5px] relative`}>
          <div className="absolute -top-4 -right-4 bg-[#44e571] text-[#00531f] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-tighter">AI Ready</div>
          <h3 className={`font-['Space_Grotesk'] text-xl font-bold ${textPrimary} mb-4`}>Quick Start</h3>
          <p className={`text-sm ${textSecondary} mb-6 leading-relaxed`}>
            Scan receipts, type expenses, or ask about your finances. Filely AI handles UAE VAT automatically.
          </p>
          <div className={`text-sm ${textMuted} space-y-3`}>
            <p>Try saying:</p>
            <p className={`${textPrimary} font-medium italic`}>&ldquo;Paid 50 AED for food at Carrefour&rdquo;</p>
            <p className={`${textPrimary} font-medium italic`}>&ldquo;Upload a receipt photo&rdquo;</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ CHAT TAB ============
function ChatTab({ messages, input, setInput, onSend, loading, sessions, onLoadSession, onNewChat, onUpload, fileInputRef, chatEndRef, pendingTransaction, onVerify, onDismiss, textPrimary, textSecondary, textMuted, cardBg, surfaceLow, borderColor, darkMode }) {
  return (
    <div className="max-w-2xl mx-auto relative">
      {/* Swipable History */}
      <section className="px-6 mt-2">
        <div className="flex overflow-x-auto gap-3 py-3 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
          <button onClick={onNewChat} className="flex-none flex flex-col items-center gap-2">
            <div className={`w-12 h-12 rounded-full border ${borderColor} flex items-center justify-center bg-[#44e571]/10`}>
              <Icon name="add" className="text-[#44e571] text-[20px]" />
            </div>
            <span className={`text-[10px] uppercase tracking-widest ${textMuted} font-bold`}>New</span>
          </button>
          {sessions.map((s, i) => (
            <button key={i} onClick={() => onLoadSession(s.sessionId)} className="flex-none flex flex-col items-center gap-2">
              <div className={`w-12 h-12 rounded-full border ${borderColor} flex items-center justify-center ${surfaceLow}`}>
                <Icon name="receipt_long" className={`${textSecondary} text-[20px]`} />
              </div>
              <span className={`text-[10px] uppercase tracking-widest ${textMuted} font-bold max-w-[60px] truncate`}>
                {s.lastMessage?.substring(0, 8) || 'Chat'}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Orbital line decoration */}
      <div className="absolute right-0 top-1/4 w-1/2 h-64 border-r border-t border-dashed opacity-10 -z-10 rounded-tr-[100px]" style={{ borderColor: darkMode ? '#fff' : '#0c1e26' }} />

      {/* Chat Messages */}
      <section className="px-6 space-y-6 mt-8 mb-4" style={{ minHeight: '400px' }}>
        {messages.length === 0 && (
          <div className="text-center py-20">
            <Icon name="smart_toy" filled className="text-[#44e571] text-6xl mb-4" />
            <h2 className={`font-['Space_Grotesk'] text-2xl font-bold ${textPrimary} mb-2`}>Filely AI</h2>
            <p className={`${textSecondary} text-sm max-w-xs mx-auto`}>
              Scan receipts, log expenses, or ask about your UAE finances. I handle the VAT math!
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-6">
              {['Scan a receipt', 'Paid 120 AED at ENOC', 'Show my VAT total'].map(s => (
                <button key={s} onClick={() => { setInput(s); }} className={`${surfaceLow} px-4 py-2 rounded-full text-sm ${textSecondary} hover:${textPrimary} transition`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id}>
            {msg.role === 'user' ? (
              <div className="flex justify-end">
                <div className={`${cardBg} border ${borderColor} p-4 rounded-2xl rounded-br-sm max-w-[85%] shadow-sm`}>
                  {msg.hasImage && <div className="flex items-center gap-2 mb-2 text-[#44e571]"><Icon name="image" className="text-sm" /><span className="text-xs font-bold">Receipt attached</span></div>}
                  <p className={`${textPrimary} leading-relaxed text-sm`}>{msg.content}</p>
                </div>
              </div>
            ) : (
              <div className="flex justify-start gap-3">
                <div className="w-8 h-8 flex-none mt-1">
                  <Icon name="smart_toy" filled className="text-[#006e2c] text-2xl" />
                </div>
                <div className="max-w-[85%] space-y-3">
                  <div className={`${surfaceLow} border ${borderColor} p-4 rounded-2xl rounded-bl-sm`}>
                    <p className={`${textSecondary} leading-relaxed text-sm whitespace-pre-wrap`}>{msg.content}</p>
                  </div>

                  {/* Transaction Confirmation Card */}
                  {msg.extractedTransaction && (
                    <TransactionCard
                      txn={msg.extractedTransaction}
                      onVerify={onVerify}
                      onDismiss={onDismiss}
                      isPending={pendingTransaction?.id === msg.extractedTransaction?.id}
                      textPrimary={textPrimary}
                      textMuted={textMuted}
                      cardBg={cardBg}
                      borderColor={borderColor}
                      darkMode={darkMode}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex justify-start gap-3">
            <div className="w-8 h-8 flex-none mt-1">
              <Icon name="smart_toy" filled className="text-[#006e2c] text-2xl" />
            </div>
            <div className={`${surfaceLow} p-4 rounded-2xl rounded-bl-sm`}>
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-[#44e571] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-[#44e571] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-[#44e571] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </section>

      {/* Input Area */}
      <div className="fixed bottom-24 left-0 w-full z-40">
        <div className="max-w-xl mx-auto px-6">
          <div className={`${cardBg} rounded-full p-2 pr-4 shadow-[0_20px_50px_rgba(12,30,38,0.12)] border ${borderColor} flex items-center gap-3`}>
            <input type="file" ref={fileInputRef} onChange={onUpload} accept="image/*" className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-12 h-12 rounded-full bg-[#44e571] text-[#00531f] flex items-center justify-center shadow-sm hover:scale-105 active:scale-95 transition-transform"
            >
              <Icon name="add_a_photo" className="font-semibold" />
            </button>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onSend()}
              className={`flex-1 bg-transparent border-none focus:ring-0 focus:outline-none ${textPrimary} placeholder:${textMuted} font-medium text-sm`}
              placeholder="Type an expense or message..."
            />
            <button onClick={onSend} disabled={loading || !input.trim()} className="text-[#44e571] disabled:opacity-30 transition">
              <Icon name="send" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ TRANSACTION CARD ============
function TransactionCard({ txn, onVerify, onDismiss, isPending, textPrimary, textMuted, cardBg, borderColor, darkMode }) {
  if (!txn) return null;
  return (
    <div className={`${cardBg} rounded-2xl p-6 shadow-[0_40px_80px_rgba(12,30,38,0.08)] border ${borderColor}`}>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-2 h-8 bg-[#44e571] rounded-full" />
        <h2 className={`font-['Space_Grotesk'] text-lg font-bold tracking-tight ${textPrimary}`}>AI Confirmation</h2>
      </div>
      <div className="grid grid-cols-2 gap-y-5 gap-x-4 mb-6">
        <div>
          <p className={`text-[10px] uppercase tracking-widest ${textMuted} mb-1 font-bold`}>Merchant</p>
          <p className={`font-['Space_Grotesk'] font-bold ${textPrimary}`}>{txn.merchant || 'Unknown'}</p>
        </div>
        <div>
          <p className={`text-[10px] uppercase tracking-widest ${textMuted} mb-1 font-bold`}>Date</p>
          <p className={`font-['Space_Grotesk'] font-bold ${textPrimary}`}>{txn.date || 'Today'}</p>
        </div>
        <div>
          <p className={`text-[10px] uppercase tracking-widest ${textMuted} mb-1 font-bold`}>Amount</p>
          <p className={`font-['Space_Grotesk'] font-bold ${textPrimary} text-2xl`}>{txn.amount || 0} <span className="text-sm">AED</span></p>
        </div>
        <div>
          <p className={`text-[10px] uppercase tracking-widest ${textMuted} mb-1 font-bold`}>VAT (5%)</p>
          <p className={`font-['Space_Grotesk'] font-bold text-[#006e2c]`}>{txn.vat || 0} AED</p>
        </div>
        {txn.category && (
          <div>
            <p className={`text-[10px] uppercase tracking-widest ${textMuted} mb-1 font-bold`}>Category</p>
            <span className={`inline-flex items-center px-2 py-1 ${darkMode ? 'bg-white/10' : 'bg-[#f3f3f4]'} rounded-md font-bold text-xs ${textPrimary}`}>{txn.category}</span>
          </div>
        )}
        {txn.trn && (
          <div>
            <p className={`text-[10px] uppercase tracking-widest ${textMuted} mb-1 font-bold`}>TRN</p>
            <p className={`font-mono text-sm ${textPrimary}`}>{txn.trn}</p>
          </div>
        )}
      </div>
      {isPending && (
        <div className="flex gap-3">
          <button onClick={() => onVerify(txn)} className="flex-1 bg-[#44e571] text-[#00531f] font-bold rounded-full py-3 px-6 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity active:scale-95">
            Verify <Icon name="arrow_forward" className="text-[20px]" />
          </button>
          <button onClick={onDismiss} className={`flex-1 border ${borderColor} ${textPrimary} font-bold rounded-xl py-3 px-6 hover:opacity-80 transition-colors`}>
            Edit
          </button>
        </div>
      )}
    </div>
  );
}

// ============ TEAM TAB ============
function TeamTab({ team, activity, showInvite, setShowInvite, onInvite, textPrimary, textSecondary, textMuted, cardBg, surfaceLow, borderColor, darkMode }) {
  const [invName, setInvName] = useState('');
  const [invEmail, setInvEmail] = useState('');
  const [invRole, setInvRole] = useState('member');

  return (
    <div className="px-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 mt-4">
        <div>
          <span className="text-[10px] uppercase tracking-widest font-bold text-[#006e2c] mb-2 block">Collaboration Hub</span>
          <h1 className={`font-['Space_Grotesk'] text-4xl md:text-5xl font-bold tracking-tighter leading-none ${textPrimary} mb-4`}>
            Team Access
          </h1>
          <div className={`flex items-center gap-2 ${textSecondary}`}>
            <Icon name="corporate_fare" className="text-sm" />
            <p className="font-medium">Active Team: <span className={textPrimary}>{team?.name || 'My Organization'}</span></p>
          </div>
        </div>
        <div className="hidden lg:block relative w-24 h-24">
          <div className={`absolute inset-0 rounded-full border border-dashed ${borderColor} animate-[spin_20s_linear_infinite]`} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-[#44e571] rounded-full" />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
        {/* Directory */}
        <div className="lg:col-span-5 space-y-6">
          <h2 className={`font-['Space_Grotesk'] text-xl font-bold tracking-tight ${textPrimary}`}>Directory</h2>
          <div className={`${surfaceLow} rounded-2xl p-6 space-y-8`}>
            {/* Admin */}
            <div>
              <label className={`text-[10px] uppercase font-extrabold ${textMuted} mb-4 block`}>Admin</label>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full ${darkMode ? 'bg-white' : 'bg-[#0c1e26]'} flex items-center justify-center ${darkMode ? 'text-black' : 'text-white'} font-bold text-sm`}>
                  {team?.admin?.name?.[0] || 'A'}
                </div>
                <div className="flex-1">
                  <p className={`font-bold ${textPrimary}`}>{team?.admin?.name || 'Admin'}</p>
                  <p className={`text-xs ${textMuted}`}>Full System Authority</p>
                </div>
                <Icon name="verified" filled className="text-[#44e571] text-lg" />
              </div>
            </div>

            {/* Members */}
            <div>
              <label className={`text-[10px] uppercase font-extrabold ${textMuted} mb-4 block`}>Members ({(team?.members || []).length})</label>
              <div className="space-y-4">
                {(team?.members || []).map((m, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full ${['bg-stone-300', 'bg-blue-200', 'bg-amber-200', 'bg-pink-200'][i % 4]} flex items-center justify-center font-bold text-xs`}>
                      {m.name[0]}
                    </div>
                    <div className="flex-1">
                      <p className={`font-semibold ${textPrimary}`}>{m.name}</p>
                      <p className={`text-[10px] ${textMuted}`}>{m.role}</p>
                    </div>
                  </div>
                ))}
                {(team?.members || []).length === 0 && (
                  <p className={`text-sm ${textSecondary}`}>No team members yet. Invite someone!</p>
                )}
              </div>
            </div>

            {/* Invite Button */}
            <button
              onClick={() => setShowInvite(true)}
              className={`w-full py-4 rounded-xl border-2 border-dashed ${borderColor} hover:border-[#44e571]/50 hover:${cardBg} transition-all flex items-center justify-center gap-2 group`}
            >
              <Icon name="add" className={`${textMuted} group-hover:text-[#44e571] transition-colors`} />
              <span className={`text-sm font-bold ${textSecondary} group-hover:${textPrimary} transition-colors`}>Invite Member</span>
            </button>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className={`font-['Space_Grotesk'] text-xl font-bold tracking-tight ${textPrimary}`}>Team Activity</h2>
            <div className="flex gap-2 items-center">
              <span className="w-2 h-2 rounded-full bg-[#44e571] animate-pulse" />
              <span className={`text-[10px] font-bold uppercase tracking-wider ${textMuted}`}>Live Feed</span>
            </div>
          </div>
          <div className={`${surfaceLow} rounded-none border-l-4 border-[#44e571] p-6 min-h-[400px]`}>
            {activity.length === 0 ? (
              <div className={`text-center py-20 ${textSecondary}`}>
                <Icon name="group" className="text-4xl mb-2" />
                <p>No team activity yet. Invite members and start tracking!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activity.map((a, i) => (
                  <div key={i} className={`${cardBg} p-4 rounded-xl border ${borderColor}`}>
                    <div className="flex items-center gap-3 mb-1">
                      <div className={`w-6 h-6 rounded-full ${darkMode ? 'bg-white' : 'bg-[#0c1e26]'} flex items-center justify-center ${darkMode ? 'text-black' : 'text-white'} text-[8px] font-bold`}>
                        {a.userId?.[0] || '?'}
                      </div>
                      <span className={`text-xs font-bold ${textPrimary}`}>{a.userId}</span>
                      <span className={`text-[10px] ${textMuted}`}>{new Date(a.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className={`text-sm ${textSecondary} ml-9`}>{a.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`${darkMode ? 'bg-white text-[#0c1e26]' : 'bg-[#0c1e26] text-white'} p-6 rounded-2xl flex flex-col justify-between min-h-[200px]`}>
          <Icon name="security" className="text-[#44e571] text-4xl" />
          <div>
            <h3 className="font-['Space_Grotesk'] text-xl font-bold mb-2">Access Control</h3>
            <p className={`text-xs ${darkMode ? 'text-[#0c1e26]/60' : 'text-white/60'}`}>Role-based permissions enforced across all data.</p>
          </div>
        </div>
        <div className={`${surfaceLow} p-6 rounded-2xl flex flex-col justify-between min-h-[200px]`}>
          <Icon name="cloud_sync" className={`${textPrimary} text-4xl`} />
          <div>
            <h3 className={`font-['Space_Grotesk'] text-xl font-bold mb-2 ${textPrimary}`}>Real-time Sync</h3>
            <p className={`text-xs ${textSecondary}`}>Live ledger updates across all authenticated devices.</p>
          </div>
        </div>
        <div className="relative bg-[#44e571] p-6 rounded-2xl flex flex-col justify-between overflow-hidden min-h-[200px]">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <Icon name="hub" className="text-[#00531f] text-4xl" />
          <div>
            <h3 className="font-['Space_Grotesk'] text-xl font-bold text-[#00531f] mb-2">5-Year Vault</h3>
            <p className="text-xs text-[#00531f]/70">UAE-compliant data retention for audit readiness.</p>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-6" onClick={() => setShowInvite(false)}>
          <div className={`${cardBg} rounded-2xl p-8 w-full max-w-md shadow-2xl`} onClick={e => e.stopPropagation()}>
            <h3 className={`font-['Space_Grotesk'] text-2xl font-bold ${textPrimary} mb-6`}>Invite Team Member</h3>
            <div className="space-y-4">
              <div>
                <label className={`text-xs font-bold ${textMuted} uppercase tracking-wider block mb-2`}>Name</label>
                <input value={invName} onChange={e => setInvName(e.target.value)} placeholder="e.g. Virendra" className={`w-full ${surfaceLow} ${textPrimary} rounded-xl px-4 py-3 border ${borderColor} focus:border-[#44e571] focus:ring-1 focus:ring-[#44e571] outline-none`} />
              </div>
              <div>
                <label className={`text-xs font-bold ${textMuted} uppercase tracking-wider block mb-2`}>Email</label>
                <input value={invEmail} onChange={e => setInvEmail(e.target.value)} placeholder="virendra@company.ae" className={`w-full ${surfaceLow} ${textPrimary} rounded-xl px-4 py-3 border ${borderColor} focus:border-[#44e571] focus:ring-1 focus:ring-[#44e571] outline-none`} />
              </div>
              <div>
                <label className={`text-xs font-bold ${textMuted} uppercase tracking-wider block mb-2`}>Role</label>
                <select value={invRole} onChange={e => setInvRole(e.target.value)} className={`w-full ${surfaceLow} ${textPrimary} rounded-xl px-4 py-3 border ${borderColor} focus:border-[#44e571] outline-none`}>
                  <option value="member">Member</option>
                  <option value="salesman">Salesman</option>
                  <option value="accountant">Accountant</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
              <button
                onClick={() => { if (invName && invEmail) { onInvite(invName, invEmail, invRole); setInvName(''); setInvEmail(''); } }}
                className="w-full bg-[#44e571] text-[#00531f] font-bold rounded-full py-4 hover:opacity-90 transition active:scale-95"
              >
                Send Invite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ SETTINGS TAB ============
function SettingsTab({ profile, setProfile, textPrimary, textSecondary, textMuted, cardBg, surfaceLow, borderColor, darkMode }) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(profile?.name || '');
  const [editEmail, setEditEmail] = useState(profile?.email || '');
  const [editCompany, setEditCompany] = useState(profile?.company || '');

  useEffect(() => {
    if (profile) {
      setEditName(profile.name || '');
      setEditEmail(profile.email || '');
      setEditCompany(profile.company || '');
    }
  }, [profile]);

  const saveProfile = async () => {
    try {
      await fetch('/api/settings/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, email: editEmail, company: editCompany }),
      });
      setProfile({ ...profile, name: editName, email: editEmail, company: editCompany });
      setEditing(false);
    } catch (e) { console.error(e); }
  };

  return (
    <div className="px-6 max-w-2xl mx-auto">
      {/* Header */}
      <section className="mb-12 mt-4">
        <div className="flex justify-between items-end mb-8">
          <div>
            <span className={`text-[10px] uppercase tracking-widest ${textMuted} font-bold`}>Account Settings</span>
            <h2 className={`font-['Space_Grotesk'] text-4xl font-bold tracking-tight mt-1 ${textPrimary}`}>Profile Info</h2>
          </div>
          <Icon name="verified" filled className="text-[#44e571]" />
        </div>

        {/* Profile Card */}
        <div className={`${cardBg} p-8 rounded-2xl shadow-[0_40px_40px_rgba(12,30,38,0.06)] relative overflow-hidden`}>
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Icon name="person" className="text-6xl" />
          </div>
          <div className="space-y-6 relative z-10">
            {editing ? (
              <>
                <div className="flex flex-col">
                  <span className={`text-xs font-bold ${textMuted} uppercase tracking-tighter mb-2`}>Full Name</span>
                  <input value={editName} onChange={e => setEditName(e.target.value)} className={`${surfaceLow} ${textPrimary} rounded-xl px-4 py-3 border ${borderColor} focus:border-[#44e571] outline-none`} />
                </div>
                <div className="flex flex-col">
                  <span className={`text-xs font-bold ${textMuted} uppercase tracking-tighter mb-2`}>Email Address</span>
                  <input value={editEmail} onChange={e => setEditEmail(e.target.value)} className={`${surfaceLow} ${textPrimary} rounded-xl px-4 py-3 border ${borderColor} focus:border-[#44e571] outline-none`} />
                </div>
                <div className="flex gap-3">
                  <button onClick={saveProfile} className="flex-1 bg-[#44e571] text-[#00531f] font-bold rounded-full py-3">Save</button>
                  <button onClick={() => setEditing(false)} className={`flex-1 border ${borderColor} ${textPrimary} font-bold rounded-full py-3`}>Cancel</button>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col">
                  <span className={`text-xs font-bold ${textMuted} uppercase tracking-tighter mb-1`}>Full Name</span>
                  <p className={`text-xl font-medium ${textPrimary}`}>{profile?.name || 'Set your name'}</p>
                  <div className={`w-full h-[0.5px] ${borderColor} mt-4`} />
                </div>
                <div className="flex flex-col">
                  <span className={`text-xs font-bold ${textMuted} uppercase tracking-tighter mb-1`}>Email Address</span>
                  <p className={`text-xl font-medium ${textPrimary}`}>{profile?.email || 'Set your email'}</p>
                  <div className={`w-full h-[0.5px] ${borderColor} mt-4`} />
                </div>
                <button onClick={() => setEditing(true)} className="text-[#006e2c] text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all">
                  Edit profile <Icon name="arrow_forward" className="text-sm" />
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Decorative Line */}
      <div className="relative h-16 w-full overflow-hidden">
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          <path d="M-10,30 Q150,10 350,30 T750,10" fill="none" stroke={darkMode ? '#fff' : '#0c1e26'} strokeWidth="0.5" strokeDasharray="4 4" className="opacity-20" />
        </svg>
      </div>

      {/* Company & Plan */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <div className={`${surfaceLow} p-6 rounded-xl space-y-4`}>
          <div className="flex items-center gap-2">
            <Icon name="business" className={textPrimary} />
            <h3 className={`font-bold text-sm uppercase tracking-tighter ${textPrimary}`}>Company Details</h3>
          </div>
          <p className={`text-lg font-bold ${textPrimary}`}>{profile?.company || 'Set company name'}</p>
          <button onClick={() => setEditing(true)} className="text-[#006e2c] text-sm font-bold flex items-center gap-1 group">
            Edit details <Icon name="arrow_forward" className="text-sm group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
        <div className={`${surfaceLow} p-6 rounded-xl space-y-4`}>
          <div className="flex items-center gap-2">
            <Icon name="diamond" className={textPrimary} />
            <h3 className={`font-bold text-sm uppercase tracking-tighter ${textPrimary}`}>Current Plan</h3>
          </div>
          <p className={`text-lg font-bold ${textPrimary}`}>Basic (6.99 AED/mo)</p>
          <p className={`text-xs ${textMuted}`}>10 AI Scans per month</p>
        </div>
      </section>

      {/* Subscription Card */}
      <section className="mb-12">
        <h3 className={`text-xs font-bold ${textMuted} uppercase tracking-widest mb-4`}>Upgrade Plan</h3>
        <div className={`${cardBg} border ${borderColor} p-8 rounded-2xl relative overflow-hidden`}>
          <div className="flex justify-between items-start mb-8">
            <div>
              <h4 className={`font-['Space_Grotesk'] text-3xl font-bold tracking-tighter ${textPrimary}`}>Elite Plan</h4>
              <p className={`${textSecondary} text-sm mt-1`}>9.99 AED/month</p>
            </div>
            <div className="bg-[#44e571]/20 text-[#006e2c] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">Recommended</div>
          </div>
          <ul className="space-y-4 mb-8">
            <li className="flex items-center gap-3">
              <Icon name="check_circle" className="text-[#006e2c] text-lg" />
              <span className={`text-sm font-medium ${textPrimary}`}>30 AI Scans per month</span>
            </li>
            <li className="flex items-center gap-3">
              <Icon name="check_circle" className="text-[#006e2c] text-lg" />
              <span className={`text-sm font-medium ${textPrimary}`}>Team Access + Invites</span>
            </li>
            <li className="flex items-center gap-3">
              <Icon name="check_circle" className="text-[#006e2c] text-lg" />
              <span className={`text-sm font-medium ${textPrimary}`}>Audit-Ready Export (5-year vault)</span>
            </li>
            <li className="flex items-center gap-3">
              <Icon name="check_circle" className="text-[#006e2c] text-lg" />
              <span className={`text-sm font-medium ${textPrimary}`}>Advanced AI (Complex VAT Reasoning)</span>
            </li>
          </ul>
          <button className="w-full py-4 bg-[#44e571] text-[#00531f] font-bold rounded-full hover:shadow-lg transition-all active:scale-95 duration-200">
            Upgrade to Elite
          </button>
        </div>
      </section>

      {/* Settings List */}
      <section className="space-y-1 mb-8">
        {[
          { icon: 'notifications', label: 'Notification Preferences' },
          { icon: 'security', label: 'Security & Data' },
          { icon: 'translate', label: 'Language & Region' },
          { icon: 'help', label: 'Help & Support' },
        ].map((item, i) => (
          <div key={i}>
            <div className={`flex items-center justify-between py-4 group cursor-pointer hover:${surfaceLow} px-2 rounded-xl transition-colors`}>
              <div className="flex items-center gap-4">
                <Icon name={item.icon} className={textSecondary} />
                <span className={`font-medium ${textPrimary}`}>{item.label}</span>
              </div>
              <Icon name="chevron_right" className={`${textMuted} text-sm`} />
            </div>
            <div className={`w-full h-[0.5px] ${borderColor}`} />
          </div>
        ))}
      </section>
    </div>
  );
}
