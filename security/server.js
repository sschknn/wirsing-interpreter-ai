/**
 * Security Server Integration für Wirsing Interpreter AI
 * Integriert Security-Middleware in Express-Server
 */

const express = require('express');
const { securityMiddleware, cspConfig, isDevelopment } = require('./middleware');

class SecureServer {
  constructor(config = {}) {
    this.app = express();
    this.config = {
      port: config.port || 3000,
      environment: config.environment || process.env.NODE_ENV || 'development',
      enableSecurity: config.enableSecurity !== false,
      healthCheckPath: config.healthCheckPath || '/health',
      ...config
    };
    
    this.isProduction = this.config.environment === 'production';
    this.initializeServer();
  }

  initializeServer() {
    // Security-Middleware nur in Production oder wenn explizit aktiviert
    if (this.config.enableSecurity) {
      console.log('🔒 Security-Middleware wird initialisiert...');
      securityMiddleware(this.app);
      console.log('✅ Security-Middleware erfolgreich aktiviert');
    } else {
      console.log('⚠️ Security-Middleware ist deaktiviert');
    }

    // Standard Express-Middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Request Logging für Development
    if (this.isDevelopment) {
      this.app.use((req, res, next) => {
        const start = Date.now();
        res.on('finish', () => {
          const duration = Date.now() - start;
          console.log(`[${req.method}] ${req.path} - ${res.statusCode} (${duration}ms)`);
        });
        next();
      });
    }

    // Health Check Endpoint (Rate-limit-frei)
    this.app.get(this.config.healthCheckPath, (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: this.config.environment,
        securityEnabled: this.config.enableSecurity,
        version: process.env.npm_package_version || '1.0.0'
      });
    });

    // Security Info Endpoint (nur für Development)
    if (this.isDevelopment) {
      this.app.get('/security-info', (req, res) => {
        res.json({
          cspConfig: cspConfig.contentSecurityPolicy,
          environment: this.config.environment,
          securityEnabled: this.config.enableSecurity,
          helmetConfig: {
            contentSecurityPolicy: !!cspConfig.contentSecurityPolicy,
            hsts: !!cspConfig.hsts,
            frameguard: 'DENY',
            noSniff: true,
            hidePoweredBy: true
          },
          rateLimit: {
            api: '15min window, 100 requests (dev: 1000)',
            auth: '15min window, 5 attempts (dev: 20)',
            upload: '1hour window, 10 uploads (dev: 100)'
          }
        });
      });
    }

    // 404 Handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint nicht gefunden',
        path: req.originalUrl,
        method: req.method,
        requestId: req.requestId || 'unknown'
      });
    });

    // Global Error Handler
    this.app.use((error, req, res, next) => {
      console.error('Server Error:', {
        message: error.message,
        stack: error.stack,
        requestId: req.requestId,
        path: req.path,
        method: req.method
      });

      res.status(error.status || 500).json({
        error: this.isProduction ? 'Interner Serverfehler' : error.message,
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
        ...(this.isDevelopment && { stack: error.stack })
      });
    });
  }

  // API-Route-Helper mit automatischer Security
  addSecureRoute(path, middleware = [], handler) {
    const routeMiddleware = [
      // Automatische Security-Features für API-Routes
      (req, res, next) => {
        // Setzt API-spezifische Security Headers
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('Cache-Control', 'no-cache');
        next();
      },
      ...middleware
    ];

    this.app.post(path, routeMiddleware, handler);
  }

  // Static Files mit Security
  serveStatic(path, options = {}) {
    const secureOptions = {
      ...options,
      setHeaders: (res, filePath) => {
        // Security Headers für static files
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        
        // Cache-Control je nach Environment
        if (this.isProduction) {
          res.setHeader('Cache-Control', 'public, max-age=31536000');
        } else {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
        
        // Original setHeaders beibehalten
        if (options.setHeaders) {
          options.setHeaders(res, filePath);
        }
      }
    };

    this.app.use(path, express.static(secureOptions));
  }

  // Start Server
  start() {
    return new Promise((resolve, reject) => {
      const server = this.app.listen(this.config.port, (err) => {
        if (err) {
          console.error('❌ Server-Start fehlgeschlagen:', err);
          reject(err);
          return;
        }

        console.log(`
🚀 Wirsing Interpreter AI - Secure Server gestartet
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 URL:           http://localhost:${this.config.port}
🔒 Environment:   ${this.config.environment}
🛡️  Security:     ${this.config.enableSecurity ? 'AKTIVIERT' : 'DEAKTIVIERT'}
🏥 Health Check:  http://localhost:${this.config.port}${this.config.healthCheckPath}
${this.isDevelopment ? '🔍 Security Info: http://localhost:' + this.config.port + '/security-info' : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        `);

        resolve(server);
      });

      // Graceful Shutdown
      process.on('SIGTERM', () => {
        console.log('🛑 SIGTERM empfangen - Server wird gestoppt...');
        server.close(() => {
          console.log('✅ Server erfolgreich gestoppt');
          process.exit(0);
        });
      });

      process.on('SIGINT', () => {
        console.log('🛑 SIGINT empfangen - Server wird gestoppt...');
        server.close(() => {
          console.log('✅ Server erfolgreich gestoppt');
          process.exit(0);
        });
      });
    });
  }

  // Get Express App für weitere Konfiguration
  getApp() {
    return this.app;
  }

  // Get Server Instance
  getServer() {
    return this.server;
  }
}

// Development Server mit erweiterten Features
class DevelopmentSecureServer extends SecureServer {
  constructor(config = {}) {
    super({
      ...config,
      enableSecurity: true, // Immer Security in Development
      port: config.port || 3000
    });

    // Development-spezifische Features
    this.setupDevelopmentFeatures();
  }

  setupDevelopmentFeatures() {
    // Hot Reload für Security-Config in Development
    if (this.isDevelopment) {
      console.log('🔧 Development-Security-Features werden aktiviert...');
      
      // Security-Config Reload bei Änderungen
      this.app.get('/reload-security', (req, res) => {
        try {
          delete require.cache[require.resolve('./middleware')];
          const { securityMiddleware } = require('./middleware');
          console.log('🔄 Security-Middleware neu geladen');
          res.json({ status: 'success', message: 'Security-Middleware neu geladen' });
        } catch (error) {
          res.status(500).json({ 
            status: 'error', 
            message: 'Reload fehlgeschlagen',
            error: error.message 
          });
        }
      });

      // Security-Test-Endpoint
      this.app.get('/test-security', (req, res) => {
        const securityTests = {
          headers: {
            'content-security-policy': res.getHeader('Content-Security-Policy'),
            'x-frame-options': res.getHeader('X-Frame-Options'),
            'x-content-type-options': res.getHeader('X-Content-Type-Options'),
            'x-xss-protection': res.getHeader('X-XSS-Protection'),
            'strict-transport-security': res.getHeader('Strict-Transport-Security')
          },
          csp: cspConfig.contentSecurityPolicy,
          environment: this.config.environment,
          timestamp: new Date().toISOString()
        };
        
        res.json(securityTests);
      });
    }
  }
}

// Production Server mit optimierter Security
class ProductionSecureServer extends SecureServer {
  constructor(config = {}) {
    super({
      ...config,
      enableSecurity: true, // Security immer in Production
      environment: 'production'
    });

    this.setupProductionFeatures();
  }

  setupProductionFeatures() {
    // Production-spezifische Security-Hardening
    console.log('🏭 Production-Security-Hardening wird aktiviert...');
    
    // Strengere CSP in Production
    this.app.use((req, res, next) => {
      // Production-spezifische Security-Headers
      if (this.isProduction) {
        res.setHeader('Content-Security-Policy-Report-Only', '');
        res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
        res.setHeader('X-Download-Options', 'noopen');
        res.setHeader('X-DNS-Prefetch-Control', 'off');
      }
      next();
    });

    // Production Health Check erweitert
    this.app.get('/health', (req, res) => {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: this.config.environment,
        security: {
          enabled: true,
          csp: 'production-mode',
          hsts: true,
          frameguard: 'DENY'
        },
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0'
      };
      
      res.json(health);
    });
  }
}

// Server Factory
function createSecureServer(config = {}) {
  const environment = config.environment || process.env.NODE_ENV || 'development';
  
  switch (environment) {
    case 'production':
      return new ProductionSecureServer(config);
    case 'development':
      return new DevelopmentSecureServer(config);
    default:
      return new SecureServer(config);
  }
}

module.exports = {
  SecureServer,
  DevelopmentSecureServer,
  ProductionSecureServer,
  createSecureServer
};