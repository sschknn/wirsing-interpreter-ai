
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { PresentationData, SecretaryState, SmartSuggestion, SlideItem } from './types';
import { MicIcon, SparklesIcon, CheckIcon, PresentationIcon, HistoryIcon, TrashIcon } from './components/Icons';
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
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
}

function resample(data: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return data;
  const ratio = fromRate / toRate;
  const result = new Float32Array(Math.floor(data.length / ratio));
  for (let i = 0; i < result.length; i++) result[i] = data[Math.floor(i * ratio)];
  return result;
}

const updatePresentationTool: FunctionDeclaration = {
  name: 'update_live_presentation',
  parameters: {
    type: Type.OBJECT,
    description: 'Aktualisiere das Live Executive Briefing basierend auf den Gedanken und Aufgaben des Nutzers.',
    properties: {
      title: { type: Type.STRING, description: 'Der Hauptfokus oder Titel des aktuellen Briefings.' },
      subtitle: { type: Type.STRING, description: 'Zeitraum oder Status-Update.' },
      slides: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Kategorie oder Projektname.' },
            type: { type: Type.STRING, enum: ['strategy', 'tasks', 'ideas', 'problems', 'summary', 'suggestions', 'custom'] },
            items: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING, description: 'Hauptpunkt oder Hauptaufgabe.' },
                  subItems: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Unteraufgaben oder Details (optional).' },
                  category: { type: Type.STRING, description: 'Spezifische Kategorie zur farblichen Hervorhebung (optional).' }
                },
                required: ['text']
              }
            },
            insights: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  sourceUrl: { type: Type.STRING }
                }
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

const smartSuggestionTool: FunctionDeclaration = {
  name: 'provide_smart_suggestion',
  parameters: {
    type: Type.OBJECT,
    description: 'Biete eine proaktive intelligente Empfehlung oder Rückfrage an.',
    properties: {
      text: { type: Type.STRING, description: 'Die Empfehlung oder Frage an den Nutzer.' },
      type: { type: Type.STRING, enum: ['clarification', 'insight', 'action'], description: 'Art der Empfehlung.' },
      reason: { type: Type.STRING, description: 'Warum diese Empfehlung gerade relevant ist.' }
    },
    required: ['text', 'type', 'reason'],
  },
};

const App: React.FC = () => {
  const [isCreativeMode, setIsCreativeMode] = useState(false);
  const [isPresenting, setIsPresenting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [state, setState] = useState<SecretaryState>(() => {
    const saved = localStorage.getItem('secretary_state');
    return saved ? JSON.parse(saved) : { isActive: false, transcript: [], board: [], suggestions: [], isThinking: false };
  });
  
  const [briefingData, setBriefingData] = useState<PresentationData | null>(() => {
    const saved = localStorage.getItem('briefing_data');
    return saved ? JSON.parse(saved) : null;
  });

  const [completedPoints, setCompletedPoints] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('completed_points');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const [showCelebration, setShowCelebration] = useState(false);
  const [volume, setVolume] = useState(0);

  const sessionRef = useRef<any>(null);
  const audioContextInRef = useRef<AudioContext | null>(null);
  const audioContextOutRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const currentInputTranscription = useRef('');
  const currentOutputTranscription = useRef('');

  useEffect(() => {
    localStorage.setItem('secretary_state', JSON.stringify({ ...state, isActive: false }));
  }, [state.transcript, state.suggestions]);

  useEffect(() => {
    localStorage.setItem('briefing_data', JSON.stringify(briefingData));
  }, [briefingData]);

  useEffect(() => {
    localStorage.setItem('completed_points', JSON.stringify(Array.from(completedPoints)));
  }, [completedPoints]);

  const resetData = () => {
    if (confirm("Möchten Sie alle aktuellen Daten löschen?")) {
      setState({ isActive: false, transcript: [], board: [], suggestions: [], isThinking: false });
      setBriefingData(null);
      setCompletedPoints(new Set());
      localStorage.clear();
    }
  };

  const triggerCelebration = () => {
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 2000);
  };

  const handleTogglePoint = (pointId: string) => {
    setCompletedPoints(prev => {
      const next = new Set(prev);
      if (next.has(pointId)) {
        next.delete(pointId);
      } else {
        next.add(pointId);
        triggerCelebration();
      }
      return next;
    });
  };

  const handleUpdateTask = (slideIdx: number, itemIdx: number, updatedItem: SlideItem) => {
    if (!briefingData) return;
    const newData = { ...briefingData };
    const newSlides = [...newData.slides];
    const slide = newSlides[slideIdx];
    if (!slide) return;
    
    const newItems = [...(slide.items || [])];
    newItems[itemIdx] = updatedItem;
    newSlides[slideIdx] = { ...slide, items: newItems };
    newData.slides = newSlides;
    setBriefingData(newData);
  };

  const refineText = async (text: string): Promise<string> => {
    if (!text.trim() || text.length < 5) return text;
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ text: `Original: "${text}"` }] },
        config: { 
          systemInstruction: `Du bist ein hochpräziser linguistischer Editor für transkribierte Sprache im Geschäftskontext.
          Aufgaben:
          1. Entferne strikt Füllwörter und Partikel (ähm, äh, halt, sozusagen, quasi, einfach, eigentlich, irgendwie, mal, ja, gut, jetzt, genau).
          2. Bereinige Satzabbrüche und Wortwiederholungen.
          3. Maximiere Klarheit und Lesbarkeit.
          4. Verwandle Gedanken in flüssige deutsche Sätze.
          5. Antworte AUSSCHLIESSLICH mit dem bereinigten Text.`,
          thinkingConfig: { thinkingBudget: 0 }
        }
      });
      return response.text?.trim() || text;
    } catch (e) { return text; }
  };

  const startSession = async (modeOverride?: boolean) => {
    setErrorMsg(null);
    const activeMode = modeOverride !== undefined ? modeOverride : isCreativeMode;
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (inputCtx.state === 'suspended') await inputCtx.resume();
      if (outputCtx.state === 'suspended') await outputCtx.resume();

      audioContextInRef.current = inputCtx;
      audioContextOutRef.current = outputCtx;
      
      const passiveInstruction = `Du bist die 'Silent Executive Assistant'. Du sprichst NIEMALS. Nutze Tool-Calls 'update_live_presentation' und 'provide_smart_suggestion'. Gruppiere Aufgaben hierarchisch. Aktualisiere das Board kontinuierlich.`;
      const creativeInstruction = `Du bist die 'Creative Brainstorming Engine'. Sei aktiv, sprich mit dem Nutzer. Nutze 'provide_smart_suggestion', um das Gespräch zu lenken. Nutze Tool-Calls für das Board parallel zum Gespräch.`;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;
            scriptProcessor.onaudioprocess = (e) => {
              if (inputCtx.state === 'closed') return;
              const inputData = resample(e.inputBuffer.getChannelData(0), inputCtx.sampleRate, 16000);
              let sum = 0;
              for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
              setVolume(Math.sqrt(sum / inputData.length));
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              sessionPromise.then(s => s.sendRealtimeInput({ media: { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
            setState(prev => ({ ...prev, isActive: true }));
          },
          onmessage: async (msg: LiveServerMessage) => {
            const audioData = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData && outputCtx && outputCtx.state !== 'closed') {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const buffer = await decodeAudioData(decode(audioData), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outputCtx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              audioSourcesRef.current.add(source);
            }

            if (msg.serverContent?.inputTranscription) {
              currentInputTranscription.current += msg.serverContent.inputTranscription.text;
            } else if (msg.serverContent?.outputTranscription) {
              currentOutputTranscription.current += msg.serverContent.outputTranscription.text;
            }

            if (msg.serverContent?.turnComplete) {
              const rawInput = currentInputTranscription.current;
              const output = currentOutputTranscription.current;
              currentInputTranscription.current = '';
              currentOutputTranscription.current = '';

              if (rawInput) {
                const refinedInput = await refineText(rawInput);
                setState(prev => ({
                  ...prev, transcript: [...prev.transcript, { id: crypto.randomUUID(), role: 'user', text: refinedInput, timestamp: Date.now() }]
                }));
              }
              if (output) {
                setState(prev => ({
                  ...prev, transcript: [...prev.transcript, { id: crypto.randomUUID(), role: 'assistant', text: output, timestamp: Date.now() }]
                }));
              }
            }

            if (msg.toolCall) {
              for (const fc of msg.toolCall.functionCalls) {
                if (fc.name === 'update_live_presentation') {
                  setBriefingData(fc.args as any as PresentationData);
                  sessionPromise.then(s => s.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result: "Briefing aktualisiert." } } }));
                } else if (fc.name === 'provide_smart_suggestion') {
                  const sugg = { ...fc.args, id: crypto.randomUUID(), timestamp: Date.now() } as SmartSuggestion;
                  setState(prev => ({ ...prev, suggestions: [sugg, ...prev.suggestions].slice(0, 10) }));
                  sessionPromise.then(s => s.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result: "Empfehlung empfangen." } } }));
                }
              }
            }
          },
          onerror: (e) => {
            console.error("Live API Error:", e);
            setErrorMsg("Verbindungsfehler zur KI. Bitte erneut versuchen.");
            stopSession();
          },
          onclose: () => stopSession()
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          tools: [
            { functionDeclarations: [updatePresentationTool, smartSuggestionTool] }
          ],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          systemInstruction: activeMode ? creativeInstruction : passiveInstruction
        }
      });
      sessionRef.current = sessionPromise;
    } catch (err) { 
      console.error(err); 
      setErrorMsg("Kamera oder Mikrofon Zugriff verweigert.");
    }
  };

  const stopSession = () => {
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (audioContextInRef.current && audioContextInRef.current.state !== 'closed') {
      audioContextInRef.current.close().catch(console.error);
    }
    if (audioContextOutRef.current && audioContextOutRef.current.state !== 'closed') {
      audioContextOutRef.current.close().catch(console.error);
    }
    sessionRef.current?.then((s: any) => {
        try { s.close(); } catch(e) {}
    });
    audioSourcesRef.current.forEach(source => {
      try { source.stop(); } catch(e) {}
    });
    audioSourcesRef.current.clear();
    setState(prev => ({ ...prev, isActive: false }));
    setVolume(0);
    nextStartTimeRef.current = 0;
  };

  const toggleCreativeMode = () => {
    const wasActive = state.isActive;
    if (wasActive) stopSession();
    setIsCreativeMode(!isCreativeMode);
    if (wasActive) setTimeout(() => startSession(!isCreativeMode), 300);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans flex h-screen overflow-hidden relative">
      
      {isPresenting && briefingData && (
        <PresentationViewer data={briefingData} onClose={() => setIsPresenting(false)} />
      )}

      {showCelebration && (
        <div className="fixed inset-0 pointer-events-none z-[200] flex items-center justify-center overflow-hidden">
          {[...Array(24)].map((_, i) => (
            <div 
              key={i} 
              className="absolute w-2 h-2 rounded-full animate-celebration-particle" 
              style={{
                backgroundColor: ['#6366f1', '#a855f7', '#10b981', '#f59e0b', '#ec4899'][i % 5],
                left: '50%',
                top: '50%',
                '--tx': `${(Math.random() - 0.5) * 800}px`,
                '--ty': `${(Math.random() - 0.5) * 800}px`,
                animationDelay: `${Math.random() * 0.3}s`
              } as any}
            />
          ))}
        </div>
      )}

      {/* SIDEBAR */}
      <aside className="w-20 lg:w-80 border-r border-white/5 bg-slate-950/50 backdrop-blur-3xl flex flex-col shrink-0 z-50 transition-all duration-300">
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-500 ${state.isActive ? 'bg-indigo-600 shadow-indigo-600/40 animate-pulse' : 'bg-slate-800'}`}>
              <CheckIcon className="w-6 h-6 text-white" />
            </div>
            <div className="hidden lg:block overflow-hidden whitespace-nowrap">
              <h1 className="text-lg font-black text-white leading-tight tracking-tighter">AI Secretary</h1>
              <p className="text-[9px] font-bold uppercase text-indigo-500 tracking-[0.2em]">Live Briefing</p>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 space-y-6 overflow-y-auto custom-scrollbar">
          {errorMsg && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-[11px] text-red-400 font-bold leading-relaxed">
              {errorMsg}
            </div>
          )}

          <div className="space-y-2">
            <span className="hidden lg:block text-[10px] font-black text-slate-600 uppercase tracking-widest px-4 mb-2">Workspace</span>
            
            <button 
              onClick={state.isActive ? stopSession : () => startSession()} 
              className={`w-full group relative overflow-hidden p-4 rounded-2xl transition-all flex items-center justify-center gap-3 ${
                state.isActive 
                ? 'bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20' 
                : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-xl shadow-indigo-600/20'
              }`}
            >
              <MicIcon className={`w-5 h-5 ${state.isActive ? 'animate-bounce' : ''}`} />
              <span className="hidden lg:inline font-bold text-xs uppercase tracking-widest">{state.isActive ? 'Stop' : 'Start Recording'}</span>
            </button>

            <button 
              onClick={() => setIsPresenting(true)} 
              disabled={!briefingData}
              className={`w-full p-4 rounded-2xl transition-all flex items-center justify-center gap-3 border ${
                briefingData ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-transparent border-white/5 text-slate-700 cursor-not-allowed'
              }`}
            >
              <PresentationIcon className="w-5 h-5" />
              <span className="hidden lg:inline font-bold text-xs uppercase tracking-widest">Stage Mode</span>
            </button>

            <button 
              onClick={toggleCreativeMode} 
              className={`w-full p-4 rounded-2xl transition-all flex items-center justify-center gap-3 border ${
                isCreativeMode 
                ? 'bg-purple-600/20 border-purple-500/50 text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.1)]' 
                : 'bg-white/5 border-transparent text-slate-500 hover:bg-white/10'
              }`}
            >
              <SparklesIcon className="w-5 h-5" />
              <span className="hidden lg:inline font-bold text-xs uppercase tracking-widest">Creative Mode</span>
            </button>
          </div>

          {/* Smart Suggestions Panel */}
          <div className="hidden lg:block pt-4 border-t border-white/5 space-y-4">
             <div className="flex items-center justify-between px-4">
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Smart Actions</span>
                {state.suggestions.length > 0 && <span className="text-[9px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded-full font-bold">{state.suggestions.length}</span>}
             </div>
             <div className="space-y-3 px-2">
                {state.suggestions.map(s => (
                  <div key={s.id} className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 animate-in slide-in-from-right-4 duration-500">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${s.type === 'action' ? 'bg-emerald-500' : s.type === 'insight' ? 'bg-indigo-500' : 'bg-amber-500'}`} />
                      <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">{s.type}</span>
                    </div>
                    <p className="text-xs font-bold text-white mb-1 leading-relaxed">{s.text}</p>
                    <p className="text-[10px] text-slate-500 italic">{s.reason}</p>
                  </div>
                ))}
                {state.suggestions.length === 0 && (
                  <div className="px-4 py-8 text-center border-2 border-dashed border-white/5 rounded-2xl opacity-20">
                    <SparklesIcon className="w-6 h-6 mx-auto mb-2" />
                    <p className="text-[9px] font-black uppercase tracking-widest leading-loose">Passive Analyse läuft...</p>
                  </div>
                )}
             </div>
          </div>

          <div className="hidden lg:block pt-4 border-t border-white/5 space-y-4">
             <div className="flex items-center justify-between px-4">
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Verlauf</span>
                <button onClick={resetData} className="p-1 text-slate-600 hover:text-red-400 transition-colors">
                  <TrashIcon className="w-3.5 h-3.5" />
                </button>
             </div>
             <div className="space-y-3 px-2">
                {state.transcript.slice(-3).reverse().map(t => (
                  <div key={t.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[10px] leading-relaxed text-slate-400">
                    <span className={`font-black uppercase tracking-wider ${t.role === 'user' ? 'text-indigo-400' : 'text-purple-400'}`}>
                      {t.role}:
                    </span> {t.text}
                  </div>
                ))}
             </div>
          </div>
        </div>

        <div className="p-6 border-t border-white/5 text-center hidden lg:block">
           <p className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.3em]">AI V2.5 Native Engine</p>
        </div>
      </aside>

      {/* EXECUTIVE BRIEFING STAGE */}
      <main className="flex-1 relative overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(30,41,59,1),rgba(2,6,23,1))]">
        <LiveBriefingPanel 
          data={briefingData} 
          isLoading={false} 
          completedPoints={completedPoints} 
          onTogglePoint={handleTogglePoint}
          onUpdateTask={handleUpdateTask}
        />

        {!state.isActive && !briefingData && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12 animate-in fade-in duration-1000">
             <div className="w-40 h-40 bg-indigo-600/10 rounded-full flex items-center justify-center mb-10 border border-indigo-500/20 relative group">
               <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full group-hover:blur-3xl transition-all"></div>
               <MicIcon className="w-16 h-16 text-indigo-400 opacity-60 relative z-10" />
             </div>
             <h2 className="text-5xl lg:text-7xl font-black text-white tracking-tighter mb-6">Brainstorming & Briefing.</h2>
             <p className="text-slate-500 font-medium max-w-lg text-lg lg:text-xl leading-relaxed">
               Ihre Stimme wird automatisch in Projekte, Aufgaben und Strategien übersetzt. Drücken Sie Start, um zu beginnen.
             </p>
          </div>
        )}

        {state.isActive && (
          <div className={`fixed bottom-10 right-10 px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-4 border border-white/10 backdrop-blur-3xl z-[100] transition-all duration-500 ${isCreativeMode ? 'bg-purple-600/40 border-purple