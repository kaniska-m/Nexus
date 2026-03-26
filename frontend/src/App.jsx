import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShieldAlert, HeartPulse, Plus, Activity } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import BuyerDashboard from './pages/BuyerDashboard';
import SupplierPortal from './pages/SupplierPortal';
import VendorHealthPage from './pages/VendorHealthPage';
import AuditLogsPage from './pages/AuditLogsPage';

function NavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const isSupplier = location.pathname.startsWith('/supplier');

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

  return (
    <>
      <div className="nexus-accent-bar" />
      <nav className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 h-16 sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-12">
            <div className="flex items-center gap-2 cursor-pointer group" onClick={() => navigate('/buyer')}>
              <span className="font-bold text-2xl text-[#0f1f3d] font-syne tracking-tight group-hover:text-blue-700 transition-colors">NEXUS</span>
              <div className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse" />
            </div>
            <div className="hidden md:flex h-16">
              <NavLink to="/buyer" end className={({isActive}) => `flex items-center px-4 border-b-2 gap-2 text-sm font-semibold transition-all ${isActive ? 'border-blue-600 text-blue-600 bg-blue-50/40' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'}`}>
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </NavLink>
              <NavLink to="/buyer/health" className={({isActive}) => `flex items-center px-4 border-b-2 gap-2 text-sm font-semibold transition-all ${isActive ? 'border-blue-600 text-blue-600 bg-blue-50/40' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'}`}>
                <Activity className="w-4 h-4" /> Health
              </NavLink>
              <NavLink to="/buyer/audit" className={({isActive}) => `flex items-center px-4 border-b-2 gap-2 text-sm font-semibold transition-all ${isActive ? 'border-blue-600 text-blue-600 bg-blue-50/40' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'}`}>
                <ShieldAlert className="w-4 h-4" /> Audit Trail
              </NavLink>
            </div>
          </div>
          <button 
            onClick={() => navigate('/buyer?new=true')}
            className="nexus-btn-primary py-2 px-4 text-sm"
          >
            <Plus className="w-4 h-4" /> New Vendor
          </button>
        </div>
      </nav>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50">
        <Toaster 
          position="top-right" 
          toastOptions={{
            className: 'font-dm text-sm',
            style: { borderRadius: '12px', padding: '12px 16px' },
            success: { style: { background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' } },
            error: { style: { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' } },
          }}
        />
        <NavBar />
        <Routes>
          <Route path="/" element={<BuyerDashboard />} />
          <Route path="/buyer/*" element={<BuyerDashboard />} />
          <Route path="/supplier/:vendor_id" element={<SupplierPortal />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
