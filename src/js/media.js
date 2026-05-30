import { findIn } from "./utils/dom.js";

const TYPE_TO_KEY = {
  image: "images",
  video: "videos",
  audio: "audios",
  file: "files",
};

export function removeFromMediaBodies(mediaBodies, id) {
  if (!mediaBodies || !id) return;
  mediaBodies.querySelectorAll(`[data-id="${id}"]`).forEach((n) => n.remove());
}

// type — значение из message.dataset.type ("image", "text", "audio", "video", "file", "favorites").
// delta — +1 при добавлении, -1 при удалении.
// msgEl — DOM-узел сообщения (нужен только для type="text" чтобы посчитать ссылки).
export function deltaMediaCount(mediaBody, mediaBodyFavorites, type, delta, msgEl = null) {
  if (!mediaBody) return;

  if (type === "favorites") {
    const span = findIn(mediaBody, '[data-item="favorites"] span');
    if (span) span.textContent = String(mediaBodyFavorites?.childElementCount ?? 0);
    return;
  }

  const key = TYPE_TO_KEY[type];
  if (key) {
    const span = findIn(mediaBody, `[data-item="${key}"] span`);
    if (span) {
      const next = Math.max(0, (parseInt(span.textContent, 10) || 0) + delta);
      span.textContent = String(next);
    }
    return;
  }

  // Для текстовых сообщений — считаем ссылки только в конкретном элементе (не все сообщения)
  if (type === "text" && msgEl) {
    const linkCount = msgEl.querySelectorAll("a").length;
    if (linkCount > 0) {
      const span = findIn(mediaBody, '[data-item="links"] span');
      if (span) {
        const next = Math.max(0, (parseInt(span.textContent, 10) || 0) + delta * linkCount);
        span.textContent = String(next);
      }
    }
  }
}

// Полный пересчёт — вызывается один раз при начальной загрузке данных.
// Для всех последующих изменений используйте deltaMediaCount (O(1)).
export function updateMediaCounts(messagesRoot, mediaBody, mediaBodyFavorites) {
  if (!messagesRoot || !mediaBody) return;

  const counters = {
    links: 0,
    images: 0,
    videos: 0,
    audios: 0,
    files: 0,
    favorites: mediaBodyFavorites?.childElementCount ?? 0,
  };

  messagesRoot.querySelectorAll(".message").forEach((msg) => {
    const type = msg.dataset.type;
    if (type === "text") {
      counters.links += msg.querySelectorAll("a").length;
    } else if (type === "image") counters.images++;
    else if (type === "video") counters.videos++;
    else if (type === "audio") counters.audios++;
    else if (type === "file") counters.files++;
  });

  Object.entries(counters).forEach(([key, val]) => {
    const span = findIn(mediaBody, `[data-item="${key}"] span`);
    if (span) span.textContent = String(val);
  });
}
