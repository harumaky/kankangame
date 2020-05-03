'use strict';
$(function() {

  // document.addEventListener('touchmove', function(e) {
  //   e.preventDefault()
  // }, { passive: false });

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

  let theBall, // ボールのインスタンス
      initBall, // ボールの初期Xランダム
      updateID, // 描画更新update()をコールバックするためのsetTimeout
      deadZone; // 下部のゲームアウト領域インスタンス
  let num = 10; // 一つのボックスのHP？の初期値
  let boxes = []; // ボックスのインスタンス格納配列
  let updateInterval = 8; // update()更新間隔(ms)
  let score = 0;
  let playing = false;
  let theArrow; // アローのインスタンス

  class Ball {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.vx;
      this.vy;
      this.r = 5; // 半径固定5
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
      if (this.y - this.r < 0) { 
        this.vy *= -1;
      }
      // デットゾーン
      if (this.y >= 450) {
        finishGame();
      }
    }
  }

  // ボックス（ブロックにした方がよかったなと後悔）
  class Box {
    constructor(x, y, num, id) {
      this.x = x;
      this.y = y;
      this.num = num; // box内の数字
      this.id = id; // 任意のboxを削除する際に使う
      this.collisioned = false; // 衝突判定が出た場合true
      this.afterCollision = 0; // 衝突判定後の描画更新回数
    }
    determineColor() {
      if(this.collisioned && this.afterCollision < 20) {
        this.color = 'red'; // 衝突後、20回の間は背景redに
      } else {
        this.hue = this.num * 12 + 120; // numに応じて背景色設定
        this.color = `hsl(${this.hue}, 50%, 60%)`
        this.collisioned = false;
      }
    }
    draw() {
      this.determineColor();
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x, this.y, 30, 30);
      // 以下num表示を更新
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.num, this.x + 15, this.y + 15);

      this.afterCollision++; // 衝突後の描画カウント
    }
    collision() {
      this.collisioned = true;
      this.afterCollision = 0;
      // 衝突フラッグを立て、この先20回の描画後に解除
      this.num--;
      score++;
      $('#score').text(score);
      if (this.num === 0) this.deleteBox();
    }
    deleteBox() {
      let thisId = this.id;
      // boxesの中のそれぞれのインスタンスから、idが消去したいボックスと同じものを探す
      boxes.filter(function(box, index) {
        if (box.id === thisId) {
          boxes.splice(index, 1);
          // ここで削除。それぞれのboxインデックス番号が1減る
          // よって次も初期化時は、インデックスに依存せず、設定した固有のidで消したいboxを探す
        }
      });
    }
  }
  // boxとボールの当たり判定
  function collisionDetecion() {
    boxes.some(box => {
      let horizontal = isH(theBall.x, theBall.y, box.x, box.y);
      let vertical = isV(theBall.x, theBall.y, box.x, box.y);
      if (horizontal) {
        theBall.vx *= -1;
        box.collision();
        return true;
      } 
      if (vertical) {
        theBall.vy *= -1;
        box.collision();
        return true;
      }
    });
  }
  // a,b=>ballのx,y c,d=>boxの原点(左上)  
  function isH(a, b, c, d) { // 水平（左右）面に当たったか
    let part1 = b > -a + c + d + 30 && b < a - c + d && a < c + 30;
    let part2 = b < -a + c + d + 30 && b > a - c + d && a > c;
    return part1 || part2;
  }
  function isV(a, b, c, d) { // 鉛直面
    let part1 = b < -a + c + d + 30 && b < a - c + d && b > d;
    let part2 = b > -a + c + d + 30 && b > a - c + d && b < d + 30;
    return part1 || part2;
  }

  class DeadZone {
    draw() {
      ctx.fillStyle = theBall.y <= 450 ? 'rgba(255, 0, 0, 0.4)' : 'rgba(255, 0, 0, 0.8)';
      ctx.fillRect(0, 450, canvas.width, 50);
    }
  }

  // アロー（下の矢印制御）(canvasではなくDOM -> スタイルはcss)
  class Arrow {
    constructor() {
      this.deg = -10; // 時計回りが正だから、-10度が初期値
      this.updateRad = 0; // deg = 80cos(Rad)-90のRad（無限に大きくなってく）
      this.running = false;
    }
    calcRad() {
      return Math.PI / 180 * Math.abs(this.deg);
      // 呼び出された瞬間の角度をラジアンに変換
    }
    show() {
      $('#arrow').css('transform', `translateX(${initBall - 150}px) rotate(${this.deg}deg)`).show(); // initBallの位置に合うようにずらしてから表示
    }
    draw() {
      // 角度は-10 ~ -170度間を、cosカーブの振動に合わせて更新
      this.deg = 80 * Math.cos(this.updateRad) - 90;
      $('#arrow').css('transform', `translateX(${initBall - 150}px) rotate(${this.deg}deg)`);
      this.updateRad = this.updateRad + Math.PI / 270;
      this.running = true;
    }
    update() {
      let that = this;
      this.updateID = setInterval(function() { that.draw() }, 30);
    }
    stop() {
      clearInterval( this.updateID );
      this.running = false
    }
  }

  // 初期化
  function initGame() {
    score = 0;
    $('#score').text(score);
    playing = false;
    boxes = [];

    // インスタンス作成
    initBall = rand(120, 180); // ボールの初期Xランダム120~180
    theBall = new Ball(initBall, 440);
    deadZone = new DeadZone;
    setBoxes();

    // 初期描画
    theBall.draw();
    boxes.forEach(box => { box.draw(); });
    deadZone.draw();

    $('#bottom-text').show();
  }
  initGame(); // ページを読み込んだら即初期化

  // ゲームスタート操作（スイングするアローの角度に対応した向きに発射）
  $('#game-field, #arrow').on('click', () => {
    if (!theArrow) {
      theArrow = new Arrow; // はじめの1クリックでインスタンス作成
    }
    if (!playing) { // プレイ中にクリックしても意味ない
      if (!theArrow.running) {
        theArrow.show(); // display:none解除
        theArrow.update(); // -10 ~ -170度の間をスイング
        $('#bottom-text').fadeOut();
      } else { // 既にアローがスイングしてるときにクリックしたら
        playing = true; // プレイ開始フラッグ
        theArrow.stop(); 
        $('#arrow').fadeOut();
        let rad = theArrow.calcRad(); // この瞬間の角度をラジアンに変換
        theBall.vx = 2 * Math.cos(rad); // ボールの初速度設定(vx, vy)
        theBall.vy = -2 * Math.sin(rad);
        updateID = setInterval(update, updateInterval); // スタート
      }
    }
  });
  
  // このupdate()はclearInterval(updateID)でstop
  function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // コンテクスト全消し
    theBall.move();
    theBall.draw();
    collisionDetecion(); // ボールが動いた結果,boxと衝突したか判定
    boxes.forEach(box => {
      box.draw();
    });
    deadZone.draw(); // ほぼ静的なコンテクストだけど、全消ししてるからまた描画
  }

  function finishGame() {
    clearInterval(updateID); // 描画update解除
    alert('スコア：' + score); // alertで応急処置
    initGame();
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
    // 2列目
    for (let i = 0; i < 8; i++) {
      boxes.push( new Box(45, 40 * i + 40, num, boxes.length) )
    }
    // 3列目
    for (let i = 0; i < 8; i++) {
      boxes.push( new Box(90, 40 * i + 50, num, boxes.length) )
    }
    // 4列目
    for (let i = 0; i < 8; i++) {
      boxes.push( new Box(135, 40 * i + 40, num, boxes.length) )
    }
    // 5列目
    for (let i = 0; i < 8; i++) {
      boxes.push( new Box(180, 40 * i + 50, num, boxes.length) )
    }
    // 6列目
    for (let i = 0; i < 8; i++) {
      boxes.push( new Box(225, 40 * i + 40, num, boxes.length) )
    }
    // 右列
    for (let i = 0; i < 12; i++) {
      boxes.push( new Box(270, 30 * i + 30, num, boxes.length) )
    }
    // 下段左
    for (let i = 0; i < 3; i++) {
      boxes.push( new Box(30 * i, 390, num, boxes.length) )
    }
    // 下段右
    for (let i = 0; i < 3; i++) {
      boxes.push( new Box(30 * i + 210, 390, num, boxes.length) )
    }
  }

  function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }
});