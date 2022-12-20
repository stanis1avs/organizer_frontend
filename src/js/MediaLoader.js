export default class MediaLoader {
  constructor(clip, chatInput, sending) {
    this.clip = clip;
    this.chat_input = chatInput;
    this.chat_footer = this.chat_input.parentElement;
    this.sending = sending;
  }

  start() {
    this.recorder.start();
    this.recordStatus();
  }

  stop() {
    this.recorder.stop();
    clearInterval(this.timerInterval);
    this.stream.getTracks().forEach((track) => track.stop());
    this.backfromMediaInterface();
  }

  recordStatus() {
    let timer = 0;
    this.status.innerText = `Recording ${timer} sec`;
    this.timerInterval = setInterval(() => {
      timer += 1;
      this.status.innerText = `Recording ${timer} sec`;
    }, 1000);
  }

  record(typeMedia) {
    return new Promise((resolve, reject) => {
      const navigatorDevices = { audio: true };
      this.blobType = 'audio/mpeg';
      if (typeMedia === 'video') {
        navigatorDevices.video = true;
        this.blobType = 'video/mp4';
      }
      if (navigator.mediaDevices) {
        navigator.mediaDevices.getUserMedia(navigatorDevices).catch(
          () => reject(new Error('Вы не предоставили доступ к запрашиваемым устройствам')),
        ).then(
          (stream) => {
            this.stream = stream;
            this.recorder = new MediaRecorder(this.stream);
            this.typeMedia = typeMedia;
            this.mediaInterface();
            this.chunks = [];
            this.recorder.addEventListener('dataavailable', (evt) => {
              this.chunks.push(evt.data);
            });
            this.recorder.addEventListener('stop', () => {
              resolve(new Blob(this.chunks, { type: this.blobType }));
            });
          },
        );
      } else {
        reject(new Error('Ваш браузер не записывает аудио'));
      }
    });
  }

  mediaInterface() {
    const icon = document.createElement('div');
    icon.classList.add(`${this.typeMedia}_icon`);
    this.clip.replaceWith(icon);

    this.status = document.createElement('div');
    this.status.classList.add('mediaRecord_status');
    this.status.innerText = `${this.typeMedia} waiting`;
    this.chat_input.replaceWith(this.status);

    const close = document.createElement('div');
    close.classList.add('close_mediaRecord');
    this.sending.replaceWith(close);
    close.addEventListener('click', () => this.backfromMediaInterface());

    const start = document.createElement('div');
    start.classList.add('mediaRecord_start');
    start.addEventListener('click', () => this.start());
    this.chat_footer.insertBefore(start, this.status);

    const stop = document.createElement('div');
    stop.classList.add('mediaRecord_stop');
    stop.addEventListener('click', () => this.stop());
    this.chat_footer.insertBefore(stop, close);
  }

  backfromMediaInterface() {
    this.chat_footer.querySelector('.close_mediaRecord').replaceWith(this.sending);
    this.chat_footer.querySelector('.mediaRecord_status').replaceWith(this.chat_input);
    this.chat_footer.querySelector(`.${this.typeMedia}_icon`).replaceWith(this.clip);
    this.chat_footer.querySelector('.mediaRecord_stop').remove();
    this.chat_footer.querySelector('.mediaRecord_start').remove();
  }
}
