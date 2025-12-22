const puppeteer = require('puppeteer');
const { writeFileSync, existsSync, mkdirSync } = require('fs');
const { join } = require('path');

async function runComprehensiveButtonTests() {
  console.log('🧪 UMFASSENDE BUTTON- UND FUNKTIONSTESTS STARTEN...');
  const urls = ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003'];
  
  let browser;
  let report = {
    timestamp: new Date().toISOString(),
    analysisType: 'Comprehensive Button & Function Tests',
    testResults: {},
    buttonTests: {},
    errorLogs: [],
    screenshots: [],
    summary: {
      totalButtons: 0,
      workingButtons: 0,
      brokenButtons: 0,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0
    }
  };

  try {
    // Test-Verzeichnis erstellen
    const testDir = './button-test-results';
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
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
        timestamp: new Date().toISOString(),
        url: page.url()
      };
      report.errorLogs.push(log);
    });

    // Netzwerk-Fehler abfangen
    page.on('response', response => {
      if (!response.ok()) {
        report.errorLogs.push({
          type: 'network-error',
          status: response.status(),
          url: response.url(),
          timestamp: new Date().toISOString()
        });
      }
    });

    // Für jeden Server-URL umfassende Tests durchführen
    for (const url of urls) {
      console.log(`🔍 Teste Server: ${url}`);
      
      try {
        const startTime = Date.now();
        const response = await page.goto(url, { 
          waitUntil: 'networkidle0', 
          timeout: 30000 
        });
        const responseTime = Date.now() - startTime;
        
        if (response && response.ok()) {
          console.log(`✅ ${url} - Verbindung erfolgreich (${responseTime}ms)`);
          
          // Warten bis die Seite vollständig geladen ist
          await page.waitForTimeout(2000);
          
          // Screenshot der initialen Seite
          const initialScreenshot = join(testDir, `initial_${url.replace('http://localhost:', '')}_${Date.now()}.png`);
          await page.screenshot({ path: initialScreenshot, fullPage: true });
          report.screenshots.push(initialScreenshot);
          
          // Alle interaktiven Elemente finden
          const interactiveElements = await page.evaluate(() => {
            const selectors = [
              'button', 
              '[role="button"]', 
              'input[type="button"]', 
              'input[type="submit"]', 
              'input[type="reset"]',
              'a[href]', 
              '.clickable',
              '[onclick]',
              '[tabindex]:not([tabindex="-1"])',
              '.btn',
              '[data-testid]',
              '[data-cy]',
              '[data-qa]'
            ];
            
            const elements = [];
            selectors.forEach(selector => {
              try {
                const found = document.querySelectorAll(selector);
                found.forEach((el, index) => {
                  if (el.offsetParent !== null) { // Nur sichtbare Elemente
                    elements.push({
                      selector: selector,
                      tagName: el.tagName,
                      id: el.id || null,
                      className: el.className || null,
                      text: el.textContent?.trim().substring(0, 50) || null,
                      type: el.type || null,
                      role: el.getAttribute('role') || null,
                      href: el.href || null,
                      onclick: el.onclick ? 'has-handler' : null
                    });
                  }
                });
              } catch (e) {
                // Selector nicht gefunden, weiter machen
              }
            });
            
            return elements;
          });
          
          console.log(`🎯 Gefundene interaktive Elemente: ${interactiveElements.length}`);
          report.summary.totalButtons += interactiveElements.length;
          
          // Button-Tests durchführen
          const buttonTestResults = [];
          let workingButtons = 0;
          let brokenButtons = 0;
          
          for (let i = 0; i < Math.min(interactiveElements.length, 20); i++) { // Max 20 Buttons pro Server testen
            const element = interactiveElements[i];
            console.log(`🔘 Teste Button ${i + 1}: ${element.tagName} (${element.text || 'kein Text'})`);
            
            try {
              // Button-Element finden und klicken
              const buttonSelector = element.id ? `#${element.id}` : 
                                   element.className ? `.${element.className.split(' ')[0]}` :
                                   element.tagName.toLowerCase();
              
              // Versuche verschiedene Selektoren
              const selectors = [
                buttonSelector,
                `${element.tagName.toLowerCase()}[${element.type ? `type="${element.type}"` : ''}]`,
                `[role="${element.role}"]`,
                `[data-testid="${element.id}"]`,
                `[data-cy="${element.id}"]`
              ].filter(Boolean);
              
              let buttonClicked = false;
              let clickError = null;
              
              for (const selector of selectors) {
                try {
                  const buttonElements = await page.$$(selector);
                  if (buttonElements.length > 0) {
                    // Scroll to element
                    await page.evaluate((sel) => {
                      const el = document.querySelector(sel);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, selector);
                    
                    await page.waitForTimeout(500);
                    
                    // Click the button
                    await buttonElements[0].click();
                    buttonClicked = true;
                    console.log(`  ✅ Button erfolgreich geklickt: ${selector}`);
                    break;
                  }
                } catch (e) {
                  clickError = e.message;
                  continue;
                }
              }
              
              if (buttonClicked) {
                workingButtons++;
                report.summary.workingButtons++;
                
                // Warten auf mögliche UI-Änderungen
                await page.waitForTimeout(1000);
                
                // Screenshot nach Klick
                const afterClickScreenshot = join(testDir, `after_click_${url.replace('http://localhost:', '')}_${i}_${Date.now()}.png`);
                await page.screenshot({ path: afterClickScreenshot, fullPage: false });
                report.screenshots.push(afterClickScreenshot);
                
                buttonTestResults.push({
                  element: element,
                  status: 'working',
                  selector: selectors.find(s => s) || 'unknown',
                  error: null
                });
              } else {
                brokenButtons++;
                report.summary.brokenButtons++;
                buttonTestResults.push({
                  element: element,
                  status: 'broken',
                  selector: 'not-found',
                  error: clickError || 'Button nicht klickbar'
                });
                console.log(`  ❌ Button konnte nicht geklickt werden: ${element.tagName}`);
              }
              
            } catch (error) {
              brokenButtons++;
              report.summary.brokenButtons++;
              buttonTestResults.push({
                element: element,
                status: 'error',
                selector: 'error',
                error: error.message
              });
              console.log(`  💥 Fehler beim Testen: ${error.message}`);
            }
            
            report.summary.totalTests++;
          }
          
          // Spezielle Funktionstests
          console.log('🔧 Führe spezielle Funktionstests durch...');
          
          // Formular-Tests
          try {
            const formElements = await page.$$('form');
            for (let j = 0; j < Math.min(formElements.length, 3); j++) {
              try {
                await formElements[j].evaluate(form => {
                  const inputs = form.querySelectorAll('input, textarea, select');
                  inputs.forEach(input => {
                    if (input.type === 'text' || input.tagName === 'TEXTAREA') {
                      input.value = 'Test Input';
                    } else if (input.type === 'checkbox' || input.type === 'radio') {
                      input.checked = true;
                    }
                  });
                });
                
                const submitButton = await formElements[j].$('button[type="submit"], input[type="submit"]');
                if (submitButton) {
                  await submitButton.click();
                  console.log(`  📝 Formular ${j + 1} getestet`);
                }
              } catch (e) {
                console.log(`  ⚠️ Formular-Test ${j + 1} fehlgeschlagen: ${e.message}`);
              }
            }
          } catch (e) {
            console.log(`  ⚠️ Formular-Tests fehlgeschlagen: ${e.message}`);
          }
          
          // Navigation-Tests
          try {
            const links = await page.$$('a[href]');
            for (let j = 0; j < Math.min(links.length, 5); j++) {
              const href = await links[j].evaluate(link => link.href);
              if (href.includes('#') || href.includes('javascript:')) {
                await links[j].click();
                await page.waitForTimeout(500);
                console.log(`  🔗 Navigation-Link ${j + 1} getestet`);
              }
            }
          } catch (e) {
            console.log(`  ⚠️ Navigation-Tests fehlgeschlagen: ${e.message}`);
          }
          
          // Keyboard-Tests
          try {
            await page.keyboard.press('Tab');
            await page.keyboard.press('Enter');
            await page.keyboard.press('Escape');
            console.log('  ⌨️ Keyboard-Navigation getestet');
          } catch (e) {
            console.log(`  ⚠️ Keyboard-Tests fehlgeschlagen: ${e.message}`);
          }
          
          report.buttonTests[url] = {
            responseTime: responseTime,
            interactiveElements: interactiveElements.length,
            workingButtons: workingButtons,
            brokenButtons: brokenButtons,
            buttonResults: buttonTestResults
          };
          
          // Finaler Screenshot
          const finalScreenshot = join(testDir, `final_${url.replace('http://localhost:', '')}_${Date.now()}.png`);
          await page.screenshot({ path: finalScreenshot, fullPage: true });
          report.screenshots.push(finalScreenshot);
          
          console.log(`✅ ${url} - Tests abgeschlossen (${workingButtons}/${workingButtons + brokenButtons} Buttons funktional)`);
          
        } else {
          throw new Error(`HTTP ${response ? response.status() : 'Unknown'}`);
        }
        
      } catch (error) {
        console.error(`❌ ${url} - Test fehlgeschlagen:`, error.message);
        report.buttonTests[url] = {
          error: error.message,
          status: 'failed'
        };
      }
    }
    
    // Report generieren
    console.log('📋 Test-Report wird generiert...');
    
    // JSON-Report
    const reportJson = JSON.stringify(report, null, 2);
    writeFileSync('./COMPREHENSIVE_BUTTON_TEST_REPORT.json', reportJson);
    
    // Markdown-Report
    let markdown = '# Umfassender Button- und Funktionstest Report\n\n';
    markdown += `**Erstellt:** ${report.timestamp}\n`;
    markdown += `**Test-Typ:** ${report.analysisType}\n`;
    markdown += `**Getestete URLs:** ${Object.keys(report.buttonTests).join(', ')}\n\n`;
    
    // Zusammenfassung
    markdown += '## 📊 Test-Zusammenfassung\n\n';
    markdown += `- **Gesamt getestete Buttons:** ${report.summary.totalButtons}\n`;
    markdown += `- **Funktionierende Buttons:** ${report.summary.workingButtons}\n`;
    markdown += `- **Defekte Buttons:** ${report.summary.brokenButtons}\n`;
    markdown += `- **Gesamt Tests:** ${report.summary.totalTests}\n`;
    markdown += `- **Erfolgreich:** ${report.summary.passedTests}\n`;
    markdown += `- **Fehlgeschlagen:** ${report.summary.failedTests}\n`;
    markdown += `- **Erfolgsrate:** ${report.summary.totalTests > 0 ? Math.round((report.summary.workingButtons / report.summary.totalButtons) * 100) : 0}%\n\n`;
    
    // Detaillierte Ergebnisse pro Server
    markdown += '## 🔍 Detaillierte Test-Ergebnisse\n\n';
    Object.entries(report.buttonTests).forEach(([url, results]) => {
      markdown += `### ${url}\n`;
      if (results.error) {
        markdown += `❌ **Fehler:** ${results.error}\n\n`;
      } else {
        markdown += `✅ **Status:** Erfolgreich getestet\n`;
        markdown += `⏱️ **Response Time:** ${results.responseTime}ms\n`;
        markdown += `🎯 **Interaktive Elemente:** ${results.interactiveElements}\n`;
        markdown += `🔘 **Funktionierende Buttons:** ${results.workingButtons}\n`;
        markdown += `❌ **Defekte Buttons:** ${results.brokenButtons}\n\n`;
        
        if (results.buttonResults && results.buttonResults.length > 0) {
          markdown += '**Button-Test Details:**\n';
          results.buttonResults.slice(0, 10).forEach((result, index) => {
            const status = result.status === 'working' ? '✅' : result.status === 'broken' ? '❌' : '💥';
            markdown += `${index + 1}. ${status} ${result.element.tagName} (${result.element.text || 'kein Text'}) - ${result.status}\n`;
          });
          markdown += '\n';
        }
      }
    });
    
    // Fehler-Logs
    if (report.errorLogs.length > 0) {
      markdown += '## 🚨 Fehler-Logs\n\n';
      report.errorLogs.slice(0, 20).forEach(log => {
        markdown += `- **${log.type}:** ${log.text || log.url} (${log.timestamp})\n`;
      });
      markdown += '\n';
    }
    
    // Screenshots
    markdown += '## 📸 Generierte Screenshots\n\n';
    report.screenshots.forEach(screenshot => {
      markdown += `- ${screenshot}\n`;
    });
    
    writeFileSync('./COMPREHENSIVE_BUTTON_TEST_REPORT.md', markdown);
    
    console.log('\n🎉 Umfassende Button-Tests abgeschlossen!');
    console.log('📋 Report verfügbar unter: ./COMPREHENSIVE_BUTTON_TEST_REPORT.md');
    console.log('📊 Gesamt: ' + report.summary.totalButtons + ' Buttons getestet');
    console.log('✅ Funktionierende Buttons: ' + report.summary.workingButtons);
    console.log('❌ Defekte Buttons: ' + report.summary.brokenButtons);
    console.log('📸 ' + report.screenshots.length + ' Screenshots erstellt');
    
  } catch (error) {
    console.error('💥 Button-Tests fehlgeschlagen:', error.message);
    writeFileSync('./BUTTON_TEST_ERROR.json', JSON.stringify({
      error: error.message,
      timestamp: new Date().toISOString(),
      partialReport: report
    }, null, 2));
  } finally {
    if (browser) await browser.close();
  }
}

runComprehensiveButtonTests();