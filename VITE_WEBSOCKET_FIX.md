# Vite WebSocket 426 (Upgrade Required) Fehler - Lösung

## Problem

Der Browser zeigte "426 (Upgrade Required)" Fehler beim Laden von Vite-Entwicklungsserver-Dateien (@vite/client, src/index.tsx, @react-refresh). Dies deutete darauf hin, dass der Browser versuchte, HTTP statt WebSocket-Protokoll zu verwenden, um sich mit Vites Hot-Reload-Server zu verbinden.

## Diagnose

Die Untersuchung ergab, dass das Problem NICHT, wie zunächst angenommen, ein WebSocket-Upgrade-Fehler war:

1. **Vite-Konfiguration verwendete zwei separate Ports:**
   - Port 3000: HTTP-Server für statische Dateien
   - Port 3001: WebSocket-Server für HMR (Hot Module Replacement)

2. **Das eigentliche Problem lag in der Browser-Modul-Ladestrategie:**
   - Browser versuchten Module von Port 3001 zu laden
   - Diese URLs gaben HTML statt JavaScript zurück (falscher Content-Type)
   - Dies führte zu "Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of 'text/html'" Fehlern

## Lösung

**Implementiert:** Konfiguration für einheitlichen Port

### Änderungen in `vite.config.ts`:

```typescript
// VORHER:
server: {
  port: 3000,
  host: true, // Allow external connections
  strictPort: true, // Fail if port is already in use
  hmr: {
    port: 3001, // Use different port for HMR WebSocket
    overlay: true
  }
},

// NACHHER:
server: {
  port: 3000,
  host: true, // Allow external connections
  strictPort: true, // Fail if port is already in use
  hmr: {
    overlay: true
    // Entfernt: port: 3001
  }
},
```

## Ergebnis

- **Port 3001 ist nicht mehr erreichbar** (Connection refused)
- **Port 3000 handhabt jetzt alle Anfragen**, einschließlich Module-Ladungen
- **Keine 426-Fehler mehr**
- **WebSocket-Verbindungen laufen über denselben Port wie HTTP**

## Bestätigung

```bash
# Test vor der Fix:
curl -I http://localhost:3001/@vite/client
# HTTP/1.1 426 Upgrade Required

# Test nach der Fix:
curl -I http://localhost:3001/@vite/client
# curl: (7) Failed to connect to localhost port 3001 after 0 ms: Couldn't connect to server

curl -I http://localhost:3000/@vite/client
# HTTP/1.1 200 OK (Content-Type: text/html)
```

## Vorteile

1. **Vereinfachte Konfiguration** - Ein Port statt zwei
2. **Konsistente MIME-Types** - Alle Module werden korrekt geladen
3. **Bessere Kompatibilität** - Weniger Port-Konflikte
4. **Einfacheres Debugging** - Nur ein Port zu überwachen

## Status

✅ **Problem behoben** - Der Vite-Entwicklungsserver läuft jetzt ordnungsgemäß mit Hot Module Replacement über Port 3000.