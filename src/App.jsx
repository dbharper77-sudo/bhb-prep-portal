import { useState, useEffect, createContext, useContext, useCallback } from "react";

const SUPABASE_URL = "https://cccsreyspmpwnfbmegwz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_hKQDmZHXC-OhF1A8de7vLw_jVcAGhkT";

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
    async update(id, data) { const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, { method: "PATCH", headers: { ...supabase.headers(token), Prefer: "return=representation" }, body: JSON.stringify(data) }); return res.json(); },
    async delete(id) { const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, { method: "DELETE", headers: supabase.headers(token) }); return res.ok; },
  }),
};

const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

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

  return <AuthContext.Provider value={{ user, token, profile, loading, signIn, signUp, signOut }}>{children}</AuthContext.Provider>;
}

const useAuth = () => useContext(AuthContext);

const Icons = {
  Dashboard: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
  Package: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  Truck: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><rect x="1" y="3" width="15" height="13" rx="1"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  Calculator: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="18" x2="16" y2="18"/></svg>,
  Receipt: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2-3 2-3-2z"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
  User: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  LogOut: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Plus: () => <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Search: () => <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Zap: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  Check: () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
  Trash: () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>,
  Menu: () => <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  Send: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  DollarSign: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  Box: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>,
  TrendingUp: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
};

const css = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
:root{--bg-primary:#060b14;--bg-secondary:#0c1322;--bg-card:#111a2e;--bg-card-hover:#162037;--border:#1c2d4a;--border-bright:#234170;--cyan:#00e5ff;--cyan-dim:#00b8d4;--cyan-glow:rgba(0,229,255,0.15);--text-primary:#e8edf5;--text-secondary:#8899b4;--text-muted:#556a8a;--green:#00e676;--amber:#ffab00;--red:#ff5252;--purple:#b388ff;--orange:#ff9100}
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Outfit',sans-serif;background:var(--bg-primary);color:var(--text-primary)}
.app-wrapper{display:flex;min-height:100vh}.sidebar{width:260px;background:var(--bg-secondary);border-right:1px solid var(--border);display:flex;flex-direction:column;position:fixed;height:100vh;z-index:50}
.sidebar-logo{padding:20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px}.sidebar-logo-icon{width:40px;height:40px;background:linear-gradient(135deg,var(--cyan),var(--cyan-dim));border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;color:var(--bg-primary)}
.sidebar-logo-text{font-weight:700;font-size:18px;letter-spacing:1px}.sidebar-logo-sub{font-size:11px;color:var(--text-muted);letter-spacing:2px;text-transform:uppercase}
.service-tabs{display:flex;padding:12px;gap:6px;border-bottom:1px solid var(--border)}.service-tab{flex:1;padding:10px 12px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;text-align:center;transition:all 0.2s;border:1px solid transparent;background:transparent;color:var(--text-muted)}
.service-tab:hover{color:var(--text-primary);background:var(--bg-card)}.service-tab.active.prep{background:linear-gradient(135deg,rgba(0,229,255,0.15),rgba(0,229,255,0.05));border-color:rgba(0,229,255,0.3);color:var(--cyan)}
.service-tab.active.liquidation{background:linear-gradient(135deg,rgba(255,145,0,0.15),rgba(255,145,0,0.05));border-color:rgba(255,145,0,0.3);color:var(--orange)}
.sidebar-section-title{font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:1.5px;padding:12px 14px 6px}
.sidebar-nav{flex:1;padding:0 12px;display:flex;flex-direction:column;gap:2px;overflow-y:auto}.nav-item{display:flex;align-items:center;gap:12px;padding:11px 14px;border-radius:10px;cursor:pointer;color:var(--text-secondary);transition:all 0.2s;font-size:14px;font-weight:500;border:1px solid transparent}
.nav-item:hover{color:var(--text-primary);background:var(--bg-card)}.nav-item.active.prep{color:var(--cyan);background:var(--cyan-glow);border-color:rgba(0,229,255,0.2)}.nav-item.active.liquidation{color:var(--orange);background:rgba(255,145,0,0.1);border-color:rgba(255,145,0,0.2)}
.nav-badge{margin-left:auto;background:var(--cyan);color:var(--bg-primary);font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px}.nav-badge.liquidation{background:var(--orange)}
.sidebar-footer{padding:16px;border-top:1px solid var(--border)}.sidebar-user{display:flex;align-items:center;gap:10px;padding:8px;margin-bottom:8px}.sidebar-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--cyan),var(--purple));display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;color:var(--bg-primary)}
.sidebar-username{font-size:13px;font-weight:600}.sidebar-email{font-size:11px;color:var(--text-muted)}
.btn-signout{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:9px 14px;border-radius:8px;cursor:pointer;color:var(--text-muted);background:none;border:1px solid var(--border);font-size:13px;font-family:'Outfit',sans-serif;font-weight:500;transition:all 0.2s}.btn-signout:hover{color:var(--red);border-color:var(--red);background:rgba(255,82,82,0.08)}
.main-content{flex:1;margin-left:260px;min-height:100vh}.page-header{padding:24px 32px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:var(--bg-secondary)}
.page-title{font-size:22px;font-weight:700}.page-subtitle{font-size:13px;color:var(--text-muted);margin-top:2px}.page-body{padding:28px 32px}
.mobile-header{display:none;padding:16px;background:var(--bg-secondary);border-bottom:1px solid var(--border);align-items:center;justify-content:space-between}.mobile-menu-btn{background:none;border:none;color:var(--text-primary);cursor:pointer}
.sidebar-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:40}
@media(max-width:768px){.sidebar{transform:translateX(-100%)}.sidebar.open{transform:translateX(0)}.sidebar-overlay.open{display:block}.mobile-header{display:flex}.main-content{margin-left:0}.page-header,.page-body{padding:16px}.stats-grid{grid-template-columns:1fr 1fr!important}}
.card{background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:22px;transition:all 0.2s}.card:hover{border-color:var(--border-bright)}.card-title{font-size:13px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px}
.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px}.stat-card{position:relative;overflow:hidden}.stat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--cyan),transparent)}.stat-card.liquidation::before{background:linear-gradient(90deg,var(--orange),transparent)}
.stat-value{font-size:32px;font-weight:800;font-family:'JetBrains Mono',monospace}.stat-label{font-size:12px;color:var(--text-muted);margin-top:4px;text-transform:uppercase;letter-spacing:1px}
.badge{padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;display:inline-block}.badge-transit{background:rgba(179,136,255,0.15);color:var(--purple)}.badge-warehouse{background:rgba(0,229,255,0.15);color:var(--cyan)}.badge-prepping{background:rgba(255,171,0,0.15);color:var(--amber)}
.badge-prepped,.badge-shipped,.badge-received,.badge-paid,.badge-delivered,.badge-sold,.badge-listed{background:rgba(0,230,118,0.15);color:var(--green)}.badge-pending,.badge-listing{background:rgba(255,171,0,0.15);color:var(--amber)}.badge-overdue{background:rgba(255,82,82,0.15);color:var(--red)}.badge-processing{background:rgba(179,136,255,0.15);color:var(--purple)}
.table-wrap{overflow-x:auto}table{width:100%;border-collapse:collapse}th{text-align:left;padding:12px 16px;font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid var(--border)}td{padding:14px 16px;font-size:14px;border-bottom:1px solid var(--border)}tr:hover td{background:var(--bg-card-hover)}.mono{font-family:'JetBrains Mono',monospace;font-size:13px}
.btn{display:inline-flex;align-items:center;gap:8px;padding:10px 18px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;border:none;font-family:'Outfit',sans-serif;transition:all 0.2s}.btn-primary{background:var(--cyan);color:var(--bg-primary)}.btn-primary:hover{background:var(--cyan-dim)}.btn-primary.liquidation{background:var(--orange)}.btn-primary.liquidation:hover{background:#e68200}
.btn-secondary{background:var(--bg-card);color:var(--text-primary);border:1px solid var(--border)}.btn-icon{width:34px;height:34px;padding:0;display:flex;align-items:center;justify-content:center;border-radius:8px;background:var(--bg-card);border:1px solid var(--border);color:var(--text-secondary);cursor:pointer}.btn-danger:hover{color:var(--red);border-color:var(--red)}
.input-group{margin-bottom:16px}.input-label{display:block;font-size:13px;font-weight:600;color:var(--text-secondary);margin-bottom:6px}.input{width:100%;padding:10px 14px;background:var(--bg-primary);border:1px solid var(--border);border-radius:10px;color:var(--text-primary);font-size:14px;font-family:'Outfit',sans-serif;outline:none}.input:focus{border-color:var(--cyan);box-shadow:0 0 0 3px var(--cyan-glow)}.input::placeholder{color:var(--text-muted)}select.input{appearance:none;cursor:pointer}
.search-bar{display:flex;align-items:center;gap:8px;padding:0 14px;background:var(--bg-primary);border:1px solid var(--border);border-radius:10px;max-width:320px;width:100%}.search-bar input{flex:1;padding:10px 0;background:none;border:none;color:var(--text-primary);font-size:14px;font-family:'Outfit',sans-serif;outline:none}.search-bar input::placeholder{color:var(--text-muted)}.search-bar svg{color:var(--text-muted)}
.fee-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.fee-card{background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:24px;text-align:center;transition:all 0.3s}.fee-card:hover{border-color:var(--cyan);transform:translateY(-2px)}.fee-card.liquidation:hover{border-color:var(--orange)}
.fee-price{font-size:36px;font-weight:800;font-family:'JetBrains Mono',monospace;color:var(--cyan)}.fee-price.liquidation{color:var(--orange)}.fee-unit{font-size:14px;color:var(--text-muted)}.fee-name{font-size:16px;font-weight:700;margin-top:8px}.fee-desc{font-size:13px;color:var(--text-secondary);margin-top:4px}
.calc-result{background:linear-gradient(135deg,rgba(0,229,255,0.1),rgba(0,229,255,0.03));border:1px solid rgba(0,229,255,0.3);border-radius:14px;padding:24px;text-align:center;margin-top:20px}.calc-result.liquidation{background:linear-gradient(135deg,rgba(255,145,0,0.1),rgba(255,145,0,0.03));border-color:rgba(255,145,0,0.3)}
.calc-total{font-size:48px;font-weight:800;font-family:'JetBrains Mono',monospace;color:var(--cyan)}.calc-total.liquidation{color:var(--orange)}
.auth-wrapper{min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg-primary);padding:20px;background-image:radial-gradient(ellipse at 50% 0%,rgba(0,229,255,0.08) 0%,transparent 60%)}.auth-card{width:100%;max-width:420px;background:var(--bg-card);border:1px solid var(--border);border-radius:20px;padding:40px}
.auth-title{font-size:22px;font-weight:700;text-align:center;margin-bottom:8px}.auth-sub{font-size:14px;color:var(--text-muted);text-align:center;margin-bottom:28px}.auth-error{background:rgba(255,82,82,0.1);border:1px solid rgba(255,82,82,0.3);color:var(--red);padding:10px 14px;border-radius:10px;font-size:13px;margin-bottom:16px}.auth-info{background:rgba(0,229,255,0.1);border:1px solid rgba(0,229,255,0.3);color:var(--cyan);padding:10px 14px;border-radius:10px;font-size:13px;margin-bottom:16px}
.auth-link{color:var(--cyan);cursor:pointer;font-weight:600}.auth-footer{text-align:center;margin-top:20px;font-size:14px;color:var(--text-muted)}.auth-btn{width:100%;padding:12px;font-size:15px;margin-top:8px}
.empty-state{text-align:center;padding:60px 20px;color:var(--text-muted)}.empty-state svg{margin-bottom:16px;opacity:0.3}.empty-state p{font-size:15px;margin-bottom:20px}
.loader{display:flex;align-items:center;justify-content:center;min-height:100vh}.spinner{width:40px;height:40px;border:3px solid var(--border);border-top-color:var(--cyan);border-radius:50%;animation:spin 0.8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
.toast{position:fixed;bottom:24px;right:24px;padding:14px 20px;background:var(--bg-card);border:1px solid var(--green);border-radius:12px;display:flex;align-items:center;gap:10px;font-size:14px;z-index:200;animation:slideUp 0.3s ease}@keyframes slideUp{from{transform:translateY(20px);opacity:0}}
.speed-badge{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;background:linear-gradient(135deg,rgba(0,229,255,0.15),rgba(0,229,255,0.05));border:1px solid rgba(0,229,255,0.3);border-radius:20px;font-size:12px;font-weight:600;color:var(--cyan)}.speed-badge.liquidation{background:linear-gradient(135deg,rgba(255,145,0,0.15),rgba(255,145,0,0.05));border-color:rgba(255,145,0,0.3);color:var(--orange)}
`;

function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  if (showSignup) return <SignupPage onBack={() => setShowSignup(false)} />;
  const handleLogin = async () => { setError(""); setLoading(true); try { await signIn(email, password); } catch (err) { setError(err.message || "Invalid credentials"); } setLoading(false); };
  return (
    <div className="auth-wrapper"><div className="auth-card">
      <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", marginBottom: 32 }}><div className="sidebar-logo-icon">BHB</div><div><div style={{ fontWeight: 800, fontSize: 22, letterSpacing: 1 }}>BHB PREP</div><div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: 2 }}>CLIENT PORTAL</div></div></div>
      <div className="auth-title">Welcome back</div><div className="auth-sub">Sign in to manage your inventory</div>
      {error && <div className="auth-error">{error}</div>}
      <div className="input-group"><label className="input-label">Email</label><input className="input" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} /></div>
      <div className="input-group"><label className="input-label">Password</label><input className="input" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} /></div>
      <button className="btn btn-primary auth-btn" onClick={handleLogin} disabled={loading}>{loading ? "Signing in..." : "Sign In"}</button>
      <div className="auth-footer">Don't have an account? <span className="auth-link" onClick={() => setShowSignup(true)}>Sign Up</span></div>
    </div></div>
  );
}

function SignupPage({ onBack }) {
  const { signUp } = useAuth();
  const [form, setForm] = useState({ full_name: "", company_name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const update = (f) => (e) => setForm({ ...form, [f]: e.target.value });
  const handleSignup = async () => {
    setError(""); setSuccess("");
    if (!form.full_name || !form.email || !form.password) return setError("Please fill required fields");
    if (form.password.length < 6) return setError("Password min 6 characters");
    setLoading(true);
    try { const data = await signUp(form.email, form.password, { full_name: form.full_name, company_name: form.company_name }); if (!data.access_token) setSuccess("Account created! Check email to confirm."); } catch (err) { setError(err.message || "Signup failed"); }
    setLoading(false);
  };
  return (
    <div className="auth-wrapper"><div className="auth-card">
      <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", marginBottom: 32 }}><div className="sidebar-logo-icon">BHB</div><div><div style={{ fontWeight: 800, fontSize: 22, letterSpacing: 1 }}>BHB PREP</div><div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: 2 }}>CLIENT PORTAL</div></div></div>
      <div className="auth-title">Create account</div><div className="auth-sub">Get started in seconds</div>
      {error && <div className="auth-error">{error}</div>}{success && <div className="auth-info">{success}</div>}
      <div className="input-group"><label className="input-label">Full Name *</label><input className="input" placeholder="John Smith" value={form.full_name} onChange={update("full_name")} /></div>
      <div className="input-group"><label className="input-label">Company</label><input className="input" placeholder="Optional" value={form.company_name} onChange={update("company_name")} /></div>
      <div className="input-group"><label className="input-label">Email *</label><input className="input" type="email" placeholder="you@company.com" value={form.email} onChange={update("email")} /></div>
      <div className="input-group"><label className="input-label">Password *</label><input className="input" type="password" placeholder="Min 6 characters" value={form.password} onChange={update("password")} onKeyDown={(e) => e.key === "Enter" && handleSignup()} /></div>
      <button className="btn btn-primary auth-btn" onClick={handleSignup} disabled={loading}>{loading ? "Creating..." : "Create Account"}</button>
      <div className="auth-footer">Have an account? <span className="auth-link" onClick={onBack}>Sign In</span></div>
    </div></div>
  );
}

function Toast({ message, onClose }) { useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]); return <div className="toast"><Icons.Check /> {message}</div>; }
function StatusBadge({ status }) { const label = status?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || status; const map = { in_transit: "transit", in_warehouse: "warehouse", being_prepped: "prepping", prepped: "prepped", shipped: "shipped", received: "received", listing: "listing", listed: "listed", sold: "sold", pending: "pending", paid: "paid" }; return <span className={`badge badge-${map[status] || "transit"}`}>{label}</span>; }

function PrepDashboard({ parcels, shipments }) {
  const counts = { transit: parcels.filter(p => p.status === "in_transit").length, warehouse: parcels.filter(p => p.status === "in_warehouse").length, prepping: parcels.filter(p => p.status === "being_prepped").length, prepped: parcels.filter(p => p.status === "prepped").length };
  return (
    <><div className="page-header"><div><div className="page-title">Prep Dashboard</div><div className="page-subtitle">Overview of your FBA prep activity</div></div><div className="speed-badge"><Icons.Zap /> 24-48hr Turnaround</div></div>
    <div className="page-body">
      <div className="stats-grid">
        {[{ label: "In Transit", value: counts.transit, color: "var(--purple)" }, { label: "In Warehouse", value: counts.warehouse, color: "var(--cyan)" }, { label: "Being Prepped", value: counts.prepping, color: "var(--amber)" }, { label: "Prepped", value: counts.prepped, color: "var(--green)" }].map(s => <div className="card stat-card" key={s.label}><div className="card-title">{s.label}</div><div className="stat-value" style={{ color: s.color }}>{s.value}</div><div className="stat-label">parcels</div></div>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="card"><div className="card-title">Quick Stats</div><div style={{ marginTop: 12 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}><span style={{ color: "var(--text-secondary)" }}>Total Parcels</span><span className="mono" style={{ fontWeight: 700 }}>{parcels.length}</span></div><div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-secondary)" }}>Total Units</span><span className="mono" style={{ fontWeight: 700 }}>{parcels.reduce((s, p) => s + (p.quantity || 0), 0)}</span></div></div></div>
        <div className="card"><div className="card-title">Recent Parcels</div>{parcels.length === 0 ? <div style={{ color: "var(--text-muted)", marginTop: 12 }}>No parcels yet.</div> : <div style={{ marginTop: 12 }}>{parcels.slice(0, 4).map(p => <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}><div><div style={{ fontWeight: 600 }}>{p.product_name}</div><div style={{ fontSize: 12, color: "var(--text-muted)" }}>{p.quantity} units</div></div><StatusBadge status={p.status} /></div>)}</div>}</div>
      </div>
    </div></>
  );
}

function LiquidationDashboard({ liquidationStock, sales }) {
  const counts = { received: liquidationStock.filter(s => s.status === "received").length, listing: liquidationStock.filter(s => s.status === "listing").length, listed: liquidationStock.filter(s => s.status === "listed").length, sold: liquidationStock.filter(s => s.status === "sold").length };
  return (
    <><div className="page-header"><div><div className="page-title">Liquidation Dashboard</div><div className="page-subtitle">Overview of your liquidation activity</div></div><div className="speed-badge liquidation"><Icons.TrendingUp /> 1-3 Day Listing</div></div>
    <div className="page-body">
      <div className="stats-grid">
        {[{ label: "Received", value: counts.received, color: "var(--cyan)" }, { label: "Listing", value: counts.listing, color: "var(--orange)" }, { label: "Listed", value: counts.listed, color: "var(--amber)" }, { label: "Sold", value: counts.sold, color: "var(--green)" }].map(s => <div className="card stat-card liquidation" key={s.label}><div className="card-title">{s.label}</div><div className="stat-value" style={{ color: s.color }}>{s.value}</div><div className="stat-label">items</div></div>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="card"><div className="card-title">Quick Stats</div><div style={{ marginTop: 12 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}><span style={{ color: "var(--text-secondary)" }}>Total Items</span><span className="mono" style={{ fontWeight: 700 }}>{liquidationStock.reduce((s, i) => s + (i.quantity || 0), 0)}</span></div><div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-secondary)" }}>Your Payouts</span><span className="mono" style={{ fontWeight: 700, color: "var(--green)" }}>£{sales.reduce((s, i) => s + (i.payout || 0), 0).toFixed(2)}</span></div></div></div>
        <div className="card"><div className="card-title">Recent Stock</div>{liquidationStock.length === 0 ? <div style={{ color: "var(--text-muted)", marginTop: 12 }}>No stock yet.</div> : <div style={{ marginTop: 12 }}>{liquidationStock.slice(0, 4).map(s => <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}><div><div style={{ fontWeight: 600 }}>{s.product_name}</div><div style={{ fontSize: 12, color: "var(--text-muted)" }}>{s.quantity} units</div></div><StatusBadge status={s.status} /></div>)}</div>}</div>
      </div>
    </div></>
  );
}

function PrepAddOrderPage({ token, onRefresh, showToast }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ product_name: "", sku: "", asin: "", quantity: 1, prep_type: "standard", supplier: "", tracking_number: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const update = (f) => (e) => setForm({ ...form, [f]: e.target.value });
  const handleSubmit = async () => { if (!form.product_name) return; setSaving(true); await supabase.from("parcels", token).insert({ ...form, quantity: parseInt(form.quantity) || 1, user_id: user.id, status: "in_transit" }); showToast("Order added!"); setForm({ product_name: "", sku: "", asin: "", quantity: 1, prep_type: "standard", supplier: "", tracking_number: "", notes: "" }); onRefresh(); setSaving(false); };
  return (
    <><div className="page-header"><div><div className="page-title">Add New Order</div><div className="page-subtitle">Submit stock for FBA prep</div></div></div>
    <div className="page-body"><div className="card" style={{ maxWidth: 600 }}>
      <div className="input-group"><label className="input-label">Product Name *</label><input className="input" placeholder="e.g. Wireless Earbuds" value={form.product_name} onChange={update("product_name")} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}><div className="input-group"><label className="input-label">SKU</label><input className="input" placeholder="ABC-123" value={form.sku} onChange={update("sku")} /></div><div className="input-group"><label className="input-label">ASIN</label><input className="input" placeholder="B08XYZ..." value={form.asin} onChange={update("asin")} /></div></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}><div className="input-group"><label className="input-label">Quantity *</label><input className="input" type="number" min="1" value={form.quantity} onChange={update("quantity")} /></div><div className="input-group"><label className="input-label">Prep Type</label><select className="input" value={form.prep_type} onChange={update("prep_type")}><option value="standard">Standard (£0.45 +VAT)</option><option value="bundle">Bundle (£0.65 +VAT)</option><option value="oversize">Oversize (£1.50 +VAT)</option></select></div></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}><div className="input-group"><label className="input-label">Supplier</label><input className="input" placeholder="Supplier" value={form.supplier} onChange={update("supplier")} /></div><div className="input-group"><label className="input-label">Tracking</label><input className="input" placeholder="Tracking #" value={form.tracking_number} onChange={update("tracking_number")} /></div></div>
      <div className="input-group"><label className="input-label">Notes</label><input className="input" placeholder="Special instructions..." value={form.notes} onChange={update("notes")} /></div>
      <button className="btn btn-primary" onClick={handleSubmit} disabled={saving || !form.product_name}>{saving ? "Submitting..." : "Submit Order"}</button>
    </div></div></>
  );
}

function PrepInventoryPage({ parcels, token, onRefresh, showToast }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const filtered = parcels.filter(p => (p.product_name?.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase())) && (filter === "all" || p.status === filter));
  const handleDelete = async (id) => { await supabase.from("parcels", token).delete(id); showToast("Deleted"); onRefresh(); };
  return (
    <><div className="page-header"><div><div className="page-title">My Inventory</div><div className="page-subtitle">{parcels.length} parcels</div></div></div>
    <div className="page-body">
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}><div className="search-bar"><Icons.Search /><input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} /></div><select className="input" style={{ width: "auto", minWidth: 160 }} value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">All Statuses</option><option value="in_transit">In Transit</option><option value="in_warehouse">In Warehouse</option><option value="being_prepped">Being Prepped</option><option value="prepped">Prepped</option><option value="shipped">Shipped</option></select></div>
      {filtered.length === 0 ? <div className="card empty-state"><Icons.Package /><p>No parcels found.</p></div> : <div className="card" style={{ padding: 0, overflow: "hidden" }}><div className="table-wrap"><table><thead><tr><th>Product</th><th>SKU</th><th>Qty</th><th>Type</th><th>Status</th><th></th></tr></thead><tbody>{filtered.map(p => <tr key={p.id}><td style={{ fontWeight: 600 }}>{p.product_name}</td><td className="mono">{p.sku || "—"}</td><td className="mono">{p.quantity}</td><td style={{ textTransform: "capitalize", fontSize: 13 }}>{p.prep_type}</td><td><StatusBadge status={p.status} /></td><td><button className="btn-icon btn-danger" onClick={() => handleDelete(p.id)}><Icons.Trash /></button></td></tr>)}</tbody></table></div></div>}
    </div></>
  );
}

function PrepShipmentsPage({ shipments }) {
  return (
    <><div className="page-header"><div><div className="page-title">Shipments</div><div className="page-subtitle">{shipments.length} shipments</div></div></div>
    <div className="page-body">{shipments.length === 0 ? <div className="card empty-state"><Icons.Truck /><p>No shipments yet.</p></div> : <div className="card" style={{ padding: 0, overflow: "hidden" }}><div className="table-wrap"><table><thead><tr><th>Shipment</th><th>Units</th><th>Cost</th><th>Status</th><th>Date</th></tr></thead><tbody>{shipments.map(s => <tr key={s.id}><td style={{ fontWeight: 600 }}>{s.shipment_name}</td><td className="mono">{s.total_units}</td><td className="mono">£{Number(s.total_cost || 0).toFixed(2)}</td><td><StatusBadge status={s.status} /></td><td style={{ fontSize: 13, color: "var(--text-muted)" }}>{s.created_at ? new Date(s.created_at).toLocaleDateString("en-GB") : "—"}</td></tr>)}</tbody></table></div></div>}</div></>
  );
}

function PrepFeesPage() {
  const [units, setUnits] = useState(100);
  const [type, setType] = useState("standard");
  const rates = { standard: 0.45, bundle: 0.65, oversize: 1.50 };
  const discount = units >= 5000 ? 0.15 : units >= 2000 ? 0.10 : units >= 500 ? 0.05 : 0;
  const subtotal = units * rates[type];
  const discountAmt = subtotal * discount;
  const netTotal = subtotal - discountAmt;
  const vat = netTotal * 0.20;
  const total = netTotal + vat;
  return (
    <><div className="page-header"><div><div className="page-title">Prep Fees</div><div className="page-subtitle">FBA prep pricing</div></div></div>
    <div className="page-body">
      <div className="fee-grid" style={{ marginBottom: 28 }}>{[{ name: "Standard Prep", price: "£0.45", desc: "Label, poly bag, standard" }, { name: "Bundle Prep", price: "£0.65", desc: "Multi-pack bundling" }, { name: "Oversize Prep", price: "£1.50", desc: "Large/heavy items" }].map(f => <div className="fee-card" key={f.name}><div className="fee-price">{f.price}</div><div className="fee-unit">per unit <span style={{ color: "var(--text-muted)", fontSize: 11 }}>+VAT</span></div><div className="fee-name">{f.name}</div><div className="fee-desc">{f.desc}</div></div>)}</div>
      <div className="card" style={{ marginBottom: 20 }}><div className="card-title">Volume Discounts</div><div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>{[{ r: "500+", d: "5%" }, { r: "2,000+", d: "10%" }, { r: "5,000+", d: "15%" }].map(v => <div key={v.r} style={{ flex: 1, minWidth: 100, padding: "12px 16px", background: "var(--bg-primary)", borderRadius: 10, border: "1px solid var(--border)" }}><div style={{ fontWeight: 700, color: "var(--cyan)" }}>{v.d} off</div><div style={{ fontSize: 13, color: "var(--text-muted)" }}>{v.r} units</div></div>)}</div></div>
      <div className="card"><div className="card-title">Calculator</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}><div className="input-group"><label className="input-label">Units</label><input className="input" type="number" min="1" value={units} onChange={(e) => setUnits(Math.max(1, parseInt(e.target.value) || 1))} /></div><div className="input-group"><label className="input-label">Type</label><select className="input" value={type} onChange={(e) => setType(e.target.value)}><option value="standard">Standard</option><option value="bundle">Bundle</option><option value="oversize">Oversize</option></select></div></div>
        <div className="calc-result"><div style={{ fontSize: 13, color: "var(--text-muted)" }}>Total (inc. VAT)</div><div className="calc-total">£{total.toFixed(2)}</div>{discount > 0 && <div style={{ marginTop: 8, fontSize: 13, color: "var(--green)" }}>Save £{discountAmt.toFixed(2)} ({(discount*100)}% discount)</div>}</div>
      </div>
    </div></>
  );
}

function LiquidationSendStockPage({ token, onRefresh, showToast }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ product_name: "", quantity: 1, condition: "mixed", tracking_number: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const update = (f) => (e) => setForm({ ...form, [f]: e.target.value });
  const handleSubmit = async () => { if (!form.product_name) return; setSaving(true); await supabase.from("liquidation_stock", token).insert({ ...form, quantity: parseInt(form.quantity) || 1, user_id: user.id, status: "in_transit" }); showToast("Stock submitted!"); setForm({ product_name: "", quantity: 1, condition: "mixed", tracking_number: "", notes: "" }); onRefresh(); setSaving(false); };
  return (
    <><div className="page-header"><div><div className="page-title">Send Stock</div><div className="page-subtitle">Notify us of returns you're sending</div></div></div>
    <div className="page-body"><div className="card" style={{ maxWidth: 600 }}>
      <div className="input-group"><label className="input-label">Product / Description *</label><input className="input" placeholder="e.g. Mixed Amazon Returns" value={form.product_name} onChange={update("product_name")} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}><div className="input-group"><label className="input-label">Quantity *</label><input className="input" type="number" min="1" value={form.quantity} onChange={update("quantity")} /></div><div className="input-group"><label className="input-label">Condition</label><select className="input" value={form.condition} onChange={update("condition")}><option value="like_new">Like New</option><option value="good">Good</option><option value="fair">Fair</option><option value="mixed">Mixed</option></select></div></div>
      <div className="input-group"><label className="input-label">Tracking</label><input className="input" placeholder="Tracking # (if available)" value={form.tracking_number} onChange={update("tracking_number")} /></div>
      <div className="input-group"><label className="input-label">Notes</label><input className="input" placeholder="Additional info..." value={form.notes} onChange={update("notes")} /></div>
      <button className="btn btn-primary liquidation" onClick={handleSubmit} disabled={saving || !form.product_name}>{saving ? "Submitting..." : "Submit Stock"}</button>
    </div></div></>
  );
}

function LiquidationMyStockPage({ liquidationStock, token, onRefresh, showToast }) {
  const [filter, setFilter] = useState("all");
  const filtered = liquidationStock.filter(s => filter === "all" || s.status === filter);
  const handleDelete = async (id) => { await supabase.from("liquidation_stock", token).delete(id); showToast("Deleted"); onRefresh(); };
  return (
    <><div className="page-header"><div><div className="page-title">My Stock</div><div className="page-subtitle">{liquidationStock.length} items</div></div></div>
    <div className="page-body">
      <div style={{ marginBottom: 20 }}><select className="input" style={{ width: "auto", minWidth: 160 }} value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">All</option><option value="in_transit">In Transit</option><option value="received">Received</option><option value="listing">Listing</option><option value="listed">Listed</option><option value="sold">Sold</option></select></div>
      {filtered.length === 0 ? <div className="card empty-state"><Icons.Box /><p>No stock found.</p></div> : <div className="card" style={{ padding: 0, overflow: "hidden" }}><div className="table-wrap"><table><thead><tr><th>Product</th><th>Qty</th><th>Condition</th><th>Status</th><th></th></tr></thead><tbody>{filtered.map(s => <tr key={s.id}><td style={{ fontWeight: 600 }}>{s.product_name}</td><td className="mono">{s.quantity}</td><td style={{ textTransform: "capitalize", fontSize: 13 }}>{s.condition?.replace("_", " ") || "—"}</td><td><StatusBadge status={s.status} /></td><td><button className="btn-icon btn-danger" onClick={() => handleDelete(s.id)}><Icons.Trash /></button></td></tr>)}</tbody></table></div></div>}
    </div></>
  );
}

function LiquidationSalesPage({ sales }) {
  return (
    <><div className="page-header"><div><div className="page-title">Sales & Payouts</div><div className="page-subtitle">{sales.length} sold</div></div></div>
    <div className="page-body">
      <div className="stats-grid" style={{ gridTemplateColumns: "1fr 1fr" }}><div className="card stat-card liquidation"><div className="card-title">Items Sold</div><div className="stat-value" style={{ color: "var(--orange)" }}>{sales.length}</div></div><div className="card stat-card liquidation"><div className="card-title">Your Payouts</div><div className="stat-value" style={{ color: "var(--green)" }}>£{sales.reduce((s, i) => s + (i.payout || 0), 0).toFixed(2)}</div></div></div>
      {sales.length === 0 ? <div className="card empty-state"><Icons.DollarSign /><p>No sales yet.</p></div> : <div className="card" style={{ padding: 0, overflow: "hidden" }}><div className="table-wrap"><table><thead><tr><th>Product</th><th>Sale</th><th>Fees</th><th>Payout</th><th>Date</th></tr></thead><tbody>{sales.map(s => <tr key={s.id}><td style={{ fontWeight: 600 }}>{s.product_name}</td><td className="mono">£{(s.sale_price || 0).toFixed(2)}</td><td className="mono" style={{ color: "var(--red)" }}>-£{(s.fees || 0).toFixed(2)}</td><td className="mono" style={{ color: "var(--green)", fontWeight: 700 }}>£{(s.payout || 0).toFixed(2)}</td><td style={{ fontSize: 13, color: "var(--text-muted)" }}>{s.sold_date ? new Date(s.sold_date).toLocaleDateString("en-GB") : "—"}</td></tr>)}</tbody></table></div></div>}
    </div></>
  );
}

function LiquidationFeesPage() {
  const [salePrice, setSalePrice] = useState(50);
  const [items, setItems] = useState(10);
  const [hasOversized, setHasOversized] = useState(false);
  const [hasBundles, setHasBundles] = useState(false);
  const marketplaceFees = salePrice * 0.128;
  const shipping = salePrice * 0.08;
  const netSale = salePrice - marketplaceFees - shipping;
  const sellingRate = netSale > 200 ? 0.10 : 0.15;
  const sellingFee = netSale * sellingRate;
  const prepFee = items * 0.40;
  const bundleFee = hasBundles ? items * 0.30 : 0;
  const oversizedFee = hasOversized ? items * 1.00 : 0;
  const totalFees = sellingFee + prepFee + bundleFee + oversizedFee;
  const vat = totalFees * 0.20;
  const payout = netSale - totalFees - vat;
  return (
    <><div className="page-header"><div><div className="page-title">Liquidation Fees</div><div className="page-subtitle">Transparent pricing</div></div></div>
    <div className="page-body">
      <div className="fee-grid" style={{ marginBottom: 28, gridTemplateColumns: "repeat(4, 1fr)" }}>{[{ n: "Selling Fee", p: "15%", d: "Of net (10% over £200)", i: "💰" }, { n: "Prep Fee", p: "£0.40", d: "Per item", i: "📦" }, { n: "Bundling", p: "£0.30", d: "Per bundled item", i: "🧩" }, { n: "Oversized", p: "£1.00", d: "Per oversized", i: "📏" }].map(f => <div className="fee-card liquidation" key={f.n}><div style={{ fontSize: 28, marginBottom: 8 }}>{f.i}</div><div className="fee-price liquidation">{f.p}</div><div className="fee-unit">+VAT</div><div className="fee-name">{f.n}</div><div className="fee-desc">{f.d}</div></div>)}</div>
      <div className="card" style={{ marginBottom: 20, background: "linear-gradient(135deg,rgba(255,145,0,0.05),transparent)", borderColor: "rgba(255,145,0,0.2)" }}><div className="card-title" style={{ color: "var(--orange)" }}>✅ Transparency Promise</div><p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 8 }}>All fees shown clearly. Net Sale = Sale price after marketplace fees + shipping.</p></div>
      <div className="card"><div className="card-title">Payout Calculator</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}><div className="input-group"><label className="input-label">Sale Price (£)</label><input className="input" type="number" min="1" value={salePrice} onChange={(e) => setSalePrice(Math.max(1, parseFloat(e.target.value) || 1))} /></div><div className="input-group"><label className="input-label">Items</label><input className="input" type="number" min="1" value={items} onChange={(e) => setItems(Math.max(1, parseInt(e.target.value) || 1))} /></div></div>
        <div style={{ display: "flex", gap: 20, marginBottom: 16 }}><label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}><input type="checkbox" checked={hasBundles} onChange={(e) => setHasBundles(e.target.checked)} />Bundled items</label><label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}><input type="checkbox" checked={hasOversized} onChange={(e) => setHasOversized(e.target.checked)} />Oversized items</label></div>
        <div className="calc-result liquidation"><div style={{ fontSize: 13, color: "var(--text-muted)" }}>Your Payout</div><div className="calc-total liquidation">£{payout.toFixed(2)}</div>
          <div style={{ marginTop: 16, padding: "16px 0", borderTop: "1px solid var(--border)", maxWidth: 280, margin: "16px auto 0", textAlign: "left" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}><span>Sale Price</span><span>£{salePrice.toFixed(2)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}><span>Marketplace (~12.8%)</span><span>-£{marketplaceFees.toFixed(2)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}><span>Shipping (~8%)</span><span>-£{shipping.toFixed(2)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 600, paddingTop: 8, borderTop: "1px solid var(--border)", marginBottom: 8 }}><span>Net Sale</span><span>£{netSale.toFixed(2)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--orange)", marginBottom: 6 }}><span>Selling Fee ({(sellingRate*100).toFixed(0)}%)</span><span>-£{sellingFee.toFixed(2)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}><span>Prep ({items}×£0.40)</span><span>-£{prepFee.toFixed(2)}</span></div>
            {hasBundles && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}><span>Bundling</span><span>-£{bundleFee.toFixed(2)}</span></div>}
            {hasOversized && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}><span>Oversized</span><span>-£{oversizedFee.toFixed(2)}</span></div>}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}><span>VAT (20%)</span><span>-£{vat.toFixed(2)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700, color: "var(--green)", paddingTop: 8, borderTop: "1px solid var(--border)" }}><span>Your Payout</span><span>£{payout.toFixed(2)}</span></div>
          </div>
        </div>
      </div>
    </div></>
  );
}

function BillingPage({ invoices }) {
  const outstanding = invoices.filter(i => i.status === "pending").reduce((s, i) => s + Number(i.amount || 0), 0);
  return (
    <><div className="page-header"><div><div className="page-title">Billing</div><div className="page-subtitle">{invoices.length} invoices</div></div></div>
    <div className="page-body">
      <div className="stats-grid" style={{ gridTemplateColumns: "1fr 1fr" }}><div className="card stat-card"><div className="card-title">Outstanding</div><div className="stat-value" style={{ color: outstanding > 0 ? "var(--amber)" : "var(--green)" }}>£{outstanding.toFixed(2)}</div></div><div className="card stat-card"><div className="card-title">Total Paid</div><div className="stat-value" style={{ color: "var(--green)" }}>£{invoices.filter(i => i.status === "paid").reduce((s, i) => s + Number(i.amount || 0), 0).toFixed(2)}</div></div></div>
      {invoices.length === 0 ? <div className="card empty-state"><Icons.Receipt /><p>No invoices yet.</p></div> : <div className="card" style={{ padding: 0, overflow: "hidden" }}><div className="table-wrap"><table><thead><tr><th>Invoice</th><th>Description</th><th>Amount</th><th>Status</th><th>Due</th></tr></thead><tbody>{invoices.map(inv => <tr key={inv.id}><td className="mono" style={{ fontWeight: 600 }}>{inv.invoice_number}</td><td style={{ fontSize: 13 }}>{inv.description || "—"}</td><td className="mono">£{Number(inv.amount).toFixed(2)}</td><td><StatusBadge status={inv.status} /></td><td style={{ fontSize: 13, color: "var(--text-muted)" }}>{inv.due_date ? new Date(inv.due_date).toLocaleDateString("en-GB") : "—"}</td></tr>)}</tbody></table></div></div>}
    </div></>
  );
}

function ProfilePage({ token, showToast }) {
  const { user, profile, signOut } = useAuth();
  const [form, setForm] = useState({ full_name: profile?.full_name || "", company_name: profile?.company_name || "" });
  const [saving, setSaving] = useState(false);
  const update = (f) => (e) => setForm({ ...form, [f]: e.target.value });
  const handleSave = async () => { setSaving(true); try { await supabase.from("profiles", token).update(user.id, form); showToast("Saved!"); } catch {} setSaving(false); };
  return (
    <><div className="page-header"><div><div className="page-title">Profile</div><div className="page-subtitle">Manage account</div></div></div>
    <div className="page-body">
      <div className="card" style={{ maxWidth: 600 }}><div className="card-title">Account</div><div style={{ marginTop: 16 }}><div className="input-group"><label className="input-label">Email</label><input className="input" value={user?.email || ""} disabled style={{ opacity: 0.6 }} /></div><div className="input-group"><label className="input-label">Full Name</label><input className="input" value={form.full_name} onChange={update("full_name")} /></div><div className="input-group"><label className="input-label">Company</label><input className="input" value={form.company_name} onChange={update("company_name")} /></div><button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</button></div></div>
      <div className="card" style={{ maxWidth: 600, marginTop: 20 }}><div className="card-title" style={{ color: "var(--red)" }}>Sign Out</div><button className="btn btn-secondary" onClick={signOut} style={{ marginTop: 12 }}><Icons.LogOut /> Sign Out</button></div>
    </div></>
  );
}

function Portal() {
  const { user, token, profile, signOut } = useAuth();
  const [service, setService] = useState("prep");
  const [page, setPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [parcels, setParcels] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [liquidationStock, setLiquidationStock] = useState([]);
  const [sales, setSales] = useState([]);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg) => setToast(msg), []);

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      const [p, s, i] = await Promise.all([supabase.from("parcels", token).select(), supabase.from("shipments", token).select(), supabase.from("invoices", token).select()]);
      if (Array.isArray(p)) setParcels(p);
      if (Array.isArray(s)) setShipments(s);
      if (Array.isArray(i)) setInvoices(i);
      try { const ls = await supabase.from("liquidation_stock", token).select(); if (Array.isArray(ls)) setLiquidationStock(ls); } catch {}
      try { const sa = await supabase.from("sales", token).select(); if (Array.isArray(sa)) setSales(sa); } catch {}
    } catch (err) { console.error(err); }
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { setPage("dashboard"); }, [service]);

  const prepNav = [{ id: "dashboard", label: "Dashboard", icon: Icons.Dashboard }, { id: "add-order", label: "Add Order", icon: Icons.Plus }, { id: "inventory", label: "My Inventory", icon: Icons.Package, badge: parcels.length || null }, { id: "shipments", label: "Shipments", icon: Icons.Truck }, { id: "fees", label: "Prep Fees", icon: Icons.Calculator }];
  const liquidationNav = [{ id: "dashboard", label: "Dashboard", icon: Icons.Dashboard }, { id: "send-stock", label: "Send Stock", icon: Icons.Send }, { id: "my-stock", label: "My Stock", icon: Icons.Box, badge: liquidationStock.length || null }, { id: "sales", label: "Sales & Payouts", icon: Icons.DollarSign }, { id: "fees", label: "Liquidation Fees", icon: Icons.Calculator }];
  const sharedNav = [{ id: "billing", label: "Billing", icon: Icons.Receipt, badge: invoices.filter(i => i.status === "pending").length || null }, { id: "profile", label: "Profile", icon: Icons.User }];
  const currentNav = service === "prep" ? prepNav : liquidationNav;
  const initials = (profile?.full_name || user?.email || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  const renderPage = () => {
    if (page === "billing") return <BillingPage invoices={invoices} />;
    if (page === "profile") return <ProfilePage token={token} showToast={showToast} />;
    if (service === "prep") {
      if (page === "dashboard") return <PrepDashboard parcels={parcels} shipments={shipments} />;
      if (page === "add-order") return <PrepAddOrderPage token={token} onRefresh={loadData} showToast={showToast} />;
      if (page === "inventory") return <PrepInventoryPage parcels={parcels} token={token} onRefresh={loadData} showToast={showToast} />;
      if (page === "shipments") return <PrepShipmentsPage shipments={shipments} />;
      if (page === "fees") return <PrepFeesPage />;
      return <PrepDashboard parcels={parcels} shipments={shipments} />;
    }
    if (service === "liquidation") {
      if (page === "dashboard") return <LiquidationDashboard liquidationStock={liquidationStock} sales={sales} />;
      if (page === "send-stock") return <LiquidationSendStockPage token={token} onRefresh={loadData} showToast={showToast} />;
      if (page === "my-stock") return <LiquidationMyStockPage liquidationStock={liquidationStock} token={token} onRefresh={loadData} showToast={showToast} />;
      if (page === "sales") return <LiquidationSalesPage sales={sales} />;
      if (page === "fees") return <LiquidationFeesPage />;
      return <LiquidationDashboard liquidationStock={liquidationStock} sales={sales} />;
    }
  };

  return (
    <div className="app-wrapper">
      <div className="mobile-header"><div style={{ display: "flex", alignItems: "center", gap: 10 }}><div className="sidebar-logo-icon" style={{ width: 32, height: 32, fontSize: 11 }}>BHB</div><span style={{ fontWeight: 700, fontSize: 16 }}>BHB PREP</span></div><button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}><Icons.Menu /></button></div>
      <div className={`sidebar-overlay ${sidebarOpen ? "open" : ""}`} onClick={() => setSidebarOpen(false)} />
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-logo"><div className="sidebar-logo-icon">BHB</div><div><div className="sidebar-logo-text">BHB PREP</div><div className="sidebar-logo-sub">Client Portal</div></div></div>
        <div className="service-tabs"><div className={`service-tab ${service === "prep" ? "active prep" : ""}`} onClick={() => setService("prep")}>📦 Prep</div><div className={`service-tab ${service === "liquidation" ? "active liquidation" : ""}`} onClick={() => setService("liquidation")}>💰 Liquidation</div></div>
        <nav className="sidebar-nav">
          <div className="sidebar-section-title">{service === "prep" ? "FBA Prep" : "Liquidation"}</div>
          {currentNav.map(item => <div key={item.id} className={`nav-item ${page === item.id ? `active ${service}` : ""}`} onClick={() => { setPage(item.id); setSidebarOpen(false); }}><item.icon />{item.label}{item.badge ? <span className={`nav-badge ${service === "liquidation" ? "liquidation" : ""}`}>{item.badge}</span> : null}</div>)}
          <div className="sidebar-section-title" style={{ marginTop: 16 }}>Account</div>
          {sharedNav.map(item => <div key={item.id} className={`nav-item ${page === item.id ? `active ${service}` : ""}`} onClick={() => { setPage(item.id); setSidebarOpen(false); }}><item.icon />{item.label}{item.badge ? <span className="nav-badge">{item.badge}</span> : null}</div>)}
        </nav>
        <div className="sidebar-footer"><div className="sidebar-user"><div className="sidebar-avatar">{initials}</div><div><div className="sidebar-username">{profile?.full_name || "User"}</div><div className="sidebar-email">{user?.email}</div></div></div><button className="btn-signout" onClick={signOut}><Icons.LogOut /> Sign Out</button></div>
      </aside>
      <main className="main-content">{renderPage()}</main>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

export default function App() {
  return <AuthProvider><style>{css}</style><AppRouter /></AuthProvider>;
}

function AppRouter() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loader"><div className="spinner" /></div>;
  return user ? <Portal /> : <LoginPage />;
}
