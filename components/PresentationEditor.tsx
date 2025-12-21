import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { PresentationData, Slide, SlideItem, AppModeType, ToolbarState } from '../types';
import { AIService, SlideContent } from '../services/aiService';
import SlideNavigation from './SlideNavigation';
import ElementToolbar from './ElementToolbar';
import PropertiesPanel from './PropertiesPanel';
import ElementEditor from './ElementEditor';
import SlideTemplates from './SlideTemplates';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  ZoomInIcon, 
  ZoomOutIcon, 
  GridIcon, 
  UndoIcon, 
  RedoIcon, 
  SaveIcon,
  PlayIcon,
  SparklesIcon,
  EyeIcon,
  CopyIcon,
  TrashIcon
} from './Icons';

// ============================================================================
// ERWEITERTE TYPES FÜR EDITOR
// ============================================================================

export interface SlideElement {
  id: string;
  type: 'text' | 'image' | 'shape' | 'chart' | 'table' | 'video';
  position: { x: number; y: number };
  size: { width: number; height: number };
  content: any;
  style?: {
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
    borderRadius?: number;
    opacity?: number;
    rotation?: number;
  };
  selected?: boolean;
}

export interface SlideEditorState {
  currentSlide: number;
  selectedElement: string | null;
  clipboard: SlideElement[];
  history: SlideChange[];
  historyIndex: number;
  zoom: number;
  gridEnabled: boolean;
  showTemplates: boolean;
  isLoading: boolean;
  presentationData: PresentationData;
}

export interface SlideChange {
  type: 'element_added' | 'element_removed' | 'element_modified' | 'slide_added' | 'slide_removed' | 'slide_modified';
  elementId?: string;
  slideIndex?: number;
  data: any;
  timestamp: number;
}

// ============================================================================
// HAUPT-EDITOR-KOMPONENTE
// ============================================================================

interface PresentationEditorProps {
  data: PresentationData;
  onDataChange: (data: PresentationData) => void;
  onModeChange: (mode: AppModeType) => void;
  disabled?: boolean;
}

const PresentationEditor: React.FC<PresentationEditorProps> = ({
  data,
  onDataChange,
  onModeChange,
  disabled = false
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const [editorState, setEditorState] = useState<SlideEditorState>({
    currentSlide: 0,
    selectedElement: null,
    clipboard: [],
    history: [],
    historyIndex: -1,
    zoom: 100,
    gridEnabled: false,
    showTemplates: false,
    isLoading: false,
    presentationData: data
  });

  // ============================================================================
  // HILFSFUNKTIONEN
  // ============================================================================

  const currentSlide = useMemo(() => 
    editorState.presentationData.slides[editorState.currentSlide], 
    [editorState.presentationData.slides, editorState.currentSlide]
  );

  const totalSlides = editorState.presentationData.slides.length;

  // ============================================================================
  // HISTORY MANAGEMENT
  // ============================================================================

  const addToHistory = useCallback((change: SlideChange) => {
    setEditorState(prev => {
      const newHistory = prev.history.slice(0, prev.historyIndex + 1);
      newHistory.push(change);
      
      // Begrenze History auf 50 Einträge
      if (newHistory.length > 50) {
        newHistory.shift();
      }
      
      return {
        ...prev,
        history: newHistory,
        historyIndex: newHistory.length - 1
      };
    });
  }, []);

  const undo = useCallback(() => {
    if (editorState.historyIndex > 0) {
      setEditorState(prev => ({
        ...prev,
        historyIndex: prev.historyIndex - 1
      }));
    }
  }, [editorState.historyIndex]);

  const redo = useCallback(() => {
    if (editorState.historyIndex < editorState.history.length - 1) {
      setEditorState(prev => ({
        ...prev,
        historyIndex: prev.historyIndex + 1
      }));
    }
  }, [editorState.historyIndex]);

  // ============================================================================
  // SLIDE MANAGEMENT
  // ============================================================================

  const addSlide = useCallback((templateType?: string) => {
    const newSlide: Slide = {
      title: 'Neue Folie',
      type: (templateType as any) || 'content',
      items: []
    };

    const newData = {
      ...editorState.presentationData,
      slides: [...editorState.presentationData.slides, newSlide]
    };

    const change: SlideChange = {
      type: 'slide_added',
      data: { slide: newSlide, index: editorState.presentationData.slides.length },
      timestamp: Date.now()
    };

    addToHistory(change);
    setEditorState(prev => ({
      ...prev,
      presentationData: newData,
      currentSlide: newData.slides.length - 1,
      selectedElement: null
    }));

    onDataChange(newData);
  }, [editorState.presentationData, addToHistory, onDataChange]);

  const deleteSlide = useCallback((slideIndex: number) => {
    if (totalSlides <= 1) return;

    const slideToDelete = editorState.presentationData.slides[slideIndex];
    const newData = {
      ...editorState.presentationData,
      slides: editorState.presentationData.slides.filter((_, i) => i !== slideIndex)
    };

    const change: SlideChange = {
      type: 'slide_removed',
      data: { slide: slideToDelete, index: slideIndex },
      timestamp: Date.now()
    };

    addToHistory(change);
    setEditorState(prev => ({
      ...prev,
      presentationData: newData,
      currentSlide: Math.min(prev.currentSlide, newData.slides.length - 1),
      selectedElement: null
    }));

    onDataChange(newData);
  }, [editorState.presentationData, totalSlides, addToHistory, onDataChange]);

  const duplicateSlide = useCallback((slideIndex: number) => {
    const slideToDuplicate = editorState.presentationData.slides[slideIndex];
    const newSlide: Slide = {
      ...slideToDuplicate,
      title: `${slideToDuplicate.title} (Kopie)`
    };

    const newData = {
      ...editorState.presentationData,
      slides: [
        ...editorState.presentationData.slides.slice(0, slideIndex + 1),
        newSlide,
        ...editorState.presentationData.slides.slice(slideIndex + 1)
      ]
    };

    const change: SlideChange = {
      type: 'slide_added',
      data: { slide: newSlide, index: slideIndex + 1 },
      timestamp: Date.now()
    };

    addToHistory(change);
    setEditorState(prev => ({
      ...prev,
      presentationData: newData,
      currentSlide: slideIndex + 1
    }));

    onDataChange(newData);
  }, [editorState.presentationData, addToHistory, onDataChange]);

  // ============================================================================
  // KI-INTEGRATION
  // ============================================================================

  const improveSlideWithAI = useCallback(async () => {
    if (!currentSlide) return;

    try {
      setEditorState(prev => ({ ...prev, isLoading: true }));

      const suggestions = 'Verbessere das Design und den Inhalt dieser Folie';
      const improvedSlide = await AIService.improveSlide(editorState.currentSlide.toString(), suggestions);

      const newData = {
        ...editorState.presentationData,
        slides: editorState.presentationData.slides.map((slide, index) =>
          index === editorState.currentSlide ? improvedSlide : slide
        )
      };

      const change: SlideChange = {
        type: 'slide_modified',
        slideIndex: editorState.currentSlide,
        data: { slide: improvedSlide },
        timestamp: Date.now()
      };

      addToHistory(change);
      setEditorState(prev => ({
        ...prev,
        presentationData: newData,
        isLoading: false
      }));

      onDataChange(newData);
    } catch (error) {
      console.error('KI-Verbesserung fehlgeschlagen:', error);
      setEditorState(prev => ({ ...prev, isLoading: false }));
    }
  }, [currentSlide, editorState.currentSlide, editorState.presentationData, addToHistory, onDataChange]);

  const generateContentWithAI = useCallback(async (topic: string, slideType: string) => {
    try {
      setEditorState(prev => ({ ...prev, isLoading: true }));

      const slideContent = await AIService.generateSlideContent(topic, slideType as any);
      
      const newSlide: Slide = {
        title: slideContent.title,
        type: slideType as any,
        items: slideContent.content.map(content => ({
          text: content,
          category: 'content',
          priority: 'mittel' as const
        }))
      };

      const newData = {
        ...editorState.presentationData,
        slides: [...editorState.presentationData.slides, newSlide]
      };

      const change: SlideChange = {
        type: 'slide_added',
        data: { slide: newSlide, index: editorState.presentationData.slides.length },
        timestamp: Date.now()
      };

      addToHistory(change);
      setEditorState(prev => ({
        ...prev,
        presentationData: newData,
        currentSlide: newData.slides.length - 1,
        isLoading: false,
        showTemplates: false
      }));

      onDataChange(newData);
    } catch (error) {
      console.error('KI-Content-Generierung fehlgeschlagen:', error);
      setEditorState(prev => ({ ...prev, isLoading: false }));
    }
  }, [editorState.presentationData, addToHistory, onDataChange]);

  const addImagesWithAI = useCallback(async () => {
    if (!currentSlide) return;

    try {
      setEditorState(prev => ({ ...prev, isLoading: true }));

      const slidesWithImages = await AIService.addImagesToSlides([currentSlide]);
      const enhancedSlide = slidesWithImages[0];

      const newData = {
        ...editorState.presentationData,
        slides: editorState.presentationData.slides.map((slide, index) =>
          index === editorState.currentSlide ? enhancedSlide : slide
        )
      };

      const change: SlideChange = {
        type: 'slide_modified',
        slideIndex: editorState.currentSlide,
        data: { slide: enhancedSlide },
        timestamp: Date.now()
      };

      addToHistory(change);
      setEditorState(prev => ({
        ...prev,
        presentationData: newData,
        isLoading: false
      }));

      onDataChange(newData);
    } catch (error) {
      console.error('KI-Bildhinzufügung fehlgeschlagen:', error);
      setEditorState(prev => ({ ...prev, isLoading: false }));
    }
  }, [currentSlide, editorState.currentSlide, editorState.presentationData, addToHistory, onDataChange]);

  // ============================================================================
  // KEYBOARD SHORTCUTS
  // ============================================================================

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (disabled) return;

      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'z':
            event.preventDefault();
            if (event.shiftKey) {
              redo();
            } else {
              undo();
            }
            break;
          case 'y':
            event.preventDefault();
            redo();
            break;
          case 's':
            event.preventDefault();
            // Save functionality
            break;
          case 'c':
            event.preventDefault();
            // Copy functionality
            break;
          case 'v':
            event.preventDefault();
            // Paste functionality
            break;
        }
      } else {
        switch (event.key) {
          case 'Delete':
          case 'Backspace':
            // Delete selected element
            break;
          case 'F5':
            event.preventDefault();
            onModeChange('presentation');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, undo, redo, onModeChange]);

  // ============================================================================
  // ZOOM UND GRID
  // ============================================================================

  const handleZoom = useCallback((newZoom: number) => {
    setEditorState(prev => ({ ...prev, zoom: Math.max(25, Math.min(200, newZoom)) }));
  }, []);

  const toggleGrid = useCallback(() => {
    setEditorState(prev => ({ ...prev, gridEnabled: !prev.gridEnabled }));
  }, []);

  // ============================================================================
  // ELEMENT MANAGEMENT
  // ============================================================================

  const selectElement = useCallback((elementId: string | null) => {
    setEditorState(prev => ({ ...prev, selectedElement: elementId }));
  }, []);

  const addElement = useCallback((element: SlideElement) => {
    // Element hinzufügen Logik
    console.log('Element hinzufügen:', element);
  }, []);

  const updateElement = useCallback((elementId: string, updates: Partial<SlideElement>) => {
    // Element aktualisieren Logik
    console.log('Element aktualisieren:', elementId, updates);
  }, []);

  const deleteElement = useCallback((elementId: string) => {
    // Element löschen Logik
    console.log('Element löschen:', elementId);
  }, []);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="h-full flex bg-slate-900">
      {/* Linke Sidebar - Slide Navigation */}
      <div className="w-64 bg-slate-950 border-r border-white/5 flex flex-col">
        <div className="p-4 border-b border-white/5">
          <h2 className="text-lg font-bold text-white">Folien</h2>
          <p className="text-xs text-slate-400">{totalSlides} Folien</p>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <SlideNavigation
            slides={editorState.presentationData.slides}
            currentSlide={editorState.currentSlide}
            onSlideSelect={(index) => setEditorState(prev => ({ ...prev, currentSlide: index }))}
            onSlideAdd={() => addSlide()}
            onSlideDelete={deleteSlide}
            onSlideDuplicate={duplicateSlide}
            onSlideMove={(fromIndex, toIndex) => {
              const newSlides = [...editorState.presentationData.slides];
              const [movedSlide] = newSlides.splice(fromIndex, 1);
              newSlides.splice(toIndex, 0, movedSlide);
              
              const newData = { ...editorState.presentationData, slides: newSlides };
              setEditorState(prev => ({ ...prev, presentationData: newData }));
              onDataChange(newData);
            }}
          />
        </div>

        {/* Vorlagen-Button */}
        <div className="p-4 border-t border-white/5">
          <button
            onClick={() => setEditorState(prev => ({ ...prev, showTemplates: !prev.showTemplates }))}
            className="w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Vorlagen
          </button>
        </div>
      </div>

      {/* Hauptbereich */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="bg-slate-950 border-b border-white/5 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Navigation */}
              <button
                onClick={() => setEditorState(prev => ({ 
                  ...prev, 
                  currentSlide: Math.max(0, prev.currentSlide - 1) 
                }))}
                disabled={editorState.currentSlide === 0}
                className="p-2 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              
              <span className="text-sm text-slate-400 px-2">
                {editorState.currentSlide + 1} von {totalSlides}
              </span>
              
              <button
                onClick={() => setEditorState(prev => ({ 
                  ...prev, 
                  currentSlide: Math.min(totalSlides - 1, prev.currentSlide + 1) 
                }))}
                disabled={editorState.currentSlide === totalSlides - 1}
                className="p-2 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1 ml-4">
                <button
                  onClick={() => handleZoom(editorState.zoom - 25)}
                  className="p-2 text-slate-400 hover:text-white transition-colors"
                >
                  <ZoomOutIcon className="w-4 h-4" />
                </button>
                <span className="text-xs text-slate-400 w-12 text-center">
                  {editorState.zoom}%
                </span>
                <button
                  onClick={() => handleZoom(editorState.zoom + 25)}
                  className="p-2 text-slate-400 hover:text-white transition-colors"
                >
                  <ZoomInIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Grid Toggle */}
              <button
                onClick={toggleGrid}
                className={`p-2 transition-colors ${
                  editorState.gridEnabled 
                    ? 'text-indigo-400 bg-indigo-500/20' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <GridIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* KI-Buttons */}
              <button
                onClick={improveSlideWithAI}
                disabled={editorState.isLoading}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <SparklesIcon className="w-4 h-4" />
                KI verbessern
              </button>

              <button
                onClick={addImagesWithAI}
                disabled={editorState.isLoading}
                className="px-3 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                🖼️ KI Bilder
              </button>

              {/* Undo/Redo */}
              <button
                onClick={undo}
                disabled={editorState.historyIndex <= 0}
                className="p-2 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
              >
                <UndoIcon className="w-4 h-4" />
              </button>

              <button
                onClick={redo}
                disabled={editorState.historyIndex >= editorState.history.length - 1}
                className="p-2 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
              >
                <RedoIcon className="w-4 h-4" />
              </button>

              {/* Mode Switches */}
              <button
                onClick={() => onModeChange('presentation')}
                className="px-3 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <PlayIcon className="w-4 h-4" />
                Präsentation
              </button>

              <button
                onClick={() => onModeChange('voice')}
                className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <EyeIcon className="w-4 h-4" />
                Voice-Modus
              </button>
            </div>
          </div>
        </div>

        {/* Haupt-Canvas-Bereich */}
        <div className="flex-1 flex">
          {/* Element Toolbar */}
          <div className="w-16 bg-slate-950 border-r border-white/5">
            <ElementToolbar
              onElementAdd={addElement}
              onElementTypeSelect={(type) => console.log('Element type selected:', type)}
              selectedElement={editorState.selectedElement}
            />
          </div>

          {/* Slide Canvas */}
          <div className="flex-1 relative bg-slate-800 overflow-hidden">
            <div
              ref={canvasRef}
              className="w-full h-full flex items-center justify-center p-8"
              style={{ 
                transform: `scale(${editorState.zoom / 100})`,
                transformOrigin: 'center'
              }}
            >
              {/* Slide Canvas */}
              <div className={`
                w-[960px] h-[720px] bg-white rounded-lg shadow-2xl relative
                ${editorState.gridEnabled ? 'bg-grid-pattern' : ''}
              `}>
                {currentSlide && (
                  <div className="p-8 h-full">
                    <h1 className="text-3xl font-bold text-gray-900 mb-6">
                      {currentSlide.title}
                    </h1>
                    
                    <div className="space-y-4">
                      {currentSlide.items.map((item, index) => (
                        <div key={index} className="flex items-start gap-4">
                          {item.imageUrl && (
                            <img 
                              src={item.imageUrl} 
                              alt={item.text}
                              className="w-16 h-16 object-cover rounded"
                            />
                          )}
                          <div className="flex-1">
                            <p className="text-gray-700">{item.text}</p>
                            {item.subItems && item.subItems.length > 0 && (
                              <ul className="ml-4 mt-2 space-y-1">
                                {item.subItems.map((subItem, subIndex) => (
                                  <li key={subIndex} className="text-gray-600 text-sm">
                                    • {subItem}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Loading Overlay */}
            {editorState.isLoading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="bg-slate-900 p-6 rounded-lg border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-white font-medium">KI arbeitet...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Properties Panel */}
          <div className="w-80 bg-slate-950 border-l border-white/5">
            <PropertiesPanel
              selectedElement={editorState.selectedElement}
              slide={currentSlide}
              onElementUpdate={updateElement}
              onSlideUpdate={(updates) => {
                const newData = {
                  ...editorState.presentationData,
                  slides: editorState.presentationData.slides.map((slide, index) =>
                    index === editorState.currentSlide ? { ...slide, ...updates } : slide
                  )
                };
                setEditorState(prev => ({ ...prev, presentationData: newData }));
                onDataChange(newData);
              }}
            />
          </div>
        </div>
      </div>

      {/* Vorlagen-Modal */}
      {editorState.showTemplates && (
        <SlideTemplates
          onTemplateSelect={(templateType, topic) => {
            generateContentWithAI(topic, templateType);
          }}
          onClose={() => setEditorState(prev => ({ ...prev, showTemplates: false }))}
        />
      )}
    </div>
  );
};

export default PresentationEditor;