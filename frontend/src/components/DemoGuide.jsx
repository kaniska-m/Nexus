// ============================================================================
// Nexus — Demo Walkthrough Guide
// ============================================================================

import { useState, useEffect } from 'react';
import { HelpCircle, X, ArrowRight, Play } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const DEMO_STEPS = [
  { id: 1, text: "Dashboard — 3 AI-verified vendors loaded", path: "/buyer" },
  { id: 2, text: "Click a vendor card — see AI audit trail", path: "/buyer" },
  { id: 3, text: "New Vendor — watch Orchestrator generate checklist", path: "/buyer" },
  { id: 4, text: "Supplier Portal — upload docs, watch Verifier process", path: "/supplier/v_alpha_001" },
  { id: 5, text: "Health tab — Monitor Agent's continuous surveillance", path: "/buyer/health" }
];

export default function DemoGuide() {
  const [isOpen, setIsOpen] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const isDismissed = localStorage.getItem('nexus_guide_dismissed') === 'true';
    setDismissed(isDismissed);
    
    if (!isDismissed) {
      const timer = setTimeout(() => setIsOpen(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  if (dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem('nexus_guide_dismissed', 'true');
    setDismissed(true);
    setIsOpen(false);
  };

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-[100] overflow-hidden flex flex-col justify-end p-6">
      <div className="sticky bottom-0 left-0 flex flex-col items-start pointer-events-auto w-[360px]">
        {/* Panel */}
        <div 
          className={`bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200 overflow-hidden transition-all duration-300 transform origin-bottom-left mb-4 ${isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-8 pointer-events-none'}`}
        >
          <div className="bg-[#0f1f3d] text-white p-4 flex justify-between items-center">
            <h3 className="font-syne font-bold flex items-center gap-2">
              <Play className="w-4 h-4 text-teal-400" /> Hackathon Demo Guide
            </h3>
            <button onClick={() => setIsOpen(false)} className="text-white/60 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-5">
            <div className="space-y-4">
              {DEMO_STEPS.map((step) => {
                const isActive = location.pathname.includes(step.path.split('/')[1]);
                return (
                  <div key={step.id} className="flex gap-3 items-start group">
                    <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold ${isActive ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-500'}`}>
                      {step.id}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className={`text-sm ${isActive ? 'font-medium text-slate-800' : 'text-slate-600'}`}>{step.text}</p>
                      <Link to={step.path} className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 uppercase tracking-wider mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        Go <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={handleDismiss} className="w-full mt-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-lg text-sm transition-colors text-center">
              Got it
            </button>
          </div>
        </div>
        
        {/* Toggle Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`nexus-btn-primary w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 ${isOpen ? 'hidden' : 'flex'}`}
          aria-label="Toggle Demo Guide"
        >
          <HelpCircle className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
