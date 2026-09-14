import { useEffect, useMemo, useState } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, SignIn, SignUp, useAuth, useClerk, useUser } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import {
  getGetCurrentUserQueryKey, getGetSettingsQueryKey, getGetStatsQueryKey,
  getListQrCodesQueryKey, getListScanLogsQueryKey, getListUsersQueryKey,
  useCreateQrCode, useDeleteQrCode, useDeleteUser,
  useGetSettings, useGetStats, useListQrCodes, useListScanLogs, useListUsers,
  useLogScan, useLogScanAction, useUpdateQrCode, useUpdateSettings,
} from "@workspace/api-client-react";
import { type QrCode } from "@workspace/api-client-react";
import { Route, Switch, useLocation, useRoute, Router as WouterRouter } from "wouter";
import {
  Activity, ArrowRight, CarFront, Check, Copy, ExternalLink, LayoutDashboard,
  Link2, LogOut, Menu, Phone, Plus, QrCode as QrIcon, ScanLine, Settings,
  ShieldCheck, Smartphone, Trash2, UserPlus, X, Zap,
} from "lucide-react";
import { ErrorBoundary } from "@/components/error-boundary";

const queryClient = new QueryClient();
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/favicon.svg`,
  },
  variables: {
    colorPrimary: "#214e45",
    colorForeground: "#193730",
    colorMutedForeground: "#789088",
    colorDanger: "#b4594d",
    colorBackground: "#ffffff",
    colorInput: "#fbfdfb",
    colorInputForeground: "#23423a",
    colorNeutral: "#d6e1d7",
    fontFamily: "DM Sans",
    borderRadius: "0.6rem",
  },
  elements: {
    cardBox: "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[#193730]",
    headerSubtitle: "text-[#789088]",
    socialButtonsBlockButtonText: "text-[#36564e]",
    formFieldLabel: "text-[#426158]",
    footerActionLink: "text-[#4f805f]",
    footerActionText: "text-[#789088]",
    dividerText: "text-[#789088]",
    formButtonPrimary: "bg-[#214e45] hover:bg-[#2d6258]",
    formFieldInput: "border-[#d6e1d7] bg-[#fbfdfb] text-[#23423a]",
    socialButtonsBlockButton: "border-[#d7e2d8] bg-white",
    logoBox: "mb-4",
    main: "bg-transparent",
  },
};

function errMessage(error: unknown) {
  const data = (error as { data?: { error?: string } })?.data;
  return data?.error ?? "Something went wrong. Please try again.";
}

function Brand() {
  return <div className="brand"><span className="brand-mark"><CarFront size={19} /></span><span>Move My Car</span></div>;
}

function LandingPage() {
  const [, navigate] = useLocation();
  return <main className="landing-page">
    <header className="landing-nav"><Brand /><div className="landing-nav-actions"><button className="button small outline" onClick={() => navigate("/sign-in")}>Log in</button><button className="button small primary" onClick={() => navigate("/sign-up")}>Create account</button></div></header>
    <section className="landing-hero">
      <div className="landing-copy"><p className="eyebrow">Private vehicle contact</p><h1>Make your car <em>easy to reach.</em></h1><p className="landing-lede">A simple QR sticker lets someone contact you about your vehicle without putting your personal number on display.</p><div className="landing-actions"><button className="button primary" onClick={() => navigate("/sign-up")}>Get started <ArrowRight size={16} /></button><button className="button outline" onClick={() => navigate("/sign-in")}>Log in to dashboard</button></div><div className="landing-trust"><ShieldCheck size={15} /> Your contact details stay private</div></div>
      <div className="landing-preview"><div className="preview-window"><div className="preview-top"><span /><span /><span /></div><div className="preview-content"><div className="preview-qr"><QrIcon size={52} /></div><p className="eyebrow">Move My Car</p><h2>Need to reach the owner?</h2><p>Choose a call or text. No number shown.</p><div className="preview-button"><Phone size={14} /> Call owner <ArrowRight size={14} /></div><div className="preview-button light"><Smartphone size={14} /> Text owner <ArrowRight size={14} /></div></div></div></div>
    </section>
    <section className="landing-features"><div><div className="feature-icon blue"><QrIcon size={17} /></div><h3>One sticker per car</h3><p>Create and manage QR codes for every vehicle.</p></div><div><div className="feature-icon lime"><ShieldCheck size={17} /></div><h3>Privacy first</h3><p>Keep your phone number off the sticker and public page.</p></div><div><div className="feature-icon orange"><Activity size={17} /></div><h3>Know when it happens</h3><p>See scans and contact attempts from your dashboard.</p></div></section>
  </main>;
}

function ClerkSignInPage() {
  return <main className="auth-page clerk-auth-page"><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></main>;
}

function ClerkSignUpPage() {
  return <main className="auth-page clerk-auth-page"><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></main>;
}

function Shell({ children, user, onLogout }: { children: React.ReactNode; user: string; onLogout: () => void }) {
  const [location, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const nav = (path: string) => { navigate(path); setOpen(false); };
  return <div className="app-shell">
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <div className="side-top"><Brand /><button className="icon-button mobile-only" onClick={() => setOpen(false)}><X size={18} /></button></div>
      <div className="side-label">Workspace</div>
      <nav>
        <button className={location === "/" ? "nav-item active" : "nav-item"} onClick={() => nav("/")}><LayoutDashboard size={17} /> Overview</button>
        <button className={location === "/settings" ? "nav-item active" : "nav-item"} onClick={() => nav("/settings")}><Settings size={17} /> Settings</button>
      </nav>
      <div className="side-bottom">
        <div className="privacy-card"><ShieldCheck size={17} /><div><strong>Privacy first</strong><span>Your number is never public.</span></div></div>
        <div className="account"><div className="avatar">{user.slice(0, 1).toUpperCase()}</div><div className="account-copy"><strong>{user}</strong><span>Owner account</span></div><button className="icon-button" onClick={onLogout} aria-label="Sign out"><LogOut size={16} /></button></div>
      </div>
    </aside>
    {open && <button className="scrim" onClick={() => setOpen(false)} aria-label="Close menu" />}
    <main className="main-content">
      <header className="topbar"><button className="icon-button mobile-only" onClick={() => setOpen(true)}><Menu size={20} /></button><div className="topbar-spacer" /><span className="status-pill"><span className="live-dot" /> System operational</span><button className="avatar top-avatar">{user.slice(0, 1).toUpperCase()}</button></header>
      {children}
    </main>
  </div>;
}

function StatCard({ label, value, detail, icon, tone }: { label: string; value: number; detail: string; icon: React.ReactNode; tone: string }) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div className="stat-copy"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></div>;
}

function CreateQrDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const create = useCreateQrCode();
  const [label, setLabel] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    create.mutate({ data: { label, location, forwardPhone: phone || null } }, {
      onSuccess: () => { void queryClient.invalidateQueries({ queryKey: getListQrCodesQueryKey() }); void queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() }); onClose(); },
    });
  };
  return <div className="modal-wrap"><button className="modal-backdrop" onClick={onClose} aria-label="Close" /><section className="modal"><div className="modal-head"><div><p className="eyebrow">New sticker</p><h2>Create a QR code</h2><p>Give this sticker a clear name so you know where it belongs.</p></div><button className="icon-button" onClick={onClose}><X size={19} /></button></div>
    <form onSubmit={submit} className="form-stack"><label>Sticker name<input autoFocus required value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Front windshield" /></label><label>Vehicle or location<input required value={location} onChange={(e) => setLocation(e.target.value)} placeholder="My Subaru · Main driveway" /></label><label>Direct phone fallback <span className="muted">(optional)</span><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 123 4567" /></label><p className="hint"><ShieldCheck size={15} /> If Twilio is connected later, visitors will call through a proxy instead.</p>{create.isError && <div className="form-error">{errMessage(create.error)}</div>}<button className="button primary wide" disabled={create.isPending}>{create.isPending ? "Creating…" : "Create QR code"} <ArrowRight size={16} /></button></form>
  </section></div>;
}

function QrCard({ qr, onChange }: { qr: QrCode; onChange: () => void }) {
  const update = useUpdateQrCode();
  const remove = useDeleteQrCode();
  const [copied, setCopied] = useState(false);
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const publicUrl = `${window.location.origin}${basePath}/scan/${qr.id}`;
  const toggle = () => update.mutate({ id: qr.id, data: { active: !qr.active } }, { onSuccess: onChange });
  const copy = async () => { await navigator.clipboard?.writeText(publicUrl); setCopied(true); setTimeout(() => setCopied(false), 1600); };
  const del = () => { if (window.confirm(`Delete "${qr.label}"?`)) remove.mutate({ id: qr.id }, { onSuccess: onChange }); };
  return <article className={`qr-card ${!qr.active ? "inactive" : ""}`}><div className="qr-visual"><QrIcon size={52} strokeWidth={1.2} /><span>SCAN</span></div><div className="qr-info"><div className="qr-title-row"><div><h3>{qr.label}</h3><p>{qr.location}</p></div><span className={qr.active ? "badge active" : "badge"}>{qr.active ? "Active" : "Paused"}</span></div><div className="qr-meta"><span><Activity size={14} /> Created {new Date(qr.createdAt).toLocaleDateString()}</span><span><Link2 size={14} /> /scan/{qr.id}</span></div><div className="qr-actions"><a className="button small outline" href={publicUrl}><ExternalLink size={14} /> View page</a><button className="button small outline" onClick={copy}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "Copied" : "Copy link"}</button><button className="button small ghost" onClick={toggle}>{qr.active ? "Pause" : "Activate"}</button><button className="icon-button danger" onClick={del} aria-label="Delete"><Trash2 size={15} /></button></div></div></article>;
}

function Dashboard({ user, onLogout }: { user: string; onLogout: () => void }) {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const { data: stats, isLoading: statsLoading } = useGetStats();
  const { data: qrs, isLoading: qrLoading } = useListQrCodes();
  const { data: logs } = useListScanLogs({ limit: 8 });
  const refresh = () => { void queryClient.invalidateQueries({ queryKey: getListQrCodesQueryKey() }); void queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() }); void queryClient.invalidateQueries({ queryKey: getListScanLogsQueryKey({ limit: 8 }) }); };
  const qrList = qrs ?? [];
  return <Shell user={user} onLogout={onLogout}><div className="page">
    <div className="page-heading"><div><p className="eyebrow">Monday, September 14</p><h1>Good to see you, <em>{user}</em></h1><p className="subheading">Here’s what’s happening with your vehicle contacts.</p></div><button className="button primary" onClick={() => setShowCreate(true)}><Plus size={17} /> New QR code</button></div>
    <div className="stats-grid"><StatCard label="Total codes" value={statsLoading ? 0 : stats?.totalQrCodes ?? 0} detail="Across your vehicles" icon={<QrIcon size={19} />} tone="blue" /><StatCard label="Active codes" value={statsLoading ? 0 : stats?.activeQrCodes ?? 0} detail="Ready to be scanned" icon={<Zap size={19} />} tone="lime" /><StatCard label="Total scans" value={statsLoading ? 0 : stats?.totalScans ?? 0} detail="All-time activity" icon={<ScanLine size={19} />} tone="orange" /><StatCard label="Contacts" value={(stats?.totalCalls ?? 0) + (stats?.totalTexts ?? 0)} detail={`${stats?.totalCalls ?? 0} calls · ${stats?.totalTexts ?? 0} texts`} icon={<Smartphone size={19} />} tone="violet" /></div>
    <div className="section-heading"><div><h2>Your QR codes</h2><p>Print a sticker and place it where it can be seen.</p></div><span className="count-label">{qrList.length} {qrList.length === 1 ? "code" : "codes"}</span></div>
    {qrLoading ? <div className="empty-card"><div className="spinner" /> Loading your codes…</div> : qrList.length ? <div className="qr-grid">{qrList.map((qr) => <QrCard key={qr.id} qr={qr} onChange={refresh} />)}</div> : <div className="empty-card"><div className="empty-icon"><QrIcon size={23} /></div><h3>Your first code starts here</h3><p>Create a QR sticker for your car. Anyone who scans it can reach you without seeing your number.</p><button className="button primary" onClick={() => setShowCreate(true)}><Plus size={16} /> Create a QR code</button></div>}
    <div className="section-heading activity-head"><div><h2>Recent activity</h2><p>Scans and contact attempts from your codes.</p></div><button className="text-button" onClick={() => queryClient.invalidateQueries({ queryKey: getListScanLogsQueryKey({ limit: 8 }) })}>Refresh <ArrowRight size={14} /></button></div>
    <div className="activity-list">{logs?.length ? logs.map((log) => <div className="activity-row" key={log.id}><div className={`activity-icon ${log.action}`}><Activity size={16} /></div><div className="activity-copy"><strong>{log.action === "scan" ? "QR code scanned" : log.action === "call" ? "Call requested" : "Text requested"}</strong><span>{log.label ?? `QR code ${log.qrCodeId}`}</span></div><time>{new Date(log.scannedAt).toLocaleDateString()}</time></div>) : <div className="activity-empty"><Activity size={17} /> No activity yet. Your first scan will appear here.</div>}</div>
  </div>{showCreate && <CreateQrDialog onClose={() => setShowCreate(false)} />}</Shell>;
}

function SettingsPage({ user, onLogout }: { user: string; onLogout: () => void }) {
  const queryClient = useQueryClient();
  const { data: settings } = useGetSettings();
  const { data: users } = useListUsers();
  const update = useUpdateSettings();
  const create = useCreateUser();
  const remove = useDeleteUser();
  const [phone, setPhone] = useState("");
  const [newUser, setNewUser] = useState({ username: "", password: "" });
  const [message, setMessage] = useState("");
  useEffect(() => setPhone(settings?.ownerPhone ?? ""), [settings?.ownerPhone]);
  const saveSettings = (e: React.FormEvent) => { e.preventDefault(); update.mutate({ data: { ownerPhone: phone || null } }, { onSuccess: () => setMessage("Forwarding number saved.") }); };
  const addUser = (e: React.FormEvent) => { e.preventDefault(); create.mutate({ data: newUser }, { onSuccess: () => { setNewUser({ username: "", password: "" }); setMessage("Dashboard login created."); void queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() }); } }); };
  return <Shell user={user} onLogout={onLogout}><div className="page narrow-page"><div className="page-heading"><div><p className="eyebrow">Workspace</p><h1>Settings</h1><p className="subheading">Keep your account and forwarding details up to date.</p></div></div>
    {message && <div className="success-banner"><Check size={16} />{message}</div>}
    <section className="settings-card"><div className="settings-title"><div className="settings-icon blue"><Phone size={18} /></div><div><h2>Forwarding number</h2><p>Used as the fallback contact number for your QR codes.</p></div></div><form onSubmit={saveSettings} className="inline-form"><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 123 4567" /><button className="button primary" disabled={update.isPending}>{update.isPending ? "Saving…" : "Save number"}</button></form>{update.isError && <div className="form-error">{errMessage(update.error)}</div>}</section>
    <section className="settings-card"><div className="settings-title"><div className="settings-icon violet"><UserPlus size={18} /></div><div><h2>Dashboard accounts</h2><p>Create another login for someone you trust.</p></div></div><form onSubmit={addUser} className="user-form"><input required minLength={3} placeholder="Username" value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} /><input required minLength={6} type="password" placeholder="Temporary password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} /><button className="button primary" disabled={create.isPending}><Plus size={16} /> Add user</button></form>{create.isError && <div className="form-error">{errMessage(create.error)}</div>}<div className="user-list">{users?.map((account) => <div className="user-row" key={account.id}><div className="avatar small">{account.username.slice(0, 1).toUpperCase()}</div><div><strong>{account.username}</strong><span>Added {new Date(account.createdAt).toLocaleDateString()}</span></div>{account.username !== user && <button className="icon-button danger" onClick={() => { if (window.confirm(`Remove ${account.username}?`)) remove.mutate({ id: account.id }, { onSuccess: () => void queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() }) }); }}><Trash2 size={15} /></button>}</div>)}</div></section>
    <div className="account-note"><ShieldCheck size={17} /><p><strong>Signed in as {user}</strong><br />Your dashboard data is private to this account.</p></div>
  </div></Shell>;
}

function ScanPage() {
  const [, params] = useRoute("/scan/:id");
  const id = Number(params?.id);
  const scan = useLogScan();
  const action = useLogScanAction();
  const [done, setDone] = useState("");
  useEffect(() => { if (Number.isFinite(id)) scan.mutate({ qrId: id }); }, [id]); // intentional once per QR page
  if (scan.isPending) return <div className="scan-page"><div className="scan-loading"><div className="spinner" /><p>Loading contact details…</p></div></div>;
  if (scan.isError || !scan.data) return <div className="scan-page"><div className="scan-panel"><Brand /><div className="scan-result"><div className="empty-icon danger-bg"><X size={24} /></div><h1>QR code not found</h1><p>This sticker may have been removed or the link is incorrect.</p></div></div></div>;
  const info = scan.data;
  const contact = info.twilioPhone ?? info.directPhone;
  const choose = (kind: "call" | "text") => { action.mutate({ qrId: id, data: { action: kind, scanLogId: info.scanLogId } }); setDone(kind); };
  return <div className="scan-page"><div className="scan-panel"><Brand />{!info.active ? <div className="scan-result"><div className="empty-icon muted-bg"><QrIcon size={24} /></div><p className="eyebrow">Sticker unavailable</p><h1>This QR code is paused.</h1><p>The owner has temporarily disabled this contact sticker.</p></div> : <><div className="scan-hero"><div className="scan-check"><Check size={23} /></div><p className="eyebrow">You found the owner</p><h1>{info.label}</h1><p className="scan-location">{info.location}</p><p className="scan-description">Choose how you’d like to let them know about their vehicle.</p></div><div className="contact-actions">{contact && <><a className={`contact-button call ${done === "call" ? "done" : ""}`} href={`tel:${contact}`} onClick={() => choose("call")}><span><Phone size={19} /></span><div><strong>{done === "call" ? "Call logged" : "Call owner"}</strong><small>Open your phone app</small></div><ArrowRight size={17} /></a><a className={`contact-button text ${done === "text" ? "done" : ""}`} href={`sms:${contact}`} onClick={() => choose("text")}><span><Smartphone size={19} /></span><div><strong>{done === "text" ? "Text logged" : "Text owner"}</strong><small>Send a quick message</small></div><ArrowRight size={17} /></a></>}</div>{info.directPhone && !info.twilioPhone && <p className="privacy-warning"><ShieldCheck size={15} /> This owner uses direct phone fallback. Your phone carrier may expose caller ID.</p>}</>}</div><p className="scan-footer">Powered by <strong>Move My Car</strong> · Private contact, made simple.</p></div>;
}

function AppRoutes() {
  const { data: auth, isLoading } = useGetCurrentUser();
  const logout = useLogout();
  const [, navigate] = useLocation();
  const handleLogout = () => logout.mutate(undefined, {
    onSuccess: () => {
      queryClient.removeQueries();
      void queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
      navigate("/");
    },
  });
  if (isLoading) return <div className="screen-loading"><div className="brand"><span className="brand-mark"><CarFront size={19} /></span> Move My Car</div><div className="spinner" /></div>;
  return <Switch><Route path="/scan/:id" component={ScanPage} /><Route path="/login">{auth?.authenticated ? <Dashboard user={auth.username ?? "owner"} onLogout={handleLogout} /> : <LoginPage />}</Route><Route path="/register">{auth?.authenticated ? <Dashboard user={auth.username ?? "owner"} onLogout={handleLogout} /> : <RegisterPage />}</Route><Route path="/settings">{auth?.authenticated ? <SettingsPage user={auth.username ?? "owner"} onLogout={handleLogout} /> : <LandingPage />}</Route><Route path="/">{auth?.authenticated ? <Dashboard user={auth.username ?? "owner"} onLogout={handleLogout} /> : <LandingPage />}</Route><Route><LandingPage /></Route></Switch>;
}

export default function App() {
  return <QueryClientProvider client={queryClient}><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}><ErrorBoundary><AppRoutes /></ErrorBoundary></WouterRouter></QueryClientProvider>;
}