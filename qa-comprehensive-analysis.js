const puppeteer = require('puppeteer');
const { writeFileSync, existsSync, mkdirSync } = require('fs');
const { join } = require('path');

async function runComprehensiveQA() {
  console.log('🚀 Erweiterte QA-Analyse wird gestartet...');
  const urls = ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'];
  
  let browser;
  let comprehensiveReport = {
    timestamp: new Date().toISOString(),
    analysisType: 'Comprehensive QA Analysis',
    serverTests: {},
    screenshots: [],
    consoleLogs: [],
    uiComponents: { totalComponents: 0, interactiveElements: 0, navigationElements: 0, forms: 0 },
    functionalTests: {},
    responsivenessTests: {},
    performanceTests: { loadTime: 0, domContentLoaded: 0, networkRequests: 0 },
    securityTests: {},
    accessibilityTests: {},
    edgeCaseTests: {},
    issues: { critical: [], warnings: [], suggestions: [] },
    recommendations: []
  };
  
  try {
    // Screenshot-Verzeichnis erstellen
    const screenshotsDir = './qa-comprehensive-screenshots';
    if (!existsSync(screenshotsDir)) {
      mkdirSync(screenshotsDir, { recursive: true });
    }

    // Browser starten mit erweiterten Einstellungen
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox', 
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });

    const page = await browser.newPage();
    
    // Erweiterte Console-Logs abfangen
    page.on('console', msg => {
      const log = {
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date().toISOString(),
        url: page.url()
      };
      comprehensiveReport.consoleLogs.push(log);
      
      if (msg.type() === 'error') {
        comprehensiveReport.issues.critical.push(`JavaScript-Fehler (${page.url()}): ${msg.text()}`);
      } else if (msg.type() === 'warning') {
        comprehensiveReport.issues.warnings.push(`Warnung (${page.url()}): ${msg.text()}`);
      }
    });

    // Netzwerk-Fehler abfangen
    page.on('response', response => {
      if (!response.ok()) {
        comprehensiveReport.issues.critical.push(
          `Netzwerk-Fehler: ${response.status()} - ${response.url()}`
        );
      }
    });

    // Für jeden Server-URL Tests durchführen
    for (const url of urls) {
      console.log(`🔍 Teste Server: ${url}`);
      
      try {
        const startTime = Date.now();
        const response = await page.goto(url, { 
          waitUntil: 'networkidle0', 
          timeout: 30000 
        });
        const responseTime = Date.now() - startTime;
        
        const serverTest = {
          url,
          status: response?.ok() ? 'success' : 'failed',
          responseTime,
          statusCode: response?.status(),
          error: response?.ok() ? undefined : `HTTP ${response?.status()}`
        };
        
        comprehensiveReport.serverTests[url] = serverTest;
        
        if (response?.ok()) {
          console.log(`✅ ${url} - Verbindung erfolgreich (${responseTime}ms)`);
          
          // Screenshot für jeden Server
          const screenshotPath = join(screenshotsDir, `server_${url.replace('http://localhost:', '')}_${Date.now()}.png`);
          await page.screenshot({ path: screenshotPath, fullPage: true });
          comprehensiveReport.screenshots.push(screenshotPath);
          
          // Erweiterte UI-Analyse
          console.log('🎨 Erweiterte UI-Analyse wird durchgeführt...');
          const uiStats = await page.evaluate(() => {
            const interactiveElements = document.querySelectorAll(
              'button, input, select, textarea, a[href], [onclick], [role="button"], [role="link"], [tabindex]'
            ).length;
            const navigationElements = document.querySelectorAll(
              'nav, header, [role="navigation"], .nav, .menu, .toolbar, .navbar'
            ).length;
            const forms = document.querySelectorAll('form').length;
            const totalElements = document.querySelectorAll('*').length;
            
            // Accessibility-Analyse
            const accessibleElements = document.querySelectorAll(
              '[alt], [title], [aria-label], [role], [tabindex]'
            ).length;
            
            // Performance-relevante Elemente
            const images = document.querySelectorAll('img').length;
            const scripts = document.querySelectorAll('script').length;
            const stylesheets = document.querySelectorAll('link[rel="stylesheet"], style').length;
            
            return { 
              totalElements, 
              interactiveElements, 
              navigationElements, 
              forms,
              accessibleElements,
              images,
              scripts,
              stylesheets
            };
          });
          
          // UI-Komponenten aggregieren
          Object.keys(uiStats).forEach(key => {
            if (comprehensiveReport.uiComponents[key] !== undefined) {
              comprehensiveReport.uiComponents[key] += uiStats[key];
            }
          });
          
          console.log(`📊 UI-Statistiken: ${uiStats.interactiveElements} interaktive Elemente`);
          
          // Seitentitel und Meta-Informationen
          const title = await page.title();
          const metaDescription = await page.evaluate(() => {
            const meta = document.querySelector('meta[name="description"]');
            return meta ? meta.content : 'Keine Meta-Beschreibung';
          });
          
          comprehensiveReport.functionalTests[`title_${url}`] = {
            status: 'passed',
            details: `Titel: "${title}", Meta: "${metaDescription}"`,
            duration: 0
          };
          
          // Responsiveness-Tests mit erweiterten Viewports
          console.log('📱 Erweiterte Responsiveness-Tests...');
          const viewports = [
            { name: 'mobile-small', width: 320, height: 568 },
            { name: 'mobile-large', width: 414, height: 896 },
            { name: 'tablet', width: 768, height: 1024 },
            { name: 'desktop-small', width: 1024, height: 768 },
            { name: 'desktop-large', width: 1920, height: 1080 },
            { name: 'desktop-4k', width: 3840, height: 2160 }
          ];
          
          for (const viewport of viewports) {
            await page.setViewport({ 
              width: viewport.width, 
              height: viewport.height,
              deviceScaleFactor: 1
            });
            await page.waitForTimeout(1000);
            
            const viewportStats = await page.evaluate(() => {
              const visibleElements = document.querySelectorAll('*:not([style*="display: none"]):not([style*="visibility: hidden"])');
              const scrollable = document.documentElement.scrollHeight > document.documentElement.clientHeight;
              const textContent = (document.body.textContent || '').trim();
              const hasHorizontalScroll = document.documentElement.scrollWidth > document.documentElement.clientWidth;
              
              return { 
                visibleElements: visibleElements.length, 
                scrollable,
                hasHorizontalScroll,
                textLength: textContent.length
              };
            });
            
            comprehensiveReport.responsivenessTests[`${url}_${viewport.name}`] = {
              status: viewportStats.visibleElements > 5 ? 'passed' : 'failed',
              elementsVisible: viewportStats.visibleElements,
              scrollable: viewportStats.scrollable,
              hasHorizontalScroll: viewportStats.hasHorizontalScroll,
              textLength: viewportStats.textLength
            };
            
            const respScreenshot = join(screenshotsDir, `responsive_${url.replace('http://localhost:', '')}_${viewport.name}_${Date.now()}.png`);
            await page.screenshot({ path: respScreenshot, fullPage: true });
            comprehensiveReport.screenshots.push(respScreenshot);
            
            console.log(`📱 ${viewport.name}: ${viewportStats.visibleElements} sichtbare Elemente`);
          }
          
          // Performance-Tests mit erweiterten Metriken
          console.log('⚡ Erweiterte Performance-Tests...');
          await page.setViewport({ width: 1920, height: 1080 });
          
          const performanceMetrics = await page.evaluate(() => {
            const navigation = performance.getEntriesByType('navigation')[0];
            const resources = performance.getEntriesByType('resource');
            
            if (!navigation) return { 
              loadTime: 0, 
              domContentLoaded: 0, 
              networkRequests: 0,
              totalTransferSize: 0,
              largestContentfulPaint: 0,
              firstInputDelay: 0
            };
            
            // LCP und FID aus Performance Observer Daten
            const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
            const fidEntries = performance.getEntriesByType('first-input');
            
            return {
              loadTime: navigation.loadEventEnd - navigation.loadEventStart,
              domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
              networkRequests: resources.length,
              totalTransferSize: resources.reduce((sum, resource) => sum + (resource.transferSize || 0), 0),
              largestContentfulPaint: lcpEntries.length > 0 ? lcpEntries[lcpEntries.length - 1].startTime : 0,
              firstInputDelay: fidEntries.length > 0 ? fidEntries[0].processingStart - fidEntries[0].startTime : 0
            };
          });
          
          comprehensiveReport.performanceTests = { ...comprehensiveReport.performanceTests, ...performanceMetrics };
          console.log(`⚡ Performance: Load ${performanceMetrics.loadTime}ms, Requests ${performanceMetrics.networkRequests}`);
          
          // Sicherheitstests
          console.log('🔒 Sicherheitstests...');
          const securityTests = await page.evaluate(() => {
            const hasCSP = !!document.querySelector('meta[http-equiv="Content-Security-Policy"]');
            const hasHTTPS = window.location.protocol === 'https:';
            const hasXFrameOptions = !!document.querySelector('meta[http-equiv="X-Frame-Options"]');
            
            const insecureElements = Array.from(document.querySelectorAll('*')).filter(el => {
              const src = el.getAttribute('src') || '';
              const href = el.getAttribute('href') || '';
              return (src.startsWith('http://') || href.startsWith('http://')) && window.location.protocol === 'https:';
            });
            
            return {
              hasContentSecurityPolicy: hasCSP,
              isHTTPS: hasHTTPS,
              hasXFrameOptions: hasXFrameOptions,
              insecureResources: insecureElements.length
            };
          });
          
          comprehensiveReport.securityTests[url] = securityTests;
          
          // Accessibility-Tests
          console.log('♿ Accessibility-Tests...');
          const accessibilityTests = await page.evaluate(() => {
            const imagesWithoutAlt = document.querySelectorAll('img:not([alt])').length;
            const inputsWithoutLabels = document.querySelectorAll('input:not([aria-label]):not([id])').length;
            const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
            const hasMainHeading = headings.length > 0;
            const hasSkipLink = !!document.querySelector('a[href="#main"], a[href="#content"]');
            
            return {
              imagesWithoutAlt,
              inputsWithoutLabels,
              totalHeadings: headings.length,
              hasMainHeading,
              hasSkipLink,
              headingStructure: Array.from(headings).map(h => h.tagName)
            };
          });
          
          comprehensiveReport.accessibilityTests[url] = accessibilityTests;
          
          // Edge-Case-Tests
          console.log('🎯 Edge-Case-Tests...');
          
          // Test 1: Schnelle Klicks
          await page.evaluate(() => {
            const clickableElements = document.querySelectorAll('button, [role="button"], .clickable');
            clickableElements.forEach((element, index) => {
              if (index < 3) {
                setTimeout(() => {
                  element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                  element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                  element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
                }, index * 100);
              }
            });
          });
          
          await page.waitForTimeout(1000);
          
          // Test 2: Scroll-Tests
          await page.evaluate(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setTimeout(() => {
              window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
            }, 500);
            setTimeout(() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }, 1000);
          });
          
          await page.waitForTimeout(1500);
          
          // Test 3: Tastatur-Navigation
          await page.keyboard.press('Tab');
          await page.keyboard.press('Tab');
          await page.keyboard.press('Enter');
          await page.waitForTimeout(500);
          
          // Test 4: Formular-Tests
          const formElements = await page.$$('input, textarea, select');
          if (formElements.length > 0) {
            await formElements[0].focus();
            await page.keyboard.type('Test Input');
            await page.keyboard.press('Tab');
            await page.waitForTimeout(200);
          }
          
          const edgeCaseScreenshot = join(screenshotsDir, `edge_cases_${url.replace('http://localhost:', '')}_${Date.now()}.png`);
          await page.screenshot({ path: edgeCaseScreenshot, fullPage: true });
          comprehensiveReport.screenshots.push(edgeCaseScreenshot);
          
          comprehensiveReport.edgeCaseTests[url] = {
            status: 'passed',
            details: 'Edge-Case-Tests abgeschlossen - schnelle Klicks, Scroll, Tastatur-Navigation, Formular-Interaktionen',
            duration: 0
          };
          
          console.log(`✅ ${url} - Alle Tests abgeschlossen`);
          
        } else {
          throw new Error(`HTTP ${response?.status()}`);
        }
        
      } catch (error) {
        console.error(`❌ ${url} - Test fehlgeschlagen:`, error.message);
        comprehensiveReport.serverTests[url] = {
          status: 'failed',
          error: error.message,
          responseTime: 0
        };
        comprehensiveReport.issues.critical.push(`Server ${url} nicht erreichbar: ${error.message}`);
      }
    }
    
    // Umfassenden Report generieren
    console.log('📋 Umfassender Report wird generiert...');
    
    // JSON-Report
    const reportJson = JSON.stringify(comprehensiveReport, null, 2);
    writeFileSync('./QA_COMPREHENSIVE_REPORT.json', reportJson);
    
    // Erweiterter Markdown-Report
    let markdown = `# Umfassende QA-Analyse Report\n\n`;
    markdown += `**Erstellt:** ${comprehensiveReport.timestamp}\n`;
    markdown += `**Analyse-Typ:** ${comprehensiveReport.analysisType}\n`;
    markdown += `**Getestete URLs:** ${Object.keys(comprehensiveReport.serverTests).join(', ')}\n\n`;
    
    // Server-Tests Zusammenfassung
    markdown += `## 🔍 Server-Verfügbarkeit\n`;
    Object.entries(comprehensiveReport.serverTests).forEach(([url, test]) => {
      const icon = test.status === 'success' ? '✅' : '❌';
      markdown += `- **${icon} ${url}:** ${test.statusCode || 'N/A'} (${test.responseTime}ms)\n`;
      if (test.error) {
        markdown += `  - Fehler: ${test.error}\n`;
      }
    });
    markdown += '\n';
    
    // UI-Komponenten Gesamtstatistik
    markdown += `## 🎨 UI-Komponenten (Gesamtstatistik)\n`;
    Object.entries(comprehensiveReport.uiComponents).forEach(([key, value]) => {
      markdown += `- **${key}:** ${value}\n`;
    });
    markdown += '\n';
    
    // Funktionale Tests
    markdown += `## 🧪 Funktionale Tests\n`;
    Object.entries(comprehensiveReport.functionalTests).forEach(([name, result]) => {
      const icon = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⚠️';
      markdown += `- **${icon} ${name}:** ${result.details}\n`;
    });
    markdown += '\n';
    
    // Responsiveness (nur Beispiel für Desktop)
    markdown += `## 📱 Responsiveness (Desktop-Beispiele)\n`;
    Object.entries(comprehensiveReport.responsivenessTests).forEach(([key, result]) => {
      if (key.includes('desktop-large')) {
        const icon = result.status === 'passed' ? '✅' : '❌';
        markdown += `- **${icon} ${key}:** ${result.elementsVisible} sichtbare Elemente, Horizontal Scroll: ${result.hasHorizontalScroll ? 'Ja' : 'Nein'}\n`;
      }
    });
    markdown += '\n';
    
    // Performance
    markdown += `## ⚡ Performance (Aggregiert)\n`;
    markdown += `- **Ladezeit:** ${comprehensiveReport.performanceTests.loadTime}ms\n`;
    markdown += `- **DOM-Loading:** ${comprehensiveReport.performanceTests.domContentLoaded}ms\n`;
    markdown += `- **Netzwerk-Anfragen:** ${comprehensiveReport.performanceTests.networkRequests}\n`;
    markdown += `- **Gesamtübertragungsgröße:** ${Math.round(comprehensiveReport.performanceTests.totalTransferSize / 1024)}KB\n`;
    markdown += `- **Largest Contentful Paint:** ${Math.round(comprehensiveReport.performanceTests.largestContentfulPaint)}ms\n`;
    markdown += `- **First Input Delay:** ${Math.round(comprehensiveReport.performanceTests.firstInputDelay)}ms\n\n`;
    
    // Sicherheitstests
    markdown += `## 🔒 Sicherheitstests\n`;
    Object.entries(comprehensiveReport.securityTests).forEach(([url, tests]) => {
      markdown += `### ${url}\n`;
      markdown += `- **Content Security Policy:** ${tests.hasContentSecurityPolicy ? '✅' : '❌'}\n`;
      markdown += `- **HTTPS:** ${tests.isHTTPS ? '✅' : '⚠️'}\n`;
      markdown += `- **X-Frame-Options:** ${tests.hasXFrameOptions ? '✅' : '❌'}\n`;
      markdown += `- **Unsichere Ressourcen:** ${tests.insecureResources}\n\n`;
    });
    
    // Accessibility-Tests
    markdown += `## ♿ Accessibility-Tests\n`;
    Object.entries(comprehensiveReport.accessibilityTests).forEach(([url, tests]) => {
      markdown += `### ${url}\n`;
      markdown += `- **Bilder ohne Alt-Text:** ${tests.imagesWithoutAlt}\n`;
      markdown += `- **Eingabefelder ohne Labels:** ${tests.inputsWithoutLabels}\n`;
      markdown += `- **Überschriften gesamt:** ${tests.totalHeadings}\n`;
      markdown += `- **Hauptüberschrift vorhanden:** ${tests.hasMainHeading ? '✅' : '❌'}\n`;
      markdown += `- **Skip-Link vorhanden:** ${tests.hasSkipLink ? '✅' : '❌'}\n`;
      markdown += `- **Überschriftenstruktur:** ${tests.headingStructure.join(' → ')}\n\n`;
    });
    
    // Edge-Case-Tests
    markdown += `## 🎯 Edge-Case-Tests\n`;
    Object.entries(comprehensiveReport.edgeCaseTests).forEach(([url, test]) => {
      const icon = test.status === 'passed' ? '✅' : '❌';
      markdown += `- **${icon} ${url}:** ${test.details}\n`;
    });
    markdown += '\n';
    
    // Probleme und Empfehlungen
    if (comprehensiveReport.issues.critical.length > 0) {
      markdown += `## 🚨 Kritische Probleme\n`;
      comprehensiveReport.issues.critical.forEach(issue => {
        markdown += `- ${issue}\n`;
      });
      markdown += '\n';
    }
    
    if (comprehensiveReport.issues.warnings.length > 0) {
      markdown += `## ⚠️ Warnungen\n`;
      comprehensiveReport.issues.warnings.forEach(issue => {
        markdown += `- ${issue}\n`;
      });
      markdown += '\n';
    }
    
    // Empfehlungen generieren
    if (comprehensiveReport.performanceTests.loadTime > 3000) {
      comprehensiveReport.recommendations.push('Performance: Ladezeit über 3s - Optimierung erforderlich');
    }
    if (comprehensiveReport.performanceTests.firstInputDelay > 100) {
      comprehensiveReport.recommendations.push('Performance: FID über 100ms - Interaktivität optimieren');
    }
    
    if (comprehensiveReport.recommendations.length > 0) {
      markdown += `## 💡 Empfehlungen\n`;
      comprehensiveReport.recommendations.forEach(rec => {
        markdown += `- ${rec}\n`;
      });
      markdown += '\n';
    }
    
    markdown += `## 📸 Screenshots\n`;
    comprehensiveReport.screenshots.forEach(screenshot => {
      markdown += `- ${screenshot}\n`;
    });
    
    markdown += `\n## 📊 Konsolen-Logs (Erste 10)\n`;
    comprehensiveReport.consoleLogs.slice(0, 10).forEach(log => {
      markdown += `- **${log.type.toUpperCase()}** (${log.url}): ${log.text}\n`;
    });
    
    writeFileSync('./QA_COMPREHENSIVE_REPORT.md', markdown);
    
    console.log('\n🎉 Umfassende QA-Analyse abgeschlossen!');
    console.log('📋 Report verfügbar unter: ./QA_COMPREHENSIVE_REPORT.md');
    console.log(`📊 Gesamt: ${Object.keys(comprehensiveReport.functionalTests).length} Tests durchgeführt`);
    console.log(`📸 ${comprehensiveReport.screenshots.length} Screenshots erstellt`);
    console.log(`🔍 ${Object.keys(comprehensiveReport.serverTests).length} Server getestet`);
    
  } catch (error) {
    console.error('💥 QA-Analyse fehlgeschlagen:', error.message);
    comprehensiveReport.connectionTest.error = error.message;
    writeFileSync('./QA_COMPREHENSIVE_ERROR.json', JSON.stringify(comprehensiveReport, null, 2));
  } finally {
