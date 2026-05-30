import Message from '../../js/Message';

describe('Message._fileUrl', () => {
  test('returns plain URL without token', () => {
    const msg = new Message('file.mp3', 1, '', 'audio', null, 'http://localhost:7000/');
    expect(msg._fileUrl('file.mp3')).toBe('http://localhost:7000/file.mp3');
  });

  test('appends token when provided', () => {
    const msg = new Message('file.mp3', 1, '', 'audio', null, 'http://localhost:7000/', 'abc123');
    expect(msg._fileUrl('file.mp3')).toBe('http://localhost:7000/file.mp3?token=abc123');
  });

  test('URL-encodes special characters in token', () => {
    const msg = new Message('f.mp3', 1, '', 'audio', null, 'http://s/', 'tok en+val');
    expect(msg._fileUrl('f.mp3')).toBe('http://s/f.mp3?token=tok%20en%2Bval');
  });
});

describe('Message.createElement — structure', () => {
  test('returns div.message with data-id and data-type', () => {
    const msg = new Message('hello', 42, '01.01.2024, 12:00', 'text', null, '');
    const el = msg.createElement();
    expect(el.tagName).toBe('DIV');
    expect(el.classList.contains('message')).toBe(true);
    expect(el.dataset.id).toBe('42');
    expect(el.dataset.type).toBe('text');
  });

  test('contains .message_header, .message_body, .message_footer sub-divs', () => {
    const msg = new Message('hi', 1, '', 'text', null, '');
    const el = msg.createElement();
    expect(el.querySelector('.message_header')).not.toBeNull();
    expect(el.querySelector('.message_body')).not.toBeNull();
    expect(el.querySelector('.message_footer')).not.toBeNull();
  });

  test('header contains bin, pin, and favorite_inactive tools', () => {
    const msg = new Message('hi', 1, '', 'text', null, '');
    const el = msg.createElement();
    expect(el.querySelector('.bin')).not.toBeNull();
    expect(el.querySelector('.pin')).not.toBeNull();
    expect(el.querySelector('.favorite_inactive')).not.toBeNull();
  });

  test('footer contains .date span with the provided date string', () => {
    const msg = new Message('hi', 1, '15.03.2024, 10:30', 'text', null, '');
    const el = msg.createElement();
    const dateEl = el.querySelector('.date');
    expect(dateEl).not.toBeNull();
    expect(dateEl.textContent).toBe('15.03.2024, 10:30');
  });
});

describe('Message text body — XSS protection', () => {
  test('does not inject <script> tags as DOM elements', () => {
    const payload = '<script>alert(1)</script>';
    const msg = new Message(payload, 1, '', 'text', null, '');
    const el = msg.createElement();
    expect(el.querySelector('script')).toBeNull();
  });

  test('renders XSS payload as literal text content', () => {
    const payload = '<img src=x onerror=alert(1)>';
    const msg = new Message(payload, 1, '', 'text', null, '');
    const el = msg.createElement();
    expect(el.querySelector('.message_body').textContent).toContain('<img src=x onerror=alert(1)>');
    expect(el.querySelector('.message_body img')).toBeNull();
  });

  test('renders plain text correctly', () => {
    const msg = new Message('Hello world', 1, '', 'text', null, '');
    const el = msg.createElement();
    expect(el.querySelector('.message_body').textContent.trim()).toBe('Hello world');
  });
});

describe('Message text body — link detection', () => {
  test('renders http URL as <a> with target=_blank and rel=noopener noreferrer', () => {
    const msg = new Message('check https://example.com out', 1, '', 'text', null, '');
    const el = msg.createElement();
    const link = el.querySelector('a');
    expect(link).not.toBeNull();
    expect(link.href).toBe('https://example.com/');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  test('plain text without URL produces no <a> element', () => {
    const msg = new Message('just plain text', 1, '', 'text', null, '');
    const el = msg.createElement();
    expect(el.querySelector('a')).toBeNull();
  });

  test('URL clone is appended to links panel in mediaBodies', () => {
    const mediaBodies = document.createElement('div');
    mediaBodies.innerHTML = '<div data-item="links"></div>';
    const msg = new Message('https://example.com', 1, '', 'text', mediaBodies, '');
    msg.createElement();
    const linksPanel = mediaBodies.querySelector('[data-item="links"]');
    expect(linksPanel.querySelector('a')).not.toBeNull();
    expect(linksPanel.querySelector('a').href).toBe('https://example.com/');
  });

  test('message body still contains non-URL words as text', () => {
    const msg = new Message('visit https://example.com today', 1, '', 'text', null, '');
    const el = msg.createElement();
    const body = el.querySelector('.message_body');
    expect(body.textContent).toContain('visit');
    expect(body.textContent).toContain('today');
  });
});

describe('Message image body', () => {
  function makeMediaBodies() {
    const div = document.createElement('div');
    div.innerHTML = '<div data-item="images"></div>';
    return div;
  }

  test('renders <img> with class message_media and correct src', () => {
    const msg = new Message('photo.jpg', 1, '', 'image', makeMediaBodies(), 'http://localhost:7000/');
    const el = msg.createElement();
    const img = el.querySelector('img.message_media');
    expect(img).not.toBeNull();
    expect(img.src).toBe('http://localhost:7000/photo.jpg');
    expect(img.alt).toBe('photo.jpg');
  });

  test('appends clone to images panel in mediaBodies', () => {
    const mb = makeMediaBodies();
    const msg = new Message('photo.jpg', 1, '', 'image', mb, 'http://localhost:7000/');
    msg.createElement();
    const panel = mb.querySelector('[data-item="images"]');
    expect(panel.querySelector('img')).not.toBeNull();
  });

  test('includes token in image src when provided', () => {
    const msg = new Message('photo.jpg', 1, '', 'image', makeMediaBodies(), 'http://localhost:7000/', 'mytoken');
    const el = msg.createElement();
    expect(el.querySelector('img').src).toBe('http://localhost:7000/photo.jpg?token=mytoken');
  });
});

describe('Message audio body', () => {
  function makeMediaBodies() {
    const div = document.createElement('div');
    div.innerHTML = '<div data-item="audios"></div>';
    return div;
  }

  test('renders <audio controls> with correct src', () => {
    const msg = new Message('sound.mp3', 1, '', 'audio', makeMediaBodies(), 'http://localhost:7000/');
    const el = msg.createElement();
    const audio = el.querySelector('audio');
    expect(audio).not.toBeNull();
    expect(audio.hasAttribute('controls')).toBe(true);
    expect(audio.src).toBe('http://localhost:7000/sound.mp3');
  });

  test('appends clone (with preload=none) to audios panel', () => {
    const mb = makeMediaBodies();
    const msg = new Message('sound.mp3', 1, '', 'audio', mb, 'http://localhost:7000/');
    msg.createElement();
    const panel = mb.querySelector('[data-item="audios"]');
    const clonedAudio = panel.querySelector('audio');
    expect(clonedAudio).not.toBeNull();
    expect(clonedAudio.getAttribute('preload')).toBe('none');
  });
});

describe('Message video body', () => {
  function makeMediaBodies() {
    const div = document.createElement('div');
    div.innerHTML = '<div data-item="videos"></div>';
    return div;
  }

  test('renders <video controls> with correct src', () => {
    const msg = new Message('clip.mp4', 1, '', 'video', makeMediaBodies(), 'http://localhost:7000/');
    const el = msg.createElement();
    const video = el.querySelector('video');
    expect(video).not.toBeNull();
    expect(video.hasAttribute('controls')).toBe(true);
    expect(video.src).toBe('http://localhost:7000/clip.mp4');
  });

  test('appends clone (with preload=none) to videos panel', () => {
    const mb = makeMediaBodies();
    const msg = new Message('clip.mp4', 1, '', 'video', mb, 'http://localhost:7000/');
    msg.createElement();
    const panel = mb.querySelector('[data-item="videos"]');
    const clonedVideo = panel.querySelector('video');
    expect(clonedVideo).not.toBeNull();
    expect(clonedVideo.getAttribute('preload')).toBe('none');
  });
});

describe('Message file body', () => {
  function makeMediaBodies() {
    const div = document.createElement('div');
    div.innerHTML = '<div data-item="files"></div>';
    return div;
  }

  test('renders <a class="message_file"> with correct href and text', () => {
    const msg = new Message('report.pdf', 1, '', 'file', makeMediaBodies(), 'http://localhost:7000/');
    const el = msg.createElement();
    const link = el.querySelector('a.message_file');
    expect(link).not.toBeNull();
    expect(link.href).toBe('http://localhost:7000/report.pdf');
    expect(link.textContent).toBe('report.pdf');
  });

  test('appends clone to files panel', () => {
    const mb = makeMediaBodies();
    const msg = new Message('report.pdf', 1, '', 'file', mb, 'http://localhost:7000/');
    msg.createElement();
    const panel = mb.querySelector('[data-item="files"]');
    expect(panel.querySelector('a.message_file')).not.toBeNull();
  });
});
