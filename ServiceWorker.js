const CACHE_NAME = 'test-web-app-cache-SRPUSH';
const urlsToCache = [
  // '/'
  // '/styles/main.css',
  // '/scripts/app.js',
  // '/scripts/lib.js'
];

sendMessage = (data) => {
  self.clients.matchAll().then(all => all.forEach(client => {
    client.postMessage(data);
  }));

    try {
        data = JSON.parse(data);
        self.registration.showNotification(title, {
            body: 'new message recived',
            icon: '/images/icon.png',
            vibrate: [200, 100, 200, 100],
            tag: 'SRPUSH'
        }).catch((e) => console.log('notification permission dined'));
    } catch (e) {};
};

self.addEventListener('fetch', (event) => {
  console.log('fetch event'); 

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // if (response) {
        //   return response;
        // }

        const fetchRequest = event.request.clone();
        return fetch(fetchRequest).then(
          (res) => {
            if (!res || res.status !== 200 || res.type !== 'basic') {
              return res;
            }
            const responseToCache = res.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                // Add the request to the cache for future queries.
                cache.put(event.request, responseToCache);
              });

            return res;
          }
        );
      })
      .catch(() => {})
    );
});

self.addEventListener('install', (event) => {
  console.log('install event');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('message', (event) => {
    if (typeof event.data === 'string' && event.data.indexOf("connect/*/") > -1) {
        console.log('connect recieved');
        const details = event.data.split("/*/");
        HOST = details[1];
        SESSION = details[2];
        connectWS();
        return;
    } else if (event.data === "disconnect") {
        console.log("disconnect recieved");
        clearInterval(onlineChecker);
        onlineChecker = null;
        HOST = null;
        SESSION = null;
        if (webSocket) {
            webSocket.close();
            webSocket = null;
        }
        return;
    }
    sendMessage(event.data);
});

// --------- ws -----------

let webSocket = null;
let onlineChecker = null;
let lastPing = new Date().getTime();
let HOST = null;
let SESSION = null;

// ----
serializeQS = (obj, prefix) => {
    const str = []; 
    let p;

    for (p in obj) {
        if (obj.hasOwnProperty(p)) {
        let k = prefix ? prefix + '[' + p + ']' : p,
            v = obj[p];
        str.push((v !== null && typeof v === 'object') ?
            serialize(v, k) :
            encodeURIComponent(k) + '=' + encodeURIComponent(v));
        }
    }
    return str.join('&');
};

startChecker = () => {
  if (!SESSION) {
    this.disconnect();
    return;
  } else if (onlineChecker) {
    clearInterval(onlineChecker);
    onlineChecker = null;
  }

  onlineChecker = setInterval(() => {
    const now = new Date().getTime();
    if ((now - lastPing) > 8000) { // 8sec
        console.log('client is now offline');
        sendMessage("status:close");
        webSocket = null;
        connectWS();
    }
  }, 8000);
};

// ----
connectWS = () => {
    if (webSocket) {
        return;
    } else if (!HOST || !SESSION) {
        console.log('session not set');
    }
    
    let webSocketURL = null;
    queryString = serializeQS({ session: SESSION });

    webSocketURL = HOST + '/' + queryString;
    console.log('connectWS::Connecting to: ' + webSocketURL);
    sendMessage("status:connecting");

    try {
        webSocket = new WebSocket(webSocketURL);
        webSocket.onopen = (openEvent) => {
            onOpenFunc(openEvent);
        };
        webSocket.onclose = (closeEvent) => {
            onCloseFunc(closeEvent);
        };
        webSocket.onerror = (errorEvent) => {
            sendMessage("status:close");
            console.log('WebSocket ERROR: ' + JSON.stringify(errorEvent, null, 4));
        };
        webSocket.onmessage = (messageEvent) => {
            onMessageFunc(messageEvent);
        };

    } catch (exception) {
        console.error(exception);
    }
};

onCloseFunc = (closeEvent) => {
    if (!onlineChecker && HOST && SESSION) {
        startChecker();
    }
    console.log('WebSocket CLOSE: ' + JSON.stringify(closeEvent, null, 4));
    sendMessage("status:close");
};

onOpenFunc = (openEvent) => {
    if (!onlineChecker) {
        startChecker();
    }
    console.log('WebSocket OPEN: ' + JSON.stringify(openEvent, null, 4));
    sendMessage("status:open");
};

onMessageFunc = (messageEvent) => {
    try {
        let wsMsg = messageEvent.data;

        if (wsMsg === 'pi') { // it's ping
            webSocket.send('po'); // say pong
            lastPing = new Date().getTime();
            console.log('ping')
            return;
        }

        console.log('WebSocket MESSAGE: ' + wsMsg);
        sendMessage(wsMsg);
        wsMsg = JSON.parse(wsMsg);
        webSocket.send(JSON.stringify({
            MsgDT: { MsgType: 1, Data: { _id: wsMsg._id } },
            SeId: SESSION, // put SESSION here
            ReId: '0',
        }));
    } catch (error) {} // sometimes connection brokes before sending messages - take it easy or check error.
};
