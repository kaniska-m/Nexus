import { Clock, TrendingUp, Zap, BarChart3 } from 'lucide-react';

export default function TimeSavedCounter({ hours = 0, completedSteps = 0 }) {
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
              <p className="text-3xl font-syne font-bold text-white tabular-nums animate-count">
                {hours.toFixed(0)}<span className="text-lg text-white/70 ml-1 font-dm">hrs</span>
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
              <p className="text-3xl font-syne font-bold text-white tabular-nums animate-count">
                {completedSteps}<span className="text-lg text-white/70 ml-1 font-dm">steps</span>
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
              <p className="text-3xl font-syne font-bold text-white tabular-nums animate-count">
                71<span className="text-lg text-white/70 ml-0.5 font-dm">%</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
