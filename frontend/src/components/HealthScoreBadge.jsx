export default function HealthScoreBadge({ score = 0, size = 'md' }) {
  const validScore = Number(score) || 0;
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (validScore / 100) * circumference;

  const getColor = (s) => {
    if (s < 50) return '#dc2626'; // Red
    if (s < 80) return '#d97706'; // Amber
    return '#0d9488'; // Teal
  };

  const getBg = (s) => {
    if (s < 50) return 'bg-red-50';
    if (s < 80) return 'bg-amber-50';
    return 'bg-teal-50';
  };

  const color = getColor(score);
  const sizePx = size === 'lg' ? 48 : 40;

  return (
    <div className={`relative flex items-center justify-center rounded-full ${getBg(score)}`} style={{ width: sizePx, height: sizePx }}>
      <svg className="transform -rotate-90" width={sizePx} height={sizePx}>
        <circle
          cx={sizePx / 2}
          cy={sizePx / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="3"
          fill="transparent"
          className="text-slate-200"
        />
        <circle
          cx={sizePx / 2}
          cy={sizePx / 2}
          r={radius}
          stroke={color}
          strokeWidth="3"
          fill="transparent"
          strokeDasharray={circumference}
          style={{ strokeDashoffset: offset }}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <span className="absolute text-[10px] font-bold font-mono" style={{ color }}>
        {score}
      </span>
    </div>
  );
}
