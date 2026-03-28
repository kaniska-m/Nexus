'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { LayoutDashboard, ShieldAlert, Activity, Plus, LogOut, Wifi, WifiOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRealtime } from '@/components/RealtimeProvider';

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const isSupplier = pathname.startsWith('/supplier');
  const isLogin = pathname === '/login' || pathname === '/signup';
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('buyer');
  const { connectionStatus } = useRealtime();

  useEffect(() => {
    const supabase = createClient();

    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        setRole(session.user.user_metadata?.role || 'buyer');
      } else {
        setUser(null);
      }
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setRole(session.user.user_metadata?.role || 'buyer');
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    router.push('/login');
    router.refresh();
  };

  if (isLogin) return null;

  // Connection status indicator
  const ConnectionDot = () => {
    const colors = {
      connected: 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]',
      reconnecting: 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)] animate-pulse',
      disconnected: 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]',
    };
    const labels = { connected: 'Live', reconnecting: 'Reconnecting', disconnected: 'Offline' };
    return (
      <div className="flex items-center gap-1.5" title={`Realtime: ${connectionStatus}`}>
        <div className={`w-2 h-2 rounded-full ${colors[connectionStatus] || colors.disconnected}`} />
        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
          {labels[connectionStatus] || 'Offline'}
        </span>
      </div>
    );
  };

  if (isSupplier) {
    return (
      <>
        <div className="nexus-accent-bar" />
        <nav className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 h-16 sticky top-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xl text-[#0f1f3d] font-syne tracking-tight">NEXUS</span>
              <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-3 font-syne">Supplier Portal</span>
            </div>
          </div>
        </nav>
      </>
    );
  }

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { href: '/dashboard/health', label: 'Health', icon: Activity },
    { href: '/dashboard/audit', label: 'Audit Trail', icon: ShieldAlert },
  ];

  const getInitials = () => {
    if (!user) return '?';
    const name = user.user_metadata?.full_name || user.email || '';
    if (user.user_metadata?.full_name) {
      return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return (user.email || '?')[0].toUpperCase();
  };

  const truncatedEmail = user?.email
    ? user.email.length > 20 ? user.email.slice(0, 20) + '…' : user.email
    : '';

  const roleBadgeClass = role === 'admin'
    ? 'bg-purple-100 text-purple-700 border-purple-200'
    : 'bg-blue-100 text-blue-700 border-blue-200';

  return (
    <>
      <div className="nexus-accent-bar" />
      <nav className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 h-16 sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-12">
            <div className="flex items-center gap-2 cursor-pointer group" onClick={() => router.push('/dashboard')}>
              <span className="font-bold text-2xl text-[#0f1f3d] font-syne tracking-tight group-hover:text-blue-700 transition-colors">NEXUS</span>
              <div className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse" />
            </div>
            <div className="hidden md:flex h-16">
              {navItems.map(({ href, label, icon: Icon, exact }) => {
                const isActive = exact ? pathname === href : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center px-4 border-b-2 gap-2 text-sm font-semibold transition-all ${
                      isActive
                        ? 'border-blue-600 text-blue-600 bg-blue-50/40'
                        : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                    }`}
                  >
                    <Icon className="w-4 h-4" /> {label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Connection Status */}
            <ConnectionDot />

            <button
              onClick={() => router.push('/dashboard?new=true')}
              className="nexus-btn-primary py-2 px-4 text-sm"
            >
              <Plus className="w-4 h-4" /> New Vendor
            </button>

            {user && (
              <div className="flex items-center gap-3 ml-2 pl-3 border-l border-slate-200">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                  {getInitials()}
                </div>
                <div className="hidden lg:block">
                  <p className="text-xs font-semibold text-[#0f1f3d] leading-tight truncate max-w-[140px]">
                    {truncatedEmail}
                  </p>
                  <span className={`inline-flex items-center px-1.5 py-0 rounded text-[9px] font-bold uppercase tracking-wider border ${roleBadgeClass}`}>
                    {role}
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
