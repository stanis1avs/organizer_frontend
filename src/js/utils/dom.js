// Утилиты для безопасного доступа и базовой работы с DOM
export function get(rootOrSelector, root = document) {
  // если передали строку — считаем селектором и ищем в root
  if (!rootOrSelector) return null;
  if (typeof rootOrSelector === "string") {
    return root ? root.querySelector(rootOrSelector) : null;
  }
  // если передали уже node — возвращаем как есть
  return rootOrSelector || null;
}

export function findIn(root, selector) {
  return root ? root.querySelector(selector) : null;
}

export function removeIf(root, selector) {
  if (!root) return;
  const el = findIn(root, selector);
  if (el) el.remove();
}

export function appendIfNotExists(root, selector, nodeFactory) {
  if (!root) return null;
  const existing = findIn(root, selector);
  if (existing) return existing;
  const node = typeof nodeFactory === "function" ? nodeFactory() : nodeFactory;
  root.append(node);
  return node;
}

export function on(el, evt, fn, opts) {
  if (el) el.addEventListener(evt, fn, opts);
}
export function off(el, evt, fn, opts) {
  if (el) el.removeEventListener(evt, fn, opts);
}

export function createEl(tag = "div", classNames = []) {
  const e = document.createElement(tag);
  (classNames || []).forEach((c) => e.classList.add(c));
  return e;
}

export function throttle(fn, ms = 200) {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last > ms) {
      last = now;
      fn(...args);
    }
  };
}
