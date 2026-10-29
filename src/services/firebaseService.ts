
import { ScoutingReport } from '../types';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, doc, setDoc, query, orderBy, getDocs, onSnapshot, serverTimestamp } from 'firebase/firestore';

/**
 * FIREBASE SERVICE CONFIGURATION
 */
const getFirebaseConfig = async () => {
  try {
    const response = await fetch('/firebase-applet-config.json');
    if (!response.ok) throw new Error('No config found');
    return await response.json();
  } catch (e) {
    return null;
  }
};

let dbInstance: any = null;

export async function getDb() {
  if (dbInstance) return dbInstance;
  const config = await getFirebaseConfig();
  if (!config) return null;
  const app = initializeApp(config);
  dbInstance = getFirestore(app);
  return dbInstance;
}

export async function saveMatchToFirestore(report: ScoutingReport): Promise<void> {
  const db = await getDb();
  if (!db) {
    // Fallback to local storage if Firebase not configured
    const STORAGE_KEY = 'lol_scouting_matches';
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    existing.push(report);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    return;
  }

  try {
    await addDoc(collection(db, 'scouting_reports'), {
      ...report,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error saving to Firestore:', error);
    throw error;
  }
}

export async function saveFCMTokenToFirestore(userId: string, token: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    // Store in a dedicated collection for the server to find easily
    await setDoc(doc(db, 'fcm_tokens', token), {
      userId,
      updatedAt: serverTimestamp()
    });
    
    // Also store in user's profile for 1-to-1 mapping
    await setDoc(doc(db, `users/${userId}/fcm_tokens`, token), {
      token,
      lastUpdated: serverTimestamp()
    });
  } catch (error) {
    console.error('Error saving FCM token:', error);
  }
}

export async function subscribeToChatMessages(channelId: string, callback: (messages: any[]) => void) {
  const db = await getDb();
  if (!db) return;

  const q = query(
    collection(db, 'chat_messages'),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })).filter((msg: any) => msg.channelId === channelId);
    callback(messages);
  });
}

import { moderateChatMessage } from './geminiService';

export async function sendChatMessage(channelId: string, senderId: string, senderName: string, text: string) {
  const db = await getDb();
  if (!db) return;

  const { isToxic, reason } = await moderateChatMessage(text);

  const messageDoc = await addDoc(collection(db, 'chat_messages'), {
    channelId,
    senderId,
    senderName,
    text,
    isToxic,
    createdAt: serverTimestamp()
  });

  if (isToxic) {
    await addDoc(collection(db, 'moderation_logs'), {
      messageId: messageDoc.id,
      timestamp: serverTimestamp(),
      userId: senderId,
      originalMessage: text,
      violationReason: reason
    });
  }
}


export async function updateUserDocs(userId: string, updates: Partial<any>): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    const { updateDoc } = await import('firebase/firestore');
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating user document:', error);
  }
}

export async function createUserDoc(userData: any): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    const uid = userData.uid || crypto.randomUUID();
    await setDoc(doc(db, 'users', uid), {
      ...userData,
      uid,
      status: 'Active',
      school: 'Basha',
      isApproved: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error creating user document:', error);
    throw error;
  }
}

export async function publishCoachBroadcast(authorId: string, text: string) {
  const db = await getDb();
  if (!db) return;

  await addDoc(collection(db, 'coach_broadcasts'), {
    authorId,
    text,
    createdAt: serverTimestamp()
  });
}
