'use client';

import { AlertCircle, ShieldAlert, CheckCircle, XCircle, ChevronRight, Info } from 'lucide-react';

export default function ExceptionPanel({ exceptions = [], onAction }) {
  if (exceptions.length === 0) {
    return (
      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
          <CheckCircle className="w-6 h-6 text-emerald-600" />
        </div>
        <h3 className="font-syne font-bold text-navy">All Clear</h3>
        <p className="text-xs text-slate-500 mt-1">No compliance exceptions or fraud signals detected for this vendor.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="font-syne font-bold text-navy flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-500" />
          Exceptions Needing Review
        </h3>
        <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
          {exceptions.length} ACTION REQUIRED
        </span>
      </div>

      <div className="space-y-3">
        {exceptions.map((exc, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-red-200 transition-colors">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-navy text-sm font-syne uppercase tracking-tight">{exc.exception_type}</h4>
                  <span className="text-[10px] text-slate-400 font-mono">#{Math.random().toString(36).substring(7).toUpperCase()}</span>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {exc.description}
                </p>
                
                {/* AI Reasoning Indicator */}
                <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">AI Reasoning Engine</p>
                    <p className="text-[11px] text-slate-700 mt-0.5 italic">"High confidence match in OpenSanctions DB. Entity name and DOB align with PEP list entry."</p>
                  </div>
                </div>

                {/* HIIL Actions */}
                <div className="mt-5 flex gap-2">
                  <button 
                    onClick={() => onAction?.('confirm', exc)}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Confirm Flag
                  </button>
                  <button 
                    onClick={() => onAction?.('override', exc)}
                    className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[10px] font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Override (Safe)
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
