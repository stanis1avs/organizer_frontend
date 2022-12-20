# organizer_frontend

Реализован диплом блока [«Продвинутый JavaScript в браузере» от Нетологии](https://github.com/netology-code/ahj-diploma).
Диплом представляет собой чат органайзер на основе прототипов популярных мессенджеров, таких как Telegram, Whatsapp.

Время работы над дипломом 03.22 - 04.22

[![Build status](https://ci.appveyor.com/api/projects/status/7h7rk7ht9pm42jym?svg=true)](https://ci.appveyor.com/project/Stanislavsus-prj/organizer-frontend)

[gh-pages](https://stanislavsus-prj.github.io/organizer_frontend/) 
[backend](https://github.com/Stanislavsus-prj/organizer_backend) 

![f](https://github.com/Stanislavsus-prj/organizer_frontend/blob/main/readme_files/start.jpg?raw=true)
![f](https://github.com/Stanislavsus-prj/organizer_frontend/blob/main/readme_files/sidebar.jpg?raw=true)
![f](https://github.com/Stanislavsus-prj/organizer_frontend/blob/main/readme_files/sidebar_body.jpg?raw=true)

## Функционал
Функциональность приложения поделена Нетологией на две категории - обязательная и дополнительная 

Обязательные для реализации функции:
- Сохранение в истории ссылок и текстовых сообщений
- Ссылки (то, что начинается с ```http://``` или ```https://```) должны быть кликабельны и отображаться как ссылки
- Сохранение в истории изображений, видео и аудио (как файлов) - через Drag & Drop и через иконку загрузки (скрепка в большинстве мессенджеров)
![f](https://github.com/Stanislavsus-prj/organizer_frontend/blob/main/readme_files/file.jpg?raw=true)
- Скачивание файлов (на компьютер пользователя)
- Ленивая подгрузка: сначала подгружаются последние 10 сообщений, при прокрутке вверх подгружаются следующие 10 и т.д.

Дополнительные для реализации функции:
- Синхронизация - если приложение открыто в нескольких окнах (вкладках), то контент должен быть синхронизирован
- Запись видео и аудио (используя API браузера)
![f](https://github.com/Stanislavsus-prj/organizer_frontend/blob/main/readme_files/video.jpg?raw=true)
- Отправка геолокации
- Воспроизведение видео/аудио (используя API браузера)
- Добавление сообщения в избранное (тогда должен быть интерфейс для просмотра избранного)
- Просмотр вложений по категориям, например: аудио, видео, изображения, другие файлы (см. боковую меню Telegram)

## Техническое оформление

Для фронтенда используется: Webpack, Babel, ESLint и Appveyor для развёртывания.

Для бэкенда используется: WS, Koa, и Heroku для развёртывания.

Клиентская часть  выложена на GitHub Pages

Все данные на сервере хранятся в памяти в виде массивов и контейров
