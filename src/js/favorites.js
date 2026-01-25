// Чистые функции для работы с "избраное"
import {
  findIn,
  removeIf as domRemoveIf,
  appendIfNotExists,
} from "./utils/dom.js";

export function removeFromFavoritesList(mediaBodyFavorites, id) {
  if (!mediaBodyFavorites || !id) return;
  domRemoveIf(mediaBodyFavorites, `[data-id="${id}"]`);
}

export function appendToFavorites(mediaBodyFavorites, elem) {
  if (!mediaBodyFavorites || !elem) return;
  const body = findIn(elem, ".message_body")?.firstChild;
  if (!body) return;
  const selector = `[data-id="${elem.dataset.id}"]`;
  // appendIfNotExists вернёт существующий или вставит новый
  appendIfNotExists(mediaBodyFavorites, selector, () => {
    const copy = body.cloneNode(true);
    copy.dataset.id = elem.dataset.id;
    return copy;
  });
}
