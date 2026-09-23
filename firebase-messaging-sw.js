importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAKE19p1hkJLJJUzZWuDbmWPZrub5SBgjo",
  authDomain: "gen-lang-client-0172887918.firebaseapp.com",
  projectId: "gen-lang-client-0172887918",
  storageBucket: "gen-lang-client-0172887918.firebasestorage.app",
  messagingSenderId: "525445149816",
  appId: "1:525445149816:web:82b901bb7cd87e2438a98d"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification || {};
  self.registration.showNotification(title || 'IG Escala', {
    body: body || 'Você tem uma nova notificação.',
    icon: icon || '/icon.png',
    badge: '/icon.png',
    tag: payload.collapseKey || 'ig-escala-notif',
    renotify: true,
    data: payload.data || {},
    actions: [
      { action: 'open', title: 'Ver Escala' },
      { action: 'dismiss', title: 'Fechar' }
    ]
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow('/');
    })
  );
});
