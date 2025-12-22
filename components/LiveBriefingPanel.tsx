
import React from 'react';
import { PresentationData, SlideItem, Priority } from '../types';
import { CheckIcon, SparklesIcon, PencilIcon } from './Icons';

interface LiveBriefingPanelProps {
  data: PresentationData | null;
  isLoading: boolean;
  completedPoints: Set<string>;
  onTogglePoint: (id: string) => void;
}

const LiveBriefingPanel: React.FC<LiveBriefingPanelProps> = ({ data, completedPoints, onTogglePoint, isLoading }) => {
  // Debug Logging für Props-Validierung
  console.log('🔍 [LiveBriefingPanel] Props:', {
    hasData: !!data,
    hasSlides: !!(data?.slides),
    slidesLength: data?.slides?.length || 0,
    isLoading
  });
  
  // Frühzeitiger Return bei fehlenden Daten
  if (!data || !data.slides || data.slides.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-indigo-500/20 rounded-full flex items-center justify-center">
            <SparklesIcon className="w-8 h-8 text-indigo-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Keine Daten verfügbar</h3>
          <p className="text-slate-400">
            {!data ? 'Keine Präsentationsdaten vorhanden' : 
             !data.slides ? 'Keine Folien gefunden' : 
             'Keine Inhalte verfügbar'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-6 sm:p-10 lg:p-20 pb-60 animate-in fade-in duration-1000">
      <header className="mb-20 sm:mb-32 relative">
        <div className="flex items-center gap-4 mb-6 sm:mb-8 text-indigo-500 font-bold">
          <div className="w-6 sm:w-10 h-[2px] bg-indigo-500/30" />
          <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.4em] sm:tracking-[0.6em]">Visual Intelligence Board</span>
        </div>
        <h1 className="text-4xl sm:text-6xl md:text-8xl lg:text-9xl font-black text-white tracking-tighter mb-6 sm:mb-8 leading-[0.9] animate-in slide-in-from-left-12 duration-1000">
          {data.title}
        </h1>
        <p className="text-lg sm:text-2xl lg:text-4xl text-slate-500 font-medium tracking-tight max-w-4xl border-l-2 sm:border-l-4 border-white/5 pl-6 sm:pl-10 leading-relaxed italic">
          {data.subtitle}
        </p>
      </header>

      <div className="space-y-24 sm:space-y-48">
        {data.slides.map((slide, sIdx) => (
          <section key={sIdx} className="relative group animate-in slide-in-from-bottom-12 duration-1000">
            <div className="flex items-center gap-4 sm:gap-6 mb-10 sm:mb-16">
               <div className="px-4 sm:px-6 py-1.5 sm:py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-indigo-400">
                 {slide.type || 'Insight'}
               </div>
               <div className="h-[1px] bg-gradient-to-r from-white/10 via-white/5 to-transparent flex-1" />
            </div>

            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white mb-12 sm:mb-20 tracking-tight leading-none">
              {slide.title}
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 sm:gap-20">
              <div className="lg:col-span-8 space-y-12 sm:space-y-16">
                {(slide.items || []).map((item, iIdx) => {
                  const id = `${sIdx}-${iIdx}`;
                  const isDone = completedPoints.has(id);
                  return (
                    <div 
                      key={id} 
                      onClick={() => onTogglePoint(id)}
                      className={`group/item flex gap-6 sm:gap-10 cursor-pointer transition-all duration-700 ${isDone ? 'opacity-20 grayscale scale-[0.97]' : 'hover:translate-x-2 sm:hover:translate-x-4'}`}
                    >
                      <div className={`mt-1.5 sm:mt-3 w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl border flex items-center justify-center shrink-0 transition-all duration-1000 ${
                        isDone 
                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                        : 'bg-white/5 border-white/10 group-hover/item:border-indigo-500 group-hover/item:bg-indigo-500/10'
                      }`}>
                        {isDone ? <CheckIcon className="w-5 h-5 sm:w-6 sm:h-6" /> : <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/50" />}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className={`text-xl sm:text-3xl lg:text-4xl font-bold leading-tight mb-4 sm:mb-6 transition-colors duration-500 ${isDone ? 'line-through text-slate-700' : 'text-slate-100 group-hover/item:text-white'}`}>
                          {item.text}
                        </p>
                        
                        {item.imageUrl && (
                          <div className="mt-6 sm:mt-10 rounded-3xl sm:rounded-[48px] overflow-hidden border border-white/10 aspect-video bg-white/5 relative group/img shadow-2xl shadow-black/60">
                             <img src={item.imageUrl} className="w-full h-full object-cover transition-transform duration-[4s] group-hover/img:scale-110" alt={`Visualisiertes Konzept für ${item.text || 'Präsentationsinhalt'}`} loading="lazy" />
                             <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity flex items-end p-6 sm:p-10">
                                <div className="flex items-center gap-3 sm:gap-4">
                                   <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                                   <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-[0.3em] sm:tracking-[0.4em] text-white/90">Visual Intelligence</span>
                                </div>
                             </div>
                          </div>
                        )}

                        {item.subItems && (
                          <div className="mt-6 sm:mt-10 space-y-4 sm:space-y-5 pl-6 sm:pl-10 border-l sm:border-l-2 border-white/5">
                            {item.subItems.map((sub, idx) => (
                              <div key={idx} className="flex items-start gap-4 text-slate-500 group-hover/item:text-slate-400 transition-colors">
                                 <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/40 mt-2.5" />
                                 <p className="text-base sm:text-xl font-medium leading-relaxed tracking-tight">{sub}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Context Sidebar - Hidden or stacked on mobile */}
              <div className="lg:col-span-4">
                 <div className="lg:sticky lg:top-20 space-y-8 sm:space-y-12">
                   {slide.type === 'gallery' ? (
                     <div className="grid grid-cols-2 lg:grid-cols-1 gap-4 sm:gap-8">
                        {(slide.items || []).filter(i => i.imageUrl).map((item, idx) => (
                          <div key={idx} className="rounded-3xl sm:rounded-[56px] overflow-hidden border border-white/10 aspect-square shadow-xl">
                             <img src={item.imageUrl} className="w-full h-full object-cover" alt={`Gallery-Bild: ${item.text || 'Präsentationsvisualisierung'}`} loading="lazy" />
                          </div>
                        ))}
                     </div>
                   ) : (
                      <div className="p-8 sm:p-12 rounded-3xl sm:rounded-[56px] bg-white/[0.02] border border-white/5 backdrop-blur-xl relative overflow-hidden">
                         <h4 className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.4em] sm:tracking-[0.5em] text-indigo-400 mb-6 sm:mb-8 flex items-center gap-4">
                           <SparklesIcon className="w-4 h-4" /> AI Insight
                         </h4>
                         <p className="text-slate-400 text-base sm:text-lg leading-relaxed font-medium italic">
                           "Strukturiert basierend auf Ihrer Live-Erläuterung. Automatisiert generiert zur Visualisierung Ihrer Strategie."
                         </p>
                      </div>
                   )}
                 </div>
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

export default LiveBriefingPanel;
