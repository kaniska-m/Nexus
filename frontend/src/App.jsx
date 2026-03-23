import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShieldAlert, HeartPulse, Plus } from 'lucide-react';
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
      <nav className="bg-white border-b border-slate-200 h-16 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xl text-[#0f1f3d]">NEXUS</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4 font-syne">Supplier Portal</span>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-white border-b border-slate-200 h-16 sticky top-0 z-50 shadow-sm">
      <div className="max-w-[1400px] mx-auto px-6 h-full flex items-center justify-between">
        <div className="flex items-center gap-12">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/buyer')}>
            <span className="font-bold text-2xl text-[#0f1f3d] font-syne">NEXUS</span>
            <div className="w-2 h-2 rounded-full bg-teal-500" />
          </div>
          <div className="hidden md:flex h-16 mr-8">
            <NavLink to="/buyer" end className={({isActive}) => `flex items-center px-4 border-b-2 gap-2 text-sm font-medium ${isActive ? 'border-blue-600 text-blue-600 bg-blue-50/30' : 'border-transparent text-slate-500 hover:text-navy'}`}>
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </NavLink>
            <NavLink to="/buyer/health" className={({isActive}) => `flex items-center px-4 border-b-2 gap-2 text-sm font-medium ${isActive ? 'border-blue-600 text-blue-600 bg-blue-50/30' : 'border-transparent text-slate-500 hover:text-navy'}`}>
              <ShieldAlert className="w-4 h-4" /> Health
            </NavLink>
            <NavLink to="/buyer/audit" className={({isActive}) => `flex items-center px-4 border-b-2 gap-2 text-sm font-medium ${isActive ? 'border-blue-600 text-blue-600 bg-blue-50/30' : 'border-transparent text-slate-500 hover:text-navy'}`}>
              <HeartPulse className="w-4 h-4" /> Audit
            </NavLink>
          </div>
        </div>
        <button 
          onClick={() => navigate('/buyer?new=true')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Vendor
        </button>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50">
        <Toaster position="top-right" />
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
