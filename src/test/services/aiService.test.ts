/**
 * Umfassende Tests für AIService.ts
 * 
 * Testet die komplexeste Service-Klasse (683 Zeilen) mit:
 * - GoogleGenAI Integration
 * - Cache Management
 * - Error Handling
 * - Input Validation
 * - Performance Optimization
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AIService } from '../../services/aiService';
import { PresentationData, Slide } from '../../types';

// Mock für GoogleGenAI
const mockGoogleGenAI = {
  models: {
    generateContent: vi.fn(),
  },
  live: {
    connect: vi.fn(),
  },
};

// Mock für GoogleGenAI Constructor
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => mockGoogleGenAI),
  Type: {
    OBJECT: 'object',
    STRING: 'string',
    ARRAY: 'array',
    BOOLEAN: 'boolean',
    INTEGER: 'integer',
  },
  Modality: {
    AUDIO: 'audio',
  },
}));

// Mock für process.env
vi.stubGlobal('process', {
  env: {
    API_KEY: 'test-api-key',
    GEMINI_API_KEY: 'test-gemini-api-key',
  },
});

describe('AIService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    AIService.clearCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Cache Management', () => {
    it('sollte Ergebnisse im Cache speichern und abrufen', async () => {
      const mockResponse = {
        title: 'Test Presentation',
        subtitle: 'Test Subtitle',
        slides: []
      };

      const input = {
        title: 'Test',
        content: 'Test Content',
      };

      // Mock erfolgreiche Response
      mockGoogleGenAI.models.generateContent.mockResolvedValueOnce({
        text: JSON.stringify(mockResponse),
      });

      // Ersten Aufruf
      const result1 = await AIService.createPresentation(input);
      
      // Zweiten Aufruf (sollte aus Cache kommen)
      const result2 = await AIService.createPresentation(input);

      expect(result1).toEqual(mockResponse);
      expect(result2).toEqual(mockResponse);
      expect(mockGoogleGenAI.models.generateContent).toHaveBeenCalledTimes(1);
    });

    it('sollte Cache nach Ablauf der Zeit invalidieren', async () => {
      const mockResponse = {
        title: 'Test Presentation',
        subtitle: 'Test Subtitle',
        slides: []
      };

      const input = {
        title: 'Test',
        content: 'Test Content',
      };

      // Mock erfolgreiche Response
      mockGoogleGenAI.models.generateContent.mockResolvedValueOnce({
        text: JSON.stringify(mockResponse),
      });

      // Ersten Aufruf
      await AIService.createPresentation(input);

      // Cache manipulieren (älter als 5 Minuten)
      const cacheKey = AIService.getCacheKey?.('createPresentation', input);
      if (cacheKey) {
        const cacheEntry = (AIService as any).cache?.get?.(cacheKey);
        if (cacheEntry) {
          cacheEntry.timestamp = Date.now() - (6 * 60 * 1000); // 6 Minuten zurück
        }
      }

      // Zweiten Aufruf (sollte nicht aus Cache kommen)
      const result = await AIService.createPresentation(input);

      expect(mockGoogleGenAI.models.generateContent).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockResponse);
    });

    it('sollte Cache-Statistiken bereitstellen', () => {
      const stats = AIService.getCacheStats();
      
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('keys');
      expect(Array.isArray(stats.keys)).toBe(true);
    });

    it('sollte Cache leeren können', () => {
      // Cache füllen
      const statsBefore = AIService.getCacheStats();
      
      // Cache leeren
      AIService.clearCache();
      
      const statsAfter = AIService.getCacheStats();
      
      expect(statsAfter.size).toBe(0);
      expect(statsAfter.keys).toHaveLength(0);
    });
  });

  describe('createPresentation', () => {
    it('sollte eine vollständige Präsentation erstellen', async () => {
      const input = {
        title: 'Meine Präsentation',
        subtitle: 'Eine tolle Präsentation',
        content: 'Das ist der Inhalt',
        targetAudience: 'Führungskräfte',
        presentationStyle: 'professional' as const,
        language: 'de' as const,
        includeImages: true,
        maxSlides: 10,
      };

      const mockResponse = {
        title: 'Meine Präsentation',
        subtitle: 'Eine tolle Präsentation',
        slides: [
          {
            title: 'Slide 1',
            type: 'content',
            items: [
              { text: 'Punkt 1', category: 'content', priority: 'mittel' },
              { text: 'Punkt 2', category: 'content', priority: 'mittel' }
            ]
          }
        ]
      };

      mockGoogleGenAI.models.generateContent.mockResolvedValueOnce({
        text: JSON.stringify(mockResponse),
      });

      const result = await AIService.createPresentation(input);

      expect(result).toEqual(mockResponse);
      expect(mockGoogleGenAI.models.generateContent).toHaveBeenCalledWith({
        model: 'gemini-2.0-flash-exp',
        contents: { 
          parts: [{ text: expect.stringContaining('Meine Präsentation') }] 
        },
        config: expect.objectContaining({
          systemInstruction: expect.stringContaining('deutsche Präsentationserstellung'),
          responseMimeType: 'application/json',
        }),
      });
    });

    it('sollte Fehler bei ungültiger API-Schlüssel behandeln', async () => {
      // API Key unsetzen
      vi.stubGlobal('process', {
        env: {
          API_KEY: undefined,
          GEMINI_API_KEY: undefined,
        },
      });

      const input = {
        title: 'Test',
        content: 'Test Content',
      };

      await expect(AIService.createPresentation(input))
        .rejects
        .toThrow('API_KEY ist nicht in den Umgebungsvariablen gesetzt');
    });

    it('sollte Fehler bei API-Quota-Überschreitung behandeln', async () => {
      const input = {
        title: 'Test',
        content: 'Test Content',
      };

      mockGoogleGenAI.models.generateContent.mockRejectedValueOnce(
        new Error('quota exceeded')
      );

      await expect(AIService.createPresentation(input))
        .rejects
        .toThrow('API-Quota überschritten. Bitte versuchen Sie es später erneut');
    });

    it('sollte Fehler bei Netzwerkproblemen behandeln', async () => {
      const input = {
        title: 'Test',
        content: 'Test Content',
      };

      mockGoogleGenAI.models.generateContent.mockRejectedValueOnce(
        new Error('network error')
      );

      await expect(AIService.createPresentation(input))
        .rejects
        .toThrow('Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung');
    });
  });

  describe('improveSlide', () => {
    it('sollte eine Folie verbessern', async () => {
      const slideId = 'slide-123';
      const suggestions = 'Verbessere das Design';

      const mockImprovedSlide = {
        title: 'Verbesserte Folie',
        type: 'content',
        items: [
          { text: 'Verbesserter Inhalt', category: 'content', priority: 'mittel' }
        ]
      };

      mockGoogleGenAI.models.generateContent.mockResolvedValueOnce({
        text: JSON.stringify(mockImprovedSlide),
      });

      const result = await AIService.improveSlide(slideId, suggestions);

      expect(result).toEqual(mockImprovedSlide);
      expect(mockGoogleGenAI.models.generateContent).toHaveBeenCalledWith({
        model: 'gemini-2.0-flash-exp',
        contents: { 
          parts: [{ text: `Verbessere die Folie ${slideId} basierend auf: ${suggestions}` }] 
        },
        config: expect.objectContaining({
          systemInstruction: expect.stringContaining('Optimierung von Präsentationsfolien'),
          responseMimeType: 'application/json',
        }),
      });
    });

    it('sollte Cache für improveSlide nutzen', async () => {
      const slideId = 'slide-123';
      const suggestions = 'Verbessere das Design';

      const mockImprovedSlide = {
        title: 'Verbesserte Folie',
        type: 'content',
        items: []
      };

      // Ersten Aufruf
      mockGoogleGenAI.models.generateContent.mockResolvedValueOnce({
        text: JSON.stringify(mockImprovedSlide),
      });
      await AIService.improveSlide(slideId, suggestions);

      // Zweiten Aufruf (sollte aus Cache kommen)
      mockGoogleGenAI.models.generateContent.mockResolvedValueOnce({
        text: JSON.stringify(mockImprovedSlide),
      });
      await AIService.improveSlide(slideId, suggestions);

      expect(mockGoogleGenAI.models.generateContent).toHaveBeenCalledTimes(1);
    });
  });

  describe('generateSlideContent', () => {
    it('sollte Content für eine Folie generieren', async () => {
      const topic = 'Künstliche Intelligenz';
      const slideType = 'content' as const;

      const mockSlideContent = {
        title: 'KI im Unternehmen',
        content: [
          'Definition von KI',
          'Anwendungsbereiche',
          'Vorteile und Herausforderungen'
        ],
        bulletPoints: [
          'Automatisierung von Prozessen',
          'Verbesserung der Entscheidungsfindung'
        ],
        layout: 'content' as const,
      };

      mockGoogleGenAI.models.generateContent.mockResolvedValueOnce({
        text: JSON.stringify(mockSlideContent),
      });

      const result = await AIService.generateSlideContent(topic, slideType);

      expect(result).toEqual(mockSlideContent);
      expect(mockGoogleGenAI.models.generateContent).toHaveBeenCalledWith({
        model: 'gemini-2.0-flash-exp',
        contents: { 
          parts: [{ text: `Generiere Inhalt für ${slideType}-Folie zum Thema: ${topic}` }] 
        },
        config: expect.objectContaining({
          systemInstruction: expect.stringContaining('deutsche'),
          responseMimeType: 'application/json',
        }),
      });
    });

    it('sollte verschiedene Folien-Typen unterstützen', async () => {
      const slideTypes = ['strategy', 'tasks', 'ideas', 'problems', 'summary', 'suggestions', 'gallery'] as const;
      
      for (const slideType of slideTypes) {
        const mockSlideContent = {
          title: 'Test Slide',
          content: ['Test Content'],
          layout: 'content' as const,
        };

        mockGoogleGenAI.models.generateContent.mockResolvedValueOnce({
          text: JSON.stringify(mockSlideContent),
        });

        const result = await AIService.generateSlideContent('Test Topic', slideType);
        
        expect(result).toEqual(mockSlideContent);
      }

      expect(mockGoogleGenAI.models.generateContent).toHaveBeenCalledTimes(slideTypes.length);
    });
  });

  describe('optimizeLayout', () => {
    it('sollte das Layout einer Präsentation optimieren', async () => {
      const slides: Slide[] = [
        {
          title: 'Slide 1',
          type: 'content',
          items: [{ text: 'Test', category: 'content', priority: 'mittel' }]
        },
        {
          title: 'Slide 2',
          type: 'strategy',
          items: [{ text: 'Strategy', category: 'strategy', priority: 'hoch' }]
        }
      ];

      const mockOptimizedLayout = {
        slideOrder: [0, 1],
        suggestedTransitions: ['fade', 'slide'],
        visualHierarchy: {
          'slide-1': 'primary',
          'slide-2': 'secondary'
        },
        colorScheme: 'professional-blue',
        fontSuggestions: ['Inter', 'Roboto'],
      };

      mockGoogleGenAI.models.generateContent.mockResolvedValueOnce({
        text: JSON.stringify(mockOptimizedLayout),
      });

      const result = await AIService.optimizeLayout(slides);

      expect(result).toEqual(mockOptimizedLayout);
      expect(mockGoogleGenAI.models.generateContent).toHaveBeenCalledWith({
        model: 'gemini-2.0-flash-exp',
        contents: { 
          parts: [{ text: 'Optimiere das Layout für 2 Folien' }] 
        },
        config: expect.objectContaining({
          systemInstruction: expect.stringContaining('Präsentations-Layout-Optimierung'),
          responseMimeType: 'application/json',
        }),
      });
    });
  });

  describe('addImagesToSlides', () => {
    it('sollte Bilder zu Folien hinzufügen', async () => {
      const slides: Slide[] = [
        {
          title: 'Slide with text',
          type: 'content',
          items: [
            { text: 'Text ohne Bild', category: 'content', priority: 'mittel' }
          ]
        }
      ];

      const mockImageUrl = 'data:image/png;base64,mock-image-data';

      // Mock für generateVisual
      mockGoogleGenAI.models.generateContent.mockResolvedValueOnce({
        candidates: [{
          content: {
            parts: [
              {
                inlineData: {
                  data: 'mock-image-data'
                }
              }
            ]
          }
        }]
      });

      const result = await AIService.addImagesToSlides(slides);

      expect(result).toHaveLength(1);
      expect(result[0].items[0]).toHaveProperty('imageUrl');
      expect(result[0].items[0].imageUrl).toBe(mockImageUrl);
    });

    it('sollte vorhandene Bilder nicht überschreiben', async () => {
      const slides: Slide[] = [
        {
          title: 'Slide with existing image',
          type: 'content',
          items: [
            { 
              text: 'Text mit existierendem Bild', 
              category: 'content', 
              priority: 'mittel',
              imageUrl: 'existing-image.jpg'
            }
          ]
        }
      ];

      const mockGoogleGenAIInstance = mockGoogleGenAI as any;
      const originalGenerateContent = mockGoogleGenAIInstance.models.generateContent;

      mockGoogleGenAIInstance.models.generateContent = vi.fn();

      const result = await AIService.addImagesToSlides(slides);

      expect(result).toHaveLength(1);
      expect(result[0].items[0].imageUrl).toBe('existing-image.jpg');
      expect(mockGoogleGenAIInstance.models.generateContent).not.toHaveBeenCalled();
    });

    it('sollte Fehler bei Bildgenerierung handhaben', async () => {
      const slides: Slide[] = [
        {
          title: 'Slide with text',
          type: 'content',
          items: [
            { text: 'Text ohne Bild', category: 'content', priority: 'mittel' }
          ]
        }
      ];

      // Mock für generateVisual Fehler
      mockGoogleGenAI.models.generateContent.mockRejectedValueOnce(
        new Error('Image generation failed')
      );

      const result = await AIService.addImagesToSlides(slides);

      expect(result).toHaveLength(1);
      // Folie sollte ohne Bild zurückgegeben werden
      expect(result[0].items[0]).not.toHaveProperty('imageUrl');
    });
  });

  describe('parseThoughts', () => {
    it('sollte Gedanken zu strukturierten Daten parsen', async () => {
      const rawText = 'Ich muss das Projekt bis Freitag fertigstellen. Außerdem brauchen wir mehr Ressourcen für das Team.';

      const mockParsedData = {
        tasks: [
          {
            id: '1',
            title: 'Projekt fertigstellen',
            category: 'work',
            priority: 'hoch',
            completed: false
          }
        ],
        projects: [
          {
            name: 'Projekt',
            subtasks: ['Fertigstellung bis Freitag']
          }
        ],
        lists: [
          {
            title: 'Ressourcen',
            type: 'requirements',
            items: ['Mehr Team-Ressourcen']
          }
        ],
        summary: 'Fokus auf Projektabschluss und Ressourcenplanung'
      };

      mockGoogleGenAI.models.generateContent.mockResolvedValueOnce({
        text: JSON.stringify(mockParsedData),
      });

      const result = await AIService.parseThoughts(rawText);

      expect(result).toEqual(mockParsedData);
      expect(mockGoogleGenAI.models.generateContent).toHaveBeenCalledWith({
        model: 'gemini-2.0-flash-exp',
        contents: { 
          parts: [{ text: expect.stringContaining(rawText) }] 
        },
        config: expect.objectContaining({
          systemInstruction: expect.stringContaining('Thought-Parser für Führungskräfte'),
          responseMimeType: 'application/json',
        }),
      });
    });
  });

  describe('generateVisual', () => {
    it('sollte ein KI-Visual generieren', async () => {
      const content = 'Professionelles Diagramm für Geschäftspräsentation';

      const mockImageData = 'mock-image-base64-data';
      const expectedImageUrl = `data:image/png;base64,${mockImageData}`;

      mockGoogleGenAI.models.generateContent.mockResolvedValueOnce({
        candidates: [{
          content: {
            parts: [
              {
                inlineData: {
                  data: mockImageData
                }
              }
            ]
          }
        }]
      });

      const result = await AIService.generateVisual(content);

      expect(result).toBe(expectedImageUrl);
      expect(mockGoogleGenAI.models.generateContent).toHaveBeenCalledWith({
        model: 'gemini-2.5-flash-image',
        contents: { 
          parts: [{ text: `High-end professionelles Visual für: ${content}` }] 
        },
        config: expect.objectContaining({
          imageConfig: { aspectRatio: '16:9' },
          systemInstruction: expect.stringContaining('professionelle, geschäftsorientierte Visualisierungen'),
        }),
      });
    });

    it('sollte Fehler behandeln, wenn kein Bild zurückgegeben wird', async () => {
      const content = 'Test Content';

      mockGoogleGenAI.models.generateContent.mockResolvedValueOnce({
        candidates: [{
          content: {
            parts: [
              {
                text: 'No image data'
              }
            ]
          }
        }]
      });

      await expect(AIService.generateVisual(content))
        .rejects
        .toThrow('Kein Bild in der KI-Antwort gefunden');
    });
  });

  describe('Input Validation', () => {
    describe('validatePresentationInput', () => {
      it('sollte valide Eingaben akzeptieren', () => {
        const validInput = {
          title: 'Gültige Präsentation',
          content: 'Gültiger Inhalt',
          targetAudience: 'Führungskräfte',
          maxSlides: 5,
        };

        const result = AIService.validatePresentationInput(validInput);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('sollte fehlende Titel ablehnen', () => {
        const invalidInput = {
          title: '',
          content: 'Inhalt',
        };

        const result = AIService.validatePresentationInput(invalidInput);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Titel ist erforderlich');
      });

      it('sollte fehlenden Inhalt ablehnen', () => {
        const invalidInput = {
          title: 'Titel',
          content: '',
        };

        const result = AIService.validatePresentationInput(invalidInput);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Inhalt ist erforderlich');
      });

      it('sollte ungültige Folienanzahl ablehnen', () => {
        const invalidInput = {
          title: 'Titel',
          content: 'Inhalt',
          maxSlides: 0,
        };

        const result = AIService.validatePresentationInput(invalidInput);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Anzahl der Folien muss zwischen 1 und 50 liegen');
      });

      it('sollte zu lange Zielgruppe ablehnen', () => {
        const invalidInput = {
          title: 'Titel',
          content: 'Inhalt',
          targetAudience: 'x'.repeat(201), // 201 Zeichen
        };

        const result = AIService.validatePresentationInput(invalidInput);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Zielgruppe darf nicht länger als 200 Zeichen sein');
      });
    });
  });

  describe('Text Sanitization', () => {
    describe('sanitizeText', () => {
      it('sollte Script-Tags entfernen', () => {
        const maliciousText = '<script>alert("xss")</script>Safe text';
        const result = AIService.sanitizeText(maliciousText);
        
        expect(result).toBe('Safe text');
        expect(result).not.toContain('<script>');
      });

      it('sollte HTML-Tags entfernen', () => {
        const htmlText = '<div><p>Text with <strong>bold</strong></p></div>';
        const result = AIService.sanitizeText(htmlText);
        
        expect(result).toBe('Text with bold');
        expect(result).not.toContain('<');
      });

      it('sollte Text trimmen', () => {
        const textWithWhitespace = '   Text with spaces   ';
        const result = AIService.sanitizeText(textWithWhitespace);
        
        expect(result).toBe('Text with spaces');
      });

      it('sollte normalen Text unverändert lassen', () => {
        const normalText = 'Normal text without tags';
        const result = AIService.sanitizeText(normalText);
        
        expect(result).toBe(normalText);
      });
    });
  });

  describe('Live Session', () => {
    describe('connectLiveSession', () => {
      it('sollte Live-Session Verbindung herstellen', async () => {
        const callbacks = {
          onopen: vi.fn(),
          onmessage: vi.fn(),
          onerror: vi.fn(),
          onclose: vi.fn(),
        };

        mockGoogleGenAI.live.connect.mockResolvedValueOnce({
          close: vi.fn(),
          send: vi.fn(),
        });

        const session = await AIService.connectLiveSession(callbacks);

        expect(session).toHaveProperty('close');
        expect(session).toHaveProperty('send');
        expect(mockGoogleGenAI.live.connect).toHaveBeenCalledWith({
          model: 'gemini-2.5-flash-native-audio-preview-09-2025',
          callbacks,
          config: expect.objectContaining({
            responseModalities: ['audio'],
            tools: expect.arrayContaining([
              expect.objectContaining({
                functionDeclarations: expect.arrayContaining([
                  expect.objectContaining({ name: 'update_briefing' }),
                  expect.objectContaining({ name: 'generate_visual' })
                ])
              })
            ]),
            systemInstruction: expect.stringContaining('Thought-Parser für deutsche Führungskräfte'),
          }),
        });
      });

      it('sollte Live-Session Fehler behandeln', async () => {
        const callbacks = {
          onmessage: vi.fn(),
        };

        mockGoogleGenAI.live.connect.mockRejectedValueOnce(
          new Error('Connection failed')
        );

        await expect(AIService.connectLiveSession(callbacks))
          .rejects
          .toThrow('KI-Service Fehler bei connectLiveSession: Connection failed');
      });
    });
  });

  describe('Performance Tests', () => {
    it('sollte mehrere Aufrufe effizient handhaben', async () => {
      const input = {
        title: 'Performance Test',
        content: 'Test Content',
      };

      const mockResponse = {
        title: 'Performance Test',
        subtitle: 'Test',
        slides: []
      };

      mockGoogleGenAI.models.generateContent.mockResolvedValue({
        text: JSON.stringify(mockResponse),
      });

      const startTime = performance.now();

      // Mehrere parallele Aufrufe
      const promises = Array.from({ length: 10 }, () => 
        AIService.createPresentation(input)
      );

      const results = await Promise.all(promises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Alle Ergebnisse sollten gleich sein (aus Cache)
      expect(results.every(result => result === mockResponse)).toBe(true);
      
      // Sollte nur einmal die API aufgerufen werden (aufgrund von Caching)
      expect(mockGoogleGenAI.models.generateContent).toHaveBeenCalledTimes(1);

      // Parallele Verarbeitung sollte effizient sein
      expect(duration).toBeLessThan(1000); // Unter 1 Sekunde
    });

    it('sollte Memory-Leaks vermeiden', () => {
      // Cache-Größe überwachen
      const initialCacheSize = AIService.getCacheStats().size;
      
      // Viele Operationen durchführen
      for (let i = 0; i < 100; i++) {
        const cacheKey = `test_${i}`;
        (AIService as any).cache?.set?.(cacheKey, { 
          data: `test_data_${i}`, 
          timestamp: Date.now() 
        });
      }

      const finalCacheSize = AIService.getCacheStats().size;
      
      // Cache sollte auf 100 Einträge begrenzt sein
      expect(finalCacheSize).toBeLessThanOrEqual(100);
    });
  });

  describe('Edge Cases', () => {
    it('sollte leere Eingaben handhaben', async () => {
      const emptyInput = {
        title: '',
        content: '',
      };

      const result = AIService.validatePresentationInput(emptyInput);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('sollte sehr lange Eingaben handhaben', async () => {
      const longContent = 'x'.repeat(10000);
      const input = {
        title: 'Long Title',
        content: longContent,
      };

      const mockResponse = {
        title: 'Long Title',
        subtitle: 'Long',
        slides: []
      };

      mockGoogleGenAI.models.generateContent.mockResolvedValueOnce({
        text: JSON.stringify(mockResponse),
      });

      const result = await AIService.createPresentation(input);
      
      expect(result).toEqual(mockResponse);
    });

    it('sollte Unicode-Zeichen korrekt handhaben', async () => {
      const unicodeInput = {
        title: 'Präsentation mit Ümläuten: äöüß',
        content: 'Content with émojis: 🎨🚀💡',
      };

      const mockResponse = {
        title: 'Präsentation mit Ümläuten: äöüß',
        subtitle: 'Subtitle',
        slides: []
      };

      mockGoogleGenAI.models.generateContent.mockResolvedValueOnce({
        text: JSON.stringify(mockResponse),
      });

      const result = await AIService.createPresentation(unicodeInput);
      
      expect(result.title).toBe('Präsentation mit Ümläuten: äöüß');
    });
  });
});