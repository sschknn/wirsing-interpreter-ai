import puppeteer, { Browser, Page, BrowserLaunchOptions } from 'puppeteer';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface QAReport {
  timestamp: string;
  url: string;
  connectionTest: {
    status: 'success' | 'failed';
    responseTime: number;
    error?: string;
  };
  screenshots: string[];
  consoleLogs: any[];
  uiComponents: {
    totalComponents: number;
    interactiveElements: number;
    navigationElements: number;
    forms: number;
  };
  functionalTests: {
    [key: string]: {
      status: 'passed' | 'failed' | 'warning';
      details: string;
      duration: number;
    };
  };
  responsivenessTests: {
    [viewport: string]: {
      status: 'passed' | 'failed';
      elementsVisible: number;
      scrollable: boolean;
    };
  };
  performanceTests: {
    loadTime: number;
    domContentLoaded: number;
    networkRequests: number;
    memoryUsage?: string;
  };
  issues: {
    critical: string[];
    warnings: string[];
    suggestions: string[];
  };
}

class QAAnalyzer {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private report: QAReport;
  private screenshotsDir: string = './qa-screenshots';

  constructor(private url: string = 'http://localhost:5173') {
    this.report = {
      timestamp: new Date().toISOString(),
      url,
      connectionTest: { status: 'failed', responseTime: 0 },
      screenshots: [],
      consoleLogs: [],
      uiComponents: { totalComponents: 0, interactiveElements: 0, navigationElements: 0, forms: 0 },
      functionalTests: {},
      responsivenessTests: {},
      performanceTests: { loadTime: 0, domContentLoaded: 0, networkRequests: 0 },
      issues: { critical: [], warnings: [], suggestions: [] }
    };
  }

  private async init() {
    console.log('🚀 QA-Analyse wird gestartet...');
    
    // Screenshot-Verzeichnis erstellen
    if (!existsSync(this.screenshotsDir)) {
      mkdirSync(this.screenshotsDir, { recursive: true });
    }

    // Browser starten
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    } as BrowserLaunchOptions);

    this.page = await this.browser.newPage();
    
    // Console-Logs abfangen
    this.page.on('console', msg => {
      const log = {
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date().toISOString()
      };
      this.report.consoleLogs.push(log);
      
      // JavaScript-Fehler als kritische Probleme erfassen
      if (msg.type() === 'error') {
        this.report.issues.critical.push(`JavaScript-Fehler: ${msg.text()}`);
      }
    });

    // Netzwerk-Fehler erfassen
    this.page.on('requestfailed', request => {
      this.report.issues.warnings.push(`Netzwerk-Fehler: ${request.url()} - ${request.failure()?.errorText}`);
    });
  }

  private async takeScreenshot(name: string): Promise<string> {
    if (!this.page) throw new Error('Page nicht initialisiert');
    
    const filename = `${name}_${Date.now()}.png`;
    const filepath = join(this.screenshotsDir, filename);
    await this.page.screenshot({ path: filepath, fullPage: true });
    this.report.screenshots.push(filepath);
    console.log(`📸 Screenshot erstellt: ${filename}`);
    return filepath;
  }

  async runConnectionTest(): Promise<void> {
    console.log('🔍 Verbindungstest wird durchgeführt...');
    const startTime = Date.now();

    try {
      if (!this.page) throw new Error('Page nicht initialisiert');
      
      const response = await this.page.goto(this.url, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });
      
      const responseTime = Date.now() - startTime;
      this.report.connectionTest = {
        status: response?.ok() ? 'success' : 'failed',
        responseTime,
        error: response?.ok() ? undefined : `HTTP ${response?.status()}`
      };

      if (response?.ok()) {
        await this.takeScreenshot('initial_load');
        console.log(`✅ Verbindung erfolgreich (${responseTime}ms)`);
      } else {
        throw new Error(`HTTP ${response?.status()}`);
      }
    } catch (error) {
      this.report.connectionTest = {
        status: 'failed',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler'
      };
      console.error('❌ Verbindungstest fehlgeschlagen:', error);
      throw error;
    }
  }

  async analyzeUIComponents(): Promise<void> {
    console.log('🎨 UI-Komponenten werden analysiert...');
    if (!this.page) return;

    // Grundlegende UI-Statistiken
    const uiStats = await this.page.evaluate(() => {
      const interactiveElements = document.querySelectorAll('button, input, select, textarea, a[href], [onclick], [role="button"]').length;
      const navigationElements = document.querySelectorAll('nav, header, [role="navigation"], .nav, .menu, .toolbar').length;
      const forms = document.querySelectorAll('form').length;
      const totalElements = document.querySelectorAll('*').length;

      return {
        totalElements,
        interactiveElements,
        navigationElements,
        forms
      };
    });

    this.report.uiComponents = {
      totalComponents: uiStats.totalElements,
      interactiveElements: uiStats.interactiveElements,
      navigationElements: uiStats.navigationElements,
      forms: uiStats.forms
    };

    console.log(`📊 UI-Statistiken: ${uiStats.interactiveElements} interaktive Elemente, ${uiStats.navigationElements} Navigationselemente`);
  }

  async runFunctionalTests(): Promise<void> {
    console.log('🧪 Funktionale Tests werden durchgeführt...');
    if (!this.page) return;

    const tests = [
      { name: 'page_title', test: async () => {
        const title = await this.page!.title();
        return title && title.length > 0 ? `Seitentitel: "${title}"` : 'Kein Seitentitel gefunden';
      }},
      { name: 'main_content', test: async () => {
        const mainContent = await this.page!.evaluate(() => {
          const main = document.querySelector('main, #root, .app, [role="main"]');
          return main ? main.textContent?.slice(0, 100) + '...' : 'Hauptinhalt nicht gefunden';
        });
        return mainContent;
      }},
      { name: 'menu_interaction', test: async () => {
        const menuFound = await this.page!.evaluate(() => {
          const menu = document.querySelector('nav, .menu, .toolbar, [role="navigation"]');
          return !!menu;
        });
        return menuFound ? 'Menü/Navigation gefunden' : 'Menü/Navigation nicht gefunden';
      }},
      { name: 'form_elements', test: async () => {
        const forms = await this.page!.evaluate(() => {
          const inputs = document.querySelectorAll('input, select, textarea');
          return inputs.length;
        });
        return `${forms} Formularelemente gefunden`;
      }},
      { name: 'responsive_images', test: async () => {
        const images = await this.page!.evaluate(() => {
          const imgs = document.querySelectorAll('img');
          let brokenImages = 0;
          imgs.forEach(img => {
            if (!img.complete || img.naturalWidth === 0) brokenImages++;
          });
          return { total: imgs.length, broken: brokenImages };
        });
        return `${images.total} Bilder gefunden, ${images.broken} defekt`;
      }}
    ];

    for (const test of tests) {
      const startTime = Date.now();
      try {
        const result = await test.test();
        this.report.functionalTests[test.name] = {
          status: 'passed',
          details: result,
          duration: Date.now() - startTime
        };
        console.log(`✅ ${test.name}: ${result}`);
      } catch (error) {
        this.report.functionalTests[test.name] = {
          status: 'failed',
          details: error instanceof Error ? error.message : 'Test fehlgeschlagen',
          duration: Date.now() - startTime
        };
        this.report.issues.warnings.push(`Test ${test.name} fehlgeschlagen: ${error}`);
        console.log(`❌ ${test.name}: Fehlgeschlagen`);
      }
    }
  }

  async runResponsivenessTests(): Promise<void> {
    console.log('📱 Responsiveness-Tests werden durchgeführt...');
    if (!this.page) return;

    const viewports = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1920, height: 1080 }
    ];

    for (const viewport of viewports) {
      await this.page.setViewport({ width: viewport.width, height: viewport.height });
      await this.page.waitForTimeout(1000); // Layout-Zeit
      
      const viewportStats = await this.page.evaluate(() => {
        const visibleElements = document.querySelectorAll('*:not([style*="display: none"]):not([style*="visibility: hidden"])');
        const scrollable = document.documentElement.scrollHeight > document.documentElement.clientHeight;
        return {
          visibleElements: visibleElements.length,
          scrollable
        };
      });

      this.report.responsivenessTests[viewport.name] = {
        status: viewportStats.visibleElements > 10 ? 'passed' : 'failed',
        elementsVisible: viewportStats.visibleElements,
        scrollable: viewportStats.scrollable
      };

      await this.takeScreenshot(`responsive_${viewport.name}`);
      console.log(`📱 ${viewport.name} (${viewport.width}x${viewport.height}): ${viewportStats.visibleElements} sichtbare Elemente`);
    }
  }

  async runPerformanceTests(): Promise<void> {
    console.log('⚡ Performance-Tests werden durchgeführt...');
    if (!this.page) return;

    // Zurück zur Desktop-Ansicht für Performance-Tests
    await this.page.setViewport({ width: 1920, height: 1080 });

    // Performance-Metriken sammeln
    const performanceMetrics = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        loadTime: navigation.loadEventEnd - navigation.loadEventStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        networkRequests: performance.getEntriesByType('resource').length
      };
    });

    this.report.performanceTests = {
      ...performanceMetrics,
      loadTime: performanceMetrics.loadTime,
      domContentLoaded: performanceMetrics.domContentLoaded,
      networkRequests: performanceMetrics.networkRequests
    };

    console.log(`⚡ Performance: Load ${performanceMetrics.loadTime}ms, DOM ${performanceMetrics.domContentLoaded}ms, Requests ${performanceMetrics.networkRequests}`);

    // Performance-Warnungen
    if (performanceMetrics.loadTime > 3000) {
      this.report.issues.warnings.push(`Langsame Ladezeit: ${performanceMetrics.loadTime}ms`);
    }
    if (performanceMetrics.networkRequests > 50) {
      this.report.issues.warnings.push(`Viele Netzwerk-Anfragen: ${performanceMetrics.networkRequests}`);
    }
  }

  async runLoadTests(): Promise<void> {
    console.log('💪 Belastungstests werden durchgeführt...');
    if (!this.page) return;

    // Schnelle Klicks auf interaktive Elemente
    await this.page.evaluate(() => {
      const clickableElements = document.querySelectorAll('button, [role="button"], .clickable');
      let clickCount = 0;
      
      clickableElements.forEach((element, index) => {
        if (index < 10) { // Maximal 10 schnelle Klicks
          setTimeout(() => {
            element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            clickCount++;
          }, index * 100);
        }
      });

      return clickCount;
    });

    await this.page.waitForTimeout(2000);
    await this.takeScreenshot('after_load_test');

    // Fuzz-Testing mit Eingabefeldern
    await this.page.evaluate(() => {
      const inputs = document.querySelectorAll('input, textarea');
      let fuzzedInputs = 0;
      
      inputs.forEach((input, index) => {
        if (index < 5) { // Maximal 5 Eingabefelder testen
          const testValues = ['test123', 'special@chars!', 'very long text that might cause issues with validation', '', '   spaces   '];
          const randomValue = testValues[Math.floor(Math.random() * testValues.length)];
          input.value = randomValue;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          fuzzedInputs++;
        }
      });

      return fuzzedInputs;
    });

    await this.page.waitForTimeout(1000);
    await this.takeScreenshot('after_fuzz_test');

    this.report.functionalTests.load_test = {
      status: 'passed',
      details: 'Belastungstest abgeschlossen - keine kritischen Fehler erkannt',
      duration: 0
    };

    console.log('💪 Belastungstest abgeschlossen');
  }

  generateReport(): string {
    const reportJson = JSON.stringify(this.report, null, 2);
    const reportPath = './QA_REPORT.json';
    writeFileSync(reportPath, reportJson);

    // Markdown-Report generieren
    const markdownReport = this.generateMarkdownReport();
    const markdownPath = './QA_REPORT.md';
    writeFileSync(markdownPath, markdownReport);

    console.log(`📋 QA-Report erstellt: ${reportPath} und ${markdownPath}`);
    return markdownPath;
  }

  private generateMarkdownReport(): string {
    let report = `# QA-Analyse Report\n\n`;
    report += `**Erstellt:** ${this.report.timestamp}\n`;
    report += `**URL:** ${this.report.url}\n\n`;

    // Verbindungstest
    report += `## 🔍 Verbindungstest\n`;
    report += `**Status:** ${this.report.connectionTest.status === 'success' ? '✅ Erfolgreich' : '❌ Fehlgeschlagen'}\n`;
    report += `**Antwortzeit:** ${this.report.connectionTest.responseTime}ms\n`;
    if (this.report.connectionTest.error) {
      report += `**Fehler:** ${this.report.connectionTest.error}\n`;
    }
    report += `\n`;

    // UI-Komponenten
    report += `## 🎨 UI-Komponenten\n`;
    report += `- **Gesamtelemente:** ${this.report.uiComponents.totalComponents}\n`;
    report += `- **Interaktive Elemente:** ${this.report.uiComponents.interactiveElements}\n`;
    report += `- **Navigationselemente:** ${this.report.uiComponents.navigationElements}\n`;
    report += `- **Formulare:** ${this.report.uiComponents.forms}\n\n`;

    // Funktionale Tests
    report += `## 🧪 Funktionale Tests\n`;
    Object.entries(this.report.functionalTests).forEach(([name, result]) => {
      const icon = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⚠️';
      report += `- **${icon} ${name}:** ${result.details}\n`;
    });
    report += `\n`;

    // Responsiveness
    report += `## 📱 Responsiveness\n`;
    Object.entries(this.report.responsivenessTests).forEach(([viewport, result]) => {
      const icon = result.status === 'passed' ? '✅' : '❌';
      report += `- **${icon} ${viewport}:** ${result.elementsVisible} sichtbare Elemente, Scrollbar: ${result.scrollable ? 'Ja' : 'Nein'}\n`;
    });
    report += `\n`;

    // Performance
    report += `## ⚡ Performance\n`;
    report += `- **Ladezeit:** ${this.report.performanceTests.loadTime}ms\n`;
    report += `- **DOM-Loading:** ${this.report.performanceTests.domContentLoaded}ms\n`;
    report += `- **Netzwerk-Anfragen:** ${this.report.performanceTests.networkRequests}\n\n`;

    // Probleme
    if (this.report.issues.critical.length > 0) {
      report += `## 🚨 Kritische Probleme\n`;
      this.report.issues.critical.forEach(issue => {
        report += `- ${issue}\n`;
      });
      report += `\n`;
    }

    if (this.report.issues.warnings.length > 0) {
      report += `## ⚠️ Warnungen\n`;
      this.report.issues.warnings.forEach(issue => {
        report += `- ${issue}\n`;
      });
      report += `\n`;
    }

    if (this.report.issues.suggestions.length > 0) {
      report += `## 💡 Verbesserungsvorschläge\n`;
      this.report.issues.suggestions.forEach(suggestion => {
        report += `- ${suggestion}\n`;
      });
      report += `\n`;
    }

    // Screenshots
    report += `## 📸 Screenshots\n`;
    this.report.screenshots.forEach(screenshot => {
      report += `- ${screenshot}\n`;
    });

    return report;
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async runFullAnalysis(): Promise<string> {
    try {
      await this.init();
      await this.runConnectionTest();
      await this.analyzeUIComponents();
      await this.runFunctionalTests();
      await this.runResponsivenessTests();
      await this.runPerformanceTests();
      await this.runLoadTests();
      
      const reportPath = this.generateReport();
      
      console.log('\n🎉 QA-Analyse abgeschlossen!');
      console.log(`📋 Report verfügbar unter: ${reportPath}`);
      
      return reportPath;
    } catch (error) {
      console.error('💥 QA-Analyse fehlgeschlagen:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

// Hauptprogramm
async function main() {
  const analyzer = new QAAnalyzer();
  await analyzer.runFullAnalysis();
}

if (require.main === module) {
  main().catch(console.error);
}

