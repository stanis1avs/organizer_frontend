// src/chat/ChatUI.js
import ChatController from "./ChatController.js";
import MediaLoader from "./MediaLoader";
import FileLoader from "./FileLoader";
import Geo from "./Geo";
import {
  get,
  findIn,
  on,
  off,
  createEl,
  throttle,
  appendIfNotExists,
} from "./utils/dom.js";
import { removeFromFavoritesList as rmFav } from "./favorites.js";
import { deltaMediaCount } from "./media.js";

const THROTTLE_MS = 250;

export default class ChatUI {
  constructor(rootElement, server) {
    if (!rootElement) throw new Error("ChatUI: rootElement required");
    this.root = rootElement;
    this.server = server;

    this.S = {
      sidebar: ".sidebar",
      chatFooter: ".chat_footer",
      chatBody: ".chat_body",
      dropplace: ".dropplace",
      clip: ".clip",
      sending: ".sending",
      clipBody: ".clip_body",
      messages: ".messages",
      chatInput: ".chat_input",
      pinMesg: ".pin_mesg",
      pinContentBody: ".pin_content_body",
      closePin: ".close_pin",
      expandPin: ".expand_pin",
      clipGeo: ".clip_geo",
      clipFile: ".clip_file",
      clipAudio: ".clip_audio",
      clipVideo: ".clip_video",
      media: null,
      mediaTitle: ".media_title",
      closeMedia: ".close_media",
      mediaBody: ".media_body",
      mediaBodies: ".media_bodies",
      mediaBodyFavorites: ".media_body_favorites",
      aiToggle: ".ai-toggle",
      aiViewAnswers: ".left-aside",
    };

    // select(selector) — ищет селектор внутри this.root (взяты из utils/get)
    // Паттерны: это small helper function / facade — упрощает вызовы DOM API и скрывает root.
    const select = (sel) => get(sel, this.root);

    // selectMediaRoot(selector) — ищет внутри соседнего media контейнера (если он есть)
    // Паттерн: адаптер/абстракция — адаптирует источник (media root) к единообразному API select(...)
    const selectMediaRoot = (sel, root) => (root ? get(sel, root) : null);

    this.sidebar = select(this.S.sidebar);
    this.chatFooter = select(this.S.chatFooter);
    this.chatBody = select(this.S.chatBody);
    this.dropplace = select(this.S.dropplace);
    this.clip = select(this.S.clip);
    this.sending = select(this.S.sending);
    this.clipBody = select(this.S.clipBody);
    this.messages = select(this.S.messages);
    this.chatInput = select(this.S.chatInput);
    this.pinMesg = select(this.S.pinMesg);
    this.pinContentBody = select(this.S.pinContentBody);
    this.closePin = select(this.S.closePin);
    this.expandPin = select(this.S.expandPin);
    this.clipGeo = select(this.S.clipGeo);
    this.clipFile = select(this.S.clipFile);
    this.clipAudio = select(this.S.clipAudio);
    this.clipVideo = select(this.S.clipVideo);
    this.aiToggle = select(this.S.aiToggle);

    // media right
    this.media = this.root.nextElementSibling || null;
    this.mediaTitle = selectMediaRoot(this.S.mediaTitle, this.media);
    this.closeMedia = selectMediaRoot(this.S.closeMedia, this.media);
    this.mediaBody = selectMediaRoot(this.S.mediaBody, this.media);
    this.mediaBodies = selectMediaRoot(this.S.mediaBodies, this.media);
    this.mediaBodyFavorites = selectMediaRoot(
      this.S.mediaBodyFavorites,
      this.media
    );

    // ai left
    this.aiViewAnswers = this.root.previousElementSibling || null;
    this.aiMediaTitle = selectMediaRoot(this.S.mediaTitle, this.aiViewAnswers);

    this.fileInput = document.createElement("input");
    this.fileInput.type = "file";
    this.fileInput.style.display = "none";
    this.fileInput.multiple = false;
    (this.chatFooter || this.root).appendChild(this.fileInput);

    // ai panel file input (for left aside clip)
    this.aiFileInput = document.createElement("input");
    this.aiFileInput.type = "file";
    this.aiFileInput.style.display = "none";
    this.aiFileInput.multiple = false;
    // accept audio/video/images
    this.aiFileInput.accept = "audio/*,video/*,image/*";
    (this.aiViewAnswers || this.root).appendChild(this.aiFileInput);

    // prepare ai controls placeholders (will be rendered into left-aside on init)
    this.aiInput = null;
    this.aiTopK = null;
    this.aiAlpha = null;
    this.aiSend = null;
    this.aiClipBtn = null;
    this.aiResultsRoot = null;

    // bound handlers (используются и при навешивании, и при снятии в dispose)
    this._aiBound = {
      onClick: this.handleAIToggleClick.bind(this),
      onKey:   this.handleAIToggleKey.bind(this),
    };

    // Контроллер
    this.controller = new ChatController({
      server: this.server,
      nodes: {
        messages: this.messages,
        mediaBodies: this.mediaBodies,
        mediaBody: this.mediaBody,
        mediaBodyFavorites: this.mediaBodyFavorites,
        chatFooter: this.chatFooter,
        chatInput: this.chatInput,
        chatBody: this.chatBody,
        pinContentBody: this.pinContentBody,
        pinMesg: this.pinMesg,
      },
      callbacks: {
        onFavoriteServerAppend: (id, elem) =>
          this.setFavoriteState(elem, id, true, false),
        onFavoriteServerDelete: (id, elem) =>
          this.setFavoriteState(elem, id, false, false),
        onMarkFavoriteLocal: (elem, id) =>
          this.setFavoriteState(elem, id, true, false),
        onAIModeChanged: (enabled) => {
          this.setAIModeUI(Boolean(enabled));
        },
        onAISearchResults: (data) => this.renderAIResults(data),
        onAIError: (err) => this.renderAIError(err),
      },
    });

    this._bound = {
      lazyLoad: throttle(
        this.controller.lazyLoad.bind(this.controller),
        THROTTLE_MS
      ),
      handleMediaBodyClick: this.handleMediaBodyClick.bind(this),
    };

    if (this.messages) {
      this.messages.addEventListener("scroll", this._bound.lazyLoad);
    }

    this.fileInput.addEventListener("change", (e) => {
      const files = e.target.files || [];
      for (let i = 0; i < files.length; i += 1) {
        const f = files[i];
        // delegate sending logic to send()
        this.send(f);
      }
      // reset input so same file can be chosen again later
      e.target.value = "";
    });

    this.aiFileInput.addEventListener("change", (e) => {
      const files = e.target.files || [];
      if (files.length > 0) {
        // show selected file name in AI panel results area (but do NOT send it to search endpoint)
        const f = files[0];
        this.appendAISelectedFile(f);
      }
      e.target.value = "";
    });
  }

  init() {
    this.controller.initRequest();

    on(this.sidebar, "click", () => {
      this.media && this.media.classList.toggle("media_active");

      const isOpen = this.media.classList.contains("media_active");

      if (isOpen) {
        document.body.classList.add("body_with_media_aside");
      } else {
        document.body.classList.remove("body_with_media_aside");
      }
    });
    on(this.mediaBody, "click", this._bound.handleMediaBodyClick);

    on(this.closeMedia, "click", () => {
      const active =
        this.media && findIn(this.media, ".media_body_item_active");
      if (active) {
        active.classList.remove("media_body_item_active");
      } else {
        this.media && this.media.classList.remove("media_active");
        document.body.classList.remove("body_with_media_aside");
      }
      if (this.mediaTitle) this.mediaTitle.textContent = "Shared media";
      this.mediaBody && this.mediaBody.classList.remove("media_body_inactive");
    });

    on(
      this.clip,
      "click",
      () => this.clipBody && this.clipBody.classList.toggle("clip_active")
    );
    on(this.sending, "click", () => this.send(this.chatInput?.value));

    on(this.clipGeo, "click", () => {
      const existing = findIn(this.chatFooter, ".geo_frame");
      if (existing) existing.remove();
      else this.geo();
      this.clipBody && this.clipBody.classList.remove("clip_active");
    });

    on(this.clipFile, "click", () => this.attach());
    on(this.clipAudio, "click", () => this.record("audio"));
    on(this.clipVideo, "click", () => this.record("video"));

    on(this.expandPin, "click", () => this.togglePinExpand());
    on(this.closePin, "click", () => this.closePinMessage());

    if (this.aiToggle) {
      const initial = Boolean(this.controller && this.controller.aiEnabled);
      this.setAIModeUI(initial);
      on(this.aiToggle, "click",   this._aiBound.onClick);
      on(this.aiToggle, "keydown", this._aiBound.onKey);
    }

    if (this.chatInput) {
      this.chatInput.maxLength = 4000;
      this.chatInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          this.send(this.chatInput.value);
        }
      });
    }

    // WS connection indicator
    this._wsIndicator = this.root.querySelector(".ws-status") || null;
    if (this.controller.request) {
      this.controller.request.callbacks.onConnect    = () => this._setWsStatus("connected");
      this.controller.request.callbacks.onDisconnect = () => this._setWsStatus("reconnecting");
    }

    // overlay tap-to-close for mobile drawers
    const overlay = document.getElementById("panelOverlay");
    if (overlay) {
      on(overlay, "click", () => {
        if (this.media && this.media.classList.contains("media_active")) {
          this.media.classList.remove("media_active");
          document.body.classList.remove("body_with_media_aside");
        }
        if (this.aiViewAnswers && this.aiViewAnswers.classList.contains("left-aside-active")) {
          this.toggleAIMode(false);
        }
      });
    }

    this.setupAIControls();

    this.attachMutationObserver();
  }

  dispose() {
    off(this.messages,  "scroll", this._bound.lazyLoad);
    off(this.mediaBody, "click",  this._bound.handleMediaBodyClick);
    if (this.aiToggle) {
      off(this.aiToggle, "click",   this._aiBound.onClick);
      off(this.aiToggle, "keydown", this._aiBound.onKey);
    }
    this.disconnectMutationObserver();
  }

  attachMutationObserver() {
    if (!this.messages) return;
    this._mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType === 1 && node.classList.contains("message")) {
            this.initMessageRow(node);
          }
        }
      }
    });
    this._mo.observe(this.messages, { childList: true, subtree: false });
  }

  disconnectMutationObserver() {
    if (this._mo) this._mo.disconnect();
  }

  initMessageRow(elem) {
    const id = elem.dataset.id;
    if (!id) return;

    const pinBtn = findIn(elem, ".pin");
    if (pinBtn)
      on(pinBtn, "click", () =>
        this.controller.request.send("appendPin", { id })
      );

    const binBtn = findIn(elem, ".bin");
    if (binBtn)
      on(binBtn, "click", () =>
        this.controller.request.send("deleteMessage", { id })
      );

    const fav = findIn(elem, ".favorite_inactive");
    if (fav)
      on(fav, "click", () => this.setFavoriteState(elem, id, true, true));
  }

  record(typeMedia) {
    this.clipBody && this.clipBody.classList.remove("clip_active");
    const loader = new MediaLoader(this.clip, this.chatInput, this.sending);
    loader
      .record(typeMedia)
      .then((blob) => this.send(blob))
      .catch((err) => this._showToast(err?.message ?? String(err)));
  }

  attach() {
    this.clipBody && this.clipBody.classList.remove("clip_active");
    const loader = new FileLoader(this.root);
    loader.getFile().then((file) => this.send(file));
  }

  send(elem) {
    if (elem instanceof Blob) {
      const mimeMap = {
        "image/jpeg": { type: "image" },
        "image/png": { type: "image" },
        "video/mp4": { type: "video", extension: "mp4" },
        "audio/mpeg": { type: "audio", extension: "mpeg" },
      };
      const meta = mimeMap[elem.type] || { type: "file" };
      const name = elem.name || `${Date.now()}.${meta.extension || "dat"}`;
      const payload = { type: meta.type, body: elem, name };
      if (findIn(this.chatFooter, ".geo_frame"))
        payload.geo = this.coordinates || "";
      this.controller.sendMessagePayload(payload);
    } else if (typeof elem === "string" && elem.trim()) {
      const payload = { type: "text", body: elem.trim() };
      if (findIn(this.chatFooter, ".geo_frame"))
        payload.geo = this.coordinates || "";
      this.controller.sendMessagePayload(payload);
    } else {
      return;
    }

    if (this.chatInput) this.chatInput.value = "";
  }

  // теперь только CSS-классы — никаких inline fallback'ов
  togglePinExpand() {
    if (!this.pinMesg) return;
    this.pinMesg.classList.toggle("pin-expanded");
  }

  closePinMessage() {
    if (!this.pinMesg) return;
    this.pinMesg.classList.remove("pin_mesg_active", "pin-expanded");
    if (this.pinContentBody) this.pinContentBody.innerHTML = "";
    if (this.chatBody) this.chatBody.classList.remove("pin-active");
  }

  createFavoriteNode(isActive = false) {
    const node = createEl("div", [
      "message_header_img",
      isActive ? "favorite_active" : "favorite_inactive",
    ]);
    return node;
  }

  setFavoriteState(elem, id, isFavorite, send = false) {
    if (!elem) return;
    const header = findIn(elem, ".message_header");
    if (!header) return;

    const existingInactive = findIn(header, ".favorite_inactive");
    const existingActive = findIn(header, ".favorite_active");

    const attachInactive = (inactiveEl) => {
      on(inactiveEl, "click", () =>
        this.setFavoriteState(elem, id, true, true)
      );
    };

    const attachActive = (activeEl) => {
      on(activeEl, "click", () => {
        const inactiveEl = this.createFavoriteNode(false);
        activeEl.replaceWith(inactiveEl);
        attachInactive(inactiveEl);
        rmFav(this.mediaBodyFavorites, id);
        if (send) this.controller.request.send("favoriteDelete", id);
        deltaMediaCount(this.mediaBody, this.mediaBodyFavorites, "favorites", -1);
      });
    };

    if (isFavorite) {
      if (existingActive) return;
      const favActive = this.createFavoriteNode(true);
      if (existingInactive) existingInactive.replaceWith(favActive);
      else header.append(favActive);
      attachActive(favActive);

      appendIfNotExists(
        this.mediaBodyFavorites,
        `[data-id="${elem.dataset.id}"]`,
        () => {
          const body = findIn(elem, ".message_body")?.firstChild;
          const copy = body ? body.cloneNode(true) : createEl("div");
          copy.dataset.id = elem.dataset.id;
          return copy;
        }
      );

      if (send) this.controller.request.send("favoriteAppend", id);
      deltaMediaCount(this.mediaBody, this.mediaBodyFavorites, "favorites", 1);
    } else {
      if (existingActive) {
        const inactiveEl = this.createFavoriteNode(false);
        existingActive.replaceWith(inactiveEl);
        attachInactive(inactiveEl);
      }
      rmFav(this.mediaBodyFavorites, id);
      if (send) this.controller.request.send("favoriteDelete", id);
      deltaMediaCount(this.mediaBody, this.mediaBodyFavorites, "favorites", -1);
    }
  }

  removeFromFavoritesList(elem) {
    const id = elem?.dataset?.id;
    rmFav(this.mediaBodyFavorites, id);
  }

  geo() {
    const geo = new Geo();
    geo
      .getGeo()
      .then((elem) => {
        this.chatFooter && this.chatFooter.append(elem);
        this.coordinates = elem.textContent || "";
      })
      .catch((err) => this._showToast(err?.message ?? String(err), "warn"));
  }

  handleMediaBodyClick(e) {
    let item = e.target;
    if (item && !item.dataset?.item) item = item.parentElement || item;
    const dataValue = item?.dataset?.item;
    if (!dataValue) return;
    if (this.mediaTitle) this.mediaTitle.textContent = item.textContent;
    this.mediaBody && this.mediaBody.classList.add("media_body_inactive");
    const target = findIn(this.mediaBodies, `[data-item="${dataValue}"]`);
    if (target) target.classList.add("media_body_item_active");
  }

  toggleAIMode(enabled) {
    const newState = Boolean(enabled);
    // inform controller (it will send to server if implemented)
    if (this.controller && typeof this.controller.setAIEnabled === "function") {
      this.controller.setAIEnabled(newState);
    } else if (this.controller) {
      // fallback
      this.controller.aiEnabled = newState;
      // call callback if exists
      if (
        this.controller.callbacks &&
        typeof this.controller.callbacks.onAIModeChanged === "function"
      ) {
        this.controller.callbacks.onAIModeChanged(newState);
      }
    }

    // update UI immediately
    this.setAIModeUI(newState);

    if (this.aiViewAnswers) {
      if (newState) {
        this.aiViewAnswers.classList.add("left-aside-active");
        this.aiViewAnswers.setAttribute("aria-hidden", "false");
      } else {
        this.aiViewAnswers.classList.remove("left-aside-active");
        this.aiViewAnswers.setAttribute("aria-hidden", "true");
      }
    }
  }

  setAIModeUI(enabled) {
    if (!this.aiToggle) return;
    if (enabled) {
      this.aiToggle.classList.add("ai-on"); // CSS expects .ai-on
      this.aiToggle.setAttribute("aria-checked", "true");
      // visual label handled by CSS (.ai-toggle.ai-on .ai-label)
    } else {
      this.aiToggle.classList.remove("ai-on");
      this.aiToggle.setAttribute("aria-checked", "false");
    }

    if (enabled) {
      document.body.classList.add("body_with_ai_aside");
    } else {
      document.body.classList.remove("body_with_ai_aside");
    }
  }

  handleAIToggleClick(e) {
    e && e.preventDefault && e.preventDefault();
    const current = Boolean(this.controller && this.controller.aiEnabled);
    this.toggleAIMode(!current);
  }

  handleAIToggleKey(e) {
    // Space or Enter toggle
    if (e.key === " " || e.key === "Spacebar" || e.key === "Enter") {
      e.preventDefault();
      const current = Boolean(this.controller && this.controller.aiEnabled);
      this.toggleAIMode(!current);
    }
  }

  setupAIControls() {
    if (!this.aiViewAnswers) return;

    // ensure single container
    let controls = findIn(this.aiViewAnswers, ".ai-controls");
    if (!controls) {
      controls = createEl("div", ["ai-controls"]);
      this.aiViewAnswers.appendChild(controls);
    }

    // search input wrapper (CSS adds magnifier icon via ::before)
    let inputWrap = findIn(controls, ".ai-input-wrap");
    if (!inputWrap) {
      inputWrap = createEl("div", ["ai-input-wrap"]);
      controls.appendChild(inputWrap);
    }

    this.aiInput = findIn(inputWrap, ".ai_input") || createEl("input", ["ai_input"]);
    this.aiInput.type = "text";
    this.aiInput.placeholder = "Поиск...";
    inputWrap.appendChild(this.aiInput);

    // params row (topK / alpha)
    let paramsRow = findIn(controls, ".ai_params");
    if (!paramsRow) {
      paramsRow = createEl("div", ["ai_params"]);
      controls.appendChild(paramsRow);
    }

    this.aiTopK = findIn(paramsRow, ".ai_topk") || createEl("input", ["ai_topk"]);
    this.aiTopK.type = "number";
    this.aiTopK.min = "1";
    this.aiTopK.step = "1";
    this.aiTopK.value = this.aiTopK.value || "10";
    this.aiTopK.title = "Top K results";
    paramsRow.appendChild(this.aiTopK);

    this.aiAlpha = findIn(paramsRow, ".ai_alpha") || createEl("input", ["ai_alpha"]);
    this.aiAlpha.type = "number";
    this.aiAlpha.min = "0";
    this.aiAlpha.max = "1";
    this.aiAlpha.step = "0.1";
    this.aiAlpha.value = this.aiAlpha.value || "0.6";
    this.aiAlpha.title = "Vector/keyword blend (alpha)";
    paramsRow.appendChild(this.aiAlpha);


    // actions row (clip + search)
    let actions = findIn(controls, ".ai_actions");
    if (!actions) {
      actions = createEl("div", ["ai_actions"]);
      controls.appendChild(actions);
    }

    this.aiClipBtn = findIn(actions, ".ai_clip_btn") || createEl("button", ["ai_clip_btn"]);
    this.aiClipBtn.type = "button";
    this.aiClipBtn.textContent = "📎";
    this.aiClipBtn.title = "Attach file";
    actions.appendChild(this.aiClipBtn);

    this.aiSend = findIn(actions, ".ai_send_btn") || createEl("button", ["ai_send_btn"]);
    this.aiSend.type = "button";
    this.aiSend.textContent = "AI";
    actions.appendChild(this.aiSend);

    // type-filter section
    if (!findIn(controls, ".ai-type-section")) {
      const typeSection = createEl("div", ["ai-type-section"]);
      const typeLabel = createEl("div", ["ai-type-label"]);
      typeLabel.textContent = "Тип";
      typeSection.appendChild(typeLabel);

      const typeList = createEl("ul", ["ai-type-list"]);
      for (const t of ["audio", "video", "file", "geo"]) {
        const li = createEl("li", ["ai-type-item", t]);
        li.textContent = t;
        on(li, "click", () => li.classList.toggle("active"));
        typeList.appendChild(li);
      }
      typeSection.appendChild(typeList);
      controls.appendChild(typeSection);
    }

    // results container
    this.aiResultsRoot = findIn(this.aiViewAnswers, ".ai_results");
    if (!this.aiResultsRoot) {
      this.aiResultsRoot = createEl("div", ["ai_results"]);
      this.aiViewAnswers.appendChild(this.aiResultsRoot);
    }

    // wire events
    on(this.aiSend, "click", () => this.handleAISubmit());
    this.aiInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.handleAISubmit();
      }
    });
    on(this.aiClipBtn, "click", () => this.aiFileInput && this.aiFileInput.click());
  }

  async handleAISubmit() {
    if (!this.aiInput) return;
    const query = String(this.aiInput.value || "").trim();
    if (!query) {
      // show small hint
      this.renderAIError(new Error("Query is empty"));
      return;
    }

    const topK = Number(this.aiTopK?.value || 10);
    const alpha = Number(this.aiAlpha?.value || 0.6);
    // show loading UI
    this.aiResultsRoot.innerHTML = '<div class="ai-loading">Searching…</div>';

    try {
      // controller.searchAI will POST to `${this.server}search`
      const res = await this.controller.searchAI(query, topK, alpha);
      // controller triggers callback onAISearchResults which calls renderAIResults too,
      // but also render here for instant feedback
      this.renderAIResults(res);
    } catch (err) {
      this.renderAIError(err);
    }
  }

  renderAIResults(data) {
    if (!this.aiResultsRoot) return;
    this.aiResultsRoot.innerHTML = "";

    // Бэкенд возвращает { results: [...] } — разворачиваем
    const items = Array.isArray(data) ? data : (data?.results ?? []);

    if (items.length === 0) {
      const empty = createEl("div", ["ai-result-empty"]);
      empty.textContent = "Ничего не найдено. Попробуйте снизить Alpha.";
      this.aiResultsRoot.appendChild(empty);
      return;
    }

    for (const item of items) {
      const block = createEl("div", ["ai-result-item"]);
      if (item && typeof item === "object") {
        const title = item.message || item.title || item.id || "";
        if (title) {
          const h = createEl("div", ["ai-result-title"]);
          h.textContent = String(title);
          block.appendChild(h);
        }
        const score = item.combinedScore != null
          ? createEl("div", ["ai-result-score"])
          : null;
        if (score) {
          score.textContent = `Score: ${Number(item.combinedScore).toFixed(3)}`;
          block.appendChild(score);
        }
      } else {
        block.textContent = String(item);
      }
      this.aiResultsRoot.appendChild(block);
    }
  }

  renderAIError(err) {
    if (!this.aiResultsRoot) return;
    this.aiResultsRoot.innerHTML = "";
    const node = createEl("div", ["ai-error"]);
    node.style.color = "#ff8a8a";
    node.textContent = `Search failed: ${
      err && err.message ? err.message : String(err)
    }`;
    this.aiResultsRoot.appendChild(node);
  }

  appendAISelectedFile(file) {
    if (!this.aiResultsRoot) return;
    const node = createEl("div", ["ai-selected-file"]);
    node.textContent = `Selected: ${file.name} (${Math.round(file.size / 1024)} KB)`;
    this.aiResultsRoot.prepend(node);
  }

  // Показывает неблокирующее уведомление вместо alert()
  _showToast(message, type = "error") {
    let container = document.querySelector(".toast-container");
    if (!container) {
      container = createEl("div", ["toast-container"]);
      document.body.appendChild(container);
    }
    const toast = createEl("div", ["toast", `toast-${type}`]);
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  // Обновляет индикатор WS-соединения в шапке
  _setWsStatus(state) {
    if (!this._wsIndicator) return;
    this._wsIndicator.className = `ws-status ws-${state}`;
    this._wsIndicator.title = { connected: "Connected", reconnecting: "Reconnecting…", disconnected: "Disconnected" }[state] ?? state;
  }
}
