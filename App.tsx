
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { LiveServerMessage } from '@google/genai';
import { PresentationData, SecretaryState, SmartSuggestion, SlideItem, AppMode, AppModeType, ToolbarState } from './types';
import { MicIcon, SparklesIcon, CheckIcon, PresentationIcon, TrashIcon, HistoryIcon } from './components/Icons';
import LiveBriefingPanel from './components/LiveBriefingPanel';
import PresentationViewer from './components/PresentationViewer';
import PresentationEditor from './components/PresentationEditor';
import MenuBar from './components/MenuBar';
import ModeSelector from './components/ModeSelector';
import Toolbar from './components/Toolbar';
import ExportMode from './components/ExportMode';
import AdvancedTemplates from './components/AdvancedTemplates';
import { AIService, PresentationInput } from './services/aiService';

// Audio Utilities
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// Performance monitoring utility
const measurePerformance = (name: string, fn: () => void | Promise<void>) => {
  const start = performance.now();
  const result = fn();
  if (result instanceof Promise) {
    return result.finally(() => {
      const end = performance.now();
      console.log(`Performance [${name}]: ${(end - start).toFixed(2)}ms`);
    });
  }
  const end = performance.now();
  console.log(`Performance [${name}]: ${(end - start).toFixed(2)}ms`);
  return result;
};

// Debounce utility
const debounce = (func: Function, delay: number) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

// Tool-Definitionen wurden in AIService konsolidiert

const App: React.FC = () => {
  const [isPresenting, setIsPresenting] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [state, setState] = useState<SecretaryState>({ isActive: false, transcript: [], suggestions: [] });
  const [briefingData, setBriefingData] = useState<PresentationData | null>(() => {
    const saved = localStorage.getItem('executive_briefing');
    return saved ? JSON.parse(saved) : null;
  });
  const [completedPoints, setCompletedPoints] = useState<Set<string>>(new Set());
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const [performanceMetrics, setPerformanceMetrics] = useState<Record<string, number>>({});
  const [isCreatingPresentation, setIsCreatingPresentation] = useState<boolean>(false);
  const [isOptimizingLayout, setIsOptimizingLayout] = useState<boolean>(false);
  
  // New state for menu system and modes
  const [appMode, setAppMode] = useState<AppMode>({
    current: 'voice',
    canUndo: false,
    canRedo: false,
    hasUnsavedChanges: false,
    history: [],
    historyIndex: -1
  });
  
  const [toolbarState, setToolbarState] = useState<ToolbarState>({
    selectedSlide: 0,
    totalSlides: 0,
    zoom: 100,
    showGrid: false
  });
  const workerRef = useRef<Worker | null>(null);
  const performanceMonitorRef = useRef<Record<string, number>>({});

  const sessionRef = useRef<any>(null);
  const audioContextInRef = useRef<AudioContext | null>(null);
  const audioContextOutRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTimeRef = useRef(0);
  const isStoppingRef = useRef(false);

  useEffect(() => {
    if (briefingData) localStorage.setItem('executive_briefing', JSON.stringify(briefingData));
  }, [briefingData]);

  // Update toolbar state when briefing data changes
  useEffect(() => {
    if (briefingData) {
      setToolbarState(prev => ({
        ...prev,
        totalSlides: briefingData.slides.length,
        selectedSlide: Math.min(prev.selectedSlide, Math.max(0, briefingData.slides.length - 1))
      }));
      
      // Add to history for undo/redo functionality
      setAppMode(prev => {
        const newHistory = prev.history.slice(0, prev.historyIndex + 1);
        newHistory.push(briefingData);
        return {
          ...prev,
          history: newHistory,
          historyIndex: newHistory.length - 1,
          hasUnsavedChanges: true
        };
      });
    }
  }, [briefingData]);

  useEffect(() => {
    return () => stopSession();
  }, []);

  // Initialize Web Worker for heavy computations
  useEffect(() => {
    if (typeof Worker !== 'undefined') {
      try {
        workerRef.current = new Worker(new URL('./performance-worker.js', import.meta.url));
        
        workerRef.current.addEventListener('message', (e) => {
          const { type, data } = e.data;
          
          switch (type) {
            case 'PERFORMANCE_ANALYSIS_COMPLETE':
              console.log('Performance analysis complete:', data.analysis);
              break;
            case 'BRIEFING_DATA_PREPROCESSED':
              console.log('Briefing data preprocessed in', data.processingTime, 'ms');
              break;
            default:
              break;
          }
        });
        
        workerRef.current.addEventListener('error', (error) => {
          console.error('Worker error:', error);
        });
      } catch (error) {
        console.warn('Web Worker not supported or failed to initialize:', error);
      }
    }
    
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  const updatePerformanceMetrics = useCallback((operation: string, duration: number) => {
    setPerformanceMetrics(prev => ({
      ...prev,
      [operation]: duration
    }));
    
    // Send to worker for analysis if available
    if (workerRef.current) {
      const performanceData = Object.entries({ ...performanceMetrics, [operation]: duration })
        .map(([name, time]) => ({ name, duration: time as number }));
      
      workerRef.current.postMessage({
        type: 'ANALYZE_PERFORMANCE',
        data: performanceData
      });
    }
  }, [performanceMetrics]);

  const handleGenerateImage = useCallback(async (prompt: string, sIdx: number, iIdx: number) => {
    const result = await measurePerformance('image-generation', async () => {
      try {
        setIsGeneratingImage(true);
        const imageUrl = await AIService.generateVisual(prompt);
        
        // Batch state update for better performance
        setBriefingData(prev => {
          if (!prev) return null;
          const slides = [...prev.slides];
          if (slides[sIdx]) {
            const items = [...slides[sIdx].items];
            if (items[iIdx]) items[iIdx] = { ...items[iIdx], imageUrl };
            slides[sIdx] = { ...slides[sIdx], items };
          }
          return { ...prev, slides };
        });
      } catch (err) { console.error("Image Gen Error:", err); }
      finally {
        setIsGeneratingImage(false);
      }
    });
    return result;
  }, []);

  const debouncedTogglePoint = useMemo(
    () => debounce((id: string) => {
      setCompletedPoints(prev => {
        const n = new Set(prev);
        n.has(id) ? n.delete(id) : n.add(id);
        return n;
      });
    }, 100),
    []
  );

  const onTogglePoint = useCallback((id: string) => {
    measurePerformance('toggle-point', () => {
      debouncedTogglePoint(id);
    });
  }, [debouncedTogglePoint]);

  const optimizedStartSession = useCallback(async () => {
    const result = await measurePerformance('start-session', async () => {
      if (state.isActive || isStoppingRef.current) return;
      isStoppingRef.current = false;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        
        // Mobile Browser requires explicit resume on click
        if (inputCtx.state === 'suspended') await inputCtx.resume();
        if (outputCtx.state === 'suspended') await outputCtx.resume();

        audioContextInRef.current = inputCtx;
        audioContextOutRef.current = outputCtx;

        const sessionPromise = AIService.connectLiveSession({
          onopen: () => {
            if (isStoppingRef.current) return;
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            audioSourceRef.current = source;
            scriptProcessorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (e) => {
              if (isStoppingRef.current || inputCtx.state === 'closed') return;
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              const base64Data = encode(new Uint8Array(int16.buffer));
              sessionPromise.then(s => {
                if (!isStoppingRef.current && inputCtx.state !== 'closed') {
                  try { s.sendRealtimeInput({ media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' } }); } catch (err) {}
                }
              }).catch(() => {});
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
            setState(p => ({ ...p, isActive: true }));
            setIsSidebarOpen(false); // Close sidebar on mobile when session starts
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (isStoppingRef.current) return;
            const audioData = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData && outputCtx.state !== 'closed') {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              try {
                const buffer = await decodeAudioData(decode(audioData), outputCtx, 24000, 1);
                const source = outputCtx.createBufferSource();
                source.buffer = buffer;
                source.connect(outputCtx.destination);
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += buffer.duration;
              } catch (e) {}
            }
            if (msg.toolCall) {
              for (const fc of msg.toolCall.functionCalls) {
                if (fc.name === 'update_briefing') {
                  setBriefingData(fc.args as any);
                  sessionPromise.then(s => s.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result: "Board aktualisiert." } } }));
                } else if (fc.name === 'generate_visual') {
                  handleGenerateImage(fc.args.prompt as string, fc.args.slideIndex as number, fc.args.itemIndex as number);
                  sessionPromise.then(s => s.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result: "Visualisierung läuft." } } }));
                }
              }
            }
          },
          onerror: (e) => { if (!isStoppingRef.current) stopSession(); },
          onclose: () => { if (!isStoppingRef.current) stopSession(); }
        });
        sessionRef.current = sessionPromise;
      } catch (err) { 
        console.error("Session Start Error:", err); 
        stopSession();
      }
    });
    return result;
  }, [state.isActive, handleGenerateImage]);

  const optimizedStopSession = useCallback(() => {
    measurePerformance('stop-session', () => {
      if (isStoppingRef.current) return;
      isStoppingRef.current = true;
      setState(p => ({ ...p, isActive: false }));
      if (scriptProcessorRef.current) {
        try { scriptProcessorRef.current.onaudioprocess = null; scriptProcessorRef.current.disconnect(); } catch(e) {}
        scriptProcessorRef.current = null;
      }
      if (audioSourceRef.current) {
        try { audioSourceRef.current.disconnect(); } catch(e) {}
        audioSourceRef.current = null;
      }
      if (sessionRef.current) {
        sessionRef.current.then((s: any) => { try { s.close(); } catch(e){} }).catch(() => {});
        sessionRef.current = null;
      }
      if (audioContextInRef.current && audioContextInRef.current.state !== 'closed') {
        try { audioContextInRef.current.close().catch(() => {}); } catch(e) {}
      }
      audioContextInRef.current = null;
      if (audioContextOutRef.current && audioContextOutRef.current.state !== 'closed') {
        try { audioContextOutRef.current.close().catch(() => {}); } catch(e) {}
      }
      audioContextOutRef.current = null;
      nextStartTimeRef.current = 0;
      setTimeout(() => { isStoppingRef.current = false; }, 1000);
    });
  }, []);

  const startSession = optimizedStartSession;
  const stopSession = optimizedStopSession;

  // Menu and Mode Handlers
  const handleModeChange = useCallback((mode: AppModeType) => {
    setAppMode(prev => ({ ...prev, current: mode }));
    
    // Close sidebar when switching to presentation mode
    if (mode === 'presentation') {
      setIsSidebarOpen(false);
      setIsPresenting(true);
    }
    
    // Auto-save when switching modes
    if (mode !== 'voice' && appMode.hasUnsavedChanges && briefingData) {
      localStorage.setItem('executive_briefing', JSON.stringify(briefingData));
      setAppMode(prev => ({ ...prev, hasUnsavedChanges: false }));
    }
  }, [appMode.hasUnsavedChanges, briefingData]);

  const handleFileAction = useCallback((action: string) => {
    switch (action) {
      case 'new':
        if (confirm('Neue Präsentation erstellen? Alle ungespeicherten Änderungen gehen verloren.')) {
          setBriefingData(null);
          localStorage.removeItem('executive_briefing');
          setCompletedPoints(new Set());
          setAppMode(prev => ({ ...prev, hasUnsavedChanges: false, history: [], historyIndex: -1 }));
        }
        break;
      case 'open':
        // TODO: Implement file open dialog
        console.log('File open not implemented yet');
        break;
      case 'save':
        if (briefingData) {
          localStorage.setItem('executive_briefing', JSON.stringify(briefingData));
          setAppMode(prev => ({ ...prev, hasUnsavedChanges: false }));
        }
        break;
      case 'export':
        // TODO: Implement export functionality
        console.log('Export not implemented yet');
        break;
    }
  }, [briefingData]);

  const handleEditAction = useCallback((action: string) => {
    switch (action) {
      case 'undo':
        // TODO: Implement undo functionality
        console.log('Undo not implemented yet');
        break;
      case 'redo':
        // TODO: Implement redo functionality
        console.log('Redo not implemented yet');
        break;
      case 'copy':
        // TODO: Implement copy functionality
        console.log('Copy not implemented yet');
        break;
      case 'paste':
        // TODO: Implement paste functionality
        console.log('Paste not implemented yet');
        break;
    }
  }, []);

  const handleInsertAction = useCallback((action: string) => {
    switch (action) {
      case 'new-slide':
        // TODO: Implement new slide functionality
        console.log('New slide not implemented yet');
        break;
      case 'text':
        // TODO: Implement text insertion
        console.log('Text insertion not implemented yet');
        break;
      case 'image':
        // TODO: Implement image insertion
        console.log('Image insertion not implemented yet');
        break;
      case 'shape':
        // TODO: Implement shape insertion
        console.log('Shape insertion not implemented yet');
        break;
    }
  }, []);

  const handleViewAction = useCallback((action: string) => {
    switch (action) {
      case 'editor':
        handleModeChange('editor');
        break;
      case 'presentation':
        handleModeChange('presentation');
        break;
      case 'fullscreen':
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen();
        }
        break;
    }
  }, [handleModeChange]);

  // Erweiterte KI-Handler
  const handleCreatePresentation = useCallback(async () => {
    if (!briefingData) return;
    
    try {
      setIsCreatingPresentation(true);
      
      const input: PresentationInput = {
        title: briefingData.title,
        subtitle: briefingData.subtitle,
        content: `Erstelle eine professionelle Präsentation basierend auf: ${JSON.stringify(briefingData)}`,
        targetAudience: 'Führungskräfte',
        presentationStyle: 'executive',
        language: 'de',
        includeImages: true,
        maxSlides: 10
      };
      
      const validation = AIService.validatePresentationInput(input);
      if (!validation.isValid) {
        alert(`Validierungsfehler: ${validation.errors.join(', ')}`);
        return;
      }
      
      const enhancedPresentation = await AIService.createPresentation(input);
      setBriefingData(enhancedPresentation);
      
    } catch (error) {
      console.error('Präsentationserstellung fehlgeschlagen:', error);
      alert('Präsentationserstellung fehlgeschlagen. Bitte versuchen Sie es erneut.');
    } finally {
      setIsCreatingPresentation(false);
    }
  }, [briefingData]);

  const handleOptimizeLayout = useCallback(async () => {
    if (!briefingData) return;
    
    try {
      setIsOptimizingLayout(true);
      
      const optimizedLayout = await AIService.optimizeLayout(briefingData.slides);
      
      // Reorganisiere Folien basierend auf optimierter Reihenfolge
      const reorderedSlides = optimizedLayout.slideOrder.map(index => briefingData.slides[index]);
      setBriefingData({ ...briefingData, slides: reorderedSlides });
      
    } catch (error) {
      console.error('Layout-Optimierung fehlgeschlagen:', error);
      alert('Layout-Optimierung fehlgeschlagen. Bitte versuchen Sie es erneut.');
    } finally {
      setIsOptimizingLayout(false);
    }
  }, [briefingData]);

  const handleAddImages = useCallback(async () => {
    if (!briefingData) return;
    
    try {
      setIsGeneratingImage(true);
      
      const enhancedSlides = await AIService.addImagesToSlides(briefingData.slides);
      setBriefingData({ ...briefingData, slides: enhancedSlides });
      
    } catch (error) {
      console.error('Bildhinzufügung fehlgeschlagen:', error);
      alert('Bildhinzufügung fehlgeschlagen. Bitte versuchen Sie es erneut.');
    } finally {
      setIsGeneratingImage(false);
    }
  }, [briefingData]);

  const handleToolbarAction = useCallback({
    onUndo: () => handleEditAction('undo'),
    onRedo: () => handleEditAction('redo'),
    onSave: () => handleFileAction('save'),
    onExport: () => handleFileAction('export'),
    onSlideNavigate: (direction: 'prev' | 'next') => {
      setToolbarState(prev => ({
        ...prev,
        selectedSlide: direction === 'prev' 
          ? Math.max(0, prev.selectedSlide - 1)
          : Math.min(prev.totalSlides - 1, prev.selectedSlide + 1)
      }));
    },
    onZoomChange: (zoom: number) => {
      setToolbarState(prev => ({ ...prev, zoom }));
    },
    onToggleGrid: () => {
      setToolbarState(prev => ({ ...prev, showGrid: !prev.showGrid }));
    },
    onPresentationMode: () => handleModeChange('presentation'),
    onCreatePresentation: handleCreatePresentation,
    onOptimizeLayout: handleOptimizeLayout,
    onAddImages: handleAddImages
  }, [handleEditAction, handleFileAction, handleModeChange, handleCreatePresentation, handleOptimizeLayout, handleAddImages]);

  return (
    <div className="h-screen flex bg-[#020617] text-slate-200 overflow-hidden font-sans selection:bg-indigo-500/40 relative">
      {isPresenting && briefingData && <PresentationViewer data={briefingData} onClose={() => setIsPresenting(false)} />}
      
      {/* Performance Monitor Panel - Development Only */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-black/80 text-white p-2 rounded text-xs font-mono z-[1000] max-w-xs">
          <div className="font-bold mb-1">Performance Metrics:</div>
          {Object.entries(performanceMetrics).map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <span>{key}:</span>
              <span>{value}ms</span>
            </div>
          ))}
        </div>
      )}
      
      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-slate-950/80 backdrop-blur-xl border-b border-white/5 z-[60] flex items-center justify-between px-6 pt-safe">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${state.isActive ? 'bg-indigo-500 animate-pulse' : 'bg-slate-700'}`} />
          <span className="font-black text-xs uppercase tracking-tighter">Thought Parser</span>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
          className="p-2 text-slate-400 transition-colors hover:text-white"
          aria-label="Sidebar umschalten"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isSidebarOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16m-7 6h7"} />
          </svg>
        </button>
      </div>

      {/* Responsive Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-[70] w-80 bg-slate-950 border-r border-white/5 flex flex-col transition-transform duration-500 lg:static lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0 shadow-[20px_0_60px_rgba(0,0,0,0.8)]' : '-translate-x-full'}
      `}>
        <div className="p-8 border-b border-white/5 pt-12 lg:pt-8">
          <div className="flex items-center gap-3 mb-1">
            <div className={`w-2.5 h-2.5 rounded-full ${state.isActive ? 'bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,1)] animate-pulse' : 'bg-slate-700'}`} />
            <h1 className="font-black tracking-tighter text-sm uppercase text-white">Thought Parser</h1>
          </div>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Visual Intelligence Board</p>
        </div>
        
        <div className="flex-1 p-6 space-y-4 overflow-y-auto custom-scrollbar">
          <button 
            onClick={state.isActive ? stopSession : startSession}
            disabled={isStoppingRef.current}
            className={`w-full p-5 rounded-2xl flex items-center justify-center gap-3 transition-all duration-300 font-bold text-xs uppercase tracking-widest border shadow-lg will-change-transform ${
              state.isActive 
              ? 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20' 
              : 'bg-indigo-600 text-white border-indigo-400/20 shadow-indigo-600/20 hover:bg-indigo-500'
            } disabled:opacity-50`}
          >
            <MicIcon className="w-5 h-5" /> 
            {isStoppingRef.current ? 'Stopping...' : state.isActive ? 'Stopp' : 'Start Session'}
          </button>

          {/* Mode Selector - Replaces Stage Mode Button */}
          <ModeSelector
            currentMode={appMode.current}
            onModeChange={handleModeChange}
            disabled={state.isActive}
            hasData={!!briefingData}
          />

          <div className="pt-8 border-t border-white/5">
             <div className="flex items-center justify-between mb-6 px-2">
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Aktivität</span>
                <HistoryIcon className="w-3 h-3 text-slate-700" />
             </div>
             {state.isActive ? (
               <div className="space-y-4">
                  <div className="flex gap-1.5 items-center justify-center h-12">
                     {[...Array(5)].map((_, i) => (
                       <div key={i} className="w-1.5 bg-indigo-500 rounded-full animate-voice-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                     ))}
                  </div>
                  <p className="text-[10px] text-center text-slate-400 font-bold uppercase">KI verarbeitet Gedanken...</p>
               </div>
             ) : (
               <div className="text-center py-10 opacity-10">
                  <SparklesIcon className="w-10 h-10 mx-auto mb-4" />
                  <p className="text-[10px] font-black uppercase">Bereit</p>
               </div>
             )}
          </div>
        </div>
        
        <div className="p-6 border-t border-white/5 pb-safe">
          <button 
            onClick={() => {
              if(confirm('Board leeren?')) {
                measurePerformance('reset-board', () => {
                  setBriefingData(null);
                  localStorage.removeItem('executive_briefing');
                  setCompletedPoints(new Set());
                });
              }
            }} 
            className="w-full text-slate-600 hover:text-red-400 transition-colors flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest p-2"
          >
            <TrashIcon className="w-3 h-3" /> Reset Board
          </button>
        </div>
      </aside>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)} 
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[65] cursor-pointer" 
        />
      )}

      <main className="flex-1 relative bg-[radial-gradient(circle_at_top_right,rgba(30,41,59,0.4),rgba(2,6,23,1))] overflow-hidden pt-16 lg:pt-0">
        {/* Menu Bar for editor and presentation modes */}
        {(appMode.current === 'editor' || appMode.current === 'presentation' || appMode.current === 'export' || appMode.current === 'templates') && (
          <div className="border-b border-white/5">
            <MenuBar
              onFileAction={handleFileAction}
              onEditAction={handleEditAction}
              onInsertAction={handleInsertAction}
              onViewAction={handleViewAction}
              canUndo={appMode.canUndo}
              canRedo={appMode.canRedo}
              hasUnsavedChanges={appMode.hasUnsavedChanges}
              currentMode={appMode.current}
              disabled={state.isActive}
            />
          </div>
        )}
        
        {/* Toolbar for editor and presentation modes */}
        {(appMode.current === 'editor' || appMode.current === 'presentation') && briefingData && (
          <div className="border-b border-white/5">
            <Toolbar
              state={toolbarState}
              onUndo={handleToolbarAction.onUndo}
              onRedo={handleToolbarAction.onRedo}
              onSave={handleToolbarAction.onSave}
              onExport={handleToolbarAction.onExport}
              onSlideNavigate={handleToolbarAction.onSlideNavigate}
              onZoomChange={handleToolbarAction.onZoomChange}
              onToggleGrid={handleToolbarAction.onToggleGrid}
              onPresentationMode={handleToolbarAction.onPresentationMode}
              onCreatePresentation={handleToolbarAction.onCreatePresentation}
              onOptimizeLayout={handleToolbarAction.onOptimizeLayout}
              onAddImages={handleToolbarAction.onAddImages}
              canUndo={appMode.canUndo}
              canRedo={appMode.canRedo}
              canSave={!!briefingData}
              hasUnsavedChanges={appMode.hasUnsavedChanges}
              disabled={state.isActive}
              isCreatingPresentation={isCreatingPresentation}
              isOptimizingLayout={isOptimizingLayout}
              isAddingImages={isGeneratingImage}
            />
          </div>
        )}
        
        {/* Mode-specific content */}
        {appMode.current === 'editor' && briefingData ? (
          <PresentationEditor
            data={briefingData}
            onDataChange={setBriefingData}
            onModeChange={handleModeChange}
            disabled={state.isActive}
          />
        ) : appMode.current === 'export' && briefingData ? (
          <ExportMode
            data={briefingData}
            onExport={(format, options) => {
              // Export functionality will be handled by ExportMode component
              console.log('Exporting to', format, 'with options:', options);
            }}
            onModeChange={handleModeChange}
          />
        ) : appMode.current === 'templates' ? (
          <AdvancedTemplates
            onSelectTemplate={(template) => {
              if (template) {
                setBriefingData(template);
                handleModeChange('editor');
              }
            }}
            onCreateCustom={(customTemplate) => {
              if (customTemplate) {
                setBriefingData(customTemplate);
                handleModeChange('editor');
              }
            }}
            onModeChange={handleModeChange}
          />
        ) : appMode.current === 'voice' || !briefingData ? (
          <div className="h-full overflow-hidden">
            <LiveBriefingPanel 
              data={briefingData} 
              isLoading={false} 
              completedPoints={completedPoints}
              onTogglePoint={onTogglePoint}
            />
          </div>
        ) : null}
        
        {/* Empty state for voice mode */}
        {!briefingData && !state.isActive && appMode.current === 'voice' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8">
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-black text-white tracking-tighter mb-6 leading-none">Intelligence as a Briefing.</h2>
            <p className="text-slate-500 max-w-sm text-lg sm:text-xl font-medium">Starten Sie und sprechen Sie frei. Die KI strukturiert alles.</p>
          </div>
        )}
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes voice-bounce {
          0%, 100% { height: 8px; transform: translateY(0); }
          50% { height: 24px; transform: translateY(-4px); }
        }
        .animate-voice-bounce { animation: voice-bounce 0.8s ease-in-out infinite; }
        
        /* Performance optimizations */
        * {
          box-sizing: border-box;
        }
        
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(99, 102, 241, 0.3) transparent;
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.3);
          border-radius: 3px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.5);
        }
        
        /* GPU acceleration for better performance */
        .will-change-transform {
          will-change: transform;
          transform: translateZ(0);
        }
        
        /* Optimize animations */
        .transition-all {
          transition-property: all;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        /* Prevent layout shifts */
        .fixed {
          contain: layout style paint;
        }
        
        /* Optimize image rendering */
        img {
          image-rendering: -webkit-optimize-contrast;
          image-rendering: crisp-edges;
        }
        
        /* Reduce repaints */
        .backdrop-blur-xl {
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
        }
        
        /* Optimize focus states */
        button:focus {
          outline: 2px solid rgba(99, 102, 241, 0.5);
          outline-offset: 2px;
        }
      `}} />
    </div>
  );
};

export default App;
