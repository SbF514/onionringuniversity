class LocalPlayer {
  constructor(id, username, spawnX, spawnY) {
    this.id = id;
    this.username = username;
    this.x = spawnX;
    this.y = spawnY;
    this.vx = 0;
    this.vy = 0;
    this.facing = 'down';
    this.isMoving = false;
    this.speed = 150;
  }

  handleInput(keys) {
    this.vx = 0;
    this.vy = 0;
    var moving = false;

    if (keys['w'] || keys['arrowup']) {
      this.vy = -this.speed;
      this.facing = 'up';
      moving = true;
    }
    if (keys['s'] || keys['arrowdown']) {
      this.vy = this.speed;
      this.facing = 'down';
      moving = true;
    }
    if (keys['a'] || keys['arrowleft']) {
      this.vx = -this.speed;
      this.facing = 'left';
      moving = true;
    }
    if (keys['d'] || keys['arrowright']) {
      this.vx = this.speed;
      this.facing = 'right';
      moving = true;
    }

    // Normalize diagonal
    if (this.vx !== 0 && this.vy !== 0) {
      this.vx *= 0.707;
      this.vy *= 0.707;
    }

    // Sprint
    if (keys['shift']) {
      this.vx *= 1.5;
      this.vy *= 1.5;
    }

    this.isMoving = moving;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    // Clamp to world bounds
    this.x = Math.max(16, this.x);
    this.y = Math.max(16, this.y);
  }

  getState() {
    return {
      id: this.id,
      username: this.username,
      position: { x: this.x, y: this.y },
      velocity: { x: this.vx, y: this.vy },
      facing: this.facing,
      isMoving: this.isMoving,
    };
  }
}
