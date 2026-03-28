'use client';

import { useState, useEffect, useRef } from 'react';
import { Clock, TrendingUp, Zap } from 'lucide-react';

function useAnimatedNumber(target, duration = 2000) {
  const [value, setValue] = useState(0);
  const startTime = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    if (target === 0) { setValue(0); return; }

    const animate = (timestamp) => {
      if (!startTime.current) startTime.current = timestamp;
      const elapsed = timestamp - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    startTime.current = null;
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return value;
}

export default function TimeSavedCounter({ hours = 0, completedSteps = 0 }) {
  const animatedHours = useAnimatedNumber(Math.round(hours), 2000);
  const animatedSteps = useAnimatedNumber(completedSteps, 2000);
  const animatedCost = useAnimatedNumber(71, 2000);

  return (
    <div className="nexus-card overflow-hidden">
      <div className="nexus-gradient-bg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Time Saved */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
              <Clock className="w-6 h-6 text-teal-300" />
            </div>
            <div>
              <p className="text-xs text-white/60 font-medium uppercase tracking-wider">Time Saved</p>
              <p className="text-3xl font-syne font-bold text-white tabular-nums">
                {animatedHours}<span className="text-lg text-white/70 ml-1 font-dm">hrs</span>
              </p>
            </div>
          </div>

          {/* Steps Automated */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
              <Zap className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <p className="text-xs text-white/60 font-medium uppercase tracking-wider">Steps Automated</p>
              <p className="text-3xl font-syne font-bold text-white tabular-nums">
                {animatedSteps}<span className="text-lg text-white/70 ml-1 font-dm">steps</span>
              </p>
            </div>
          </div>

          {/* Cost Reduction */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <p className="text-xs text-white/60 font-medium uppercase tracking-wider">Cost Reduction</p>
              <p className="text-3xl font-syne font-bold text-white tabular-nums">
                {animatedCost}<span className="text-lg text-white/70 ml-0.5 font-dm">%</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
