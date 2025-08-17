'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { getFirestore, doc, setDoc, runTransaction, collection, query, where, getDocs, serverTimestamp, writeBatch, documentId, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  projectId: 'jongdalsem-hub',
  appId: '1:145118642611:web:3d29407e957e6ea4f18bc6',
  storageBucket: 'jongdalsem-hub.firebasestorage.app',
  apiKey: 'AIzaSyCKRYChw1X_FYRhcGxk13B_s2gOgZoZiyc',
  authDomain: 'jongdalsem-hub.firebaseapp.com',
  measurementId: '',
  messagingSenderId: '145118642611',
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

const generateJongdalCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Sign up function
export const signUp = async (studentId: string, password: string, email: string) => {
  if (!/^\d{5}$/.test(studentId)) {
    throw new Error('학번은 5자리 숫자여야 합니다.');
  }
  
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Store user data in Firestore
    await setDoc(doc(db, "users", user.uid), {
      studentId: studentId,
      email: email, // The user's actual email
      jongdalCode: generateJongdalCode(),
      lak: 0,
      createdAt: serverTimestamp(),
    });

    return user;
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('이미 사용 중인 이메일입니다.');
    }
    if (error.code === 'auth/weak-password') {
      throw new Error('비밀번호는 6자리 이상이어야 합니다.');
    }
    if (error.code === 'auth/invalid-email') {
      throw new Error('유효하지 않은 이메일 주소입니다.');
    }
    throw new Error('회원가입 중 오류가 발생했습니다.');
  }
};

// Sign in function
export const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
    }
    throw new Error('로그인 중 오류가 발생했습니다.');
  }
};

// Sign out function
export const handleSignOut = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out: ", error);
    throw new Error('로그아웃 중 오류가 발생했습니다.');
  }
};

// Use Code function
export const useCode = async (userId: string, inputCode: string) => {
  const upperCaseCode = inputCode.toUpperCase();

  return await runTransaction(db, async (transaction) => {
    // 1. Get user data
    const userRef = doc(db, 'users', userId);
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists()) {
      throw "존재하지 않는 사용자입니다.";
    }
    const userData = userDoc.data();

    // 2. Check if user is trying to use their own Jongdal code
    if (userData.jongdalCode === upperCaseCode) {
      throw "자신의 종달코드는 사용할 수 없습니다.";
    }

    // 3. Check for a code in the 'codes' collection first
    const codesQuery = query(collection(db, 'codes'), where('code', '==', upperCaseCode));
    const codesSnapshot = await getDocs(codesQuery);

    if (!codesSnapshot.empty) {
      const codeDoc = codesSnapshot.docs[0];
      const codeRef = codeDoc.ref;
      const codeData = codeDoc.data();

      if (codeData.used) {
        throw "이미 사용된 코드입니다.";
      }

      // Update user's Lak balance
      transaction.update(userRef, { lak: userData.lak + codeData.value });

      // Mark code as used
      transaction.update(codeRef, {
        used: true,
        usedBy: userData.studentId,
      });
      
      const description = `${codeData.type} "${codeData.code}" 사용`;
      // Create transaction history
      const historyRef = doc(collection(userRef, 'transactions'));
      transaction.set(historyRef, {
        date: serverTimestamp(),
        description: description,
        amount: codeData.value,
        type: 'credit',
      });
      
      return { success: true, message: `${codeData.type}을(를) 사용하여 ${codeData.value} Lak을 적립했습니다!` };
    }

    // 4. If not in 'codes', check if it's another user's 'jongdalCode'
    const usersQuery = query(collection(db, 'users'), where('jongdalCode', '==', upperCaseCode));
    const usersSnapshot = await getDocs(usersQuery);

    if (!usersSnapshot.empty) {
      const friendDoc = usersSnapshot.docs[0];
      // Ensure we're not rewarding the same user
      if (friendDoc.id === userId) {
          throw "자신의 종달코드는 사용할 수 없습니다.";
      }
      
      const friendRef = friendDoc.ref;
      const friendData = friendDoc.data();

      // Give points to the friend
      transaction.update(friendRef, { lak: friendData.lak + 1 });
      // Give points to the current user
      transaction.update(userRef, { lak: userData.lak + 1 });
      
      const descriptionForUser = `종달코드 사용 (친구: ${friendData.studentId})`;
      const descriptionForFriend = `친구가 종달코드를 사용했습니다 (${userData.studentId})`;

      // Create transaction history for current user
      const userHistoryRef = doc(collection(userRef, 'transactions'));
      transaction.set(userHistoryRef, {
          date: serverTimestamp(),
          description: descriptionForUser,
          amount: 1,
          type: 'credit'
      });
      
      // Create transaction history for the friend
      const friendHistoryRef = doc(collection(friendRef, 'transactions'));
      transaction.set(friendHistoryRef, {
          date: serverTimestamp(),
          description: descriptionForFriend,
          amount: 1,
          type: 'credit'
      });

      return { success: true, message: `친구의 종달코드를 사용하여 1 Lak을 적립했습니다! 친구에게도 1 Lak이 지급되었습니다.` };
    }
    
    // 5. If no code is found anywhere
    throw "유효하지 않은 코드입니다.";
  }).catch((error) => {
      console.error("Code redemption error: ", error);
      const errorMessage = typeof error === 'string' ? error : "코드 사용 중 오류가 발생했습니다.";
      return { success: false, message: errorMessage };
  });
}


export { auth, db };
