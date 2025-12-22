import { PresentationData } from '../types';

export interface Template {
  id: string;
  name: string;
  description: string;
  category: 'business' | 'education' | 'marketing' | 'technical' | 'creative';
  tags: string[];
  thumbnail?: string;
  data: PresentationData;
  isCustom: boolean;
  createdAt: Date;
  updatedAt: Date;
  author?: string;
  isPublic: boolean;
  usageCount: number;
  rating: number;
}

export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  templateCount: number;
}

export interface TemplateFilter {
  category?: string;
  tags?: string[];
  search?: string;
  isCustom?: boolean;
  isPublic?: boolean;
  minRating?: number;
}

class TemplateService {
  
  /**
   * Holt alle verfügbaren Vorlagen
   */
  static getTemplates(filter?: TemplateFilter): Template[] {
    let templates = this.getAllTemplates();
    
    if (filter) {
      templates = this.applyFilter(templates, filter);
    }
    
    return templates.sort((a, b) => b.rating - a.rating || b.usageCount - a.usageCount);
  }

  /**
   * Holt Vorlagen nach Kategorie
   */
  static getTemplatesByCategory(category: Template['category']): Template[] {
    return this.getAllTemplates().filter(template => template.category === category);
  }

  /**
   * Holt Vorlage nach ID
   */
  static getTemplateById(id: string): Template | null {
    return this.getAllTemplates().find(template => template.id === id) || null;
  }

  /**
   * Sucht Vorlagen
   */
  static searchTemplates(query: string): Template[] {
    const lowercaseQuery = query.toLowerCase();
    return this.getAllTemplates().filter(template => 
      template.name.toLowerCase().includes(lowercaseQuery) ||
      template.description.toLowerCase().includes(lowercaseQuery) ||
      template.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  }

  /**
   * Erstellt benutzerdefinierte Vorlage
   */
  static createCustomTemplate(data: PresentationData, name: string, description: string, tags: string[] = []): Template {
    const customTemplate: Template = {
      id: this.generateId(),
      name,
      description,
      category: 'business', // Standard-Kategorie
      tags,
      data,
      isCustom: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      isPublic: false,
      usageCount: 0,
      rating: 0
    };
    
    // Speichere in localStorage
    this.saveCustomTemplate(customTemplate);
    
    return customTemplate;
  }

  /**
   * Importiert Vorlage als Präsentationsdaten
   */
  static importTemplate(template: Template): PresentationData {
    // Erhöhe Usage-Count
    template.usageCount++;
    this.updateTemplate(template);
    
    return { ...template.data };
  }

  /**
   * Teilt Vorlage
   */
  static shareTemplate(template: Template): string {
    if (!template.isCustom) {
      throw new Error('Nur benutzerdefinierte Vorlagen können geteilt werden');
    }
    
    template.isPublic = true;
    this.updateTemplate(template);
    
    // Mock Share-URL - in echter Implementierung würde hier eine echte URL erstellt
    return `https://templates.example.com/${template.id}`;
  }

  /**
   * Klont Vorlage
   */
  static cloneTemplate(template: Template, newName: string): Template {
    const clonedTemplate: Template = {
      ...template,
      id: this.generateId(),
      name: newName,
      isCustom: true,
      isPublic: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0
    };
    
    this.saveCustomTemplate(clonedTemplate);
    return clonedTemplate;
  }

  /**
   * Löscht benutzerdefinierte Vorlage
   */
  static deleteCustomTemplate(templateId: string): boolean {
    try {
      const customTemplates = this.getCustomTemplates();
      const updatedTemplates = customTemplates.filter(t => t.id !== templateId);
      localStorage.setItem('custom_templates', JSON.stringify(updatedTemplates));
      return true;
    } catch (error) {
      console.error('Fehler beim Löschen der Vorlage:', error);
      return false;
    }
  }

  /**
   * Holt verfügbare Kategorien
   */
  static getCategories(): TemplateCategory[] {
    return [
      {
        id: 'business',
        name: 'Business',
        description: 'Geschäftliche Präsentationen für Unternehmen und Organisationen',
        icon: 'briefcase',
        color: 'blue',
        templateCount: this.getTemplatesByCategory('business').length
      },
      {
        id: 'education',
        name: 'Bildung',
        description: 'Bildungs- und Lernmaterialien für Schulen und Universitäten',
        icon: 'academic-cap',
        color: 'green',
        templateCount: this.getTemplatesByCategory('education').length
      },
      {
        id: 'marketing',
        name: 'Marketing',
        description: 'Marketing- und Werbepräsentationen für Kampagnen und Strategien',
        icon: 'megaphone',
        color: 'purple',
        templateCount: this.getTemplatesByCategory('marketing').length
      },
      {
        id: 'technical',
        name: 'Technisch',
        description: 'Technische Dokumentationen und Produktpräsentationen',
        icon: 'cog',
        color: 'gray',
        templateCount: this.getTemplatesByCategory('technical').length
      },
      {
        id: 'creative',
        name: 'Kreativ',
        description: 'Kreative und künstlerische Präsentationen für Projekte und Portfolio',
        icon: 'sparkles',
        color: 'pink',
        templateCount: this.getTemplatesByCategory('creative').length
      }
    ];
  }

  /**
   * Holt benutzerdefinierte Vorlagen
   */
  static getCustomTemplates(): Template[] {
    try {
      const saved = localStorage.getItem('custom_templates');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Fehler beim Laden benutzerdefinierter Vorlagen:', error);
      return [];
    }
  }

  /**
   * Speichert benutzerdefinierte Vorlage
   */
  private static saveCustomTemplate(template: Template): void {
    const customTemplates = this.getCustomTemplates();
    const existingIndex = customTemplates.findIndex(t => t.id === template.id);
    
    if (existingIndex >= 0) {
      customTemplates[existingIndex] = template;
    } else {
      customTemplates.push(template);
    }
    
    localStorage.setItem('custom_templates', JSON.stringify(customTemplates));
  }

  /**
   * Aktualisiert Vorlage
   */
  private static updateTemplate(template: Template): void {
    if (template.isCustom) {
      template.updatedAt = new Date();
      this.saveCustomTemplate(template);
    }
  }

  /**
   * Wendet Filter auf Vorlagen an
   */
  private static applyFilter(templates: Template[], filter: TemplateFilter): Template[] {
    return templates.filter(template => {
      if (filter.category && template.category !== filter.category) {
        return false;
      }
      
      if (filter.tags && filter.tags.length > 0) {
        const hasMatchingTag = filter.tags.some(tag => 
          template.tags.includes(tag)
        );
        if (!hasMatchingTag) return false;
      }
      
      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        const matchesSearch = 
          template.name.toLowerCase().includes(searchLower) ||
          template.description.toLowerCase().includes(searchLower) ||
          template.tags.some(tag => tag.toLowerCase().includes(searchLower));
        
        if (!matchesSearch) return false;
      }
      
      if (filter.isCustom !== undefined && template.isCustom !== filter.isCustom) {
        return false;
      }
      
      if (filter.isPublic !== undefined && template.isPublic !== filter.isPublic) {
        return false;
      }
      
      if (filter.minRating && template.rating < filter.minRating) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Generiert ID
   */
  private static generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  /**
   * Alle Vorlagen (eingebaute + benutzerdefinierte)
   */
  private static getAllTemplates(): Template[] {
    return [
      ...this.getBuiltInTemplates(),
      ...this.getCustomTemplates()
    ];
  }

  /**
   * Eingebaute Vorlagen
   */
  private static getBuiltInTemplates(): Template[] {
    return [
      // Business Templates
      {
        id: 'business-annual-report',
        name: 'Jahresbericht',
        description: 'Professioneller Jahresbericht mit Finanzdaten und Highlights',
        category: 'business',
        tags: ['finanz', 'bericht', 'unternehmen', 'geschäftsjahr'],
        data: {
          title: 'Jahresbericht 2024',
          subtitle: 'Erfolgreiches Geschäftsjahr mit nachhaltigem Wachstum',
          slides: [
            {
              title: 'Executive Summary',
              type: 'summary',
              items: [
                {
                  text: 'Umsatzwachstum von 15% gegenüber dem Vorjahr',
                  subItems: ['Starke Performance in allen Kernsegmenten', 'Expansion in neue Märkte erfolgreich']
                },
                {
                  text: 'Mitarbeiterzufriedenheit auf Rekordniveau',
                  subItems: ['93% Zufriedenheitsrate', 'Niedrigste Fluktuation seit Unternehmensgründung']
                }
              ]
            },
            {
              title: 'Finanzielle Highlights',
              type: 'content',
              items: [
                {
                  text: 'Umsatz: 45,2 Millionen Euro',
                  subItems: ['Q1: 10,8 Mio €', 'Q2: 11,2 Mio €', 'Q3: 11,5 Mio €', 'Q4: 11,7 Mio €']
                },
                {
                  text: 'Gewinnmarge: 18,5%',
                  subItems: ['Operative Effizienz verbessert', 'Kostenoptimierung erfolgreich']
                }
              ]
            }
          ]
        },
        isCustom: false,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        isPublic: true,
        usageCount: 245,
        rating: 4.8
      },
      {
        id: 'business-product-launch',
        name: 'Produkt-Launch',
        description: 'Spannende Produktpräsentation für Markteinführungen',
        category: 'business',
        tags: ['produkt', 'launch', 'marketing', 'neueinführung'],
        data: {
          title: 'Produkt-Launch 2024',
          subtitle: 'Revolutionäre Innovation für den Markt',
          slides: [
            {
              title: 'Das Produkt',
              type: 'content',
              items: [
                {
                  text: 'Produktname: InnovatePro',
                  subItems: ['Kategorie: Business Software', 'Zielgruppe: Mittelständische Unternehmen']
                },
                {
                  text: 'Unique Selling Points',
                  subItems: ['KI-gestützte Automatisierung', 'Intuitive Benutzeroberfläche', '99,9% Verfügbarkeit']
                }
              ]
            },
            {
              title: 'Marktchancen',
              type: 'strategy',
              items: [
                {
                  text: 'Marktvolumen: 2,8 Milliarden Euro',
                  subItems: ['Wachstumsrate: 12% jährlich', 'Hauptkonkurrenten: 3 etablierte Player']
                },
                {
                  text: 'Zielgruppen-Segmentierung',
                  subItems: ['Primär: 100-1000 Mitarbeiter Unternehmen', 'Sekundär: Enterprise-Kunden']
                }
              ]
            }
          ]
        },
        isCustom: false,
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
        isPublic: true,
        usageCount: 189,
        rating: 4.6
      },

      // Education Templates
      {
        id: 'education-lecture',
        name: 'Vorlesung',
        description: 'Strukturierte Vorlage für akademische Vorlesungen',
        category: 'education',
        tags: ['vorlesung', 'bildung', 'akademisch', 'lehre'],
        data: {
          title: 'Einführung in die Informatik',
          subtitle: 'Grundlagen der Computer Science',
          slides: [
            {
              title: 'Lernziele',
              type: 'content',
              items: [
                {
                  text: 'Verständnis grundlegender Informatik-Konzepte',
                  subItems: ['Algorithmen und Datenstrukturen', 'Programmierparadigmen', 'Systemdesign']
                },
                {
                  text: 'Praktische Anwendung',
                  subItems: ['Hands-on Programmierung', 'Projektbasierte Aufgaben', 'Kollaborative Arbeiten']
                }
              ]
            },
            {
              title: 'Agenda',
              type: 'list',
              items: [
                {
                  text: 'Einführung und Überblick (15 min)',
                  subItems: []
                },
                {
                  text: 'Hauptteil - Kernkonzepte (45 min)',
                  subItems: []
                },
                {
                  text: 'Praktische Übungen (30 min)',
                  subItems: []
                },
                {
                  text: 'Zusammenfassung und Q&A (15 min)',
                  subItems: []
                }
              ]
            }
          ]
        },
        isCustom: false,
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-02-01'),
        isPublic: true,
        usageCount: 156,
        rating: 4.7
      },

      // Marketing Templates
      {
        id: 'marketing-campaign',
        name: 'Marketing-Kampagne',
        description: 'Umfassende Kampagnenplanung und -durchführung',
        category: 'marketing',
        tags: ['kampagne', 'marketing', 'werbung', 'strategie'],
        data: {
          title: 'Sommer-Kampagne 2024',
          subtitle: 'Frische Ideen für heiße Tage',
          slides: [
            {
              title: 'Kampagnenziele',
              type: 'strategy',
              items: [
                {
                  text: 'Markenbekanntheit steigern',
                  subItems: ['+25% Reichweite in Zielgruppe', 'Verbesserte Markenwahrnehmung']
                },
                {
                  text: 'Verkäufe ankurbeln',
                  subItems: ['+30% Umsatz im Kampagnenzeitraum', 'Neukundengewinnung: 500 Kunden']
                }
              ]
            },
            {
              title: 'Kommunikationsstrategie',
              type: 'content',
              items: [
                {
                  text: 'Kernbotschaft: "Sommer voller Möglichkeiten"',
                  subItems: ['Emotionale Ansprache', 'Lifestyle-Orientierung', 'Positiver Grundton']
                },
                {
                  text: 'Kanäle und Medien',
                  subItems: ['Social Media (Instagram, TikTok)', 'Online-Werbung (Google, Facebook)', 'Influencer-Marketing']
                }
              ]
            }
          ]
        },
        isCustom: false,
        createdAt: new Date('2024-03-01'),
        updatedAt: new Date('2024-03-01'),
        isPublic: true,
        usageCount: 134,
        rating: 4.5
      },

      // Technical Templates
      {
        id: 'technical-documentation',
        name: 'Technische Dokumentation',
        description: 'Professionelle Dokumentation für Software-Projekte',
        category: 'technical',
        tags: ['dokumentation', 'technisch', 'software', 'api'],
        data: {
          title: 'API-Dokumentation v2.0',
          subtitle: 'RESTful Web Services Implementation Guide',
          slides: [
            {
              title: 'Überblick',
              type: 'content',
              items: [
                {
                  text: 'API-Version: 2.0',
                  subItems: ['RESTful Architektur', 'JSON Response Format', 'OAuth 2.0 Authentication']
                },
                {
                  text: 'Verfügbare Endpunkte',
                  subItems: ['GET /users - Benutzer abrufen', 'POST /users - Neuer Benutzer', 'PUT /users/:id - Benutzer aktualisieren']
                }
              ]
            },
            {
              title: 'Authentifizierung',
              type: 'content',
              items: [
                {
                  text: 'Bearer Token',
                  subItems: ['Token in Authorization Header', 'Format: Bearer <token>', 'Gültigkeit: 24 Stunden']
                },
                {
                  text: 'Fehlercodes',
                  subItems: ['401 Unauthorized', '403 Forbidden', '404 Not Found', '500 Internal Server Error']
                }
              ]
            }
          ]
        },
        isCustom: false,
        createdAt: new Date('2024-04-01'),
        updatedAt: new Date('2024-04-01'),
        isPublic: true,
        usageCount: 98,
        rating: 4.9
      },

      // Creative Templates
      {
        id: 'creative-portfolio',
        name: 'Portfolio-Präsentation',
        description: 'Kreative Portfolio-Darstellung für Designer und Künstler',
        category: 'creative',
        tags: ['portfolio', 'kreativ', 'design', 'kunst'],
        data: {
          title: 'Portfolio 2024',
          subtitle: 'Kreative Projekte und Visionen',
          slides: [
            {
              title: 'Über mich',
              type: 'content',
              items: [
                {
                  text: 'Kreative Designerin mit 8 Jahren Erfahrung',
                  subItems: ['Spezialisierung: Brand Design & Digital Art', 'Leidenschaft für innovative Visualisierung']
                },
                {
                  text: 'Philosophie',
                  subItems: ['Design ist Kommunikation', 'Ästhetik trifft Funktionalität', 'Nachhaltige Gestaltung']
                }
              ]
            },
            {
              title: 'Ausgewählte Projekte',
              type: 'gallery',
              items: [
                {
                  text: 'Brand Identity für Tech-Startup',
                  subItems: ['Logo-Design', 'Corporate Design', 'Web-Design']
                },
                {
                  text: 'Kampagne für Umweltschutz',
                  subItems: ['Poster-Serie', 'Social Media Graphics', 'Infografiken']
                }
              ]
            }
          ]
        },
        isCustom: false,
        createdAt: new Date('2024-05-01'),
        updatedAt: new Date('2024-05-01'),
        isPublic: true,
        usageCount: 87,
        rating: 4.4
      }
    ];
  }
}

export default TemplateService;