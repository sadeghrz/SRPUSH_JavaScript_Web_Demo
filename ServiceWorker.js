self.addEventListener("push", (event) => {
    console.log('push recieve');
    console.log(event);
    
    var data = {}; 
    if (event.data) {
        data = event.data.json();
    }

    self.clients.matchAll().then(all => all.forEach(client => {
        client.postMessage(data);
    }));

    var title = data.title || "Untitled";
    var message = data.message || "Empty";
    var tag = data.tag || null;
    var icon = data.icon || null;
    var url = data.url;

    event.waitUntil(
      self.registration.showNotification(title, {
        body: message,
        tag: tag,
        icon: icon,
        data: url
       })
    );
});

self.addEventListener('notificationclick', (event) => {
    var url = event.notification.data;
    if (url) {
        clients.openWindow(url);
    } else {
        return;
    }
});
