import React, { useState, useCallback, useMemo } from 'react';
import { PresentationData } from '../types';
import TemplateService, { Template, TemplateCategory, TemplateFilter } from '../services/templateService';
import { 
  BriefcaseIcon, 
  AcademicCapIcon, 
  MegaphoneIcon, 
  CogIcon, 
  SparklesIcon,
  SearchIcon,
  StarIcon,
  HeartIcon,
  ShareIcon,
  EyeIcon,
  PlusIcon,
  FilterIcon,
  GridIcon,
  ListIcon,
  StarIcon as StarOutlineIcon
} from './Icons';

interface AdvancedTemplatesProps {
  onTemplateSelect: (template: Template) => void;
  onCreateCustom: (data: PresentationData) => void;
  onClose: () => void;
}

const AdvancedTemplates: React.FC<AdvancedTemplatesProps> = ({
  onTemplateSelect,
  onCreateCustom,
  onClose
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCustomEditor, setShowCustomEditor] = useState(false);
  const [sortBy, setSortBy] = useState<'rating' | 'usage' | 'date'>('rating');
  const [filterOptions, setFilterOptions] = useState<TemplateFilter>({
    minRating: 0
  });

  const categories = TemplateService.getCategories();
  
  const templates = useMemo(() => {
    let filtered = TemplateService.getTemplates();
    
    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      filtered = TemplateService.searchTemplates(searchQuery);
    }
    
    // Apply additional filters
    filtered = TemplateService.getTemplates(filterOptions);
    
    // Sort templates
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating;
        case 'usage':
          return b.usageCount - a.usageCount;
        case 'date':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [selectedCategory, searchQuery, filterOptions, sortBy]);

  const handleTemplateSelect = useCallback((template: Template) => {
    setSelectedTemplate(template);
  }, []);

  const handleUseTemplate = useCallback(() => {
    if (selectedTemplate) {
      onTemplateSelect(selectedTemplate);
    }
  }, [selectedTemplate, onTemplateSelect]);

  const handlePreviewTemplate = useCallback((template: Template) => {
    // In a real implementation, this would show a preview modal
    alert(`Vorschau für Vorlage: ${template.name}`);
  }, []);

  const handleFavoriteTemplate = useCallback((template: Template) => {
    // In a real implementation, this would add/remove from favorites
    console.log('Toggle favorite for:', template.name);
  }, []);

  const handleShareTemplate = useCallback((template: Template) => {
    if (template.isCustom) {
      try {
        const shareUrl = TemplateService.shareTemplate(template);
        navigator.clipboard.writeText(shareUrl);
        alert('Vorlagen-Link in Zwischenablage kopiert!');
      } catch (error) {
        alert('Fehler beim Teilen der Vorlage');
      }
    } else {
      alert('Nur benutzerdefinierte Vorlagen können geteilt werden');
    }
  }, []);

  const getCategoryIcon = (categoryId: string) => {
    switch (categoryId) {
      case 'business':
        return BriefcaseIcon;
      case 'education':
        return AcademicCapIcon;
      case 'marketing':
        return MegaphoneIcon;
      case 'technical':
        return CogIcon;
      case 'creative':
        return SparklesIcon;
      default:
        return CogIcon;
    }
  };

  const getCategoryColor = (categoryId: string) => {
    switch (categoryId) {
      case 'business':
        return 'blue';
      case 'education':
        return 'green';
      case 'marketing':
        return 'purple';
      case 'technical':
        return 'gray';
      case 'creative':
        return 'pink';
      default:
        return 'gray';
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIcon
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="text-sm text-slate-400 ml-1">({rating.toFixed(1)})</span>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Erweiterte Vorlagen</h1>
            <p className="text-slate-400 mt-1">Professionelle Vorlagen für jede Gelegenheit</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCustomEditor(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              Eigene Vorlage
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Zurück
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Vorlagen durchsuchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 bg-slate-800 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="rating">Nach Bewertung</option>
            <option value="usage">Nach Beliebtheit</option>
            <option value="date">Nach Datum</option>
          </select>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-indigo-600' : 'bg-slate-800 hover:bg-slate-700'
              }`}
            >
              <GridIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-indigo-600' : 'bg-slate-800 hover:bg-slate-700'
              }`}
            >
              <ListIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Categories */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              selectedCategory === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Alle Vorlagen ({TemplateService.getTemplates().length})
          </button>
          {categories.map((category) => {
            const Icon = getCategoryIcon(category.id);
            const color = getCategoryColor(category.id);
            const isSelected = selectedCategory === category.id;
            
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
                  isSelected
                    ? `bg-${color}-600 text-white`
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {category.name} ({category.templateCount})
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Templates Grid/List */}
        <div className="flex-1 p-6 overflow-y-auto">
          {templates.length === 0 ? (
            <div className="text-center py-12">
              <SearchIcon className="w-16 h-16 mx-auto mb-4 text-slate-600" />
              <h3 className="text-lg font-semibold text-slate-400 mb-2">Keine Vorlagen gefunden</h3>
              <p className="text-slate-500">Versuchen Sie andere Suchbegriffe oder Filter</p>
            </div>
          ) : (
            <div className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                : 'space-y-4'
            }>
              {templates.map((template) => {
                const categoryColor = getCategoryColor(template.category);
                const isSelected = selectedTemplate?.id === template.id;
                
                return (
                  <div
                    key={template.id}
                    className={`
                      bg-slate-900/50 border rounded-xl p-4 cursor-pointer transition-all
                      ${isSelected 
                        ? `border-${categoryColor}-500 bg-${categoryColor}-500/10` 
                        : 'border-white/10 hover:border-white/20 hover:bg-slate-900/70'
                      }
                      ${viewMode === 'list' ? 'flex items-center gap-4' : ''}
                    `}
                    onClick={() => handleTemplateSelect(template)}
                  >
                    {viewMode === 'grid' ? (
                      <>
                        {/* Template Preview */}
                        <div className="aspect-video bg-slate-800 rounded-lg mb-4 flex items-center justify-center">
                          <div className="text-center text-slate-400">
                            <div className={`w-12 h-12 mx-auto mb-2 bg-${categoryColor}-500/20 rounded-lg flex items-center justify-center`}>
                              {React.createElement(getCategoryIcon(template.category), {
                                className: `w-6 h-6 text-${categoryColor}-400`
                              })}
                            </div>
                            <p className="text-xs">{template.slides.length} Folien</p>
                          </div>
                        </div>
                        
                        {/* Template Info */}
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <h3 className="font-semibold text-white">{template.name}</h3>
                            {template.isCustom && (
                              <span className="px-2 py-1 bg-indigo-500/20 text-indigo-400 text-xs rounded">
                                Eigene
                              </span>
                            )}
                          </div>
                          
                          <p className="text-sm text-slate-400 line-clamp-2">{template.description}</p>
                          
                          <div className="flex items-center justify-between">
                            {renderStars(template.rating)}
                            <span className="text-xs text-slate-500">{template.usageCount} verwendet</span>
                          </div>
                          
                          <div className="flex items-center gap-2 mt-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePreviewTemplate(template);
                              }}
                              className="flex-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-sm transition-colors flex items-center justify-center gap-1"
                            >
                              <EyeIcon className="w-4 h-4" />
                              Vorschau
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFavoriteTemplate(template);
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"
                            >
                              <HeartIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShareTemplate(template);
                              }}
                              className="p-1.5 text-slate-400 hover:text-blue-400 transition-colors"
                            >
                              <ShareIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* List View */}
                        <div className={`w-16 h-12 bg-${categoryColor}-500/20 rounded flex items-center justify-center flex-shrink-0`}>
                          {React.createElement(getCategoryIcon(template.category), {
                            className: `w-6 h-6 text-${categoryColor}-400`
                          })}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold text-white truncate">{template.name}</h3>
                            {template.isCustom && (
                              <span className="px-2 py-1 bg-indigo-500/20 text-indigo-400 text-xs rounded ml-2">
                                Eigene
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-400 truncate">{template.description}</p>
                          <div className="flex items-center gap-4 mt-2">
                            {renderStars(template.rating)}
                            <span className="text-xs text-slate-500">{template.usageCount} verwendet</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePreviewTemplate(template);
                            }}
                            className="p-2 text-slate-400 hover:text-white transition-colors"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFavoriteTemplate(template);
                            }}
                            className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                          >
                            <HeartIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShareTemplate(template);
                            }}
                            className="p-2 text-slate-400 hover:text-blue-400 transition-colors"
                          >
                            <ShareIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Template Details Sidebar */}
        {selectedTemplate && (
          <div className="w-80 border-l border-white/10 p-6 overflow-y-auto">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold mb-2">{selectedTemplate.name}</h2>
                <p className="text-slate-400">{selectedTemplate.description}</p>
              </div>
              
              {/* Template Preview */}
              <div className="aspect-video bg-slate-800 rounded-lg flex items-center justify-center">
                <div className="text-center text-slate-400">
                  <div className={`w-16 h-16 mx-auto mb-2 bg-${getCategoryColor(selectedTemplate.category)}-500/20 rounded-lg flex items-center justify-center`}>
                    {React.createElement(getCategoryIcon(selectedTemplate.category), {
                      className: `w-8 h-8 text-${getCategoryColor(selectedTemplate.category)}-400`
                    })}
                  </div>
                  <p className="text-sm">{selectedTemplate.slides.length} Folien</p>
                </div>
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-slate-900/50 rounded-lg">
                  <div className="text-2xl font-bold text-white">{selectedTemplate.usageCount}</div>
                  <div className="text-xs text-slate-400">Verwendungen</div>
                </div>
                <div className="text-center p-3 bg-slate-900/50 rounded-lg">
                  <div className="text-2xl font-bold text-white">{selectedTemplate.rating.toFixed(1)}</div>
                  <div className="text-xs text-slate-400">Bewertung</div>
                </div>
              </div>
              
              {/* Tags */}
              <div>
                <h3 className="font-semibold mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedTemplate.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-slate-800 text-slate-300 text-xs rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              
              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={handleUseTemplate}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition-colors"
                >
                  Vorlage verwenden
                </button>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePreviewTemplate(selectedTemplate)}
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors"
                  >
                    Vorschau
                  </button>
                  <button
                    onClick={() => handleFavoriteTemplate(selectedTemplate)}
                    className="px-3 py-2 text-slate-400 hover:text-red-400 transition-colors"
                  >
                    <HeartIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleShareTemplate(selectedTemplate)}
                    className="px-3 py-2 text-slate-400 hover:text-blue-400 transition-colors"
                  >
                    <ShareIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedTemplates;