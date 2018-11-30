if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // send message to SW:
    // navigator.serviceWorker.controller.postMessage('hi');
    
    navigator.serviceWorker.register('/SW/ServiceWorker.js').then((registration) => {
      console.log('ServiceWorker registration successful');
      if (Notification.permission !== 'granted') {
        Notification.requestPermission();
      }
    }, (err) => {
      console.log('ServiceWorker registration failed: ', err);
    });
  });
}
  
