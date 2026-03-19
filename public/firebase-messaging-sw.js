// =============================================
// firebase-messaging-sw.js
// 📁 위치: public 폴더 안에 넣으세요!
//    (public/firebase-messaging-sw.js)
// =============================================
// 앱이 꺼져있을 때도 푸시 받는 파일이에요

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCeRkbnVkN-sxxRQ5cWYhrxosZBx1qyO70",
  authDomain: "veraka-app.firebaseapp.com",
  projectId: "veraka-app",
  storageBucket: "veraka-app.firebasestorage.app",
  messagingSenderId: "271617175371",
  appId: "1:271617175371:web:c2043a3a30002ecd5d42ce"
});

const messaging = firebase.messaging();

// 백그라운드 푸시 수신
messaging.onBackgroundMessage((payload) => {
  console.log('백그라운드 푸시 수신:', payload);
  const title = payload.notification?.title || '베라카 알림';
  const body = payload.notification?.body || '';

  self.registration.showNotification(title, {
    body,
    icon: '/vite.svg',
    badge: '/vite.svg',
    vibrate: [500, 200, 500, 200, 500]
  });
});
