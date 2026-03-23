import { ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';

/**
 * RiskScoreCard — Displays vendor risk score with visual severity indicator.
 */
export default function RiskScoreCard({ score, rationale = '' }) {
  const config = {
    Low: {
      icon: ShieldCheck,
      gradient: 'from-emerald-500 to-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
      label: 'Low Risk',
      dot: 'bg-emerald-400',
    },
    Medium: {
      icon: ShieldAlert,
      gradient: 'from-amber-400 to-amber-500',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      label: 'Medium Risk',
      dot: 'bg-amber-400',
    },
    High: {
      icon: ShieldX,
      gradient: 'from-red-500 to-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      label: 'High Risk',
      dot: 'bg-red-400',
    },
  };

  const c = config[score] || config.Low;
  const Icon = c.icon;

  return (
    <div className={`nexus-card overflow-hidden`}>
      <div className={`bg-gradient-to-r ${c.gradient} p-4 text-white`}>
        <div className="flex items-center gap-3">
          <Icon className="w-8 h-8" />
          <div>
            <p className="text-xs uppercase tracking-wider opacity-80 font-mono">Risk Assessment</p>
            <p className="text-xl font-syne font-bold">{c.label}</p>
          </div>
        </div>
      </div>
      {rationale && (
        <div className={`p-4 ${c.bg} border-t ${c.border}`}>
          <p className={`text-sm leading-relaxed ${c.text}`}>{rationale}</p>
        </div>
      )}
    </div>
  );
}
