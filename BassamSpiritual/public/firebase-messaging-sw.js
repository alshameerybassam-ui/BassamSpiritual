// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyC6fxUO1S-bXV8FtJmS9wyK_gVAuuFQK_c",
  authDomain: "noor-rabbani.firebaseapp.com",
  projectId: "noor-rabbani",
  storageBucket: "noor-rabbani.firebasestorage.app",
  messagingSenderId: "33651574429",
  appId: "1:33651574429:web:2aaab752ec8358a0f53674"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[sw] إشعار في الخلفية:', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon-192.png'
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});
