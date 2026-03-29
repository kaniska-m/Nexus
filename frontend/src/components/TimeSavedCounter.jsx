// ============================================================================
// Nexus — TimeSavedCounter (Animated)
// Animates from 0 to final value over 2s using requestAnimationFrame.
// ============================================================================

import { useState, useEffect, useRef } from 'react';
import { Clock, TrendingUp, Zap } from 'lucide-react';

function useAnimatedValue(target, duration = 2000) {
  const [value, setValue] = useState(0);
  const startTimeRef = useRef(null);
  const rafRef = useRef(null);
  const prevTargetRef = useRef(0);

  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    
    const startVal = prevTargetRef.current;
    startTimeRef.current = performance.now();

    const animate = (now) => {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (target - startVal) * eased;
      setValue(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setValue(target);
        prevTargetRef.current = target;
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return value;
}

export default function TimeSavedCounter({ hours = 0, completedSteps = 0 }) {
  const animatedHours = useAnimatedValue(hours, 2000);
  const animatedSteps = useAnimatedValue(completedSteps, 2000);
  const animatedCost = useAnimatedValue(71, 2000);

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
              <div className="flex items-end">
                <p 
                  className="font-syne font-bold text-5xl text-white tabular-nums" 
                  style={{ textShadow: '0 0 20px rgba(13,148,136,0.4)' }}
                >
                  {Math.round(animatedHours)}
                </p>
                <span className="text-xl text-teal-300 ml-1 self-end mb-1 font-dm">hrs</span>
              </div>
              <p className="text-sm text-slate-400 mt-1">vs {hours * 3}hrs manual process</p>
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
                {Math.round(animatedSteps)}<span className="text-lg text-white/70 ml-1 font-dm">steps</span>
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
                {Math.round(animatedCost)}<span className="text-lg text-white/70 ml-0.5 font-dm">%</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
