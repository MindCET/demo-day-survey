
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithRedirect, getRedirectResult, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, onSnapshot, query, orderBy, addDoc, getDocs } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth();
const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export const loginWithGoogle = async () => {
  await signInWithRedirect(auth, googleProvider);
};

export const handleRedirectResult = async () => {
  try {
    const result = await getRedirectResult(auth);
    return result?.user || null;
  } catch (error) {
    console.error("Redirect result failed:", error);
    throw error;
  }
};

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // Not throwing error to prevent UI crash, just logging
}

// Seed initial global settings if not exists
export const initSettings = async () => {
  try {
    const configDoc = doc(db, 'config', 'global');
    const snap = await getDoc(configDoc);
    if (!snap.exists()) {
      await setDoc(configDoc, {
        pollStatus: 'draft',
        totalBudget: 200000,
        minAllocation: 0,
        title: 'MindCET Demo Day 2024'
      });
    }
  } catch (e) {
    console.warn("Settings init deferred - likely no permission yet");
  }
};

export const seedDemoData = async () => {
  const startups = [
    { name: 'Learnio AI', description: 'Personalized AI tutor for K-12 students.', order: 0 },
    { name: 'ClassVR', description: 'Immersive virtual reality classrooms for history.', order: 1 },
    { name: 'SkillSync', description: 'Real-time teacher-student feedback platform.', order: 2 },
    { name: 'Pathways', description: 'AI-driven career guidance for graduates.', order: 3 },
    { name: 'EduBlock', description: 'Blockchain-based secure academic credentials.', order: 4 },
  ];

  // 1. Clear existing (optional, but for clean demo let's just add)
  const startupsRef = collection(db, 'startups');
  for (const s of startups) {
    await addDoc(startupsRef, {
      ...s,
      imageUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${s.name}`
    });
  }

  // 2. Set poll to active
  await updateDoc(doc(db, 'config', 'global'), {
    pollStatus: 'active',
    totalBudget: 200000
  });

  // 3. Create dummy votes
  const votesRef = collection(db, 'votes');
  const startupDocs = await getDocs(startupsRef);
  const startupIds = startupDocs.docs.map(d => d.id);

  for (let i = 0; i < 20; i++) {
    const allocations: { [key: string]: number } = {};
    let remaining = 200000;
    
    // Randomly allocate to 2-3 startups
    const chosen = startupIds.sort(() => 0.5 - Math.random()).slice(0, 3);
    chosen.forEach((id, idx) => {
      const amount = idx === 2 ? remaining : Math.floor(Math.random() * (remaining / 2) / 5000) * 5000;
      allocations[id] = amount;
      remaining -= amount;
    });

    await setDoc(doc(db, 'votes', `dummy_investor_${i}`), {
      investorId: `dummy_investor_${i}`,
      allocations,
      totalAllocated: 200000 - remaining,
      timestamp: new Date().toISOString()
    });
  }
};
