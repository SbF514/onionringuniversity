class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.zoom = 1;
    this.minZoom = 0.5;
    this.maxZoom = 2;
    this.screenWidth = 800;
    this.screenHeight = 600;
  }

  setTarget(x, y) {
    this.x = x - this.screenWidth / 2;
    this.y = y - this.screenHeight / 2;
  }

  setZoom(z) {
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, z));
  }

  resize(w, h) {
    this.screenWidth = w;
    this.screenHeight = h;
  }

  update() {}

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
