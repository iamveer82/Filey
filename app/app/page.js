'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
  AreaChart, Area, PieChart as RechartsPie, Pie, Cell,
} from 'recharts';
import {
  Home, BarChart3, Bot, Users, Zap, Settings,
  Wallet, ArrowDownLeft, ArrowUpRight, Send, Camera,
  Plus, ChevronRight, ChevronDown, Search, Filter, Download,
  Shield, Bell, LogOut, Edit3, Check, X,
  Receipt, Sparkles, TrendingUp, TrendingDown,
  CreditCard, Building2, QrCode, Eye, EyeOff,
  FileText, Clock, Lock, Globe, HelpCircle,
  PieChart, Image as ImageIcon,
  FolderOpen, Calculator, FileCheck,
  ArrowRightLeft, Activity,
  MessageCircle, UserPlus, Crown, Hash, ScanLine,
  RefreshCw, ChevronLeft, Mic, Paperclip,
  MoreHorizontal, Copy, Share2, Repeat,
  AlertCircle, CheckCircle2, Loader2,
  Smartphone, Mail, KeyRound, User,
  ArrowRight, Star, Banknote, CircleDollarSign, Wifi,
} from 'lucide-react';
import { ocrService } from '@/lib/ocrService';
import { pdfTools } from '@/lib/pdfTools';
import { DocumentScanner, captureFromWebcam } from '@/lib/documentScanner';
import { aiChatService } from '@/lib/aiChatService';
import { supabaseClient, auth, db } from '@/lib/supabase';

// ─── Spring Animations (iOS-native feel) ──────────────────────────
const spring = { type: 'spring', stiffness: 300, damping: 28 };
const springBouncy = { type: 'spring', stiffness: 400, damping: 25 };
const springGentle = { type: 'spring', stiffness: 200, damping: 25 };

const pageV = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0, transition: { ...springGentle, staggerChildren: 0.04 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2, ease: 'easeIn' } },
};
const stagger = { animate: { transition: { staggerChildren: 0.05, delayChildren: 0.06 } } };
const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0, transition: spring },
};
const scaleIn = {
  initial: { opacity: 0, scale: 0.92 },
  animate: { opacity: 1, scale: 1, transition: springBouncy },
};
const slideUp = {
  initial: { y: '100%' },
  animate: { y: 0, transition: spring },
  exit: { y: '100%', transition: { duration: 0.28, ease: [0.4, 0, 1, 1] } },
};

// ─── Skeleton ─────────────────────────────────────────────────────
function Skeleton({ className }) {
  return <div className={`skeleton ${className}`} />;
}
function HomeSkeleton() {
  return (
    <div className="px-5 max-w-2xl mx-auto pt-4 space-y-4">
      <div className="flex gap-2">{[1,2,3,4].map(i=><Skeleton key={i} className="w-24 h-10 rounded-full" />)}</div>
      <div className="text-center py-6"><Skeleton className="w-20 h-4 mx-auto mb-3 rounded" /><Skeleton className="w-48 h-12 mx-auto rounded-lg" /></div>
      <Skeleton className="h-12 rounded-2xl" />
      <div className="grid grid-cols-4 gap-2">{[1,2,3,4].map(i=><Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      <Skeleton className="h-5 w-32 rounded" />
      {[1,2,3].map(i=><Skeleton key={i} className="h-20 rounded-2xl" />)}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ONBOARDING — Dark navy with credit card stack (matches reference)
// ═══════════════════════════════════════════════════════════════════
function OnboardingScreen({ onContinue }) {
  return (
    <div className="min-h-[100dvh] bg-[#0F172A] flex flex-col font-['Plus_Jakarta_Sans'] relative overflow-hidden">
      {/* Status bar area */}
      <div className="pt-[env(safe-area-inset-top,44px)] px-6 py-3 flex justify-between items-center text-white/60 text-xs">
        <span>9:41</span>
        <div className="flex items-center gap-1">
          <Wifi className="w-3.5 h-3.5" />
          <div className="w-6 h-3 border border-white/60 rounded-sm relative">
            <div className="absolute inset-[1px] right-[3px] bg-white/60 rounded-[1px]" />
          </div>
        </div>
      </div>

      <motion.p initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="text-center text-white/80 text-sm font-medium mt-4">
        Welcome to Filey
      </motion.p>

      {/* Credit Cards Stack */}
      <div className="flex-1 flex items-center justify-center relative px-8 py-6">
        <div className="relative w-full max-w-[320px] h-[420px]">
          {/* Back Card — Diamond */}
          <motion.div
            initial={{ rotate: -15, x: -40, y: 30, opacity: 0, scale: 0.85 }}
            animate={{ rotate: -12, x: -30, y: 20, opacity: 0.7, scale: 0.92 }}
            transition={{ delay: 0.4, ...springGentle }}
            className="absolute inset-0 w-[280px]"
          >
            <div className="bg-gradient-to-br from-[#1E3A8A] to-[#1E40AF] rounded-2xl p-5 h-[180px] shadow-2xl shadow-blue-900/50">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center">
                    <Wifi className="w-3.5 h-3.5 text-white/80 rotate-45" />
                  </div>
                  <span className="text-[10px] text-white/60 font-medium uppercase tracking-wider">Diamond</span>
                </div>
                <span className="text-[10px] text-white/50 font-bold tracking-wider">VISA</span>
              </div>
              <div className="mt-8">
                <p className="text-white/50 font-mono text-xs tracking-[3px]">288 7068 2260 2640</p>
              </div>
              <div className="mt-4 flex justify-between text-[9px] text-white/40">
                <div><p>Card Holder</p><p className="text-white/60 font-medium">User</p></div>
                <div><p>Expires</p><p className="text-white/60 font-medium">05/28</p></div>
              </div>
            </div>
          </motion.div>

          {/* Front Card — Platinum */}
          <motion.div
            initial={{ rotate: 8, x: 20, y: -20, opacity: 0, scale: 0.85 }}
            animate={{ rotate: 4, x: 20, y: 40, opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, ...springBouncy }}
            className="absolute inset-0 w-[300px] z-10"
          >
            <div className="bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#334155] rounded-2xl p-6 h-[190px] shadow-2xl shadow-black/60 border border-white/10">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-white/15 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <Wifi className="w-4 h-4 text-white/90 rotate-45" />
                  </div>
                  <span className="text-[11px] text-white/70 font-semibold uppercase tracking-wider">Platinum</span>
                </div>
                <span className="text-[11px] text-white/50 font-bold tracking-wider">VISA</span>
              </div>
              {/* Chip */}
              <div className="mt-3 flex items-center gap-3">
                <div className="w-10 h-7 rounded-md bg-gradient-to-br from-yellow-400/80 to-yellow-600/60 border border-yellow-500/30" />
                <Wifi className="w-5 h-5 text-white/40 rotate-90" />
              </div>
              <div className="mt-3">
                <p className="text-white font-mono text-sm tracking-[4px] font-medium">1288 7068 2260 2640</p>
              </div>
              <div className="mt-3 flex justify-between text-[9px] text-white/40">
                <div><p>Card Holder</p><p className="text-white/80 font-medium text-[11px]">Your Name</p></div>
                <div><p>Expires</p><p className="text-white/80 font-medium text-[11px]">05/28</p></div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom text + CTA */}
      <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8, ...spring }}
        className="px-8 pb-10" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 40px)' }}>
        <h1 className="text-[32px] font-extrabold text-white leading-[1.15] tracking-tight mb-8">
          Better Tracking,{'\n'}Smarter, For{'\n'}Your Finance.
        </h1>
        <motion.button whileTap={{ scale: 0.96 }} onClick={onContinue}
          className="w-full bg-white text-[#0F172A] font-bold py-4 rounded-2xl text-base shadow-xl shadow-white/10 cursor-pointer flex items-center justify-center gap-2 active:bg-gray-100 transition">
          Let's Go! <ArrowRight className="w-5 h-5" />
        </motion.button>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// AUTH SCREEN
// ═══════════════════════════════════════════════════════════════════
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [company, setCompany] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) { setError('Please fill in all fields'); return; }
    if (mode === 'signup' && !name.trim()) { setError('Name is required'); return; }
    setLoading(true); setError('');
    try {
      const payload = mode === 'signup' ? { action: 'signup', name, email, password, company } : { action: 'login', email, password };
      const r = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const d = await r.json();
      if (d.error) { setError(d.error); setLoading(false); return; }
      localStorage.setItem('filey_user', JSON.stringify(d.user || { name: name || email.split('@')[0], email, company }));
      localStorage.setItem('filey_token', d.token || 'local');
      onAuth(d.user || { name: name || email.split('@')[0], email, company });
    } catch {
      const localUser = { name: name || email.split('@')[0], email, company: company || '' };
      localStorage.setItem('filey_user', JSON.stringify(localUser));
      localStorage.setItem('filey_token', 'offline');
      onAuth(localUser);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[100dvh] bg-[#F7F8FA] flex flex-col font-['Plus_Jakarta_Sans']">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col justify-center items-center px-8 pt-20 pb-8">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ ...springBouncy, delay: 0.1 }}
          className="w-20 h-20 bg-[#0F172A] rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-slate-900/30">
          <span className="text-3xl font-black text-white tracking-tighter">F</span>
        </motion.div>
        <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
          className="text-3xl font-extrabold text-[#0F172A] mb-2">Filey</motion.h1>
        <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
          className="text-sm text-gray-400 text-center max-w-[240px]">AI-powered finance tracker with UAE VAT compliance</motion.p>
      </motion.div>
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4, ...spring }}
        className="bg-white rounded-t-[32px] px-6 pt-8 pb-10 shadow-2xl shadow-black/5 border-t border-gray-100">
        <div className="flex bg-gray-100 rounded-2xl p-1 mb-6">
          {['login', 'signup'].map(m => (
            <button key={m} onClick={() => { setMode(m); setError(''); }}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${mode === m ? 'bg-[#0F172A] text-white shadow-lg' : 'text-gray-400'}`}>
              {m === 'login' ? 'Log In' : 'Sign Up'}
            </button>
          ))}
        </div>
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" /><p className="text-xs text-red-600 font-medium">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="space-y-3">
          <AnimatePresence>
            {mode === 'signup' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="relative mb-3"><User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Full Name" className="w-full bg-gray-50 rounded-xl pl-11 pr-4 py-4 border border-gray-200 focus:border-blue-500 outline-none text-sm text-[#0F172A] font-medium placeholder:text-gray-400" /></div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="relative"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email Address" className="w-full bg-gray-50 rounded-xl pl-11 pr-4 py-4 border border-gray-200 focus:border-blue-500 outline-none text-sm text-[#0F172A] font-medium placeholder:text-gray-400" /></div>
          <div className="relative"><KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="w-full bg-gray-50 rounded-xl pl-11 pr-4 py-4 border border-gray-200 focus:border-blue-500 outline-none text-sm text-[#0F172A] font-medium placeholder:text-gray-400" onKeyDown={e => e.key === 'Enter' && handleSubmit()} /></div>
          <AnimatePresence>
            {mode === 'signup' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="relative"><Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Company Name (optional)" className="w-full bg-gray-50 rounded-xl pl-11 pr-4 py-4 border border-gray-200 focus:border-blue-500 outline-none text-sm text-[#0F172A] font-medium placeholder:text-gray-400" /></div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <motion.button whileTap={{ scale: 0.97 }} onClick={handleSubmit} disabled={loading}
          className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl text-sm mt-6 shadow-lg shadow-blue-600/25 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 active:bg-blue-700 transition">
          {loading ? <Loader2 className="w-4 h-4 spinner" /> : null}{mode === 'login' ? 'Log In' : 'Create Account'}{!loading && <ArrowRight className="w-4 h-4" />}
        </motion.button>
        {mode === 'login' && <p className="text-center text-xs text-gray-400 mt-4 cursor-pointer">Forgot password?</p>}
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════
export default function App() {
  const [screen, setScreen] = useState('loading');
  const [activeTab, setActiveTab] = useState('home');
  const [showSettings, setShowSettings] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [sessionId, setSessionId] = useState(() => uuidv4());
  const [sessions, setSessions] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [dashLoading, setDashLoading] = useState(false);
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
  const [showNotif, setShowNotif] = useState(false);
  const [notifications, setNotifications] = useState([]);
  // AI settings
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('filey_api_key') || '');
  const [apiProvider, setApiProvider] = useState(() => localStorage.getItem('filey_api_provider') || 'openai');
  const [showScanner, setShowScanner] = useState(false);
  const scannerRef = useRef(null);
  const chatEndRef = useRef(null);
  const teamChatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const { data: { session } } = await supabaseClient?.auth.getSession() || { data: { session: null } };
      if (session) {
        const user = session.user;
        const profileData = await db.getProfile(user.id);
        setProfile({
          id: user.id,
          name: user.user_metadata?.name || user.email,
          email: user.email,
          company: user.user_metadata?.company || '',
          avatar: user.user_metadata?.avatar,
        });
        setScreen('app');
      } else {
        const onboarded = localStorage.getItem('filey_onboarded');
        if (onboarded) { setScreen('auth'); }
        else { setTimeout(() => setScreen('onboarding'), 800); }
      }
    } catch {
      const token = localStorage.getItem('filey_token');
      const user = localStorage.getItem('filey_user');
      if (token && user) { setProfile(JSON.parse(user)); setScreen('app'); }
      else if (localStorage.getItem('filey_onboarded')) { setScreen('auth'); }
      else { setTimeout(() => setScreen('onboarding'), 800); }
    }
  }

  const handleOnboarded = () => { localStorage.setItem('filey_onboarded', '1'); setScreen('auth'); };

  const handleAuth = async (authData) => {
    try {
      const { data, error } = await auth.signIn(authData.email, authData.password);
      if (error) throw error;
      const user = data.user;
      setProfile({
        id: user.id,
        name: user.user_metadata?.name || user.email,
        email: user.email,
        company: user.user_metadata?.company || '',
      });
      setScreen('app');
    } catch {
      // Fallback to local auth
      const localUser = { id: 'local', name: authData.name || authData.email.split('@')[0], email: authData.email };
      localStorage.setItem('filey_user', JSON.stringify(localUser));
      localStorage.setItem('filey_token', 'local');
      setProfile(localUser);
      setScreen('app');
    }
  };

  const handleLogout = async () => {
    try { await auth.signOut(); } catch {}
    localStorage.removeItem('filey_token');
    localStorage.removeItem('filey_user');
    setScreen('auth');
    setProfile(null);
    setShowSettings(false);
  };

  const saveApiKey = (key) => {
    setApiKey(key);
    localStorage.setItem('filey_api_key', key);
  };

  const saveApiProvider = (provider) => {
    setApiProvider(provider);
    localStorage.setItem('filey_api_provider', provider);
  };

  useEffect(() => {
    if (screen !== 'app') return;
    if (activeTab === 'home') fetchDashboard();
    if (activeTab === 'cowork') { fetchTeam(); fetchTeamActivity(); fetchTeamChat(); }
    if (activeTab === 'chat') fetchSessions();
    if (activeTab === 'services') fetchFiles();
  }, [activeTab, screen]);
  useEffect(() => { if (showSettings && screen === 'app') fetchProfile(); }, [showSettings]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);
  useEffect(() => { teamChatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [teamChatMessages]);

  // ─── API ─────────────────────────────────────────────────────────
  const fetchDashboard = async () => { setDashLoading(true); try { const r = await fetch('/api/dashboard'); setDashboard(await r.json()); } catch {} setDashLoading(false); };
  const fetchTeam = async () => { try { const r = await fetch('/api/team'); const d = await r.json(); setTeam(d.team); } catch {} };
  const fetchTeamActivity = async () => { try { const r = await fetch('/api/team/activity'); const d = await r.json(); setTeamActivity(d.activity || []); } catch {} };
  const fetchProfile = async () => { try { const r = await fetch('/api/settings/profile'); const d = await r.json(); if (d.profile) setProfile(p => ({ ...p, ...d.profile })); } catch {} };
  const fetchSessions = async () => { try { const r = await fetch('/api/chat/sessions'); const d = await r.json(); setSessions(d.sessions || []); } catch {} };
  const fetchFiles = async () => { try { const r = await fetch('/api/files'); const d = await r.json(); setFiles(d.files || []); } catch {} };
  const fetchTeamChat = async () => { try { const r = await fetch('/api/team/chat'); const d = await r.json(); setTeamChatMessages(d.messages || []); } catch {} };
  const loadSession = async (sid) => { setSessionId(sid); try { const r = await fetch(`/api/chat/messages?sessionId=${sid}`); const d = await r.json(); setChatMessages((d.messages||[]).map(m=>({id:m.id,role:m.role,content:m.content,extractedTransaction:m.extractedTransaction,hasImage:m.hasImage,timestamp:m.timestamp}))); } catch {} };
  const startNewChat = () => { setSessionId(uuidv4()); setChatMessages([]); };
  const sendMessage = async () => {
    if (!chatInput.trim()||chatLoading) return; const msg=chatInput.trim(); setChatInput(''); setChatLoading(true);
    setChatMessages(p=>[...p,{id:uuidv4(),role:'user',content:msg,timestamp:new Date().toISOString()}]);
    try {
      const history = chatMessages.map(m => ({ role: m.role, content: m.content }));
      const result = await aiChatService.sendMessage(msg, history, { apiKey, provider: apiProvider });
      setChatMessages(p=>[...p,{id:uuidv4(),role:'assistant',content:result.content,extractedTransaction:result.extractedTransaction,timestamp:new Date().toISOString()}]);
      if(result.extractedTransaction) setPendingTransaction(result.extractedTransaction);
    } catch (err) { setChatMessages(p=>[...p,{id:uuidv4(),role:'assistant',content:`Error: ${err.message||'AI request failed'}`,timestamp:new Date().toISOString()}]); }
    setChatLoading(false);
  };
  const handleReceiptUpload = async (e) => {
    const file=e.target.files?.[0]; if(!file) return; setChatLoading(true);
    setChatMessages(p=>[...p,{id:uuidv4(),role:'user',content:`Uploading: ${file.name}`,hasImage:true,timestamp:new Date().toISOString()}]);
    try { const reader=new FileReader(); reader.onload=async()=>{const base64=reader.result.split(',')[1];
      const r=await fetch('/api/scan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:base64,mimeType:file.type||'image/jpeg',sessionId})}); const d=await r.json();
      if(d.error) setChatMessages(p=>[...p,{id:uuidv4(),role:'assistant',content:`Scan error: ${d.error}`,timestamp:new Date().toISOString()}]);
      else { setChatMessages(p=>[...p,{id:uuidv4(),role:'assistant',content:d.message,extractedTransaction:d.extractedTransaction,timestamp:d.timestamp}]); if(d.extractedTransaction) setPendingTransaction(d.extractedTransaction); }
      setChatLoading(false);}; reader.readAsDataURL(file);} catch { setChatLoading(false); }
    if(fileInputRef.current) fileInputRef.current.value='';
  };
  const verifyTransaction = async (txn) => { try { await fetch('/api/transactions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(txn)}); setPendingTransaction(null); setChatMessages(p=>[...p,{id:uuidv4(),role:'assistant',content:`Transaction saved! ${txn.merchant} - ${txn.amount} ${txn.currency}`,timestamp:new Date().toISOString()}]); addNotification('Transaction Saved', `${txn.merchant} — ${txn.amount} AED`); } catch {} };
  const inviteMember = async (name,email,role) => { try { await fetch('/api/team/invite',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,email,role})}); setShowInviteModal(false); fetchTeam(); fetchTeamActivity(); addNotification('Member Invited', `${name} added as ${role}`); } catch {} };
  const sendTeamChatMsg = async () => { if(!teamChatInput.trim()) return; try { await fetch('/api/team/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:teamChatInput,userName:profile?.name||'Admin'})}); setTeamChatInput(''); fetchTeamChat(); } catch {} };
  const editFile = async (id,data) => { try { await fetch('/api/files/edit',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,...data})}); fetchFiles(); fetchDashboard(); } catch {} };
  const fetchExport = async (filters={}) => { try { const params=new URLSearchParams(); if(filters.dateFrom) params.set('dateFrom',filters.dateFrom); if(filters.dateTo) params.set('dateTo',filters.dateTo); if(filters.category&&filters.category!=='all') params.set('category',filters.category); const r=await fetch(`/api/files/export?${params.toString()}`); const d=await r.json(); setExportData(d); setShowExport(true); } catch {} };
  const addNotification = (title, body) => { setNotifications(p => [{ id: uuidv4(), title, body, time: new Date(), read: false }, ...p.slice(0, 19)]); };

  const tabs = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'statistics', icon: BarChart3, label: 'Statistics' },
    { id: 'chat', icon: Bot, label: 'AI Chat' },
    { id: 'cowork', icon: Users, label: 'Co-work' },
    { id: 'services', icon: Zap, label: 'Services' },
  ];

  if (screen === 'loading') return <SplashScreen />;
  if (screen === 'onboarding') return <OnboardingScreen onContinue={handleOnboarded} />;
  if (screen === 'auth') return <AuthScreen onAuth={handleAuth} />;

  return (
    <div className="min-h-[100dvh] bg-[#F7F8FA] font-['Plus_Jakarta_Sans'] relative overflow-x-hidden no-bounce">
      {/* ── Header ─────────────────────────────────── */}
      <header className="fixed top-0 w-full z-50 glass border-b border-gray-100/80" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="flex justify-between items-center px-5 py-3 max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowSettings(true)} className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-blue-500/20 cursor-pointer active:scale-95 transition-transform">
              {profile?.avatar ? <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" draggable={false} /> : (
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center"><span className="text-sm font-bold text-white">{profile?.name?.[0]||'U'}</span></div>
              )}
            </button>
            <div>
              <p className="text-[11px] text-gray-400 font-medium leading-none">Good {new Date().getHours()<12?'Morning':new Date().getHours()<17?'Afternoon':'Evening'},</p>
              <h1 className="text-[15px] font-bold text-[#0F172A] leading-tight">{profile?.name||'Filey'}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowNotif(true)} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center cursor-pointer relative" aria-label="Notifications">
              <Bell className="w-4 h-4 text-gray-500" />
              {notifications.filter(n=>!n.read).length > 0 && <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center"><span className="text-[8px] text-white font-bold">{notifications.filter(n=>!n.read).length}</span></div>}
            </motion.button>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowSettings(true)} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center cursor-pointer" aria-label="Settings"><Settings className="w-4 h-4 text-gray-500" /></motion.button>
          </div>
        </div>
      </header>

      {/* ── Content ─────────────────────────────────── */}
      <main className="pt-[calc(env(safe-area-inset-top,0px)+64px)] pb-[calc(env(safe-area-inset-bottom,0px)+100px)] min-h-[100dvh]">
        <AnimatePresence mode="wait">
          {activeTab==='home' && <HomeTab key="home" d={dashboard} loading={dashLoading} onRefresh={fetchDashboard} />}
          {activeTab==='statistics' && <StatisticsTab key="stats" d={dashboard} onExport={fetchExport} />}
          {activeTab==='chat' && <AIChatTab key="chat" messages={chatMessages} input={chatInput} setInput={setChatInput} onSend={sendMessage} loading={chatLoading} sessions={sessions} onLoadSession={loadSession} onNewChat={startNewChat} onUpload={handleReceiptUpload} fileInputRef={fileInputRef} chatEndRef={chatEndRef} pendingTransaction={pendingTransaction} onVerify={verifyTransaction} onDismiss={()=>setPendingTransaction(null)} />}
          {activeTab==='cowork' && <CoworkTab key="cowork" team={team} activity={teamActivity} showInvite={showInviteModal} setShowInvite={setShowInviteModal} onInvite={inviteMember} teamChat={teamChatMessages} teamChatInput={teamChatInput} setTeamChatInput={setTeamChatInput} onSendTeamChat={sendTeamChatMsg} teamChatEndRef={teamChatEndRef} profile={profile} />}
          {activeTab==='services' && <ServicesTab key="services" files={files} onEdit={editFile} onExport={fetchExport} />}
        </AnimatePresence>
      </main>

      {/* ── Modals ───────────────────────────────────── */}
      <AnimatePresence>{showExport && exportData && <ExportModal data={exportData} onClose={()=>setShowExport(false)} />}</AnimatePresence>
      <AnimatePresence>{showSettings && <SettingsPanel profile={profile} setProfile={setProfile} onClose={()=>setShowSettings(false)} onLogout={handleLogout} apiKey={apiKey} apiProvider={apiProvider} saveApiKey={saveApiKey} saveApiProvider={saveApiProvider} />}</AnimatePresence>
      <AnimatePresence>{showNotif && <NotificationsPanel notifications={notifications} setNotifications={setNotifications} onClose={()=>setShowNotif(false)} />}</AnimatePresence>

      {/* ── Bottom Nav ───────────────────────────────── */}
      <nav className="fixed z-50 w-[92%] max-w-md left-1/2 -translate-x-1/2" style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}>
        <div className="bg-[#0F172A] rounded-2xl px-1 py-1.5 flex justify-around items-center shadow-2xl shadow-black/25">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id; const Icon = tab.icon;
            return (
              <motion.button key={tab.id} onClick={() => setActiveTab(tab.id)} whileTap={{ scale: 0.85 }}
                className="relative flex flex-col items-center justify-center px-2 py-1.5 rounded-xl cursor-pointer min-w-[52px] no-select" aria-label={tab.label}>
                {isActive && <motion.div layoutId="activeTab" className="absolute inset-0 bg-blue-600 rounded-xl" transition={springBouncy} />}
                <Icon className={`w-[18px] h-[18px] relative z-10 transition-colors ${isActive?'text-white':'text-gray-500'}`} />
                <span className={`text-[9px] font-semibold mt-0.5 relative z-10 ${isActive?'text-white':'text-gray-500'}`}>{tab.label}</span>
              </motion.button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

// ─── Splash ────────────────────────────────────────────────────────
function SplashScreen() {
  return (
    <div className="min-h-[100dvh] bg-[#0F172A] flex flex-col items-center justify-center font-['Plus_Jakarta_Sans']">
      <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={springBouncy}
        className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-blue-600/40">
        <span className="text-3xl font-black text-white tracking-tighter">F</span>
      </motion.div>
      <motion.h1 initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
        className="text-2xl font-extrabold text-white mb-1">Filey</motion.h1>
      <motion.p initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
        className="text-sm text-gray-400">UAE Finance Tracker</motion.p>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        className="mt-8"><Loader2 className="w-5 h-5 text-blue-400 spinner" /></motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// HOME TAB — Matches Montek: Balance, savings banner, Recent Send, Activity
// ═══════════════════════════════════════════════════════════════════
function HomeTab({ d, loading, onRefresh }) {
  const data = d || {};
  const [section, setSection] = useState('dashboard');
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const sections = ['Dashboard', 'Cards', 'Analytics', 'Recurring'];

  const filteredTxns = useMemo(() => {
    const txns = data.recentTransactions || [];
    if (!searchQuery.trim()) return txns;
    const q = searchQuery.toLowerCase();
    return txns.filter(t => (t.merchant||'').toLowerCase().includes(q) || (t.category||'').toLowerCase().includes(q) || (t.customName||'').toLowerCase().includes(q));
  }, [data.recentTransactions, searchQuery]);

  if (loading && !data.balance && data.balance !== 0) return <HomeSkeleton />;

  return (
    <motion.div variants={pageV} initial="initial" animate="animate" exit="exit" className="px-5 max-w-2xl mx-auto">
      {/* Section Pills — Matches reference: "Dashboard" filled, others outline */}
      <motion.div variants={fadeUp} className="flex gap-2 mt-4 mb-5 overflow-x-auto scrollbar-hide pb-1">
        {sections.map(s => (
          <motion.button key={s} whileTap={{ scale: 0.95 }} onClick={() => setSection(s.toLowerCase())}
            className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
              section===s.toLowerCase() ? 'bg-[#0F172A] text-white shadow-lg' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200'}`}>
            {s}
          </motion.button>
        ))}
      </motion.div>

      <AnimatePresence mode="wait">
        {section==='dashboard' && <DashboardSection key="dash" data={data} balanceVisible={balanceVisible} setBalanceVisible={setBalanceVisible} filteredTxns={filteredTxns} searchOpen={searchOpen} setSearchOpen={setSearchOpen} searchQuery={searchQuery} setSearchQuery={setSearchQuery} onRefresh={onRefresh} />}
        {section==='cards' && <CardsSection key="cards" data={data} />}
        {section==='analytics' && <AnalyticsSection key="analytics" data={data} />}
        {section==='recurring' && <RecurringSection key="recurring" data={data} />}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Dashboard Section (Montek center screen) ──────────────────────
function DashboardSection({ data, balanceVisible, setBalanceVisible, filteredTxns, searchOpen, setSearchOpen, searchQuery, setSearchQuery, onRefresh }) {
  // Recent Send contacts (demo)
  const recentSend = [
    { name: 'Agnes', color: 'bg-pink-100 text-pink-600' },
    { name: 'Ahmed', color: 'bg-blue-100 text-blue-600' },
    { name: 'Sara', color: 'bg-purple-100 text-purple-600' },
    { name: 'Omar', color: 'bg-teal-100 text-teal-600' },
    { name: 'Fatima', color: 'bg-amber-100 text-amber-600' },
  ];

  return (
    <motion.div variants={pageV} initial="initial" animate="animate" exit="exit">
      {/* Balance — large center like reference */}
      <motion.div variants={fadeUp} className="text-center mb-4">
        <p className="text-gray-400 text-sm font-medium mb-1">Balance</p>
        <div className="flex items-center justify-center gap-2">
          <motion.h2 key={`${data.balance}-${balanceVisible}`} initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={springBouncy}
            className="text-[44px] font-extrabold text-[#0F172A] tracking-tight leading-none">
            {balanceVisible ? `${(data.balance||0).toLocaleString()}` : '••••••'}
          </motion.h2>
          <span className="text-lg font-medium text-gray-400 mt-1">AED</span>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setBalanceVisible(!balanceVisible)} className="mt-1 cursor-pointer" aria-label="Toggle balance visibility">
            {balanceVisible ? <Eye className="w-4 h-4 text-gray-400" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
          </motion.button>
        </div>
      </motion.div>

      {/* Savings Banner — blue pill, matches reference */}
      <motion.div variants={fadeUp}
        className="bg-blue-600 rounded-2xl px-5 py-3 mb-5 flex items-center justify-between cursor-pointer active:bg-blue-700 transition">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-200" />
          <p className="text-sm text-white font-medium">You saved <span className="font-bold">{((data.totalIncome||0)-(data.totalSpend||0)).toLocaleString()} AED</span> this month</p>
        </div>
        <ChevronRight className="w-4 h-4 text-blue-200" />
      </motion.div>

      {/* Recent Send — horizontal avatars like reference */}
      <motion.div variants={fadeUp} className="mb-6">
        <h3 className="text-lg font-bold text-[#0F172A] mb-3">Recent Send</h3>
        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-1">
          {recentSend.map((c, i) => (
            <motion.button key={i} whileTap={{ scale: 0.9 }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, ...spring }}
              className="flex flex-col items-center gap-1.5 cursor-pointer flex-shrink-0">
              <div className={`w-14 h-14 rounded-full ${c.color.split(' ')[0]} flex items-center justify-center border-2 border-white shadow-sm`}>
                <span className={`text-base font-bold ${c.color.split(' ')[1]}`}>{c.name[0]}</span>
              </div>
              <span className="text-[11px] text-gray-500 font-medium">{c.name}</span>
            </motion.button>
          ))}
          <motion.button whileTap={{ scale: 0.9 }} className="flex flex-col items-center gap-1.5 cursor-pointer flex-shrink-0">
            <div className="w-14 h-14 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
              <Plus className="w-5 h-5 text-gray-400" />
            </div>
            <span className="text-[11px] text-gray-400 font-medium">Add</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Current Activity — with search bar like reference */}
      <motion.div variants={fadeUp}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-[#0F172A]">Current Activity</h3>
        </div>
        {/* Search bar — matches reference */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 bg-white border border-gray-200 rounded-full px-4 py-2.5 flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search Transaction" className="flex-1 bg-transparent text-sm text-[#0F172A] placeholder:text-gray-400 focus:outline-none" />
          </div>
          <motion.button whileTap={{ scale: 0.9 }} className="w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center cursor-pointer" aria-label="Filter"><Filter className="w-4 h-4 text-gray-400" /></motion.button>
        </div>

        <div className="space-y-2 pb-4">
          {filteredTxns.length === 0 && (
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
              <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 text-sm font-medium">{searchQuery ? 'No results found' : 'No transactions yet'}</p>
              <p className="text-gray-300 text-xs mt-1">{searchQuery ? 'Try different keywords' : 'Use AI Chat to scan receipts'}</p>
            </div>
          )}
          {filteredTxns.map((txn, i) => {
            const isIncome = txn.txnType === 'income';
            return (
              <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.03 + i * 0.04, ...spring }}
                className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm border border-gray-100 cursor-pointer active:scale-[0.98] transition-transform">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center ${isIncome?'bg-green-50':'bg-red-50'}`}>
                    {isIncome?<ArrowDownLeft className="w-5 h-5 text-green-500" />:<ArrowUpRight className="w-5 h-5 text-red-500" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A]">{txn.customName||txn.merchant}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{txn.date} {txn.category ? `· ${txn.category}` : ''}</p>
                  </div>
                </div>
                <span className={`text-sm font-bold ${isIncome?'text-green-500':'text-red-500'}`}>
                  {isIncome?'+':'-'}{txn.amount?.toLocaleString()} <span className="text-[10px] text-gray-400">AED</span>
                </span>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Floating New Payment Button — matches reference */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.5, ...springBouncy }}
        whileTap={{ scale: 0.92 }}
        className="fixed z-40 right-5 bg-blue-600 text-white px-5 py-3.5 rounded-full shadow-xl shadow-blue-600/30 flex items-center gap-2 cursor-pointer active:bg-blue-700 transition"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 90px)' }}
      >
        <CircleDollarSign className="w-5 h-5" />
        <span className="text-sm font-bold">New Payment</span>
        <Plus className="w-4 h-4" />
      </motion.button>
    </motion.div>
  );
}

// ─── Cards Section ─────────────────────────────────────────────────
function CardsSection({ data }) {
  const cards = [
    { name: 'Main Card', type: 'Visa', number: '•••• •••• •••• 4291', balance: data.balance||0, gradient: 'from-[#0F172A] via-[#1E293B] to-[#334155]', active: true },
    { name: 'Savings', type: 'Mastercard', number: '•••• •••• •••• 8832', balance: Math.round((data.totalIncome||0)*0.2), gradient: 'from-blue-600 to-blue-800', active: true },
  ];
  return (
    <motion.div variants={pageV} initial="initial" animate="animate" exit="exit" className="space-y-5">
      {cards.map((card, i) => (
        <motion.div key={i} variants={fadeUp} initial={{ opacity: 0, y: 20, rotate: i===0?-2:2 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ delay: i*0.1, ...springBouncy }}
          className={`bg-gradient-to-br ${card.gradient} rounded-3xl p-6 text-white shadow-xl relative overflow-hidden cursor-pointer active:scale-[0.98] transition-transform`}>
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
          <div className="flex justify-between items-start mb-6 relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/15 rounded-full flex items-center justify-center backdrop-blur-sm"><Wifi className="w-4 h-4 text-white/80 rotate-45" /></div>
              <span className="text-[11px] text-white/60 font-medium uppercase tracking-wider">{card.name}</span>
            </div>
            <span className="text-xs text-white/50 font-bold tracking-wider">{card.type}</span>
          </div>
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="w-10 h-7 rounded-md bg-gradient-to-br from-yellow-400/70 to-yellow-600/50 border border-yellow-500/30" />
            <Wifi className="w-5 h-5 text-white/30 rotate-90" />
          </div>
          <p className="text-white font-mono text-sm tracking-[3px] mb-4 relative z-10">{card.number}</p>
          <div className="flex justify-between items-end relative z-10">
            <p className="text-2xl font-extrabold">{card.balance.toLocaleString()} <span className="text-sm font-medium text-white/60">AED</span></p>
            <div className={`w-2 h-2 rounded-full ${card.active?'bg-green-400':'bg-gray-400'}`} />
          </div>
        </motion.div>
      ))}
      <motion.div variants={fadeUp} className="grid grid-cols-3 gap-3">
        {[{icon:Lock,label:'Freeze',color:'bg-blue-50 text-blue-500'},{icon:CreditCard,label:'Details',color:'bg-purple-50 text-purple-500'},{icon:Plus,label:'Add Card',color:'bg-green-50 text-green-500'}].map((a,i)=>(
          <motion.button key={i} whileTap={{scale:0.95}} className="bg-white rounded-2xl p-4 flex flex-col items-center gap-2 shadow-sm border border-gray-100 cursor-pointer active:bg-gray-50 transition">
            <div className={`w-10 h-10 rounded-xl ${a.color.split(' ')[0]} flex items-center justify-center`}><a.icon className={`w-4 h-4 ${a.color.split(' ')[1]}`} /></div>
            <span className="text-xs font-semibold text-gray-500">{a.label}</span>
          </motion.button>
        ))}
      </motion.div>
    </motion.div>
  );
}

// ─── Analytics Section ─────────────────────────────────────────────
function AnalyticsSection({ data }) {
  const totalIncome=data.totalIncome||0, totalSpend=data.totalSpend||0, savings=totalIncome-totalSpend;
  const savingsRate = totalIncome>0 ? Math.round((savings/totalIncome)*100) : 0;
  const weekData = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>({name:d,amount:Math.round(((totalSpend||100)/7)*(0.5+Math.random()))}));
  return (
    <motion.div variants={pageV} initial="initial" animate="animate" exit="exit" className="space-y-5">
      <motion.div variants={fadeUp} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
        <p className="text-xs text-gray-400 font-semibold mb-2">Savings Rate</p>
        <div className="relative w-28 h-28 mx-auto mb-3">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="none" stroke="#F1F5F9" strokeWidth="8" />
            <motion.circle cx="50" cy="50" r="42" fill="none" stroke="#22C55E" strokeWidth="8" strokeDasharray={`${savingsRate*2.64} ${264-savingsRate*2.64}`} initial={{strokeDasharray:'0 264'}} animate={{strokeDasharray:`${savingsRate*2.64} ${264-savingsRate*2.64}`}} transition={{duration:1,ease:'easeOut'}} strokeLinecap="round" /></svg>
          <div className="absolute inset-0 flex items-center justify-center"><span className="text-2xl font-extrabold text-[#0F172A]">{savingsRate}%</span></div>
        </div>
        <p className="text-sm text-gray-500">of income saved</p>
      </motion.div>
      <motion.div variants={fadeUp} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="text-sm font-bold text-[#0F172A] mb-4">Weekly Spending</h3>
        <div className="h-40"><ResponsiveContainer width="100%" height="100%"><AreaChart data={weekData}><defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3B82F6" stopOpacity={0.2} /><stop offset="100%" stopColor="#3B82F6" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:'#94A3B8',fontSize:11}} /><YAxis hide /><Tooltip contentStyle={{borderRadius:12,border:'1px solid #E2E8F0',fontSize:12}} /><Area type="monotone" dataKey="amount" stroke="#3B82F6" strokeWidth={2} fill="url(#sg)" /></AreaChart></ResponsiveContainer></div>
      </motion.div>
    </motion.div>
  );
}

// ─── Recurring Section — Bills Due like reference ──────────────────
function RecurringSection({ data }) {
  const bills = [
    { name: 'DEWA', date: '1st', amount: 450, icon: Zap, color: 'text-amber-500 bg-amber-50' },
    { name: 'du Mobile', date: '5th', amount: 199, icon: Smartphone, color: 'text-blue-500 bg-blue-50' },
    { name: 'Salik', date: '15th', amount: 100, icon: CreditCard, color: 'text-teal-500 bg-teal-50' },
  ];
  const recurring = [
    { name: 'Office Rent', category: 'Office', amount: 5000, day: 1, icon: Building2, color: 'bg-purple-50 text-purple-500' },
    { name: 'Internet', category: 'Utilities', amount: 350, day: 10, icon: Globe, color: 'bg-blue-50 text-blue-500' },
  ];
  return (
    <motion.div variants={pageV} initial="initial" animate="animate" exit="exit" className="space-y-5">
      {/* Bills Due — horizontal scroll cards like reference */}
      <motion.div variants={fadeUp}>
        <h3 className="text-lg font-bold text-[#0F172A] mb-3">Bills Due</h3>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
          {bills.map((b,i) => (
            <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i*0.08, ...spring }}
              className="bg-white rounded-2xl p-4 min-w-[130px] shadow-sm border border-gray-100 flex-shrink-0 cursor-pointer active:scale-[0.97] transition-transform">
              <p className="text-xs text-gray-400 font-semibold mb-3">{b.date} Monthly</p>
              <div className={`w-10 h-10 rounded-xl ${b.color.split(' ')[1]} flex items-center justify-center mb-3`}><b.icon className={`w-5 h-5 ${b.color.split(' ')[0]}`} /></div>
              <p className="text-sm font-bold text-[#0F172A]">{b.name}</p>
              <p className="text-xs text-gray-500 font-semibold">{b.amount.toLocaleString()} AED</p>
            </motion.div>
          ))}
          <motion.button whileTap={{ scale: 0.95 }} className="bg-gray-50 rounded-2xl p-4 min-w-[130px] border-2 border-dashed border-gray-200 flex-shrink-0 flex flex-col items-center justify-center gap-2 cursor-pointer">
            <Plus className="w-6 h-6 text-gray-400" />
            <span className="text-xs text-gray-400 font-semibold">Add a Bill</span>
          </motion.button>
        </div>
      </motion.div>
      {/* Monthly Recurring */}
      <motion.div variants={fadeUp}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Monthly Total</h3>
          <p className="text-lg font-extrabold text-[#0F172A]">{[...bills,...recurring].reduce((s,r)=>s+r.amount,0).toLocaleString()} AED</p>
        </div>
        {recurring.map((r,i) => (
          <motion.div key={i} variants={fadeUp} className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm border border-gray-100 mb-2 cursor-pointer active:scale-[0.98] transition-transform">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl ${r.color.split(' ')[0]} flex items-center justify-center`}><r.icon className={`w-5 h-5 ${r.color.split(' ')[1]}`} /></div>
              <div><p className="text-sm font-semibold text-[#0F172A]">{r.name}</p><p className="text-xs text-gray-400">Due day {r.day} · {r.category}</p></div>
            </div>
            <p className="text-sm font-bold text-[#0F172A]">{r.amount.toLocaleString()} AED</p>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STATISTICS TAB — Bar chart, VAT, budget card (matches reference right screen)
// ═══════════════════════════════════════════════════════════════════
function StatisticsTab({ d, onExport }) {
  const data=d||{};const totalIncome=data.totalIncome||0,totalSpend=data.totalSpend||0,totalVat=data.totalVat||0;
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const cm=new Date().getMonth();
  const chartData=months.slice(Math.max(0,cm-5),cm+1).map((m,i,arr)=>({name:m,Earned:i===arr.length-1?totalIncome:Math.round(totalIncome*(0.6+Math.random()*0.4)),Spent:i===arr.length-1?totalSpend:Math.round(totalSpend*(0.5+Math.random()*0.5))}));
  const categories={};(data.recentTransactions||[]).forEach(t=>{if(t.txnType!=='income'&&t.category)categories[t.category]=(categories[t.category]||0)+(t.amount||0);});
  const categoryList=Object.entries(categories).sort((a,b)=>b[1]-a[1]);
  const catColors={Food:'#F97316',Transport:'#3B82F6',Shopping:'#A855F7',Office:'#14B8A6',Utilities:'#F59E0B',Entertainment:'#EC4899',Health:'#22C55E',Travel:'#0EA5E9',Banking:'#6366F1',General:'#94A3B8'};

  return (
    <motion.div variants={pageV} initial="initial" animate="animate" exit="exit" className="px-5 max-w-2xl mx-auto">
      <motion.div variants={fadeUp} className="flex items-center justify-between mt-4 mb-5">
        <h2 className="text-2xl font-extrabold text-[#0F172A]">Analytics</h2>
        <div className="flex items-center gap-2"><span className="text-sm text-gray-400">Spending by</span>
          <button className="flex items-center gap-1 bg-white border border-gray-200 rounded-full px-3 py-1.5 text-sm font-bold text-[#0F172A] cursor-pointer">Monthly <ChevronDown className="w-3.5 h-3.5" /></button></div>
      </motion.div>
      {/* Bar Chart — gray & dark bars like reference */}
      <motion.div variants={fadeUp} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-5">
        <div className="h-52"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:'#94A3B8',fontSize:12,fontWeight:500}} />
          <YAxis axisLine={false} tickLine={false} tick={{fill:'#94A3B8',fontSize:11}} tickFormatter={v=>`${v>=1000?`${v/1000}k`:v}`} width={40} />
          <Tooltip contentStyle={{borderRadius:12,border:'1px solid #E2E8F0',boxShadow:'0 4px 12px rgba(0,0,0,0.08)',fontSize:13}} />
          <Bar dataKey="Earned" fill="#CBD5E1" radius={[6,6,0,0]} barSize={16} /><Bar dataKey="Spent" fill="#0F172A" radius={[6,6,0,0]} barSize={16} />
        </BarChart></ResponsiveContainer></div>
        <div className="flex items-center justify-center gap-6 mt-3">
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-gray-300" /><span className="text-xs text-gray-400 font-medium">Earned</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#0F172A]" /><span className="text-xs text-gray-400 font-medium">Spent</span></div>
        </div>
      </motion.div>
      {/* Income / Spending */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"><div className="flex items-center gap-2 mb-2"><div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center"><TrendingUp className="w-4 h-4 text-green-500" /></div><span className="text-xs text-gray-400 font-semibold">Income</span></div><p className="text-xl font-extrabold text-[#0F172A]">{totalIncome.toLocaleString()}<span className="text-xs text-gray-400 ml-1">AED</span></p></div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"><div className="flex items-center gap-2 mb-2"><div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center"><TrendingDown className="w-4 h-4 text-red-500" /></div><span className="text-xs text-gray-400 font-semibold">Spending</span></div><p className="text-xl font-extrabold text-[#0F172A]">{totalSpend.toLocaleString()}<span className="text-xs text-gray-400 ml-1">AED</span></p></div>
      </motion.div>
      {/* Budget Card — dark like reference */}
      <motion.div variants={fadeUp} className="bg-[#0F172A] rounded-2xl p-5 mb-5 flex items-center justify-between cursor-pointer active:bg-[#1E293B] transition">
        <div className="flex items-center gap-3"><div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center"><PieChart className="w-5 h-5 text-white" /></div>
          <div><p className="text-sm font-bold text-white">Budget</p><p className="text-xs text-gray-400">Set your budget goal</p></div></div>
        <motion.button whileTap={{ scale: 0.9 }} className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center cursor-pointer" aria-label="Add budget"><Plus className="w-5 h-5 text-white" /></motion.button>
      </motion.div>
      {/* VAT Summary */}
      <motion.div variants={fadeUp} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-5">
        <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center"><Shield className="w-5 h-5 text-blue-500" /></div><div><h3 className="text-sm font-bold text-[#0F172A]">VAT Summary</h3><p className="text-xs text-gray-400">UAE 5% Value Added Tax</p></div></div>
        <div className="grid grid-cols-3 gap-3">{[{label:'Total VAT',value:totalVat.toLocaleString()},{label:'Receipts',value:data.scanCount||0},{label:'Quarter',value:`Q${Math.ceil((new Date().getMonth()+1)/3)}`}].map((item,i)=><div key={i} className="bg-gray-50 rounded-xl p-3 text-center"><p className="text-base font-extrabold text-[#0F172A]">{item.value}</p><p className="text-[10px] text-gray-400 font-medium">{item.label}</p></div>)}</div>
      </motion.div>
      {/* Download PDF */}
      <motion.div variants={fadeUp} className="mb-6">
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => onExport({})} className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl text-sm shadow-lg shadow-blue-600/20 cursor-pointer flex items-center justify-center gap-2 active:bg-blue-700 transition"><Download className="w-4 h-4" /> Download Report (PDF)</motion.button>
      </motion.div>
      {categoryList.length > 0 && <motion.div variants={fadeUp} className="mb-6"><h3 className="text-sm font-bold text-[#0F172A] mb-3">By Category</h3><div className="space-y-2">{categoryList.map(([cat,amount])=><div key={cat} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full" style={{backgroundColor:catColors[cat]||'#94A3B8'}} /><span className="text-sm font-semibold text-[#0F172A]">{cat}</span></div><span className="text-sm font-bold text-[#0F172A]">{amount.toLocaleString()} AED</span></div>)}</div></motion.div>}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// AI CHAT TAB
// ═══════════════════════════════════════════════════════════════════
function AIChatTab({ messages, input, setInput, onSend, loading, sessions, onLoadSession, onNewChat, onUpload, fileInputRef, chatEndRef, pendingTransaction, onVerify, onDismiss }) {
  return (
    <motion.div variants={pageV} initial="initial" animate="animate" exit="exit" className="max-w-2xl mx-auto relative">
      <div className="px-5 mt-4">
        <div className="flex overflow-x-auto gap-3 pb-3 scrollbar-hide">
          <motion.button whileTap={{scale:0.95}} onClick={onNewChat} className="flex-none flex flex-col items-center gap-1.5 cursor-pointer">
            <div className="w-12 h-12 rounded-full bg-blue-50 border-2 border-dashed border-blue-300 flex items-center justify-center"><Plus className="w-5 h-5 text-blue-500" /></div>
            <span className="text-[10px] text-gray-400 font-medium">New</span>
          </motion.button>
          {sessions.map((s,i)=><motion.button key={i} whileTap={{scale:0.95}} onClick={()=>onLoadSession(s.sessionId)} className="flex-none flex flex-col items-center gap-1.5 cursor-pointer"><div className="w-12 h-12 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center"><Receipt className="w-5 h-5 text-gray-400" /></div><span className="text-[10px] text-gray-400 font-medium max-w-[50px] truncate">{s.lastMessage?.substring(0,6)||'Chat'}</span></motion.button>)}
        </div>
      </div>
      <div className="px-5 space-y-4 mt-2 mb-4" style={{minHeight:'400px'}}>
        {messages.length===0 && (
          <motion.div variants={scaleIn} initial="initial" animate="animate" className="text-center py-14">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4"><Sparkles className="w-8 h-8 text-blue-500" /></div>
            <h2 className="text-xl font-bold text-[#0F172A] mb-2">Filey AI Assistant</h2>
            <p className="text-sm text-gray-400 max-w-[260px] mx-auto mb-6">Scan receipts, log expenses, or ask about your finances.</p>
            <div className="flex flex-wrap justify-center gap-2">
              {['Scan receipt','Paid 120 AED at ENOC','Show VAT total','Monthly summary'].map(s=><motion.button key={s} whileTap={{scale:0.95}} onClick={()=>setInput(s)} className="bg-white border border-gray-200 px-4 py-2 rounded-full text-xs text-gray-500 font-medium cursor-pointer active:bg-gray-50 transition">{s}</motion.button>)}
            </div>
          </motion.div>
        )}
        {messages.map(msg=>(
          <motion.div key={msg.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={spring}>
            {msg.role==='user' ? (
              <div className="flex justify-end"><div className="bg-blue-600 text-white p-4 rounded-2xl rounded-br-md max-w-[80%] shadow-lg shadow-blue-600/10">
                {msg.hasImage && <div className="flex items-center gap-1.5 mb-2 text-blue-200"><ImageIcon className="w-3.5 h-3.5" /><span className="text-xs font-medium">Receipt attached</span></div>}
                <p className="text-sm leading-relaxed">{msg.content}</p>
              </div></div>
            ) : (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex-none flex items-center justify-center mt-1"><Bot className="w-4 h-4 text-blue-500" /></div>
                <div className="max-w-[80%] space-y-3">
                  <div className="bg-white border border-gray-200 p-4 rounded-2xl rounded-bl-md shadow-sm"><p className="text-sm text-[#0F172A] leading-relaxed whitespace-pre-wrap">{msg.content}</p></div>
                  {msg.extractedTransaction && <TxnCard txn={msg.extractedTransaction} onVerify={onVerify} onDismiss={onDismiss} isPending={pendingTransaction?.id===msg.extractedTransaction?.id} />}
                </div>
              </div>
            )}
          </motion.div>
        ))}
        {loading && <div className="flex gap-3"><div className="w-8 h-8 rounded-full bg-gray-100 flex-none flex items-center justify-center"><Bot className="w-4 h-4 text-blue-500" /></div><div className="bg-white border border-gray-200 p-4 rounded-2xl rounded-bl-md shadow-sm"><div className="flex gap-1.5">{[0,1,2].map(i=><motion.div key={i} className="w-2 h-2 bg-blue-400 rounded-full" animate={{y:[0,-6,0]}} transition={{repeat:Infinity,duration:0.6,delay:i*0.15}} />)}</div></div></div>}
        <div ref={chatEndRef} />
      </div>
      <div className="fixed z-40 w-full left-0" style={{bottom:'calc(env(safe-area-inset-bottom,0px) + 80px)'}}>
        <div className="max-w-xl mx-auto px-5"><div className="bg-white rounded-full p-1.5 pr-3 shadow-xl shadow-black/8 border border-gray-200 flex items-center gap-2">
          <input type="file" ref={fileInputRef} onChange={onUpload} accept="image/*" capture="environment" className="hidden" />
          <motion.button whileTap={{scale:0.9}} onClick={()=>fileInputRef.current?.click()} className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20 cursor-pointer" aria-label="Upload receipt"><Camera className="w-5 h-5" /></motion.button>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&onSend()} className="flex-1 bg-transparent text-[#0F172A] text-sm font-medium placeholder:text-gray-400 focus:outline-none px-2" placeholder="Type an expense or scan..." />
          <motion.button whileTap={{scale:0.9}} onClick={onSend} disabled={loading||!input.trim()} className="text-blue-500 disabled:text-gray-300 transition cursor-pointer" aria-label="Send message"><Send className="w-5 h-5" /></motion.button>
        </div></div>
      </div>
    </motion.div>
  );
}

function TxnCard({ txn, onVerify, onDismiss, isPending }) {
  if (!txn) return null; const isIncome=txn.txnType==='income';
  return (
    <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} transition={springBouncy} className="bg-white rounded-2xl p-5 shadow-lg shadow-black/5 border border-gray-200">
      <div className="flex items-center gap-2 mb-4"><div className={`w-1.5 h-7 rounded-full ${isIncome?'bg-green-500':'bg-blue-500'}`} /><h3 className="text-sm font-bold text-[#0F172A]">{isIncome?'Income Received':'AI Confirmation'}</h3></div>
      <div className="grid grid-cols-2 gap-y-3 gap-x-3 mb-4">
        <div><p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-0.5">{isIncome?'Source':'Merchant'}</p><p className="text-sm font-bold text-[#0F172A]">{txn.merchant||'Unknown'}</p></div>
        <div><p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-0.5">Date</p><p className="text-sm font-bold text-[#0F172A]">{txn.date||'Today'}</p></div>
        <div><p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-0.5">Amount</p><p className={`text-xl font-extrabold ${isIncome?'text-green-600':'text-[#0F172A]'}`}>{isIncome?'+':''}{txn.amount||0} <span className="text-xs text-gray-400">AED</span></p></div>
        {!isIncome && <div><p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-0.5">VAT (5%)</p><p className="text-sm font-bold text-green-600">{txn.vat||0} AED</p></div>}
        {txn.category && <div><p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-0.5">Category</p><span className="bg-gray-100 px-2.5 py-1 rounded-md text-xs font-bold text-[#0F172A]">{txn.category}</span></div>}
      </div>
      {isPending && <div className="flex gap-2">
        <motion.button whileTap={{scale:0.97}} onClick={()=>onVerify(txn)} className="flex-1 bg-blue-600 text-white font-bold rounded-full py-3 text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/15 cursor-pointer"><Check className="w-4 h-4"/>Verify</motion.button>
        <motion.button whileTap={{scale:0.97}} onClick={onDismiss} className="flex-1 border border-gray-200 text-[#0F172A] font-bold rounded-full py-3 text-sm cursor-pointer">Edit</motion.button>
      </div>}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CO-WORK TAB
// ═══════════════════════════════════════════════════════════════════
function CoworkTab({ team, activity, showInvite, setShowInvite, onInvite, teamChat, teamChatInput, setTeamChatInput, onSendTeamChat, teamChatEndRef, profile }) {
  const [invName,setInvName]=useState('');const [invEmail,setInvEmail]=useState('');const [invRole,setInvRole]=useState('member');const [sec,setSec]=useState('overview');
  return (
    <motion.div variants={pageV} initial="initial" animate="animate" exit="exit" className="px-5 max-w-2xl mx-auto space-y-5">
      <motion.div variants={fadeUp} className="mt-4"><h2 className="text-2xl font-extrabold text-[#0F172A]">Co-work</h2><p className="text-sm text-gray-400 mt-0.5">Company & team management</p></motion.div>
      <motion.div variants={fadeUp} className="flex gap-2">
        {[{id:'overview',label:'Overview',icon:Users},{id:'chat',label:'Chat',icon:MessageCircle},{id:'activity',label:'Activity',icon:Activity}].map(s=>(
          <motion.button key={s.id} whileTap={{scale:0.95}} onClick={()=>setSec(s.id)} className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold cursor-pointer transition ${sec===s.id?'bg-[#0F172A] text-white shadow-lg':'bg-white text-gray-500 border border-gray-200'}`}><s.icon className="w-3.5 h-3.5"/>{s.label}</motion.button>
        ))}
      </motion.div>
      <motion.div variants={fadeUp} className="bg-[#0F172A] rounded-2xl p-5 flex items-center justify-between">
        <div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center"><Building2 className="w-6 h-6 text-blue-400" /></div><div><h3 className="text-base font-bold text-white">{profile?.company||'Your Company'}</h3><p className="text-xs text-gray-400">{(team?.members?.length||0)+1} members</p></div></div>
        <motion.button whileTap={{scale:0.95}} onClick={()=>setShowInvite(true)} className="bg-blue-600 text-white px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-blue-600/20 cursor-pointer"><UserPlus className="w-3.5 h-3.5"/>Invite</motion.button>
      </motion.div>
      {sec==='overview' && <motion.div variants={fadeUp}><p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Team Members</p><div className="space-y-2">
        <div className="bg-white rounded-xl p-4 flex items-center justify-between shadow-sm border border-gray-100"><div className="flex items-center gap-3"><div className="w-11 h-11 rounded-full border-2 border-blue-500 bg-blue-50 flex items-center justify-center text-blue-600 font-bold">{profile?.name?.[0]||'A'}</div><div><div className="flex items-center gap-2"><p className="text-sm font-semibold text-[#0F172A]">{profile?.name||'You'}</p><span className="bg-blue-50 text-blue-600 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><Crown className="w-2.5 h-2.5"/>Admin</span></div><p className="text-xs text-gray-400">{profile?.email||''}</p></div></div></div>
        {(team?.members||[]).map((m,i)=><div key={i} className="bg-white rounded-xl p-4 flex items-center justify-between shadow-sm border border-gray-100 cursor-pointer active:bg-gray-50 transition"><div className="flex items-center gap-3"><div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm border border-gray-200 ${['bg-purple-50 text-purple-500','bg-teal-50 text-teal-500','bg-amber-50 text-amber-500','bg-pink-50 text-pink-500'][i%4]}`}>{m.name[0]}</div><div><p className="text-sm font-semibold text-[#0F172A]">{m.name}</p><p className="text-xs text-gray-400">{m.role||'Member'}</p></div></div><ChevronRight className="w-4 h-4 text-gray-300" /></div>)}
      </div></motion.div>}
      {sec==='chat' && <motion.div variants={fadeUp}>
        <div className="bg-white rounded-2xl p-4 min-h-[280px] max-h-[380px] overflow-y-auto scrollbar-hide space-y-3 shadow-sm border border-gray-100">
          {teamChat.length===0 && <div className="text-center py-10"><MessageCircle className="w-10 h-10 text-gray-200 mx-auto mb-2"/><p className="text-gray-400 text-sm">Start a conversation</p></div>}
          {teamChat.map((m,i)=>{const isMe=m.userName===profile?.name||m.userId==='admin';return(<div key={i} className={`flex ${isMe?'flex-row-reverse':'flex-row'} gap-2 max-w-[80%] ${isMe?'ml-auto':''}`}><div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold ${isMe?'bg-blue-600 text-white':'bg-gray-100 text-gray-500'}`}>{m.userName?.[0]||'?'}</div><div><span className="text-[10px] text-gray-400 font-medium">{m.userName}</span><div className={`${isMe?'bg-blue-600 text-white':'bg-gray-100 text-[#0F172A]'} p-3 rounded-2xl text-sm mt-0.5`}>{m.message}</div></div></div>);})}
          <div ref={teamChatEndRef}/>
        </div>
        <div className="bg-white p-1.5 rounded-full border border-gray-200 flex items-center gap-2 mt-3 shadow-sm">
          <input value={teamChatInput} onChange={e=>setTeamChatInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&onSendTeamChat()} className="flex-grow bg-transparent text-[#0F172A] text-sm font-medium placeholder:text-gray-400 focus:outline-none py-2.5 px-4" placeholder="Type a message..."/>
          <motion.button whileTap={{scale:0.9}} onClick={onSendTeamChat} className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20 cursor-pointer" aria-label="Send"><Send className="w-4 h-4"/></motion.button>
        </div>
      </motion.div>}
      {sec==='activity' && <motion.div variants={fadeUp}><div className="space-y-2">
        {activity.length===0 && <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100"><Activity className="w-8 h-8 text-gray-200 mx-auto mb-2"/><p className="text-gray-400 text-sm">No activity yet</p></div>}
        {activity.map((a,i)=><motion.div key={i} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:i*0.04,...spring}} className="bg-white border border-gray-100 p-4 rounded-xl flex justify-between items-center shadow-sm"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg flex items-center justify-center bg-gray-50">{a.type==='transaction'?<Receipt className="w-4 h-4 text-gray-400"/>:<Users className="w-4 h-4 text-gray-400"/>}</div><div><p className="text-sm font-semibold text-[#0F172A]">{a.description?.substring(0,40)}</p><p className="text-[11px] text-gray-400">{a.category||a.type}</p></div></div><span className="text-[10px] text-gray-400">{new Date(a.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span></motion.div>)}
      </div></motion.div>}
      <AnimatePresence>
        {showInvite && <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center" onClick={()=>setShowInvite(false)}>
          <motion.div variants={slideUp} initial="initial" animate="animate" exit="exit" className="bg-white rounded-t-3xl sm:rounded-3xl p-7 w-full max-w-sm shadow-2xl" style={{paddingBottom:'calc(env(safe-area-inset-bottom,0px)+28px)'}} onClick={e=>e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5 sm:hidden" />
            <h3 className="text-xl font-bold text-[#0F172A] mb-5">Invite Member</h3>
            <div className="space-y-4">
              <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Name</label><input value={invName} onChange={e=>setInvName(e.target.value)} className="w-full bg-gray-50 text-[#0F172A] rounded-xl px-4 py-3 border border-gray-200 focus:border-blue-500 outline-none text-sm" placeholder="e.g. Ahmed"/></div>
              <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Email</label><input value={invEmail} onChange={e=>setInvEmail(e.target.value)} className="w-full bg-gray-50 text-[#0F172A] rounded-xl px-4 py-3 border border-gray-200 focus:border-blue-500 outline-none text-sm" placeholder="ahmed@company.ae"/></div>
              <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Role</label><select value={invRole} onChange={e=>setInvRole(e.target.value)} className="w-full bg-gray-50 text-[#0F172A] rounded-xl px-4 py-3 border border-gray-200 outline-none text-sm"><option value="member">Member</option><option value="salesman">Salesman</option><option value="accountant">Accountant</option><option value="manager">Manager</option></select></div>
              <motion.button whileTap={{scale:0.97}} onClick={()=>{if(invName&&invEmail){onInvite(invName,invEmail,invRole);setInvName('');setInvEmail('');}}} className="w-full bg-blue-600 text-white font-bold rounded-full py-3.5 text-sm shadow-lg shadow-blue-600/20 cursor-pointer">Send Invite</motion.button>
            </div>
          </motion.div>
        </motion.div>}
      </AnimatePresence>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SERVICES TAB
// ═══════════════════════════════════════════════════════════════════
function ServicesTab({ files, onEdit, onExport }) {
  const [active,setActive]=useState(null);
  const services=[
    {id:'scan',icon:ScanLine,label:'Scan Document',desc:'OCR receipt scanner',color:'text-blue-500',bg:'bg-blue-50',border:'border-blue-200'},
    {id:'vault',icon:FolderOpen,label:'Files Vault',desc:'Transaction records',color:'text-purple-500',bg:'bg-purple-50',border:'border-purple-200'},
    {id:'vat',icon:Calculator,label:'VAT Calculator',desc:'5% UAE VAT',color:'text-amber-500',bg:'bg-amber-50',border:'border-amber-200'},
    {id:'export',icon:Download,label:'Export Reports',desc:'PDF & CSV',color:'text-green-500',bg:'bg-green-50',border:'border-green-200'},
    {id:'exchange',icon:ArrowRightLeft,label:'FX Rates',desc:'Currency exchange',color:'text-teal-500',bg:'bg-teal-50',border:'border-teal-200'},
    {id:'invoices',icon:FileCheck,label:'Invoices',desc:'Coming soon',color:'text-pink-500',bg:'bg-pink-50',border:'border-pink-200'},
  ];
  return (
    <motion.div variants={pageV} initial="initial" animate="animate" exit="exit" className="px-5 max-w-2xl mx-auto">
      <motion.div variants={fadeUp} className="mt-4 mb-5"><h2 className="text-2xl font-extrabold text-[#0F172A]">Services</h2><p className="text-sm text-gray-400 mt-0.5">Finance tools & utilities</p></motion.div>
      {!active && <motion.div variants={stagger} initial="initial" animate="animate" className="grid grid-cols-2 gap-3 mb-6">
        {services.map(s=><motion.button key={s.id} variants={fadeUp} whileTap={{scale:0.97}} onClick={()=>{if(s.id==='export')onExport({});else setActive(s.id);}} className={`bg-white border ${s.border} rounded-2xl p-5 text-left cursor-pointer active:scale-[0.98] transition-all shadow-sm`}><div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center mb-3`}><s.icon className={`w-5 h-5 ${s.color}`}/></div><p className="text-sm font-bold text-[#0F172A] mb-0.5">{s.label}</p><p className="text-[11px] text-gray-400">{s.desc}</p></motion.button>)}
      </motion.div>}
      {active && <motion.button initial={{opacity:0}} animate={{opacity:1}} whileTap={{scale:0.95}} onClick={()=>setActive(null)} className="flex items-center gap-1.5 text-blue-500 text-sm font-semibold mb-5 cursor-pointer"><ChevronLeft className="w-4 h-4"/>Back</motion.button>}
      {active==='vat' && <VATCalc />}
      {active==='exchange' && <FXRates />}
      {active==='scan' && <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100"><ScanLine className="w-12 h-12 text-blue-500 mx-auto mb-3"/><h3 className="text-lg font-bold text-[#0F172A] mb-1">Scan Document</h3><p className="text-sm text-gray-400 mb-5">Use AI Chat tab to scan receipts with your camera</p></div>}
      {active==='vault' && <div className="space-y-2">{files.length===0 && <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100"><FolderOpen className="w-10 h-10 text-gray-200 mx-auto mb-2"/><p className="text-sm text-gray-400">No files yet</p></div>}{files.map(f=><div key={f.id} className="bg-white rounded-xl p-4 flex items-center justify-between shadow-sm border border-gray-100 cursor-pointer active:bg-gray-50 transition"><div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-xl flex items-center justify-center ${f.txnType==='income'?'bg-green-50':'bg-gray-50'}`}>{f.txnType==='income'?<ArrowDownLeft className="w-4 h-4 text-green-500"/>:<Receipt className="w-4 h-4 text-gray-400"/>}</div><div><p className="text-sm font-semibold text-[#0F172A]">{f.customName||f.merchant}</p><p className="text-[11px] text-gray-400">{f.date} · {f.category}</p></div></div><span className={`text-sm font-bold ${f.txnType==='income'?'text-green-500':'text-[#0F172A]'}`}>{f.txnType==='income'?'+':''}{f.amount} AED</span></div>)}</div>}
      {active==='invoices' && <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100"><FileCheck className="w-12 h-12 text-gray-200 mx-auto mb-3"/><h3 className="text-lg font-bold text-[#0F172A] mb-1">Invoices</h3><p className="text-sm text-gray-400">Coming soon</p></div>}
    </motion.div>
  );
}

function VATCalc() {
  const [amount,setAmount]=useState('');const [inclusive,setInclusive]=useState(false);const n=parseFloat(amount)||0;const vat=inclusive?n-(n/1.05):n*0.05;const net=inclusive?n/1.05:n;const total=inclusive?n:n*1.05;
  return (<div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"><h3 className="text-lg font-bold text-[#0F172A] mb-4">VAT Calculator</h3><input type="number" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} className="w-full bg-gray-50 text-[#0F172A] text-xl font-bold rounded-xl px-4 py-4 border border-gray-200 focus:border-amber-500 outline-none mb-3" placeholder="0.00"/><div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl mb-4"><span className="text-sm text-[#0F172A] font-medium">VAT Inclusive</span><motion.button whileTap={{scale:0.95}} onClick={()=>setInclusive(!inclusive)} className={`w-12 h-7 rounded-full relative cursor-pointer transition-colors ${inclusive?'bg-amber-500':'bg-gray-200'}`}><motion.div animate={{x:inclusive?22:2}} transition={springBouncy} className="absolute top-[3px] w-[22px] h-[22px] bg-white rounded-full shadow-sm"/></motion.button></div>{n>0 && <motion.div initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} className="space-y-2 pt-3 border-t border-gray-200"><div className="flex justify-between text-sm"><span className="text-gray-400">Net</span><span className="font-semibold text-[#0F172A]">{net.toFixed(2)} AED</span></div><div className="flex justify-between text-sm"><span className="text-gray-400">VAT (5%)</span><span className="font-semibold text-amber-500">{vat.toFixed(2)} AED</span></div><div className="flex justify-between pt-2 border-t border-gray-200"><span className="text-xs font-bold text-gray-400 uppercase">Total</span><span className="text-2xl font-extrabold text-[#0F172A]">{total.toFixed(2)} <span className="text-sm text-gray-400">AED</span></span></div></motion.div>}</div>);
}

function FXRates() {
  const [amount,setAmount]=useState('100');const rates=[{code:'USD',name:'US Dollar',rate:0.2723,flag:'$'},{code:'EUR',name:'Euro',rate:0.2510,flag:'\u20AC'},{code:'GBP',name:'British Pound',rate:0.2153,flag:'\u00A3'},{code:'INR',name:'Indian Rupee',rate:22.78,flag:'\u20B9'},{code:'SAR',name:'Saudi Riyal',rate:1.021,flag:'\uFDFC'},{code:'PKR',name:'Pakistani Rupee',rate:75.5,flag:'\u20A8'}];const n=parseFloat(amount)||0;
  return (<div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"><h3 className="text-lg font-bold text-[#0F172A] mb-4">Exchange Rates</h3><input type="number" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} className="w-full bg-gray-50 text-[#0F172A] text-xl font-bold rounded-xl px-4 py-3 border border-gray-200 focus:border-teal-500 outline-none mb-4" placeholder="100"/><div className="space-y-2">{rates.map((r,i)=><motion.div key={r.code} initial={{opacity:0,x:-6}} animate={{opacity:1,x:0}} transition={{delay:0.05+i*0.04,...spring}} className="bg-gray-50 rounded-xl p-3 flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center text-lg border border-gray-200">{r.flag}</div><div><p className="text-sm font-semibold text-[#0F172A]">{r.code}</p><p className="text-[10px] text-gray-400">{r.name}</p></div></div><div className="text-right"><p className="text-sm font-bold text-[#0F172A]">{(n*r.rate).toFixed(2)}</p><p className="text-[10px] text-gray-400">1 AED = {r.rate}</p></div></motion.div>)}</div></div>);
}

// ═══════════════════════════════════════════════════════════════════
// EXPORT MODAL — iOS sheet style
// ═══════════════════════════════════════════════════════════════════
function ExportModal({ data: d, onClose }) {
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center overflow-y-auto" onClick={onClose}>
      <motion.div variants={slideUp} initial="initial" animate="animate" exit="exit" className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 md:p-8 max-w-3xl w-full relative" style={{paddingBottom:'calc(env(safe-area-inset-bottom,0px)+24px)'}} onClick={e=>e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5 sm:hidden" />
        <div className="flex justify-between items-start mb-6"><div><p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Document</p><p className="font-mono text-xs text-[#0F172A]">{d.reportId}</p></div><div className="text-right"><h2 className="text-xl font-bold text-[#0F172A]">Expense Report</h2><p className="text-xs text-gray-400">{new Date(d.generatedAt).toLocaleDateString()}</p></div></div>
        <div className="overflow-x-auto rounded-xl border border-gray-200"><table className="w-full text-left"><thead><tr className="bg-blue-600">{['Date','Merchant','Category','VAT','Total'].map(h=><th key={h} className="py-3 px-4 text-white font-bold text-xs uppercase tracking-wider">{h}</th>)}</tr></thead><tbody className="text-sm">{(d.transactions||[]).length===0 && <tr><td colSpan="5" className="py-6 text-center text-gray-400">No transactions</td></tr>}{(d.transactions||[]).map((t,i)=><tr key={i} className="border-b border-gray-100"><td className="py-3 px-4 text-gray-500">{t.date}</td><td className="py-3 px-4 font-semibold text-[#0F172A]">{t.merchant}</td><td className="py-3 px-4 text-gray-500">{t.category}</td><td className="py-3 px-4">{t.vat?.toFixed(2)}</td><td className="py-3 px-4 font-semibold text-right">{t.amount?.toLocaleString()}</td></tr>)}</tbody></table></div>
        <div className="mt-6 flex justify-end"><div className="w-60 space-y-2 pt-4 border-t-2 border-[#0F172A]"><div className="flex justify-between text-sm"><span className="text-gray-400">Subtotal</span><span className="font-medium">{d.subtotal?.toLocaleString()} AED</span></div><div className="flex justify-between text-sm"><span className="text-gray-400">VAT (5%)</span><span className="font-medium">{d.totalVat?.toLocaleString()} AED</span></div><div className="flex justify-between pt-2"><span className="text-xs font-bold uppercase">Grand Total</span><span className="text-2xl font-extrabold">{d.grandTotal?.toLocaleString()} AED</span></div></div></div>
        <div className="mt-6 flex gap-3 justify-end"><button onClick={onClose} className="px-6 py-2.5 rounded-xl bg-gray-100 text-[#0F172A] font-semibold text-sm cursor-pointer">Close</button><motion.button whileTap={{scale:0.97}} onClick={()=>window.print()} className="px-8 py-2.5 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-blue-600/15 cursor-pointer"><Download className="w-4 h-4"/>Export PDF</motion.button></div>
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// NOTIFICATIONS PANEL
// ═══════════════════════════════════════════════════════════════════
function NotificationsPanel({ notifications, setNotifications, onClose }) {
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90] flex justify-end" onClick={onClose}>
      <motion.div initial={{x:'100%'}} animate={{x:0}} exit={{x:'100%'}} transition={spring} className="w-full max-w-md h-full bg-white overflow-y-auto" style={{paddingTop:'env(safe-area-inset-top,0px)'}} onClick={e=>e.stopPropagation()}>
        <div className="px-5 pb-8">
          <div className="sticky top-0 bg-white/90 backdrop-blur-xl pt-4 pb-3 flex items-center justify-between z-10 border-b border-gray-100"><h2 className="text-lg font-bold text-[#0F172A]">Notifications</h2><div className="flex items-center gap-2"><button onClick={()=>setNotifications(p=>p.map(n=>({...n,read:true})))} className="text-xs text-blue-500 font-semibold cursor-pointer">Mark all read</button><motion.button whileTap={{scale:0.9}} onClick={onClose} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center cursor-pointer" aria-label="Close"><X className="w-5 h-5 text-gray-500"/></motion.button></div></div>
          {notifications.length===0 && <div className="text-center py-16"><Bell className="w-12 h-12 text-gray-200 mx-auto mb-3"/><p className="text-gray-400 text-sm">No notifications</p></div>}
          <div className="space-y-1 mt-4">{notifications.map(n=><div key={n.id} className={`p-4 rounded-xl flex items-start gap-3 transition cursor-pointer ${n.read?'bg-white':'bg-blue-50'}`} onClick={()=>setNotifications(p=>p.map(x=>x.id===n.id?{...x,read:true}:x))}><div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${n.read?'bg-gray-100':'bg-blue-100'}`}><CheckCircle2 className={`w-4 h-4 ${n.read?'text-gray-400':'text-blue-500'}`}/></div><div className="flex-1 min-w-0"><p className="text-sm font-semibold text-[#0F172A]">{n.title}</p><p className="text-xs text-gray-400 mt-0.5">{n.body}</p><p className="text-[10px] text-gray-300 mt-1">{new Date(n.time).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</p></div>{!n.read && <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"/>}</div>)}</div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SETTINGS PANEL — iOS slide-over
// ═══════════════════════════════════════════════════════════════════
function SettingsPanel({ profile, setProfile, onClose, onLogout, apiKey, apiProvider, saveApiKey, saveApiProvider }) {
  const [editing,setEditing]=useState(false);const [editName,setEditName]=useState(profile?.name||'');const [editEmail,setEditEmail]=useState(profile?.email||'');const [editCompany,setEditCompany]=useState(profile?.company||'');const avatarInputRef=useRef(null);
  const [localApiKey,setLocalApiKey]=useState(apiKey||'');const [showKey,setShowKey]=useState(false);
  useEffect(()=>{if(profile){setEditName(profile.name||'');setEditEmail(profile.email||'');setEditCompany(profile.company||'');}},[profile]);
  const saveProfile=async()=>{try{await fetch('/api/settings/profile',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:editName,email:editEmail,company:editCompany})});}catch{}const u={...profile,name:editName,email:editEmail,company:editCompany};setProfile(u);localStorage.setItem('filey_user',JSON.stringify(u));setEditing(false);};
  const handleAvatarUpload=async(e)=>{const file=e.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=async()=>{try{await fetch('/api/settings/avatar',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({avatar:reader.result})});}catch{}setProfile({...profile,avatar:reader.result});};reader.readAsDataURL(file);if(avatarInputRef.current)avatarInputRef.current.value='';};

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90] flex justify-end" onClick={onClose}>
      <motion.div initial={{x:'100%'}} animate={{x:0}} exit={{x:'100%'}} transition={spring} className="w-full max-w-md h-full bg-white overflow-y-auto" style={{paddingTop:'env(safe-area-inset-top,0px)'}} onClick={e=>e.stopPropagation()}>
        <div className="px-5 pb-8">
          <div className="sticky top-0 bg-white/90 backdrop-blur-xl pt-4 pb-3 flex items-center justify-between z-10 border-b border-gray-100"><h2 className="text-lg font-bold text-[#0F172A]">Settings</h2><motion.button whileTap={{scale:0.9}} onClick={onClose} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center cursor-pointer" aria-label="Close"><X className="w-5 h-5 text-gray-500"/></motion.button></div>
          <input type="file" ref={avatarInputRef} onChange={handleAvatarUpload} accept="image/*" className="hidden"/>
          <div className="flex flex-col items-center text-center mt-6 mb-8">
            <div className="relative mb-4"><div className="w-20 h-20 rounded-full ring-2 ring-blue-500/30 ring-offset-2 overflow-hidden bg-blue-50">{profile?.avatar?<img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" draggable={false}/>:<span className="flex items-center justify-center w-full h-full text-3xl font-bold text-blue-600">{profile?.name?.[0]||'U'}</span>}</div><motion.button whileTap={{scale:0.9}} onClick={()=>avatarInputRef.current?.click()} className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center ring-3 ring-white shadow-lg cursor-pointer" aria-label="Change avatar"><Camera className="w-3.5 h-3.5 text-white"/></motion.button></div>
            {editing ? (
              <div className="w-full space-y-3">{[{label:'Name',val:editName,set:setEditName,ph:'Your name'},{label:'Email',val:editEmail,set:setEditEmail,ph:'email@company.ae'},{label:'Company',val:editCompany,set:setEditCompany,ph:'Company name'}].map(f=><div key={f.label}><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1 text-left">{f.label}</label><input value={f.val} onChange={e=>f.set(e.target.value)} className="w-full bg-gray-50 text-[#0F172A] rounded-xl px-4 py-3 border border-gray-200 focus:border-blue-500 outline-none text-sm" placeholder={f.ph}/></div>)}<div className="flex gap-2 pt-1"><motion.button whileTap={{scale:0.97}} onClick={saveProfile} className="flex-1 bg-blue-600 text-white font-bold rounded-full py-3 text-sm cursor-pointer">Save</motion.button><motion.button whileTap={{scale:0.97}} onClick={()=>setEditing(false)} className="flex-1 border border-gray-200 text-gray-500 font-bold rounded-full py-3 text-sm cursor-pointer">Cancel</motion.button></div></div>
            ) : (
              <div className="w-full"><h2 className="text-2xl font-extrabold text-[#0F172A] mb-1">{profile?.name||'Set your name'}</h2><p className="text-sm text-gray-400 mb-4">{profile?.email||'Set email'}</p><motion.button whileTap={{scale:0.97}} onClick={()=>setEditing(true)} className="text-blue-500 text-sm font-semibold flex items-center gap-1 mx-auto cursor-pointer">Edit Profile <ChevronRight className="w-4 h-4"/></motion.button></div>
            )}
          </div>
          <div className="bg-gray-50 rounded-2xl p-5 mb-6 border border-gray-100"><p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1">Organization</p><h3 className="text-base font-bold text-[#0F172A] mb-3">{profile?.company||'Set company'}</h3><div className="grid grid-cols-2 gap-4"><div><p className="text-[10px] text-gray-400 font-semibold mb-0.5">TRN</p><p className="text-sm font-semibold text-[#0F172A]">10034455290003</p></div><div><p className="text-[10px] text-gray-400 font-semibold mb-0.5">VAT Quarters</p><p className="text-sm font-semibold text-[#0F172A]">Jan, Apr, Jul, Oct</p></div></div></div>
          {/* AI Settings */}
          <div className="bg-white rounded-2xl p-5 mb-6 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center"><Bot className="w-5 h-5 text-purple-500"/></div><div><h3 className="text-base font-bold text-[#0F172A]">AI Settings</h3><p className="text-xs text-gray-400">API key for AI features</p></div></div>
            <div className="space-y-3">
              <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Provider</label>
                <select value={apiProvider} onChange={e=>saveApiProvider(e.target.value)} className="w-full bg-gray-50 text-[#0F172A] rounded-xl px-4 py-3 border border-gray-200 focus:border-purple-500 outline-none text-sm">
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic (Claude)</option>
                </select>
              </div>
              <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">API Key</label>
                <div className="relative">
                  <input type={showKey?'text':'password'} value={localApiKey} onChange={e=>setLocalApiKey(e.target.value)} onBlur={()=>saveApiKey(localApiKey)} className="w-full bg-gray-50 text-[#0F172A] rounded-xl pl-4 pr-10 py-3 border border-gray-200 focus:border-purple-500 outline-none text-sm font-mono" placeholder="sk-..."/>
                  <button onClick={()=>setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer">{showKey ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}</button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5">Key stored locally. Never sent to our servers.</p>
              </div>
            </div>
          </div>
          <div className="space-y-1 mb-8">{[{icon:Bell,label:'Notifications',sub:'Push & Email'},{icon:Lock,label:'Privacy & Security'},{icon:Globe,label:'Language',sub:'English (US)'},{icon:HelpCircle,label:'Help & Support'},{icon:Star,label:'Rate Filey'}].map((item,i)=><div key={i} className="flex items-center justify-between p-4 rounded-xl cursor-pointer active:bg-gray-50 transition-colors group"><div className="flex items-center gap-3"><div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center"><item.icon className="w-4 h-4 text-gray-500"/></div><div><p className="text-sm font-semibold text-[#0F172A]">{item.label}</p>{item.sub && <p className="text-[11px] text-blue-500">{item.sub}</p>}</div></div><ChevronRight className="w-4 h-4 text-gray-300 group-hover:translate-x-0.5 transition-transform"/></div>)}</div>
          <div className="text-center mb-6"><p className="text-[10px] text-gray-300 font-medium">Filey v1.0.0 · Made in UAE</p></div>
          <motion.button whileTap={{scale:0.97}} onClick={onLogout} className="w-full flex items-center justify-center gap-2 bg-red-50 border border-red-200 text-red-500 font-bold py-3.5 rounded-2xl text-sm cursor-pointer active:bg-red-100 transition mb-6" style={{marginBottom:'calc(env(safe-area-inset-bottom,0px)+24px)'}}><LogOut className="w-4 h-4"/> Log Out</motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
