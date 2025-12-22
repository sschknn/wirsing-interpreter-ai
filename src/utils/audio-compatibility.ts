/**
 * Audio Compatibility Layer - Moderne Implementierung
 * Verwendet AudioWorkletNode als primäre Lösung
 * Entfernt veraltete ScriptProcessorNode-Implementierung
 */

interface AudioWorkletMessage {
  type: 'audioData';
  payload: Float32Array;
}

export class AudioCompatibilityLayer {
  private audioContext: AudioContext | null = null;
  private audioWorkletNode: AudioWorkletNode | null = null;
  private workletURL: string | null = null;
  private isInitialized: boolean = false;

  constructor() {
    this.initializeAudioContext();
  }

  private initializeAudioContext(): void {
    try {
      // AudioContext erstellen mit Fallback
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();

      // AudioContext-Zustand überwachen
      this.monitorAudioContextState();
      
      // AudioWorklet initialisieren (nur moderne Browser)
      if (this.isAudioWorkletSupported()) {
        this.initializeAudioWorklet();
      } else {
        this.handleUnsupportedAudioWorklet();
      }
    } catch (error) {
      console.error('Audio-Kontext-Initialisierung fehlgeschlagen:', error);
    }
  }

  private isAudioWorkletSupported(): boolean {
    return !!(
      this.audioContext?.audioWorklet &&
      typeof this.audioContext.audioWorklet.addModule === 'function'
    );
  }

  private async initializeAudioWorklet(): Promise<void> {
    try {
      if (!this.audioContext) return;

      console.log('🔧 AudioWorklet wird initialisiert...');

      // Moderne AudioWorklet-Implementierung
      const workletCode = `
        class ModernAudioProcessor extends AudioWorkletProcessor {
          constructor() {
            super();
            this.bufferSize = 4096;
            this.isProcessing = false;
          }

          process(inputs, outputs, parameters) {
            const input = inputs[0];
            const output = outputs[0];
            
            if (input.length > 0 && output.length > 0) {
              // Effiziente Audio-Datenverarbeitung
              const inputChannel = input[0];
              const outputChannel = output[0];
              
              if (inputChannel && outputChannel) {
                // Direkte Kopie für beste Performance
                outputChannel.set(inputChannel);
              }
            }
            
            return true;
          }
        }
        
        registerProcessor('modern-audio-processor', ModernAudioProcessor);
      `;

      // Blob-URL erstellen und korrekt verwalten
      const blob = new Blob([workletCode], { type: 'application/javascript' });
      this.workletURL = URL.createObjectURL(blob);

      // AudioWorklet-Modul laden
      await this.audioContext.audioWorklet.addModule(this.workletURL);
      
      // AudioWorkletNode erstellen
      this.audioWorkletNode = new AudioWorkletNode(this.audioContext, 'modern-audio-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1]
      });

      // Event-Handler für AudioWorklet-Nachrichten
      this.audioWorkletNode.port.onmessage = (event: MessageEvent) => {
        const message = event.data as AudioWorkletMessage;
        if (message.type === 'audioData') {
          // Audio-Daten verarbeiten
          this.processAudioData(message.payload);
        }
      };

      this.isInitialized = true;
      console.log('✅ AudioWorklet erfolgreich initialisiert - Moderne Audio-API aktiv');

    } catch (error) {
      console.error('❌ AudioWorklet-Initialisierung fehlgeschlagen:', error);
      this.handleUnsupportedAudioWorklet();
    }
  }

  private handleUnsupportedAudioWorklet(): void {
    console.warn('⚠️ AudioWorklet wird nicht unterstützt. Fallback: Native Web Audio API');
    
    // Für sehr alte Browser: Alternative Verarbeitung ohne ScriptProcessor
    // In modernen Browsern sollte AudioWorklet immer verfügbar sein
    if (this.audioContext) {
      // Einfacher Gain-Node als Alternative
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = 1.0;
      this.audioWorkletNode = gainNode as any; // Type casting für Kompatibilität
      this.isInitialized = true;
    }
  }

  private processAudioData(audioData: Float32Array | null): void {
    // Audio-Daten verarbeiten (kann erweitert werden)
    if (!audioData || audioData.length === 0) {
      console.warn('Keine Audio-Daten zum Verarbeiten erhalten');
      return;
    }

    try {
      // Beispiel: Audio-Daten normalisieren
      const audioArray = Array.from(audioData);
      const maxValue = Math.max(...audioArray);
      if (maxValue > 1.0) {
        for (let i = 0; i < audioData.length; i++) {
          const currentValue = audioData[i];
          if (typeof currentValue === 'number') {
            audioData[i] = currentValue / maxValue;
          }
        }
      }
    } catch (error) {
      console.warn('Audio-Datenverarbeitung fehlgeschlagen:', error);
    }
  }

  private monitorAudioContextState(): void {
    if (!this.audioContext) return;

    this.audioContext.addEventListener('statechange', () => {
      console.log('AudioContext-Zustand:', this.audioContext?.state);
      
      if (this.audioContext?.state === 'suspended') {
        // AudioContext wurde suspendiert - Benutzerinteraktion erforderlich
        console.log('AudioContext ist suspendiert - Benutzerinteraktion erforderlich');
      }
    });
  }

  public connect(source: AudioNode): AudioNode | null {
    if (!this.audioContext || !this.isInitialized) {
      console.warn('Audio-Kontext nicht verfügbar');
      return null;
    }

    try {
      if (this.audioWorkletNode) {
        // Moderne AudioWorklet-Verbindung
        source.connect(this.audioWorkletNode);
        this.audioWorkletNode.connect(this.audioContext.destination);
        return this.audioWorkletNode;
      }
    } catch (error) {
      console.error('Audio-Verbindung fehlgeschlagen:', error);
    }
    
    return null;
  }

  public disconnect(): void {
    try {
      if (this.audioWorkletNode) {
        this.audioWorkletNode.disconnect();
        this.audioWorkletNode = null;
      }
    } catch (error) {
      console.warn('Audio-Trennung fehlgeschlagen:', error);
    }
  }

  public getCurrentNode(): AudioNode | null {
    return this.audioWorkletNode || null;
  }

  public isUsingModernAPI(): boolean {
    return this.audioWorkletNode !== null && this.isInitialized;
  }

  public async resumeAudioContext(): Promise<boolean> {
    if (!this.audioContext) return false;

    try {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
        console.log('AudioContext erfolgreich wieder aufgenommen');
        return true;
      }
      return true;
    } catch (error) {
      console.error('AudioContext-Wiederaufnahme fehlgeschlagen:', error);
      return false;
    }
  }

  public getAudioContextState(): AudioContextState {
    return this.audioContext?.state || 'closed';
  }

  public cleanup(): void {
    try {
      // Audio-Verbindungen trennen
      this.disconnect();

      // Blob-URLs bereinigen
      if (this.workletURL) {
        URL.revokeObjectURL(this.workletURL);
        this.workletURL = null;
      }

      // AudioContext schließen
      if (this.audioContext && this.audioContext.state !== 'closed') {
        this.audioContext.close();
        this.audioContext = null;
      }

      this.isInitialized = false;
      console.log('🧹 Audio-Kompatibilitäts-Layer bereinigt');
    } catch (error) {
      console.warn('Cleanup-Fehler:', error);
    }
  }
}

/**
 * Globale Audio-Kompatibilitäts-Funktionen
 */
export const AudioCompatibilityUtils = {
  /**
   * Prüft AudioWorklet-Unterstützung
   */
  isAudioWorkletSupported(): boolean {
    return !!(
      window.AudioContext?.prototype?.audioWorklet ||
      (window as any).webkitAudioContext?.prototype?.audioWorklet
    );
  },

  /**
   * Prüft Web Audio API-Unterstützung
   */
  isWebAudioSupported(): boolean {
    return !!(
      window.AudioContext ||
      (window as any).webkitAudioContext
    );
  },

  /**
   * Erstellt optimalen Audio-Kontext
   */
  createOptimalAudioContext(): AudioContext | null {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      return new AudioContextClass({
        latencyHint: 'interactive', // Optimiert für niedrige Latenz
        sampleRate: 44100 // Standard-Sample-Rate
      });
    } catch (error) {
      console.error('Optimaler Audio-Kontext konnte nicht erstellt werden:', error);
      return null;
    }
  }
};

/**
 * Globaler Audio-Kompatibilitäts-Layer
 */
let globalAudioCompatibility: AudioCompatibilityLayer | null = null;

export const getGlobalAudioCompatibility = (): AudioCompatibilityLayer => {
  if (!globalAudioCompatibility) {
    globalAudioCompatibility = new AudioCompatibilityLayer();
  }
  return globalAudioCompatibility;
};

export const initializeAudioCompatibility = (): AudioCompatibilityLayer => {
  return getGlobalAudioCompatibility();
};

// Automatische Initialisierung beim Import (optional)
// initializeAudioCompatibility();