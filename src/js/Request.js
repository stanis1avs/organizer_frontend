export default class Request {
  constructor(server) {
    // Смена протокола сервера
    this.server = server;
    this.wsServer = this.server.replace(/^http/i, 'ws');

    // Первичное создание объектов
    this.data = { event: 'load' };
    this.callbacks = {};

    // Привязываем контекст
    this.onOpen = this.onOpen.bind(this);
    this.onMessage = this.onMessage.bind(this);
  }

  init() {
    this.ws = new WebSocket(this.wsServer);

    // При соединении запрашиваем первичные данные
    this.ws.addEventListener('open', this.onOpen);

    this.ws.addEventListener('message', this.onMessage);

    this.ws.addEventListener('error', this.callbacks.error);
    this.ws.addEventListener('close', this.callbacks.error);
  }

  // Открытие соединения
  onOpen() {
    this.ws.send(JSON.stringify(this.data));
  }

  // Получение сообщения
  onMessage(event) {
    const data = JSON.parse(event.data);
    // Ответ с базой сообщений
    if (data.event === 'load') {
      this.callbacks.load(data.dB, data.favorites, data.position);
    }
    // Успешная отправка текстового сообщения
    if (data.event === 'showMessage') {
      this.callbacks.showMessage(data.id, data.message, data.date, data.geo);
    }
    // Успешная отправка файла
    if (data.event === 'showFile') {
      this.callbacks.showMessage(data.id, data.message, data.date, data.geo, data.type);
    }

    // Успешное удаление сообщения
    if (data.event === 'deleteMessage') {
      this.callbacks.deleteMessage(data.id);
    }
    // Успешное добавление в избранное сообщения
    if (data.event === 'favoriteAppend') {
      this.callbacks.favoriteAppend(data.id);
    }
    // Успешное удаление сообщения из избранного
    if (data.event === 'favoriteDelete') {
      this.callbacks.favoriteDelete(data.id);
    }
    // Успешное добавление сообщения в закрепленное
    if (data.event === 'appendPin') {
      this.callbacks.pinAppend(data.id);
    }
  }

  // Отправка сообщения
  send(event, message) {
    if (this.ws.readyState === 1) {
      this.data = { event, message };
      if (message.type === 'text' || message.type == null) {
        this.ws.send(JSON.stringify(this.data));
      } else {
        const formData = new FormData();
        formData.append('date', message.date);
        formData.append('body', message.body);
        formData.append('type', message.type);
        formData.append('name', message.name);
        formData.append('geo', message.geo);
        this.sendFile(formData);
      }
    } else {
      this.callbacks.error();
    }
  }

  // Отправка файла
  sendFile(formData) {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${this.server}upload`);
    xhr.addEventListener('error', () => this.callbacks.error());
    xhr.send(formData);
  }
}
