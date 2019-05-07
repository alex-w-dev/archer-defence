interface GameParams {
  gameWindowWidth: number;
  gameWindowHeight: number;
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
  levelIndex: number,
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
  x: number;
  y: number;
  spriteLooks: SpriteLooks = SpriteLooks.Right;

  protected destroyed: boolean = false;

  constructor() {
    this.element = document.createElement('div');
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
    this.game.element.appendChild(this.element);
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
  speed: number = 1;
  attackSpeed: number = 3;
  lastAttackTime: number = Date.now();

  protected bindOnTick: IOnTickFunction;

  constructor() {
    super();
  }

  destroy() {
    super.destroy();

    if (this.bindOnTick) {
      this.game.tickUnsubscribe(this.bindOnTick);
    }
  }

  addToGame(game: Game) {
    super.addToGame(game);

    this.bindOnTick = this.onTick.bind(this);
    this.game.tickSubscribe(this.bindOnTick);
  }

  onTick(delta) {};

  lookOn(x: number, y: number) {
    const angle = this.getAngleToTarget(x, y) + this.spriteLooks;

    this.element.style.transform = `rotate(${angle}deg)`;
  }

  stepTo(x: number, y: number, delta) {
    const angle = this.getAngleToTarget(x, y);
    this.setPosition(this.x + Math.cos(angle) * delta * this.speed, this.y + Math.sin(angle) * delta * this.speed);
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
  angle: number;

  constructor() {
    super();

    this.element.style.background = `url(data:image/png;base64,${getArrowImageBase64()})`;
    this.spriteLooks = SpriteLooks.Left;
    this.setSize(20, 4);
  }

  setDirection(angle: number) {
    this.angle = angle;
  }

  onTick(delta) {
    this.setPosition(
      this.x += Math.cos(this.angle / 180 * Math.PI),
      this.y += Math.sin(this.angle / 180 * Math.PI),
    );

    if (this.x < 0 || this.x > this.game.floor.width || this.y < 0 || this.y > this.game.floor.height) {
      this.destroy();
    }
  };
}

class ArchersBullet extends Bullet {
  onTick(delta) {
    super.onTick(delta);

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

class EnemiesBullet extends Bullet {
  onTick(delta) {
    super.onTick(delta);

    if (detectCollision(this, this.game.archer)) {
      this.destroy();
      this.game.archer.destroy();
    }
  }
}

class Fighter extends DynamicGameObject{
  bullet: typeof Bullet;

  attackTo(x: number, y: number) {
    this.lookOn(x, y);

    const now = Date.now();
    if (this.lastAttackTime + 1000 / this.attackSpeed < now) {
      const bullet = new this.bullet();

      bullet.setPosition(this.x, this.y);
      bullet.lookOn(x, y);
      bullet.setDirection(this.getAngleToTarget(x, y));
      bullet.addToGame(this.game);

      this.lastAttackTime = now;
    }
  }
}

class Enemy extends Fighter{
  attackRange: number = 20;
  bullet: typeof Bullet = EnemiesBullet;

  constructor(enemyParams: IEnemyParams) {
    super();

    this.element.style.background = `url(data:image/png;base64,${enemyParams.image})`;
    this.spriteLooks = enemyParams.spriteLooks;
    this.setSize(enemyParams.size.width, enemyParams.size.height);
    this.attackRange = enemyParams.attackRange;
    this.attackSpeed = enemyParams.attackSpeed;
    this.speed = enemyParams.speed;
  }


  destroy() {
    super.destroy();

    if (this.game) this.game.enemies.delete(this);
  }

  addToGame(game: Game) {
    super.addToGame(game);

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
  bullet: typeof Bullet = ArchersBullet;

  private previousMousemoveEvent: MouseEvent;

  constructor() {
    super();

    document.addEventListener('mousemove', (e) => this.previousMousemoveEvent = e);
    document.addEventListener('click', (e) => {
      this.attackTo(this.previousMousemoveEvent.clientX, this.previousMousemoveEvent.clientY);
    });

    this.element.style.background = `url(data:image/png;base64,${getArcherImageBase64()})`;
    this.spriteLooks = SpriteLooks.Down;
    this.setSize(25, 22);
  }

  onTick() {
    if (this.previousMousemoveEvent) this.lookOn(this.previousMousemoveEvent.clientX, this.previousMousemoveEvent.clientY);
  }

  destroy() {
    // super.destroy();

    this.game.gameOver();
  }
}

class Floor extends GameObject{
  constructor() {
    super();

    this.element.style.zIndex = '0';
    this.element.style.background = `url(data:image/gif;base64,${getGrassImageBase64()})`;
  }
}

class Game {
  element: HTMLElement = document.body;
  gameWindowWidth: number;
  gameWindowHeight: number;

  enemies: Set<Enemy> = new Set<Enemy>();
  archer: Archer;
  floor: Floor;
  isGamePlay: boolean = true;

  private tickSubscriptions: Set<IOnTickFunction> = new Set<IOnTickFunction>();
  private prevTickTime: number = Date.now();
  private tickingInterval: any;

  constructor(gameParams: GameParams) {
    this.element.innerHTML = '';
    this.element.style.position = 'relative';
    this.element.style.width = (this.gameWindowWidth = gameParams.gameWindowWidth) + 'px';
    this.element.style.height = (this.gameWindowHeight = gameParams.gameWindowHeight) + 'px';
    this.floor = new Floor();
    this.floor.setPosition(this.gameWindowWidth / 2, this.gameWindowHeight / 2);
    this.floor.setSize(this.gameWindowWidth, this.gameWindowHeight);
    this.floor.addToGame(this);
    this.archer = new Archer();
    this.archer.setPosition(this.gameWindowWidth / 2, this.gameWindowHeight / 2);
    this.archer.addToGame(this);

    this.generateRandomEnemy();

    this.startTicking();
  }

  public gameOver(): void {
    alert('Game Over');

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

  private generateRandomEnemy() {
    const levelIndex = 0;
    const enemyIndex = 0;

    const enemyDefinition = {...ENEMIES[enemyIndex]};

    const enemy = new Enemy({
      ...enemyDefinition,
      ...{
        attackRange: enemyDefinition.attackRanges[levelIndex],
        attackSpeed: enemyDefinition.attackSpeeds[levelIndex],
        speed: enemyDefinition.speeds[levelIndex],
        levelIndex,
      }
    });
    enemy.setPosition(0, 0);
    enemy.addToGame(this);
  }

  private startTicking() {
    this.tickingInterval = setInterval(() => {
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
    bullet: EnemiesBullet,
    attackRanges: [20, 20, 20],
    attackSpeeds: [1, 2, 3],
    speeds: [1, 1.5, 2],
  },
];

new Game({
  gameWindowWidth: 500,
  gameWindowHeight: 500,
});

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

function getArrowImageBase64() {
  return 'iVBORw0KGgoAAAANSUhEUgAAABQAAAAECAYAAACOXx+WAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsQAAA7EAZUrDhsAAADYSURBVChTY/wPBAxA8OzpE4aLF84yeHr7g7gkgWlTehnk5RUZNm9ax8AAMvDatSv/Vy1fBGL+//P7N5j++/cvmP7z98//N29eg9nv3r75v2HdSjB7754d/z99/PB/ycL5/69fv/zfx9Pl/9evn/8zNtSW/7965QLD6vU7GcpLshl+/PjOwMrKBrSXkYGJCYSZGVhYWMAu4eDkZODm5mH48+c3Az+/IFAFA8PXr18YXr9+BVLOYGnpzAD38sePHxhWrljMkJaeC+KSBKorixkkJMQZ/v37xwAA/e15wAGN3fIAAAAASUVORK5CYII=';
}