'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, LayoutDashboard, HeartPulse, FileText, Zap, X } from 'lucide-react';

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Trigger on Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Reset search when closed
  useEffect(() => {
    if (!isOpen) setSearch('');
  }, [isOpen]);

  if (!isOpen) return null;

  const commands = [
    { name: 'Dashboard Home', description: 'View all vendors and pipelines', icon: LayoutDashboard, action: () => router.push('/dashboard') },
    { name: 'System Health', description: 'Monitor live agent status and backend telemetry', icon: HeartPulse, action: () => router.push('/dashboard/health') },
    { name: 'Audit Hub', description: 'Search global audit logs for all vendors', icon: FileText, action: () => router.push('/dashboard/audit') },
    { name: 'Onboard New Vendor', description: 'Quickly start a new vendor pipeline', icon: Zap, action: () => router.push('/dashboard?new=true') },
  ];

  const filtered = search ? commands.filter((c) => (c.name + c.description).toLowerCase().includes(search.toLowerCase())) : commands;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 animate-fade-in">
      <div className="absolute inset-0 bg-[#0f1f3d]/30 backdrop-blur-[2px]" onClick={() => setIsOpen(false)} />
      <div className="relative bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-slide-up">
        {/* Search Input */}
        <div className="flex items-center px-4 py-4 border-b border-slate-100">
          <Search className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
          <input
            autoFocus
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400 text-lg font-dm"
            placeholder="Search commands... (e.g. Health, Audit)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button onClick={() => setIsOpen(false)} className="p-1 rounded-md hover:bg-slate-100 text-slate-400 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results */}
        <div className="p-3 max-h-[350px] overflow-y-auto bg-slate-50/80">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Suggestions</p>
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-sm">No commands found for "{search}"</div>
          ) : (
            filtered.map((cmd, i) => (
              <button
                key={i}
                onClick={() => { cmd.action(); setIsOpen(false); }}
                className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-blue-50/70 hover:shadow-sm border border-transparent hover:border-blue-100 transition-all text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center justify-center shrink-0">
                  <cmd.icon className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#0f1f3d]">{cmd.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{cmd.description}</p>
                </div>
              </button>
            ))
          )}
        </div>
        
        {/* Footer */}
        <div className="px-4 py-3 bg-white border-t border-slate-100 flex items-center gap-4 text-[10px] font-medium text-slate-400">
          <span className="flex items-center gap-1"><kbd className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono">↑</kbd><kbd className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono">↓</kbd> navigate</span>
          <span className="flex items-center gap-1"><kbd className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono">Enter</kbd> select</span>
          <span className="flex items-center gap-1"><kbd className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono">Esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
