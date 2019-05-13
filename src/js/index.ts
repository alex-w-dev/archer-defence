interface GameParams {
  gameWindowWidth: number;
  gameWindowHeight: number;
  window?: Window;
}

type IOnTickFunction = (delta: number) => void;

interface IEnemyDefinition {
  image: string;
  spriteLooks: SpriteLooks;
  size: {
    width: number,
    height: number,
  };
  bullet: typeof Bullet;
  attackRanges: [number, number, number];
  attackSpeeds: [number, number, number];
  speeds: [number, number, number];
}

interface IEnemyParams extends IEnemyDefinition{
  attackRange: number,
  attackSpeed: number,
  speed: number,
  difficultIndex: number, // for shadow color
}

enum SpriteLooks {
  'Right' = 0,
  'Down' = 270,
  'Left' = 180,
  'Up' = 90,
}
enum MoveDirections {
  'Right' = 0,
  'Down' = 90,
  'Left' = 180,
  'Up' = 270,
}

class GameObject {
  element: HTMLDivElement;
  game: Game;
  width: number;
  height: number;
  x: number;
  y: number;
  spriteLooks: SpriteLooks;

  protected destroyed: boolean = false;

  constructor() {
    this.init();
  }

  init() {
    this.element = document.createElement('div');
    this.spriteLooks = SpriteLooks.Right;
    this.element.style.transformOrigin = '50% 50%';
    this.element.style.position = 'absolute';
    this.setSize(0, 0);
    this.setPosition(0, 0);
  }

  destroy() {
    if (this.destroyed) throw new Error('Is destroyed now');

    this.destroyed = true;
    if (this.game) {
      this.game.element.removeChild(this.element);
    }
  }

  addToGame(game: Game) {
    this.game = game;

    this.game.element.appendChild(
      this.element
    );
  }

  setSize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.element.style.width = this.width + 'px';
    this.element.style.height = this.height + 'px';
    this.element.style.marginLeft = '-' + this.width / 2  + 'px';
    this.element.style.marginTop = '-' + this.height / 2  + 'px';
  }

  setPosition(x: number, y: number) {
    this.x = x;
    this.y = y;

    this.element.style.left = this.x + 'px';
    this.element.style.top = this.y + 'px';
  }
}

class DynamicGameObject extends GameObject{
  speed: number;
  lastAttackTime: number;
  moveAngle: number;

  protected bindOnTick: IOnTickFunction;

  init() {
    callSuperMethod(this, 'init', GameObject);

    this.speed = 1;
    this.lastAttackTime = Date.now();
  }

  destroy() {
    callSuperMethod(this, 'destroy', GameObject);

    if (this.bindOnTick) {
      this.game.tickUnsubscribe(this.bindOnTick);
    }
  }

  addToGame(game: Game) {
    callSuperMethod(this, 'addToGame', GameObject, game);

    this.bindOnTick = this.onTick.bind(this);
    this.game.tickSubscribe(this.bindOnTick);
  }

  onTick(delta) {};

  lookOn(x: number, y: number) {
    const lookAngle = this.getAngleToTarget(x, y) + this.spriteLooks;

    this.element.style.transform = 'rotate('+lookAngle+'deg)';
  }

  stepTo(x: number, y: number, delta) {
    this.setMoveDirection(x, y);
    this.stepByMoveAngle(delta);
  }

  setMoveDirection(x: number, y: number) {
    this.moveAngle = this.getAngleToTarget(x, y);
  }

  stepByMoveAngle(delta: number) {
    this.setPosition(
      this.x += Math.cos(this.moveAngle / 180 * Math.PI) * this.speed * delta,
      this.y += Math.sin(this.moveAngle / 180 * Math.PI) * this.speed * delta,
    );
  }

  protected getAngleToTarget(x: number, y: number): number {
    const diffX = this.x - x;
    const diffY = this.y - y;
    let angle = Math.atan(diffY / diffX) * 180 / Math.PI;

    if(diffY >= 0 && diffX >= 0) {
      angle += 180;
    }
    else if(diffY <= 0 && diffX >= 0) {
      angle -= 180;
    }

    return angle;
  }
}

class Bullet extends DynamicGameObject {
  init() {
    callSuperMethod(this, 'init', DynamicGameObject);

    this.element.style.background = 'url(data:image/png;base64,'+getArrowImageBase64()+')';
    this.spriteLooks = SpriteLooks.Left;
    this.setSize(20, 4);
  }

  onTick(delta) {
    this.stepByMoveAngle(delta);

    if (this.x < 0 || this.x > this.game.floor.width || this.y < 0 || this.y > this.game.floor.height) {
      this.destroy();
    }
  };
}

class ArchersBullet extends Bullet {
  init() {
    callSuperMethod(this, 'init', Bullet);

    this.speed = 3;
  }

  onTick(delta) {
    callSuperMethod(this, 'onTick', Bullet, delta);

    this.checkEnemiesCollision();
  }

  checkEnemiesCollision() {
    this.game.enemies.forEach(enemy => {
      if (detectCollision(this, enemy)) {
        this.destroy();
        enemy.destroy();
      }
    });
  }
}

class EnemiesArrow extends Bullet {
  onTick(delta) {
    callSuperMethod(this, 'onTick', Bullet, delta);

    if (detectCollision(this, this.game.archer)) {
      this.game.gameOver();
    }
  }
}
class EnemiesFireBall extends EnemiesArrow {
  init() {
    callSuperMethod(this, 'init', EnemiesArrow);

    this.element.style.background = 'url(data:image/png;base64,'+getFireBallImageBase64()+')';
    this.spriteLooks = SpriteLooks.Left;
    this.setSize(6, 6);
  }

}

class SkeletonsSword extends EnemiesArrow {
  tickTime: number;

  init() {
    callSuperMethod(this, 'init', EnemiesArrow);

    this.speed = 10;
    this.tickTime = 5;
  }


  onTick(delta) {
    callSuperMethod(this, 'onTick', EnemiesArrow, delta);

    if(!--this.tickTime) {
      this.destroy();
    }
  }
}

class Fighter extends DynamicGameObject{
  attackSpeed: number;
  bullet: typeof Bullet;

  init() {
    callSuperMethod(this, 'init', DynamicGameObject);

    this.attackSpeed = 1;
  }

  attackTo(x: number, y: number) {
    this.lookOn(x, y);

    const now = Date.now();
    if (this.lastAttackTime + 1000 / this.attackSpeed < now) {
      const bullet = new this.bullet();

      bullet.setPosition(this.x, this.y);
      bullet.lookOn(x, y);
      bullet.setMoveDirection(x, y);
      bullet.addToGame(this.game);

      this.lastAttackTime = now;
    }
  }
}

class Enemy extends Fighter{
  attackRange: number;
  bullet: typeof Bullet;

  init() {
    callSuperMethod(this, 'init', Fighter);

    this.attackRange = 20;
    this.bullet = EnemiesArrow;
  }

  applyParams(enemyParams: IEnemyParams) {
    this.element.style.background = 'url(data:image/png;base64,'+enemyParams.image+')';
    this.spriteLooks = enemyParams.spriteLooks;
    this.setSize(enemyParams.size.width, enemyParams.size.height);
    this.attackRange = enemyParams.attackRange;
    this.attackSpeed = enemyParams.attackSpeed;
    this.speed = enemyParams.speed;
    this.bullet = enemyParams.bullet;

    if (enemyParams.difficultIndex === 1) {
      this.element.style.boxShadow = '0px 0px 10px -1px blue';
    }
    if (enemyParams.difficultIndex === 2) {
      this.element.style.boxShadow = '0px 0px 10px -1px red';
    }
  }


  destroy() {
    callSuperMethod(this, 'destroy', Fighter);

    if (this.game) {
      this.game.addScore();
      this.game.enemies.delete(this);
    }
  }

  addToGame(game: Game) {
    callSuperMethod(this, 'addToGame', Fighter, game);

    this.game.enemies.add(this);
  }

  onTick(delta) {
    if (this.canAttackArcher()) {
      this.attackTo(this.game.archer.x, this.game.archer.y);
    } else {
      this.lookOn(this.game.archer.x, this.game.archer.y);
      this.stepTo(this.game.archer.x, this.game.archer.y, delta);
    }
  }

  canAttackArcher(): boolean {
    const diffX = this.x - this.game.archer.x;
    const diffY = this.y - this.game.archer.y;

    return Math.sqrt( diffX * diffX + diffY * diffY ) <= this.attackRange;
  }
}

class Archer extends Fighter {
  bullet: typeof Bullet;
  attackSpeed: number;
  moveDirections: Set<MoveDirections>;

  private previousMousemoveEvent: MouseEvent;
  private isMouseDown: boolean = false;

  init() {
    callSuperMethod(this, 'init', Fighter);

    this.bullet = ArchersBullet;
    this.attackSpeed = 2;
    this.moveDirections = new Set();

    this.element.style.background = 'url(data:image/png;base64,'+getArcherImageBase64()+')';
    this.spriteLooks = SpriteLooks.Down;
    this.setSize(25, 22);
  }

  addToGame(game: Game) {
    callSuperMethod(this, 'addToGame', Fighter, game);

    this.game.window.addEventListener('mousemove', (e) => {
      this.previousMousemoveEvent = e;
    });
    this.game.window.addEventListener('mousedown', (e) => {
      this.isMouseDown = true;
    });
    this.game.window.addEventListener('mouseup', (e) => {
      this.isMouseDown = false;
    });
    this.game.window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.repeat) return;

      const moveDirection = this.getMoveDirection(e);
      if (moveDirection !== null) this.moveDirections.add(moveDirection);
    });
    this.game.window.addEventListener('keyup', (e: KeyboardEvent) => {
      if (e.repeat) return;

      const moveDirection = this.getMoveDirection(e);
      if (moveDirection !== null) this.moveDirections.delete(moveDirection);
    });
  }

  onTick(delta) {
    if (this.previousMousemoveEvent) {
      this.lookOn(this.previousMousemoveEvent.clientX, this.previousMousemoveEvent.clientY);

      if (this.isMouseDown) {
        this.attackTo(this.previousMousemoveEvent.clientX, this.previousMousemoveEvent.clientY);
      }
    }

    if (this.moveDirections.size) {
      const moveDirections = Array.from(this.moveDirections);
      if (moveDirections[1] === undefined) moveDirections[1] = moveDirections[0];

      let summ = moveDirections[0] + moveDirections[1];
      if (Math.abs(moveDirections[0] - moveDirections[1]) > 180)  summ += 360;

      this.moveAngle = summ / 2;

      this.stepByMoveAngle(delta)
    }
  }

  private getMoveDirection(e: KeyboardEvent): MoveDirections {
    if (['s', 'ArrowDown'].includes(e.key)) {
      return MoveDirections.Down;
    } else if (['w', 'ArrowUp'].includes(e.key)) {
      return MoveDirections.Up;
    } else if (['a', 'ArrowLeft'].includes(e.key)) {
      return MoveDirections.Left;
    } else if (['d', 'ArrowRight'].includes(e.key)) {
      return MoveDirections.Right;
    }

    return null;
  }
}

class Floor extends GameObject{
  init() {
    callSuperMethod(this, 'init', GameObject);

    this.element.style.zIndex = '0';
    this.element.style.background = 'url(data:image/gif;base64,'+getGrassImageBase64()+')';
  }
}

class GameInterface {
  game: Game;
  element: HTMLDivElement;
  enemiesLeftCounterElement: HTMLSpanElement;
  levelCounterElement: HTMLSpanElement;

  constructor(game: Game) {
    this.game = game;

    this.element = document.createElement('div');
    this.enemiesLeftCounterElement = document.createElement('span');
    this.levelCounterElement = document.createElement('span');

    this.element.style.position = 'absolute';
    this.element.style.zIndex = '2';
    this.element.style.left = '5px';
    this.element.style.top = '5px';
    this.element.style.color = 'white';

    const enemiesLeftContainer = document.createElement('div');
    enemiesLeftContainer.innerText = 'Enemies Left: ';
    enemiesLeftContainer.appendChild(this.enemiesLeftCounterElement);
    this.element.appendChild(enemiesLeftContainer);

    const levelContainer = document.createElement('div');
    levelContainer.innerText = 'Level: ';
    levelContainer.appendChild(this.levelCounterElement);
    this.element.appendChild(levelContainer);

    this.game.element.appendChild(this.element);
  }

  drawLevel(level: number) {
    this.levelCounterElement.innerText = level.toString();
  }
  drawEnemiesLeft(enemiesLeft: number) {
    this.enemiesLeftCounterElement.innerText = enemiesLeft.toString();
  }

}

class Game {
  totalEnemies: number = 143;
  level: number = 1;
  score: number = 0;
  enemiesLeft: number = this.totalEnemies;
  element: HTMLElement;
  window: Window;
  interface: GameInterface;
  gameWindowWidth: number;
  gameWindowHeight: number;

  enemies: Set<Enemy> = new Set<Enemy>();
  archer: Archer;
  floor: Floor;
  isGamePlay: boolean = true;

  private tickSubscriptions: Set<IOnTickFunction> = new Set<IOnTickFunction>();
  private prevTickTime: number = Date.now();
  private tickingInterval: any;
  private lastTimeOfEnemyGeneration: number = Date.now();

  constructor(gameParams: GameParams) {
    this.window = gameParams.window || window;
    this.element = this.window.document.body;
    this.element.innerHTML = '';
    this.element.style.userSelect = this.element.style.msUserSelect = this.element.style.webkitUserSelect = 'none';
    this.element.style.position = 'relative';
    this.element.style.background = '#d5d2ff';
    this.element.style.width = (this.gameWindowWidth = gameParams.gameWindowWidth) + 'px';
    this.element.style.height = (this.gameWindowHeight = gameParams.gameWindowHeight) + 'px';
    this.floor = new Floor();
    this.floor.setPosition(this.gameWindowWidth / 2, this.gameWindowHeight / 2);
    this.floor.setSize(this.gameWindowWidth, this.gameWindowHeight);
    this.floor.addToGame(this);
    this.archer = new Archer();
    this.archer.setPosition(this.gameWindowWidth / 2, this.gameWindowHeight / 2);
    this.archer.addToGame(this);

    this.interface = new GameInterface(this);
    this.interface.drawLevel(this.level);
    this.interface.drawEnemiesLeft(this.enemiesLeft);

    this.startTicking();
  }

  public gameWin(): void {
    this.window.alert('Congratulation! You Won!');

    this.destroy();
  }

  public gameOver(): void {
    this.window.alert('Game Over');

    this.destroy();
  }

  public destroy(): void {
    this.isGamePlay = false;

    clearInterval(this.tickingInterval);
    this.tickingInterval = null;
  }

  public tickSubscribe(cb: IOnTickFunction): void {
    this.tickSubscriptions.add(cb);
  }

  public tickUnsubscribe(cb: IOnTickFunction): void {
    this.tickSubscriptions.delete(cb);
  }

  public addScore() {
    ++this.score;

    this.level = Math.min(Math.max(Math.floor(Math.sqrt(this.score)), 1), 10);

    this.interface.drawLevel(this.level);
  }

  private generateRandomEnemy() {
    const now = Date.now();

    if (now < this.lastTimeOfEnemyGeneration + 1000 || !this.enemiesLeft) return;

    this.enemiesLeft--;
    this.interface.drawEnemiesLeft(this.enemiesLeft);

    this.lastTimeOfEnemyGeneration = now;

    const difficultIndex = Math.min(2, random(0, Math.floor(this.level / 4)));
    const enemyIndex = Math.min(2, random(0, Math.min(this.level - 1, 2)));

    const enemyDefinition = Object.assign({}, ENEMIES[enemyIndex]);

    const enemy = new Enemy();
    enemy.applyParams(Object.assign(
      enemyDefinition,
      {
        attackRange: enemyDefinition.attackRanges[difficultIndex],
        attackSpeed: enemyDefinition.attackSpeeds[difficultIndex],
        speed: enemyDefinition.speeds[difficultIndex],
        difficultIndex: difficultIndex,
      }
    ));

    if (random(0, 1)) {
      enemy.setPosition(random(0, this.gameWindowWidth), random(0, 1) * this.gameWindowHeight);
    } else {
      enemy.setPosition(random(0, 1) * this.gameWindowWidth, random(0, this.gameWindowHeight));
    }

    enemy.addToGame(this);
  }

  private startTicking() {
    this.tickingInterval = setInterval(() => {
      if (this.score === this.totalEnemies) {
        return this.gameWin()
      }

      this.generateRandomEnemy();

      const now = Date.now();
      const delta = now - this.prevTickTime;
      this.tickSubscriptions.forEach(cb => {
        if (this.isGamePlay) {
          cb(delta / (1000 / 30))
        }
      });
      this.prevTickTime = now;
    }, 30);
  }
}

const ENEMIES: Array<IEnemyDefinition> = [
  {
    image: getSkeletonImageBase64(),
    spriteLooks: SpriteLooks.Down,
    size: {
      width: 25,
      height: 22,
    },
    bullet: SkeletonsSword,
    attackRanges: [20, 20, 20],
    attackSpeeds: [1, 2, 3],
    speeds: [1, 1.5, 2],
  },
  {
    image: getSkeletonArcherImageBase64(),
    spriteLooks: SpriteLooks.Down,
    size: {
      width: 25,
      height: 25,
    },
    bullet: EnemiesArrow,
    attackRanges: [140, 160, 180],
    attackSpeeds: [.5, .75, 1],
    speeds: [.75, 1.15, 1.5],
  },
  {
    image: getSkeletonMagusImageBase64(),
    spriteLooks: SpriteLooks.Down,
    size: {
      width: 25,
      height: 24,
    },
    bullet: EnemiesFireBall,
    attackRanges: [170, 200, 230],
    attackSpeeds: [.4, .6, .8],
    speeds: [.60, 1, 1.4],
  },
];

document.getElementById('play-btn').onclick = (e) => {
  const gameWindow = window.open("about:blank","popupwindow", "width=800,height=500,left=200,top=5,scrollbars,toolbar=0,resizable");

  new Game({
    gameWindowWidth: 600,
    gameWindowHeight: 600,
    window: gameWindow,
  });
};

// THIS IS HACK TO IGNORE JsFiddle bug "typescript _super is not defined"
function callSuperMethod(thisArg, methodName, Super, ...args) {
  const $super = new Super();
  $super[methodName].apply(thisArg, args);
}

function detectCollision(gameObject1: GameObject, gameObject2: GameObject): boolean {
  const radius1 = Math.min(gameObject1.width, gameObject1.height) / 2;
  const radius2 = Math.min(gameObject2.width, gameObject2.height) / 2;
  const dx = gameObject1.x - gameObject2.x;
  const dy = gameObject1.y - gameObject2.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  return distance < radius1 + radius2;
}

function getGrassImageBase64() {
  return '/9j/4AAQSkZJRgABAQEASABIAAD/4QAiRXhpZgAATU0AKgAAAAgAAQESAAMAAAABAAEAAAAAAAD/2wBDAAIBAQIBAQICAgICAgICAwUDAwMDAwYEBAMFBwYHBwcGBwcICQsJCAgKCAcHCg0KCgsMDAwMBwkODw0MDgsMDAz/2wBDAQICAgMDAwYDAwYMCAcIDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAz/wAARCAAPAA8DASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwClaiSO0WSGFluIdkaO/Ee4qflB5U4YxncT27iru640uWRUmt5YsbgJrgKhOcE5ZuTyDyMEMMYxUawSW93JI0a/aIwsRhwOr7ZCSM7T1HRgSfbNOtIFsUWaEqscYW3XCFCoKKwbg9wFBGM5Y9ea/kR3ufL8zi7L+u5//9k=';
}
function getArcherImageBase64() {
  return 'iVBORw0KGgoAAAANSUhEUgAAABkAAAAWCAYAAAA1vze2AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsQAAA7EAZUrDhsAAAAGYktHRAD/AP8A/6C9p5MAAAAZdEVYdFNvZnR3YXJlAEFkb2JlIEltYWdlUmVhZHlxyWU8AAAAEnRFWHRFWElGOk9yaWVudGF0aW9uADGEWOzvAAAEzElEQVRIS52Va0yTVxjH/23flt4oFChYBCagLRenbIqKiGC84BYv4KbT6czM+GCWiGzOyBaj+yIbI37ptgQTt08by5YpczjnotuA4TIBa9SJIKIVpYZbQGzL25b22XlfXwfMQhZ/X077nnOe/3ku5zkyYuB/4vP7YW9txdWrV9Bz/z7S0tKRX7AC1Z/aUH74MLQajbRyMtOK9PX14fq1K/jcZsMvZ84CKg5cmBJhajX8CII8HkQaYxAcfgS5Ro3bzgfSzsmEFHm/vByfVFYijhkb4XnoIrTQzE5EwNGLaJUKfGAM3thI6JJj4bx6ByofITjihiEmBrccDsnKOHJpnMRPp0/DZDLBGh8Pizke6rRZMCiUUAaCCMhk0HBKaD1+mEcVMCbHQaFXI0ynx+Dduzh3/rxkZZynRDo6OnD7+nVEabXo8Yxg1OeFQqnAMosVSoUcvNcLfmwMco8PvEkDY68bqTxQyfJy8OhRzIiLkyyN85SI1WrF2/v34+HQEOQqHcbCdfDeG8SvD7uh4FQozFuMzyoPst8yPLJ3IpXTY8T1CBEGA0pLS2GxWCRL44TMicvtxvZt23DpwgUotDqoWB6GOB8iR0ZRsjIPQ0olvqw7B87ng8XETs48i0pPR+1ZVhwhCJkTvU6HhIQExMdG44ztQ6SaYxAYfIiiHbtwmYXGpTYie9ESpGTOg4/3QM5x+JMdyMfEQiJ48l/6BwYE72hmtJGqykqo7PUiyl26jFpbL1Fffz91d3dTPxtbWlpobWEhzU5JoRfmzqW6ujpxPyt92rtnDzU2Nor/ucdSk+nr7cXOrVuRv6YQDb+dB+cexVBvN+rr66FUcjCw+FMwCGNUFPqcTgRHR8Ex7ysrKqBncy/n52Ptxo2Yn5WFIFsX0hOv10s9PT0UCATonXf30bzkWEqN1tAfTRfY/fPQ8PCwODq671GcXk+L0tPp+aQkysnOJn8gSAsts8lmsxHP86K9kCJPKD9wgAZY6GpP/UiLFyygY9XV0sxjXsyYQ3Ofm0VzZsygvNxc+vtGO61bs4re2vkGtXd0SKumEREEHA4HuVwu8vv91ON0UmZamjh34puv6FDpbnpt5QJKMs9k3r5HF1vstGvLaqqp+ZputLf/64VASJGPKirIbreLYZlIU1ODWBBbCnJooOEEfbynhHKsUbR5XQFlmGVUXX2MnM4HYpgn8tQ9qT15EgqFAssLChAZESF9BTy8HzlpEVAarEhPMiEl3oRBVRTams9iyBXAm7v3YdWqFcjMyJB2TIBln6qqqmhJ9kIy6zT0/YmTxFq6eIKJlOzYQIkGDR36oIw2rN9ANd9+R/bLl+mvi81U+8MpMbRCWEMhEyZYpeBiczNeWr0ar6xfh6LNWxDOvLjT1Yl7XZfg592o+/l3WDKzsHTxQiSkzocxIhwbizcJ4RbfmTDWFaZCJnjCYsg6wxhYRaCpqQk329pw91aneE9y8/LZKhna264hOTkViYlJiJ9pxnZ2j/KWL8fesjLJ1NRMyokgJnjFKgputwdarQbh4eFQs3dFmJPL5WIfE3i1uJi9YRwOHzkCa4imOAlB5Fm42dlJm4qK6Ivjx6UvUzPt8zsdQrvo6uoSvc5i7UPGQjoVzyzyhCdhnFoE+AdhooDSXIO82QAAAABJRU5ErkJggg==';
}
function getSkeletonImageBase64() {
  return 'iVBORw0KGgoAAAANSUhEUgAAABkAAAAZCAYAAADE6YVjAAAABGdBTUEAALGOfPtRkwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAABmJLR0QA/wD/AP+gvaeTAAAAEnRFWHRFWElGOk9yaWVudGF0aW9uADGEWOzvAAADy0lEQVRIS72Uf0xTVxTHv0ApYkstBQsyg2tFkGahdp0JkWBwZHWbJOI2RKdmS0z3K9lG4oZmS0TXzIRsg7FlWYBtOvEHhmgwWArMGi0UyvilrWmNqNjOCUo7sPyU4u5e795wDPqIRvb559xz7nn3m3PuuS+IMGCeCWbtvDJN5M95qom2q/GcAXWnj0K2fAUG3H0AbwHu3HLhpdd2IFOTzaY+PrQSV48doXwhepwuDHjHcayyCs8oVVMCg4MD1D4OVxx2BLvv9qG/1wXVsyq8+roWO97ejY0bssALF8Nuu4jvigpQ9Nn76OtlKnxEXtmgQUhQ0N/tYmMUh60NRv0xxMYnYmJkFILIaPxYVg7fxBhEghCsz8rB9p0fgs/ns1885P74OEaGvZBES7FGlYLjJ6uxTC6fKeLzTcDaYUFUzBI8LVtBYy+vU0KjycLvLidkiUm45riIjBeykbZuPaKYA/34fJNoOFmOTttlNNS1QG88B5FYTPdmjHBoKB/q1LVTAsb6GuzTFWGrdhcimAMjo2MQKZHSSpsuNODWbz0074fi3RAtTUGTyYYP8t6cEvDD+Ri93nso++YAzI0tSEiQ4b28fCwQiCEULcT3hZ9iFBFIVSuZMoZhau9Ga1MjjGYL7vY58Yu+GtuYtvrhfIz11YeQqFBi46ZsDA16wAsTwjs8Bo9nEGP3H2ByZBjSpfEoLC6Ho6OdCviRxi5DlCQSJ34upT78lczG+boqctZwivUIKdblE6u1i3R2dpGbrptk70c7aVyzNp3kPp9O1//mD4+b7Honl65nreRGtwMOuw2ZL25iI8A2bR5OVx3B2OgIOlvNcLs9iI+VIk4Ujkqjic16iLP7EtOnUFy7emX2dt24akUYb/qILmamLU4qQX1tNdqaz8Pc1gPt9i04WFPPZkznNvOuFgnCIU9ICtyu8pIC0vWrifUI0etrqf36i89Jalo6+an0W8Z7QGNzEVDEz4E9Wqa3/XTtHRoiOp2OJK1MJhWHykirSU8Ol35J2izNdJ8LThE/hZ+8S267rhNdwR4iXfIUqTlzhjiv28lX+z8mGWmryd78t9jMwHCOsJ+MrM04frAE1st2ZK5ZBUWyAkJxLOLkCqbnwVilWs1mBmZOEfHieBytbcfyGD425+ZALpdBwryBlYpkpCjVsDTPnKz/wiliMBhQUXEYHRYzdCWVyM55g90BJse9GLrnwSLhQjYSGE4RtVoN3f59dM3jhVD7D/ZLLXhOnYIwQQQb4YC9m0em2XiK9N/pZT1uOH+QT4o5L/5J8D+IAH8BRerXTQLCVP4AAAAASUVORK5CYII=';
}
function getSkeletonArcherImageBase64() {
  return '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';
}
function getSkeletonMagusImageBase64() {
  return 'iVBORw0KGgoAAAANSUhEUgAAABkAAAAYCAYAAAAPtVbGAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsQAAA7EAZUrDhsAAAAZdEVYdFNvZnR3YXJlAEFkb2JlIEltYWdlUmVhZHlxyWU8AAADaGlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS4zLWMwMTEgNjYuMTQ1NjYxLCAyMDEyLzAyLzA2LTE0OjU2OjI3ICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIgeG1wTU06T3JpZ2luYWxEb2N1bWVudElEPSJ4bXAuZGlkOjAxODAxMTc0MDcyMDY4MTE4RjYyOUVFQzE0QUQwQzk2IiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOjYzM0VCMTAxRTA4RDExRTRBMkUyOUE0RkRFQ0ZERjI5IiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjYzM0VCMTAwRTA4RDExRTRBMkUyOUE0RkRFQ0ZERjI5IiB4bXA6Q3JlYXRvclRvb2w9IkFkb2JlIFBob3Rvc2hvcCBDUzYgKE1hY2ludG9zaCkiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpFNUU1ODgzQjBGMjA2ODExODIyQUExRDZBODM0M0E1QyIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDowMTgwMTE3NDA3MjA2ODExOEY2MjlFRUMxNEFEMEM5NiIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PiUs9roAAARlSURBVEhLtZZ7TFN3FMc/beUtBWpBdDoE1EIApyIOTXxsoDKnQ3QacepmFly2LHFZ3DLMlhmdy55mDxd1mhjmYwNH2FbD0PnAiY8YGHNdkUcLFmixRIEKlr7k7vbS6Ja5sbL4uX/8zrm/3+98c3/nd06uTBDhASP3jQ+UfxTp7+/3Wf+fuyK9vX0+a5Bfamp81j0sZrM01l/9naqzxyX7vyBzOBzCFzvfptFg5NCBb8lZ8hiqKBUup4u0qanodbWoVKPIWZrP+IcTeTQ9mZDgAM5U1ZCUnOYLMwRdXV3CgX27vPkXyrVlQuXpnyS71dQiVF8+L+z8YLvkL5g3TRpX5mYJu/fsEapraoTOzk7p3VDcvV3NRgPK8DDUMWMk8Q6ziRcLnmPM6JFExkRzs7qB9KUr2LpjB5HhEXTZ+1FGKJmUmMhXRUWoo6Olfffjrkh3dzc9PTYUCgWhIQHs/nQb6tiJLFu9gaLNL3OloYG29jY8QaG4HE7U7tt0DsjpDQ5DCA6hualJCng/5DabjeLiYvT6OprEvOzf+zmzp6eRvTifhYvzsLS20OiRMSo9E8/4idxUBDAiJozAhLG4QkLxyBUE3bRS+EahL+TfkQ0MDAgymYxvDu/ns492YLZ0oWtsw+F0UnG8gt6eTiq+L2VsfCpGQyMzpoxiwZI1hIlHdrr8IIdKq9H03aB7dAyVl3W+sH9F7hUwXWum3WRkX9FRDpeUcN1qxWBoYv26dZw5dYZxE9NobdFj6bCQnpnNI9OySE2bS4JmNh6Xk2vh0cjaTLy1aSMd162+0PeQcuLxeDA01WM2W8Rzt5CSkkJGRgZOl5vpKeMJCApnkmYKOTlZNBvqCVGPw2qzolGr0GoreChuMo6+XpKi5FxobGZhzpNsKHiJKNXgZZCK0e12o69rQJApiIuLkwS8VFWWo9FMprj0GMuWryAwWElwsIOkRDXZmVNpNdZyw2hCV3WWUGUEmqw8kpMnIBPjvP7qK1IML4qtIt4vUSqVJCQkiIuSfVPQd9tNcJhabDF2Vq1aiVPM09X6dhw9VvGY7rDvkz0o5SMQxOfwD1o2FSxnce5aamvrmDolnpmz5ktx/rUL63Q6YmNjif5TDZSUHEUYcHHq5AnaG+owXa7hQmcP725/E7utjcJtezl/7hT2HjPPbtw8uMkr4i/GZpOQ+8QsYf2aZ4R3thQK5g6rkBwfLXx95Ig0X/nzOWFuRpJgNLZI/rBa/bGyg1y6eJGZmdN5eu0qXli/jKIjpazOz5fm++12YseM5cSPWsn3W+TWrT7Kj5Xx2pb3mTf/ccq+03LlVx2Jk1N9K8DUYqTH1s+BLz+WfL9FlMqRBAYFin0uALvYv6ovnuQ3sXhVqijfCli0aBHrni8gNy+POv0V/0X0dfXccdvF6m+i8qSW9z7cRWRkpG92kAnxCcyZl8W0GXPEGzvJ/8SbLdeFpxakC5cunPW9GZph/Uh4m2pERITPG5phifjLsK6wf8Af/lqfy+TfECIAAAAASUVORK5CYII=';
}
function getFireBallImageBase64() {
  return 'iVBORw0KGgoAAAANSUhEUgAAAAYAAAAGCAYAAADgzO9IAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsQAAA7EAZUrDhsAAACaSURBVBhXY/gPBH+B+M6CSf9fHD3w/x9IAAgYfwGJW+ncDDJM3xj+fmJg+KzswSDVuJ2B6fvdmwwyD74xfDjLwPD7KgsDy4cdDB8fvmJg+vToIcM/PgaGf0IyDP+4WRgY7zMwcPD9Y2CSdHRjeMkmwCDK/4SBg+EHwzs1AwZuIQkGRpBFH96+Z/i8dxHDv2//GSQishjYOdgYAPLeSAdsc5faAAAAAElFTkSuQmCC';
}
function getArrowImageBase64() {
  return 'iVBORw0KGgoAAAANSUhEUgAAABQAAAAECAYAAACOXx+WAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsQAAA7EAZUrDhsAAADYSURBVChTY/wPBAxA8OzpE4aLF84yeHr7g7gkgWlTehnk5RUZNm9ax8AAMvDatSv/Vy1fBGL+//P7N5j++/cvmP7z98//N29eg9nv3r75v2HdSjB7754d/z99/PB/ycL5/69fv/zfx9Pl/9evn/8zNtSW/7965QLD6vU7GcpLshl+/PjOwMrKBrSXkYGJCYSZGVhYWMAu4eDkZODm5mH48+c3Az+/IFAFA8PXr18YXr9+BVLOYGnpzAD38sePHxhWrljMkJaeC+KSBKorixkkJMQZ/v37xwAA/e15wAGN3fIAAAAASUVORK5CYII=';
}
function random(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}