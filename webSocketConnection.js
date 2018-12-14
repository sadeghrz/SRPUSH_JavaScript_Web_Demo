let webSocket = null;
let onlineChecker = null;
let lastPing = new Date().getTime();
let HOST = null;
let SESSION = null;
let SUBINFO = null;
let messageCB = () => {};

function startWS(wsHost, _session, subscriptionInfo, mCB) {
  console.log('connect recieved');
  if (messageCB) {
    messageCB = mCB;
  }
  HOST = wsHost;
  SESSION = _session;
  SUBINFO = subscriptionInfo;
  connectWS();
}

function disConnectWS() {
  console.log("disconnect recieved");
  clearInterval(onlineChecker);
  onlineChecker = null;
  HOST = null;
  SESSION = null;
  SUBINFO = null;
  if (webSocket) {
      webSocket.close();
      webSocket = null;
  }
  return;
}

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
        messageCB("status:offline");
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
    queryString = serializeQS({ session: SESSION, platform: 'JSWeb', platformtools: SUBINFO });

    webSocketURL = HOST + '/' + queryString;
    console.log('connectWS::Connecting to: ' + webSocketURL);
    messageCB("status:connecting");

    try {
        webSocket = new WebSocket(webSocketURL);
        webSocket.onopen = (openEvent) => {
            onOpenFunc(openEvent);
        };
        webSocket.onclose = (closeEvent) => {
            onCloseFunc(closeEvent);
        };
        webSocket.onerror = (errorEvent) => {
          messageCB("status:offline");
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
    messageCB("status:offline");
};

onOpenFunc = (openEvent) => {
    if (!onlineChecker) {
        startChecker();
    }
    console.log('WebSocket OPEN: ' + JSON.stringify(openEvent, null, 4));
    messageCB("status:online");
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
        wsMsg = JSON.parse(wsMsg);
        messageCB(wsMsg);
        webSocket.send(JSON.stringify({
            MsgDT: { MsgType: 1, Data: { _id: wsMsg._id } },
            SeId: SESSION, // put SESSION here
            ReId: '0',
        }));
    } catch (error) {} // sometimes connection brokes before sending messages - take it easy or check error.
};