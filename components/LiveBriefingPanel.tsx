
import React from 'react';
import { PresentationData } from '../types';
import { PresentationIcon } from './Icons';

interface LiveBriefingPanelProps {
  data: PresentationData | null;
  isLoading: boolean;
}

const LiveBriefingPanel: React.FC<LiveBriefingPanelProps> = ({ data, isLoading }) => {
  if (!data && !isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12 text-center border-l border-white/5 bg-slate-950/60 backdrop-blur-xl">
        <div className="w-24 h-24 bg-indigo-500/10 rounded-full flex items-center justify-center mb-8">
          <PresentationIcon className="w-12 h-12 text-indigo-400 opacity-30" />
        </div>
        <h3 className="text-xs font-black uppercase tracking-[0.4em] text-slate-500">Live Presentation</h3>
        <p className="text-sm font-medium text-slate-600 mt-6 leading-relaxed max-w-[280px]">
          Fangen Sie an zu sprechen, um Ihre proaktive Strategie-Folie in Echtzeit zu generieren.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col border-l border-white/5 bg-slate-950/60 backdrop-blur-3xl overflow-hidden relative selection:bg-indigo-500/40">
      {/* Dynamic Background */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-800/5 blur-[100px] rounded-full pointer-events-none"></div>
      
      <header className="p-10 border-b border-white/10 bg-slate-950/40 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
             <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_15px_rgba(99,102,241,1)]"></div>
             <span className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-400">Live Folie Alpha</span>
          </div>
          {isLoading && (
            <div className="flex gap-2 px-4 py-1.5 bg-indigo-500/10 rounded-full border border-indigo-500/20">
              <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
            </div>
          )}
        </div>
        <h2 className="text-4xl font-black text-white tracking-tighter leading-tight mb-3">
          {data?.title || 'Generiere Briefing...'}
        </h2>
        <p className="text-base text-slate-400 font-medium tracking-wide opacity-80">
          {data?.subtitle || 'Synchronisiere Datenstrom...'}
        </p>
      </header>

      <div className="flex-1 overflow-y-auto p-10 space-y-16 custom-scrollbar pb-32">
        {data?.slides.map((slide, sIdx) => (
          <section 
            key={sIdx} 
            className="animate-in fade-in slide-in-from-right-12 duration-700 relative group" 
            style={{ animationDelay: `${sIdx * 200}ms` }}
          >
            <div className="flex items-center gap-6 mb-8">
               <div className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.3em] border shadow-sm ${
                 slide.type === 'tasks' ? 'bg-red-500/10 text-red-400 border-red-500/20 shadow-red-500/10' :
                 slide.type === 'ideas' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/10' :
                 slide.type === 'problems' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-amber-500/10' :
                 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow-indigo-500/10'
               }`}>
                 {slide.type}
               </div>
               <div className="flex-1 h-px bg-white/10"></div>
            </div>

            <h3 className="text-2xl font-black text-slate-100 mb-8 tracking-tight">
              {slide.title}
            </h3>

            <div className="space-y-6">
              {slide.points.map((point, pIdx) => {
                const isSubHeader = point.match(/^(JETZT|ZUKUNFT|IDEE|PROBLEM|ACTION):/i) || (point.includes(':') && point.length < 35);
                
                return (
                  <div key={pIdx} className={`flex items-start gap-6 group/point ${isSubHeader ? 'mt-10' : ''}`}>
                    {!isSubHeader && (
                      <div className="mt-2.5 w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0 group-hover/point:scale-150 transition-all shadow-[0_0_12px_rgba(99,102,241,0.6)]"></div>
                    )}
                    <p className={`leading-relaxed transition-all ${
                      isSubHeader 
                        ? 'text-[11px] font-black uppercase tracking-[0.4em] text-indigo-500 border-l-3 border-indigo-500/40 pl-5 py-1.5' 
                        : 'text-lg text-slate-300 font-medium group-hover/point:text-white group-hover/point:translate-x-1'
                    }`}>
                      {point}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <footer className="p-10 border-t border-white/10 bg-slate-950/90 backdrop-blur-xl absolute bottom-0 left-0 w-full z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">
              LIVE WORLD STATE
            </span>
          </div>
          <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
            AI-SECRETARY v3.0
          </span>
        </div>
      </footer>
    </div>
  );
};

export default LiveBriefingPanel;
