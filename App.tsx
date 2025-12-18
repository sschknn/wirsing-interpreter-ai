
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { BoardItem, BoardCategory, TranscriptEntry, SecretaryState, PresentationData } from './types';
import { MicIcon, TrashIcon, HistoryIcon, CheckIcon, CopyIcon, PencilIcon, PresentationIcon, PlayIcon } from './components/Icons';
import { parseThoughts } from './services/geminiService';
import PresentationViewer from './components/PresentationViewer';

// Audio Utilities for PCM Streaming
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

// Simple resampler for input audio compatibility
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
    description: 'Füge eine neue Notiz, Aufgabe oder Information zum strukturierten Board hinzu.',
    properties: {
      category: { type: Type.STRING, enum: CATEGORIES },
      content: { type: Type.STRING }
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
  
  // Manual Input State
  const [manualText, setManualText] = useState('');
  const [isDraftSaved, setIsDraftSaved] = useState(false);
  const [isParsingManual, setIsParsingManual] = useState(false);
  
  // Presentation State
  const [isGeneratingPresentation, setIsGeneratingPresentation] = useState(false);
  const [presentationData, setPresentationData] = useState<PresentationData | null>(null);

  // Edit State for Board Items
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Audio Refs
  const [volume, setVolume] = useState(0);
  const sessionRef = useRef<any>(null);
  const audioContextInRef = useRef<AudioContext | null>(null);
  const audioContextOutRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const currentInputTranscription = useRef('');
  const currentOutputTranscription = useRef('');

  // Persistance
  useEffect(() => {
    const savedBoard = localStorage.getItem('secretary_board');
    if (savedBoard) setState(prev => ({ ...prev, board: JSON.parse(savedBoard) }));
    
    const savedDraft = localStorage.getItem('thought_draft_text');
    if (savedDraft) setManualText(savedDraft);
  }, []);

  useEffect(() => {
    localStorage.setItem('secretary_board', JSON.stringify(state.board));
  }, [state.board]);

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('thought_draft_text', manualText);
      setIsDraftSaved(!!manualText.trim());
      if (manualText.trim()) setTimeout(() => setIsDraftSaved(false), 2000);
    }, 1000);
    return () => clearTimeout(timer);
  }, [manualText]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.transcript]);

  // Session Control
  const startSession = async () => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextInRef.current = inputCtx;
      audioContextOutRef.current = outputCtx;
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const rawData = e.inputBuffer.getChannelData(0);
              const inputData = resample(rawData, inputCtx.sampleRate, 16000);
              let sum = 0;
              for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
              setVolume(Math.sqrt(sum / inputData.length));
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                int16[i] = inputData[i] * 32768;
              }
              sessionPromise.then(session => {
                session.sendRealtimeInput({ 
                  media: { 
                    data: encode(new Uint8Array(int16.buffer)), 
                    mimeType: 'audio/pcm;rate=16000' 
                  } 
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
              source.onended = () => audioSourcesRef.current.delete(source);
            }
            if (message.serverContent?.interrupted) {
              audioSourcesRef.current.forEach(s => s.stop());
              audioSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
            if (message.serverContent?.inputTranscription) {
              currentInputTranscription.current += message.serverContent.inputTranscription.text;
            } else if (message.serverContent?.outputTranscription) {
              currentOutputTranscription.current += message.serverContent.outputTranscription.text;
            }
            if (message.serverContent?.turnComplete) {
              if (currentInputTranscription.current) {
                addTranscriptEntry('user', currentInputTranscription.current);
                currentInputTranscription.current = '';
              }
              if (currentOutputTranscription.current) {
                addTranscriptEntry('assistant', currentOutputTranscription.current);
                currentOutputTranscription.current = '';
              }
            }
            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                if (fc.name === 'update_secretary_board') {
                  const { category, content } = fc.args as any;
                  addBoardItem(category, content);
                  sessionPromise.then(s => s.sendToolResponse({ 
                    functionResponses: { id: fc.id, name: fc.name, response: { result: "Noted" } } 
                  }));
                }
              }
            }
          },
          onclose: () => stopSession(),
          onerror: (e) => { console.error(e); stopSession(); }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          tools: [{ functionDeclarations: [updateBoardFunctionDeclaration] }],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          systemInstruction: `Du bist eine Live-KI-Sprachsekretärin. Höre zu und strukturiere ALLES.
          Nutze 'update_secretary_board' für Ideen, Aufgaben etc. Bestätige kurz mit deiner Stimme.`
        }
      });
      sessionRef.current = sessionPromise;
    } catch (err) { 
      console.error(err);
      alert('Start der Session fehlgeschlagen. Bitte prüfen Sie Ihr Mikrophon.'); 
    }
  };

  const stopSession = () => {
    audioContextInRef.current?.close();
    audioContextOutRef.current?.close();
    sessionRef.current?.then((s: any) => s.close());
    sessionRef.current = null;
    setState(prev => ({ ...prev, isActive: false }));
    setVolume(0);
  };

  // Logic Helpers
  const addTranscriptEntry = (role: 'user' | 'assistant', text: string) => {
    setState(prev => ({
      ...prev,
      transcript: [...prev.transcript, { id: crypto.randomUUID(), role, text, timestamp: Date.now() }].slice(-50)
    }));
  };

  const addBoardItem = (category: BoardCategory, content: string) => {
    setState(prev => ({
      ...prev,
      board: [{ id: crypto.randomUUID(), category, content, timestamp: Date.now() }, ...prev.board]
    }));
  };

  const startEditing = (id: string, content: string) => {
    setEditingId(id);
    setEditValue(content);
  };

  const saveEdit = () => {
    if (!editingId) return;
    setState(prev => ({
      ...prev,
      board: prev.board.map(item => item.id === editingId ? { ...item, content: editValue } : item)
    }));
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleManualParse = async () => {
    if (!manualText.trim()) return;
    setIsParsingManual(true);
    try {
      const result = await parseThoughts(manualText);
      const newBoardItems: BoardItem[] = [];
      result.tasks.forEach(t => newBoardItems.push({ id: t.id, category: 'Aufgaben', content: t.title, timestamp: Date.now() }));
      result.lists.forEach(l => l.items.forEach(item => newBoardItems.push({ id: crypto.randomUUID(), category: 'Ideen', content: `${l.title}: ${item}`, timestamp: Date.now() })));
      
      setState(prev => ({ ...prev, board: [...newBoardItems, ...prev.board] }));
      setManualText('');
      localStorage.removeItem('thought_draft_text');
      setActiveTab('live');
    } catch (e) { alert('Analyse fehlgeschlagen'); }
    finally { setIsParsingManual(false); }
  };

  const generatePresentation = async () => {
    if (state.board.length === 0) {
      alert("Fügen Sie erst einige Punkte zum Board hinzu.");
      return;
    }
    setIsGeneratingPresentation(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const boardContent = state.board.map(i => `[${i.category}] ${i.content}`).join('\n');
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ text: `Erstelle eine professionelle Präsentation aus diesen Board-Daten:\n${boardContent}` }] },
        config: {
          systemInstruction: `Du bist ein Strategieberater. Erstelle eine packende PowerPoint-Präsentation.
          Strukturiere die Slides wie folgt:
          Slide 1: Executive Summary & Vision.
          Slide 2: Akute To-Dos & Was sofort getan werden muss.
          Slide 3: Zukünftige Aufgaben & Langfristige Planung.
          Slide 4: Innovative Ideen & Visionäre Vorschläge (Was wäre eine gute Idee?).
          Slide 5: Aktuelle Probleme & Hürden.
          Slide 6: Finale Roadmap & Nächste Schritte.`,
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
      
      const data = JSON.parse(response.text) as PresentationData;
      setPresentationData(data);
    } catch (e) {
      console.error(e);
      alert("Präsentationserstellung fehlgeschlagen.");
    } finally {
      setIsGeneratingPresentation(false);
    }
  };

  const copyBoardAsMarkdown = () => {
    const md = CATEGORIES.map(cat => {
      const items = state.board.filter(i => i.category === cat);
      if (items.length === 0) return '';
      return `## ${cat}\n${items.map(i => `- ${i.content}`).join('\n')}\n`;
    }).join('\n');
    navigator.clipboard.writeText(md);
    alert('Kopiert!');
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans flex h-screen overflow-hidden selection:bg-indigo-500/30">
      
      {presentationData && (
        <PresentationViewer data={presentationData} onClose={() => setPresentationData(null)} />
      )}

      <aside className="w-80 border-r border-white/5 bg-slate-950/50 flex flex-col shrink-0">
        <div className="p-6 border-b border-white/5">
          <h1 className="text-xl font-black text-white tracking-tighter flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center">
              <CheckIcon className="w-5 h-5" />
            </div>
            Secretary<span className="text-indigo-500">Pro</span>
          </h1>
        </div>

        <nav className="p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('live')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all ${activeTab === 'live' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:bg-white/5'}`}
          >
            <MicIcon className="w-4 h-4" /> Live Secretary
          </button>
          <button 
            onClick={() => setActiveTab('manual')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all ${activeTab === 'manual' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:bg-white/5'}`}
          >
            <HistoryIcon className="w-4 h-4" /> Manual Entry
          </button>
        </nav>

        <div className="p-4 border-t border-white/5 space-y-3">
           <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-2">Insights</div>
           <button 
            disabled={isGeneratingPresentation || state.board.length === 0}
            onClick={generatePresentation}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all border border-indigo-500/20 hover:bg-indigo-600/10 text-indigo-400 group disabled:opacity-30`}
          >
            <PresentationIcon className="w-4 h-4 group-hover:scale-110 transition-transform" /> 
            {isGeneratingPresentation ? 'Generiere...' : 'Präsentation Live'}
          </button>
        </div>

        <div className="mt-auto p-4 border-t border-white/5">
           <div className="bg-slate-900/50 rounded-2xl p-4 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${state.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`}></div>
                <span className="text-[10px] font-black uppercase text-slate-500">Status: {state.isActive ? 'Active' : 'Standby'}</span>
              </div>
              <button 
                onClick={state.isActive ? stopSession : startSession}
                className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all ${state.isActive ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white' : 'bg-white text-black hover:bg-slate-200'}`}
              >
                {state.isActive ? 'Beenden' : 'Starten'}
              </button>
           </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-slate-950/20">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">
            {activeTab === 'live' ? 'Live Session Workspace' : 'Manual Thought Input'}
          </h2>
          <div className="flex gap-2">
            <button onClick={copyBoardAsMarkdown} title="Als Markdown kopieren" className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all"><CopyIcon className="w-4 h-4" /></button>
            <button onClick={() => setState(prev => ({...prev, board: []}))} title="Board leeren" className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all"><TrashIcon className="w-4 h-4" /></button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <div className="w-[450px] border-r border-white/5 flex flex-col bg-slate-950/30">
            {activeTab === 'live' ? (
              <>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {state.transcript.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center px-10 gap-4 opacity-20">
                      <MicIcon className="w-12 h-12" />
                      <p className="text-xs font-bold uppercase tracking-widest">Sprechen Sie einfach los.<br/>Ich strukturiere Ihre Gedanken live.</p>
                    </div>
                  )}
                  {state.transcript.map(entry => (
                    <div key={entry.id} className={`flex flex-col ${entry.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2`}>
                       <div className={`max-w-[90%] p-4 rounded-2xl text-sm leading-relaxed border ${entry.role === 'user' ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-100' : 'bg-slate-800/50 border-white/5 text-slate-300'}`}>
                         <span className="text-[10px] font-black uppercase opacity-40 mb-1 block">{entry.role === 'user' ? 'Du' : 'Sekretärin'}</span>
                         {entry.text}
                       </div>
                    </div>
                  ))}
                  <div ref={transcriptEndRef} />
                </div>
                <div className="h-32 border-t border-white/5 bg-slate-950 p-6 flex items-center justify-center gap-1">
                   {[...Array(24)].map((_, i) => (
                     <div 
                      key={i} 
                      className="w-1.5 bg-indigo-500/40 rounded-full transition-all duration-75"
                      style={{ height: `${Math.random() * (volume * 150) + 10}%` }}
                     />
                   ))}
                </div>
              </>
            ) : (
              <div className="p-8 flex flex-col h-full gap-6">
                 <div className="flex-1 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black uppercase text-slate-500">Draft Editor</label>
                      {isDraftSaved && <span className="text-[10px] font-bold text-emerald-500 animate-pulse">Auto-saved</span>}
                    </div>
                    <textarea 
                      value={manualText}
                      onChange={e => setManualText(e.target.value)}
                      placeholder="Gedanken hier eintragen..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-3xl p-6 text-slate-200 outline-none focus:ring-2 ring-indigo-500/20 transition-all resize-none font-medium leading-relaxed"
                    />
                 </div>
                 <button 
                  onClick={handleManualParse}
                  disabled={isParsingManual || !manualText.trim()}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-900/40 transition-all"
                 >
                   {isParsingManual ? 'Strukturieren...' : 'Analysieren'}
                 </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-900/10 p-10">
            <div className="max-w-4xl mx-auto space-y-12">
               {CATEGORIES.map(cat => {
                 const items = state.board.filter(i => i.category === cat);
                 if (items.length === 0) return null;
                 return (
                   <section key={cat} className="animate-in fade-in slide-in-from-right-4">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-6 flex items-center gap-4">
                        {cat}
                        <div className="flex-1 h-px bg-white/5"></div>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {items.map(item => (
                          <div key={item.id} className={`group bg-slate-950/50 border border-white/5 p-5 rounded-3xl hover:bg-slate-900/50 transition-all relative ${editingId === item.id ? 'ring-2 ring-indigo-500 border-transparent bg-slate-900' : 'hover:border-indigo-500/40'}`}>
                            
                            <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {editingId === item.id ? (
                                <>
                                  <button onClick={saveEdit} className="p-1.5 bg-emerald-500/20 text-emerald-500 rounded-lg hover:bg-emerald-500 hover:text-white transition-all">
                                    <CheckIcon className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={cancelEdit} className="p-1.5 bg-slate-500/20 text-slate-400 rounded-lg hover:bg-slate-500 hover:text-white transition-all">
                                    <TrashIcon className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => startEditing(item.id, item.content)} className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg hover:bg-indigo-500 hover:text-white transition-all">
                                    <PencilIcon className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => setState(prev => ({ ...prev, board: prev.board.filter(i => i.id !== item.id) }))} className="p-1.5 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all">
                                    <TrashIcon className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>

                            {editingId === item.id ? (
                              <textarea
                                autoFocus
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveEdit();
                                  if (e.key === 'Escape') cancelEdit();
                                }}
                                className="w-full bg-transparent text-sm font-medium leading-relaxed outline-none resize-none pr-8 min-h-[60px]"
                              />
                            ) : (
                              <p 
                                onDoubleClick={() => startEditing(item.id, item.content)}
                                className="text-sm font-medium leading-relaxed pr-6"
                              >
                                {item.content}
                              </p>
                            )}

                            <span className="text-[10px] text-slate-600 mt-3 block">{new Date(item.timestamp).toLocaleTimeString()}</span>
                          </div>
                        ))}
                      </div>
                   </section>
                 )
               })}
               
               {state.board.length === 0 && (
                 <div className="h-[60vh] flex flex-col items-center justify-center opacity-10 text-center gap-6">
                    <CheckIcon className="w-32 h-32" />
                    <p className="text-2xl font-black italic tracking-tight">Dein Board ist leer.</p>
                 </div>
               )}
            </div>
          </div>
        </div>
      </main>

      {state.isActive && (
        <div className="fixed bottom-8 right-8 bg-indigo-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-bounce z-50">
           <div className="w-2 h-2 bg-white rounded-full"></div>
           <span className="text-xs font-black uppercase tracking-widest">Listening</span>
        </div>
      )}
    </div>
  );
};

export default App;
