import * as React from 'react';
import { useState, useEffect } from 'react';
import { PresentationData, Slide } from '../types';
import { SparklesIcon } from './Icons';

interface PresentationViewerProps {
  data: PresentationData;
  onClose: () => void;
}

const PresentationViewer: React.FC<PresentationViewerProps> = ({ data, onClose }) => {
  const [index, setIndex] = useState(0);

  // Null-Safety-Check für data und slides
  const safeData = data || { title: '', subtitle: '', slides: [] };
  const slidesLength = safeData.slides?.length || 0;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') setIndex(i => Math.min(slidesLength, i + 1));
      if (e.key === 'ArrowLeft') setIndex(i => Math.max(0, i - 1));
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [slidesLength, onClose]);

  const renderSlide = () => {
    // Check if data and slides exist
    if (!safeData || !safeData.slides || safeData.slides.length === 0) {
      return (
        <div className="h-full flex items-center justify-center text-center animate-in zoom-in-95 fade-in duration-1000">
          <div>
            <h1 className="text-4xl font-bold text-white mb-4">Keine Folien verfügbar</h1>
            <p className="text-slate-400">Die Präsentation enthält keine Folien.</p>
          </div>
        </div>
      );
    }

    // Cinematic Title Slide
    if (index === 0) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-center animate-in zoom-in-95 fade-in duration-1000">
          <div className="w-24 h-[1px] bg-indigo-500/50 mb-16" />
          <h1 className="text-8xl lg:text-[11rem] font-black text-white tracking-tighter mb-12 leading-[0.8] drop-shadow-2xl">
            {safeData.title || 'Untitled Presentation'}
          </h1>
          <p className="text-3xl lg:text-5xl text-slate-500 font-medium tracking-tight max-w-5xl mx-auto">
            {safeData.subtitle || ''}
          </p>
          <div className="mt-24 flex items-center gap-4 text-indigo-500/30 font-bold uppercase tracking-[0.6em] text-[10px]">
             <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
             Executive Protocol Active
          </div>
        </div>
      );
    }

    const slide = safeData.slides[index - 1];
    if (!slide || !slide.items) return null;

    const featuredImage = slide.items.find(i => i && i.imageUrl)?.imageUrl;

    return (
      <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-12 duration-700">
        <header className="mb-20 flex justify-between items-end border-b border-white/5 pb-12">
           <div className="space-y-4">
             <span className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-500 block">
               Section {index} • {slide.type?.toUpperCase()}
             </span>
             <h2 className="text-7xl font-black text-white tracking-tight leading-none">{slide.title}</h2>
           </div>
           <div className="hidden lg:block text-slate-900 font-black text-8xl opacity-50 select-none">0{index}</div>
        </header>

        <div className={`flex-1 flex gap-24 overflow-hidden ${featuredImage ? 'items-center' : ''}`}>
           <div className={`${featuredImage ? 'w-1/2' : 'w-full'} overflow-y-auto pr-12 custom-scrollbar`}>
              <ul className="space-y-20 pb-32">
                {slide.items.map((item, i) => (
                  <li key={i} className="group animate-in slide-in-from-left-8 duration-500" style={{ animationDelay: `${i * 0.12}ms` }}>
                    <p className="text-5xl text-slate-200 font-bold leading-tight group-hover:text-white transition-colors mb-8 tracking-tight">
                      {item.text}
                    </p>
                    {item.subItems && (
                       <div className="space-y-6 pl-10 border-l border-indigo-500/20">
                          {item.subItems.map((sub, j) => (
                            <p key={j} className="text-2xl text-slate-500 font-medium tracking-tight leading-relaxed">{sub}</p>
                          ))}
                       </div>
                    )}
                  </li>
                ))}
              </ul>
           </div>

           {featuredImage && (
             <div className="w-1/2 h-full py-12 animate-in zoom-in-105 fade-in duration-1000 delay-300">
                <div className="w-full h-full rounded-[80px] overflow-hidden border border-white/10 shadow-[0_0_120px_rgba(0,0,0,0.9)] relative group">
                   <img 
                     src={featuredImage} 
                     className="w-full h-full object-cover transition-transform duration-[3s] group-hover:scale-105" 
                     alt="" 
                   />
                   <div className="absolute inset-0 bg-gradient-to-t from-[#020617]/80 via-transparent to-transparent flex items-end p-20">
                      <div className="flex items-center gap-5">
                         <SparklesIcon className="w-8 h-8 text-indigo-500" />
                         <span className="text-xs font-black uppercase tracking-[0.5em] text-white/70">AI Visual Concept</span>
                      </div>
                   </div>
                </div>
             </div>
           )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#020617] flex flex-col p-16 lg:p-28 overflow-hidden select-none cursor-default">
      {/* Progress Bar */}
      <div className="absolute top-0 left-0 w-full h-2 bg-white/5">
        <div 
          className="h-full bg-indigo-600 transition-all duration-1000 ease-out shadow-[0_0_25px_rgba(79,70,229,0.6)]" 
          style={{ width: `${slidesLength > 0 ? (index / slidesLength) * 100 : 0}%` }} 
        />
      </div>

      {/* Control Buttons */}
      <div className="absolute top-12 right-12 flex gap-6">
        <button 
          onClick={onClose} 
          className="px-8 py-4 bg-white/5 hover:bg-white/10 rounded-full text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 hover:text-white transition-all border border-white/10 backdrop-blur-md"
        >
          Exit View ESC
        </button>
      </div>

      <div className="flex-1 max-w-[1700px] mx-auto w-full relative">
        {renderSlide()}
      </div>

      <footer className="mt-16 flex justify-between items-center max-w-[1700px] mx-auto w-full">
        <div className="flex gap-8">
           <button 
             onClick={() => setIndex(i => Math.max(0, i - 1))}
             disabled={index === 0}
             className="p-10 rounded-full bg-white/5 hover:bg-white/10 disabled:opacity-5 transition-all text-white border border-white/10 active:scale-90"
           >
             <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M15 19l-7-7 7-7" /></svg>
           </button>
           <button 
             onClick={() => setIndex(i => Math.min(slidesLength, i + 1))}
             disabled={index >= slidesLength}
             className="p-10 rounded-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-5 transition-all text-white shadow-3xl shadow-indigo-600/40 border border-indigo-400/20 active:scale-90"
           >
             <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M9 5l7 7-7 7" /></svg>
           </button>
        </div>
        <div className="flex flex-col items-end gap-2">
           <div className="text-[10px] font-black uppercase tracking-[0.8em] text-slate-800">Executive Briefing System</div>
           <div className="h-1 w-20 bg-indigo-500/20 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500/40 animate-pulse" />
           </div>
        </div>
      </footer>
    </div>
  );
};

export default PresentationViewer;
