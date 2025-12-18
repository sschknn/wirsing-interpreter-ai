
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { PresentationData, Slide } from '../types';
import { MicIcon, PlayIcon } from './Icons';

interface PresentationViewerProps {
  data: PresentationData;
  onClose: () => void;
}

// Audio Utilities duplicated here for standalone use in viewer if needed
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

const PresentationViewer: React.FC<PresentationViewerProps> = ({ data, onClose }) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') next();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      stopSpeaking();
    };
  }, [currentSlideIndex]);

  const stopSpeaking = () => {
    if (currentSourceRef.current) {
      currentSourceRef.current.stop();
      currentSourceRef.current = null;
    }
    setIsSpeaking(false);
  };

  const speakSlide = async () => {
    if (isSpeaking) {
      stopSpeaking();
      return;
    }

    setIsSpeaking(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let textToSpeak = "";
      
      if (currentSlideIndex === 0) {
        textToSpeak = `Willkommen zur Präsentation: ${data.title}. ${data.subtitle}`;
      } else {
        const slide = data.slides[currentSlideIndex - 1];
        textToSpeak = `Slide ${currentSlideIndex}: ${slide.title}. Hier sind die wichtigsten Punkte: ${slide.points.join(". ")}`;
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Trage diesen Text professionell und motivierend vor: ${textToSpeak}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (audioData) {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const ctx = audioContextRef.current;
        const buffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.onended = () => setIsSpeaking(false);
        currentSourceRef.current = source;
        source.start();
      }
    } catch (e) {
      console.error(e);
      setIsSpeaking(false);
    }
  };

  const next = () => {
    stopSpeaking();
    if (currentSlideIndex < data.slides.length) setCurrentSlideIndex(prev => prev + 1);
  };

  const prev = () => {
    stopSpeaking();
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
             Live AI Briefing Mode
          </div>
        </div>
      );
    }

    const slide = data.slides[currentSlideIndex - 1];
    return (
      <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-12 duration-500">
        <header className="mb-12">
           <span className="text-xs font-black uppercase tracking-[0.3em] text-indigo-500 mb-2 block">
             Slide {currentSlideIndex} / {data.slides.length} • {slide.type}
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
      {/* Dynamic Glows */}
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
          onClick={speakSlide}
          className={`p-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all ${isSpeaking ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
        >
          {isSpeaking ? (
            <>
              <div className="flex gap-0.5">
                <div className="w-1 h-3 bg-white animate-bounce"></div>
                <div className="w-1 h-3 bg-white animate-bounce [animation-delay:0.1s]"></div>
                <div className="w-1 h-3 bg-white animate-bounce [animation-delay:0.2s]"></div>
              </div>
              Stop Narrator
            </>
          ) : (
            <>
              <PlayIcon className="w-4 h-4" />
              AI Voice-Over
            </>
          )}
        </button>
        <button 
          onClick={onClose}
          className="px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-slate-500 hover:text-white transition-all text-xs font-black uppercase tracking-widest flex items-center gap-3 group"
        >
          Close <span className="opacity-40 group-hover:opacity-100">ESC</span>
        </button>
      </div>

      <div className="flex-1 max-w-7xl mx-auto w-full relative">
        {renderSlide()}
      </div>

      <footer className="mt-12 flex