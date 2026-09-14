import { ArrowRight, CarFront, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useLocation } from 'wouter';
import { useLogin } from '@workspace/api-client-react';

export default function SignIn() {
  const [, setLocation] = useLocation();
  const login = useLogin();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    login.mutate({ data: { username, password } }, {
      onSuccess: () => setLocation('/'),
      onError: (err) => setError((err as { message?: string })?.message || 'That sign-in did not work. Check your details and try again.'),
    });
  };

  return (
    <div className="noise grid min-h-[100dvh] bg-[hsl(var(--sidebar))] lg:grid-cols-[.9fr_1.1fr]">
      <div className="relative hidden overflow-hidden border-r border-[hsl(var(--sidebar-border))] p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 app-grid opacity-[.09]" />
        <div className="relative flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))]"><CarFront className="h-5 w-5" /></div><span className="text-base font-extrabold text-[hsl(var(--sidebar-foreground))]">Move My Car</span></div>
        <div className="relative max-w-[440px] pb-12">
          <div className="mb-8 flex items-center gap-2 font-mono-custom text-[10px] uppercase tracking-[.2em] text-[hsl(var(--sidebar-primary))]"><span className="h-px w-8 bg-[hsl(var(--sidebar-primary))]" />A calmer roadside</div>
          <h1 className="text-5xl font-extrabold leading-[1.02] tracking-[-.065em] text-[hsl(var(--sidebar-foreground))] xl:text-6xl">A small code.<br /><span className="text-[hsl(var(--sidebar-primary))]">A big relief.</span></h1>
          <p className="mt-7 max-w-[365px] text-sm leading-7 text-[hsl(var(--sidebar-foreground)/.58)]">Let someone reach you about your parked car without putting your personal number on display.</p>
          <div className="mt-10 flex gap-8 border-t border-[hsl(var(--sidebar-border))] pt-6"><div><p className="font-mono-custom text-lg text-[hsl(var(--sidebar-foreground))]">01</p><p className="mt-1 text-[10px] uppercase tracking-[.14em] text-[hsl(var(--sidebar-foreground)/.45)]">Print a code</p></div><div><p className="font-mono-custom text-lg text-[hsl(var(--sidebar-foreground))]">02</p><p className="mt-1 text-[10px] uppercase tracking-[.14em] text-[hsl(var(--sidebar-foreground)/.45)]">Park with ease</p></div><div><p className="font-mono-custom text-lg text-[hsl(var(--sidebar-foreground))]">03</p><p className="mt-1 text-[10px] uppercase tracking-[.14em] text-[hsl(var(--sidebar-foreground)/.45)]">Stay reachable</p></div></div>
        </div>
        <div className="relative flex items-center gap-2 text-[10px] text-[hsl(var(--sidebar-foreground)/.4)]"><LockKeyhole className="h-3 w-3" /> No public phone numbers. Ever.</div>
      </div>
      <div className="flex items-center justify-center bg-[hsl(var(--background))] p-6 md:p-12">
        <div className="w-full max-w-[400px] rise-in">
          <div className="mb-10 flex items-center gap-3 lg:hidden"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"><CarFront className="h-5 w-5" /></div><span className="font-extrabold">Move My Car</span></div>
          <div className="mb-9"><div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[hsl(var(--accent)/.17)] px-3 py-1.5 font-mono-custom text-[10px] font-medium uppercase tracking-[.15em] text-[hsl(var(--foreground))]"><ShieldCheck className="h-3.5 w-3.5 text-[hsl(var(--chart-2))]" />Owner portal</div><h2 className="text-3xl font-extrabold tracking-[-.05em] md:text-4xl">Welcome back.</h2><p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Your car is covered. Sign in to check your codes.</p></div>
          <form onSubmit={submit} className="space-y-5">
            <label className="block"><span className="mb-2 block text-xs font-bold">Username</span><input required minLength={3} value={username} onChange={(e) => setUsername(e.target.value)} data-testid="input-username" className="h-12 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-4 text-sm outline-none transition focus:border-[hsl(var(--accent))] focus:ring-4 focus:ring-[hsl(var(--accent)/.14)]" placeholder="you@example.com" /></label>
            <label className="block"><div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold">Password</span><span className="font-mono-custom text-[10px] text-[hsl(var(--muted-foreground))]">SECURE LOGIN</span></div><input required value={password} onChange={(e) => setPassword(e.target.value)} data-testid="input-password" type="password" className="h-12 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-4 text-sm outline-none transition focus:border-[hsl(var(--accent))] focus:ring-4 focus:ring-[hsl(var(--accent)/.14)]" placeholder="Enter your password" /></label>
            {error && <div role="alert" data-testid="status-login-error" className="rounded-lg border border-[hsl(var(--destructive)/.26)] bg-[hsl(var(--destructive)/.08)] px-4 py-3 text-xs leading-5 text-[hsl(var(--destructive))]">{error}</div>}
            <button type="submit" disabled={login.isPending} data-testid="button-sign-in" className="group flex h-12 w-full items-center justify-center gap-3 rounded-lg bg-[hsl(var(--primary))] text-sm font-bold text-[hsl(var(--primary-foreground))] transition hover:-translate-y-0.5 hover:shadow-[0_8px_18px_hsl(var(--primary)/.18)] disabled:cursor-wait disabled:opacity-60">{login.isPending ? 'Checking your account…' : 'Sign in to dashboard'}{!login.isPending && <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />}</button>
          </form>
          <p className="mt-9 text-center text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">Your dashboard is protected by secure session authentication.<br />Only you can manage your vehicle codes.</p>
        </div>
      </div>
    </div>
  );
}