function base64UrlToUint8Array(base64UrlData) {
  const padding = '='.repeat((4 - base64UrlData.length % 4) % 4);
  const base64 = (base64UrlData + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  const rawData = atob(base64);
  const buffer = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    buffer[i] = rawData.charCodeAt(i);
  }
  return buffer;
}

function registerAndSubscribeForPush(cb) {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      // send message to SW:
      // navigator.serviceWorker.controller.postMessage('hi');
      
      navigator.serviceWorker.register('/ServiceWorker.js').then((registration) => {
        console.log('ServiceWorker registration successful');
        if (Notification.permission !== 'granted') {
          Notification.requestPermission();
        }
  
        navigator.serviceWorker.ready.then((SWR) => {
          SWR.pushManager
              .subscribe({
                  userVisibleOnly: true,
                  applicationServerKey: window.vapidPublicKey
              })
              .then(cb)
              .catch((e) => {
                if (e.code === 11) {
                  SWR.pushManager.getSubscription().then(sub => sub ? sub.unsubscribe() : null).catch((e) => console.log('unsubscribe faild', e));
                } else {
                  console.log('subscription faild', e);
                }
              })
        });
  
      }, (err) => {
        console.log('ServiceWorker registration failed: ', err);
      });
    });
  }
}
