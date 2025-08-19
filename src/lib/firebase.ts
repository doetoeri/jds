'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { getFirestore, doc, setDoc, runTransaction, collection, query, where, getDocs, writeBatch, documentId, getDoc, updateDoc, increment, deleteDoc } from 'firebase/firestore';

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

// Sign up function
export const signUp = async (studentId: string, password: string, email: string) => {
  if (!/^\d{5}$/.test(studentId)) {
    throw new Error('학번은 5자리 숫자여야 합니다.');
  }
  
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Create the user document
    const userDocRef = doc(db, "users", user.uid);
    await setDoc(userDocRef, {
      studentId: studentId,
      email: email,
      lak: 0,
      createdAt: new Date(),
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
    console.error("Signup Error: ", error);
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

    // 2. Check for a code in the 'codes' collection
    const codesQuery = query(collection(db, 'codes'), where('code', '==', upperCaseCode));
    const codesSnapshot = await getDocs(codesQuery);

    if (codesSnapshot.empty) {
       throw "유효하지 않은 코드입니다.";
    }
    
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
      date: new Date(),
      description: description,
      amount: codeData.value,
      type: 'credit',
    });
    
    return { success: true, message: `${codeData.type}을(를) 사용하여 ${codeData.value} Lak을 적립했습니다!` };

  }).catch((error) => {
      console.error("Code redemption error: ", error);
      const errorMessage = typeof error === 'string' ? error : "코드 사용 중 오류가 발생했습니다.";
      return { success: false, message: errorMessage };
  });
};

export const purchaseItems = async (userId: string, cart: { name: string; price: number; quantity: number }[], totalCost: number) => {
  return await runTransaction(db, async (transaction) => {
    // 1. Get user data
    const userRef = doc(db, 'users', userId);
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists()) {
      throw new Error("존재하지 않는 사용자입니다.");
    }
    const userData = userDoc.data();

    // 2. Check if user has enough Lak
    if (userData.lak < totalCost) {
      throw new Error(`Lak이 부족합니다. 현재 보유 Lak: ${userData.lak}, 필요 Lak: ${totalCost}`);
    }

    // 3. Deduct Lak from user
    transaction.update(userRef, { lak: userData.lak - totalCost });
    
    const cartItemsDescription = cart.map(item => `${item.name} x${item.quantity}`).join(', ');

    // 4. Create a single transaction history for the purchase
    const historyRef = doc(collection(userRef, 'transactions'));
    transaction.set(historyRef, {
      date: new Date(),
      description: `상품 구매: ${cartItemsDescription}`,
      amount: -totalCost,
      type: 'debit',
    });

    // 5. Create a record in the global 'purchases' collection for admin viewing
    const purchaseRef = doc(collection(db, 'purchases'));
    transaction.set(purchaseRef, {
        userId: userId,
        studentId: userData.studentId,
        items: cart, // Save the detailed cart
        totalCost: totalCost,
        createdAt: new Date(),
    });


    return { success: true, message: `총 ${totalCost} Lak으로 상품을 구매했습니다!` };
  }).catch((error: any) => {
    console.error("Purchase error: ", error);
    return { success: false, message: error.message || "구매 중 오류가 발생했습니다." };
  });
};

// Function to delete all documents in a collection
const deleteCollection = async (collectionRef: any) => {
    const q = query(collectionRef);
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();
};

// Reset all data function
export const resetAllData = async () => {
    try {
        // 1. Reset 'codes', 'letters', 'purchases'
        const collectionsToReset = ['codes', 'letters', 'purchases'];
        for (const col of collectionsToReset) {
            await deleteCollection(collection(db, col));
        }

        // 2. Reset user data (lak to 0) and delete transactions subcollection
        const usersSnapshot = await getDocs(collection(db, 'users'));
        for (const userDoc of usersSnapshot.docs) {
            const userRef = userDoc.ref;
            // Reset lak to 0
            await updateDoc(userRef, { lak: 0 });

            // Delete transactions subcollection
            const transactionsRef = collection(userRef, 'transactions');
            await deleteCollection(transactionsRef);
        }

        console.log("All data has been successfully reset.");
    } catch (error) {
        console.error("Error resetting data: ", error);
        throw new Error("데이터 초기화 중 오류가 발생했습니다.");
    }
};


export { auth, db };
