import React, { useState, useEffect, useMemo, createContext, useContext, useCallback } from "react";

const SUPABASE_URL = "https://cccsreyspmpwnfbmegwz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjY3NyZXlzcG1wd25mYm1lZ3d6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMDk4MzQsImV4cCI6MjA4NTg4NTgzNH0.dk5dPqk7EXBxHZHOX6_mxNxpheNuHD4SAKGDorCuSa8";
const ADMIN_EMAIL = "dbharper77@gmail.com";

const supabase = {
  headers: (token) => ({ "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token || SUPABASE_ANON_KEY}` }),
  auth: {
    async signUp(email, password, metadata = {}) {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, { method: "POST", headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY }, body: JSON.stringify({ email, password, data: metadata }) });
      return res.json();
    },
    async signIn(email, password) {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY }, body: JSON.stringify({ email, password }) });
      return res.json();
    },
    async getUser(token) {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } });
      return res.json();
    },
    async signOut(token) {
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, { method: "POST", headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } });
    },
  },
  from: (table, token) => ({
    async select() { const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&order=created_at.desc`, { headers: supabase.headers(token) }); return res.json(); },
    async insert(data) { const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, { method: "POST", headers: { ...supabase.headers(token), Prefer: "return=representation" }, body: JSON.stringify(data) }); return res.json(); },
  }),
};

async function sendDiscordNotification(webhookUrl, message, embed = null) {
  if (!webhookUrl) return;
  try { 
    const body = embed ? { embeds: [embed] } : { content: message };
    await fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); 
  } catch (e) { console.error(e); }
}

const AuthContext = createContext(null);
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const isAdmin = user?.email === ADMIN_EMAIL;
  useEffect(() => {
    const saved = sessionStorage.getItem("dbh_session");
    if (saved) {
      try {
        const session = JSON.parse(saved);
        setToken(session.access_token);
        supabase.auth.getUser(session.access_token).then((u) => {
          if (u && u.id) { setUser(u); setProfile({ full_name: u.user_metadata?.full_name || "", company_name: u.user_metadata?.company_name || "" }); }
          else { sessionStorage.removeItem("dbh_session"); }
          setLoading(false);
        });
      } catch { setLoading(false); }
    } else { setLoading(false); }
  }, []);
  const signIn = async (email, password) => {
    const data = await supabase.auth.signIn(email, password);
    if (data.error || data.error_description) throw new Error(data.error_description || data.error || "Login failed");
    setToken(data.access_token); setUser(data.user);
    setProfile({ full_name: data.user?.user_metadata?.full_name || "", company_name: data.user?.user_metadata?.company_name || "" });
    sessionStorage.setItem("dbh_session", JSON.stringify(data));
    return data;
  };
  const signUp = async (email, password, metadata) => {
    const data = await supabase.auth.signUp(email, password, metadata);
    if (data.error || data.msg?.includes("error")) throw new Error(data.msg || data.error || "Signup failed");
    if (data.access_token) { setToken(data.access_token); setUser(data.user); setProfile({ full_name: metadata.full_name || "", company_name: metadata.company_name || "" }); sessionStorage.setItem("dbh_session", JSON.stringify(data)); }
    return data;
  };
  const signOut = async () => { if (token) await supabase.auth.signOut(token); setUser(null); setToken(null); setProfile(null); sessionStorage.removeItem("dbh_session"); };
  return <AuthContext.Provider value={{ user, token, profile, loading, signIn, signUp, signOut, isAdmin }}>{children}</AuthContext.Provider>;
}
const useAuth = () => useContext(AuthContext);

const Icons = {
  Dashboard: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
  Package: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  Calculator: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/></svg>,
  Receipt: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2-3 2-3-2z"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
  User: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Users: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  LogOut: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Plus: () => <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Search: () => <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Zap: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  Check: () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
  Trash: () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>,
  Menu: () => <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  Send: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  Box: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>,
  TrendingUp: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  Edit: () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  ArrowLeft: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  Save: () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
  X: () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Shield: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  AlertTriangle: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Truck: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><rect x="1" y="3" width="15" height="13" rx="1"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  Settings: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  List: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  BarChart: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
  BarChart: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
  ShoppingBag: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>,
  CreditCard: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  Eye: () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  RefreshCw: () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>,
  ExternalLink: () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
};

const css = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
:root{--bg-primary:#060b14;--bg-secondary:#0c1322;--bg-card:#111a2e;--bg-card-hover:#162037;--border:#1c2d4a;--border-bright:#234170;--cyan:#00e5ff;--cyan-dim:#00b8d4;--cyan-glow:rgba(0,229,255,0.15);--text-primary:#e8edf5;--text-secondary:#8899b4;--text-muted:#556a8a;--green:#00e676;--amber:#ffab00;--red:#ff5252;--purple:#b388ff;--orange:#ff9100}
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Outfit',sans-serif;background:var(--bg-primary);color:var(--text-primary)}
.app-wrapper{display:flex;min-height:100vh}.sidebar{width:260px;background:var(--bg-secondary);border-right:1px solid var(--border);display:flex;flex-direction:column;position:fixed;height:100vh;z-index:50}
.sidebar-logo{padding:20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px}.sidebar-logo-icon{width:40px;height:40px;background:linear-gradient(135deg,var(--cyan),var(--cyan-dim));border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;color:var(--bg-primary)}
.sidebar-logo-icon.admin{background:linear-gradient(135deg,var(--orange),#e68200)}
.sidebar-logo-text{font-weight:700;font-size:18px;letter-spacing:1px}.sidebar-logo-sub{font-size:11px;color:var(--text-muted);letter-spacing:2px;text-transform:uppercase}
.service-tabs{display:flex;padding:12px;gap:6px;border-bottom:1px solid var(--border)}.service-tab{flex:1;padding:10px 12px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;text-align:center;transition:all 0.2s;border:1px solid transparent;background:transparent;color:var(--text-muted)}
.service-tab:hover{color:var(--text-primary);background:var(--bg-card)}.service-tab.active.prep{background:linear-gradient(135deg,rgba(0,229,255,0.15),rgba(0,229,255,0.05));border-color:rgba(0,229,255,0.3);color:var(--cyan)}
.service-tab.active.liquidation{background:linear-gradient(135deg,rgba(255,145,0,0.15),rgba(255,145,0,0.05));border-color:rgba(255,145,0,0.3);color:var(--orange)}
.sidebar-section-title{font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:1.5px;padding:12px 14px 6px}
.sidebar-nav{flex:1;padding:0 12px;display:flex;flex-direction:column;gap:2px;overflow-y:auto}.nav-item{display:flex;align-items:center;gap:12px;padding:11px 14px;border-radius:10px;cursor:pointer;color:var(--text-secondary);transition:all 0.2s;font-size:14px;font-weight:500;border:1px solid transparent}
.nav-item:hover{color:var(--text-primary);background:var(--bg-card)}.nav-item.active.prep{color:var(--cyan);background:var(--cyan-glow);border-color:rgba(0,229,255,0.2)}.nav-item.active.liquidation{color:var(--orange);background:rgba(255,145,0,0.1);border-color:rgba(255,145,0,0.2)}.nav-item.active.admin{color:var(--orange);background:rgba(255,145,0,0.1);border-color:rgba(255,145,0,0.2)}
.sidebar-footer{padding:16px;border-top:1px solid var(--border)}.sidebar-user{display:flex;align-items:center;gap:10px;padding:8px;margin-bottom:8px}.sidebar-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--cyan),var(--purple));display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;color:var(--bg-primary)}
.sidebar-avatar.admin{background:linear-gradient(135deg,var(--orange),var(--red))}
.sidebar-username{font-size:13px;font-weight:600}.sidebar-email{font-size:11px;color:var(--text-muted)}
.btn-signout{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:9px 14px;border-radius:8px;cursor:pointer;color:var(--text-muted);background:none;border:1px solid var(--border);font-size:13px;font-family:'Outfit',sans-serif;font-weight:500;transition:all 0.2s}.btn-signout:hover{color:var(--red);border-color:var(--red);background:rgba(255,82,82,0.08)}
.main-content{flex:1;margin-left:260px;min-height:100vh}.page-header{padding:24px 32px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:var(--bg-secondary)}
.page-title{font-size:22px;font-weight:700}.page-subtitle{font-size:13px;color:var(--text-muted);margin-top:2px}.page-body{padding:28px 32px}
.mobile-header{display:none;padding:16px;background:var(--bg-secondary);border-bottom:1px solid var(--border);align-items:center;justify-content:space-between}.mobile-menu-btn{background:none;border:none;color:var(--text-primary);cursor:pointer}
.sidebar-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:40}
@media(max-width:768px){.sidebar{transform:translateX(-100%)}.sidebar.open{transform:translateX(0)}.sidebar-overlay.open{display:block}.mobile-header{display:flex}.main-content{margin-left:0}.page-header,.page-body{padding:16px}.stats-grid{grid-template-columns:1fr 1fr!important}}
.card{background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:22px;transition:all 0.2s}.card:hover{border-color:var(--border-bright)}.card-title{font-size:13px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px}
.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px}.stat-card{position:relative;overflow:hidden}.stat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--cyan),transparent)}.stat-card.liquidation::before,.stat-card.admin::before{background:linear-gradient(90deg,var(--orange),transparent)}.stat-card.warning::before{background:linear-gradient(90deg,var(--red),transparent)}
.stat-value{font-size:32px;font-weight:800;font-family:'JetBrains Mono',monospace}.stat-label{font-size:12px;color:var(--text-muted);margin-top:4px;text-transform:uppercase;letter-spacing:1px}
.badge{padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;display:inline-block}.badge-transit{background:rgba(179,136,255,0.15);color:var(--purple)}.badge-partial_delivery{background:rgba(255,171,0,0.15);color:var(--amber)}.badge-delivered{background:rgba(0,229,255,0.15);color:var(--cyan)}.badge-prepped,.badge-collected,.badge-paid,.badge-sold{background:rgba(0,230,118,0.15);color:var(--green)}.badge-pending{background:rgba(255,171,0,0.15);color:var(--amber)}.badge-ready_for_collection{background:rgba(255,171,0,0.15);color:var(--amber)}.badge-attention{background:rgba(255,82,82,0.15);color:var(--red)}
.table-wrap{overflow-x:auto}table{width:100%;border-collapse:collapse}th{text-align:left;padding:12px 16px;font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid var(--border)}td{padding:14px 16px;font-size:14px;border-bottom:1px solid var(--border)}tr:hover td{background:var(--bg-card-hover)}.mono{font-family:'JetBrains Mono',monospace;font-size:13px}
.btn{display:inline-flex;align-items:center;gap:8px;padding:10px 18px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;border:none;font-family:'Outfit',sans-serif;transition:all 0.2s}.btn-primary{background:var(--cyan);color:var(--bg-primary)}.btn-primary:hover{background:var(--cyan-dim)}.btn-primary.liquidation,.btn-primary.admin{background:var(--orange)}.btn-primary.liquidation:hover,.btn-primary.admin:hover{background:#e68200}
.btn-secondary{background:var(--bg-card);color:var(--text-primary);border:1px solid var(--border)}.btn-secondary:hover{border-color:var(--cyan)}
.btn-icon{width:34px;height:34px;padding:0;display:flex;align-items:center;justify-content:center;border-radius:8px;background:var(--bg-card);border:1px solid var(--border);color:var(--text-secondary);cursor:pointer;transition:all 0.2s}.btn-icon:hover{border-color:var(--cyan);color:var(--cyan)}.btn-icon.btn-danger:hover{color:var(--red);border-color:var(--red)}
.input-group{margin-bottom:16px}.input-label{display:block;font-size:13px;font-weight:600;color:var(--text-secondary);margin-bottom:6px}.input{width:100%;padding:10px 14px;background:var(--bg-primary);border:1px solid var(--border);border-radius:10px;color:var(--text-primary);font-size:14px;font-family:'Outfit',sans-serif;outline:none}.input:focus{border-color:var(--cyan);box-shadow:0 0 0 3px var(--cyan-glow)}.input::placeholder{color:var(--text-muted)}select.input{cursor:pointer}
.search-bar{display:flex;align-items:center;gap:8px;padding:0 14px;background:var(--bg-primary);border:1px solid var(--border);border-radius:10px;max-width:320px}.search-bar input{flex:1;padding:10px 0;background:none;border:none;color:var(--text-primary);font-size:14px;font-family:'Outfit',sans-serif;outline:none}.search-bar input::placeholder{color:var(--text-muted)}
.fee-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.fee-card{background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:24px;text-align:center}.fee-card:hover{border-color:var(--cyan)}.fee-price{font-size:36px;font-weight:800;font-family:'JetBrains Mono',monospace;color:var(--cyan)}.fee-name{font-size:16px;font-weight:700;margin-top:8px}.fee-desc{font-size:13px;color:var(--text-secondary);margin-top:4px}
.auth-wrapper{min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg-primary);padding:20px}.auth-card{width:100%;max-width:420px;background:var(--bg-card);border:1px solid var(--border);border-radius:20px;padding:40px}
.auth-title{font-size:22px;font-weight:700;text-align:center;margin-bottom:8px}.auth-sub{font-size:14px;color:var(--text-muted);text-align:center;margin-bottom:28px}.auth-error{background:rgba(255,82,82,0.1);border:1px solid rgba(255,82,82,0.3);color:var(--red);padding:10px 14px;border-radius:10px;font-size:13px;margin-bottom:16px}.auth-info{background:rgba(0,229,255,0.1);border:1px solid rgba(0,229,255,0.3);color:var(--cyan);padding:10px 14px;border-radius:10px;font-size:13px;margin-bottom:16px}
.auth-link{color:var(--cyan);cursor:pointer;font-weight:600}.auth-footer{text-align:center;margin-top:20px;font-size:14px;color:var(--text-muted)}.auth-btn{width:100%;padding:12px;font-size:15px;margin-top:8px}
.empty-state{text-align:center;padding:60px 20px;color:var(--text-muted)}.empty-state svg{margin-bottom:16px;opacity:0.3}.empty-state p{font-size:15px}
.loader{display:flex;align-items:center;justify-content:center;min-height:100vh}.spinner{width:40px;height:40px;border:3px solid var(--border);border-top-color:var(--cyan);border-radius:50%;animation:spin 0.8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
.toast{position:fixed;bottom:24px;right:24px;padding:14px 20px;background:var(--bg-card);border:1px solid var(--green);border-radius:12px;display:flex;align-items:center;gap:10px;font-size:14px;z-index:200;animation:slideUp 0.3s ease}@keyframes slideUp{from{transform:translateY(20px);opacity:0}}
.speed-badge{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;background:linear-gradient(135deg,rgba(0,229,255,0.15),rgba(0,229,255,0.05));border:1px solid rgba(0,229,255,0.3);border-radius:20px;font-size:12px;font-weight:600;color:var(--cyan)}.speed-badge.liquidation{background:linear-gradient(135deg,rgba(255,145,0,0.15),rgba(255,145,0,0.05));border-color:rgba(255,145,0,0.3);color:var(--orange)}
.inline-input{background:var(--bg-primary);border:1px solid var(--border);border-radius:6px;padding:6px 10px;color:var(--text-primary);font-size:13px;font-family:'Outfit',sans-serif;outline:none;width:100%}.inline-input:focus{border-color:var(--cyan)}
.inline-select{background:var(--bg-primary);border:1px solid var(--border);border-radius:6px;padding:6px 10px;color:var(--text-primary);font-size:13px;font-family:'Outfit',sans-serif;cursor:pointer}.inline-select:focus{border-color:var(--cyan)}
.edit-row{background:var(--bg-card-hover)}
.attention-card{background:linear-gradient(135deg,rgba(255,82,82,0.1),transparent);border-color:rgba(255,82,82,0.3)}
.chart-container{height:120px;display:flex;align-items:flex-end;gap:4px;padding:10px 0}.chart-bar{flex:1;background:linear-gradient(to top,var(--cyan),rgba(0,229,255,0.3));border-radius:4px 4px 0 0;min-height:4px;position:relative;display:flex;justify-content:center}.chart-bar.orange{background:linear-gradient(to top,var(--orange),rgba(255,145,0,0.3))}.chart-value{position:absolute;top:-18px;font-size:11px;font-weight:600;color:var(--cyan)}
.chart-labels{display:flex;justify-content:space-between;font-size:10px;color:var(--text-muted)}
.back-btn{display:inline-flex;align-items:center;gap:8px;padding:8px 16px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;color:var(--text-secondary);font-size:14px;cursor:pointer;font-family:'Outfit',sans-serif}.back-btn:hover{border-color:var(--cyan);color:var(--cyan)}
.client-card{background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:20px;cursor:pointer}.client-card:hover{border-color:var(--orange)}
.deals-theme{--deals-green:#00e676;--deals-green-dim:#00c853;--deals-green-glow:rgba(0,230,118,0.15)}
.deals-header{background:linear-gradient(135deg,rgba(0,230,118,0.1),transparent);border-bottom:1px solid rgba(0,230,118,0.2)}
.deals-card{background:linear-gradient(135deg,rgba(0,230,118,0.05),var(--bg-card));border:1px solid rgba(0,230,118,0.2);border-radius:14px;padding:20px;transition:all 0.2s}.deals-card:hover{border-color:var(--deals-green);transform:translateY(-2px)}
.deals-stat::before{background:linear-gradient(90deg,var(--deals-green),transparent)!important}
.btn-primary.deals{background:var(--deals-green);color:#000}.btn-primary.deals:hover{background:var(--deals-green-dim)}
.deals-badge{background:rgba(0,230,118,0.15);color:var(--deals-green);padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600}
.deal-row{background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:12px;transition:all 0.2s}.deal-row:hover{border-color:rgba(0,230,118,0.4);background:rgba(0,230,118,0.02)}
.deal-metric{text-align:center;padding:8px 12px}.deal-metric-value{font-size:18px;font-weight:700;font-family:'JetBrains Mono',monospace}.deal-metric-label{font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-top:2px}
.deal-metric.profit .deal-metric-value{color:var(--deals-green)}.deal-metric.roi .deal-metric-value{color:var(--cyan)}
.date-picker{display:flex;align-items:center;gap:12px;background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:8px 16px}.date-picker input{background:none;border:none;color:var(--text-primary);font-size:16px;font-family:'Outfit',sans-serif;outline:none}
.service-tab.deals{color:var(--deals-green)}.service-tab.active.deals{background:linear-gradient(135deg,var(--deals-green),var(--deals-green-dim));color:#000;border-color:var(--deals-green);font-weight:700}
`;

// Helpers
const PREP_STATUSES = ["in_transit", "partial_delivery", "delivered", "prepped", "collected"];
const ATTENTION_REASONS = ["Damaged", "Gated", "Missing Items", "Wrong Product", "Other"];

function formatDate(d) { if (!d) return "—"; return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
function formatShortDate(d) { if (!d) return "—"; return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }); }
function getPayoutDate(soldDate) {
  if (!soldDate) return null;
  const d = new Date(soldDate);
  // End of the month AFTER the sale month — e.g. sold April → end of May
  return new Date(d.getFullYear(), d.getMonth() + 2, 0);
}
function calculatePayout(item) {
  if (!item.sale_price) return { payout: 0, totalFees: 0 };
  const sale = parseFloat(item.sale_price) || 0;
  const ebay = parseFloat(item.ebay_fees) || 0;
  const ship = parseFloat(item.shipping) || 0;
  const net = sale - ebay - ship;
  const rate = sale >= 200 ? 0.10 : 0.15;
  const comm = net * rate;
  const fixed = (item.fee_prep ? 0.40 : 0) + (item.fee_bundle ? 0.30 : 0) + (item.fee_oversize ? 1.00 : 0);
  return { payout: net - comm - fixed, totalFees: ebay + ship + comm + fixed };
}
function getDailyData(items, field, days = 7) {
  const result = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    const dayItems = items.filter(x => x[field] === ds);
    result.push({ date: ds, count: dayItems.length, label: d.toLocaleDateString("en-GB", { weekday: "short" }) });
  }
  return result;
}
function getMonthlyData(items, field, months = 12) {
  const result = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear(), month = d.getMonth();
    const monthItems = items.filter(x => {
      if (!x[field]) return false;
      const fd = new Date(x[field]);
      return fd.getFullYear() === year && fd.getMonth() === month;
    });
    const totalSales = monthItems.reduce((sum, x) => sum + (parseFloat(x.sale_price) || 0), 0);
    const totalPayout = monthItems.reduce((sum, x) => sum + (parseFloat(x.payout) || 0), 0);
    result.push({ label: d.toLocaleDateString("en-GB", { month: "short" }), fullLabel: d.toLocaleDateString("en-GB", { month: "long", year: "numeric" }), count: monthItems.length, totalSales, totalPayout });
  }
  return result;
}

function getDailySales(items, field, days, fromDate) {
  const result = [];
  let base;
  if (fromDate) {
    base = new Date(fromDate);
  } else {
    base = new Date();
    base.setDate(base.getDate() - (days - 1));
  }
  base.setHours(0, 0, 0, 0);
  for (let i = 0; i < days; i++) {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
    const dayItems = items.filter(function (x) {
      if (!x[field]) return false;
      const fd = new Date(x[field]);
      return fd.getFullYear() === d.getFullYear() && fd.getMonth() === d.getMonth() && fd.getDate() === d.getDate();
    });
    const totalSales = dayItems.reduce(function (sum, x) { return sum + (parseFloat(x.sale_price) || 0); }, 0);
    const totalPayout = dayItems.reduce(function (sum, x) { return sum + (parseFloat(x.payout) || 0); }, 0);
    result.push({
      label: d.toLocaleDateString("en-GB", { weekday: "short" }),
      fullLabel: d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" }),
      count: dayItems.length,
      totalSales: totalSales,
      totalPayout: totalPayout
    });
  }
  return result;
}

function getWeeklySales(items, field, weeks) {
  const result = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  for (let i = weeks - 1; i >= 0; i--) {
    const end = new Date(now);
    end.setDate(now.getDate() - i * 7);
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    const weekItems = items.filter(function (x) {
      if (!x[field]) return false;
      const fd = new Date(x[field]);
      fd.setHours(0, 0, 0, 0);
      return fd >= start && fd <= end;
    });
    const totalSales = weekItems.reduce(function (sum, x) { return sum + (parseFloat(x.sale_price) || 0); }, 0);
    const totalPayout = weekItems.reduce(function (sum, x) { return sum + (parseFloat(x.payout) || 0); }, 0);
    result.push({
      label: start.getDate() + "/" + (start.getMonth() + 1),
      fullLabel: "Week of " + start.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      count: weekItems.length,
      totalSales: totalSales,
      totalPayout: totalPayout
    });
  }
  return result;
}

function sortByStatus(items, completed = ["collected", "prepped"]) {
  return [...items].sort((a, b) => {
    const ac = completed.includes(a.status), bc = completed.includes(b.status);
    if (ac && !bc) return 1; if (!ac && bc) return -1;
    return new Date(b.date_added || b.created_at) - new Date(a.date_added || a.created_at);
  });
}

function Toast({ message, onClose }) { useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]); return <div className="toast"><Icons.Check /> {message}</div>; }
function StatusBadge({ status }) { 
  const label = status?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()); 
  const cssClass = status === "partial_delivery" ? "partial_delivery" : status?.replace(/_/g, "") || "transit";
  return <span className={`badge badge-${cssClass}`}>{label}</span>; 
}
function ProductWithImage({ name, asin }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [show, setShow] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  
  const handleMouseMove = (e) => {
    const x = Math.min(e.clientX + 15, window.innerWidth - 180);
    const y = Math.min(e.clientY + 15, window.innerHeight - 180);
    setPos({ x, y });
  };
  
  if (!asin) return <span style={{ fontWeight: 600 }}>{name}</span>;
  
  const imgUrl = `https://m.media-amazon.com/images/P/${asin}.jpg`;
  
  return (
    <span 
      style={{ fontWeight: 600, cursor: 'pointer' }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => { setShow(false); setImgLoaded(false); }}
    >
      {name}
      {show && (
        <div style={{
          position: 'fixed',
          left: pos.x,
          top: pos.y,
          zIndex: 9999,
          pointerEvents: 'none',
          background: '#1a1a2e',
          border: '1px solid #2a2a4e',
          borderRadius: 10,
          padding: 8,
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
          display: imgLoaded ? 'block' : 'none'
        }}>
          <img 
            src={imgUrl} 
            alt={name}
            onLoad={() => setImgLoaded(true)}
            onError={(e) => e.target.style.display = 'none'}
            style={{ width: 150, height: 150, objectFit: 'contain', background: '#fff', borderRadius: 6 }}
          />
        </div>
      )}
    </span>
  );
}
function AsinWithImage({ asin }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [show, setShow] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  
  const handleMouseMove = (e) => {
    const x = Math.min(e.clientX + 15, window.innerWidth - 180);
    const y = Math.min(e.clientY + 15, window.innerHeight - 180);
    setPos({ x, y });
  };
  
  if (!asin) return <span>—</span>;
  
  const imgUrl = `https://m.media-amazon.com/images/P/${asin}.jpg`;
  
  return (
    <span 
      style={{ cursor: 'pointer', color: 'var(--cyan)' }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => { setShow(false); setImgLoaded(false); }}
    >
      {asin}
      {show && (
        <div style={{
          position: 'fixed',
          left: pos.x,
          top: pos.y,
          zIndex: 9999,
          pointerEvents: 'none',
          background: '#1a1a2e',
          border: '1px solid #2a2a4e',
          borderRadius: 10,
          padding: 8,
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
          display: imgLoaded ? 'block' : 'none'
        }}>
          <img 
            src={imgUrl} 
            alt={asin}
            onLoad={() => setImgLoaded(true)}
            onError={(e) => e.target.style.display = 'none'}
            style={{ width: 150, height: 150, objectFit: 'contain', background: '#fff', borderRadius: 6 }}
          />
        </div>
      )}
    </span>
  );
}
function MiniChart({ data, color }) {
  const max = Math.max(...data.map(d => d.count), 1);
  return <div><div className="chart-container">{data.map((d, i) => <div key={i} className={`chart-bar ${color}`} style={{ height: `${(d.count / max) * 100}%` }} />)}</div><div className="chart-labels">{data.map((d, i) => <span key={i}>{d.label}</span>)}</div></div>;
}

function LiquidationMonthlyChart({ data }) {
  const [tooltip, setTooltip] = useState(null);
  const maxSales = Math.max(...data.map(d => d.totalSales), 1);
  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 120, padding: "0 4px" }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end", position: "relative" }}
            onMouseEnter={e => setTooltip({ i, x: e.currentTarget.getBoundingClientRect().left, d })}
            onMouseLeave={() => setTooltip(null)}>
            <div style={{ width: "100%", background: d.totalSales > 0 ? "var(--orange)" : "var(--border)", borderRadius: "4px 4px 0 0", height: `${Math.max((d.totalSales / maxSales) * 100, d.totalSales > 0 ? 4 : 2)}%`, transition: "opacity 0.15s", opacity: tooltip?.i === i ? 0.8 : 1, cursor: "pointer" }} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 4, marginTop: 6, padding: "0 4px" }}>
        {data.map((d, i) => <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 10, color: "var(--text-muted)", overflow: "hidden" }}>{d.label}</div>)}
      </div>
      {tooltip && (
        <div style={{ position: "fixed", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px", fontSize: 12, zIndex: 999, pointerEvents: "none", left: Math.min(tooltip.x, window.innerWidth - 180), top: "auto", transform: "translateY(-140px)", boxShadow: "0 4px 20px rgba(0,0,0,0.3)", minWidth: 160 }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: "var(--text-primary)" }}>{tooltip.d.fullLabel}</div>
          <div style={{ color: "var(--text-muted)" }}>Sales: <span style={{ color: "var(--orange)", fontWeight: 600 }}>{tooltip.d.count}</span></div>
          <div style={{ color: "var(--text-muted)" }}>Revenue: <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>£{tooltip.d.totalSales.toFixed(2)}</span></div>
          <div style={{ color: "var(--text-muted)" }}>Payout: <span style={{ color: "var(--green)", fontWeight: 600 }}>£{tooltip.d.totalPayout.toFixed(2)}</span></div>
        </div>
      )}
    </div>
  );
}

// Auth
function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  if (showSignup) return <SignupPage onBack={() => setShowSignup(false)} />;

  const handleLogin = async () => { setError(""); setLoading(true); try { await signIn(email, password); } catch (e) { setError(e.message); } setLoading(false); };

  const handleForgot = async () => {
    if (!forgotEmail) return;
    setForgotLoading(true);
    await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY },
      body: JSON.stringify({ email: forgotEmail })
    });
    setForgotSent(true);
    setForgotLoading(false);
  };

  if (showForgot) return (
    <div className="auth-wrapper"><div className="auth-card">
      <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", marginBottom: 32 }}><div className="sidebar-logo-icon">DBH</div><div><div style={{ fontWeight: 800, fontSize: 22 }}>DBH LIQUIDATION</div><div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: 2 }}>CLIENT PORTAL</div></div></div>
      <div className="auth-title">Reset Password</div>
      <div className="auth-sub">Enter your email and we'll send you a reset link</div>
      {forgotSent ? <div style={{ background: "rgba(0,230,118,0.1)", border: "1px solid rgba(0,230,118,0.3)", borderRadius: 10, padding: 16, marginTop: 16, color: "var(--green)", textAlign: "center" }}>Check your email for a reset link!</div>
      : <>
        <div className="input-group" style={{ marginTop: 16 }}><label className="input-label">Email</label><input className="input" type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleForgot()} /></div>
        <button className="btn btn-primary auth-btn" onClick={handleForgot} disabled={forgotLoading}>{forgotLoading ? "Sending..." : "Send Reset Link"}</button>
      </>}
      <div className="auth-footer"><span className="auth-link" onClick={() => setShowForgot(false)}>← Back to Sign In</span></div>
    </div></div>
  );

  return (
    <div className="auth-wrapper"><div className="auth-card">
      <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", marginBottom: 32 }}><div className="sidebar-logo-icon">DBH</div><div><div style={{ fontWeight: 800, fontSize: 22 }}>DBH LIQUIDATION</div><div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: 2 }}>CLIENT PORTAL</div></div></div>
      <div className="auth-title">Welcome back</div><div className="auth-sub">Sign in to manage your inventory</div>
      {error && <div className="auth-error">{error}</div>}
      <div className="input-group"><label className="input-label">Email</label><input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} /></div>
      <div className="input-group"><label className="input-label">Password</label><input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} /></div>
      <button className="btn btn-primary auth-btn" onClick={handleLogin} disabled={loading}>{loading ? "Signing in..." : "Sign In"}</button>
      <div style={{ textAlign: "center", marginTop: 8 }}><span className="auth-link" style={{ fontSize: 13 }} onClick={() => setShowForgot(true)}>Forgot password?</span></div>
      <div className="auth-footer">Don't have an account? <span className="auth-link" onClick={() => setShowSignup(true)}>Sign Up</span></div>
    </div></div>
  );
}
function SignupPage({ onBack }) {
  const { signUp } = useAuth();
  const [form, setForm] = useState({ full_name: "", company_name: "", email: "", password: "" });
  const [error, setError] = useState(""); const [success, setSuccess] = useState(""); const [loading, setLoading] = useState(false);
  const update = f => e => setForm({ ...form, [f]: e.target.value });
  const handleSignup = async () => {
    setError(""); setSuccess("");
    if (!form.full_name || !form.email || !form.password) return setError("Fill required fields");
    if (form.password.length < 6) return setError("Password min 6 chars");
    setLoading(true);
    try { 
      const d = await signUp(form.email, form.password, { full_name: form.full_name, company_name: form.company_name }); 
      if (d.access_token) {
        // Auto logged in, will redirect
      } else {
        setSuccess("Account created! You can now sign in.");
        setTimeout(() => onBack(), 2000);
      }
    } catch (e) { setError(e.message); }
    setLoading(false);
  };
  return (
    <div className="auth-wrapper"><div className="auth-card">
      <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", marginBottom: 32 }}><div className="sidebar-logo-icon">DBH</div><div><div style={{ fontWeight: 800, fontSize: 22 }}>DBH LIQUIDATION</div><div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: 2 }}>CLIENT PORTAL</div></div></div>
      <div className="auth-title">Create account</div><div className="auth-sub">Get started in seconds</div>
      {error && <div className="auth-error">{error}</div>}{success && <div className="auth-info">{success}</div>}
      <div className="input-group"><label className="input-label">Full Name *</label><input className="input" value={form.full_name} onChange={update("full_name")} /></div>
      <div className="input-group"><label className="input-label">Company</label><input className="input" value={form.company_name} onChange={update("company_name")} /></div>
      <div className="input-group"><label className="input-label">Email *</label><input className="input" type="email" value={form.email} onChange={update("email")} /></div>
      <div className="input-group"><label className="input-label">Password *</label><input className="input" type="password" value={form.password} onChange={update("password")} onKeyDown={e => e.key === "Enter" && handleSignup()} /></div>
      <button className="btn btn-primary auth-btn" onClick={handleSignup} disabled={loading}>{loading ? "Creating..." : "Create Account"}</button>
      <div className="auth-footer">Have an account? <span className="auth-link" onClick={onBack}>Sign In</span></div>
    </div></div>
  );
}

// ============ CLIENT PREP PAGES ============
function PrepDashboard({ parcels, billingPeriods, shipments = [], onNavigate }) {
  const needsAttention = parcels.filter(p => p.needs_attention);
  const thisMonth = new Date().getMonth(), thisYear = new Date().getFullYear();
  const thisMonthShipments = shipments.filter(s => {
    const d = new Date(s.date_shipped || s.created_at);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });
  const thisMonthTotal = thisMonthShipments.reduce((sum, s) => {
    const units = (parseFloat(s.units_prepped) || 0) * (parseFloat(s.unit_cost) || 0);
    return sum + units + (parseFloat(s.box_count)||0)*(parseFloat(s.box_cost)||0) + (parseFloat(s.other_fees) || 0);
  }, 0);
  const thisMonthUnits = thisMonthShipments.reduce((sum, s) => sum + (parseInt(s.units_prepped) || 0), 0);
  
  // Get daily units prepped from shipments for last 7 days
  const getDailyUnitsPrepped = () => {
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toISOString().split("T")[0];
      const dayShipments = shipments.filter(s => {
        const sd = (s.date_shipped || s.created_at || "").split("T")[0];
        return sd === ds;
      });
      const units = dayShipments.reduce((sum, s) => sum + (parseInt(s.units_prepped) || 0), 0);
      result.push({ date: ds, count: units, label: d.toLocaleDateString("en-GB", { weekday: "short" }) });
    }
    return result;
  };
  const dailyUnits = getDailyUnitsPrepped();
  const weekTotal = dailyUnits.reduce((sum, d) => sum + d.count, 0);
  
  // Count UNITS not parcels
  const inTransitParcels = parcels.filter(p => p.status === "in_transit" || p.status === "partial_delivery");
  const inTransitUnits = inTransitParcels.reduce((sum, p) => sum + (parseInt(p.quantity) || 0), 0);
  const inWarehouseParcels = parcels.filter(p => p.status === "delivered");
  const inWarehouseUnits = inWarehouseParcels.reduce((sum, p) => sum + (parseInt(p.qty_received) || parseInt(p.quantity) || 0), 0);
  const preppedParcels = parcels.filter(p => p.status === "prepped");
  const preppedUnits = preppedParcels.reduce((sum, p) => sum + (parseInt(p.qty_received) || parseInt(p.quantity) || 0), 0);
  
  return (
    <><div className="page-header"><div><div className="page-title">Prep Dashboard</div><div className="page-subtitle">Overview of your FBA prep activity</div></div><div className="speed-badge"><Icons.Zap /> 24-48hr Turnaround</div></div>
    <div className="page-body">
      <div className="stats-grid">
        <div className="card stat-card"><div className="card-title">In Transit</div><div className="stat-value" style={{ color: "var(--purple)" }}>{inTransitUnits}</div><div className="stat-label">units</div></div>
        <div className="card stat-card"><div className="card-title">In Warehouse</div><div className="stat-value" style={{ color: "var(--cyan)" }}>{inWarehouseUnits}</div><div className="stat-label">units</div></div>
        <div className="card stat-card"><div className="card-title">Prepped</div><div className="stat-value" style={{ color: "var(--green)" }}>{preppedUnits}</div><div className="stat-label">units</div></div>
        <div className="card stat-card"><div className="card-title">This Month</div><div className="stat-value" style={{ color: "var(--amber)" }}>£{thisMonthTotal.toFixed(2)}</div><div className="stat-label">billing</div></div>
      </div>
      {needsAttention.length > 0 && <div className="card attention-card" style={{ marginBottom: 24, cursor: "pointer" }} onClick={() => onNavigate && onNavigate("inventory")}><div className="card-title" style={{ color: "var(--red)", display: "flex", alignItems: "center", gap: 8 }}><Icons.AlertTriangle /> Needs Attention ({needsAttention.length})</div><div style={{ marginTop: 12 }}>{needsAttention.map(p => <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}><div><div style={{ fontWeight: 600 }}>{p.product_name}</div><div style={{ fontSize: 12, color: "var(--text-muted)" }}>{p.quantity} units</div>{p.admin_notes && <div style={{ fontSize: 12, color: "var(--amber)", marginTop: 4 }}>📝 {p.admin_notes}</div>}</div><span className="badge badge-attention">{p.attention_reason}</span></div>)}</div><div style={{ marginTop: 12, fontSize: 12, color: "var(--text-muted)" }}>Click to view in inventory →</div></div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="card-title">Units Prepped (7 Days)</div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--cyan)" }}>{weekTotal}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>week total</div>
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <div className="chart-container">{dailyUnits.map((d, i) => {
              const max = Math.max(...dailyUnits.map(x => x.count), 1);
              return <div key={i} className="chart-bar" style={{ height: `${(d.count / max) * 100}%` }}><span className="chart-value">{d.count > 0 ? d.count : ""}</span></div>;
            })}</div>
            <div className="chart-labels">{dailyUnits.map((d, i) => <span key={i}>{d.label}</span>)}</div>
          </div>
          <div style={{ marginTop: 12, padding: "10px", background: "var(--bg-primary)", borderRadius: 8, display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>This month</span>
            <span style={{ fontWeight: 700, color: "var(--green)" }}>{thisMonthUnits} units</span>
          </div>
        </div>
        <div className="card"><div className="card-title">Recent Parcels</div>{parcels.length === 0 ? <div style={{ color: "var(--text-muted)", marginTop: 12 }}>No parcels yet.</div> : <div style={{ marginTop: 12 }}>{parcels.slice(0, 5).map(p => <div key={p.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}><div><ProductWithImage name={p.product_name} asin={p.asin} /><div style={{ fontSize: 12, color: "var(--text-muted)" }}>{p.quantity} units</div></div>{p.needs_attention ? <span className="badge badge-attention">{p.attention_reason}</span> : <StatusBadge status={p.status} />}</div>)}</div>}</div>
      </div>
    </div></>
  );
}

function PrepAddOrderPage({ token, onRefresh, showToast }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ product_name: "", sku: "", asin: "", quantity: 1, prep_type: "standard", supplier: "", tracking_number: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const update = f => e => setForm({ ...form, [f]: e.target.value });
  const handleSubmit = async () => {
    if (!form.product_name) return; setSaving(true);
    await supabase.from("parcels", token).insert({ ...form, quantity: parseInt(form.quantity) || 1, user_id: user.id, status: "in_transit", date_added: new Date().toISOString().split('T')[0] });
    showToast("Order added!"); setForm({ product_name: "", sku: "", asin: "", quantity: 1, prep_type: "standard", supplier: "", tracking_number: "", notes: "" }); onRefresh(); setSaving(false);
  };
  return (
    <><div className="page-header"><div><div className="page-title">Add New Order</div><div className="page-subtitle">Submit stock for FBA prep</div></div></div>
    <div className="page-body"><div className="card" style={{ maxWidth: 600 }}>
      <div className="input-group"><label className="input-label">Product Name *</label><input className="input" placeholder="e.g. Wireless Earbuds" value={form.product_name} onChange={update("product_name")} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}><div className="input-group"><label className="input-label">SKU</label><input className="input" value={form.sku} onChange={update("sku")} /></div><div className="input-group"><label className="input-label">ASIN</label><input className="input" value={form.asin} onChange={update("asin")} /></div></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}><div className="input-group"><label className="input-label">Quantity</label><input className="input" type="number" min="1" value={form.quantity} onChange={update("quantity")} /></div><div className="input-group"><label className="input-label">Prep Type</label><select className="input" value={form.prep_type} onChange={update("prep_type")}><option value="standard">Standard</option><option value="bundle">Bundle</option><option value="oversize">Oversize</option></select></div></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}><div className="input-group"><label className="input-label">Supplier</label><input className="input" value={form.supplier} onChange={update("supplier")} /></div><div className="input-group"><label className="input-label">Tracking</label><input className="input" value={form.tracking_number} onChange={update("tracking_number")} /></div></div>
      <div className="input-group"><label className="input-label">Notes</label><input className="input" value={form.notes} onChange={update("notes")} /></div>
      <button className="btn btn-primary" onClick={handleSubmit} disabled={saving || !form.product_name}>{saving ? "Submitting..." : "Submit Order"}</button>
    </div></div></>
  );
}

function PrepInventoryPage({ parcels, token, onRefresh, showToast }) {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const sorted = sortByStatus(parcels);
  const filtered = sorted.filter(p => p.product_name?.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase()));
  const startEdit = item => { setEditingId(item.id); setEditData({ product_name: item.product_name || "", sku: item.sku || "", asin: item.asin || "", quantity: item.quantity || 1, tracking_number: item.tracking_number || "" }); };
  const saveEdit = async () => { setSaving(true); await fetch(`${SUPABASE_URL}/rest/v1/parcels?id=eq.${editingId}`, { method: "PATCH", headers: { ...supabase.headers(token), "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify(editData) }); showToast("Saved!"); setEditingId(null); onRefresh(); setSaving(false); };
  const deleteItem = async (id, status) => { 
    if (["collected", "prepped", "delivered"].includes(status)) {
      alert("Cannot delete items that have been delivered, prepped or shipped.");
      return;
    }
    if (!confirm("Delete?")) return; 
    await fetch(`${SUPABASE_URL}/rest/v1/parcels?id=eq.${id}`, { method: "DELETE", headers: supabase.headers(token) }); 
    showToast("Deleted!"); 
    onRefresh(); 
  };
  const canEdit = (status) => !["collected", "prepped"].includes(status);
  const canDelete = (status) => !["collected", "prepped", "delivered"].includes(status);
  return (
    <><div className="page-header"><div><div className="page-title">My Inventory</div><div className="page-subtitle">Your prep orders</div></div></div>
    <div className="page-body">
      <div style={{ marginBottom: 20 }}><div className="search-bar"><Icons.Search /><input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} /></div></div>
      {filtered.length === 0 ? <div className="card empty-state"><Icons.Package /><p>No parcels found.</p></div> :
      <div className="card" style={{ padding: 0, overflow: "hidden" }}><div className="table-wrap"><table>
        <thead><tr><th>Date</th><th>Product</th><th>SKU</th><th>ASIN</th><th>Qty</th><th>Tracking</th><th>Status</th><th></th></tr></thead>
        <tbody>{filtered.map(p => {
          const isEdit = editingId === p.id, data = isEdit ? editData : p, done = ["collected", "prepped"].includes(p.status);
          return <tr key={p.id} className={isEdit ? "edit-row" : ""} style={done ? { opacity: 0.6 } : {}}>
            <td style={{ fontSize: 12 }}>{formatShortDate(p.date_added)}</td>
            <td>{isEdit ? <input className="inline-input" value={data.product_name} onChange={e => setEditData({ ...editData, product_name: e.target.value })} /> : <ProductWithImage name={p.product_name} asin={p.asin} />}</td>
            <td className="mono">{isEdit ? <input className="inline-input" style={{ width: 80 }} value={data.sku} onChange={e => setEditData({ ...editData, sku: e.target.value })} /> : (p.sku || "—")}</td>
            <td className="mono" style={{ fontSize: 12 }}>{isEdit ? <input className="inline-input" style={{ width: 100 }} value={data.asin} onChange={e => setEditData({ ...editData, asin: e.target.value })} /> : <AsinWithImage asin={p.asin} />}</td>
            <td className="mono">{isEdit ? <input type="number" className="inline-input" style={{ width: 50 }} value={data.quantity} onChange={e => setEditData({ ...editData, quantity: e.target.value })} /> : p.quantity}</td>
            <td className="mono" style={{ fontSize: 12 }}>{isEdit ? <input className="inline-input" style={{ width: 100 }} value={data.tracking_number} onChange={e => setEditData({ ...editData, tracking_number: e.target.value })} /> : (p.tracking_number || "—")}</td>
            <td>{p.needs_attention ? <span className="badge badge-attention">{p.attention_reason}</span> : <StatusBadge status={p.status} />}</td>
            <td>
              {isEdit ? (
                <div style={{ display: "flex", gap: 4 }}>
                  <button className="btn-icon" onClick={saveEdit} disabled={saving}><Icons.Save /></button>
                  <button className="btn-icon btn-danger" onClick={() => setEditingId(null)}><Icons.X /></button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 4 }}>
                  {canEdit(p.status) && <button className="btn-icon" onClick={() => startEdit(p)}><Icons.Edit /></button>}
                  {canDelete(p.status) ? (
                    <button className="btn-icon btn-danger" onClick={() => deleteItem(p.id, p.status)}><Icons.Trash /></button>
                  ) : (
                    <button className="btn-icon" disabled style={{ opacity: 0.3, cursor: "not-allowed" }}><Icons.Trash /></button>
                  )}
                </div>
              )}
            </td>
          </tr>;
        })}</tbody>
      </table></div></div>}
    </div></>
  );
}

function PrepFeesPage() {
  return (
    <><div className="page-header"><div><div className="page-title">Prep Fees</div><div className="page-subtitle">FBA prep pricing</div></div></div>
    <div className="page-body">
      <div className="fee-grid" style={{ marginBottom: 28 }}>{[{ name: "Standard Prep", price: "£0.45", desc: "Label, poly bag" }, { name: "Bundle Prep", price: "£0.65", desc: "Multi-pack bundling" }, { name: "Oversize Prep", price: "£1.50", desc: "Large/heavy items" }].map(f => <div className="fee-card" key={f.name}><div className="fee-price">{f.price} <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 400 }}>+VAT</span></div><div className="fee-name">{f.name}</div><div className="fee-desc">{f.desc}</div></div>)}</div>
      <div className="card"><div className="card-title">Volume Pricing <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-muted)" }}>(Monthly Units)</span></div><div style={{ display: "flex", gap: 16, marginTop: 12 }}>{[{ r: "1–500 units", p: "£0.45" }, { r: "501–1000 units", p: "£0.40" }, { r: "1001+ units", p: "£0.35" }].map(v => <div key={v.r} style={{ flex: 1, padding: "12px 16px", background: "var(--bg-primary)", borderRadius: 10, border: "1px solid var(--border)" }}><div style={{ fontWeight: 700, color: "var(--cyan)" }}>{v.p} <span style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 400 }}>+VAT</span></div><div style={{ fontSize: 13, color: "var(--text-muted)" }}>{v.r}</div></div>)}</div></div>
    </div></>
  );
}

function PrepBillingPage({ billingPeriods, invoices = [], shipments = [], token }) {
  const now = new Date(), thisMonth = now.getMonth(), thisYear = now.getFullYear();
  const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1, lastYear = thisMonth === 0 ? thisYear - 1 : thisYear;
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  const calcTotal = (s) => {
    const units = (parseFloat(s.units_prepped) || 0) * (parseFloat(s.unit_cost) || 0);
    const boxes = (parseFloat(s.box_count)||0) * (parseFloat(s.box_cost)||0);
    const other = parseFloat(s.other_fees) || 0;
    return units + boxes + other;
  };
  
  const thisMonthShipments = shipments.filter(s => {
    const d = new Date(s.date_shipped || s.created_at);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });
  const lastMonthShipments = shipments.filter(s => {
    const d = new Date(s.date_shipped || s.created_at);
    return d.getMonth() === lastMonth && d.getFullYear() === lastYear;
  });
  
  const thisMonthTotal = thisMonthShipments.reduce((sum, s) => sum + calcTotal(s), 0);
  const thisMonthUnits = thisMonthShipments.reduce((sum, s) => sum + (s.units_prepped || 0), 0);
  const lastMonthTotal = lastMonthShipments.reduce((sum, s) => sum + calcTotal(s), 0);
  
  const pendingInvoices = invoices.filter(i => i.status === "pending" || i.status === "overdue");
  const amountDue = pendingInvoices.reduce((sum, i) => sum + parseFloat(i.amount), 0);
  const paidInvoices = invoices.filter(i => i.status === "paid");
  const totalPaid = paidInvoices.reduce((sum, i) => sum + parseFloat(i.amount), 0);
  
  return (
    <><div className="page-header"><div><div className="page-title">Billing</div><div className="page-subtitle">Your prep billing</div></div></div>
    <div className="page-body">
      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="card stat-card"><div className="card-title">{monthNames[thisMonth]} (Current)</div><div className="stat-value" style={{ color: "var(--cyan)" }}>£{thisMonthTotal.toFixed(2)}</div><div className="stat-label">{thisMonthUnits} units</div></div>
        <div className="card stat-card"><div className="card-title">Amount Due</div><div className="stat-value" style={{ color: amountDue > 0 ? "var(--amber)" : "var(--green)" }}>£{amountDue.toFixed(2)}</div></div>
        <div className="card stat-card"><div className="card-title">Total Paid</div><div className="stat-value" style={{ color: "var(--green)" }}>£{totalPaid.toFixed(2)}</div></div>
      </div>
      
      {pendingInvoices.length > 0 && (
        <div className="card" style={{ marginBottom: 24, borderColor: "var(--amber)" }}>
          <div className="card-title" style={{ color: "var(--amber)" }}>📋 Invoices Due</div>
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table>
              <thead><tr><th>Period</th><th>Amount</th><th>Status</th><th>Invoice</th></tr></thead>
              <tbody>{pendingInvoices.map(inv => (
                <tr key={inv.id}>
                  <td style={{ fontWeight: 600 }}>{monthNames[inv.period_month - 1]} {inv.period_year} Fee</td>
                  <td className="mono" style={{ fontWeight: 700, color: "var(--amber)" }}>£{parseFloat(inv.amount).toFixed(2)}</td>
                  <td><span className={`badge badge-${inv.status === "overdue" ? "attention" : "pending"}`}>{inv.status}</span></td>
                  <td>{inv.invoice_url ? <a href={inv.invoice_url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--cyan)" }}>View Invoice</a> : "—"}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
      
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title">Payment History</div>
        {paidInvoices.length === 0 ? <div style={{ color: "var(--text-muted)", marginTop: 12 }}>No paid invoices yet.</div> :
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table>
            <thead><tr><th>Period</th><th>Amount</th><th>Paid Date</th><th>Invoice</th></tr></thead>
            <tbody>{paidInvoices.map(inv => (
              <tr key={inv.id}>
                <td style={{ fontWeight: 600 }}>{monthNames[inv.period_month - 1]} {inv.period_year} Fee</td>
                <td className="mono" style={{ color: "var(--green)" }}>£{parseFloat(inv.amount).toFixed(2)}</td>
                <td style={{ fontSize: 12 }}>{inv.paid_at ? formatShortDate(inv.paid_at) : "—"}</td>
                <td>{inv.invoice_url ? <a href={inv.invoice_url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--cyan)" }}>View Invoice</a> : "—"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>}
      </div>
      
      <div className="card">
        <div className="card-title">This Month's Shipments</div>
        {thisMonthShipments.length === 0 ? <div style={{ color: "var(--text-muted)", marginTop: 12 }}>No shipments this month.</div> : 
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table>
            <thead><tr><th>Date</th><th>Shipment</th><th>Units</th><th>Amount</th></tr></thead>
            <tbody>{thisMonthShipments.map(s => (
              <tr key={s.id}>
                <td style={{ fontSize: 12 }}>{formatShortDate(s.date_shipped || s.created_at)}</td>
                <td className="mono">{s.shipment_id}</td>
                <td className="mono">{s.units_prepped || 0}</td>
                <td className="mono" style={{ color: "var(--cyan)" }}>£{calcTotal(s).toFixed(2)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>}
      </div>
    </div></>
  );
}

// ============ CLIENT LIQUIDATION PAGES ============
function LiquidationDashboard({ liquidationStock, liquidationSales, liquidationReturns, removalUnits = [] }) {
  const sales = liquidationSales || [];
  // Treat sold removal_units as sales for payout/stat purposes
  const removalSales = removalUnits.filter(u => u.status === "sold").map(u => ({
    id: `r-${u.id}`,
    _isRemoval: true,
    date_sold: u.date_sold,
    product_name_snapshot: u.product_name || u.sku || "Removal unit",
    payout: u.payout,
    payout_date: u.payout_date,
    paid: u.paid,
    stock_id: null
  }));
  const allSales = [...sales, ...removalSales];

  const transitFromStock = liquidationStock.filter(i => !i.received);
  const transitFromRemovals = removalUnits.filter(u => !u.received_by_dbh);
  const listedFromStock = liquidationStock.filter(i => i.received && ((i.quantity || 1) - (i.qty_sold || 0)) > 0);
  const listedFromRemovals = removalUnits.filter(u => u.received_by_dbh && u.status !== "sold");

  const transitItems = [...transitFromStock, ...transitFromRemovals];
  const listedItems = [...listedFromStock, ...listedFromRemovals];

  const pendingPayoutGross = allSales.filter(s => !s.paid).reduce((sum, s) => sum + (parseFloat(s.payout) || 0), 0);
  const paidTotal = allSales.filter(s => s.paid).reduce((sum, s) => sum + (parseFloat(s.payout) || 0), 0);
  const totalReturns = (liquidationReturns || []).reduce((sum, r) => sum + (r.count || 0), 0);
  const returnsDeduction = totalReturns * RETURN_COST_PER_UNIT;
  const pendingPayout = Math.max(0, pendingPayoutGross - returnsDeduction);
  const unpaidSales = allSales.filter(s => !s.paid && s.payout_date).sort((a, b) => new Date(a.payout_date) - new Date(b.payout_date));
  const nextSale = unpaidSales[0];
  const monthly = getMonthlyData(allSales.filter(s => s.date_sold), "date_sold", 12);

  const [period, setPeriod] = useState("30d");

  const periodWindow = (() => {
    const now = new Date();
    const end = now;
    let start;
    if (period === "7d") { start = new Date(now); start.setDate(now.getDate() - 7); }
    else if (period === "30d") { start = new Date(now); start.setDate(now.getDate() - 30); }
    else if (period === "mtd") { start = new Date(now.getFullYear(), now.getMonth(), 1); }
    else { start = new Date(now.getFullYear(), 0, 1); } // ytd
    return { start, end };
  })();

  const periodSales = allSales.filter(s => {
    if (!s.date_sold) return false;
    const d = new Date(s.date_sold);
    return d >= periodWindow.start && d <= periodWindow.end;
  });

  // Refunds: liquidation_returns rows keyed by `month` (YYYY-MM). Include any
  // month the window touches.
  const periodReturns = (liquidationReturns || []).filter(r => {
    if (!r.month) return false;
    const m = new Date(r.month + "-01");
    const startMonth = new Date(periodWindow.start.getFullYear(), periodWindow.start.getMonth(), 1);
    const endMonth = new Date(periodWindow.end.getFullYear(), periodWindow.end.getMonth(), 1);
    return m >= startMonth && m <= endMonth;
  });

  const soldCount = periodSales.filter(s => s.payout != null).length;
  const netRevenue = periodSales.reduce((sum, s) => sum + (parseFloat(s.payout) || 0), 0);
  const avgNet = soldCount > 0 ? netRevenue / soldCount : 0;
  const periodReturnsCount = periodReturns.reduce((sum, r) => sum + (r.count || 0), 0);
  const periodRefunds = periodReturnsCount * RETURN_COST_PER_UNIT;

  // Chart buckets per period: 7D=7 days, MTD=days this month, 30D=weeks, YTD=months.
  let periodChart;
  if (period === "7d") {
    periodChart = getDailySales(periodSales, "date_sold", 7);
  } else if (period === "mtd") {
    const _now = new Date();
    const _first = new Date(_now.getFullYear(), _now.getMonth(), 1);
    periodChart = getDailySales(periodSales, "date_sold", _now.getDate(), _first);
  } else if (period === "30d") {
    periodChart = getWeeklySales(periodSales, "date_sold", 5);
  } else {
    periodChart = getMonthlyData(periodSales, "date_sold", new Date().getMonth() + 1);
  }
  const periodTotal = netRevenue;

  const PERIOD_LABELS = { "7d": "last 7 days", "mtd": "this month", "30d": "last 30 days", "ytd": "this year" };

  return (
    <><div className="page-header"><div><div className="page-title">Dashboard</div><div className="page-subtitle">Your liquidation activity at a glance</div></div><div className="speed-badge liquidation"><Icons.TrendingUp /> Track Returns</div></div>
    <div className="page-body">

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))", gap: 14, marginBottom: 28 }}>
        <div className="card" style={{ position: "relative", overflow: "hidden", padding: 16 }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: "var(--amber)" }} />
          <div style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}><span style={{ width: 26, height: 26, borderRadius: 8, background: "rgba(255,176,32,0.15)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--amber)", flex: "none" }}>🚚</span>In transit</div>
          <div style={{ fontSize: 27, fontWeight: 700, lineHeight: 1, color: "var(--amber)" }}>{transitItems.length}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 7 }}>items inbound</div>
        </div>
        <div className="card" style={{ position: "relative", overflow: "hidden", padding: 16 }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: "var(--cyan)" }} />
          <div style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}><span style={{ width: 26, height: 26, borderRadius: 8, background: "rgba(0,229,255,0.12)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--cyan)", flex: "none" }}>📦</span>Listed</div>
          <div style={{ fontSize: 27, fontWeight: 700, lineHeight: 1, color: "var(--cyan)" }}>{listedItems.length}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 7 }}>live on eBay</div>
        </div>
        <div className="card" style={{ position: "relative", overflow: "hidden", padding: 16 }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: "var(--orange)" }} />
          <div style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}><span style={{ width: 26, height: 26, borderRadius: 8, background: "rgba(255,145,0,0.15)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--orange)", flex: "none" }}>⏳</span>Pending payout</div>
          <div style={{ fontSize: 27, fontWeight: 700, lineHeight: 1, color: "var(--orange)" }}>£{pendingPayout.toFixed(2)}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 7 }}>{returnsDeduction > 0 ? `after −£${returnsDeduction.toFixed(2)} refunds` : "before payout"}</div>
        </div>
        <div className="card" style={{ position: "relative", overflow: "hidden", padding: 16 }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: "var(--green)" }} />
          <div style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}><span style={{ width: 26, height: 26, borderRadius: 8, background: "rgba(0,200,120,0.15)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--green)", flex: "none" }}>💰</span>Total paid</div>
          <div style={{ fontSize: 27, fontWeight: 700, lineHeight: 1, color: "var(--green)" }}>£{paidTotal.toFixed(2)}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 7 }}>lifetime</div>
        </div>
      </div>

      {/* Reports */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Reports</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>net figures, {PERIOD_LABELS[period]}</div>
        </div>
        <div style={{ display: "inline-flex", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 9, padding: 3, gap: 2 }}>
          {[["7d","7D"],["mtd","MTD"],["30d","30D"],["ytd","YTD"]].map(([k, lbl]) =>
            <button key={k} onClick={() => setPeriod(k)} style={{ fontSize: 12, fontWeight: period === k ? 700 : 600, padding: "5px 13px", border: "none", borderRadius: 7, cursor: "pointer", background: period === k ? "var(--orange)" : "transparent", color: period === k ? "#000" : "var(--text-secondary)", transition: "all 0.15s" }}>{lbl}</button>
          )}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: 14, marginBottom: 24 }}>
        <div className="card" style={{ padding: "14px 15px" }}><div style={{ fontSize: 11, color: "var(--text-secondary)" }}>Net revenue</div><div style={{ fontSize: 23, fontWeight: 700, marginTop: 5, lineHeight: 1, color: "var(--green)" }}>£{netRevenue.toFixed(2)}</div><div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>your payout</div></div>
        <div className="card" style={{ padding: "14px 15px" }}><div style={{ fontSize: 11, color: "var(--text-secondary)" }}>Units sold</div><div style={{ fontSize: 23, fontWeight: 700, marginTop: 5, lineHeight: 1 }}>{soldCount}</div></div>
        <div className="card" style={{ padding: "14px 15px" }}><div style={{ fontSize: 11, color: "var(--text-secondary)" }}>Refunds</div><div style={{ fontSize: 23, fontWeight: 700, marginTop: 5, lineHeight: 1, color: "var(--red)" }}>−£{periodRefunds.toFixed(2)}</div><div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>{periodReturnsCount} item{periodReturnsCount === 1 ? "" : "s"}</div></div>
        <div className="card" style={{ padding: "14px 15px" }}><div style={{ fontSize: 11, color: "var(--text-secondary)" }}>Avg net / sale</div><div style={{ fontSize: 23, fontWeight: 700, marginTop: 5, lineHeight: 1 }}>£{avgNet.toFixed(2)}</div></div>
      </div>

      {/* Chart + payouts */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: 14, marginBottom: 8 }}>
        <div className="card" style={{ padding: "16px 18px 10px" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Net sales</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--green)" }}>£{periodTotal.toFixed(2)}</div>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>{PERIOD_LABELS[period]}, payout after fees</div>
          <div style={{ maxHeight: 220, overflow: "hidden" }}><LiquidationMonthlyChart data={periodChart} /></div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div className="card" style={{ padding: "14px 16px" }}><div style={{ fontSize: 11, color: "var(--text-secondary)" }}>Payouts due</div><div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color: "var(--orange)" }}>£{pendingPayout.toFixed(2)}</div>{nextSale && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 5 }}>next {formatDate(new Date(nextSale.payout_date))}</div>}</div>
            <div className="card" style={{ padding: "14px 16px" }}><div style={{ fontSize: 11, color: "var(--text-secondary)" }}>Payouts paid</div><div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color: "var(--green)" }}>£{paidTotal.toFixed(2)}</div><div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 5 }}>lifetime</div></div>
          </div>
          <div className="card" style={{ padding: "16px 18px", flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Upcoming payouts</div>
              {unpaidSales.length > 0 && <span style={{ fontSize: 11, color: "var(--text-muted)", background: "var(--bg-card)", padding: "2px 10px", borderRadius: 20 }}>{unpaidSales.length} item{unpaidSales.length === 1 ? "" : "s"}</span>}
            </div>
            {unpaidSales.length === 0
              ? <div style={{ color: "var(--text-muted)", fontSize: 13 }}>No pending payouts.</div>
              : <div style={{ maxHeight: 210, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4, marginRight: -6, paddingRight: 6 }}>
                  {unpaidSales.map(s => {
                    const stockItem = !s._isRemoval ? liquidationStock.find(l => l.id === s.stock_id) : null;
                    const pname = s.product_name_snapshot || stockItem?.product_name || "—";
                    return <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "11px 8px", borderRadius: 9, borderBottom: "1px solid var(--border)" }}>
                      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                        <span style={{ fontSize: 13, lineHeight: 1.3, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pname}</span>
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{formatDate(new Date(s.payout_date))}</span>
                      </div>
                      <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: "var(--green)", whiteSpace: "nowrap", flex: "none", minWidth: 72, textAlign: "right" }}>£{parseFloat(s.payout).toFixed(2)}</span>
                    </div>;
                  })}
                </div>}
          </div>
        </div>
      </div>
    </div></>
  );
}

function LiquidationSendStockPage({ token, onRefresh, showToast }) {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState("single");
  const [form, setForm] = useState({ removal_order_id: "", product_name: "", asin: "", sku: "", condition: "", purchase_price: "", quantity: "1" });
  const [saving, setSaving] = useState(false);
  const update = f => e => setForm({ ...form, [f]: e.target.value });

  // CSV upload state
  const [csvRows, setCsvRows] = useState([]);
  const [csvSkipped, setCsvSkipped] = useState(0);
  const [csvErrors, setCsvErrors] = useState([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [importing, setImporting] = useState(false);

  const dbhSkuPrefix = () => {
    const clientName = (profile?.full_name || user?.email || "CLIENT").split(" ")[0].toUpperCase().replace(/[^A-Z0-9]/g, "");
    const today = new Date();
    const yy = String(today.getFullYear()).slice(-2);
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return { datePart: `${dd}${mm}${yy}`, clientName };
  };

  const getMaxClientSeq = async () => {
    const { clientName } = dbhSkuPrefix();
    const res = await fetch(`${SUPABASE_URL}/rest/v1/liquidation_stock?user_id=eq.${user.id}&dbh_sku=like.*-${clientName}-*&select=dbh_sku`, {
      headers: supabase.headers(token)
    });
    const existing = await res.json();
    let maxSeq = 0;
    if (Array.isArray(existing)) {
      existing.forEach(r => {
        const parts = (r.dbh_sku || "").split("-");
        const seq = parseInt(parts[parts.length - 1]);
        if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
      });
    }
    return maxSeq;
  };

  const generateDbhSku = async () => {
    const { datePart, clientName } = dbhSkuPrefix();
    const maxSeq = await getMaxClientSeq();
    return `${datePart}-${clientName}-${String(maxSeq + 1).padStart(3, "0")}`;
  };

  const handleSubmit = async () => {
    if (!form.product_name) return; setSaving(true);
    try {
      const dbh_sku = await generateDbhSku();
      await supabase.from("liquidation_stock", token).insert({ ...form, dbh_sku, quantity: parseInt(form.quantity) || 1, purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : null, cog: form.purchase_price ? parseFloat(form.purchase_price) : null, user_id: user.id, date_added: new Date().toISOString().split('T')[0] });
      showToast(`Stock submitted! DBH SKU: ${dbh_sku}`); setForm({ removal_order_id: "", product_name: "", asin: "", sku: "", condition: "", purchase_price: "", quantity: "1" }); onRefresh();
    } catch (e) {
      showToast("Error: " + e.message);
    }
    setSaving(false);
  };

  // ---------- CSV upload ----------
  const parseCsv = (text) => {
    // Stream-parse the whole file so newlines INSIDE quoted fields don't break rows.
    const rows = [];
    let cells = [];
    let cur = "";
    let inQ = false;
    const pushCell = () => { cells.push(cur); cur = ""; };
    const pushRow = () => {
      pushCell();
      if (cells.some(c => c.trim() !== "")) rows.push(cells);
      cells = [];
    };
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQ) {
        if (c === '"' && text[i+1] === '"') { cur += '"'; i++; }
        else if (c === '"') inQ = false;
        else cur += c;
      } else {
        if (c === '"') inQ = true;
        else if (c === ',') pushCell();
        else if (c === '\r') { /* ignore, handled by \n */ }
        else if (c === '\n') pushRow();
        else cur += c;
      }
    }
    // flush trailing cell/row (file may not end in newline)
    if (cur !== "" || cells.length > 0) pushRow();
    return rows;
  };

  const parseUkDate = (s) => {
    if (!s || !s.trim()) return null;
    const m = s.trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (!m) return null;
    const [, d, mo, y] = m;
    return `${y.length === 2 ? "20" + y : y}-${mo.padStart(2,"0")}-${d.padStart(2,"0")}`;
  };

  const handleCsvFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCsvFileName(file.name);
    setCsvErrors([]);
    setCsvRows([]);
    setCsvSkipped(0);

    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length < 2) { setCsvErrors(["File is empty or has no data rows."]); return; }

    const headers = rows[0].map(h => h.trim().toLowerCase());
    const idx = (name) => headers.findIndex(h => h === name.toLowerCase());
    const required = ["Product Name"];
    const errs = required.filter(r => idx(r) === -1).map(r => `Missing required column: ${r}`);
    if (errs.length) { setCsvErrors(errs); return; }

    const col = {
      date: idx("Date"),
      removal: idx("Removal Order ID"),
      product: idx("Product Name"),
      asin: idx("ASIN"),
      sku: idx("SKU"),
      lpn: idx("LPN Number"),
      status: idx("Status"),
      dateShipped: idx("Date Shipped"),
      tracking: idx("Tracking"),
      delivered: idx("Delivered"),
      dateDelivered: idx("Date Delivered"),
      driveLink: idx("Google Drive Link"),
      comments: idx("Customer Comments"),
      condition: idx("Condition"),
      uid: idx("UID"),
    };

    const valid = [];
    let skipped = 0;
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r.some(c => c.trim())) { continue; } // empty row
      const product = (r[col.product] || "").trim();
      const lpn = col.lpn >= 0 ? (r[col.lpn] || "").trim() : "";
      const removal = col.removal >= 0 ? (r[col.removal] || "").trim() : "";
      // Skip rows with no product name (placeholder/empty rows)
      if (!product) { skipped++; continue; }
      valid.push({
        date_added: parseUkDate(r[col.date]) || new Date().toISOString().split("T")[0],
        removal_order_id: removal,
        product_name: product,
        asin: (r[col.asin] || "").trim(),
        sku: col.sku >= 0 ? (r[col.sku] || "").trim() : "",
        lpn_number: lpn,
        shipment_status: col.status >= 0 ? (r[col.status] || "").trim() : null,
        date_shipped: col.dateShipped >= 0 ? parseUkDate(r[col.dateShipped]) : null,
        tracking_number: col.tracking >= 0 ? (r[col.tracking] || "").trim() : null,
        received: false,
        date_delivered: col.dateDelivered >= 0 ? parseUkDate(r[col.dateDelivered]) : null,
        google_drive_link: col.driveLink >= 0 ? (r[col.driveLink] || "").trim() : null,
        customer_comments: col.comments >= 0 ? (r[col.comments] || "").trim() : null,
        condition: col.condition >= 0 ? (r[col.condition] || "").trim() : "",
        sheet_uid: col.uid >= 0 ? ((r[col.uid] || "").trim() || null) : null,
        quantity: 1,
      });
    }
    setCsvRows(valid);
    setCsvSkipped(skipped);
  };

  const handleCsvImport = async () => {
    if (csvRows.length === 0) return;
    setImporting(true);
    try {
      // Dedup against existing sheet_uids for this user
      const existingRes = await fetch(`${SUPABASE_URL}/rest/v1/liquidation_stock?user_id=eq.${user.id}&sheet_uid=not.is.null&select=sheet_uid&limit=20000`, {
        headers: supabase.headers(token)
      });
      const existingList = await existingRes.json();
      const existingUids = new Set((Array.isArray(existingList) ? existingList : []).map(r => r.sheet_uid).filter(Boolean));
      const newRows = csvRows.filter(r => !r.sheet_uid || !existingUids.has(r.sheet_uid));
      const dupeCount = csvRows.length - newRows.length;

      if (newRows.length === 0) {
        showToast(`Nothing new — all ${dupeCount} rows already imported.`);
        setCsvRows([]); setCsvSkipped(0); setCsvErrors([]); setCsvFileName("");
        setImporting(false);
        return;
      }

      const { datePart, clientName } = dbhSkuPrefix();
      const maxSeq = await getMaxClientSeq();
      const payload = newRows.map((r, i) => ({
        ...r,
        dbh_sku: `${datePart}-${clientName}-${String(maxSeq + 1 + i).padStart(3, "0")}`,
        user_id: user.id,
      }));
      const batchSize = 50;
      for (let i = 0; i < payload.length; i += batchSize) {
        const batch = payload.slice(i, i + batchSize);
        const r = await fetch(`${SUPABASE_URL}/rest/v1/liquidation_stock`, {
          method: "POST",
          headers: { ...supabase.headers(token), "Content-Type": "application/json", "Prefer": "return=minimal" },
          body: JSON.stringify(batch),
        });
        if (!r.ok) throw new Error(`Batch ${Math.floor(i/batchSize)+1} failed (${r.status})`);
      }
      showToast(`Imported ${newRows.length} items!${dupeCount > 0 ? ` (${dupeCount} skipped — already in your stock)` : ""}`);
      setCsvRows([]); setCsvSkipped(0); setCsvErrors([]); setCsvFileName("");
      onRefresh();
    } catch (e) {
      showToast("Error: " + e.message);
    }
    setImporting(false);
  };

  const templateCsv = "Date,Removal Order ID,Product Name,ASIN,SKU,LPN Number,Status,Date Shipped,Tracking,Delivered,Date Delivered,Google Drive Link,Customer Comments,Condition\n";

  const tabBtn = (id, label) => ({
    flex: 1, padding: "10px 14px", borderRadius: 8,
    border: "1px solid " + (tab === id ? "var(--orange)" : "var(--border)"),
    background: tab === id ? "var(--orange)" : "transparent",
    color: tab === id ? "#000" : "var(--text-primary)",
    fontWeight: 600, cursor: "pointer", fontSize: 13
  });

  return (
    <><div className="page-header"><div><div className="page-title">Send Stock</div><div className="page-subtitle">Submit returns for liquidation</div></div></div>
    <div className="page-body">
      <div style={{ display: "flex", gap: 8, marginBottom: 16, maxWidth: 600 }}>
        <button onClick={() => setTab("single")} style={tabBtn("single", "Single Item")}>Single Item</button>
        <button onClick={() => setTab("csv")} style={tabBtn("csv", "Upload Sheet")}>Upload Sheet</button>
      </div>

      {tab === "single" && (
        <div className="card" style={{ maxWidth: 600 }}>
          <div className="input-group"><label className="input-label">Removal Order ID (if applicable)</label><input className="input" placeholder="e.g. 2601071LW5" value={form.removal_order_id} onChange={update("removal_order_id")} /></div>
          <div className="input-group"><label className="input-label">Product Name *</label><input className="input" placeholder="Product description" value={form.product_name} onChange={update("product_name")} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}><div className="input-group"><label className="input-label">ASIN</label><input className="input" value={form.asin} onChange={update("asin")} /></div><div className="input-group"><label className="input-label">Your SKU (optional)</label><input className="input" placeholder="Your own SKU if you have one" value={form.sku} onChange={update("sku")} /></div></div>
          <div className="input-group"><label className="input-label">Condition</label><select className="input" value={form.condition} onChange={update("condition")}><option value="">— Select condition —</option><option value="New">New</option><option value="Open Box">Open Box</option><option value="Used">Used</option><option value="Like New">Like New</option><option value="Good">Good</option><option value="Fair">Fair</option><option value="Poor">Poor</option></select></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="input-group"><label className="input-label">What You Paid (£)</label><input className="input" type="number" step="0.01" placeholder="Your cost price" value={form.purchase_price} onChange={update("purchase_price")} /></div>
            <div className="input-group"><label className="input-label">Quantity</label><input className="input" type="number" min="1" placeholder="1" value={form.quantity} onChange={update("quantity")} /></div>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12, fontStyle: "italic" }}>A DBH tracking code will be auto-generated when you submit.</div>
          <button className="btn btn-primary liquidation" onClick={handleSubmit} disabled={saving || !form.product_name}>{saving ? "Submitting..." : "Submit Stock"}</button>
        </div>
      )}

      {tab === "csv" && (
        <div className="card" style={{ maxWidth: 720 }}>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 14 }}>
            Upload a CSV of your removal stock. Only <strong>Product Name</strong> is required. Optional: Date, Removal Order ID, ASIN, SKU, LPN Number, Status, Date Shipped, Tracking, Delivered, Date Delivered, Google Drive Link, Customer Comments, Condition. LPNs can be added later in My Stock if you don't have them yet.
          </div>
          <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(templateCsv)}`} download="dbh-liquidation-template.csv" style={{ display: "inline-block", padding: "8px 14px", background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.25)", borderRadius: 6, color: "var(--cyan)", fontSize: 13, textDecoration: "none", marginBottom: 16 }}>Download template</a>
          <div className="input-group">
            <label className="input-label">CSV file</label>
            <input type="file" accept=".csv" onChange={handleCsvFile} style={{ padding: 10, background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", width: "100%", fontSize: 13 }} />
            {csvFileName && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>Loaded: {csvFileName}</div>}
          </div>
          {csvErrors.length > 0 && (
            <div style={{ padding: 12, background: "rgba(255,82,82,0.1)", border: "1px solid rgba(255,82,82,0.3)", borderRadius: 8, marginBottom: 12, color: "var(--red)" }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Issues found:</div>
              {csvErrors.map((e, i) => <div key={i} style={{ fontSize: 13 }}>• {e}</div>)}
            </div>
          )}
          {csvRows.length > 0 && (
            <>
              <div style={{ padding: 12, background: "rgba(0,230,118,0.08)", border: "1px solid rgba(0,230,118,0.25)", borderRadius: 8, marginBottom: 12, color: "var(--green)", fontSize: 13 }}>
                Parsed <strong>{csvRows.length}</strong> valid row{csvRows.length === 1 ? "" : "s"} ready to import.
                {csvSkipped > 0 && <span style={{ color: "var(--text-muted)" }}> ({csvSkipped} skipped — missing product name)</span>}
              </div>
              <div style={{ maxHeight: 320, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8, marginBottom: 12 }}>
                <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
                  <thead style={{ position: "sticky", top: 0, background: "var(--bg-secondary)" }}>
                    <tr>
                      <th style={{ padding: 8, textAlign: "left", borderBottom: "1px solid var(--border)" }}>Product</th>
                      <th style={{ padding: 8, textAlign: "left", borderBottom: "1px solid var(--border)" }}>Your SKU</th>
                      <th style={{ padding: 8, textAlign: "left", borderBottom: "1px solid var(--border)" }}>UID</th>
                      <th style={{ padding: 8, textAlign: "left", borderBottom: "1px solid var(--border)" }}>LPN</th>
                      <th style={{ padding: 8, textAlign: "left", borderBottom: "1px solid var(--border)" }}>Condition</th>
                      <th style={{ padding: 8, textAlign: "left", borderBottom: "1px solid var(--border)" }}>ASIN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvRows.slice(0, 50).map((r, i) => (
                      <tr key={i}>
                        <td style={{ padding: 6, borderBottom: "1px solid var(--border)", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.product_name}</td>
                        <td style={{ padding: 6, borderBottom: "1px solid var(--border)", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.sku}</td>
                        <td style={{ padding: 6, borderBottom: "1px solid var(--border)", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-muted)" }}>{r.sheet_uid || "—"}</td>
                        <td style={{ padding: 6, borderBottom: "1px solid var(--border)" }}>{r.lpn_number || "—"}</td>
                        <td style={{ padding: 6, borderBottom: "1px solid var(--border)" }}>{r.condition}</td>
                        <td style={{ padding: 6, borderBottom: "1px solid var(--border)" }}>{r.asin}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {csvRows.length > 50 && <div style={{ padding: 8, fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>Showing first 50 of {csvRows.length} rows</div>}
              </div>
              <button className="btn btn-primary liquidation" onClick={handleCsvImport} disabled={importing}>{importing ? `Importing ${csvRows.length} items...` : `Import ${csvRows.length} items`}</button>
            </>
          )}
        </div>
      )}
    </div></>
  );
}

function LiquidationMyStockPage({ liquidationStock, liquidationSales, token, onRefresh, showToast }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("transit");
  const [editingId, setEditingId] = useState(null);
  const [editQty, setEditQty] = useState("");
  const [saving, setSaving] = useState(false);
  const [removalUnits, setRemovalUnits] = useState([]);
  const sales = liquidationSales || [];

  // Load removal_units for this client to merge into legacy tabs
  useEffect(() => {
    if (!user?.id || !token) return;
    fetch(`${SUPABASE_URL}/rest/v1/removal_units?user_id=eq.${user.id}&order=created_at.desc`, {
      headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}` }
    }).then(r => r.json()).then(d => { if (Array.isArray(d)) setRemovalUnits(d); });
  }, [user?.id, token]);

  // Map removal_units into a stock-like shape for the transit/listed tabs
  const removalAsTransit = removalUnits.filter(u => !u.received_by_dbh).map(u => ({
    id: `r-${u.id}`,
    _isRemoval: true,
    sheet_uid: u.sheet_uid || null,
    dbh_sku: u.new_sku || u.sku || "—",
    product_name: u.product_name || u.sku || "Removal unit",
    asin: u.asin,
    lpn_number: u.lpn,
    quantity: 1,
    qty_sold: 0,
    cog: null
  }));
  const removalAsListed = removalUnits.filter(u => u.received_by_dbh && u.status !== "sold").map(u => ({
    id: `r-${u.id}`,
    _isRemoval: true,
    sheet_uid: u.sheet_uid || null,
    dbh_sku: u.new_sku || u.sku || "—",
    product_name: u.product_name || u.sku || "Removal unit",
    asin: u.asin,
    lpn_number: u.lpn,
    quantity: 1,
    qty_sold: 0,
    cog: null
  }));
  const removalAsSales = removalUnits.filter(u => u.status === "sold").map(u => ({
    id: `r-${u.id}`,
    _isRemoval: true,
    sheet_uid: u.sheet_uid || null,
    date_sold: u.date_sold,
    product_name_snapshot: u.product_name || u.sku || "Removal unit",
    qty_sold: 1,
    sale_price: u.sale_price,
    net_sale: u.net_sale,
    dbh_pct: u.commission_pct,
    dbh_fee: u.commission_amount,
    fixed_fee: u.fixed_fee,
    payout: u.payout,
    payout_date: u.payout_date,
    paid: u.paid
  }));

  const transitItems = [...liquidationStock.filter(i => !i.received), ...removalAsTransit];
  const listedItems = [...liquidationStock.filter(i => i.received && ((i.quantity || 1) - (i.qty_sold || 0)) > 0), ...removalAsListed];
  const allSales = [...sales, ...removalAsSales];
  const totalPayout = allSales.reduce((s, r) => s + (parseFloat(r.payout) || 0), 0);

  const saveQty = async (item) => {
    const newQty = parseInt(editQty);
    if (!newQty || newQty < 1) { showToast("Enter a valid quantity"); return; }
    setSaving(true);
    await fetch(`${SUPABASE_URL}/rest/v1/liquidation_stock?id=eq.${item.id}`, {
      method: "PATCH",
      headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: newQty })
    });
    showToast("Quantity updated!"); setEditingId(null); onRefresh(); setSaving(false);
  };

  const deleteItem = async (item) => {
    if (item._isRemoval) return;
    if (!confirm("Delete this item from In Transit? This can't be undone.")) return;
    setSaving(true);
    await fetch(`${SUPABASE_URL}/rest/v1/liquidation_stock?id=eq.${item.id}`, {
      method: "DELETE",
      headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}` }
    });
    showToast("Item deleted"); onRefresh(); setSaving(false);
  };

  const [selectedIds, setSelectedIds] = useState([]);
  const selectableTransit = transitItems.filter(s => !s._isRemoval);
  const allTransitSelected = selectableTransit.length > 0 && selectedIds.length === selectableTransit.length;
  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleSelectAll = () => setSelectedIds(allTransitSelected ? [] : selectableTransit.map(s => s.id));
  const deleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Delete ${selectedIds.length} selected item(s) from In Transit? This can't be undone.`)) return;
    setSaving(true);
    for (const id of selectedIds) {
      await fetch(`${SUPABASE_URL}/rest/v1/liquidation_stock?id=eq.${id}`, {
        method: "DELETE",
        headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}` }
      });
    }
    showToast(`Deleted ${selectedIds.length} item(s)`); setSelectedIds([]); onRefresh(); setSaving(false);
  };

  return (
    <><div className="page-header"><div><div className="page-title">My Stock</div><div className="page-subtitle">Your liquidation items</div></div></div>
    <div className="page-body">
      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 20 }}>
        <div className="card stat-card liquidation"><div className="card-title">In Transit</div><div className="stat-value" style={{ color: "var(--amber)" }}>{transitItems.length}</div></div>
        <div className="card stat-card liquidation"><div className="card-title">Listed</div><div className="stat-value" style={{ color: "var(--cyan)" }}>{listedItems.length}</div></div>
        <div className="card stat-card liquidation"><div className="card-title">Total Payouts</div><div className="stat-value" style={{ color: "var(--orange)" }}>£{totalPayout.toFixed(2)}</div></div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[["transit","⏳ In Transit"],["listed","📦 Listed"],["sales","💰 Sales"],["removals","📋 Removals"]].map(([k,l]) =>
          <button key={k} onClick={() => setActiveTab(k)} style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid", fontSize: 13, fontWeight: 600, cursor: "pointer", background: activeTab === k ? "var(--orange)" : "transparent", color: activeTab === k ? "#000" : "var(--text-secondary)", borderColor: activeTab === k ? "var(--orange)" : "var(--border)" }}>{l}</button>
        )}
      </div>

      {/* In Transit */}
      {activeTab === "transit" && <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {selectedIds.length > 0 && <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "rgba(255,82,82,0.08)", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{selectedIds.length} selected</span>
          <button onClick={deleteSelected} disabled={saving} style={{ padding: "5px 14px", background: "var(--red)", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Delete selected ({selectedIds.length})</button>
          <button onClick={() => setSelectedIds([])} style={{ padding: "5px 12px", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>Clear</button>
        </div>}
        {transitItems.length === 0 ? <div className="empty-state"><Icons.Box /><p>No items in transit.</p></div> :
        <div className="table-wrap"><table style={{ width: "100%" }}>
          <thead><tr><th style={{ width: 36, textAlign: "center" }}><input type="checkbox" checked={allTransitSelected} onChange={toggleSelectAll} /></th><th>DBH SKU</th><th>UID</th><th>Product</th><th>ASIN</th><th>Qty</th><th>What You Paid</th><th></th></tr></thead>
          <tbody>{transitItems.map(s => {
            const isEdit = editingId === s.id;
            return <tr key={s.id}>
              <td style={{ textAlign: "center" }}>{!s._isRemoval && <input type="checkbox" checked={selectedIds.includes(s.id)} onChange={() => toggleSelect(s.id)} />}</td>
              <td className="mono" style={{ fontSize: 11, fontWeight: 600, color: "var(--orange)" }}>{s.dbh_sku || "—"}</td><td className="mono" style={{ fontSize: 11, fontWeight: 600, color: "var(--orange)" }}>{s.sheet_uid || "—"}</td>
              <td style={{ fontWeight: 600 }}>{s.product_name}{s._isRemoval && <span style={{ marginLeft: 6, fontSize: 9, padding: "1px 6px", background: "rgba(255,145,0,0.15)", color: "var(--orange)", borderRadius: 4 }}>REMOVAL</span>}</td>
              <td className="mono" style={{ fontSize: 12 }}>{s.asin || "—"}</td>
              <td className="mono">
                {isEdit
                  ? <input type="number" min="1" className="inline-input" style={{ width: 60 }} value={editQty} onChange={e => setEditQty(e.target.value)} autoFocus />
                  : s.quantity || 1}
              </td>
              <td className="mono">{s.cog ? `£${parseFloat(s.cog).toFixed(2)}` : "—"}</td>
              <td>
                {s._isRemoval ? <span style={{ fontSize: 10, color: "var(--text-muted)" }}>via Removals</span> : (isEdit
                  ? <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => saveQty(s)} disabled={saving} style={{ padding: "3px 10px", background: "var(--green)", color: "#000", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Save</button>
                      <button onClick={() => setEditingId(null)} style={{ padding: "3px 10px", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>✕</button>
                    </div>
                  : <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => { setEditingId(s.id); setEditQty(String(s.quantity || 1)); }} style={{ padding: "3px 10px", background: "transparent", border: "1px solid var(--border)", color: "var(--text-secondary)", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Edit Qty</button>
                      <button onClick={() => deleteItem(s)} disabled={saving} style={{ padding: "3px 10px", background: "transparent", border: "1px solid var(--red)", color: "var(--red)", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Delete</button>
                    </div>)}
              </td>
            </tr>;
          })}</tbody>
        </table></div>}
      </div>}

      {/* Listed */}
      {activeTab === "listed" && <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {listedItems.length === 0 ? <div className="empty-state"><Icons.Box /><p>No listed items.</p></div> :
        <div className="table-wrap"><table style={{ width: "100%" }}>
          <thead><tr><th>DBH SKU</th><th>UID</th><th>Product</th><th>ASIN</th><th>LPN</th><th>Qty Total</th><th>Qty Sold</th><th>Remaining</th><th>What You Paid</th><th></th></tr></thead>
          <tbody>{listedItems.map(s => {
            const remaining = (s.quantity || 1) - (s.qty_sold || 0);
            const isEdit = editingId === s.id;
            return <tr key={s.id}>
              <td className="mono" style={{ fontSize: 11, fontWeight: 600, color: "var(--orange)" }}>{s.dbh_sku || "—"}</td><td className="mono" style={{ fontSize: 11, fontWeight: 600, color: "var(--orange)" }}>{s.sheet_uid || "—"}</td>
              <td style={{ fontWeight: 600 }}>{s.product_name}{s._isRemoval && <span style={{ marginLeft: 6, fontSize: 9, padding: "1px 6px", background: "rgba(255,145,0,0.15)", color: "var(--orange)", borderRadius: 4 }}>REMOVAL</span>}</td>
              <td className="mono" style={{ fontSize: 12 }}>{s.asin || "—"}</td>
              <td className="mono" style={{ fontSize: 12 }}>{s.lpn_number || "—"}</td>
              <td className="mono">
                {isEdit
                  ? <input type="number" min="1" className="inline-input" style={{ width: 60 }} value={editQty} onChange={e => setEditQty(e.target.value)} autoFocus />
                  : s.quantity || 1}
              </td>
              <td className="mono" style={{ color: "var(--green)" }}>{s.qty_sold || 0}</td>
              <td className="mono" style={{ fontWeight: 700, color: remaining <= 0 ? "var(--red)" : "var(--text-primary)" }}>{remaining}</td>
              <td className="mono">{s.cog ? `£${parseFloat(s.cog).toFixed(2)}` : "—"}</td>
              <td>
                {s._isRemoval ? <span style={{ fontSize: 10, color: "var(--text-muted)" }}>via Removals</span> : (isEdit
                  ? <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => saveQty(s)} disabled={saving} style={{ padding: "3px 10px", background: "var(--green)", color: "#000", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Save</button>
                      <button onClick={() => setEditingId(null)} style={{ padding: "3px 10px", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>✕</button>
                    </div>
                  : <button onClick={() => { setEditingId(s.id); setEditQty(String(s.quantity || 1)); }} style={{ padding: "3px 10px", background: "transparent", border: "1px solid var(--border)", color: "var(--text-secondary)", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Edit Qty</button>)}
              </td>
            </tr>;
          })}</tbody>
        </table></div>}
      </div>}

      {/* Sales */}
      {activeTab === "sales" && <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {allSales.length === 0 ? <div className="empty-state"><Icons.Box /><p>No sales yet.</p></div> :
        <div className="table-wrap"><table style={{ width: "100%" }}>
          <thead><tr><th>Date Sold</th><th>Product</th><th>Qty</th><th>Sale £</th><th>Net Sale</th><th>DBH %</th><th>DBH £</th><th>Fixed</th><th>Payout</th><th>Payout Date</th><th>Paid</th></tr></thead>
          <tbody>{allSales.map(s => {
            const stockItem = !s._isRemoval ? liquidationStock.find(l => l.id === s.stock_id) : null;
            const pname = s.product_name_snapshot || stockItem?.product_name || "—";
            return <tr key={s.id}>
              <td style={{ fontSize: 12 }}>{s.date_sold ? formatShortDate(s.date_sold) : "—"}</td>
              <td style={{ fontWeight: 600, fontSize: 12 }}>{pname}{s._isRemoval && <span style={{ marginLeft: 6, fontSize: 9, padding: "1px 6px", background: "rgba(255,145,0,0.15)", color: "var(--orange)", borderRadius: 4 }}>REMOVAL</span>}</td>
              <td className="mono">{s.qty_sold || 1}</td>
              <td className="mono">{s.sale_price ? `£${parseFloat(s.sale_price).toFixed(2)}` : "—"}</td>
              <td className="mono">{s.net_sale != null ? `£${parseFloat(s.net_sale).toFixed(2)}` : "—"}</td>
              <td className="mono">{s.dbh_pct ? `${s.dbh_pct}%` : "—"}</td>
              <td className="mono" style={{ color: "var(--red)" }}>{s.dbh_fee != null ? `£${parseFloat(s.dbh_fee).toFixed(2)}` : "—"}</td>
              <td className="mono" style={{ color: "var(--red)" }}>{s.fixed_fee != null ? `£${parseFloat(s.fixed_fee).toFixed(2)}` : "—"}</td>
              <td className="mono" style={{ fontWeight: 700, color: "var(--green)" }}>{s.payout != null ? `£${parseFloat(s.payout).toFixed(2)}` : "—"}</td>
              <td style={{ fontSize: 12 }}>{s.payout_date ? formatShortDate(s.payout_date) : "—"}</td>
              <td style={{ textAlign: "center" }}>{s.paid ? <span style={{ color: "var(--green)" }}>✓ Paid</span> : <span style={{ color: "var(--amber)", fontSize: 12 }}>Pending</span>}</td>
            </tr>;
          })}</tbody>
        </table></div>}
      </div>}
      {/* Removals */}
      {activeTab === "removals" && <div>
        {user?.id ? <RemovalsTab userId={user.id} token={token} isAdmin={false} showToast={showToast} /> : <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading user info...</div>}
      </div>}
    </div></>
  );
}

function LiquidationFeesPage() {
  return (
    <><div className="page-header"><div><div className="page-title">Liquidation Fees</div><div className="page-subtitle">Transparent pricing</div></div></div>
    <div className="page-body">
      <div className="fee-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 28 }}>{[{ n: "Selling Fee", p: "20%", d: "15% if ≥£200", i: "💰", vat: false }, { n: "Prep Fee", p: "£0.40", d: "Per item", i: "📦", vat: true }, { n: "Bundling", p: "£0.30", d: "Per bundle", i: "🧩", vat: true }, { n: "Oversized", p: "£1.00", d: "Per item", i: "📏", vat: true }].map(f => <div className="fee-card" key={f.n} style={{ borderColor: "var(--orange)" }}><div style={{ fontSize: 28, marginBottom: 8 }}>{f.i}</div><div className="fee-price" style={{ color: "var(--orange)" }}>{f.p} {f.vat && <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 400 }}>+VAT</span>}</div><div className="fee-name">{f.n}</div><div className="fee-desc">{f.d}</div></div>)}</div>
      <div className="card" style={{ background: "linear-gradient(135deg,rgba(255,145,0,0.08),transparent)", borderColor: "rgba(255,145,0,0.2)" }}><div className="card-title" style={{ color: "var(--orange)" }}>✅ Transparency</div><p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 8 }}>Payouts at end of the following month to allow for returns.</p></div>
    </div></>
  );
}

function LiquidationGettingStartedPage({ dbProfile }) {
  const step = { padding: 22, background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 12, marginBottom: 16 };
  const stepNum = { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: "50%", background: "var(--orange)", color: "#000", fontWeight: 800, fontSize: 14, marginRight: 12 };
  const stepTitle = { fontSize: 17, fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", marginBottom: 14 };
  const body = { fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7 };
  const code = { display: "inline-block", padding: "2px 8px", background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.2)", borderRadius: 4, fontFamily: "monospace", fontSize: 13, color: "var(--cyan)" };
  return (
    <><div className="page-header"><div><div className="page-title">Getting Started</div><div className="page-subtitle">How DBH Liquidation works</div></div></div>
    <div className="page-body">

      <div className="card" style={{ padding: 24, marginBottom: 20, background: "linear-gradient(135deg,rgba(255,145,0,0.08),transparent)", borderColor: "rgba(255,145,0,0.2)" }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: "var(--orange)", marginBottom: 6 }}>👋 Welcome to DBH Liquidation</div>
        <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>
          We turn your Amazon returns and unsellable stock into cash via eBay.
          You send us your removals, we photograph, list, and sell — you get paid at the end of the following month.
        </div>
      </div>

      <div style={step}>
        <div style={stepTitle}><span style={stepNum}>1</span>📦 Send your removals to DBH</div>
        <div style={body}>
          In Amazon Seller Central, set your removal address to:
          <div style={{ padding: 14, background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", borderRadius: 8, fontFamily: "monospace", fontSize: 13, lineHeight: 1.8, marginTop: 10, color: "var(--text-primary)" }}>
            {dbProfile?.tcs_signed_business || dbProfile?.tcs_signed_name || dbProfile?.full_name || "Your Name"}<br/>
            c/o DBH<br/>
            3 Fincham End Drive<br/>
            Crowthorne<br/>
            Berkshire<br/>
            RG45 6DT<br/>
            United Kingdom
          </div>
          <div style={{ marginTop: 12 }}>
            💡 <b>Tip:</b> Set up <i>Automated Unfulfillable Removal</i> in Seller Central so Amazon
            automatically sends your returns and unsellable inventory to us, no manual work needed.
          </div>
        </div>
      </div>

      <div style={step}>
        <div style={stepTitle}><span style={stepNum}>2</span>📊 Upload your removal report</div>
        <div style={body}>
          Once a week (or whenever you want to update us), go to:
          <div style={{ marginTop: 8, marginBottom: 8 }}>
            <span style={code}>Seller Central → Reports → Fulfillment → Customer Returns</span>
          </div>
          Set the date range, click <b>Request CSV</b>, then download when it's ready.
          <div style={{ marginTop: 12 }}>
            In this portal, head to <b>My Stock → 📋 Removals tab</b> and click <b>📥 Upload Removal CSV</b>.
            Drop the file in, confirm the preview, done.
          </div>
          <div style={{ marginTop: 12, padding: 12, background: "rgba(0,229,255,0.04)", border: "1px solid rgba(0,229,255,0.15)", borderRadius: 8, fontSize: 13 }}>
            <b style={{ color: "var(--cyan)" }}>Also supports two other Amazon reports:</b><br/>
            • <b>Removal Order Detail</b> — high-level summary with fees<br/>
            • <b>Removal Shipment Detail</b> — adds tracking + shipment dates<br/>
            Upload them in any order — the portal merges everything by LPN.
          </div>
        </div>
      </div>

      <div style={step}>
        <div style={stepTitle}><span style={stepNum}>3</span>👀 Track your items in real time</div>
        <div style={body}>
          Open the <b>📋 Removals</b> tab any time to see live status of every unit:
          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            <div style={{ padding: "8px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}>📥 <b>Received</b> — we have it</div>
            <div style={{ padding: "8px 14px", background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.25)", borderRadius: 8, fontSize: 12, color: "var(--cyan)" }}>📦 <b>Listed</b> — live on eBay</div>
            <div style={{ padding: "8px 14px", background: "rgba(0,230,118,0.1)", border: "1px solid rgba(0,230,118,0.25)", borderRadius: 8, fontSize: 12, color: "var(--green)" }}>💰 <b>Sold</b> — payout pending</div>
          </div>
        </div>
      </div>

      <div style={step}>
        <div style={stepTitle}><span style={stepNum}>4</span>💵 Get paid</div>
        <div style={body}>
          Payouts go out at the <b>end of the month following the sale</b>.<br/>
          For example: items sold in May are paid out at the end of June.<br/>
          This buffer covers the eBay returns window and keeps everything clean.
          <div style={{ marginTop: 12 }}>
            See your full payout history under <b>Billing</b> in the sidebar.
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 20, marginTop: 24, background: "linear-gradient(135deg,rgba(0,229,255,0.06),transparent)", borderColor: "rgba(0,229,255,0.25)" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--cyan)", marginBottom: 8 }}>💬 Questions?</div>
        <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>
          DM Dan in Discord any time — happy to help you get set up, troubleshoot uploads, or talk through anything that doesn't make sense.
        </div>
      </div>

    </div></>
  );
}

function LiquidationBillingPage({ liquidationStock, liquidationReturns, removalUnits = [] }) {
  // Old model — items priced on the liquidation_stock row itself
  const pending = liquidationStock.filter(s => s.sale_price && !s.paid);
  const paid = liquidationStock.filter(s => s.paid);
  const pendingFromStock = pending.reduce((sum, s) => sum + calculatePayout(s).payout, 0);
  const paidFromStock = paid.reduce((sum, s) => sum + calculatePayout(s).payout, 0);

  // New model — sold removal_units
  const removalSold = removalUnits.filter(u => u.status === "sold");
  const pendingFromRemovals = removalSold.filter(u => !u.paid).reduce((sum, u) => sum + (parseFloat(u.payout) || 0), 0);
  const paidFromRemovals = removalSold.filter(u => u.paid).reduce((sum, u) => sum + (parseFloat(u.payout) || 0), 0);

  const pendingTotal = pendingFromStock + pendingFromRemovals;
  const paidTotal = paidFromStock + paidFromRemovals;
  const pendingWithDate = pending.filter(s => s.date_sold).map(s => ({ ...s, payoutDate: getPayoutDate(s.date_sold) })).sort((a, b) => a.payoutDate - b.payoutDate);
  const returns = liquidationReturns || [];
  const totalReturns = returns.reduce((s, r) => s + (r.count || 0), 0);
  const returnsDeduction = totalReturns * RETURN_COST_PER_UNIT;
  const netPending = Math.max(0, pendingTotal - returnsDeduction);
  return (
    <><div className="page-header"><div><div className="page-title">Billing</div><div className="page-subtitle">Your liquidation payouts</div></div></div>
    <div className="page-body">
      <div className="stats-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="card stat-card liquidation"><div className="card-title">Total Paid Out</div><div className="stat-value" style={{ color: "var(--green)" }}>£{paidTotal.toFixed(2)}</div></div>
        <div className="card stat-card liquidation"><div className="card-title">Pending Payout</div><div className="stat-value" style={{ color: "var(--amber)" }}>£{netPending.toFixed(2)}</div>{returnsDeduction > 0 && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Gross £{pendingTotal.toFixed(2)} − Returns £{returnsDeduction.toFixed(2)}</div>}</div>
      </div>
      {returns.length > 0 && (
        <div className="card" style={{ marginBottom: 16, background: "linear-gradient(135deg,rgba(255,80,80,0.05),transparent)", borderColor: "rgba(255,80,80,0.2)" }}>
          <div className="card-title" style={{ color: "var(--red)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>📦 Returns Deduction</span>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>£{RETURN_COST_PER_UNIT.toFixed(2)} per return (label out + back)</span>
          </div>
          <div style={{ marginTop: 12 }}>
            {returns.map(r => {
              const [y, m] = (r.month || "").split("-");
              const monthLabel = y && m ? new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" }) : r.month;
              return (
                <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{monthLabel}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{r.count} return{r.count === 1 ? "" : "s"}</div>
                  </div>
                  <span className="mono" style={{ fontWeight: 700, color: "var(--red)" }}>−£{((r.count || 0) * RETURN_COST_PER_UNIT).toFixed(2)}</span>
                </div>
              );
            })}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0 0", fontWeight: 700 }}>
              <span>Total ({totalReturns} return{totalReturns === 1 ? "" : "s"})</span>
              <span className="mono" style={{ color: "var(--red)" }}>−£{returnsDeduction.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
      <div className="card"><div className="card-title">Upcoming Payouts</div>{pendingWithDate.length === 0 ? <div style={{ color: "var(--text-muted)", marginTop: 12 }}>No pending payouts.</div> : <div style={{ marginTop: 12 }}>{pendingWithDate.map(s => { const c = calculatePayout(s); return <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--border)" }}><div style={{ fontWeight: 600 }}>{s.product_name}</div><div style={{ textAlign: "right" }}><div className="mono" style={{ fontWeight: 700, color: "var(--green)" }}>£{c.payout.toFixed(2)}</div><div style={{ fontSize: 12, color: "var(--text-muted)" }}>{formatDate(s.payoutDate)}</div></div></div>; })}</div>}</div>
    </div></>
  );
}

// ============ DBH DEALS ============
function DealsSubscribePage() {
  return (
    <div className="deals-theme">
      <div className="page-header deals-header">
        <div>
          <div className="page-title" style={{ color: '#00e676' }}>📋 DBH Deals</div>
          <div className="page-subtitle">Daily Amazon FBA Deal Sheet</div>
        </div>
      </div>
      <div className="page-body">
        <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 80, marginBottom: 24 }}>🔒</div>
          <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 16 }}>Subscribe to DBH Deals</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 18, marginBottom: 40, lineHeight: 1.6 }}>
            Get access to our exclusive daily deal sheet with hand-picked Amazon FBA arbitrage opportunities.
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 40 }}>
            <div className="deals-card" style={{ padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📈</div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>High ROI Deals</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>30-100%+ ROI opportunities</div>
            </div>
            <div className="deals-card" style={{ padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Daily Updates</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Fresh deals every day</div>
            </div>
            <div className="deals-card" style={{ padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>👑</div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Expert Vetted</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>By a 7-figure Amazon seller</div>
            </div>
            <div className="deals-card" style={{ padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🔒</div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Limited Members</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Capped at 15 members</div>
            </div>
          </div>
          
          <div style={{ background: 'rgba(0,230,118,0.1)', border: '2px solid rgba(0,230,118,0.3)', borderRadius: 16, padding: 24, marginBottom: 24 }}>
            <div style={{ fontSize: 14, color: '#00e676', fontWeight: 600, marginBottom: 8 }}>EXAMPLE DEAL</div>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 12 }}>Jellycat Amuseable Avocado</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24 }}>
              <div><span style={{ color: 'var(--text-muted)' }}>Cost:</span> <strong>£12.99</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Sale:</span> <strong>£24.99</strong></div>
              <div><span style={{ color: '#00e676' }}>Profit:</span> <strong style={{ color: '#00e676' }}>£8.50</strong></div>
              <div><span style={{ color: 'var(--cyan)' }}>ROI:</span> <strong style={{ color: 'var(--cyan)' }}>65%</strong></div>
            </div>
          </div>
          
          <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
            DM <strong style={{ color: '#00e676' }}>@dbhfba</strong> on Instagram to subscribe
          </p>
          <a href="https://instagram.com/dbhfba" target="_blank" rel="noopener noreferrer" className="btn btn-primary deals" style={{ fontSize: 18, padding: '14px 32px' }}>
            📱 Message on Instagram
          </a>
        </div>
      </div>
    </div>
  );
}

function DBHDealsPage({ token, hasAccess, startDate, dbProfile, onRefresh, showToast, userId }) {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [interactions, setInteractions] = useState({});

  // Check payment status
  const lastPayment = dbProfile?.deals_last_payment;
  const isPaymentOverdue = (() => {
    if (!lastPayment) return false;
    const paid = new Date(lastPayment);
    const due = new Date(paid.getFullYear(), paid.getMonth() + 1, paid.getDate());
    return new Date() >= due;
  })();
  const paymentDueDate = (() => {
    if (!lastPayment) return null;
    const paid = new Date(lastPayment);
    return new Date(paid.getFullYear(), paid.getMonth() + 1, paid.getDate());
  })();
  const daysUntilDue = paymentDueDate ? Math.ceil((paymentDueDate - new Date()) / (1000 * 60 * 60 * 24)) : null;

  // If no access - check if they were a previous subscriber (have last payment date)
  if (!hasAccess) {
    if (dbProfile?.deals_last_payment) {
      // They were a subscriber but payment is overdue
      return (
        <div className="deals-theme">
          <div className="page-header deals-header">
            <div>
              <div className="page-title" style={{ color: 'var(--red)' }}>📋 DBH Deals</div>
              <div className="page-subtitle">Subscription Inactive</div>
            </div>
          </div>
          <div className="page-body">
            <div style={{ maxWidth: 500, margin: '0 auto', textAlign: 'center' }}>
              <div style={{ fontSize: 64, marginBottom: 20 }}>⚠️</div>
              <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 12, color: 'var(--red)' }}>Payment Overdue</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 16, lineHeight: 1.6, marginBottom: 32 }}>
                Your DBH Deals subscription has been paused because your payment is overdue. 
                Please make your payment to regain access to the daily deal sheet.
              </p>
              <div className="card" style={{ textAlign: 'left', marginBottom: 24, borderColor: 'rgba(255,82,82,0.2)', background: 'rgba(255,82,82,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Last Payment</span>
                  <strong>{new Date(dbProfile.deals_last_payment).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Status</span>
                  <strong style={{ color: 'var(--red)' }}>Overdue</strong>
                </div>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 16 }}>Contact <strong style={{ color: '#00e676' }}>@dbhfba</strong> on Instagram or email us to arrange payment</p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <a href="https://instagram.com/dbhfba" target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ fontSize: 16, padding: '12px 28px' }}>📱 Instagram</a>
                <a href="mailto:dbharper77@gmail.com?subject=DBH%20Deals%20Subscription%20Payment" className="btn btn-primary deals" style={{ fontSize: 16, padding: '12px 28px' }}>📧 Email Us</a>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return <DealsSubscribePage />;
  }
  
  const hasInvoiceDetails = dbProfile?.deals_invoice_name && dbProfile?.deals_invoice_email;
  
  // Get the earliest date they can view
  const minDate = startDate || '2020-01-01';
  
  useEffect(() => {
    loadDeals();
  }, [selectedDate]);

  useEffect(() => {
    if (userId && token) loadInteractions();
  }, [userId, token]);

  const loadDeals = async () => {
    setLoading(true);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/deals?deal_date=eq.${selectedDate}&is_published=eq.true&order=sort_order.asc.nullsfirst,created_at.desc`, { headers: supabase.headers(token) });
    const data = await res.json();
    if (Array.isArray(data)) setDeals(data);
    setLoading(false);
  };

  const loadInteractions = async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/deal_interactions?user_id=eq.${userId}&select=*`, { headers: supabase.headers(token) });
    const data = await res.json();
    if (Array.isArray(data)) {
      const map = {};
      data.forEach(d => { map[d.deal_id] = d; });
      setInteractions(map);
    }
  };

  const toggleShortlist = async (deal) => {
    const existing = interactions[deal.id];
    if (existing) {
      if (existing.status === 'bought') return; // don't remove from shortlist if bought
      await fetch(`${SUPABASE_URL}/rest/v1/deal_interactions?id=eq.${existing.id}`, { method: 'DELETE', headers: supabase.headers(token) });
      const newInt = { ...interactions }; delete newInt[deal.id]; setInteractions(newInt);
    } else {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/deal_interactions`, {
        method: 'POST', headers: { ...supabase.headers(token), 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify({ user_id: userId, deal_id: deal.id, status: 'shortlisted', deal_date: deal.deal_date, product_name: deal.product_name, asin: deal.asin, cost_price: deal.cost_price, sale_price: deal.sale_price, profit: deal.profit, roi: deal.roi, source_url: deal.source_url, amazon_url: deal.amazon_url })
      });
      const data = await res.json();
      if (Array.isArray(data) && data[0]) setInteractions({ ...interactions, [deal.id]: data[0] });
    }
  };

  const markBought = async (deal) => {
    const existing = interactions[deal.id];
    if (existing && existing.status === 'bought') {
      // Un-buy: revert to shortlisted
      const res = await fetch(`${SUPABASE_URL}/rest/v1/deal_interactions?id=eq.${existing.id}`, {
        method: 'PATCH', headers: { ...supabase.headers(token), 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify({ status: 'shortlisted' })
      });
      const data = await res.json();
      if (Array.isArray(data) && data[0]) setInteractions({ ...interactions, [deal.id]: data[0] });
      return;
    }
    if (existing) {
      // Upgrade shortlisted to bought
      const res = await fetch(`${SUPABASE_URL}/rest/v1/deal_interactions?id=eq.${existing.id}`, {
        method: 'PATCH', headers: { ...supabase.headers(token), 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify({ status: 'bought' })
      });
      const data = await res.json();
      if (Array.isArray(data) && data[0]) setInteractions({ ...interactions, [deal.id]: data[0] });
    } else {
      // Create as bought directly
      const res = await fetch(`${SUPABASE_URL}/rest/v1/deal_interactions`, {
        method: 'POST', headers: { ...supabase.headers(token), 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify({ user_id: userId, deal_id: deal.id, status: 'bought', deal_date: deal.deal_date, product_name: deal.product_name, asin: deal.asin, cost_price: deal.cost_price, sale_price: deal.sale_price, profit: deal.profit, roi: deal.roi, source_url: deal.source_url, amazon_url: deal.amazon_url })
      });
      const data = await res.json();
      if (Array.isArray(data) && data[0]) setInteractions({ ...interactions, [deal.id]: data[0] });
    }
  };

  const formatCurrency = (val) => `£${parseFloat(val || 0).toFixed(2)}`;
  const formatPercent = (val) => { const n = parseFloat(val || 0); const display = n > 0 && n < 3 ? n * 100 : n; return `${display.toFixed(0)}%`; };

  // Navigate dates - but not before start date
  const changeDate = (days) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    const newDate = d.toISOString().split('T')[0];
    if (newDate >= minDate) {
      setSelectedDate(newDate);
    }
  };
  
  // Check if selected date is before start date
  const isBeforeStartDate = selectedDate < minDate;

  const formatDisplayDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="deals-theme">
      <div className="page-header deals-header">
        <div>
          <div className="page-title" style={{ color: '#00e676' }}>📋 DBH Deals</div>
          <div className="page-subtitle">Daily Amazon FBA Deal Sheet</div>
        </div>
        <span className="deals-badge">🔒 Exclusive Access</span>
      </div>
      <div className="page-body">
        {/* Date Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 24 }}>
          <button className="btn btn-secondary" onClick={() => changeDate(-1)} disabled={selectedDate <= minDate}>← Previous</button>
          <input 
            type="date" 
            className="input" 
            style={{ width: 200, textAlign: 'center', fontSize: 16, fontWeight: 600, colorScheme: 'dark' }} 
            value={selectedDate} 
            min={minDate}
            onChange={e => {
              if (e.target.value >= minDate) setSelectedDate(e.target.value);
            }} 
          />
          <button className="btn btn-secondary" onClick={() => changeDate(1)}>Next →</button>
        </div>

        {/* Payment Status Banner */}
        {isPaymentOverdue && (
          <div className="card" style={{ marginBottom: 20, background: 'rgba(255,82,82,0.08)', borderColor: 'rgba(255,82,82,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 28 }}>⚠️</span>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--red)' }}>Payment Overdue</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Your subscription payment is due. Please make payment to continue receiving deals.</div>
                </div>
              </div>
            </div>
          </div>
        )}
        {!isPaymentOverdue && daysUntilDue !== null && daysUntilDue <= 7 && daysUntilDue > 0 && (
          <div className="card" style={{ marginBottom: 20, background: 'rgba(255,171,0,0.08)', borderColor: 'rgba(255,171,0,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 24 }}>💳</span>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--amber)' }}>Payment due in {daysUntilDue} day{daysUntilDue !== 1 ? 's' : ''}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Due: {paymentDueDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
              </div>
            </div>
          </div>
        )}

        {/* Invoice Details Section */}
        {!hasInvoiceDetails && (
          <div className="card" style={{ marginBottom: 20, background: 'rgba(0,229,255,0.05)', borderColor: 'rgba(0,229,255,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 20 }}>📋</span>
              <div>
                <div style={{ fontWeight: 600 }}>Invoice details required</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Go to <strong>Invoice Details</strong> in the sidebar to add your billing info</div>
              </div>
            </div>
          </div>
        )}
        
        {isBeforeStartDate ? (
          <div className="card empty-state" style={{ background: 'rgba(0,230,118,0.02)', borderColor: 'rgba(0,230,118,0.1)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
            <p>Your subscription started on {new Date(minDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>
            <p style={{ fontSize: 13, marginTop: 8, color: 'var(--text-muted)' }}>You can only view deals from this date onwards.</p>
          </div>
        ) : loading ? (
          <div className="card empty-state"><div className="spinner" style={{ borderTopColor: '#00e676' }} /></div>
        ) : deals.length === 0 ? (
          <div className="card empty-state" style={{ background: 'rgba(0,230,118,0.02)', borderColor: 'rgba(0,230,118,0.1)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
            <p>No deals published for this date yet.</p>
            <p style={{ fontSize: 13, marginTop: 8 }}>Check back later or try a different date.</p>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>{deals.length} deal{deals.length !== 1 ? 's' : ''} found</div>
            {deals.map(deal => (
              <div key={deal.id} className="deal-row" style={{ padding: 0, overflow: 'hidden', marginBottom: 16, borderColor: interactions[deal.id]?.status === 'bought' ? 'rgba(0,230,118,0.3)' : interactions[deal.id] ? 'rgba(255,171,0,0.3)' : undefined }}>
                {/* Header */}
                <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <button onClick={() => toggleShortlist(deal)} title={interactions[deal.id] ? "Remove from shortlist" : "Add to shortlist"} style={{ background: interactions[deal.id] ? 'rgba(255,171,0,0.15)' : 'var(--bg-primary)', border: interactions[deal.id] ? '2px solid rgba(255,171,0,0.4)' : '2px solid var(--border)', borderRadius: 10, cursor: 'pointer', fontSize: 20, padding: '6px 10px', lineHeight: 1, transition: 'all 0.2s', filter: interactions[deal.id] ? 'none' : 'brightness(10)' }}>{interactions[deal.id] ? '⭐' : '☆'}</button>
                        <button onClick={() => markBought(deal)} title={interactions[deal.id]?.status === 'bought' ? "Remove from bought" : "Mark as bought"} style={{ background: interactions[deal.id]?.status === 'bought' ? 'rgba(0,230,118,0.15)' : 'var(--bg-primary)', border: interactions[deal.id]?.status === 'bought' ? '2px solid rgba(0,230,118,0.4)' : '2px solid var(--border)', borderRadius: 10, cursor: 'pointer', fontSize: 20, padding: '6px 10px', lineHeight: 1, transition: 'all 0.2s', filter: interactions[deal.id]?.status === 'bought' ? 'none' : 'brightness(10)' }}>🛒</button>
                        <div style={{ fontWeight: 700, fontSize: 17, lineHeight: 1.4 }}>{deal.product_name}</div>
                      </div>
                      <span className="mono" style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 70 }}>{deal.asin}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginLeft: 16 }}>
                      {deal.asin && <a href={`https://sas.selleramp.com/sas/lookup?SasLookup%5Bsearch_term%5D=${deal.asin}&SasLookup%5Bcost%5D=${deal.cost_price || ''}&SasLookup%5Bsale_price%5D=${deal.sale_price || ''}`} target="_blank" rel="noopener noreferrer" style={{ background: 'rgba(0,150,255,0.1)', color: '#0096ff', border: '1px solid rgba(0,150,255,0.3)', padding: '8px 14px', fontSize: 12, borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}>SAS</a>}
                      {deal.source_url && <a href={deal.source_url} target="_blank" rel="noopener noreferrer" style={{ background: 'rgba(0,230,118,0.1)', color: '#00e676', border: '1px solid rgba(0,230,118,0.3)', padding: '8px 14px', fontSize: 12, borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}>Source</a>}
                      {deal.amazon_url && <a href={deal.amazon_url} target="_blank" rel="noopener noreferrer" style={{ background: 'rgba(255,153,0,0.1)', color: '#ff9900', border: '1px solid rgba(255,153,0,0.3)', padding: '8px 14px', fontSize: 12, borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}>Amazon</a>}
                    </div>
                  </div>
                </div>
                
                {/* Metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', background: 'var(--bg-primary)', padding: '14px 8px' }}>
                  <div className="deal-metric"><div className="deal-metric-value">{formatCurrency(deal.cost_price)}</div><div className="deal-metric-label">Cost</div></div>
                  <div className="deal-metric"><div className="deal-metric-value">{formatCurrency(deal.sale_price)}</div><div className="deal-metric-label">Sale</div></div>
                  <div className="deal-metric profit"><div className="deal-metric-value">{formatCurrency(deal.profit)}</div><div className="deal-metric-label">Profit</div></div>
                  <div className="deal-metric roi"><div className="deal-metric-value">{formatPercent(deal.roi)}</div><div className="deal-metric-label">ROI</div></div>
                  <div className="deal-metric"><div className="deal-metric-value" style={{ color: 'var(--amber)' }}>{deal.spm || '—'}</div><div className="deal-metric-label">SPM</div></div>
                </div>

                {/* Code + Notes footer */}
                {(deal.code || deal.notes) && (
                  <div style={{ padding: '12px 20px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {deal.code && (
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(179,136,255,0.1)', border: '1px solid rgba(179,136,255,0.25)', borderRadius: 8, padding: '6px 12px' }}><span style={{ fontSize: 11, color: 'var(--purple)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Code</span><span className="mono" style={{ fontSize: 13, color: 'var(--purple)', fontWeight: 700 }}>{deal.code}</span></div>
                      </div>
                    )}
                    {deal.notes && <div style={{ padding: '10px 14px', background: 'rgba(0,230,118,0.04)', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)', borderLeft: '3px solid rgba(0,230,118,0.4)', lineHeight: 1.5 }}>{deal.notes}</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Client Shortlist Page
function DealsShortlistPage({ token, userId, showToast }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingNote, setEditingNote] = useState(null);
  const [noteText, setNoteText] = useState('');

  useEffect(() => { loadItems(); }, []);

  const loadItems = async () => {
    setLoading(true);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/deal_interactions?user_id=eq.${userId}&status=in.(shortlisted,bought)&order=created_at.desc`, { headers: supabase.headers(token) });
    const data = await res.json();
    if (Array.isArray(data)) setItems(data.filter(d => d.status === 'shortlisted'));
    setLoading(false);
  };

  const removeItem = async (id) => {
    await fetch(`${SUPABASE_URL}/rest/v1/deal_interactions?id=eq.${id}`, { method: 'DELETE', headers: supabase.headers(token) });
    setItems(items.filter(i => i.id !== id));
    showToast('Removed from shortlist');
  };

  const moveToBought = async (item) => {
    await fetch(`${SUPABASE_URL}/rest/v1/deal_interactions?id=eq.${item.id}`, {
      method: 'PATCH', headers: { ...supabase.headers(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'bought' })
    });
    setItems(items.filter(i => i.id !== item.id));
    showToast('Moved to Bought!');
  };

  const saveNote = async (item) => {
    await fetch(`${SUPABASE_URL}/rest/v1/deal_interactions?id=eq.${item.id}`, {
      method: 'PATCH', headers: { ...supabase.headers(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_notes: noteText })
    });
    setItems(items.map(i => i.id === item.id ? { ...i, client_notes: noteText } : i));
    setEditingNote(null);
    showToast('Note saved');
  };

  const formatCurrency = (val) => `£${parseFloat(val || 0).toFixed(2)}`;

  return (
    <div className="deals-theme">
      <div className="page-header deals-header">
        <div>
          <div className="page-title" style={{ color: '#ffab00' }}>⭐ Shortlist</div>
          <div className="page-subtitle">Deals you're interested in</div>
        </div>
        <div className="deals-badge" style={{ background: 'rgba(255,171,0,0.15)', color: 'var(--amber)', borderColor: 'rgba(255,171,0,0.3)' }}>{items.length} deal{items.length !== 1 ? 's' : ''}</div>
      </div>
      <div className="page-body">
        {loading ? <div className="card empty-state"><div className="spinner" style={{ borderTopColor: '#ffab00' }} /></div> :
        items.length === 0 ? (
          <div className="card empty-state"><div style={{ fontSize: 48, marginBottom: 16 }}>⭐</div><p>No shortlisted deals yet.</p><p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>Star deals from the daily sheet to add them here.</p></div>
        ) : (
          <div>
            {items.map(item => (
              <div key={item.id} className="deal-row" style={{ padding: 0, overflow: 'hidden', marginBottom: 12, borderColor: 'rgba(255,171,0,0.2)' }}>
                <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{item.product_name}</div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                      <span className="mono">{item.asin}</span>
                      <span>{new Date(item.deal_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                      <span>Cost: <strong className="mono">{formatCurrency(item.cost_price)}</strong></span>
                      <span>Sale: <strong className="mono">{formatCurrency(item.sale_price)}</strong></span>
                      <span style={{ color: '#00e676' }}>Profit: <strong className="mono">{formatCurrency(item.profit)}</strong></span>
                      <span style={{ color: 'var(--cyan)' }}>ROI: <strong className="mono">{(() => { const n = parseFloat(item.roi || 0); return n > 0 && n < 3 ? (n*100).toFixed(0) : n.toFixed(0); })()}%</strong></span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 12 }}>
                    {item.source_url && <a href={item.source_url} target="_blank" rel="noopener noreferrer" style={{ background: 'rgba(0,230,118,0.1)', color: '#00e676', border: '1px solid rgba(0,230,118,0.3)', padding: '6px 10px', fontSize: 11, borderRadius: 6, textDecoration: 'none', fontWeight: 600 }}>Source</a>}
                    {item.amazon_url && <a href={item.amazon_url} target="_blank" rel="noopener noreferrer" style={{ background: 'rgba(255,153,0,0.1)', color: '#ff9900', border: '1px solid rgba(255,153,0,0.3)', padding: '6px 10px', fontSize: 11, borderRadius: 6, textDecoration: 'none', fontWeight: 600 }}>Amazon</a>}
                    <button onClick={() => moveToBought(item)} style={{ background: 'rgba(0,230,118,0.1)', color: '#00e676', border: '1px solid rgba(0,230,118,0.3)', padding: '6px 10px', fontSize: 11, borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontFamily: 'Outfit' }}>🛒 Bought</button>
                    <button className="btn-icon btn-danger" onClick={() => removeItem(item.id)} style={{ width: 28, height: 28 }}><Icons.X /></button>
                  </div>
                </div>
                {/* Notes section */}
                <div style={{ padding: '0 20px 14px' }}>
                  {editingNote === item.id ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input className="input" value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add your notes..." style={{ fontSize: 13 }} onKeyDown={e => e.key === 'Enter' && saveNote(item)} />
                      <button className="btn btn-primary deals" style={{ padding: '8px 14px', fontSize: 12 }} onClick={() => saveNote(item)}>Save</button>
                      <button className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: 12 }} onClick={() => setEditingNote(null)}>Cancel</button>
                    </div>
                  ) : (
                    <div onClick={() => { setEditingNote(item.id); setNoteText(item.client_notes || ''); }} style={{ cursor: 'pointer', padding: '8px 12px', background: item.client_notes ? 'rgba(255,171,0,0.05)' : 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: item.client_notes ? 'var(--text-secondary)' : 'var(--text-muted)', minHeight: 36, display: 'flex', alignItems: 'center' }}>
                      {item.client_notes || '📝 Click to add notes...'}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Client Bought Page
function DealsBoughtPage({ token, userId, showToast }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingNote, setEditingNote] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [editingQty, setEditingQty] = useState(null);
  const [qtyText, setQtyText] = useState('');

  useEffect(() => { loadItems(); }, []);

  const loadItems = async () => {
    setLoading(true);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/deal_interactions?user_id=eq.${userId}&status=eq.bought&order=created_at.desc`, { headers: supabase.headers(token) });
    const data = await res.json();
    if (Array.isArray(data)) setItems(data);
    setLoading(false);
  };

  const removeItem = async (id) => {
    await fetch(`${SUPABASE_URL}/rest/v1/deal_interactions?id=eq.${id}`, {
      method: 'PATCH', headers: { ...supabase.headers(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'shortlisted' })
    });
    setItems(items.filter(i => i.id !== id));
    showToast('Moved back to shortlist');
  };

  const saveNote = async (item) => {
    await fetch(`${SUPABASE_URL}/rest/v1/deal_interactions?id=eq.${item.id}`, {
      method: 'PATCH', headers: { ...supabase.headers(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_notes: noteText })
    });
    setItems(items.map(i => i.id === item.id ? { ...i, client_notes: noteText } : i));
    setEditingNote(null);
    showToast('Note saved');
  };

  const saveQty = async (item) => {
    const qty = parseInt(qtyText) || 1;
    await fetch(`${SUPABASE_URL}/rest/v1/deal_interactions?id=eq.${item.id}`, {
      method: 'PATCH', headers: { ...supabase.headers(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: qty })
    });
    setItems(items.map(i => i.id === item.id ? { ...i, quantity: qty } : i));
    setEditingQty(null);
    showToast('Quantity updated');
  };

  const formatCurrency = (val) => `£${parseFloat(val || 0).toFixed(2)}`;
  const fmtRoi = (val) => { const n = parseFloat(val || 0); return n > 0 && n < 3 ? (n*100).toFixed(0) : n.toFixed(0); };

  // Totals
  const totalCost = items.reduce((sum, i) => sum + (parseFloat(i.cost_price) || 0) * (i.quantity || 1), 0);
  const totalSale = items.reduce((sum, i) => sum + (parseFloat(i.sale_price) || 0) * (i.quantity || 1), 0);
  const totalProfit = items.reduce((sum, i) => sum + (parseFloat(i.profit) || 0) * (i.quantity || 1), 0);
  const avgRoi = totalCost > 0 ? ((totalProfit / totalCost) * 100) : 0;
  const totalUnits = items.reduce((sum, i) => sum + (i.quantity || 1), 0);

  return (
    <div className="deals-theme">
      <div className="page-header deals-header">
        <div>
          <div className="page-title" style={{ color: '#00e676' }}>🛒 Bought</div>
          <div className="page-subtitle">Deals you've purchased</div>
        </div>
        <div className="deals-badge">{items.length} deal{items.length !== 1 ? 's' : ''} · {totalUnits} units</div>
      </div>
      <div className="page-body">
        {/* Summary Stats */}
        {items.length > 0 && (
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
            <div className="card stat-card deals-stat"><div className="card-title">Total COGS</div><div className="stat-value" style={{ color: 'var(--text-primary)' }}>{formatCurrency(totalCost)}</div><div className="stat-label">{totalUnits} units</div></div>
            <div className="card stat-card deals-stat"><div className="card-title">Expected Revenue</div><div className="stat-value" style={{ color: 'var(--cyan)' }}>{formatCurrency(totalSale)}</div></div>
            <div className="card stat-card deals-stat"><div className="card-title">Expected Profit</div><div className="stat-value" style={{ color: '#00e676' }}>{formatCurrency(totalProfit)}</div></div>
            <div className="card stat-card deals-stat"><div className="card-title">Avg ROI</div><div className="stat-value" style={{ color: 'var(--cyan)' }}>{avgRoi.toFixed(0)}%</div></div>
          </div>
        )}

        {loading ? <div className="card empty-state"><div className="spinner" style={{ borderTopColor: '#00e676' }} /></div> :
        items.length === 0 ? (
          <div className="card empty-state"><div style={{ fontSize: 48, marginBottom: 16 }}>🛒</div><p>No bought deals yet.</p><p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>Mark deals as bought from the daily sheet or your shortlist.</p></div>
        ) : (
          <div>
            {items.map(item => (
              <div key={item.id} className="deal-row" style={{ padding: 0, overflow: 'hidden', marginBottom: 12, borderColor: 'rgba(0,230,118,0.2)' }}>
                <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{item.product_name}</div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                      <span className="mono">{item.asin}</span>
                      <span>{new Date(item.deal_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 13, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span>Cost: <strong className="mono">{formatCurrency(item.cost_price)}</strong></span>
                      <span>Sale: <strong className="mono">{formatCurrency(item.sale_price)}</strong></span>
                      <span style={{ color: '#00e676' }}>Profit: <strong className="mono">{formatCurrency(item.profit)}</strong></span>
                      <span style={{ color: 'var(--cyan)' }}>ROI: <strong className="mono">{fmtRoi(item.roi)}%</strong></span>
                      <span>×</span>
                      {editingQty === item.id ? (
                        <span style={{ display: 'inline-flex', gap: 4 }}>
                          <input className="inline-input" style={{ width: 60, textAlign: 'center' }} value={qtyText} onChange={e => setQtyText(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveQty(item)} autoFocus />
                          <button onClick={() => saveQty(item)} style={{ background: '#00e676', color: '#000', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>✓</button>
                        </span>
                      ) : (
                        <span onClick={() => { setEditingQty(item.id); setQtyText(String(item.quantity || 1)); }} style={{ cursor: 'pointer', background: 'rgba(0,230,118,0.1)', border: '1px solid rgba(0,230,118,0.3)', borderRadius: 6, padding: '2px 10px', fontWeight: 700, color: '#00e676', fontFamily: 'JetBrains Mono' }}>{item.quantity || 1} qty</span>
                      )}
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>= <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency((parseFloat(item.cost_price) || 0) * (item.quantity || 1))}</strong> total cost</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 12 }}>
                    {item.source_url && <a href={item.source_url} target="_blank" rel="noopener noreferrer" style={{ background: 'rgba(0,230,118,0.1)', color: '#00e676', border: '1px solid rgba(0,230,118,0.3)', padding: '6px 10px', fontSize: 11, borderRadius: 6, textDecoration: 'none', fontWeight: 600 }}>Source</a>}
                    {item.amazon_url && <a href={item.amazon_url} target="_blank" rel="noopener noreferrer" style={{ background: 'rgba(255,153,0,0.1)', color: '#ff9900', border: '1px solid rgba(255,153,0,0.3)', padding: '6px 10px', fontSize: 11, borderRadius: 6, textDecoration: 'none', fontWeight: 600 }}>Amazon</a>}
                    <button onClick={() => removeItem(item.id)} style={{ background: 'rgba(255,171,0,0.1)', color: 'var(--amber)', border: '1px solid rgba(255,171,0,0.3)', padding: '6px 10px', fontSize: 11, borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontFamily: 'Outfit' }}>↩ Undo</button>
                  </div>
                </div>
                {/* Notes section */}
                <div style={{ padding: '0 20px 14px' }}>
                  {editingNote === item.id ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input className="input" value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add your notes..." style={{ fontSize: 13 }} onKeyDown={e => e.key === 'Enter' && saveNote(item)} />
                      <button className="btn btn-primary deals" style={{ padding: '8px 14px', fontSize: 12 }} onClick={() => saveNote(item)}>Save</button>
                      <button className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: 12 }} onClick={() => setEditingNote(null)}>Cancel</button>
                    </div>
                  ) : (
                    <div onClick={() => { setEditingNote(item.id); setNoteText(item.client_notes || ''); }} style={{ cursor: 'pointer', padding: '8px 12px', background: item.client_notes ? 'rgba(0,230,118,0.05)' : 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: item.client_notes ? 'var(--text-secondary)' : 'var(--text-muted)', minHeight: 36, display: 'flex', alignItems: 'center' }}>
                      {item.client_notes || '📝 Click to add notes...'}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Client Invoice Details Page
function DealsInvoiceDetailsPage({ token, dbProfile, onRefresh, showToast }) {
  const [form, setForm] = useState({
    deals_invoice_name: dbProfile?.deals_invoice_name || '',
    deals_invoice_business: dbProfile?.deals_invoice_business || '',
    deals_invoice_email: dbProfile?.deals_invoice_email || ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      deals_invoice_name: dbProfile?.deals_invoice_name || '',
      deals_invoice_business: dbProfile?.deals_invoice_business || '',
      deals_invoice_email: dbProfile?.deals_invoice_email || ''
    });
  }, [dbProfile]);

  const handleSave = async () => {
    setSaving(true);
    await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${dbProfile.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
      body: JSON.stringify(form)
    });
    showToast("Invoice details saved!");
    if (onRefresh) onRefresh();
    setSaving(false);
  };

  const hasSaved = dbProfile?.deals_invoice_name && dbProfile?.deals_invoice_email;

  return (
    <div className="deals-theme">
      <div className="page-header deals-header">
        <div>
          <div className="page-title" style={{ color: '#00e676' }}>📋 Invoice Details</div>
          <div className="page-subtitle">Your billing information for DBH Deals</div>
        </div>
      </div>
      <div className="page-body">
        <div className="card" style={{ maxWidth: 600, borderColor: 'rgba(0,230,118,0.2)' }}>
          <div className="card-title">Billing Information</div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>This information will be used for your subscription invoices.</p>
          <div className="input-group">
            <label className="input-label">Full Name *</label>
            <input className="input" value={form.deals_invoice_name} onChange={e => setForm({ ...form, deals_invoice_name: e.target.value })} placeholder="Your full name" />
          </div>
          <div className="input-group">
            <label className="input-label">Business Name</label>
            <input className="input" value={form.deals_invoice_business} onChange={e => setForm({ ...form, deals_invoice_business: e.target.value })} placeholder="Business name (optional)" />
          </div>
          <div className="input-group">
            <label className="input-label">Email Address *</label>
            <input className="input" type="email" value={form.deals_invoice_email} onChange={e => setForm({ ...form, deals_invoice_email: e.target.value })} placeholder="Email for invoices" />
          </div>
          <button className="btn btn-primary deals" onClick={handleSave} disabled={saving || !form.deals_invoice_name || !form.deals_invoice_email}>{saving ? "Saving..." : hasSaved ? "Update Details" : "Save Details"}</button>
        </div>
        {hasSaved && (
          <div className="card" style={{ maxWidth: 600, marginTop: 20, background: 'rgba(0,230,118,0.03)', borderColor: 'rgba(0,230,118,0.15)' }}>
            <div className="card-title" style={{ color: '#00e676' }}>✓ Current Details</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8, fontSize: 14 }}>
              <div><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Name:</span> <strong>{dbProfile.deals_invoice_name}</strong></div>
              {dbProfile.deals_invoice_business && <div><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Business:</span> <strong>{dbProfile.deals_invoice_business}</strong></div>}
              <div><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Email:</span> <strong>{dbProfile.deals_invoice_email}</strong></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Admin Deals Management Page
function AdminDealsPage({ token, showToast }) {
  const fmtRoi = (val) => { const n = parseFloat(val || 0); return n > 0 && n < 3 ? (n*100).toFixed(0) : n.toFixed(0); };
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    product_name: '', asin: '', cost_price: '', sale_price: '', profit: '', roi: '', spm: '', code: '', source_url: '', amazon_url: '', notes: ''
  });

  useEffect(() => { loadDeals(); }, [selectedDate]);

  const loadDeals = async () => {
    setLoading(true);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/deals?deal_date=eq.${selectedDate}&order=sort_order.asc.nullsfirst,created_at.desc`, { headers: supabase.headers(token) });
    const data = await res.json();
    if (Array.isArray(data)) setDeals(data);
    setLoading(false);
  };

  const moveDeal = async (index, direction) => {
    const newDeals = [...deals];
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= newDeals.length) return;
    [newDeals[index], newDeals[swapIndex]] = [newDeals[swapIndex], newDeals[index]];
    setDeals(newDeals);
    // Save new sort orders
    await Promise.all(newDeals.map((deal, i) => 
      fetch(`${SUPABASE_URL}/rest/v1/deals?id=eq.${deal.id}`, {
        method: 'PATCH',
        headers: { ...supabase.headers(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ sort_order: i })
      })
    ));
  };

  const resetForm = () => {
    setForm({ product_name: '', asin: '', cost_price: '', sale_price: '', profit: '', roi: '', spm: '', code: '', source_url: '', amazon_url: '', notes: '' });
    setEditingId(null);
  };

  const calculateMetrics = (cost, sale) => {
    const c = parseFloat(cost) || 0;
    const s = parseFloat(sale) || 0;
    const profit = s - c;
    const roi = c > 0 ? (profit / c) * 100 : 0;
    return { profit: profit.toFixed(2), roi: roi.toFixed(1) };
  };

  const updatePrices = (field, value) => {
    const newForm = { ...form, [field]: value };
    if (field === 'cost_price' || field === 'sale_price') {
      const metrics = calculateMetrics(
        field === 'cost_price' ? value : form.cost_price,
        field === 'sale_price' ? value : form.sale_price
      );
      newForm.profit = metrics.profit;
      newForm.roi = metrics.roi;
    }
    setForm(newForm);
  };

  const saveDeal = async () => {
    if (!form.product_name || !form.asin) return;
    setSaving(true);
    const dealData = { ...form, deal_date: selectedDate, is_published: false };
    
    if (editingId) {
      await fetch(`${SUPABASE_URL}/rest/v1/deals?id=eq.${editingId}`, {
        method: 'PATCH',
        headers: { ...supabase.headers(token), 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify(dealData)
      });
      showToast('Deal updated!');
    } else {
      await fetch(`${SUPABASE_URL}/rest/v1/deals`, {
        method: 'POST',
        headers: { ...supabase.headers(token), 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify(dealData)
      });
      showToast('Deal added!');
    }
    
    resetForm();
    setShowForm(false);
    loadDeals();
    setSaving(false);
  };

  const editDeal = (deal) => {
    setForm({
      product_name: deal.product_name || '',
      asin: deal.asin || '',
      cost_price: deal.cost_price || '',
      sale_price: deal.sale_price || '',
      profit: deal.profit || '',
      roi: deal.roi || '',
      spm: deal.spm || '',
      code: deal.code || '',
      source_url: deal.source_url || '',
      amazon_url: deal.amazon_url || '',
      notes: deal.notes || ''
    });
    setEditingId(deal.id);
    setShowForm(true);
  };

  const deleteDeal = async (id) => {
    if (!confirm('Delete this deal?')) return;
    await fetch(`${SUPABASE_URL}/rest/v1/deals?id=eq.${id}`, { method: 'DELETE', headers: supabase.headers(token) });
    showToast('Deal deleted!');
    loadDeals();
  };

  const publishDeals = async () => {
    if (!confirm(`Publish all ${deals.length} deals for ${selectedDate}? This will make them visible to subscribers.`)) return;
    await fetch(`${SUPABASE_URL}/rest/v1/deals?deal_date=eq.${selectedDate}`, {
      method: 'PATCH',
      headers: { ...supabase.headers(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_published: true })
    });
    showToast('Deals published!');
    loadDeals();
  };

  const unpublishedCount = deals.filter(d => !d.is_published).length;
  const formatCurrency = (val) => `£${parseFloat(val || 0).toFixed(2)}`;

  return (
    <div className="deals-theme">
      <div className="page-header deals-header">
        <div>
          <div className="page-title" style={{ color: '#00e676' }}>📋 DBH Deals Admin</div>
          <div className="page-subtitle">Manage daily deal sheets</div>
        </div>
      </div>
      <div className="page-body">
        {/* Date & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d.toISOString().split('T')[0]); }}>←</button>
            <input type="date" className="input" style={{ width: 160, colorScheme: 'dark' }} value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
            <button className="btn btn-secondary" onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d.toISOString().split('T')[0]); }}>→</button>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-primary deals" onClick={() => { resetForm(); setShowForm(true); }}><Icons.Plus /> Add Deal</button>
            {deals.length > 0 && unpublishedCount > 0 && (
              <button className="btn btn-primary" style={{ background: '#ff9100' }} onClick={publishDeals}>
                🚀 Publish {unpublishedCount} Deal{unpublishedCount > 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <div className="card" style={{ marginBottom: 24, borderColor: 'rgba(0,230,118,0.3)' }}>
            <div className="card-title">{editingId ? 'Edit Deal' : 'Add New Deal'}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
              <div className="input-group"><label className="input-label">Product Name *</label><input className="input" value={form.product_name} onChange={e => setForm({ ...form, product_name: e.target.value })} /></div>
              <div className="input-group"><label className="input-label">ASIN *</label><input className="input" value={form.asin} onChange={e => setForm({ ...form, asin: e.target.value })} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
              <div className="input-group"><label className="input-label">Cost Price (£)</label><input type="number" step="0.01" className="input" value={form.cost_price} onChange={e => updatePrices('cost_price', e.target.value)} /></div>
              <div className="input-group"><label className="input-label">Sale Price (£)</label><input type="number" step="0.01" className="input" value={form.sale_price} onChange={e => updatePrices('sale_price', e.target.value)} /></div>
              <div className="input-group"><label className="input-label">Profit (£)</label><input type="number" step="0.01" className="input" value={form.profit} readOnly style={{ background: 'var(--bg-secondary)' }} /></div>
              <div className="input-group"><label className="input-label">ROI (%)</label><input type="number" step="0.1" className="input" value={form.roi} readOnly style={{ background: 'var(--bg-secondary)' }} /></div>
              <div className="input-group"><label className="input-label">SPM</label><input className="input" value={form.spm} onChange={e => setForm({ ...form, spm: e.target.value })} placeholder="> 50" /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div className="input-group"><label className="input-label">Discount Code</label><input className="input" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="e.g. SAVE20" /></div>
              <div className="input-group"><label className="input-label">Source URL</label><input className="input" value={form.source_url} onChange={e => setForm({ ...form, source_url: e.target.value })} placeholder="https://..." /></div>
              <div className="input-group"><label className="input-label">Amazon URL</label><input className="input" value={form.amazon_url} onChange={e => setForm({ ...form, amazon_url: e.target.value })} placeholder="https://amazon.co.uk/..." /></div>
            </div>
            <div className="input-group"><label className="input-label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any additional notes for subscribers..." /></div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-primary deals" onClick={saveDeal} disabled={saving}>{saving ? 'Saving...' : editingId ? 'Update Deal' : 'Add Deal'}</button>
              <button className="btn btn-secondary" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Deals List */}
        {loading ? (
          <div className="card empty-state"><div className="spinner" style={{ borderTopColor: '#00e676' }} /></div>
        ) : deals.length === 0 ? (
          <div className="card empty-state" style={{ background: 'rgba(0,230,118,0.02)', borderColor: 'rgba(0,230,118,0.1)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
            <p>No deals for this date yet.</p>
            <p style={{ fontSize: 13, marginTop: 8 }}>Click "Add Deal" to get started.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 30 }}>#</th>
                  <th>Product</th>
                  <th>ASIN</th>
                  <th>Cost</th>
                  <th>Sale</th>
                  <th>Profit</th>
                  <th>ROI</th>
                  <th>SPM</th>
                  <th>Code</th>
                  <th>Notes</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {deals.map((deal, index) => (
                  <tr key={deal.id}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <button onClick={() => moveDeal(index, -1)} disabled={index === 0} style={{ background: 'none', border: 'none', color: index === 0 ? 'var(--border)' : 'var(--text-secondary)', cursor: index === 0 ? 'default' : 'pointer', fontSize: 14, padding: 0, lineHeight: 1 }}>▲</button>
                        <button onClick={() => moveDeal(index, 1)} disabled={index === deals.length - 1} style={{ background: 'none', border: 'none', color: index === deals.length - 1 ? 'var(--border)' : 'var(--text-secondary)', cursor: index === deals.length - 1 ? 'default' : 'pointer', fontSize: 14, padding: 0, lineHeight: 1 }}>▼</button>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600, maxWidth: 200 }}>{deal.product_name}</td>
                    <td className="mono" style={{ fontSize: 12 }}>{deal.asin}</td>
                    <td className="mono">{formatCurrency(deal.cost_price)}</td>
                    <td className="mono">{formatCurrency(deal.sale_price)}</td>
                    <td className="mono" style={{ color: '#00e676', fontWeight: 600 }}>{formatCurrency(deal.profit)}</td>
                    <td className="mono" style={{ color: 'var(--cyan)' }}>{fmtRoi(deal.roi)}%</td>
                    <td>{deal.spm || '—'}</td>
                    <td className="mono" style={{ color: 'var(--purple)' }}>{deal.code || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 200 }}>{deal.notes || '—'}</td>
                    <td>{deal.is_published ? <span className="deals-badge">Published</span> : <span className="badge badge-pending">Draft</span>}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn-icon" onClick={() => editDeal(deal)}><Icons.Edit /></button>
                        <button className="btn-icon btn-danger" onClick={() => deleteDeal(deal.id)}><Icons.Trash /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ ADMIN PAGES ============
function AdminPrepPage({ token, showToast }) {
  const [clients, setClients] = useState([]);
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");

  useEffect(() => { loadData(); }, []);
  const loadData = async () => {
    setLoading(true);
    const [p, c, s] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/parcels?select=*&order=created_at.desc`, { headers: supabase.headers(token) }).then(r => r.json()),
      fetch(`${SUPABASE_URL}/rest/v1/profiles?select=*`, { headers: supabase.headers(token) }).then(r => r.json()),
      fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.discord_webhook_url`, { headers: supabase.headers(token) }).then(r => r.json())
    ]);
    if (Array.isArray(p)) setParcels(p);
    if (Array.isArray(c)) setClients(c.filter(x => x.email !== ADMIN_EMAIL));
    if (s?.[0]?.value) setWebhookUrl(s[0].value);
    setLoading(false);
  };

  const clientParcels = selectedClient ? parcels.filter(p => p.user_id === selectedClient.id) : parcels;
  const sorted = sortByStatus(clientParcels);

  const startEdit = item => {
    setEditingId(item.id);
    setEditData({ status: item.status || "in_transit", admin_notes: item.admin_notes || "", needs_attention: item.needs_attention || false, attention_reason: item.attention_reason || "" });
  };

  const saveEdit = async () => {
    setSaving(true);
    const oldItem = parcels.find(p => p.id === editingId);
    await fetch(`${SUPABASE_URL}/rest/v1/parcels?id=eq.${editingId}`, { method: "PATCH", headers: { ...supabase.headers(token), Prefer: "return=representation" }, body: JSON.stringify(editData) });
    const client = clients.find(c => c.id === oldItem?.user_id);
    const clientWebhook = client?.discord_webhook || webhookUrl;
    if (clientWebhook) {
      if (editData.status === "delivered" && oldItem?.status !== "delivered") {
        await sendDiscordNotification(clientWebhook, null, {
          title: "📬 DELIVERED TO WAREHOUSE",
          color: 0x00e5ff,
          fields: [
            { name: "Product", value: oldItem?.product_name || "Unknown", inline: true },
            { name: "Units", value: `${oldItem?.quantity || 0}`, inline: true },
            { name: "SKU", value: oldItem?.sku || "—", inline: true }
          ],
          footer: { text: client?.full_name || client?.email }
        });
      }
      if (editData.status === "prepped" && oldItem?.status !== "prepped") {
        await sendDiscordNotification(clientWebhook, null, {
          title: "✅ PREPPED & READY",
          color: 0x00c853,
          fields: [
            { name: "Product", value: oldItem?.product_name || "Unknown", inline: true },
            { name: "Units", value: `${oldItem?.quantity || 0}`, inline: true },
            { name: "SKU", value: oldItem?.sku || "—", inline: true }
          ],
          footer: { text: client?.full_name || client?.email }
        });
      }
      if (editData.status === "collected" && oldItem?.status !== "collected") {
        await sendDiscordNotification(clientWebhook, null, {
          title: "📦 COLLECTED",
          color: 0x22c55e,
          fields: [
            { name: "Product", value: oldItem?.product_name || "Unknown", inline: true },
            { name: "Units", value: `${oldItem?.quantity || 0}`, inline: true },
            { name: "SKU", value: oldItem?.sku || "—", inline: true }
          ],
          footer: { text: client?.full_name || client?.email }
        });
      }
      if (editData.needs_attention && !oldItem?.needs_attention) {
        await sendDiscordNotification(clientWebhook, null, {
          title: "⚠️ NEEDS ATTENTION",
          color: 0xef4444,
          fields: [
            { name: "Product", value: oldItem?.product_name || "Unknown", inline: true },
            { name: "Issue", value: editData.attention_reason || "Unknown", inline: true }
          ],
          description: editData.admin_notes || null,
          footer: { text: client?.full_name || client?.email }
        });
      }
    }
    showToast("Saved!"); setEditingId(null); loadData(); setSaving(false);
  };

  if (loading) return <div className="loader"><div className="spinner" /></div>;

  return (
    <><div className="page-header"><div><div className="page-title">Prep Management</div><div className="page-subtitle">{selectedClient ? `${selectedClient.full_name || selectedClient.email}` : "All clients"}</div></div>
      {selectedClient && <button className="back-btn" onClick={() => setSelectedClient(null)}><Icons.ArrowLeft /> All Clients</button>}
    </div>
    <div className="page-body">
      {!selectedClient && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 16, marginBottom: 24 }}>{clients.map(c => { const cp = parcels.filter(p => p.user_id === c.id); const inbound = cp.filter(p => ["in_transit", "delivered"].includes(p.status)).length; return <div key={c.id} className="client-card" onClick={() => setSelectedClient(c)}><div style={{ fontWeight: 700 }}>{c.full_name || "No Name"}</div><div style={{ fontSize: 13, color: "var(--text-muted)" }}>{c.email}</div><div style={{ marginTop: 8, fontSize: 13 }}>Inbound: <span style={{ fontWeight: 700, color: "var(--cyan)" }}>{inbound}</span> • Total: {cp.length}</div></div>; })}</div>}
      {sorted.length === 0 ? <div className="card empty-state"><Icons.Package /><p>No parcels.</p></div> :
      <div className="card" style={{ padding: 0, overflow: "hidden" }}><div className="table-wrap"><table>
        <thead><tr>{!selectedClient && <th>Client</th>}<th>Date</th><th>Product</th><th>Qty</th><th>Status</th><th>Notes</th><th>Flag</th><th></th></tr></thead>
        <tbody>{sorted.map(p => {
          const client = clients.find(c => c.id === p.user_id);
          const isEdit = editingId === p.id, data = isEdit ? editData : p;
          return <tr key={p.id} className={isEdit ? "edit-row" : ""}>
            {!selectedClient && <td style={{ fontSize: 13 }}>{client?.full_name || client?.email || "—"}</td>}
            <td style={{ fontSize: 12 }}>{formatShortDate(p.date_added)}</td>
            <td style={{ fontWeight: 600 }}>{p.product_name}<div style={{ fontSize: 11, color: "var(--text-muted)" }}>{p.sku}</div></td>
            <td className="mono">{p.quantity}</td>
            <td>{isEdit ? <select className="inline-select" value={data.status} onChange={e => setEditData({ ...editData, status: e.target.value })}>{PREP_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}</select> : p.needs_attention ? <span className="badge badge-attention">{p.attention_reason}</span> : <StatusBadge status={p.status} />}</td>
            <td>{isEdit ? <input className="inline-input" value={data.admin_notes} onChange={e => setEditData({ ...editData, admin_notes: e.target.value })} placeholder="Notes..." /> : <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{p.admin_notes || "—"}</span>}</td>
            <td>{isEdit ? <div><label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}><input type="checkbox" checked={data.needs_attention} onChange={e => setEditData({ ...editData, needs_attention: e.target.checked })} /> Flag</label>{data.needs_attention && <select className="inline-select" style={{ marginTop: 4, width: "100%" }} value={data.attention_reason} onChange={e => setEditData({ ...editData, attention_reason: e.target.value })}><option value="">Select reason</option>{ATTENTION_REASONS.map(r => <option key={r} value={r}>{r}</option>)}</select>}</div> : "—"}</td>
            <td>{isEdit ? <div style={{ display: "flex", gap: 4 }}><button className="btn-icon" onClick={saveEdit} disabled={saving}><Icons.Save /></button><button className="btn-icon btn-danger" onClick={() => setEditingId(null)}><Icons.X /></button></div> : <button className="btn-icon" onClick={() => startEdit(p)}><Icons.Edit /></button>}</td>
          </tr>;
        })}</tbody>
      </table></div></div>}
    </div></>
  );
}

const RETURN_COST_PER_UNIT = 7.10; // £3.55 outbound + £3.55 return label

// ============================================================================
// REMOVALS SYSTEM — added 10 June 2026
// ============================================================================
// New data model: one removals row per Amazon removal order, one removal_units
// row per physical unit (one per LPN). Lives alongside the old liquidation_stock
// and liquidation_sales tables — does not replace them.

const RETURN_REASONS = [
  "DEFECTIVE", "DAMAGED_BY_FC", "UNWANTED_ITEM", "QUALITY_UNACCEPTABLE",
  "NOT_COMPATIBLE", "NO_REASON_GIVEN", "ORDERED_WRONG", "FOUND_BETTER_PRICE",
  "UNAUTHORIZED_PURCHASE"
];

const CONDITIONS = ["NEW", "OPEN_BOX", "USED", "UNSEALED", "BROKEN", "MISSING_PARTS"];

const UNIT_STATUSES = ["received", "listed", "sold", "returned", "written_off"];

// Parse Amazon's CSV reports. We detect by column headers — accepts any of:
//   - Removal Order Detail (17 cols)
//   - Removal Shipment Detail (10 cols, has tracking)
//   - Customer Returns Report (per-unit, has LPN + reason)
function parseAmazonRemovalCSV(text) {
  // Simple CSV parser (handles quoted fields with commas)
  const rawLines = text.split(/\r?\n/).filter(l => l.trim());
  if (rawLines.length < 2) return { error: "CSV has no data rows" };
  const parseLine = (line) => {
    const out = []; let cur = ""; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { inQ = !inQ; continue; }
      if (c === "," && !inQ) { out.push(cur); cur = ""; continue; }
      cur += c;
    }
    out.push(cur);
    return out;
  };
  // Skip junk leading rows (e.g. a "CSV,,,,," row). Header is first row with a known key column.
  const isHeaderRow = (cells) => {
    const low = cells.map(c => (c || "").trim().toLowerCase());
    return low.includes("uid") || low.includes("removal order id") ||
           low.includes("order-id") || low.includes("order id") ||
           low.includes("lpn number") || low.includes("lpn");
  };
  let headerIdx = 0;
  for (let i = 0; i < Math.min(rawLines.length, 10); i++) {
    if (isHeaderRow(parseLine(rawLines[i]))) { headerIdx = i; break; }
  }
  const headers = parseLine(rawLines[headerIdx]).map(h => h.trim().toLowerCase());
  const rows = rawLines.slice(headerIdx + 1).map(parseLine).filter(r => r.some(c => c.trim()));

  const colIdxOf = (name) => headers.indexOf(name);
  const getAny = (row, names) => {
    for (const n of names) {
      const i = colIdxOf(n);
      if (i >= 0 && (row[i] || "").trim()) return (row[i] || "").trim();
    }
    return "";
  };

  const hasLPN = headers.includes("lpn") || headers.includes("lpn number") || headers.includes("lpn-number");
  const hasTracking = headers.includes("tracking-number") || headers.includes("tracking");
  const hasReturnReason = headers.some(h => h.includes("reason"));
  const hasUID = headers.includes("uid");
  let reportType = "unknown";
  if (hasUID) reportType = "template";
  else if (hasLPN && hasReturnReason) reportType = "customer_returns";
  else if (hasTracking) reportType = "removal_shipment";
  else if (headers.includes("requested-quantity")) reportType = "removal_order";

  const parsed = rows.map(r => ({
    sheet_uid: getAny(r, ["uid"]),
    request_date: (getAny(r, ["request-date", "date"]) || "").slice(0, 10),
    order_id: getAny(r, ["order-id", "removal order id", "order id"]),
    sku: getAny(r, ["sku"]),
    fnsku: getAny(r, ["fnsku"]),
    asin: getAny(r, ["asin"]),
    lpn: getAny(r, ["lpn", "lpn number", "lpn-number"]),
    disposition: getAny(r, ["disposition", "status"]),
    return_reason: getAny(r, ["reason", "return-reason", "return reason"]),
    customer_comments: getAny(r, ["customer-comments", "comments", "condition"]),
    shipped_quantity: parseInt(getAny(r, ["shipped-quantity", "qty", "quantity"]) || "0", 10) || 0,
    shipment_date: (getAny(r, ["shipment-date", "date shipped"]) || "").slice(0, 10),
    carrier: getAny(r, ["carrier"]),
    tracking_number: getAny(r, ["tracking-number", "tracking"]),
    removal_order_type: getAny(r, ["removal-order-type", "order-type", "type"]),
    product_name: getAny(r, ["product-name", "product name", "title"])
  })).filter(r => r.sheet_uid || r.order_id);
  return { reportType, headers, rows: parsed };
}

function RemovalUploadModal({ open, onClose, userId, token, onComplete, showToast }) {
  const [file, setFile] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [uploading, setUploading] = useState(false);
  const h = { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}`, "Content-Type": "application/json", "Prefer": "return=representation" };

  if (!open) return null;

  const handleFile = async (f) => {
    if (!f) return;
    setFile(f);
    const text = await f.text();
    const result = parseAmazonRemovalCSV(text);
    setParsed(result);
  };

  const handleUpload = async () => {
    if (!parsed || !parsed.rows || parsed.rows.length === 0) return;
    setUploading(true);
    try {
      // Dedup on UID (per client). Fetch this user's existing removal-unit UIDs first.
      const existUidRes = await fetch(`${SUPABASE_URL}/rest/v1/liquidation_stock?user_id=eq.${userId}&sheet_uid=not.is.null&select=sheet_uid&limit=20000`, { headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}` } });
      const existUidList = await existUidRes.json();
      const existingUids = new Set((Array.isArray(existUidList) ? existUidList : []).map(x => x.sheet_uid).filter(Boolean));

      // Only rows with a UID we don't already have. Rows without a UID fall back to old behaviour.
      const skipped = parsed.rows.filter(r => r.sheet_uid && existingUids.has(r.sheet_uid)).length;
      const toAdd = parsed.rows.filter(r => !r.sheet_uid || !existingUids.has(r.sheet_uid));

      // Group the new rows by removal order_id (blank order id -> one shared bucket).
      const groups = {};
      for (const r of toAdd) {
        const key = r.order_id || "__no_order__";
        if (!groups[key]) groups[key] = [];
        groups[key].push(r);
      }
      let removalsCreated = 0, unitsCreated = 0;
      const seenUids = new Set();
      // Seed sequential dbh_sku for this client (removal units become normal stock rows).
      const profRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=full_name,email`, { headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}` } });
      const prof = (await profRes.json())?.[0] || {};
      const clientName = ((prof.full_name || prof.email || "REM").split(" ")[0]).toUpperCase().slice(0, 6);
      const lastSkuRes = await fetch(`${SUPABASE_URL}/rest/v1/liquidation_stock?user_id=eq.${userId}&select=dbh_sku&order=created_at.desc&limit=1`, { headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}` } });
      const lastSku = (await lastSkuRes.json())?.[0]?.dbh_sku;
      let skuNum = lastSku ? (parseInt(lastSku.split("-").pop()) || 0) : 0;
      const skuDate = new Date().toISOString().split("T")[0].replace(/-/g, "").slice(2);
      for (const key of Object.keys(groups)) {
        const grpRows = groups[key];
        const first = grpRows[0];
        const orderId = key === "__no_order__" ? null : key;
        let removalId = null;
        if (orderId) {
          const existRes = await fetch(`${SUPABASE_URL}/rest/v1/removals?user_id=eq.${userId}&removal_order_id=eq.${encodeURIComponent(orderId)}&select=id`, { headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}` } });
          const existRows = await existRes.json();
          if (Array.isArray(existRows) && existRows.length > 0) {
            removalId = existRows[0].id;
          } else {
            const cRes = await fetch(`${SUPABASE_URL}/rest/v1/removals`, { method: "POST", headers: h, body: JSON.stringify({
              user_id: userId, removal_order_id: orderId,
              request_date: first.request_date || null,
              removal_order_type: first.removal_order_type || null, status: "active"
            }) });
            const created = await cRes.json();
            removalId = Array.isArray(created) ? created[0].id : created.id;
            removalsCreated++;
          }
        } else {
          // No order id on the sheet — use/create a catch-all removal so units have a parent.
          const catchId = "TEMPLATE-UPLOAD";
          const existRes = await fetch(`${SUPABASE_URL}/rest/v1/removals?user_id=eq.${userId}&removal_order_id=eq.${encodeURIComponent(catchId)}&select=id`, { headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}` } });
          const existRows = await existRes.json();
          if (Array.isArray(existRows) && existRows.length > 0) {
            removalId = existRows[0].id;
          } else {
            const cRes = await fetch(`${SUPABASE_URL}/rest/v1/removals`, { method: "POST", headers: h, body: JSON.stringify({
              user_id: userId, removal_order_id: catchId, status: "active"
            }) });
            const created = await cRes.json();
            removalId = Array.isArray(created) ? created[0].id : created.id;
            removalsCreated++;
          }
        }
        for (const r of grpRows) {
          // Guard against duplicate UIDs within the same file.
          if (r.sheet_uid && seenUids.has(r.sheet_uid)) continue;
          if (r.sheet_uid) seenUids.add(r.sheet_uid);
          skuNum++;
          const dbh_sku = `${skuDate}-${clientName}-${String(skuNum).padStart(3, "0")}`;
          await fetch(`${SUPABASE_URL}/rest/v1/liquidation_stock`, { method: "POST", headers: h, body: JSON.stringify({
            user_id: userId, dbh_sku,
            removal_order_id: orderId || "TEMPLATE-UPLOAD",
            sheet_uid: r.sheet_uid || null,
            lpn_number: r.lpn || null, asin: r.asin || null, sku: r.sku || null,
            product_name: r.product_name || r.sku || null,
            return_reason: r.return_reason || null,
            condition: r.customer_comments || null,
            quantity: 1, received: false, listed: false,
            date_added: r.request_date || new Date().toISOString().slice(0, 10)
          }) });
          unitsCreated++;
        }
      }
      showToast(`✓ ${unitsCreated} new unit(s) added · ${skipped} already existed (skipped)`);
      onComplete && onComplete();
      setFile(null); setParsed(null);
      onClose();
    } catch (e) {
      console.error(e);
      showToast(`❌ Upload failed: ${e.message}`);
    } finally {
      setUploading(false);
    }
  };

  return <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
    <div style={{ background: "#1a1a1a", border: "1px solid var(--border)", borderRadius: 12, padding: 28, maxWidth: 820, width: "100%", maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, paddingBottom: 14, borderBottom: "1px solid var(--border)" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>📥 Upload Removal CSV</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Import Amazon removal data — supports 3 report types</div>
        </div>
        <button onClick={onClose} style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 18, width: 32, height: 32, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
      </div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14, lineHeight: 1.7, padding: 12, background: "rgba(0,229,255,0.04)", border: "1px solid rgba(0,229,255,0.15)", borderRadius: 8 }}>
        <div style={{ fontWeight: 700, color: "var(--cyan)", marginBottom: 6 }}>Supported reports (Seller Central → Reports → Fulfillment):</div>
        • <b style={{ color: "var(--text-secondary)" }}>Removal Order Detail</b> — creates removals + placeholder units<br/>
        • <b style={{ color: "var(--text-secondary)" }}>Removal Shipment Detail</b> — adds tracking + shipment dates<br/>
        • <b style={{ color: "var(--text-secondary)" }}>Customer Returns Report</b> — adds LPNs, ASINs, return reasons<br/>
        <span style={{ display: "block", marginTop: 6, fontStyle: "italic" }}>Upload all three over time to fully populate. The portal merges as data arrives.</span>
      </div>
      <input type="file" accept=".csv,.tsv,.txt" onChange={e => handleFile(e.target.files?.[0])} style={{ padding: 14, background: "rgba(0,0,0,0.3)", border: "1px dashed var(--border)", borderRadius: 8, width: "100%", color: "var(--text-secondary)", marginBottom: 14, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }} />
      {parsed && parsed.rows && <div>
        <div style={{ padding: 10, background: "var(--bg-secondary)", borderRadius: 8, marginBottom: 12, fontSize: 12 }}>
          <div><b>Report type:</b> {parsed.reportType === "removal_order" ? "Removal Order Detail" : parsed.reportType === "removal_shipment" ? "Removal Shipment Detail" : parsed.reportType === "customer_returns" ? "Customer Returns Report" : "Unknown — best-effort import"}</div>
          <div><b>Rows found:</b> {parsed.rows.length}</div>
          <div><b>Unique removal orders:</b> {new Set(parsed.rows.map(r => r.order_id)).size}</div>
          <div><b>Total units (sum of shipped-quantity):</b> {parsed.rows.reduce((s, r) => s + (r.shipped_quantity || (r.lpn ? 1 : 0)), 0)}</div>
        </div>
        <div style={{ maxHeight: 240, overflow: "auto", border: "1px solid var(--border)", borderRadius: 8, marginBottom: 12 }}>
          <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
            <thead style={{ background: "var(--bg-secondary)", position: "sticky", top: 0 }}>
              <tr>
                <th style={{ padding: 6, textAlign: "left" }}>Order ID</th>
                <th style={{ padding: 6, textAlign: "left" }}>SKU</th>
                <th style={{ padding: 6, textAlign: "left" }}>FNSKU</th>
                <th style={{ padding: 6, textAlign: "left" }}>LPN</th>
                <th style={{ padding: 6 }}>Qty</th>
                <th style={{ padding: 6, textAlign: "left" }}>Reason / Status</th>
              </tr>
            </thead>
            <tbody>
              {parsed.rows.slice(0, 100).map((r, i) => <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ padding: 6 }}>{r.order_id}</td>
                <td style={{ padding: 6 }}>{r.sku?.slice(0, 18)}</td>
                <td style={{ padding: 6 }}>{r.fnsku}</td>
                <td style={{ padding: 6 }}>{r.lpn}</td>
                <td style={{ padding: 6, textAlign: "center" }}>{r.shipped_quantity || (r.lpn ? 1 : 0)}</td>
                <td style={{ padding: 6 }}>{r.return_reason || r.disposition}</td>
              </tr>)}
            </tbody>
          </table>
          {parsed.rows.length > 100 && <div style={{ padding: 8, textAlign: "center", color: "var(--text-muted)", fontSize: 11 }}>+ {parsed.rows.length - 100} more rows</div>}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "10px 18px", background: "transparent", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-secondary)", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button onClick={handleUpload} disabled={uploading} style={{ padding: "10px 18px", background: uploading ? "var(--text-muted)" : "var(--green)", color: "#000", border: "none", borderRadius: 8, cursor: uploading ? "wait" : "pointer", fontWeight: 700, fontFamily: "inherit" }}>{uploading ? "Uploading..." : `Import ${parsed.rows.length} row(s)`}</button>
        </div>
      </div>}
    </div>
  </div>;
}

// Shared Removals Tab — used in both client and admin views.
// Props:
//   userId: the client whose removals to show
//   token: auth token
//   isAdmin: enables edit/mark-sold/delete actions
//   showToast: toast fn
function RemovalsTab({ userId, token, isAdmin, showToast }) {
  const [removals, setRemovals] = useState([]);
  const [units, setUnits] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [editUnit, setEditUnit] = useState(null);
  const [editUnitForm, setEditUnitForm] = useState({});
  const h = { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };

  const load = async () => {
    setLoading(true);
    const [rRes, uRes, sRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/removals?user_id=eq.${userId}&order=request_date.desc.nullslast,created_at.desc`, { headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${SUPABASE_URL}/rest/v1/liquidation_stock?user_id=eq.${userId}&removal_order_id=not.is.null&order=created_at.desc`, { headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${SUPABASE_URL}/rest/v1/liquidation_sales?user_id=eq.${userId}&select=stock_id,sale_price,payout`, { headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}` } }).then(r => r.json())
    ]);
    if (Array.isArray(rRes)) setRemovals(rRes);
    if (Array.isArray(uRes)) setUnits(uRes);
    if (Array.isArray(sRes)) setSales(sRes);
    setLoading(false);
  };

  useEffect(() => { if (userId && token) load(); }, [userId, token]);

  const saleFor = (u) => sales.find(s => s.stock_id === u.id) || null;
  const isSold = (u) => (u.qty_sold || 0) > 0 || !!saleFor(u);
  const statusOf = (u) => isSold(u) ? "sold" : (u.received ? "listed" : "in transit");

  const unitStatsFor = (rem) => {
    const ru = units.filter(u => u.removal_order_id === rem.removal_order_id);
    return {
      total: ru.length,
      received: ru.filter(u => u.received).length,
      listed: ru.filter(u => u.received && !isSold(u)).length,
      sold: ru.filter(isSold).length,
      soldRevenue: ru.filter(isSold).reduce((s, u) => s + (parseFloat(saleFor(u)?.payout) || 0), 0),
      units: ru
    };
  };

  const visibleRemovals = removals.filter(r => showHidden ? true : r.status !== "hidden");

  const updateUnit = async (unitId, patch) => {
    await fetch(`${SUPABASE_URL}/rest/v1/liquidation_stock?id=eq.${unitId}`, { method: "PATCH", headers: h, body: JSON.stringify(patch) });
    load();
  };

  const deleteUnit = async (u) => {
    const warn = isSold(u) ? "This unit is SOLD - deleting it will unlink its sale record. " : "";
    if (!confirm(`${warn}Delete this unit? This can't be undone.`)) return;
    await fetch(`${SUPABASE_URL}/rest/v1/liquidation_stock?id=eq.${u.id}`, { method: "DELETE", headers: h });
    load();
  };

  const hideRemoval = async (removalId) => {
    await fetch(`${SUPABASE_URL}/rest/v1/removals?id=eq.${removalId}`, { method: "PATCH", headers: h, body: JSON.stringify({ status: "hidden" }) });
    showToast("Removal hidden");
    load();
  };

  const unhideRemoval = async (removalId) => {
    await fetch(`${SUPABASE_URL}/rest/v1/removals?id=eq.${removalId}`, { method: "PATCH", headers: h, body: JSON.stringify({ status: "active" }) });
    load();
  };

  const deleteRemoval = async (rem) => {
    const ru = units.filter(u => u.removal_order_id === rem.removal_order_id);
    const soldCount = ru.filter(isSold).length;
    let msg = `Delete removal ${rem.removal_order_id} and its ${ru.length} unit${ru.length === 1 ? "" : "s"}? This deletes the stock rows too and cannot be undone.`;
    if (soldCount > 0) {
      msg = `WARNING: this removal has ${soldCount} SOLD unit${soldCount === 1 ? "" : "s"}. Deleting the stock will unlink those sales. This cannot be undone. Continue?`;
    }
    if (!confirm(msg)) return;
    if (ru.length > 0) {
      await fetch(`${SUPABASE_URL}/rest/v1/liquidation_stock?user_id=eq.${userId}&removal_order_id=eq.${encodeURIComponent(rem.removal_order_id)}`, { method: "DELETE", headers: h });
    }
    await fetch(`${SUPABASE_URL}/rest/v1/removals?id=eq.${rem.id}`, { method: "DELETE", headers: h });
    showToast("Removal deleted");
    load();
  };

  const statusPill = (u) => {
    const st = statusOf(u);
    const bg = st === "sold" ? "rgba(0,230,118,0.15)" : st === "listed" ? "rgba(0,229,255,0.15)" : "rgba(255,255,255,0.05)";
    const col = st === "sold" ? "var(--green)" : st === "listed" ? "var(--cyan)" : "var(--text-secondary)";
    return <span style={{ padding: "2px 6px", borderRadius: 8, background: bg, color: col }}>{st}</span>;
  };

  if (loading) return <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading removals...</div>;

  return <div className="card" style={{ padding: 20 }}>
    <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 18, paddingBottom: 14, borderBottom: "1px solid var(--border)", flexWrap: "wrap" }}>
      <button onClick={() => setShowUpload(true)} style={{ padding: "10px 18px", background: "var(--cyan)", color: "#000", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontFamily: "inherit", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>📥 Upload Removal CSV</button>
      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-muted)", cursor: "pointer", padding: "8px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: 8 }}>
        <input type="checkbox" checked={showHidden} onChange={e => setShowHidden(e.target.checked)} /> Show hidden
      </label>
      <div style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)", display: "flex", gap: 12 }}>
        <div><span style={{ color: "var(--text-secondary)", fontWeight: 700 }}>{visibleRemovals.length}</span> removal{visibleRemovals.length === 1 ? "" : "s"}</div>
        <div style={{ color: "var(--border)" }}>·</div>
        <div><span style={{ color: "var(--text-secondary)", fontWeight: 700 }}>{units.length}</span> unit{units.length === 1 ? "" : "s"}</div>
      </div>
    </div>

    {visibleRemovals.length === 0 && <div style={{ padding: "50px 20px", textAlign: "center", color: "var(--text-muted)" }}>
      <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.5 }}>📋</div>
      <div style={{ fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>No removals yet</div>
      <div style={{ fontSize: 13 }}>Click "Upload Removal CSV" above. Units land in In Transit and update here live.</div>
    </div>}

    {visibleRemovals.map(rem => {
      const stats = unitStatsFor(rem);
      const expanded = expandedId === rem.id;
      const allSold = stats.total > 0 && stats.sold === stats.total;
      return <div key={rem.id} style={{ marginBottom: 10, background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
        <div onClick={() => setExpandedId(expanded ? null : rem.id)} style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", borderBottom: expanded ? "1px solid var(--border)" : "none" }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{expanded ? "▼" : "▶"}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
              📦 {rem.removal_order_id}
              {rem.google_drive_folder && <a href={rem.google_drive_folder} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} title="Open photos folder" style={{ fontSize: 11, padding: "2px 8px", background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.25)", borderRadius: 6, color: "var(--cyan)", textDecoration: "none", fontWeight: 600 }}>📁 Photos</a>}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              {rem.request_date ? new Date(rem.request_date).toLocaleDateString("en-GB") : "no date"}
              {rem.removal_order_type ? ` · ${rem.removal_order_type}` : ""}
            </div>
          </div>
          <div style={{ display: "flex", gap: 14, fontSize: 11 }}>
            <div style={{ textAlign: "center" }}><div style={{ fontWeight: 700, fontSize: 16 }}>{stats.total}</div><div style={{ color: "var(--text-muted)" }}>units</div></div>
            <div style={{ textAlign: "center" }}><div style={{ fontWeight: 700, fontSize: 16, color: stats.received === stats.total && stats.total > 0 ? "var(--green)" : "var(--text-secondary)" }}>{stats.received}</div><div style={{ color: "var(--text-muted)" }}>delivered</div></div>
            <div style={{ textAlign: "center" }}><div style={{ fontWeight: 700, fontSize: 16, color: "var(--cyan)" }}>{stats.listed}</div><div style={{ color: "var(--text-muted)" }}>listed</div></div>
            <div style={{ textAlign: "center" }}><div style={{ fontWeight: 700, fontSize: 16, color: "var(--orange)" }}>{stats.sold}</div><div style={{ color: "var(--text-muted)" }}>sold</div></div>
            {stats.soldRevenue > 0 && <div style={{ textAlign: "center" }}><div style={{ fontWeight: 700, fontSize: 16, color: "var(--green)" }}>£{stats.soldRevenue.toFixed(2)}</div><div style={{ color: "var(--text-muted)" }}>total payout</div></div>}
          </div>
          {allSold && <div style={{ fontSize: 10, padding: "2px 8px", background: "rgba(0,230,118,0.15)", color: "var(--green)", borderRadius: 12, fontWeight: 700 }}>COMPLETE</div>}
          {rem.status === "hidden" && <div style={{ fontSize: 10, padding: "2px 8px", background: "rgba(255,255,255,0.05)", color: "var(--text-muted)", borderRadius: 12 }}>HIDDEN</div>}
          {isAdmin && allSold && rem.status !== "hidden" && <button onClick={e => { e.stopPropagation(); hideRemoval(rem.id); }} style={{ fontSize: 10, padding: "4px 10px", background: "transparent", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-muted)", cursor: "pointer" }}>Hide</button>}
          {isAdmin && rem.status === "hidden" && <button onClick={e => { e.stopPropagation(); unhideRemoval(rem.id); }} style={{ fontSize: 10, padding: "4px 10px", background: "transparent", border: "1px solid var(--border)", borderRadius: 6, color: "var(--cyan)", cursor: "pointer" }}>Unhide</button>}
          {isAdmin && <button onClick={e => { e.stopPropagation(); deleteRemoval(rem); }} title="Delete entire removal" style={{ fontSize: 10, padding: "4px 10px", background: "transparent", border: "1px solid var(--red)", borderRadius: 6, color: "var(--red)", cursor: "pointer", fontWeight: 700 }}>🗑 Delete</button>}
        </div>

        {expanded && <div style={{ padding: "0 0 10px 0", overflowX: "auto" }}>
          {isAdmin && <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 8, borderTop: "1px solid var(--border)", background: "rgba(0,0,0,0.15)" }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>📁 Drive Folder:</span>
            <input
              placeholder="https://drive.google.com/drive/folders/..."
              defaultValue={rem.google_drive_folder || ""}
              onBlur={async e => {
                const v = e.target.value.trim();
                if (v === (rem.google_drive_folder || "")) return;
                await fetch(`${SUPABASE_URL}/rest/v1/removals?id=eq.${rem.id}`, { method: "PATCH", headers: h, body: JSON.stringify({ google_drive_folder: v || null }) });
                load();
                showToast(v ? "Drive folder saved" : "Drive folder cleared");
              }}
              style={{ flex: 1, padding: "6px 10px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", fontSize: 11, fontFamily: "inherit" }}
            />
          </div>}
          {stats.units.length === 0 ? <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>No units in this removal.</div> :
          <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
            <thead><tr style={{ background: "rgba(0,0,0,0.2)" }}>
              <th style={{ padding: 6, textAlign: "left" }}>UID</th>
              <th style={{ padding: 6, textAlign: "left" }}>LPN</th>
              <th style={{ padding: 6, textAlign: "left" }}>Product / SKU</th>
              <th style={{ padding: 6, textAlign: "left" }}>ASIN</th>
              <th style={{ padding: 6, textAlign: "left" }}>Reason</th>
              <th style={{ padding: 6, textAlign: "left" }}>Condition</th>
              <th style={{ padding: 6, textAlign: "left" }}>Status</th>
              <th style={{ padding: 6, textAlign: "right" }}>Sale</th>
              <th style={{ padding: 6, textAlign: "right" }}>Payout</th>
              <th style={{ padding: 6, textAlign: "center" }}>Photos</th>
              {isAdmin && <th style={{ padding: 6 }}>Actions</th>}
            </tr></thead>
            <tbody>
              {stats.units.map(u => { const sale = saleFor(u); const amt = sale?.sale_price ?? u.sale_price; return <tr key={u.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ padding: 6, fontFamily: "monospace", fontSize: 10, color: "var(--cyan)" }}>{u.sheet_uid || "—"}</td>
                <td style={{ padding: 6, fontFamily: "monospace", fontSize: 10 }}>{u.lpn_number || "—"}</td>
                <td style={{ padding: 6 }}>{u.product_name || u.sku || "—"}</td>
                <td style={{ padding: 6, fontFamily: "monospace", fontSize: 10 }}>{u.asin || "—"}</td>
                <td style={{ padding: 6, fontSize: 10, color: "var(--amber)" }}>{u.return_reason || "—"}</td>
                <td style={{ padding: 6, fontSize: 10 }}>{u.condition || "—"}</td>
                <td style={{ padding: 6, fontSize: 10 }}>{statusPill(u)}</td>
                <td style={{ padding: 6, textAlign: "right", fontSize: 11 }}>{amt ? `£${parseFloat(amt).toFixed(2)}` : "—"}</td>
                <td style={{ padding: 6, textAlign: "right", fontSize: 11 }}>{sale?.payout ? `£${parseFloat(sale.payout).toFixed(2)}` : "—"}</td>
                <td style={{ padding: 6, textAlign: "center", fontSize: 12, whiteSpace: "nowrap" }}>
                  {u.item_photos_url && <a href={u.item_photos_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} title="Item photos" style={{ textDecoration: "none", marginRight: 6 }}>📷</a>}
                  {u.slip_photo_url && <a href={u.slip_photo_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} title="Slip photo" style={{ textDecoration: "none" }}>📄</a>}
                  {!u.item_photos_url && !u.slip_photo_url && <span style={{ color: "var(--text-muted)" }}>—</span>}
                </td>
                {isAdmin && <td style={{ padding: 6 }}>
                  <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                    <button onClick={() => { setEditUnit(u); setEditUnitForm({
                      lpn_number: u.lpn_number || "", product_name: u.product_name || "", asin: u.asin || "", sku: u.sku || "",
                      return_reason: u.return_reason || "", condition: u.condition || "",
                      item_photos_url: u.item_photos_url || "", slip_photo_url: u.slip_photo_url || ""
                    }); }} title="Edit" style={{ padding: "3px 6px", background: "transparent", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text-secondary)", cursor: "pointer", fontSize: 10 }}>✏️</button>
                    <button onClick={() => deleteUnit(u)} title="Delete" style={{ padding: "3px 6px", background: "transparent", border: "1px solid var(--border)", borderRadius: 4, color: "var(--red)", cursor: "pointer", fontSize: 10 }}>✕</button>
                  </div>
                </td>}
              </tr>; })}
            </tbody>
          </table>}
        </div>}
      </div>;
    })}

    {editUnit && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#1a1a1a", border: "1px solid var(--border)", borderRadius: 12, padding: 28, maxWidth: 640, width: "100%", maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid var(--border)" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>✏️ Edit Unit</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, fontFamily: "monospace" }}>{editUnit.sheet_uid || editUnit.lpn_number || editUnit.dbh_sku || editUnit.id?.slice(0, 8)}</div>
          </div>
          <button onClick={() => setEditUnit(null)} style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 18, width: 32, height: 32, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 14 }}>Listing & sale status is managed in the In Transit / Listed / Sales tabs and shows here live. This edits item details and photos.</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[["lpn_number","LPN"],["product_name","Product Name"],["asin","ASIN"],["sku","SKU"]].map(([k,l]) =>
            <div key={k}><div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>{l}</div><input value={editUnitForm[k] || ""} onChange={e => setEditUnitForm(f => ({ ...f, [k]: e.target.value }))} style={{ width: "100%", padding: 8, background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", fontFamily: "inherit" }} /></div>)}
          <div><div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>Return Reason</div>
            <select value={editUnitForm.return_reason || ""} onChange={e => setEditUnitForm(f => ({ ...f, return_reason: e.target.value }))} style={{ width: "100%", padding: 8, background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", fontFamily: "inherit" }}>
              <option value="">—</option>
              {RETURN_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div><div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>Condition</div>
            <input value={editUnitForm.condition || ""} onChange={e => setEditUnitForm(f => ({ ...f, condition: e.target.value }))} style={{ width: "100%", padding: 8, background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", fontFamily: "inherit" }} /></div>
          <div style={{ gridColumn: "1 / -1" }}><div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>📷 Item Photos URL</div><input value={editUnitForm.item_photos_url || ""} onChange={e => setEditUnitForm(f => ({ ...f, item_photos_url: e.target.value }))} placeholder="https://drive.google.com/..." style={{ width: "100%", padding: 8, background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", fontFamily: "inherit" }} /></div>
          <div style={{ gridColumn: "1 / -1" }}><div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>📄 Slip Photo URL</div><input value={editUnitForm.slip_photo_url || ""} onChange={e => setEditUnitForm(f => ({ ...f, slip_photo_url: e.target.value }))} placeholder="https://drive.google.com/..." style={{ width: "100%", padding: 8, background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", fontFamily: "inherit" }} /></div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
          <button onClick={() => setEditUnit(null)} style={{ padding: "10px 18px", background: "transparent", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-secondary)", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button onClick={async () => {
            const patch = {};
            for (const k of ["lpn_number","product_name","asin","sku","return_reason","condition","item_photos_url","slip_photo_url"]) {
              patch[k] = editUnitForm[k] === "" ? null : editUnitForm[k];
            }
            await updateUnit(editUnit.id, patch);
            showToast("Unit updated");
            setEditUnit(null);
          }} style={{ padding: "10px 18px", background: "var(--green)", color: "#000", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>Save</button>
        </div>
      </div>
    </div>}

    <RemovalUploadModal open={showUpload} onClose={() => setShowUpload(false)} userId={userId} token={token} onComplete={load} showToast={showToast} />
  </div>;
}

function AdminLiquidationPage({ token, showToast }) {
  const [clients, setClients] = useState([]);
  const [items, setItems] = useState([]);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [returnsForm, setReturnsForm] = useState({ month: new Date().toISOString().slice(0, 7), count: "" });
  const [savingReturns, setSavingReturns] = useState(false);

  useEffect(() => { loadData(); }, []);
  const loadData = async () => {
    setLoading(true);
    const [l, c, s, r] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/liquidation_stock?select=*&order=created_at.desc`, { headers: supabase.headers(token) }).then(r => r.json()),
      fetch(`${SUPABASE_URL}/rest/v1/profiles?select=*`, { headers: supabase.headers(token) }).then(r => r.json()),
      fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.discord_webhook_url`, { headers: supabase.headers(token) }).then(r => r.json()),
      fetch(`${SUPABASE_URL}/rest/v1/liquidation_returns?select=*&order=month.desc`, { headers: supabase.headers(token) }).then(r => r.json()).catch(() => [])
    ]);
    if (Array.isArray(l)) setItems(l);
    if (Array.isArray(c)) setClients(c.filter(x => x.email !== ADMIN_EMAIL));
    if (s?.[0]?.value) setWebhookUrl(s[0].value);
    if (Array.isArray(r)) setReturns(r);
    setLoading(false);
  };

  const saveReturns = async () => {
    if (!selectedClient || !returnsForm.month || returnsForm.count === "") return;
    setSavingReturns(true);
    const count = parseInt(returnsForm.count) || 0;
    const existing = returns.find(x => x.user_id === selectedClient.id && x.month === returnsForm.month);
    try {
      if (existing) {
        await fetch(`${SUPABASE_URL}/rest/v1/liquidation_returns?id=eq.${existing.id}`, {
          method: "PATCH",
          headers: { ...supabase.headers(token), "Content-Type": "application/json", Prefer: "return=representation" },
          body: JSON.stringify({ count })
        });
      } else {
        await fetch(`${SUPABASE_URL}/rest/v1/liquidation_returns`, {
          method: "POST",
          headers: { ...supabase.headers(token), "Content-Type": "application/json", Prefer: "return=representation" },
          body: JSON.stringify({ user_id: selectedClient.id, month: returnsForm.month, count })
        });
      }
      showToast("Returns saved!");
      setReturnsForm({ month: new Date().toISOString().slice(0, 7), count: "" });
      loadData();
    } catch (e) {
      showToast("Error saving returns");
    }
    setSavingReturns(false);
  };

  const deleteReturns = async (id) => {
    if (!confirm("Delete this returns entry?")) return;
    await fetch(`${SUPABASE_URL}/rest/v1/liquidation_returns?id=eq.${id}`, { method: "DELETE", headers: supabase.headers(token) });
    showToast("Deleted!");
    loadData();
  };

  const clientReturns = selectedClient ? returns.filter(r => r.user_id === selectedClient.id) : [];
  const clientReturnsTotal = clientReturns.reduce((sum, r) => sum + (r.count || 0), 0);
  const clientReturnsDeduction = clientReturnsTotal * RETURN_COST_PER_UNIT;

  const clientItems = selectedClient ? items.filter(i => i.user_id === selectedClient.id) : items;

  const startEdit = item => {
    setEditingId(item.id);
    setEditData({ lpn_number: item.lpn_number || "", condition: item.condition || "", listed: item.listed || false, sale_price: item.sale_price || "", date_sold: item.date_sold || "", ebay_fees: item.ebay_fees || "", shipping: item.shipping || "", fee_prep: item.fee_prep || false, fee_bundle: item.fee_bundle || false, fee_oversize: item.fee_oversize || false, paid: item.paid || false, quantity: item.quantity || 1 });
  };

  const saveEdit = async () => {
    setSaving(true);
    const oldItem = items.find(i => i.id === editingId);
    const dataToSave = { ...editData, sale_price: editData.sale_price ? parseFloat(editData.sale_price) : null, ebay_fees: editData.ebay_fees ? parseFloat(editData.ebay_fees) : null, shipping: editData.shipping ? parseFloat(editData.shipping) : null, date_sold: editData.date_sold || null, quantity: parseInt(editData.quantity) || 1 };
    if (dataToSave.sale_price && !dataToSave.date_sold) dataToSave.date_sold = new Date().toISOString().split('T')[0];
    await fetch(`${SUPABASE_URL}/rest/v1/liquidation_stock?id=eq.${editingId}`, { method: "PATCH", headers: { ...supabase.headers(token), "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify(dataToSave) });
    if (dataToSave.date_sold && !oldItem?.date_sold) {
      const client = clients.find(c => c.id === oldItem?.user_id);
      const clientWebhook = client?.discord_webhook || webhookUrl;
      if (clientWebhook) {
        const payout = calculatePayout({ ...oldItem, ...dataToSave });
        const payoutDate = getPayoutDate(dataToSave.date_sold);
        await sendDiscordNotification(clientWebhook, null, {
          title: "💰 SOLD",
          color: 0x22c55e,
          fields: [
            { name: "Product", value: oldItem?.product_name || "Unknown", inline: true },
            { name: "Payout", value: `£${payout.payout.toFixed(2)}`, inline: true },
            { name: "Payout Date", value: payoutDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }), inline: true }
          ],
          footer: { text: client?.full_name || client?.email }
        });
      }
    }
    showToast("Saved!"); setEditingId(null); loadData(); setSaving(false);
  };

  if (loading) return <div className="loader"><div className="spinner" /></div>;

  return (
    <><div className="page-header"><div><div className="page-title">Liquidation Management</div><div className="page-subtitle">{selectedClient ? `${selectedClient.full_name || selectedClient.email}` : "All clients"}</div></div>
      {selectedClient && <button className="back-btn" onClick={() => setSelectedClient(null)}><Icons.ArrowLeft /> All Clients</button>}
    </div>
    <div className="page-body">
      {!selectedClient && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 16, marginBottom: 24 }}>{clients.map(c => { const ci = items.filter(i => i.user_id === c.id); const pending = ci.filter(i => !i.sale_price).length; const cr = returns.filter(r => r.user_id === c.id).reduce((s,r)=>s+(r.count||0),0); return <div key={c.id} className="client-card" onClick={() => setSelectedClient(c)}><div style={{ fontWeight: 700 }}>{c.full_name || "No Name"}</div><div style={{ fontSize: 13, color: "var(--text-muted)" }}>{c.email}</div><div style={{ marginTop: 8, fontSize: 13 }}>Pending: <span style={{ fontWeight: 700, color: "var(--orange)" }}>{pending}</span> • Total: {ci.length}</div>{cr > 0 && <div style={{ marginTop: 4, fontSize: 12, color: "var(--red)" }}>Returns: {cr} (−£{(cr*RETURN_COST_PER_UNIT).toFixed(2)})</div>}</div>; })}</div>}
      {selectedClient && (
        <div className="card" style={{ marginBottom: 24, background: "linear-gradient(135deg,rgba(255,145,0,0.05),transparent)", borderColor: "rgba(255,145,0,0.2)" }}>
          <div className="card-title" style={{ color: "var(--orange)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>📦 Returns Tracker</span>
            <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>£{RETURN_COST_PER_UNIT.toFixed(2)} per return (label out + back)</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 12 }}>
            <div className="card stat-card" style={{ padding: 14 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Total Returns</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--amber)" }}>{clientReturnsTotal}</div>
            </div>
            <div className="card stat-card" style={{ padding: 14 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Total Deduction</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--red)" }}>−£{clientReturnsDeduction.toFixed(2)}</div>
            </div>
            <div className="card stat-card" style={{ padding: 14 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Months Logged</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{clientReturns.length}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div className="input-group" style={{ flex: "1 1 160px", marginBottom: 0 }}>
              <label className="input-label">Month</label>
              <input className="input" type="month" style={{ colorScheme: "dark" }} value={returnsForm.month} onChange={e => setReturnsForm({ ...returnsForm, month: e.target.value })} />
            </div>
            <div className="input-group" style={{ flex: "1 1 160px", marginBottom: 0 }}>
              <label className="input-label">Number of Returns</label>
              <input className="input" type="number" min="0" placeholder="0" value={returnsForm.count} onChange={e => setReturnsForm({ ...returnsForm, count: e.target.value })} />
            </div>
            <button className="btn btn-primary liquidation" onClick={saveReturns} disabled={savingReturns || !returnsForm.month || returnsForm.count === ""}>
              {savingReturns ? "Saving..." : (returns.find(x => x.user_id === selectedClient.id && x.month === returnsForm.month) ? "Update" : "Add")}
            </button>
          </div>
          {clientReturns.length > 0 && (
            <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>History</div>
              {clientReturns.map(r => {
                const [y, m] = (r.month || "").split("-");
                const monthLabel = y && m ? new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" }) : r.month;
                return (
                  <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{monthLabel}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{r.count} return{r.count === 1 ? "" : "s"}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span className="mono" style={{ fontWeight: 700, color: "var(--red)" }}>−£{((r.count || 0) * RETURN_COST_PER_UNIT).toFixed(2)}</span>
                      <button className="btn-icon" onClick={() => setReturnsForm({ month: r.month, count: r.count.toString() })} title="Edit"><Icons.Edit /></button>
                      <button className="btn-icon btn-danger" onClick={() => deleteReturns(r.id)} title="Delete"><Icons.Trash /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {clientItems.length === 0 ? <div className="card empty-state"><Icons.Box /><p>No items.</p></div> :
      <div className="card" style={{ padding: 0, overflow: "hidden" }}><div className="table-wrap"><table style={{ width: "100%", tableLayout: "fixed" }}>
        <colgroup><col style={{width:"22%"}}/><col style={{width:"8%"}}/><col style={{width:"5%"}}/><col style={{width:"9%"}}/><col style={{width:"6%"}}/><col style={{width:"8%"}}/><col style={{width:"9%"}}/><col style={{width:"10%"}}/><col style={{width:"9%"}}/><col style={{width:"6%"}}/><col style={{width:"8%"}}/></colgroup>
        <thead><tr>{!selectedClient && <th>Client</th>}<th>Product</th><th>LPN</th><th>Qty</th><th>COG</th><th>Condition</th><th>Listed</th><th>Sale £</th><th>Sold Date</th><th>Fees</th><th>Payout</th><th>Paid</th><th></th></tr></thead>
        <tbody>{clientItems.map(item => {
          const client = clients.find(c => c.id === item.user_id);
          const isEdit = editingId === item.id, data = isEdit ? editData : item;
          const calc = calculatePayout(isEdit ? { ...item, ...editData, sale_price: editData.sale_price, ebay_fees: editData.ebay_fees, shipping: editData.shipping } : item);
          const pd = getPayoutDate(data.date_sold);
          return <tr key={item.id} className={isEdit ? "edit-row" : ""}>
            {!selectedClient && <td style={{ fontSize: 13 }}>{client?.full_name || "—"}</td>}
            <td style={{ fontWeight: 600 }}>{item.product_name}<div style={{ fontSize: 11, color: "var(--text-muted)" }}>{item.asin}</div></td>
            <td>{isEdit ? <input className="inline-input" style={{ width: 80 }} value={data.lpn_number} onChange={e => setEditData({ ...editData, lpn_number: e.target.value })} /> : <span className="mono" style={{ fontSize: 12 }}>{item.lpn_number || "—"}</span>}</td>
            <td>{isEdit ? <input type="number" min="1" className="inline-input" style={{ width: 55 }} value={data.quantity} onChange={e => setEditData({ ...editData, quantity: e.target.value })} /> : <span className="mono">{item.quantity || 1}</span>}</td>
            <td>{isEdit ? <select className="inline-select" style={{ width: 90 }} value={data.condition} onChange={e => setEditData({ ...editData, condition: e.target.value })}><option value="">—</option><option>New</option><option>Open Box</option><option>Used</option><option>Like New</option><option>Good</option><option>Fair</option><option>Poor</option></select> : <span style={{ fontSize: 12 }}>{item.condition || "—"}</span>}</td>
            <td style={{ textAlign: "center" }}>{isEdit ? <input type="checkbox" checked={data.listed} onChange={e => setEditData({ ...editData, listed: e.target.checked })} /> : (item.listed ? "Yes" : "No")}</td>
            <td>{isEdit ? <input type="number" step="0.01" className="inline-input" style={{ width: 70 }} value={data.sale_price} onChange={e => setEditData({ ...editData, sale_price: e.target.value })} /> : item.sale_price ? <span className="mono">£{parseFloat(item.sale_price).toFixed(2)}</span> : "—"}</td>
            <td>{isEdit ? <input type="date" className="inline-input" style={{ width: 100, colorScheme: "dark" }} value={data.date_sold} onChange={e => setEditData({ ...editData, date_sold: e.target.value })} /> : <span style={{ fontSize: 12 }}>{item.date_sold ? formatShortDate(item.date_sold) : "—"}</span>}</td>
            <td>{isEdit ? <div style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 11 }}><input type="number" step="0.01" className="inline-input" style={{ width: 60 }} placeholder="eBay" value={data.ebay_fees} onChange={e => setEditData({ ...editData, ebay_fees: e.target.value })} /><input type="number" step="0.01" className="inline-input" style={{ width: 60 }} placeholder="Ship" value={data.shipping} onChange={e => setEditData({ ...editData, shipping: e.target.value })} /></div> : <span className="mono" style={{ fontSize: 12, color: "var(--red)" }}>{item.sale_price ? `£${calc.totalFees.toFixed(2)}` : "—"}</span>}</td>
            <td><span className="mono" style={{ fontWeight: 700, color: calc.payout > 0 ? "var(--green)" : "var(--text-muted)" }}>{calc.payout > 0 ? `£${calc.payout.toFixed(2)}` : "—"}</span></td>
            <td style={{ textAlign: "center" }}>{isEdit ? <input type="checkbox" checked={data.paid} onChange={e => setEditData({ ...editData, paid: e.target.checked })} /> : (item.paid ? <span style={{ color: "var(--green)" }}>✓</span> : "—")}</td>
            <td>{isEdit ? <div style={{ display: "flex", gap: 4 }}><button className="btn-icon" onClick={saveEdit} disabled={saving}><Icons.Save /></button><button className="btn-icon btn-danger" onClick={() => setEditingId(null)}><Icons.X /></button></div> : <button className="btn-icon" onClick={() => startEdit(item)}><Icons.Edit /></button>}</td>
          </tr>;
        })}</tbody>
      </table></div></div>}
    </div></>
  );
}

function AdminSettingsPage({ token, showToast }) {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.discord_webhook_url`, { headers: supabase.headers(token) }).then(r => r.json()).then(d => { if (d?.[0]?.value) setWebhookUrl(d[0].value); }); }, []);
  const save = async () => { setSaving(true); await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.discord_webhook_url`, { method: "PATCH", headers: { ...supabase.headers(token), Prefer: "return=representation" }, body: JSON.stringify({ value: webhookUrl }) }); showToast("Saved!"); setSaving(false); };
  return (
    <><div className="page-header"><div><div className="page-title">Settings</div><div className="page-subtitle">Admin configuration</div></div></div>
    <div className="page-body"><div className="card" style={{ maxWidth: 600 }}>
      <div className="card-title">Discord Webhook</div>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>Notifications for: Prep shipped, Needs attention, Liquidation sold</p>
      <div className="input-group"><label className="input-label">Webhook URL</label><input className="input" placeholder="https://discord.com/api/webhooks/..." value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} /></div>
      <button className="btn btn-primary admin" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Settings"}</button>
    </div></div></>
  );
}

function AdminShipmentsPage({ token, showToast }) {
  const [clients, setClients] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ user_id: "", shipment_id: "", units_prepped: "", unit_cost: "0.45", box_count: "", box_cost: "", other_fees: "", notes: "", date_shipped: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);
  const loadData = async () => {
    setLoading(true);
    const [s, c] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/shipments?select=*&order=created_at.desc`, { headers: supabase.headers(token) }).then(r => r.json()),
      fetch(`${SUPABASE_URL}/rest/v1/profiles?select=*`, { headers: supabase.headers(token) }).then(r => r.json())
    ]);
    if (Array.isArray(s)) setShipments(s);
    if (Array.isArray(c)) setClients(c.filter(x => x.email !== ADMIN_EMAIL));
    setLoading(false);
  };

  const calcTotal = (s) => {
    const units = (parseFloat(s.units_prepped) || 0) * (parseFloat(s.unit_cost) || 0);
    const boxes = (parseFloat(s.box_count)||0) * (parseFloat(s.box_cost)||0);
    const other = parseFloat(s.other_fees) || 0;
    return units + boxes + other;
  };

  const resetForm = () => { setForm({ user_id: "", shipment_id: "", units_prepped: "", unit_cost: "0.45", box_count: "", box_cost: "", other_fees: "", notes: "", date_shipped: "" }); setEditingId(null); };

  const startEdit = (s) => {
    setEditingId(s.id);
    setForm({ user_id: s.user_id, shipment_id: s.shipment_id, units_prepped: s.units_prepped || "", unit_cost: s.unit_cost || "0.45", box_count: s.box_count || "", box_cost: s.box_cost || "", other_fees: s.other_fees || "", notes: s.notes || "", date_shipped: s.date_shipped || "", status: s.status || "pending" });
    setShowForm(true);
  };

  const saveShipment = async () => {
    if (!form.user_id || !form.shipment_id) return;
    setSaving(true);
    const data = { ...form, units_prepped: parseInt(form.units_prepped) || 0, unit_cost: parseFloat(form.unit_cost) || 0, box_count: parseInt(form.box_count) || 0, box_cost: parseFloat(form.box_cost) || 0, other_fees: parseFloat(form.other_fees) || 0 };
    if (editingId) {
      await fetch(`${SUPABASE_URL}/rest/v1/shipments?id=eq.${editingId}`, { method: "PATCH", headers: { ...supabase.headers(token), Prefer: "return=representation" }, body: JSON.stringify(data) });
    } else {
      await fetch(`${SUPABASE_URL}/rest/v1/shipments`, { method: "POST", headers: { ...supabase.headers(token), Prefer: "return=representation" }, body: JSON.stringify(data) });
    }
    showToast(editingId ? "Updated!" : "Shipment created!"); resetForm(); setShowForm(false); loadData(); setSaving(false);
  };

  const deleteShipment = async (id) => {
    if (!confirm("Delete this shipment?")) return;
    await fetch(`${SUPABASE_URL}/rest/v1/shipments?id=eq.${id}`, { method: "DELETE", headers: supabase.headers(token) });
    showToast("Deleted!"); loadData();
  };

  const updateField = (f, v) => setForm(prev => ({ ...prev, [f]: v }));

  if (loading) return <div className="loader"><div className="spinner" /></div>;

  return (
    <><div className="page-header"><div><div className="page-title">Shipments</div><div className="page-subtitle">Manage FBA shipments & billing</div></div>
      <button className="btn btn-primary admin" onClick={() => { resetForm(); setShowForm(true); }}><Icons.Plus /> New Shipment</button>
    </div>
    <div className="page-body">
      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-title">{editingId ? "Edit Shipment" : "Create Shipment"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
            <div className="input-group"><label className="input-label">Client *</label>
              <select className="input" value={form.user_id} onChange={e => updateField("user_id", e.target.value)}>
                <option value="">Select client...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.full_name || c.email}</option>)}
              </select>
            </div>
            <div className="input-group"><label className="input-label">Shipment ID *</label>
              <input className="input" placeholder="FBA17ABC123" value={form.shipment_id} onChange={e => updateField("shipment_id", e.target.value)} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
            <div className="input-group"><label className="input-label">Units Prepped</label>
              <input className="input" type="number" value={form.units_prepped} onChange={e => updateField("units_prepped", e.target.value)} />
            </div>
            <div className="input-group"><label className="input-label">Cost per Unit (£)</label>
              <input className="input" type="number" step="0.01" value={form.unit_cost} onChange={e => updateField("unit_cost", e.target.value)} />
            </div>
            <div className="input-group"><label className="input-label">Boxes</label>
              <input className="input" type="number" value={form.box_count} onChange={e => updateField("box_count", e.target.value)} />
            </div>
            <div className="input-group"><label className="input-label">Box Cost (£)</label>
              <input className="input" type="number" step="0.01" value={form.box_cost} onChange={e => updateField("box_cost", e.target.value)} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div className="input-group"><label className="input-label">Other Fees (£)</label>
              <input className="input" type="number" step="0.01" value={form.other_fees} onChange={e => updateField("other_fees", e.target.value)} />
            </div>
            <div className="input-group"><label className="input-label">Date Shipped</label>
              <input className="input" type="date" style={{ colorScheme: "dark" }} value={form.date_shipped} onChange={e => updateField("date_shipped", e.target.value)} />
            </div>
            {editingId && <div className="input-group"><label className="input-label">Status</label>
              <select className="input" value={form.status} onChange={e => updateField("status", e.target.value)}>
                <option value="pending">Pending</option>
                <option value="invoiced">Invoiced</option>
                <option value="paid">Paid</option>
              </select>
            </div>}
          </div>
          <div className="input-group"><label className="input-label">Notes</label>
            <input className="input" placeholder="Optional notes..." value={form.notes} onChange={e => updateField("notes", e.target.value)} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Total: <span style={{ color: "var(--green)" }}>£{calcTotal(form).toFixed(2)}</span></div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</button>
              <button className="btn btn-primary admin" onClick={saveShipment} disabled={saving || !form.user_id || !form.shipment_id}>{saving ? "Saving..." : editingId ? "Update" : "Create"}</button>
            </div>
          </div>
        </div>
      )}

      {shipments.length === 0 ? <div className="card empty-state"><Icons.Truck /><p>No shipments yet.</p></div> :
      <div className="card" style={{ padding: 0, overflow: "hidden" }}><div className="table-wrap"><table>
        <thead><tr><th>Client</th><th>Shipment ID</th><th>Units</th><th>Boxes</th><th>Total</th><th>Date</th><th>Status</th><th></th></tr></thead>
        <tbody>{shipments.map(s => {
          const client = clients.find(c => c.id === s.user_id);
          return <tr key={s.id}>
            <td style={{ fontWeight: 600 }}>{client?.full_name || client?.email || "—"}</td>
            <td className="mono">{s.shipment_id}</td>
            <td className="mono">{s.units_prepped || 0}</td>
            <td className="mono">{s.box_count || 0}</td>
            <td className="mono" style={{ fontWeight: 700, color: "var(--green)" }}>£{calcTotal(s).toFixed(2)}</td>
            <td style={{ fontSize: 12 }}>{s.date_shipped ? formatShortDate(s.date_shipped) : "—"}</td>
            <td><span className={`badge badge-${s.status === "paid" ? "paid" : s.status === "invoiced" ? "pending" : "transit"}`}>{s.status}</span></td>
            <td><div style={{ display: "flex", gap: 4 }}><button className="btn-icon" onClick={() => startEdit(s)}><Icons.Edit /></button><button className="btn-icon btn-danger" onClick={() => deleteShipment(s.id)}><Icons.Trash /></button></div></td>
          </tr>;
        })}</tbody>
      </table></div></div>}
    </div></>
  );
}

function ProfilePage({ dbProfile }) {
  const { user, profile, signOut } = useAuth();
  const [showTcs, setShowTcs] = useState(false);
  return (
    <><div className="page-header"><div><div className="page-title">Profile</div><div className="page-subtitle">Your account</div></div></div>
    <div className="page-body"><div className="card" style={{ maxWidth: 600 }}>
      <div className="card-title">Account Details</div>
      <div style={{ marginTop: 16 }}>
        <div style={{ marginBottom: 16 }}><div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>Name</div><div style={{ fontWeight: 600 }}>{profile?.full_name || "—"}</div></div>
        <div style={{ marginBottom: 16 }}><div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>Company</div><div style={{ fontWeight: 600 }}>{profile?.company_name || "—"}</div></div>
        <div><div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>Email</div><div style={{ fontWeight: 600 }}>{user?.email}</div></div>
      </div>
    </div>

    {/* Signed T&Cs */}
    {dbProfile?.tcs_signed && (
      <div className="card" style={{ maxWidth: 600, marginTop: 20, borderColor: 'rgba(0,230,118,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="card-title" style={{ margin: 0, color: '#00e676' }}>✅ Terms & Conditions — Signed</div>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowTcs(!showTcs)}>{showTcs ? 'Hide' : 'View Terms'}</button>
        </div>
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
          <div><span style={{ color: 'var(--text-muted)' }}>Signed by:</span> <strong>{dbProfile.tcs_signed_name}</strong></div>
          <div><span style={{ color: 'var(--text-muted)' }}>Business:</span> <strong>{dbProfile.tcs_signed_business || '—'}</strong></div>
          <div><span style={{ color: 'var(--text-muted)' }}>Position:</span> <strong>{dbProfile.tcs_signed_position || '—'}</strong></div>
          <div><span style={{ color: 'var(--text-muted)' }}>Date:</span> <strong>{dbProfile.tcs_signed_at ? new Date(dbProfile.tcs_signed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</strong></div>
        </div>
        {showTcs && (
          <div style={{ marginTop: 16, padding: '24px 20px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 12, maxHeight: 400, overflowY: 'auto', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            <h3 style={{ fontSize: 14, color: '#fff', marginBottom: 12 }}>DBH LIQUIDATION — Service Agreement</h3>
            <h4 style={{ fontSize: 12, color: 'var(--cyan)', marginTop: 16, marginBottom: 6 }}>1. Parties</h4>
            <p>This Service Agreement is entered into between DBH Liquidation ("the Service Provider") and the undersigned client ("the Client"). By signing this Agreement, both parties agree to be bound by the terms below.</p>
            <h4 style={{ fontSize: 12, color: 'var(--cyan)', marginTop: 16, marginBottom: 6 }}>2. Services Provided</h4>
            <p>DBH Liquidation receives Amazon FBA removal orders on behalf of the Client, lists the inventory for resale on eBay and other marketplaces, and remits the net proceeds minus the agreed commission and fees.</p>
            <h4 style={{ fontSize: 12, color: 'var(--cyan)', marginTop: 16, marginBottom: 6 }}>3. Client Responsibilities</h4>
            <p>The Client agrees to provide accurate inventory information (ASINs, quantities, condition) in advance of shipment, ensure inventory is legally owned and free from third-party claims, notify DBH Liquidation of incoming removal orders, and respond to flagged issues within 48 hours. DBH Liquidation may hold, return, or dispose of inventory where the Client fails to respond within 14 days.</p>
            <h4 style={{ fontSize: 12, color: 'var(--cyan)', marginTop: 16, marginBottom: 6 }}>4. Commission & Fees</h4>
            <p><strong>a)</strong> Commission is charged at <strong>20% of the net sale value</strong>, reducing to <strong>15%</strong> on items where the net sale value exceeds £200.</p>
            <p><strong>b)</strong> Net sale value is defined as the gross sale price minus marketplace fees and outbound shipping costs.</p>
            <p><strong>c)</strong> A flat handling fee of <strong>£0.40 per unit</strong> applies.</p>
            <p><strong>d)</strong> All prices are exclusive of VAT.</p>
            <p><strong>e)</strong> DBH Liquidation may adjust pricing with 14 days written notice.</p>
            <h4 style={{ fontSize: 12, color: 'var(--cyan)', marginTop: 16, marginBottom: 6 }}>5. Payouts & Returns</h4>
            <p><strong>a)</strong> Payouts are issued at the <strong>end of the calendar month following the month of sale</strong> to allow for the standard returns window.</p>
            <p><strong>b)</strong> Buyer returns and refunds are deducted from the Client's account at the actual cost incurred.</p>
            <p><strong>c)</strong> Returned items are subject to inspection. Restocking and re-listing fees may apply.</p>
            <h4 style={{ fontSize: 12, color: 'var(--cyan)', marginTop: 16, marginBottom: 6 }}>6. Inventory Custody & Lien</h4>
            <p><strong>a)</strong> Inventory remains the property of the Client until sold.</p>
            <p><strong>b)</strong> DBH Liquidation retains a <strong>lien over all inventory</strong> until all outstanding balances are settled in full.</p>
            <p><strong>c)</strong> Items unsold after <strong>90 days</strong> may be disposed of unless the Client requests return at their own expense.</p>
            <p><strong>d)</strong> The Client acknowledges full responsibility for payment of all invoices raised by DBH Liquidation.</p>
            <h4 style={{ fontSize: 12, color: 'var(--cyan)', marginTop: 16, marginBottom: 6 }}>7. Liability & Damages</h4>
            <p>Liability for damaged inventory is limited to the cost price as declared by the Client. Claims must be made within 7 days with supporting evidence. DBH Liquidation accepts no liability for carrier transit damage or consequential losses. No guarantees are made on sale price or timeframe.</p>
            <h4 style={{ fontSize: 12, color: 'var(--cyan)', marginTop: 16, marginBottom: 6 }}>8. Confidentiality</h4>
            <p>Both parties agree to keep commercially sensitive information confidential, including product sourcing, pricing, supplier details, and business strategies.</p>
            <h4 style={{ fontSize: 12, color: 'var(--cyan)', marginTop: 16, marginBottom: 6 }}>9. Client Portal & Data</h4>
            <p>The Client is responsible for login security. Data is processed in accordance with UK GDPR solely for service delivery.</p>
            <h4 style={{ fontSize: 12, color: 'var(--cyan)', marginTop: 16, marginBottom: 6 }}>10. Termination</h4>
            <p>Either party may terminate this Agreement with 14 days written notice. Outstanding balances must be settled within 5 working days. Any remaining inventory will be returned (at the Client's expense) or disposed of as agreed. DBH Liquidation may terminate immediately for non-payment exceeding 14 days.</p>
            <h4 style={{ fontSize: 12, color: 'var(--cyan)', marginTop: 16, marginBottom: 6 }}>11. Governing Law</h4>
            <p>This Agreement is governed by the laws of England and Wales.</p>
          </div>
        )}
      </div>
    )}

    <div className="card" style={{ maxWidth: 600, marginTop: 20 }}><button className="btn btn-secondary" onClick={signOut}><Icons.LogOut /> Sign Out</button></div></div></>
  );
}

// Client Shipments Page
function ClientShipmentsPage({ shipments }) {
  const calcTotal = (s) => {
    const units = (parseFloat(s.units_prepped) || 0) * (parseFloat(s.unit_cost) || 0);
    const boxes = (parseFloat(s.box_count)||0) * (parseFloat(s.box_cost)||0);
    const other = parseFloat(s.other_fees) || 0;
    return units + boxes + other;
  };
  const totalAll = shipments.reduce((sum, s) => sum + calcTotal(s), 0);
  const unpaid = shipments.filter(s => s.status !== "paid");
  const unpaidTotal = unpaid.reduce((sum, s) => sum + calcTotal(s), 0);

  return (
    <><div className="page-header"><div><div className="page-title">Shipments</div><div className="page-subtitle">Your FBA shipments</div></div></div>
    <div className="page-body">
      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 24 }}>
        <div className="card stat-card"><div className="card-title">Total Shipments</div><div className="stat-value" style={{ color: "var(--cyan)" }}>{shipments.length}</div></div>
        <div className="card stat-card"><div className="card-title">Unpaid</div><div className="stat-value" style={{ color: "var(--amber)" }}>£{unpaidTotal.toFixed(2)}</div></div>
        <div className="card stat-card"><div className="card-title">All Time</div><div className="stat-value" style={{ color: "var(--green)" }}>£{totalAll.toFixed(2)}</div></div>
      </div>
      {shipments.length === 0 ? <div className="card empty-state"><Icons.Truck /><p>No shipments yet.</p></div> :
      <div className="card" style={{ padding: 0, overflow: "hidden" }}><div className="table-wrap"><table>
        <thead><tr><th>Date</th><th>Shipment ID</th><th>Units</th><th>Boxes</th><th>Total</th><th>Status</th></tr></thead>
        <tbody>{shipments.map(s => (
          <tr key={s.id}>
            <td style={{ fontSize: 12 }}>{formatShortDate(s.date_shipped || s.created_at)}</td>
            <td className="mono" style={{ fontWeight: 600 }}>{s.shipment_id}</td>
            <td className="mono">{s.units_prepped || 0}</td>
            <td className="mono">{s.box_count || 0}</td>
            <td className="mono" style={{ fontWeight: 700, color: "var(--green)" }}>£{calcTotal(s).toFixed(2)}</td>
            <td><span className={`badge badge-${s.status === "paid" ? "paid" : s.status === "invoiced" ? "pending" : "transit"}`}>{s.status}</span></td>
          </tr>
        ))}</tbody>
      </table></div></div>}
    </div></>
  );
}

// ============ PORTALS ============
function ClientPortal() {
  const { user, token, profile, signOut } = useAuth();
  const [page, setPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [parcels, setParcels] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [billingPeriods, setBillingPeriods] = useState([]);
  const [liquidationStock, setLiquidationStock] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [dbProfile, setDbProfile] = useState(null);
  const [toast, setToast] = useState(null);
  const showToast = useCallback(msg => setToast(msg), []);

  const [liquidationSales, setLiquidationSales] = useState([]);
  const [liquidationReturns, setLiquidationReturns] = useState([]);
  const [removalUnits, setRemovalUnits] = useState([]);

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      const [p, i, b, l, s, prof, ls, lr, ru] = await Promise.all([
        supabase.from("parcels", token).select(),
        supabase.from("invoices", token).select(),
        supabase.from("billing_periods", token).select(),
        supabase.from("liquidation_stock", token).select(),
        supabase.from("shipments", token).select(),
        fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=*`, { headers: supabase.headers(token) }).then(r => r.json()),
        fetch(`${SUPABASE_URL}/rest/v1/liquidation_sales?user_id=eq.${user.id}&order=date_sold.desc`, { headers: supabase.headers(token) }).then(r => r.json()),
        fetch(`${SUPABASE_URL}/rest/v1/liquidation_returns?user_id=eq.${user.id}&order=month.desc`, { headers: supabase.headers(token) }).then(r => r.json()).catch(() => []),
        fetch(`${SUPABASE_URL}/rest/v1/removal_units?user_id=eq.${user.id}&order=created_at.desc`, { headers: supabase.headers(token) }).then(r => r.json()).catch(() => [])
      ]);
      if (Array.isArray(p)) setParcels(p);
      if (Array.isArray(i)) setInvoices(i);
      if (Array.isArray(b)) setBillingPeriods(b);
      if (Array.isArray(l)) setLiquidationStock(l);
      if (Array.isArray(s)) setShipments(s);
      if (Array.isArray(ls)) setLiquidationSales(ls);
      if (Array.isArray(lr)) setLiquidationReturns(lr);
      if (Array.isArray(ru)) setRemovalUnits(ru);
      if (Array.isArray(prof) && prof[0]) {
        setDbProfile(prof[0]);
        // Auto-deactivate if payment is overdue (1 calendar month past last payment)
        if (prof[0].deals_access && prof[0].deals_last_payment) {
          const paid = new Date(prof[0].deals_last_payment);
          const due = new Date(paid.getFullYear(), paid.getMonth() + 1, paid.getDate());
          if (new Date() >= due) {
            // Deactivate access
            await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`, {
              method: "PATCH",
              headers: { ...supabase.headers(token), "Content-Type": "application/json" },
              body: JSON.stringify({ deals_access: false })
            });
            setDbProfile({ ...prof[0], deals_access: false });
          }
        }
      }
    } catch (e) { console.error(e); }
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { const interval = setInterval(() => { loadData(); }, 30000); return () => clearInterval(interval); }, [loadData]);

  const liqNav = [
    { id: "dashboard", label: "Dashboard", icon: Icons.Dashboard },
    { id: "getting-started", label: "Getting Started", icon: Icons.Zap },
    { id: "send-stock", label: "Send Stock", icon: Icons.Send },
    { id: "my-stock", label: "My Stock", icon: Icons.Box },
    { id: "fees", label: "Fees", icon: Icons.Calculator },
    { id: "billing", label: "Billing", icon: Icons.Receipt }
  ];
  const dealsNav = [
    { id: "deals", label: "Deals", icon: Icons.List },
    { id: "shortlist", label: "Shortlist", icon: Icons.Zap },
    { id: "bought", label: "Bought", icon: Icons.Package },
    { id: "invoice-details", label: "Invoice Details", icon: Icons.Receipt }
  ];
  const sharedNav = [{ id: "profile", label: "Profile", icon: Icons.User }];
  const hasDealsAccess = dbProfile?.deals_access || false;
  const initials = (profile?.full_name || user?.email || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  const renderPage = () => {
    if (page === "profile") return <ProfilePage dbProfile={dbProfile} />;
    // Deals pages (only if paying subscriber)
    if (hasDealsAccess) {
      if (page === "invoice-details") return <DealsInvoiceDetailsPage token={token} dbProfile={dbProfile} onRefresh={loadData} showToast={showToast} />;
      if (page === "shortlist") return <DealsShortlistPage token={token} userId={user.id} showToast={showToast} />;
      if (page === "bought") return <DealsBoughtPage token={token} userId={user.id} showToast={showToast} />;
      if (page === "deals") return <DBHDealsPage token={token} hasAccess={dbProfile?.deals_access} startDate={dbProfile?.deals_start_date} dbProfile={dbProfile} onRefresh={loadData} showToast={showToast} userId={user.id} />;
    }
    // Liquidation pages
    if (page === "getting-started") return <LiquidationGettingStartedPage dbProfile={dbProfile} />;
    if (page === "send-stock") return <LiquidationSendStockPage token={token} onRefresh={loadData} showToast={showToast} />;
    if (page === "my-stock") return <LiquidationMyStockPage liquidationStock={liquidationStock} liquidationSales={liquidationSales} token={token} onRefresh={loadData} showToast={showToast} />;
    if (page === "fees") return <LiquidationFeesPage />;
    if (page === "billing") return <LiquidationBillingPage liquidationStock={liquidationStock} liquidationReturns={liquidationReturns} removalUnits={removalUnits} />;
    return <LiquidationDashboard liquidationStock={liquidationStock} liquidationSales={liquidationSales} liquidationReturns={liquidationReturns} removalUnits={removalUnits} />;
  };

  // T&Cs signing gate
  const [tcsForm, setTcsForm] = useState({ full_name: '', business_name: '', position: '', phone: '' });
  const [signingTcs, setSigningTcs] = useState(false);
  const [tcsScrolled, setTcsScrolled] = useState(false);

  const signTcs = async () => {
    if (!tcsForm.full_name) return;
    setSigningTcs(true);
    const signedData = {
      tcs_signed: true,
      tcs_signed_at: new Date().toISOString(),
      tcs_signed_name: tcsForm.full_name,
      tcs_signed_business: tcsForm.business_name,
      tcs_signed_position: tcsForm.position,
      tcs_signed_phone: tcsForm.phone
    };
    await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`, {
      method: "PATCH",
      headers: { ...supabase.headers(token), "Content-Type": "application/json" },
      body: JSON.stringify(signedData)
    });
    setDbProfile({ ...dbProfile, ...signedData });
    setSigningTcs(false);
  };

  if (dbProfile && !dbProfile.tcs_signed) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '40px 20px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ maxWidth: 700, width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div className="sidebar-logo-icon" style={{ width: 64, height: 64, fontSize: 22, margin: '0 auto 16px' }}>DBH</div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>Terms & Conditions</h1>
            <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>Please read and accept our terms before accessing the portal</p>
          </div>
          <div onScroll={e => { if (e.target.scrollHeight - e.target.scrollTop <= e.target.clientHeight + 50) setTcsScrolled(true); }}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '32px 28px', maxHeight: 500, overflowY: 'auto', marginBottom: 24, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            <h2 style={{ fontSize: 18, color: '#fff', marginBottom: 16 }}>DBH LIQUIDATION — Service Agreement</h2>
            <h3 style={{ fontSize: 14, color: 'var(--cyan)', marginTop: 20, marginBottom: 8 }}>1. Parties</h3>
            <p>This Service Agreement is entered into between DBH Liquidation ("the Service Provider") and the undersigned client ("the Client"). By signing this Agreement, both parties agree to be bound by the terms below.</p>
            <h3 style={{ fontSize: 14, color: 'var(--cyan)', marginTop: 20, marginBottom: 8 }}>2. Services Provided</h3>
            <p>DBH Liquidation receives Amazon FBA removal orders on behalf of the Client, lists the inventory for resale on eBay and other marketplaces, and remits the net proceeds minus the agreed commission and fees.</p>
            <h3 style={{ fontSize: 14, color: 'var(--cyan)', marginTop: 20, marginBottom: 8 }}>3. Client Responsibilities</h3>
            <p>The Client agrees to provide accurate inventory information (ASINs, quantities, condition) in advance of shipment, ensure inventory is legally owned and free from third-party claims, notify DBH Liquidation of incoming removal orders, and respond to flagged issues within 48 hours. DBH Liquidation may hold, return, or dispose of inventory where the Client fails to respond within 14 days.</p>
            <h3 style={{ fontSize: 14, color: 'var(--cyan)', marginTop: 20, marginBottom: 8 }}>4. Commission & Fees</h3>
            <p><strong>a)</strong> Commission is charged at <strong>20% of the net sale value</strong>, reducing to <strong>15%</strong> on items where the net sale value exceeds £200.</p>
            <p><strong>b)</strong> Net sale value is defined as the gross sale price minus marketplace fees and outbound shipping costs.</p>
            <p><strong>c)</strong> A flat handling fee of <strong>£0.40 per unit</strong> applies.</p>
            <p><strong>d)</strong> All prices are exclusive of VAT.</p>
            <p><strong>e)</strong> DBH Liquidation may adjust pricing with 14 days written notice.</p>
            <h3 style={{ fontSize: 14, color: 'var(--cyan)', marginTop: 20, marginBottom: 8 }}>5. Payouts & Returns</h3>
            <p><strong>a)</strong> Payouts are issued at the <strong>end of the calendar month following the month of sale</strong> to allow for the standard returns window.</p>
            <p><strong>b)</strong> Buyer returns and refunds are deducted from the Client's account at the actual cost incurred.</p>
            <p><strong>c)</strong> Returned items are subject to inspection. Restocking and re-listing fees may apply.</p>
            <h3 style={{ fontSize: 14, color: 'var(--cyan)', marginTop: 20, marginBottom: 8 }}>6. Inventory Custody & Lien</h3>
            <p><strong>a)</strong> Inventory remains the property of the Client until sold.</p>
            <p><strong>b)</strong> DBH Liquidation retains a <strong>lien over all inventory</strong> until all outstanding balances are settled in full.</p>
            <p><strong>c)</strong> Items unsold after <strong>90 days</strong> may be disposed of unless the Client requests return at their own expense.</p>
            <p><strong>d)</strong> The Client acknowledges full responsibility for payment of all invoices raised by DBH Liquidation.</p>
            <h3 style={{ fontSize: 14, color: 'var(--cyan)', marginTop: 20, marginBottom: 8 }}>7. Liability & Damages</h3>
            <p>Liability for damaged inventory is limited to the cost price as declared by the Client. Claims must be made within 7 days with supporting evidence. DBH Liquidation accepts no liability for carrier transit damage or consequential losses. No guarantees are made on sale price or timeframe.</p>
            <h3 style={{ fontSize: 14, color: 'var(--cyan)', marginTop: 20, marginBottom: 8 }}>8. Confidentiality</h3>
            <p>Both parties agree to keep commercially sensitive information confidential, including product sourcing, pricing, supplier details, and business strategies.</p>
            <h3 style={{ fontSize: 14, color: 'var(--cyan)', marginTop: 20, marginBottom: 8 }}>9. Client Portal & Data</h3>
            <p>The Client is responsible for login security. Data is processed in accordance with UK GDPR solely for service delivery.</p>
            <h3 style={{ fontSize: 14, color: 'var(--cyan)', marginTop: 20, marginBottom: 8 }}>10. Termination</h3>
            <p>Either party may terminate this Agreement with 14 days written notice. Outstanding balances must be settled within 5 working days. Any remaining inventory will be returned (at the Client's expense) or disposed of as agreed. DBH Liquidation may terminate immediately for non-payment exceeding 14 days.</p>
            <h3 style={{ fontSize: 14, color: 'var(--cyan)', marginTop: 20, marginBottom: 8 }}>11. Governing Law</h3>
            <p>This Agreement is governed by the laws of England and Wales.</p>
            {!tcsScrolled && <div style={{ textAlign: 'center', padding: '20px 0 0', color: 'var(--text-muted)', fontSize: 12 }}>↓ Scroll to read all terms ↓</div>}
          </div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '28px' }}>
            <h3 style={{ fontSize: 16, color: '#fff', marginBottom: 16 }}>Declaration & Signature</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>By completing the form below, I confirm that I have read, understood, and agree to be bound by the terms and conditions set out above. I accept full responsibility for the payment of all invoices raised by DBH Liquidation.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Full Name *</label>
                <input className="input" value={tcsForm.full_name} onChange={e => setTcsForm({ ...tcsForm, full_name: e.target.value })} placeholder="Your full legal name" />
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Business Name</label>
                <input className="input" value={tcsForm.business_name} onChange={e => setTcsForm({ ...tcsForm, business_name: e.target.value })} placeholder="Your business/trading name" />
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Position / Role</label>
                <input className="input" value={tcsForm.position} onChange={e => setTcsForm({ ...tcsForm, position: e.target.value })} placeholder="e.g. Director, Owner" />
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Phone Number</label>
                <input className="input" value={tcsForm.phone} onChange={e => setTcsForm({ ...tcsForm, phone: e.target.value })} placeholder="Contact number" />
              </div>
            </div>
            <div style={{ background: 'rgba(255,171,0,0.05)', border: '1px solid rgba(255,171,0,0.2)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
                <input type="checkbox" id="tcs-agree" style={{ marginTop: 3 }} />
                <span>I confirm that I am authorised to enter into this Agreement and accept the terms and conditions set out above, including the obligation to pay all invoices within 5 working days of issue.</span>
              </label>
            </div>
            <button className="btn btn-primary" style={{ width: '100%', padding: '14px', fontSize: 16, fontWeight: 700, background: '#00e676', color: '#000' }} disabled={signingTcs || !tcsForm.full_name} onClick={() => {
              if (!document.getElementById('tcs-agree')?.checked) { alert('Please tick the checkbox to confirm you agree to the terms.'); return; }
              signTcs();
            }}>{signingTcs ? "Signing..." : "✍️  Sign & Accept Terms"}</button>
            <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 12 }}>A copy of this signed agreement will be recorded to your account.<br/>Date of signing: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-wrapper">
      <div className="mobile-header"><div style={{ display: "flex", alignItems: "center", gap: 10 }}><div className="sidebar-logo-icon" style={{ width: 32, height: 32, fontSize: 11 }}>DBH</div><span style={{ fontWeight: 700 }}>DBH LIQUIDATION</span></div><button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}><Icons.Menu /></button></div>
      <div className={`sidebar-overlay ${sidebarOpen ? "open" : ""}`} onClick={() => setSidebarOpen(false)} />
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-logo"><div className="sidebar-logo-icon">DBH</div><div><div className="sidebar-logo-text">DBH LIQUIDATION</div><div className="sidebar-logo-sub">Client Portal</div></div></div>
        <nav className="sidebar-nav">
          <div className="sidebar-section-title">Liquidation</div>
          {liqNav.map(item => <div key={item.id} className={`nav-item ${page === item.id ? "active liquidation" : ""}`} onClick={() => { setPage(item.id); setSidebarOpen(false); }}><item.icon />{item.label}</div>)}
          {hasDealsAccess && <>
            <div className="sidebar-section-title" style={{ marginTop: 16 }}>DBH Deals</div>
            {dealsNav.map(item => <div key={item.id} className={`nav-item ${page === item.id ? "active deals" : ""}`} onClick={() => { setPage(item.id); setSidebarOpen(false); }}><item.icon />{item.label}</div>)}
          </>}
          <div className="sidebar-section-title" style={{ marginTop: 16 }}>Account</div>
          {sharedNav.map(item => <div key={item.id} className={`nav-item ${page === item.id ? "active liquidation" : ""}`} onClick={() => { setPage(item.id); setSidebarOpen(false); }}><item.icon />{item.label}</div>)}
        </nav>
        <div className="sidebar-footer"><div className="sidebar-user"><div className="sidebar-avatar">{initials}</div><div><div className="sidebar-username">{profile?.full_name || "User"}</div><div className="sidebar-email">{user?.email}</div></div></div><button className="btn-signout" onClick={signOut}><Icons.LogOut /> Sign Out</button></div>
      </aside>
      <main className="main-content">{renderPage()}</main>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

// ============ INCOME TRACKER ============
const INCOME_STREAMS = [
  { id: "prep",        label: "Prep",        icon: "📦", color: "var(--cyan)" },
  { id: "liquidation", label: "Liquidation", icon: "🔄", color: "var(--orange)" },
  { id: "dealsheet",   label: "Deal Sheet",  icon: "📋", color: "#a78bfa" },
  { id: "fba",         label: "FBA",         icon: "🛒", color: "var(--green)" },
];
const EXPENSE_CATS = ["Cost of Goods","Software/Subs","Packaging","Fuel/Travel","Other"];

function getWeekKey(date) {
  const d = new Date(date); const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d.setDate(diff)); return mon.toISOString().slice(0,10);
}
function getMonthKey(date) { return date.slice(0,7); }

function AdminTrackerPage() {
  const { token } = useAuth();
  const TKEY = "dbh_income_tracker";
  const load = () => { try { const r = localStorage.getItem(TKEY); return r ? JSON.parse(r) : { entries:[], timeEntries:[] }; } catch { return { entries:[], timeEntries:[] }; } };
  const [data, setData] = useState(load);
  const [view, setView] = useState("overview");
  const [period, setPeriod] = useState("monthly");
  const [selStream, setSelStream] = useState(null);
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`);
  const [autoData, setAutoData] = useState({ prepRevenue: 0, liqRevenue: 0, loading: true });

  useEffect(() => {
    async function fetchAuto() {
      try {
        const headers = { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };
        const curWeekKey = getWeekKey(new Date().toISOString().slice(0,10));

        const shipRes = await fetch(`${SUPABASE_URL}/rest/v1/shipments?select=units_prepped,unit_cost,box_count,box_cost,other_fees,date_shipped,created_at`, { headers });
        const shipments = await shipRes.json();

        const liqRes = await fetch(`${SUPABASE_URL}/rest/v1/liquidation_sales?select=dbh_fee,date_sold`, { headers });
        const liqSales = await liqRes.json();

        // Deal sheet — pull from deal_subscription_payments (proper payment log)
        const dealRes = await fetch(`${SUPABASE_URL}/rest/v1/deal_subscription_payments?select=amount,paid_date`, { headers });
        const dealSubs = await dealRes.json();

        const calcShip = s => (parseFloat(s.units_prepped)||0)*(parseFloat(s.unit_cost)||0) + (parseFloat(s.box_count)||0)*(parseFloat(s.box_cost)||0) + (parseFloat(s.other_fees)||0);

        const ships = Array.isArray(shipments) ? shipments : [];
        const liqItems = Array.isArray(liqSales) ? liqSales : [];
        const dealItems = Array.isArray(dealSubs) ? dealSubs : [];

        const prepMonthly = ships.filter(s => (s.date_shipped || s.created_at || "").slice(0,7) === selectedMonth).reduce((a, s) => a + calcShip(s), 0);
        const prepAllTime = ships.reduce((a, s) => a + calcShip(s), 0);
        const prepWeekly = ships.filter(s => getWeekKey((s.date_shipped || s.created_at || "").slice(0,10)) === curWeekKey).reduce((a, s) => a + calcShip(s), 0);

        const liqMonthly = liqItems.filter(s => s.date_sold && getMonthKey(s.date_sold) === selectedMonth).reduce((a, s) => a + (parseFloat(s.dbh_fee) || 0), 0);
        const liqAllTime = liqItems.reduce((a, s) => a + (parseFloat(s.dbh_fee) || 0), 0);
        const liqWeekly = liqItems.filter(s => s.date_sold && getWeekKey(s.date_sold) === curWeekKey).reduce((a, s) => a + (parseFloat(s.dbh_fee) || 0), 0);

        const dealMonthly = dealItems.filter(s => s.paid_date && getMonthKey(s.paid_date) === selectedMonth).reduce((a, s) => a + (parseFloat(s.amount) || 0), 0);
        const dealWeekly = dealItems.filter(s => s.paid_date && getWeekKey(s.paid_date) === curWeekKey).reduce((a, s) => a + (parseFloat(s.amount) || 0), 0);
        const dealAllTime = dealItems.reduce((a, s) => a + (parseFloat(s.amount) || 0), 0);

        const curYear = new Date().getFullYear();
        const prepYTD = ships.filter(s => (s.date_shipped || s.created_at || "").slice(0,4) === String(curYear)).reduce((a, s) => a + calcShip(s), 0);
        const liqYTD = liqItems.filter(s => s.date_sold && s.date_sold.slice(0,4) === String(curYear)).reduce((a, s) => a + (parseFloat(s.dbh_fee) || 0), 0);
        const dealYTD = dealItems.filter(s => s.paid_date && s.paid_date.slice(0,4) === String(curYear)).reduce((a, s) => a + (parseFloat(s.amount) || 0), 0);

        // Staff costs:
        //   Ian — £70 every Friday from 2 Jan 2026 up to and including last Friday 15 May 2026
        //   Wenelyn (old) — £70 every Friday from 2 Jan 2026 up to and including last Friday 22 May 2026
        //   Wenelyn (new) — £100 every Monday from 25 May 2026 onwards
        const ianStart = new Date('2026-01-02');     // First Friday of 2026
        const ianEnd   = new Date('2026-05-15');     // Last Friday paid (you stopped paying after 16 May)
        const ianRate  = 70;
        const wenOldStart = new Date('2026-01-02');  // First Friday of 2026
        const wenOldEnd   = new Date('2026-05-22');  // Last Friday before switch to Mondays
        const wenOldRate  = 70;
        const wenNewStart = new Date('2026-05-25');  // First Monday on new £100/wk
        const wenNewRate  = 100;
        function countDaysBetween(from, to, dayOfWeek) {
          if (to < from) return 0;
          let count = 0; const d = new Date(from);
          while (d <= to) { if (d.getDay() === dayOfWeek) count++; d.setDate(d.getDate() + 1); }
          return count;
        }
        function clampedCount(from, to, periodFrom, periodTo, dayOfWeek) {
          const f = periodFrom > from ? periodFrom : from;
          const t = periodTo < to ? periodTo : to;
          return t < f ? 0 : countDaysBetween(f, t, dayOfWeek);
        }
        function staffCostBetween(from, to) {
          const ianPaid    = clampedCount(ianStart,    ianEnd,    from, to, 5) * ianRate;
          const wenOldPaid = clampedCount(wenOldStart, wenOldEnd, from, to, 5) * wenOldRate;
          const wenNewPaid = clampedCount(wenNewStart, new Date('2099-12-31'), from, to, 1) * wenNewRate;
          return ianPaid + wenOldPaid + wenNewPaid;
        }
        const periodStartMonthly = new Date(selectedMonth + '-01');
        const periodEndMonthly = new Date(new Date(periodStartMonthly).setMonth(periodStartMonthly.getMonth() + 1) - 1);
        const staffMonthly = staffCostBetween(periodStartMonthly, periodEndMonthly);
        const curWeekStart = new Date(curWeekKey); const curWeekEnd = new Date(curWeekKey); curWeekEnd.setDate(curWeekEnd.getDate() + 6);
        const staffWeekly = staffCostBetween(curWeekStart, curWeekEnd);
        const yearStart = new Date(`${new Date().getFullYear()}-01-01`);
        const today2 = new Date();
        const staffYTD = staffCostBetween(yearStart, today2);

        setAutoData({ prepMonthly, prepWeekly, prepAllTime, liqMonthly, liqWeekly, liqAllTime, dealMonthly, dealWeekly, dealAllTime, dealYTD, prepYTD, liqYTD, staffMonthly, staffWeekly, staffYTD, loading: false });
      } catch(e) {
        console.error("Tracker fetch error:", e);
        setAutoData(d => ({ ...d, loading: false }));
      }
    }
    if (token) fetchAuto();
  }, [token, selectedMonth]);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0,10), stream:"prep", type:"profit", category:"", amount:"", note:"" });
  const [timeForm, setTimeForm] = useState({ date: new Date().toISOString().slice(0,10), stream:"prep", hours:"", note:"" });

  useEffect(() => { localStorage.setItem(TKEY, JSON.stringify(data)); }, [data]);

  const curYear = new Date().getFullYear();
  const periodKey = period === "weekly" ? getWeekKey(new Date().toISOString().slice(0,10)) : period === "ytd" ? String(curYear) : selectedMonth;
  const periodLabel = period === "weekly" ? `Week of ${periodKey}` : period === "ytd" ? `Year to Date ${curYear}` : new Date(selectedMonth+"-01").toLocaleString("default",{month:"long",year:"numeric"});

  const filtE = data.entries.filter(e => {
    if (period === "weekly") return getWeekKey(e.date) === periodKey;
    if (period === "ytd") return e.date.slice(0,4) === String(curYear);
    return getMonthKey(e.date) === periodKey;
  });
  const filtT = data.timeEntries.filter(e => {
    if (period === "weekly") return getWeekKey(e.date) === periodKey;
    if (period === "ytd") return e.date.slice(0,4) === String(curYear);
    return getMonthKey(e.date) === periodKey;
  });

  const stats = INCOME_STREAMS.map(s => {
    const ents = filtE.filter(e => e.stream === s.id);
    const manualRev = ents.filter(e => e.type==="profit").reduce((a,e) => a+Number(e.amount),0);
    const exp = ents.filter(e => e.type==="cost").reduce((a,e) => a+Number(e.amount),0);
    const hrs = filtT.filter(e => e.stream===s.id).reduce((a,e) => a+Number(e.hours),0);
    let autoRev = 0;
    if (s.id === "prep" && !autoData.loading) autoRev = period === "weekly" ? (autoData.prepWeekly||0) : period === "ytd" ? (autoData.prepYTD||0) : (autoData.prepMonthly||0);
    if (s.id === "liquidation" && !autoData.loading) autoRev = period === "weekly" ? (autoData.liqWeekly||0) : period === "ytd" ? (autoData.liqYTD||0) : (autoData.liqMonthly||0);
    if (s.id === "dealsheet" && !autoData.loading) autoRev = period === "weekly" ? (autoData.dealWeekly||0) : period === "ytd" ? (autoData.dealYTD||0) : (autoData.dealMonthly||0);
    const rev = autoRev + manualRev;
    return { ...s, rev, exp, profit: rev-exp, hrs, rate: hrs>0?(rev-exp)/hrs:0, isAuto: autoRev > 0 };
  });

  const ytdYear = new Date().getFullYear();
  const manualCumProfit = data.entries.filter(e=>e.type==="profit"&&e.date.slice(0,4)===String(ytdYear)).reduce((a,e)=>a+Number(e.amount),0) - data.entries.filter(e=>e.type==="cost"&&e.date.slice(0,4)===String(ytdYear)).reduce((a,e)=>a+Number(e.amount),0);
  const autoCumProfit = (autoData.prepYTD||0) + (autoData.liqYTD||0) + (autoData.dealYTD||0) - (autoData.staffYTD||0);

  const staffAutoExp = autoData.loading ? 0 : (period === "weekly" ? (autoData.staffWeekly||0) : period === "ytd" ? (autoData.staffYTD||0) : (autoData.staffMonthly||0));

  const totals = {
    rev: stats.reduce((a,s)=>a+s.rev,0), exp: stats.reduce((a,s)=>a+s.exp,0) + staffAutoExp,
    profit: stats.reduce((a,s)=>a+s.profit,0) - staffAutoExp, hrs: stats.reduce((a,s)=>a+s.hrs,0),
    cumProfit: autoCumProfit + manualCumProfit
  };

  const maxP = Math.max(...stats.map(s=>Math.abs(s.profit)),1);

  function addEntry() {
    if (!form.amount) return;
    setData(d => ({ ...d, entries:[...d.entries,{id:Date.now(),...form}] }));
    setForm(f => ({ ...f, amount:"", note:"", category:"" }));
  }
  function addTime() {
    if (!timeForm.hours) return;
    setData(d => ({ ...d, timeEntries:[...d.timeEntries,{id:Date.now(),...timeForm}] }));
    setTimeForm(f => ({ ...f, hours:"", note:"" }));
  }
  function delEntry(id) { setData(d => ({ ...d, entries:d.entries.filter(e=>e.id!==id) })); }
  function delTime(id) { setData(d => ({ ...d, timeEntries:d.timeEntries.filter(e=>e.id!==id) })); }

  const dispEntries = selStream ? filtE.filter(e=>e.stream===selStream) : filtE;

  const trackNav = ["overview","add entry","time","history"];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title" style={{color:"var(--orange)"}}>📊 Income Tracker</div>
          <div className="page-subtitle">Track profits across all your income streams</div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {period === "monthly" && (
            <input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="form-input"
              style={{fontSize:13,padding:"6px 12px",width:"auto"}}
            />
          )}
          {["weekly","monthly","ytd"].map(p => (
            <button key={p} className={`btn ${period===p?"btn-primary admin":""}`} style={{fontSize:13,padding:"6px 16px",background:period!==p?"var(--bg-card)":undefined,color:period!==p?"var(--text-muted)":undefined}} onClick={()=>setPeriod(p)}>
              {p === "ytd" ? "Year to Date" : p.charAt(0).toUpperCase()+p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* sub nav */}
      <div style={{display:"flex",gap:4,marginBottom:24,borderBottom:"1px solid var(--border)",paddingBottom:0}}>
        {trackNav.map(v => (
          <button key={v} onClick={()=>setView(v)} style={{padding:"8px 18px",border:"none",background:"transparent",color:view===v?"var(--orange)":"var(--text-muted)",fontFamily:"inherit",fontSize:14,cursor:"pointer",borderBottom:view===v?"2px solid var(--orange)":"2px solid transparent",marginBottom:-1,transition:"all 0.15s"}}>
            {v.charAt(0).toUpperCase()+v.slice(1)}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {view==="overview" && <>
        <div style={{fontSize:11,color:"var(--text-muted)",letterSpacing:1,textTransform:"uppercase",marginBottom:16}}>{periodLabel}</div>

        <div className="stats-grid" style={{gridTemplateColumns:"repeat(5,1fr)"}}>
          {[
            {label:"Income",value:`£${totals.rev.toFixed(2)}`,cls:""},
            {label:"Costs",value:`£${totals.exp.toFixed(2)}`,cls:"warning"},
            {label:"Net Profit",value:`£${totals.profit.toFixed(2)}`,cls:totals.profit>=0?"":"warning"},
            {label:"Hours",value:`${totals.hrs.toFixed(1)}h`,cls:""},
            {label:"YTD Profit",value:`£${totals.cumProfit.toFixed(2)}`,cls:"admin"},
          ].map(s => (
            <div key={s.label} className={`card stat-card ${s.cls}`}>
              <div style={{fontSize:11,color:"var(--text-muted)",letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>{s.label}</div>
              <div style={{fontFamily:"'Outfit',sans-serif",fontSize:26,fontWeight:700,color:s.cls==="warning"?"var(--red)":s.cls==="admin"?"var(--orange)":"var(--text-primary)"}}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12,marginBottom:24}}>
          {stats.map(s => (
            <div key={s.id} className="card" onClick={()=>setSelStream(selStream===s.id?null:s.id)} style={{cursor:"pointer",borderColor:selStream===s.id?s.color:"var(--border)",transition:"border-color 0.15s"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontWeight:700,fontSize:15,color:s.color,display:"flex",alignItems:"center",gap:6}}>{s.icon} {s.label}{s.isAuto&&<span style={{fontSize:10,background:"var(--green)",color:"#000",padding:"1px 6px",borderRadius:20,fontWeight:700}}>AUTO</span>}{autoData.loading&&(s.id==="prep"||s.id==="liquidation")&&<span style={{fontSize:10,color:"var(--text-muted)"}}>...</span>}</div>
              </div>
              <div style={{fontSize:24,fontWeight:700,color:s.profit>=0?"var(--green)":"var(--red)",fontFamily:"'Outfit',sans-serif"}}>£{s.profit.toFixed(2)}</div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"var(--text-muted)",marginTop:6}}>
                <span>Rev: £{s.rev.toFixed(2)}</span><span>Exp: £{s.exp.toFixed(2)}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"var(--text-muted)",marginTop:4}}>
                <span>{s.hrs.toFixed(1)}h</span><span>{s.hrs>0?`£${s.rate.toFixed(2)}/hr`:"—"}</span>
              </div>
              <div style={{height:3,background:"var(--bg-card)",borderRadius:2,marginTop:10}}>
                <div style={{height:"100%",borderRadius:2,background:s.color,width:`${Math.abs(s.profit)/maxP*100}%`,transition:"width 0.4s"}} />
              </div>
            </div>
          ))}
          {staffAutoExp > 0 && <div className="card" style={{borderColor:"var(--red)",borderLeftWidth:3}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div style={{fontWeight:700,fontSize:15,color:"var(--red)",display:"flex",alignItems:"center",gap:6}}>👥 Staff Costs <span style={{fontSize:10,background:"var(--green)",color:"#000",padding:"1px 6px",borderRadius:20,fontWeight:700}}>AUTO</span></div>
            </div>
            <div style={{fontSize:24,fontWeight:700,color:"var(--red)",fontFamily:"'Outfit',sans-serif"}}>-£{staffAutoExp.toFixed(2)}</div>
            <div style={{fontSize:12,color:"var(--text-muted)",marginTop:6}}>Wenelyn £100/Mon</div>
            <div style={{fontSize:11,color:"var(--text-muted)",marginTop:2}}>Ian £70/Fri to 15 May · Wenelyn switched 25 May</div>
          </div>}
        </div>

        <div className="card" style={{overflowX:"auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div className="card-title">{selStream?INCOME_STREAMS.find(s=>s.id===selStream)?.label:"All"} Entries — {periodLabel}</div>
            {selStream && <button className="btn" style={{fontSize:12,padding:"4px 12px"}} onClick={()=>setSelStream(null)}>Clear filter</button>}
          </div>
          {dispEntries.length===0 ? <div style={{textAlign:"center",color:"var(--text-muted)",padding:32}}>No entries yet</div> : (
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr>{["Date","Stream","Type","Category","Amount","Note",""].map(h=><th key={h} style={{padding:"8px 12px",textAlign:"left",fontSize:11,color:"var(--text-muted)",letterSpacing:1,textTransform:"uppercase",borderBottom:"1px solid var(--border)"}}>{h}</th>)}</tr></thead>
              <tbody>{[...dispEntries].sort((a,b)=>b.date.localeCompare(a.date)).map(e=>{
                const s=INCOME_STREAMS.find(s=>s.id===e.stream);
                return <tr key={e.id} style={{borderBottom:"1px solid var(--border)"}}>
                  <td style={{padding:"8px 12px",fontSize:12,color:"var(--text-muted)"}}>{e.date}</td>
                  <td style={{padding:"8px 12px"}}><span className="badge" style={{background:s?.color+"22",color:s?.color}}>{s?.icon} {s?.label}</span></td>
                  <td style={{padding:"8px 12px"}}><span className="badge" style={{background:e.type==="profit"?"rgba(0,230,118,0.15)":"rgba(239,68,68,0.15)",color:e.type==="profit"?"var(--green)":"var(--red)"}}>{e.type}</span></td>
                  <td style={{padding:"8px 12px",fontSize:12,color:"var(--text-muted)"}}>{e.category||"—"}</td>
                  <td style={{padding:"8px 12px",fontWeight:600,color:e.type==="profit"?"var(--green)":"var(--red)"}}>£{Number(e.amount).toFixed(2)}</td>
                  <td style={{padding:"8px 12px",fontSize:12,color:"var(--text-muted)"}}>{e.note||"—"}</td>
                  <td style={{padding:"8px 12px"}}><button className="btn" style={{fontSize:11,padding:"3px 8px",color:"var(--red)",border:"1px solid var(--red)",background:"transparent"}} onClick={()=>delEntry(e.id)}>✕</button></td>
                </tr>;
              })}</tbody>
            </table>
          )}
        </div>
      </>}

      {/* ADD ENTRY */}
      {view==="add entry" && <>
        <div className="card" style={{marginBottom:20}}>
          <div className="card-title" style={{color:"var(--orange)",marginBottom:16}}>Add Revenue / Expense</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12}}>
            {[
              {label:"Date",el:<input className="form-input" type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} />},
              {label:"Stream",el:<select className="form-input" value={form.stream} onChange={e=>setForm(f=>({...f,stream:e.target.value}))}>{INCOME_STREAMS.map(s=><option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}</select>},
              {label:"Type",el:<select className="form-input" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}><option value="profit">Profit</option><option value="cost">Cost</option></select>},
              {label:"Category",el:<select className="form-input" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}><option value="">General</option>{EXPENSE_CATS.map(c=><option key={c} value={c}>{c}</option>)}</select>},
              {label:"Amount (£)",el:<input className="form-input" type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} />},
              {label:"Note",el:<input className="form-input" type="text" placeholder="Optional" value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} />},
            ].map(({label,el}) => (
              <div key={label}>
                <div style={{fontSize:11,color:"var(--text-muted)",letterSpacing:1,textTransform:"uppercase",marginBottom:5}}>{label}</div>
                {el}
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:8,marginTop:16}}>
            <button className="btn btn-primary admin" onClick={addEntry}>Add Entry</button>
            <button className="btn" onClick={()=>setForm(f=>({...f,amount:"",note:"",category:""}))}>Clear</button>
          </div>
        </div>

        <div className="card">
          <div className="card-title" style={{color:"var(--orange)",marginBottom:16}}>Log Time</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12}}>
            {[
              {label:"Date",el:<input className="form-input" type="date" value={timeForm.date} onChange={e=>setTimeForm(f=>({...f,date:e.target.value}))} />},
              {label:"Stream",el:<select className="form-input" value={timeForm.stream} onChange={e=>setTimeForm(f=>({...f,stream:e.target.value}))}>{INCOME_STREAMS.map(s=><option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}</select>},
              {label:"Hours",el:<input className="form-input" type="number" step="0.5" placeholder="e.g. 2.5" value={timeForm.hours} onChange={e=>setTimeForm(f=>({...f,hours:e.target.value}))} />},
              {label:"Note",el:<input className="form-input" type="text" placeholder="Optional" value={timeForm.note} onChange={e=>setTimeForm(f=>({...f,note:e.target.value}))} />},
            ].map(({label,el}) => (
              <div key={label}>
                <div style={{fontSize:11,color:"var(--text-muted)",letterSpacing:1,textTransform:"uppercase",marginBottom:5}}>{label}</div>
                {el}
              </div>
            ))}
          </div>
          <div style={{marginTop:16}}>
            <button className="btn btn-primary admin" onClick={addTime}>Log Time</button>
          </div>
        </div>
      </>}

      {/* TIME */}
      {view==="time" && <>
        <div style={{fontSize:11,color:"var(--text-muted)",letterSpacing:1,textTransform:"uppercase",marginBottom:16}}>{periodLabel} — Hourly Rates</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,marginBottom:24}}>
          {stats.map(s => (
            <div key={s.id} className="card">
              <div style={{fontWeight:700,fontSize:15,color:s.color,marginBottom:8}}>{s.icon} {s.label}</div>
              <div style={{fontSize:26,fontWeight:700,fontFamily:"'Outfit',sans-serif"}}>{s.hrs.toFixed(1)}<span style={{fontSize:14,color:"var(--text-muted)",marginLeft:4}}>hrs</span></div>
              <div style={{fontSize:13,marginTop:4,color:s.hrs>0?(s.rate>=15?"var(--green)":s.rate>=8?"var(--amber)":"var(--red)"):"var(--text-muted)"}}>
                {s.hrs>0?`£${s.rate.toFixed(2)}/hr`:"No time logged"}
              </div>
              <div style={{fontSize:12,color:"var(--text-muted)",marginTop:6}}>Profit: £{s.profit.toFixed(2)}</div>
            </div>
          ))}
        </div>
        <div className="card" style={{overflowX:"auto"}}>
          <div className="card-title" style={{marginBottom:16}}>Time Log — {periodLabel}</div>
          {filtT.length===0 ? <div style={{textAlign:"center",color:"var(--text-muted)",padding:32}}>No time logged yet</div> : (
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr>{["Date","Stream","Hours","Note",""].map(h=><th key={h} style={{padding:"8px 12px",textAlign:"left",fontSize:11,color:"var(--text-muted)",letterSpacing:1,borderBottom:"1px solid var(--border)"}}>{h}</th>)}</tr></thead>
              <tbody>{[...filtT].sort((a,b)=>b.date.localeCompare(a.date)).map(e=>{
                const s=INCOME_STREAMS.find(s=>s.id===e.stream);
                return <tr key={e.id} style={{borderBottom:"1px solid var(--border)"}}>
                  <td style={{padding:"8px 12px",fontSize:12,color:"var(--text-muted)"}}>{e.date}</td>
                  <td style={{padding:"8px 12px"}}><span className="badge" style={{background:s?.color+"22",color:s?.color}}>{s?.icon} {s?.label}</span></td>
                  <td style={{padding:"8px 12px",fontWeight:600}}>{Number(e.hours).toFixed(1)}h</td>
                  <td style={{padding:"8px 12px",fontSize:12,color:"var(--text-muted)"}}>{e.note||"—"}</td>
                  <td style={{padding:"8px 12px"}}><button className="btn" style={{fontSize:11,padding:"3px 8px",color:"var(--red)",border:"1px solid var(--red)",background:"transparent"}} onClick={()=>delTime(e.id)}>✕</button></td>
                </tr>;
              })}</tbody>
            </table>
          )}
        </div>
      </>}

      {/* HISTORY */}
      {view==="history" && <>
        <div style={{fontSize:11,color:"var(--text-muted)",letterSpacing:1,textTransform:"uppercase",marginBottom:16}}>All Time</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,marginBottom:24}}>
          {INCOME_STREAMS.map(s => {
            const manualRev=data.entries.filter(e=>e.stream===s.id&&e.type==="profit").reduce((a,e)=>a+Number(e.amount),0);
            const exp=data.entries.filter(e=>e.stream===s.id&&e.type==="cost").reduce((a,e)=>a+Number(e.amount),0);
            const hrs=data.timeEntries.filter(e=>e.stream===s.id).reduce((a,e)=>a+Number(e.hours),0);
            const autoRev = s.id==="prep"?(autoData.prepAllTime||0):s.id==="liquidation"?(autoData.liqAllTime||0):0;
            const rev = autoRev + manualRev;
            const profit=rev-exp;
            return <div key={s.id} className="card">
              <div style={{fontWeight:700,fontSize:15,color:s.color,marginBottom:8,display:"flex",alignItems:"center",gap:6}}>{s.icon} {s.label}{autoRev>0&&<span style={{fontSize:10,background:"var(--green)",color:"#000",padding:"1px 6px",borderRadius:20,fontWeight:700}}>AUTO</span>}</div>
              <div style={{fontSize:24,fontWeight:700,fontFamily:"'Outfit',sans-serif",color:profit>=0?"var(--green)":"var(--red)"}}>£{profit.toFixed(2)}</div>
              <div style={{fontSize:12,color:"var(--text-muted)",marginTop:6}}>Rev £{rev.toFixed(2)} · Exp £{exp.toFixed(2)}</div>
              <div style={{fontSize:12,color:"var(--text-muted)",marginTop:4}}>{hrs.toFixed(1)}h · {hrs>0?`£${(profit/hrs).toFixed(2)}/hr`:"—"}</div>
            </div>;
          })}
        </div>
        <div className="card" style={{overflowX:"auto"}}>
          <div className="card-title" style={{marginBottom:16}}>All Entries</div>
          {data.entries.length===0 ? <div style={{textAlign:"center",color:"var(--text-muted)",padding:32}}>No entries yet</div> : (
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr>{["Date","Stream","Type","Category","Amount","Note",""].map(h=><th key={h} style={{padding:"8px 12px",textAlign:"left",fontSize:11,color:"var(--text-muted)",letterSpacing:1,borderBottom:"1px solid var(--border)"}}>{h}</th>)}</tr></thead>
              <tbody>{[...data.entries].sort((a,b)=>b.date.localeCompare(a.date)).map(e=>{
                const s=INCOME_STREAMS.find(s=>s.id===e.stream);
                return <tr key={e.id} style={{borderBottom:"1px solid var(--border)"}}>
                  <td style={{padding:"8px 12px",fontSize:12,color:"var(--text-muted)"}}>{e.date}</td>
                  <td style={{padding:"8px 12px"}}><span className="badge" style={{background:s?.color+"22",color:s?.color}}>{s?.icon} {s?.label}</span></td>
                  <td style={{padding:"8px 12px"}}><span className="badge" style={{background:e.type==="profit"?"rgba(0,230,118,0.15)":"rgba(239,68,68,0.15)",color:e.type==="profit"?"var(--green)":"var(--red)"}}>{e.type}</span></td>
                  <td style={{padding:"8px 12px",fontSize:12,color:"var(--text-muted)"}}>{e.category||"—"}</td>
                  <td style={{padding:"8px 12px",fontWeight:600,color:e.type==="profit"?"var(--green)":"var(--red)"}}>£{Number(e.amount).toFixed(2)}</td>
                  <td style={{padding:"8px 12px",fontSize:12,color:"var(--text-muted)"}}>{e.note||"—"}</td>
                  <td style={{padding:"8px 12px"}}><button className="btn" style={{fontSize:11,padding:"3px 8px",color:"var(--red)",border:"1px solid var(--red)",background:"transparent"}} onClick={()=>delEntry(e.id)}>✕</button></td>
                </tr>;
              })}</tbody>
            </table>
          )}
        </div>
      </>}
    </div>
  );
}
// ============ MASTER STOCK (all clients combined) ============
function AdminMasterStockPage({ clients, liquidation, liquidationSales, token, showToast, onRefresh }) {
  const [tab, setTab] = useState("listed"); // "listed" | "sold"
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [conditionFilter, setConditionFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [logSaleItem, setLogSaleItem] = useState(null);
  const [saleForm, setSaleForm] = useState({ date_sold: "", qty_sold: 1, sale_price: "", ebay_fees: "", shipping: "", fixed_fee: "0.40", ebay_order_id: "" });
  const [saleSaving, setSaleSaving] = useState(false);
  const [allSales, setAllSales] = useState([]);
  const [salesLoading, setSalesLoading] = useState(true);

  // The parent admin component loads liquidation_sales with only 4 columns for performance.
  // For the Master Stock page we need the full row, so fetch it ourselves.
  const loadFullSales = async () => {
    if (!token) return;
    setSalesLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/liquidation_sales?select=*&order=date_sold.desc.nullslast`, {
        headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setAllSales(data);
    } catch (e) {
      console.error("Master stock — load full sales failed:", e);
    }
    setSalesLoading(false);
  };

  useEffect(() => { loadFullSales(); }, [token]);

  // Build a quick lookup: user_id -> client object
  const clientById = useMemo(() => {
    const map = {};
    (clients || []).forEach(c => { map[c.id] = c; });
    return map;
  }, [clients]);

  // LISTED: items that have been received and still have qty available
  const listedItems = useMemo(() => {
    return (liquidation || [])
      .filter(i => i.received && ((i.quantity || 1) - (i.qty_sold || 0)) > 0)
      .map(i => ({
        ...i,
        client: clientById[i.user_id] || null,
        qty_available: (i.quantity || 1) - (i.qty_sold || 0)
      }));
  }, [liquidation, clientById]);

  // Build a stock lookup by id so we can fall back from snapshot fields
  // (older sales rows may not have product_name_snapshot populated)
  const stockById = useMemo(() => {
    const map = {};
    (liquidation || []).forEach(s => { map[s.id] = s; });
    return map;
  }, [liquidation]);

  // SOLD: all sales rows, with fallback to original stock record when snapshots are missing
  const soldItems = useMemo(() => {
    return (allSales || []).map(s => {
      const stockItem = stockById[s.stock_id];
      return {
        ...s,
        client: clientById[s.user_id] || null,
        display_product: s.product_name_snapshot || stockItem?.product_name || "—",
        display_sku: s.dbh_sku_snapshot || stockItem?.dbh_sku || "",
        display_asin: s.asin_snapshot || stockItem?.asin || ""
      };
    });
  }, [allSales, clientById, stockById]);

  const filterAndSort = (items, kind) => {
    let out = items;
    if (clientFilter !== "all") out = out.filter(i => i.user_id === clientFilter);
    if (kind === "listed" && conditionFilter !== "all") {
      out = out.filter(i => (i.condition || "").toLowerCase() === conditionFilter.toLowerCase());
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(i => {
        const name = (i.product_name || i.display_product || i.product_name_snapshot || "").toLowerCase();
        const sku = (i.dbh_sku || i.display_sku || i.dbh_sku_snapshot || "").toLowerCase();
        const asin = (i.asin || i.display_asin || i.asin_snapshot || "").toLowerCase();
        const lpn = (i.lpn_number || "").toLowerCase();
        const orderId = (i.ebay_order_id || "").toLowerCase();
        const clientName = (i.client?.full_name || i.client?.email || "").toLowerCase();
        return name.includes(q) || sku.includes(q) || asin.includes(q) || lpn.includes(q) || orderId.includes(q) || clientName.includes(q);
      });
    }
    // Sort — always handle all options regardless of tab, fall through to newest as default
    const dateOf = (i) => kind === "listed"
      ? new Date(i.date_added || i.created_at || 0)
      : new Date(i.date_sold || 0);
    const nameOf = (i) => (i.product_name || i.display_product || i.product_name_snapshot || "");
    switch (sortBy) {
      case "oldest":
        out = [...out].sort((a, b) => dateOf(a) - dateOf(b));
        break;
      case "client":
        out = [...out].sort((a, b) => (a.client?.full_name || a.client?.email || "").localeCompare(b.client?.full_name || b.client?.email || ""));
        break;
      case "name":
        out = [...out].sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
        break;
      case "payout":
        out = [...out].sort((a, b) => (parseFloat(b.payout) || 0) - (parseFloat(a.payout) || 0));
        break;
      case "sale":
        out = [...out].sort((a, b) => (parseFloat(b.sale_price) || 0) - (parseFloat(a.sale_price) || 0));
        break;
      case "newest":
      default:
        out = [...out].sort((a, b) => dateOf(b) - dateOf(a));
        break;
    }
    return out;
  };

  const dispListed = useMemo(() => filterAndSort(listedItems, "listed"), [listedItems, search, clientFilter, conditionFilter, sortBy]);
  const dispSold = useMemo(() => filterAndSort(soldItems, "sold"), [soldItems, search, clientFilter, sortBy]);

  // Distinct conditions across listed items
  const conditions = useMemo(() => {
    const set = new Set();
    listedItems.forEach(i => { if (i.condition) set.add(i.condition); });
    return Array.from(set).sort();
  }, [listedItems]);

  // Top-line stats
  const totalListedUnits = listedItems.reduce((sum, i) => sum + i.qty_available, 0);
  const totalListedValue = listedItems.reduce((sum, i) => sum + (parseFloat(i.cog) || 0) * i.qty_available, 0);
  const totalSoldRevenue = soldItems.reduce((sum, s) => sum + (parseFloat(s.sale_price) || 0), 0);
  const totalSoldPayout = soldItems.reduce((sum, s) => sum + (parseFloat(s.payout) || 0), 0);
  const totalDbhFees = soldItems.reduce((sum, s) => sum + (parseFloat(s.dbh_fee) || 0), 0);

  // Sale calculation (mirrors the per-client logic on line ~5590)
  // Tiers: net >= £200 → 10%, otherwise 15%. Flat £0.40 fixed fee unless overridden.
  const calcSale = (form, client) => {
    const sale = parseFloat(form.sale_price) || 0;
    const ebay = parseFloat(form.ebay_fees) || 0;
    const ship = parseFloat(form.shipping) || 0;
    const fixed = parseFloat(form.fixed_fee) || 0.40;
    const net = sale - ebay - ship;
    const standardRate = client?.liq_commission_standard != null ? parseFloat(client.liq_commission_standard) : 15;
    const highRate = client?.liq_commission_high != null ? parseFloat(client.liq_commission_high) : 10;
    const pct = (net >= 200 ? highRate : standardRate) / 100;
    const fee = net * pct;
    const payout = net - fee - fixed;
    return { net, pct, fee, fixed, payout };
  };

  const openLogSale = (item) => {
    setLogSaleItem(item);
    const today = new Date().toISOString().split('T')[0];
    setSaleForm({ date_sold: today, qty_sold: 1, sale_price: "", ebay_fees: "", shipping: "", fixed_fee: "0.40", ebay_order_id: "" });
  };

  const submitSale = async () => {
    if (!saleForm.date_sold || !saleForm.sale_price) { showToast("Enter date and sale price"); return; }
    setSaleSaving(true);
    const c = calcSale(saleForm, logSaleItem.client);
    const payoutDate = getPayoutDate(saleForm.date_sold);
    const payload = {
      stock_id: logSaleItem.id, user_id: logSaleItem.user_id, date_sold: saleForm.date_sold,
      qty_sold: parseInt(saleForm.qty_sold) || 1, sale_price: parseFloat(saleForm.sale_price),
      ebay_fees: parseFloat(saleForm.ebay_fees) || 0, shipping: parseFloat(saleForm.shipping) || 0,
      net_sale: parseFloat(c.net.toFixed(2)), dbh_pct: parseFloat((c.pct * 100).toFixed(2)),
      dbh_fee: parseFloat(c.fee.toFixed(2)), fixed_fee: parseFloat(saleForm.fixed_fee) || 0.40,
      payout: parseFloat(c.payout.toFixed(2)), payout_date: payoutDate.toISOString().split('T')[0], paid: false,
      ebay_order_id: saleForm.ebay_order_id || null,
      logged_at: new Date().toISOString(),
      product_name_snapshot: logSaleItem.product_name || null,
      asin_snapshot: logSaleItem.asin || null,
      dbh_sku_snapshot: logSaleItem.dbh_sku || null
    };
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/liquidation_sales`, {
        method: "POST",
        headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}`, "Content-Type": "application/json", "Prefer": "return=representation" },
        body: JSON.stringify(payload)
      });
      const newQtySold = (logSaleItem.qty_sold || 0) + (parseInt(saleForm.qty_sold) || 1);
      await fetch(`${SUPABASE_URL}/rest/v1/liquidation_stock?id=eq.${logSaleItem.id}`, {
        method: "PATCH",
        headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ qty_sold: newQtySold })
      });
      // Optional client Discord notification
      const hw = logSaleItem.client?.discord_webhook;
      if (hw) {
        try {
          await sendDiscordNotification(hw, null, {
            title: "💰 ITEM SOLD",
            color: 0x22c55e,
            fields: [
              { name: "Product", value: logSaleItem.product_name || "Item", inline: false },
              { name: "Sale Price", value: `£${parseFloat(saleForm.sale_price).toFixed(2)}`, inline: true },
              { name: "Qty Sold", value: `${saleForm.qty_sold}`, inline: true },
              { name: "Your Payout", value: `£${c.payout.toFixed(2)}`, inline: true },
              { name: "Payout Date", value: payoutDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }), inline: true }
            ],
            footer: { text: "Payout at end of following month to allow for returns" }
          });
        } catch (e) { /* notify failure non-fatal */ }
      }
      showToast("Sale logged!");
      setLogSaleItem(null);
      await loadFullSales();
      if (onRefresh) await onRefresh();
    } catch (e) {
      console.error("Master stock sale log error:", e);
      showToast("Failed to log sale");
    }
    setSaleSaving(false);
  };

  const c = logSaleItem ? calcSale(saleForm, logSaleItem.client) : null;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title" style={{ color: "var(--orange)" }}>📦 Master Stock</div>
          <div className="page-subtitle">All clients' stock and sales in one view — log a sale here and it updates the client's card automatically</div>
        </div>
      </div>

      <div className="page-body">
        {/* Top stats */}
        <div className="stats-grid">
          <div className="card stat-card admin">
            <div className="card-title">Listed Units</div>
            <div className="stat-value">{totalListedUnits}</div>
            <div className="stat-label">{listedItems.length} unique items</div>
          </div>
          <div className="card stat-card admin">
            <div className="card-title">Listed COG Value</div>
            <div className="stat-value">£{totalListedValue.toFixed(0)}</div>
            <div className="stat-label">at cost</div>
          </div>
          <div className="card stat-card admin">
            <div className="card-title">Total Sold Revenue</div>
            <div className="stat-value">£{totalSoldRevenue.toFixed(0)}</div>
            <div className="stat-label">{soldItems.length} sales</div>
          </div>
          <div className="card stat-card admin">
            <div className="card-title">DBH Fees Earned</div>
            <div className="stat-value">£{totalDbhFees.toFixed(0)}</div>
            <div className="stat-label">£{totalSoldPayout.toFixed(0)} paid to clients</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="service-tabs" style={{ marginBottom: 20, border: "1px solid var(--border)", borderRadius: 12, padding: 6, maxWidth: 320 }}>
          <button className={`service-tab ${tab === "listed" ? "active liquidation" : ""}`} onClick={() => { setTab("listed"); setSortBy("newest"); }}>📦 Listed ({listedItems.length})</button>
          <button className={`service-tab ${tab === "sold" ? "active liquidation" : ""}`} onClick={() => { setTab("sold"); setSortBy("newest"); }}>💰 Sold ({soldItems.length})</button>
        </div>

        {/* Filters */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 12 }}>
            <div className="search-bar" style={{ maxWidth: "none" }}>
              <Icons.Search />
              <input placeholder="Search product, SKU, ASIN, LPN, order ID, or client..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="input" value={clientFilter} onChange={e => setClientFilter(e.target.value)}>
              <option value="all">All clients</option>
              {(clients || []).map(c => <option key={c.id} value={c.id}>{c.full_name || c.email}</option>)}
            </select>
            {tab === "listed" && (
              <select className="input" value={conditionFilter} onChange={e => setConditionFilter(e.target.value)}>
                <option value="all">All conditions</option>
                {conditions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            <select className="input" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="client">By client</option>
              <option value="name">By product name</option>
              {tab === "sold" && <option value="payout">By payout (high→low)</option>}
              {tab === "sold" && <option value="sale">By sale price (high→low)</option>}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {tab === "listed" ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Product</th>
                    <th>DBH SKU</th><th>UID</th>
                    <th>ASIN</th>
                    <th>Condition</th>
                    <th>Qty</th>
                    <th>COG</th>
                    <th>Listed</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {dispListed.length === 0 ? (
                    <tr><td colSpan={9} className="empty-state"><p>No listed stock matches your filters.</p></td></tr>
                  ) : dispListed.map(item => (
                    <tr key={item.id}>
                      <td><span className="badge badge-pending">{item.client?.full_name || item.client?.email || "—"}</span></td>
                      <td style={{ maxWidth: 320 }}>{item.product_name || "—"}</td>
                      <td className="mono" style={{ fontSize: 12 }}>{item.dbh_sku || "—"}</td>
                      <td className="mono" style={{ fontSize: 12 }}>{item.asin || "—"}</td>
                      <td style={{ fontSize: 13 }}>{item.condition || "—"}</td>
                      <td className="mono" style={{ color: "var(--green)" }}>{item.qty_available}</td>
                      <td className="mono">{item.cog ? `£${parseFloat(item.cog).toFixed(2)}` : "—"}</td>
                      <td>{item.listed ? <span className="badge badge-sold">Yes</span> : <span className="badge badge-pending">No</span>}</td>
                      <td><button className="btn btn-primary admin" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => openLogSale(item)}>Log Sale</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Date Sold</th>
                    <th>Product</th>
                    <th>Order ID</th>
                    <th>Qty</th>
                    <th>Sale £</th>
                    <th>Net Sale</th>
                    <th>DBH %</th>
                    <th>DBH £</th>
                    <th>Fixed</th>
                    <th>Payout</th>
                    <th>Payout Date</th>
                    <th>Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {salesLoading ? (
                    <tr><td colSpan={13} className="empty-state"><p>Loading sales...</p></td></tr>
                  ) : dispSold.length === 0 ? (
                    <tr><td colSpan={13} className="empty-state"><p>No sales match your filters.</p></td></tr>
                  ) : dispSold.map(s => (
                    <tr key={s.id}>
                      <td><span className="badge badge-pending">{s.client?.full_name || s.client?.email || "—"}</span></td>
                      <td style={{ fontSize: 12 }}>{s.date_sold ? formatShortDate(s.date_sold) : "—"}</td>
                      <td style={{ fontWeight: 600, fontSize: 12, maxWidth: 280 }}>{s.display_product}</td>
                      <td className="mono" style={{ fontSize: 11 }}>{s.ebay_order_id ? (
                        <span title="Click to copy" style={{ cursor: "pointer" }} onClick={() => { navigator.clipboard?.writeText(s.ebay_order_id); showToast("Order ID copied"); }}>{s.ebay_order_id}</span>
                      ) : "—"}</td>
                      <td className="mono">{s.qty_sold || 1}</td>
                      <td className="mono">£{(parseFloat(s.sale_price) || 0).toFixed(2)}</td>
                      <td className="mono">£{(parseFloat(s.net_sale) || 0).toFixed(2)}</td>
                      <td className="mono">{s.dbh_pct ? `${s.dbh_pct}%` : "—"}</td>
                      <td className="mono" style={{ color: "var(--red)" }}>£{(parseFloat(s.dbh_fee) || 0).toFixed(2)}</td>
                      <td className="mono" style={{ color: "var(--red)" }}>£{(parseFloat(s.fixed_fee) || 0).toFixed(2)}</td>
                      <td className="mono" style={{ fontWeight: 700, color: "var(--green)" }}>£{(parseFloat(s.payout) || 0).toFixed(2)}</td>
                      <td style={{ fontSize: 12 }}>{s.payout_date ? formatShortDate(s.payout_date) : "—"}</td>
                      <td style={{ textAlign: "center" }}>{s.paid ? <span style={{ color: "var(--green)" }}>✓ Paid</span> : <span style={{ color: "var(--amber)", fontSize: 12 }}>Pending</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Log Sale Modal */}
        {logSaleItem && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }} onClick={() => !saleSaving && setLogSaleItem(null)}>
            <div className="card" style={{ maxWidth: 560, width: "100%" }} onClick={e => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <div className="card-title">💰 Log Sale</div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{logSaleItem.product_name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Client: {logSaleItem.client?.full_name || logSaleItem.client?.email} · SKU: {logSaleItem.dbh_sku || "—"} · Available: {logSaleItem.qty_available}</div>
                </div>
                <button className="btn-icon" onClick={() => !saleSaving && setLogSaleItem(null)}>✕</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="input-group"><label className="input-label">Date Sold</label><input type="date" className="input" style={{ colorScheme: "dark" }} value={saleForm.date_sold} onChange={e => setSaleForm({ ...saleForm, date_sold: e.target.value })} /></div>
                <div className="input-group"><label className="input-label">Qty Sold</label><input type="number" min="1" max={logSaleItem.qty_available} className="input" value={saleForm.qty_sold} onChange={e => setSaleForm({ ...saleForm, qty_sold: e.target.value })} /></div>
                <div className="input-group"><label className="input-label">Sale Price (£)</label><input type="number" step="0.01" className="input" value={saleForm.sale_price} onChange={e => setSaleForm({ ...saleForm, sale_price: e.target.value })} /></div>
                <div className="input-group"><label className="input-label">eBay Fees (£)</label><input type="number" step="0.01" className="input" value={saleForm.ebay_fees} onChange={e => setSaleForm({ ...saleForm, ebay_fees: e.target.value })} /></div>
                <div className="input-group"><label className="input-label">Shipping (£)</label><input type="number" step="0.01" className="input" value={saleForm.shipping} onChange={e => setSaleForm({ ...saleForm, shipping: e.target.value })} /></div>
                <div className="input-group"><label className="input-label">Fixed Fee (£)</label><input type="number" step="0.01" className="input" value={saleForm.fixed_fee} onChange={e => setSaleForm({ ...saleForm, fixed_fee: e.target.value })} /></div>
                <div className="input-group" style={{ gridColumn: "1 / -1" }}><label className="input-label">eBay Order ID (optional)</label><input className="input" value={saleForm.ebay_order_id} onChange={e => setSaleForm({ ...saleForm, ebay_order_id: e.target.value })} /></div>
              </div>
              {c && saleForm.sale_price && (
                <div style={{ background: "var(--bg-primary)", borderRadius: 10, padding: 14, marginTop: 8, marginBottom: 16, display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, fontSize: 13 }}>
                  <div><div style={{ color: "var(--text-muted)", fontSize: 11 }}>Net Sale</div><div className="mono">£{c.net.toFixed(2)}</div></div>
                  <div><div style={{ color: "var(--text-muted)", fontSize: 11 }}>DBH %</div><div className="mono">{(c.pct * 100).toFixed(0)}%</div></div>
                  <div><div style={{ color: "var(--text-muted)", fontSize: 11 }}>DBH £</div><div className="mono" style={{ color: "var(--orange)" }}>£{c.fee.toFixed(2)}</div></div>
                  <div><div style={{ color: "var(--text-muted)", fontSize: 11 }}>Fixed</div><div className="mono" style={{ color: "var(--orange)" }}>£{c.fixed.toFixed(2)}</div></div>
                  <div><div style={{ color: "var(--text-muted)", fontSize: 11 }}>Payout</div><div className="mono" style={{ color: "var(--green)" }}>£{c.payout.toFixed(2)}</div></div>
                </div>
              )}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button className="btn btn-secondary" onClick={() => setLogSaleItem(null)} disabled={saleSaving}>Cancel</button>
                <button className="btn btn-primary admin" onClick={submitSale} disabled={saleSaving}>{saleSaving ? "Saving..." : "Log Sale"}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminEbayListingsPage({ token, showToast }) {
  const EBAY_CREDS_KEY = "dbh_ebay_creds";
  const [creds, setCreds] = useState(() => { try { return JSON.parse(localStorage.getItem(EBAY_CREDS_KEY) || "null"); } catch { return null; } });
  const [credForm, setCredForm] = useState({ clientId: "", clientSecret: "", refreshToken: "" });
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState(null);
  const [filter, setFilter] = useState("all");
  const [editingId, setEditingId] = useState(null);
  const [editPrice, setEditPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  const saveCreds = () => {
    if (!credForm.clientId || !credForm.clientSecret || !credForm.refreshToken) { showToast("Fill in all three fields"); return; }
    localStorage.setItem(EBAY_CREDS_KEY, JSON.stringify(credForm));
    setCreds(credForm);
    setShowSetup(false);
    showToast("eBay credentials saved!");
  };

  const clearCreds = () => { localStorage.removeItem(EBAY_CREDS_KEY); setCreds(null); setListings([]); };

  const getAccessToken = async () => {
    const basic = btoa(`${creds.clientId}:${creds.clientSecret}`);
    const res = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
      method: "POST",
      headers: { "Authorization": `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(creds.refreshToken)}&scope=https://api.ebay.com/oauth/api_scope/sell.inventory https://api.ebay.com/oauth/api_scope/sell.account`
    });
    const data = await res.json();
    if (!data.access_token) throw new Error(data.error_description || "Failed to get access token");
    return data.access_token;
  };

  const fetchListings = async () => {
    if (!creds) return;
    setLoading(true);
    try {
      const accessToken = await getAccessToken();
      let allItems = [];
      let offset = 0;
      const limit = 200;
      while (true) {
        const res = await fetch(`https://api.ebay.com/sell/inventory/v1/inventory_item?limit=${limit}&offset=${offset}`, {
          headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json", "Accept-Language": "en-GB" }
        });
        const data = await res.json();
        if (!data.inventoryItems) break;
        allItems = allItems.concat(data.inventoryItems);
        if (allItems.length >= (data.total || 0)) break;
        offset += limit;
      }

      // Get active listings with analytics via Trading API
      const tradingRes = await fetch("https://api.ebay.com/ws/api.dll", {
        method: "POST",
        headers: {
          "X-EBAY-API-CALL-NAME": "GetMyeBaySelling",
          "X-EBAY-API-APP-NAME": creds.clientId,
          "X-EBAY-API-CERT-NAME": creds.clientSecret,
          "X-EBAY-API-SITEID": "3",
          "X-EBAY-API-COMPATIBILITY-LEVEL": "967",
          "X-EBAY-API-IAF-TOKEN": accessToken,
          "Content-Type": "text/xml"
        },
        body: `<?xml version="1.0" encoding="utf-8"?><GetMyeBaySellingRequest xmlns="urn:ebay:apis:eBLBaseComponents"><RequesterCredentials><eBayAuthToken>${accessToken}</eBayAuthToken></RequesterCredentials><ActiveList><Include>true</Include><Pagination><EntriesPerPage>200</EntriesPerPage><PageNumber>1</PageNumber></Pagination><Sort>TimeLeft</Sort></ActiveList><HideVariations>false</HideVariations></GetMyeBaySellingRequest>`
      });
      const xmlText = await tradingRes.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(xmlText, "text/xml");
      const items = xml.querySelectorAll("ActiveList Item");
      const parsed = Array.from(items).map(item => {
        const get = (tag) => item.querySelector(tag)?.textContent || "";
        const watchCount = parseInt(get("WatchCount")) || 0;
        const hitCount = parseInt(get("HitCount")) || 0;
        const price = parseFloat(get("CurrentPrice") || get("BuyItNowPrice") || get("StartPrice")) || 0;
        const timeLeft = get("TimeLeft");
        const daysLeft = timeLeft ? Math.floor(parseInt(timeLeft.replace(/[^0-9]/g, "").slice(0,3)) / 24) : 28;
        const qty = parseInt(get("QuantityAvailable") || get("Quantity")) || 1;
        const listingId = get("ItemID");
        const title = get("Title");
        const sku = get("SKU");
        return { listingId, title, sku, price, watchCount, hitCount, daysLeft, qty, timeLeft };
      });

      setListings(parsed.length > 0 ? parsed : allItems.map(i => ({
        listingId: i.sku, title: i.product?.title || i.sku, sku: i.sku, price: 0, watchCount: 0, hitCount: 0, daysLeft: 28, qty: i.availability?.shipToLocationAvailability?.quantity || 1
      })));
      setLastFetched(new Date());
      showToast(`Loaded ${parsed.length || allItems.length} listings`);
    } catch (e) {
      showToast("Error: " + e.message);
      console.error(e);
    }
    setLoading(false);
  };

  const updatePrice = async (listingId, newPrice) => {
    setSaving(true);
    try {
      const accessToken = await getAccessToken();
      const res = await fetch("https://api.ebay.com/ws/api.dll", {
        method: "POST",
        headers: {
          "X-EBAY-API-CALL-NAME": "ReviseItem",
          "X-EBAY-API-APP-NAME": creds.clientId,
          "X-EBAY-API-CERT-NAME": creds.clientSecret,
          "X-EBAY-API-SITEID": "3",
          "X-EBAY-API-COMPATIBILITY-LEVEL": "967",
          "X-EBAY-API-IAF-TOKEN": accessToken,
          "Content-Type": "text/xml"
        },
        body: `<?xml version="1.0" encoding="utf-8"?><ReviseItemRequest xmlns="urn:ebay:apis:eBLBaseComponents"><RequesterCredentials><eBayAuthToken>${accessToken}</eBayAuthToken></RequesterCredentials><Item><ItemID>${listingId}</ItemID><StartPrice>${parseFloat(newPrice).toFixed(2)}</StartPrice></Item></ReviseItemRequest>`
      });
      const xmlText = await res.text();
      const xml = new DOMParser().parseFromString(xmlText, "text/xml");
      const ack = xml.querySelector("Ack")?.textContent;
      if (ack === "Success" || ack === "Warning") {
        setListings(prev => prev.map(l => l.listingId === listingId ? { ...l, price: parseFloat(newPrice) } : l));
        setEditingId(null);
        showToast("Price updated on eBay!");
      } else {
        const errMsg = xml.querySelector("ShortMessage")?.textContent || "Update failed";
        showToast("Error: " + errMsg);
      }
    } catch (e) { showToast("Error: " + e.message); }
    setSaving(false);
  };

  const getStatus = (l) => {
    if (l.hitCount === 0 && l.watchCount === 0) return "cold";
    if (l.hitCount >= 15 || l.watchCount >= 3) return "hot";
    return "warm";
  };

  const filtered = listings.filter(l => {
    if (filter === "hot") return getStatus(l) === "hot";
    if (filter === "cold") return getStatus(l) === "cold";
    if (filter === "expiring") return l.daysLeft <= 3;
    return true;
  });

  const hotCount = listings.filter(l => getStatus(l) === "hot").length;
  const coldCount = listings.filter(l => getStatus(l) === "cold").length;
  const expiringCount = listings.filter(l => l.daysLeft <= 3).length;

  if (!creds || showSetup) {
    return <>
      <div className="page-header"><div><div className="page-title">eBay Listings Health</div><div className="page-subtitle">Connect your eBay account to monitor listings</div></div></div>
      <div className="card" style={{ maxWidth: 560 }}>
        <div className="card-title" style={{ marginBottom: 20 }}>eBay Developer Credentials</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>Client ID (App ID)</div>
            <input className="form-input" placeholder="e.g. DanHarp-DBHPrep-PRD-..." value={credForm.clientId} onChange={e => setCredForm(p => ({ ...p, clientId: e.target.value }))} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>Client Secret (Cert ID)</div>
            <input className="form-input" placeholder="e.g. PRD-..." value={credForm.clientSecret} onChange={e => setCredForm(p => ({ ...p, clientSecret: e.target.value }))} type="password" />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>User Refresh Token</div>
            <input className="form-input" placeholder="Paste your OAuth refresh token here" value={credForm.refreshToken} onChange={e => setCredForm(p => ({ ...p, refreshToken: e.target.value }))} type="password" />
          </div>
          <div style={{ padding: "12px 14px", background: "rgba(0,229,255,0.05)", border: "1px solid rgba(0,229,255,0.2)", borderRadius: 8, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            <strong style={{ color: "var(--cyan)" }}>How to get these:</strong><br />
            1. developer.ebay.com → My Account → Application Keys<br />
            2. Copy your Production Client ID and Client Secret<br />
            3. For the Refresh Token: go to the User Tokens section in your eBay developer account and generate a token with sell.inventory + sell.account scopes
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-primary admin" onClick={saveCreds}>Save & Connect</button>
            {creds && <button className="btn" style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-secondary)" }} onClick={() => setShowSetup(false)}>Cancel</button>}
          </div>
        </div>
      </div>
    </>;
  }

  return <>
    <div className="page-header">
      <div><div className="page-title">eBay Listings Health</div><div className="page-subtitle">{lastFetched ? `Last updated ${lastFetched.toLocaleTimeString("en-GB")}` : "Click refresh to load your listings"}</div></div>
      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn" style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-secondary)", fontSize: 13 }} onClick={() => { setShowSetup(true); setCredForm(creds); }}>Edit Credentials</button>
        <button className="btn btn-primary admin" onClick={fetchListings} disabled={loading}><Icons.RefreshCw />{loading ? "Loading..." : "Refresh"}</button>
      </div>
    </div>

    {listings.length > 0 && <>
      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <div className="card stat-card admin"><div className="card-title">Total Active</div><div className="stat-value" style={{ color: "var(--cyan)" }}>{listings.length}</div></div>
        <div className="card stat-card admin"><div className="card-title">Hot (15+ views)</div><div className="stat-value" style={{ color: "var(--green)" }}>{hotCount}</div></div>
        <div className="card stat-card admin" style={{ "--before-color": "var(--red)" }}><div className="card-title">Cold (0 views)</div><div className="stat-value" style={{ color: "var(--red)" }}>{coldCount}</div></div>
        <div className="card stat-card warning"><div className="card-title">Expiring Soon</div><div className="stat-value" style={{ color: "var(--amber)" }}>{expiringCount}</div></div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[["all", "All"], ["hot", "Hot"], ["cold", "Cold / 0 views"], ["expiring", "Expiring ≤3d"]].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)} style={{ padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: filter === val ? "1px solid var(--orange)" : "1px solid var(--border)", background: filter === val ? "rgba(255,145,0,0.15)" : "transparent", color: filter === val ? "var(--orange)" : "var(--text-secondary)", fontFamily: "Outfit,sans-serif" }}>{label}</button>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Item", "Price", "Views (30d)", "Watchers", "Days Left", "Status", "Actions"].map(h => (
                  <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((l, i) => {
                const status = getStatus(l);
                const statusColor = status === "hot" ? "var(--green)" : status === "cold" ? "var(--red)" : "var(--amber)";
                const statusLabel = status === "hot" ? "Hot" : status === "cold" ? "Cold" : "Warm";
                const isEditing = editingId === l.listingId;
                return (
                  <tr key={l.listingId || i} style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                    <td style={{ padding: "11px 14px", maxWidth: 280 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.title || "—"}</div>
                      {l.sku && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>SKU: {l.sku}</div>}
                    </td>
                    <td style={{ padding: "11px 14px", whiteSpace: "nowrap" }}>
                      {isEditing ? (
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <input value={editPrice} onChange={e => setEditPrice(e.target.value)} style={{ width: 80, padding: "4px 8px", background: "var(--bg-card)", border: "1px solid var(--cyan)", borderRadius: 6, color: "var(--text-primary)", fontSize: 13, fontFamily: "Outfit,sans-serif" }} />
                          <button onClick={() => updatePrice(l.listingId, editPrice)} disabled={saving} style={{ padding: "4px 10px", background: "var(--green)", border: "none", borderRadius: 6, color: "#000", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Outfit,sans-serif" }}>{saving ? "..." : "Save"}</button>
                          <button onClick={() => setEditingId(null)} style={{ padding: "4px 8px", background: "transparent", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-muted)", fontSize: 12, cursor: "pointer", fontFamily: "Outfit,sans-serif" }}>✕</button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", fontFamily: "JetBrains Mono,monospace" }}>£{l.price.toFixed(2)}</span>
                      )}
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: l.hitCount >= 15 ? "var(--green)" : l.hitCount === 0 ? "var(--red)" : "var(--text-primary)" }}>{l.hitCount}</span>
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: l.watchCount >= 3 ? "var(--green)" : l.watchCount === 0 ? "var(--text-muted)" : "var(--text-primary)" }}>{l.watchCount}</span>
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <span style={{ fontSize: 13, color: l.daysLeft <= 3 ? "var(--red)" : l.daysLeft <= 7 ? "var(--amber)" : "var(--text-secondary)" }}>{l.daysLeft}d</span>
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${statusColor}22`, color: statusColor, border: `1px solid ${statusColor}44` }}>{statusLabel}</span>
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        {!isEditing && <button onClick={() => { setEditingId(l.listingId); setEditPrice(l.price.toFixed(2)); }} style={{ padding: "5px 10px", background: "transparent", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-secondary)", fontSize: 12, cursor: "pointer", fontFamily: "Outfit,sans-serif", display: "flex", alignItems: "center", gap: 4 }}><Icons.Edit /> Price</button>}
                        {l.listingId && <a href={`https://www.ebay.co.uk/itm/${l.listingId}`} target="_blank" rel="noreferrer" style={{ padding: "5px 10px", background: "transparent", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-secondary)", fontSize: 12, cursor: "pointer", fontFamily: "Outfit,sans-serif", display: "flex", alignItems: "center", gap: 4, textDecoration: "none" }}><Icons.ExternalLink /> View</a>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>}

    {listings.length === 0 && !loading && <div className="card empty-state" style={{ marginTop: 24 }}><Icons.ShoppingBag /><p>Click Refresh to load your eBay listings</p></div>}
  </>;
}

const SUBS_WEBHOOK = "https://discord.com/api/webhooks/1498614616991993866/v2sukCKrdc22FarEeDxU3boFoil7CWNohuDBpWFzHm1v-UMuOs5ohXOrN6_T3udw9FHK";
async function sendSubsDiscord(embed) {
  try { await fetch(SUBS_WEBHOOK, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ embeds: [embed] }) }); } catch(e) { console.error(e); }
}

function AdminSubscriptionsPage({ token, showToast }) {
  const [subs, setSubs] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ user_id: "", amount: 90, last_paid_date: new Date().toISOString().split("T")[0], notes: "" });
  const [saving, setSaving] = useState(false);
  const [markingId, setMarkingId] = useState(null);
  const [editSub, setEditSub] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [view, setView] = useState("active"); // "active" | "archived"
  const h = { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };

  const load = async () => {
    setLoading(true);
    const [sr, cr] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/deal_subscriptions?select=*,profiles(full_name,email,company_name)&order=next_due_date.asc`, { headers: h }).then(r => r.json()),
      fetch(`${SUPABASE_URL}/rest/v1/profiles?deals_access=eq.true&select=id,full_name,email,company_name&order=full_name.asc`, { headers: h }).then(r => r.json())
    ]);
    setSubs(Array.isArray(sr) ? sr : []);
    setClients(Array.isArray(cr) ? cr : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (subs.length === 0) return;
    const today = new Date().toISOString().split("T")[0];
    const notifKey = `dbh_subs_notified_${today}`;
    if (localStorage.getItem(notifKey)) return;
    localStorage.setItem(notifKey, "1");
    const todayDate = new Date(); todayDate.setHours(0,0,0,0);
    subs.forEach(async s => {
      if (s.archived) return;
      if (!s.next_due_date) return;
      const due = new Date(s.next_due_date + "T12:00:00"); due.setHours(0,0,0,0);
      const days = Math.round((due - todayDate) / 86400000);
      const name = s.profiles?.full_name || s.profiles?.email || "Unknown";
      if (days === 3) await sendSubsDiscord({ title: "⚠️ Payment Due Soon", color: 0xf59e0b, fields: [{ name: "Client", value: name, inline: true }, { name: "Amount", value: `£${s.amount}`, inline: true }, { name: "Due In", value: "3 days", inline: true }], footer: { text: "DBH Deal Sheet Subscriptions" } });
      else if (days === 0) await sendSubsDiscord({ title: "📅 Payment Due Today", color: 0xef4444, fields: [{ name: "Client", value: name, inline: true }, { name: "Amount", value: `£${s.amount}`, inline: true }], footer: { text: "DBH Deal Sheet Subscriptions" } });
      else if (days < 0) await sendSubsDiscord({ title: "🔴 Payment Overdue", color: 0xdc2626, fields: [{ name: "Client", value: name, inline: true }, { name: "Amount", value: `£${s.amount}`, inline: true }, { name: "Overdue By", value: `${Math.abs(days)} days`, inline: true }], footer: { text: "DBH Deal Sheet Subscriptions" } });
    });
  }, [subs]);

  const addSub = async () => {
    if (!addForm.user_id) { showToast("Select a client"); return; }
    setSaving(true);
    const nextDue = new Date(addForm.last_paid_date); nextDue.setDate(nextDue.getDate() + 30);
    await fetch(`${SUPABASE_URL}/rest/v1/deal_subscriptions`, { method: "POST", headers: { ...h, "Prefer": "return=representation" }, body: JSON.stringify({ user_id: addForm.user_id, amount: parseFloat(addForm.amount) || 90, last_paid_date: addForm.last_paid_date, next_due_date: nextDue.toISOString().split("T")[0], notes: addForm.notes, status: "active" }) });
    showToast("Added!"); setShowAdd(false); setAddForm({ user_id: "", amount: 90, last_paid_date: new Date().toISOString().split("T")[0], notes: "" }); load(); setSaving(false);
  };

  const saveEdit = async () => {
    setEditSaving(true);
    const nextDueStr = editForm.next_due_date || (() => { const d = new Date(editForm.last_paid_date); d.setDate(d.getDate() + 30); return d.toISOString().split("T")[0]; })();
    await fetch(`${SUPABASE_URL}/rest/v1/deal_subscriptions?id=eq.${editSub.id}`, { method: "PATCH", headers: h, body: JSON.stringify({ amount: parseFloat(editForm.amount)||90, last_paid_date: editForm.last_paid_date, next_due_date: nextDueStr, notes: editForm.notes }) });
    showToast("Updated!"); setEditSub(null); load(); setEditSaving(false);
  };

  const markPaid = async (sub) => {
    setMarkingId(sub.id);
    const today = new Date().toISOString().split("T")[0];
    const nextDue = new Date(); nextDue.setDate(nextDue.getDate() + 30);
    const nextDueStr = nextDue.toISOString().split("T")[0];
    await fetch(`${SUPABASE_URL}/rest/v1/deal_subscriptions?id=eq.${sub.id}`, { method: "PATCH", headers: h, body: JSON.stringify({ last_paid_date: today, next_due_date: nextDueStr, status: "active" }) });
    await fetch(`${SUPABASE_URL}/rest/v1/deal_subscription_payments`, { method: "POST", headers: { ...h, "Prefer": "return=minimal" }, body: JSON.stringify({ subscription_id: sub.id, user_id: sub.user_id, amount: parseFloat(sub.amount)||90, paid_date: today }) });
    const name = sub.profiles?.full_name || sub.profiles?.email || "Unknown";
    await sendSubsDiscord({ title: "✅ Payment Received", color: 0x22c55e, fields: [{ name: "Client", value: name, inline: true }, { name: "Amount", value: `£${sub.amount}`, inline: true }, { name: "Next Due", value: new Date(nextDueStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }), inline: true }], footer: { text: "DBH Deal Sheet Subscriptions" } });
    showToast(`✅ ${name} marked as paid`); load(); setMarkingId(null);
  };

  const deleteSub = async (id) => {
    if (!window.confirm("Remove this subscription? This will permanently delete it.")) return;
    await fetch(`${SUPABASE_URL}/rest/v1/deal_subscriptions?id=eq.${id}`, { method: "DELETE", headers: h }); load();
  };

  const archiveSub = async (sub) => {
    const name = sub.profiles?.full_name || sub.profiles?.email || "this subscriber";
    if (!window.confirm(`Archive ${name}?\n\nThey'll be moved to the Archived tab and won't count toward overdue / monthly revenue. Their payment history stays on the Income Tracker.`)) return;
    await fetch(`${SUPABASE_URL}/rest/v1/deal_subscriptions?id=eq.${sub.id}`, { method: "PATCH", headers: h, body: JSON.stringify({ archived: true, status: "archived" }) });
    showToast(`📦 Archived ${name}`); load();
  };

  const unarchiveSub = async (sub) => {
    const name = sub.profiles?.full_name || sub.profiles?.email || "this subscriber";
    if (!window.confirm(`Restore ${name} to active subscriptions?`)) return;
    await fetch(`${SUPABASE_URL}/rest/v1/deal_subscriptions?id=eq.${sub.id}`, { method: "PATCH", headers: h, body: JSON.stringify({ archived: false, status: "active" }) });
    showToast(`↩ Restored ${name}`); load();
  };

  const getStatus = (sub) => {
    if (!sub.next_due_date) return { label: "No date", color: "var(--text-muted)", days: null };
    const today = new Date(); today.setHours(0,0,0,0);
    const due = new Date(sub.next_due_date + "T12:00:00"); due.setHours(0,0,0,0);
    const days = Math.round((due - today) / 86400000);
    if (days < 0) return { label: `${Math.abs(days)}d overdue`, color: "var(--red)", days };
    if (days === 0) return { label: "Due today", color: "var(--red)", days };
    if (days <= 7) return { label: `Due in ${days}d`, color: "var(--amber)", days };
    return { label: `Due in ${days}d`, color: "var(--green)", days };
  };

  const activeSubs = subs.filter(s => !s.archived);
  const archivedSubs = subs.filter(s => s.archived);
  const displaySubs = view === "active" ? activeSubs : archivedSubs;
  const overdue = activeSubs.filter(s => { const st = getStatus(s); return st.days !== null && st.days < 0; });
  const dueSoon = activeSubs.filter(s => { const st = getStatus(s); return st.days !== null && st.days >= 0 && st.days <= 7; });
  const upcoming = activeSubs.filter(s => { const st = getStatus(s); return st.days !== null && st.days > 7; });
  const monthly = activeSubs.reduce((a, s) => a + (parseFloat(s.amount) || 0), 0);

  if (loading) return <div className="loader"><div className="spinner" /></div>;

  return <>
    <div className="page-header">
      <div><div className="page-title">Deal Sheet Subscriptions</div><div className="page-subtitle">{activeSubs.length} active · £{monthly}/mo · £{(monthly*12).toLocaleString()}/yr projected{archivedSubs.length > 0 ? ` · ${archivedSubs.length} archived` : ""}</div></div>
      <button className="btn btn-primary admin" onClick={() => setShowAdd(true)}>+ Add Client</button>
    </div>
    <div className="stats-grid" style={{ gridTemplateColumns: "repeat(5,1fr)", marginBottom: 24 }}>
      <div className="card stat-card" style={{ borderLeft: "3px solid var(--red)" }}><div className="card-title">Overdue</div><div className="stat-value" style={{ color: "var(--red)" }}>{overdue.length}</div></div>
      <div className="card stat-card" style={{ borderLeft: "3px solid var(--amber)" }}><div className="card-title">Due This Week</div><div className="stat-value" style={{ color: "var(--amber)" }}>{dueSoon.length}</div></div>
      <div className="card stat-card" style={{ borderLeft: "3px solid var(--green)" }}><div className="card-title">All Good</div><div className="stat-value" style={{ color: "var(--green)" }}>{upcoming.length}</div></div>
      <div className="card stat-card" style={{ borderLeft: "3px solid var(--cyan)" }}><div className="card-title">Monthly Revenue</div><div className="stat-value" style={{ color: "var(--cyan)", fontSize: 22 }}>£{monthly}</div></div>
      <div className="card stat-card" style={{ borderLeft: "3px solid var(--orange)" }}><div className="card-title">Annual Projected</div><div className="stat-value" style={{ color: "var(--orange)", fontSize: 22 }}>£{(monthly*12).toLocaleString()}</div></div>
    </div>
    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
      <button onClick={() => setView("active")} style={{ padding: "8px 16px", background: view === "active" ? "var(--orange)" : "transparent", color: view === "active" ? "#000" : "var(--text-secondary)", border: `1px solid ${view === "active" ? "var(--orange)" : "var(--border)"}`, borderRadius: 8, cursor: "pointer", fontWeight: 600, fontFamily: "inherit", fontSize: 13 }}>Active ({activeSubs.length})</button>
      <button onClick={() => setView("archived")} style={{ padding: "8px 16px", background: view === "archived" ? "var(--text-muted)" : "transparent", color: view === "archived" ? "#000" : "var(--text-secondary)", border: `1px solid ${view === "archived" ? "var(--text-muted)" : "var(--border)"}`, borderRadius: 8, cursor: "pointer", fontWeight: 600, fontFamily: "inherit", fontSize: 13 }}>📦 Archived ({archivedSubs.length})</button>
    </div>
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr style={{ borderBottom: "1px solid var(--border)" }}>
          {["Client","Amount","Last Paid","Next Due","Status","Actions"].map(col => <th key={col} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{col}</th>)}
        </tr></thead>
        <tbody>
          {displaySubs.length === 0 && <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>{view === "active" ? "No active subscriptions" : "No archived subscriptions"}</td></tr>}
          {displaySubs.map((s, i) => {
            const st = getStatus(s); const name = s.profiles?.full_name || s.profiles?.email || "Unknown";
            return <tr key={s.id} style={{ borderBottom: "1px solid var(--border)", background: i%2===0?"transparent":"rgba(255,255,255,0.01)" }}>
              <td style={{ padding: "13px 16px" }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{name}</div>
                {s.profiles?.company_name && <div style={{ fontSize: 12, color: "var(--cyan)", marginTop: 1 }}>{s.profiles.company_name}</div>}
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{s.profiles?.email}</div>
                {s.notes && <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>{s.notes}</div>}
              </td>
              <td style={{ padding: "13px 16px", fontWeight: 700, fontFamily: "JetBrains Mono,monospace" }}>£{s.amount}</td>
              <td style={{ padding: "13px 16px", fontSize: 13, color: "var(--text-secondary)" }}>{s.last_paid_date ? new Date(s.last_paid_date+"T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}</td>
              <td style={{ padding: "13px 16px", fontSize: 13, color: "var(--text-secondary)" }}>{s.next_due_date ? new Date(s.next_due_date+"T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}</td>
              <td style={{ padding: "13px 16px" }}><span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: `${st.color}22`, color: st.color, border: `1px solid ${st.color}44` }}>{st.label}</span></td>
              <td style={{ padding: "13px 16px" }}>
                <div style={{ display: "flex", gap: 6 }}>
                  {view === "active" ? (<>
                    <button onClick={() => markPaid(s)} disabled={markingId===s.id} style={{ padding: "6px 12px", background: "rgba(0,230,118,0.15)", border: "1px solid rgba(0,230,118,0.3)", borderRadius: 7, color: "var(--green)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Outfit,sans-serif" }}>{markingId===s.id?"...":"✓ Paid"}</button>
                    <button onClick={() => { setEditSub(s); setEditForm({ amount: s.amount, last_paid_date: s.last_paid_date||"", next_due_date: s.next_due_date||"", notes: s.notes||"" }); }} style={{ padding: "6px 10px", background: "transparent", border: "1px solid var(--border)", borderRadius: 7, color: "var(--text-secondary)", fontSize: 12, cursor: "pointer" }} title="Edit">✏️</button>
                    <button onClick={() => archiveSub(s)} style={{ padding: "6px 10px", background: "transparent", border: "1px solid var(--border)", borderRadius: 7, color: "var(--text-muted)", fontSize: 12, cursor: "pointer" }} title="Archive (keep history, hide from active)">📦</button>
                  </>) : (<>
                    <button onClick={() => unarchiveSub(s)} style={{ padding: "6px 12px", background: "rgba(0,229,255,0.15)", border: "1px solid rgba(0,229,255,0.3)", borderRadius: 7, color: "var(--cyan)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Outfit,sans-serif" }} title="Restore to active">↩ Unarchive</button>
                    <button onClick={() => deleteSub(s.id)} style={{ padding: "6px 10px", background: "transparent", border: "1px solid var(--border)", borderRadius: 7, color: "var(--red)", fontSize: 12, cursor: "pointer" }} title="Delete permanently">✕</button>
                  </>)}
                </div>
              </td>
            </tr>;
          })}
        </tbody>
      </table>
    </div>
    {editSub && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div className="card" style={{ width: 440, padding: 28 }}>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>Edit Subscription</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>{editSub.profiles?.full_name||editSub.profiles?.email}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div><label className="input-label">Amount (£)</label><input className="input" type="number" value={editForm.amount} onChange={e=>setEditForm(p=>({...p,amount:e.target.value}))} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label className="input-label">Last Paid</label><input className="input" type="date" value={editForm.last_paid_date} onChange={e=>setEditForm(p=>({...p,last_paid_date:e.target.value}))} /></div>
            <div><label className="input-label">Next Due</label><input className="input" type="date" value={editForm.next_due_date} onChange={e=>setEditForm(p=>({...p,next_due_date:e.target.value}))} /></div>
          </div>
          <div><label className="input-label">Notes</label><input className="input" value={editForm.notes} onChange={e=>setEditForm(p=>({...p,notes:e.target.value}))} /></div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-primary admin" onClick={saveEdit} disabled={editSaving} style={{ flex: 1 }}>{editSaving?"Saving...":"Save"}</button>
            <button onClick={()=>setEditSub(null)} style={{ padding: "10px 16px", background: "transparent", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-secondary)", cursor: "pointer", fontFamily: "Outfit,sans-serif" }}>Cancel</button>
          </div>
        </div>
      </div>
    </div>}
    {showAdd && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div className="card" style={{ width: 440, padding: 28 }}>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 20 }}>Add Subscription</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div><label className="input-label">Client</label>
            <select className="input" value={addForm.user_id} onChange={e=>setAddForm(p=>({...p,user_id:e.target.value}))}>
              <option value="">— Select —</option>
              {clients.filter(c=>!subs.find(s=>s.user_id===c.id)).map(c=><option key={c.id} value={c.id}>{c.full_name||c.email}{c.company_name?` (${c.company_name})`:""}</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label className="input-label">Amount (£)</label><input className="input" type="number" value={addForm.amount} onChange={e=>setAddForm(p=>({...p,amount:e.target.value}))} /></div>
            <div><label className="input-label">Last Paid</label><input className="input" type="date" value={addForm.last_paid_date} onChange={e=>setAddForm(p=>({...p,last_paid_date:e.target.value}))} /></div>
          </div>
          <div><label className="input-label">Notes</label><input className="input" placeholder="e.g. Pays via bank transfer" value={addForm.notes} onChange={e=>setAddForm(p=>({...p,notes:e.target.value}))} /></div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-primary admin" onClick={addSub} disabled={saving} style={{ flex: 1 }}>{saving?"Saving...":"Add"}</button>
            <button onClick={()=>setShowAdd(false)} style={{ padding: "10px 16px", background: "transparent", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-secondary)", cursor: "pointer", fontFamily: "Outfit,sans-serif" }}>Cancel</button>
          </div>
        </div>
      </div>
    </div>}
  </>;
}

function AdminPortal() {
  const { user, token, signOut } = useAuth();
  const [page, setPage] = useState("clients");
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientTab, setClientTab] = useState("prep");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [clients, setClients] = useState([]);
  const [parcels, setParcels] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [liquidation, setLiquidation] = useState([]);
  const [liquidationSales, setLiquidationSales] = useState([]);
  const [liquidationAdjustments, setLiquidationAdjustments] = useState([]);
  const [loading, setLoading] = useState(true);
  const showToast = useCallback(msg => setToast(msg), []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [c, p, s, l, ls, la] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/profiles?select=*`, { headers: supabase.headers(token) }).then(r => r.json()),
      fetch(`${SUPABASE_URL}/rest/v1/parcels?select=*&order=created_at.desc`, { headers: supabase.headers(token) }).then(r => r.json()),
      fetch(`${SUPABASE_URL}/rest/v1/shipments?select=*&order=created_at.desc`, { headers: supabase.headers(token) }).then(r => r.json()),
      fetch(`${SUPABASE_URL}/rest/v1/liquidation_stock?select=*&order=created_at.desc`, { headers: supabase.headers(token) }).then(r => r.json()),
      fetch(`${SUPABASE_URL}/rest/v1/liquidation_sales?select=user_id,payout,payout_date,paid&order=payout_date.asc`, { headers: supabase.headers(token) }).then(r => r.json()),
      fetch(`${SUPABASE_URL}/rest/v1/liquidation_returns?select=user_id,month,type,count,amount`, { headers: supabase.headers(token) }).then(r => r.json()).catch(() => [])
    ]);
    if (Array.isArray(c)) setClients(c.filter(x => x.email !== ADMIN_EMAIL));
    if (Array.isArray(p)) setParcels(p);
    if (Array.isArray(s)) setShipments(s);
    if (Array.isArray(l)) setLiquidation(l);
    if (Array.isArray(ls)) setLiquidationSales(ls);
    if (Array.isArray(la)) setLiquidationAdjustments(la);
    setLoading(false);
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);

  const selectClient = (client) => { setSelectedClient(client); setPage("client"); setClientTab("liquidation"); };
  const backToClients = () => { setSelectedClient(null); setPage("clients"); };

  const adminNav = [
    { id: "clients", label: "All Clients", icon: Icons.Users },
    { id: "masterstock", label: "Master Stock", icon: Icons.Package },
    { id: "tracker", label: "Income Tracker", icon: Icons.BarChart },
    { id: "subscriptions", label: "Subscriptions", icon: Icons.CreditCard },
    { id: "ebay", label: "eBay Listings", icon: Icons.ShoppingBag },
    { id: "settings", label: "Settings", icon: Icons.Settings }
  ];

  const renderPage = () => {
    if (page === "settings") return <AdminSettingsPage token={token} showToast={showToast} />;
    if (page === "deals") return <AdminDealsPage token={token} showToast={showToast} />;
    if (page === "tracker") return <AdminTrackerPage />;
    if (page === "ebay") return <AdminEbayListingsPage token={token} showToast={showToast} />;
    if (page === "subscriptions") return <AdminSubscriptionsPage token={token} showToast={showToast} />;
    if (page === "masterstock") return <AdminMasterStockPage clients={clients} liquidation={liquidation} liquidationSales={liquidationSales} token={token} showToast={showToast} onRefresh={loadData} />;
    if (page === "client" && selectedClient) {
      return <AdminClientPage 
        client={selectedClient} 
        tab={clientTab} 
        setTab={setClientTab}
        parcels={parcels.filter(p => p.user_id === selectedClient.id)}
        shipments={shipments.filter(s => s.user_id === selectedClient.id)}
        liquidation={liquidation.filter(l => l.user_id === selectedClient.id)}
        token={token}
        showToast={showToast}
        onRefresh={loadData}
        onBack={backToClients}
      />;
    }
    return <AdminClientsPage clients={clients} parcels={parcels} shipments={shipments} liquidation={liquidation} liquidationSales={liquidationSales} liquidationAdjustments={liquidationAdjustments} onSelectClient={selectClient} loading={loading} token={token} onRefresh={loadData} showToast={showToast} />;
  };

  return (
    <div className="app-wrapper">
      <div className="mobile-header"><div style={{ display: "flex", alignItems: "center", gap: 10 }}><div className="sidebar-logo-icon admin" style={{ width: 32, height: 32, fontSize: 11 }}>DBH</div><span style={{ fontWeight: 700 }}>DBH ADMIN</span></div><button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}><Icons.Menu /></button></div>
      <div className={`sidebar-overlay ${sidebarOpen ? "open" : ""}`} onClick={() => setSidebarOpen(false)} />
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-logo"><div className="sidebar-logo-icon admin">DBH</div><div><div className="sidebar-logo-text">DBH LIQUIDATION</div><div className="sidebar-logo-sub">Admin Panel</div></div></div>
        <nav className="sidebar-nav" style={{ marginTop: 12 }}>
          <div className="sidebar-section-title">Admin</div>
          {adminNav.map(item => <div key={item.id} className={`nav-item ${page === item.id || (page === "clients" && item.id === "clients") ? "active admin" : ""}`} onClick={() => { setPage(item.id); setSelectedClient(null); setSidebarOpen(false); }}><item.icon />{item.label}</div>)}
          {selectedClient && <>
            <div className="sidebar-section-title" style={{ marginTop: 16 }}>Current Client</div>
            <div className="nav-item active admin" style={{ flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
              <span style={{ fontWeight: 600 }}>{selectedClient.full_name || "No Name"}</span>
              <span style={{ fontSize: 11, opacity: 0.7 }}>{selectedClient.email}</span>
            </div>
          </>}
        </nav>
        <div className="sidebar-footer"><div className="sidebar-user"><div className="sidebar-avatar admin">A</div><div><div className="sidebar-username">Admin</div><div className="sidebar-email">{user?.email}</div></div></div><button className="btn-signout" onClick={signOut}><Icons.LogOut /> Sign Out</button></div>
      </aside>
      <main className="main-content">{renderPage()}</main>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

// Admin - All Clients List
function AdminClientsPage({ clients, parcels, shipments, liquidation, liquidationSales, liquidationAdjustments, onSelectClient, loading, token, onRefresh, showToast }) {
  const [search, setSearch] = useState("");
  const [clientOrder, setClientOrder] = useState([]);
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [archivedIds, setArchivedIds] = useState([]);
  const [activeTab, setActiveTab] = useState("active");
  const [typeFilter, setTypeFilter] = useState("all");

  const saveSetting = async (key, value) => {
    const existing = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.${key}`, { headers: supabase.headers(token) }).then(r => r.json());
    if (Array.isArray(existing) && existing.length) {
      await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.${key}`, { method: "PATCH", headers: { ...supabase.headers(token), "Content-Type": "application/json", "Prefer": "return=minimal" }, body: JSON.stringify({ value: JSON.stringify(value) }) });
    } else {
      await fetch(`${SUPABASE_URL}/rest/v1/settings`, { method: "POST", headers: { ...supabase.headers(token), "Content-Type": "application/json", "Prefer": "return=minimal" }, body: JSON.stringify({ key, value: JSON.stringify(value) }) });
    }
  };

  // Load archived IDs and client order from settings once clients are available
  useEffect(() => {
    if (!clients.length) return;
    fetch(`${SUPABASE_URL}/rest/v1/settings?key=in.(archived_clients,client_order)`, { headers: supabase.headers(token) })
      .then(r => r.json()).then(d => {
        if (!Array.isArray(d)) {
          // Settings failed, fall back to default order
          setClientOrder(clients.map(c => c.id));
          return;
        }
        const archived = d.find(x => x.key === "archived_clients");
        const order = d.find(x => x.key === "client_order");
        if (archived?.value) { try { setArchivedIds(JSON.parse(archived.value)); } catch(e) {} }
        // Always set order — either from settings or default
        if (order?.value) {
          try {
            const saved = JSON.parse(order.value);
            // Merge: saved order first, then any new clients not in saved order
            const newClients = clients.filter(c => !saved.includes(c.id)).map(c => c.id);
            setClientOrder([...saved, ...newClients]);
          } catch(e) { setClientOrder(clients.map(c => c.id)); }
        } else {
          setClientOrder(clients.map(c => c.id));
        }
      });
  }, [clients.length]);

  const toggleArchive = async (e, clientId) => {
    e.stopPropagation();
    const newIds = archivedIds.includes(clientId) ? archivedIds.filter(id => id !== clientId) : [...archivedIds, clientId];
    setArchivedIds(newIds);
    await saveSetting("archived_clients", newIds);
  };

  const sortedClients = React.useMemo(() => {
    if (!clientOrder.length) return [...clients];
    const ordered = [...clients].sort((a, b) => {
      const ai = clientOrder.indexOf(a.id), bi = clientOrder.indexOf(b.id);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
    return ordered;
  }, [clients, clientOrder]);

  const filteredClients = sortedClients.filter(c => {
    const matchesSearch = c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.company_name?.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (typeFilter === "all") return true;
    return (c.client_type || "prep") === typeFilter;
  });

  // Counts per type (excluding search) — for tab labels
  const typeCounts = sortedClients.reduce((acc, c) => {
    const t = c.client_type || "prep";
    acc[t] = (acc[t] || 0) + 1;
    acc.all = (acc.all || 0) + 1;
    return acc;
  }, {});

  const handleDragStart = (e, id) => { setDragId(id); e.dataTransfer.effectAllowed = "move"; };
  const handleDragOver = (e, id) => { e.preventDefault(); setDragOverId(id); };
  const handleDrop = (e, targetId) => {
    e.preventDefault();
    if (dragId === targetId) { setDragId(null); setDragOverId(null); return; }
    const currentOrder = clientOrder.length ? [...clientOrder] : sortedClients.map(c => c.id);
    const fromIdx = currentOrder.indexOf(dragId);
    const toIdx = currentOrder.indexOf(targetId);
    const newOrder = [...currentOrder];
    if (fromIdx === -1 || toIdx === -1) { setDragId(null); setDragOverId(null); return; }
    newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, dragId);
    setClientOrder(newOrder);
    saveSetting("client_order", newOrder);
    setDragId(null); setDragOverId(null);
  };
  const handleDragEnd = () => { setDragId(null); setDragOverId(null); };

  const deleteClient = async (e, clientId) => {
    e.stopPropagation();
    if (!confirm("Delete this client? This will also delete all their parcels, shipments, and liquidation stock.")) return;
    
    // Delete from profiles (cascades to other tables due to foreign keys)
    await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${clientId}`, { 
      method: "DELETE", 
      headers: supabase.headers(token) 
    });
    showToast("Client deleted!");
    onRefresh();
  };

  const activeClients = filteredClients.filter(c => !archivedIds.includes(c.id));
  const archivedClients = filteredClients.filter(c => archivedIds.includes(c.id));
  const displayClients = activeTab === "active" ? activeClients : archivedClients;

  if (loading) return <div className="loader"><div className="spinner" /></div>;
  return (
    <><div className="page-header"><div><div className="page-title">All Clients</div><div className="page-subtitle">{clients.length} clients</div></div></div>
    <div className="page-body">
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        <button onClick={() => setTypeFilter("all")} className={`btn ${typeFilter === "all" ? "btn-primary" : "btn-secondary"}`} style={{ padding: "8px 18px", fontSize: 13 }}>All ({typeCounts.all || 0})</button>
        <button onClick={() => setTypeFilter("prep")} className={`btn ${typeFilter === "prep" ? "btn-primary" : "btn-secondary"}`} style={{ padding: "8px 18px", fontSize: 13 }}>Prep ({typeCounts.prep || 0})</button>
        <button onClick={() => setTypeFilter("dealsheet")} className={`btn ${typeFilter === "dealsheet" ? "btn-primary" : "btn-secondary"}`} style={{ padding: "8px 18px", fontSize: 13 }}>Deal Sheet ({typeCounts.dealsheet || 0})</button>
        <button onClick={() => setTypeFilter("liquidation")} className={`btn ${typeFilter === "liquidation" ? "btn-primary" : "btn-secondary"}`} style={{ padding: "8px 18px", fontSize: 13 }}>Liquidation ({typeCounts.liquidation || 0})</button>
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center" }}>
        <div className="search-bar" style={{ flex: 1 }}><Icons.Search /><input placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => setActiveTab("active")} className={`btn ${activeTab === "active" ? "btn-primary" : "btn-secondary"}`} style={{ padding: "8px 18px", fontSize: 13 }}>Active ({activeClients.length})</button>
          <button onClick={() => setActiveTab("archived")} className={`btn ${activeTab === "archived" ? "btn-primary" : "btn-secondary"}`} style={{ padding: "8px 18px", fontSize: 13, opacity: archivedClients.length === 0 ? 0.5 : 1 }}>Archived ({archivedClients.length})</button>
        </div>
      </div>
      {displayClients.length === 0 ? <div className="card empty-state"><Icons.Users /><p>{search ? "No clients match your search." : activeTab === "archived" ? "No archived clients." : "No clients yet."}</p></div> :
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {displayClients.map(c => {
          const cp = parcels.filter(p => p.user_id === c.id);
          const cs = shipments.filter(s => s.user_id === c.id);
          const cl = liquidation.filter(l => l.user_id === c.id);
          const inbound = cp.filter(p => ["in_transit", "delivered"].includes(p.status)).length;
          const pendingLiq = cl.filter(l => !l.sale_price).length;
          const clientSales = (liquidationSales || []).filter(s => s.user_id === c.id && !s.paid && s.payout_date);
          // Group unpaid sales by MONTH (one payout per calendar month — end of month)
          const payoutsByMonth = clientSales.reduce((acc, s) => {
            const monthKey = (s.payout_date || "").slice(0, 7); // "2026-06"
            if (!acc[monthKey]) acc[monthKey] = 0;
            acc[monthKey] += parseFloat(s.payout) || 0;
            return acc;
          }, {});
          // Sum this client's adjustments per month (returns @ £7.10/each + refunds/other £ amounts)
          const clientAdjsByMonth = (liquidationAdjustments || []).filter(a => a.user_id === c.id).reduce((acc, a) => {
            const mk = a.month;
            if (!mk) return acc;
            const amt = a.type === "return" ? (a.count || 0) * RETURN_COST_PER_UNIT : (parseFloat(a.amount) || 0);
            acc[mk] = (acc[mk] || 0) + amt;
            return acc;
          }, {});
          // Show payouts from LAST month onwards (so past-due items remain visible to clean up)
          const todayDate = new Date(); todayDate.setHours(0,0,0,0);
          const firstOfLastMonth = new Date(todayDate.getFullYear(), todayDate.getMonth() - 1, 1);
          const cutoffMonth = firstOfLastMonth.toISOString().slice(0, 7);
          const sortedPayoutMonths = Object.keys(payoutsByMonth).filter(mk => mk >= cutoffMonth).sort();
          const upcomingPayouts = sortedPayoutMonths.slice(0, 2).map(monthKey => {
            const [y, m] = monthKey.split("-").map(Number);
            const lastDay = new Date(y, m, 0);
            const gross = payoutsByMonth[monthKey];
            const deduction = clientAdjsByMonth[monthKey] || 0;
            return {
              date: monthKey,
              amount: Math.max(0, gross - deduction),
              gross,
              deduction,
              label: lastDay.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
            };
          });
          const today = new Date(); today.setHours(0,0,0,0);
          const paymentDue = (() => {
            if (c.next_payment_date) return new Date(c.next_payment_date) <= today;
            if (c.deals_last_payment) { const paid = new Date(c.deals_last_payment); const due = new Date(paid.getFullYear(), paid.getMonth() + 1, paid.getDate()); return due <= today; }
            return false;
          })();
          const renewalSubject = encodeURIComponent("DBH Deals — Subscription Renewal Due");
          const renewalBody = encodeURIComponent(`Hi ${c.full_name || "there"},\n\nYour DBH Deals subscription renewal is now due.\n\nPlease arrange payment to continue your access to the daily deal sheet.\n\nThanks,\nDBH Liquidation`);
          const renewalMailto = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(c.email)}&su=${renewalSubject}&body=${renewalBody}`;
          return (
            <div key={c.id} className="client-card" draggable onClick={() => onSelectClient(c)} onDragStart={e => handleDragStart(e, c.id)} onDragOver={e => handleDragOver(e, c.id)} onDrop={e => handleDrop(e, c.id)} onDragEnd={handleDragEnd} style={{ ...(paymentDue ? { borderColor: 'rgba(255,82,82,0.5)', boxShadow: '0 0 0 2px rgba(255,82,82,0.1)' } : {}), ...(dragOverId === c.id && dragId !== c.id ? { borderColor: 'var(--orange)', boxShadow: '0 0 0 2px rgba(255,152,0,0.3)' } : {}), opacity: dragId === c.id ? 0.5 : 1, cursor: 'grab', transition: 'opacity 0.15s, box-shadow 0.15s' }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 2 }}>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{c.full_name || "No Name"}</div>
                    {paymentDue && <span style={{ padding: "2px 8px", background: "rgba(255,82,82,0.15)", color: "var(--red)", borderRadius: 12, fontSize: 11, fontWeight: 700, border: "1px solid rgba(255,82,82,0.3)" }}>⚠ PAYMENT DUE</span>}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{c.email}</div>
                  {c.company_name && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{c.company_name}</div>}
                </div>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }} onClick={e => e.stopPropagation()}>
                  <select value={c.client_type || "prep"} onChange={async (e) => {
                    e.stopPropagation();
                    const newType = e.target.value;
                    await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${c.id}`, { method: "PATCH", headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ client_type: newType }) });
                    showToast(`Set to ${newType}`);
                    onRefresh();
                  }} style={{ padding: "4px 8px", background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-secondary)", borderRadius: 6, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                    <option value="prep">Prep</option>
                    <option value="dealsheet">Deal Sheet</option>
                    <option value="liquidation">Liquidation</option>
                  </select>
                  <button className="btn-icon" onClick={(e) => toggleArchive(e, c.id)} title={archivedIds.includes(c.id) ? "Unarchive client" : "Archive client"} style={{ color: archivedIds.includes(c.id) ? "var(--cyan)" : "var(--text-muted)", fontSize: 14 }}>{archivedIds.includes(c.id) ? "↩" : "🗂"}</button>
                  <button className="btn-icon btn-danger" onClick={(e) => deleteClient(e, c.id)} title="Delete client"><Icons.Trash /></button>
                </div>
              </div>
              {paymentDue && (
                <div style={{ marginTop: 10 }} onClick={e => e.stopPropagation()}>
                  <a href={renewalMailto} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "rgba(255,82,82,0.12)", color: "var(--red)", border: "1px solid rgba(255,82,82,0.3)", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                    <Icons.Send /> Send Renewal Email
                  </a>
                </div>
              )}
              <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
                <div style={{ flex: 1, padding: "10px", background: "var(--bg-primary)", borderRadius: 8, textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "var(--cyan)" }}>{inbound}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Inbound</div>
                </div>
                <div style={{ flex: 1, padding: "10px", background: "var(--bg-primary)", borderRadius: 8, textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "var(--green)" }}>{cs.length}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Shipments</div>
                </div>
                <div style={{ flex: 1, padding: "10px", background: "var(--bg-primary)", borderRadius: 8, textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "var(--orange)" }}>{pendingLiq}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Liq Pending</div>
                </div>
              </div>
              {upcomingPayouts.length > 0 && (
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  {upcomingPayouts.map((p, idx) => (
                    <div key={p.date} style={{ flex: 1, padding: "8px 10px", background: idx === 0 ? "rgba(0,230,118,0.08)" : "rgba(0,229,255,0.06)", border: idx === 0 ? "1px solid rgba(0,230,118,0.2)" : "1px solid rgba(0,229,255,0.15)", borderRadius: 8, textAlign: "center" }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: idx === 0 ? "var(--green)" : "var(--cyan)" }}>£{p.amount.toFixed(2)}</div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>Due {p.label}</div>
                      {p.deduction > 0 && <div style={{ fontSize: 9, color: "var(--red)", marginTop: 2 }}>−£{p.deduction.toFixed(2)} adj</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>}
    </div></>
  );
}

// Admin - Single Client Page with Prep/Liquidation/Settings tabs
function AdminClientPage({ client, tab, setTab, parcels, shipments, liquidation, token, showToast, onRefresh, onBack }) {
  const [webhook, setWebhook] = useState(client.discord_webhook || "");
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [invoiceUrl, setInvoiceUrl] = useState("");
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [manualMonth, setManualMonth] = useState(new Date().getMonth());
  const [manualYear, setManualYear] = useState(new Date().getFullYear());
  const [manualAmount, setManualAmount] = useState("");
  
  // Custom pricing
  const [pricing, setPricing] = useState({
    prep_standard: client.prep_standard || "0.45",
    prep_bundle: client.prep_bundle || "0.65",
    prep_oversize: client.prep_oversize || "1.50",
    liq_commission_standard: client.liq_commission_standard ?? "",
    liq_commission_high: client.liq_commission_high ?? ""
  });
  const [savingPricing, setSavingPricing] = useState(false);
  const [dealsAccess, setDealsAccess] = useState(client.deals_access || false);
  const [dealsStartDate, setDealsStartDate] = useState(client.deals_start_date || '');
  const [dealsLastPayment, setDealsLastPayment] = useState(client.deals_last_payment || '');
  const [nextPaymentDate, setNextPaymentDate] = useState(client.next_payment_date || '');
  const [savingDeals, setSavingDeals] = useState(false);

  // Payment overdue check
  const isPaymentOverdue = (() => {
    if (!dealsLastPayment) return false;
    const paid = new Date(dealsLastPayment);
    const due = new Date(paid.getFullYear(), paid.getMonth() + 1, paid.getDate());
    return new Date() >= due;
  })();

  // Auto-deactivate if payment overdue
  useEffect(() => {
    if (isPaymentOverdue && dealsAccess) {
      setDealsAccess(false);
      fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${client.id}`, { 
        method: "PATCH", 
        headers: { ...supabase.headers(token), "Content-Type": "application/json" }, 
        body: JSON.stringify({ deals_access: false }) 
      }).then(() => onRefresh());
    }
  }, [isPaymentOverdue]);

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // Sync state when client changes
  useEffect(() => {
    setWebhook(client.discord_webhook || "");
    setDealsAccess(client.deals_access || false);
    setDealsStartDate(client.deals_start_date || '');
    setDealsLastPayment(client.deals_last_payment || '');
    setNextPaymentDate(client.next_payment_date || '');
    setPricing({
      prep_standard: client.prep_standard || "0.45",
      prep_bundle: client.prep_bundle || "0.65",
      prep_oversize: client.prep_oversize || "1.50",
      liq_commission_standard: client.liq_commission_standard ?? "",
      liq_commission_high: client.liq_commission_high ?? ""
    });
  }, [client]);

  // Load invoices
  useEffect(() => {
    if (tab === "settings") {
      setLoadingInvoices(true);
      fetch(`${SUPABASE_URL}/rest/v1/invoices?user_id=eq.${client.id}&order=period_year.desc,period_month.desc`, { headers: supabase.headers(token) })
        .then(r => r.json())
        .then(d => { setInvoices(Array.isArray(d) ? d : []); setLoadingInvoices(false); })
        .catch(() => setLoadingInvoices(false));
    }
  }, [tab, client.id]);

  const saveWebhook = async () => {
    setSavingWebhook(true);
    await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${client.id}`, { 
      method: "PATCH", 
      headers: { ...supabase.headers(token), "Content-Type": "application/json", Prefer: "return=representation" }, 
      body: JSON.stringify({ discord_webhook: webhook }) 
    });
    showToast("Webhook saved!");
    onRefresh();
    setSavingWebhook(false);
  };

  const savePricing = async () => {
    setSavingPricing(true);
    await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${client.id}`, { 
      method: "PATCH", 
      headers: { ...supabase.headers(token), "Content-Type": "application/json", Prefer: "return=representation" }, 
      body: JSON.stringify({ 
        prep_standard: parseFloat(pricing.prep_standard) || 0.45,
        prep_bundle: parseFloat(pricing.prep_bundle) || 0.65,
        prep_oversize: parseFloat(pricing.prep_oversize) || 1.50,
        liq_commission_standard: pricing.liq_commission_standard === "" ? null : (parseFloat(pricing.liq_commission_standard) || null),
        liq_commission_high: pricing.liq_commission_high === "" ? null : (parseFloat(pricing.liq_commission_high) || null)
      }) 
    });
    showToast("Pricing saved!");
    onRefresh();
    setSavingPricing(false);
  };

  // Calculate monthly totals from shipments
  const getMonthlyTotals = () => {
    const totals = {};
    shipments.forEach(s => {
      const d = new Date(s.date_shipped || s.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const cost = (parseFloat(s.units_prepped) || 0) * (parseFloat(s.unit_cost) || 0) + (parseFloat(s.box_count)||0)*(parseFloat(s.box_cost)||0) + (parseFloat(s.other_fees) || 0);
      totals[key] = (totals[key] || 0) + cost;
    });
    return totals;
  };

  const generateInvoice = async (month, year, manualAmt = null) => {
    const totals = getMonthlyTotals();
    const key = `${year}-${month}`;
    const amount = manualAmt !== null ? manualAmt : (totals[key] || 0);
    
    const res = await fetch(`${SUPABASE_URL}/rest/v1/invoices`, { 
      method: "POST", 
      headers: { ...supabase.headers(token), "Content-Type": "application/json", Prefer: "return=representation" }, 
      body: JSON.stringify({ user_id: client.id, period_month: month + 1, period_year: year, amount, status: "pending", invoice_number: `INV-${year}${String(month + 1).padStart(2,'0')}-${Date.now().toString().slice(-4)}` }) 
    });
    if (res.ok) {
      showToast("Invoice created!");
      setManualAmount("");
      const inv = await fetch(`${SUPABASE_URL}/rest/v1/invoices?user_id=eq.${client.id}&order=period_year.desc,period_month.desc`, { headers: supabase.headers(token) }).then(r => r.json());
      setInvoices(Array.isArray(inv) ? inv : []);
    } else {
      const errText = await res.text();
      console.error("Invoice create error:", res.status, errText);
      showToast("Error: " + (JSON.parse(errText)?.message || res.status));
    }
  };

  const updateInvoice = async (id, updates, silent = false) => {
    await fetch(`${SUPABASE_URL}/rest/v1/invoices?id=eq.${id}`, { 
      method: "PATCH", 
      headers: { ...supabase.headers(token), "Content-Type": "application/json", Prefer: "return=representation" }, 
      body: JSON.stringify(updates) 
    });
    if (!silent) showToast("Invoice updated!");
    const inv = await fetch(`${SUPABASE_URL}/rest/v1/invoices?user_id=eq.${client.id}&order=period_year.desc,period_month.desc`, { headers: supabase.headers(token) }).then(r => r.json());
    setInvoices(Array.isArray(inv) ? inv : []);
    setEditingInvoice(null);
    setInvoiceUrl("");
  };

  const deleteInvoice = async (id) => {
    if (!confirm("Delete invoice?")) return;
    await fetch(`${SUPABASE_URL}/rest/v1/invoices?id=eq.${id}`, { method: "DELETE", headers: supabase.headers(token) });
    showToast("Invoice deleted!");
    const inv = await fetch(`${SUPABASE_URL}/rest/v1/invoices?user_id=eq.${client.id}&order=period_year.desc,period_month.desc`, { headers: supabase.headers(token) }).then(r => r.json());
    setInvoices(Array.isArray(inv) ? inv : []);
  };

  // Get months that have shipments but no invoice yet
  const getUninvoicedMonths = () => {
    const totals = getMonthlyTotals();
    const invoiced = new Set(invoices.map(i => `${i.period_year}-${i.period_month - 1}`));
    const now = new Date();
    return Object.entries(totals)
      .filter(([key]) => !invoiced.has(key))
      .filter(([key]) => {
        const [year, month] = key.split("-").map(Number);
        // Only show past months (not current month)
        return year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth());
      })
      .map(([key, amount]) => {
        const [year, month] = key.split("-").map(Number);
        return { month, year, amount };
      })
      .sort((a, b) => b.year - a.year || b.month - a.month);
  };

  return (
    <><div className="page-header">
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <button className="back-btn" onClick={onBack}><Icons.ArrowLeft /></button>
        <div><div className="page-title">{client.full_name || client.email}</div>
          <div className="page-subtitle">{client.email}</div></div>
      </div>
    </div>
    <div className="page-body">
      <div className="service-tabs" style={{ maxWidth: 600, marginBottom: 24, padding: 6 }}>
        <div className={`service-tab ${tab === "liquidation" ? "active liquidation" : ""}`} onClick={() => setTab("liquidation")}>💰 Liquidation</div>
        <div className={`service-tab ${tab === "settings" ? "active admin" : ""}`} onClick={() => setTab("settings")}>⚙️ Settings</div>
      </div>
      {tab === "prep" ? 
        <AdminClientPrep client={client} parcels={parcels} shipments={shipments} token={token} showToast={showToast} onRefresh={onRefresh} /> :
       tab === "liquidation" ?
        <AdminClientLiquidation client={client} liquidation={liquidation} token={token} showToast={showToast} onRefresh={onRefresh} /> :
       tab === "deals" ? (
        <>
          <div className="card" style={{ marginBottom: 24, borderColor: dealsAccess ? 'rgba(0,230,118,0.3)' : 'rgba(255,82,82,0.2)', background: dealsAccess ? 'rgba(0,230,118,0.03)' : 'rgba(255,82,82,0.03)' }}>
            <div className="card-title" style={{ color: dealsAccess ? '#00e676' : 'var(--red)' }}>DBH Deals Access — {dealsAccess ? '🟢 ACTIVE' : '🔴 INACTIVE'}</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 600 }}>Deal Sheet Subscription</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{dealsAccess ? "This client can view the daily deal sheet" : "This client CANNOT see any deals"}</div>
              </div>
              <button 
                className="btn"
                disabled={savingDeals}
                style={{ 
                  background: dealsAccess ? '#00e676' : 'var(--red)',
                  color: dealsAccess ? '#000' : '#fff',
                  fontWeight: 700,
                  minWidth: 140,
                  fontSize: 15
                }}
                onClick={async () => {
                  setSavingDeals(true);
                  const newAccess = !dealsAccess;
                  const updates = { deals_access: newAccess };
                  if (newAccess && !dealsStartDate) {
                    const today = new Date().toISOString().split('T')[0];
                    updates.deals_start_date = today;
                    setDealsStartDate(today);
                  }
                  setDealsAccess(newAccess);
                  await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${client.id}`, { 
                    method: "PATCH", 
                    headers: { ...supabase.headers(token), "Content-Type": "application/json" }, 
                    body: JSON.stringify(updates) 
                  });
                  showToast(newAccess ? "Deals access granted!" : "Deals access revoked!");
                  onRefresh();
                  setSavingDeals(false);
                }}
              >
                {savingDeals ? "Saving..." : dealsAccess ? "✓ ACTIVE" : "✗ INACTIVE"}
              </button>
            </div>
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, marginTop: 16 }}>
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  <div className="input-group" style={{ margin: 0, maxWidth: 220 }}>
                    <label className="input-label">Access Start Date</label>
                    <input type="date" className="input" style={{ colorScheme: 'dark' }} value={dealsStartDate}
                      onChange={async (e) => {
                        const newDate = e.target.value;
                        setDealsStartDate(newDate);
                        await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${client.id}`, { method: "PATCH", headers: { ...supabase.headers(token), "Content-Type": "application/json" }, body: JSON.stringify({ deals_start_date: newDate }) });
                        showToast("Start date updated!"); onRefresh();
                      }} />
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Can only see deals from this date</div>
                  </div>
                  <div className="input-group" style={{ margin: 0, maxWidth: 220 }}>
                    <label className="input-label">Last Payment Date</label>
                    <input type="date" className="input" style={{ colorScheme: 'dark' }} value={dealsLastPayment}
                      onChange={async (e) => {
                        const newDate = e.target.value;
                        setDealsLastPayment(newDate);
                        await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${client.id}`, { method: "PATCH", headers: { ...supabase.headers(token), "Content-Type": "application/json" }, body: JSON.stringify({ deals_last_payment: newDate }) });
                        showToast("Payment date updated!"); onRefresh();
                      }} />
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Auto-deactivates after 1 month</div>
                  </div>
                  <div className="input-group" style={{ margin: 0, maxWidth: 220 }}>
                    <label className="input-label">Next Payment Due</label>
                    <input type="date" className="input" style={{ colorScheme: 'dark' }} value={nextPaymentDate}
                      onChange={async (e) => {
                        const newDate = e.target.value;
                        setNextPaymentDate(newDate);
                        await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${client.id}`, { method: "PATCH", headers: { ...supabase.headers(token), "Content-Type": "application/json" }, body: JSON.stringify({ next_payment_date: newDate }) });
                        showToast("Next payment date saved!"); onRefresh();
                      }} />
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Shows alert on client card when overdue</div>
                  </div>
                </div>
                {isPaymentOverdue && (
                  <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(255,82,82,0.1)', border: '1px solid rgba(255,82,82,0.25)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>⚠️</span>
                    <span style={{ fontSize: 13, color: 'var(--red)', fontWeight: 600 }}>Payment overdue — subscription will auto-deactivate</span>
                  </div>
                )}
                {(client.deals_invoice_name || client.deals_invoice_email) && (
                  <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Client Invoice Details</div>
                    <div style={{ display: 'flex', gap: 20, fontSize: 13 }}>
                      <span><strong>{client.deals_invoice_name}</strong></span>
                      {client.deals_invoice_business && <span style={{ color: 'var(--text-muted)' }}>{client.deals_invoice_business}</span>}
                      <span style={{ color: 'var(--text-muted)' }}>{client.deals_invoice_email}</span>
                    </div>
                  </div>
                )}
              </div>
          </div>
          <AdminClientDeals client={client} token={token} />
        </>
      ) :
        <>
          {/* T&Cs Status */}
          <div className="card" style={{ marginBottom: 24, borderColor: client.tcs_signed ? 'rgba(0,230,118,0.2)' : 'rgba(255,82,82,0.2)', background: client.tcs_signed ? 'rgba(0,230,118,0.03)' : 'rgba(255,82,82,0.03)' }}>
            <div className="card-title" style={{ color: client.tcs_signed ? '#00e676' : 'var(--red)' }}>Terms & Conditions — {client.tcs_signed ? '✅ Signed' : '❌ Not Signed'}</div>
            {client.tcs_signed ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Signed by:</span> <strong>{client.tcs_signed_name}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Business:</span> <strong>{client.tcs_signed_business || '—'}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Position:</span> <strong>{client.tcs_signed_position || '—'}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Phone:</span> <strong>{client.tcs_signed_phone || '—'}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Signed on:</span> <strong>{client.tcs_signed_at ? new Date(client.tcs_signed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Email:</span> <strong>{client.email}</strong></div>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>This client has not yet signed the Terms & Conditions. They will be prompted to sign when they next log in.</div>
            )}
          </div>

          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-title">Custom Pricing <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-muted)" }}>+ VAT</span></div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 12 }}>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Standard Prep (£) <span style={{ fontSize: 9, color: "var(--text-muted)" }}>+VAT</span></label>
                <input className="input" type="number" step="0.01" value={pricing.prep_standard} onChange={e => setPricing({ ...pricing, prep_standard: e.target.value })} />
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Bundle Prep (£) <span style={{ fontSize: 9, color: "var(--text-muted)" }}>+VAT</span></label>
                <input className="input" type="number" step="0.01" value={pricing.prep_bundle} onChange={e => setPricing({ ...pricing, prep_bundle: e.target.value })} />
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Oversize Prep (£) <span style={{ fontSize: 9, color: "var(--text-muted)" }}>+VAT</span></label>
                <input className="input" type="number" step="0.01" value={pricing.prep_oversize} onChange={e => setPricing({ ...pricing, prep_oversize: e.target.value })} />
              </div>
            </div>
            <div style={{ marginBottom: 12, padding: "12px 14px", background: "rgba(255,145,0,0.05)", border: "1px solid rgba(255,145,0,0.2)", borderRadius: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--orange)", marginBottom: 6 }}>Liquidation Commission Override</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10 }}>Leave blank to use defaults (15% standard / 10% over £200)</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="input-group" style={{ margin: 0 }}>
                  <label className="input-label">Standard % <span style={{ fontSize: 9, color: "var(--text-muted)" }}>default 15</span></label>
                  <input className="input" type="number" step="0.5" placeholder="15" value={pricing.liq_commission_standard} onChange={e => setPricing({ ...pricing, liq_commission_standard: e.target.value })} />
                </div>
                <div className="input-group" style={{ margin: 0 }}>
                  <label className="input-label">Over £200 % <span style={{ fontSize: 9, color: "var(--text-muted)" }}>default 10</span></label>
                  <input className="input" type="number" step="0.5" placeholder="10" value={pricing.liq_commission_high} onChange={e => setPricing({ ...pricing, liq_commission_high: e.target.value })} />
                </div>
              </div>
            </div>
            <button className="btn btn-primary admin" onClick={savePricing} disabled={savingPricing}>{savingPricing ? "Saving..." : "Save Pricing"}</button>
          </div>

          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-title">Discord Webhook</div>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <input className="input" placeholder="https://discord.com/api/webhooks/..." value={webhook} onChange={e => setWebhook(e.target.value)} />
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Notifications for: Shipped, Needs Attention, Liquidation Sold</div>
            </div>
            <button className="btn btn-primary admin" style={{ marginTop: 12 }} onClick={saveWebhook} disabled={savingWebhook}>{savingWebhook ? "Saving..." : "Save Webhook"}</button>
          </div>

          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-title">Generate Invoice</div>
            {(() => {
              const totals = getMonthlyTotals();
              const now = new Date();
              // Build last 6 months
              const months = [];
              for (let i = 1; i <= 6; i++) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const m = d.getMonth(), y = d.getFullYear();
                const key = `${y}-${m}`;
                months.push({ month: m, year: y, amount: totals[key] || 0 });
              }
              return (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                  {months.map(({ month, year, amount }) => (
                    <button key={`${year}-${month}`} className="btn btn-primary btn-sm admin"
                      onClick={() => { setManualMonth(month); setManualYear(year); setManualAmount(amount.toFixed(2)); }}>
                      {monthNames[month]} {year} — £{amount.toFixed(2)}
                    </button>
                  ))}
                </div>
              );
            })()}
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>Click a month above to pre-fill, or enter manually:</div>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
                <div className="input-group" style={{ margin: 0 }}>
                  <label className="input-label">Month</label>
                  <select className="input" value={manualMonth} onChange={e => setManualMonth(parseInt(e.target.value))}>
                    {monthNames.map((m, i) => <option key={i} value={i}>{m}</option>)}
                  </select>
                </div>
                <div className="input-group" style={{ margin: 0 }}>
                  <label className="input-label">Year</label>
                  <input className="input" type="number" value={manualYear} onChange={e => setManualYear(parseInt(e.target.value))} style={{ width: 80 }} />
                </div>
                <div className="input-group" style={{ margin: 0 }}>
                  <label className="input-label">Amount (£)</label>
                  <input className="input" type="number" step="0.01" value={manualAmount} onChange={e => setManualAmount(e.target.value)} placeholder="0.00" style={{ width: 110 }} />
                </div>
                <button className="btn btn-primary admin" onClick={() => {
                  const amt = parseFloat(manualAmount) || 0;
                  if (amt > 0) generateInvoice(manualMonth, manualYear, amt);
                }} disabled={!manualAmount || parseFloat(manualAmount) <= 0}>Create Invoice</button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Invoices</div>
            {loadingInvoices ? <div style={{ color: "var(--text-muted)" }}>Loading...</div> :
             invoices.length === 0 ? <div style={{ color: "var(--text-muted)" }}>No invoices yet</div> :
             <div className="table-wrap"><table>
              <thead><tr><th>Period</th><th>Ref</th><th>Amount</th><th>Status</th><th>PDF Invoice</th><th></th></tr></thead>
              <tbody>{invoices.map(inv => (
                <tr key={inv.id}>
                  <td style={{ fontWeight: 600 }}>{monthNames[inv.period_month - 1]} {inv.period_year}</td>
                  <td className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>{inv.invoice_number}</td>
                  <td style={{ fontWeight: 700, color: "var(--amber)" }}>£{parseFloat(inv.amount).toFixed(2)}</td>
                  <td>
                    <select className="inline-select" value={inv.status}
                      onChange={e => updateInvoice(inv.id, { status: e.target.value, paid_at: e.target.value === "paid" ? new Date().toISOString() : null })}>
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </td>
                  <td>
                    {inv.invoice_url ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <a href={inv.invoice_url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--cyan)", fontSize: 13 }}>📄 View PDF</a>
                        <label style={{ cursor: "pointer", fontSize: 12, color: "var(--text-muted)", textDecoration: "underline" }}>
                          Replace
                          <input type="file" accept="application/pdf" style={{ display: "none" }} onChange={async e => {
                            const file = e.target.files[0]; if (!file) return;
                            const path = `${client.id}/${inv.invoice_number}.pdf`;
                            const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/Invoices/${path}`, {
                              method: "POST", headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}`, "Content-Type": "application/pdf", "x-upsert": "true" },
                              body: file
                            });
                            if (uploadRes.ok) {
                              const signRes = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/Invoices/${path}`, {
                                method: "POST", headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                                body: JSON.stringify({ expiresIn: 31536000 })
                              });
                              const signData = await signRes.json();
                              console.log("signData:", JSON.stringify(signData)); const rawUrl = signData.signedURL || signData.signedUrl || (signData.data && (signData.data.signedURL || signData.data.signedUrl)) || ""; const url = rawUrl.startsWith("http") ? rawUrl : `${SUPABASE_URL}${rawUrl}`; 
                              console.log("Saving URL:", url); await updateInvoice(inv.id, { invoice_url: url }, true); showToast("PDF uploaded!");
                            } else { const t = await uploadRes.text(); console.error(t); showToast("Upload failed: " + uploadRes.status); }
                          }} />
                        </label>
                      </div>
                    ) : (
                      <label style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, color: "var(--text-secondary)" }}>
                        📎 Upload PDF
                        <input type="file" accept="application/pdf" style={{ display: "none" }} onChange={async e => {
                          const file = e.target.files[0]; if (!file) return;
                          const path = `${client.id}/${inv.invoice_number}.pdf`;
                          const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/Invoices/${path}`, {
                            method: "POST", headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}`, "Content-Type": "application/pdf", "x-upsert": "true" },
                            body: file
                          });
                          if (uploadRes.ok) {
                            const signRes = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/Invoices/${path}`, {
                              method: "POST", headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                              body: JSON.stringify({ expiresIn: 31536000 })
                            });
                            const signData = await signRes.json();
                            console.log("signData:", JSON.stringify(signData)); const rawUrl = signData.signedURL || signData.signedUrl || (signData.data && (signData.data.signedURL || signData.data.signedUrl)) || ""; const url = rawUrl.startsWith("http") ? rawUrl : `${SUPABASE_URL}${rawUrl}`; 
                            console.log("Saving URL:", url); await updateInvoice(inv.id, { invoice_url: url }, true); showToast("PDF uploaded!");
                          } else { const t = await uploadRes.text(); console.error(t); showToast("Upload failed: " + uploadRes.status); }
                        }} />
                      </label>
                    )}
                  </td>
                  <td>
                    <button className="btn-icon btn-danger" onClick={() => deleteInvoice(inv.id)}><Icons.Trash /></button>
                  </td>
                </tr>
              ))}</tbody>
            </table></div>}
          </div>
        </>
      }
    </div></>
  );
}

// Admin - Client Prep Tab (Inbound + Shipments)
function AdminClientDeals({ client, token }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('shortlisted');

  useEffect(() => {
    loadItems();
  }, [client.id]);

  const loadItems = async () => {
    setLoading(true);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/deal_interactions?user_id=eq.${client.id}&order=created_at.desc`, { headers: supabase.headers(token) });
    const data = await res.json();
    if (Array.isArray(data)) setItems(data);
    setLoading(false);
  };

  const filtered = items.filter(i => i.status === tab);
  const boughtItems = items.filter(i => i.status === 'bought');
  const totalCost = boughtItems.reduce((sum, i) => sum + (parseFloat(i.cost_price) || 0) * (i.quantity || 1), 0);
  const totalProfit = boughtItems.reduce((sum, i) => sum + (parseFloat(i.profit) || 0) * (i.quantity || 1), 0);
  const totalUnits = boughtItems.reduce((sum, i) => sum + (i.quantity || 1), 0);
  const formatCurrency = (val) => `£${parseFloat(val || 0).toFixed(2)}`;
  const fmtRoi = (val) => { const n = parseFloat(val || 0); return n > 0 && n < 3 ? (n*100).toFixed(0) : n.toFixed(0); };

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div className="card-title" style={{ margin: 0 }}>Client Deal Activity</div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => setTab('shortlisted')} className={`btn ${tab === 'shortlisted' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '6px 14px', fontSize: 12 }}>⭐ Shortlist ({items.filter(i => i.status === 'shortlisted').length})</button>
          <button onClick={() => setTab('bought')} className={`btn ${tab === 'bought' ? 'btn-primary deals' : 'btn-secondary'}`} style={{ padding: '6px 14px', fontSize: 12 }}>🛒 Bought ({boughtItems.length})</button>
        </div>
      </div>
      {tab === 'bought' && boughtItems.length > 0 && (
        <div style={{ display: 'flex', gap: 20, marginBottom: 16, padding: '10px 14px', background: 'var(--bg-primary)', borderRadius: 8, fontSize: 13 }}>
          <span>COGS: <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(totalCost)}</strong></span>
          <span>Exp Profit: <strong style={{ color: '#00e676' }}>{formatCurrency(totalProfit)}</strong></span>
          <span>Units: <strong>{totalUnits}</strong></span>
          <span>ROI: <strong style={{ color: 'var(--cyan)' }}>{totalCost > 0 ? ((totalProfit / totalCost) * 100).toFixed(0) : 0}%</strong></span>
        </div>
      )}
      {loading ? <div style={{ padding: 20, textAlign: 'center' }}><div className="spinner" style={{ borderTopColor: '#00e676', width: 24, height: 24, margin: '0 auto' }} /></div> :
      filtered.length === 0 ? (
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No {tab === 'shortlisted' ? 'shortlisted' : 'bought'} deals</div>
      ) : (
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {filtered.map(item => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{item.product_name}</div>
                <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  <span className="mono">{item.asin}</span>
                  <span>{formatCurrency(item.cost_price)} → {formatCurrency(item.sale_price)}</span>
                  <span style={{ color: '#00e676' }}>{formatCurrency(item.profit)} ({fmtRoi(item.roi)}%)</span>
                  {item.quantity > 1 && <span style={{ color: 'var(--amber)' }}>×{item.quantity}</span>}
                </div>
                {item.client_notes && <div style={{ fontSize: 12, color: 'var(--amber)', marginTop: 4 }}>📝 {item.client_notes}</div>}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>
                {new Date(item.deal_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminClientPrep({ client, parcels: initialParcels, shipments: initialShipments, token, showToast, onRefresh }) {
  const [localParcels, setLocalParcels] = useState(initialParcels);
  const [localShipments, setLocalShipments] = useState(initialShipments);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [showShipmentForm, setShowShipmentForm] = useState(false);
  const [shipmentForm, setShipmentForm] = useState({ shipment_id: "", units_prepped: "", unit_cost: "0.45", box_count: "", box_cost: "", other_fees: "", other_fees_note: "", notes: "", date_shipped: "", status: "ready_for_collection", selected_parcels: [] });
  const [editingShipment, setEditingShipment] = useState(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [partialPrepItem, setPartialPrepItem] = useState(null);
  const [partialPrepQty, setPartialPrepQty] = useState("");
  const [showAddParcel, setShowAddParcel] = useState(false);
  const [addParcelForm, setAddParcelForm] = useState({ product_name: "", asin: "", sku: "", supplier: "", quantity: "", qty_received: "", tracking_number: "", status: "in_transit" });
  const [parcelTab, setParcelTab] = useState("transit");
  const [parcelSearch, setParcelSearch] = useState("");
  const [receiveParcel, setReceiveParcel] = useState(null);
  const [receiveParcelQty, setReceiveParcelQty] = useState("");

  useEffect(() => { setLocalParcels(initialParcels); }, [initialParcels]);
  useEffect(() => { setLocalShipments(initialShipments); }, [initialShipments]);
  useEffect(() => {
    fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.discord_webhook_url`, { headers: supabase.headers(token) })
      .then(r => r.json()).then(d => { if (d?.[0]?.value) setWebhookUrl(d[0].value); });
  }, []);

  const activeParcels = localParcels.filter(p => p.status !== "collected");
  const completedParcels = localParcels.filter(p => p.status === "collected");
  const preppedParcels = localParcels.filter(p => p.status === "prepped");
  const sorted = sortByStatus(activeParcels);

  const inboundUnits = localParcels.filter(p => ["in_transit","partial_delivery"].includes(p.status)).reduce((s,p)=>s+(parseInt(p.quantity)||0),0);
  const inWarehouseUnits = localParcels.filter(p=>p.status==="delivered"||p.status==="partial_delivery").reduce((s,p)=>s+(parseInt(p.qty_received)||parseInt(p.quantity)||0),0);
  const preppedUnits = preppedParcels.reduce((s,p)=>s+(parseInt(p.qty_received)||parseInt(p.quantity)||0),0);
  const collectedUnits = completedParcels.reduce((s,p)=>s+(parseInt(p.qty_received)||parseInt(p.quantity)||0),0);

  const now = new Date();
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const calcShipmentCost = s => (parseFloat(s.units_prepped)||0)*(parseFloat(s.unit_cost)||0)+(parseFloat(s.box_count)||0)*(parseFloat(s.box_cost)||0)+(parseFloat(s.other_fees)||0);
  const thisMonthTotal = localShipments.filter(s=>{ const d=new Date(s.date_shipped||s.created_at); return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear(); }).reduce((s,x)=>s+calcShipmentCost(x),0);
  const totalCharges = localShipments.reduce((s,x)=>s+calcShipmentCost(x),0);

  const startEdit = item => {
    setEditingId(item.id);
    setEditData({ status: item.status||"in_transit", admin_notes: item.admin_notes||"", needs_attention: item.needs_attention||false, attention_reason: item.attention_reason||"", qty_received: item.qty_received||"", quantity: item.quantity||1 });
  };

  const doSaveEdit = async (overrideData) => {
    setSaving(true);
    const oldItem = localParcels.find(p => p.id === editingId);
    const dataToSave = overrideData || editData;
    await fetch(`${SUPABASE_URL}/rest/v1/parcels?id=eq.${editingId}`, { method: "PATCH", headers: { ...supabase.headers(token), "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify(dataToSave) });
    setLocalParcels(prev => prev.map(p => p.id === editingId ? { ...p, ...dataToSave } : p));
    const clientWebhook = client.discord_webhook || webhookUrl;
    if (clientWebhook) {
      if (dataToSave.status === "delivered" && oldItem?.status !== "delivered") await sendDiscordNotification(clientWebhook, null, { title: "📬 DELIVERED TO WAREHOUSE", color: 0x00e5ff, fields: [{ name: "Product", value: oldItem?.product_name||"Unknown", inline: true }, { name: "Units Received", value: `${dataToSave.qty_received||oldItem?.quantity||0}`, inline: true }, { name: "SKU", value: oldItem?.sku||"—", inline: true }], footer: { text: client.full_name||client.email } });
      if (dataToSave.status === "partial_delivery" && !["delivered","partial_delivery"].includes(oldItem?.status)) { const qtyIn = parseInt(dataToSave.qty_received)||0; const remaining = (parseInt(oldItem?.quantity)||0) - qtyIn; await sendDiscordNotification(clientWebhook, null, { title: "📬 PARTIAL DELIVERY TO WAREHOUSE", color: 0xffab00, fields: [{ name: "Product", value: oldItem?.product_name||"Unknown", inline: true }, { name: "Units Received", value: `${qtyIn}`, inline: true }, { name: "Still In Transit", value: `${remaining}`, inline: true }, { name: "SKU", value: oldItem?.sku||"—", inline: true }], footer: { text: client.full_name||client.email } }); }
      if (dataToSave.status === "prepped" && oldItem?.status !== "prepped") { const unitsPrepped = parseInt(dataToSave.qty_received) || parseInt(dataToSave.quantity) || parseInt(oldItem?.qty_received) || parseInt(oldItem?.quantity) || 0; await sendDiscordNotification(clientWebhook, null, { title: "✅ PREPPED & READY", color: 0x00c853, fields: [{ name: "Product", value: oldItem?.product_name||"Unknown", inline: true }, { name: "Units Prepped", value: `${unitsPrepped}`, inline: true }, { name: "SKU", value: oldItem?.sku||"—", inline: true }], footer: { text: client.full_name||client.email } }); }
      if (dataToSave.status === "collected" && oldItem?.status !== "collected") await sendDiscordNotification(clientWebhook, null, { title: "📦 COLLECTED", color: 0x22c55e, fields: [{ name: "Product", value: oldItem?.product_name||"Unknown", inline: true }, { name: "Units", value: `${dataToSave.qty_received||oldItem?.quantity||0}`, inline: true }, { name: "SKU", value: oldItem?.sku||"—", inline: true }], footer: { text: client.full_name||client.email } });
      if (dataToSave.needs_attention && !oldItem?.needs_attention) await sendDiscordNotification(clientWebhook, null, { title: "⚠️ NEEDS ATTENTION", color: 0xef4444, fields: [{ name: "Product", value: oldItem?.product_name||"Unknown", inline: true }, { name: "Issue", value: dataToSave.attention_reason||"Unknown", inline: true }], description: dataToSave.admin_notes||null, footer: { text: client.full_name||client.email } });
    }
    showToast("Saved!"); setEditingId(null); setSaving(false); onRefresh();
  };

  const saveEdit = async () => {
    const oldItem = localParcels.find(p => p.id === editingId);
    const qtyReceived = parseInt(editData.qty_received) || parseInt(oldItem?.qty_received) || parseInt(oldItem?.quantity) || 1;
    const totalExpected = parseInt(oldItem?.quantity) || 1;
    if (editData.status === "prepped" && oldItem?.status !== "prepped") {
      if (oldItem?.status === "partial_delivery" || oldItem?.status === "delivered") {
        await doSaveEdit({ ...editData, status: "prepped" });
        return;
      }
      setPartialPrepItem({ ...oldItem, quantity: totalExpected, qty_received: qtyReceived });
      setPartialPrepQty(String(qtyReceived));
      return;
    }
    let finalData = { ...editData };
    // Auto-detect partial delivery when marking delivered with fewer units than expected
    if (editData.status === "delivered" && editData.qty_received && parseInt(editData.qty_received) < (oldItem?.quantity || 0)) {
      finalData.status = "partial_delivery";
    }
    // If editing qty_received on a warehouse row and it's less than original quantity, split the remainder back to in_transit
    const isWarehouseRow = ["delivered", "partial_delivery"].includes(oldItem?.status);
    const newQtyReceived = parseInt(editData.qty_received);
    const originalQty = parseInt(oldItem?.quantity) || 0;
    if (isWarehouseRow && newQtyReceived && newQtyReceived < originalQty) {
      const remainder = originalQty - newQtyReceived;
      // Update existing row with received qty only
      finalData.quantity = newQtyReceived;
      await doSaveEdit(finalData);
      // Create new in_transit row for the remainder
      await fetch(`${SUPABASE_URL}/rest/v1/parcels`, { method: "POST", headers: { ...supabase.headers(token), "Content-Type": "application/json", "Prefer": "return=representation" }, body: JSON.stringify({ product_name: oldItem.product_name, asin: oldItem.asin, sku: oldItem.sku, supplier: oldItem.supplier, quantity: remainder, tracking_number: oldItem.tracking_number, status: "in_transit", user_id: client.id, date_added: oldItem.date_added }) });
      const freshParcels = await fetch(`${SUPABASE_URL}/rest/v1/parcels?user_id=eq.${client.id}&order=created_at.desc`, { headers: supabase.headers(token) }).then(r => r.json());
      if (Array.isArray(freshParcels)) setLocalParcels(freshParcels);
      showToast(`${newQtyReceived} in warehouse · ${remainder} moved back to In Transit`);
      onRefresh();
      return;
    }
    await doSaveEdit(finalData);
  };

  const deleteParcel = async id => {
    if (!confirm("Delete this parcel?")) return;
    await fetch(`${SUPABASE_URL}/rest/v1/parcels?id=eq.${id}`, { method: "DELETE", headers: supabase.headers(token) });
    setLocalParcels(prev => prev.filter(p => p.id !== id));
    showToast("Deleted!"); onRefresh();
  };

  const resetShipmentForm = () => { setShipmentForm({ shipment_id: "", units_prepped: "", unit_cost: "0.45", box_count: "", box_cost: "", other_fees: "", other_fees_note: "", notes: "", date_shipped: "", status: "ready_for_collection", selected_parcels: [] }); setEditingShipment(null); };

  const startEditShipment = s => {
    setEditingShipment(s.id);
    setShipmentForm({ shipment_id: s.shipment_id, units_prepped: s.units_prepped||"", unit_cost: s.unit_cost||"0.45", box_count: s.box_count||"", box_cost: s.box_cost||"", other_fees: s.other_fees||"", other_fees_note: s.other_fees_note||"", notes: s.notes||"", date_shipped: s.date_shipped||"", status: s.status||"ready_for_collection", selected_parcels: localParcels.filter(p => p.shipment_id === s.id).map(p => p.id) });
    setShowShipmentForm(true);
  };

  const saveShipment = async () => {
    if (!shipmentForm.shipment_id) return;
    setSaving(true);
    const today = new Date().toISOString().split('T')[0];
    const baseData = { shipment_id: shipmentForm.shipment_id, units_prepped: parseInt(shipmentForm.units_prepped)||0, unit_cost: parseFloat(shipmentForm.unit_cost)||0, box_count: parseInt(shipmentForm.box_count)||0, box_cost: parseFloat(shipmentForm.box_cost)||0, other_fees: parseFloat(shipmentForm.other_fees)||0, other_fees_note: shipmentForm.other_fees_note||"", notes: shipmentForm.notes||"", date_shipped: shipmentForm.date_shipped||today, status: shipmentForm.status||"ready_for_collection" };
    try {
      let shipId;
      if (editingShipment) {
        await fetch(`${SUPABASE_URL}/rest/v1/shipments?id=eq.${editingShipment}`, { method: "PATCH", headers: { ...supabase.headers(token), "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify(baseData) });
        shipId = editingShipment;
        await fetch(`${SUPABASE_URL}/rest/v1/parcels?shipment_id=eq.${shipId}&user_id=eq.${client.id}`, { method: "PATCH", headers: { ...supabase.headers(token), "Content-Type": "application/json" }, body: JSON.stringify({ shipment_id: null, status: "prepped" }) });
      } else {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/shipments`, { method: "POST", headers: { ...supabase.headers(token), "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify({ ...baseData, user_id: client.id }) });
        const text = await res.text();
        let data; try { data = JSON.parse(text); } catch(e) { data = []; }
        shipId = Array.isArray(data) ? data?.[0]?.id : data?.id;
      }
      if (shipmentForm.selected_parcels?.length > 0 && shipId) {
        const parcelStatus = shipmentForm.status === "collected" ? "collected" : "prepped";
        for (const pid of shipmentForm.selected_parcels) {
          const parcel = localParcels.find(p => p.id === pid);
          // Only mark as collected if the parcel is currently prepped (not in-transit or delivered)
          if (shipmentForm.status === "collected" && parcel && !["prepped"].includes(parcel.status)) continue;
          await fetch(`${SUPABASE_URL}/rest/v1/parcels?id=eq.${pid}`, { method: "PATCH", headers: { ...supabase.headers(token), "Content-Type": "application/json" }, body: JSON.stringify({ shipment_id: shipId, status: parcelStatus }) });
        }
      }
      // Refresh local state immediately so UI updates without waiting for parent
      const [freshShipments, freshParcels] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/shipments?user_id=eq.${client.id}&order=created_at.desc`, { headers: supabase.headers(token) }).then(r => r.json()),
        fetch(`${SUPABASE_URL}/rest/v1/parcels?user_id=eq.${client.id}&order=created_at.desc`, { headers: supabase.headers(token) }).then(r => r.json())
      ]);
      if (Array.isArray(freshShipments)) setLocalShipments(freshShipments);
      if (Array.isArray(freshParcels)) setLocalParcels(freshParcels);
      // Discord notification when shipment is collected
      if (shipmentForm.status === "collected") {
        const clientWebhook = client.discord_webhook || webhookUrl;
        if (clientWebhook) {
          const units = parseInt(shipmentForm.units_prepped) || 0;
          const boxes = parseInt(shipmentForm.box_count) || 0;
          const unitCost = parseFloat(shipmentForm.unit_cost) || 0;
          const boxCost = parseFloat(shipmentForm.box_cost) || 0;
          const otherFees = parseFloat(shipmentForm.other_fees) || 0;
          const subtotal = (units * unitCost) + (boxes * boxCost) + otherFees;
          const vat = subtotal * 0.20;
          const total = subtotal + vat;
          await sendDiscordNotification(clientWebhook, null, {
            title: "🚚 SHIPMENT COLLECTED",
            color: 0x22c55e,
            fields: [
              { name: "Shipment ID", value: shipmentForm.shipment_id || "—", inline: true },
              { name: "Units", value: `${units}`, inline: true },
              { name: "Boxes", value: `${boxes}`, inline: true },
              { name: "Total (inc. VAT)", value: `£${total.toFixed(2)}`, inline: true }
            ],
            footer: { text: "Your shipment is on its way to Amazon" }
          });
        }
      }
      showToast(editingShipment ? "Updated!" : "Shipment created!");
      resetShipmentForm(); setShowShipmentForm(false); onRefresh();
    } catch(e) { console.error("Shipment error:", e); showToast("Error saving shipment"); }
    setSaving(false);
  };

  const deleteShipment = async id => {
    if (!confirm("Delete shipment?")) return;
    await fetch(`${SUPABASE_URL}/rest/v1/shipments?id=eq.${id}`, { method: "DELETE", headers: supabase.headers(token) });
    setLocalShipments(prev => prev.filter(s => s.id !== id));
    showToast("Deleted!"); onRefresh();
  };

  return (
    <>
      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(6, 1fr)", marginBottom: 24 }}>
        <div className="card stat-card"><div className="card-title">Inbound</div><div className="stat-value" style={{ color: "var(--purple)" }}>{inboundUnits}</div><div style={{ fontSize: 11, color: "var(--text-muted)" }}>units</div></div>
        <div className="card stat-card"><div className="card-title">In Warehouse</div><div className="stat-value" style={{ color: "var(--cyan)" }}>{inWarehouseUnits}</div><div style={{ fontSize: 11, color: "var(--text-muted)" }}>units</div></div>
        <div className="card stat-card"><div className="card-title">Prepped</div><div className="stat-value" style={{ color: "var(--green)" }}>{preppedUnits}</div><div style={{ fontSize: 11, color: "var(--text-muted)" }}>units</div></div>
        <div className="card stat-card"><div className="card-title">Collected</div><div className="stat-value" style={{ color: "var(--text-muted)" }}>{collectedUnits}</div><div style={{ fontSize: 11, color: "var(--text-muted)" }}>units</div></div>
        <div className="card stat-card"><div className="card-title">{monthNames[now.getMonth()]} Total</div><div className="stat-value" style={{ color: "var(--amber)" }}>£{thisMonthTotal.toFixed(2)}</div></div>
        <div className="card stat-card"><div className="card-title">All Time</div><div className="stat-value" style={{ color: "var(--text-muted)" }}>£{totalCharges.toFixed(2)}</div></div>
      </div>

      <div style={{ marginBottom: 24 }}>
        {/* Header: title + Add Parcel */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Inbound Parcels</div>
          <button className="btn btn-primary btn-sm" onClick={() => { setShowAddParcel(true); setAddParcelForm({ product_name: "", asin: "", sku: "", supplier: "", quantity: "", qty_received: "", tracking_number: "", status: "in_transit" }); }}><Icons.Plus /> Add Parcel</button>
        </div>

        {showAddParcel && (
          <div className="card" style={{ padding: 16, marginBottom: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div><label className="input-label">Product *</label><input className="input" placeholder="Product name" value={addParcelForm.product_name} onChange={e => setAddParcelForm({...addParcelForm, product_name: e.target.value})} /></div>
              <div><label className="input-label">ASIN</label><input className="input" placeholder="B0..." value={addParcelForm.asin} onChange={e => setAddParcelForm({...addParcelForm, asin: e.target.value})} /></div>
              <div><label className="input-label">SKU</label><input className="input" value={addParcelForm.sku} onChange={e => setAddParcelForm({...addParcelForm, sku: e.target.value})} /></div>
              <div><label className="input-label">Supplier</label><input className="input" value={addParcelForm.supplier} onChange={e => setAddParcelForm({...addParcelForm, supplier: e.target.value})} /></div>
              <div><label className="input-label">Expected Qty *</label><input className="input" type="number" value={addParcelForm.quantity} onChange={e => setAddParcelForm({...addParcelForm, quantity: e.target.value})} /></div>
              <div><label className="input-label">Received</label><input className="input" type="number" value={addParcelForm.qty_received} onChange={e => setAddParcelForm({...addParcelForm, qty_received: e.target.value})} /></div>
              <div><label className="input-label">Status</label><select className="input" value={addParcelForm.status} onChange={e => setAddParcelForm({...addParcelForm, status: e.target.value})}>{PREP_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g," ")}</option>)}</select></div>
            </div>
            <div><label className="input-label">Tracking</label><input className="input" style={{maxWidth:240}} placeholder="Tracking number" value={addParcelForm.tracking_number} onChange={e => setAddParcelForm({...addParcelForm, tracking_number: e.target.value})} /></div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowAddParcel(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" disabled={saving || !addParcelForm.product_name || !addParcelForm.quantity} onClick={async () => {
                setSaving(true);
                const body = { product_name: addParcelForm.product_name, asin: addParcelForm.asin||null, sku: addParcelForm.sku||null, supplier: addParcelForm.supplier||null, quantity: parseInt(addParcelForm.quantity), qty_received: addParcelForm.qty_received ? parseInt(addParcelForm.qty_received) : null, tracking_number: addParcelForm.tracking_number||null, status: addParcelForm.status, user_id: client.id, date_added: new Date().toISOString().split('T')[0] };
                await fetch(`${SUPABASE_URL}/rest/v1/parcels`, { method: "POST", headers: { ...supabase.headers(token), "Content-Type": "application/json", "Prefer": "return=representation" }, body: JSON.stringify(body) });
                const freshParcels = await fetch(`${SUPABASE_URL}/rest/v1/parcels?user_id=eq.${client.id}&order=created_at.desc`, { headers: supabase.headers(token) }).then(r => r.json());
                if (Array.isArray(freshParcels)) setLocalParcels(freshParcels);
                setSaving(false); setShowAddParcel(false); showToast("Parcel added!"); onRefresh();
              }}>{saving ? "Saving..." : "Add Parcel"}</button>
            </div>
          </div>
        )}

        {/* Tabs */}
        {(() => {
          const transitParcels = localParcels.filter(p => p.status === "in_transit");
          const warehouseParcels = localParcels.filter(p => p.status === "delivered" || p.status === "partial_delivery");
          const preppedTabParcels = localParcels.filter(p => p.status === "prepped");
          const collectedTabParcels = localParcels.filter(p => p.status === "collected");

          const tabDefs = [
            ["transit", `⏳ In Transit`, transitParcels],
            ["warehouse", `🏭 In Warehouse`, warehouseParcels],
            ["prepped", `✅ Prepped`, preppedTabParcels],
            ["collected", `📦 Collected`, collectedTabParcels],
          ];

          const tabParcels = { transit: transitParcels, warehouse: warehouseParcels, prepped: preppedTabParcels, collected: collectedTabParcels };
          const q = parcelSearch.toLowerCase();
          const currentParcels = (tabParcels[parcelTab] || [])
            .filter(p => !q || (p.product_name||"").toLowerCase().includes(q) || (p.sku||"").toLowerCase().includes(q) || (p.asin||"").toLowerCase().includes(q) || (p.supplier||"").toLowerCase().includes(q))
            .sort((a, b) => new Date(b.date_added || 0) - new Date(a.date_added || 0));

          return <>
            <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
              {tabDefs.map(([k, label, items]) => (
                <button key={k} onClick={() => { setParcelTab(k); setParcelSearch(""); }} style={{ padding: "7px 16px", borderRadius: 8, border: "1px solid", fontSize: 13, fontWeight: 600, cursor: "pointer", background: parcelTab === k ? "var(--cyan)" : "transparent", color: parcelTab === k ? "#000" : "var(--text-secondary)", borderColor: parcelTab === k ? "var(--cyan)" : "var(--border)" }}>
                  {label}{items.length > 0 ? <span style={{ marginLeft: 6, background: parcelTab === k ? "rgba(0,0,0,0.15)" : "var(--border)", borderRadius: 10, padding: "1px 7px", fontSize: 11 }}>{items.length}</span> : null}
                </button>
              ))}
            </div>

            <div style={{ marginBottom: 10 }}>
              <input className="input" placeholder="🔍  Search product, SKU, ASIN, supplier..." value={parcelSearch} onChange={e => setParcelSearch(e.target.value)} style={{ maxWidth: 380 }} />
            </div>

            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              {currentParcels.length === 0
                ? <div className="empty-state"><Icons.Box /><p>No parcels here.</p></div>
                : <div className="table-wrap"><table>
                    <thead><tr>
                      <th>Date</th><th>Product</th><th>Supplier</th><th>SKU</th><th>ASIN</th>
                      <th>Expected</th><th>Received</th><th>Tracking</th>
                      {parcelTab !== "transit" && <th>Status</th>}
                      <th>Notes</th><th>Flag</th><th></th>
                    </tr></thead>
                    <tbody>{currentParcels.map(p => {
                      const isEdit = editingId === p.id, data = isEdit ? editData : p;
                      return <tr key={p.id} className={isEdit ? "edit-row" : ""}>
                        <td style={{ fontSize: 12 }}>{formatShortDate(p.date_added)}</td>
                        <td><ProductWithImage name={p.product_name} asin={p.asin} /></td>
                        <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{p.supplier || "—"}</td>
                        <td className="mono" style={{ fontSize: 12 }}>{p.sku || "—"}</td>
                        <td className="mono" style={{ fontSize: 12 }}><AsinWithImage asin={p.asin} /></td>
                        <td className="mono">{isEdit ? <input type="number" className="inline-input" style={{ width: 60 }} value={data.quantity || ""} onChange={e => setEditData({ ...editData, quantity: parseInt(e.target.value) || 0 })} placeholder="0" /> : p.quantity}</td>
                        <td className="mono">{isEdit ? <input type="number" className="inline-input" style={{ width: 60 }} value={data.qty_received || ""} onChange={e => setEditData({ ...editData, qty_received: parseInt(e.target.value) || 0 })} placeholder="0" /> : (p.qty_received != null ? p.qty_received : "—")}</td>
                        <td className="mono" style={{ fontSize: 11 }}>{p.tracking_number ? <a href={`https://parcelsapp.com/en/tracking/${p.tracking_number}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--cyan)" }}>{p.tracking_number.slice(0, 12)}...</a> : "—"}</td>
                        {parcelTab !== "transit" && <td>{isEdit ? <select className="inline-select" value={data.status} onChange={e => setEditData({ ...editData, status: e.target.value })}>{PREP_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}</select> : p.needs_attention ? <span className="badge badge-attention">{p.attention_reason}</span> : <StatusBadge status={p.status} />}</td>}
                        <td>{isEdit ? <input className="inline-input" value={data.admin_notes} onChange={e => setEditData({ ...editData, admin_notes: e.target.value })} placeholder="Notes..." /> : <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{p.admin_notes || "—"}</span>}</td>
                        <td>{isEdit ? <div><label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}><input type="checkbox" checked={data.needs_attention} onChange={e => setEditData({ ...editData, needs_attention: e.target.checked })} /> Flag</label>{data.needs_attention && <select className="inline-select" style={{ marginTop: 4, width: "100%" }} value={data.attention_reason} onChange={e => setEditData({ ...editData, attention_reason: e.target.value })}><option value="">Select...</option>{ATTENTION_REASONS.map(r => <option key={r} value={r}>{r}</option>)}</select>}</div> : "—"}</td>
                        <td>
                          {isEdit
                            ? <div style={{ display: "flex", gap: 4 }}><button className="btn-icon" onClick={saveEdit} disabled={saving}><Icons.Save /></button><button className="btn-icon btn-danger" onClick={() => setEditingId(null)}><Icons.X /></button></div>
                            : <div style={{ display: "flex", gap: 4 }}>
                                <button className="btn-icon" onClick={() => startEdit(p)}><Icons.Edit /></button>
                                {parcelTab === "transit" && (
                                  <button style={{ padding: "4px 10px", background: "var(--cyan)", color: "#000", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
                                    onClick={() => { setReceiveParcel(p); setReceiveParcelQty(String(p.quantity || 1)); }}>
                                    ✓ Received
                                  </button>
                                )}
                                {parcelTab === "warehouse" && (
                                  <button style={{ padding: "4px 10px", background: "var(--green)", color: "#000", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
                                    onClick={() => { setPartialPrepItem({ ...p, quantity: p.quantity, qty_received: p.qty_received || p.quantity }); setPartialPrepQty(String(p.qty_received || p.quantity)); }}>
                                    ✓ Prepped
                                  </button>
                                )}
                                <button className="btn-icon btn-danger" onClick={() => deleteParcel(p.id)}><Icons.Trash /></button>
                              </div>}
                        </td>
                      </tr>;
                    })}</tbody>
                  </table></div>}
            </div>
          </>;
        })()}
      </div>

      {/* Receive Parcel Modal */}
      {receiveParcel && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
        <div className="card" style={{ width: 420, maxWidth: "95vw", padding: 28 }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Mark Received</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>{receiveParcel.product_name}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, background: "var(--bg-primary)", borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <div style={{ textAlign: "center" }}><div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Expected</div><div style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>{receiveParcel.quantity}</div></div>
            <div style={{ textAlign: "center" }}><div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Now Received</div><div style={{ fontSize: 22, fontWeight: 700, color: "var(--cyan)" }}>{parseInt(receiveParcelQty) || 0}</div></div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label className="input-label">Qty Received</label>
            <input className="input" type="number" min="1" max={receiveParcel.quantity} value={receiveParcelQty} onChange={e => setReceiveParcelQty(e.target.value)} autoFocus />
          </div>
          {(() => {
            const rec = parseInt(receiveParcelQty) || 0;
            const rem = (receiveParcel.quantity || 1) - rec;
            if (rem > 0 && rec > 0) return <div style={{ fontSize: 12, color: "var(--amber)", marginBottom: 12 }}>⚠ {rec} will move to <strong>In Warehouse</strong> · {rem} will remain <strong>In Transit</strong></div>;
            if (rec >= (receiveParcel.quantity || 1) && rec > 0) return <div style={{ fontSize: 12, color: "var(--green)", marginBottom: 12 }}>✓ Full delivery — all {rec} units moving to <strong>In Warehouse</strong></div>;
            return null;
          })()}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn btn-secondary" onClick={() => setReceiveParcel(null)}>Cancel</button>
            <button className="btn btn-primary" style={{ background: "var(--cyan)", color: "#000" }} disabled={saving} onClick={async () => {
              setSaving(true);
              const qtyIn = parseInt(receiveParcelQty) || (receiveParcel.quantity || 1);
              const totalQty = receiveParcel.quantity || 1;
              const remaining = totalQty - qtyIn;
              const clientWebhook = client.discord_webhook || webhookUrl;
              if (remaining > 0) {
                // Partial: update original row → delivered with qty_received=qtyIn
                await fetch(`${SUPABASE_URL}/rest/v1/parcels?id=eq.${receiveParcel.id}`, { method: "PATCH", headers: { ...supabase.headers(token), "Content-Type": "application/json" }, body: JSON.stringify({ status: "delivered", qty_received: qtyIn }) });
                // Create new row for the remainder still in transit
                await fetch(`${SUPABASE_URL}/rest/v1/parcels`, { method: "POST", headers: { ...supabase.headers(token), "Content-Type": "application/json", "Prefer": "return=representation" }, body: JSON.stringify({ product_name: receiveParcel.product_name, asin: receiveParcel.asin, sku: receiveParcel.sku, supplier: receiveParcel.supplier, quantity: remaining, tracking_number: receiveParcel.tracking_number, status: "in_transit", user_id: client.id, date_added: receiveParcel.date_added }) });
                if (clientWebhook) await sendDiscordNotification(clientWebhook, null, { title: "📬 PARTIAL DELIVERY TO WAREHOUSE", color: 0xffab00, fields: [{ name: "Product", value: receiveParcel.product_name, inline: true }, { name: "Units Received", value: `${qtyIn}`, inline: true }, { name: "Still In Transit", value: `${remaining}`, inline: true }, { name: "SKU", value: receiveParcel.sku || "—", inline: true }], footer: { text: client.full_name || client.email } });
              } else {
                // Full delivery
                await fetch(`${SUPABASE_URL}/rest/v1/parcels?id=eq.${receiveParcel.id}`, { method: "PATCH", headers: { ...supabase.headers(token), "Content-Type": "application/json" }, body: JSON.stringify({ status: "delivered", qty_received: qtyIn }) });
                if (clientWebhook) await sendDiscordNotification(clientWebhook, null, { title: "📬 DELIVERED TO WAREHOUSE", color: 0x00e5ff, fields: [{ name: "Product", value: receiveParcel.product_name, inline: true }, { name: "Units Received", value: `${qtyIn}`, inline: true }, { name: "SKU", value: receiveParcel.sku || "—", inline: true }], footer: { text: client.full_name || client.email } });
              }
              const freshParcels = await fetch(`${SUPABASE_URL}/rest/v1/parcels?user_id=eq.${client.id}&order=created_at.desc`, { headers: supabase.headers(token) }).then(r => r.json());
              if (Array.isArray(freshParcels)) setLocalParcels(freshParcels);
              setReceiveParcel(null); setSaving(false); showToast("Marked received!"); setParcelTab("warehouse"); onRefresh();
            }}>{saving ? "Saving..." : "Confirm"}</button>
          </div>
        </div>
      </div>}

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div className="card-title" style={{ margin: 0 }}>Shipments</div>
          <button className="btn btn-primary btn-sm" onClick={() => { resetShipmentForm(); setShowShipmentForm(true); }}><Icons.Plus /> New Shipment</button>
        </div>

        {showShipmentForm && (
          <div style={{ background: "var(--bg-primary)", padding: 16, borderRadius: 10, marginBottom: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div className="input-group" style={{ margin: 0 }}><label className="input-label">Shipment ID *</label><input className="input" placeholder="FBA17ABC123" value={shipmentForm.shipment_id} onChange={e => setShipmentForm({ ...shipmentForm, shipment_id: e.target.value })} /></div>
              <div className="input-group" style={{ margin: 0 }}><label className="input-label">Status</label><select className="input" value={shipmentForm.status} onChange={e => setShipmentForm({ ...shipmentForm, status: e.target.value })}><option value="ready_for_collection">Ready for Collection</option><option value="collected">Collected</option></select></div>
              <div className="input-group" style={{ margin: 0 }}><label className="input-label">Date</label><input className="input" type="date" style={{ colorScheme: "dark" }} value={shipmentForm.date_shipped} onChange={e => setShipmentForm({ ...shipmentForm, date_shipped: e.target.value })} /></div>
              <div className="input-group" style={{ margin: 0 }}><label className="input-label">Units</label><input className="input" type="number" value={shipmentForm.units_prepped} onChange={e => setShipmentForm({ ...shipmentForm, units_prepped: e.target.value })} /></div>
              <div className="input-group" style={{ margin: 0 }}><label className="input-label">£/Unit</label><input className="input" type="number" step="0.01" value={shipmentForm.unit_cost} onChange={e => setShipmentForm({ ...shipmentForm, unit_cost: e.target.value })} /></div>
              <div className="input-group" style={{ margin: 0 }}><label className="input-label">Boxes</label><input className="input" type="number" value={shipmentForm.box_count} onChange={e => setShipmentForm({ ...shipmentForm, box_count: e.target.value })} /></div>
              <div className="input-group" style={{ margin: 0 }}><label className="input-label">Box Cost (£)</label><input className="input" type="number" step="0.01" value={shipmentForm.box_cost} onChange={e => setShipmentForm({ ...shipmentForm, box_cost: e.target.value })} /></div>
              <div className="input-group" style={{ margin: 0 }}><label className="input-label">Other Costs (£)</label><input className="input" type="number" step="0.01" placeholder="0.00" value={shipmentForm.other_fees} onChange={e => setShipmentForm({ ...shipmentForm, other_fees: e.target.value })} /></div>
              <div className="input-group" style={{ margin: 0, gridColumn: "span 2" }}><label className="input-label">Other Costs Description</label><input className="input" placeholder="e.g. Bubble wrap, labels..." value={shipmentForm.other_fees_note} onChange={e => setShipmentForm({ ...shipmentForm, other_fees_note: e.target.value })} /></div>
            </div>
            {preppedParcels.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <label className="input-label">Link Prepped Parcels</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8, maxHeight: 200, overflowY: 'auto', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
                  {preppedParcels.map(p => (
                    <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 10px', borderRadius: 8, background: shipmentForm.selected_parcels?.includes(p.id) ? 'rgba(0,230,118,0.08)' : 'transparent', border: shipmentForm.selected_parcels?.includes(p.id) ? '1px solid rgba(0,230,118,0.2)' : '1px solid transparent' }}>
                      <input type="checkbox" checked={shipmentForm.selected_parcels?.includes(p.id) || false} onChange={e => { const sel = shipmentForm.selected_parcels || []; setShipmentForm({ ...shipmentForm, selected_parcels: e.target.checked ? [...sel, p.id] : sel.filter(id => id !== p.id) }); }} />
                      <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 13 }}>{p.product_name}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.qty_received || p.quantity} units · {p.asin || '—'}</div></div>
                    </label>
                  ))}
                </div>
                {shipmentForm.selected_parcels?.length > 0 && <div style={{ fontSize: 12, color: '#00e676', marginTop: 6, fontWeight: 600 }}>{shipmentForm.selected_parcels.length} parcel(s) selected</div>}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700 }}>Total: <span style={{ color: "var(--green)" }}>£{calcShipmentCost(shipmentForm).toFixed(2)}</span></div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => { setShowShipmentForm(false); resetShipmentForm(); }}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={saveShipment} disabled={saving || !shipmentForm.shipment_id}>{saving ? "Saving..." : editingShipment ? "Update" : "Create"}</button>
              </div>
            </div>
          </div>
        )}

        {localShipments.length === 0 ? <div style={{ color: "var(--text-muted)" }}>No shipments yet.</div> :
        <div className="table-wrap"><table>
          <thead><tr><th>Shipment ID</th><th>Parcels</th><th>Units</th><th>Boxes</th><th>Total</th><th>Date</th><th>Status</th><th></th></tr></thead>
          <tbody>{localShipments.map(s => {
            const linked = localParcels.filter(p => p.shipment_id === s.id);
            return <tr key={s.id}>
              <td className="mono" style={{ fontWeight: 600 }}>{s.shipment_id}</td>
              <td>{linked.length > 0 ? <div style={{ fontSize: 11 }}>{linked.map(p => <div key={p.id} style={{ color: 'var(--text-secondary)' }}>{p.product_name}</div>)}</div> : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}</td>
              <td className="mono">{s.units_prepped || 0}</td>
              <td className="mono">{s.box_count || 0}</td>
              <td className="mono" style={{ fontWeight: 700, color: "var(--green)" }}>£{calcShipmentCost(s).toFixed(2)}</td>
              <td style={{ fontSize: 12 }}>{s.date_shipped ? formatShortDate(s.date_shipped) : "—"}</td>
              <td><span className={`badge badge-${s.status === "paid" ? "paid" : s.status === "collected" ? "collected" : "pending"}`}>{s.status === "ready_for_collection" ? "Ready" : s.status}</span></td>
              <td><div style={{ display: "flex", gap: 4 }}><button className="btn-icon" onClick={() => startEditShipment(s)}><Icons.Edit /></button><button className="btn-icon btn-danger" onClick={() => deleteShipment(s.id)}><Icons.Trash /></button></div></td>
            </tr>;
          })}</tbody>
        </table></div>}
      </div>

      {completedParcels.length > 0 && (
        <div className="card" style={{ marginTop: 24, borderColor: 'rgba(0,230,118,0.15)', background: 'rgba(0,230,118,0.02)' }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div className="card-title" style={{ margin: 0, color: '#00e676' }}>✓ Completed ({completedParcels.length})</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{collectedUnits} units collected</div>
          </div>
          <div className="table-wrap"><table>
            <thead><tr><th>Date</th><th>Product</th><th>ASIN</th><th>Units</th><th>Shipment</th></tr></thead>
            <tbody>{completedParcels.map(p => {
              const linked = localShipments.find(s => s.id === p.shipment_id);
              return <tr key={p.id} style={{ opacity: 0.7 }}>
                <td style={{ fontSize: 12 }}>{formatShortDate(p.created_at)}</td>
                <td style={{ fontWeight: 600 }}>{p.product_name}</td>
                <td className="mono" style={{ fontSize: 12 }}>{p.asin || '—'}</td>
                <td className="mono">{p.qty_received || p.quantity}</td>
                <td className="mono" style={{ fontSize: 12, color: 'var(--cyan)' }}>{linked?.shipment_id || '—'}</td>
              </tr>;
            })}</tbody>
          </table></div>
        </div>
      )}
      {/* Partial Prep Modal */}
      {partialPrepItem && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
        <div className="card" style={{ width: 420, maxWidth: "95vw", padding: 28 }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Log Prep</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>{partialPrepItem.product_name}</div>
          <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
            <div style={{ flex: 1, padding: 12, background: "var(--bg-primary)", borderRadius: 8, textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>RECEIVED</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--cyan)" }}>{partialPrepItem.qty_received || partialPrepItem.quantity}</div>
            </div>
            <div style={{ flex: 1, padding: 12, background: "var(--bg-primary)", borderRadius: 8, textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>TOTAL ORDERED</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>{partialPrepItem.quantity}</div>
            </div>
          </div>
          <div><label className="input-label">How many are you prepping now?</label>
          <input className="input" type="number" min="1" max={partialPrepItem.qty_received || partialPrepItem.quantity} value={partialPrepQty} onChange={e => setPartialPrepQty(e.target.value)} /></div>
          {(() => {
            const prepping = parseInt(partialPrepQty) || 0;
            const received = parseInt(partialPrepItem.qty_received) || parseInt(partialPrepItem.quantity) || 0;
            const totalOrdered = parseInt(partialPrepItem.quantity) || 0;
            const remainingToPrep = received - prepping;
            const stillInTransit = totalOrdered - received;
            return prepping > 0 && (remainingToPrep > 0 || stillInTransit > 0) ? (
              <div style={{ marginTop: 10, padding: 10, background: "rgba(255,171,0,0.08)", border: "1px solid rgba(255,171,0,0.2)", borderRadius: 8, fontSize: 12 }}>
                {remainingToPrep > 0 && <div style={{ color: "var(--amber)" }}>⚠ {remainingToPrep} units received but not prepped — will stay as Delivered</div>}
                {stillInTransit > 0 && <div style={{ color: "var(--purple)", marginTop: remainingToPrep > 0 ? 4 : 0 }}>📦 {stillInTransit} units still In Transit — new row will be created</div>}
              </div>
            ) : null;
          })()}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
            <button className="btn btn-secondary" onClick={() => { setPartialPrepItem(null); setSaving(false); }}>Cancel</button>
            <button className="btn btn-primary" style={{ background: "var(--green)", color: "#000" }} onClick={async () => {
              const qtyPrepping = parseInt(partialPrepQty) || 1;
              const qtyReceived = parseInt(partialPrepItem.qty_received) || parseInt(partialPrepItem.quantity) || 1;
              const totalOrdered = parseInt(partialPrepItem.quantity) || 1;
              const remainingReceived = qtyReceived - qtyPrepping;
              const stillInTransit = totalOrdered - qtyReceived;
              // Update original row as prepped with the prepping qty
              await fetch(`${SUPABASE_URL}/rest/v1/parcels?id=eq.${partialPrepItem.id}`, { method: "PATCH", headers: { ...supabase.headers(token), "Content-Type": "application/json" }, body: JSON.stringify({ ...editData, quantity: qtyPrepping, qty_received: qtyPrepping, status: "prepped" }) });
              setLocalParcels(prev => prev.map(p => p.id === partialPrepItem.id ? { ...p, ...editData, quantity: qtyPrepping, qty_received: qtyPrepping, status: "prepped" } : p));
              // If some received units not being prepped yet, create a delivered row
              if (remainingReceived > 0) {
                await fetch(`${SUPABASE_URL}/rest/v1/parcels`, { method: "POST", headers: { ...supabase.headers(token), "Content-Type": "application/json", "Prefer": "return=representation" }, body: JSON.stringify({ product_name: partialPrepItem.product_name, asin: partialPrepItem.asin, sku: partialPrepItem.sku, supplier: partialPrepItem.supplier, quantity: remainingReceived, qty_received: remainingReceived, status: "delivered", user_id: client.id, date_added: partialPrepItem.date_added, tracking_number: partialPrepItem.tracking_number }) });
              }
              // If some units still in transit, create an in_transit row
              if (stillInTransit > 0) {
                await fetch(`${SUPABASE_URL}/rest/v1/parcels`, { method: "POST", headers: { ...supabase.headers(token), "Content-Type": "application/json", "Prefer": "return=representation" }, body: JSON.stringify({ product_name: partialPrepItem.product_name, asin: partialPrepItem.asin, sku: partialPrepItem.sku, supplier: partialPrepItem.supplier, quantity: stillInTransit, status: "in_transit", user_id: client.id, date_added: partialPrepItem.date_added, tracking_number: partialPrepItem.tracking_number }) });
              }
              const clientWebhook = client.discord_webhook || webhookUrl;
              if (clientWebhook) await sendDiscordNotification(clientWebhook, null, { title: "✅ PREPPED & READY", color: 0x00c853, fields: [{ name: "Product", value: partialPrepItem.product_name, inline: true }, { name: "Units Prepped", value: `${qtyPrepping}`, inline: true }, ...(remainingReceived > 0 ? [{ name: "Still To Prep", value: `${remainingReceived}`, inline: true }] : []), ...(stillInTransit > 0 ? [{ name: "Still In Transit", value: `${stillInTransit}`, inline: true }] : [])], footer: { text: client.full_name || client.email } });
              showToast("Saved!"); setPartialPrepItem(null); setEditingId(null); setSaving(false); onRefresh();
            }}>Confirm</button>
          </div>
        </div>
      </div>}
    </>
  );
}


// Admin - Client Liquidation Tab
async function lookupAsinTitle(asin) {
  try {
    const res = await fetch("https://cccsreyspmpwnfbmegwz.supabase.co/functions/v1/dynamic-endpoint", {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY },
      body: JSON.stringify({ asin })
    });
    const data = await res.json();
    if (data?.title) return data.title;
  } catch(e) {}
  return null;
}

// ── Google Sheets CSV URL for Panayiotis ──────────────────────────────────
const PANAYIOTIS_ID = "8deef97c-470b-42d1-bc14-6b69f10d6f28";
const PANAYIOTIS_SHEET_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQPiFYXDHT1LINku5one25hx1TeC6JojcE4bzDiT75Fthv1wNRYrWDaBludilvdCYQUPziU5k3bs_y-/pub?gid=1782424989&single=true&output=csv";

function parseCSV(text) {
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return [];

  // Parse a single CSV line respecting quoted fields
  function parseLine(line) {
    const vals = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i+1] === '"') { cur += '"'; i++; } // escaped quote
        else { inQ = !inQ; }
      } else if (ch === ',' && !inQ) {
        vals.push(cur.trim().replace(/^"|"$/g,""));
        cur = "";
      } else {
        cur += ch;
      }
    }
    vals.push(cur.trim().replace(/^"|"$/g,""));
    return vals;
  }

  const headers = parseLine(lines[0]);

  // Build a lookup: header name -> index (use LAST occurrence so duplicates handled)
  const headerIndex = {};
  headers.forEach((h, i) => { headerIndex[h.trim()] = i; });

  const results = [];
  for (let li = 1; li < lines.length; li++) {
    if (!lines[li].trim()) continue;
    const vals = parseLine(lines[li]);

    // Map by header name — immune to extra columns from unquoted commas in URLs
    const row = {};
    Object.entries(headerIndex).forEach(([h, i]) => {
      row[h] = (vals[i] || "").trim();
    });
    results.push(row);
  }
  return results;
}

function parseSheetDate(val) {
  if (!val || !val.trim()) return null;
  const v = val.trim();
  // DD/MM/YYYY or DD/MM/YY
  const parts = v.split("/");
  if (parts.length === 3) {
    let [d, m, y] = parts;
    if (y.length === 2) y = "20" + y;
    return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
  }
  return null;
}

function isYes(val) {
  return ["yes","YES","Yes","true","TRUE","1","Y","y"].includes((val || "").trim());
}

async function syncSheetToSupabase(token, showToast, onRefresh) {
  try {
    showToast("Syncing from Google Sheet...");
    const res = await fetch(PANAYIOTIS_SHEET_CSV);
    if (!res.ok) throw new Error("Could not fetch sheet");
    const text = await res.text();

    const rows = parseCSV(text).filter(r => r["Product Name"] && r["Product Name"].trim() && r["UID"] && r["UID"].trim());
    console.log(`Sheet rows: ${rows.length}`);
    if (rows.length > 0) {
      const sample = rows[0];
      console.log("Sample row keys:", Object.keys(sample));
      console.log("Sample payout:", sample["Payout"], "| paid:", sample["PAID"]);
    }

    const ah = { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };

    let inserted = 0, updated = 0, salesInserted = 0, salesUpdated = 0, salesFailed = 0;

    for (const row of rows) {
      const uid = row["UID"].trim();
      const delivered = isYes(row["Delivered"]);
      const dateDelivered = (row["Date Delivered"] || "").trim();
      const soldTicked = isYes(row["Sold"]);
      const rawSalePrice = (row["Sale price"] || "").trim();
      const salePrice = parseFloat(rawSalePrice.replace(/[^0-9.-]/g,"")) || 0;
      const hasSale = soldTicked && salePrice > 0;

      const stockPayload = {
        user_id: PANAYIOTIS_ID,
        sheet_uid: uid,
        product_name: (row["Product Name"] || "").trim() || null,
        asin: (row["ASIN"] || "").trim() || null,
        sku: (row["SKU"] || "").trim() || null,
        lpn_number: (row["LPN Number"] || "").trim() || null,
        condition: (row["Condition"] || "").trim() || null,
        received: delivered,
        listed: delivered && !soldTicked,
        qty_sold: soldTicked ? 1 : 0,
        date_added: parseSheetDate(row["Date"]) || null,
        date_received: parseSheetDate(dateDelivered) || null,
      };

      const checkRes = await fetch(
        `${SUPABASE_URL}/rest/v1/liquidation_stock?sheet_uid=eq.${encodeURIComponent(uid)}&user_id=eq.${PANAYIOTIS_ID}`,
        { headers: ah }
      );
      const existing = await checkRes.json();
      let stockId;

      if (Array.isArray(existing) && existing.length > 0) {
        stockId = existing[0].id;
        await fetch(`${SUPABASE_URL}/rest/v1/liquidation_stock?id=eq.${stockId}`, {
          method: "PATCH", headers: ah, body: JSON.stringify(stockPayload)
        });
        updated++;
      } else {
        const insRes = await fetch(`${SUPABASE_URL}/rest/v1/liquidation_stock`, {
          method: "POST", headers: { ...ah, "Prefer": "return=representation" },
          body: JSON.stringify({ ...stockPayload, quantity: 1 })
        });
        const insData = await insRes.json();
        if (!insRes.ok) { console.error("Stock insert failed:", uid, insData); continue; }
        stockId = Array.isArray(insData) ? insData[0]?.id : insData?.id;
        inserted++;
      }

      if (hasSale && stockId) {
        const n = s => parseFloat((s || "0").replace(/[^0-9.-]/g,"")) || 0;
        const ebayFees  = n(row["Ebay Fees"]);
        const shipping  = n(row["Shipping"]);
        const netSale   = n(row["Net Sale"]) || (salePrice - ebayFees - shipping);
        const dbhPct    = n(row["DBH %"]);
        const dbhFee    = n(row["DBH £"]);
        const fixedFee  = n(row["Fixed Fees"]) || 0.40;
        const payout    = n(row["Payout"]);
        const dateSold  = parseSheetDate(row["Date Sold"]) || parseSheetDate(row["Date listed"]) || null;
        const payoutDt  = parseSheetDate(row["Payout Date"]) || null;
        const paid      = isYes(row["PAID"]);

        console.log(`Sale: ${(row["Product Name"]||"").slice(0,30)} | sale=${salePrice} net=${netSale} payout=${payout} paid=${paid}`);

        const salePayload = {
          stock_id: stockId, user_id: PANAYIOTIS_ID,
          date_sold: dateSold, qty_sold: 1,
          sale_price: salePrice, ebay_fees: ebayFees, shipping: shipping,
          net_sale: netSale, dbh_pct: dbhPct, dbh_fee: dbhFee,
          fixed_fee: fixedFee, payout: payout,
          payout_date: payoutDt, paid: paid,
        };

        const sc = await fetch(
          `${SUPABASE_URL}/rest/v1/liquidation_sales?stock_id=eq.${stockId}&user_id=eq.${PANAYIOTIS_ID}`,
          { headers: ah }
        );
        const exSales = await sc.json();

        if (Array.isArray(exSales) && exSales.length > 0) {
          const upd = { ...salePayload };
          if (exSales[0].paid) delete upd.paid;
          const pr = await fetch(`${SUPABASE_URL}/rest/v1/liquidation_sales?id=eq.${exSales[0].id}`, {
            method: "PATCH", headers: ah, body: JSON.stringify(upd)
          });
          if (!pr.ok) { const e = await pr.json(); console.error("Sale update failed:", e); salesFailed++; }
          else salesUpdated++;
        } else {
          const pr = await fetch(`${SUPABASE_URL}/rest/v1/liquidation_sales`, {
            method: "POST", headers: { ...ah, "Prefer": "return=representation" },
            body: JSON.stringify(salePayload)
          });
          if (!pr.ok) { const e = await pr.json(); console.error("Sale insert failed:", e, "payload:", salePayload); salesFailed++; }
          else salesInserted++;
        }
      }
    }

    console.log(`Done: stock ${inserted} in / ${updated} up | sales ${salesInserted} in / ${salesUpdated} up / ${salesFailed} FAILED`);
    showToast(`Synced ${inserted + updated} items, ${salesInserted + salesUpdated} sales`);
    onRefresh();
  } catch (e) {
    console.error("Sync error:", e);
    showToast("Sync failed: " + e.message);
  }
}

function AdminClientLiquidation({ client, liquidation, token, showToast, onRefresh }) {
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [activeTab, setActiveTab] = useState("transit");
  const [sales, setSales] = useState([]);
  const [logSaleItem, setLogSaleItem] = useState(null);
  const [saleForm, setSaleForm] = useState({ date_sold: "", qty_sold: 1, sale_price: "", ebay_fees: "", shipping: "", fixed_fee: "0.40", ebay_order_id: "" });
  const [saleSaving, setSaleSaving] = useState(false);
  const [receiveItem, setReceiveItem] = useState(null);
  const [receiveQty, setReceiveQty] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [showAddStock, setShowAddStock] = useState(false);
  const [addStockForm, setAddStockForm] = useState({ product_name: "", asin: "", lpn_number: "", condition: "", quantity: 1, cog: "", sheet_uid: "" });
  const [addStockSaving, setAddStockSaving] = useState(false);
  const [adjustments, setAdjustments] = useState([]);
  const [adjForm, setAdjForm] = useState({ month: new Date().toISOString().slice(0, 7), type: "return", count: "", amount: "", description: "" });
  const [savingAdj, setSavingAdj] = useState(false);
  const [adjOpen, setAdjOpen] = useState(false);
  const isPanayiotis = client.id === PANAYIOTIS_ID;

  const ADJ_TYPES = {
    return: { label: "Return (£7.10 each)", auto: true },
    partial_refund: { label: "Partial Refund", auto: false },
    full_refund: { label: "Full Refund", auto: false },
    other: { label: "Other", auto: false }
  };

  // Compute the £ amount of a single adjustment row
  const adjAmount = (a) => {
    if (a.type === "return") return (a.count || 0) * RETURN_COST_PER_UNIT;
    return parseFloat(a.amount) || 0;
  };

  const loadAdjustments = async () => {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/liquidation_returns?user_id=eq.${client.id}&order=month.desc,created_at.desc`, { headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}` } });
      const data = await res.json();
      if (Array.isArray(data)) setAdjustments(data);
    } catch (e) { console.error(e); }
  };

  const saveAdjustment = async () => {
    const isReturn = adjForm.type === "return";
    if (!adjForm.month) return;
    if (isReturn && adjForm.count === "") return;
    if (!isReturn && adjForm.amount === "") return;
    setSavingAdj(true);
    const body = {
      user_id: client.id,
      month: adjForm.month,
      type: adjForm.type,
      count: isReturn ? (parseInt(adjForm.count) || 0) : 0,
      amount: isReturn ? 0 : (parseFloat(adjForm.amount) || 0),
      description: adjForm.description || null
    };
    try {
      if (adjForm.id) {
        await fetch(`${SUPABASE_URL}/rest/v1/liquidation_returns?id=eq.${adjForm.id}`, {
          method: "PATCH",
          headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
      } else {
        await fetch(`${SUPABASE_URL}/rest/v1/liquidation_returns`, {
          method: "POST",
          headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
      }
      showToast("Saved!");
      setAdjForm({ month: new Date().toISOString().slice(0, 7), type: "return", count: "", amount: "", description: "" });
      loadAdjustments();
    } catch (e) { showToast("Error saving"); }
    setSavingAdj(false);
  };

  const deleteAdjustment = async (id) => {
    if (!confirm("Delete this entry?")) return;
    await fetch(`${SUPABASE_URL}/rest/v1/liquidation_returns?id=eq.${id}`, { method: "DELETE", headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}` } });
    showToast("Deleted!");
    loadAdjustments();
  };

  const editAdjustment = (a) => {
    setAdjForm({ id: a.id, month: a.month, type: a.type || "return", count: (a.count || 0).toString(), amount: (a.amount || 0).toString(), description: a.description || "" });
    setAdjOpen(true);
  };

  const adjTotal = adjustments.reduce((s, a) => s + adjAmount(a), 0);

  const deleteStockItem = async (item) => {
    const label = item.product_name || item.dbh_sku || "this item";
    if (!window.confirm(`Delete "${label}"?\n\nThis will permanently remove it (and any sales linked to it) from ${client.full_name || client.email}'s stock.`)) return;
    try {
      const ah = { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}` };
      await fetch(`${SUPABASE_URL}/rest/v1/liquidation_sales?stock_id=eq.${item.id}`, { method: "DELETE", headers: ah });
      const res = await fetch(`${SUPABASE_URL}/rest/v1/liquidation_stock?id=eq.${item.id}`, { method: "DELETE", headers: ah });
      if (res.ok) {
        showToast(`Deleted ${item.dbh_sku || label}`);
        onRefresh();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast("Delete failed: " + (err.message || res.status));
      }
    } catch (e) { showToast("Delete error: " + e.message); }
  };

  const submitAddStock = async () => {
    if (!addStockForm.product_name) { showToast("Product name is required"); return; }
    setAddStockSaving(true);
    try {
      const clientName = (client.full_name || client.email || "").split(" ")[0].toUpperCase().slice(0, 6);
      const existing = await fetch(`${SUPABASE_URL}/rest/v1/liquidation_stock?user_id=eq.${client.id}&select=dbh_sku&order=created_at.desc&limit=1`, { headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}` } }).then(r => r.json());
      const lastNum = existing?.[0]?.dbh_sku ? parseInt(existing[0].dbh_sku.split("-").pop()) || 0 : 0;
      const today = new Date().toISOString().split("T")[0].replace(/-/g, "").slice(2);
      const dbh_sku = `${today}-${clientName}-${String(lastNum + 1).padStart(3, "0")}`;
      const payload = {
        product_name: addStockForm.product_name,
        asin: addStockForm.asin || null,
        lpn_number: addStockForm.lpn_number || null,
        condition: addStockForm.condition || null,
        quantity: parseInt(addStockForm.quantity) || 1,
        cog: addStockForm.cog ? parseFloat(addStockForm.cog) : null,
        sheet_uid: addStockForm.sheet_uid ? addStockForm.sheet_uid.trim() : null,
        user_id: client.id,
        dbh_sku,
        received: false,
        listed: false,
        date_added: new Date().toISOString().split("T")[0]
      };
      const res = await fetch(`${SUPABASE_URL}/rest/v1/liquidation_stock`, {
        method: "POST",
        headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}`, "Content-Type": "application/json", "Prefer": "return=representation" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast(`Stock added — ${dbh_sku}`);
        setShowAddStock(false);
        setAddStockForm({ product_name: "", asin: "", lpn_number: "", condition: "", quantity: 1, cog: "", sheet_uid: "" });
        onRefresh();
      } else {
        const err = await res.json();
        showToast("Error: " + (err.message || "Failed to add stock"));
      }
    } catch (e) { showToast("Error: " + e.message); }
    setAddStockSaving(false);
  };

  // Print DBH SKU label (50x25mm) — opens a pop-up print window
  const printLabel = (item) => {
    if (!item.dbh_sku) { showToast("No DBH SKU on this item"); return; }
    const sku = item.dbh_sku;
    const productName = (item.product_name || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const clientName = (client.full_name || client.email || "").split(" ")[0].toUpperCase();
    const condition = (item.condition || "").toUpperCase();
    const html = `<!DOCTYPE html><html><head><title>Label ${sku}</title>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
<style>
  @page { size: 50mm 25mm; margin: 0; }
  html, body { margin: 0; padding: 0; background: white; font-family: 'Helvetica Neue', Arial, sans-serif; }
  .label { width: 50mm; height: 25mm; box-sizing: border-box; padding: 1mm 1.5mm; display: flex; flex-direction: column; justify-content: space-between; position: relative; page-break-after: always; }
  .client { position: absolute; top: 0.8mm; right: 1.5mm; font-size: 1.8mm; color: #1F4E78; font-weight: 700; text-transform: uppercase; }
  .condition { position: absolute; top: 0.8mm; left: 1.5mm; font-size: 1.8mm; color: #C00000; font-weight: 700; text-transform: uppercase; }
  .barcode-wrap { text-align: center; margin-top: 0.5mm; }
  .barcode-wrap svg { width: 100%; height: 8mm; }
  .sku { text-align: center; font-size: 3.4mm; font-weight: 700; letter-spacing: 0.08mm; color: #000; margin-top: 0.5mm; }
  .product { font-size: 1.8mm; color: #333; text-align: center; line-height: 1.1; overflow: hidden; max-height: 4mm; }
  .instruction { margin: 16px; font-family: system-ui; color: #333; font-size: 13px; }
  @media print { .instruction { display: none; } }
<\/style></head><body>
<div class="instruction">Press <b>Cmd+P</b> (or Ctrl+P). In the print dialogue, select paper size <b>50mm x 25mm</b> (or "Custom: 50x25mm"). Ensure margins are "None". Scale should be 100%. Uncheck "Headers and footers".</div>
<div class="label">
  ${condition ? `<div class="condition">${condition}</div>` : ''}
  <div class="client">${clientName}</div>
  <div class="barcode-wrap"><svg id="bc"></svg></div>
  <div class="sku">${sku}</div>
  <div class="product">${productName}</div>
</div>
<script>
  JsBarcode('#bc', '${sku}', { format: 'CODE128', displayValue: false, margin: 0, height: 28, width: 1.2 });
  setTimeout(() => window.print(), 400);
<\/script></body></html>`;
    const w = window.open("", "_blank", "width=500,height=400");
    if (!w) { showToast("Pop-up blocked — allow pop-ups for this site"); return; }
    w.document.write(html);
    w.document.close();
  };

  // Auto-sync disabled - manual only via Sync Now button
  useEffect(() => {
    if (!isPanayiotis) return;
  }, [isPanayiotis, token]);

  useEffect(() => { fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.discord_webhook_url`, { headers: supabase.headers(token) }).then(r => r.json()).then(d => { if (d?.[0]?.value) setWebhookUrl(d[0].value); }); }, []);
  useEffect(() => { loadSales(); loadAdjustments(); }, [client.id]);

  const loadSales = async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/liquidation_sales?user_id=eq.${client.id}&order=date_sold.desc`, { headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}` } });
    const data = await res.json();
    if (Array.isArray(data)) setSales(data);
  };

  const calcSale = (form, client) => {
    const sale = parseFloat(form.sale_price) || 0;
    const ebay = parseFloat(form.ebay_fees) || 0;
    const ship = parseFloat(form.shipping) || 0;
    const fixed = parseFloat(form.fixed_fee) || 0.40;
    const net = sale - ebay - ship;
    const standardRate = client?.liq_commission_standard != null ? parseFloat(client.liq_commission_standard) : 15;
    const highRate = client?.liq_commission_high != null ? parseFloat(client.liq_commission_high) : 10;
    const pct = (net >= 200 ? highRate : standardRate) / 100;
    const fee = net * pct;
    const payout = net - fee - fixed;
    return { net, pct, fee, fixed, payout };
  };

  const openLogSale = (item) => {
    setLogSaleItem(item);
    const today = new Date().toISOString().split('T')[0];
    setSaleForm({ date_sold: today, qty_sold: 1, sale_price: "", ebay_fees: "", shipping: "", fixed_fee: "0.40", ebay_order_id: "" });
  };

  const submitSale = async () => {
    if (!saleForm.date_sold || !saleForm.sale_price) { showToast("Enter date and sale price"); return; }
    setSaleSaving(true);
    const c = calcSale(saleForm, client);
    const payoutDate = getPayoutDate(saleForm.date_sold);
    const payload = {
      stock_id: logSaleItem.id, user_id: client.id, date_sold: saleForm.date_sold,
      qty_sold: parseInt(saleForm.qty_sold) || 1, sale_price: parseFloat(saleForm.sale_price),
      ebay_fees: parseFloat(saleForm.ebay_fees) || 0, shipping: parseFloat(saleForm.shipping) || 0,
      net_sale: parseFloat(c.net.toFixed(2)), dbh_pct: parseFloat((c.pct * 100).toFixed(2)),
      dbh_fee: parseFloat(c.fee.toFixed(2)), fixed_fee: parseFloat(saleForm.fixed_fee) || 0.40,
      payout: parseFloat(c.payout.toFixed(2)), payout_date: payoutDate.toISOString().split('T')[0], paid: false,
      ebay_order_id: saleForm.ebay_order_id || null,
      logged_at: new Date().toISOString(),
      product_name_snapshot: logSaleItem.product_name || null,
      asin_snapshot: logSaleItem.asin || null,
      dbh_sku_snapshot: logSaleItem.dbh_sku || null
    };
    await fetch(`${SUPABASE_URL}/rest/v1/liquidation_sales`, {
      method: "POST", headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}`, "Content-Type": "application/json", "Prefer": "return=representation" },
      body: JSON.stringify(payload)
    });
    const newQtySold = (logSaleItem.qty_sold || 0) + (parseInt(saleForm.qty_sold) || 1);
    await fetch(`${SUPABASE_URL}/rest/v1/liquidation_stock?id=eq.${logSaleItem.id}`, {
      method: "PATCH", headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ qty_sold: newQtySold })
    });
    const hw = client.discord_webhook || webhookUrl;
    if (hw) await sendDiscordNotification(hw, null, { title: "💰 ITEM SOLD", color: 0x22c55e, fields: [{ name: "Product", value: logSaleItem.product_name, inline: false }, { name: "Sale Price", value: `£${parseFloat(saleForm.sale_price).toFixed(2)}`, inline: true }, { name: "Qty Sold", value: `${saleForm.qty_sold}`, inline: true }, { name: "Your Payout", value: `£${c.payout.toFixed(2)}`, inline: true }, { name: "Payout Date", value: getPayoutDate(saleForm.date_sold).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }), inline: true }], footer: { text: "Payout at end of following month to allow for returns" } });
    await loadSales(); onRefresh(); showToast("Sale logged!"); setLogSaleItem(null); setSaleSaving(false);
  };

  const pending = liquidation.filter(l => !l.sale_price).length;
  const sold = liquidation.filter(l => l.sale_price).length;
  const totalPayout = liquidation.filter(l => l.sale_price).reduce((sum, l) => sum + calculatePayout(l).payout, 0);

  const startEdit = item => {
    setEditingId(item.id);
    setEditData({ product_name: item.product_name || "", asin: item.asin || "", sku: item.sku || "", lpn_number: item.lpn_number || "", condition: item.condition || "", listed: item.listed || false, sale_price: item.sale_price || "", date_sold: item.date_sold || "", ebay_fees: item.ebay_fees || "", shipping: item.shipping || "", paid: item.paid || false, quantity: item.quantity || 1, cog: item.cog || "", received: item.received || false });
  };

  const saveEdit = async () => {
    setSaving(true);
    const oldItem = liquidation.find(i => i.id === editingId);
    const dataToSave = { 
      ...editData,
      product_name: editData.product_name || null,
      asin: editData.asin || null,
      sku: editData.sku || null,
      sale_price: editData.sale_price ? parseFloat(editData.sale_price) : null, 
      ebay_fees: editData.ebay_fees ? parseFloat(editData.ebay_fees) : null, 
      shipping: editData.shipping ? parseFloat(editData.shipping) : null,
      date_sold: editData.date_sold || null,
      quantity: parseInt(editData.quantity) || 1,
      cog: editData.cog ? parseFloat(editData.cog) : null,
      received: editData.received || false
    };
    if (dataToSave.sale_price && !dataToSave.date_sold) dataToSave.date_sold = new Date().toISOString().split('T')[0];
    await fetch(`${SUPABASE_URL}/rest/v1/liquidation_stock?id=eq.${editingId}`, { method: "PATCH", headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}`, "Content-Type": "application/json", "Prefer": "return=representation" }, body: JSON.stringify(dataToSave) });
    if (dataToSave.date_sold && !oldItem?.date_sold) {
      const clientWebhook = client.discord_webhook || webhookUrl;
      if (clientWebhook) {
        const payout = calculatePayout({ ...oldItem, ...dataToSave });
        const payoutDate = getPayoutDate(dataToSave.date_sold);
        await sendDiscordNotification(clientWebhook, null, {
          title: "💰 SOLD",
          color: 0x22c55e,
          fields: [
            { name: "Product", value: oldItem?.product_name || "Unknown", inline: true },
            { name: "Payout", value: `£${payout.payout.toFixed(2)}`, inline: true },
            { name: "Payout Date", value: payoutDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }), inline: true }
          ],
          footer: { text: client.full_name || client.email }
        });
      }
    }
    showToast("Saved!"); setEditingId(null); onRefresh(); setSaving(false);
  };

  const [noteEditId, setNoteEditId] = useState(null);
  const [noteDraft, setNoteDraft] = useState("");
  const saveNote = async (id, value) => {
    setNoteEditId(null);
    await fetch(`${SUPABASE_URL}/rest/v1/liquidation_stock?id=eq.${id}`, { method: "PATCH", headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ comments: value || null }) });
    showToast("Note saved!");
    onRefresh();
  };

  const transitItems = liquidation.filter(i => !i.received);
  const listedItems = liquidation.filter(i => i.received && ((i.quantity || 1) - (i.qty_sold || 0)) > 0);
  const totalSalesPayout = sales.reduce((s, r) => s + (parseFloat(r.payout) || 0), 0);
  const sf = saleForm, sc = calcSale(sf, client);

  return (
    <>
      {/* Google Sheet sync removed — stock now comes via removal CSV upload */}

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 20 }}>
        <div className="card stat-card liquidation"><div className="card-title">In Transit</div><div className="stat-value" style={{ color: "var(--amber)" }}>{transitItems.length}</div></div>
        <div className="card stat-card liquidation"><div className="card-title">Listed</div><div className="stat-value" style={{ color: "var(--cyan)" }}>{listedItems.length}</div></div>
        <div className="card stat-card liquidation"><div className="card-title">Total Payouts</div><div className="stat-value" style={{ color: "var(--orange)" }}>£{totalSalesPayout.toFixed(2)}</div></div>
      </div>

      {/* Adjustments / Deductions */}
      <div className="card" style={{ marginBottom: 20, background: "linear-gradient(135deg,rgba(255,145,0,0.05),transparent)", borderColor: "rgba(255,145,0,0.2)", padding: adjOpen ? undefined : "14px 18px" }}>
        <div onClick={() => setAdjOpen(o => !o)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: "var(--orange)" }}>💷 Adjustments & Deductions</span>
            {adjTotal > 0 && (
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                {adjustments.length} entr{adjustments.length === 1 ? "y" : "ies"} • <span style={{ color: "var(--red)", fontWeight: 700 }}>−£{adjTotal.toFixed(2)}</span>
              </span>
            )}
          </div>
          <span style={{ fontSize: 18, color: "var(--text-muted)", transition: "transform 0.15s", transform: adjOpen ? "rotate(90deg)" : "rotate(0deg)" }}>▸</span>
        </div>
        {adjOpen && (
          <>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>Log returns, refunds and other costs. Each comes off the chosen month's payout. Returns auto-cost £{RETURN_COST_PER_UNIT.toFixed(2)} each (label out + back).</div>
            {/* Form */}
            <div style={{ display: "flex", gap: 8, marginTop: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div className="input-group" style={{ flex: "1 1 150px", marginBottom: 0 }}>
                <label className="input-label">Type</label>
                <select className="input" value={adjForm.type} onChange={e => setAdjForm({ ...adjForm, type: e.target.value })}>
                  {Object.entries(ADJ_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div className="input-group" style={{ flex: "1 1 140px", marginBottom: 0 }}>
                <label className="input-label">Month</label>
                <input className="input" type="month" style={{ colorScheme: "dark" }} value={adjForm.month} onChange={e => setAdjForm({ ...adjForm, month: e.target.value })} />
              </div>
              {adjForm.type === "return" ? (
                <div className="input-group" style={{ flex: "1 1 120px", marginBottom: 0 }}>
                  <label className="input-label">Qty Returns</label>
                  <input className="input" type="number" min="0" placeholder="0" value={adjForm.count} onChange={e => setAdjForm({ ...adjForm, count: e.target.value })} />
                </div>
              ) : (
                <div className="input-group" style={{ flex: "1 1 120px", marginBottom: 0 }}>
                  <label className="input-label">Amount (£)</label>
                  <input className="input" type="number" min="0" step="0.01" placeholder="0.00" value={adjForm.amount} onChange={e => setAdjForm({ ...adjForm, amount: e.target.value })} />
                </div>
              )}
              <div className="input-group" style={{ flex: "2 1 200px", marginBottom: 0 }}>
                <label className="input-label">Note (optional)</label>
                <input className="input" placeholder="e.g. eBay order #123" value={adjForm.description} onChange={e => setAdjForm({ ...adjForm, description: e.target.value })} />
              </div>
              <button className="btn btn-primary liquidation" onClick={saveAdjustment} disabled={savingAdj || !adjForm.month || (adjForm.type === "return" ? adjForm.count === "" : adjForm.amount === "")}>
                {savingAdj ? "Saving..." : (adjForm.id ? "Update" : "Add")}
              </button>
              {adjForm.id && <button onClick={() => setAdjForm({ month: new Date().toISOString().slice(0, 7), type: "return", count: "", amount: "", description: "" })} style={{ padding: "10px 14px", background: "transparent", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-secondary)", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>}
            </div>
            {/* Live preview of this entry's £ */}
            {adjForm.type === "return" && adjForm.count !== "" && (
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>= −£{((parseInt(adjForm.count) || 0) * RETURN_COST_PER_UNIT).toFixed(2)} ({adjForm.count} × £{RETURN_COST_PER_UNIT.toFixed(2)})</div>
            )}
            {/* History grouped by month */}
            {adjustments.length > 0 && (() => {
              const byMonth = adjustments.reduce((acc, a) => { (acc[a.month] = acc[a.month] || []).push(a); return acc; }, {});
              const months = Object.keys(byMonth).sort().reverse();
              return (
                <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>History</div>
                  {months.map(mk => {
                    const [y, m] = mk.split("-");
                    const monthLabel = y && m ? new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" }) : mk;
                    const rows = byMonth[mk];
                    const monthTotal = rows.reduce((s, a) => s + adjAmount(a), 0);
                    return (
                      <div key={mk} style={{ marginBottom: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
                          <span>{monthLabel}</span>
                          <span style={{ color: "var(--red)" }}>−£{monthTotal.toFixed(2)}</span>
                        </div>
                        {rows.map(a => {
                          const typeLabel = (ADJ_TYPES[a.type] || ADJ_TYPES.other).label.replace(" (£7.10 each)", "");
                          const detail = a.type === "return" ? `${a.count} return${a.count === 1 ? "" : "s"}` : typeLabel;
                          return (
                            <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0 6px 12px", borderBottom: "1px solid var(--border)" }}>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>{a.type === "return" ? "📦 Return" : typeLabel}</div>
                                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{detail}{a.description ? ` — ${a.description}` : ""}</div>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span className="mono" style={{ fontWeight: 700, color: "var(--red)" }}>−£{adjAmount(a).toFixed(2)}</span>
                                <button className="btn-icon" onClick={() => editAdjustment(a)} title="Edit"><Icons.Edit /></button>
                                <button className="btn-icon btn-danger" onClick={() => deleteAdjustment(a.id)} title="Delete"><Icons.Trash /></button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
        {[["transit","⏳ In Transit"],["listed","📦 Listed"],["sales","💰 Sales"],["removals","📋 Removals"]].map(([k,l]) =>
          <button key={k} onClick={() => setActiveTab(k)} style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid", fontSize: 13, fontWeight: 600, cursor: "pointer", background: activeTab === k ? "var(--orange)" : "transparent", color: activeTab === k ? "#000" : "var(--text-secondary)", borderColor: activeTab === k ? "var(--orange)" : "var(--border)" }}>{l}</button>
        )}
        <button onClick={() => setShowAddStock(true)} style={{ marginLeft: "auto", padding: "8px 18px", borderRadius: 8, border: "1px solid var(--cyan)", fontSize: 13, fontWeight: 700, cursor: "pointer", background: "rgba(0,229,255,0.1)", color: "var(--cyan)" }}>+ Add Stock</button>
      </div>

      {/* In Transit Tab */}
      {activeTab === "transit" && <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {transitItems.length === 0 ? <div className="empty-state"><Icons.Box /><p>No items in transit.</p></div> :
        <div className="table-wrap"><table style={{ width: "100%", tableLayout: "fixed" }}>
          <thead><tr><th style={{ width: 120 }}>DBH SKU</th><th style={{ width: 120 }}>UID</th><th>Product</th><th>LPN</th><th>Qty</th><th>COG</th><th>Condition</th><th></th></tr></thead>
          <tbody>{transitItems.map(item => {
            const isEdit = editingId === item.id, data = isEdit ? editData : item;
            return <tr key={item.id} className={isEdit ? "edit-row" : ""}>
              <td className="mono" style={{ fontSize: 11, fontWeight: 600, color: "var(--orange)" }}>{item.dbh_sku || "—"}</td>
              <td style={{ fontWeight: 600 }}>{isEdit ? <div style={{ display:"flex", flexDirection:"column", gap:4 }}><input className="inline-input" style={{ width: 160 }} placeholder="Product name" value={data.product_name} onChange={e => setEditData({ ...editData, product_name: e.target.value })} /><input className="inline-input" style={{ width: 120 }} placeholder="ASIN" value={data.asin} onChange={e => setEditData({ ...editData, asin: e.target.value })} onBlur={async e => { const asin = e.target.value.trim(); if (asin && asin.length >= 10) { showToast("Looking up product..."); const title = await lookupAsinTitle(asin); if (title) { setEditData(prev => ({ ...prev, product_name: title })); showToast("Title found!"); } } }} /></div> : <div>{item.product_name}<div style={{ fontSize: 11, color: "var(--text-muted)" }}>{item.asin}</div>{noteEditId === item.id ? <textarea autoFocus className="inline-input" style={{ width: 200, marginTop: 4, fontSize: 11, minHeight: 34, resize: "vertical" }} value={noteDraft} onChange={e => setNoteDraft(e.target.value)} onBlur={() => saveNote(item.id, noteDraft)} /> : <div onClick={() => { setNoteEditId(item.id); setNoteDraft(item.comments || ""); }} style={{ marginTop: 4, fontSize: 11, cursor: "pointer", color: item.comments ? "var(--cyan)" : "var(--text-muted)", fontStyle: item.comments ? "normal" : "italic" }}>{item.comments ? "📝 " + item.comments : "+ note"}</div>}</div>}</td>
              <td>{isEdit ? <input className="inline-input" style={{ width: 80 }} value={data.lpn_number} onChange={e => setEditData({ ...editData, lpn_number: e.target.value })} /> : <span className="mono" style={{ fontSize: 12 }}>{item.lpn_number || "—"}</span>}</td>
              <td>{isEdit ? <input type="number" min="1" className="inline-input" style={{ width: 55 }} value={data.quantity} onChange={e => setEditData({ ...editData, quantity: e.target.value })} /> : <span className="mono">{item.quantity || 1}</span>}</td>
              <td>{isEdit ? <input type="number" step="0.01" className="inline-input" style={{ width: 65 }} value={data.cog} onChange={e => setEditData({ ...editData, cog: e.target.value })} /> : (item.cog ? <span className="mono" style={{ color: "var(--orange)" }}>£{parseFloat(item.cog).toFixed(2)}</span> : "—")}</td>
              <td>{isEdit ? <select className="inline-select" style={{ width: 80 }} value={data.condition} onChange={e => setEditData({ ...editData, condition: e.target.value })}><option value="">—</option><option>New</option><option>Open Box</option><option>Used</option><option>Like New</option><option>Good</option><option>Fair</option><option>Poor</option></select> : <span style={{ fontSize: 12 }}>{item.condition || "—"}</span>}</td>
              <td>
                {isEdit ? <div style={{ display: "flex", gap: 4 }}><button className="btn-icon" onClick={saveEdit} disabled={saving}><Icons.Save /></button><button className="btn-icon btn-danger" onClick={() => setEditingId(null)}><Icons.X /></button></div>
                : <div style={{ display: "flex", gap: 4 }}>
                    <button className="btn-icon" onClick={() => startEdit(item)}><Icons.Edit /></button>
                    <button title="Print DBH SKU label" onClick={() => printLabel(item)} style={{ padding: "4px 8px", background: "transparent", border: "1px solid var(--border)", color: "var(--text-secondary)", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>🖨 Label</button>
                    <button style={{ padding: "4px 10px", background: "var(--green)", color: "#000", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }} onClick={() => { setReceiveItem(item); setReceiveQty(String(item.quantity || 1)); }}>✓ Received</button>
                    <button title="Delete item" className="btn-icon btn-danger" onClick={() => deleteStockItem(item)}><Icons.Trash /></button>
                  </div>}
              </td>
            </tr>;
          })}</tbody>
        </table></div>}
      </div>}

      {/* Listed Tab */}
      {activeTab === "listed" && <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {listedItems.length === 0 ? <div className="empty-state"><Icons.Box /><p>No listed items.</p></div> :
        <div className="table-wrap"><table style={{ width: "100%", tableLayout: "fixed" }}>
          <thead><tr><th style={{ width: 120 }}>DBH SKU</th><th style={{ width: 120 }}>UID</th><th>Product</th><th>LPN</th><th>Qty Total</th><th>Qty Sold</th><th>Remaining</th><th>COG</th><th>Condition</th><th></th></tr></thead>
          <tbody>{listedItems.map(item => {
            const isEdit = editingId === item.id, data = isEdit ? editData : item;
            const remaining = (item.quantity || 1) - (item.qty_sold || 0);
            return <tr key={item.id} className={isEdit ? "edit-row" : ""}>
              <td className="mono" style={{ fontSize: 11, fontWeight: 600, color: "var(--orange)" }}>{item.dbh_sku || "—"}</td>
              <td style={{ fontWeight: 600 }}>{isEdit ? <div style={{ display:"flex", flexDirection:"column", gap:4 }}><input className="inline-input" style={{ width: 160 }} placeholder="Product name" value={data.product_name} onChange={e => setEditData({ ...editData, product_name: e.target.value })} /><input className="inline-input" style={{ width: 120 }} placeholder="ASIN" value={data.asin} onChange={e => setEditData({ ...editData, asin: e.target.value })} onBlur={async e => { const asin = e.target.value.trim(); if (asin && asin.length >= 10) { showToast("Looking up product..."); const title = await lookupAsinTitle(asin); if (title) { setEditData(prev => ({ ...prev, product_name: title })); showToast("Title found!"); } } }} /></div> : <div>{item.product_name}<div style={{ fontSize: 11, color: "var(--text-muted)" }}>{item.asin}</div>{noteEditId === item.id ? <textarea autoFocus className="inline-input" style={{ width: 200, marginTop: 4, fontSize: 11, minHeight: 34, resize: "vertical" }} value={noteDraft} onChange={e => setNoteDraft(e.target.value)} onBlur={() => saveNote(item.id, noteDraft)} /> : <div onClick={() => { setNoteEditId(item.id); setNoteDraft(item.comments || ""); }} style={{ marginTop: 4, fontSize: 11, cursor: "pointer", color: item.comments ? "var(--cyan)" : "var(--text-muted)", fontStyle: item.comments ? "normal" : "italic" }}>{item.comments ? "📝 " + item.comments : "+ note"}</div>}</div>}</td>
              <td>{isEdit ? <input className="inline-input" style={{ width: 80 }} value={data.lpn_number} onChange={e => setEditData({ ...editData, lpn_number: e.target.value })} /> : <span className="mono" style={{ fontSize: 12 }}>{item.lpn_number || "—"}</span>}</td>
              <td>{isEdit ? <input type="number" min="1" className="inline-input" style={{ width: 55 }} value={data.quantity} onChange={e => setEditData({ ...editData, quantity: e.target.value })} /> : <span className="mono">{item.quantity || 1}</span>}</td>
              <td><span className="mono" style={{ color: "var(--green)" }}>{item.qty_sold || 0}</span></td>
              <td><span className="mono" style={{ color: remaining <= 0 ? "var(--red)" : "var(--text-primary)", fontWeight: 700 }}>{remaining}</span></td>
              <td>{isEdit ? <input type="number" step="0.01" className="inline-input" style={{ width: 65 }} value={data.cog} onChange={e => setEditData({ ...editData, cog: e.target.value })} /> : (item.cog ? <span className="mono" style={{ color: "var(--orange)" }}>£{parseFloat(item.cog).toFixed(2)}</span> : "—")}</td>
              <td>{isEdit ? <select className="inline-select" style={{ width: 80 }} value={data.condition} onChange={e => setEditData({ ...editData, condition: e.target.value })}><option value="">—</option><option>New</option><option>Open Box</option><option>Used</option><option>Like New</option><option>Good</option><option>Fair</option><option>Poor</option></select> : <span style={{ fontSize: 12 }}>{item.condition || "—"}</span>}</td>
              <td>
                {isEdit ? <div style={{ display: "flex", gap: 4 }}><button className="btn-icon" onClick={saveEdit} disabled={saving}><Icons.Save /></button><button className="btn-icon btn-danger" onClick={() => setEditingId(null)}><Icons.X /></button></div>
                : <div style={{ display: "flex", gap: 4 }}>
                    <button className="btn-icon" onClick={() => startEdit(item)}><Icons.Edit /></button>
                    <button title="Print DBH SKU label" onClick={() => printLabel(item)} style={{ padding: "4px 8px", background: "transparent", border: "1px solid var(--border)", color: "var(--text-secondary)", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>🖨 Label</button>
                    {remaining > 0 && <button style={{ padding: "4px 10px", background: "var(--orange)", color: "#000", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }} onClick={() => openLogSale(item)}>+ Sale</button>}
                    <button title="Delete item" className="btn-icon btn-danger" onClick={() => deleteStockItem(item)}><Icons.Trash /></button>
                  </div>}
              </td>
            </tr>;
          })}</tbody>
        </table></div>}
      </div>}

      {/* Sales Tab */}
      {activeTab === "sales" && (() => {
        // Build pending payout summary — grouped by MONTH (one payout per calendar month)
        const unpaidSales = sales.filter(s => !s.paid && s.payout_date);
        const payoutGroups = unpaidSales.reduce((acc, s) => {
          // bucket by YYYY-MM of the payout_date
          const monthKey = (s.payout_date || "").slice(0, 7); // "2026-06"
          if (!acc[monthKey]) acc[monthKey] = { total: 0, count: 0, dates: new Set(), sales: [] };
          acc[monthKey].total += parseFloat(s.payout) || 0;
          acc[monthKey].count += 1;
          acc[monthKey].dates.add(s.payout_date);
          acc[monthKey].sales.push(s);
          return acc;
        }, {});
        const pendingMonths = Object.keys(payoutGroups).sort();
        return <>
          {pendingMonths.length > 0 && <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Pending Payouts</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {pendingMonths.map(monthKey => {
                const grp = payoutGroups[monthKey];
                const [y, m] = monthKey.split("-").map(Number);
                // last day of that month
                const lastDay = new Date(y, m, 0);
                const label = lastDay.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
                const datesInGroup = Array.from(grp.dates);
                // Deductions logged for this month
                const monthAdj = adjustments.filter(a => a.month === monthKey).reduce((s, a) => s + adjAmount(a), 0);
                const net = grp.total - monthAdj;
                return <div key={monthKey} style={{ flex: "1 1 220px", minWidth: 220, padding: "12px 14px", background: "rgba(0,230,118,0.06)", border: "1px solid rgba(0,230,118,0.2)", borderRadius: 10 }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Due {label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--green)", marginTop: 2 }}>£{net.toFixed(2)}</div>
                  {monthAdj > 0 && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>£{grp.total.toFixed(2)} − <span style={{ color: "var(--red)" }}>£{monthAdj.toFixed(2)} deductions</span></div>}
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{grp.count} sale{grp.count === 1 ? "" : "s"}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    <button onClick={async () => {
                      if (!confirm(`Mark all £${net.toFixed(2)} due ${label} (${grp.count} sale${grp.count === 1 ? "" : "s"}${monthAdj > 0 ? `, after £${monthAdj.toFixed(2)} deductions` : ""}) as paid?`)) return;
                      // PATCH every distinct payout_date in this month group
                      await Promise.all(datesInGroup.map(d =>
                        fetch(`${SUPABASE_URL}/rest/v1/liquidation_sales?user_id=eq.${client.id}&payout_date=eq.${d}&paid=eq.false`, { method: "PATCH", headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ paid: true }) })
                      ));
                      showToast(`Marked £${net.toFixed(2)} as paid`);
                      loadSales(); onRefresh();
                    }} style={{ flex: 1, padding: "6px 8px", background: "var(--green)", color: "#000", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>✓ Mark All Paid</button>
                    <button onClick={async () => {
                      const input = prompt(`Part Pay for ${label}\n\nGross: £${grp.total.toFixed(2)}${monthAdj > 0 ? ` (less £${monthAdj.toFixed(2)} deductions = £${net.toFixed(2)})` : ""}\n\nEnter the amount you want to pay (£):`);
                      if (!input) return;
                      const target = parseFloat(input.replace(/[£,]/g, ""));
                      if (isNaN(target) || target <= 0) { alert("Please enter a valid amount."); return; }
                      if (target >= net) {
                        if (!confirm(`£${target.toFixed(2)} covers the full payout (£${net.toFixed(2)}). Mark everything as paid?`)) return;
                        await Promise.all(datesInGroup.map(d =>
                          fetch(`${SUPABASE_URL}/rest/v1/liquidation_sales?user_id=eq.${client.id}&payout_date=eq.${d}&paid=eq.false`, { method: "PATCH", headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ paid: true }) })
                        ));
                        showToast(`Marked £${net.toFixed(2)} as paid`);
                        loadSales(); onRefresh();
                        return;
                      }
                      // Sort sales oldest first (by date_sold then payout_date) so older sales clear first
                      const candidates = [...grp.sales].sort((a, b) => {
                        const ad = a.date_sold || a.payout_date || "";
                        const bd = b.date_sold || b.payout_date || "";
                        return ad.localeCompare(bd);
                      });
                      // Greedy: include sale if running total + sale.payout <= target
                      let running = 0;
                      const toMark = [];
                      for (const s of candidates) {
                        const p = parseFloat(s.payout) || 0;
                        if (running + p <= target) { toMark.push(s); running += p; }
                      }
                      if (toMark.length === 0) {
                        alert(`No sale fits under £${target.toFixed(2)}. The smallest unpaid sale this month is £${Math.min(...candidates.map(s => parseFloat(s.payout) || 0)).toFixed(2)}.`);
                        return;
                      }
                      const remaining = net - running;
                      const monthName = lastDay.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
                      if (!confirm(`PART PAY ${monthName}\n\n✓ Mark £${running.toFixed(2)} as paid (${toMark.length} sale${toMark.length === 1 ? "" : "s"})\n⏳ £${remaining.toFixed(2)} remains pending\n\nYou will pay the client: £${running.toFixed(2)}\n\nProceed?`)) return;
                      // PATCH each sale id individually
                      await Promise.all(toMark.map(s =>
                        fetch(`${SUPABASE_URL}/rest/v1/liquidation_sales?id=eq.${s.id}`, { method: "PATCH", headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ paid: true }) })
                      ));
                      showToast(`Part paid £${running.toFixed(2)} — £${remaining.toFixed(2)} carried over`);
                      loadSales(); onRefresh();
                    }} style={{ flex: 1, padding: "6px 8px", background: "transparent", border: "1px solid var(--amber)", color: "var(--amber)", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>£ Part Pay</button>
                  </div>
                </div>;
              })}
            </div>
          </div>}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {sales.length === 0 ? <div className="empty-state"><Icons.Box /><p>No sales recorded yet.</p></div> :
        <div className="table-wrap"><table style={{ width: "100%", tableLayout: "fixed" }}>
          <thead><tr><th>Date Sold</th><th>Product</th><th>Qty</th><th>Sale £</th><th>eBay Fees</th><th>Shipping</th><th>Net Sale</th><th>DBH %</th><th>DBH £</th><th>Fixed</th><th>Payout</th><th>Payout Date</th><th>eBay Order ID</th><th>Logged At</th><th>Paid</th></tr></thead>
          <tbody>{sales.map(s => {
            const stockItem = liquidation.find(l => l.id === s.stock_id);
            const displayName = s.product_name_snapshot || stockItem?.product_name || "—";
            return <tr key={s.id}>
              <td style={{ fontSize: 12 }}>{s.date_sold ? formatShortDate(s.date_sold) : "—"}</td>
              <td style={{ fontWeight: 600, fontSize: 12 }}>{displayName}</td>
              <td className="mono">{s.qty_sold}</td>
              <td className="mono">£{parseFloat(s.sale_price).toFixed(2)}</td>
              <td className="mono" style={{ color: "var(--red)" }}>£{parseFloat(s.ebay_fees).toFixed(2)}</td>
              <td className="mono" style={{ color: "var(--red)" }}>£{parseFloat(s.shipping).toFixed(2)}</td>
              <td className="mono">£{parseFloat(s.net_sale).toFixed(2)}</td>
              <td className="mono">{s.dbh_pct}%</td>
              <td className="mono" style={{ color: "var(--red)" }}>£{parseFloat(s.dbh_fee).toFixed(2)}</td>
              <td className="mono" style={{ color: "var(--red)" }}>£{parseFloat(s.fixed_fee).toFixed(2)}</td>
              <td className="mono" style={{ fontWeight: 700, color: "var(--green)" }}>£{parseFloat(s.payout).toFixed(2)}</td>
              <td style={{ fontSize: 12 }}>{s.payout_date ? formatShortDate(s.payout_date) : "—"}</td>
              <td className="mono" style={{ fontSize: 11 }}>{s.ebay_order_id || "—"}</td>
              <td style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{s.logged_at ? new Date(s.logged_at).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}</td>
              <td style={{ textAlign: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
                  {s.paid ? <span style={{ color: "var(--green)" }}>✓ Paid</span> : <button style={{ padding: "3px 8px", background: "transparent", border: "1px solid var(--green)", color: "var(--green)", borderRadius: 5, fontSize: 11, cursor: "pointer" }} onClick={async () => { await fetch(`${SUPABASE_URL}/rest/v1/liquidation_sales?id=eq.${s.id}`, { method: "PATCH", headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ paid: true }) }); loadSales(); showToast("Marked paid!"); }}>Mark Paid</button>}
                  <button style={{ padding: "3px 8px", background: "transparent", border: "1px solid var(--red)", color: "var(--red)", borderRadius: 5, fontSize: 11, cursor: "pointer" }} onClick={async () => { if (!confirm("Mark as refunded? This will delete the sale and reduce qty sold.")) return; const stockItem = liquidation.find(l => l.id === s.stock_id); const newQtySold = Math.max(0, (stockItem?.qty_sold || 0) - (s.qty_sold || 1)); await fetch(`${SUPABASE_URL}/rest/v1/liquidation_sales?id=eq.${s.id}`, { method: "DELETE", headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}` } }); if (s.stock_id && stockItem) { await fetch(`${SUPABASE_URL}/rest/v1/liquidation_stock?id=eq.${s.stock_id}`, { method: "PATCH", headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ qty_sold: newQtySold }) }); } const hw = client.discord_webhook || webhookUrl; if (hw) await sendDiscordNotification(hw, null, { title: "🔄 SALE REFUNDED", color: 0xff5252, fields: [{ name: "Product", value: displayName, inline: true }, { name: "Qty Returned", value: `${s.qty_sold || 1}`, inline: true }], footer: { text: "Item returned to listed stock" } }); showToast("Sale refunded!"); loadSales(); onRefresh(); }}>↩ Refund</button>
                </div>
              </td>
            </tr>;
          })}</tbody>
        </table></div>}
      </div>
        </>;
      })()}

      {/* Removals Tab */}
      {activeTab === "removals" && <div>
        <RemovalsTab userId={client.id} token={token} isAdmin={true} showToast={showToast} />
      </div>}

      {/* Add Stock Modal */}
      {showAddStock && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
        <div className="card" style={{ width: 480, maxWidth: "95vw", padding: 28 }}>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>Add Stock</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>Adding for: {client.full_name || client.email}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div><label className="input-label">Product Name *</label><input className="input" placeholder="e.g. Samsung Galaxy Buds2 Pro" value={addStockForm.product_name} onChange={e => setAddStockForm(p => ({ ...p, product_name: e.target.value }))} /></div>
            <div><label className="input-label">ASIN</label><input className="input" placeholder="e.g. B09..." value={addStockForm.asin} onChange={e => setAddStockForm(p => ({ ...p, asin: e.target.value }))} /></div>
            {isPanayiotis && <div><label className="input-label">UID (Google Sheet)</label><input className="input" placeholder="Sheet UID — e.g. P-001" value={addStockForm.sheet_uid} onChange={e => setAddStockForm(p => ({ ...p, sheet_uid: e.target.value }))} /></div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label className="input-label">Condition</label>
                <select className="input" value={addStockForm.condition} onChange={e => setAddStockForm(p => ({ ...p, condition: e.target.value }))}>
                  <option value="">— Select —</option>
                  <option>New</option><option>Open Box</option><option>Like New</option><option>Used</option><option>Good</option><option>Fair</option><option>Poor</option>
                </select>
              </div>
              <div><label className="input-label">Quantity</label><input className="input" type="number" min="1" value={addStockForm.quantity} onChange={e => setAddStockForm(p => ({ ...p, quantity: e.target.value }))} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label className="input-label">COG (£)</label><input className="input" type="number" step="0.01" placeholder="0.00" value={addStockForm.cog} onChange={e => setAddStockForm(p => ({ ...p, cog: e.target.value }))} /></div>
              <div><label className="input-label">LPN Number</label><input className="input" placeholder="Optional" value={addStockForm.lpn_number} onChange={e => setAddStockForm(p => ({ ...p, lpn_number: e.target.value }))} /></div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button className="btn btn-primary admin" onClick={submitAddStock} disabled={addStockSaving} style={{ flex: 1 }}>{addStockSaving ? "Adding..." : "Add Stock"}</button>
              <button onClick={() => { setShowAddStock(false); setAddStockForm({ product_name: "", asin: "", lpn_number: "", condition: "", quantity: 1, cog: "", sheet_uid: "" }); }} style={{ padding: "10px 16px", background: "transparent", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-secondary)", cursor: "pointer", fontFamily: "Outfit,sans-serif" }}>Cancel</button>
            </div>
          </div>
        </div>
      </div>}

      {/* Partial Receive Modal */}
      {receiveItem && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
        <div className="card" style={{ width: 400, maxWidth: "95vw", padding: 28 }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Mark Received</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 20 }}>{receiveItem.product_name}</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>Total qty in transit: <strong style={{ color: "var(--text-primary)" }}>{receiveItem.quantity || 1}</strong></div>
          <div><label className="input-label">Qty Received</label>
          <input className="input" type="number" min="1" max={receiveItem.quantity || 1} value={receiveQty} onChange={e => setReceiveQty(e.target.value)} /></div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
            {parseInt(receiveQty) < (receiveItem.quantity || 1) && parseInt(receiveQty) > 0 && 
              <span style={{ color: "var(--amber)" }}>⚠ {(receiveItem.quantity || 1) - parseInt(receiveQty)} units will remain in transit</span>}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
            <button className="btn btn-secondary" onClick={() => setReceiveItem(null)}>Cancel</button>
            <button className="btn btn-primary" style={{ background: "var(--green)", color: "#000" }} onClick={async () => {
              const qtyReceived = parseInt(receiveQty) || (receiveItem.quantity || 1);
              const totalQty = receiveItem.quantity || 1;
              const remaining = totalQty - qtyReceived;
              if (remaining > 0) {
                // Partial receive — update existing item with received qty, create new row for remainder
                await fetch(`${SUPABASE_URL}/rest/v1/liquidation_stock?id=eq.${receiveItem.id}`, { method: "PATCH", headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ received: true, quantity: qtyReceived }) });
                await fetch(`${SUPABASE_URL}/rest/v1/liquidation_stock`, { method: "POST", headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}`, "Content-Type": "application/json", "Prefer": "return=representation" }, body: JSON.stringify({ product_name: receiveItem.product_name, asin: receiveItem.asin, sku: receiveItem.sku, dbh_sku: receiveItem.dbh_sku, lpn_number: receiveItem.lpn_number, cog: receiveItem.cog, purchase_price: receiveItem.purchase_price, condition: receiveItem.condition, user_id: client.id, quantity: remaining, received: false, date_added: receiveItem.date_added }) });
              } else {
                // Full receive
                await fetch(`${SUPABASE_URL}/rest/v1/liquidation_stock?id=eq.${receiveItem.id}`, { method: "PATCH", headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ received: true }) });
              }
              const hw = client.discord_webhook || webhookUrl;
              if (hw) await sendDiscordNotification(hw, null, { title: "📦 STOCK RECEIVED", color: 0x00b8d4, fields: [{ name: "Product", value: receiveItem.product_name, inline: true }, { name: "Qty Received", value: `${qtyReceived}`, inline: true }, ...(remaining > 0 ? [{ name: "Still In Transit", value: `${remaining}`, inline: true }] : [])], footer: { text: "Your stock has arrived and is ready to list" } });
              showToast("Marked received!"); setReceiveItem(null); onRefresh();
            }}>Confirm</button>
          </div>
        </div>
      </div>}

      {/* Log Sale Modal */}
      {logSaleItem && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
        <div className="card" style={{ width: 480, maxWidth: "95vw", padding: 28 }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Log Sale</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 20 }}>{logSaleItem.product_name}</div>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label className="input-label">Date Sold</label><input className="input" type="date" style={{ colorScheme: "dark" }} value={sf.date_sold} onChange={e => setSaleForm({ ...sf, date_sold: e.target.value })} /></div>
            <div><label className="input-label">Qty Sold (max {(logSaleItem.quantity||1)-(logSaleItem.qty_sold||0)})</label><input className="input" type="number" min="1" max={(logSaleItem.quantity||1)-(logSaleItem.qty_sold||0)} value={sf.qty_sold} onChange={e => setSaleForm({ ...sf, qty_sold: e.target.value })} /></div>
            <div><label className="input-label">Sale Price (£)</label><input className="input" type="number" step="0.01" placeholder="0.00" value={sf.sale_price} onChange={e => setSaleForm({ ...sf, sale_price: e.target.value })} /></div>
            <div><label className="input-label">eBay Fees (£)</label><input className="input" type="number" step="0.01" placeholder="0.00" value={sf.ebay_fees} onChange={e => setSaleForm({ ...sf, ebay_fees: e.target.value })} /></div>
            <div><label className="input-label">Shipping (£)</label><input className="input" type="number" step="0.01" placeholder="0.00" value={sf.shipping} onChange={e => setSaleForm({ ...sf, shipping: e.target.value })} /></div>
            <div><label className="input-label">Fixed Fee (£)</label><input className="input" type="number" step="0.01" value={sf.fixed_fee} onChange={e => setSaleForm({ ...sf, fixed_fee: e.target.value })} /></div>
            <div style={{ gridColumn: "span 2" }}><label className="input-label">eBay Order ID <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(admin only)</span></label><input className="input" placeholder="e.g. 12-34567-89012" value={sf.ebay_order_id} onChange={e => setSaleForm({ ...sf, ebay_order_id: e.target.value })} /></div>
          </div>

          {sf.sale_price && <div style={{ background: "rgba(0,230,118,0.05)", border: "1px solid rgba(0,230,118,0.2)", borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, fontSize: 13 }}>
              <div><div style={{ color: "var(--text-muted)", fontSize: 11 }}>Net Sale</div><div className="mono" style={{ fontWeight: 600 }}>£{sc.net.toFixed(2)}</div></div>
              <div><div style={{ color: "var(--text-muted)", fontSize: 11 }}>DBH %</div><div className="mono" style={{ fontWeight: 600, color: "var(--orange)" }}>{(sc.pct*100).toFixed(0)}%</div></div>
              <div><div style={{ color: "var(--text-muted)", fontSize: 11 }}>DBH £</div><div className="mono" style={{ fontWeight: 600, color: "var(--orange)" }}>£{sc.fee.toFixed(2)}</div></div>
            </div>
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ color: "var(--text-muted)", fontSize: 12 }}>Payout Date: {sf.date_sold ? getPayoutDate(sf.date_sold).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}</div>
              <div style={{ fontWeight: 800, fontSize: 20, color: "var(--green)" }}>£{sc.payout.toFixed(2)}</div>
            </div>
          </div>}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn btn-secondary" onClick={() => setLogSaleItem(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={submitSale} disabled={saleSaving} style={{ background: "var(--orange)", color: "#000" }}>{saleSaving ? "Saving..." : "Log Sale"}</button>
          </div>
        </div>
      </div>}
    </>
  );
}

export default function App() {
  return <AuthProvider><style>{css}</style><AppRouter /></AuthProvider>;
}

function AppRouter() {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <div className="loader"><div className="spinner" /></div>;
  if (!user) return <LoginPage />;
  return isAdmin ? <AdminPortal /> : <ClientPortal />;
}

