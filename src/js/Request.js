export default class Request {
  constructor(server) {
    this.server = server;
    this.wsServer = this.server.replace(/^http/i, "ws");

    // Первичный запрос при открытии соединения
    this.initialData = { event: "load" };
    this.callbacks = {};

    // BUG-19 fix: параметры переподключения
    this._reconnectAttempts = 0;
    this._reconnectTimer = null;
    this._destroyed = false;   // флаг намеренного закрытия (не переподключаемся)

    this.onOpen = this.onOpen.bind(this);
    this.onMessage = this.onMessage.bind(this);
    this.onClose = this.onClose.bind(this);
    this.onError = this.onError.bind(this);
  }

  init() {
    this._destroyed = false;
    this._connect();
  }

  _connect() {
    this.ws = new WebSocket(this.wsServer);
    this.ws.addEventListener("open", this.onOpen);
    this.ws.addEventListener("message", this.onMessage);
    this.ws.addEventListener("close", this.onClose);
    this.ws.addEventListener("error", this.onError);
  }

  _scheduleReconnect() {
    if (this._destroyed) return;
    clearTimeout(this._reconnectTimer);
    const delay = Math.min(1000 * 2 ** this._reconnectAttempts, 30_000);
    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this._reconnectAttempts + 1})`);
    this._reconnectTimer = setTimeout(() => {
      this._reconnectAttempts += 1;
      this._connect();
    }, delay);
  }

  destroy() {
    this._destroyed = true;
    clearTimeout(this._reconnectTimer);
    if (this.ws) this.ws.close();
  }

  onOpen() {
    this._reconnectAttempts = 0;  // сброс счётчика при успешном подключении
    this.ws.send(JSON.stringify(this.initialData));
    this.callbacks.onConnect?.();
  }

  onClose() {
    console.warn("[WS] Connection closed");
    this.callbacks.onDisconnect?.();
    this._scheduleReconnect();
  }

  onError(event) {
    // Логируем ошибку, но НЕ бросаем исключение — это убивало приложение (BUG-19)
    console.error("[WS] Connection error", event);
    // Браузер сам вызовет onClose после onError — reconnect запустится там
  }

  onMessage(event) {
    let data;
    try {
      data = JSON.parse(event.data);
    } catch (e) {
      console.error("[WS] Failed to parse message:", e.message);
      return;
    }

    if (data.event === "load") {
      this.token = data.token || null;
      this.callbacks.load?.(data.dB, data.favorites, data.position, data.pinned, data.token);
    }
    if (data.event === "showMessage") {
      this.callbacks.showMessage?.(data.id, data.message, data.date, data.geo);
    }
    if (data.event === "showFile") {
      this.callbacks.showMessage?.(data.id, data.message, data.date, data.geo, data.type);
    }
    if (data.event === "deleteMessage") {
      this.callbacks.deleteMessage?.(data.id);
    }
    if (data.event === "favoriteAppend") {
      this.callbacks.favoriteAppend?.(data.id);
    }
    if (data.event === "favoriteDelete") {
      this.callbacks.favoriteDelete?.(data.id);
    }
    if (data.event === "appendPin") {
      this.callbacks.pinAppend?.(data.id);
    }
  }

  send(event, message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      if (message.type === "text" || message.type == null) {
        this.ws.send(JSON.stringify({ event, message }));
      } else {
        const formData = new FormData();
        formData.append("date", message.date);
        formData.append("file", message.body);
        formData.append("type", message.type);
        formData.append("name", message.name);
        formData.append("geo", message.geo ?? "");
        this.sendFile(formData);
      }
    } else {
      console.warn("[WS] Cannot send — connection not open (readyState:", this.ws?.readyState, ")");
    }
  }

  sendFile(formData) {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${this.server}upload`);
    xhr.addEventListener("error", () => console.error("[XHR] File upload error"));
    // Уведомляем об успехе — сервер пришлёт showFile через WS
    xhr.send(formData);
  }
}
