import { useState, useEffect, createContext, useContext, useCallback } from "react";

const SUPABASE_URL = "https://cccsreyspmpwnfbmegwz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_hKQDmZHXC-OhF1A8de7vLw_jVcAGhkT";
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
    const saved = sessionStorage.getItem("bhb_session");
    if (saved) {
      try {
        const session = JSON.parse(saved);
        setToken(session.access_token);
        supabase.auth.getUser(session.access_token).then((u) => {
          if (u && u.id) { setUser(u); setProfile({ full_name: u.user_metadata?.full_name || "", company_name: u.user_metadata?.company_name || "" }); }
          else { sessionStorage.removeItem("bhb_session"); }
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
    sessionStorage.setItem("bhb_session", JSON.stringify(data));
    return data;
  };
  const signUp = async (email, password, metadata) => {
    const data = await supabase.auth.signUp(email, password, metadata);
    if (data.error || data.msg?.includes("error")) throw new Error(data.msg || data.error || "Signup failed");
    if (data.access_token) { setToken(data.access_token); setUser(data.user); setProfile({ full_name: metadata.full_name || "", company_name: metadata.company_name || "" }); sessionStorage.setItem("bhb_session", JSON.stringify(data)); }
    return data;
  };
  const signOut = async () => { if (token) await supabase.auth.signOut(token); setUser(null); setToken(null); setProfile(null); sessionStorage.removeItem("bhb_session"); };
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
.badge{padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;display:inline-block}.badge-transit{background:rgba(179,136,255,0.15);color:var(--purple)}.badge-partial_delivery{background:rgba(255,171,0,0.15);color:var(--amber)}.badge-delivered{background:rgba(0,229,255,0.15);color:var(--cyan)}.badge-prepped,.badge-shipped,.badge-paid,.badge-sold{background:rgba(0,230,118,0.15);color:var(--green)}.badge-pending{background:rgba(255,171,0,0.15);color:var(--amber)}.badge-attention{background:rgba(255,82,82,0.15);color:var(--red)}
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
`;

// Helpers
const PREP_STATUSES = ["in_transit", "partial_delivery", "delivered", "prepped", "shipped"];
const ATTENTION_REASONS = ["Damaged", "Gated", "Missing Items", "Wrong Product"];

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
function sortByStatus(items, completed = ["shipped", "prepped"]) {
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
function MiniChart({ data, color }) {
  const max = Math.max(...data.map(d => d.count), 1);
  return <div><div className="chart-container">{data.map((d, i) => <div key={i} className={`chart-bar ${color}`} style={{ height: `${(d.count / max) * 100}%` }} />)}</div><div className="chart-labels">{data.map((d, i) => <span key={i}>{d.label}</span>)}</div></div>;
}

// Auth
function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  if (showSignup) return <SignupPage onBack={() => setShowSignup(false)} />;
  const handleLogin = async () => { setError(""); setLoading(true); try { await signIn(email, password); } catch (e) { setError(e.message); } setLoading(false); };
  return (
    <div className="auth-wrapper"><div className="auth-card">
      <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", marginBottom: 32 }}><div className="sidebar-logo-icon">BHB</div><div><div style={{ fontWeight: 800, fontSize: 22 }}>BHB PREP</div><div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: 2 }}>CLIENT PORTAL</div></div></div>
      <div className="auth-title">Welcome back</div><div className="auth-sub">Sign in to manage your inventory</div>
      {error && <div className="auth-error">{error}</div>}
      <div className="input-group"><label className="input-label">Email</label><input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} /></div>
      <div className="input-group"><label className="input-label">Password</label><input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} /></div>
      <button className="btn btn-primary auth-btn" onClick={handleLogin} disabled={loading}>{loading ? "Signing in..." : "Sign In"}</button>
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
      <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", marginBottom: 32 }}><div className="sidebar-logo-icon">BHB</div><div><div style={{ fontWeight: 800, fontSize: 22 }}>BHB PREP</div><div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: 2 }}>CLIENT PORTAL</div></div></div>
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
    return sum + units + (parseFloat(s.box_cost) || 0) + (parseFloat(s.other_fees) || 0);
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
        <div className="card"><div className="card-title">Recent Parcels</div>{parcels.length === 0 ? <div style={{ color: "var(--text-muted)", marginTop: 12 }}>No parcels yet.</div> : <div style={{ marginTop: 12 }}>{parcels.slice(0, 5).map(p => <div key={p.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}><div><div style={{ fontWeight: 600 }}>{p.product_name}</div><div style={{ fontSize: 12, color: "var(--text-muted)" }}>{p.quantity} units</div></div>{p.needs_attention ? <span className="badge badge-attention">{p.attention_reason}</span> : <StatusBadge status={p.status} />}</div>)}</div>}</div>
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
    if (["shipped", "prepped", "delivered"].includes(status)) {
      alert("Cannot delete items that have been delivered, prepped or shipped.");
      return;
    }
    if (!confirm("Delete?")) return; 
    await fetch(`${SUPABASE_URL}/rest/v1/parcels?id=eq.${id}`, { method: "DELETE", headers: supabase.headers(token) }); 
    showToast("Deleted!"); 
    onRefresh(); 
  };
  const canEdit = (status) => !["shipped", "prepped"].includes(status);
  const canDelete = (status) => !["shipped", "prepped", "delivered"].includes(status);
  return (
    <><div className="page-header"><div><div className="page-title">My Inventory</div><div className="page-subtitle">Your prep orders</div></div></div>
    <div className="page-body">
      <div style={{ marginBottom: 20 }}><div className="search-bar"><Icons.Search /><input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} /></div></div>
      {filtered.length === 0 ? <div className="card empty-state"><Icons.Package /><p>No parcels found.</p></div> :
      <div className="card" style={{ padding: 0, overflow: "hidden" }}><div className="table-wrap"><table>
        <thead><tr><th>Date</th><th>Product</th><th>SKU</th><th>ASIN</th><th>Qty</th><th>Tracking</th><th>Status</th><th></th></tr></thead>
        <tbody>{filtered.map(p => {
          const isEdit = editingId === p.id, data = isEdit ? editData : p, done = ["shipped", "prepped"].includes(p.status);
          return <tr key={p.id} className={isEdit ? "edit-row" : ""} style={done ? { opacity: 0.6 } : {}}>
            <td style={{ fontSize: 12 }}>{formatShortDate(p.date_added)}</td>
            <td style={{ fontWeight: 600 }}>{isEdit ? <input className="inline-input" value={data.product_name} onChange={e => setEditData({ ...editData, product_name: e.target.value })} /> : p.product_name}</td>
            <td className="mono">{isEdit ? <input className="inline-input" style={{ width: 80 }} value={data.sku} onChange={e => setEditData({ ...editData, sku: e.target.value })} /> : (p.sku || "—")}</td>
            <td className="mono" style={{ fontSize: 12 }}>{isEdit ? <input className="inline-input" style={{ width: 100 }} value={data.asin} onChange={e => setEditData({ ...editData, asin: e.target.value })} /> : (p.asin || "—")}</td>
            <td className="mono">{isEdit ? <input type="number" className="inline-input" style={{ width: 50 }} value={data.quantity} onChange={e => setEditData({ ...editData, quantity: parseInt(e.target.value) || 1 })} /> : p.quantity}</td>
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
      <div className="fee-grid" style={{ marginBottom: 28 }}>{[{ name: "Standard Prep", price: "£0.45", desc: "Label, poly bag" }, { name: "Bundle Prep", price: "£0.65", desc: "Multi-pack bundling" }, { name: "Oversize Prep", price: "£1.50", desc: "Large/heavy items" }].map(f => <div className="fee-card" key={f.name}><div className="fee-price">{f.price}</div><div className="fee-name">{f.name}</div><div className="fee-desc">{f.desc}</div></div>)}</div>
      <div className="card"><div className="card-title">Volume Discounts</div><div style={{ display: "flex", gap: 16, marginTop: 12 }}>{[{ r: "500+", d: "5%" }, { r: "2,000+", d: "10%" }, { r: "5,000+", d: "15%" }].map(v => <div key={v.r} style={{ flex: 1, padding: "12px 16px", background: "var(--bg-primary)", borderRadius: 10, border: "1px solid var(--border)" }}><div style={{ fontWeight: 700, color: "var(--cyan)" }}>{v.d} off</div><div style={{ fontSize: 13, color: "var(--text-muted)" }}>{v.r} units</div></div>)}</div></div>
    </div></>
  );
}

function PrepBillingPage({ billingPeriods, invoices = [], shipments = [], token }) {
  const now = new Date(), thisMonth = now.getMonth(), thisYear = now.getFullYear();
  const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1, lastYear = thisMonth === 0 ? thisYear - 1 : thisYear;
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  const calcTotal = (s) => {
    const units = (parseFloat(s.units_prepped) || 0) * (parseFloat(s.unit_cost) || 0);
    const boxes = parseFloat(s.box_cost) || 0;
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
function LiquidationDashboard({ liquidationStock }) {
  const daily = getDailyData(liquidationStock.filter(s => s.date_sold), "date_sold");
  const pending = liquidationStock.filter(s => s.sale_price && !s.paid).reduce((sum, s) => sum + calculatePayout(s).payout, 0);
  const paidTotal = liquidationStock.filter(s => s.paid).reduce((sum, s) => sum + calculatePayout(s).payout, 0);
  const sold = liquidationStock.filter(s => s.sale_price).length;
  const unpaid = liquidationStock.filter(s => s.sale_price && s.date_sold && !s.paid);
  const next = unpaid.sort((a, b) => new Date(a.date_sold) - new Date(b.date_sold))[0];
  const nextDate = next ? getPayoutDate(next.date_sold) : null;
  return (
    <><div className="page-header"><div><div className="page-title">Liquidation Dashboard</div><div className="page-subtitle">Overview of your liquidation activity</div></div><div className="speed-badge liquidation"><Icons.TrendingUp /> Track Returns</div></div>
    <div className="page-body">
      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="card stat-card liquidation"><div className="card-title">Pending Payout</div><div className="stat-value" style={{ color: "var(--amber)" }}>£{pending.toFixed(2)}</div></div>
        <div className="card stat-card liquidation"><div className="card-title">Total Paid</div><div className="stat-value" style={{ color: "var(--green)" }}>£{paidTotal.toFixed(2)}</div></div>
        <div className="card stat-card liquidation"><div className="card-title">Items Sold</div><div className="stat-value" style={{ color: "var(--orange)" }}>{sold}</div></div>
      </div>
      {nextDate && <div className="card" style={{ marginBottom: 24, background: "linear-gradient(135deg,rgba(255,145,0,0.08),transparent)", borderColor: "rgba(255,145,0,0.2)" }}><div className="card-title" style={{ color: "var(--orange)" }}>Next Payout</div><div style={{ marginTop: 8, fontSize: 18, fontWeight: 700 }}>{formatDate(nextDate)}</div><div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>35 days after sale</div></div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="card"><div className="card-title">Sales (7 Days)</div><MiniChart data={daily} color="orange" /></div>
        <div className="card"><div className="card-title">Upcoming Payouts</div>{unpaid.length === 0 ? <div style={{ color: "var(--text-muted)", marginTop: 12 }}>No pending payouts.</div> : <div style={{ marginTop: 12 }}>{unpaid.map(s => { const c = calculatePayout(s); const pd = getPayoutDate(s.date_sold); return <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border)" }}><div><div style={{ fontWeight: 600 }}>{s.product_name}</div><div style={{ fontSize: 12, color: "var(--text-muted)" }}>{pd ? formatDate(pd) : "—"}</div></div><div className="mono" style={{ fontWeight: 700, color: "var(--green)" }}>£{c.payout.toFixed(2)}</div></div>; })}</div>}</div>
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
    await supabase.from("liquidation_stock", token).insert({ ...form, purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : null, user_id: user.id, date_added: new Date().toISOString().split('T')[0] });
    showToast("Stock submitted!"); setForm({ removal_order_id: "", product_name: "", asin: "", sku: "", purchase_price: "" }); onRefresh(); setSaving(false);
  };
  return (
    <><div className="page-header"><div><div className="page-title">Send Stock</div><div className="page-subtitle">Submit returns for liquidation</div></div></div>
    <div className="page-body"><div className="card" style={{ maxWidth: 600 }}>
      <div className="input-group"><label className="input-label">Removal Order ID (if applicable)</label><input className="input" placeholder="e.g. 2601071LW5" value={form.removal_order_id} onChange={update("removal_order_id")} /></div>
      <div className="input-group"><label className="input-label">Product Name *</label><input className="input" placeholder="Product description" value={form.product_name} onChange={update("product_name")} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}><div className="input-group"><label className="input-label">ASIN</label><input className="input" value={form.asin} onChange={update("asin")} /></div><div className="input-group"><label className="input-label">SKU</label><input className="input" value={form.sku} onChange={update("sku")} /></div></div>
      <div className="input-group"><label className="input-label">Purchase Price (£)</label><input className="input" type="number" step="0.01" placeholder="What you paid" value={form.purchase_price} onChange={update("purchase_price")} /></div>
      <button className="btn btn-primary liquidation" onClick={handleSubmit} disabled={saving || !form.product_name}>{saving ? "Submitting..." : "Submit Stock"}</button>
    </div></div></>
  );
}

function LiquidationMyStockPage({ liquidationStock, token, onRefresh, showToast }) {
  const [filter, setFilter] = useState("all");
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const filtered = liquidationStock.filter(s => { if (filter === "all") return true; if (filter === "pending") return !s.sale_price; if (filter === "sold") return s.sale_price && !s.paid; if (filter === "paid") return s.paid; return true; });
  const startEdit = item => { setEditingId(item.id); setEditData({ removal_order_id: item.removal_order_id || "", product_name: item.product_name || "", asin: item.asin || "", sku: item.sku || "", purchase_price: item.purchase_price || "" }); };
  const saveEdit = async () => { setSaving(true); await fetch(`${SUPABASE_URL}/rest/v1/liquidation_stock?id=eq.${editingId}`, { method: "PATCH", headers: { ...supabase.headers(token), Prefer: "return=representation" }, body: JSON.stringify({ ...editData, purchase_price: editData.purchase_price ? parseFloat(editData.purchase_price) : null }) }); showToast("Saved!"); setEditingId(null); onRefresh(); setSaving(false); };
  const deleteItem = async id => { if (!confirm("Delete?")) return; await fetch(`${SUPABASE_URL}/rest/v1/liquidation_stock?id=eq.${id}`, { method: "DELETE", headers: supabase.headers(token) }); showToast("Deleted!"); onRefresh(); };
  return (
    <><div className="page-header"><div><div className="page-title">My Stock</div><div className="page-subtitle">Your liquidation items</div></div></div>
    <div className="page-body">
      <div style={{ marginBottom: 20 }}><select className="input" style={{ width: "auto", minWidth: 160 }} value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All Items</option><option value="pending">Pending Sale</option><option value="sold">Sold - Awaiting Payout</option><option value="paid">Paid</option></select></div>
      {filtered.length === 0 ? <div className="card empty-state"><Icons.Box /><p>No items found.</p></div> :
      <div className="card" style={{ padding: 0, overflow: "hidden" }}><div className="table-wrap"><table>
        <thead><tr><th>Date</th><th>Product</th><th>ASIN</th><th>LPN</th><th>Cost</th><th>Sale</th><th>Fees</th><th>Payout</th><th>Est. Payout Date</th><th></th></tr></thead>
        <tbody>{filtered.map(s => {
          const c = calculatePayout(s), pd = getPayoutDate(s.date_sold), isEdit = editingId === s.id, data = isEdit ? editData : s;
          return <tr key={s.id} className={isEdit ? "edit-row" : ""}>
            <td style={{ fontSize: 12 }}>{formatShortDate(s.date_added)}</td>
            <td style={{ fontWeight: 600 }}>{isEdit ? <input className="inline-input" value={data.product_name} onChange={e => setEditData({ ...editData, product_name: e.target.value })} /> : s.product_name}</td>
            <td className="mono" style={{ fontSize: 12 }}>{isEdit ? <input className="inline-input" style={{ width: 100 }} value={data.asin} onChange={e => setEditData({ ...editData, asin: e.target.value })} /> : (s.asin || "—")}</td>
            <td className="mono" style={{ fontSize: 12 }}>{s.lpn_number || "—"}</td>
            <td className="mono">{isEdit ? <input type="number" step="0.01" className="inline-input" style={{ width: 70 }} value={data.purchase_price} onChange={e => setEditData({ ...editData, purchase_price: e.target.value })} /> : (s.purchase_price ? `£${parseFloat(s.purchase_price).toFixed(2)}` : "—")}</td>
            <td className="mono">{s.sale_price ? `£${parseFloat(s.sale_price).toFixed(2)}` : "—"}</td>
            <td className="mono" style={{ fontSize: 12, color: "var(--red)" }}>{s.sale_price ? `£${c.totalFees.toFixed(2)}` : "—"}</td>
            <td className="mono" style={{ fontWeight: 700, color: s.sale_price ? "var(--green)" : "var(--text-muted)" }}>{s.sale_price ? `£${c.payout.toFixed(2)}` : "—"}</td>
            <td style={{ fontSize: 12 }}>{s.paid ? <span style={{ color: "var(--green)" }}>Paid</span> : pd ? formatDate(pd) : "—"}</td>
            <td>{isEdit ? <div style={{ display: "flex", gap: 4 }}><button className="btn-icon" onClick={saveEdit} disabled={saving}><Icons.Save /></button><button className="btn-icon btn-danger" onClick={() => setEditingId(null)}><Icons.X /></button></div> : <div style={{ display: "flex", gap: 4 }}><button className="btn-icon" onClick={() => startEdit(s)}><Icons.Edit /></button><button className="btn-icon btn-danger" onClick={() => deleteItem(s.id)}><Icons.Trash /></button></div>}</td>
          </tr>;
        })}</tbody>
      </table></div></div>}
    </div></>
  );
}

function LiquidationFeesPage() {
  return (
    <><div className="page-header"><div><div className="page-title">Liquidation Fees</div><div className="page-subtitle">Transparent pricing</div></div></div>
    <div className="page-body">
      <div className="fee-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 28 }}>{[{ n: "Selling Fee", p: "15%", d: "10% if ≥£200", i: "💰" }, { n: "Prep Fee", p: "£0.40", d: "Per item", i: "📦" }, { n: "Bundling", p: "£0.30", d: "Per bundle", i: "🧩" }, { n: "Oversized", p: "£1.00", d: "Per item", i: "📏" }].map(f => <div className="fee-card" key={f.n} style={{ borderColor: "var(--orange)" }}><div style={{ fontSize: 28, marginBottom: 8 }}>{f.i}</div><div className="fee-price" style={{ color: "var(--orange)" }}>{f.p}</div><div className="fee-name">{f.n}</div><div className="fee-desc">{f.d}</div></div>)}</div>
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
      if (editData.status === "shipped" && oldItem?.status !== "shipped") {
        await sendDiscordNotification(clientWebhook, null, {
          title: "📦 SHIPPED",
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
    setEditData({ lpn_number: item.lpn_number || "", condition: item.condition || "", listed: item.listed || false, sale_price: item.sale_price || "", date_sold: item.date_sold || "", ebay_fees: item.ebay_fees || "", shipping: item.shipping || "", fee_prep: item.fee_prep || false, fee_bundle: item.fee_bundle || false, fee_oversize: item.fee_oversize || false, paid: item.paid || false });
  };

  const saveEdit = async () => {
    setSaving(true);
    const oldItem = items.find(i => i.id === editingId);
    const dataToSave = { ...editData, sale_price: editData.sale_price ? parseFloat(editData.sale_price) : null, ebay_fees: editData.ebay_fees ? parseFloat(editData.ebay_fees) : null, shipping: editData.shipping ? parseFloat(editData.shipping) : null, date_sold: editData.date_sold || null };
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
      <div className="card" style={{ padding: 0, overflow: "hidden" }}><div className="table-wrap"><table style={{ minWidth: 1100 }}>
        <thead><tr>{!selectedClient && <th>Client</th>}<th>Product</th><th>LPN</th><th>Condition</th><th>Listed</th><th>Sale £</th><th>Sold Date</th><th>Fees</th><th>Payout</th><th>Payout Date</th><th>Paid</th><th></th></tr></thead>
        <tbody>{clientItems.map(item => {
          const client = clients.find(c => c.id === item.user_id);
          const isEdit = editingId === item.id, data = isEdit ? editData : item;
          const calc = calculatePayout(isEdit ? { ...item, ...editData, sale_price: editData.sale_price, ebay_fees: editData.ebay_fees, shipping: editData.shipping } : item);
          const pd = getPayoutDate(data.date_sold);
          return <tr key={item.id} className={isEdit ? "edit-row" : ""}>
            {!selectedClient && <td style={{ fontSize: 13 }}>{client?.full_name || "—"}</td>}
            <td style={{ fontWeight: 600 }}>{item.product_name}<div style={{ fontSize: 11, color: "var(--text-muted)" }}>{item.asin}</div></td>
            <td>{isEdit ? <input className="inline-input" style={{ width: 80 }} value={data.lpn_number} onChange={e => setEditData({ ...editData, lpn_number: e.target.value })} /> : <span className="mono" style={{ fontSize: 12 }}>{item.lpn_number || "—"}</span>}</td>
            <td>{isEdit ? <select className="inline-select" style={{ width: 90 }} value={data.condition} onChange={e => setEditData({ ...editData, condition: e.target.value })}><option value="">—</option><option>New</option><option>Like New</option><option>Good</option><option>Fair</option><option>Poor</option></select> : <span style={{ fontSize: 12 }}>{item.condition || "—"}</span>}</td>
            <td style={{ textAlign: "center" }}>{isEdit ? <input type="checkbox" checked={data.listed} onChange={e => setEditData({ ...editData, listed: e.target.checked })} /> : (item.listed ? "Yes" : "No")}</td>
            <td>{isEdit ? <input type="number" step="0.01" className="inline-input" style={{ width: 70 }} value={data.sale_price} onChange={e => setEditData({ ...editData, sale_price: e.target.value })} /> : item.sale_price ? <span className="mono">£{parseFloat(item.sale_price).toFixed(2)}</span> : "—"}</td>
            <td>{isEdit ? <input type="date" className="inline-input" style={{ width: 130, colorScheme: "dark" }} value={data.date_sold} onChange={e => setEditData({ ...editData, date_sold: e.target.value })} /> : <span style={{ fontSize: 12 }}>{item.date_sold ? formatShortDate(item.date_sold) : "—"}</span>}</td>
            <td>{isEdit ? <div style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 11 }}><input type="number" step="0.01" className="inline-input" style={{ width: 60 }} placeholder="eBay" value={data.ebay_fees} onChange={e => setEditData({ ...editData, ebay_fees: e.target.value })} /><input type="number" step="0.01" className="inline-input" style={{ width: 60 }} placeholder="Ship" value={data.shipping} onChange={e => setEditData({ ...editData, shipping: e.target.value })} /></div> : <span className="mono" style={{ fontSize: 12, color: "var(--red)" }}>{item.sale_price ? `£${calc.totalFees.toFixed(2)}` : "—"}</span>}</td>
            <td><span className="mono" style={{ fontWeight: 700, color: calc.payout > 0 ? "var(--green)" : "var(--text-muted)" }}>{calc.payout > 0 ? `£${calc.payout.toFixed(2)}` : "—"}</span></td>
            <td style={{ fontSize: 12 }}>{pd ? formatDate(pd) : "—"}</td>
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
    const boxes = parseFloat(s.box_cost) || 0;
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

function ProfilePage() {
  const { user, profile, signOut } = useAuth();
  return (
    <><div className="page-header"><div><div className="page-title">Profile</div><div className="page-subtitle">Your account</div></div></div>
    <div className="page-body"><div className="card" style={{ maxWidth: 600 }}>
      <div className="card-title">Account Details</div>
      <div style={{ marginTop: 16 }}>
        <div style={{ marginBottom: 16 }}><div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>Name</div><div style={{ fontWeight: 600 }}>{profile?.full_name || "—"}</div></div>
        <div style={{ marginBottom: 16 }}><div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>Company</div><div style={{ fontWeight: 600 }}>{profile?.company_name || "—"}</div></div>
        <div><div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>Email</div><div style={{ fontWeight: 600 }}>{user?.email}</div></div>
      </div>
    </div><div className="card" style={{ maxWidth: 600, marginTop: 20 }}><button className="btn btn-secondary" onClick={signOut}><Icons.LogOut /> Sign Out</button></div></div></>
  );
}

// Client Shipments Page
function ClientShipmentsPage({ shipments }) {
  const calcTotal = (s) => {
    const units = (parseFloat(s.units_prepped) || 0) * (parseFloat(s.unit_cost) || 0);
    const boxes = parseFloat(s.box_cost) || 0;
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
  const [toast, setToast] = useState(null);
  const showToast = useCallback(msg => setToast(msg), []);

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      const [p, i, b, l, s] = await Promise.all([
        supabase.from("parcels", token).select(),
        supabase.from("invoices", token).select(),
        supabase.from("billing_periods", token).select(),
        supabase.from("liquidation_stock", token).select(),
        supabase.from("shipments", token).select()
      ]);
      if (Array.isArray(p)) setParcels(p);
      if (Array.isArray(i)) setInvoices(i);
      if (Array.isArray(b)) setBillingPeriods(b);
      if (Array.isArray(l)) setLiquidationStock(l);
      if (Array.isArray(s)) setShipments(s);
    } catch (e) { console.error(e); }
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { setPage("dashboard"); }, [service]);

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
  const sharedNav = [{ id: "profile", label: "Profile", icon: Icons.User }];
  const currentNav = service === "prep" ? prepNav : liqNav;
  const initials = (profile?.full_name || user?.email || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  const renderPage = () => {
    if (page === "profile") return <ProfilePage />;
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
      if (page === "dashboard") return <LiquidationDashboard liquidationStock={liquidationStock} />;
      if (page === "send-stock") return <LiquidationSendStockPage token={token} onRefresh={loadData} showToast={showToast} />;
      if (page === "my-stock") return <LiquidationMyStockPage liquidationStock={liquidationStock} token={token} onRefresh={loadData} showToast={showToast} />;
      if (page === "fees") return <LiquidationFeesPage />;
      if (page === "billing") return <LiquidationBillingPage liquidationStock={liquidationStock} />;
      return <LiquidationDashboard liquidationStock={liquidationStock} />;
    }
  };

  return (
    <div className="app-wrapper">
      <div className="mobile-header"><div style={{ display: "flex", alignItems: "center", gap: 10 }}><div className="sidebar-logo-icon" style={{ width: 32, height: 32, fontSize: 11 }}>BHB</div><span style={{ fontWeight: 700 }}>BHB PREP</span></div><button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}><Icons.Menu /></button></div>
      <div className={`sidebar-overlay ${sidebarOpen ? "open" : ""}`} onClick={() => setSidebarOpen(false)} />
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-logo"><div className="sidebar-logo-icon">BHB</div><div><div className="sidebar-logo-text">BHB PREP</div><div className="sidebar-logo-sub">Client Portal</div></div></div>
        <div className="service-tabs"><div className={`service-tab ${service === "prep" ? "active prep" : ""}`} onClick={() => setService("prep")}>📦 Prep</div><div className={`service-tab ${service === "liquidation" ? "active liquidation" : ""}`} onClick={() => setService("liquidation")}>💰 Liquidation</div></div>
        <nav className="sidebar-nav">
          <div className="sidebar-section-title">{service === "prep" ? "FBA Prep" : "Liquidation"}</div>
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
    { id: "settings", label: "Settings", icon: Icons.Settings }
  ];

  const renderPage = () => {
    if (page === "settings") return <AdminSettingsPage token={token} showToast={showToast} />;
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
      <div className="mobile-header"><div style={{ display: "flex", alignItems: "center", gap: 10 }}><div className="sidebar-logo-icon admin" style={{ width: 32, height: 32, fontSize: 11 }}>BHB</div><span style={{ fontWeight: 700 }}>BHB ADMIN</span></div><button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}><Icons.Menu /></button></div>
      <div className={`sidebar-overlay ${sidebarOpen ? "open" : ""}`} onClick={() => setSidebarOpen(false)} />
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-logo"><div className="sidebar-logo-icon admin">BHB</div><div><div className="sidebar-logo-text">BHB PREP</div><div className="sidebar-logo-sub">Admin Panel</div></div></div>
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
  
  const filteredClients = clients.filter(c => 
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.company_name?.toLowerCase().includes(search.toLowerCase())
  );

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

  if (loading) return <div className="loader"><div className="spinner" /></div>;
  return (
    <><div className="page-header"><div><div className="page-title">All Clients</div><div className="page-subtitle">{clients.length} clients</div></div></div>
    <div className="page-body">
      <div style={{ marginBottom: 20 }}>
        <div className="search-bar"><Icons.Search /><input placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} /></div>
      </div>
      {filteredClients.length === 0 ? <div className="card empty-state"><Icons.Users /><p>{search ? "No clients match your search." : "No clients yet."}</p></div> :
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {filteredClients.map(c => {
          const cp = parcels.filter(p => p.user_id === c.id);
          const cs = shipments.filter(s => s.user_id === c.id);
          const cl = liquidation.filter(l => l.user_id === c.id);
          const inbound = cp.filter(p => ["in_transit", "delivered"].includes(p.status)).length;
          const pendingLiq = cl.filter(l => !l.sale_price).length;
          return (
            <div key={c.id} className="client-card" onClick={() => onSelectClient(c)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{c.full_name || "No Name"}</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{c.email}</div>
                  {c.company_name && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{c.company_name}</div>}
                </div>
                <button className="btn-icon btn-danger" onClick={(e) => deleteClient(e, c.id)} title="Delete client"><Icons.Trash /></button>
              </div>
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

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // Sync webhook state when client changes
  useEffect(() => {
    setWebhook(client.discord_webhook || "");
  }, [client.discord_webhook]);

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

  // Calculate monthly totals from shipments
  const getMonthlyTotals = () => {
    const totals = {};
    shipments.forEach(s => {
      const d = new Date(s.date_shipped || s.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const cost = (parseFloat(s.units_prepped) || 0) * (parseFloat(s.unit_cost) || 0) + (parseFloat(s.box_cost) || 0) + (parseFloat(s.other_fees) || 0);
      totals[key] = (totals[key] || 0) + cost;
    });
    return totals;
  };

  const generateInvoice = async (month, year, manualAmount = null) => {
    const totals = getMonthlyTotals();
    const key = `${year}-${month}`;
    const amount = manualAmount !== null ? manualAmount : (totals[key] || 0);
    
    const res = await fetch(`${SUPABASE_URL}/rest/v1/invoices`, { 
      method: "POST", 
      headers: { ...supabase.headers(token), "Content-Type": "application/json", Prefer: "return=representation" }, 
      body: JSON.stringify({ user_id: client.id, period_month: month + 1, period_year: year, amount, status: "pending" }) 
    });
    if (res.ok) {
      showToast("Invoice created!");
      // Reload invoices
      const inv = await fetch(`${SUPABASE_URL}/rest/v1/invoices?user_id=eq.${client.id}&order=period_year.desc,period_month.desc`, { headers: supabase.headers(token) }).then(r => r.json());
      setInvoices(Array.isArray(inv) ? inv : []);
    } else {
      showToast("Error creating invoice");
    }
  };

  const updateInvoice = async (id, updates) => {
    await fetch(`${SUPABASE_URL}/rest/v1/invoices?id=eq.${id}`, { 
      method: "PATCH", 
      headers: { ...supabase.headers(token), "Content-Type": "application/json", Prefer: "return=representation" }, 
      body: JSON.stringify(updates) 
    });
    showToast("Invoice updated!");
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
      <div className="service-tabs" style={{ maxWidth: 450, marginBottom: 24, padding: 6 }}>
        <div className={`service-tab ${tab === "prep" ? "active prep" : ""}`} onClick={() => setTab("prep")}>📦 Prep</div>
        <div className={`service-tab ${tab === "liquidation" ? "active liquidation" : ""}`} onClick={() => setTab("liquidation")}>💰 Liquidation</div>
        <div className={`service-tab ${tab === "settings" ? "active admin" : ""}`} onClick={() => setTab("settings")}>⚙️ Settings</div>
      </div>
      {tab === "prep" ? 
        <AdminClientPrep client={client} parcels={parcels} shipments={shipments} token={token} showToast={showToast} onRefresh={onRefresh} /> :
       tab === "liquidation" ?
        <AdminClientLiquidation client={client} liquidation={liquidation} token={token} showToast={showToast} onRefresh={onRefresh} /> :
        <>
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-title">Discord Webhook</div>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <input className="input" placeholder="https://discord.com/api/webhooks/..." value={webhook} onChange={e => setWebhook(e.target.value)} />
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Notifications for: Shipped, Needs Attention, Liquidation Sold</div>
            </div>
            <button className="btn btn-primary admin" style={{ marginTop: 12 }} onClick={saveWebhook} disabled={savingWebhook}>{savingWebhook ? "Saving..." : "Save Webhook"}</button>
          </div>

          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div className="card-title" style={{ margin: 0 }}>Generate Invoice</div>
            </div>
            {getUninvoicedMonths().length === 0 ? (
              <div style={{ color: "var(--text-muted)", marginBottom: 12 }}>No past months to invoice</div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                {getUninvoicedMonths().map(({ month, year, amount }) => (
                  <button key={`${year}-${month}`} className="btn btn-primary btn-sm admin" onClick={() => generateInvoice(month, year)}>
                    {monthNames[month]} {year} — £{amount.toFixed(2)}
                  </button>
                ))}
              </div>
            )}
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>Or create manual invoice:</div>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <div className="input-group" style={{ margin: 0 }}>
                  <label className="input-label">Month</label>
                  <select className="input" id="manualMonth" defaultValue={new Date().getMonth()}>
                    {monthNames.map((m, i) => <option key={i} value={i}>{m}</option>)}
                  </select>
                </div>
                <div className="input-group" style={{ margin: 0 }}>
                  <label className="input-label">Year</label>
                  <input className="input" type="number" id="manualYear" defaultValue={new Date().getFullYear()} style={{ width: 80 }} />
                </div>
                <div className="input-group" style={{ margin: 0 }}>
                  <label className="input-label">Amount (£)</label>
                  <input className="input" type="number" step="0.01" id="manualAmount" placeholder="0.00" style={{ width: 100 }} />
                </div>
                <button className="btn btn-sm admin" onClick={() => {
                  const month = parseInt(document.getElementById("manualMonth").value);
                  const year = parseInt(document.getElementById("manualYear").value);
                  const amount = parseFloat(document.getElementById("manualAmount").value) || 0;
                  if (amount > 0) generateInvoice(month, year, amount);
                }}>Create</button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Invoices</div>
            {loadingInvoices ? <div style={{ color: "var(--text-muted)" }}>Loading...</div> :
             invoices.length === 0 ? <div style={{ color: "var(--text-muted)" }}>No invoices yet</div> :
             <div className="table-wrap"><table>
              <thead><tr><th>Period</th><th>Amount</th><th>Status</th><th>Invoice URL</th><th></th></tr></thead>
              <tbody>{invoices.map(inv => (
                <tr key={inv.id}>
                  <td style={{ fontWeight: 600 }}>{monthNames[inv.period_month - 1]} {inv.period_year}</td>
                  <td style={{ fontWeight: 700, color: "var(--amber)" }}>£{parseFloat(inv.amount).toFixed(2)}</td>
                  <td>
                    <select 
                      className="inline-select" 
                      value={inv.status} 
                      onChange={e => updateInvoice(inv.id, { status: e.target.value, paid_at: e.target.value === "paid" ? new Date().toISOString() : null })}
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </td>
                  <td>
                    {editingInvoice === inv.id ? (
                      <div style={{ display: "flex", gap: 4 }}>
                        <input className="inline-input" placeholder="https://..." value={invoiceUrl} onChange={e => setInvoiceUrl(e.target.value)} style={{ width: 200 }} />
                        <button className="btn-icon" onClick={() => updateInvoice(inv.id, { invoice_url: invoiceUrl })}><Icons.Save /></button>
                        <button className="btn-icon btn-danger" onClick={() => { setEditingInvoice(null); setInvoiceUrl(""); }}><Icons.X /></button>
                      </div>
                    ) : inv.invoice_url ? (
                      <a href={inv.invoice_url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--cyan)" }}>View Invoice</a>
                    ) : (
                      <button className="btn btn-sm" onClick={() => { setEditingInvoice(inv.id); setInvoiceUrl(inv.invoice_url || ""); }}>Add URL</button>
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
function AdminClientPrep({ client, parcels, shipments, token, showToast, onRefresh }) {
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [showShipmentForm, setShowShipmentForm] = useState(false);
  const [shipmentForm, setShipmentForm] = useState({ shipment_id: "", units_prepped: "", unit_cost: "0.45", box_count: "", box_cost: "", other_fees: "", notes: "", date_shipped: "" });
  const [editingShipment, setEditingShipment] = useState(null);
  const [webhookUrl, setWebhookUrl] = useState("");

  useEffect(() => { fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.discord_webhook_url`, { headers: supabase.headers(token) }).then(r => r.json()).then(d => { if (d?.[0]?.value) setWebhookUrl(d[0].value); }); }, []);

  const sorted = sortByStatus(parcels);
  const inbound = parcels.filter(p => ["in_transit", "partial_delivery"].includes(p.status)).length;

  const startEdit = item => {
    setEditingId(item.id);
    setEditData({ status: item.status || "in_transit", admin_notes: item.admin_notes || "", needs_attention: item.needs_attention || false, attention_reason: item.attention_reason || "", qty_received: item.qty_received || "" });
  };

  const saveEdit = async () => {
    setSaving(true);
    const oldItem = parcels.find(p => p.id === editingId);
    await fetch(`${SUPABASE_URL}/rest/v1/parcels?id=eq.${editingId}`, { method: "PATCH", headers: { ...supabase.headers(token), "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify(editData) });
    
    const clientWebhook = client.discord_webhook || webhookUrl;
    if (clientWebhook) {
      if (editData.status === "shipped" && oldItem?.status !== "shipped") {
        await sendDiscordNotification(clientWebhook, null, {
          title: "📦 SHIPPED",
          color: 0x22c55e,
          fields: [
            { name: "Product", value: oldItem?.product_name || "Unknown", inline: true },
            { name: "Units", value: `${oldItem?.quantity || 0}`, inline: true },
            { name: "SKU", value: oldItem?.sku || "—", inline: true }
          ],
          footer: { text: client.full_name || client.email }
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
          footer: { text: client.full_name || client.email }
        });
      }
    }
    showToast("Saved!"); setEditingId(null); onRefresh(); setSaving(false);
  };

  const deleteParcel = async (id) => {
    if (!confirm("Delete this parcel?")) return;
    await fetch(`${SUPABASE_URL}/rest/v1/parcels?id=eq.${id}`, { method: "DELETE", headers: supabase.headers(token) });
    showToast("Deleted!"); onRefresh();
  };

  const calcShipmentTotal = (s) => {
    const units = (parseFloat(s.units_prepped) || 0) * (parseFloat(s.unit_cost) || 0);
    const boxes = parseFloat(s.box_cost) || 0;
    const other = parseFloat(s.other_fees) || 0;
    return units + boxes + other;
  };

  const resetShipmentForm = () => { setShipmentForm({ shipment_id: "", units_prepped: "", unit_cost: "0.45", box_count: "", box_cost: "", other_fees: "", notes: "", date_shipped: "" }); setEditingShipment(null); };

  const startEditShipment = (s) => {
    setEditingShipment(s.id);
    setShipmentForm({ shipment_id: s.shipment_id, units_prepped: s.units_prepped || "", unit_cost: s.unit_cost || "0.45", box_count: s.box_count || "", box_cost: s.box_cost || "", other_fees: s.other_fees || "", notes: s.notes || "", date_shipped: s.date_shipped || "", status: s.status || "pending" });
    setShowShipmentForm(true);
  };

  const saveShipment = async () => {
    if (!shipmentForm.shipment_id) return;
    setSaving(true);
    const today = new Date().toISOString().split('T')[0];
    const baseData = { shipment_id: shipmentForm.shipment_id, units_prepped: parseInt(shipmentForm.units_prepped) || 0, unit_cost: parseFloat(shipmentForm.unit_cost) || 0, box_count: parseInt(shipmentForm.box_count) || 0, box_cost: parseFloat(shipmentForm.box_cost) || 0, other_fees: parseFloat(shipmentForm.other_fees) || 0, notes: shipmentForm.notes || "", date_shipped: shipmentForm.date_shipped || today, status: shipmentForm.status || "shipped" };
    try {
      if (editingShipment) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/shipments?id=eq.${editingShipment}`, { method: "PATCH", headers: { ...supabase.headers(token), "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify(baseData) });
        if (!res.ok) console.error("Update error:", await res.text());
      } else {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/shipments`, { method: "POST", headers: { ...supabase.headers(token), "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify({ ...baseData, user_id: client.id }) });
        if (!res.ok) console.error("Create error:", await res.text());
      }
      showToast(editingShipment ? "Updated!" : "Shipment created!"); resetShipmentForm(); setShowShipmentForm(false); onRefresh();
    } catch (e) { console.error("Shipment error:", e); showToast("Error saving shipment"); }
    setSaving(false);
  };

  const deleteShipment = async (id) => {
    if (!confirm("Delete shipment?")) return;
    await fetch(`${SUPABASE_URL}/rest/v1/shipments?id=eq.${id}`, { method: "DELETE", headers: supabase.headers(token) });
    showToast("Deleted!"); onRefresh();
  };

  // Calculate monthly charges from shipments
  const now = new Date();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const calcShipmentCost = (s) => {
    const units = (parseFloat(s.units_prepped) || 0) * (parseFloat(s.unit_cost) || 0);
    return units + (parseFloat(s.box_cost) || 0) + (parseFloat(s.other_fees) || 0);
  };
  
  const thisMonthShipments = shipments.filter(s => {
    const d = new Date(s.date_shipped || s.created_at);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const thisMonthTotal = thisMonthShipments.reduce((sum, s) => sum + calcShipmentCost(s), 0);
  
  const totalCharges = shipments.reduce((sum, s) => sum + calcShipmentCost(s), 0);

  return (
    <>
      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 24 }}>
        <div className="card stat-card"><div className="card-title">Inbound</div><div className="stat-value" style={{ color: "var(--cyan)" }}>{inbound}</div></div>
        <div className="card stat-card"><div className="card-title">Shipments</div><div className="stat-value" style={{ color: "var(--green)" }}>{shipments.length}</div></div>
        <div className="card stat-card"><div className="card-title">{monthNames[currentMonth]} Total</div><div className="stat-value" style={{ color: "var(--amber)" }}>£{thisMonthTotal.toFixed(2)}</div></div>
        <div className="card stat-card"><div className="card-title">All Time</div><div className="stat-value" style={{ color: "var(--text-muted)" }}>£{totalCharges.toFixed(2)}</div></div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div className="card-title" style={{ margin: 0 }}>Inbound Parcels</div>
        </div>
        {sorted.length === 0 ? <div style={{ color: "var(--text-muted)" }}>No parcels.</div> :
        <div className="table-wrap"><table>
          <thead><tr><th>Date</th><th>Product</th><th>SKU</th><th>ASIN</th><th>Expected</th><th>Received</th><th>Tracking</th><th>Status</th><th>Notes</th><th>Flag</th><th></th></tr></thead>
          <tbody>{sorted.map(p => {
            const isEdit = editingId === p.id, data = isEdit ? editData : p;
            return <tr key={p.id} className={isEdit ? "edit-row" : ""}>
              <td style={{ fontSize: 12 }}>{formatShortDate(p.date_added)}</td>
              <td style={{ fontWeight: 600 }}>{p.product_name}</td>
              <td className="mono" style={{ fontSize: 12 }}>{p.sku || "—"}</td>
              <td className="mono" style={{ fontSize: 12 }}>{p.asin || "—"}</td>
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
              <div className="input-group" style={{ margin: 0 }}><label className="input-label">Shipment ID *</label>
                <input className="input" placeholder="FBA17ABC123" value={shipmentForm.shipment_id} onChange={e => setShipmentForm({ ...shipmentForm, shipment_id: e.target.value })} /></div>
              <div className="input-group" style={{ margin: 0 }}><label className="input-label">Date</label>
                <input className="input" type="date" value={shipmentForm.date_shipped} onChange={e => setShipmentForm({ ...shipmentForm, date_shipped: e.target.value })} /></div>
              <div className="input-group" style={{ margin: 0 }}><label className="input-label">Units</label>
                <input className="input" type="number" value={shipmentForm.units_prepped} onChange={e => setShipmentForm({ ...shipmentForm, units_prepped: e.target.value })} /></div>
              <div className="input-group" style={{ margin: 0 }}><label className="input-label">£/Unit</label>
                <input className="input" type="number" step="0.01" value={shipmentForm.unit_cost} onChange={e => setShipmentForm({ ...shipmentForm, unit_cost: e.target.value })} /></div>
              <div className="input-group" style={{ margin: 0 }}><label className="input-label">Boxes Used</label>
                <input className="input" type="number" value={shipmentForm.box_count} onChange={e => setShipmentForm({ ...shipmentForm, box_count: e.target.value })} /></div>
              <div className="input-group" style={{ margin: 0 }}><label className="input-label">Box Cost (£)</label>
                <input className="input" type="number" step="0.01" value={shipmentForm.box_cost} onChange={e => setShipmentForm({ ...shipmentForm, box_cost: e.target.value })} /></div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700 }}>Total: <span style={{ color: "var(--green)" }}>£{calcShipmentTotal(shipmentForm).toFixed(2)}</span></div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => { setShowShipmentForm(false); resetShipmentForm(); }}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={saveShipment} disabled={saving || !shipmentForm.shipment_id}>{saving ? "Saving..." : editingShipment ? "Update" : "Create"}</button>
              </div>
            </div>
          </div>
        )}

        {shipments.length === 0 ? <div style={{ color: "var(--text-muted)" }}>No shipments yet.</div> :
        <div className="table-wrap"><table>
          <thead><tr><th>Shipment ID</th><th>Units</th><th>Boxes</th><th>Total</th><th>Date</th><th>Status</th><th></th></tr></thead>
          <tbody>{shipments.map(s => (
            <tr key={s.id}>
              <td className="mono" style={{ fontWeight: 600 }}>{s.shipment_id}</td>
              <td className="mono">{s.units_prepped || 0}</td>
              <td className="mono">{s.box_count || 0}</td>
              <td className="mono" style={{ fontWeight: 700, color: "var(--green)" }}>£{calcShipmentTotal(s).toFixed(2)}</td>
              <td style={{ fontSize: 12 }}>{s.date_shipped ? formatShortDate(s.date_shipped) : "—"}</td>
              <td><span className={`badge badge-${s.status === "paid" ? "paid" : s.status === "shipped" ? "shipped" : "pending"}`}>{s.status}</span></td>
              <td><div style={{ display: "flex", gap: 4 }}><button className="btn-icon" onClick={() => startEditShipment(s)}><Icons.Edit /></button><button className="btn-icon btn-danger" onClick={() => deleteShipment(s.id)}><Icons.Trash /></button></div></td>
            </tr>
          ))}</tbody>
        </table></div>}
      </div>
    </>
  );
}

// Admin - Client Liquidation Tab
function AdminClientLiquidation({ client, liquidation, token, showToast, onRefresh }) {
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");

  useEffect(() => { fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.discord_webhook_url`, { headers: supabase.headers(token) }).then(r => r.json()).then(d => { if (d?.[0]?.value) setWebhookUrl(d[0].value); }); }, []);

  const pending = liquidation.filter(l => !l.sale_price).length;
  const sold = liquidation.filter(l => l.sale_price).length;
  const totalPayout = liquidation.filter(l => l.sale_price).reduce((sum, l) => sum + calculatePayout(l).payout, 0);

  const startEdit = item => {
    setEditingId(item.id);
    setEditData({ lpn_number: item.lpn_number || "", condition: item.condition || "", listed: item.listed || false, sale_price: item.sale_price || "", date_sold: item.date_sold || "", ebay_fees: item.ebay_fees || "", shipping: item.shipping || "", paid: item.paid || false });
  };

  const saveEdit = async () => {
    setSaving(true);
    const oldItem = liquidation.find(i => i.id === editingId);
    const dataToSave = { 
      ...editData, 
      sale_price: editData.sale_price ? parseFloat(editData.sale_price) : null, 
      ebay_fees: editData.ebay_fees ? parseFloat(editData.ebay_fees) : null, 
      shipping: editData.shipping ? parseFloat(editData.shipping) : null,
      date_sold: editData.date_sold || null
    };
    if (dataToSave.sale_price && !dataToSave.date_sold) dataToSave.date_sold = new Date().toISOString().split('T')[0];
    await fetch(`${SUPABASE_URL}/rest/v1/liquidation_stock?id=eq.${editingId}`, { method: "PATCH", headers: { ...supabase.headers(token), "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify(dataToSave) });
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

  return (
    <>
      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 24 }}>
        <div className="card stat-card liquidation"><div className="card-title">Pending</div><div className="stat-value" style={{ color: "var(--amber)" }}>{pending}</div></div>
        <div className="card stat-card liquidation"><div className="card-title">Sold</div><div className="stat-value" style={{ color: "var(--green)" }}>{sold}</div></div>
        <div className="card stat-card liquidation"><div className="card-title">Total Payout</div><div className="stat-value" style={{ color: "var(--orange)" }}>£{totalPayout.toFixed(2)}</div></div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {liquidation.length === 0 ? <div className="empty-state"><Icons.Box /><p>No liquidation items.</p></div> :
        <div className="table-wrap"><table style={{ minWidth: 1000 }}>
          <thead><tr><th>Product</th><th>LPN</th><th>Condition</th><th>Listed</th><th>Sale £</th><th>Sold Date</th><th>Payout Date</th><th>Fees</th><th>Payout</th><th>Paid</th><th></th></tr></thead>
          <tbody>{liquidation.map(item => {
            const isEdit = editingId === item.id, data = isEdit ? editData : item;
            const calc = calculatePayout(isEdit ? { ...item, ...editData } : item);
            const pd = getPayoutDate(data.date_sold);
            return <tr key={item.id} className={isEdit ? "edit-row" : ""}>
              <td style={{ fontWeight: 600 }}>{item.product_name}<div style={{ fontSize: 11, color: "var(--text-muted)" }}>{item.asin}</div></td>
              <td>{isEdit ? <input className="inline-input" style={{ width: 80 }} value={data.lpn_number} onChange={e => setEditData({ ...editData, lpn_number: e.target.value })} /> : <span className="mono" style={{ fontSize: 12 }}>{item.lpn_number || "—"}</span>}</td>
              <td>{isEdit ? <select className="inline-select" style={{ width: 80 }} value={data.condition} onChange={e => setEditData({ ...editData, condition: e.target.value })}><option value="">—</option><option>New</option><option>Like New</option><option>Good</option><option>Fair</option><option>Poor</option></select> : <span style={{ fontSize: 12 }}>{item.condition || "—"}</span>}</td>
              <td style={{ textAlign: "center" }}>{isEdit ? <input type="checkbox" checked={data.listed} onChange={e => setEditData({ ...editData, listed: e.target.checked })} /> : (item.listed ? "Yes" : "No")}</td>
              <td>{isEdit ? <input type="number" step="0.01" className="inline-input" style={{ width: 70 }} value={data.sale_price} onChange={e => setEditData({ ...editData, sale_price: e.target.value })} /> : item.sale_price ? <span className="mono">£{parseFloat(item.sale_price).toFixed(2)}</span> : "—"}</td>
              <td>{isEdit ? <input type="date" className="inline-input" style={{ width: 130, colorScheme: "dark" }} value={data.date_sold} onChange={e => setEditData({ ...editData, date_sold: e.target.value })} /> : <span style={{ fontSize: 12 }}>{item.date_sold ? formatShortDate(item.date_sold) : "—"}</span>}</td>
              <td style={{ fontSize: 12 }}>{pd ? formatDate(pd) : "—"}</td>
              <td>{isEdit ? <div style={{ display: "flex", gap: 4 }}><input type="number" step="0.01" className="inline-input" style={{ width: 50 }} placeholder="eBay" value={data.ebay_fees} onChange={e => setEditData({ ...editData, ebay_fees: e.target.value })} /><input type="number" step="0.01" className="inline-input" style={{ width: 50 }} placeholder="Ship" value={data.shipping} onChange={e => setEditData({ ...editData, shipping: e.target.value })} /></div> : <span className="mono" style={{ fontSize: 12, color: "var(--red)" }}>{item.sale_price ? `£${calc.totalFees.toFixed(2)}` : "—"}</span>}</td>
              <td><span className="mono" style={{ fontWeight: 700, color: calc.payout > 0 ? "var(--green)" : "var(--text-muted)" }}>{calc.payout > 0 ? `£${calc.payout.toFixed(2)}` : "—"}</span></td>
              <td style={{ textAlign: "center" }}>{isEdit ? <input type="checkbox" checked={data.paid} onChange={e => setEditData({ ...editData, paid: e.target.checked })} /> : (item.paid ? <span style={{ color: "var(--green)" }}>✓</span> : "—")}</td>
              <td>{isEdit ? <div style={{ display: "flex", gap: 4 }}><button className="btn-icon" onClick={saveEdit} disabled={saving}><Icons.Save /></button><button className="btn-icon btn-danger" onClick={() => setEditingId(null)}><Icons.X /></button></div> : <button className="btn-icon" onClick={() => startEdit(item)}><Icons.Edit /></button>}</td>
            </tr>;
          })}</tbody>
        </table></div>}
      </div>
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
