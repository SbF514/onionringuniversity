class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.zoom = 1;
    this.targetZoom = 1;
    this.smoothing = 0.08;
    this.minZoom = 0.5;
    this.maxZoom = 2;
    this.screenWidth = 800;
    this.screenHeight = 600;
  }

  setTarget(x, y) {
    var deadX = this.screenWidth * 0.4;
    var deadY = this.screenHeight * 0.4;

    var playerScreenX = x - this.x;
    var playerScreenY = y - this.y;

    if (playerScreenX < deadX) {
      this.targetX = x - deadX;
    } else if (playerScreenX > this.screenWidth - deadX) {
      this.targetX = x - this.screenWidth + deadX;
    }

    if (playerScreenY < deadY) {
      this.targetY = y - deadY;
    } else if (playerScreenY > this.screenHeight - deadY) {
      this.targetY = y - this.screenHeight + deadY;
    }
  }

  setZoom(z) {
    this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, z));
  }

  resize(w, h) {
    this.screenWidth = w;
    this.screenHeight = h;
  }

  update() {
    this.x += (this.targetX - this.x) * this.smoothing;
    this.y += (this.targetY - this.y) * this.smoothing;
    this.zoom += (this.targetZoom - this.zoom) * this.smoothing;
  }

  worldToScreen(wx, wy) {
    return {
      x: (wx - this.x) * this.zoom,
      y: (wy - this.y) * this.zoom,
    };
  }

  screenToWorld(sx, sy) {
    return {
      x: sx / this.zoom + this.x,
      y: sy / this.zoom + this.y,
    };
  }

  getVisibleBounds() {
    return {
      left: this.x,
      top: this.y,
      right: this.x + this.screenWidth / this.zoom,
      bottom: this.y + this.screenHeight / this.zoom,
    };
  }
}
