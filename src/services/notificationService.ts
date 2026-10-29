
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// These would normally come from your firebase-applet-config.json
const firebaseConfig = {
  apiKey: "placeholder",
  authDomain: "placeholder",
  projectId: "placeholder",
  storageBucket: "placeholder",
  messagingSenderId: "placeholder",
  appId: "placeholder"
};

export async function requestNotificationPermission() {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Notification permission granted.');
      return true;
    } else {
      console.log('Unable to get permission to notify.');
      return false;
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}

export async function getFCMToken() {
  try {
    const response = await fetch('/firebase-applet-config.json');
    const config = await response.json();
    const app = initializeApp(config);
    const messaging = getMessaging(app);
    
    const token = await getToken(messaging, { 
      vapidKey: 'YOUR_PUBLIC_VAPID_KEY' // You need to generate this in Firebase Console
    });
    
    if (token) {
      console.log('FCM Token:', token);
      return token;
    } else {
      console.log('No registration token available. Request permission to generate one.');
      return null;
    }
  } catch (error) {
    console.error('An error occurred while retrieving token:', error);
    return null;
  }
}

export function onMessageListener() {
  return new Promise((resolve) => {
    // This is only for foreground messages
    // Background messages are handled by the service worker
    try {
      const messaging = getMessaging();
      onMessage(messaging, (payload) => {
        console.log('Message received in foreground: ', payload);
        resolve(payload);
      });
    } catch (e) {
      console.warn('Messaging not supported or initialized');
    }
  });
}
