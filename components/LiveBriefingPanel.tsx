
import React, { useState } from 'react';
import { PresentationData, SlideItem, Insight, Priority } from '../types';
import { CheckIcon, SparklesIcon, PencilIcon } from './Icons';

interface LiveBriefingPanelProps {
  data: PresentationData | null;
  isLoading: boolean;
  completedPoints?: Set<string>;
  onTogglePoint?: (pointId: string) => void;
  onUpdateTask?: (slideIdx: number, itemIdx: number, updatedItem: SlideItem) => void;
}

const InsightCard: React.FC<{ insight: Insight }> = ({ insight }) => (
  <div className="p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all group animate-in slide-in-from-right-4 duration-500">
    <div className="flex items-center gap-2 mb-2">
       <SparklesIcon className="w-4 h-4 text-indigo-400" />
       <h4 className="text-xs font-black uppercase tracking-widest text-indigo-300">{insight.title}</h4>
    </div>
    <p className="text-sm text-slate-400 leading-relaxed mb-3">{insight.description}</p>
    {insight.sourceUrl && (
      <a 
        href={insight.sourceUrl} 
        target="_blank" 
        rel="noreferrer"
        className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest hover:text-indigo-400 flex items-center gap-1 transition-all"
      >
        Detaillierte Analyse <span className="text-[8px] opacity-40 group-hover:translate-x-1 transition-transform">→</span>
      </a>
    )}
  </div>
);

const LiveBriefingPanel: React.FC<LiveBriefingPanelProps> = ({ 
  data, 
  isLoading, 
  completedPoints = new Set(), 
  onTogglePoint,
  onUpdateTask
}) => {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<SlideItem | null>(null);

  if (!data) return null;

  const startEditing = (e: React.MouseEvent, sIdx: number, iIdx: number, item: SlideItem) => {
    e.stopPropagation();
    setEditingKey(`${sIdx}-${iIdx}`);
    setEditDraft({ ...item });
  };

  const cancelEditing = () => {
    setEditingKey(null);
    setEditDraft(null);
  };

  const saveEditing = (sIdx: number, iIdx: number) => {
    if (onUpdateTask && editDraft) {
      onUpdateTask(sIdx, iIdx, editDraft);
    }
    cancelEditing();
  };

  return (
    <div className="h-full flex flex-col overflow-hidden relative animate-in fade-in duration-1000 p-6 lg:p-12">
      {/* Dynamic Background Glow */}
      <div className="absolute top-[-20%] right-[-10%] w-[1000px] h-[1000px] bg-indigo-600/[0.03] blur-[150px] rounded-full pointer-events-none"></div>
      
      <header className="mb-12 lg:mb-20 z-10 shrink-0">
        <div className="flex items-center gap-3 mb-6">
           <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_25px_rgba(99,102,241,1)] animate-pulse"></div>
           <span className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-400/80">Executive Summary Board</span>
        </div>
        <h1 className="text-4xl lg:text-7xl font-black text-white tracking-tighter leading-[1] mb-6 animate-in slide-in-from-left duration-700">
          {data.title}
        </h1>
        <p className="text-lg lg:text-2xl text-slate-500 font-medium tracking-tight max-w-4xl">
          {data.subtitle}
        </p>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-6 space-y-24 pb-64">
        {data.slides.map((slide, sIdx) => (
          <section key={sIdx} className="animate-in fade-in slide-in-from-bottom-8 duration-1000 border-l border-white/5 pl-10 ml-1 relative">
            {/* Section Indicator */}
            <div className="absolute top-0 -left-[1.5px] w-0.5 h-12 bg-gradient-to-b from-indigo-500 to-transparent"></div>
            
            <div className="flex items-center gap-4 mb-10">
               <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border transition-all ${
                 slide.type === 'tasks' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.05)]' :
                 slide.type === 'strategy' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' :
                 slide.type === 'ideas' ? 'bg-purple-500/10 text-purple-400 border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.05)]' :
                 'bg-white/5 text-slate-400 border-white/10'
               }`}>
                 {slide.type}
               </div>
               <div className="h-px bg-gradient-to-r from-white/10 via-white/[0.02] to-transparent flex-1"></div>
            </div>
            
            <h3 className="text-3xl lg:text-4xl font-black text-white mb-10 tracking-tight">
              {slide.title}
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
              <div className="lg:col-span-7 space-y-10">
                {slide.items?.map((item, iIdx) => {
                  const pointId = `${sIdx}-${iIdx}-${item.text}`;
                  const isCompleted = completedPoints.has(pointId);
                  const isTask = slide.type === 'tasks';
                  const isEditing = editingKey === `${sIdx}-${iIdx}`;

                  return (
                    <div key={iIdx} className="group">
                      <div 
                        onClick={() => isTask && !isEditing && onTogglePoint?.(pointId)}
                        className={`flex items-start gap-7 transition-all duration-500 ${isCompleted ? 'opacity-30 scale-[0.98] origin-left' : 'hover:translate-x-2 cursor-pointer'}`}
                      >
                        <div className={`mt-2 w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 transition-all duration-700 shadow-xl ${
                          isCompleted 
                            ? 'bg-emerald-500 border-emerald-500 text-white rotate-[360deg] shadow-emerald-500/20' 
                            : 'bg-white/5 border-white/10 group-hover:border-indigo-500/50 group-hover:bg-indigo-500/10 group-hover:shadow-indigo-500/10'
                        }`}>
                          {isCompleted ? <CheckIcon className="w-5 h-5" /> : <div className="w-2 h-2 rounded-full bg-indigo-500/30 group-hover:bg-indigo-400 transition-colors"></div>}
                        </div>
                        
                        <div className="flex-1">
                          {isEditing && editDraft ? (
                            <div className="space-y-4 bg-white/5 p-6 rounded-3xl border border-white/10 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                              <input 
                                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white font-bold focus:outline-none focus:border-indigo-500 transition-colors"
                                value={editDraft.text}
                                onChange={e => setEditDraft({ ...editDraft, text: e.target.value })}
                                autoFocus
                                placeholder="Aufgabenname..."
                              />
                              <div className="flex gap-4">
                                <input 
                                  className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white text-xs font-bold focus:outline-none focus:border-indigo-500 transition-colors"
                                  value={editDraft.category || ''}
                                  onChange={e => setEditDraft({ ...editDraft, category: e.target.value })}
                                  placeholder="Kategorie..."
                                />
                                <select 
                                  className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white text-xs font-bold focus:outline-none focus:border-indigo-500 transition-colors"
                                  value={editDraft.priority || ''}
                                  onChange={e => setEditDraft({ ...editDraft, priority: e.target.value as Priority })}
                                >
                                  <option value="">Keine Prio</option>
                                  <option value={Priority.LOW}>Niedrig</option>
                                  <option value={Priority.MEDIUM}>Mittel</option>
                                  <option value={Priority.HIGH}>Hoch</option>
                                </select>
                              </div>
                              <div className="flex justify-end gap-3 pt-2">
                                <button 
                                  onClick={cancelEditing}
                                  className="px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors"
                                >
                                  Abbrechen
                                </button>
                                <button 
                                  onClick={() => saveEditing(sIdx, iIdx)}
                                  className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20"
                                >
                                  Speichern
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex flex-wrap items-center gap-4">
                                <div className="flex-1 min-w-0">
                                  <p className={`text-xl lg:text-2xl leading-snug font-bold transition-all duration-500 ${
                                    isCompleted ? 'text-slate-500 line-through decoration-emerald-500/30' : 'text-slate-100 group-hover:text-white'
                                  }`}>
                                    {item.text}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button 
                                    onClick={(e) => startEditing(e, sIdx, iIdx, item)}
                                    className="p-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-slate-500 hover:text-indigo-400 transition-all"
                                    title="Edit Task"
                                  >
                                    <PencilIcon className="w-4 h-4" />
                                  </button>
                                </div>
                                {item.category && (
                                  <span className="px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest bg-white/5 text-slate-500 border border-white/5 group-hover:border-indigo-500/20 group-hover:text-indigo-400 transition-colors">
                                    {item.category}
                                  </span>
                                )}
                                {item.priority && (
                                  <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border border-white/5 ${
                                    item.priority === Priority.HIGH ? 'text-red-400 bg-red-400/5' :
                                    item.priority === Priority.MEDIUM ? 'text-amber-400 bg-amber-400/5' :
                                    'text-emerald-400 bg-emerald-400/5'
                                  }`}>
                                    {item.priority}
                                  </span>
                                )}
                              </div>

                              {item.subItems && item.subItems.length > 0 && (
                                <div className="mt-6 ml-1 pl-8 border-l border-white/5 space-y-5">
                                  {item.subItems.map((sub, ssIdx) => (
                                    <div key={ssIdx} className="flex items-center gap-4 group/sub">
                                      <div className="w-1.5 h-1.5 rounded-full bg-white/10 group-hover/sub:bg-indigo-500/40 transition-all group-hover/sub:scale-125"></div>
                                      <p className="text-base lg:text-lg text-slate-400 font-medium group-hover/sub:text-slate-200 transition-colors">
                                        {sub}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {slide.insights && slide.insights.length > 0 && (
                <div className="lg:col-span-5 space-y-6">
                  <h5 className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-500/40 mb-6 flex items-center gap-3">
                    <div className="w-10 h-px bg-indigo-500/20"></div> Smart Context
                  </h5>
                  {slide.insights.map((insight, insIdx) => (
                    <InsightCard key={insIdx} insight={insight} />
                  ))}
                </div>
              )}
            </div>
          </section>
        ))}
      </div>

      <footer className="absolute bottom-0 left-0 right-0 p-8 lg:p-12 bg-gradient-to-t from-[#020617] via-[#020617]/95 to-transparent flex justify-between items-end z-20">
         <div className="space-y-2">
            <span className="text-[10px] font-black text-slate-800 uppercase tracking-[0.5em]">System Status</span>
            <div className="flex items-center gap-4">
               <div className="flex gap-1.5">
                 <div className="w-1 h-4 bg-emerald-500/30 rounded-full animate-[pulse_1s_infinite]"></div>
                 <div className="w-1 h-4 bg-emerald-500/60 rounded-full animate-[pulse_1.2s_infinite]"></div>
                 <div className="w-1 h-4 bg-emerald-500/90 rounded-full animate-[pulse_1.4s_infinite]"></div>
               </div>
               <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] whitespace-nowrap">Voice-Engine Stabil • Semantische Analyse aktiv</p>
            </div>
         </div>
         <div className="text-right">
            <div className="text-[9px] font-black text-slate-700 uppercase tracking-widest mb-1">Briefing Snapshot</div>
            <div className="text-[10px] font-bold text-slate-400">{new Date().toLocaleTimeString()} • {data.slides.length} Sektionen</div>
         </div>
      </footer>
    </div>
  );
};

export default LiveBriefingPanel;
