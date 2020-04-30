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
      box_x, box_y, box_id;
  let boxes = [];
  let reflectedJustBefore = false;
  let updateInterval = 5;


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
      this.color = `rgb(20, 50, 200)`;
    }
    draw() {
      // 30 * 30
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x, this.y, 30, 30);
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.num, this.x + 15, this.y + 15);
    }
    checkBall() {
      let theX = theBall.x;
      let theY = theBall.y;
      let theR = theBall.r;
      // reflectedJustBeforeば応急処置！
   
      let isUpDown = theY + theR > this.y && theY - theR < this.y + 30 && theX + theR < this.x + 30 && theX - theR > this.x;
      let isLeftRight = theX + theR > this.x && theX - theR < this.x + 30 && theY - theR > this.y && theY + theR < this.y + 30;

      if (!reflectedJustBefore) {
        if (isUpDown && isLeftRight) {
          // ボックスの角に当たっている
          // console.log('斜め');
          if (theX <= this.x || theX >= this.x + 30) {
            typeA();
            this.metBox();
          } else {
            typeB();
            this.metBox();
          }
        } else if (isLeftRight) {
          theBall.vx *= -1;
          this.metBox();
          // console.log('左右に当たった！');
        } else if (isUpDown) {
          theBall.vy *= -1;
          this.metBox();
          // console.log('上下に当たった！');
        }
      }

    }
    metBox() {
      reflectedJustBefore = true;
      this.num--;
      if (this.num === 0) this.deleteBox();
      setTimeout(() => { 
        reflectedJustBefore = false;
        // console.log('not just before');
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

  function gameInit() {
    theBall = new Ball(rand(100, 200), 480, 2, -2, 5);
    setBoxes();
    console.log(boxes);
    update();
  }
  function setBoxes() {
    // example
    // for(let i = 0; i < 5; i++) {
    //   box_x = 60 * i + 10;
    //   for(let j = 0; j < 5; j++) {
    //     box_y = 60 * j + 10;
    //     box_id = boxes.length;
    //     // idは要素が消えた後lengthと整合性なくなる
    //     boxes.push( new Box(box_x, box_y, 100, box_id) );
    //   }
    // }

    // 上段
    for (let i = 0; i < 10; i++) {
      boxes.push( new Box(30 * i, 0, 100, boxes.length) )
    }
    // 左列
    for (let i = 0; i < 10; i++) {
      boxes.push( new Box(0, 30 * i + 30, 100, boxes.length) )
    }
    // 右列
    for (let i = 0; i < 10; i++) {
      boxes.push( new Box(270, 30 * i + 30, 100, boxes.length) )
    }
    // 2列目
    for (let i = 0; i < 9; i++) {
      boxes.push( new Box(67.5, 30 * i + 60, 100, boxes.length) )
    }
    // 3列目
    for (let i = 0; i < 9; i++) {
      boxes.push( new Box(135, 30 * i + 60, 100, boxes.length) )
    }
    // 4列目
    for (let i = 0; i < 9; i++) {
      boxes.push( new Box(202.5, 30 * i + 60, 100, boxes.length) )
    }
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
    timerId = setTimeout(() => {
      update();
    }, updateInterval);
  }

  gameInit();

  function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }
  function typeA() {
    if (theBall.vx <= 10 && theBall.vy <= 10) {
      let vx = theBall.vx * -0.366;
      theBall.vx = Math.round(vx * 1000) / 1000;
      let vy = theBall.vy * 2.73;
      theBall.vy = Math.round(vy * 1000) / 1000;
    } else {
      theBall.vx = 2;
      theBall.vy = 2;
    }
    console.log('typeA: ' + theBall.vx + theBall.vy)
  }
  function typeB() {
    if (theBall.vx <= 10 && theBall.vy <= 10) {
      let vy = theBall.vy * -0.366;
      theBall.vy = Math.round(vy * 1000) / 1000;
      let vx = theBall.vx * 2.73;
      theBall.vx = Math.round(vx * 1000) / 1000;
    } else {
      theBall.vx = 2;
      theBall.vy = 2;
    }
    console.log('typeB: ' + theBall.vx + theBall.vy);
  }

  setInterval(() => {
    console.log(theBall.vx + ', ' + theBall.vy);
  }, 1000);
});