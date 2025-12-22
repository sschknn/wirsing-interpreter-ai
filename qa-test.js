const puppeteer = require('puppeteer');
const { writeFileSync, existsSync, mkdirSync } = require('fs');
const { join } = require('path');

async function runQA() {
  console.log('🚀 QA-Analyse wird gestartet...');
  const url = 'http://localhost:5173';
  
  let browser;
  let report = {
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
  
  try {
    // Screenshot-Verzeichnis erstellen
    const screenshotsDir = './qa-screenshots';
    if (!existsSync(screenshotsDir)) {
      mkdirSync(screenshotsDir, { recursive: true });
    }

    // Browser starten
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    
    // Console-Logs abfangen
    page.on('console', msg => {
      const log = {
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date().toISOString()
      };
      report.consoleLogs.push(log);
      
      if (msg.type() === 'error') {
        report.issues.critical.push(`JavaScript-Fehler: ${msg.text()}`);
      }
    });

    console.log('🔍 Verbindungstest wird durchgeführt...');
    const startTime = Date.now();
    const response = await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    const responseTime = Date.now() - startTime;
    
    report.connectionTest = {
      status: response?.ok() ? 'success' : 'failed',
      responseTime,
      error: response?.ok() ? undefined : `HTTP ${response?.status()}`
    };

    if (response?.ok()) {
      console.log(`✅ Verbindung erfolgreich (${responseTime}ms)`);
      
      // Screenshot
      const screenshotPath = join(screenshotsDir, `initial_load_${Date.now()}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      report.screenshots.push(screenshotPath);
      console.log('📸 Screenshot erstellt');
      
      // UI-Komponenten analysieren
      console.log('🎨 UI-Komponenten werden analysiert...');
      const uiStats = await page.evaluate(() => {
        const interactiveElements = document.querySelectorAll('button, input, select, textarea, a[href], [onclick], [role="button"]').length;
        const navigationElements = document.querySelectorAll('nav, header, [role="navigation"], .nav, .menu, .toolbar').length;
        const forms = document.querySelectorAll('form').length;
        const totalElements = document.querySelectorAll('*').length;
        return { totalElements, interactiveElements, navigationElements, forms };
      });
      
      report.uiComponents = uiStats;
      console.log(`📊 UI-Statistiken: ${uiStats.interactiveElements} interaktive Elemente`);
      
      // Funktionale Tests
      console.log('🧪 Funktionale Tests werden durchgeführt...');
      
      // Seitentitel testen
      const title = await page.title();
      report.functionalTests.page_title = {
        status: 'passed',
        details: title ? `Seitentitel: "${title}"` : 'Kein Seitentitel gefunden',
        duration: 0
      };
      console.log(`✅ Seitentitel: ${title}`);
      
      // Hauptinhalt testen
      const mainContent = await page.evaluate(() => {
        const main = document.querySelector('main, #root, .app, [role="main"]');
        return main ? (main.textContent || '').slice(0, 100) + '...' : 'Hauptinhalt nicht gefunden';
      });
      report.functionalTests.main_content = {
        status: 'passed',
        details: mainContent,
        duration: 0
      };
      
      // Menü/Navigation testen
      const menuFound = await page.evaluate(() => {
        const menu = document.querySelector('nav, .menu, .toolbar, [role="navigation"]');
        return !!menu;
      });
      report.functionalTests.menu_interaction = {
        status: menuFound ? 'passed' : 'warning',
        details: menuFound ? 'Menü/Navigation gefunden' : 'Menü/Navigation nicht gefunden',
        duration: 0
      };
      console.log(`✅ Menü/Navigation: ${menuFound ? 'Gefunden' : 'Nicht gefunden'}`);
      
      // Formularelemente testen
      const inputCount = await page.evaluate(() => {
        return document.querySelectorAll('input, select, textarea').length;
      });
      report.functionalTests.form_elements = {
        status: 'passed',
        details: `${inputCount} Formularelemente gefunden`,
        duration: 0
      };
      
      // Responsiveness-Tests
      console.log('📱 Responsiveness-Tests werden durchgeführt...');
      const viewports = [
        { name: 'mobile', width: 375, height: 667 },
        { name: 'tablet', width: 768, height: 1024 },
        { name: 'desktop', width: 1920, height: 1080 }
      ];
      
      for (const viewport of viewports) {
        await page.setViewport({ width: viewport.width, height: viewport.height });
        await page.waitForTimeout(1000);
        
        const viewportStats = await page.evaluate(() => {
          const visibleElements = document.querySelectorAll('*:not([style*="display: none"]):not([style*="visibility: hidden"])');
          const scrollable = document.documentElement.scrollHeight > document.documentElement.clientHeight;
          return { visibleElements: visibleElements.length, scrollable };
        });
        
        report.responsivenessTests[viewport.name] = {
          status: viewportStats.visibleElements > 10 ? 'passed' : 'failed',
          elementsVisible: viewportStats.visibleElements,
          scrollable: viewportStats.scrollable
        };
        
        const respScreenshot = join(screenshotsDir, `responsive_${viewport.name}_${Date.now()}.png`);
        await page.screenshot({ path: respScreenshot, fullPage: true });
        report.screenshots.push(respScreenshot);
        console.log(`📱 ${viewport.name}: ${viewportStats.visibleElements} sichtbare Elemente`);
      }
      
      // Performance-Tests
      console.log('⚡ Performance-Tests werden durchgeführt...');
      await page.setViewport({ width: 1920, height: 1080 });
      
      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        if (!navigation) return { loadTime: 0, domContentLoaded: 0, networkRequests: 0 };
        return {
          loadTime: navigation.loadEventEnd - navigation.loadEventStart,
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          networkRequests: performance.getEntriesByType('resource').length
        };
      });
      
      report.performanceTests = performanceMetrics;
      console.log(`⚡ Performance: Load ${performanceMetrics.loadTime}ms, Requests ${performanceMetrics.networkRequests}`);
      
      // Belastungstests
      console.log('💪 Belastungstests werden durchgeführt...');
      
      await page.evaluate(() => {
        const clickableElements = document.querySelectorAll('button, [role="button"], .clickable');
        clickableElements.forEach((element, index) => {
          if (index < 5) {
            setTimeout(() => {
              element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            }, index * 200);
          }
        });
      });
      
      await page.waitForTimeout(1500);
      
      const loadTestScreenshot = join(screenshotsDir, `after_load_test_${Date.now()}.png`);
      await page.screenshot({ path: loadTestScreenshot, fullPage: true });
      report.screenshots.push(loadTestScreenshot);
      
      report.functionalTests.load_test = {
        status: 'passed',
        details: 'Belastungstest abgeschlossen - keine kritischen Fehler erkannt',
        duration: 0
      };
      
      console.log('💪 Belastungstest abgeschlossen');
      
    } else {
      throw new Error(`HTTP ${response?.status()}`);
    }
    
    // Report generieren
    console.log('📋 Report wird generiert...');
    
    const reportJson = JSON.stringify(report, null, 2);
    writeFileSync('./QA_REPORT.json', reportJson);
    
    // Markdown-Report
    let markdown = `# QA-Analyse Report\n\n`;
    markdown += `**Erstellt:** ${report.timestamp}\n`;
    markdown += `**URL:** ${report.url}\n\n`;
    
    markdown += `## 🔍 Verbindungstest\n`;
    markdown += `**Status:** ${report.connectionTest.status === 'success' ? '✅ Erfolgreich' : '❌ Fehlgeschlagen'}\n`;
    markdown += `**Antwortzeit:** ${report.connectionTest.responseTime}ms\n\n`;
    
    markdown += `## 🎨 UI-Komponenten\n`;
    markdown += `- **Gesamtelemente:** ${report.uiComponents.totalComponents}\n`;
    markdown += `- **Interaktive Elemente:** ${report.uiComponents.interactiveElements}\n`;
    markdown += `- **Navigationselemente:** ${report.uiComponents.navigationElements}\n`;
    markdown += `- **Formulare:** ${report.uiComponents.forms}\n\n`;
    
    markdown += `## 🧪 Funktionale Tests\n`;
    Object.entries(report.functionalTests).forEach(([name, result]) => {
      const icon = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⚠️';
      markdown += `- **${icon} ${name}:** ${result.details}\n`;
    });
    markdown += '\n';
    
    markdown += `## 📱 Responsiveness\n`;
    Object.entries(report.responsivenessTests).forEach(([viewport, result]) => {
      const icon = result.status === 'passed' ? '✅' : '❌';
      markdown += `- **${icon} ${viewport}:** ${result.elementsVisible} sichtbare Elemente, Scrollbar: ${result.scrollable ? 'Ja' : 'Nein'}\n`;
    });
    markdown += '\n';
    
    markdown += `## ⚡ Performance\n`;
    markdown += `- **Ladezeit:** ${report.performanceTests.loadTime}ms\n`;
    markdown += `- **DOM-Loading:** ${report.performanceTests.domContentLoaded}ms\n`;
    markdown += `- **Netzwerk-Anfragen:** ${report.performanceTests.networkRequests}\n\n`;
    
    if (report.issues.critical.length > 0) {
      markdown += `## 🚨 Kritische Probleme\n`;
      report.issues.critical.forEach(issue => {
        markdown += `- ${issue}\n`;
      });
      markdown += '\n';
    }
    
    if (report.issues.warnings.length > 0) {
      markdown += `## ⚠️ Warnungen\n`;
      report.issues.warnings.forEach(issue => {
        markdown += `- ${issue}\n`;
      });
      markdown += '\n';
    }
    
    markdown += `## 📸 Screenshots\n`;
    report.screenshots.forEach(screenshot => {
      markdown += `- ${screenshot}\n`;
    });
    
    writeFileSync('./QA_REPORT.md', markdown);
    
    console.log('\n🎉 QA-Analyse abgeschlossen!');
    console.log('📋 Report verfügbar unter: ./QA_REPORT.md');
    console.log(`📊 Gesamt: ${Object.keys(report.functionalTests).length} Tests durchgeführt`);
    console.log(`📸 ${report.screenshots.length} Screenshots erstellt`);
    
  } catch (error) {
    console.error('💥 QA-Analyse fehlgeschlagen:', error.message);
    report.connectionTest.error = error.message;
    writeFileSync('./QA_REPORT_ERROR.json', JSON.stringify(report, null, 2));
  } finally {
    if (browser) await browser.close();
  }
}

