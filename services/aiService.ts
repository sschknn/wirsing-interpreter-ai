import { GoogleGenAI, Type, LiveServerMessage, Modality, FunctionDeclaration } from "@google/genai";
import { ParsedData, PresentationData, Slide, SlideItem } from "../types";

// ============================================================================
// ERWEITERTE TYPES FÜR PRÄSENTATIONS-KI
// ============================================================================

export interface BriefingData {
  id: string;
  title: string;
  subtitle: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PresentationInput {
  title: string;
  subtitle?: string;
  content: string;
  targetAudience?: string;
  presentationStyle?: 'professional' | 'creative' | 'technical' | 'executive';
  language?: 'de' | 'en';
  includeImages?: boolean;
  maxSlides?: number;
}

export interface SlideContent {
  title: string;
  content: string[];
  bulletPoints?: string[];
  notes?: string;
  imageSuggestions?: string[];
  layout: 'title' | 'content' | 'comparison' | 'list' | 'gallery' | 'summary';
}

export interface OptimizedLayout {
  slideOrder: number[];
  suggestedTransitions: string[];
  visualHierarchy: Record<string, 'primary' | 'secondary' | 'tertiary'>;
  colorScheme?: string;
  fontSuggestions?: string[];
}

export type SlideType = 'strategy' | 'tasks' | 'ideas' | 'problems' | 'summary' | 'suggestions' | 'custom' | 'gallery' | 'title' | 'content';

// ============================================================================
// KONSOLIDIERTER KI-SERVICE
// ============================================================================

export class AIService {
  private static readonly MODEL_STABLE = 'gemini-2.0-flash-exp';
  private static readonly MODEL_LIVE = 'gemini-2.5-flash-native-audio-preview-09-2025';
  private static readonly MODEL_IMAGE = 'gemini-2.5-flash-image';
  
  private static cache = new Map<string, { data: any; timestamp: number }>();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 Minuten

  /**
   * Hilfsmethode für einheitliches Caching
   */
  private static getCacheKey(operation: string, params: any): string {
    return `${operation}_${JSON.stringify(params)}`;
  }

  private static getCachedResult<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private static setCachedResult<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Hilfsmethode für einheitliche Fehlerbehandlung
   */
  private static handleError(error: any, operation: string): never {
    console.error(`KI-Service Fehler (${operation}):`, error);
    
    // Spezifische Fehlerbehandlung für verschiedene API-Fehlertypen
    if (error.message?.includes('API_KEY') || error.message?.includes('leaked')) {
      throw new Error('API-Schlüssel ist ungültig oder wurde als kompromittiert gemeldet. Bitte verwenden Sie einen neuen API-Schlüssel.');
    }
    
    if (error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED') || error.message?.includes('429')) {
      throw new Error('API-Quota überschritten. Bitte warten Sie eine Stunde und versuchen Sie es erneut.');
    }
    
    if (error.message?.includes('network') || error.message?.includes('fetch')) {
      throw new Error('Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung');
    }
    
    if (error.message?.includes('permission') || error.message?.includes('403')) {
      throw new Error('API-Berechtigung verweigert. Überprüfen Sie Ihren API-Schlüssel und Ihre Berechtigungen.');
    }
    
    // Fallback für unbekannte Fehler
    const errorMessage = error?.error?.message || error.message || 'Unbekannter KI-Service Fehler';
    throw new Error(`KI-Service Fehler bei ${operation}: ${errorMessage}`);
  }

  /**
   * Hilfsmethode für einheitliche GoogleGenAI-Instanz
   */
  private static getAIInstance(): GoogleGenAI {
    // Browser-Environment: Verwende import.meta.env anstatt process.env
    const apiKey = import.meta.env.VITE_API_KEY || process.env.API_KEY;
    
    if (!apiKey || apiKey === 'your_google_gemini_api_key_here') {
      throw new Error('VITE_API_KEY ist nicht in den Umgebungsvariablen gesetzt oder ist ein Demo-Platzhalter. Bitte .env Datei mit VITE_API_KEY=ihr_echter_schlüssel erstellen');
    }
    return new GoogleGenAI({ apiKey });
  }

  // ============================================================================
  // BESTEHENDE METHODEN (VERBESSERT)
  // ============================================================================

  /**
   * Aktualisiert das Briefing mit strukturierten Audio-Daten
   */
  static async updateBriefing(audioData: ArrayBuffer): Promise<BriefingData> {
    const cacheKey = this.getCacheKey('updateBriefing', { audioSize: audioData.byteLength });
    const cached = this.getCachedResult<BriefingData>(cacheKey);
    if (cached) return cached;

    try {
      const ai = this.getAIInstance();
      // Hier würde normalerweise Audio-Transkription stattfinden
      // Für jetzt simulieren wir die Verarbeitung
      const response = await ai.models.generateContent({
        model: this.MODEL_STABLE,
        contents: { parts: [{ text: 'Verarbeite Audio-Daten zu strukturiertem Briefing-Format auf Deutsch' }] },
        config: {
          systemInstruction: `Du bist ein Experte für die Verarbeitung von Audio-Briefings.
          Strukturiere gesprochene Inhalte in professionelle, deutsche Geschäftstexte.
          Format: JSON mit title, subtitle, content, createdAt, updatedAt.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              subtitle: { type: Type.STRING },
              content: { type: Type.STRING },
              createdAt: { type: Type.STRING },
              updatedAt: { type: Type.STRING }
            },
            required: ["title", "subtitle", "content"]
          }
        }
      });

      const result = JSON.parse(response.text!) as BriefingData;
      this.setCachedResult(cacheKey, result);
      return result;
    } catch (error) {
      this.handleError(error, 'updateBriefing');
    }
  }

  /**
   * Generiert visuelle Inhalte für Folien (mit Fallback)
   */
  static async generateVisual(content: string): Promise<string> {
    const cacheKey = this.getCacheKey('generateVisual', { content });
    const cached = this.getCachedResult<string>(cacheKey);
    if (cached) return cached;

    try {
      const ai = this.getAIInstance();
      const response = await ai.models.generateContent({
        model: this.MODEL_IMAGE,
        contents: { parts: [{ text: `High-end professionelles Visual für: ${content}` }] },
        config: { 
          imageConfig: { aspectRatio: "16:9" },
          systemInstruction: 'Erstelle professionelle, geschäftsorientierte Visualisierungen auf Deutsch'
        }
      });

      const parts = response.candidates?.[0]?.content?.parts;
      if (parts) {
        const part = parts.find(p => p.inlineData);
        if (part?.inlineData?.data) {
          const imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          this.setCachedResult(cacheKey, imageUrl);
          return imageUrl;
        }
      }
      
      throw new Error('Kein Bild in der KI-Antwort gefunden');
    } catch (error) {
      // Fallback: Generiere ein Platzhalter-Bild mit CSS-Gradient
      console.warn('KI-Bildgenerierung fehlgeschlagen, verwende Fallback:', error);
      const fallbackImageUrl = this.generateFallbackVisual(content);
      this.setCachedResult(cacheKey, fallbackImageUrl);
      return fallbackImageUrl;
    }
  }

  /**
   * Fallback-Visualisierung mit CSS-Gradient
   */
  private static generateFallbackVisual(content: string): string {
    // Generiere einen farbigen Gradient basierend auf dem Inhalt
    const colors = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
    ];
    
    const colorIndex = content.length % colors.length;
    const gradient = colors[colorIndex];
    
    // Erstelle ein SVG mit Gradient als Fallback
    const svg = `
      <svg width="400" height="225" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="400" height="225" fill="url(#grad1)"/>
        <text x="200" y="112" font-family="Arial" font-size="16" fill="white" text-anchor="middle" opacity="0.8">
          ${content.substring(0, 30)}${content.length > 30 ? '...' : ''}
        </text>
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  /**
   * Parst Gedanken zu strukturierten Daten (Verbessert)
   */
  static async parseThoughts(rawText: string): Promise<ParsedData> {
    const cacheKey = this.getCacheKey('parseThoughts', { rawText });
    const cached = this.getCachedResult<ParsedData>(cacheKey);
    if (cached) return cached;

    try {
      const ai = this.getAIInstance();
      
      const response = await ai.models.generateContent({
        model: this.MODEL_STABLE,
        contents: { parts: [{ text: `Analysiere und strukturiere diesen Gedankenstrom für ein Executive Board auf Deutsch: ${rawText}` }] },
        config: {
          systemInstruction: `Du bist der ultimative Thought-Parser für Führungskräfte.
          Wandle chaotische Ideen in professionelle Projekte, Aufgaben und Listen um.
          Verwende deutsche Geschäftssprache und strukturiere nach Prioritäten.
          Antworte strikt im JSON-Format.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              tasks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    title: { type: Type.STRING },
                    category: { type: Type.STRING },
                    priority: { type: Type.STRING, enum: ["hoch", "mittel", "niedrig"] },
                    completed: { type: Type.BOOLEAN }
                  },
                  required: ["id", "title", "category", "priority", "completed"]
                }
              },
              projects: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    subtasks: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ["name", "subtasks"]
                }
              },
              lists: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    type: { type: Type.STRING },
                    items: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ["title", "type", "items"]
                }
              },
              summary: { type: Type.STRING }
            },
            required: ["tasks", "projects", "lists", "summary"]
          }
        }
      });

      const result = JSON.parse(response.text!) as ParsedData;
      this.setCachedResult(cacheKey, result);
      return result;
    } catch (error) {
      this.handleError(error, 'parseThoughts');
    }
  }

  // ============================================================================
  // NEUE ERWEITERTE PRÄSENTATIONS-KI METHODEN
  // ============================================================================

  /**
   * Erstellt eine vollständige Präsentation aus Input-Daten
   */
  static async createPresentation(input: PresentationInput): Promise<PresentationData> {
    const cacheKey = this.getCacheKey('createPresentation', input);
    const cached = this.getCachedResult<PresentationData>(cacheKey);
    if (cached) return cached;

    try {
      const ai = this.getAIInstance();
      
      const response = await ai.models.generateContent({
        model: this.MODEL_STABLE,
        contents: { parts: [{ text: `Erstelle eine professionelle Präsentation für: ${input.title}` }] },
        config: {
          systemInstruction: `Du bist ein Experte für professionelle deutsche Präsentationserstellung.
          Erstelle strukturierte, visuell ansprechende Präsentationen für Führungskräfte.
          
          Eingabe: ${JSON.stringify(input)}
          
          Erstelle eine vollständige Präsentation mit:
          - Einem aussagekräftigen Titel und Untertitel
          - Logisch strukturierten Folien (Intro, Hauptpunkte, Zusammenfassung)
          - Professionellen deutschen Formulierungen
          - Klaren Bullet Points und Listen
          - Passenden Folien-Typen (strategy, tasks, ideas, problems, summary, etc.)
          
          Antworte im JSON-Format für PresentationData.`,
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
                    type: { type: Type.STRING, enum: ['strategy', 'tasks', 'ideas', 'problems', 'summary', 'suggestions', 'custom', 'gallery'] },
                    items: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          text: { type: Type.STRING },
                          subItems: { type: Type.ARRAY, items: { type: Type.STRING } },
                          category: { type: Type.STRING },
                          priority: { type: Type.STRING, enum: ["hoch", "mittel", "niedrig"] },
                          imageUrl: { type: Type.STRING }
                        },
                        required: ["text"]
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
                        },
                        required: ["title", "description"]
                      }
                    }
                  },
                  required: ["title", "type", "items"]
                }
              }
            },
            required: ["title", "subtitle", "slides"]
          }
        }
      });

      const result = JSON.parse(response.text!) as PresentationData;
      this.setCachedResult(cacheKey, result);
      return result;
    } catch (error) {
      this.handleError(error, 'createPresentation');
    }
  }

  /**
   * Verbessert eine spezifische Folie basierend auf Verbesserungsvorschlägen
   */
  static async improveSlide(slideId: string, suggestions: string): Promise<Slide> {
    const cacheKey = this.getCacheKey('improveSlide', { slideId, suggestions });
    const cached = this.getCachedResult<Slide>(cacheKey);
    if (cached) return cached;

    try {
      const ai = this.getAIInstance();
      
      const response = await ai.models.generateContent({
        model: this.MODEL_STABLE,
        contents: { parts: [{ text: `Verbessere die Folie ${slideId} basierend auf: ${suggestions}` }] },
        config: {
          systemInstruction: `Du bist ein Experte für die Optimierung von Präsentationsfolien.
          Verbessere die Folie basierend auf den gegebenen Vorschlägen.
          Verwende professionelle deutsche Geschäftssprache.
          Antworte im JSON-Format für Slide.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              type: { type: Type.STRING, enum: ['strategy', 'tasks', 'ideas', 'problems', 'summary', 'suggestions', 'custom', 'gallery'] },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.STRING },
                    subItems: { type: Type.ARRAY, items: { type: Type.STRING } },
                    category: { type: Type.STRING },
                    priority: { type: Type.STRING, enum: ["hoch", "mittel", "niedrig"] },
                    imageUrl: { type: Type.STRING }
                  },
                  required: ["text"]
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
                  },
                  required: ["title", "description"]
                }
              }
            },
            required: ["title", "type", "items"]
          }
        }
      });

      const result = JSON.parse(response.text!) as Slide;
      this.setCachedResult(cacheKey, result);
      return result;
    } catch (error) {
      this.handleError(error, 'improveSlide');
    }
  }

  /**
   * Generiert Inhalte für eine neue Folie basierend auf Thema und Typ
   */
  static async generateSlideContent(topic: string, slideType: SlideType): Promise<SlideContent> {
    const cacheKey = this.getCacheKey('generateSlideContent', { topic, slideType });
    const cached = this.getCachedResult<SlideContent>(cacheKey);
    if (cached) return cached;

    try {
      const ai = this.getAIInstance();
      
      const response = await ai.models.generateContent({
        model: this.MODEL_STABLE,
        contents: { parts: [{ text: `Generiere Inhalt für ${slideType}-Folie zum Thema: ${topic}` }] },
        config: {
          systemInstruction: `Du erstellst professionelle Folien-Inhalte auf Deutsch.
          Generiere strukturierte, geschäftsorientierte Inhalte für die gegebene Folie.
          Verwende professionelle deutsche Formulierungen und logische Strukturierung.
          Antworte im JSON-Format für SlideContent.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              content: { type: Type.ARRAY, items: { type: Type.STRING } },
              bulletPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
              notes: { type: Type.STRING },
              imageSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
              layout: { type: Type.STRING, enum: ['title', 'content', 'comparison', 'list', 'gallery', 'summary'] }
            },
            required: ["title", "content", "layout"]
          }
        }
      });

      const result = JSON.parse(response.text!) as SlideContent;
      this.setCachedResult(cacheKey, result);
      return result;
    } catch (error) {
      this.handleError(error, 'generateSlideContent');
    }
  }

  /**
   * Optimiert das Layout einer gesamten Präsentation
   */
  static async optimizeLayout(slides: Slide[]): Promise<OptimizedLayout> {
    // Defensive Programmierung: slides Array validieren
    if (!Array.isArray(slides)) {
      console.warn('optimizeLayout: slides ist kein Array, verwende leeres Array');
      slides = [];
    }
    
    const cacheKey = this.getCacheKey('optimizeLayout', { slideCount: slides.length });
    const cached = this.getCachedResult<OptimizedLayout>(cacheKey);
    if (cached) return cached;

    try {
      const ai = this.getAIInstance();
      
      const response = await ai.models.generateContent({
        model: this.MODEL_STABLE,
        contents: { parts: [{ text: `Optimiere das Layout für ${slides.length} Folien` }] },
        config: {
          systemInstruction: `Du bist ein Experte für Präsentations-Layout-Optimierung.
          Analysiere die gegebenen Folien und erstelle eine optimale Anordnung.
          Berücksichtige Logik, Flow und visuelle Hierarchie.
          Antworte im JSON-Format für OptimizedLayout.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              slideOrder: { type: Type.ARRAY, items: { type: Type.INTEGER } },
              suggestedTransitions: { type: Type.ARRAY, items: { type: Type.STRING } },
              visualHierarchy: { type: Type.OBJECT },
              colorScheme: { type: Type.STRING },
              fontSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["slideOrder", "suggestedTransitions", "visualHierarchy"]
          }
        }
      });

      const result = JSON.parse(response.text!) as OptimizedLayout;
      this.setCachedResult(cacheKey, result);
      return result;
    } catch (error) {
      this.handleError(error, 'optimizeLayout');
    }
  }

  /**
   * Fügt automatisch passende Bilder zu Folien hinzu
   */
  static async addImagesToSlides(slides: Slide[]): Promise<Slide[]> {
    try {
      // Defensive Programmierung: slides Array validieren
      if (!Array.isArray(slides)) {
        console.warn('addImagesToSlides: slides ist kein Array, returning leeres Array');
        return [];
      }
      
      const enhancedSlides: Slide[] = [];
      
      for (const slide of slides) {
        const enhancedSlide = { ...slide };
        
        // Füge Bilder zu Items hinzu, die noch keine haben
        for (let i = 0; i < enhancedSlide.items.length; i++) {
          const item = enhancedSlide.items[i];
          if (item && !item.imageUrl && item.text) {
            try {
              const imageUrl = await this.generateVisual(item.text);
              enhancedSlide.items[i] = { ...item, imageUrl };
            } catch (error) {
              console.warn(`Bildgenerierung für Item ${i} in Folie "${slide.title}" fehlgeschlagen:`, error);
            }
          }
        }
        
        enhancedSlides.push(enhancedSlide);
      }
      
      return enhancedSlides;
    } catch (error) {
      this.handleError(error, 'addImagesToSlides');
    }
  }

  /**
   * Live-Session Verbindung für Echtzeit-KI-Interaktion
   */
  static async connectLiveSession(
    callbacks: {
      onopen?: () => void;
      onmessage: (msg: LiveServerMessage) => void;
      onerror?: (error: any) => void;
      onclose?: () => void;
    }
  ): Promise<any> {
    try {
      const ai = this.getAIInstance();
      
      const session = await ai.live.connect({
        model: this.MODEL_LIVE,
        callbacks,
        config: {
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: [
            this.updatePresentationTool,
            this.generateVisualTool
          ] }, { googleSearch: {} }],
          systemInstruction: "Du bist ein intelligenter Thought-Parser für deutsche Führungskräfte. Strukturiere gesprochene Gedanken live in Projekte und generiere Bilder zur Visualisierung. Antworte immer auf Deutsch mit professioneller Geschäftssprache."
        }
      });
      
      return session;
    } catch (error) {
      this.handleError(error, 'connectLiveSession');
    }
  }

  // ============================================================================
  // TOOL DECLARATIONS FÜR LIVE-SESSIONS
  // ============================================================================

  private static updatePresentationTool: FunctionDeclaration = {
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

  private static generateVisualTool: FunctionDeclaration = {
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

  // ============================================================================
  // HILFSMETHODEN
  // ============================================================================

  /**
   * Leert den Cache
   */
  static clearCache(): void {
    this.cache.clear();
  }

  /**
   * Gibt Cache-Statistiken zurück
   */
  static getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Validiert Eingabedaten für Präsentationserstellung
   */
  static validatePresentationInput(input: PresentationInput): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!input.title?.trim()) {
      errors.push('Titel ist erforderlich');
    }
    
    if (!input.content?.trim()) {
      errors.push('Inhalt ist erforderlich');
    }
    
    if (input.maxSlides && (input.maxSlides < 1 || input.maxSlides > 50)) {
      errors.push('Anzahl der Folien muss zwischen 1 und 50 liegen');
    }
    
    if (input.targetAudience && input.targetAudience.length > 200) {
      errors.push('Zielgruppe darf nicht länger als 200 Zeichen sein');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Sanitisiert Text für sichere Ausgabe
   */
  static sanitizeText(text: string): string {
    return text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .trim();
  }
}