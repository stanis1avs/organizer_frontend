import ChatController from '../../js/ChatController';

jest.mock('../../js/Request', () =>
  jest.fn().mockImplementation(() => ({
    callbacks: {},
    init: jest.fn(),
    send: jest.fn(),
  }))
);

jest.mock('../../js/Geo', () =>
  jest.fn().mockImplementation(() => ({
    geoMessage: jest.fn(),
  }))
);

jest.mock('../../js/favorites.js', () => ({
  removeFromFavoritesList: jest.fn(),
  appendToFavorites: jest.fn(),
}));

jest.mock('../../js/media.js', () => ({
  removeFromMediaBodies: jest.fn(),
  updateMediaCounts: jest.fn(),
  deltaMediaCount: jest.fn(),
}));

// ─── formatDate ────────────────────────────────────────────────────────────

describe('ChatController.formatDate', () => {
  let ctrl;

  beforeEach(() => {
    ctrl = new ChatController({ server: 'http://localhost:7000/' });
  });

  test('formats date as DD.MM.YYYY, HH:MM', () => {
    const d = new Date(2024, 2, 5, 9, 7); // 05.03.2024, 09:07
    expect(ctrl.formatDate(d)).toBe('05.03.2024, 09:07');
  });

  test('pads single-digit day, month, hour, and minute', () => {
    const d = new Date(2024, 0, 1, 0, 5); // 01.01.2024, 00:05
    expect(ctrl.formatDate(d)).toBe('01.01.2024, 00:05');
  });

  test('handles double-digit values without extra padding', () => {
    const d = new Date(2024, 11, 31, 23, 59); // 31.12.2024, 23:59
    expect(ctrl.formatDate(d)).toBe('31.12.2024, 23:59');
  });

  test('result matches DD.MM.YYYY, HH:MM pattern when called without args', () => {
    const result = ctrl.formatDate();
    expect(result).toMatch(/^\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}$/);
  });
});

// ─── sendMessagePayload ────────────────────────────────────────────────────

describe('ChatController.sendMessagePayload', () => {
  let ctrl;

  beforeEach(() => {
    ctrl = new ChatController({ server: 'http://localhost:7000/' });
    ctrl.request = { send: jest.fn() };
  });

  test('sends via request.send with "showMessage" event', () => {
    ctrl.sendMessagePayload({ type: 'text', message: 'hi' });
    expect(ctrl.request.send).toHaveBeenCalledWith('showMessage', expect.any(Object));
  });

  test('auto-fills date when absent', () => {
    ctrl.sendMessagePayload({ type: 'text', message: 'hi' });
    const [, info] = ctrl.request.send.mock.calls[0];
    expect(info.date).toMatch(/^\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}$/);
  });

  test('preserves provided date', () => {
    ctrl.sendMessagePayload({ type: 'text', message: 'hi', date: '01.01.2024, 00:00' });
    const [, info] = ctrl.request.send.mock.calls[0];
    expect(info.date).toBe('01.01.2024, 00:00');
  });

  test('sets geo to empty string when absent', () => {
    ctrl.sendMessagePayload({ type: 'text', message: 'hi' });
    const [, info] = ctrl.request.send.mock.calls[0];
    expect(info.geo).toBe('');
  });

  test('preserves provided geo', () => {
    ctrl.sendMessagePayload({ type: 'geo', geo: '55.75,37.61' });
    const [, info] = ctrl.request.send.mock.calls[0];
    expect(info.geo).toBe('55.75,37.61');
  });

  test('does not mutate the original payload object', () => {
    const original = { type: 'text', message: 'hi' };
    ctrl.sendMessagePayload(original);
    expect(original.date).toBeUndefined();
    expect(original.geo).toBeUndefined();
  });
});

// ─── searchAI ──────────────────────────────────────────────────────────────

describe('ChatController.searchAI', () => {
  let ctrl;

  beforeEach(() => {
    ctrl = new ChatController({ server: 'http://localhost:7000/' });
    global.fetch = jest.fn();
  });

  afterEach(() => {
    delete global.fetch;
  });

  test('throws on empty string query', async () => {
    await expect(ctrl.searchAI('')).rejects.toThrow('Empty query');
  });

  test('throws on whitespace-only query', async () => {
    await expect(ctrl.searchAI('   ')).rejects.toThrow('Empty query');
  });

  test('calls onAIError callback when query is empty', async () => {
    const onAIError = jest.fn();
    ctrl.callbacks = { onAIError };
    await expect(ctrl.searchAI('')).rejects.toThrow();
    expect(onAIError).toHaveBeenCalled();
  });

  test('posts to /search with trimmed query, topK, and alpha', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    await ctrl.searchAI('  test query  ', 5, 0.7);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:7000/search',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'test query', topK: 5, alpha: 0.7 }),
      })
    );
  });

  test('returns parsed JSON data on success', async () => {
    const mockData = [{ id: 1, score: 0.9 }];
    global.fetch.mockResolvedValue({ ok: true, json: async () => mockData });
    const result = await ctrl.searchAI('hello');
    expect(result).toEqual(mockData);
  });

  test('calls onAISearchResults callback with result data', async () => {
    const onAISearchResults = jest.fn();
    ctrl.callbacks = { onAISearchResults };
    const mockData = [{ id: 1 }];
    global.fetch.mockResolvedValue({ ok: true, json: async () => mockData });
    await ctrl.searchAI('hello');
    expect(onAISearchResults).toHaveBeenCalledWith(mockData);
  });

  test('throws and calls onAIError on non-ok HTTP response', async () => {
    const onAIError = jest.fn();
    ctrl.callbacks = { onAIError };
    global.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    });
    await expect(ctrl.searchAI('test')).rejects.toThrow('Search failed: 500');
    expect(onAIError).toHaveBeenCalled();
  });

  test('throws and calls onAIError when fetch network fails', async () => {
    const onAIError = jest.fn();
    ctrl.callbacks = { onAIError };
    global.fetch.mockRejectedValue(new Error('Network error'));
    await expect(ctrl.searchAI('test')).rejects.toThrow('Network error');
    expect(onAIError).toHaveBeenCalled();
  });

  test('uses default topK=10 and alpha=0.6 when not specified', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => [] });
    await ctrl.searchAI('test');
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.topK).toBe(10);
    expect(body.alpha).toBe(0.6);
  });
});
