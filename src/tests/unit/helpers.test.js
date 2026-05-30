import { get, findIn, removeIf, appendIfNotExists, on, off, createEl, throttle } from '../../js/utils/dom';

// ─── get ───────────────────────────────────────────────────────────────────

describe('get', () => {
  test('finds element by selector string within document', () => {
    document.body.innerHTML = '<span id="target">hi</span>';
    const el = get('#target');
    expect(el).not.toBeNull();
    expect(el.textContent).toBe('hi');
  });

  test('returns a DOM node passed directly', () => {
    const node = document.createElement('div');
    expect(get(node)).toBe(node);
  });

  test('returns null for falsy input', () => {
    expect(get(null)).toBeNull();
    expect(get('')).toBeNull();
    expect(get(undefined)).toBeNull();
  });
});

// ─── findIn ────────────────────────────────────────────────────────────────

describe('findIn', () => {
  test('finds element by selector within a given root', () => {
    const root = document.createElement('div');
    root.innerHTML = '<span class="target">hello</span>';
    const el = findIn(root, '.target');
    expect(el).not.toBeNull();
    expect(el.textContent).toBe('hello');
  });

  test('returns null when root is null', () => {
    expect(findIn(null, '.anything')).toBeNull();
  });

  test('returns null when selector is not found', () => {
    const root = document.createElement('div');
    expect(findIn(root, '.missing')).toBeNull();
  });
});

// ─── createEl ──────────────────────────────────────────────────────────────

describe('createEl', () => {
  test('defaults to <div> when no tag provided', () => {
    expect(createEl().tagName).toBe('DIV');
  });

  test('creates element with the specified tag', () => {
    expect(createEl('span').tagName).toBe('SPAN');
    expect(createEl('ul').tagName).toBe('UL');
  });

  test('adds all provided class names', () => {
    const el = createEl('div', ['foo', 'bar', 'baz']);
    expect(el.classList.contains('foo')).toBe(true);
    expect(el.classList.contains('bar')).toBe(true);
    expect(el.classList.contains('baz')).toBe(true);
  });

  test('works without class names argument', () => {
    const el = createEl('p');
    expect(el.className).toBe('');
  });
});

// ─── removeIf ──────────────────────────────────────────────────────────────

describe('removeIf', () => {
  test('removes matching element from root', () => {
    const root = document.createElement('div');
    root.innerHTML = '<span class="del">bye</span>';
    removeIf(root, '.del');
    expect(root.querySelector('.del')).toBeNull();
  });

  test('does nothing when root is null', () => {
    expect(() => removeIf(null, '.del')).not.toThrow();
  });

  test('does nothing when selector yields no match', () => {
    const root = document.createElement('div');
    expect(() => removeIf(root, '.missing')).not.toThrow();
    expect(root.children.length).toBe(0);
  });
});

// ─── appendIfNotExists ─────────────────────────────────────────────────────

describe('appendIfNotExists', () => {
  test('appends new node when selector has no match', () => {
    const root = document.createElement('div');
    const node = document.createElement('span');
    node.className = 'item';
    appendIfNotExists(root, '.item', () => node);
    expect(root.querySelector('.item')).toBe(node);
  });

  test('returns the existing node without appending a duplicate', () => {
    const root = document.createElement('div');
    root.innerHTML = '<span class="item">existing</span>';
    const existing = root.querySelector('.item');
    const result = appendIfNotExists(root, '.item', () => document.createElement('span'));
    expect(result).toBe(existing);
    expect(root.querySelectorAll('.item').length).toBe(1);
  });

  test('accepts a node directly instead of a factory function', () => {
    const root = document.createElement('div');
    const node = document.createElement('span');
    node.className = 'item';
    appendIfNotExists(root, '.item', node);
    expect(root.querySelector('.item')).toBe(node);
  });

  test('returns null when root is null', () => {
    const result = appendIfNotExists(null, '.item', () => document.createElement('div'));
    expect(result).toBeNull();
  });
});

// ─── on / off ──────────────────────────────────────────────────────────────

describe('on / off', () => {
  test('on attaches a listener that fires on event', () => {
    const el = document.createElement('button');
    const handler = jest.fn();
    on(el, 'click', handler);
    el.click();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  test('off removes the listener so it no longer fires', () => {
    const el = document.createElement('button');
    const handler = jest.fn();
    on(el, 'click', handler);
    off(el, 'click', handler);
    el.click();
    expect(handler).not.toHaveBeenCalled();
  });

  test('on with null element does not throw', () => {
    expect(() => on(null, 'click', jest.fn())).not.toThrow();
  });

  test('off with null element does not throw', () => {
    expect(() => off(null, 'click', jest.fn())).not.toThrow();
  });
});

// ─── throttle ──────────────────────────────────────────────────────────────

describe('throttle', () => {
  test('calls wrapped function on first invocation', () => {
    const fn = jest.fn();
    const now = jest.spyOn(Date, 'now').mockReturnValue(1000);
    const throttled = throttle(fn, 200);
    throttled('arg1');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('arg1');
    now.mockRestore();
  });

  test('suppresses calls within the throttle window', () => {
    const fn = jest.fn();
    let time = 1000;
    jest.spyOn(Date, 'now').mockImplementation(() => time);

    const throttled = throttle(fn, 200);
    throttled(); // t=1000 → fires
    time = 1100; // +100 ms, inside window
    throttled(); // suppressed
    time = 1199; // +199 ms, still inside window
    throttled(); // suppressed

    expect(fn).toHaveBeenCalledTimes(1);
    jest.restoreAllMocks();
  });

  test('allows a second call after the throttle window has passed', () => {
    const fn = jest.fn();
    let time = 1000;
    jest.spyOn(Date, 'now').mockImplementation(() => time);

    const throttled = throttle(fn, 200);
    throttled(); // t=1000 → fires
    time = 1201;  // +201 ms, window expired
    throttled(); // fires again

    expect(fn).toHaveBeenCalledTimes(2);
    jest.restoreAllMocks();
  });

  test('passes arguments through to the wrapped function', () => {
    const fn = jest.fn();
    jest.spyOn(Date, 'now').mockReturnValue(1000);
    const throttled = throttle(fn, 200);
    throttled('a', 'b', 'c');
    expect(fn).toHaveBeenCalledWith('a', 'b', 'c');
    jest.restoreAllMocks();
  });
});
