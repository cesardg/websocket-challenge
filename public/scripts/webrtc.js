    const $myCamera = document.getElementById('myCamera');
    const $otherCamera = document.getElementById('otherCamera');
    const $peerSelect = document.getElementById('peerSelect');
    const $url = document.getElementById('url');
    const canvas = document.getElementById('game');
    const context = canvas.getContext('2d');
    const grid = 15;
    const paddleHeight = 100
    const maxPaddleY = canvas.height - grid - paddleHeight;
    const video1 = document.getElementById('myCamera');
    const video2 = document.getElementById('otherCamera');


    let socket;
    let myStream;
    let peer;
    let globalCor = "data:notStarted";
    let paddleSpeed = 6;
    let ballSpeed = 5;


    const servers = {
      iceServers: [{
        urls: 'stun:stun.l.google.com:19302'
      }]
    };

    const init = async () => {
      initSocket();
      $peerSelect.addEventListener('input', callSelectedPeer);
      const constraints = { audio: true, video: { width: 1280, height: 720 } };
      myStream = await navigator.mediaDevices.getUserMedia(constraints);
      $myCamera.srcObject = myStream;
      $myCamera.onloadedmetadata = () => $myCamera.play();
      document.querySelector("#permission").addEventListener("click", e => checkPermission(e))
       const url = `${new URL(``, window.location)}`;
          $url.textContent = url;
          $url.setAttribute('href', url);
          const typeNumber = 4;
          const errorCorrectionLevel = 'L';
          const qr = qrcode(typeNumber, errorCorrectionLevel);
          qr.addData(url);
          qr.make();
          document.getElementById('qr').innerHTML = qr.createImgTag(4);
    };

    const checkPermission = () => {
    
      if (typeof DeviceMotionEvent.requestPermission === 'function' && DeviceMotionEvent.requestPermission) {
        // Handle iOS 13+ devices.
        DeviceMotionEvent.requestPermission()
          .then((state) => {
            if (state === 'granted') {
              window.addEventListener('devicemotion', handleOrientation);
            } else {
              console.error('Request to access the orientation was rejected');
            }
          })
          .catch(console.error);
      } else {
        // Handle regular non iOS 13+ devices.
        window.addEventListener('devicemotion', handleOrientation);
      }
    }

    const initSocket = () => {
      socket = io.connect('/');
      socket.on('connect', () => {
      });
      socket.on('clients', updatePeerList);
      socket.on('client-disconnect', (client) => {
        if (peer && peer.data.id === client.id) {
          peer.destroy();
        }
      });
      socket.on('signal', async (myId, signal, peerId) => {
        console.log(`Received signal from ${peerId}`);
        console.log(signal);
        if (peer) {
          peer.signal(signal);
        } else if (signal.type === 'offer') {
          createPeer(false, peerId);
          peer.signal(signal);
        }
      });
    };

    const updatePeerList = (clients) => {
      $peerSelect.innerHTML = '<option value="none">select a device</option>';
      for (const clientId in clients) {
        const isMyOwnId = (clientId === socket.id);
        if (clients.hasOwnProperty(clientId) && !isMyOwnId) {
          const client = clients[clientId];
          const $option = document.createElement('option');
          $option.value = clientId;
          $option.textContent = clientId;
          $peerSelect.appendChild($option);
        }
      }
    };

    const callSelectedPeer = async () => {
      if ($peerSelect.value === 'none') {
        if (peer) {
          peer.destroy();
          return;
        }
      }

      createPeer(true, $peerSelect.value);
    };

    const createPeer = (initiator, peerId) => {
  
      peer = new SimplePeer({ initiator, stream: myStream });
      peer.data = {
        id: peerId
      };
      peer.on('signal', data => {
        socket.emit('signal', peerId, data);
      });
      peer.on('stream', stream => {
        $otherCamera.srcObject = stream;
      });
      peer.on('close', () => {
        console.log('closed');
        peer.destroy();
        peer = null;
      });
      peer.on('error', () => {
        console.log('error');
      });

      peer.on('connect', () => {
        console.log('CONNECT')
        peer.send('isconnected')
        
      })

      window.addEventListener("deviceorientation", function (event) {
        peer.send(event.beta)
      }, true);
    
      peer.on('data', data => {
        globalCor = 'data:' + data
      })
    };


// pong game based on this repo: https://gist.github.com/straker/81b59eecf70da93af396f963596dfdc5


  const leftPaddle = {
    // start in the middle of the game on the left side
    x: grid * 2,
    y: canvas.height / 2 - paddleHeight / 2,
    width: grid,
    height: paddleHeight,

    // paddle velocity
    dy: 0
  };
  const rightPaddle = {
    // start in the middle of the game on the right side
    x: canvas.width - grid * 3,
    y: canvas.height / 2 - paddleHeight / 2,
    width: grid,
    height: paddleHeight,

    // paddle velocity
    dy: 0
  };
  const ball = {
    // start in the middle of the game
    x: canvas.width / 2,
    y: canvas.height / 2,
    width: grid,
    height: grid,

    // keep track of when need to reset the ball position
    resetting: false,

    // ball velocity (start going to the top-right corner)
    dx: ballSpeed,
    dy: -ballSpeed
  };

  // check for collision between two objects using axis-aligned bounding box (AABB)
  // @see https://developer.mozilla.org/en-US/docs/Games/Techniques/2D_collision_detection
  function collides(obj1, obj2) {
    return obj1.x < obj2.x + obj2.width &&
      obj1.x + obj1.width > obj2.x &&
      obj1.y < obj2.y + obj2.height &&
      obj1.y + obj1.height > obj2.y;
  }

  // game loop
  const loop =  () => {
    const usefullCor = parseInt(globalCor.split(":")[1])

    if(!isNaN(usefullCor)){
      document.querySelector(`.link`).style.display = "none";
      document.querySelector(`.canv`).style.display = "block";
    }


    requestAnimationFrame(loop);
    context.clearRect(0, 0, canvas.width, canvas.height);

    // move paddles by their velocity
    leftPaddle.y += leftPaddle.dy;
    rightPaddle.y += rightPaddle.dy;

    // prevent paddles from going through walls
    if (leftPaddle.y < grid) {
      leftPaddle.y = grid;
    }
    else if (leftPaddle.y > maxPaddleY) {
      leftPaddle.y = maxPaddleY;
    }

    if (rightPaddle.y < grid) {
      rightPaddle.y = grid;
    }
    else if (rightPaddle.y > maxPaddleY) {
      rightPaddle.y = maxPaddleY;
    }

    // draw paddles
    context.fillStyle = '#73BDA8';
    context.fillRect(leftPaddle.x, leftPaddle.y, leftPaddle.width, leftPaddle.height);
    context.fillRect(rightPaddle.x, rightPaddle.y, rightPaddle.width, rightPaddle.height);

    // move ball by its velocity
    ball.x += ball.dx;
    ball.y += ball.dy;

    // prevent ball from going through walls by changing its velocity
    if (ball.y < grid) {
      ball.y = grid;
      ball.dy *= -1;
    }
    else if (ball.y + grid > canvas.height - grid) {
      ball.y = canvas.height - grid * 2;
      ball.dy *= -1;
    }

    // reset ball if it goes past paddle (but only if we haven't already done so)
    if ((ball.x < 0 || ball.x > canvas.width) && !ball.resetting) {
      ball.resetting = true;
      console.log("eruit")

      // give some time for the player to recover before launching the ball again
      setTimeout(() => {
        ball.resetting = false;
        ball.x = canvas.width / 2;
        ball.y = canvas.height / 2;
      }, 400);
    }

    // check to see if ball collides with paddle. if they do change x velocity
    if (collides(ball, leftPaddle)) {
      ball.dx *= -1;

      // move ball next to the paddle otherwise the collision will happen again
      // in the next frame
      ball.x = leftPaddle.x + leftPaddle.width;
    }
    else if (collides(ball, rightPaddle)) {
      ball.dx *= -1;

      // move ball next to the paddle otherwise the collision will happen again
      // in the next frame
      ball.x = rightPaddle.x - ball.width;
    }

    // draw ball
    context.fillRect(ball.x, ball.y, ball.width, ball.height);


    var img = document.getElementById("img");
    img.src = "https://res.cloudinary.com/d4life4221imgcldnrccca/image/upload/v1620050202/dev4mhpimages/zf2t2msz0kqdomzctdgw.png";
    context.drawImage(img, ball.x, ball.y, ball.width, ball.height);

    // draw walls
    context.fillStyle = '#CC6B49';
    context.fillRect(0, 0, canvas.width, grid);
    context.fillRect(0, canvas.height - grid, canvas.width, canvas.height);

    // draw dotted line down the middle
    for (let i = grid; i < canvas.height - grid; i += grid * 2) {
      context.fillRect(canvas.width / 2 - grid / 2, i, grid, grid);
    }

    if (usefullCor > 50) {
      leftPaddle.dy = paddleSpeed;
    } else {
      leftPaddle.dy = -paddleSpeed;
    }


   video1.style.transform = `translate(55.5rem, ${((rightPaddle.y-800))/10}rem)`
   video2.style.transform = `translate(-59rem, ${((leftPaddle.y-800))/10}rem)`


  }


  // listen to keyboard events to move the paddles
  document.addEventListener('keydown', function (e) {
    e.preventDefault();

    // up arrow key
    if (e.which === 38) {
      rightPaddle.dy = -paddleSpeed;

    }
    // down arrow key
    else if (e.which === 40) {
      rightPaddle.dy = paddleSpeed;

    }

    // w key
    if (e.which === 87) {
      leftPaddle.dy = -paddleSpeed;
    }
    // a key
    else if (e.which === 83) {
      leftPaddle.dy = paddleSpeed;
    }
  });

  // listen to keyboard events to stop the paddle if key is released
  document.addEventListener('keyup', function (e) {
  e.preventDefault();
    if (e.which === 38 || e.which === 40) {
      rightPaddle.dy = 0;

    }

    if (e.which === 83 || e.which === 87) {
      leftPaddle.dy = 0;

    }
  });


  init();
  requestAnimationFrame(loop);