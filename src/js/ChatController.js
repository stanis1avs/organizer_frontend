// src/chat/ChatController.js
import Message from "./Message";
import Geo from "./Geo";
import Request from "./Request";
import { removeFromFavoritesList, appendToFavorites } from "./favorites.js";
import { removeFromMediaBodies, updateMediaCounts } from "./media.js";
import { get, findIn } from "./utils/dom.js";

export default class ChatController {
  constructor({ server, nodes = {}, callbacks = {} } = {}) {
    this.server = server;
    this.nodes = nodes;
    this.currentDate = new Date();
    this.coordinates = "";
    this.databasePosition = 0;
    this.upperMessageElement = null;
    this.request = null;
    this.callbacks = callbacks || {};
  }

  initRequest() {
    this.request = new Request(this.server);
    this.request.callbacks = {
      error: () => {
        throw new Error("Ошибка соединения");
      },
      load: this.renderMessages.bind(this),
      showMessage: this.showMessage.bind(this),
      showFile: this.showMessage.bind(this),
      pinAppend: this.pinAppend.bind(this),
      deleteMessage: this.deleteMessage.bind(this),
      favoriteAppend: this.favoriteAppend.bind(this),
      favoriteDelete: this.favoriteDelete.bind(this),
    };
    this.request.init();
  }

  formatDate(d = new Date()) {
    const pad = (v) => (String(v).length === 1 ? `0${v}` : `${v}`);
    return `${pad(d.getDate())}:${pad(
      d.getMonth() + 1
    )}:${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  sendShowMessage(info) {
    if (this.request && this.request.send)
      this.request.send("showMessage", info);
  }

  sendMessagePayload(payload) {
    const info = Object.assign({}, payload);
    info.date = info.date || this.formatDate(this.currentDate);
    info.geo = info.geo || "";
    this.sendShowMessage(info);
  }

  showMessage(id, body, date, geo, type = "text", flag = false) {
    const mediaBodies = this.nodes.mediaBodies;
    const msg = new Message(
      body,
      id,
      date,
      type,
      mediaBodies,
      this.server
    ).createElement();
    if (geo) {
      const geoNode = new Geo().geoMessage(geo);
      findIn(msg, ".message_body")?.append(geoNode);
    }
    this.nodes.messages && this.nodes.messages.append(msg);
    this.scrollBottom(this.nodes.messages?.lastChild);
    if (flag) return this.nodes.messages?.lastChild;
    updateMediaCounts(
      this.nodes.messages,
      this.nodes.mediaBody,
      this.nodes.mediaBodyFavorites
    );
  }

  pinAppend(id) {
    const pinContentBody = this.nodes.pinContentBody;
    const messages = this.nodes.messages;
    if (!pinContentBody || !messages) return;
    pinContentBody.innerHTML = "";
    // ставим класс на chatBody — CSS переключит направление
    this.nodes.chatBody && this.nodes.chatBody.classList.add("pin-active");
    this.nodes.pinMesg && this.nodes.pinMesg.classList.add("pin_mesg_active");

    const elem = findIn(messages, `[data-id="${id}"]`);
    if (!elem) return;
    const body = findIn(elem, ".message_body")?.firstChild;
    if (body) pinContentBody.append(body.cloneNode(true));
  }

  deleteMessage(id) {
    if (!this.nodes.messages) return;
    const node = findIn(this.nodes.messages, `[data-id="${id}"]`);
    if (node) node.remove();

    removeFromMediaBodies(this.nodes.mediaBodies, id);
    updateMediaCounts(
      this.nodes.messages,
      this.nodes.mediaBody,
      this.nodes.mediaBodyFavorites
    );
  }

  favoriteAppend(id) {
    const elem = findIn(this.nodes.messages, `[data-id="${id}"]`);
    if (elem) {
      this.callbacks.onFavoriteServerAppend?.(id, elem);
    }
  }

  favoriteDelete(id) {
    const elem = findIn(this.nodes.messages, `[data-id="${id}"]`);
    if (elem) {
      this.callbacks.onFavoriteServerDelete?.(id, elem);
    }
  }

  renderMessages(data = [], favorites = [], position = 0, pinnedId = null) {
    const initialLoadFlag = true;
    for (const message of data) {
      const messageElement = this.showMessage(
        message.id,
        message.message,
        message.date,
        message.geo,
        message.type,
        initialLoadFlag
      );

      if (Array.isArray(favorites) && favorites.indexOf(message.id) !== -1) {
        this.callbacks.onMarkFavoriteLocal?.(messageElement, message.id);
      }

      if (pinnedId && String(message.id) === String(pinnedId)) {
        // показываем закреп локально и синхронизируем с сервером
        try {
          this.pinAppend(message.id);
        } catch (e) {
          /* ignore */
        }
        if (this.request && this.request.send)
          this.request.send("appendPin", { id: message.id });
      }

      if (!this.databasePosition) this.scrollBottom(messageElement);
    }

    this.databasePosition = Number(position) || 0;
    if (this.databasePosition > 0) {
      this.upperMessageElement = findIn(
        this.nodes.messages,
        ".message:nth-child(3)"
      );
    }
    updateMediaCounts(
      this.nodes.messages,
      this.nodes.mediaBody,
      this.nodes.mediaBodyFavorites
    );
  }

  updateMediaCounts() {
    updateMediaCounts(
      this.nodes.messages,
      this.nodes.mediaBody,
      this.nodes.mediaBodyFavorites
    );
  }

  removeFromFavoritesList(elem) {
    const id = elem?.dataset?.id;
    removeFromFavoritesList(this.nodes.mediaBodyFavorites, id);
  }

  appendToFavorites(elem) {
    appendToFavorites(this.nodes.mediaBodyFavorites, elem);
  }

  scrollBottom(messageElement) {
    const messages = this.nodes.messages;
    if (!messages || !messageElement) return;

    const video = findIn(messageElement, ".message_body video");
    const audio = findIn(messageElement, ".message_body audio");
    const img = findIn(messageElement, ".message_body img");

    const doScroll = () => {
      messages.scrollTop =
        messages.scrollHeight - messages.getBoundingClientRect().height;
    };

    if (video) {
      video.addEventListener("loadeddata", doScroll, { once: true });
      return;
    }
    if (audio) {
      audio.addEventListener("loadeddata", doScroll, { once: true });
      return;
    }
    if (img) {
      img.addEventListener("load", doScroll, { once: true });
      return;
    }

    doScroll();
  }

  lazyLoad() {
    if (!this.databasePosition || this.databasePosition <= 0) return;
    if (
      this.upperMessageElement &&
      this.upperMessageElement.getBoundingClientRect().bottom > 0
    ) {
      this.upperMessageElement = null;
      this.request &&
        this.request.send &&
        this.request.send("load", this.databasePosition);
    }
  }

  async searchAI(query, topK = 10, alpha = 0.6) {
    if (!query || !String(query).trim()) {
      const err = new Error("Empty query");
      this.callbacks.onAIError?.(err);
      throw err;
    }
    const payload = {
      query: String(query).trim(),
      topK: Number(topK) || 10,
      alpha: Number(alpha) || 0.6,
    };

    const url = `${this.server}search`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        const err = new Error(`Search failed: ${res.status} ${text}`);
        this.callbacks.onAIError?.(err);
        throw err;
      }
      const data = await res.json();
      this.callbacks.onAISearchResults?.(data);
      return data;
    } catch (err) {
      this.callbacks.onAIError?.(err);
      throw err;
    }
  }
}
