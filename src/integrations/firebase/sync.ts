import {
  onSnapshot,
  query,
  where,
  collection,
  doc,
  setDoc,
  deleteDoc,
  getFirestore
} from 'firebase/firestore';

import { getCurrentGoogleUser, getFirebaseApp } from './auth';

const db = getFirestore(getFirebaseApp());

/**
 * 🚀 PUSH UPDATE TO CLOUD
 */
export async function pushUpdateToCloud(update: any, targetEmail: string) {
  const user = getCurrentGoogleUser();
  if (!user?.email) return;

  const targetEmailLower = targetEmail.toLowerCase().trim();
  const senderEmailLower = user.email.toLowerCase().trim();

  try {
    // Deterministic ID → prevents duplicates, uniquely tagged per target
    const docId = `${senderEmailLower}_${update.expense?.id || update.id}_${targetEmailLower}_${update.type || 'added'}`;
    const collectionName = (update.groupName || update.expense?.groupId) ? 'sync_group' : 'sync_inbox';

    await setDoc(doc(db, collectionName, docId), {
      ...update,
      targetEmail: targetEmailLower,
      fromEmail: senderEmailLower,
      fromName: user.displayName || update.fromName || 'Friend',
      createdAt: Date.now(), // ✅ stable ordering locally
      ttlExpireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // ✅ 30-day auto-expiry (User can map TTL to this field)
    });

  } catch (error) {
    console.error('❌ Failed to push sync update:', error);
  }
}


/**
 * 📡 REAL-TIME LISTENER
 */
export function subscribeToMySyncUpdates(
  callback: (updates: any[]) => void
) {
  const user = getCurrentGoogleUser();
  if (!user?.email) return () => { };

  const myEmail = user.email.toLowerCase().trim();

  const qInbox = query(
    collection(db, 'sync_inbox'),
    where('targetEmail', '==', myEmail)
  );

  const qGroup = query(
    collection(db, 'sync_group'),
    where('targetEmail', '==', myEmail)
  );

  const handleSnapshot = (snapshot: any, colName: string) => {
    console.log(`✅ SNAPSHOT SIZE [${colName}]:`, snapshot.size);

    const updates = snapshot.docChanges()
      .filter((change: any) => {
        const data = change.doc.data();
        if (!data?.expense || !data?.fromEmail) return false;
        if (data.fromEmail === myEmail) return false;
        return change.type === 'added';
      })
      .map((change: any) => ({
        ...change.doc.data(),
        id: change.doc.data().id, // Preserve inner ID
        syncDocId: change.doc.id, // 🔥 Required for acknowledgement
        syncCollection: colName,  // Determine which col to delete from
        isCloudUpdate: true
      }))
      .sort((a: any, b: any) => (a.createdAt || 0) - (b.createdAt || 0)); // Local fallback for ordering

    if (updates.length > 0) {
      console.log(`🔥 RECEIVED [${colName}]:`, updates);
      callback(updates);
    }
  };

  const unsubInbox = onSnapshot(qInbox, s => handleSnapshot(s, 'sync_inbox'), e => console.error("❌ INBOX ERROR:", e));
  const unsubGroup = onSnapshot(qGroup, s => handleSnapshot(s, 'sync_group'), e => console.error("❌ GROUP ERROR:", e));

  return () => { unsubInbox(); unsubGroup(); };
}


/**
 * 📥 MANUAL FETCH (ONE-SHOT)
 */
export async function fetchMySyncUpdates(): Promise<any[]> {
  const user = getCurrentGoogleUser();
  if (!user?.email) return [];

  const myEmail = user.email.toLowerCase().trim();
  const { getDocs } = await import('firebase/firestore');

  const qInbox = query(
    collection(db, 'sync_inbox'),
    where('targetEmail', '==', myEmail)
  );

  const qGroup = query(
    collection(db, 'sync_group'),
    where('targetEmail', '==', myEmail)
  );

  try {
    const [snapInbox, snapGroup] = await Promise.all([
      getDocs(qInbox),
      getDocs(qGroup)
    ]);

    const docsIn = snapInbox.docs.map(doc => ({
      ...doc.data(),
      id: doc.data().id,
      syncDocId: doc.id,
      syncCollection: 'sync_inbox',
      isCloudUpdate: true
    }));

    const docsGrp = snapGroup.docs.map(doc => ({
      ...doc.data(),
      id: doc.data().id,
      syncDocId: doc.id,
      syncCollection: 'sync_group',
      isCloudUpdate: true
    }));

    return [...docsIn, ...docsGrp]
      .sort((a: any, b: any) => (a.createdAt || 0) - (b.createdAt || 0))
      .filter((data: any) => data.fromEmail !== myEmail);
  } catch (error) {
    console.error('❌ Failed to fetch sync updates:', error);
    return [];
  }
}

/**
 * ✅ ACKNOWLEDGE (DELETE FROM INBOX)
 */
export async function acknowledgeUpdate(docId: string, collectionName: string = 'sync_inbox') {
  try {
    await deleteDoc(doc(db, collectionName, docId));
  } catch (error) {
    console.error(`❌ Failed to acknowledge update in ${collectionName}:`, error);
  }
}