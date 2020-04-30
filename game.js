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

  let theBall, 
      timerId,
      deadZone;
  let num = 50;
  let boxes = [];
  let updateInterval = 20;
  let scoreBox = $('#score');
  let score = 0;


  class Ball {
    constructor(x, y, vx, vy) {
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.r = 5;
    }
    draw() {
      ctx.beginPath();
      ctx.fillStyle = 'red';
      ctx.arc(this.x, this.y, this.r, 0, 2 * Math.PI, true);
      ctx.fill();
    }
    wallReflect() {
      this.x += this.vx;
      this.y += this.vy;
      // 右、左衝突
      if (this.x + this.r > canvas.width / dpr || this.x - this.r < 0) {
        this.vx *= -1
      }
      // 上
      if (this.y - this.r < 0) { 
        this.vy *= -1
      }
      // 下
      if (this.y + this.r > canvas.height / dpr) { this.vy *= -1; }
    }
  }
  class Box {
    constructor(x, y, num, id) {
      this.x = x;
      this.y = y;
      this.num = num;
      this.id = id;
      this.xRange = [];
      this.yRange = [];
      // ボールの半径5の分だけ大きい範囲で、ボールの中心座標と比較する
      for (let i = 0; i < 41; i++) {
        this.xRange.push(this.x - 5 + i);
        this.yRange.push(this.y - 5 + i);
      }

      // -5 ~ -1 | 0 ~ 30 | 31 ~ 35 (それぞれ+i)
      this.xSpliced = Array.from(this.xRange);
      this.xSpliced.splice(5, 31);
      this.ySpliced = Array.from(this.yRange);
      this.ySpliced.splice(5, 31);
      this.xSliced = Array.from(this.xRange);
      this.xSliced = this.xSliced.slice(5, 36)
      this.ySliced = Array.from(this.yRange);
      this.ySliced = this.ySliced.slice(5, 36);

      this.xCorner = this.xSpliced;
      this.yCorner = this.ySpliced;

      this.xColumn = this.xSpliced;
      this.yColumn = this.ySliced;

      this.xRow = this.xSliced;
      this.yRow = this.ySpliced;

      console.log(this.xSliced)

      this.isIn = false;
      this.reflectedJustBefore = false;
    }
    draw() {
      // 30 * 30
      this.hue = this.num * 6;
      this.color = `hsl(${this.hue}, 70%, 60%)`
      ctx.fillStyle = this.isIn ? 'red ': this.color;
      ctx.fillRect(this.x, this.y, 30, 30);
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.num, this.x + 15, this.y + 15);
    }
    checkBall() {
      let theX = Math.round(theBall.x);
      let theY = Math.round(theBall.y);
      let theR = theBall.r;
 
      this.isIn = this.xRange.includes(theX) && this.yRange.includes(theY);
      let isCorner = this.xCorner.includes(theX) && this.yCorner.includes(theY);
      let isLeftRight = this.xColumn.includes(theX) && this.yColumn.includes(theY);
      let isUpDown = this.xRow.includes(theX) && this.yRow.includes(theY);

      if (!this.reflectedJustBefore && this.isIn) {
        if (isCorner) {
          console.log('角に当たった！');
          if (rand(0, 1)) {
            typeA();
            this.metBox();
          } else {
            typeB();
            this.metBox();
          }
        } else if (isUpDown) {
          theBall.vy *= -1;
          this.metBox();
          console.log('上下に当たった！');
        } else if (isLeftRight) {
          theBall.vx *= -1;
          this.metBox();
          console.log('左右に当たった！');
        }
      }
    }
    metBox() {
      this.reflectedJustBefore = true;
      this.num--;
      score++;
      scoreBox.text(score);
      if (this.num === 0) this.deleteBox();
      setTimeout(() => { 
        this.reflectedJustBefore = false;
        console.log('not just before');
      }, updateInterval * 5);
    }

    deleteBox() {
      let thisId = this.id;
      boxes.filter(function(item, index) {
        if (item.id === thisId) {
          boxes.splice(index, 1);
        }
      });
    }
  }

  class DeadZone {
    draw() {
      ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
      ctx.fillRect(0, 450, canvas.width, 50);
    }
  }

  function gameInit() {
    theBall = new Ball(160, 450, 2, -2);
    setBoxes();
    boxes.forEach(box => { box.draw(); });
    console.log(boxes);
    deadZone = new DeadZone;
    deadZone.draw();
    update();
  }

  function clearField() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  function update() {
    clearField();
    theBall.draw();
    theBall.wallReflect();
    boxes.forEach(box => {
      box.draw();
      box.checkBall();
    });
    deadZone.draw();

    timerId = setTimeout(() => {
      update();
    }, updateInterval);
  }

  function setBoxes() {
    // 上段
    for (let i = 0; i < 10; i++) {
      boxes.push( new Box(30 * i, 0, num, boxes.length) )
    }
    // 左列
    for (let i = 0; i < 12; i++) {
      boxes.push( new Box(0, 30 * i + 30, num, boxes.length) )
    }
    // 右列
    for (let i = 0; i < 12; i++) {
      boxes.push( new Box(270, 30 * i + 30, num, boxes.length) )
    }
    // 2列目
    for (let i = 0; i < 8; i++) {
      boxes.push( new Box(70, 40 * i + 60, num, boxes.length) )
    }
    // 3列目
    for (let i = 0; i < 8; i++) {
      boxes.push( new Box(100, 40 * i + 60, num, boxes.length) )
    }
    // 4列目
    for (let i = 0; i < 8; i++) {
      boxes.push( new Box(170, 40 * i + 60, num, boxes.length) )
    }
    // 5列目
    for (let i = 0; i < 8; i++) {
      boxes.push( new Box(200, 40 * i + 60, num, boxes.length) )
    }
  }

  gameInit();

  function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }
  function typeA() {
    let vx = Math.round(theBall.vx * -1.4 * 100) / 100;
    theBall.vx = vx <= 12 && vx > 1.5 ? vx : 3;
    let vy = Math.round(theBall.vy * 0.7 * 100) / 100;
    theBall.vy = vy <= 12 && vy > 1.5 ? vy : 3;
    console.log('typeA: ' + theBall.vx, theBall.vy)
  }
  function typeB() {
    let vy = Math.round(theBall.vy * -0.8 * 100) / 100;
    theBall.vy = vy <= 12 && vy > 1.5 ? vy : 3;
    let vx = Math.round(theBall.vx * 1.25 * 100) / 100;
    theBall.vx = vx <= 12 && vx > 1.5 ? vx : 3;
    console.log('typeB: ' + theBall.vx, theBall.vy);
  }

  setInterval(() => {
    console.log(theBall.vx + ', ' + theBall.vy);
  }, 1000);
});