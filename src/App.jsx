import React, { useState, useEffect, createContext, useContext, useCallback } from "react";

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
function getPayoutDate(soldDate) { if (!soldDate) return null; const d = new Date(soldDate); d.setDate(d.getDate() + 35); return d; }
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
      <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", marginBottom: 32 }}><div className="sidebar-logo-icon">DBH</div><div><div style={{ fontWeight: 800, fontSize: 22 }}>DBH PREP</div><div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: 2 }}>CLIENT PORTAL</div></div></div>
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
      <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", marginBottom: 32 }}><div className="sidebar-logo-icon">DBH</div><div><div style={{ fontWeight: 800, fontSize: 22 }}>DBH PREP</div><div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: 2 }}>CLIENT PORTAL</div></div></div>
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
      <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", marginBottom: 32 }}><div className="sidebar-logo-icon">DBH</div><div><div style={{ fontWeight: 800, fontSize: 22 }}>DBH PREP</div><div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: 2 }}>CLIENT PORTAL</div></div></div>
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
function LiquidationDashboard({ liquidationStock, liquidationSales }) {
  const sales = liquidationSales || [];
  const transitItems = liquidationStock.filter(i => !i.received);
  const listedItems = liquidationStock.filter(i => i.received && ((i.quantity || 1) - (i.qty_sold || 0)) > 0);
  const pendingPayout = sales.filter(s => !s.paid).reduce((sum, s) => sum + (parseFloat(s.payout) || 0), 0);
  const paidTotal = sales.filter(s => s.paid).reduce((sum, s) => sum + (parseFloat(s.payout) || 0), 0);
  const unpaidSales = sales.filter(s => !s.paid && s.payout_date).sort((a, b) => new Date(a.payout_date) - new Date(b.payout_date));
  const nextSale = unpaidSales[0];
  const monthly = getMonthlyData(sales.filter(s => s.date_sold), "date_sold", 12);

  return (
    <><div className="page-header"><div><div className="page-title">Liquidation Dashboard</div><div className="page-subtitle">Overview of your liquidation activity</div></div><div className="speed-badge liquidation"><Icons.TrendingUp /> Track Returns</div></div>
    <div className="page-body">
      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className="card stat-card liquidation"><div className="card-title">In Transit</div><div className="stat-value" style={{ color: "var(--amber)" }}>{transitItems.length}</div></div>
        <div className="card stat-card liquidation"><div className="card-title">Listed</div><div className="stat-value" style={{ color: "var(--cyan)" }}>{listedItems.length}</div></div>
        <div className="card stat-card liquidation"><div className="card-title">Pending Payout</div><div className="stat-value" style={{ color: "var(--orange)" }}>£{pendingPayout.toFixed(2)}</div></div>
        <div className="card stat-card liquidation"><div className="card-title">Total Paid</div><div className="stat-value" style={{ color: "var(--green)" }}>£{paidTotal.toFixed(2)}</div></div>
      </div>
      {nextSale && <div className="card" style={{ marginBottom: 24, background: "linear-gradient(135deg,rgba(255,145,0,0.08),transparent)", borderColor: "rgba(255,145,0,0.2)" }}><div className="card-title" style={{ color: "var(--orange)" }}>Next Payout</div><div style={{ marginTop: 8, fontSize: 18, fontWeight: 700 }}>{formatDate(new Date(nextSale.payout_date))}</div><div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>£{parseFloat(nextSale.payout).toFixed(2)} — 35 days after sale</div></div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="card"><div className="card-title">Sales (12 Months)</div><LiquidationMonthlyChart data={monthly} /></div>
        <div className="card"><div className="card-title">Upcoming Payouts</div>{unpaidSales.length === 0 ? <div style={{ color: "var(--text-muted)", marginTop: 12 }}>No pending payouts.</div> : <div style={{ marginTop: 12 }}>{unpaidSales.map(s => { const stockItem = liquidationStock.find(l => l.id === s.stock_id); return <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border)" }}><div><div style={{ fontWeight: 600 }}>{stockItem?.product_name || "—"}</div><div style={{ fontSize: 12, color: "var(--text-muted)" }}>{formatDate(new Date(s.payout_date))}</div></div><div className="mono" style={{ fontWeight: 700, color: "var(--green)" }}>£{parseFloat(s.payout).toFixed(2)}</div></div>; })}</div>}</div>
      </div>
    </div></>
  );
}

function LiquidationSendStockPage({ token, onRefresh, showToast }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ removal_order_id: "", product_name: "", asin: "", sku: "", purchase_price: "" });
  const [saving, setSaving] = useState(false);
  const update = f => e => setForm({ ...form, [f]: e.target.value });
  const handleSubmit = async () => {
    if (!form.product_name) return; setSaving(true);
    await supabase.from("liquidation_stock", token).insert({ ...form, purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : null, cog: form.purchase_price ? parseFloat(form.purchase_price) : null, user_id: user.id, date_added: new Date().toISOString().split('T')[0] });
    showToast("Stock submitted!"); setForm({ removal_order_id: "", product_name: "", asin: "", sku: "", purchase_price: "" }); onRefresh(); setSaving(false);
  };
  return (
    <><div className="page-header"><div><div className="page-title">Send Stock</div><div className="page-subtitle">Submit returns for liquidation</div></div></div>
    <div className="page-body"><div className="card" style={{ maxWidth: 600 }}>
      <div className="input-group"><label className="input-label">Removal Order ID (if applicable)</label><input className="input" placeholder="e.g. 2601071LW5" value={form.removal_order_id} onChange={update("removal_order_id")} /></div>
      <div className="input-group"><label className="input-label">Product Name *</label><input className="input" placeholder="Product description" value={form.product_name} onChange={update("product_name")} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}><div className="input-group"><label className="input-label">ASIN</label><input className="input" value={form.asin} onChange={update("asin")} /></div><div className="input-group"><label className="input-label">SKU</label><input className="input" value={form.sku} onChange={update("sku")} /></div></div>
      <div className="input-group"><label className="input-label">What You Paid (£)</label><input className="input" type="number" step="0.01" placeholder="Your cost price" value={form.purchase_price} onChange={update("purchase_price")} /></div>
      <button className="btn btn-primary liquidation" onClick={handleSubmit} disabled={saving || !form.product_name}>{saving ? "Submitting..." : "Submit Stock"}</button>
    </div></div></>
  );
}

function LiquidationMyStockPage({ liquidationStock, liquidationSales, token, onRefresh, showToast }) {
  const [activeTab, setActiveTab] = useState("transit");
  const sales = liquidationSales || [];
  const transitItems = liquidationStock.filter(i => !i.received);
  const listedItems = liquidationStock.filter(i => i.received && ((i.quantity || 1) - (i.qty_sold || 0)) > 0);
  const totalPayout = sales.reduce((s, r) => s + (parseFloat(r.payout) || 0), 0);

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
        {[["transit","⏳ In Transit"],["listed","📦 Listed"],["sales","💰 Sales"]].map(([k,l]) =>
          <button key={k} onClick={() => setActiveTab(k)} style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid", fontSize: 13, fontWeight: 600, cursor: "pointer", background: activeTab === k ? "var(--orange)" : "transparent", color: activeTab === k ? "#000" : "var(--text-secondary)", borderColor: activeTab === k ? "var(--orange)" : "var(--border)" }}>{l}</button>
        )}
      </div>

      {/* In Transit */}
      {activeTab === "transit" && <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {transitItems.length === 0 ? <div className="empty-state"><Icons.Box /><p>No items in transit.</p></div> :
        <div className="table-wrap"><table style={{ width: "100%" }}>
          <thead><tr><th>Product</th><th>ASIN</th><th>Qty</th><th>What You Paid</th></tr></thead>
          <tbody>{transitItems.map(s => <tr key={s.id}>
            <td style={{ fontWeight: 600 }}>{s.product_name}</td>
            <td className="mono" style={{ fontSize: 12 }}>{s.asin || "—"}</td>
            <td className="mono">{s.quantity || 1}</td>
            <td className="mono">{s.cog ? `£${parseFloat(s.cog).toFixed(2)}` : "—"}</td>
          </tr>)}</tbody>
        </table></div>}
      </div>}

      {/* Listed */}
      {activeTab === "listed" && <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {listedItems.length === 0 ? <div className="empty-state"><Icons.Box /><p>No listed items.</p></div> :
        <div className="table-wrap"><table style={{ width: "100%" }}>
          <thead><tr><th>Product</th><th>ASIN</th><th>LPN</th><th>Qty Total</th><th>Qty Sold</th><th>Remaining</th><th>What You Paid</th></tr></thead>
          <tbody>{listedItems.map(s => {
            const remaining = (s.quantity || 1) - (s.qty_sold || 0);
            return <tr key={s.id}>
              <td style={{ fontWeight: 600 }}>{s.product_name}</td>
              <td className="mono" style={{ fontSize: 12 }}>{s.asin || "—"}</td>
              <td className="mono" style={{ fontSize: 12 }}>{s.lpn_number || "—"}</td>
              <td className="mono">{s.quantity || 1}</td>
              <td className="mono" style={{ color: "var(--green)" }}>{s.qty_sold || 0}</td>
              <td className="mono" style={{ fontWeight: 700, color: remaining <= 0 ? "var(--red)" : "var(--text-primary)" }}>{remaining}</td>
              <td className="mono">{s.cog ? `£${parseFloat(s.cog).toFixed(2)}` : "—"}</td>
            </tr>;
          })}</tbody>
        </table></div>}
      </div>}

      {/* Sales */}
      {activeTab === "sales" && <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {sales.length === 0 ? <div className="empty-state"><Icons.Box /><p>No sales yet.</p></div> :
        <div className="table-wrap"><table style={{ width: "100%" }}>
          <thead><tr><th>Date Sold</th><th>Product</th><th>Qty</th><th>Sale £</th><th>Net Sale</th><th>DBH %</th><th>DBH £</th><th>Fixed</th><th>Payout</th><th>Payout Date</th><th>Paid</th></tr></thead>
          <tbody>{sales.map(s => {
            const stockItem = liquidationStock.find(l => l.id === s.stock_id);
            return <tr key={s.id}>
              <td style={{ fontSize: 12 }}>{s.date_sold ? formatShortDate(s.date_sold) : "—"}</td>
              <td style={{ fontWeight: 600, fontSize: 12 }}>{stockItem?.product_name || "—"}</td>
              <td className="mono">{s.qty_sold}</td>
              <td className="mono">£{parseFloat(s.sale_price).toFixed(2)}</td>
              <td className="mono">£{parseFloat(s.net_sale).toFixed(2)}</td>
              <td className="mono">{s.dbh_pct}%</td>
              <td className="mono" style={{ color: "var(--red)" }}>£{parseFloat(s.dbh_fee).toFixed(2)}</td>
              <td className="mono" style={{ color: "var(--red)" }}>£{parseFloat(s.fixed_fee).toFixed(2)}</td>
              <td className="mono" style={{ fontWeight: 700, color: "var(--green)" }}>£{parseFloat(s.payout).toFixed(2)}</td>
              <td style={{ fontSize: 12 }}>{s.payout_date ? formatShortDate(s.payout_date) : "—"}</td>
              <td style={{ textAlign: "center" }}>{s.paid ? <span style={{ color: "var(--green)" }}>✓ Paid</span> : <span style={{ color: "var(--amber)", fontSize: 12 }}>Pending</span>}</td>
            </tr>;
          })}</tbody>
        </table></div>}
      </div>}
    </div></>
  );
}

function LiquidationFeesPage() {
  return (
    <><div className="page-header"><div><div className="page-title">Liquidation Fees</div><div className="page-subtitle">Transparent pricing</div></div></div>
    <div className="page-body">
      <div className="fee-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 28 }}>{[{ n: "Selling Fee", p: "15%", d: "10% if ≥£200", i: "💰", vat: false }, { n: "Prep Fee", p: "£0.40", d: "Per item", i: "📦", vat: true }, { n: "Bundling", p: "£0.30", d: "Per bundle", i: "🧩", vat: true }, { n: "Oversized", p: "£1.00", d: "Per item", i: "📏", vat: true }].map(f => <div className="fee-card" key={f.n} style={{ borderColor: "var(--orange)" }}><div style={{ fontSize: 28, marginBottom: 8 }}>{f.i}</div><div className="fee-price" style={{ color: "var(--orange)" }}>{f.p} {f.vat && <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 400 }}>+VAT</span>}</div><div className="fee-name">{f.n}</div><div className="fee-desc">{f.d}</div></div>)}</div>
      <div className="card" style={{ background: "linear-gradient(135deg,rgba(255,145,0,0.08),transparent)", borderColor: "rgba(255,145,0,0.2)" }}><div className="card-title" style={{ color: "var(--orange)" }}>✅ Transparency</div><p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 8 }}>Payouts 35 days after sale to allow for returns.</p></div>
    </div></>
  );
}

function LiquidationBillingPage({ liquidationStock }) {
  const pending = liquidationStock.filter(s => s.sale_price && !s.paid);
  const paid = liquidationStock.filter(s => s.paid);
  const pendingTotal = pending.reduce((sum, s) => sum + calculatePayout(s).payout, 0);
  const paidTotal = paid.reduce((sum, s) => sum + calculatePayout(s).payout, 0);
  const pendingWithDate = pending.filter(s => s.date_sold).map(s => ({ ...s, payoutDate: getPayoutDate(s.date_sold) })).sort((a, b) => a.payoutDate - b.payoutDate);
  return (
    <><div className="page-header"><div><div className="page-title">Billing</div><div className="page-subtitle">Your liquidation payouts</div></div></div>
    <div className="page-body">
      <div className="stats-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="card stat-card liquidation"><div className="card-title">Total Paid Out</div><div className="stat-value" style={{ color: "var(--green)" }}>£{paidTotal.toFixed(2)}</div></div>
        <div className="card stat-card liquidation"><div className="card-title">Pending Payout</div><div className="stat-value" style={{ color: "var(--amber)" }}>£{pendingTotal.toFixed(2)}</div></div>
      </div>
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

function AdminLiquidationPage({ token, showToast }) {
  const [clients, setClients] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");

  useEffect(() => { loadData(); }, []);
  const loadData = async () => {
    setLoading(true);
    const [l, c, s] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/liquidation_stock?select=*&order=created_at.desc`, { headers: supabase.headers(token) }).then(r => r.json()),
      fetch(`${SUPABASE_URL}/rest/v1/profiles?select=*`, { headers: supabase.headers(token) }).then(r => r.json()),
      fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.discord_webhook_url`, { headers: supabase.headers(token) }).then(r => r.json())
    ]);
    if (Array.isArray(l)) setItems(l);
    if (Array.isArray(c)) setClients(c.filter(x => x.email !== ADMIN_EMAIL));
    if (s?.[0]?.value) setWebhookUrl(s[0].value);
    setLoading(false);
  };

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
        const payoutDate = new Date(dataToSave.date_sold);
        payoutDate.setDate(payoutDate.getDate() + 35);
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
      {!selectedClient && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 16, marginBottom: 24 }}>{clients.map(c => { const ci = items.filter(i => i.user_id === c.id); const pending = ci.filter(i => !i.sale_price).length; return <div key={c.id} className="client-card" onClick={() => setSelectedClient(c)}><div style={{ fontWeight: 700 }}>{c.full_name || "No Name"}</div><div style={{ fontSize: 13, color: "var(--text-muted)" }}>{c.email}</div><div style={{ marginTop: 8, fontSize: 13 }}>Pending: <span style={{ fontWeight: 700, color: "var(--orange)" }}>{pending}</span> • Total: {ci.length}</div></div>; })}</div>}
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
            <td>{isEdit ? <select className="inline-select" style={{ width: 90 }} value={data.condition} onChange={e => setEditData({ ...editData, condition: e.target.value })}><option value="">—</option><option>New</option><option>Like New</option><option>Good</option><option>Fair</option><option>Poor</option></select> : <span style={{ fontSize: 12 }}>{item.condition || "—"}</span>}</td>
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
            <h3 style={{ fontSize: 14, color: '#fff', marginBottom: 12 }}>DBH PREP — Service Agreement</h3>
            <h4 style={{ fontSize: 12, color: 'var(--cyan)', marginTop: 16, marginBottom: 6 }}>1. Parties</h4>
            <p>This Service Agreement is entered into between DBH Prep ("the Service Provider") and the undersigned client ("the Client"). By signing this Agreement, both parties agree to be bound by the terms below.</p>
            <h4 style={{ fontSize: 12, color: 'var(--cyan)', marginTop: 16, marginBottom: 6 }}>2. Services Provided</h4>
            <p><strong>a) FBA Preparation</strong> — Receiving, inspecting, labelling, poly-bagging, bundling, and preparing inventory for Amazon FBA.</p>
            <p><strong>b) Liquidation</strong> — Receiving, listing and selling returned/unfulfillable inventory on behalf of the Client.</p>
            <p><strong>c) DBH Deals</strong> — Access to daily curated deal sheet (where applicable, subject to separate subscription).</p>
            <h4 style={{ fontSize: 12, color: 'var(--cyan)', marginTop: 16, marginBottom: 6 }}>3. Client Responsibilities</h4>
            <p>The Client agrees to provide accurate product information, ensure inventory complies with Amazon policies, provide tracking for inbound shipments, and respond to flagged issues within 48 hours. DBH Prep may hold, return, or dispose of inventory where the Client fails to respond within 14 days.</p>
            <h4 style={{ fontSize: 12, color: 'var(--cyan)', marginTop: 16, marginBottom: 6 }}>4. Pricing & Fees</h4>
            <p>Prep fees are charged per-unit at the agreed rate. Additional charges may apply for oversized items, bundling, box costs, and ancillary services. All prices are exclusive of VAT. DBH Prep may adjust pricing with 14 days written notice.</p>
            <h4 style={{ fontSize: 12, color: 'var(--cyan)', marginTop: 16, marginBottom: 6 }}>5. Invoicing & Payment</h4>
            <p><strong>a)</strong> Invoices are issued on the <strong>1st of each calendar month</strong> for work completed in the preceding month.</p>
            <p><strong>b)</strong> Payment is due within <strong>5 working days</strong> of the invoice date.</p>
            <p><strong>c)</strong> Late payment may result in: suspension of services and holding of inventory; a 5% late payment fee; 2% monthly interest on overdue amounts; and debt recovery via legal channels at the Client's cost.</p>
            <p><strong>d)</strong> DBH Prep retains a <strong>lien over all inventory</strong> until all invoices are paid in full.</p>
            <p><strong>e)</strong> The Client acknowledges that by signing this Agreement, they accept full responsibility for the payment of all invoices raised by DBH Prep for services rendered.</p>
            <h4 style={{ fontSize: 12, color: 'var(--cyan)', marginTop: 16, marginBottom: 6 }}>6. Turnaround & Shipping</h4>
            <p>DBH Prep aims for 24-48 hour turnaround. We are not responsible for carrier or Amazon receiving delays.</p>
            <h4 style={{ fontSize: 12, color: 'var(--cyan)', marginTop: 16, marginBottom: 6 }}>7. Liability & Damages</h4>
            <p>Liability for damaged inventory is limited to the cost price as declared by the Client. Claims must be made within 7 days with supporting evidence. DBH Prep accepts no liability for transit damage or consequential losses.</p>
            <h4 style={{ fontSize: 12, color: 'var(--cyan)', marginTop: 16, marginBottom: 6 }}>8. Liquidation Services</h4>
            <p>Commission is deducted per sale at the agreed rate. No guarantees on sale price or timeframe. Items unsold after 90 days may be disposed of unless the Client requests return at their expense.</p>
            <h4 style={{ fontSize: 12, color: 'var(--cyan)', marginTop: 16, marginBottom: 6 }}>9. Confidentiality & Deal Sheet Non-Disclosure</h4>
            <p><strong>General:</strong> Both parties agree to keep commercially sensitive information confidential.</p>
            <p><strong>DBH Deals — Strict Confidentiality:</strong> The deal sheet is exclusive and limited to 15 members. The Client agrees:</p>
            <p><strong>a)</strong> Deal sheet content is <strong>strictly confidential</strong> — no sharing, forwarding, or screenshots.</p>
            <p><strong>b)</strong> Login credentials must not be shared.</p>
            <p><strong>c)</strong> DBH Prep monitors seller counts to detect unauthorised sharing. Suspicion of sharing results in <strong>immediate termination</strong> without refund.</p>
            <p><strong>d)</strong> Confirmed breaches may result in termination of all services and pursuit of damages.</p>
            <h4 style={{ fontSize: 12, color: 'var(--cyan)', marginTop: 16, marginBottom: 6 }}>10. Client Portal & Data</h4>
            <p>The Client is responsible for login security. Data is processed in accordance with UK GDPR solely for service delivery.</p>
            <h4 style={{ fontSize: 12, color: 'var(--cyan)', marginTop: 16, marginBottom: 6 }}>11. Termination</h4>
            <p>Either party may terminate with 14 days written notice. Outstanding invoices must be settled within 5 working days. Inventory is released once all payments are received. DBH Prep may terminate immediately for non-payment exceeding 14 days.</p>
            <h4 style={{ fontSize: 12, color: 'var(--cyan)', marginTop: 16, marginBottom: 6 }}>12. Governing Law</h4>
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
  const [service, setService] = useState("prep");
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

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      const [p, i, b, l, s, prof, ls] = await Promise.all([
        supabase.from("parcels", token).select(),
        supabase.from("invoices", token).select(),
        supabase.from("billing_periods", token).select(),
        supabase.from("liquidation_stock", token).select(),
        supabase.from("shipments", token).select(),
        fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=*`, { headers: supabase.headers(token) }).then(r => r.json()),
        fetch(`${SUPABASE_URL}/rest/v1/liquidation_sales?user_id=eq.${user.id}&order=date_sold.desc`, { headers: supabase.headers(token) }).then(r => r.json())
      ]);
      if (Array.isArray(p)) setParcels(p);
      if (Array.isArray(i)) setInvoices(i);
      if (Array.isArray(b)) setBillingPeriods(b);
      if (Array.isArray(l)) setLiquidationStock(l);
      if (Array.isArray(s)) setShipments(s);
      if (Array.isArray(ls)) setLiquidationSales(ls);
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
  useEffect(() => { setPage(service === "deals" ? "deals" : "dashboard"); }, [service]);

  const prepNav = [
    { id: "dashboard", label: "Dashboard", icon: Icons.Dashboard },
    { id: "add-order", label: "Add Order", icon: Icons.Plus },
    { id: "inventory", label: "My Inventory", icon: Icons.Package },
    { id: "shipments", label: "Shipments", icon: Icons.Truck },
    { id: "fees", label: "Prep Fees", icon: Icons.Calculator },
    { id: "billing", label: "Billing", icon: Icons.Receipt }
  ];
  const liqNav = [
    { id: "dashboard", label: "Dashboard", icon: Icons.Dashboard },
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
  const currentNav = service === "prep" ? prepNav : service === "liquidation" ? liqNav : dealsNav;
  const initials = (profile?.full_name || user?.email || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  const renderPage = () => {
    if (page === "profile") return <ProfilePage dbProfile={dbProfile} />;
    if (service === "deals") {
      if (page === "invoice-details") return <DealsInvoiceDetailsPage token={token} dbProfile={dbProfile} onRefresh={loadData} showToast={showToast} />;
      if (page === "shortlist") return <DealsShortlistPage token={token} userId={user.id} showToast={showToast} />;
      if (page === "bought") return <DealsBoughtPage token={token} userId={user.id} showToast={showToast} />;
      return <DBHDealsPage token={token} hasAccess={dbProfile?.deals_access} startDate={dbProfile?.deals_start_date} dbProfile={dbProfile} onRefresh={loadData} showToast={showToast} userId={user.id} />;
    }
    if (service === "prep") {
      if (page === "dashboard") return <PrepDashboard parcels={parcels} billingPeriods={billingPeriods} shipments={shipments} onNavigate={setPage} />;
      if (page === "add-order") return <PrepAddOrderPage token={token} onRefresh={loadData} showToast={showToast} />;
      if (page === "inventory") return <PrepInventoryPage parcels={parcels} token={token} onRefresh={loadData} showToast={showToast} />;
      if (page === "shipments") return <ClientShipmentsPage shipments={shipments} />;
      if (page === "fees") return <PrepFeesPage />;
      if (page === "billing") return <PrepBillingPage billingPeriods={billingPeriods} invoices={invoices} shipments={shipments} />;
      return <PrepDashboard parcels={parcels} billingPeriods={billingPeriods} shipments={shipments} onNavigate={setPage} />;
    }
    if (service === "liquidation") {
      if (page === "dashboard") return <LiquidationDashboard liquidationStock={liquidationStock} liquidationSales={liquidationSales} />;
      if (page === "send-stock") return <LiquidationSendStockPage token={token} onRefresh={loadData} showToast={showToast} />;
      if (page === "my-stock") return <LiquidationMyStockPage liquidationStock={liquidationStock} liquidationSales={liquidationSales} token={token} onRefresh={loadData} showToast={showToast} />;
      if (page === "fees") return <LiquidationFeesPage />;
      if (page === "billing") return <LiquidationBillingPage liquidationStock={liquidationStock} />;
      return <LiquidationDashboard liquidationStock={liquidationStock} liquidationSales={liquidationSales} />;
    }
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
            <h2 style={{ fontSize: 18, color: '#fff', marginBottom: 16 }}>DBH PREP — Service Agreement</h2>
            <h3 style={{ fontSize: 14, color: 'var(--cyan)', marginTop: 20, marginBottom: 8 }}>1. Parties</h3>
            <p>This Service Agreement is entered into between DBH Prep ("the Service Provider") and the undersigned client ("the Client"). By signing this Agreement, both parties agree to be bound by the terms below.</p>
            <h3 style={{ fontSize: 14, color: 'var(--cyan)', marginTop: 20, marginBottom: 8 }}>2. Services Provided</h3>
            <p><strong>a) FBA Preparation</strong> — Receiving, inspecting, labelling, poly-bagging, bundling, and preparing inventory for Amazon FBA.</p>
            <p><strong>b) Liquidation</strong> — Receiving, listing and selling returned/unfulfillable inventory on behalf of the Client.</p>
            <p><strong>c) DBH Deals</strong> — Access to daily curated deal sheet (where applicable, subject to separate subscription).</p>
            <h3 style={{ fontSize: 14, color: 'var(--cyan)', marginTop: 20, marginBottom: 8 }}>3. Client Responsibilities</h3>
            <p>The Client agrees to provide accurate product information, ensure inventory complies with Amazon policies, provide tracking for inbound shipments, and respond to flagged issues within 48 hours. DBH Prep may hold, return, or dispose of inventory where the Client fails to respond within 14 days.</p>
            <h3 style={{ fontSize: 14, color: 'var(--cyan)', marginTop: 20, marginBottom: 8 }}>4. Pricing & Fees</h3>
            <p>Prep fees are charged per-unit at the agreed rate. Additional charges may apply for oversized items, bundling, box costs, and ancillary services. All prices are exclusive of VAT. DBH Prep may adjust pricing with 14 days written notice.</p>
            <h3 style={{ fontSize: 14, color: 'var(--cyan)', marginTop: 20, marginBottom: 8 }}>5. Invoicing & Payment</h3>
            <p><strong>a)</strong> Invoices are issued on the <strong>1st of each calendar month</strong> for work completed in the preceding month.</p>
            <p><strong>b)</strong> Payment is due within <strong>5 working days</strong> of the invoice date.</p>
            <p><strong>c)</strong> Late payment may result in: suspension of services and holding of inventory; a 5% late payment fee; 2% monthly interest on overdue amounts; and debt recovery via legal channels at the Client's cost.</p>
            <p><strong>d)</strong> DBH Prep retains a <strong>lien over all inventory</strong> until all invoices are paid in full.</p>
            <p><strong>e)</strong> The Client acknowledges that by signing this Agreement, they accept full responsibility for the payment of all invoices raised by DBH Prep for services rendered.</p>
            <h3 style={{ fontSize: 14, color: 'var(--cyan)', marginTop: 20, marginBottom: 8 }}>6. Turnaround & Shipping</h3>
            <p>DBH Prep aims for 24-48 hour turnaround. We are not responsible for carrier or Amazon receiving delays.</p>
            <h3 style={{ fontSize: 14, color: 'var(--cyan)', marginTop: 20, marginBottom: 8 }}>7. Liability & Damages</h3>
            <p>Liability for damaged inventory is limited to the cost price as declared by the Client. Claims must be made within 7 days with supporting evidence. DBH Prep accepts no liability for transit damage or consequential losses.</p>
            <h3 style={{ fontSize: 14, color: 'var(--cyan)', marginTop: 20, marginBottom: 8 }}>8. Liquidation Services</h3>
            <p>Commission is deducted per sale at the agreed rate. No guarantees on sale price or timeframe. Items unsold after 90 days may be disposed of unless the Client requests return at their expense.</p>
            <h3 style={{ fontSize: 14, color: 'var(--cyan)', marginTop: 20, marginBottom: 8 }}>9. Confidentiality & Deal Sheet Non-Disclosure</h3>
            <p><strong>General:</strong> Both parties agree to keep commercially sensitive information confidential, including but not limited to product sourcing information, pricing, supplier details, and business strategies.</p>
            <p><strong>DBH Deals — Strict Confidentiality:</strong> The DBH Deals daily deal sheet is an exclusive, members-only service strictly limited to 15 active subscribers. The Client agrees to the following:</p>
            <p><strong>a)</strong> The content of the deal sheet (including product leads, ASINs, pricing data, source links, discount codes, and any associated analysis) is <strong>strictly confidential</strong> and must not be shared, forwarded, screenshot, or disclosed to any third party under any circumstances.</p>
            <p><strong>b)</strong> The Client must not share their portal login credentials or allow any other person to access the deal sheet through their account.</p>
            <p><strong>c)</strong> DBH Prep actively monitors seller counts and marketplace activity on featured products to detect patterns of unauthorised sharing. Any evidence or reasonable suspicion of sharing will result in <strong>immediate termination</strong> of deal sheet access without refund.</p>
            <p><strong>d)</strong> In the event of a confirmed breach of this confidentiality clause, DBH Prep reserves the right to terminate all services (including prep and liquidation) and pursue damages for any commercial loss suffered.</p>
            <h3 style={{ fontSize: 14, color: 'var(--cyan)', marginTop: 20, marginBottom: 8 }}>10. Client Portal & Data</h3>
            <p>The Client is responsible for login security. Data is processed in accordance with UK GDPR solely for service delivery.</p>
            <h3 style={{ fontSize: 14, color: 'var(--cyan)', marginTop: 20, marginBottom: 8 }}>11. Termination</h3>
            <p>Either party may terminate with 14 days written notice. Outstanding invoices must be settled within 5 working days. Inventory is released once all payments are received. DBH Prep may terminate immediately for non-payment exceeding 14 days.</p>
            <h3 style={{ fontSize: 14, color: 'var(--cyan)', marginTop: 20, marginBottom: 8 }}>12. Governing Law</h3>
            <p>This Agreement is governed by the laws of England and Wales.</p>
            {!tcsScrolled && <div style={{ textAlign: 'center', padding: '20px 0 0', color: 'var(--text-muted)', fontSize: 12 }}>↓ Scroll to read all terms ↓</div>}
          </div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '28px' }}>
            <h3 style={{ fontSize: 16, color: '#fff', marginBottom: 16 }}>Declaration & Signature</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>By completing the form below, I confirm that I have read, understood, and agree to be bound by the terms and conditions set out above. I accept full responsibility for the payment of all invoices raised by DBH Prep.</p>
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
      <div className="mobile-header"><div style={{ display: "flex", alignItems: "center", gap: 10 }}><div className="sidebar-logo-icon" style={{ width: 32, height: 32, fontSize: 11 }}>DBH</div><span style={{ fontWeight: 700 }}>DBH PREP</span></div><button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}><Icons.Menu /></button></div>
      <div className={`sidebar-overlay ${sidebarOpen ? "open" : ""}`} onClick={() => setSidebarOpen(false)} />
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-logo"><div className="sidebar-logo-icon">DBH</div><div><div className="sidebar-logo-text">DBH PREP</div><div className="sidebar-logo-sub">Client Portal</div></div></div>
        <div className="service-tabs"><div className={`service-tab ${service === "prep" ? "active prep" : ""}`} onClick={() => setService("prep")}>📦 Prep</div><div className={`service-tab ${service === "liquidation" ? "active liquidation" : ""}`} onClick={() => setService("liquidation")}>💰 Liquidation</div><div className={`service-tab deals ${service === "deals" ? "active deals" : ""}`} onClick={() => setService("deals")}>📋 Deals</div></div>
        <nav className="sidebar-nav">
          <div className="sidebar-section-title">{service === "prep" ? "FBA Prep" : service === "liquidation" ? "Liquidation" : "DBH Deals"}</div>
          {currentNav.map(item => <div key={item.id} className={`nav-item ${page === item.id ? `active ${service}` : ""}`} onClick={() => { setPage(item.id); setSidebarOpen(false); }}><item.icon />{item.label}</div>)}
          <div className="sidebar-section-title" style={{ marginTop: 16 }}>Account</div>
          {sharedNav.map(item => <div key={item.id} className={`nav-item ${page === item.id ? `active ${service}` : ""}`} onClick={() => { setPage(item.id); setSidebarOpen(false); }}><item.icon />{item.label}</div>)}
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
  { id: "evri",        label: "Evri Job",    icon: "🚚", color: "#f97316" },
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

        const calcShip = s => (parseFloat(s.units_prepped)||0)*(parseFloat(s.unit_cost)||0) + (parseFloat(s.box_count)||0)*(parseFloat(s.box_cost)||0) + (parseFloat(s.other_fees)||0);

        const ships = Array.isArray(shipments) ? shipments : [];
        const liqItems = Array.isArray(liqSales) ? liqSales : [];

        const prepMonthly = ships.filter(s => (s.date_shipped || s.created_at || "").slice(0,7) === selectedMonth).reduce((a, s) => a + calcShip(s), 0);
        const prepAllTime = ships.reduce((a, s) => a + calcShip(s), 0);
        const prepWeekly = ships.filter(s => getWeekKey((s.date_shipped || s.created_at || "").slice(0,10)) === curWeekKey).reduce((a, s) => a + calcShip(s), 0);

        const liqMonthly = liqItems.filter(s => s.date_sold && getMonthKey(s.date_sold) === selectedMonth).reduce((a, s) => a + (parseFloat(s.dbh_fee) || 0), 0);
        const liqAllTime = liqItems.reduce((a, s) => a + (parseFloat(s.dbh_fee) || 0), 0);
        const liqWeekly = liqItems.filter(s => s.date_sold && getWeekKey(s.date_sold) === curWeekKey).reduce((a, s) => a + (parseFloat(s.dbh_fee) || 0), 0);

        const curYear = new Date().getFullYear();
        const prepYTD = ships.filter(s => (s.date_shipped || s.created_at || "").slice(0,4) === String(curYear)).reduce((a, s) => a + calcShip(s), 0);
        const liqYTD = liqItems.filter(s => s.date_sold && s.date_sold.slice(0,4) === String(curYear)).reduce((a, s) => a + (parseFloat(s.dbh_fee) || 0), 0);
        setAutoData({ prepMonthly, prepWeekly, prepAllTime, liqMonthly, liqWeekly, liqAllTime, prepYTD, liqYTD, loading: false });
      } catch(e) {
        console.error("Tracker fetch error:", e);
        setAutoData(d => ({ ...d, loading: false }));
      }
    }
    if (token) fetchAuto();
  }, [token, selectedMonth]);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0,10), stream:"prep", type:"revenue", category:"", amount:"", note:"" });
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
    const rev = autoRev + manualRev;
    return { ...s, rev, exp, profit: rev-exp, hrs, rate: hrs>0?(rev-exp)/hrs:0, isAuto: autoRev > 0 };
  });

  const ytdYear = new Date().getFullYear();
  const manualCumProfit = data.entries.filter(e=>e.type==="profit"&&e.date.slice(0,4)===String(ytdYear)).reduce((a,e)=>a+Number(e.amount),0) - data.entries.filter(e=>e.type==="cost"&&e.date.slice(0,4)===String(ytdYear)).reduce((a,e)=>a+Number(e.amount),0);
  const autoCumProfit = (autoData.prepYTD||0) + (autoData.liqYTD||0);

  const totals = {
    rev: stats.reduce((a,s)=>a+s.rev,0), exp: stats.reduce((a,s)=>a+s.exp,0),
    profit: stats.reduce((a,s)=>a+s.profit,0), hrs: stats.reduce((a,s)=>a+s.hrs,0),
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
  const [loading, setLoading] = useState(true);
  const showToast = useCallback(msg => setToast(msg), []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [c, p, s, l] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/profiles?select=*`, { headers: supabase.headers(token) }).then(r => r.json()),
      fetch(`${SUPABASE_URL}/rest/v1/parcels?select=*&order=created_at.desc`, { headers: supabase.headers(token) }).then(r => r.json()),
      fetch(`${SUPABASE_URL}/rest/v1/shipments?select=*&order=created_at.desc`, { headers: supabase.headers(token) }).then(r => r.json()),
      fetch(`${SUPABASE_URL}/rest/v1/liquidation_stock?select=*&order=created_at.desc`, { headers: supabase.headers(token) }).then(r => r.json())
    ]);
    if (Array.isArray(c)) setClients(c.filter(x => x.email !== ADMIN_EMAIL));
    if (Array.isArray(p)) setParcels(p);
    if (Array.isArray(s)) setShipments(s);
    if (Array.isArray(l)) setLiquidation(l);
    setLoading(false);
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);

  const selectClient = (client) => { setSelectedClient(client); setPage("client"); setClientTab("prep"); };
  const backToClients = () => { setSelectedClient(null); setPage("clients"); };

  const adminNav = [
    { id: "clients", label: "All Clients", icon: Icons.Users },
    { id: "deals", label: "DBH Deals", icon: Icons.List },
    { id: "tracker", label: "Income Tracker", icon: Icons.BarChart },
    { id: "settings", label: "Settings", icon: Icons.Settings }
  ];

  const renderPage = () => {
    if (page === "settings") return <AdminSettingsPage token={token} showToast={showToast} />;
    if (page === "deals") return <AdminDealsPage token={token} showToast={showToast} />;
    if (page === "tracker") return <AdminTrackerPage />;
    if (page === "tracker") return <AdminTrackerPage />;
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
    return <AdminClientsPage clients={clients} parcels={parcels} shipments={shipments} liquidation={liquidation} onSelectClient={selectClient} loading={loading} token={token} onRefresh={loadData} showToast={showToast} />;
  };

  return (
    <div className="app-wrapper">
      <div className="mobile-header"><div style={{ display: "flex", alignItems: "center", gap: 10 }}><div className="sidebar-logo-icon admin" style={{ width: 32, height: 32, fontSize: 11 }}>DBH</div><span style={{ fontWeight: 700 }}>DBH ADMIN</span></div><button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}><Icons.Menu /></button></div>
      <div className={`sidebar-overlay ${sidebarOpen ? "open" : ""}`} onClick={() => setSidebarOpen(false)} />
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-logo"><div className="sidebar-logo-icon admin">DBH</div><div><div className="sidebar-logo-text">DBH PREP</div><div className="sidebar-logo-sub">Admin Panel</div></div></div>
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
function AdminClientsPage({ clients, parcels, shipments, liquidation, onSelectClient, loading, token, onRefresh, showToast }) {
  const [search, setSearch] = useState("");
  const [clientOrder, setClientOrder] = useState([]);
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [archivedIds, setArchivedIds] = useState([]);
  const [activeTab, setActiveTab] = useState("active");

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

  const filteredClients = sortedClients.filter(c => 
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.company_name?.toLowerCase().includes(search.toLowerCase())
  );

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
          const today = new Date(); today.setHours(0,0,0,0);
          const paymentDue = (() => {
            if (c.next_payment_date) return new Date(c.next_payment_date) <= today;
            if (c.deals_last_payment) { const paid = new Date(c.deals_last_payment); const due = new Date(paid.getFullYear(), paid.getMonth() + 1, paid.getDate()); return due <= today; }
            return false;
          })();
          const renewalSubject = encodeURIComponent("DBH Deals — Subscription Renewal Due");
          const renewalBody = encodeURIComponent(`Hi ${c.full_name || "there"},\n\nYour DBH Deals subscription renewal is now due.\n\nPlease arrange payment to continue your access to the daily deal sheet.\n\nThanks,\nDBH Prep`);
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
                <div style={{ display: "flex", gap: 4 }}>
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
    liq_commission: client.liq_commission || "30"
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
      liq_commission: client.liq_commission || "30"
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
        liq_commission: parseFloat(pricing.liq_commission) || 30
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

  const getMonthlyShipmentBreakdown = (month, year) => {
    // month is 0-indexed here
    return shipments.filter(s => {
      const d = new Date(s.date_shipped || s.created_at);
      return d.getMonth() === month && d.getFullYear() === year;
    });
  };

  const generateAndUploadPDF = async (inv) => {
    showToast("Generating PDF...");
    try {
      // Load jsPDF
      if (!window.jspdf) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
          script.onload = resolve; script.onerror = reject;
          document.head.appendChild(script);
        });
      }
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: "mm", format: "a4" });

      // Colours & fonts
      const C = { dark: [18, 18, 24], mid: [40, 40, 55], muted: [110, 110, 130], border: [220, 220, 230], amber: [230, 160, 30], green: [34, 197, 94], bg: [248, 248, 252] };
      const W = 210; const M = 18;

      // Header background
      doc.setFillColor(...C.dark);
      doc.rect(0, 0, W, 42, "F");

      // Company name
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18); doc.setFont("helvetica", "bold");
      doc.text("DBH FBA LTD", M, 16);

      // Company details right side
      doc.setFontSize(8); doc.setFont("helvetica", "normal");
      doc.setTextColor(180, 180, 200);
      const compRight = ["19-21 Hatchett Street", "Birmingham B19 3NX", "United Kingdom", "VAT No: 441311541", "dbharper77@gmail.com"];
      compRight.forEach((line, i) => doc.text(line, W - M, 10 + i * 5.2, { align: "right" }));

      // INVOICE label
      doc.setTextColor(230, 160, 30); doc.setFontSize(26); doc.setFont("helvetica", "bold");
      doc.text("INVOICE", M, 36);

      // Invoice meta box
      doc.setFillColor(...C.bg);
      doc.roundedRect(M, 48, W - M * 2, 30, 3, 3, "F");
      doc.setDrawColor(...C.border); doc.setLineWidth(0.3);
      doc.roundedRect(M, 48, W - M * 2, 30, 3, 3, "S");

      const mNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
      const periodMonth = inv.period_month - 1; // 0-indexed
      const periodYear = inv.period_year;

      // Invoice number / date / due date
      const issueDate = new Date(periodYear, periodMonth + 1, 1); // 1st of following month
      const dueDate = new Date(periodYear, periodMonth + 1, 6);   // 6th = 5 days after 1st
      const fmt = d => d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

      doc.setTextColor(...C.muted); doc.setFontSize(8); doc.setFont("helvetica", "normal");
      doc.text("Invoice Number", M + 6, 57);
      doc.text("Issue Date", M + 68, 57);
      doc.text("Due Date", M + 120, 57);

      doc.setTextColor(...C.dark); doc.setFontSize(9.5); doc.setFont("helvetica", "bold");
      doc.text(inv.invoice_number || "—", M + 6, 63);
      doc.text(fmt(issueDate), M + 68, 63);
      doc.text(fmt(dueDate), M + 120, 63);

      doc.setTextColor(...C.muted); doc.setFontSize(8); doc.setFont("helvetica", "normal");
      doc.text("Period", M + 6, 70);
      doc.setTextColor(...C.dark); doc.setFontSize(9); doc.setFont("helvetica", "bold");
      doc.text(`${mNames[periodMonth]} ${periodYear}`, M + 6, 76);

      // Bill To
      doc.setTextColor(...C.muted); doc.setFontSize(8); doc.setFont("helvetica", "normal");
      doc.text("BILL TO", M, 90);
      doc.setDrawColor(...C.amber[0], ...[]); 
      doc.setDrawColor(230, 160, 30); doc.setLineWidth(0.8);
      doc.line(M, 92, M + 20, 92);

      doc.setTextColor(...C.dark); doc.setFontSize(10); doc.setFont("helvetica", "bold");
      doc.text(client.full_name || client.email || "Client", M, 98);
      doc.setFontSize(8.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...C.mid);
      doc.text(client.email || "", M, 104);

      // Shipments breakdown
      const monthShipments = getMonthlyShipmentBreakdown(periodMonth, periodYear);

      let y = 116;
      // Table header
      doc.setFillColor(...C.dark);
      doc.rect(M, y, W - M * 2, 9, "F");
      doc.setTextColor(255, 255, 255); doc.setFontSize(8); doc.setFont("helvetica", "bold");
      doc.text("Description", M + 4, y + 6);
      doc.text("Qty", 110, y + 6, { align: "right" });
      doc.text("Unit Price", 140, y + 6, { align: "right" });
      doc.text("Amount (ex VAT)", W - M - 4, y + 6, { align: "right" });
      y += 9;

      let subtotal = 0;
      const rows = [];

      monthShipments.forEach((s, idx) => {
        const units = parseInt(s.units_prepped) || 0;
        const unitCost = parseFloat(s.unit_cost) || 0;
        const boxes = parseInt(s.box_count) || 0;
        const boxCost = parseFloat(s.box_cost) || 0;
        const other = parseFloat(s.other_fees) || 0;
        const label = s.shipment_id ? `Shipment ${s.shipment_id}` : `Shipment ${idx + 1}`;

        if (units > 0 && unitCost > 0) {
          const amt = units * unitCost;
          rows.push({ desc: `${label} — Unit Prep (${units} units × £${unitCost.toFixed(2)})`, qty: units, unit: unitCost, amt });
          subtotal += amt;
        }
        if (boxes > 0 && boxCost > 0) {
          const amt = boxes * boxCost;
          rows.push({ desc: `${label} — Box Labelling (${boxes} boxes × £${boxCost.toFixed(2)})`, qty: boxes, unit: boxCost, amt });
          subtotal += amt;
        }
        if (other > 0) {
          rows.push({ desc: `${label} — Additional Charges`, qty: 1, unit: other, amt: other });
          subtotal += other;
        }
      });

      // If no shipments found, fall back to invoice total
      if (rows.length === 0) {
        rows.push({ desc: `FBA Prep Services — ${mNames[periodMonth]} ${periodYear}`, qty: 1, unit: parseFloat(inv.amount), amt: parseFloat(inv.amount) });
        subtotal = parseFloat(inv.amount);
      }

      rows.forEach((row, i) => {
        const bg = i % 2 === 0 ? C.bg : [255, 255, 255];
        doc.setFillColor(...bg);
        doc.rect(M, y, W - M * 2, 8, "F");
        doc.setTextColor(...C.dark); doc.setFontSize(8); doc.setFont("helvetica", "normal");
        doc.text(row.desc, M + 4, y + 5.5);
        doc.text(row.qty.toString(), 110, y + 5.5, { align: "right" });
        doc.text(`£${row.unit.toFixed(2)}`, 140, y + 5.5, { align: "right" });
        doc.text(`£${row.amt.toFixed(2)}`, W - M - 4, y + 5.5, { align: "right" });
        y += 8;
      });

      // Divider
      doc.setDrawColor(...C.border); doc.setLineWidth(0.3);
      doc.line(M, y + 2, W - M, y + 2);
      y += 8;

      // Totals box
      const vat = subtotal * 0.20;
      const total = subtotal + vat;
      const totalsX = W - M - 70;

      doc.setFillColor(...C.bg);
      doc.roundedRect(totalsX, y, 70, 36, 3, 3, "F");

      doc.setTextColor(...C.muted); doc.setFontSize(8.5); doc.setFont("helvetica", "normal");
      doc.text("Subtotal (ex VAT)", totalsX + 4, y + 8);
      doc.text("VAT (20%)", totalsX + 4, y + 17);
      doc.setDrawColor(...C.border); doc.line(totalsX + 4, y + 21, totalsX + 66, y + 21);

      doc.setTextColor(...C.dark); doc.setFontSize(8.5); doc.setFont("helvetica", "bold");
      doc.text(`£${subtotal.toFixed(2)}`, totalsX + 66, y + 8, { align: "right" });
      doc.text(`£${vat.toFixed(2)}`, totalsX + 66, y + 17, { align: "right" });

      // Total highlight
      doc.setFillColor(...C.dark);
      doc.roundedRect(totalsX, y + 23, 70, 11, 2, 2, "F");
      doc.setTextColor(255, 255, 255); doc.setFontSize(9); doc.setFont("helvetica", "bold");
      doc.text("TOTAL DUE", totalsX + 4, y + 30.5);
      doc.setTextColor(...C.amber);
      doc.text(`£${total.toFixed(2)}`, totalsX + 66, y + 30.5, { align: "right" });

      y += 44;

      // Payment terms
      doc.setFillColor(230, 160, 30, 0.1);
      doc.setFillColor(255, 248, 230);
      doc.roundedRect(M, y, W - M * 2, 20, 3, 3, "F");
      doc.setTextColor(160, 100, 0); doc.setFontSize(8); doc.setFont("helvetica", "bold");
      doc.text("Payment Terms", M + 4, y + 7);
      doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
      doc.text(`Payment is due by ${fmt(dueDate)}. Please include invoice reference ${inv.invoice_number || ""} with your payment.`, M + 4, y + 13);
      doc.text("For payment queries please contact dbharper77@gmail.com", M + 4, y + 18);

      // Footer
      doc.setFillColor(...C.dark);
      doc.rect(0, 287, W, 10, "F");
      doc.setTextColor(150, 150, 170); doc.setFontSize(7); doc.setFont("helvetica", "normal");
      doc.text("DBH FBA LTD | Registered in England & Wales | VAT No: 441311541", W / 2, 293, { align: "center" });

      // Export as blob and upload
      const pdfBlob = doc.output("blob");
      const path = `${client.id}/${inv.invoice_number}.pdf`;
      const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/Invoices/${path}`, {
        method: "POST",
        headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}`, "Content-Type": "application/pdf", "x-upsert": "true" },
        body: pdfBlob
      });
      if (!uploadRes.ok) { const t = await uploadRes.text(); throw new Error(t); }

      const signRes = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/Invoices/${path}`, {
        method: "POST",
        headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ expiresIn: 31536000 })
      });
      const signData = await signRes.json();
      const rawUrl = signData.signedURL || signData.signedUrl || (signData.data && (signData.data.signedURL || signData.data.signedUrl)) || "";
      const url = rawUrl.startsWith("http") ? rawUrl : `${SUPABASE_URL}${rawUrl}`;
      await updateInvoice(inv.id, { invoice_url: url }, true);
      showToast("PDF generated & uploaded!");
    } catch (err) {
      console.error("PDF error:", err);
      showToast("PDF failed: " + err.message);
    }
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
        <div className={`service-tab ${tab === "prep" ? "active prep" : ""}`} onClick={() => setTab("prep")}>📦 Prep</div>
        <div className={`service-tab ${tab === "liquidation" ? "active liquidation" : ""}`} onClick={() => setTab("liquidation")}>💰 Liquidation</div>
        <div className={`service-tab deals ${tab === "deals" ? "active deals" : ""}`} onClick={() => setTab("deals")}>📋 Deals</div>
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 12 }}>
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
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Liquidation (%)</label>
                <input className="input" type="number" step="1" value={pricing.liq_commission} onChange={e => setPricing({ ...pricing, liq_commission: e.target.value })} />
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
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      {inv.invoice_url && (
                        <a href={inv.invoice_url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--cyan)", fontSize: 13 }}>📄 View PDF</a>
                      )}
                      <button
                        style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", background: "var(--amber, #e6a01e)", border: "none", borderRadius: 7, fontSize: 12, color: "#fff", fontWeight: 600 }}
                        onClick={() => generateAndUploadPDF(inv)}>
                        ✨ {inv.invoice_url ? "Regenerate" : "Generate PDF"}
                      </button>
                    </div>
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
  const inWarehouseUnits = localParcels.filter(p=>p.status==="delivered").reduce((s,p)=>s+(parseInt(p.qty_received)||parseInt(p.quantity)||0),0);
  const preppedUnits = preppedParcels.reduce((s,p)=>s+(parseInt(p.qty_received)||parseInt(p.quantity)||0),0);
  const collectedUnits = completedParcels.reduce((s,p)=>s+(parseInt(p.qty_received)||parseInt(p.quantity)||0),0);

  const now = new Date();
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const calcShipmentCost = s => (parseFloat(s.units_prepped)||0)*(parseFloat(s.unit_cost)||0)+(parseFloat(s.box_count)||0)*(parseFloat(s.box_cost)||0)+(parseFloat(s.other_fees)||0);
  const thisMonthTotal = localShipments.filter(s=>{ const d=new Date(s.date_shipped||s.created_at); return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear(); }).reduce((s,x)=>s+calcShipmentCost(x),0);
  const totalCharges = localShipments.reduce((s,x)=>s+calcShipmentCost(x),0);

  const startEdit = item => {
    setEditingId(item.id);
    setEditData({ status: item.status||"in_transit", admin_notes: item.admin_notes||"", needs_attention: item.needs_attention||false, attention_reason: item.attention_reason||"", qty_received: item.qty_received||"" });
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
    // If changing to prepped, always show partial prep modal so admin can confirm qty
    // qtyReceived = how many are physically here; totalExpected = original order qty
    const qtyReceived = parseInt(editData.qty_received) || parseInt(oldItem?.qty_received) || parseInt(oldItem?.quantity) || 1;
    const totalExpected = parseInt(oldItem?.quantity) || 1;
    if (editData.status === "prepped" && oldItem?.status !== "prepped") {
      // If coming from partial_delivery, the row is already split — just mark prepped, no modal needed
      if (oldItem?.status === "partial_delivery") {
        await doSaveEdit({ ...editData, status: "prepped" });
        return;
      }
      // Otherwise show modal to handle split
      setPartialPrepItem({ ...oldItem, quantity: totalExpected, qty_received: qtyReceived });
      setPartialPrepQty(String(qtyReceived));
      return;
    }
    // Auto-detect partial delivery: if marking delivered but qty_received < quantity, use partial_delivery status
    let finalData = { ...editData };
    if (editData.status === "delivered" && editData.qty_received && parseInt(editData.qty_received) < (oldItem?.quantity || 0)) {
      finalData.status = "partial_delivery";
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

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div className="card-title" style={{ margin: 0 }}>Inbound Parcels</div>
          <button className="btn btn-primary btn-sm" onClick={() => { setShowAddParcel(true); setAddParcelForm({ product_name: "", asin: "", sku: "", supplier: "", quantity: "", qty_received: "", tracking_number: "", status: "in_transit" }); }}><Icons.Plus /> Add Parcel</button>
        </div>
        {showAddParcel && (
          <div style={{ background: "var(--bg-primary)", padding: 16, borderRadius: 10, marginBottom: 16 }}>
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
        {sorted.length === 0 ? <div style={{ color: "var(--text-muted)" }}>No active parcels.</div> :
        <div className="table-wrap"><table>
          <thead><tr><th>Date</th><th>Product</th><th>Supplier</th><th>SKU</th><th>ASIN</th><th>Expected</th><th>Received</th><th>Tracking</th><th>Status</th><th>Notes</th><th>Flag</th><th></th></tr></thead>
          <tbody>{sorted.map(p => {
            const isEdit = editingId === p.id, data = isEdit ? editData : p;
            return <tr key={p.id} className={isEdit ? "edit-row" : ""}>
              <td style={{ fontSize: 12 }}>{formatShortDate(p.date_added)}</td>
              <td><ProductWithImage name={p.product_name} asin={p.asin} /></td>
              <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{p.supplier || "—"}</td>
              <td className="mono" style={{ fontSize: 12 }}>{p.sku || "—"}</td>
              <td className="mono" style={{ fontSize: 12 }}><AsinWithImage asin={p.asin} /></td>
              <td className="mono">{p.quantity}</td>
              <td className="mono">{isEdit ? <input type="number" className="inline-input" style={{ width: 60 }} value={data.qty_received || ""} onChange={e => setEditData({ ...editData, qty_received: parseInt(e.target.value) || 0 })} placeholder="0" /> : (p.qty_received || "—")}</td>
              <td className="mono" style={{ fontSize: 11 }}>{p.tracking_number ? <a href={`https://parcelsapp.com/en/tracking/${p.tracking_number}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--cyan)" }}>{p.tracking_number.slice(0, 12)}...</a> : "—"}</td>
              <td>{isEdit ? <select className="inline-select" value={data.status} onChange={e => setEditData({ ...editData, status: e.target.value })}>{PREP_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}</select> : p.needs_attention ? <span className="badge badge-attention">{p.attention_reason}</span> : <StatusBadge status={p.status} />}</td>
              <td>{isEdit ? <input className="inline-input" value={data.admin_notes} onChange={e => setEditData({ ...editData, admin_notes: e.target.value })} placeholder="Notes..." /> : <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{p.admin_notes || "—"}</span>}</td>
              <td>{isEdit ? <div><label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}><input type="checkbox" checked={data.needs_attention} onChange={e => setEditData({ ...editData, needs_attention: e.target.checked })} /> Flag</label>{data.needs_attention && <select className="inline-select" style={{ marginTop: 4, width: "100%" }} value={data.attention_reason} onChange={e => setEditData({ ...editData, attention_reason: e.target.value })}><option value="">Select...</option>{ATTENTION_REASONS.map(r => <option key={r} value={r}>{r}</option>)}</select>}</div> : "—"}</td>
              <td>{isEdit ? <div style={{ display: "flex", gap: 4 }}><button className="btn-icon" onClick={saveEdit} disabled={saving}><Icons.Save /></button><button className="btn-icon btn-danger" onClick={() => setEditingId(null)}><Icons.X /></button></div> : <div style={{ display: "flex", gap: 4 }}><button className="btn-icon" onClick={() => startEdit(p)}><Icons.Edit /></button><button className="btn-icon btn-danger" onClick={() => deleteParcel(p.id)}><Icons.Trash /></button></div>}</td>
            </tr>;
          })}</tbody>
        </table></div>}
      </div>

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

function AdminClientLiquidation({ client, liquidation, token, showToast, onRefresh }) {
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [activeTab, setActiveTab] = useState("transit");
  const [sales, setSales] = useState([]);
  const [logSaleItem, setLogSaleItem] = useState(null);
  const [saleForm, setSaleForm] = useState({ date_sold: "", qty_sold: 1, sale_price: "", ebay_fees: "", shipping: "", fixed_fee: "0.40" });
  const [saleSaving, setSaleSaving] = useState(false);
  const [receiveItem, setReceiveItem] = useState(null);
  const [receiveQty, setReceiveQty] = useState("");

  useEffect(() => { fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.discord_webhook_url`, { headers: supabase.headers(token) }).then(r => r.json()).then(d => { if (d?.[0]?.value) setWebhookUrl(d[0].value); }); }, []);
  useEffect(() => { loadSales(); }, [client.id]);

  const loadSales = async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/liquidation_sales?user_id=eq.${client.id}&order=date_sold.desc`, { headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}` } });
    const data = await res.json();
    if (Array.isArray(data)) setSales(data);
  };

  const calcSale = (form) => {
    const sale = parseFloat(form.sale_price) || 0;
    const ebay = parseFloat(form.ebay_fees) || 0;
    const ship = parseFloat(form.shipping) || 0;
    const fixed = parseFloat(form.fixed_fee) || 0.40;
    const net = sale - ebay - ship;
    const pct = net >= 200 ? 0.10 : 0.15;
    const fee = net * pct;
    const payout = net - fee - fixed;
    return { net, pct, fee, fixed, payout };
  };

  const openLogSale = (item) => {
    setLogSaleItem(item);
    const today = new Date().toISOString().split('T')[0];
    setSaleForm({ date_sold: today, qty_sold: 1, sale_price: "", ebay_fees: "", shipping: "", fixed_fee: "0.40" });
  };

  const submitSale = async () => {
    if (!saleForm.date_sold || !saleForm.sale_price) { showToast("Enter date and sale price"); return; }
    setSaleSaving(true);
    const c = calcSale(saleForm);
    const payoutDate = new Date(saleForm.date_sold);
    payoutDate.setDate(payoutDate.getDate() + 35);
    const payload = {
      stock_id: logSaleItem.id, user_id: client.id, date_sold: saleForm.date_sold,
      qty_sold: parseInt(saleForm.qty_sold) || 1, sale_price: parseFloat(saleForm.sale_price),
      ebay_fees: parseFloat(saleForm.ebay_fees) || 0, shipping: parseFloat(saleForm.shipping) || 0,
      net_sale: parseFloat(c.net.toFixed(2)), dbh_pct: parseFloat((c.pct * 100).toFixed(2)),
      dbh_fee: parseFloat(c.fee.toFixed(2)), fixed_fee: parseFloat(saleForm.fixed_fee) || 0.40,
      payout: parseFloat(c.payout.toFixed(2)), payout_date: payoutDate.toISOString().split('T')[0], paid: false
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
    if (hw) await sendDiscordNotification(hw, null, { title: "💰 ITEM SOLD", color: 0x22c55e, fields: [{ name: "Product", value: logSaleItem.product_name, inline: false }, { name: "Sale Price", value: `£${parseFloat(saleForm.sale_price).toFixed(2)}`, inline: true }, { name: "Qty Sold", value: `${saleForm.qty_sold}`, inline: true }, { name: "Your Payout", value: `£${c.payout.toFixed(2)}`, inline: true }, { name: "Payout Date", value: (() => { const d = new Date(saleForm.date_sold); d.setDate(d.getDate()+35); return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); })(), inline: true }], footer: { text: "Payout in 35 days to allow for returns" } });
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
        const payoutDate = new Date(dataToSave.date_sold);
        payoutDate.setDate(payoutDate.getDate() + 35);
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

  const transitItems = liquidation.filter(i => !i.received);
  const listedItems = liquidation.filter(i => i.received && ((i.quantity || 1) - (i.qty_sold || 0)) > 0);
  const totalSalesPayout = sales.reduce((s, r) => s + (parseFloat(r.payout) || 0), 0);
  const sf = saleForm, sc = calcSale(sf);

  return (
    <>
      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 20 }}>
        <div className="card stat-card liquidation"><div className="card-title">In Transit</div><div className="stat-value" style={{ color: "var(--amber)" }}>{transitItems.length}</div></div>
        <div className="card stat-card liquidation"><div className="card-title">Listed</div><div className="stat-value" style={{ color: "var(--cyan)" }}>{listedItems.length}</div></div>
        <div className="card stat-card liquidation"><div className="card-title">Total Payouts</div><div className="stat-value" style={{ color: "var(--orange)" }}>£{totalSalesPayout.toFixed(2)}</div></div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[["transit","⏳ In Transit"],["listed","📦 Listed"],["sales","💰 Sales"]].map(([k,l]) =>
          <button key={k} onClick={() => setActiveTab(k)} style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid", fontSize: 13, fontWeight: 600, cursor: "pointer", background: activeTab === k ? "var(--orange)" : "transparent", color: activeTab === k ? "#000" : "var(--text-secondary)", borderColor: activeTab === k ? "var(--orange)" : "var(--border)" }}>{l}</button>
        )}
      </div>

      {/* In Transit Tab */}
      {activeTab === "transit" && <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {transitItems.length === 0 ? <div className="empty-state"><Icons.Box /><p>No items in transit.</p></div> :
        <div className="table-wrap"><table style={{ width: "100%", tableLayout: "fixed" }}>
          <thead><tr><th>Product</th><th>LPN</th><th>Qty</th><th>COG</th><th>Condition</th><th></th></tr></thead>
          <tbody>{transitItems.map(item => {
            const isEdit = editingId === item.id, data = isEdit ? editData : item;
            return <tr key={item.id} className={isEdit ? "edit-row" : ""}>
              <td style={{ fontWeight: 600 }}>{isEdit ? <div style={{ display:"flex", flexDirection:"column", gap:4 }}><input className="inline-input" style={{ width: 160 }} placeholder="Product name" value={data.product_name} onChange={e => setEditData({ ...editData, product_name: e.target.value })} /><input className="inline-input" style={{ width: 120 }} placeholder="ASIN" value={data.asin} onChange={e => setEditData({ ...editData, asin: e.target.value })} onBlur={async e => { const asin = e.target.value.trim(); if (asin && asin.length >= 10) { showToast("Looking up product..."); const title = await lookupAsinTitle(asin); if (title) { setEditData(prev => ({ ...prev, product_name: title })); showToast("Title found!"); } } }} /></div> : <div>{item.product_name}<div style={{ fontSize: 11, color: "var(--text-muted)" }}>{item.asin}</div></div>}</td>
              <td>{isEdit ? <input className="inline-input" style={{ width: 80 }} value={data.lpn_number} onChange={e => setEditData({ ...editData, lpn_number: e.target.value })} /> : <span className="mono" style={{ fontSize: 12 }}>{item.lpn_number || "—"}</span>}</td>
              <td>{isEdit ? <input type="number" min="1" className="inline-input" style={{ width: 55 }} value={data.quantity} onChange={e => setEditData({ ...editData, quantity: e.target.value })} /> : <span className="mono">{item.quantity || 1}</span>}</td>
              <td>{isEdit ? <input type="number" step="0.01" className="inline-input" style={{ width: 65 }} value={data.cog} onChange={e => setEditData({ ...editData, cog: e.target.value })} /> : (item.cog ? <span className="mono" style={{ color: "var(--orange)" }}>£{parseFloat(item.cog).toFixed(2)}</span> : "—")}</td>
              <td>{isEdit ? <select className="inline-select" style={{ width: 80 }} value={data.condition} onChange={e => setEditData({ ...editData, condition: e.target.value })}><option value="">—</option><option>New</option><option>Like New</option><option>Good</option><option>Fair</option><option>Poor</option></select> : <span style={{ fontSize: 12 }}>{item.condition || "—"}</span>}</td>
              <td>
                {isEdit ? <div style={{ display: "flex", gap: 4 }}><button className="btn-icon" onClick={saveEdit} disabled={saving}><Icons.Save /></button><button className="btn-icon btn-danger" onClick={() => setEditingId(null)}><Icons.X /></button></div>
                : <div style={{ display: "flex", gap: 4 }}>
                    <button className="btn-icon" onClick={() => startEdit(item)}><Icons.Edit /></button>
                    <button style={{ padding: "4px 10px", background: "var(--green)", color: "#000", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }} onClick={() => { setReceiveItem(item); setReceiveQty(String(item.quantity || 1)); }}>✓ Received</button>
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
          <thead><tr><th>Product</th><th>LPN</th><th>Qty Total</th><th>Qty Sold</th><th>Remaining</th><th>COG</th><th>Condition</th><th>Listed</th><th></th></tr></thead>
          <tbody>{listedItems.map(item => {
            const isEdit = editingId === item.id, data = isEdit ? editData : item;
            const remaining = (item.quantity || 1) - (item.qty_sold || 0);
            return <tr key={item.id} className={isEdit ? "edit-row" : ""}>
              <td style={{ fontWeight: 600 }}>{isEdit ? <div style={{ display:"flex", flexDirection:"column", gap:4 }}><input className="inline-input" style={{ width: 160 }} placeholder="Product name" value={data.product_name} onChange={e => setEditData({ ...editData, product_name: e.target.value })} /><input className="inline-input" style={{ width: 120 }} placeholder="ASIN" value={data.asin} onChange={e => setEditData({ ...editData, asin: e.target.value })} onBlur={async e => { const asin = e.target.value.trim(); if (asin && asin.length >= 10) { showToast("Looking up product..."); const title = await lookupAsinTitle(asin); if (title) { setEditData(prev => ({ ...prev, product_name: title })); showToast("Title found!"); } } }} /></div> : <div>{item.product_name}<div style={{ fontSize: 11, color: "var(--text-muted)" }}>{item.asin}</div></div>}</td>
              <td>{isEdit ? <input className="inline-input" style={{ width: 80 }} value={data.lpn_number} onChange={e => setEditData({ ...editData, lpn_number: e.target.value })} /> : <span className="mono" style={{ fontSize: 12 }}>{item.lpn_number || "—"}</span>}</td>
              <td>{isEdit ? <input type="number" min="1" className="inline-input" style={{ width: 55 }} value={data.quantity} onChange={e => setEditData({ ...editData, quantity: e.target.value })} /> : <span className="mono">{item.quantity || 1}</span>}</td>
              <td><span className="mono" style={{ color: "var(--green)" }}>{item.qty_sold || 0}</span></td>
              <td><span className="mono" style={{ color: remaining <= 0 ? "var(--red)" : "var(--text-primary)", fontWeight: 700 }}>{remaining}</span></td>
              <td>{isEdit ? <input type="number" step="0.01" className="inline-input" style={{ width: 65 }} value={data.cog} onChange={e => setEditData({ ...editData, cog: e.target.value })} /> : (item.cog ? <span className="mono" style={{ color: "var(--orange)" }}>£{parseFloat(item.cog).toFixed(2)}</span> : "—")}</td>
              <td>{isEdit ? <select className="inline-select" style={{ width: 80 }} value={data.condition} onChange={e => setEditData({ ...editData, condition: e.target.value })}><option value="">—</option><option>New</option><option>Like New</option><option>Good</option><option>Fair</option><option>Poor</option></select> : <span style={{ fontSize: 12 }}>{item.condition || "—"}</span>}</td>
              <td style={{ textAlign: "center" }}>{isEdit ? <input type="checkbox" checked={data.listed} onChange={e => setEditData({ ...editData, listed: e.target.checked })} /> : <button onClick={async (e) => { e.stopPropagation(); const newVal = !item.listed; await fetch(`${SUPABASE_URL}/rest/v1/liquidation_stock?id=eq.${item.id}`, { method: "PATCH", headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ listed: newVal }) }); showToast(newVal ? "Marked listed!" : "Unmarked!"); onRefresh(); }} style={{ background: "transparent", border: `1px solid ${item.listed ? "var(--green)" : "var(--border)"}`, color: item.listed ? "var(--green)" : "var(--text-muted)", borderRadius: 6, padding: "3px 10px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>{item.listed ? "Yes" : "No"}</button>}</td>
              <td>
                {isEdit ? <div style={{ display: "flex", gap: 4 }}><button className="btn-icon" onClick={saveEdit} disabled={saving}><Icons.Save /></button><button className="btn-icon btn-danger" onClick={() => setEditingId(null)}><Icons.X /></button></div>
                : <div style={{ display: "flex", gap: 4 }}>
                    <button className="btn-icon" onClick={() => startEdit(item)}><Icons.Edit /></button>
                    {remaining > 0 && <button style={{ padding: "4px 10px", background: "var(--orange)", color: "#000", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }} onClick={() => openLogSale(item)}>+ Sale</button>}
                  </div>}
              </td>
            </tr>;
          })}</tbody>
        </table></div>}
      </div>}

      {/* Sales Tab */}
      {activeTab === "sales" && <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {sales.length === 0 ? <div className="empty-state"><Icons.Box /><p>No sales recorded yet.</p></div> :
        <div className="table-wrap"><table style={{ width: "100%", tableLayout: "fixed" }}>
          <thead><tr><th>Date Sold</th><th>Product</th><th>Qty</th><th>Sale £</th><th>eBay Fees</th><th>Shipping</th><th>Net Sale</th><th>DBH %</th><th>DBH £</th><th>Fixed</th><th>Payout</th><th>Payout Date</th><th>Paid</th></tr></thead>
          <tbody>{sales.map(s => {
            const stockItem = liquidation.find(l => l.id === s.stock_id);
            return <tr key={s.id}>
              <td style={{ fontSize: 12 }}>{s.date_sold ? formatShortDate(s.date_sold) : "—"}</td>
              <td style={{ fontWeight: 600, fontSize: 12 }}>{stockItem?.product_name || "—"}</td>
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
              <td style={{ textAlign: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
                  {s.paid ? <span style={{ color: "var(--green)" }}>✓ Paid</span> : <button style={{ padding: "3px 8px", background: "transparent", border: "1px solid var(--green)", color: "var(--green)", borderRadius: 5, fontSize: 11, cursor: "pointer" }} onClick={async () => { await fetch(`${SUPABASE_URL}/rest/v1/liquidation_sales?id=eq.${s.id}`, { method: "PATCH", headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ paid: true }) }); loadSales(); showToast("Marked paid!"); }}>Mark Paid</button>}
                  <button style={{ padding: "3px 8px", background: "transparent", border: "1px solid var(--red)", color: "var(--red)", borderRadius: 5, fontSize: 11, cursor: "pointer" }} onClick={async () => { if (!confirm("Mark as refunded? This will delete the sale and reduce qty sold.")) return; const stockItem = liquidation.find(l => l.id === s.stock_id); const newQtySold = Math.max(0, (stockItem?.qty_sold || 0) - (s.qty_sold || 1)); await fetch(`${SUPABASE_URL}/rest/v1/liquidation_sales?id=eq.${s.id}`, { method: "DELETE", headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}` } }); await fetch(`${SUPABASE_URL}/rest/v1/liquidation_stock?id=eq.${s.stock_id}`, { method: "PATCH", headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ qty_sold: newQtySold }) }); const hw = client.discord_webhook || webhookUrl; if (hw) await sendDiscordNotification(hw, null, { title: "🔄 SALE REFUNDED", color: 0xff5252, fields: [{ name: "Product", value: stockItem?.product_name || "Unknown", inline: true }, { name: "Qty Returned", value: `${s.qty_sold || 1}`, inline: true }], footer: { text: "Item returned to listed stock" } }); showToast("Sale refunded!"); loadSales(); onRefresh(); }}>↩ Refund</button>
                </div>
              </td>
            </tr>;
          })}</tbody>
        </table></div>}
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
                await fetch(`${SUPABASE_URL}/rest/v1/liquidation_stock`, { method: "POST", headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}`, "Content-Type": "application/json", "Prefer": "return=representation" }, body: JSON.stringify({ product_name: receiveItem.product_name, asin: receiveItem.asin, sku: receiveItem.sku, lpn_number: receiveItem.lpn_number, cog: receiveItem.cog, purchase_price: receiveItem.purchase_price, condition: receiveItem.condition, user_id: client.id, quantity: remaining, received: false, date_added: receiveItem.date_added }) });
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
          </div>

          {sf.sale_price && <div style={{ background: "rgba(0,230,118,0.05)", border: "1px solid rgba(0,230,118,0.2)", borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, fontSize: 13 }}>
              <div><div style={{ color: "var(--text-muted)", fontSize: 11 }}>Net Sale</div><div className="mono" style={{ fontWeight: 600 }}>£{sc.net.toFixed(2)}</div></div>
              <div><div style={{ color: "var(--text-muted)", fontSize: 11 }}>DBH %</div><div className="mono" style={{ fontWeight: 600, color: "var(--orange)" }}>{(sc.pct*100).toFixed(0)}%</div></div>
              <div><div style={{ color: "var(--text-muted)", fontSize: 11 }}>DBH £</div><div className="mono" style={{ fontWeight: 600, color: "var(--orange)" }}>£{sc.fee.toFixed(2)}</div></div>
            </div>
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ color: "var(--text-muted)", fontSize: 12 }}>Payout Date: {sf.date_sold ? (() => { const d = new Date(sf.date_sold); d.setDate(d.getDate()+35); return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); })() : "—"}</div>
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
