interface GameParams {
  gameWindowWidth: number;
  gameWindowHeight: number;
}

interface GameObjectParams {
  game: Game;
  width: number;
  height: number;
  x?: number;
  y?: number;
}

class GameObject {
  element: HTMLDivElement;
  game: Game;
  width: number;
  height: number;
  x: number = 0;
  y: number = 0;

  constructor(gameObjectParams: GameObjectParams) {
    this.game = gameObjectParams.game;
    this.element = document.createElement('div');
    this.element.style.width = (this.width = gameObjectParams.width) + 'px';
    this.element.style.height = (this.height = gameObjectParams.height) + 'px';
    this.element.style.transformOrigin = '50% 50%';
    this.element.style.position = 'absolute';
    this.game.element.appendChild(this.element);

    this.setPosition(gameObjectParams.x || this.x, gameObjectParams.y || this.y)
  }

  setPosition(x: number, y: number) {
    this.x = x;
    this.y = y;

    this.element.style.left = (this.x - this.width / 2) + 'px';
    this.element.style.bottom = (this.y - this.height / 2) + 'px';
  }
}

class Archer extends GameObject{
  constructor(gameObjectParams: GameObjectParams) {
    super(gameObjectParams);

    this.element.style.background = `white`;
  }
}

class Floor extends GameObject{
  constructor(gameObjectParams: GameObjectParams) {
    super(gameObjectParams);

    this.element.style.zIndex = '-1';
    this.element.style.background = `url(data:image/gif;base64,${getGrassImageBase64()})`;
  }
}

class Game {
  element: HTMLElement = document.body;
  gameWindowWidth: number;
  gameWindowHeight: number;

  gameObjects: GameObject[] = [];

  constructor(gameParams: GameParams) {
    this.element.innerHTML = '';
    this.element.style.position = 'relative';
    this.element.style.width = (this.gameWindowWidth = gameParams.gameWindowWidth) + 'px';
    this.element.style.height = (this.gameWindowHeight = gameParams.gameWindowHeight) + 'px';
    this.addGameObject(new Floor({
      game: this,
      width: this.gameWindowWidth,
      height: this.gameWindowHeight,
      x: this.gameWindowWidth / 2,
      y: this.gameWindowHeight / 2,
    }));
    this.addGameObject(new Archer({
      game: this,
      width: 25,
      height: 22,
      x: this.gameWindowWidth / 2,
      y: this.gameWindowHeight / 2,
    }));
  }

  private addGameObject(gameObject: GameObject) {
    this.gameObjects.push(gameObject);
  }
}

new Game({
  gameWindowWidth: 400,
  gameWindowHeight: 400,
});

function getGrassImageBase64() {
  return '/9j/4AAQSkZJRgABAQEASABIAAD/4QAiRXhpZgAATU0AKgAAAAgAAQESAAMAAAABAAEAAAAAAAD/2wBDAAIBAQIBAQICAgICAgICAwUDAwMDAwYEBAMFBwYHBwcGBwcICQsJCAgKCAcHCg0KCgsMDAwMBwkODw0MDgsMDAz/2wBDAQICAgMDAwYDAwYMCAcIDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAz/wAARCAAPAA8DASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwClaiSO0WSGFluIdkaO/Ee4qflB5U4YxncT27iru640uWRUmt5YsbgJrgKhOcE5ZuTyDyMEMMYxUawSW93JI0a/aIwsRhwOr7ZCSM7T1HRgSfbNOtIFsUWaEqscYW3XCFCoKKwbg9wFBGM5Y9ea/kR3ufL8zi7L+u5//9k=';
}