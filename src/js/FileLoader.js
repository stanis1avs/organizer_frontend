export default class FileLoader {
  constructor(element) {
    this.element = element;
    this.dropplace = this.element.querySelector('.dropplace');
    this.chat_footer = this.element.querySelector('.chat_footer');
    this.clip = this.element.querySelector('.clip');
    this.chat_input = this.element.querySelector('.chat_input');
    this.sending = this.element.querySelector('.sending');

    this.getFile = this.getFile.bind(this);
    this.fileInterface = this.fileInterface.bind(this);
    this.dragoverVisible = this.dragoverVisible.bind(this);
    this.dragoverHidden = this.dragoverHidden.bind(this);
    this.backfromFileInterface = this.backfromFileInterface.bind(this);
  }

  init() {
    this.element.addEventListener('dragover', this.dragoverVisible);
    this.dropplace.addEventListener('dragleave', this.dragoverHidden);
    this.fileInterface();
  }

  fileInterface() {
    const close = document.createElement('div');
    close.classList.add('close_file');
    this.sending.replaceWith(close);
    close.addEventListener('click', () => this.backfromFileInterface());

    const file = document.createElement('div');
    file.classList.add('icon_file');
    this.clip.replaceWith(file);

    this.input_file = document.createElement('input');
    this.input_file.classList.add('input_file');
    this.input_file.type = 'file';
    this.chat_input.replaceWith(this.input_file);
  }

  getFile() {
    return new Promise((resolve) => {
      this.init();
      this.dropplace.addEventListener('drop', (event) => {
        this.dragoverHidden();
        this.backfromFileInterface();
        resolve(event.dataTransfer.files[0]);
      });

      this.input_file.addEventListener('change', (e) => {
        e.preventDefault();
        this.backfromFileInterface();
        resolve(this.input_file.files[0]);
      });
    });
  }

  dragoverVisible(event) {
    event.preventDefault();
    this.dropplace.style.visibility = 'visible';
  }

  dragoverHidden(event) {
    event.preventDefault();
    this.dropplace.style.visibility = 'hidden';
  }

  backfromFileInterface() {
    if (this.chat_footer.querySelector('.close_file') != null) {
      this.chat_footer.querySelector('.close_file').replaceWith(this.sending);
    }
    if (this.chat_footer.querySelector('.input_file') != null) {
      this.chat_footer.querySelector('.input_file').replaceWith(this.chat_input);
    }
    if (this.chat_footer.querySelector('.icon_file') != null) {
      this.chat_footer.querySelector('.icon_file').replaceWith(this.clip);
    }
    this.element.removeEventListener('dragover', this.dragoverVisible);
    this.dropplace.removeEventListener('dragleave', this.dragoverHidden);
  }
}
