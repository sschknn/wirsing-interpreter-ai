
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { BoardItem, BoardCategory, SecretaryState, PresentationData } from './types';
import { MicIcon, TrashIcon, HistoryIcon, CheckIcon, PencilIcon } from './components/Icons';
import { parseThoughts } from './services/geminiService';
import LiveBriefingPanel from './components/LiveBriefingPanel';

// Audio Encoding/Decoding Utilities
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
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

function resample(data: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return data;
  const ratio = fromRate / toRate;
  const newLength = Math.floor(data.length / ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    result[i] = data[Math.floor(i * ratio)];
  }
  return result;
}

const CATEGORIES: BoardCategory[] = [
  'Aufgaben', 'Ideen', 'Probleme', 'Lösungen', 'Entscheidungen', 'Offene Fragen', 'Notizen', 'To-Dos'
];

const updateBoardFunctionDeclaration: FunctionDeclaration = {
  name: 'update_secretary_board',
  parameters: {
    type: Type.OBJECT,
    description: 'Füge eine neue Notiz, Aufgabe oder Information zum strukturierten Board hinzu. Optimiere den Inhalt proaktiv.',
    properties: {
      category: { type: Type.STRING, enum: CATEGORIES },
      content: { type: Type.STRING, description: 'Der strukturierte, bereinigte und ggf. proaktiv erweiterte Inhalt.' }
    },
    required: ['category', 'content'],
  },
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'live' | 'manual'>('live');
  const [state, setState] = useState<SecretaryState>({
    isActive: false,
    transcript: [],
    board: [],
    isThinking: false
  });
  
  const [manualText, setManualText] = useState('');
  const [isParsingManual, setIsParsingManual] = useState(false);
  const [isGeneratingBriefing, setIsGeneratingBriefing] = useState(false);
  const [briefingData, setBriefingData] = useState<PresentationData | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const [volume, setVolume] = useState(0);
  const sessionRef = useRef<any>(null);
  const audioContextInRef = useRef<AudioContext | null>(null);
  const audioContextOutRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const currentInputTranscription = useRef('');
  const currentOutputTranscription = useRef('');

  // Auto-refresh logic for the Live Presentation on the right
  useEffect(() => {
    if (state.board.length === 0) return;
    const timer = setTimeout(() => refreshBriefing(), 2500);
    return () => clearTimeout(timer);
  }, [state.board.length]);

  useEffect(() => {
    const savedBoard = localStorage.getItem('secretary_board');
    if (savedBoard) setState(prev => ({ ...prev, board: JSON.parse(savedBoard) }));
  }, []);

  useEffect(() => {
    localStorage.setItem('secretary_board', JSON.stringify(state.board));
  }, [state.board]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.transcript]);

  const handleManualParse = async () => {
    if (!manualText.trim() || isParsingManual) return;
    setIsParsingManual(true);
    try {
      const data = await parseThoughts(manualText);
      const newItems: BoardItem[] = [];
      data.tasks.forEach(task => {
        newItems.push({
          id: task.id || crypto.randomUUID(),
          category: 'Aufgaben',
          content: `${task.title} (Priorität: ${task.priority})${task.deadline ? ` • Fällig: ${task.deadline}` : ''}`,
          timestamp: Date.now()
        });
      });
      data.projects.forEach(project => {
        newItems.push({
          id: crypto.randomUUID(),
          category: 'Ideen',
          content: `Projekt: ${project.name}\nSchritte: ${project.subtasks.join(', ')}`,
          timestamp: Date.now()
        });
      });
      setState(prev => ({ ...prev, board: [...newItems, ...prev.board] }));
      setManualText('');
      setActiveTab('live');
    } catch (err) {
      console.error(err);
    } finally {
      setIsParsingManual(false);
    }
  };

  const startSession = async () => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 16000});
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
      audioContextInRef.current = inputCtx;
      audioContextOutRef.current = outputCtx;
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              let sum = 0;
              for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
              setVolume(Math.sqrt(sum / inputData.length));
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              sessionPromise.then(session => {
                session.sendRealtimeInput({ 
                  media: { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } 
                });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
            setState(prev => ({ ...prev, isActive: true }));
          },
          onmessage: async (message: LiveServerMessage) => {
            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData && outputCtx) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const buffer = await decodeAudioData(decode(audioData), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outputCtx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              audioSourcesRef.current.add(source);
            }
            if (message.serverContent?.interrupted) {
              audioSourcesRef.current.forEach(s => s.stop());
              audioSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
            if (message.serverContent?.inputTranscription) currentInputTranscription.current += message.serverContent.inputTranscription.text;
            else if (message.serverContent?.outputTranscription) currentOutputTranscription.current += message.serverContent.outputTranscription.text;
            
            if (message.serverContent?.turnComplete) {
              if (currentInputTranscription.current) { addTranscriptEntry('user', currentInputTranscription.current); currentInputTranscription.current = ''; }
              if (currentOutputTranscription.current) { addTranscriptEntry('assistant', currentOutputTranscription.current); currentOutputTranscription.current = ''; }
            }
            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                if (fc.name === 'update_secretary_board') {
                  const { category, content } = fc.args as any;
                  addBoardItem(category, content);
                  sessionPromise.then(s => s.sendToolResponse({ 
                    functionResponses: { id: fc.id, name: fc.name, response: { result: "Bestätigt und strukturiert." } } 
                  }));
                }
              }
            }
          },
          onclose: () => stopSession(),
          onerror: (e) => stopSession()
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          tools: [{ functionDeclarations: [updateBoardFunctionDeclaration] }],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          systemInstruction: `Du bist die intelligente Live-KI-Sekretärin. Dein Modus ist der "Live-World-State".
          
          DEINE AUFGABEN:
          1. Live-Mitschrift: Höre in Echtzeit zu. Entferne Füllwörter und Chaos. Formuliere professionell.
          2. Auto-Strukturierung: Ordne ALLES in Kategorien (Aufgaben, Ideen, Probleme, Entscheidungen).
          3. Proaktives Denken: Wenn der Nutzer eine Idee nennt, baue sie logisch aus. Erstelle Checklisten und Pläne.
          4. Aufgaben-Generator: Wandle alles in klare "Was? Wie? Warum? Bis wann?"-To-Dos um.
          5. Intelligente Optimierung: Markiere Unklarheiten und schlage Verbesserungen vor.
          
          Du arbeitest dauerhaft mit. Nutze 'update_secretary_board' für jede relevante Erkenntnis.`
        }
      });
      sessionRef.current = sessionPromise;
    } catch (err) { console.error(err); }
  };

  const stopSession = () => {
    audioContextInRef.current?.close();
    audioContextOutRef.current?.close();
    sessionRef.current?.then((s: any) => s.close());
    sessionRef.current = null;
    setState(prev => ({ ...prev, isActive: false }));
    setVolume(0);
  };

  const addTranscriptEntry = (role: 'user' | 'assistant', text: string) => {
    setState(prev => ({ ...prev, transcript: [...prev.transcript, { id: crypto.randomUUID(), role, text, timestamp: Date.now() }].slice(-50) }));
  };

  const addBoardItem = (category: BoardCategory, content: string) => {
    setState(prev => ({ ...prev, board: [{ id: crypto.randomUUID(), category, content, timestamp: Date.now() }, ...prev.board] }));
  };

  const startEditing = (id: string, content: string) => { setEditingId(id); setEditValue(content); };
  const saveEdit = () => {
    if (!editingId) return;
    setState(prev => ({ ...prev, board: prev.board.map(item => item.id === editingId ? { ...item, content: editValue } : item) }));
    setEditingId(null);
  };

  const refreshBriefing = async () => {
    if (state.board.length === 0 || isGeneratingBriefing) return;
    setIsGeneratingBriefing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const boardContent = state.board.map(i => `[${i.category}] ${i.content}`).join('\n');
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ text: `Aktualisiere das proaktive Strategie-Briefing basierend auf:\n${boardContent}` }] },
        config: {
          systemInstruction: `Du bist ein Senior-Berater und Sekretär. Erstelle eine Live-Präsentation (Folie).
          
          STRUKTURREGELN FÜR SLIDES:
          - Slide 1: "Executive Summary" - Professionelle Zusammenfassung.
          - Slide 2: "Tasks & Action Items" - MUSS zwei Sektionen haben: "What needs to be done" (sofort) und "Future tasks" (geplant).
          - Slide 3: "Ideas & Vision" - MUSS enthalten: "What would be a good idea" (deine proaktiven Vorschläge und Erweiterungen).
          - Slide 4: "Challenges & Blockers" - Erkannte Probleme und Risiken.
          - Slide 5: "Next Steps & Roadmap".
          
          Verwende klare Unterüberschriften in den Bulletpoints (z.B. "ZUKUNFT: Punkt"). Formuliere alles als ausführbare Strategie.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              subtitle: { type: Type.STRING },
              slides: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ['strategy', 'tasks', 'ideas', 'problems', 'summary'] },
                    points: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ['title', 'type', 'points']
                }
              }
            },
            required: ['title', 'subtitle', 'slides']
          }
        }
      });
      if (response.text) {
        setBriefingData(JSON.parse(response.text) as PresentationData);
      }
    } catch (e) { console.error("Briefing failed", e); }
    finally { setIsGeneratingBriefing(false); }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans flex h-screen overflow-hidden selection:bg-indigo-500/30">
      
      {/* 1. SPALTE: SIDEBAR */}
      <aside className="w-20 lg:w-64 border-r border-white/5 bg-slate-950/50 flex flex-col shrink-0">
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <CheckIcon className="w-6 h-6" />
            </div>
            <div className="hidden lg:block">
              <h1 className="text-lg font-black text-white leading-none">Secretary</h1>
              <span className="text-[10px] font-black uppercase text-indigo-500 tracking-widest">PRO ENGINE</span>
            </div>
          </div>
        </div>
        <nav className="p-4 space-y-2 flex-1">
          <button onClick={() => setActiveTab('live')} className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'live' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30' : 'text-slate-500 hover:bg-white/5'}`}>
            <MicIcon className="w-5 h-5" /> <span className="hidden lg:inline">Live Mode</span>
          </button>
          <button onClick={() => setActiveTab('manual')} className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'manual' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30' : 'text-slate-500 hover:bg-white/5'}`}>
            <HistoryIcon className="w-5 h-5" /> <span className="hidden lg:inline">Input</span>
          </button>
        </nav>
        <div className="p-6 border-t border-white/5">
          <button onClick={state.isActive ? stopSession : startSession} className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all ${state.isActive ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white' : 'bg-white text-black hover:bg-slate-200'}`}>
            {state.isActive ? 'Stop' : 'Start'}
          </button>
        </div>
      </aside>

      {/* 2. SPALTE: WORKSPACE */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-900/10 border-r border-white/5">
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-10 bg-slate-950/20">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Workspace / {activeTab}</h2>
          <button onClick={() => setState(prev => ({...prev, board: []}))} className="p-3 bg-white/5 hover:bg-red-500/20 hover:text-red-400 rounded-xl transition-all border border-white/5">
            <TrashIcon className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Transcript/Input Area */}
          <div className="h-1/2 border-b border-white/5 bg-slate-950/20 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
              {activeTab === 'live' ? (
                <>
                  {state.transcript.map(entry => (
                    <div key={entry.id} className={`flex flex-col ${entry.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2`}>
                      <div className={`max-w-[85%] p-5 rounded-3xl text-sm leading-relaxed border ${entry.role === 'user' ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-100' : 'bg-slate-800/50 border-white/5 text-slate-300'}`}>
                        <span className="text-[10px] font-black uppercase opacity-30 mb-1.5 block">{entry.role === 'user' ? 'Du' : 'KI-Sekretärin'}</span>
                        {entry.text}
                      </div>
                    </div>
                  ))}
                  <div ref={transcriptEndRef} />
                </>
              ) : (
                <div className="h-full flex flex-col gap-5">
                  <textarea value={manualText} onChange={e => setManualText(e.target.value)} placeholder="Schreibe hier deine Gedanken..." className="flex-1 bg-white/5 border border-white/10 rounded-3xl p-6 text-slate-200 outline-none focus:ring-1 ring-indigo-500/50 transition-all resize-none text-sm leading-relaxed" />
                  <button onClick={handleManualParse} disabled={isParsingManual || !manualText.trim()} className="py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em]">
                    {isParsingManual ? 'Analyse...' : 'Strukturieren'}
                  </button>
                </div>
              )}
            </div>
            {/* Visualizer */}
            <div className="h-1 bg-white/5">
              <div className="h-full bg-indigo-500 transition-all duration-75 shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{ width: `${Math.min(volume * 800, 100)}%` }}></div>
            </div>
          </div>

          {/* Board Area */}
          <div className="flex-1 overflow-y-auto p-10 bg-slate-950/30 custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-12">
               {CATEGORIES.map(cat => {
                 const items = state.board.filter(i => i.category === cat);
                 if (items.length === 0) return null;
                 return (
                   <section key={cat} className="animate-in fade-in slide-in-from-bottom-4">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6 flex items-center gap-4">
                        {cat} <div className="h-px bg-white/5 flex-1"></div>
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {items.map(item => (
                          <div key={item.id} className={`group bg-slate-900/40 border border-white/5 p-5 rounded-[2rem] hover:bg-slate-900/70 transition-all relative ${editingId === item.id ? 'ring-2 ring-indigo-500 bg-slate-900' : 'hover:border-indigo-500/30'}`}>
                             <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                <button onClick={() => startEditing(item.id, item.content)} className="p-2 hover:bg-white/10 rounded-xl text-slate-500 transition-all"><PencilIcon className="w-4 h-4" /></button>
                                <button onClick={() => setState(p => ({...p, board: p.board.filter(i => i.id !== item.id)}))} className="p-2 hover:bg-red-500/20 hover:text-red-400 rounded-xl transition-all"><TrashIcon className="w-4 h-4" /></button>
                             </div>
                             {editingId === item.id ? (
                               <textarea autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={saveEdit} onKeyDown={e => { if(e.key === 'Enter' && (e.ctrlKey || e.metaKey)) saveEdit(); }} className="w-full bg-transparent text-sm font-medium outline-none resize-none leading-relaxed min-h-[80px]" />
                             ) : (
                               <p className="text-sm font-medium text-slate-300 pr-12 leading-relaxed whitespace-pre-wrap">{item.content}</p>
                             )}
                          </div>
                        ))}
                      </div>
                   </section>
                 )
               })}
            </div>
          </div>
        </div>
      </main>

      {/* 3. SPALTE: LIVE PRESENTATION */}
      <aside className="w-[450px] 2xl:w-[550px] shrink-0 h-full flex flex-col shadow-2xl z-10">
        <LiveBriefingPanel data={briefingData} isLoading={isGeneratingBriefing} />
      </aside>

      {/* Listening Indicator */}
      {state.isActive && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-10 py-4 rounded-full shadow-[0_10px_40px_rgba(79,70,229,0.5)] flex items-center gap-4 animate-bounce z-[100] border border-white/20">
           <div className="w-3 h-3 bg-white rounded-full animate-pulse shadow-[0_0_10px_white]"></div>
           <span className="text-xs font-black uppercase tracking-[0.3em]">Listening Mode Active</span>
        </div>
      )}
    </div>
  );
};

export default App;
