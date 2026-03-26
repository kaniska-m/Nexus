import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { 
  CheckCircle, Circle, Clock, FileText, Upload, 
  ShieldCheck, AlertTriangle, ChevronRight, Loader2,
  Trash2, Eye, BarChart3
} from 'lucide-react';
import { getVendorStatus, submitDocument } from '../api/nexusApi';
import toast from 'react-hot-toast';

const STEP_CONFIG = [
  { label: 'Checklist Generated', subtitle: 'AI agents defined requirements', key: 'checklist' },
  { label: 'Document Upload', subtitle: 'Submit your compliance documents', key: 'upload' },
  { label: 'AI Verification', subtitle: 'Automated document analysis', key: 'verify' },
  { label: 'Final Review', subtitle: 'Nexus compliance sign-off', key: 'review' },
];

function getStepIndex(vendor) {
  if (!vendor) return 0;
  const checklist = vendor.checklist || [];
  const pending = checklist.filter(c => c.status === 'pending').length;
  const submitted = checklist.filter(c => c.status === 'submitted').length;
  const verified = checklist.filter(c => c.status === 'verified').length;
  const total = checklist.length;

  if (total === 0) return 0;
  if (verified === total) return 3; // All done → Final Review
  if (submitted > 0 || verified > 0) return 2; // Some docs submitted → Verification
  if (pending === total) return 1; // All pending → Upload phase
  return 1;
}

export default function SupplierPortal() {
  const { vendor_id } = useParams();
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await getVendorStatus(vendor_id);
      setVendor(res.data || res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [vendor_id]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  if (!vendor) return (
    <div className="text-center py-20 page-enter">
      <h2 className="text-2xl font-syne font-bold text-[#0f1f3d]">Portal Not Found</h2>
      <p className="text-slate-500 mt-2">Invalid or expired verification link.</p>
    </div>
  );

  const currentStep = getStepIndex(vendor);
  const checklist = vendor.checklist || [];
  const verified = checklist.filter(c => c.status === 'verified').length;
  const total = checklist.length;
  const progressPct = total > 0 ? Math.round((verified / total) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 page-enter">
      {/* Progress Bar */}
      <div className="mb-8 nexus-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-syne font-bold text-[#0f1f3d]">{vendor.vendor_name}</h2>
            <p className="text-xs text-slate-500 mt-0.5">Vendor ID: {vendor_id}</p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-syne font-bold nexus-gradient-text">{progressPct}%</span>
            <p className="text-xs text-slate-400 mt-0.5">Compliance Progress</p>
          </div>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-teal-500 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Left Column: Progress Stepper (30%) */}
        <div className="lg:w-1/3">
          <div className="nexus-card p-6 sticky top-24">
            <h3 className="font-syne font-bold text-[#0f1f3d] mb-6">Verification Progress</h3>
            <div className="space-y-8 relative">
              {/* Stepper Line */}
              <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-100" />
              
              {STEP_CONFIG.map((step, i) => {
                let status = 'pending';
                if (i < currentStep) status = 'complete';
                else if (i === currentStep) status = 'active';
                return <Step key={i} item={step.label} subtitle={step.subtitle} status={status} />;
              })}
            </div>

            <div className="mt-8 p-4 nexus-gradient-subtle rounded-xl border border-blue-100/50">
               <p className="text-sm text-blue-800 font-medium flex items-center gap-2">
                 <Clock className="w-4 h-4" />
                 Time is of the essence
               </p>
               <p className="text-xs text-blue-600 mt-1">Average verification time: 24-48 hours once all documents are submitted.</p>
            </div>
          </div>
        </div>

        {/* Right Column: Document Checklist (70%) */}
        <div className="lg:w-2/3 space-y-6">
          <div className="nexus-card overflow-hidden">
            <div className="p-6 border-b border-slate-100 nexus-gradient-subtle flex justify-between items-center">
               <div>
                 <h2 className="text-xl font-syne font-bold text-[#0f1f3d]">Compliance Checklist</h2>
                 <p className="text-sm text-slate-500">Industry: {vendor.industry}</p>
               </div>
               <span className="nexus-badge bg-blue-100 text-blue-700 border border-blue-200">
                 {verified} of {total} Verified
               </span>
            </div>

            <div className="divide-y divide-slate-100">
              {checklist.map((item, i) => (
                <DocumentRow key={i} item={item} vendorId={vendor_id} onUpdate={fetchStatus} />
              ))}
            </div>
          </div>

          {/* Tips Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="nexus-card p-5 flex gap-4 nexus-card-hover">
               <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center shrink-0">
                 <ShieldCheck className="w-5 h-5 text-teal-600" />
               </div>
               <div>
                 <p className="text-sm font-bold text-[#0f1f3d]">Secure Uploads</p>
                 <p className="text-xs text-slate-500 mt-1">All documents are encrypted and only accessible to authorized auditors.</p>
               </div>
             </div>
             <div className="nexus-card p-5 flex gap-4 nexus-card-hover">
               <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                 <AlertTriangle className="w-5 h-5 text-amber-600" />
               </div>
               <div>
                 <p className="text-sm font-bold text-[#0f1f3d]">AI Pre-check</p>
                 <p className="text-xs text-slate-500 mt-1">Our agents will scan for expiration dates and valid signatures instantly.</p>
               </div>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function Step({ item, subtitle, status }) {
  const icons = {
    complete: <CheckCircle className="w-6 h-6 text-emerald-500 bg-white" />,
    active: <div className="w-6 h-6 rounded-full border-2 border-blue-500 bg-white flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" /></div>,
    pending: <Circle className="w-6 h-6 text-slate-200 bg-white fill-white" />
  };

  return (
    <div className="flex gap-4 items-start relative z-10">
      <div className="mt-0.5">{icons[status]}</div>
      <div>
        <p className={`text-sm font-bold ${status === 'pending' ? 'text-slate-400' : 'text-[#0f1f3d]'}`}>{item}</p>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

function DocumentRow({ item, vendorId, onUpdate }) {
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    setIsUploading(true);
    const file = acceptedFiles[0];
    
    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('document_name', item.document_name);
      
      await submitDocument(vendorId, formData);
      toast.success(`${item.document_name} uploaded successfully!`);
      onUpdate();
    } catch (err) {
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  }, [item.document_name, vendorId, onUpdate]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    multiple: false,
    accept: { 'application/pdf': ['.pdf'], 'image/*': ['.jpeg', '.jpg', '.png'] }
  });

  return (
    <div className={`p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${item.status === 'verified' ? 'bg-emerald-50/30' : ''}`}>
      <div className="flex items-start gap-4 flex-1">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
          item.status === 'verified' ? 'bg-emerald-100 text-emerald-600' : 
          item.status === 'submitted' ? 'bg-blue-100 text-blue-600' : 
          'bg-slate-100 text-slate-400'
        }`}>
          <FileText className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-[#0f1f3d] text-sm">{item.document_name}</h4>
            {item.required && <span className="text-[10px] font-bold text-red-500 uppercase">Required</span>}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{item.category}{item.description ? ` — ${item.description}` : ''}</p>
          {item.status === 'verified' && (
             <div className="flex items-center gap-1.5 mt-2 text-[10px] font-bold text-emerald-600 uppercase">
                <CheckCircle className="w-3 h-3" /> Verified by AI Agents
             </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {item.status === 'pending' || item.status === 'failed' ? (
           <div {...getRootProps()} className={`cursor-pointer group flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed transition-all ${
             isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
           }`}>
             <input {...getInputProps()} />
             {isUploading ? (
               <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
             ) : (
               <Upload className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
             )}
             <span className="text-xs font-bold text-slate-600 group-hover:text-[#0f1f3d]">
               {isUploading ? 'Uploading...' : 'Upload Document'}
             </span>
           </div>
        ) : (
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-[#0f1f3d]" title="View Document">
              <Eye className="w-4 h-4" />
            </button>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
              item.status === 'verified' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {item.status}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
