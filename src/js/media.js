// Вспомогательные функции, связанные с media (mediaBodies, media counts и т.д.)
import { findIn } from "./utils/dom.js";

export function removeFromMediaBodies(mediaBodies, id) {
  if (!mediaBodies || !id) return;
  const nodes = mediaBodies.querySelectorAll(`[data-id="${id}"]`);
  nodes.forEach((n) => n.remove());
}

export function updateMediaCounts(messagesRoot, mediaBody, mediaBodyFavorites) {
  if (!messagesRoot || !mediaBody) return;
  const counters = {
    links: 0,
    images: 0,
    videos: 0,
    audios: 0,
    files: 0,
    favorites: mediaBodyFavorites?.childElementCount || 0,
  };

  messagesRoot.querySelectorAll(".message").forEach((msg) => {
    const type = msg.dataset.type;
    if (type === "text" && msg.querySelector("a")) {
      counters.links += msg.querySelectorAll("a").length;
    } else if (type === "image") counters.images++;
    else if (type === "video") counters.videos++;
    else if (type === "audio") counters.audios++;
    else if (type === "file") counters.files++;
  });

  Object.entries(counters).forEach(([key, val]) => {
    const li = findIn(mediaBody, `[data-item="${key}"] span`);
    if (li) li.textContent = String(val);
  });
}
