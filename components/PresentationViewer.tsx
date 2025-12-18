
import React, { useState, useEffect } from 'react';
import { PresentationData, Slide } from '../types';

interface PresentationViewerProps {
  data: PresentationData;
  onClose: () => void;
}

const PresentationViewer: React.FC<PresentationViewerProps> = ({ data, onClose }) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') next();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlideIndex]);

  const next = () => {
    if (currentSlideIndex < data.slides.length) setCurrentSlideIndex(prev => prev + 1);
  };

  const prev = () => {
    if (currentSlideIndex > 0) setCurrentSlideIndex(prev => prev - 1);
  };

  const renderSlide = () => {
    if (currentSlideIndex === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center animate-in fade-in zoom-in duration-700">
          <div className="w-24 h-1 bg-indigo-500 mb-8"></div>
          <h1 className="text-7xl font-black text-white tracking-tighter mb-4 max-w-4xl">{data.title}</h1>
          <p className="text-2xl text-slate-400 font-medium tracking-wide">{data.subtitle}</p>
          <div className="mt-16 text-slate-600 font-mono text-xs uppercase tracking-[0.5em] flex items-center gap-4">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
             Live AI Presentation Mode
          </div>
        </div>
      );
    }

    const slide = data.slides[currentSlideIndex - 1];
    return (
      <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-12 duration-500">
        <header className="mb-12">
           <span className="text-xs font-black uppercase tracking-[0.3em] text-indigo-500 mb-2 block">
             Slide {currentSlideIndex} / {data.slides.length} • {slide.type.toUpperCase()}
           </span>
           <h2 className="text-6xl font-black text-white tracking-tight leading-tight">{slide.title}</h2>
        </header>
        <div className="flex-1 overflow-y-auto pr-8">
          <ul className="space-y-8">
            {slide.points.map((point, i) => (
              <li key={i} className="flex items-start gap-8 group">
                <div className="mt-4 w-3 h-3 rounded-full bg-indigo-500 shrink-0 group-hover:scale-150 transition-all shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
                <p className="text-3xl text-slate-200 font-medium leading-relaxed group-hover:text-white transition-colors">
                  {point}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#020617] flex flex-col p-20 select-none cursor-default overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[800px] h-[800px] bg-indigo-600/10 blur-[150px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-800/5 blur-[120px] rounded-full pointer-events-none"></div>

      {/* Progress Bar */}
      <div className="absolute top-0 left-0 h-1.5 bg-white/5 w-full">
        <div 
          className="h-full bg-indigo-500 transition-all duration-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]" 
          style={{ width: `${(currentSlideIndex / data.slides.length) * 100}%` }}
        />
      </div>

      <div className="absolute top-8 right-8 flex gap-4">
        <button 
          onClick={onClose}
          className="px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-slate-500 hover:text-white transition-all text-xs font-black uppercase tracking-widest flex items-center gap-3 group"
        >
          Beenden <span className="opacity-40 group-hover:opacity-100">ESC</span>
        </button>
      </div>

      <div className="flex-1 max-w-7xl mx-auto w-full relative">
        {renderSlide()}
      </div>

      <footer className="mt-12 flex justify-between items-end max-w-7xl mx-auto w-full">
        <div className="flex gap-4">
          <button 
            disabled={currentSlideIndex === 0}
            onClick={prev}
            className="p-6 bg-white/5 hover:bg-white/10 rounded-3xl disabled:opacity-10 transition-all text-white border border-white/5 hover:border-indigo-500/30"
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button 
             disabled={currentSlideIndex === data.slides.length}
             onClick={next}
             className="p-6 bg-indigo-600 hover:bg-indigo-700 rounded-3xl disabled:opacity-10 transition-all text-white shadow-xl shadow-indigo-600/20"
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
        
        <div className="text-right">
          <div className="text-slate-600 text-[10px] font-black tracking-[0.4em] uppercase mb-1">Status</div>
          <div className="text-indigo-500 font-black text-sm tracking-widest uppercase">
            {currentSlideIndex === 0 ? 'Einleitung' : currentSlideIndex === data.slides.length ? 'Zusammenfassung' : `Slide ${currentSlideIndex}`}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PresentationViewer;
