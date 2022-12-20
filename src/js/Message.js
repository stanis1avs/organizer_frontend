export default class Messages {
  constructor(name, id, date, type, mediaBodies, server) {
    this.id = id;
    this.name = name;
    this.date = date;
    this.type = type;
    this.media_bodies = mediaBodies;
    this.server = server;
  }

  createElement() {
    const message = document.createElement('div');
    message.classList.add('message');
    message.dataset.id = this.id;
    message.innerHTML = `<div class="message_header"></div>
      <div class="message_body"></div>
      <div class="message_footer"></div>`;
    this.message_header = message.querySelector('.message_header');
    this.message_body = message.querySelector('.message_body');
    this.message_footer = message.querySelector('.message_footer');
    this.messageHeader();
    this.messageBody();
    this.messageFooter();
    return message;
  }

  messageHeader() {
    const tools = document.createElement('div');
    tools.classList.add('tools');
    tools.innerHTML = `<div class="message_header_img bin"></div>
    <div class="message_header_img pin"></div>
    <div class="message_header_img favorite_inactive"></div>`;
    this.message_header.append(tools);
  }

  messageBody() {
    switch (this.type) {
      case 'image':
        this.messageBodyImage();
        break;
      case 'file':
        this.messageBodyFile();
        break;
      case 'video':
        this.messageBodyVideo();
        break;
      case 'audio':
        this.messageBodyAudio();
        break;
      default: {
        const text = document.createElement('p');
        const chat = this.name.split(' ');
        chat.reduce((prev, current) => {
          if (/http[^ ]/.test(current)) {
            const link = document.createElement('a');
            link.href = new URL(current).href;
            link.setAttribute('target', '_blank');
            link.style.display = 'block';
            link.innerHTML = current;
            link.dataset.id = this.id;
            text.innerHTML += ` ${link.outerHTML}`;
            this.media_bodies.querySelector('[data-item="links"]').append(link.cloneNode(true));
          } else {
            text.innerHTML += ` ${current}`;
          }
        }, '');
        this.message_body.append(text);
      }
    }
  }

  messageBodyAudio() {
    const audio = document.createElement('audio');
    audio.classList.add('message_media');
    audio.setAttribute('controls', '');
    audio.src = `${this.server}${this.name}`;
    this.message_body.append(audio);
    this.message_body.dataset.id = this.id;
    this.media_bodies.querySelector('[data-item="audios"]').append(this.message_body.cloneNode(true));
  }

  messageBodyVideo() {
    const video = document.createElement('video');
    video.classList.add('message_media');
    video.setAttribute('controls', '');
    video.src = `${this.server}${this.name}`;
    this.message_body.append(video);
    this.message_body.dataset.id = this.id;
    this.media_bodies.querySelector('[data-item="videos"]').append(this.message_body.cloneNode(true));
  }

  messageBodyImage() {
    const image = document.createElement('img');
    image.classList.add('message_media');
    image.src = `${this.server}${this.name}`;
    image.innerHTML = this.name;
    this.message_body.append(image);
    this.message_body.dataset.id = this.id;
    this.media_bodies.querySelector('[data-item="images"]').append(this.message_body.cloneNode(true));
  }

  messageBodyFile() {
    const file = document.createElement('a');
    file.classList.add('message_file');
    file.href = `${this.server}${this.name}`;
    file.innerHTML = this.name;
    this.message_body.append(file);
    this.message_body.dataset.id = this.id;
    this.media_bodies.querySelector('[data-item="files"]').append(this.message_body.cloneNode(true));
  }

  messageFooter() {
    const date = document.createElement('span');
    date.classList.add('date');
    date.innerHTML = this.date;
    this.message_footer.append(date);
  }
}
