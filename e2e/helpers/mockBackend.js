const http = require('http');
const WebSocket = require('ws');

/**
 * Lightweight mock of the organizer_backend.
 * Handles WS messages (load, showMessage, appendPin, deleteMessage, favoriteAppend)
 * and HTTP endpoints (/search, /upload).
 * Exposes test helpers: broadcast(), closeAllConnections(), close().
 */
class MockBackend {
  constructor() {
    this.clients = new Set();
    this.server = null;
    this.wss = null;
    this._customHandlers = [];
    this._loadResponse = {
      dB: [],
      favorites: [],
      position: 0,
      pinned: null,
      token: 'test-token',
    };
  }

  /** Override the initial data sent on WS 'load' event. */
  setLoadData(data) {
    Object.assign(this._loadResponse, data);
  }

  /** Send a message to all connected WS clients. */
  broadcast(data) {
    const json = JSON.stringify(data);
    this.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(json);
    });
  }

  /** Register an extra WS message handler (for individual tests). */
  onMessage(fn) {
    this._customHandlers.push(fn);
    return () => {
      const i = this._customHandlers.indexOf(fn);
      if (i !== -1) this._customHandlers.splice(i, 1);
    };
  }

  /** Force-close all open WS connections (triggers client reconnect). */
  closeAllConnections() {
    this.clients.forEach((ws) => ws.terminate());
    this.clients.clear();
  }

  /** Start listening on the given port. Resolves when ready. */
  start(port = 7000) {
    this.server = http.createServer((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      if (req.url === '/search' && req.method === 'POST') {
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify([
            {
              id: 'search-result-1',
              message: 'Test search result',
              score: 0.95,
              combinedScore: 0.95,
              payload: { text: 'Test search result', type: 'text', date: '01.01.2024, 12:00' },
              doc: { text: 'Test search result' },
            },
          ]));
        });
        return;
      }

      if (req.url.startsWith('/upload') && req.method === 'POST') {
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => {
          const id = String(Date.now());
          // Notify connected WS clients about the uploaded file
          setTimeout(() => {
            this.broadcast({
              event: 'showFile',
              id,
              message: 'test-file.txt',
              date: '01.01.2024, 12:00',
              geo: '',
              type: 'file',
            });
          }, 50);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, id }));
        });
        return;
      }

      // Serve static file tokens (mimics the real server endpoint)
      if (req.url.startsWith('/files/')) {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('mock-file-content');
        return;
      }

      res.writeHead(404);
      res.end('Not found');
    });

    this.wss = new WebSocket.Server({ server: this.server });

    this.wss.on('connection', (ws) => {
      this.clients.add(ws);

      ws.on('message', (raw) => {
        let msg;
        try {
          msg = JSON.parse(raw.toString());
        } catch {
          return;
        }

        if (msg.event === 'load') {
          ws.send(JSON.stringify({ event: 'load', ...this._loadResponse }));
        }

        if (msg.event === 'showMessage') {
          ws.send(JSON.stringify({
            event: 'showMessage',
            id: String(Date.now()),
            message: msg.message?.body ?? msg.message?.message ?? '',
            date: msg.message?.date ?? '01.01.2024, 12:00',
            geo: msg.message?.geo ?? '',
          }));
        }

        if (msg.event === 'appendPin') {
          ws.send(JSON.stringify({ event: 'appendPin', id: msg.id }));
        }

        if (msg.event === 'deleteMessage') {
          ws.send(JSON.stringify({ event: 'deleteMessage', id: msg.id }));
        }

        if (msg.event === 'favoriteAppend') {
          ws.send(JSON.stringify({ event: 'favoriteAppend', id: msg.id }));
        }

        if (msg.event === 'favoriteDelete') {
          ws.send(JSON.stringify({ event: 'favoriteDelete', id: msg.id }));
        }

        for (const handler of this._customHandlers) {
          try { handler(msg, ws); } catch { /* ignore */ }
        }
      });

      ws.on('close', () => this.clients.delete(ws));
      ws.on('error', () => this.clients.delete(ws));
    });

    return new Promise((resolve, reject) => {
      this.server.listen(port, '127.0.0.1', () => resolve(this));
      this.server.on('error', reject);
    });
  }

  /** Gracefully stop the server. */
  close() {
    return new Promise((resolve) => {
      this.closeAllConnections();
      this.wss.close(() => this.server.close(resolve));
    });
  }
}

module.exports = MockBackend;
