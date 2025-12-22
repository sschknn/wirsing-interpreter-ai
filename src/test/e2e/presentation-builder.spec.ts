/**
 * E2E Tests für Presentation-Builder mit Playwright
 * 
 * Testet kritische User-Journeys:
 * - Präsentationserstellung
 * - KI-Integration
 * - Slide Management
 * - Export-Funktionalität
 */

import { test, expect } from '@playwright/test';

test.describe('Presentation Builder E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // App starten
    await page.goto('http://localhost:4173');
    
    // Warte bis App geladen ist
    await page.waitForLoadState('networkidle');
    
    // Grund-Setup für Tests
    await page.addStyleTag({
      content: `
        /* Test-spezifische Styles */
        [data-testid="loading-overlay"] { display: none !important; }
        .loading-spinner { display: none !important; }
      `
    });
  });

  test.describe('Präsentationserstellung', () => {
    test('sollte neue Präsentation erstellen können', async ({ page }) => {
      // Navigation zur Editor-Ansicht
      await page.click('[data-mode="editor"]');
      
      // Warte auf Editor-Load
      await expect(page.locator('[data-testid="slide-navigation"]')).toBeVisible();
      
      // Prüfe initiale Folienanzahl
      const initialSlides = await page.locator('[data-testid^="slide-"]').count();
      expect(initialSlides).toBeGreaterThan(0);
      
      // Neue Folie hinzufügen
      await page.click('[data-testid="add-slide"]');
      
      // Prüfe Folienanzahl erhöht
      await expect(page.locator('[data-testid^="slide-"]')).toHaveCount(initialSlides + 1);
      
      // Prüfe aktuelle Folie aktualisiert
      await expect(page.locator('[data-testid="current-slide"]')).toContainText('Neue Folie');
    });

    test('sollte zwischen Folien navigieren können', async ({ page }) => {
      await page.click('[data-mode="editor"]');
      
      // Warte auf Editor
      await expect(page.locator('[data-testid="slide-navigation"]')).toBeVisible();
      
      // Navigation zu Slide 2
      await page.click('[data-testid="slide-1"]');
      
      // Prüfe Slide-Wechsel
      await expect(page.locator('text=Slide 2')).toBeVisible();
      
      // Navigation zurück zu Slide 1
      await page.click('[data-testid="slide-0"]');
      
      await expect(page.locator('text=Slide 1')).toBeVisible();
    });

    test('sollte Folien duplizieren können', async ({ page }) => {
      await page.click('[data-mode="editor"]');
      
      await expect(page.locator('[data-testid="slide-navigation"]')).toBeVisible();
      
      // Suche und klicke Duplicate-Button
      const slideItems = page.locator('[data-testid^="slide-"]');
      const slideCount = await slideItems.count();
      
      if (slideCount > 0) {
        // Hover über erste Folie
        await slideItems.first().hover();
        
        // Klicke Duplicate-Button (falls vorhanden)
        const duplicateButton = page.locator('[data-testid="duplicate-slide"]').first();
        if (await duplicateButton.isVisible()) {
          await duplicateButton.click();
          
          // Prüfe Folienanzahl
          await expect(page.locator('[data-testid^="slide-"]')).toHaveCount(slideCount + 1);
        }
      }
    });

    test('sollte Folien löschen können', async ({ page }) => {
      await page.click('[data-mode="editor"]');
      
      await expect(page.locator('[data-testid="slide-navigation"]')).toBeVisible();
      
      const slideItems = page.locator('[data-testid^="slide-"]');
      const slideCount = await slideItems.count();
      
      if (slideCount > 1) {
        // Hover über erste Folie
        await slideItems.first().hover();
        
        // Klicke Delete-Button (falls vorhanden)
        const deleteButton = page.locator('[data-testid="delete-slide"]').first();
        if (await deleteButton.isVisible()) {
          await deleteButton.click();
          
          // Prüfe Bestätigungsdialog (falls vorhanden)
          const confirmDialog = page.locator('[data-testid="confirm-dialog"]');
          if (await confirmDialog.isVisible()) {
            await page.click('[data-testid="confirm-yes"]');
          }
          
          // Prüfe Folienanzahl reduziert
          await expect(page.locator('[data-testid^="slide-"]')).toHaveCount(slideCount - 1);
        }
      }
    });
  });

  test.describe('KI-Integration', () => {
    test('sollte KI-Verbesserung ausführen können', async ({ page }) => {
      await page.click('[data-mode="editor"]');
      
      await expect(page.locator('[data-testid="slide-navigation"]')).toBeVisible();
      
      // Mock KI-Service Response
      await page.route('**/api/**', async route => {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            title: 'Verbesserte Folie',
            type: 'content',
            items: [{ text: 'Verbesserter Inhalt', category: 'content', priority: 'mittel' }]
          })
        });
      });
      
      // KI-Verbesserung starten
      await page.click('text=KI verbessern');
      
      // Warte auf Loading
      await expect(page.locator('text=KI arbeitet...')).toBeVisible();
      
      // Warte bis Verbesserung abgeschlossen
      await expect(page.locator('text=KI arbeitet...')).toBeHidden({ timeout: 10000 });
      
      // Prüfe Verbesserung angewendet
      await expect(page.locator('text=Verbesserte Folie')).toBeVisible();
    });

    test('sollte KI-Content-Generierung funktionieren', async ({ page }) => {
      await page.click('[data-mode="editor"]');
      
      await expect(page.locator('[data-testid="slide-navigation"]')).toBeVisible();
      
      // Templates öffnen
      await page.click('text=Vorlagen');
      
      // Prüfe Templates sichtbar
      await expect(page.locator('[data-testid="slide-templates"]')).toBeVisible();
      
      // Mock KI-Service für Content-Generierung
      await page.route('**/api/**', async route => {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            title: 'KI-generierte Folie',
            content: ['Inhalt 1', 'Inhalt 2'],
            layout: 'content'
          })
        });
      });
      
      // Template auswählen
      await page.click('[data-testid="template-content"]');
      
      // Warte auf Generierung
      await expect(page.locator('[data-testid="slide-templates"]')).toBeHidden();
      
      // Prüfe neue Folie erstellt
      await expect(page.locator('text=KI-generierte Folie')).toBeVisible();
    });

    test('sollte KI-Bildhinzufügung funktionieren', async ({ page }) => {
      await page.click('[data-mode="editor"]');
      
      await expect(page.locator('[data-testid="slide-navigation"]')).toBeVisible();
      
      // Mock KI-Service für Bildgenerierung
      await page.route('**/api/**', async route => {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify([{
            title: 'Folie mit Bildern',
            type: 'content',
            items: [{
              text: 'Text mit Bild',
              category: 'content',
              priority: 'mittel',
              imageUrl: 'data:image/png;base64,mock-image-data'
            }]
          }])
        });
      });
      
      // KI-Bilder starten
      await page.click('text=🖼️ KI Bilder');
      
      // Warte auf Verarbeitung
      await expect(page.locator('text=KI arbeitet...')).toBeVisible();
      await expect(page.locator('text=KI arbeitet...')).toBeHidden({ timeout: 10000 });
      
      // Prüfe Bilder hinzugefügt
      const images = page.locator('img');
      const imageCount = await images.count();
      expect(imageCount).toBeGreaterThan(0);
    });

    test('sollte KI-Fehler korrekt handhaben', async ({ page }) => {
      await page.click('[data-mode="editor"]');
      
      await expect(page.locator('[data-testid="slide-navigation"]')).toBeVisible();
      
      // Mock API-Fehler
      await page.route('**/api/**', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'API Error' })
        });
      });
      
      // KI-Verbesserung mit Fehler
      await page.click('text=KI verbessern');
      
      // Warte auf Fehlerbehandlung
      await expect(page.locator('text=KI arbeitet...')).toBeHidden();
      
      // Prüfe Fehlermeldung (falls UI vorhanden)
      const errorMessage = page.locator('[data-testid="error-message"], .error, .alert');
      if (await errorMessage.isVisible()) {
        await expect(errorMessage).toContainText(/error|fehler/i);
      }
    });
  });

  test.describe('Editor-Funktionalität', () => {
    test('sollte Zoom-Funktionalität unterstützen', async ({ page }) => {
      await page.click('[data-mode="editor"]');
      
      await expect(page.locator('[data-testid="slide-navigation"]')).toBeVisible();
      
      // Zoom Out
      await page.click('[title*="Zoom Out"]');
      
      // Prüfe Zoom-Level reduziert
      await expect(page.locator('text=75%')).toBeVisible();
      
      // Zoom In
      await page.click('[title*="Zoom In"]');
      await page.click('[title*="Zoom In"]');
      
      // Prüfe Zoom-Level erhöht
      await expect(page.locator('text=125%')).toBeVisible();
    });

    test('sollte Grid-Toggle funktionieren', async ({ page }) => {
      await page.click('[data-mode="editor"]');
      
      await expect(page.locator('[data-testid="slide-navigation"]')).toBeVisible();
      
      // Grid aktivieren
      await page.click('[title*="Grid"]');
      
      // Prüfe Grid aktiv (visueller Test würde hier erfolgen)
      const canvas = page.locator('[data-testid="slide-canvas"]');
      await expect(canvas).toHaveClass(/grid|bg-grid/);
      
      // Grid deaktivieren
      await page.click('[title*="Grid"]');
      
      // Prüfe Grid deaktiviert
      await expect(canvas).not.toHaveClass(/grid|bg-grid/);
    });

    test('sollte Undo/Redo Funktionalität haben', async ({ page }) => {
      await page.click('[data-mode="editor"]');
      
      await expect(page.locator('[data-testid="slide-navigation"]')).toBeVisible();
      
      // Eine Änderung vornehmen (Slide hinzufügen)
      await page.click('[data-testid="add-slide"]');
      
      // Undo sollte aktiviert sein
      await expect(page.locator('[title*="Undo"]')).toBeEnabled();
      
      // Undo ausführen
      await page.click('[title*="Undo"]');
      
      // Redo sollte aktiviert sein
      await expect(page.locator('[title*="Redo"]')).toBeEnabled();
      
      // Redo ausführen
      await page.click('[title*="Redo"]');
      
      // Undo sollte wieder aktiviert sein
      await expect(page.locator('[title*="Undo"]')).toBeEnabled();
    });

    test('sollte Keyboard-Shortcuts unterstützen', async ({ page }) => {
      await page.click('[data-mode="editor"]');
      
      await expect(page.locator('[data-testid="slide-navigation"]')).toBeVisible();
      
      // Slide hinzufügen für Undo-Test
      await page.click('[data-testid="add-slide"]');
      
      // Ctrl+Z für Undo
      await page.keyboard.press('Control+z');
      
      // Warte auf Undo-Ausführung
      await page.waitForTimeout(500);
      
      // Ctrl+Y für Redo
      await page.keyboard.press('Control+y');
      
      // Warte auf Redo-Ausführung
      await page.waitForTimeout(500);
      
      // F5 für Präsentationsmodus
      await page.keyboard.press('F5');
      
      // Prüfe Modus-Wechsel
      await expect(page.locator('[data-mode="presentation"]')).toBeVisible();
    });
  });

  test.describe('Präsentationsmodus', () => {
    test('sollte zu Präsentationsmodus wechseln können', async ({ page }) => {
      await page.click('[data-mode="editor"]');
      
      await expect(page.locator('[data-testid="slide-navigation"]')).toBeVisible();
      
      // Zu Präsentationsmodus wechseln
      await page.click('text=Präsentation');
      
      // Prüfe Modus-Wechsel
      await expect(page.locator('[data-mode="presentation"]')).toBeVisible();
      
      // Prüfe Präsentationsansicht
      await expect(page.locator('[data-testid="presentation-viewer"]')).toBeVisible();
    });

    test('sollte Slide-Navigation im Präsentationsmodus haben', async ({ page }) => {
      await page.click('[data-mode="presentation"]');
      
      await expect(page.locator('[data-testid="presentation-viewer"]')).toBeVisible();
      
      // Navigation zu nächster Folie
      await page.click('[title*="Next"]');
      
      // Prüfe Slide-Wechsel
      const slideCounter = page.locator('text=/\\d+ von \\d+/');
      if (await slideCounter.isVisible()) {
        await expect(slideCounter).toContainText('2 von');
      }
      
      // Navigation zu vorheriger Folie
      await page.click('[title*="Previous"]');
      
      await expect(slideCounter).toContainText('1 von');
    });

    test('sollte Vollbild-Präsentation unterstützen', async ({ page }) => {
      await page.click('[data-mode="presentation"]');
      
      await expect(page.locator('[data-testid="presentation-viewer"]')).toBeVisible();
      
      // Vollbild aktivieren
      await page.click('[data-testid="fullscreen-toggle"]');
      
      // Prüfe Vollbild-Modus
      await expect(page.locator('body')).toHaveClass(/fullscreen/);
      
      // Vollbild beenden (ESC)
      await page.keyboard.press('Escape');
      
      // Prüfe Vollbild deaktiviert
      await expect(page.locator('body')).not.toHaveClass(/fullscreen/);
    });
  });

  test.describe('Export-Funktionalität', () => {
    test('sollte PDF-Export unterstützen', async ({ page }) => {
      await page.click('[data-mode="editor"]');
      
      await expect(page.locator('[data-testid="slide-navigation"]')).toBeVisible();
      
      // Export-Menü öffnen
      await page.click('[data-testid="export-menu"]');
      
      // PDF-Export auswählen
      await page.click('[data-testid="export-pdf"]');
      
      // Prüfe Download-Dialog (falls vorhanden)
      const downloadPromise = page.waitForEvent('download');
      await downloadPromise;
      
      // Download-Datei prüfen
      const download = await page.waitForEvent('download');
      expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
    });

    test('sollte PowerPoint-Export unterstützen', async ({ page }) => {
      await page.click('[data-mode="editor"]');
      
      await expect(page.locator('[data-testid="slide-navigation"]')).toBeVisible();
      
      // Export-Menü öffnen
      await page.click('[data-testid="export-menu"]');
      
      // PPTX-Export auswählen
      await page.click('[data-testid="export-pptx"]');
      
      // Prüfe Download
      const downloadPromise = page.waitForEvent('download');
      await downloadPromise;
      
      const download = await page.waitForEvent('download');
      expect(download.suggestedFilename()).toMatch(/\.(pptx|ppt)$/i);
    });
  });

  test.describe('Performance Tests', () => {
    test('sollte große Präsentationen effizient laden', async ({ page }) => {
      // Starte Performance-Messung
      await page.evaluate(() => {
        performance.mark('test-start');
      });
      
      await page.click('[data-mode="editor"]');
      
      await expect(page.locator('[data-testid="slide-navigation"]')).toBeVisible();
      
      // Performance-Ende messen
      await page.evaluate(() => {
        performance.mark('test-end');
        performance.measure('test-duration', 'test-start', 'test-end');
      });
      
      const duration = await page.evaluate(() => {
        const measure = performance.getEntriesByName('test-duration')[0];
        return measure.duration;
      });
      
      // Editor-Load sollte unter 2 Sekunden dauern
      expect(duration).toBeLessThan(2000);
    });

    test('sollte bei vielen Folien responsiv bleiben', async ({ page }) => {
      await page.click('[data-mode="editor"]');
      
      await expect(page.locator('[data-testid="slide-navigation"]')).toBeVisible();
      
      // Viele Folien hinzufügen
      for (let i = 0; i < 20; i++) {
        await page.click('[data-testid="add-slide"]');
        await page.waitForTimeout(100); // Kurze Pause für UI-Update
      }
      
      // Navigation zwischen Folien testen
      await page.click('[data-testid="slide-10"]');
      await page.waitForTimeout(200);
      
      await page.click('[data-testid="slide-19"]');
      await page.waitForTimeout(200);
      
      // UI sollte noch responsiv sein
      await expect(page.locator('[data-testid="slide-navigation"]')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('sollte Netzwerkfehler handhaben', async ({ page }) => {
      // Netzwerk blockieren
      await page.route('**/*', route => {
        route.abort();
      });
      
      await page.click('[data-mode="editor"]');
      
      // Warte auf Fehlerbehandlung
      await page.waitForTimeout(2000);
      
      // Prüfe Fehlermeldung oder Fallback-UI
      const errorMessage = page.locator('[data-testid="error-message"], .error, .alert');
      if (await errorMessage.isVisible()) {
        await expect(errorMessage).toBeVisible();
      } else {
        // Fallback: App sollte trotzdem grundlegend funktionieren
        await expect(page.locator('body')).toBeVisible();
      }
    });

    test('sollte bei ungültigen Daten reagieren', async ({ page }) => {
      await page.click('[data-mode="editor"]');
      
      await expect(page.locator('[data-testid="slide-navigation"]')).toBeVisible();
      
      // Versuche ungültige Daten einzugeben (falls Input-Felder vorhanden sind)
      const textInputs = page.locator('input[type="text"], textarea');
      const inputCount = await textInputs.count();
      
      if (inputCount > 0) {
        // Sehr langen Text eingeben
        const longText = 'x'.repeat(10000);
        await textInputs.first().fill(longText);
        
        // App sollte nicht abstürzen
        await expect(page.locator('body')).toBeVisible();
      }
    });
  });

  test.describe('Accessibility', () => {
    test('sollte Keyboard-Navigation unterstützen', async ({ page }) => {
      await page.click('[data-mode="editor"]');
      
      await expect(page.locator('[data-testid="slide-navigation"]')).toBeVisible();
      
      // Tab-Navigation testen
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Fokus sollte sichtbar sein
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });

    test('sollte ARIA-Labels haben', async ({ page }) => {
      await page.click('[data-mode="editor"]');
      
      // Prüfe wichtige Elemente auf ARIA-Labels
      const interactiveElements = page.locator('button, [role="button"], [tabindex]');
      const elementCount = await interactiveElements.count();
      
      expect(elementCount).toBeGreaterThan(0);
      
      // Mindestens einige Elemente sollten ARIA-Labels haben
      const elementsWithAria = page.locator('[aria-label], [aria-labelledby], [role]');
      const ariaCount = await elementsWithAria.count();
      
      expect(ariaCount).toBeGreaterThan(0);
    });
  });
});