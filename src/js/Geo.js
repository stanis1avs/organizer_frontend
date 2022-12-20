export default class Geo {
  getGeo() {
    return new Promise((resolve, reject) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
          this.geoInterface();
          this.geo.innerText = `${(position.coords.latitude).toFixed(6)}, ${(position.coords.longitude).toFixed(6)}`;
          resolve(this.geo);
        }, () => reject(new Error('Вы не предоставили доступ к координатам')));
      } else {
        reject(new Error('Ваш браузер не определяет координаты'));
      }
    });
  }

  geoInterface() {
    this.geo = document.createElement('div');
    this.geo.classList.add('geo_frame');
    this.geo.classList.add('geo');
  }

  geoMessage(geo) {
    const cordinates = document.createElement('a');
    cordinates.classList.add('geo_mesg');
    cordinates.classList.add('geo');
    cordinates.innerText = geo;
    cordinates.setAttribute('href', `https://yandex.ru/maps/?text=${cordinates.innerText}`);
    cordinates.setAttribute('target', '_blank');
    return cordinates;
  }
}
