/**
 * Enterprise Security Middleware für Wirsing Interpreter AI
 * Implementiert umfassende Sicherheitsheader und Protection-Mechanismen
 */

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

// Content Security Policy Konfiguration
const cspConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Für React DevTools und Development
        "'unsafe-eval'",   // Für Webpack HMR in Development
        "https://unpkg.com", // Für externe Bibliotheken
        "https://cdn.jsdelivr.net"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Für Tailwind CSS und dynamische Styles
        "https://fonts.googleapis.com",
        "https://cdn.jsdelivr.net"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "https://cdn.jsdelivr.net"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https:",
        "blob:",
        "http:",
        "data:image/", // Für base64-Images
        "blob:"        // Für blob-URLs
      ],
      connectSrc: [
        "'self'",
        "https:",
        "wss:",        // WebSocket für Development
        "http:",       // Für Development-Server
        "ws:",         // WebSocket Development
        "localhost:3000",
        "localhost:3001", 
        "localhost:3002",
        "localhost:3003",
        "localhost:5173"
      ],
      frameSrc: ["'none'"], // Verhindert Clickjacking
      objectSrc: ["'none'"], // Blockiert Plugins
      mediaSrc: ["'self'"],
      workerSrc: ["'self'", "blob:"],
      manifestSrc: ["'self'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"] // Verhindert Clickjacking-Angriffe
    },
    reportOnly: false // Streng für Production
  },
  
  crossOriginEmbedderPolicy: false, // Für WebAssembly-Integration
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  
  // Browser-spezifische Security Headers
  referrerPolicy: {
    policy: ["no-referrer", "strict-origin-when-cross-origin"]
  },
  
  // HSTS für HTTPS (nur in Production aktivieren)
  hsts: process.env.NODE_ENV === 'production' ? {
    maxAge: 31536000, // 1 Jahr
    includeSubDomains: true,
    preload: true
  } : false,
  
  // Permissions Policy (nur erlaubte Features)
  permissionsPolicy: {
    camera: ["'none'"],
    microphone: ["'self'"], // Erlaubt Mikrofon-Zugriff für eigene Domain
    geolocation: ["'none'"],
    payment: ["'none'"],
    usb: ["'none'"],
    fullscreen: ["'self'"],
    pictureInPicture: ["'none'"],
    screenCapture: ["'none'"]
  }
};

// Development vs Production Konfiguration
const isDevelopment = process.env.NODE_ENV !== 'production';

const securityMiddleware = (app) => {
  
  // 1. Helmet Security Headers
  app.use(helmet({
    contentSecurityPolicy: cspConfig.contentSecurityPolicy,
    crossOriginEmbedderPolicy: cspConfig.crossOriginEmbedderPolicy,
    crossOriginOpenerPolicy: cspConfig.crossOriginOpenerPolicy,
    crossOriginResourcePolicy: cspConfig.crossOriginResourcePolicy,
    referrerPolicy: cspConfig.referrerPolicy,
    hsts: cspConfig.hsts,
    permissionsPolicy: cspConfig.permissionsPolicy,
    
    // Zusätzliche Helmet-Optionen
    noSniff: true,              // X-Content-Type-Options: nosniff
    frameguard: { action: 'deny' }, // X-Frame-Options: DENY
    xssFilter: false,           // Browser-XSS-Filter (deprecated)
    noCache: isDevelopment,     // Cache-Control in Development
    hidePoweredBy: true,        // Entfernt X-Powered-By Header
    
    // Custom Security Headers
    setCustomHeaders: {
      'X-Permitted-Cross-Domain-Policies': 'none',
      'X-Download-Options': 'noopen',
      'X-DNS-Prefetch-Control': 'off',
      'Strict-Transport-Security': cspConfig.hsts ? 
        'max-age=31536000; includeSubDomains; preload' : 'max-age=0'
    }
  }));

  // 2. Rate Limiting Konfiguration
  const limiterConfig = {
    // API Rate Limiting
    api: rateLimit({
      windowMs: 15 * 60 * 1000, // 15 Minuten
      max: isDevelopment ? 1000 : 100, // Max requests pro IP
      message: {
        error: 'Zu viele API-Anfragen von dieser IP-Adresse',
        retryAfter: '15 minutes'
      },
      standardHeaders: true, // Rate Limit Info in headers
      legacyHeaders: false,  // Disable legacy rate limit headers
      skip: (req) => {
        // Skip rate limiting für Health-Checks
        return req.path === '/health' || req.path === '/ping';
      }
    }),
    
    // Strengere Rate Limiting für Auth-Endpunkte
    auth: rateLimit({
      windowMs: 15 * 60 * 1000, // 15 Minuten
      max: isDevelopment ? 20 : 5, // Max login attempts
      message: {
        error: 'Zu viele Authentifizierungsversuche',
        retryAfter: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: true
    }),
    
    // Upload Rate Limiting
    upload: rateLimit({
      windowMs: 60 * 60 * 1000, // 1 Stunde
      max: isDevelopment ? 100 : 10, // Max uploads
      message: {
        error: 'Zu viele Upload-Versuche',
        retryAfter: '1 hour'
      }
    })
  };

  // Rate Limiting anwenden
  app.use('/api', limiterConfig.api);
  app.use('/auth', limiterConfig.auth);
  app.use('/upload', limiterConfig.upload);

  // 3. CORS Konfiguration
  const corsOptions = {
    origin: (origin, callback) => {
      // Entwicklung: Erlaubt alle localhost-Ports
      if (isDevelopment) {
        const allowedOrigins = [
          'http://localhost:3000',
          'http://localhost:3001', 
          'http://localhost:3002',
          'http://localhost:3003',
          'http://localhost:5173',
          'http://localhost:8080',
          null // Erlaubt requests ohne origin (mobile apps, etc.)
        ];
        
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('CORS blockiert - Origin nicht erlaubt'));
        }
      } else {
        // Production: Nur spezifische Domains
        const allowedOrigins = [
          'https://wirsing-interpreter.ai',
          'https://app.wirsing-interpreter.ai'
        ];
        
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('CORS blockiert - Origin nicht erlaubt'));
        }
      }
    },
    
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-Request-ID',
      'X-Client-Version'
    ],
    exposedHeaders: [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining', 
      'X-RateLimit-Reset',
      'X-Request-ID'
    ],
    maxAge: 86400, // 24 Stunden
    optionsSuccessStatus: 200 // Legacy IE compatibility
  };

  app.use(cors(corsOptions));

  // 4. Request Security Middleware
  app.use((req, res, next) => {
    // Request ID für Tracking
    req.requestId = require('crypto').randomBytes(16).toString('hex');
    res.setHeader('X-Request-ID', req.requestId);
    
    // Security Headers für alle Responses
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Download-Options', 'noopen');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    
    // Performance & Security Headers
    res.setHeader('Cache-Control', isDevelopment ? 'no-cache' : 'public, max-age=31536000');
    res.setHeader('Vary', 'Origin');
    
    // Security Logging für suspicious requests
    if (isSuspiciousRequest(req)) {
      console.warn(`[SECURITY] Suspicious request detected: ${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      });
    }
    
    next();
  });

  // 5. Input Sanitization Middleware
  app.use((req, res, next) => {
    // Body parser mit sanitization
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }
    
    // Query parameters sanitization
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }
    
    next();
  });

  // 6. Error Handling für Security-Features
  app.use((error, req, res, next) => {
    // CORS Fehler
    if (error.message && error.message.includes('CORS')) {
      return res.status(403).json({
        error: 'CORS blockiert',
        message: 'Cross-Origin Request wurde blockiert',
        requestId: req.requestId
      });
    }
    
    // Rate Limit Fehler
    if (error.message && error.message.includes('rate limit')) {
      return res.status(429).json({
        error: 'Rate Limit überschritten',
        message: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.',
        requestId: req.requestId
      });
    }
    
    // Security Fehler
    if (error.code === 'EBADCSRFTOKEN') {
      return res.status(403).json({
        error: 'CSRF Token ungültig',
        message: 'Cross-Site Request Forgery Token konnte nicht verifiziert werden',
        requestId: req.requestId
      });
    }
    
    next(error);
  });
};

// Hilfsfunktionen
function isSuspiciousRequest(req) {
  const suspiciousPatterns = [
    /(\<|\%3C)script(\>|\%3E)/i,     // Script injection
    /(\<|\%3C)img(\>|\%3E)/i,       // Image injection  
    /(\<|\%3C)iframe(\>|\%3E)/i,    // Iframe injection
    /javascript:/i,                 // JavaScript protocol
    /data:/i,                       // Data URI schemes
    /vbscript:/i,                   // VBScript protocol
    /onload/i,                      // Event handlers
    /onerror/i,                     // Error handlers
    /select\b/i,                    // SQL select
    /union\b/i,                     // SQL union
    /drop\b/i,                      // SQL drop
    /delete\b/i,                    // SQL delete
    /insert\b/i,                    // SQL insert
    /update\b/i,                    // SQL update
    /exec\b/i,                      // SQL exec
    /xp_cmdshell/i,                 // SQL xp_cmdshell
    /\.\.\//,                       // Path traversal
    /etc\/passwd/i,                 // Linux passwd
    /windows\/system32/i,           // Windows system32
    /cmd\.exe/i,                    // CMD.exe
    /powershell/i,                  // PowerShell
    /bash/i,                        // Bash
    /sh\b/i,                        // Shell
    /bin\//i                        // Bin directory
  ];
  
  const requestString = [
    req.path,
    req.method,
    JSON.stringify(req.body || {}),
    JSON.stringify(req.query || {}),
    req.get('User-Agent') || '',
    req.get('Referer') || ''
  ].join(' ').toLowerCase();
  
  return suspiciousPatterns.some(pattern => pattern.test(requestString));
}

function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return typeof obj === 'string' ? sanitizeString(obj) : obj;
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    const sanitizedKey = sanitizeString(key);
    sanitized[sanitizedKey] = typeof value === 'string' 
      ? sanitizeString(value) 
      : typeof value === 'object' 
        ? sanitizeObject(value)
        : value;
  }
  
  return sanitized;
}

function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  
  return str
    .replace(/[<>\"']/g, '')        // Entfernt gefährliche Zeichen
    .replace(/javascript:/gi, '')   // Entfernt javascript: protocol
    .replace(/data:/gi, '')         // Entfernt data: protocol  
    .replace(/vbscript:/gi, '')     // Entfernt vbscript: protocol
    .replace(/on\w+\s*=/gi, '')     // Entfernt event handlers
    .trim();
}

module.exports = {
  securityMiddleware,
  cspConfig,
  isDevelopment
};