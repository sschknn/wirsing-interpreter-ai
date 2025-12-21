import React, { useState } from 'react';
import { Slide } from '../types';
import { SlideElement } from './PresentationEditor';
import { 
  PaletteIcon,
  SettingsIcon,
  TypeIcon,
  MoveIcon,
  RotateCcwIcon,
  TrashIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  UnlockIcon
} from './Icons';

// ============================================================================
// PROPERTIES PANEL COMPONENT
// ============================================================================

interface PropertiesPanelProps {
  selectedElement: string | null;
  slide: Slide | null;
  onElementUpdate: (elementId: string, updates: Partial<SlideElement>) => void;
  onSlideUpdate: (updates: Partial<Slide>) => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedElement,
  slide,
  onElementUpdate,
  onSlideUpdate
}) => {
  const [activeTab, setActiveTab] = useState<'properties' | 'styles' | 'animations'>('properties');

  // Mock element data for demo
  const mockElement: SlideElement = {
    id: selectedElement || '',
    type: 'text',
    position: { x: 100, y: 100 },
    size: { width: 200, height: 50 },
    content: { text: 'Beispiel Text' },
    style: {
      fontSize: 16,
      fontFamily: 'Inter, sans-serif',
      color: '#000000',
      backgroundColor: 'transparent',
      borderColor: '#000000',
      borderWidth: 0,
      borderRadius: 0,
      opacity: 1,
      rotation: 0
    }
  };

  const handleStyleChange = (property: string, value: any) => {
    if (selectedElement && mockElement) {
      onElementUpdate(selectedElement, {
        style: {
          ...mockElement.style,
          [property]: value
        }
      });
    }
  };

  const handlePositionChange = (property: 'x' | 'y', value: number) => {
    if (selectedElement && mockElement) {
      onElementUpdate(selectedElement, {
        position: {
          ...mockElement.position,
          [property]: value
        }
      });
    }
  };

  const handleSizeChange = (property: 'width' | 'height', value: number) => {
    if (selectedElement && mockElement) {
      onElementUpdate(selectedElement, {
        size: {
          ...mockElement.size,
          [property]: value
        }
      });
    }
  };

  const handleContentChange = (property: string, value: any) => {
    if (selectedElement && mockElement) {
      onElementUpdate(selectedElement, {
        content: {
          ...mockElement.content,
          [property]: value
        }
      });
    }
  };

  return (
    <div className="h-full bg-slate-950 border-l border-white/5 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <h2 className="text-lg font-bold text-white mb-1">Eigenschaften</h2>
        <p className="text-xs text-slate-400">
          {selectedElement ? 'Element bearbeiten' : 'Folie bearbeiten'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5">
        {[
          { id: 'properties', label: 'Eigenschaften', icon: SettingsIcon },
          { id: 'styles', label: 'Stile', icon: PaletteIcon },
          { id: 'animations', label: 'Animationen', icon: RotateCcwIcon }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                flex-1 px-3 py-3 text-xs font-medium border-b-2 transition-colors
                ${activeTab === tab.id 
                  ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10' 
                  : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'
                }
              `}
            >
              <div className="flex items-center justify-center gap-1">
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'properties' && (
          <div className="space-y-6">
            {selectedElement ? (
              /* Element Properties */
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-white">Element Details</h3>
                
                {/* Element Type */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">
                    Typ
                  </label>
                  <div className="text-sm text-white bg-slate-800 px-3 py-2 rounded border border-white/10">
                    {mockElement.type}
                  </div>
                </div>

                {/* Position */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2">
                      X Position
                    </label>
                    <input
                      type="number"
                      value={mockElement.position.x}
                      onChange={(e) => handlePositionChange('x', Number(e.target.value))}
                      className="w-full bg-slate-800 text-white px-3 py-2 rounded border border-white/10 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2">
                      Y Position
                    </label>
                    <input
                      type="number"
                      value={mockElement.position.y}
                      onChange={(e) => handlePositionChange('y', Number(e.target.value))}
                      className="w-full bg-slate-800 text-white px-3 py-2 rounded border border-white/10 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Size */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2">
                      Breite
                    </label>
                    <input
                      type="number"
                      value={mockElement.size.width}
                      onChange={(e) => handleSizeChange('width', Number(e.target.value))}
                      className="w-full bg-slate-800 text-white px-3 py-2 rounded border border-white/10 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2">
                      Höhe
                    </label>
                    <input
                      type="number"
                      value={mockElement.size.height}
                      onChange={(e) => handleSizeChange('height', Number(e.target.value))}
                      className="w-full bg-slate-800 text-white px-3 py-2 rounded border border-white/10 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Content-specific properties */}
                {mockElement.type === 'text' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2">
                      Text Inhalt
                    </label>
                    <textarea
                      value={mockElement.content.text || ''}
                      onChange={(e) => handleContentChange('text', e.target.value)}
                      rows={3}
                      className="w-full bg-slate-800 text-white px-3 py-2 rounded border border-white/10 focus:border-indigo-500 focus:outline-none resize-none"
                      placeholder="Text eingeben..."
                    />
                  </div>
                )}

                {mockElement.type === 'image' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2">
                      Bild URL
                    </label>
                    <input
                      type="url"
                      value={mockElement.content.src || ''}
                      onChange={(e) => handleContentChange('src', e.target.value)}
                      className="w-full bg-slate-800 text-white px-3 py-2 rounded border border-white/10 focus:border-indigo-500 focus:outline-none"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                )}
              </div>
            ) : (
              /* Slide Properties */
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-white">Folie Details</h3>
                
                {slide && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-2">
                        Titel
                      </label>
                      <input
                        type="text"
                        value={slide.title}
                        onChange={(e) => onSlideUpdate({ title: e.target.value })}
                        className="w-full bg-slate-800 text-white px-3 py-2 rounded border border-white/10 focus:border-indigo-500 focus:outline-none"
                        placeholder="Folien-Titel"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-2">
                        Typ
                      </label>
                      <select
                        value={slide.type}
                        onChange={(e) => onSlideUpdate({ type: e.target.value as any })}
                        className="w-full bg-slate-800 text-white px-3 py-2 rounded border border-white/10 focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="strategy">Strategie</option>
                        <option value="tasks">Aufgaben</option>
                        <option value="ideas">Ideen</option>
                        <option value="problems">Probleme</option>
                        <option value="summary">Zusammenfassung</option>
                        <option value="suggestions">Vorschläge</option>
                        <option value="gallery">Galerie</option>
                        <option value="custom">Benutzerdefiniert</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-2">
                        Elemente
                      </label>
                      <div className="text-sm text-white bg-slate-800 px-3 py-2 rounded border border-white/10">
                        {slide.items.length} Element{slide.items.length !== 1 ? 'e' : ''}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'styles' && selectedElement && (
          <div className="space-y-6">
            <h3 className="text-sm font-semibold text-white">Stil-Eigenschaften</h3>
            
            {/* Typography */}
            {mockElement.type === 'text' && (
              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Typografie
                </h4>
                
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">
                    Schriftgröße
                  </label>
                  <input
                    type="number"
                    value={mockElement.style?.fontSize || 16}
                    onChange={(e) => handleStyleChange('fontSize', Number(e.target.value))}
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded border border-white/10 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">
                    Schriftart
                  </label>
                  <select
                    value={mockElement.style?.fontFamily || 'Inter, sans-serif'}
                    onChange={(e) => handleStyleChange('fontFamily', e.target.value)}
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded border border-white/10 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="Inter, sans-serif">Inter</option>
                    <option value="Arial, sans-serif">Arial</option>
                    <option value="Times New Roman, serif">Times New Roman</option>
                    <option value="Courier New, monospace">Courier New</option>
                  </select>
                </div>
              </div>
            )}

            {/* Colors */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Farben
              </h4>
              
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  Textfarbe
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={mockElement.style?.color || '#000000'}
                    onChange={(e) => handleStyleChange('color', e.target.value)}
                    className="w-8 h-8 rounded border border-white/10 bg-transparent"
                  />
                  <input
                    type="text"
                    value={mockElement.style?.color || '#000000'}
                    onChange={(e) => handleStyleChange('color', e.target.value)}
                    className="flex-1 bg-slate-800 text-white px-3 py-2 rounded border border-white/10 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  Hintergrundfarbe
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={mockElement.style?.backgroundColor || '#ffffff'}
                    onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                    className="w-8 h-8 rounded border border-white/10 bg-transparent"
                  />
                  <input
                    type="text"
                    value={mockElement.style?.backgroundColor || '#ffffff'}
                    onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                    className="flex-1 bg-slate-800 text-white px-3 py-2 rounded border border-white/10 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Effects */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Effekte
              </h4>
              
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  Deckkraft ({Math.round((mockElement.style?.opacity || 1) * 100)}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={(mockElement.style?.opacity || 1) * 100}
                  onChange={(e) => handleStyleChange('opacity', Number(e.target.value) / 100)}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  Rotation ({mockElement.style?.rotation || 0}°)
                </label>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={mockElement.style?.rotation || 0}
                  onChange={(e) => handleStyleChange('rotation', Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'animations' && selectedElement && (
          <div className="space-y-6">
            <h3 className="text-sm font-semibold text-white">Animationen</h3>
            
            <div className="text-center py-8 text-slate-500">
              <RotateCcwIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">Animationen werden in Kürze verfügbar sein</p>
              <p className="text-xs mt-2">Einblendeffekte, Übergänge und Bewegungsanimationen</p>
            </div>
          </div>
        )}
      </div>

      {/* Element Actions */}
      {selectedElement && (
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-2">
            <button
              className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded transition-colors flex items-center justify-center gap-2"
              title="Element duplizieren"
            >
              <CopyIcon className="w-4 h-4" />
              Duplizieren
            </button>
            
            <button
              className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded transition-colors flex items-center justify-center gap-2"
              title="Element löschen"
            >
              <TrashIcon className="w-4 h-4" />
              Löschen
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertiesPanel;