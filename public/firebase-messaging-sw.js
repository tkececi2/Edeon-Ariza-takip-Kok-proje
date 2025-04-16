importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAGLu35FxS8Z51SBdpOvoaAdqPSG0l2di4",
  authDomain: "arizalar-955b6.firebaseapp.com",
  projectId: "arizalar-955b6",
  storageBucket: "arizalar-955b6.firebasestorage.app",
  messagingSenderId: "802092171880",
  appId: "1:802092171880:web:0ab6c609e002ed22a531dd"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});