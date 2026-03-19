// =============================================
// firebase.ts
// 📁 위치: 프로젝트 루트 (App.tsx 와 같은 폴더)
// =============================================

import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyCeRkbnVkN-sxxRQ5cWYhrxosZBx1qyO70",
  authDomain: "veraka-app.firebaseapp.com",
  projectId: "veraka-app",
  storageBucket: "veraka-app.firebasestorage.app",
  messagingSenderId: "271617175371",
  appId: "1:271617175371:web:c2043a3a30002ecd5d42ce"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// FCM 토큰 발급
export const getFCMToken = async (): Promise<string | null> => {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('푸시 알림 권한 거부됨');
      return null;
    }
    const token = await getToken(messaging, {
      vapidKey: "BC7wcWGjIdwDEWNnWjz_98IOKh9aBWMocl1o5vrfPGuN50JE3I19PMsdbVAoHsqRsm8BuBMI_uYguOz5k5kdwhU"
    });
    console.log('✅ FCM 토큰:', token);
    return token;
  } catch (err) {
    console.error('FCM 토큰 발급 실패:', err);
    return null;
  }
};

// 앱 열려있을 때 푸시 수신
export const onForegroundMessage = (callback: (payload: any) => void) => {
  return onMessage(messaging, callback);
};

export { messaging };
