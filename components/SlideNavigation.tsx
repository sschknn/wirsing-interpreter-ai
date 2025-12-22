import * as React from 'react';
import { useState } from 'react';
import { Slide } from '../types';
import { 
  ChevronUpIcon, 
  ChevronDownIcon, 
  PlusIcon, 
  TrashIcon, 
  CopyIcon,
  EyeIcon 
} from './Icons';

// ============================================================================
// SLIDE NAVIGATION COMPONENT
// ============================================================================

interface SlideNavigationProps {
  slides: Slide[];
  currentSlide: number;
  onSlideSelect: (index: number) => void;
  onSlideAdd: () => void;
  onSlideDelete: (index: number) => void;
  onSlideDuplicate: (index: number) => void;
  onSlideMove: (fromIndex: number, toIndex: number) => void;
}

const SlideNavigation: React.FC<SlideNavigationProps> = ({
  slides,
  currentSlide,
  onSlideSelect,
  onSlideAdd,
  onSlideDelete,
  onSlideDuplicate,
  onSlideMove
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      onSlideMove(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const getSlideTypeIcon = (type: string) => {
    switch (type) {
      case 'strategy':
        return '📊';
      case 'tasks':
        return '✅';
      case 'ideas':
        return '💡';
      case 'problems':
        return '⚠️';
      case 'summary':
        return '📋';
      case 'suggestions':
        return '💬';
      case 'gallery':
        return '🖼️';
      default:
        return '📄';
    }
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Folien</h3>
        <button
          onClick={onSlideAdd}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
          title="Neue Folie hinzufügen"
        >
          <PlusIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Slides List */}
      <div className="space-y-2">
        {slides.map((slide, index) => {
          const isActive = index === currentSlide;
          const isDragged = index === draggedIndex;
          const isDragOver = index === dragOverIndex;
          const isDragTarget = draggedIndex !== null && draggedIndex !== index;

          return (
            <div
              key={index}
              className={`
                group relative rounded-lg border transition-all duration-200 cursor-pointer
                ${isActive 
                  ? 'border-indigo-500 bg-indigo-500/10 shadow-lg' 
                  : isDragOver
                  ? 'border-green-500 bg-green-500/10'
                  : isDragTarget
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                }
                ${isDragged ? 'opacity-50 transform scale-95' : ''}
              `}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              onClick={() => onSlideSelect(index)}
            >
              {/* Slide Content */}
              <div className="p-3">
                {/* Slide Number and Type */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`
                      text-xs font-mono px-1.5 py-0.5 rounded
                      ${isActive 
                        ? 'bg-indigo-500 text-white' 
                        : 'bg-slate-700 text-slate-300'
                      }
                    `}>
                      {index + 1}
                    </span>
                    <span className="text-xs">{getSlideTypeIcon(slide.type)}</span>
                  </div>
                  
                  {/* Status Indicators */}
                  <div className="flex items-center gap-1">
                    {slide.items && slide.items.length > 0 && (
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full" title="Hat Inhalt" />
                    )}
                    {slide.insights && slide.insights.length > 0 && (
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" title="Hat Insights" />
                    )}
                  </div>
                </div>

                {/* Slide Preview */}
                <div className="text-xs text-slate-300 mb-2 line-clamp-2">
                  {slide.title || `Folie ${index + 1}`}
                </div>

                {/* Content Preview */}
                <div className="text-xs text-slate-500 line-clamp-1">
                  {slide.items && slide.items.length > 0 
                    ? `${slide.items.length} Element${slide.items.length !== 1 ? 'e' : ''}`
                    : 'Leer'
                  }
                </div>
              </div>

              {/* Slide Actions - Only show on hover for non-active slides */}
              {!isActive && (
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSlideDuplicate(index);
                    }}
                    className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                    title="Folie duplizieren"
                  >
                    <CopyIcon className="w-3 h-3" />
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSlideDelete(index);
                    }}
                    className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                    title="Folie löschen"
                  >
                    <TrashIcon className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Active Indicator */}
              {isActive && (
                <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1">
                  <div className="w-1 h-8 bg-indigo-500 rounded-r-full" />
                </div>
              )}

              {/* Drag Handle */}
              {isActive && (
                <div className="absolute right-1 top-1 opacity-50">
                  <div className="w-3 h-3 flex flex-col justify-center">
                    <div className="w-full h-0.5 bg-slate-500 mb-0.5" />
                    <div className="w-full h-0.5 bg-slate-500 mb-0.5" />
                    <div className="w-full h-0.5 bg-slate-500" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {slides.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          <EyeIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-xs">Keine Folien vorhanden</p>
          <button
            onClick={onSlideAdd}
            className="mt-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded transition-colors"
          >
            Erste Folie erstellen
          </button>
        </div>
      )}

      {/* Quick Stats */}
      {slides.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Gesamt: {slides.length}</span>
            <span>Aktuell: {currentSlide + 1}</span>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-2 w-full bg-slate-700 rounded-full h-1">
            <div 
              className="bg-indigo-500 h-1 rounded-full transition-all duration-300"
              style={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Info */}
      <div className="mt-4 pt-4 border-t border-white/5">
        <div className="text-xs text-slate-600">
          <div className="font-medium mb-1">Tastatur:</div>
          <div className="space-y-0.5">
            <div>↑↓ Navigieren</div>
            <div>←→ Vorherige/Nächste</div>
            <div>+ Neue Folie</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlideNavigation;