
'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { getFirestore, doc, setDoc, runTransaction, collection, query, where, getDocs, writeBatch, documentId, getDoc, updateDoc, increment, deleteDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';


const firebaseConfig = {
  projectId: 'jongdalsem-hub',
  appId: '1:145118642611:web:3d29407e957e6ea4f18bc6',
  storageBucket: 'jongdalsem-hub.appspot.com',
  apiKey: 'AIzaSyCKRYChw1X_FYRhcGxk13B_s2gOgZoZiyc',
  authDomain: 'jongdalsem-hub.firebaseapp.com',
  measurementId: '',
  messagingSenderId: '145118642611',
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);


// Sign up function
export const signUp = async (
    userType: 'student' | 'teacher' | 'pending_teacher',
    userData: { studentId?: string; name?: string; officeFloor?: string; },
    password: string,
    email: string
) => {
  if (userType === 'student' && !/^\d{5}$/.test(userData.studentId!)) {
    throw new Error('학번은 5자리 숫자여야 합니다.');
  }

  try {
    if (email === 'admin@jongdalsem.com') {
        throw new Error("해당 이메일은 사용할 수 없습니다.");
    }

    if (userType === 'student') {
        const studentId = userData.studentId!;
        // Check for duplicate studentId before creating auth user
        const studentQuery = query(
          collection(db, "users"),
          where("studentId", "==", studentId),
          where("role", "==", "student")
        );
        const studentSnapshot = await getDocs(studentQuery);
        if (!studentSnapshot.empty) {
            throw new Error("이미 등록된 학번입니다.");
        }
    } else { // teacher or pending_teacher
        // Check for duplicate teacher email
        const teacherQuery = query(
          collection(db, "users"),
          where("email", "==", email),
          where("role", "in", ["teacher", "pending_teacher", "council"])
        );
        const teacherSnapshot = await getDocs(teacherQuery);
        if (!teacherSnapshot.empty) {
            throw new Error("이미 가입 신청되었거나 등록된 이메일입니다.");
        }
    }


    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const userDocRef = doc(db, "users", user.uid);

    if (userType === 'student') {
        const studentId = userData.studentId!;
        await runTransaction(db, async (transaction) => {
            const mateCode = user.uid.substring(0, 4).toUpperCase();
            transaction.set(userDocRef, {
                studentId: studentId,
                email: email,
                lak: 0,
                createdAt: Timestamp.now(),
                mateCode: mateCode,
                role: 'student',
                displayName: `학생 (${studentId})`,
                avatarGradient: 'orange', // Default gradient
            });

            const mateCodeRef = doc(collection(db, 'codes'));
            transaction.set(mateCodeRef, {
                code: mateCode,
                type: '메이트코드',
                value: 1,
                ownerUid: user.uid,
                ownerStudentId: studentId,
                participants: [studentId], // Start with the owner
                createdAt: Timestamp.now(),
                lastUsedAt: Timestamp.now(),
            });
        });
    } else { // 'teacher' (which is pending_teacher initially)
        await setDoc(userDocRef, {
            name: userData.name,
            displayName: `${userData.name} 선생님`,
            officeFloor: userData.officeFloor,
            email: email,
            role: 'pending_teacher',
            createdAt: Timestamp.now(),
            avatarGradient: 'blue', // Default gradient for teachers
        });
    }

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
    // Attempt to delete the auth user if doc creation fails but auth user was created
    const currentUser = getAuth().currentUser;
    if (currentUser && currentUser.email === email) {
      await currentUser.delete().catch(e => console.error("Failed to clean up auth user", e));
    }
    throw new Error(error.message || '회원가입 중 오류가 발생했습니다. 다시 시도해주세요.');
  }
};


// Sign in function
export const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.role === 'pending_teacher') {
            await signOut(auth);
            throw new Error('관리자 승인 대기중인 계정입니다.');
        }
    } else {
        // This case can happen if a user is created in Auth but their Firestore doc fails.
        // Or if they were deleted from Firestore but not Auth.
        // We create the doc on the fly for special accounts.
        if (email === 'admin@jongdalsem.com') {
             await setDoc(userDocRef, { email, role: 'admin', name: '관리자', displayName: '관리자', createdAt: Timestamp.now() });
        } else {
            await signOut(auth);
            throw new Error('사용자 데이터가 존재하지 않습니다. 관리자에게 문의하세요.');
        }
    }

    return userCredential.user;
  } catch (error: any) {
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
    }
    throw new Error(error.message || '로그인 중 오류가 발생했습니다.');
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
export const useCode = async (userId: string, inputCode: string, partnerStudentId?: string) => {
  const upperCaseCode = inputCode.toUpperCase();

  return await runTransaction(db, async (transaction) => {
    // 1. Get user data (the person redeeming the code)
    const userRef = doc(db, 'users', userId);
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists()) {
      throw "존재하지 않는 사용자입니다.";
    }
    const userData = userDoc.data();
    const userStudentId = userData.studentId;

    // 2. Find the code
    const codeQuery = query(collection(db, 'codes'), where('code', '==', upperCaseCode));
    const codeSnapshot = await getDocs(codeQuery); // Use getDocs outside transaction for reads

    if (codeSnapshot.empty) {
      throw "유효하지 않은 코드입니다.";
    }

    const codeDoc = codeSnapshot.docs[0];
    const codeRef = codeDoc.ref;
    
    // 3. Check if used (re-fetch inside transaction for consistent read)
    const freshCodeDoc = await transaction.get(codeRef);
    const freshCodeData = freshCodeDoc.data();
    if (!freshCodeData) {
        throw "코드를 찾을 수 없습니다.";
    }
    
    // This check is now placed before the switch for all non-Mate codes
    if (freshCodeData.used && freshCodeData.type !== '메이트코드') {
      throw "이미 사용된 코드입니다.";
    }


    // 4. Handle different code types
    switch (freshCodeData.type) {
      case '히든코드':
        // The used check is already done above.
        if (!partnerStudentId) {
          throw "파트너의 학번이 필요합니다.";
        }
        if (partnerStudentId === userStudentId) {
          throw "자기 자신을 파트너로 지정할 수 없습니다.";
        }
        if (!/^\d{5}$/.test(partnerStudentId)) {
          throw "파트너의 학번은 5자리 숫자여야 합니다.";
        }

        // Find partner
        const partnerQuery = query(collection(db, 'users'), where('studentId', '==', partnerStudentId));
        const partnerSnapshot = await getDocs(partnerQuery); // Read outside transaction
        if (partnerSnapshot.empty) {
          throw `학번 ${partnerStudentId}에 해당하는 학생을 찾을 수 없습니다.`;
        }
        const partnerRef = partnerSnapshot.docs[0].ref;

        // Give points to the code user
        transaction.update(userRef, { lak: increment(freshCodeData.value) });
        const userHistoryRef = doc(collection(userRef, 'transactions'));
        transaction.set(userHistoryRef, {
          date: Timestamp.now(),
          description: `히든코드 사용 (파트너: ${partnerStudentId})`,
          amount: freshCodeData.value,
          type: 'credit',
        });

        // Give points to the partner
        transaction.update(partnerRef, { lak: increment(freshCodeData.value) });
        const partnerHistoryRef = doc(collection(partnerRef, 'transactions'));
        transaction.set(partnerHistoryRef, {
          date: Timestamp.now(),
          description: `히든코드 파트너 보상 (사용자: ${userStudentId})`,
          amount: freshCodeData.value,
          type: 'credit',
        });

        // Mark code as used
        transaction.update(codeRef, {
          used: true,
          usedBy: [userStudentId, partnerStudentId],
        });

        return { success: true, message: `코드를 사용해 나와 파트너 모두 ${freshCodeData.value} Lak을 받았습니다!` };

      case '메이트코드':
        if (freshCodeData.ownerUid === userId) {
          throw "자신의 메이트 코드는 사용할 수 없습니다.";
        }
         // Check if user is already a participant
        if (freshCodeData.participants && freshCodeData.participants.includes(userStudentId)) {
            throw "이미 사용한 메이트 코드입니다.";
        }

        // Give points to the code user
        transaction.update(userRef, { lak: increment(freshCodeData.value) });
        const mateUserHistoryRef = doc(collection(userRef, 'transactions'));
        transaction.set(mateUserHistoryRef, {
          date: Timestamp.now(),
          description: `'${freshCodeData.ownerStudentId}'님의 메이트코드 사용`,
          amount: freshCodeData.value,
          type: 'credit',
        });

        // Give points to the code owner
        const ownerRef = doc(db, 'users', freshCodeData.ownerUid);
        transaction.update(ownerRef, { lak: increment(freshCodeData.value) });
        const ownerHistoryRef = doc(collection(ownerRef, 'transactions'));
        transaction.set(ownerHistoryRef, {
          date: Timestamp.now(),
          description: `'${userStudentId}'님이 메이트코드를 사용했습니다.`,
          amount: freshCodeData.value,
          type: 'credit',
        });

        // Add user to the participants list and update timestamp
        transaction.update(codeRef, { 
            participants: arrayUnion(userStudentId),
            lastUsedAt: Timestamp.now()
        });

        return { success: true, message: `메이트코드를 사용하여 ${freshCodeData.value} Lak을, 코드 주인도 ${freshCodeData.value} Lak을 받았습니다!` };

      default: // '종달코드', '온라인 특수코드'
        // The used check is already done above.
        // Update user's Lak balance
        transaction.update(userRef, { lak: increment(freshCodeData.value) });

        // Mark code as used
        transaction.update(codeRef, {
          used: true,
          usedBy: userStudentId,
        });

        // Create transaction history
        const historyRef = doc(collection(userRef, 'transactions'));
        transaction.set(historyRef, {
          date: Timestamp.now(),
          description: `${freshCodeData.type} "${freshCodeData.code}" 사용`,
          amount: freshCodeData.value,
          type: 'credit',
        });

        return { success: true, message: `${freshCodeData.type}을(를) 사용하여 ${freshCodeData.value} Lak을 적립했습니다!` };
    }

  }).catch((error) => {
      console.error("Code redemption error: ", error);
      const errorMessage = typeof error === 'string' ? error : "코드 사용 중 오류가 발생했습니다.";
      return { success: false, message: errorMessage };
  });
};

export const purchaseItems = async (userId: string, cart: { name: string; price: number; quantity: number, id: string }[], totalCost: number) => {
  return await runTransaction(db, async (transaction) => {
    const userRef = doc(db, 'users', userId);
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists()) {
      throw new Error("존재하지 않는 사용자입니다.");
    }
    const userData = userDoc.data();

    if ((userData.lak || 0) < totalCost) {
      throw new Error(`Lak이 부족합니다. 현재 보유 Lak: ${userData.lak || 0}, 필요 Lak: ${totalCost}`);
    }

    // Check stock and deduct it
    for (const item of cart) {
        const productRef = doc(db, 'products', item.id);
        const productDoc = await transaction.get(productRef);
        if (!productDoc.exists() || productDoc.data().stock < item.quantity) {
            throw new Error(`'${item.name}' 상품의 재고가 부족합니다.`);
        }
        transaction.update(productRef, { stock: increment(-item.quantity) });
    }

    transaction.update(userRef, { lak: increment(-totalCost) });

    const cartItemsDescription = cart.map(item => `${item.name} x${item.quantity}`).join(', ');

    const historyRef = doc(collection(userRef, 'transactions'));
    transaction.set(historyRef, {
      date: Timestamp.now(),
      description: `상품 구매: ${cartItemsDescription}`,
      amount: -totalCost,
      type: 'debit',
    });

    const purchaseRef = doc(collection(db, 'purchases'));
    transaction.set(purchaseRef, {
        userId: userId,
        studentId: userData.studentId,
        items: cart,
        totalCost: totalCost,
        createdAt: Timestamp.now(),
        status: 'pending' // 'pending', 'completed'
    });


    return { success: true, message: `총 ${totalCost} Lak으로 상품을 구매했습니다! 학생회에 알려 상품을 받아가세요.` };
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
            const collectionRef = collection(db, col);
            await deleteCollection(collectionRef);
        }

        // 2. Reset user data (lak to 0) and delete transactions subcollection
        const usersSnapshot = await getDocs(collection(db, 'users'));

        for (const userDoc of usersSnapshot.docs) {
            const userRef = userDoc.ref;
            const batch = writeBatch(db);
            // Reset lak to 0, but keep user data
            if (userDoc.data().role !== 'admin' && userDoc.data().role !== 'council') {
                batch.update(userRef, { lak: 0 });
            }
            await batch.commit();

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


// PROFILE FUNCTIONS
export const updateUserProfile = async (
  userId: string,
  data: { displayName?: string; avatarGradient?: string }
) => {
  const userRef = doc(db, 'users', userId);
  // Filter out undefined values to prevent errors
  const updateData = Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  );

  if (Object.keys(updateData).length > 0) {
    await updateDoc(userRef, updateData);
  }
};


export const adjustUserLak = async (userId: string, amount: number, reason: string) => {
  return await runTransaction(db, async (transaction) => {
    const userRef = doc(db, 'users', userId);
    const userDoc = await transaction.get(userRef);

    if (!userDoc.exists()) {
      throw new Error("User does not exist.");
    }

    // Update Lak balance using increment for safety
    transaction.update(userRef, { lak: increment(amount) });

    // Create a transaction history record
    const historyRef = doc(collection(userRef, 'transactions'));
    transaction.set(historyRef, {
      date: Timestamp.now(),
      description: `관리자 조정: ${reason}`,
      amount: amount,
      type: amount > 0 ? 'credit' : 'debit',
    });
  }).catch((error: any) => {
    console.error("Lak adjustment error:", error);
    throw new Error(error.message || "Failed to adjust Lak points.");
  });
};

export const updateUserRole = async (userId: string, newRole: 'student' | 'council') => {
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);
  if (!userDoc.exists()) {
    throw new Error("User does not exist.");
  }
  const userData = userDoc.data();
  if (userData.role === 'admin') {
      throw new Error("Cannot change the role of an admin.");
  }
  
  await updateDoc(userRef, { role: newRole });
};

export const deleteUser = async (userId: string) => {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
        throw new Error("User does not exist in Firestore.");
    }
    if (userDoc.data().role === 'admin') {
        throw new Error("Cannot delete an admin account through this action.");
    }
    // Note: This does NOT delete the Firebase Auth user.
    // That must be done manually in the Firebase console for security.
    await deleteDoc(userRef);
};


export { auth, db, storage };

