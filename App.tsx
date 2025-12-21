
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { PresentationData, SecretaryState, SmartSuggestion, SlideItem } from './types';
import { MicIcon, SparklesIcon, CheckIcon, PresentationIcon, TrashIcon, HistoryIcon } from './components/Icons';
import LiveBriefingPanel from './components/LiveBriefingPanel';
import PresentationViewer from './components/PresentationViewer';

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

const updatePresentationTool: FunctionDeclaration = {
  name: 'update_briefing',
  parameters: {
    type: Type.OBJECT,
    description: 'Aktualisiert das Board mit strukturierten Gedanken (Projekte, Aufgaben, Strategien).',
    properties: {
      title: { type: Type.STRING },
      subtitle: { type: Type.STRING },
      slides: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            type: { type: Type.STRING, enum: ['strategy', 'tasks', 'ideas', 'problems', 'summary', 'gallery'] },
            items: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  subItems: { type: Type.ARRAY, items: { type: Type.STRING } },
                  imageUrl: { type: Type.STRING }
                },
                required: ['text']
              }
            }
          },
          required: ['title', 'type', 'items']
        }
      }
    },
    required: ['title', 'subtitle', 'slides'],
  },
};

const generateVisualTool: FunctionDeclaration = {
  name: 'generate_visual',
  parameters: {
    type: Type.OBJECT,
    description: 'Generiert ein KI-Bild für eine Folie.',
    properties: {
      prompt: { type: Type.STRING },
      slideIndex: { type: Type.INTEGER },
      itemIndex: { type: Type.INTEGER }
    },
    required: ['prompt', 'slideIndex', 'itemIndex'],
  },
};

const App: React.FC = () => {
  const [isPresenting, setIsPresenting] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [state, setState] = useState<SecretaryState>({ isActive: false, transcript: [], suggestions: [] });
  const [briefingData, setBriefingData] = useState<PresentationData | null>(() => {
    const saved = localStorage.getItem('executive_briefing');
    return saved ? JSON.parse(saved) : null;
  });
  const [completedPoints, setCompletedPoints] = useState<Set<string>>(new Set());

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

  useEffect(() => {
    return () => stopSession();
  }, []);

  const handleGenerateImage = async (prompt: string, sIdx: number, iIdx: number) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: `High-end executive visual: ${prompt}` }] },
        config: { imageConfig: { aspectRatio: "16:9" } }
      });
      const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
      if (part?.inlineData) {
        const url = `data:image/png;base64,${part.inlineData.data}`;
        setBriefingData(prev => {
          if (!prev) return null;
          const slides = [...prev.slides];
          if (slides[sIdx]) {
            const items = [...slides[sIdx].items];
            if (items[iIdx]) items[iIdx] = { ...items[iIdx], imageUrl: url };
            slides[sIdx] = { ...slides[sIdx], items };
          }
          return { ...prev, slides };
        });
      }
    } catch (err) { console.error("Image Gen Error:", err); }
  };

  const startSession = async () => {
    if (state.isActive || isStoppingRef.current) return;
    isStoppingRef.current = false;

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      // Mobile Browser requires explicit resume on click
      if (inputCtx.state === 'suspended') await inputCtx.resume();
      if (outputCtx.state === 'suspended') await outputCtx.resume();

      audioContextInRef.current = inputCtx;
      audioContextOutRef.current = outputCtx;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
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
        },
        config: {
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: [updatePresentationTool, generateVisualTool] }, { googleSearch: {} }],
          systemInstruction: "Du bist ein intelligenter Thought-Parser. Strukturiere gesprochene Gedanken live in Projekte und generiere Bilder zur Visualisierung. Antworte immer auf Deutsch."
        }
      });
      sessionRef.current = sessionPromise;
    } catch (err) { 
      console.error("Session Start Error:", err); 
      stopSession();
    }
  };

  const stopSession = () => {
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
  };

  return (
    <div className="h-screen flex bg-[#020617] text-slate-200 overflow-hidden font-sans selection:bg-indigo-500/40 relative">
      {isPresenting && briefingData && <PresentationViewer data={briefingData} onClose={() => setIsPresenting(false)} />}
      
      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-slate-950/80 backdrop-blur-xl border-b border-white/5 z-[60] flex items-center justify-between px-6 pt-safe">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${state.isActive ? 'bg-indigo-500 animate-pulse' : 'bg-slate-700'}`} />
          <span className="font-black text-xs uppercase tracking-tighter">Thought Parser</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-400">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isSidebarOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16m-7 6h7"} /></svg>
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
            className={`w-full p-5 rounded-2xl flex items-center justify-center gap-3 transition-all duration-300 font-bold text-xs uppercase tracking-widest border shadow-lg ${
              state.isActive 
              ? 'bg-red-500/10 text-red-500 border-red-500/20' 
              : 'bg-indigo-600 text-white border-indigo-400/20 shadow-indigo-600/20'
            }`}
          >
            <MicIcon className="w-5 h-5" /> {state.isActive ? 'Stopp' : 'Start Session'}
          </button>

          <button 
            onClick={() => { setIsPresenting(true); setIsSidebarOpen(false); }}
            disabled={!briefingData || state.isActive}
            className="w-full p-5 rounded-2xl border border-white/10 flex items-center justify-center gap-3 hover:bg-white/5 transition-all text-xs font-bold uppercase tracking-widest disabled:opacity-20 group"
          >
            <PresentationIcon className="w-5 h-5 group-hover:scale-110 transition-transform" /> Stage Mode
          </button>

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
            onClick={() => { if(confirm('Board leeren?')) { setBriefingData(null); localStorage.removeItem('executive_briefing'); } }} 
            className="w-full text-slate-600 hover:text-red-400 transition-colors flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest p-2"
          >
            <TrashIcon className="w-3 h-3" /> Reset Board
          </button>
        </div>
      </aside>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div onClick={() => setIsSidebarOpen(false)} className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[65]" />
      )}

      <main className="flex-1 relative bg-[radial-gradient(circle_at_top_right,rgba(30,41,59,0.4),rgba(2,6,23,1))] overflow-hidden pt-16 lg:pt-0">
        <div className="h-full overflow-hidden">
          <LiveBriefingPanel 
            data={briefingData} 
            isLoading={false} 
            completedPoints={completedPoints}
            onTogglePoint={(id) => setCompletedPoints(p => {
              const n = new Set(p);
              n.has(id) ? n.delete(id) : n.add(id);
              return n;
            })}
          />
        </div>
        {!briefingData && !state.isActive && (
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
      `}} />
    </div>
  );
};

export default App;
