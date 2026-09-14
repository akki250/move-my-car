import { CarFront, CircleHelp, LayoutDashboard, LogOut, Settings, ShieldCheck } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import type { ReactNode } from 'react';

type AppChromeProps = { username?: string | null; onLogout: () => void; children: ReactNode };

export function AppChrome({ username, onLogout, children }: AppChromeProps) {
  const [location] = useLocation();
  const initials = (username || 'Driver').slice(0, 2).toUpperCase();
  const nav = [
    { href: '/', label: 'Overview', icon: LayoutDashboard },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="noise min-h-[100dvh] bg-[hsl(var(--background))]">
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))] md:flex">
        <div className="flex items-center gap-3 border-b border-[hsl(var(--sidebar-border))] px-7 py-7">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))] shadow-[0_6px_18px_hsl(var(--sidebar-primary)/.18)]">
            <CarFront className="h-5 w-5" strokeWidth={2.4} />
          </div>
          <div>
            <div className="text-[15px] font-extrabold tracking-[-.03em]">Move My Car</div>
            <div className="font-mono-custom text-[9px] uppercase tracking-[.18em] text-[hsl(var(--sidebar-foreground)/.5)]">safety network</div>
          </div>
        </div>
        <div className="px-4 pt-8">
          <p className="px-3 pb-3 font-mono-custom text-[10px] uppercase tracking-[.18em] text-[hsl(var(--sidebar-foreground)/.42)]">Your garage</p>
          <nav className="space-y-1">
            {nav.map(({ href, label, icon: Icon }) => {
              const active = location === href;
              return (
                <Link key={href} href={href} data-testid={`link-nav-${label.toLowerCase()}`} className={`group flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold transition-all duration-200 ${active ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-foreground))] shadow-[inset_3px_0_0_hsl(var(--sidebar-primary))]' : 'text-[hsl(var(--sidebar-foreground)/.62)] hover:bg-[hsl(var(--sidebar-accent)/.7)] hover:text-[hsl(var(--sidebar-foreground))]'}`}>
                  <Icon className={`h-[17px] w-[17px] ${active ? 'text-[hsl(var(--sidebar-primary))]' : ''}`} />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="mt-auto px-5 pb-6">
          <div className="mb-5 rounded-xl border border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-accent)/.65)] p-4">
            <div className="mb-3 flex items-center gap-2 text-[hsl(var(--sidebar-primary))]"><ShieldCheck className="h-4 w-4" /><span className="font-mono-custom text-[10px] uppercase tracking-[.16em]">Privacy first</span></div>
            <p className="text-[11px] leading-relaxed text-[hsl(var(--sidebar-foreground)/.58)]">Your number stays hidden. We connect you only when your car needs a voice.</p>
          </div>
          <div className="flex items-center gap-3 border-t border-[hsl(var(--sidebar-border))] pt-5">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-[hsl(var(--sidebar-primary)/.14)] font-mono-custom text-xs font-medium text-[hsl(var(--sidebar-primary))]">{initials}</div>
            <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{username || 'Driver'}</p><p className="text-[10px] text-[hsl(var(--sidebar-foreground)/.48)]">Owner account</p></div>
            <button type="button" onClick={onLogout} aria-label="Sign out" data-testid="button-logout" className="rounded-md p-2 text-[hsl(var(--sidebar-foreground)/.48)] transition hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))]"><LogOut className="h-4 w-4" /></button>
          </div>
        </div>
      </aside>
      <div className="md:pl-[248px]">
        <header className="no-print sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/.92)] px-5 backdrop-blur-xl md:px-10">
          <div className="flex items-center gap-2 md:hidden"><div className="grid h-8 w-8 place-items-center rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"><CarFront className="h-4 w-4" /></div><span className="text-sm font-extrabold">Move My Car</span></div>
          <div className="hidden items-center gap-2 text-xs text-[hsl(var(--muted-foreground))] md:flex"><CircleHelp className="h-4 w-4" /><span>Need a hand?</span><button type="button" data-testid="button-help" className="font-bold text-[hsl(var(--foreground))] underline decoration-[hsl(var(--accent))] underline-offset-4">Read the safety guide</button></div>
          <div className="flex items-center gap-3 md:ml-auto"><span className="hidden rounded-full bg-[hsl(var(--chart-2)/.1)] px-3 py-1.5 font-mono-custom text-[10px] font-medium uppercase tracking-[.12em] text-[hsl(var(--chart-2))] sm:inline-flex"><span className="mr-2 mt-[3px] h-1.5 w-1.5 rounded-full bg-[hsl(var(--chart-2))]" />All systems ready</span><Link href="/settings" data-testid="link-mobile-settings" className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] md:hidden"><Settings className="h-4 w-4" /></Link></div>
        </header>
        <main className="mx-auto max-w-[1440px] px-5 py-8 md:px-10 md:py-10">{children}</main>
      </div>
    </div>
  );
}