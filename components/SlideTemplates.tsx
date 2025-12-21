import React, { useState } from 'react';
import { 
  XIcon,
  SparklesIcon,
  BriefcaseIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentListIcon,
  ChatBubbleLeftRightIcon,
  PhotoIcon,
  CogIcon,
  UserGroupIcon,
  ChartBarIcon,
  PresentationChartLineIcon
} from './Icons';

// ============================================================================
// SLIDE TEMPLATES COMPONENT
// ============================================================================

interface SlideTemplate {
  id: string;
  name: string;
  description: string;
  category: 'business' | 'creative' | 'technical' | 'custom';
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  preview: {
    title: string;
    items: string[];
  };
  aiPrompt: string;
}

interface SlideTemplatesProps {
  onTemplateSelect: (templateType: string, topic: string) => void;
  onClose: () => void;
}

const templates: SlideTemplate[] = [
  {
    id: 'strategy',
    name: 'Strategie Folie',
    description: 'Strategische Ziele, Visionen und Roadmaps',
    category: 'business',
    icon: BriefcaseIcon,
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10 border-blue-500/20',
    preview: {
      title: 'Unsere Strategie 2024',
      items: [
        'Marktführerschaft erreichen',
        'Digitale Transformation',
        'Nachhaltigkeit fördern'
      ]
    },
    aiPrompt: 'Erstelle eine strategische Folie mit Zielen und Visionen'
  },
  {
    id: 'tasks',
    name: 'Aufgaben & To-Dos',
    description: 'Projektmanagement und Aufgabenlisten',
    category: 'business',
    icon: ClipboardDocumentListIcon,
    color: 'text-green-600',
    bgColor: 'bg-green-500/10 border-green-500/20',
    preview: {
      title: 'Projekt Roadmap',
      items: [
        '✓ Anforderungsanalyse',
        '→ Prototyp entwickeln',
        '○ Tests durchführen'
      ]
    },
    aiPrompt: 'Erstelle eine Aufgaben-Folie mit priorisierten To-Dos'
  },
  {
    id: 'ideas',
    name: 'Ideen & Brainstorming',
    description: 'Kreative Ideen und Innovationspotential',
    category: 'creative',
    icon: LightBulbIcon,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-500/10 border-yellow-500/20',
    preview: {
      title: 'Innovative Ideen',
      items: [
        '💡 KI-Integration',
        '💡 Mobile App',
        '💡 Community Features'
      ]
    },
    aiPrompt: 'Erstelle eine kreative Ideen-Folie mit Brainstorming-Ergebnissen'
  },
  {
    id: 'problems',
    name: 'Probleme & Herausforderungen',
    description: 'Problemanalyse und Lösungsansätze',
    category: 'business',
    icon: ExclamationTriangleIcon,
    color: 'text-red-600',
    bgColor: 'bg-red-500/10 border-red-500/20',
    preview: {
      title: 'Herausforderungen',
      items: [
        '⚠️ Skalierungsprobleme',
        '⚠️ User Engagement',
        '⚠️ Technische Schulden'
      ]
    },
    aiPrompt: 'Erstelle eine Problemanalyse-Folie mit Herausforderungen'
  },
  {
    id: 'summary',
    name: 'Zusammenfassung',
    description: 'Executive Summary und Key Takeaways',
    category: 'business',
    icon: ChartBarIcon,
    color: 'text-purple-600',
    bgColor: 'bg-purple-500/10 border-purple-500/20',
    preview: {
      title: 'Executive Summary',
      items: [
        '📊 Umsatz +25%',
        '📈 User Growth +40%',
        '💰 Profitabilität erreicht'
      ]
    },
    aiPrompt: 'Erstelle eine Zusammenfassungs-Folie mit Key Metrics'
  },
  {
    id: 'suggestions',
    name: 'Vorschläge & Empfehlungen',
    description: 'Handlungsempfehlungen und next Steps',
    category: 'business',
    icon: ChatBubbleLeftRightIcon,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-500/10 border-indigo-500/20',
    preview: {
      title: 'Empfehlungen',
      items: [
        '🎯 Fokus auf Retention',
        '🎯 Product-Market Fit',
        '🎯 Team erweitern'
      ]
    },
    aiPrompt: 'Erstelle eine Empfehlungs-Folie mit Handlungsempfehlungen'
  },
  {
    id: 'gallery',
    name: 'Galerie & Portfolio',
    description: 'Visuelle Sammlung und Showcase',
    category: 'creative',
    icon: PhotoIcon,
    color: 'text-pink-600',
    bgColor: 'bg-pink-500/10 border-pink-500/20',
    preview: {
      title: 'Portfolio Highlights',
      items: [
        '🖼️ Projekt A',
        '🖼️ Projekt B',
        '🖼️ Projekt C'
      ]
    },
    aiPrompt: 'Erstelle eine Portfolio-Galerie mit visuellen Highlights'
  },
  {
    id: 'team',
    name: 'Team & Organisation',
    description: 'Teamstruktur und Organisationsaufbau',
    category: 'business',
    icon: UserGroupIcon,
    color: 'text-teal-600',
    bgColor: 'bg-teal-500/10 border-teal-500/20',
    preview: {
      title: 'Unser Team',
      items: [
        '👥 Entwicklung (5)',
        '👥 Design (2)',
        '👥 Marketing (3)'
      ]
    },
    aiPrompt: 'Erstelle eine Team-Übersicht mit Organisationsstruktur'
  },
  {
    id: 'analytics',
    name: 'Analytics & Daten',
    description: 'Datenanalyse und Performance Metrics',
    category: 'technical',
    icon: PresentationChartLineIcon,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-500/10 border-cyan-500/20',
    preview: {
      title: 'Performance Metrics',
      items: [
        '📈 Conversion: 12%',
        '📊 Engagement: 85%',
        '📉 Churn Rate: 3%'
      ]
    },
    aiPrompt: 'Erstelle eine Analytics-Folie mit Datenvisualisierung'
  },
  {
    id: 'custom',
    name: 'Benutzerdefiniert',
    description: 'Eigene Vorlage mit freier Gestaltung',
    category: 'custom',
    icon: CogIcon,
    color: 'text-slate-600',
    bgColor: 'bg-slate-500/10 border-slate-500/20',
    preview: {
      title: 'Eigene Folie',
      items: [
        '⚙️ Freie Gestaltung',
        '⚙️ Flexible Inhalte',
        '⚙️ Individuell anpassbar'
      ]
    },
    aiPrompt: 'Erstelle eine benutzerdefinierte Folie nach Bedarf'
  }
];

const categories = [
  { id: 'all', name: 'Alle Vorlagen', description: 'Zeige alle verfügbaren Vorlagen' },
  { id: 'business', name: 'Business', description: 'Geschäftliche und professionelle Vorlagen' },
  { id: 'creative', name: 'Kreativ', description: 'Kreative und visuelle Vorlagen' },
  { id: 'technical', name: 'Technisch', description: 'Technische und analytische Vorlagen' },
  { id: 'custom', name: 'Benutzerdefiniert', description: 'Individuelle Vorlagen' }
];

const SlideTemplates: React.FC<SlideTemplatesProps> = ({
  onTemplateSelect,
  onClose
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<SlideTemplate | null>(null);
  const [topic, setTopic] = useState('');

  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : templates.filter(template => template.category === selectedCategory);

  const handleTemplateSelect = (template: SlideTemplate) => {
    setSelectedTemplate(template);
  };

  const handleCreateSlide = () => {
    if (selectedTemplate && topic.trim()) {
      onTemplateSelect(selectedTemplate.id, topic.trim());
      onClose();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleCreateSlide();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-950 border border-white/10 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white">Folien-Vorlagen</h2>
              <p className="text-slate-400 mt-1">
                Wählen Sie eine Vorlage und beschreiben Sie Ihr Thema
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <XIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Search and Topic Input */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Thema für die neue Folie
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Beschreiben Sie das Thema Ihrer Folie..."
                className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                autoFocus
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleCreateSlide}
                disabled={!selectedTemplate || !topic.trim()}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <SparklesIcon className="w-5 h-5" />
                Mit KI erstellen
              </button>
            </div>
          </div>
        </div>

        <div className="flex h-[600px]">
          {/* Category Sidebar */}
          <div className="w-64 bg-slate-900 border-r border-white/5 p-4">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
              Kategorien
            </h3>
            <div className="space-y-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`
                    w-full text-left p-3 rounded-lg transition-colors
                    ${selectedCategory === category.id
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }
                  `}
                >
                  <div className="font-medium">{category.name}</div>
                  <div className="text-xs opacity-75 mt-1">{category.description}</div>
                </button>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="mt-8 pt-6 border-t border-white/5">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Schnellzugriff
              </h4>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setSelectedTemplate(templates[0]);
                    setTopic('Strategische Ziele für das kommende Jahr');
                  }}
                  className="w-full text-left p-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded transition-colors"
                >
                  📊 Strategie Folie
                </button>
                <button
                  onClick={() => {
                    setSelectedTemplate(templates[1]);
                    setTopic('Projektplanung und Aufgaben für Q1');
                  }}
                  className="w-full text-left p-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded transition-colors"
                >
                  ✅ Aufgaben Liste
                </button>
                <button
                  onClick={() => {
                    setSelectedTemplate(templates[2]);
                    setTopic('Innovative Ideen für Produktentwicklung');
                  }}
                  className="w-full text-left p-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded transition-colors"
                >
                  💡 Brainstorming
                </button>
              </div>
            </div>
          </div>

          {/* Templates Grid */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => {
                const Icon = template.icon;
                const isSelected = selectedTemplate?.id === template.id;

                return (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    className={`
                      p-4 rounded-xl border transition-all duration-200 text-left group
                      ${isSelected
                        ? `${template.bgColor} ${template.color} border-2 shadow-lg`
                        : 'bg-slate-900 border-white/10 hover:border-white/20 hover:bg-white/5'
                      }
                    `}
                  >
                    {/* Template Header */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`
                        p-2 rounded-lg
                        ${isSelected ? 'bg-white/10' : 'bg-slate-800'}
                      `}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">{template.name}</h4>
                        <p className="text-xs text-slate-400">{template.description}</p>
                      </div>
                    </div>

                    {/* Template Preview */}
                    <div className="bg-slate-800 rounded-lg p-3 mb-3">
                      <h5 className="text-xs font-medium text-slate-300 mb-2">
                        {template.preview.title}
                      </h5>
                      <div className="space-y-1">
                        {template.preview.items.slice(0, 3).map((item, index) => (
                          <div key={index} className="text-xs text-slate-400">
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* AI Prompt Hint */}
                    <div className="text-xs text-slate-500 group-hover:text-slate-400 transition-colors">
                      {template.aiPrompt}
                    </div>

                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <div className="w-3 h-3 bg-indigo-500 rounded-full border-2 border-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Empty State */}
            {filteredTemplates.length === 0 && (
              <div className="text-center py-12">
                <CogIcon className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-400 mb-2">
                  Keine Vorlagen gefunden
                </h3>
                <p className="text-slate-500">
                  In dieser Kategorie sind keine Vorlagen verfügbar.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-slate-900">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-400">
              {filteredTemplates.length} Vorlagen verfügbar
              {selectedTemplate && ` • Ausgewählt: ${selectedTemplate.name}`}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleCreateSlide}
                disabled={!selectedTemplate || !topic.trim()}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <SparklesIcon className="w-4 h-4" />
                Folie erstellen
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlideTemplates;