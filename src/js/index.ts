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

enum SpriteLooks {
  'Right' = 0,
  'Down' = 270,
  'Left' = 180,
  'Up' = 90,
}

class GameObject {
  element: HTMLDivElement;
  game: Game;
  width: number;
  height: number;
  x: number = 0;
  y: number = 0;
  spriteLooks: SpriteLooks = SpriteLooks.Right;

  constructor(gameObjectParams: GameObjectParams) {
    this.game = gameObjectParams.game;
    this.element = document.createElement('div');
    this.element.style.width = (this.width = gameObjectParams.width) + 'px';
    this.element.style.height = (this.height = gameObjectParams.height) + 'px';
    this.element.style.transformOrigin = '50% 50%';
    this.element.style.position = 'absolute';
    this.game.element.appendChild(this.element);

    this.setPosition(gameObjectParams.x || this.x, gameObjectParams.y || this.y);
  }

  setPosition(x: number, y: number) {
    this.x = x;
    this.y = y;

    this.element.style.left = (this.x - this.width / 2) + 'px';
    this.element.style.top = (this.y - this.height / 2) + 'px';
  }

  lookOn(x: number, y: number) {
    const diffX = this.x - x;
    const diffY = this.y - y;
    let atan = Math.atan(diffY / diffX) * 180 / Math.PI;

    if(diffY >= 0 && diffX >= 0) {
      atan += 180;
    }
    else if(diffY <= 0 && diffX >= 0) {
      atan -= 180;
    }

    atan += this.spriteLooks;

    this.element.style.transform = `rotate(${atan}deg)`;
  }
}

class DynamicGameObject extends GameObject{
  constructor(props) {
    super(props);
    this.game.onTick(this.onTick.bind(this));
  }

  onTick() {};
}

class Skeleton extends DynamicGameObject{
  constructor(gameObjectParams: GameObjectParams) {
    super(gameObjectParams);

    this.element.style.background = `url(data:image/png;base64,${getArcherImageBase64()})`;
    this.spriteLooks = SpriteLooks.Down;
  }

  onTick() {
    console.log(Date.now(), 'Date.now()');
  }
}

class Archer extends DynamicGameObject {
  private previousMousemoveEvent: MouseEvent;

  constructor(gameObjectParams: GameObjectParams) {
    super(gameObjectParams);

    document.addEventListener('mousemove', (e) => this.previousMousemoveEvent = e);

    this.element.style.background = `url(data:image/png;base64,${getArcherImageBase64()})`;
    this.spriteLooks = SpriteLooks.Down;
  }

  onTick() {
    if (this.previousMousemoveEvent) this.lookOn(this.previousMousemoveEvent.clientX, this.previousMousemoveEvent.clientY);
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

  private tickSubscriptions: any[] = [];

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

    this.startTicking();
  }

  public onTick(cb: () => void): void {
    this.tickSubscriptions.push(cb);
  }

  private startTicking() {
    setInterval(() => this.tickSubscriptions.forEach(cb => cb()), 30);
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

function getArcherImageBase64() {
  return 'iVBORw0KGgoAAAANSUhEUgAAABkAAAAWCAYAAAA1vze2AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsQAAA7EAZUrDhsAAAAGYktHRAD/AP8A/6C9p5MAAAAZdEVYdFNvZnR3YXJlAEFkb2JlIEltYWdlUmVhZHlxyWU8AAAAEnRFWHRFWElGOk9yaWVudGF0aW9uADGEWOzvAAAEzElEQVRIS52Va0yTVxjH/23flt4oFChYBCagLRenbIqKiGC84BYv4KbT6czM+GCWiGzOyBaj+yIbI37ptgQTt08by5YpczjnotuA4TIBa9SJIKIVpYZbQGzL25b22XlfXwfMQhZ/X077nnOe/3ku5zkyYuB/4vP7YW9txdWrV9Bz/z7S0tKRX7AC1Z/aUH74MLQajbRyMtOK9PX14fq1K/jcZsMvZ84CKg5cmBJhajX8CII8HkQaYxAcfgS5Ro3bzgfSzsmEFHm/vByfVFYijhkb4XnoIrTQzE5EwNGLaJUKfGAM3thI6JJj4bx6ByofITjihiEmBrccDsnKOHJpnMRPp0/DZDLBGh8Pizke6rRZMCiUUAaCCMhk0HBKaD1+mEcVMCbHQaFXI0ynx+Dduzh3/rxkZZynRDo6OnD7+nVEabXo8Yxg1OeFQqnAMosVSoUcvNcLfmwMco8PvEkDY68bqTxQyfJy8OhRzIiLkyyN85SI1WrF2/v34+HQEOQqHcbCdfDeG8SvD7uh4FQozFuMzyoPst8yPLJ3IpXTY8T1CBEGA0pLS2GxWCRL44TMicvtxvZt23DpwgUotDqoWB6GOB8iR0ZRsjIPQ0olvqw7B87ng8XETs48i0pPR+1ZVhwhCJkTvU6HhIQExMdG44ztQ6SaYxAYfIiiHbtwmYXGpTYie9ESpGTOg4/3QM5x+JMdyMfEQiJ48l/6BwYE72hmtJGqykqo7PUiyl26jFpbL1Fffz91d3dTPxtbWlpobWEhzU5JoRfmzqW6ujpxPyt92rtnDzU2Nor/ucdSk+nr7cXOrVuRv6YQDb+dB+cexVBvN+rr66FUcjCw+FMwCGNUFPqcTgRHR8Ex7ysrKqBncy/n52Ptxo2Yn5WFIFsX0hOv10s9PT0UCATonXf30bzkWEqN1tAfTRfY/fPQ8PCwODq671GcXk+L0tPp+aQkysnOJn8gSAsts8lmsxHP86K9kCJPKD9wgAZY6GpP/UiLFyygY9XV0sxjXsyYQ3Ofm0VzZsygvNxc+vtGO61bs4re2vkGtXd0SKumEREEHA4HuVwu8vv91ON0UmZamjh34puv6FDpbnpt5QJKMs9k3r5HF1vstGvLaqqp+ZputLf/64VASJGPKirIbreLYZlIU1ODWBBbCnJooOEEfbynhHKsUbR5XQFlmGVUXX2MnM4HYpgn8tQ9qT15EgqFAssLChAZESF9BTy8HzlpEVAarEhPMiEl3oRBVRTams9iyBXAm7v3YdWqFcjMyJB2TIBln6qqqmhJ9kIy6zT0/YmTxFq6eIKJlOzYQIkGDR36oIw2rN9ANd9+R/bLl+mvi81U+8MpMbRCWEMhEyZYpeBiczNeWr0ar6xfh6LNWxDOvLjT1Yl7XZfg592o+/l3WDKzsHTxQiSkzocxIhwbizcJ4RbfmTDWFaZCJnjCYsg6wxhYRaCpqQk329pw91aneE9y8/LZKhna264hOTkViYlJiJ9pxnZ2j/KWL8fesjLJ1NRMyokgJnjFKgputwdarQbh4eFQs3dFmJPL5WIfE3i1uJi9YRwOHzkCa4imOAlB5Fm42dlJm4qK6Ivjx6UvUzPt8zsdQrvo6uoSvc5i7UPGQjoVzyzyhCdhnFoE+AdhooDSXIO82QAAAABJRU5ErkJggg==';
}