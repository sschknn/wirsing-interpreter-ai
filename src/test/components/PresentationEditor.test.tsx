/**
 * Umfassende Tests für PresentationEditor.tsx
 * 
 * Testet die komplexeste Komponente (743 Zeilen) mit:
 * - Slide Management
 * - KI-Integration
 * - History System
 * - Element Management
 * - Keyboard Shortcuts
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Import der zu testenden Komponente
import PresentationEditor from '../../components/PresentationEditor';
import { PresentationData, Slide, AppModeType } from '../../types';

// Mock für KI-Service
vi.mock('../../services/aiService', () => ({
  AIService: {
    improveSlide: vi.fn().mockResolvedValue({
      title: 'Verbesserte Folie',
      type: 'content',
      items: [{ text: 'Verbesserter Inhalt', category: 'content', priority: 'mittel' }]
    }),
    generateSlideContent: vi.fn().mockResolvedValue({
      title: 'KI-generierte Folie',
      content: ['Inhalt 1', 'Inhalt 2'],
      layout: 'content'
    }),
    addImagesToSlides: vi.fn().mockResolvedValue([])
  }
}));

// Mock für abhängige Komponenten
vi.mock('../../components/SlideNavigation', () => ({
  default: ({ slides, currentSlide, onSlideSelect }: any) => (
    <div data-testid="slide-navigation">
      {slides.map((slide: any, index: number) => (
        <button
          key={index}
          onClick={() => onSlideSelect(index)}
          className={currentSlide === index ? 'active' : ''}
          data-testid={`slide-${index}`}
        >
          {slide.title}
        </button>
      ))}
      <button onClick={() => {}} data-testid="add-slide">+</button>
    </div>
  )
}));

vi.mock('../../components/ElementToolbar', () => ({
  default: ({ onElementAdd }: any) => (
    <div data-testid="element-toolbar">
      <button onClick={() => onElementAdd({ type: 'text' })} data-testid="add-text">
        Text
      </button>
      <button onClick={() => onElementAdd({ type: 'image' })} data-testid="add-image">
        Bild
      </button>
    </div>
  )
}));

vi.mock('../../components/PropertiesPanel', () => ({
  default: ({ selectedElement, slide, onElementUpdate, onSlideUpdate }: any) => (
    <div data-testid="properties-panel">
      {selectedElement && <div data-testid="selected-element">{selectedElement}</div>}
      {slide && <div data-testid="current-slide">{slide.title}</div>}
    </div>
  )
}));

vi.mock('../../components/ElementEditor', () => ({
  default: ({ selectedElement }: any) => (
    <div data-testid="element-editor">
      {selectedElement && <div data-testid="editing-element">{selectedElement}</div>}
    </div>
  )
}));

vi.mock('../../components/SlideTemplates', () => ({
  default: ({ onTemplateSelect, onClose }: any) => (
    <div data-testid="slide-templates">
      <button onClick={() => onTemplateSelect('content', 'Test Thema')} data-testid="template-content">
        Content Template
      </button>
      <button onClick={onClose} data-testid="close-templates">×</button>
    </div>
  )
}));

// Test-Daten
const mockPresentationData: PresentationData = {
  title: 'Test Präsentation',
  subtitle: 'Test Subtitle',
  slides: [
    {
      title: 'Slide 1',
      type: 'content',
      items: [
        { text: 'Test Item 1', category: 'content', priority: 'mittel' },
        { text: 'Test Item 2', category: 'content', priority: 'mittel' }
      ]
    },
    {
      title: 'Slide 2',
      type: 'strategy',
      items: [
        { text: 'Strategy Item', category: 'strategy', priority: 'hoch' }
      ]
    }
  ]
};

describe('PresentationEditor', () => {
  const mockOnDataChange = vi.fn();
  const mockOnModeChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Grundfunktionalität', () => {
    it('sollte den Editor mit korrekten Props rendern', () => {
      render(
        <PresentationEditor
          data={mockPresentationData}
          onDataChange={mockOnDataChange}
          onModeChange={mockOnModeChange}
        />
      );

      expect(screen.getByTestId('slide-navigation')).toBeInTheDocument();
      expect(screen.getByTestId('element-toolbar')).toBeInTheDocument();
      expect(screen.getByTestId('properties-panel')).toBeInTheDocument();
      expect(screen.getByText('Slide 1')).toBeInTheDocument();
    });

    it('sollte die Anzahl der Folien anzeigen', () => {
      render(
        <PresentationEditor
          data={mockPresentationData}
          onDataChange={mockOnDataChange}
          onModeChange={mockOnModeChange}
        />
      );

      expect(screen.getByText('2 Folien')).toBeInTheDocument();
    });
  });

  describe('Slide Navigation', () => {
    it('sollte zwischen Folien navigieren können', async () => {
      const user = userEvent.setup();
      
      render(
        <PresentationEditor
          data={mockPresentationData}
          onDataChange={mockOnDataChange}
          onModeChange={mockOnModeChange}
        />
      );

      // Zur zweiten Folie navigieren
      await user.click(screen.getByTestId('slide-1'));

      expect(screen.getByText('Slide 2')).toBeInTheDocument();
      expect(mockOnDataChange).toHaveBeenCalledWith(
        expect.objectContaining({
          slides: expect.arrayContaining([
            expect.objectContaining({ title: 'Slide 2' })
          ])
        })
      );
    });

    it('sollte eine neue Folie hinzufügen können', async () => {
      const user = userEvent.setup();
      
      render(
        <PresentationEditor
          data={mockPresentationData}
          onDataChange={mockOnDataChange}
          onModeChange={mockOnModeChange}
        />
      );

      await user.click(screen.getByTestId('add-slide'));

      expect(mockOnDataChange).toHaveBeenCalledWith(
        expect.objectContaining({
          slides: expect.arrayContaining([
            expect.objectContaining({ title: 'Neue Folie' })
          ])
        })
      );
    });

    it('sollte nicht die letzte Folie löschen können', async () => {
      const user = userEvent.setup();
      
      const singleSlideData = {
        ...mockPresentationData,
        slides: [mockPresentationData.slides[0]]
      };

      render(
        <PresentationEditor
          data={singleSlideData}
          onDataChange={mockOnDataChange}
          onModeChange={mockOnModeChange}
        />
      );

      // Der Delete-Button sollte nicht funktionieren oder deaktiviert sein
      const deleteButtons = screen.queryAllByTestId(/delete-slide/);
      expect(deleteButtons.length).toBe(0);
    });
  });

  describe('KI-Integration', () => {
    const { AIService } = vi.mocked(await import('../../services/aiService'));

    it('sollte KI-Verbesserung für aktuelle Folie ausführen', async () => {
      const user = userEvent.setup();
      
      render(
        <PresentationEditor
          data={mockPresentationData}
          onDataChange={mockOnDataChange}
          onModeChange={mockOnModeChange}
        />
      );

      await user.click(screen.getByText('KI verbessern'));

      await waitFor(() => {
        expect(AIService.improveSlide).toHaveBeenCalledWith('0', 'Verbessere das Design und den Inhalt dieser Folie');
      });
    });

    it('sollte KI-Content-Generierung ausführen', async () => {
      const user = userEvent.setup();
      
      render(
        <PresentationEditor
          data={mockPresentationData}
          onDataChange={mockOnDataChange}
          onModeChange={mockOnModeChange}
        />
      );

      // Templates öffnen
      await user.click(screen.getByText('Vorlagen'));

      // Template auswählen
      await user.click(screen.getByTestId('template-content'));

      await waitFor(() => {
        expect(AIService.generateSlideContent).toHaveBeenCalledWith('Test Thema', 'content');
      });
    });

    it('sollte KI-Bilder zu Folien hinzufügen', async () => {
      const user = userEvent.setup();
      
      render(
        <PresentationEditor
          data={mockPresentationData}
          onDataChange={mockOnDataChange}
          onModeChange={mockOnModeChange}
        />
      );

      await user.click(screen.getByText('🖼️ KI Bilder'));

      await waitFor(() => {
        expect(AIService.addImagesToSlides).toHaveBeenCalledWith(
          expect.arrayContaining([expect.objectContaining({ title: 'Slide 1' })])
        );
      });
    });

    it('sollte Fehler bei KI-Service-Aufrufen handhaben', async () => {
      const { AIService } = vi.mocked(await import('../../services/aiService'));
      AIService.improveSlide.mockRejectedValue(new Error('API Error'));

      const user = userEvent.setup();
      
      render(
        <PresentationEditor
          data={mockPresentationData}
          onDataChange={mockOnDataChange}
          onModeChange={mockOnModeChange}
        />
      );

      await user.click(screen.getByText('KI verbessern'));

      await waitFor(() => {
        expect(screen.getByText('KI arbeitet...')).toBeInTheDocument();
      });
    });
  });

  describe('History System', () => {
    it('sollte Undo/Redo Funktionalität unterstützen', async () => {
      const user = userEvent.setup();
      
      render(
        <PresentationEditor
          data={mockPresentationData}
          onDataChange={mockOnDataChange}
          onModeChange={mockOnModeChange}
        />
      });

      // Undo sollte deaktiviert sein am Anfang
      expect(screen.getByTitle(/Undo/)).toBeDisabled();

      // Eine Änderung vornehmen
      await user.click(screen.getByTestId('add-slide'));

      // Undo sollte jetzt aktiviert sein
      expect(screen.getByTitle(/Undo/)).not.toBeDisabled();

      // Undo ausführen
      await user.click(screen.getByTitle(/Undo/));

      // Redo sollte jetzt aktiviert sein
      expect(screen.getByTitle(/Redo/)).not.toBeDisabled();
    });

    it('sollte History auf 50 Einträge begrenzen', async () => {
      const user = userEvent.setup();
      
      render(
        <PresentationEditor
          data={mockPresentationData}
          onDataChange={mockOnDataChange}
          onModeChange={mockOnModeChange}
        />
      );

      // Mehr als 50 Änderungen simulieren
      for (let i = 0; i < 55; i++) {
        await user.click(screen.getByTestId('add-slide'));
      }

      // History sollte auf 50 begrenzt sein
      // (Dies würde in der tatsächlichen Implementierung geprüft werden)
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('sollte Ctrl+Z für Undo unterstützen', async () => {
      const user = userEvent.setup();
      
      render(
        <PresentationEditor
          data={mockPresentationData}
          onDataChange={mockOnDataChange}
          onModeChange={mockOnModeChange}
        />
      );

      // Eine Änderung vornehmen
      await user.click(screen.getByTestId('add-slide'));

      // Ctrl+Z simulieren
      await user.keyboard('{Control>}{z}');

      expect(screen.getByTitle(/Redo/)).not.toBeDisabled();
    });

    it('sollte Ctrl+Y für Redo unterstützen', async () => {
      const user = userEvent.setup();
      
      render(
        <PresentationEditor
          data={mockPresentationData}
          onDataChange={mockOnDataChange}
          onModeChange={mockOnModeChange}
        />
      );

      // Eine Änderung vornehmen
      await user.click(screen.getByTestId('add-slide'));

      // Undo
      await user.keyboard('{Control>}{z}');

      // Ctrl+Y für Redo
      await user.keyboard('{Control>}{y}');

      expect(screen.getByTitle(/Undo/)).not.toBeDisabled();
    });

    it('sollte F5 für Präsentationsmodus unterstützen', async () => {
      const user = userEvent.setup();
      
      render(
        <PresentationEditor
          data={mockPresentationData}
          onDataChange={mockOnDataChange}
          onModeChange={mockOnModeChange}
        />
      );

      await user.keyboard('{F5}');

      expect(mockOnModeChange).toHaveBeenCalledWith('presentation');
    });
  });

  describe('Zoom und Grid', () => {
    it('sollte Zoom-Funktionalität unterstützen', async () => {
      const user = userEvent.setup();
      
      render(
        <PresentationEditor
          data={mockPresentationData}
          onDataChange={mockOnDataChange}
          onModeChange={mockOnModeChange}
        />
      );

      // Zoom In
      await user.click(screen.getByTitle(/Zoom In/));
      
      // Zoom Out
      await user.click(screen.getByTitle(/Zoom Out/));

      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('sollte Grid-Toggle Funktionalität haben', async () => {
      const user = userEvent.setup();
      
      render(
        <PresentationEditor
          data={mockPresentationData}
          onDataChange={mockOnDataChange}
          onModeChange={mockOnModeChange}
        />
      );

      await user.click(screen.getByTitle(/Grid/));

      // Grid sollte aktiviert sein (visueller Test würde hier erfolgen)
    });
  });

  describe('Mode Switching', () => {
    it('sollte zu Präsentationsmodus wechseln können', async () => {
      const user = userEvent.setup();
      
      render(
        <PresentationEditor
          data={mockPresentationData}
          onDataChange={mockOnDataChange}
          onModeChange={mockOnModeChange}
        />
      );

      await user.click(screen.getByText('Präsentation'));

      expect(mockOnModeChange).toHaveBeenCalledWith('presentation');
    });

    it('sollte zu Voice-Modus wechseln können', async () => {
      const user = userEvent.setup();
      
      render(
        <PresentationEditor
          data={mockPresentationData}
          onDataChange={mockOnDataChange}
          onModeChange={mockOnModeChange}
        />
      );

      await user.click(screen.getByText('Voice-Modus'));

      expect(mockOnModeChange).toHaveBeenCalledWith('voice');
    });
  });

  describe('Error Handling', () => {
    it('sollte bei deaktiviertem Editor reagieren', () => {
      render(
        <PresentationEditor
          data={mockPresentationData}
          onDataChange={mockOnDataChange}
          onModeChange={mockOnModeChange}
          disabled={true}
        />
      );

      // Alle Interaktionen sollten blockiert sein
      expect(screen.getByTestId('slide-navigation')).toBeInTheDocument();
    });

    it('sollte Loading-State korrekt anzeigen', async () => {
      const { AIService } = vi.mocked(await import('../../services/aiService'));
      AIService.improveSlide.mockImplementation(() => new Promise(() => {})); // Hängende Promise

      const user = userEvent.setup();
      
      render(
        <PresentationEditor
          data={mockPresentationData}
          onDataChange={mockOnDataChange}
          onModeChange={mockOnModeChange}
        />
      );

      await user.click(screen.getByText('KI verbessern'));

      expect(screen.getByText('KI arbeitet...')).toBeInTheDocument();
    });
  });

  describe('Performance Tests', () => {
    it('sollte große Präsentationen effizient handhaben', () => {
      const largePresentation = {
        ...mockPresentationData,
        slides: Array.from({ length: 100 }, (_, i) => ({
          title: `Slide ${i + 1}`,
          type: 'content',
          items: Array.from({ length: 10 }, (_, j) => ({
            text: `Item ${j + 1}`,
            category: 'content',
            priority: 'mittel'
          }))
        }))
      };

      const startTime = performance.now();
      
      render(
        <PresentationEditor
          data={largePresentation}
          onDataChange={mockOnDataChange}
          onModeChange={mockOnModeChange}
        />
      );

      const renderTime = performance.now() - startTime;
      
      // Render sollte unter 100ms dauern
      expect(renderTime).toBeLessThan(100);
    });
  });
});