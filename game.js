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
  class box {
    constructor(x, y, num, id) {
      this.x = x;
      this.y = y;
      this.num = num;
      this.id = id;
      this.color = `rgb(${rand(100, 255)}, 50, 40)`;
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

      // 角判定を導入する
      if (!reflectedJustBefore) {
        // ボールの右端がボックスの左端より大きいかつボールの左端がボックスの右端より小さいとき、ボールがボックスの高さの中にある->左右に当たった
        // (ボックスの幅内に入る&&それが高さ内にある)
        if (theX + theR > this.x && theX - theR < this.x + 30) {
          console.log('左右1: ボックスのx域に入った');
          if (theY - theR > this.y && theY + theR < this.y + 30) {
            this.metBox();
            theBall.vx *= -1;
            console.log('左右2: 左右に当たった！');
          }
        }
      }
      if (!reflectedJustBefore) {
        // ボールの下端がボックスの上端より大きいかつボールの上端がボックスの下端より小さいとき、ボールがボックスの幅の中にある->上下に当たった
        // (ボックスの高さ内に入る&&それが幅内にある)
        if (theY + theR > this.y && theY - theR < this.y + 30) {
          console.log('上下1: ボックスのy域に侵入');
          // ボールの右端がボックスの左端より大きいかつボールの左端がボックスの右端よりも小さい
          if (theX + theR > this.x + 3 && theX - theR < this.x + 27) {
            // 左右に当たった後、続けて上下も当たり判定起こらないように、ボックスの幅を小さく仮定する
            this.metBox();
            theBall.vy *= -1;
            console.log('上下2: 上下に当たった！');
          }
        }
      }
    }
    metBox() {
      reflectedJustBefore = true;
      this.num--;
      if (this.num === 0) {
        console.log('0!!!');
        this.deleteBox();
      }
      setTimeout(() => { 
        reflectedJustBefore = false
        console.log('not just before');
      }, 100);
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
    theBall = new Ball(rand(100, 200), 400, 5, -5);
    setBoxes();
    console.log(boxes);
    update();
  }
  function setBoxes() {
    for(let i = 0; i < 4; i++) {
      box_x = 80 * i + 100;
      for(let j = 0; j < 4; j++) {
        box_y = 80 * j + 100;
        box_id = boxes.length;
        // idは要素が消えた後lengthと整合性なくなる
        boxes.push( new box(box_x, box_y, 5, box_id) );
      }
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
    }, 100);
  }

  gameInit();


  
  function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }
  function reflectRand() {
    // 反射速度にこの少数をかけると不安定
    let num = Math.random() * (1.05 - 0.93) + 0.93;
    num *= 100;
    num = Math.round(num);
    return num / 100
    // だんだん遅くなる
  }
});