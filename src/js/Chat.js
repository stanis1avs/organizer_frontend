import Message from './Message';
import MediaLoader from './MediaLoader';
import FileLoader from './FileLoader';
import Geo from './Geo';
import Request from './Request';

export default class Chat {
  constructor(element, server) {
    this.server = server;
    this.element = element;
    this.sidebar = this.element.querySelector('.sidebar');
    this.chat_footer = this.element.querySelector('.chat_footer');
    this.chat_body = this.element.querySelector('.chat_body');
    this.dropplace = this.element.querySelector('.dropplace');
    this.clip = this.element.querySelector('.clip');
    this.sending = this.element.querySelector('.sending');
    this.clip_body = this.element.querySelector('.clip_body');
    this.messages = this.element.querySelector('.messages');
    this.chat_input = this.element.querySelector('.chat_input');
    this.pin_mesg = this.element.querySelector('.pin_mesg');
    this.pin_content_body = this.element.querySelector('.pin_content_body');
    this.close_pin = this.element.querySelector('.close_pin');
    this.expand_pin = this.element.querySelector('.expand_pin');
    this.clip_geo = this.element.querySelector('.clip_geo');
    this.clip_file = this.element.querySelector('.clip_file');
    this.clip_audio = this.element.querySelector('.clip_audio');
    this.clip_video = this.element.querySelector('.clip_video');
    this.media = this.element.nextElementSibling;
    this.media_title = this.media.querySelector('.media_title');
    this.close_media = this.media.querySelector('.close_media');
    this.media_body = this.media.querySelector('.media_body');
    this.media_bodies = this.media.querySelector('.media_bodies');
    this.media_body_favorites = this.media.querySelector('.media_body_favorites');
    this.showMessage = this.showMessage.bind(this);
    this.pinAppend = this.pinAppend.bind(this);
    this.deleteMessage = this.deleteMessage.bind(this);
    this.favoriteAppend = this.favoriteAppend.bind(this);
    this.favoriteDelete = this.favoriteDelete.bind(this);
    this.renderMessages = this.renderMessages.bind(this);
    this.scrollBottom = this.scrollBottom.bind(this);
    this.lazyLoad = this.lazyLoad.bind(this);
    this.currentDate = new Date();
    this.messages.addEventListener('scroll', this.lazyLoad);
  }

  init() {
    /* ----------------------- Вложения ------------------------------ */

    this.sidebar.addEventListener('click', () => {
      this.media.classList.toggle('media_active');
    });

    this.media_body.addEventListener('click', (e) => {
      let item = e.target.parentElement;
      e.currentTarget !== e.target.parentElement ? null : item = e.target; // клик возможен на span
      this.media_title.textContent = item.textContent;
      this.media_body.classList.add('media_body_inactive');
      const dataValue = item.dataset.item;
      this.media_bodies.querySelector(`[data-item="${dataValue}"]`).classList.add('media_body_item_active');
    });

    this.media_bodies.addEventListener('DOMNodeInserted', (e) => {
      const atr = e.target.parentElement.dataset.item;
      const elemOnli = this.media_body.querySelector(`[data-item="${atr}"]`);
      let flag = false;
      if (this.media_title.innerText === elemOnli.innerText) {
        flag = true;
      }
      const badge = elemOnli.querySelector('span').textContent;
      elemOnli.querySelector('span').textContent = Number(badge) + 1;
      if (flag) {
        this.media_title.innerText = elemOnli.innerText;
      }
    });

    this.media_bodies.addEventListener('DOMNodeRemoved', (e) => {
      const atr = e.target.parentElement.dataset.item;
      const elemOnli = this.media_body.querySelector(`[data-item="${atr}"]`);
      let flag = false;
      if (this.media_title.innerText === elemOnli.innerText) {
        flag = true;
      }
      const badge = elemOnli.querySelector('span').textContent;
      elemOnli.querySelector('span').textContent = Number(badge) - 1;
      if (flag) {
        this.media_title.innerText = elemOnli.innerText;
      }
    });

    this.close_media.addEventListener('click', () => {
      if (this.media.querySelector('.media_body_item_active')) {
        this.media.querySelector('.media_body_item_active').classList.remove('media_body_item_active');
      } else {
        this.media.classList.remove('media_active');
      }
      this.media_title.textContent = 'Shared media';
      this.media_body.classList.remove('media_body_inactive');
    });

    /* ----------------------- Футер чата ------------------------------ */

    this.clip.addEventListener('click', () => {
      this.clip_body.classList.toggle('clip_active');
    });
    this.sending.addEventListener('click', () => this.send(this.chat_input.value));

    this.clip_geo.addEventListener('click', () => {
      if (this.chat_footer.querySelector('.geo_frame')) {
        this.chat_footer.querySelector('.geo_frame').remove();
      } else {
        this.geo();
      }
      this.clip_body.classList.remove('clip_active');
    });

    this.clip_file.addEventListener('click', () => this.attach());
    this.clip_audio.addEventListener('click', () => this.record('audio'));
    this.clip_video.addEventListener('click', () => this.record('video'));

    /* ----------------------- Закреп ------------------------------ */

    this.expand_pin.addEventListener('click', () => {
      if (this.pin_content_body.firstChild.style.height === '30px') {
        this.pin_content_body.firstChild.style.height = '100px';
        this.pin_content_body.style.height = '110px';
        this.expand_pin.style.transform = 'rotate(180deg)';
      } else {
        this.pin_content_body.style.height = '40px';
        this.pin_content_body.firstChild.style.height = '30px';
        this.expand_pin.style.transform = 'rotate(0deg)';
      }
    });
    this.close_pin.addEventListener('click', () => {
      this.pin_mesg.classList.remove('pin_mesg_active');
      this.pin_content_body.innerHTML = '';
      this.chat_body.style.flexDirection = 'column-reverse';
      this.pin_content_body.firstChild.style.height = '30px';
      this.expand_pin.style.transform = 'rotate(0deg)';
    });

    /* ----------------------- Соединение ------------------------------ */

    this.request = new Request(this.server);
    this.request.callbacks = {
      error: (() => { throw Error('Ошибка соединения'); }),
      load: this.renderMessages,
      showMessage: this.showMessage,
      showFile: this.showMessage,
      pinAppend: this.pinAppend,
      deleteMessage: this.deleteMessage,
      favoriteAppend: this.favoriteAppend,
      favoriteDelete: this.favoriteDelete,
    };
    this.request.init();
  }

  /* ----------------------- Считывание ------------------------------ */

  record(typeMedia) {
    this.clip_body.classList.remove('clip_active');
    const mediaLoader = new MediaLoader(this.clip, this.chat_input, this.sending);
    mediaLoader.record(typeMedia).then((blob) => this.send(blob)).catch((err) => alert(err));
  }

  attach() {
    this.clip_body.classList.remove('clip_active');
    const fileLoader = new FileLoader(this.element);
    fileLoader.getFile().then((file) => this.send(file));
  }

  send(elem) { // Формируется объект для отправки на сервер
    const infoMessg = {};
    if (elem instanceof Blob) {
      let extension = '';
      switch (elem.type) {
        case 'image/jpeg':
          infoMessg.type = 'image';
          break;
        case 'image/png':
          infoMessg.type = 'image';
          break;
        case 'video/mp4':
          infoMessg.type = 'video';
          extension = 'mp4';
          break;
        case 'audio/mpeg':
          infoMessg.type = 'audio';
          extension = 'mpeg';
          break;
        default:
          infoMessg.type = 'file';
      }
      infoMessg.body = elem;
      !elem.name ? infoMessg.name = `${this.currentDate.getTime()}.${extension}` : infoMessg.name = elem.name;
    } else if (elem.search(/\S/) !== -1) {
      infoMessg.type = 'text';
      infoMessg.body = elem;
    }
    if (this.chat_footer.querySelector('.geo_frame')) {
      infoMessg.geo = this.coordinates;
    }
    if (infoMessg.length !== 0) {
      !infoMessg.hasOwnProperty('geo') ? infoMessg.geo = '' : null;
      infoMessg.date = `${this.checkValue(this.currentDate.getDate())}:${this.checkValue(this.currentDate.getMonth() + 1)
      }:${this.currentDate.getFullYear()}, ${this.checkValue(this.currentDate.getHours())
      }:${this.checkValue(this.currentDate.getMinutes())}`;
      this.request.send('showMessage', infoMessg);
    }
    this.chat_input.value = '';
  }

  checkValue(value) {
    if (String(value).length === 1) {
      return `0${value}`;
    }
    return value;
  }

  pin(elem, id) {
    const pin = elem.querySelector('.pin');
    pin.addEventListener('click', () => {
      this.request.send('appendPin', { id });
    });
  }

  bin(elem, id) {
    const bin = elem.querySelector('.bin');
    bin.addEventListener('click', () => {
      this.request.send('deleteMessage', { id });
    });
  }

  favorite(elem, id) {
    const favorite = elem.querySelector('.favorite_inactive');
    const favoriteActive = document.createElement('div');
    favoriteActive.classList.add('message_header_img');
    favoriteActive.classList.add('favorite_active');

    favorite.addEventListener('click', () => {
      favorite.replaceWith(favoriteActive);
      favoriteActive.addEventListener('click', () => {
        favoriteActive.replaceWith(favorite);
        this.request.send('favoriteDelete', id);
      });
      this.request.send('favoriteAppend', id);
    });
  }

  /* ----------------------- Отображение ------------------------------ */

  geo() {
    const geo = new Geo();
    geo.getGeo().then((elem) => {
      this.chat_footer.append(elem);
      this.coordinates = elem.innerText;
    }).catch((err) => alert(err));
  }

  showMessage(id, body, date, geo, type = 'text', flag = false) {
    const message = new Message(body, id, date, type, this.media_bodies, this.server).createElement();
    geo ? message.querySelector('.message_body').append(new Geo().geoMessage(geo)) : 0;
    this.pin(message, id);
    this.favorite(message, id);
    this.bin(message, id);
    this.messages.append(message);
    this.scrollBottom(this.messages.lastChild);
    if (flag) {
      return this.messages.lastChild;
    }
  }

  pinAppend(id) {
    this.pin_content_body.innerHTML = '';
    this.chat_body.style.flexDirection = 'column';
    this.pin_mesg.classList.add('pin_mesg_active');
    const elem = this.messages.querySelector(`[data-id="${id}"]`);
    const body = elem.querySelector('.message_body').firstChild;
    this.pin_content_body.append(body.cloneNode(true));
  }

  deleteMessage(id) {
    this.messages.querySelector(`[data-id="${id}"]`).remove();
    if (this.media_bodies.querySelector(`[data-id="${id}"]`)) {
      this.media_bodies.querySelectorAll(`[data-id="${id}"]`).forEach((e) => e.remove());
    }
  }

  favoriteAppend(id) {
    const elem = this.messages.querySelector(`[data-id="${id}"]`);
    const body = elem.querySelector('.message_body').firstChild;
    const bodyCopy = body.cloneNode(true);
    bodyCopy.dataset.id = elem.dataset.id;
    this.media_body_favorites.append(bodyCopy);
  }

  favoriteDelete(id) {
    const elem = this.messages.querySelector(`[data-id="${id}"]`);
    const body = elem.querySelector('.message_body').firstChild;
    for (const node of this.media_body_favorites.childNodes) {
      if (node.innerHTML === body.innerHTML) {
        node.remove();
      }
    }
  }

  renderMessages(data, favorites, position) {
    const flag = true;
    for (const message of data) {
      const messageElement = this.showMessage(
        message.id,
        message.message,
        message.date,
        message.geo,
        message.type,
        flag,
      );

      if (favorites.indexOf(message.id) !== -1) {
        messageElement.querySelector('.favorite_inactive').click();
      }

      if (message.pinned) {
        messageElement.querySelector('.pin').click();
      }
      // Если первичная загрузка, то проматываем вниз после загрузки содержимого
      if (!this.databasePosition) {
        this.scrollBottom(messageElement);
      }
    }
    // Если "ленивая" подгрузка, то записываем сколько элементов ещё можно подгрузить сверху
    this.databasePosition = position;
    if (this.databasePosition > 0) {
      this.upperMessageElement = this.messages.querySelector('.message:nth-child(3)');
    }
  }

  scrollBottom(messageElement) {
    // Если содержимое - медийный элемент
    let checkLoad = messageElement.querySelector('.message_body video');
    if (!checkLoad) {
      checkLoad = messageElement.querySelector('.message_body audio');
    }

    if (checkLoad) {
      checkLoad.addEventListener('loadeddata', () => {
        this.messages.scrollTop = this.messages.scrollHeight
        - this.messages.getBoundingClientRect().height;
      });
    }

    // Если картинка
    checkLoad = messageElement.querySelector('.message_body img');
    if (checkLoad) {
      checkLoad.addEventListener('load', () => {
        this.messages.scrollTop = this.messages.scrollHeight
        - this.messages.getBoundingClientRect().height;
      });
    }
    // Или если текст
    this.messages.scrollTop = this.messages.scrollHeight
    - this.messages.getBoundingClientRect().height;
  }

  lazyLoad() {
    if (this.databasePosition <= 0) return;
    if (this.upperMessageElement && this.upperMessageElement.getBoundingClientRect().bottom > 0) {
      this.upperMessageElement = '';
      this.request.send('load', this.databasePosition);
    }
  }
}
