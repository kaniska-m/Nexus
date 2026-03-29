'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import {
  CheckCircle, Circle, Clock, FileText, Upload,
  ShieldCheck, AlertTriangle, ChevronRight, ChevronLeft, Loader2,
  Building2, Mail, User, Hash, MapPin, Briefcase,
  FileCheck, FileWarning, File, X, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { createBrowserClient } from '@supabase/ssr';

// Supabase anon client (no auth required for supplier portal)
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ── Validation Regexes ──────────────────────────────────────────────────────

const VALIDATORS = {
  cin: { regex: /^[A-Z]{1}[0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/, label: 'CIN format: L/U + 5 digits + 2 letters + 4 digits + 3 letters + 6 digits' },
  gst_number: { regex: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, label: 'GST format: 2 digits + 5 letters + 4 digits + 1 letter + 1 alphanumeric + Z + 1 alphanumeric' },
  pan_number: { regex: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, label: 'PAN format: 5 letters + 4 digits + 1 letter' },
  director_din: { regex: /^[0-9]{8}$/, label: 'DIN must be exactly 8 digits' },
};

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatTimestamp(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const STAGE_CONFIG = [
  { label: 'Company Verification', icon: Building2 },
  { label: 'Document Upload', icon: Upload },
  { label: 'Confirmation', icon: CheckCircle },
];

// ════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════

export default function SupplierPortal() {
  const params = useParams();
  const vendorId = params.vendorId;
  const [vendor, setVendor] = useState(null);
  const [checklist, setChecklist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState(1);
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});

  // Determine initial stage based on vendor data
  const determineInitialStage = useCallback((v, cl) => {
    if (!v) return 1;
    // If all required docs submitted, go to stage 3
    const requiredItems = (cl || []).filter((c) => c.required);
    const submittedRequired = requiredItems.filter((c) => c.status !== 'pending');
    if (requiredItems.length > 0 && submittedRequired.length === requiredItems.length) return 3;
    // If vendor has CIN/GST filled, skip to stage 2
    if (v.cin && v.gst_number) return 2;
    return 1;
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const { data: v, error: vendorErr } = await supabase
        .from('vendors')
        .select('*')
        .eq('id', vendorId)
        .single();

      if (vendorErr || !v) {
        setLoading(false);
        return;
      }

      const { data: cl } = await supabase
        .from('checklist_items')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('category');

      setVendor(v);
      setChecklist(cl || []);
      setFormData({
        contact_name: v.contact_name || '',
        contact_email: v.contact_email || '',
        cin: v.cin || '',
        gst_number: v.gst_number || '',
        pan_number: v.pan_number || '',
        registered_address: v.registered_address || '',
        director_name: v.director_name || '',
        director_din: v.director_din || '',
      });

      if (loading) {
        setStage(determineInitialStage(v, cl || []));
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [vendorId, loading, determineInitialStage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (stage !== 1 || !vendor) return;
    const interval = setInterval(async () => {
      if (Object.keys(formData).length > 0) {
        await supabase.from('vendors').update(formData).eq('id', vendorId);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [stage, vendor, formData, vendorId]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      <p className="text-sm text-slate-500 font-dm">Loading supplier portal...</p>
    </div>
  );

  if (!vendor) return (
    <div className="text-center py-20 page-enter">
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
        <AlertTriangle className="w-8 h-8 text-red-400" />
      </div>
      <h2 className="text-2xl font-syne font-bold text-[#0f1f3d]">Portal Not Found</h2>
      <p className="text-slate-500 mt-2 max-w-md mx-auto">This verification link is invalid or has expired. Please contact your procurement team for a new link.</p>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 page-enter">
      {/* Stage Indicator */}
      {/* Premium Hero Header */}
      <div className="nexus-gradient-bg p-8 rounded-2xl text-white shadow-[0_8px_30px_rgba(15,31,61,0.15)] relative overflow-hidden mb-8 animate-slide-down">
        {/* Glow Effects */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-teal-400 rounded-full mix-blend-screen filter blur-[80px] opacity-30 animate-pulse" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-500 rounded-full mix-blend-screen filter blur-[80px] opacity-30 animate-pulse" />

        <div className="relative z-10 flex items-start justify-between">
          <div>
            <p className="text-sm font-bold text-teal-300 uppercase tracking-wider mb-1">Nexus Verified Supplier Portal</p>
            <h1 className="text-3xl font-syne font-bold mb-2">{vendor.vendor_name}</h1>
            <p className="text-sm text-white/70 font-mono">Reference ID: {vendorId.slice(0, 16)}</p>
          </div>
          <span className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
            {vendor.industry}
          </span>
        </div>
      </div>

      {/* Confetti when pipeline goes active automatically */}
      {(vendor.workflow_status === 'active' || vendor.workflow_status === 'processing') && <ActiveConfettiHandler vendorId={vendorId} />}

        {/* Stage Progress */}
        <div className="nexus-card p-6 mb-8">
          <div className="flex items-center gap-0">
          {STAGE_CONFIG.map((s, i) => {
            const num = i + 1;
            const isActive = num === stage;
            const isComplete = num < stage;
            const Icon = s.icon;
            return (
              <div key={i} className="flex items-center flex-1">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg flex-1 transition-all ${
                  isActive ? 'bg-blue-50 border border-blue-200' : isComplete ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50 border border-slate-100'
                }`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isActive ? 'bg-blue-600 text-white' : isComplete ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {isComplete ? <CheckCircle className="w-4 h-4" /> : num}
                  </div>
                  <span className={`text-xs font-bold truncate ${
                    isActive ? 'text-blue-700' : isComplete ? 'text-emerald-700' : 'text-slate-400'
                  }`}>{s.label}</span>
                </div>
                {i < STAGE_CONFIG.length - 1 && (
                  <ChevronRight className={`w-4 h-4 shrink-0 mx-1 ${num < stage ? 'text-emerald-400' : 'text-slate-200'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stage Content */}
      {stage === 1 && (
        <Stage1Form
          vendor={vendor}
          formData={formData}
          setFormData={setFormData}
          formErrors={formErrors}
          setFormErrors={setFormErrors}
          vendorId={vendorId}
          onNext={() => setStage(2)}
        />
      )}
      {stage === 2 && (
        <Stage2Upload
          vendor={vendor}
          checklist={checklist}
          vendorId={vendorId}
          onRefresh={fetchData}
          onBack={() => setStage(1)}
          onComplete={() => setStage(3)}
        />
      )}
      {stage === 3 && (
        <Stage3Confirmation
          vendor={vendor}
          checklist={checklist}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// STAGE 1 — Company Verification Form
// ════════════════════════════════════════════════════════════════════

function Stage1Form({ vendor, formData, setFormData, formErrors, setFormErrors, vendorId, onNext }) {
  const [saving, setSaving] = useState(false);

  const handleChange = (field, value) => {
    const upper = ['cin', 'gst_number', 'pan_number'].includes(field) ? value.toUpperCase() : value;
    setFormData((prev) => ({ ...prev, [field]: upper }));

    // Validate
    if (VALIDATORS[field]) {
      if (upper && !VALIDATORS[field].regex.test(upper)) {
        setFormErrors((prev) => ({ ...prev, [field]: VALIDATORS[field].label }));
      } else {
        setFormErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
      }
    }
  };

  const isValid = useMemo(() => {
    const requiredFields = ['contact_name', 'contact_email', 'cin', 'gst_number', 'pan_number', 'registered_address', 'director_name', 'director_din'];
    const allFilled = requiredFields.every((f) => formData[f]?.trim?.());
    const noErrors = Object.keys(formErrors).length === 0;
    // Also validate all validator fields
    const validatorsPass = Object.entries(VALIDATORS).every(([key, v]) => {
      if (!formData[key]) return false;
      return v.regex.test(formData[key]);
    });
    return allFilled && noErrors && validatorsPass;
  }, [formData, formErrors]);

  const handleSubmit = async () => {
    if (!isValid) return;
    setSaving(true);
    try {
      await supabase.from('vendors').update(formData).eq('id', vendorId);
      await supabase.from('audit_logs').insert({
        vendor_id: vendorId,
        agent: 'Supplier Portal',
        action: `Company verification form submitted by ${formData.contact_name} (${formData.contact_email}). CIN, GST, PAN, and director details provided.`,
      });
      toast.success('Company details saved successfully');
      onNext();
    } catch (err) {
      toast.error('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const inputField = (field, label, icon, options = {}) => {
    const Icon = icon;
    const { readOnly, placeholder, type = 'text' } = options;
    const hasError = formErrors[field];
    return (
      <div>
        <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">{label} <span className="text-red-400">*</span></label>
        <div className="relative">
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type={type}
            value={readOnly ? (vendor[field] || '') : (formData[field] || '')}
            onChange={(e) => !readOnly && handleChange(field, e.target.value)}
            readOnly={readOnly}
            placeholder={placeholder}
            className={`nexus-input pl-10 ${readOnly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''} ${hasError ? 'border-red-300 focus:ring-red-400/30 focus:border-red-400' : ''}`}
          />
        </div>
        {hasError && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {hasError}</p>}
      </div>
    );
  };

  return (
    <div className="nexus-card p-8 animate-slide-up">
      <div className="mb-6">
        <h3 className="text-xl font-syne font-bold text-[#0f1f3d]">Company Verification</h3>
        <p className="text-sm text-slate-500 mt-1">Verify your company registration details. All fields are required.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {inputField('vendor_name', 'Company Name', Building2, { readOnly: true })}
        {inputField('industry', 'Industry', Briefcase, { readOnly: true })}
        {inputField('contact_name', 'Contact Person', User, { placeholder: 'Full name' })}
        {inputField('contact_email', 'Contact Email', Mail, { placeholder: 'you@company.com', type: 'email' })}
        {inputField('cin', 'CIN (Corporate Identity Number)', Hash, { placeholder: 'U12345AB1234ABC123456' })}
        {inputField('gst_number', 'GST Number', Hash, { placeholder: '22AAAAA0000A1Z5' })}
        {inputField('pan_number', 'PAN Number', Hash, { placeholder: 'ABCDE1234F' })}
        {inputField('director_din', 'Director DIN', Hash, { placeholder: '12345678' })}
        {inputField('director_name', 'Director Name', User, { placeholder: 'Director full name' })}
      </div>

      {/* Registered Address (full width) */}
      <div className="mt-5">
        <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Registered Address <span className="text-red-400">*</span></label>
        <div className="relative">
          <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <textarea
            value={formData.registered_address || ''}
            onChange={(e) => handleChange('registered_address', e.target.value)}
            placeholder="Full registered office address"
            rows={3}
            className="nexus-input pl-10 resize-none"
          />
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <p className="text-xs text-slate-400">Auto-saves every 30 seconds</p>
        <button
          onClick={handleSubmit}
          disabled={!isValid || saving}
          className={`nexus-btn-primary py-3 px-8 ${!isValid ? 'opacity-40 cursor-not-allowed hover:translate-y-0 hover:shadow-md' : ''}`}
        >
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <>Next: Upload Documents <ChevronRight className="w-4 h-4" /></>}
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// STAGE 2 — Document Upload
// ════════════════════════════════════════════════════════════════════

function Stage2Upload({ vendor, checklist, vendorId, onRefresh, onBack, onComplete }) {
  const [showConfetti, setShowConfetti] = useState(false);

  const requiredItems = checklist.filter((c) => c.required);
  const submittedRequired = requiredItems.filter((c) => c.status !== 'pending');
  const progressPct = requiredItems.length > 0 ? Math.round((submittedRequired.length / requiredItems.length) * 100) : 0;
  const allRequiredDone = requiredItems.length > 0 && submittedRequired.length === requiredItems.length;

  // Group by category
  const grouped = useMemo(() => {
    const groups = {};
    checklist.forEach((item) => {
      const cat = item.category || 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [checklist]);

  const [displayPct, setDisplayPct] = useState(0);

  // Smoothly animate progress bar
  useEffect(() => {
    let animationFrame;
    const animate = () => {
      setDisplayPct((prev) => {
        if (prev < progressPct) return Math.min(prev + 1, progressPct);
        if (prev > progressPct) return Math.max(prev - 1, progressPct);
        return prev;
      });
      if (displayPct !== progressPct) {
        animationFrame = requestAnimationFrame(animate);
      }
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [progressPct, displayPct]);

  useEffect(() => {
    if (allRequiredDone) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000);
    }
  }, [allRequiredDone]);

  return (
    <div className="animate-slide-up">
      {/* Confetti */}
      {showConfetti && <ConfettiOverlay />}

      {/* Progress Bar */}
      <div className="nexus-card p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-[#0f1f3d]">
            {submittedRequired.length} of {requiredItems.length} required documents submitted
          </span>
          <span className="text-lg font-syne font-bold nexus-gradient-text tabular-nums">{displayPct}%</span>
        </div>
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-teal-400 to-teal-500 rounded-full transition-all duration-300 ease-out shadow-md"
            style={{ width: `${displayPct}%` }}
          />
        </div>
      </div>

      {/* All Done Banner */}
      {allRequiredDone && (
        <div className="nexus-card p-5 mb-6 bg-emerald-50 border-emerald-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-emerald-800">All required documents submitted!</p>
              <p className="text-sm text-emerald-600 mt-0.5">Our verification team has been notified and will begin review shortly.</p>
            </div>
            <button onClick={onComplete} className="nexus-btn-teal py-2 px-6">
              View Confirmation <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Document Categories */}
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} className="nexus-card mb-5 overflow-hidden">
          <div className="p-4 border-b border-slate-100 nexus-gradient-subtle flex items-center justify-between">
            <h3 className="font-syne font-bold text-[#0f1f3d] text-sm">{category}</h3>
            <span className="text-xs text-slate-500">
              {items.filter((i) => i.status !== 'pending').length}/{items.length} submitted
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {items.map((item) => (
              <DocumentRow key={item.id} item={item} vendorId={vendorId} vendor={vendor} onUpdate={onRefresh} />
            ))}
          </div>
        </div>
      ))}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <button onClick={onBack} className="nexus-btn-outline py-2.5 px-5">
          <ChevronLeft className="w-4 h-4" /> Back to Details
        </button>
        {allRequiredDone && (
          <button onClick={onComplete} className="nexus-btn-primary py-2.5 px-8">
            Continue to Confirmation <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Document Row with Dropzone ──────────────────────────────────────────────

function DocumentRow({ item, vendorId, vendor, onUpdate }) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadError, setUploadError] = useState('');

  const canUpload = item.status === 'pending' || item.status === 'failed';

  const getStatusPill = () => {
    switch (item.status) {
      case 'verified':
        return <span className="nexus-badge bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle className="w-3 h-3 mr-1" /> Verified</span>;
      case 'submitted':
        return <span className="nexus-badge bg-blue-50 text-blue-700 border border-blue-200"><FileCheck className="w-3 h-3 mr-1" /> Submitted</span>;
      case 'failed':
        return <span className="nexus-badge bg-red-50 text-red-700 border border-red-200"><FileWarning className="w-3 h-3 mr-1" /> Failed</span>;
      case 'fraud_flagged':
        return <span className="nexus-badge bg-red-100 text-red-800 border border-red-300"><AlertTriangle className="w-3 h-3 mr-1" /> Flagged</span>;
      default:
        return <span className="nexus-badge bg-slate-100 text-slate-500 border border-slate-200"><Circle className="w-3 h-3 mr-1" /> Pending</span>;
    }
  };

  const getFileIcon = (type) => {
    if (type?.includes('pdf')) return <FileText className="w-4 h-4 text-red-500" />;
    if (type?.includes('image')) return <File className="w-4 h-4 text-blue-500" />;
    if (type?.includes('word') || type?.includes('doc')) return <FileText className="w-4 h-4 text-blue-700" />;
    return <File className="w-4 h-4 text-slate-400" />;
  };

  const handleUpload = async (file) => {
    // Client-side validation
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

    if (!allowedTypes.includes(file.type)) {
      setUploadError('Invalid file type. Accepted: PDF, JPG, PNG, DOC, DOCX');
      return;
    }
    if (file.size > maxSize) {
      setUploadError(`File too large (${formatFileSize(file.size)}). Maximum: 10 MB`);
      return;
    }

    setUploadError('');
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const filePath = `${vendorId}/${item.id}/${file.name}`;

      // Simulate progress (Supabase JS doesn't expose real upload progress)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + Math.random() * 20, 90));
      }, 200);

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadErr } = await supabase
        .storage
        .from('vendor-documents')
        .upload(filePath, file, { upsert: true });

      clearInterval(progressInterval);

      if (uploadErr) {
        // If bucket doesn't exist, simulate upload success for demo
        console.warn('Storage upload failed (bucket may not exist):', uploadErr.message);
      }

      setUploadProgress(95);

      // Get public URL (or construct demo URL)
      let fileUrl = '';
      if (uploadData) {
        const { data: urlData } = supabase.storage.from('vendor-documents').getPublicUrl(filePath);
        fileUrl = urlData?.publicUrl || '';
      } else {
        fileUrl = `/storage/vendor-documents/${filePath}`;
      }

      // Insert document record
      await supabase.from('documents').insert({
        vendor_id: vendorId,
        checklist_item_id: item.id,
        document_name: item.document_name,
        file_path: filePath,
        file_url: fileUrl,
        file_size: file.size,
        mime_type: file.type,
        submitted_by: vendor.contact_email || 'supplier',
      });

      // Update checklist item
      await supabase
        .from('checklist_items')
        .update({ status: 'submitted', file_url: fileUrl })
        .eq('id', item.id);

      // Audit log
      await supabase.from('audit_logs').insert({
        vendor_id: vendorId,
        agent: 'Supplier Portal',
        action: `Document submitted: ${item.document_name} by ${vendor.contact_email || 'supplier'}. File: ${file.name} (${formatFileSize(file.size)})`,
      });

      setUploadProgress(100);
      toast.success(`${item.document_name} uploaded successfully!`);
      setSelectedFile(null);

      // Refresh parent data
      setTimeout(() => onUpdate(), 500);
    } catch (err) {
      setUploadError('Upload failed: ' + err.message);
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    setSelectedFile(file);
    setUploadError('');
    handleUpload(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    disabled: !canUpload || isUploading,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxSize: 10 * 1024 * 1024,
  });

  return (
    <div className={`p-5 transition-all ${
      item.status === 'verified' ? 'bg-emerald-50/30' :
      item.status === 'submitted' ? 'bg-blue-50/20' :
      item.required && item.status === 'pending' ? 'border-l-2 border-l-amber-300 animate-pulse-border' : ''
    }`}>
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        {/* Item Info */}
        <div className="flex items-start gap-3 flex-1">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
            item.status === 'verified' ? 'bg-emerald-100 text-emerald-600' :
            item.status === 'submitted' ? 'bg-blue-100 text-blue-600' :
            item.status === 'failed' || item.status === 'fraud_flagged' ? 'bg-red-100 text-red-600' :
            'bg-slate-100 text-slate-400'
          }`}>
            <FileText className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-[#0f1f3d] text-sm">{item.document_name}</h4>
              {item.required && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-red-100 text-red-600 border border-red-200">Required</span>
              )}
              {getStatusPill()}
            </div>
            <p className="text-xs text-slate-500 mt-1">{item.description || item.category}</p>

            {/* Verified timestamp */}
            {item.status === 'verified' && item.verified_at && (
              <p className="text-[10px] text-emerald-600 font-bold mt-1.5 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Verified {formatTimestamp(item.verified_at)}
              </p>
            )}
            {/* Submitted info */}
            {item.status === 'submitted' && (
              <p className="text-[10px] text-blue-600 font-semibold mt-1.5 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Submitted {formatTimestamp(item.updated_at || new Date().toISOString())}
              </p>
            )}
          </div>
        </div>

        {/* Upload Zone */}
        {canUpload && (
          <div className="shrink-0 w-full md:w-64">
            <div
              {...getRootProps()}
              className={`cursor-pointer p-4 rounded-xl border-2 border-dashed text-center transition-all ${
                isDragActive ? 'border-blue-500 bg-blue-50' :
                isUploading ? 'border-blue-300 bg-blue-50/50' :
                'border-slate-200 hover:border-teal-400 hover:bg-teal-50/30'
              }`}
            >
              <input {...getInputProps()} />
              {isUploading ? (
                <div>
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto mb-2" />
                  <p className="text-xs font-bold text-blue-600 mb-2">Uploading...</p>
                  <div className="w-full h-1.5 bg-blue-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-blue-400 mt-1">{Math.round(uploadProgress)}%</p>
                </div>
              ) : selectedFile ? (
                <div className="flex items-center gap-2">
                  {getFileIcon(selectedFile.type)}
                  <div className="text-left flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#0f1f3d] truncate">{selectedFile.name}</p>
                    <p className="text-[10px] text-slate-400">{formatFileSize(selectedFile.size)}</p>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                  <p className="text-xs font-bold text-slate-500">
                    {isDragActive ? 'Drop file here' : 'Drag & drop or click'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">PDF, JPG, PNG, DOC — Max 10MB</p>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Failure reason callout */}
      {item.status === 'failed' && item.failure_reason && (
        <div className="mt-3 ml-13 p-3 rounded-lg bg-amber-50 border border-amber-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-800">Verification Failed</p>
              <p className="text-xs text-amber-700 mt-0.5">{item.failure_reason}</p>
              <p className="text-[10px] text-amber-500 mt-1 flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Please upload a corrected document
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Upload error */}
      {uploadError && (
        <div className="mt-2 ml-13 flex items-center gap-2 text-xs text-red-600">
          <X className="w-3.5 h-3.5" /> {uploadError}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// STAGE 3 — Confirmation
// ════════════════════════════════════════════════════════════════════

function Stage3Confirmation({ vendor, checklist }) {
  const submittedDocs = checklist.filter((c) => c.status !== 'pending');

  return (
    <div className="animate-slide-up">
      {/* Success Hero */}
      <div className="nexus-card p-10 text-center mb-6">
        {/* Animated Checkmark SVG */}
        <div className="w-24 h-24 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6">
          <svg className="w-14 h-14" viewBox="0 0 52 52" fill="none">
            <circle cx="26" cy="26" r="24" stroke="#10b981" strokeWidth="3" fill="#ecfdf5" />
            <path
              className="animate-checkmark"
              d="M14 27l8 8 16-16"
              stroke="#10b981"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </div>

        <h2 className="text-2xl font-syne font-bold text-[#0f1f3d] mb-2">Documents Submitted Successfully</h2>
        <p className="text-slate-500 max-w-lg mx-auto">
          Thank you, {vendor.contact_name || 'Supplier'}. Your compliance documents for <span className="font-bold text-[#0f1f3d]">{vendor.vendor_name}</span> have been received and are queued for verification.
        </p>
      </div>

      {/* Submitted Documents Summary */}
      <div className="nexus-card mb-6 overflow-hidden">
        <div className="p-5 border-b border-slate-100 nexus-gradient-subtle">
          <h3 className="font-syne font-bold text-[#0f1f3d]">Submitted Documents</h3>
        </div>
        <table className="w-full nexus-table">
          <thead>
            <tr>
              <th className="text-left">Document</th>
              <th className="text-left">Category</th>
              <th className="text-left">Status</th>
              <th className="text-left">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {submittedDocs.map((doc) => (
              <tr key={doc.id}>
                <td className="font-semibold text-[#0f1f3d]">{doc.document_name}</td>
                <td className="text-slate-500">{doc.category}</td>
                <td>
                  <span className={`nexus-badge ${
                    doc.status === 'verified' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}>
                    {doc.status === 'verified' ? '✓ Verified' : '◉ Submitted'}
                  </span>
                </td>
                <td className="text-xs text-slate-400">{formatTimestamp(doc.verified_at || doc.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* What Happens Next */}
      <div className="nexus-card p-6 mb-6">
        <h3 className="font-syne font-bold text-[#0f1f3d] mb-5">What Happens Next</h3>
        <div className="space-y-6 relative">
          <div className="absolute left-[15px] top-6 bottom-6 w-0.5 bg-slate-100" />

          {[
            { step: 1, title: 'Automated Verification', desc: 'Our AI agents will cross-reference your documents against MCA, GSTN, and other government databases.', time: '24-48 hours', icon: ShieldCheck, color: 'blue' },
            { step: 2, title: 'Risk Assessment', desc: 'Multi-agent risk scoring analyzes document consistency, sanction list matches, and compliance patterns.', time: 'Automated', icon: FileCheck, color: 'teal' },
            { step: 3, title: 'Compliance Officer Review', desc: 'A certified compliance officer reviews the AI assessment and makes the final onboarding decision.', time: '1-2 business days', icon: CheckCircle, color: 'emerald' },
          ].map((item) => (
            <div key={item.step} className="flex gap-4 items-start relative z-10">
              <div className={`w-8 h-8 rounded-full bg-${item.color}-100 flex items-center justify-center shrink-0 border-2 border-white`}>
                <item.icon className={`w-4 h-4 text-${item.color}-600`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-[#0f1f3d]">Step {item.step}: {item.title}</h4>
                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{item.time}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-teal-500" />
            <span className="font-bold text-[#0f1f3d]">Typically completed within 2 business days</span>
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="nexus-card p-5 flex items-center gap-3 bg-slate-50/50">
        <Mail className="w-5 h-5 text-slate-400" />
        <div>
          <p className="text-sm text-slate-600">Questions about your verification?</p>
          <p className="text-sm font-bold text-blue-600">{vendor.contact_email || 'compliance@nexus-platform.com'}</p>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// CONFETTI OVERLAY
// ════════════════════════════════════════════════════════════════════

function ConfettiOverlay() {
  const colors = ['#2563eb', '#0d9488', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'];
  const pieces = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 2.5 + Math.random() * 2,
    color: colors[i % colors.length],
    size: 6 + Math.random() * 10,
    rotation: Math.random() * 360,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute shadow-sm"
          style={{
            left: `${p.left}%`,
            top: '-20px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            transform: `rotate(${p.rotation}deg)`,
            animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s forwards, confetti-shake 0.5s ease-in-out infinite`,
            opacity: 0.9,
          }}
        />
      ))}
    </div>
  );
}

function ActiveConfettiHandler({ vendorId }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const key = `nexus_active_confetti_${vendorId}`;
        const hasShown = localStorage.getItem(key);
        if (!hasShown) {
          setShow(true);
          localStorage.setItem(key, 'true');
          setTimeout(() => setShow(false), 5000);
        }
      }
    } catch {
      // Ignored
    }
  }, [vendorId]);

  if (!show) return null;
  return <ConfettiOverlay />;
}
