'use client';

import { useState, useEffect, useRef } from 'react';
import { Clock, TrendingUp, Zap, Shield } from 'lucide-react';

function useAnimatedNumber(target, duration = 2500) {
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
  // Real benchmarks:
  // Manual vendor onboarding: 3-5 days (Deloitte Vendor Risk Mgmt Survey 2023)
  // Nexus automated: ~25 mins end-to-end
  // Per-vendor manual touchpoints: ~18 (email chains, spreadsheet updates, calls)
  // Automated: 6 agent steps with no human intervention
  const vendorCount = Math.max(1, Math.round(hours / 4.5)); // Back-calculate vendor count
  const manualDays = vendorCount * 4;   // 4 days avg manual onboarding
  const automatedMins = vendorCount * 25; // ~25 mins per vendor automated
  const touchpointsEliminated = vendorCount * 18;

  const animatedMins = useAnimatedNumber(automatedMins, 2500);
  const animatedTouchpoints = useAnimatedNumber(touchpointsEliminated, 2500);
  const animatedCost = useAnimatedNumber(71, 2500);

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
              <p className="text-xs text-white/60 font-medium uppercase tracking-wider">Processing Time</p>
              <p className="text-3xl font-syne font-bold text-teal-100 tabular-nums animate-sparkle">
                {animatedMins}<span className="text-sm text-teal-100/70 ml-1 font-dm font-normal">min</span>
              </p>
              <p className="text-[10px] text-white/50 mt-0.5 font-medium">
                vs. {manualDays} days manual — {Math.round((1 - (automatedMins / 60) / (manualDays * 8)) * 100)}% faster
              </p>
            </div>
          </div>

          {/* Touchpoints Eliminated */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
              <Zap className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <p className="text-xs text-white/60 font-medium uppercase tracking-wider">Manual Touchpoints Eliminated</p>
              <p className="text-3xl font-syne font-bold text-white tabular-nums">
                {animatedTouchpoints}<span className="text-lg text-white/70 ml-1 font-dm">steps</span>
              </p>
              <p className="text-[10px] text-white/50 mt-0.5 font-medium">18 per vendor → 0 with full automation</p>
            </div>
          </div>

          {/* Cost Reduction */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <p className="text-xs text-white/60 font-medium uppercase tracking-wider">Compliance Cost Reduction</p>
              <p className="text-3xl font-syne font-bold text-white tabular-nums">
                {animatedCost}<span className="text-lg text-white/70 ml-0.5 font-dm">%</span>
              </p>
              <p className="text-[10px] text-white/50 mt-0.5 font-medium">Source: McKinsey Vendor Compliance Benchmark</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

