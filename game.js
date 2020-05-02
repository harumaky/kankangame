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
  let num = 50; // 一つのボックスのHP？の初期値
  let boxes = []; // ボックスのインスタンス格納配列
  let updateInterval = 10; // update()更新間隔(ms)
  let reflectedJustBefore = false; // すぐさっきボールがボックスに反射したばかりか？
  let score = 0;
  let playing = false;
  let theArrow; // アローのインスタンス

  class Ball {
    constructor(x, y, vx, vy) {
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.r = 5; // 半径固定
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
      this.num = num;
      this.id = id;
      this.xRange = [];
      this.yRange = [];
      // ボールの半径5の分だけ大きい範囲で、ボールの中心座標と比較する
      for (let i = 0; i < 41; i++) {
        this.xRange.push(this.x - 5 + i);
        this.yRange.push(this.y - 5 + i);
      }
      // ベース：-5 ~ -1 | 0 ~ 30 | 31 ~ 35 (それぞれ+i)
      this.xSpliced = Array.from(this.xRange);
      this.xSpliced.splice(5, 31); // -5 ~ -1, 31 ~ 35 
      this.ySpliced = Array.from(this.yRange);
      this.ySpliced.splice(5, 31); // -5 ~ -1, 31 ~ 35 
      this.xSliced = Array.from(this.xRange);
      this.xSliced = this.xSliced.slice(5, 36) // 0 ~ 30
      this.ySliced = Array.from(this.yRange);
      this.ySliced = this.ySliced.slice(5, 36); // 0 ~ 30

      this.xCorner = this.xSpliced;
      this.yCorner = this.ySpliced;

      this.xColumn = this.xSpliced;
      this.yColumn = this.ySliced;

      this.xRow = this.xSliced;
      this.yRow = this.ySpliced;

      this.isIn = false;
    }
    draw() {
      // 30 * 30
      this.hue = this.num * 6 + 290;
      this.color = `hsl(${this.hue}, 50%, 60%)`
      ctx.fillStyle = this.isIn ? 'red': this.color;
      ctx.fillRect(this.x, this.y, 30, 30);
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.num, this.x + 15, this.y + 15);
    }
    checkBall() {
      let theX = Math.round(theBall.x);
      let theY = Math.round(theBall.y);

      this.isIn = this.xRange.includes(theX) && this.yRange.includes(theY);
      let isCorner = this.xCorner.includes(theX) && this.yCorner.includes(theY);
      let isLeftRight = this.xColumn.includes(theX) && this.yColumn.includes(theY);
      let isUpDown = this.xRow.includes(theX) && this.yRow.includes(theY);

      if (!reflectedJustBefore && this.isIn) {
        if (isCorner) {
          console.log('角にあたった！')
          theBall.vy *= -1;
          theBall.vx *= 1.1;
          if (theBall.vx > 5) theBall.vx = 2;
          this.metBox();
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
      reflectedJustBefore = true;
      this.num--;
      score++;
      $('#score').text(score);
      if (this.num === 0) this.deleteBox();
      setTimeout(() => { 
        reflectedJustBefore = false;
      }, updateInterval * 5);
    }

    deleteBox() {
      let thisId = this.id;
      // boxesの中のそれぞれのインスタンスから、idが消去したいボックスと同じものを探す
      boxes.filter(function(box, index) {
        if (box.id === thisId) {
          boxes.splice(index, 1);
          // ここで削除。それぞれのboxインデックス番号が1減る
          // よって次も初期化時に設定した固有のidで消したいboxを探す
        }
      });
    }
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
    drow() {
      // 角度は-10 ~ -170度間を、cosカーブの振動に合わせて更新
      this.deg = 80 * Math.cos(this.updateRad) - 90;
      $('#arrow').css('transform', `translateX(${initBall - 150}px) rotate(${this.deg}deg)`);
      this.updateRad = this.updateRad + Math.PI / 270;
      this.running = true;
    }
    update() {
      let that = this;
      this.updateID = setInterval(function() { that.drow() }, 30);
    }
    stop() {
      clearInterval( this.updateID );
      this.running = false
    }
  }

  // 初期化
  function gameInit() {
    score = 0;
    $('#score').text(score);
    playing = false;
    boxes = [];

    // インスタンス作成
    initBall = rand(120, 180); // ボールの初期Xランダム
    theBall = new Ball(initBall, 440, 2, -2);
    deadZone = new DeadZone;
    setBoxes();

    // 初期描画
    theBall.draw();
    boxes.forEach(box => { box.draw(); });
    deadZone.draw();

    $('#bottom-text').show();
  }
  gameInit(); // ページを読み込んだら即初期化

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
    // 全てのboxインスタンスに当たり判定と描画を実行
    boxes.forEach(box => {
      box.checkBall();
      box.draw();
    });
    deadZone.draw(); // ほぼ静的なコンテクストだけど、全消ししてるからまた描画
  }

  // alertで応急処置
  function finishGame() {
    clearInterval(updateID); // 描画update解除
    alert('スコア：' + score);
    gameInit();
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
    for (let i = 0; i < 6; i++) {
      boxes.push( new Box(60, 50 * i + 60, num, boxes.length) )
    }
    // 3列目
    for (let i = 0; i < 6; i++) {
      boxes.push( new Box(105, 50 * i + 75, num, boxes.length) )
    }
    // 4列目
    for (let i = 0; i < 6; i++) {
      boxes.push( new Box(165, 50 * i + 75, num, boxes.length) )
    }
    // 5列目
    for (let i = 0; i < 6; i++) {
      boxes.push( new Box(210, 50 * i + 60, num, boxes.length) )
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

  setInterval(() => {
    console.log('Speed(vx,vy): ' + theBall.vx + ', ' + theBall.vy);
  }, 1000);
});