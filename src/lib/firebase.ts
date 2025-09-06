

'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { getFirestore, doc, setDoc, runTransaction, collection, query, where, getDocs, writeBatch, documentId, getDoc, updateDoc, increment, deleteDoc, arrayUnion, Timestamp, addDoc, orderBy, limit, arrayRemove } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';


const firebaseConfig = {
  projectId: 'jongdalsem-hub',
  appId: '1:145118642611:web:3d29407e957e6ea4f18bc6',
  storageBucket: 'jongdalsam-hub.appspot.com',
  apiKey: 'AIzaSyCKRYChw1X_FYRhcGxk13B_s2gOgZoZiyc',
  authDomain: 'jongdalsam-hub.firebaseapp.com',
  measurementId: '',
  messagingSenderId: '145118642611',
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const POINT_LIMIT = 25;


// One-time function to add signup bonus to existing users
const addSignupBonusToExistingUsers = async () => {
    const flagDocRef = doc(db, 'system_flags', 'signup_bonus_added');
    
    try {
        await runTransaction(db, async (transaction) => {
            const flagDoc = await transaction.get(flagDocRef);
            if (flagDoc.exists()) {
                console.log("Signup bonus already distributed.");
                return;
            }

            console.log("Distributing signup bonus to existing users...");
            const usersQuery = query(collection(db, 'users'), where('role', '==', 'student'));
            const usersSnapshot = await getDocs(usersQuery);

            const userUpdates = new Map();

            for (const userDoc of usersSnapshot.docs) {
                userUpdates.set(userDoc.ref, { lak: increment(3) });
                
                const historyRef = doc(collection(userDoc.ref, 'transactions'));
                transaction.set(historyRef, {
                    amount: 3,
                    date: Timestamp.now(),
                    description: '가입 축하 포인트',
                    type: 'credit',
                });
            }

            userUpdates.forEach((data, ref) => {
                transaction.update(ref, data);
            });

            transaction.set(flagDocRef, { completed: true, timestamp: Timestamp.now() });
            console.log(`Signup bonus distributed to ${usersSnapshot.size} users.`);
        });
    } catch (error) {
        console.error("Failed to add signup bonus to existing users:", error);
    }
};

// Sign up function
export const signUp = async (
    userType: 'student' | 'teacher' | 'pending_teacher',
    userData: { studentId?: string; name?: string; officeFloor?: string; nickname?: string },
    password: string,
    email: string
) => {
  if (userType === 'student' && !/^\d{5}$/.test(userData.studentId!)) {
    throw new Error('학번은 5자리 숫자여야 합니다.');
  }

  try {
    await addSignupBonusToExistingUsers();

    if (email === 'admin@jongdalsem.com') {
        throw new Error("해당 이메일은 사용할 수 없습니다.");
    }

    if (userType === 'student') {
        const studentId = userData.studentId!;
        const studentQuery = query(
          collection(db, "users"),
          where("studentId", "==", studentId),
          where("role", "==", "student")
        );
        const studentSnapshot = await getDocs(studentQuery);
        if (!studentSnapshot.empty) {
            throw new Error("이미 등록된 학번입니다.");
        }
    } else {
        const teacherQuery = query(
          collection(db, "users"),
          where("email", "==", email),
          where("role", "in", ["teacher", "pending_teacher", "council", "council_booth"])
        );
        const teacherSnapshot = await getDocs(teacherQuery);
        if (!teacherSnapshot.empty) {
            throw new Error("이미 가입 신청되었거나 등록된 이메일입니다.");
        }

        const nicknameQuery = query(collection(db, 'users'), where('nickname', '==', userData.nickname), where('role', '==', 'teacher'));
        const nicknameSnapshot = await getDocs(nicknameQuery);
        if (!nicknameSnapshot.empty) {
            throw new Error("이미 사용 중인 닉네임입니다.");
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
                lak: 3,
                createdAt: Timestamp.now(),
                mateCode: mateCode,
                role: 'student',
                displayName: `학생 (${studentId})`,
                avatarGradient: 'orange', 
            });
            
            const historyRef = doc(collection(userDocRef, 'transactions'));
            transaction.set(historyRef, {
                amount: 3,
                date: Timestamp.now(),
                description: '가입 축하 포인트',
                type: 'credit',
            });

            const mateCodeRef = doc(collection(db, 'codes'));
            transaction.set(mateCodeRef, {
                code: mateCode,
                type: '메이트코드',
                value: 1,
                ownerUid: user.uid,
                ownerStudentId: studentId,
                participants: [studentId], 
                createdAt: Timestamp.now(),
                lastUsedAt: Timestamp.now(),
            });
        });
    } else { 
        await setDoc(userDocRef, {
            name: userData.name,
            nickname: userData.nickname,
            displayName: `${userData.name} 선생님`,
            officeFloor: userData.officeFloor,
            email: email,
            role: 'pending_teacher',
            createdAt: Timestamp.now(),
            avatarGradient: 'blue', 
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
  const mateCodeReward = 1;

  return await runTransaction(db, async (transaction) => {
    const userRef = doc(db, 'users', userId);
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists()) throw "존재하지 않는 사용자입니다.";
    
    const userData = userDoc.data();
    const userStudentId = userData.studentId;
    const userCurrentLak = userData.lak || 0;

    const codeQuery = query(collection(db, 'codes'), where('code', '==', upperCaseCode));
    const codeSnapshot = await getDocs(codeQuery); // Use getDocs outside transaction for reads

    if (codeSnapshot.empty) throw "유효하지 않은 코드입니다.";

    const codeDoc = codeSnapshot.docs[0];
    const codeRef = codeDoc.ref;
    
    const freshCodeDoc = await transaction.get(codeRef);
    const freshCodeData = freshCodeDoc.data();
    if (!freshCodeData) throw "코드를 찾을 수 없습니다.";

    const checkAndIncrementPoints = (ref: any, currentPoints: number, pointsToAdd: number, historyDesc: string) => {
      if (currentPoints >= POINT_LIMIT) {
          // Record participation even if points are not added
           const historyRef = doc(collection(ref, 'transactions'));
            transaction.set(historyRef, {
                date: Timestamp.now(), description: `${historyDesc} (포인트 한도 초과)`, amount: 0, type: 'credit',
            });
           return;
      };

      if (currentPoints + pointsToAdd > POINT_LIMIT) {
          throw new Error(`포인트 한도(${POINT_LIMIT}포인트)를 초과하여 지급할 수 없습니다.`);
      }
      
      transaction.update(ref, { lak: increment(pointsToAdd) });
      const historyRef = doc(collection(ref, 'transactions'));
      transaction.set(historyRef, {
        date: Timestamp.now(), description: historyDesc, amount: pointsToAdd, type: 'credit',
      });
    };
    

    switch (freshCodeData.type) {
      case '히든코드':
        if (freshCodeData.used) throw "이미 사용된 코드입니다.";
        if (!partnerStudentId) throw "파트너의 학번이 필요합니다.";
        if (partnerStudentId === userStudentId) throw "자기 자신을 파트너로 지정할 수 없습니다.";
        if (!/^\d{5}$/.test(partnerStudentId)) throw "파트너의 학번은 5자리 숫자여야 합니다.";
        
        // 1. Find all mate codes current user is a part of
        const mateCodesQuery = query(
            collection(db, 'codes'),
            where('type', '==', '메이트코드'),
            where('participants', 'array-contains', userStudentId)
        );
        const mateCodesSnapshot = await getDocs(mateCodesQuery);
        
        // 2. Extract all unique friend student IDs
        const friendStudentIds = new Set<string>();
        mateCodesSnapshot.docs.forEach(doc => {
            const participants = doc.data().participants as string[];
            participants.forEach(pId => {
                if (pId !== userStudentId) {
                    friendStudentIds.add(pId);
                }
            });
        });

        // 3. Check if the specified partner is in the friends list
        if (!friendStudentIds.has(partnerStudentId)) {
            throw new Error(`학생(${partnerStudentId})은 친구 목록에 없습니다. 메이트 코드를 먼저 교환해주세요.`);
        }

        // 4. Verify the partner user actually exists
        const partnerQuery = query(collection(db, 'users'), where('studentId', '==', partnerStudentId), where('role', '==', 'student'));
        const partnerSnapshot = await getDocs(partnerQuery);
        if (partnerSnapshot.empty) throw `학번 ${partnerStudentId}에 해당하는 학생을 찾을 수 없습니다.`;
        
        const partnerRef = partnerSnapshot.docs[0].ref;
        const partnerDoc = await transaction.get(partnerRef);
        if(!partnerDoc.exists()) throw `파트너(${partnerStudentId}) 정보를 찾을 수 없습니다.`;

        checkAndIncrementPoints(userRef, userCurrentLak, freshCodeData.value, `히든코드 사용 (파트너: ${partnerStudentId})`);
        checkAndIncrementPoints(partnerRef, partnerDoc.data()?.lak || 0, freshCodeData.value, `히든코드 파트너 보상 (사용자: ${userStudentId})`);
        
        transaction.update(codeRef, { used: true, usedBy: [userStudentId, partnerStudentId] });

        return { success: true, message: `코드를 사용해 나와 파트너 모두 ${freshCodeData.value} 포인트를 받았습니다!` };

      case '메이트코드':
        if (freshCodeData.ownerUid === userId) throw "자신의 메이트 코드는 사용할 수 없습니다.";
        if (freshCodeData.participants && freshCodeData.participants.includes(userStudentId)) throw "이미 사용한 메이트 코드입니다.";
        
        const ownerRef = doc(db, 'users', freshCodeData.ownerUid);
        const ownerDoc = await transaction.get(ownerRef);
        if (!ownerDoc.exists()) throw "코드 소유자 정보를 찾을 수 없습니다.";

        checkAndIncrementPoints(userRef, userCurrentLak, mateCodeReward, `'${freshCodeData.ownerStudentId}'님의 메이트코드 사용`);
        checkAndIncrementPoints(ownerRef, ownerDoc.data()?.lak || 0, mateCodeReward, `'${userStudentId}'님이 메이트코드를 사용했습니다.`);

        transaction.update(codeRef, { participants: arrayUnion(userStudentId), lastUsedAt: Timestamp.now() });

        return { success: true, message: `메이트코드를 사용하여 ${mateCodeReward} 포인트를, 코드 주인도 ${mateCodeReward} 포인트를 받았습니다!` };
      
      case '선착순코드':
        const usedBy = Array.isArray(freshCodeData.usedBy) ? freshCodeData.usedBy : [];
        if (usedBy.includes(userStudentId)) throw "이미 이 코드를 사용했습니다.";
        if (usedBy.length >= freshCodeData.limit) throw "코드가 모두 소진되었습니다. 다음 기회를 노려보세요!";

        checkAndIncrementPoints(userRef, userCurrentLak, freshCodeData.value, `선착순코드 "${freshCodeData.code}" 사용`);
        transaction.update(codeRef, { usedBy: arrayUnion(userStudentId) });
        
        return { success: true, message: `선착순 코드를 사용하여 ${freshCodeData.value} 포인트를 적립했습니다!` };

      default:
        if (freshCodeData.used) throw "이미 사용된 코드입니다.";

        checkAndIncrementPoints(userRef, userCurrentLak, freshCodeData.value, `${freshCodeData.type} "${freshCodeData.code}" 사용`);
        transaction.update(codeRef, { used: true, usedBy: userStudentId });

        return { success: true, message: `${freshCodeData.type}을(를) 사용하여 ${freshCodeData.value} 포인트를 적립했습니다!` };
    }

  }).catch((error) => {
      console.error("Code redemption error: ", error);
      const errorMessage = typeof error === 'string' ? error : (error.message || "코드 사용 중 오류가 발생했습니다.");
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
      throw new Error(`포인트가 부족합니다. 현재 보유 포인트: ${userData.lak || 0}, 필요 포인트: ${totalCost}`);
    }

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
        status: 'pending'
    });


    return { success: true, message: `총 ${totalCost} 포인트으로 상품을 구매했습니다! 학생회에 알려 상품을 받아가세요.` };
  }).catch((error: any) => {
    console.error("Purchase error: ", error);
    return { success: false, message: error.message || "구매 중 오류가 발생했습니다." };
  });
};

const deleteCollection = async (collectionRef: any) => {
    const q = query(collectionRef);
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();
};

export const resetAllData = async () => {
    try {
        const collectionsToReset = ['codes', 'letters', 'purchases', 'announcements', 'communication_channel', 'guestbook', 'games'];
        for (const col of collectionsToReset) {
            const collectionRef = collection(db, col);
            await deleteCollection(collectionRef);
        }

        const usersSnapshot = await getDocs(collection(db, 'users'));

        for (const userDoc of usersSnapshot.docs) {
            const userRef = userDoc.ref;
            const batch = writeBatch(db);
            if (userDoc.data().role !== 'admin' && userDoc.data().role !== 'council') {
                batch.update(userRef, { lak: 0 });
            }
            await batch.commit();

            const transactionsRef = collection(userRef, 'transactions');
            await deleteCollection(transactionsRef);
        }

        console.log("All data has been successfully reset.");
    } catch (error) {
        console.error("Error resetting data: ", error);
        throw new Error("데이터 초기화 중 오류가 발생했습니다.");
    }
};

export const resetWordChainGame = async () => {
    try {
        const gameRef = doc(db, 'games', 'word-chain');
        await setDoc(gameRef, { history: [] }, { merge: true });
    } catch (error) {
        console.error("Error resetting word chain game: ", error);
        throw new Error("끝말잇기 게임 초기화 중 오류가 발생했습니다.");
    }
};


export const updateUserProfile = async (
  userId: string,
  data: { displayName?: string; avatarGradient?: string }
) => {
  const userRef = doc(db, 'users', userId);
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

    const currentPoints = userDoc.data().lak || 0;
    if (amount > 0 && currentPoints >= POINT_LIMIT) {
      throw new Error(`포인트 한도(${POINT_LIMIT}포인트)에 도달하여 더 이상 포인트를 지급할 수 없습니다.`);
    }

    if (amount > 0 && currentPoints + amount > POINT_LIMIT) {
        throw new Error(`포인트 한도(${POINT_LIMIT}포인트)를 초과하여 지급할 수 없습니다. 현재: ${currentPoints}, 지급 요청: ${amount}`);
    }

    transaction.update(userRef, { lak: increment(amount) });

    const historyRef = doc(collection(userRef, 'transactions'));
    transaction.set(historyRef, {
      date: Timestamp.now(),
      description: `관리자 조정: ${reason}`,
      amount: amount,
      type: amount > 0 ? 'credit' : 'debit',
    });
  }).catch((error: any) => {
    console.error("Point adjustment error:", error);
    throw new Error(error.message || "Failed to adjust points.");
  });
};

export const setUserLak = async (userId: string, amount: number, reason: string) => {
  return await runTransaction(db, async (transaction) => {
    const userRef = doc(db, 'users', userId);
    const userDoc = await transaction.get(userRef);

    if (!userDoc.exists()) {
      throw new Error("User does not exist.");
    }
    
    if (amount > POINT_LIMIT) {
        throw new Error(`포인트 한도(${POINT_LIMIT}포인트)를 초과하여 설정할 수 없습니다.`);
    }

    const currentLak = userDoc.data().lak || 0;
    const difference = amount - currentLak;

    transaction.update(userRef, { lak: amount });

    const historyRef = doc(collection(userRef, 'transactions'));
    transaction.set(historyRef, {
      date: Timestamp.now(),
      description: `관리자 설정: ${reason}`,
      amount: difference,
      type: difference >= 0 ? 'credit' : 'debit',
    });
  }).catch((error: any) => {
    console.error("Point setting error:", error);
    throw new Error(error.message || "Failed to set points.");
  });
};


export const bulkAdjustUserLak = async (userIds: string[], amount: number, reason: string) => {
    const batch = writeBatch(db);

    for (const userId of userIds) {
        const userRef = doc(db, 'users', userId);
        
        // Note: Reading inside a loop is not ideal, but necessary here without denormalizing lak.
        // For high-frequency bulk operations, a different data model might be better.
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
            const userData = userDoc.data();
            const currentPoints = userData.lak || 0;

             if (amount < 0 || (currentPoints < POINT_LIMIT && currentPoints + amount <= POINT_LIMIT)) {
                batch.update(userRef, { lak: increment(amount) });

                const historyRef = doc(collection(userRef, 'transactions'));
                batch.set(historyRef, {
                    date: Timestamp.now(),
                    description: `관리자 일괄 조정: ${reason}`,
                    amount: amount,
                    type: amount > 0 ? 'credit' : 'debit',
                });
            } else if (amount > 0 && currentPoints >= POINT_LIMIT) {
                // User is already at limit, just add history
                const historyRef = doc(collection(userRef, 'transactions'));
                batch.set(historyRef, {
                    date: Timestamp.now(),
                    description: `관리자 일괄 조정 (한도 초과): ${reason}`,
                    amount: 0,
                    type: 'credit',
                });
            } else if (amount > 0 && currentPoints + amount > POINT_LIMIT) {
                 // User would exceed limit, so adjust to reach the limit exactly.
                const adjustedAmount = POINT_LIMIT - currentPoints;
                batch.update(userRef, { lak: POINT_LIMIT });
                
                const historyRef = doc(collection(userRef, 'transactions'));
                batch.set(historyRef, {
                    date: Timestamp.now(),
                    description: `관리자 일괄 조정 (한도 도달): ${reason}`,
                    amount: adjustedAmount,
                    type: 'credit',
                });
            }
        }
    }
    await batch.commit();
};

export const bulkSetUserLak = async (userIds: string[], amount: number, reason: string) => {
  if (amount > POINT_LIMIT) {
    throw new Error(`포인트 한도(${POINT_LIMIT}포인트)를 초과하여 설정할 수 없습니다.`);
  }

  const batch = writeBatch(db);

  for (const userId of userIds) {
    const userRef = doc(db, "users", userId);
    
    // We still need to read the document to calculate the difference for the history.
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      const currentLak = userDoc.data().lak || 0;
      const difference = amount - currentLak;

      batch.update(userRef, { lak: amount });

      const historyRef = doc(collection(userRef, 'transactions'));
      batch.set(historyRef, {
        date: Timestamp.now(),
        description: `관리자 일괄 설정: ${reason}`,
        amount: difference,
        type: difference >= 0 ? 'credit' : 'debit',
      });
    }
  }

  await batch.commit();
};


export const updateUserRole = async (userId: string, newRole: 'student' | 'council' | 'council_booth') => {
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
    await deleteDoc(userRef);
};

export const submitInquiry = async (userId: string, content: string) => {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      throw new Error("User data not found.");
    }
    const userData = userDoc.data();
    
    const inquiryData = {
        senderUid: userId,
        senderStudentId: userData.studentId,
        senderDisplayName: userData.displayName,
        content,
        createdAt: Timestamp.now(),
        status: 'open'
    };

    await addDoc(collection(db, 'inquiries'), inquiryData);
};

export const postAnnouncement = async (
    authorId: string, 
    title: string, 
    content: string, 
    imageUrl: string, 
    imagePath: string,
    targetStudentId?: string
) => {
  const authorRef = doc(db, 'users', authorId);
  const authorDoc = await getDoc(authorRef);

  if (!authorDoc.exists() || (authorDoc.data()?.role !== 'admin' && authorDoc.data()?.role !== 'council')) {
    throw new Error('공지를 게시할 권한이 없습니다.');
  }

  const announcementData: any = {
    title,
    content,
    imageUrl,
    imagePath,
    authorName: authorDoc.data()?.displayName || '관리자',
    authorId: authorId,
    createdAt: Timestamp.now(),
    targetStudentId: targetStudentId || null,
  };

  if (targetStudentId) {
      const studentQuery = query(collection(db, 'users'), where('studentId', '==', targetStudentId));
      const studentSnapshot = await getDocs(studentQuery);
      if (studentSnapshot.empty) {
          throw new Error(`학번 ${targetStudentId}에 해당하는 학생을 찾을 수 없습니다.`);
      }
  }

  await addDoc(collection(db, 'announcements'), announcementData);
};

export const submitWord = async (userId: string, word: string) => {
    if (word.length <= 1) {
        throw new Error("단어는 두 글자 이상이어야 합니다.");
    }

    return await runTransaction(db, async (transaction) => {
        const userRef = doc(db, "users", userId);
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error("사용자를 찾을 수 없습니다.");
        
        const userData = userDoc.data();
        const currentPoints = userData.lak || 0;
        
        if (userData.lastWordChainTimestamp) {
            const lastTime = userData.lastWordChainTimestamp.toDate();
            const now = new Date();
            const lastDateKST = new Date(lastTime.toLocaleString("en-US", { timeZone: "Asia/Seoul" })).setHours(0,0,0,0);
            const nowDateKST = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" })).setHours(0,0,0,0);
            
            if (lastDateKST === nowDateKST) throw new Error("오늘은 이미 보상을 받았습니다. 내일 다시 도전해주세요!");
        }

        const gameRef = doc(db, "games", "word-chain");
        const gameDoc = await transaction.get(gameRef);
        const gameData = gameDoc.exists() ? gameDoc.data() : null;

        const history = gameData?.history || [];
        const lastWord = history.length > 0 ? history[history.length - 1].word : null;
        
        if (lastWord && lastWord.charAt(lastWord.length - 1) !== word.charAt(0)) {
            throw new Error(`'${lastWord.charAt(lastWord.length - 1)}'(으)로 시작하는 단어를 입력해야 합니다.`);
        }
        
        if (history.some((turn: { word: string; }) => turn.word === word)) {
            throw new Error("이미 사용된 단어입니다.");
        }

        const newTurn = {
            word, userId, studentId: userData.studentId, displayName: userData.displayName, createdAt: Timestamp.now()
        };

        if (gameDoc.exists()) {
            transaction.update(gameRef, { history: arrayUnion(newTurn), lastUpdate: Timestamp.now() });
        } else {
            transaction.set(gameRef, { history: [newTurn], createdAt: Timestamp.now(), lastUpdate: Timestamp.now() });
        }

        if (currentPoints < POINT_LIMIT) {
            transaction.update(userRef, { lak: increment(1), lastWordChainTimestamp: Timestamp.now() });
            const txHistoryRef = doc(collection(userRef, "transactions"));
            transaction.set(txHistoryRef, { amount: 1, date: Timestamp.now(), description: "끝말잇기 참여 보상", type: "credit" });
            return { success: true, message: "성공! 1포인트를 획득했습니다."};
        } else {
             transaction.update(userRef, { lastWordChainTimestamp: Timestamp.now() });
             return { success: true, message: "성공! 포인트 한도에 도달했지만 참여가 기록되었습니다." };
        }
    }).catch((error) => {
        console.error("Word chain submission error: ", error);
        return { success: false, message: error.message || "단어 제출 중 오류가 발생했습니다." };
    });
}

export const givePointsToMultipleStudentsAtBooth = async (boothOperatorId: string, studentIds: string[], amount: number, reason: string) => {
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    const studentDocs = new Map<string, any>();
    // Batch read all unique students first to minimize reads
    const uniqueStudentIds = [...new Set(studentIds)];
    const studentQuery = query(collection(db, 'users'), where('studentId', 'in', uniqueStudentIds), where('role', '==', 'student'));
    const studentSnapshot = await getDocs(studentQuery);
    studentSnapshot.forEach(doc => {
        studentDocs.set(doc.data().studentId, { ref: doc.ref, data: doc.data() });
    });

    for (const studentId of studentIds) {
        try {
            await runTransaction(db, async (transaction) => {
                const studentInfo = studentDocs.get(studentId);
                if (!studentInfo) {
                    throw new Error(`학생(${studentId}) 없음`);
                }

                const studentRef = studentInfo.ref;
                // We need to get the fresh data inside the transaction
                const studentDoc = await transaction.get(studentRef);
                if (!studentDoc.exists()) {
                     throw new Error(`학생(${studentId}) 없음`);
                }

                const currentPoints = studentDoc.data().lak || 0;

                if (currentPoints >= POINT_LIMIT) {
                    const historyRef = doc(collection(studentRef, 'transactions'));
                    transaction.set(historyRef, {
                        date: Timestamp.now(), description: `부스 이벤트 (포인트 한도 초과): ${reason}`, amount: 0, type: 'credit', operator: boothOperatorId
                    });
                    // This is a "successful" operation in the sense that it was processed.
                    return; 
                }

                if (currentPoints + amount > POINT_LIMIT) {
                    throw new Error(`학생(${studentId}) 한도 초과`);
                }

                transaction.update(studentRef, { lak: increment(amount) });
                
                const historyRef = doc(collection(studentRef, 'transactions'));
                transaction.set(historyRef, {
                    date: Timestamp.now(), description: `부스 이벤트: ${reason}`, amount: amount, type: 'credit', operator: boothOperatorId
                });
            });
            successCount++;
        } catch (error: any) {
            console.error(`Failed to give points to ${studentId}:`, error);
            failCount++;
            errors.push(error.message || `학생(${studentId}) 처리 실패`);
        }
    }

    return { successCount, failCount, errors: [...new Set(errors)] };
};

export const addBoothReason = async (reason: string) => {
    const reasonsRef = doc(db, 'system_settings', 'booth_reasons');
    await setDoc(reasonsRef, {
        reasons: arrayUnion(reason)
    }, { merge: true });
};

export const deleteBoothReason = async (reason: string) => {
    const reasonsRef = doc(db, 'system_settings', 'booth_reasons');
    await updateDoc(reasonsRef, {
        reasons: arrayRemove(reason)
    });
};

export const sendLetter = async (
  senderUid: string,
  receiverIdentifier: string, // Can be studentId or teacher's nickname
  content: string,
  isOffline: boolean
) => {
  return await runTransaction(db, async (transaction) => {
    const senderRef = doc(db, 'users', senderUid);
    const senderDoc = await transaction.get(senderRef);
    if (!senderDoc.exists()) throw new Error('보내는 사람의 정보를 찾을 수 없습니다.');
    
    const senderData = senderDoc.data();
    const senderStudentId = senderData.studentId;

    let receiverQuery;
    
    // Check if it's a student ID (5 digits) or a teacher nickname (not 5 digits)
    if (/^\d{5}$/.test(receiverIdentifier)) {
        if (senderStudentId === receiverIdentifier) throw new Error('자기 자신에게는 편지를 보낼 수 없습니다.');
        receiverQuery = query(collection(db, 'users'), where('studentId', '==', receiverIdentifier), where('role', '==', 'student'));
    } else {
        receiverQuery = query(collection(db, 'users'), where('nickname', '==', receiverIdentifier), where('role', '==', 'teacher'));
    }

    const receiverSnapshot = await getDocs(receiverQuery);
    if (receiverSnapshot.empty) throw new Error(`'${receiverIdentifier}'에 해당하는 사용자를 찾을 수 없습니다.`);
    
    const receiverDoc = receiverSnapshot.docs[0];
    const receiverRef = receiverDoc.ref;
    const receiverData = receiverDoc.data();
    const receiverIdentifierDisplay = receiverData.role === 'student' ? receiverData.studentId : receiverData.nickname;

    const letterRef = doc(collection(db, 'letters'));
    const letterData = {
      senderUid, 
      senderStudentId, 
      receiverStudentId: receiverIdentifierDisplay,
      content, 
      isOffline, 
      status: 'approved' as const, 
      createdAt: Timestamp.now(), 
      approvedAt: Timestamp.now(),
    };
    transaction.set(letterRef, letterData);

    const reward = 2;
    const senderPoints = senderData.lak || 0;
    let senderRewarded = false;

    if (senderPoints < POINT_LIMIT) {
        if (senderPoints + reward > POINT_LIMIT) {
            throw new Error(`포인트 한도(${POINT_LIMIT}포인트)를 초과하여 지급할 수 없습니다.`);
        }
        transaction.update(senderRef, { lak: increment(reward) });
        const senderHistoryRef = doc(collection(senderRef, 'transactions'));
        transaction.set(senderHistoryRef, {
            amount: reward, date: Timestamp.now(), description: `편지 발신 보상 (받는 사람: ${receiverIdentifierDisplay})`, type: 'credit',
        });
        senderRewarded = true;
    } else {
        const senderHistoryRef = doc(collection(senderRef, 'transactions'));
        transaction.set(senderHistoryRef, {
            amount: 0, date: Timestamp.now(), description: `편지 발신 (포인트 한도 초과, 받는 사람: ${receiverIdentifierDisplay})`, type: 'credit',
        });
    }
    
    // Only give points to receiver if they are a student
    if (receiverData.role === 'student') {
        const receiverPoints = receiverData.lak || 0;
        if (receiverPoints < POINT_LIMIT) {
             if (receiverPoints + reward <= POINT_LIMIT) {
                 transaction.update(receiverRef, { lak: increment(reward) });
                 const receiverHistoryRef = doc(collection(receiverRef, 'transactions'));
                 transaction.set(receiverHistoryRef, {
                    amount: reward, date: Timestamp.now(), description: `편지 수신 (보낸 사람: ${senderStudentId})`, type: 'credit',
                 });
             }
        } else {
            const receiverHistoryRef = doc(collection(receiverRef, 'transactions'));
            transaction.set(receiverHistoryRef, {
                amount: 0, date: Timestamp.now(), description: `편지 수신 (포인트 한도 초과, 보낸 사람: ${senderStudentId})`, type: 'credit',
            });
        }
    }

    let message = '편지가 성공적으로 전송되었습니다!';
    if (senderRewarded) {
        message = '편지가 성공적으로 전송되고 포인트가 지급되었습니다!';
    } else {
        message = '편지가 전송되었습니다. (포인트 한도 초과로 포인트 미지급)';
    }

    return { success: true, message };
  }).catch((error) => {
    console.error("Send letter error: ", error);
    const errorMessage = typeof error === 'string' ? error : error.message || "편지 전송 중 오류가 발생했습니다.";
    return { success: false, message: errorMessage };
  });
};


export const setMaintenanceMode = async (isMaintenance: boolean) => {
    const maintenanceRef = doc(db, 'system_settings', 'maintenance');
    await setDoc(maintenanceRef, { isMaintenanceMode: isMaintenance });
};

export const processPosPayment = async (
    operatorId: string, 
    studentId: string, 
    items: { name: string, quantity: number, price: number, id: string }[],
    totalCost: number
) => {
  return await runTransaction(db, async (transaction) => {
    const studentQuery = query(collection(db, 'users'), where('studentId', '==', studentId), where('role', '==', 'student'));
    const studentSnapshot = await getDocs(studentQuery);

    if (studentSnapshot.empty) {
      throw new Error(`학번 ${studentId}에 해당하는 학생을 찾을 수 없습니다.`);
    }

    const studentRef = studentSnapshot.docs[0].ref;
    const studentDoc = await transaction.get(studentRef);

    if (!studentDoc.exists()) {
      throw new Error("결제 중 학생 정보를 다시 확인하는 데 실패했습니다.");
    }

    const currentPoints = studentDoc.data()?.lak || 0;
    if (currentPoints < totalCost) {
      throw new Error(`포인트가 부족합니다. 현재 보유: ${currentPoints}, 필요: ${totalCost}`);
    }

    for (const item of items) {
        const productRef = doc(db, 'products', item.id);
        const productDoc = await transaction.get(productRef);
        if (!productDoc.exists() || productDoc.data().stock < item.quantity) {
            throw new Error(`'${item.name}' 상품의 재고가 부족합니다.`);
        }
        transaction.update(productRef, { stock: increment(-item.quantity) });
    }

    // Deduct points
    transaction.update(studentRef, { lak: increment(-totalCost) });

    // Add transaction history
    const itemsDescription = items.map(item => `${item.name}x${item.quantity}`).join(', ');
    const historyRef = doc(collection(studentRef, 'transactions'));
    transaction.set(historyRef, {
      date: Timestamp.now(),
      description: `매점 결제: ${itemsDescription}`,
      amount: -totalCost,
      type: 'debit',
      operator: operatorId,
    });
    
     // Log the purchase in a separate collection
    const purchaseRef = doc(collection(db, 'purchases'));
    transaction.set(purchaseRef, {
        userId: studentDoc.id,
        studentId: studentId,
        items: items,
        totalCost: totalCost,
        createdAt: Timestamp.now(),
        status: 'completed', // POS transactions are completed instantly
        operatorId: operatorId
    });


    return { success: true, message: `${studentId} 학생에게서 ${totalCost} 포인트를 성공적으로 차감했습니다.` };
  }).catch((error: any) => {
    console.error("POS Payment error:", error);
    return { success: false, message: error.message || "결제 중 오류가 발생했습니다." };
  });
};


export { auth, db, storage, sendPasswordResetEmail };
