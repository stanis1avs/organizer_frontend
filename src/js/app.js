import ChatUI from "./Chat";

const chat = new ChatUI(
  document.querySelector(".chat"),
  "http://localhost:7000/"
);
// const chat = new Chat(document.querySelector('.chat'), 'http://stanislavsus-organizer.herokuapp.com/');
// const chat = new Chat(document.querySelector('.chat'), 'https://organizer-sham.onrender.com/');
chat.init();
