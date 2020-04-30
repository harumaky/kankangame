'use strict';
$(function() {

  const dpr = devicePixelRatio;
  let canvas = document.getElementById('game-field');
  if (!canvas || !canvas.getContext) { return false };
  let ctx = canvas.getContext('2d');

  // コンテキストの初期値設定
  canvas.width = 300;
  canvas.height = 500;
  // 解像度が高かったら、コンテキストを拡大
  canvas.width *= dpr;
  canvas.height *= dpr;
  // 座標も全てdpr倍
  ctx.scale(dpr, dpr);
  // スタイルは拡大した分縮小
  canvas.style.width = String(canvas.width / dpr) + "px";
  canvas.style.height = String(canvas.height / dpr) + "px";

  let theBall, timerId;


  class Ball {
    constructor(x, y, vx, vy, r = 5) {
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.r = r;
    }
    draw() {
      ctx.beginPath();
      ctx.fillStyle = 'red';
      ctx.arc(this.x, this.y, this.r, 0, 2 * Math.PI, true);
      ctx.fill();
    }
    move() {
      this.x += this.vx;
      this.y += this.vy;
      // 右、左衝突
      if (this.x + this.r > canvas.width / dpr || this.x - this.r < 0) {
        this.vx *= -1;
      }
      // 上
      if (this.y - this.r < 0) { this.vy *= -1; }
    }
  }
  

  function gameInit() {
    theBall = new Ball(rand(50, 250), 400, 2, -2);
    update();
  }

  function clearField() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  function update() {
    clearField();
    theBall.draw();
    theBall.move();
    timerId = setTimeout(() => {
      update();
    }, 20);
  }
  

  gameInit();

  function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }
});