import { initializeApp as _initializeApp } from 'firebase/app';
import * as firebaseApp from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, collection, getDocs, writeBatch, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { TrainingConfig } from '../types';

const firebaseConfig = {
  apiKey: "AIzaSyAclPOtYAosW7pJRXEqxb49LlkJUrgIB5w",
  authDomain: "protocol-ai-c44ca.firebaseapp.com",
  projectId: "protocol-ai-c44ca",
  storageBucket: "protocol-ai-c44ca.firebasestorage.app",
  messagingSenderId: "127473514674",
  appId: "1:127473514674:web:a76af6a8a1dcf176b531ab",
  measurementId: "G-FJKH1X826X"
};

// Use namespace import to avoid 'no exported member' errors in strict environments
const app = firebaseApp.initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

// Helper: Update Title
export const updateConversationTitle = async (userId: string, conversationId: string, newTitle: string) => {
  const ref = doc(db, 'users', userId, 'conversations', conversationId);
  await updateDoc(ref, { title: newTitle });
};

// Helper: Batch Delete All
export const deleteAllUserConversations = async (userId: string) => {
  const batch = writeBatch(db);
  const q = collection(db, 'users', userId, 'conversations');
  const snapshot = await getDocs(q);
  
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
};

// Helper: Training Config
export const saveUserTrainingConfig = async (userId: string, config: TrainingConfig) => {
  const ref = doc(db, 'users', userId, 'settings', 'training');
  await setDoc(ref, config);
};

export const getUserTrainingConfig = async (userId: string): Promise<TrainingConfig | null> => {
  const ref = doc(db, 'users', userId, 'settings', 'training');
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return snap.data() as TrainingConfig;
  }
  return null;
};