import { useState, useEffect } from 'react';

export default function TimeSavedCounter({ hours = 0, completedSteps = 0 }) {
  const [displayHours, setDisplayHours] = useState(0);
  const [displayMinutes, setDisplayMinutes] = useState(0);

  useEffect(() => {
    const targetH = Math.floor(hours);
    const targetM = Math.round((hours - targetH) * 60);
    const duration = 2000;
    const steps = 60;
    const interval = duration / steps;

    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplayHours(Math.floor(targetH * eased));
      setDisplayMinutes(Math.floor(targetM * eased));
      if (step >= steps) clearInterval(timer);
    }, interval);

    return () => clearInterval(timer);
  }, [hours]);

  const totalPossibleSteps = 14 * Math.max(1, Math.ceil(completedSteps / 14)); // Just for realistic display if multiple vendors
  const displayedTotalSteps = totalPossibleSteps > 0 ? totalPossibleSteps : 14;

  return (
    <div className="w-full bg-navy rounded-xl p-5 text-white flex items-center justify-between shadow-[0_4px_20px_rgba(15,31,61,0.15)] overflow-hidden relative">
      <div className="absolute top-0 right-1/4 w-64 h-64 bg-accent/10 rounded-full blur-3xl -translate-y-1/2" />
      
      <div className="relative flex items-center gap-6">
        <div className="flex flex-col">
          <p className="text-teal-400 text-sm font-syne font-semibold mb-0.5">Time saved on this verification:</p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-syne font-extrabold animate-count">{displayHours}h</span>
            <span className="text-3xl font-syne font-extrabold animate-count">{displayMinutes}m</span>
            <span className="text-slate-400 text-sm ml-3 font-dm">vs manual process (estimated {(hours * 1.5).toFixed(1)} hours)</span>
          </div>
        </div>
      </div>

      <div className="relative text-right flex flex-col items-end">
        <span className="text-2xl font-syne font-bold text-white">{completedSteps} of {displayedTotalSteps}</span>
        <span className="text-slate-400 text-sm">steps completed autonomously</span>
      </div>
    </div>
  );
}
