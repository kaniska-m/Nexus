import { X, Newspaper, CreditCard, Gavel, ShieldCheck, ExternalLink, AlertCircle } from 'lucide-react';

export default function VendorHealthDrawer({ isOpen, onClose, vendor }) {
  if (!vendor) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-navy/20 backdrop-blur-sm z-[60] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-xl bg-slate-50 shadow-2xl z-[70] transition-transform duration-500 ease-out transform ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
        {/* Header */}
        <div className="bg-white border-b border-slate-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-syne font-bold text-navy">{vendor.vendor_name}</h2>
            <p className="text-sm text-slate-500">{vendor.industry} • Health Profile</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* 1. News & Adverse Media */}
          <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="flex items-center gap-2 font-syne font-bold text-navy mb-4">
              <Newspaper className="w-5 h-5 text-blue-500" />
              News & Adverse Media
            </h3>
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg border-l-4 border-slate-300">
                <p className="text-sm font-semibold text-slate-800">Expansion into Southeast Asian markets announced</p>
                <p className="text-xs text-slate-500 mt-1">Found 2 days ago • Economic Times</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border-l-4 border-slate-300">
                <p className="text-sm font-semibold text-slate-800">Named in "Top 50 Innovators in MedTech 2024"</p>
                <p className="text-xs text-slate-500 mt-1">Found 1 week ago • Healthcare Weekly</p>
              </div>
            </div>
            <button className="w-full mt-4 text-xs font-bold text-accent hover:underline flex items-center justify-center gap-1">
              View All Mentions <ExternalLink className="w-3 h-3" />
            </button>
          </section>

          {/* 2. Credit & Financial Health */}
          <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="flex items-center gap-2 font-syne font-bold text-navy mb-4">
              <CreditCard className="w-5 h-5 text-teal-500" />
              Credit & Financial Health
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Credit Score</p>
                <p className="text-2xl font-syne font-bold text-emerald-700">82/100</p>
                <p className="text-[10px] text-emerald-500 mt-1">Excellent (No defaults)</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Revenue Trend</p>
                <p className="text-2xl font-syne font-bold text-blue-700">+14%</p>
                <p className="text-[10px] text-blue-500 mt-1">Year-over-Year Growth</p>
              </div>
            </div>
          </section>

          {/* 3. Regulatory & Legal */}
          <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="flex items-center gap-2 font-syne font-bold text-navy mb-4">
              <Gavel className="w-5 h-5 text-purple-500" />
              Regulatory & Legal
            </h3>
            <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Pending Patent Litigation</p>
                <p className="text-xs text-amber-700 mt-0.5">Civil suit filed in Delhi High Court regarding medical sensor patents. Low immediate risk.</p>
              </div>
            </div>
            <div className="mt-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <p className="text-sm font-semibold text-emerald-800">All licenses current & valid</p>
            </div>
          </section>

          {/* 4. Cybersecurity & Data Privacy */}
          <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="flex items-center gap-2 font-syne font-bold text-navy mb-4">
              <ShieldCheck className="w-5 h-5 text-navy" />
              Cybersecurity & Data Privacy
            </h3>
            <div className="space-y-3">
               <div className="flex justify-between items-center text-sm">
                 <span className="text-slate-600">SSL/TLS Security</span>
                 <span className="font-bold text-emerald-600">A+ Rating</span>
               </div>
               <div className="w-full bg-slate-100 h-1.5 rounded-full">
                 <div className="bg-emerald-500 h-1.5 rounded-full w-[95%]"></div>
               </div>
               <div className="flex justify-between items-center text-sm pt-2">
                 <span className="text-slate-600">Breach Monitoring</span>
                 <span className="font-bold text-emerald-600">No leaks found</span>
               </div>
               <div className="flex justify-between items-center text-sm pt-2">
                 <span className="text-slate-600">Data Residency</span>
                 <span className="font-mono text-xs">Compliant (GDPR/DPDP)</span>
               </div>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="bg-white border-t border-slate-200 p-6">
          <button className="w-full nexus-btn-primary py-3">
            Download Complete Health Report (PDF)
          </button>
        </div>
      </div>
    </>
  );
}
