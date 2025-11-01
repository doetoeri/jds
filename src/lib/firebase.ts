'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  updatePassword,
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
const DAILY_POINT_LIMIT = 15;

// --- Utility Functions ---

const generatePaymentCode = (type: 'ONL' | 'POS') => {
    const now = new Date();
    const datePart = now.toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD
    const timePart = now.toTimeString().slice(0, 5).replace(':', ''); // HHMM
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${type}-${datePart}${timePart}-${randomPart}`;
}

const createReport = async (
    userId: string, 
    reason: string, 
    details: Record<string, any>
) => {
    try {
        const userSnap = await getDoc(doc(db, 'users', userId));
        if (!userSnap.exists()) return;

        const userData = userSnap.data();

        await addDoc(collection(db, 'reports'), {
            userId: userId,
            studentId: userData.studentId || 'N/A',
            displayName: userData.displayName || 'N/A',
            reason: reason,
            details: details,
            createdAt: Timestamp.now(),
            status: 'pending' // 'pending', 'resolved'
        });
    } catch (error) {
        console.error("Error creating abuse report:", error);
    }
};

const checkSuspiciousContent = (content: string): boolean => {
    if (content.length < 10) return true;
    const repetitiveChars = /(.)\1{4,}/.test(content); // e.g., 'aaaaa'
    const meaninglessPatterns = /^(asdf|zxcv|qwer|ㅎㅎ|ㅋㅋ|ㅜㅜ|ㅠㅠ|ㅣㅣ)+$/.test(content.replace(/\s/g, ''));
    return repetitiveChars || meaninglessPatterns;
};


// Helper function to handle point distribution
const distributePoints = async (
  transaction: any,
  userRef: any,
  userData: any, // Pass pre-read user data
  pointsToAdd: number,
  historyDesc: string,
  isExemptFromDailyLimit: boolean = false
) => {
    const currentLak = userData.lak || 0;

    let pointsForLak = 0;
    let pointsForPiggyBank = 0;

    if (isExemptFromDailyLimit) {
        // Exempt codes bypass daily limits and go straight to lak or piggy bank based on the 25-point lak limit
        pointsForLak = Math.min(pointsToAdd, Math.max(0, POINT_LIMIT - currentLak));
        pointsForPiggyBank = pointsToAdd - pointsForLak;
    } else {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const dailyEarningRef = doc(db, `users/${userRef.id}/daily_earnings`, today);
        const dailyEarningDoc = await transaction.get(dailyEarningRef);
        const todayEarned = dailyEarningDoc.exists() ? dailyEarningDoc.data().totalEarned : 0;
        
        if (todayEarned >= DAILY_POINT_LIMIT) {
             pointsForLak = 0;
             pointsForPiggyBank = pointsToAdd;
        } else {
            const remainingDailyAllowance = Math.max(0, DAILY_POINT_LIMIT - todayEarned);
            const pointsTowardsDailyLimit = Math.min(pointsToAdd, remainingDailyAllowance);

            // These points can go to lak, up to the 25-point total lak limit
            pointsForLak = Math.min(pointsTowardsDailyLimit, Math.max(0, POINT_LIMIT - currentLak));
            
            // Any leftover points go to piggy bank
            pointsForPiggyBank = pointsToAdd - pointsForLak;
            
            if (pointsTowardsDailyLimit > 0) {
                transaction.set(dailyEarningRef, { totalEarned: increment(pointsTowardsDailyLimit), id: today }, { merge: true });
            }
        }
    }


  if (pointsForLak > 0) {
    transaction.update(userRef, { lak: increment(pointsForLak) });
    const historyRef = doc(collection(userRef, 'transactions'));
    transaction.set(historyRef, {
      date: Timestamp.now(),
      description: historyDesc,
      amount: pointsForLak,
      type: 'credit',
    });
  }

  if (pointsForPiggyBank > 0) {
    transaction.update(userRef, { piggyBank: increment(pointsForPiggyBank) });
    const historyRef = doc(collection(userRef, 'transactions'));
     transaction.set(historyRef, {
      date: Timestamp.now(),
      description: `초과 포인트 저금: ${historyDesc}`,
      amount: pointsForPiggyBank,
      type: 'credit',
      isPiggyBank: true,
    });
  }
};

// --- Main Functions ---

// Sign up function
export const signUp = async (
    userType: 'student' | 'teacher' | 'pending_teacher' | 'council' | 'kiosk',
    userData: { studentId?: string; name?: string; officeFloor?: string; nickname?: string, memo?: string },
    password: string,
    email: string
) => {
  if (userType === 'student' && userData.studentId) {
    if (!/^\d{5}$/.test(userData.studentId)) {
        throw new Error('학번은 5자리 숫자여야 합니다.');
    }
    if (userData.studentId.startsWith('00') || userData.studentId.startsWith('99')) {
        throw new Error('해당 학번 형식은 학생용으로 사용할 수 없습니다.');
    }
  }

  try {
    if (email === 'admin@jongdalsem.com') {
        throw new Error("해당 이메일은 사용할 수 없습니다.");
    }
    
    // For special accounts, the 'email' is a constructed one. Check for ID uniqueness instead.
    if (userType === 'council' || userType === 'kiosk') {
        const existingIdQuery = query(collection(db, "users"), where("studentId", "==", userData.studentId));
        const existingIdSnapshot = await getDocs(existingIdQuery);
        if (!existingIdSnapshot.empty) {
            throw new Error("이미 사용 중인 ID입니다.");
        }
    } else {
        const existingUserQuery = query(collection(db, "users"), where("email", "==", email));
        const existingUserSnapshot = await getDocs(existingUserQuery);
        if (!existingUserSnapshot.empty) {
            throw new Error("이미 가입된 이메일입니다.");
        }
    }
    
    
    if (userType === 'student' && userData.studentId) {
        const studentId = userData.studentId;
        const studentQuery = query(
          collection(db, "users"),
          where("studentId", "==", studentId),
        );
        const studentSnapshot = await getDocs(studentQuery);
        if (!studentSnapshot.empty) {
            throw new Error("이미 등록된 학번입니다.");
        }
    } else if (userType === 'teacher' && userData.nickname) {
        const nicknameQuery = query(collection(db, 'users'), where('nickname', '==', userData.nickname), where('role', '==', 'teacher'));
        const nicknameSnapshot = await getDocs(nicknameQuery);
        if (!nicknameSnapshot.empty) {
            throw new Error("이미 사용 중인 닉네임입니다.");
        }
    }

    const currentAuthUser = auth.currentUser;
    const isKioskSession = currentAuthUser?.email?.startsWith('kiosk@');

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const userDocRef = doc(db, "users", user.uid);
    
    let docData: any = {
        email: email, // Store the auth email, even if it's the constructed one.
        createdAt: Timestamp.now(),
        lak: 0,
        piggyBank: 0,
        lastLogin: Timestamp.now(),
    };

    switch(userType) {
        case 'student':
            const studentId = userData.studentId!;
            docData = {
                ...docData,
                studentId: studentId,
                lak: 7,
                role: 'student',
                displayName: `학생 (${studentId})`,
                avatarGradient: 'orange',
                usedMyId: [],
                usedFriendId: [],
            };
             await runTransaction(db, async (transaction) => {
                transaction.set(userDocRef, docData);
                const historyRef = doc(collection(userDocRef, 'transactions'));
                transaction.set(historyRef, {
                    amount: 7,
                    date: Timestamp.now(),
                    description: '가입 축하 포인트',
                    type: 'credit',
                });
            });
            break;
        case 'teacher':
             docData = {
                ...docData,
                name: userData.name,
                nickname: userData.nickname,
                displayName: `${userData.name} 선생님`,
                officeFloor: userData.officeFloor,
                role: 'pending_teacher',
                avatarGradient: 'blue',
            };
            await setDoc(userDocRef, docData);
            break;
        case 'council':
        case 'kiosk':
             docData = {
                ...docData,
                studentId: userData.studentId, // Custom ID
                name: userData.name,
                displayName: userData.name,
                role: userType,
                memo: userData.memo || null,
            };
            await setDoc(userDocRef, docData);
            break;
    }
    
    // Re-login with the kiosk account if this signup was initiated from a kiosk
    if (isKioskSession) {
      // Add a small delay to prevent race conditions in auth state
      await new Promise(resolve => setTimeout(resolve, 200));
      await signInWithEmailAndPassword(auth, 'kiosk@special.account', '123456');
    }

    return user;
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('이미 사용 중인 이메일 주소 또는 ID입니다.');
    }
    if (error.code === 'auth/weak-password') {
      throw new Error('비밀번호는 6자리 이상이어야 합니다.');
    }
    if (error.code === 'auth/invalid-email') {
      throw new Error('유효하지 않은 형식의 이메일 또는 ID입니다.');
    }
    const currentUser = getAuth().currentUser;
    if (currentUser && currentUser.email === email) {
      await currentUser.delete().catch(e => console.error("Failed to clean up auth user", e));
    }
    throw new Error(error.message || '회원가입 중 오류가 발생했습니다. 다시 시도해주세요.');
  }
};


// Sign in function
export const signIn = async (studentIdOrEmail: string, password: string) => {
  try {
    let finalEmail = studentIdOrEmail;
    
    // If it's a 5-digit number, assume it's a student ID
    if (/^\d{5}$/.test(studentIdOrEmail)) {
        const studentQuery = query(collection(db, 'users'), where('studentId', '==', studentIdOrEmail), where('role', '==', 'student'));
        const studentSnapshot = await getDocs(studentQuery);

        if (studentSnapshot.empty) {
            throw new Error('해당 학번으로 가입된 학생을 찾을 수 없습니다.');
        }
        finalEmail = studentSnapshot.docs[0].data().email;
    } else if (studentIdOrEmail.toLowerCase() === 'admin') {
        finalEmail = 'admin@jongdalsem.com';
    } else if (studentIdOrEmail.indexOf('@') === -1) {
        // It's not an email, not a student ID, maybe a special account ID
        const specialAccountQuery = query(collection(db, 'users'), where('studentId', '==', studentIdOrEmail));
        const specialAccountSnapshot = await getDocs(specialAccountQuery);
        if (!specialAccountSnapshot.empty) {
          finalEmail = specialAccountSnapshot.docs[0].data().email;
        } else {
          // If still not found, we pass the original string to signIn to let Firebase handle it
          // This allows teacher login with email.
        }
    }


    const userCredential = await signInWithEmailAndPassword(auth, finalEmail, password);
    const user = userCredential.user;

    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, { lastLogin: Timestamp.now() });

    return userCredential.user;
    
  } catch (error: any) {
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      throw new Error('학번/ID 또는 비밀번호가 올바르지 않습니다.');
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

export const resetUserPassword = async (userId: string) => {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
        throw new Error('User does not exist.');
    }

    const userEmail = userDoc.data().email;
    if (!userEmail) {
        throw new Error('User email not found.');
    }
    
    await sendPasswordResetEmail(auth, userEmail);
};


// Use Code function
export const useCode = async (userId: string, inputCode: string, partnerStudentId?: string) => {
  const upperCaseCode = inputCode.toUpperCase();
  
  return await runTransaction(db, async (transaction) => {
    const userRef = doc(db, 'users', userId);
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists()) throw "존재하지 않는 사용자입니다.";
    
    const userData = userDoc.data();
    const userStudentId = userData.studentId;
    
    // New: Check if the code is a 5-digit student ID (Friend Invite)
    if (/^\d{5}$/.test(upperCaseCode)) {
        const friendId = upperCaseCode;
        if (friendId === userStudentId) {
            throw "자신의 학번은 친구로 초대할 수 없습니다.";
        }
        
        const friendQuery = query(collection(db, 'users'), where('studentId', '==', friendId));
        const friendSnapshot = await getDocs(friendQuery); // Use getDocs for querying
        if (friendSnapshot.empty) {
            await createReport(userId, "친구 초대 실패 (존재하지 않는 학번)", {
                attemptedFriendId: friendId,
                timestamp: Timestamp.now(),
            });
            throw `학번 ${friendId}에 해당하는 학생을 찾을 수 없습니다.`;
        }

        const friendDoc = friendSnapshot.docs[0];
        const friendRef = friendDoc.ref;
        const friendData = await transaction.get(friendRef);
        if (!friendData.exists()) throw "친구 정보를 찾을 수 없습니다.";
        
        // Check if they already used each other's ID
        const myUsedFriends = userData.usedFriendId || [];
        if (myUsedFriends.includes(friendId)) {
            throw "이미 이 친구의 학번을 사용했습니다.";
        }
        
        const friendUsedMyId = (friendData.data().usedFriendId || []).includes(userStudentId);
        if (friendUsedMyId) {
            throw "이 친구는 이미 당신의 학번을 사용했습니다. 서로 한 번만 사용할 수 있습니다.";
        }

        const invitePoints = 2;
        const oldLak = userData.lak;
        
        // Give points to the user
        await distributePoints(transaction, userRef, userData, invitePoints, `친구 초대 보상 (초대한 친구: ${friendId})`, false);
        
        // Give points to the friend
        await distributePoints(transaction, friendRef, friendData.data(), invitePoints, `친구 초대 보상 (초대받은 친구: ${userStudentId})`, false);
        
        // Update records
        transaction.update(userRef, { usedFriendId: arrayUnion(friendId) });
        transaction.update(friendRef, { usedMyId: arrayUnion(userStudentId) });

        const newLak = (await transaction.get(userRef)).data()?.lak;
        if(newLak > oldLak + 5) { // Threshold for suspicious gain
             await createReport(userId, "의심스러운 친구 초대 포인트 획득", {
                friendId: friendId,
                pointsGained: invitePoints,
                oldBalance: oldLak,
                newBalance: newLak,
                timestamp: Timestamp.now(),
            });
        }


        return { success: true, message: `친구 초대에 성공하여 나와 친구 모두 ${invitePoints}포인트를 받았습니다!` };
    }

    // Check for regular codes
    const codeQuery = query(collection(db, 'codes'), where('code', '==', upperCaseCode));
    const codeSnapshot = await getDocs(codeQuery);
    
    if (codeSnapshot.empty) {
        await createReport(userId, "존재하지 않는 코드 사용 시도", {
            attemptedCode: upperCaseCode,
            timestamp: Timestamp.now(),
        });
        throw "유효하지 않은 코드 또는 학번입니다.";
    }

    const codeDoc = codeSnapshot.docs[0];
    const codeRef = codeDoc.ref;
    const freshCodeData = (await transaction.get(codeRef)).data();
    if (!freshCodeData) throw "코드를 찾을 수 없습니다.";

    const isExempt = freshCodeData.type === '온라인 특수코드' || freshCodeData.type === '히든코드';
    const oldLak = userData.lak;


    switch (freshCodeData.type) {
        case '히든코드':
        if (freshCodeData.used) throw "이미 사용된 코드입니다.";
        if (!partnerStudentId) throw "파트너의 학번이 필요합니다.";
        if (partnerStudentId === userStudentId) throw "자기 자신을 파트너로 지정할 수 없습니다.";
        if (!/^\d{5}$/.test(partnerStudentId)) throw "파트너의 학번은 5자리 숫자여야 합니다.";
        
        const partnerQuery = query(collection(db, 'users'), where('studentId', '==', partnerStudentId), where('role', '==', 'student'));
        const partnerSnapshot = await getDocs(partnerQuery);
        if (partnerSnapshot.empty) throw `학번 ${partnerStudentId}에 해당하는 학생을 찾을 수 없습니다.`;
        
        const partnerRef = partnerSnapshot.docs[0].ref;
        const partnerDoc = await transaction.get(partnerRef);
        if (!partnerDoc.exists()) throw `학번 ${partnerStudentId}에 해당하는 학생 데이터를 찾을 수 없습니다.`;
        const partnerData = partnerDoc.data();

        await distributePoints(transaction, userRef, userData, freshCodeData.value, `히든코드 사용 (파트너: ${partnerStudentId})`, isExempt);
        await distributePoints(transaction, partnerRef, partnerData, freshCodeData.value, `히든코드 파트너 보상 (사용자: ${userStudentId})`, isExempt);
        
        transaction.update(codeRef, { used: true, usedBy: [userStudentId, partnerStudentId] });

        return { success: true, message: `코드를 사용해 나와 파트너 모두 ${freshCodeData.value} 포인트를 받았습니다!` };
        
        case '선착순코드':
        const usedBy = Array.isArray(freshCodeData.usedBy) ? freshCodeData.usedBy : [];
        if (usedBy.includes(userStudentId)) throw "이미 이 코드를 사용했습니다.";
        if (usedBy.length >= freshCodeData.limit) throw "코드가 모두 소진되었습니다. 다음 기회를 노려보세요!";

        await distributePoints(transaction, userRef, userData, freshCodeData.value, `선착순코드 "${freshCodeData.code}" 사용`, isExempt);
        transaction.update(codeRef, { usedBy: arrayUnion(userStudentId) });
        
        return { success: true, message: `선착순 코드를 사용하여 ${freshCodeData.value} 포인트를 적립했습니다!` };

        default:
        if (freshCodeData.used) throw "이미 사용된 코드입니다.";

        await distributePoints(transaction, userRef, userData, freshCodeData.value, `${freshCodeData.type} "${freshCodeData.code}" 사용`, isExempt);
        transaction.update(codeRef, { used: true, usedBy: userStudentId });
        
        const newLak = (await transaction.get(userRef)).data()?.lak;
        if(isExempt && newLak > oldLak + 10) { // High point gain from special code
             await createReport(userId, "의심스러운 특수 코드 사용", {
                code: upperCaseCode,
                pointsGained: freshCodeData.value,
                oldBalance: oldLak,
                newBalance: newLak,
                timestamp: Timestamp.now(),
            });
        }

        return { success: true, message: `${freshCodeData.type}을(를) 사용하여 ${freshCodeData.value} 포인트를 적립했습니다!` };
    }

  }).catch((error) => {
      console.error("Code redemption error: ", error);
      const errorMessage = typeof error === 'string' ? error : (error.message || "코드 사용 중 오류가 발생했습니다.");
      return { success: false, message: errorMessage };
  });
};

// ... (rest of the functions remain the same)


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

    const paymentCode = generatePaymentCode('ONL');
    transaction.update(userRef, { lak: increment(-totalCost) });

    const cartItemsDescription = cart.map(item => `${item.name} x${item.quantity}`).join(', ');

    const historyRef = doc(collection(userRef, 'transactions'));
    transaction.set(historyRef, {
      date: Timestamp.now(),
      description: `상품 구매 (${paymentCode}): ${cartItemsDescription}`,
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
        status: 'pending',
        paymentCode: paymentCode,
    });


    return { success: true, message: `총 ${totalCost} 포인트으로 상품을 구매했습니다! 학생회에 알려 상품을 받아가세요.` };
  }).catch((error: any) => {
    console.error("Purchase error: ", error);
    return { success: false, message: error.message || "구매 중 오류가 발생했습니다." };
  });
};

export const restrictUser = async (userId: string, restrictUntil: Date, reason: string) => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    restrictedUntil: Timestamp.fromDate(restrictUntil),
    restrictionReason: reason,
  });
};

export const unrestrictUser = async (userId: string) => {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
        restrictedUntil: null,
        restrictionReason: null,
    });
};


const deleteCollection = async (collectionPath: string, subcollectionPaths: string[] = []) => {
  const collectionRef = collection(db, collectionPath);
  const q = query(collectionRef);
  const snapshot = await getDocs(q);

  const batch = writeBatch(db);
  for (const docSnapshot of snapshot.docs) {
    for (const sub of subcollectionPaths) {
        await deleteCollection(`${collectionPath}/${docSnapshot.id}/${sub}`);
    }
    batch.delete(docSnapshot.ref);
  }
  await batch.commit();
  console.log(`Deleted collection: ${collectionPath}`);
};

export const resetAllData = async () => {
    try {
        await deleteCollection('codes');
        await deleteCollection('letters');
        await deleteCollection('purchases');
        await deleteCollection('announcements');
        await deleteCollection('communication_channel');
        await deleteCollection('community_posts', ['comments']);
        await deleteCollection('team_links');
        await deleteCollection('team_chats', ['messages']);

        const usersSnapshot = await getDocs(collection(db, 'users'));
        const batch = writeBatch(db);
        for (const userDoc of usersSnapshot.docs) {
            const userRef = userDoc.ref;
            await deleteCollection(`users/${userDoc.id}/transactions`);
            if (userDoc.data().role !== 'admin') {
                batch.update(userRef, { lak: 0, piggyBank: 0, activeTeamId: null });
            }
        }
        await batch.commit();
        
        console.log("All data has been successfully reset.");
    } catch (error) {
        console.error("Error resetting data: ", error);
        throw new Error("데이터 초기화 중 오류가 발생했습니다.");
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
  
  if (data.displayName && auth.currentUser?.uid === userId) {
      await updateProfile(auth.currentUser, { displayName: data.displayName });
  }

  if (Object.keys(updateData).length > 0) {
    await updateDoc(userRef, updateData);
  }
};


export const adjustUserLak = async (userId: string, amount: number, reason: string) => {
  return await runTransaction(db, async (transaction) => {
    const userRef = doc(db, 'users', userId);
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists()) throw new Error("User does not exist.");
    
    if (amount > 0) {
      await distributePoints(transaction, userRef, userDoc.data(), amount, `관리자 조정: ${reason}`, true);
    } else {
      transaction.update(userRef, { lak: increment(amount) });
      const historyRef = doc(collection(userRef, 'transactions'));
      transaction.set(historyRef, {
        date: Timestamp.now(),
        description: `관리자 조정: ${reason}`,
        amount: amount,
        type: 'debit',
      });
    }

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
    
  for (const userId of userIds) {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', userId);
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error(`User with ID ${userId} not found.`);
        if (amount > 0) {
            await distributePoints(transaction, userRef, userDoc.data(), amount, `관리자 일괄 조정: ${reason}`, true);
        } else {
             transaction.update(userRef, { lak: increment(amount) });
            const historyRef = doc(collection(userRef, 'transactions'));
            transaction.set(historyRef, {
                date: Timestamp.now(),
                description: `관리자 일괄 조정: ${reason}`,
                amount: amount,
                type: 'debit',
            });
        }
      });
  }
};

export const bulkSetUserLak = async (userIds: string[], amount: number, reason: string) => {

  for (const userId of userIds) {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', userId);
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) {
            throw new Error(`User with ID ${userId} does not exist.`);
        }
        
        const currentLak = userDoc.data().lak || 0;
        const difference = amount - currentLak;

        transaction.update(userRef, { lak: amount });

        const historyRef = doc(collection(userRef, 'transactions'));
        transaction.set(historyRef, {
            date: Timestamp.now(),
            description: `관리자 일괄 설정: ${reason}`,
            amount: difference,
            type: difference >= 0 ? 'credit' : 'debit',
        });
      });
  }
};


export const updateUserRole = async (userId: string, newRole: 'student' | 'council' | 'kiosk') => {
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

export const updateUserMemo = async (userId: string, memo: string) => {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { memo: memo });
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

export const sendLetter = async (senderUid: string, receiverIdentifier: string, content: string) => {
    return await runTransaction(db, async (transaction) => {
        const senderRef = doc(db, 'users', senderUid);
        const senderDoc = await transaction.get(senderRef);
        if (!senderDoc.exists()) throw new Error('보내는 사람의 정보를 찾을 수 없습니다.');
        const senderData = senderDoc.data();
        const senderStudentId = senderData.studentId;

        if (checkSuspiciousContent(content)) {
            await createReport(senderUid, "성의 없는 편지 작성", {
                content: content,
                receiver: receiverIdentifier,
                timestamp: Timestamp.now(),
            });
        }

        let receiverQuery;
        if (/^\d{5}$/.test(receiverIdentifier)) {
            if (senderStudentId === receiverIdentifier) throw new Error('자기 자신에게는 편지를 보낼 수 없습니다.');
            receiverQuery = query(collection(db, 'users'), where('studentId', '==', receiverIdentifier), where('role', '==', 'student'));
        } else {
            receiverQuery = query(collection(db, 'users'), where('nickname', '==', receiverIdentifier), where('role', '==', 'teacher'));
        }
        
        // This read must be done inside the transaction with transaction.get
        const receiverSnapshot = await getDocs(receiverQuery);
        if (receiverSnapshot.empty) throw new Error(`'${receiverIdentifier}'에 해당하는 사용자를 찾을 수 없습니다.`);
        
        const receiverDoc = receiverSnapshot.docs[0];
        const receiverData = receiverDoc.data();
        const receiverIdentifierDisplay = receiverData.role === 'student' ? receiverData.studentId : receiverData.nickname;

        const letterRef = doc(collection(db, 'letters'));
        const letterData = {
            senderUid,
            senderStudentId: senderData.displayName || senderStudentId,
            receiverStudentId: receiverIdentifierDisplay,
            content,
            isOffline: false,
            status: 'pending' as const,
            createdAt: Timestamp.now(),
        };
        transaction.set(letterRef, letterData);
        
        await distributePoints(transaction, senderRef, senderData, 1, '편지 쓰기 보상', false);

        return { success: true, message: '편지가 성공적으로 전송 요청되었습니다. 관리자 승인 후 전달됩니다.' };
    }).catch((error) => {
        console.error("Send letter error: ", error);
        const errorMessage = typeof error === 'string' ? error : error.message || "편지 전송 중 오류가 발생했습니다.";
        return { success: false, message: errorMessage };
    });
};


export const createCommunityPost = async (userId: string, title: string, content: string) => {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
        throw new Error('사용자 정보를 찾을 수 없습니다.');
    }
    const userData = userDoc.data();

    const postData = {
        authorId: userId,
        authorName: userData.displayName || '익명',
        title: title,
        content: content,
        createdAt: Timestamp.now(),
        commentCount: 0,
    };

    await addDoc(collection(db, 'community_posts'), postData);
};

export const deleteCommunityPost = async (postId: string) => {
    const postRef = doc(db, 'community_posts', postId);
    const commentsQuery = query(collection(db, `community_posts/${postId}/comments`));
    const commentsSnapshot = await getDocs(commentsQuery);
    const batch = writeBatch(db);
    commentsSnapshot.forEach(doc => batch.delete(doc.ref));
    batch.delete(postRef);
    await batch.commit();
};

export const addCommentToPost = async (userId: string, postId: string, text: string) => {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
        throw new Error('사용자 정보를 찾을 수 없습니다.');
    }
    const userData = userDoc.data();

    const postRef = doc(db, 'community_posts', postId);
    const commentData = {
        authorId: userId,
        authorName: userData.displayName,
        avatarGradient: userData.avatarGradient,
        text,
        createdAt: Timestamp.now(),
    };

    await addDoc(collection(postRef, 'comments'), commentData);
    await updateDoc(postRef, { commentCount: increment(1) });
};


export const awardMinesweeperWin = async (userId: string, difficulty: 'easy' | 'medium' | 'hard', time: number) => {
    const userRef = doc(db, 'users', userId);
    
    await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error('사용자를 찾을 수 없습니다.');

        const leaderboardRef = doc(db, `leaderboards/minesweeper-${difficulty}/users`, userId);
        const leaderboardDoc = await transaction.get(leaderboardRef);

        if (!leaderboardDoc.exists() || time < leaderboardDoc.data().score) {
            transaction.set(leaderboardRef, {
                score: time,
                displayName: userDoc.data().displayName,
                studentId: userDoc.data().studentId,
                avatarGradient: userDoc.data().avatarGradient,
                lastUpdated: Timestamp.now(),
            }, { merge: true });
        }

        await distributePoints(transaction, userRef, userDoc.data(), 3, `지뢰찾기 (${difficulty}) 승리 보상`, false);
    });
};

export const awardBreakoutScore = async (userId: string, score: number) => {
    if (score <= 0) return { success: false, message: "점수가 0점 이하는 기록되지 않습니다."};

    const userRef = doc(db, 'users', userId);
    
    await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error('사용자를 찾을 수 없습니다.');

        const leaderboardRef = doc(db, 'leaderboards/breakout/users', userId);
        transaction.set(leaderboardRef, {
            score: increment(score),
            displayName: userDoc.data().displayName,
            studentId: userDoc.data().studentId,
            avatarGradient: userDoc.data().avatarGradient,
            lastUpdated: Timestamp.now()
        }, { merge: true });
        
        const points = Math.floor(score / 10);
        if (points > 0) {
            await distributePoints(transaction, userRef, userDoc.data(), points, `벽돌깨기 점수 보상 (${score}점)`, false);
        }
    });

    const points = Math.floor(score / 10);
    return { success: true, message: `점수 ${score}점이 기록되었습니다!${points > 0 ? ` ${points}포인트를 획득했습니다!` : ''}`};
};

export const setMaintenanceMode = async (isMaintenance: boolean) => {
    const settingsRef = doc(db, 'system_settings', 'main');
    await setDoc(settingsRef, { isMaintenanceMode: isMaintenance }, { merge: true });
};

export const setShopStatus = async (isEnabled: boolean) => {
    const settingsRef = doc(db, 'system_settings', 'main');
    await setDoc(settingsRef, { isShopEnabled: isEnabled }, { merge: true });
};


export const resetLeaderboard = async (leaderboardName: string) => {
    const pathMap: Record<string, string> = {
        'minesweeper-easy': 'leaderboards/minesweeper-easy/users',
        'breakout': 'leaderboards/breakout/users',
        'tetris': 'leaderboards/tetris/users',
    };
    const collectionPath = pathMap[leaderboardName];
    if (!collectionPath) throw new Error("유효하지 않은 리더보드입니다.");

    const snapshot = await getDocs(collection(db, collectionPath));
    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();
};


export const processPosPayment = async (
    operatorId: string, 
    studentId: string, 
    items: { name: string, quantity: number, price: number, id: string }[],
    totalCost: number
) => {
  return await runTransaction(db, async (transaction) => {
    // 1. All reads must come first.
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
    
    const productRefs = items.map(item => doc(db, 'products', item.id));
    const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));

    // 2. Validate all data after reading.
    const studentData = studentDoc.data();
    if ((studentData.lak || 0) < totalCost) {
        throw new Error(`포인트가 부족합니다. (보유: ${studentData.lak || 0}, 필요: ${totalCost})`);
    }

    for (let i = 0; i < items.length; i++) {
      const productDoc = productDocs[i];
      const item = items[i];
      if (!productDoc.exists() || productDoc.data().stock < item.quantity) {
        throw new Error(`'${item.name}' 상품의 재고가 부족합니다.`);
      }
    }

    // 3. All writes come after all reads and validation.
    const paymentCode = generatePaymentCode('POS');
    transaction.update(studentRef, { lak: increment(-totalCost) });

    for (let i = 0; i < items.length; i++) {
      const productRef = productRefs[i];
      const item = items[i];
      transaction.update(productRef, { stock: increment(-item.quantity) });
    }

    const itemsDescription = items.map(item => `${item.name}x${item.quantity}`).join(', ');
    const historyRef = doc(collection(studentRef, 'transactions'));
    transaction.set(historyRef, {
      date: Timestamp.now(),
      description: `매점 결제 (${paymentCode}): ${itemsDescription}`,
      amount: -totalCost,
      type: 'debit',
      operator: operatorId,
    });
    
    const purchaseRef = doc(collection(db, 'purchases'));
    transaction.set(purchaseRef, {
        userId: studentDoc.id,
        studentId: studentId,
        items: items,
        totalCost: totalCost,
        createdAt: Timestamp.now(),
        status: 'pending',
        operatorId: operatorId,
        paymentCode: paymentCode,
    });

    return { success: true, message: `${studentId} 학생에게서 ${totalCost} 포인트를 성공적으로 차감했습니다.` };
  }).catch((error: any) => {
    console.error("POS Payment error:", error);
    return { success: false, message: error.message || "결제 중 오류가 발생했습니다." };
  });
};

export const givePointsToMultipleStudentsAtBooth = async (
  operatorId: string,
  studentIds: string[],
  value: number,
  reason: string
) => {
  const result = { successCount: 0, failCount: 0, errors: [] as string[] };
  
  for (const studentId of studentIds) {
    try {
       await runTransaction(db, async (transaction) => {
        const studentQuery = query(
          collection(db, 'users'),
          where('studentId', '==', studentId)
        );
        const studentSnapshot = await getDocs(studentQuery);

        if (studentSnapshot.empty) {
          throw new Error(`학번 ${studentId} 학생 없음`);
        }

        const studentDoc = studentSnapshot.docs[0];
        const studentRef = studentDoc.ref;
        const freshStudentData = await transaction.get(studentRef);
        if(!freshStudentData.exists()) {
            throw new Error(`학생 데이터를 찾을 수 없습니다: ${studentId}`);
        }
        
        await distributePoints(transaction, studentRef, freshStudentData.data(), value, `부스 참여: ${reason}`, false);
      });
      result.successCount++;
    } catch (error: any) {
      result.failCount++;
      result.errors.push(error.message);
      console.error(`Failed to process student ${studentId}:`, error);
    }
  }

  return result;
};


export const awardLeaderboardRewards = async (leaderboardName: string) => {
  const leaderboardIdMap: Record<string, { path: string, order: 'desc' | 'asc' }> = {
    'minesweeper-easy': { path: 'leaderboards/minesweeper-easy/users', order: 'asc' },
    'breakout': { path: 'leaderboards/breakout/users', order: 'desc' },
    'tetris': { path: 'leaderboards/tetris/users', order: 'desc' },
  };

  const gameInfo = leaderboardIdMap[leaderboardName];
  if (!gameInfo) {
    throw new Error('유효하지 않은 리더보드 이름입니다.');
  }

  const { path, order } = gameInfo;
  const rewards = [10, 7, 5, 3, 1]; // Points for 1st to 5th
  let successCount = 0;
  let failCount = 0;

  const usersRef = collection(db, path);
  const q = query(usersRef, orderBy('score', order), limit(5));
  
  const snapshot = await getDocs(q);

  for (const [index, docSnapshot] of snapshot.docs.entries()) {
    const rankerId = docSnapshot.id;
    const rewardAmount = rewards[index];
    
    if (rankerId && rewardAmount) {
       try {
            await runTransaction(db, async (transaction) => {
                const userRef = doc(db, 'users', rankerId);
                const userDoc = await transaction.get(userRef);
                if(!userDoc.exists()) throw new Error("Ranker user not found");
                await distributePoints(transaction, userRef, userDoc.data(), rewardAmount, `리더보드 보상 (${leaderboardName} ${index + 1}등)`, true);
                successCount++;
            });
       } catch (error) {
           console.error(`Failed to reward ${rankerId}:`, error);
           failCount++;
       }
    }
  }
  
  return { successCount, failCount };
};

export const awardTetrisScore = async (userId: string, score: number) => {
    if (score <= 0) return { success: false, message: "점수가 0점 이하는 기록되지 않습니다."};
    const userRef = doc(db, 'users', userId);
    
    await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error('사용자를 찾을 수 없습니다.');
        const userData = userDoc.data();

        const points = Math.floor(score / 500); // 500점당 1포인트
        if(points > 0) {
            await distributePoints(transaction, userRef, userData, points, `테트리스 플레이 보상 (${score}점)`, false);
        }

        const leaderboardRef = doc(db, 'leaderboards/tetris/users', userId);
        const leaderboardDoc = await transaction.get(leaderboardRef);

        if (!leaderboardDoc.exists() || score > (leaderboardDoc.data().score || 0)) {
            transaction.set(leaderboardRef, {
                score: score,
                displayName: userDoc.data().displayName,
                studentId: userDoc.data().studentId,
                avatarGradient: userDoc.data().avatarGradient,
                lastUpdated: Timestamp.now()
            }, { merge: true });
        }
    });

    const points = Math.floor(score / 500);
    return { success: true, message: `점수 ${score}점이 기록되었습니다!${points > 0 ? ` ${points}포인트를 획득했습니다!` : ''}`};
};

export const voteOnPoll = async (userId: string, pollId: string, option: string) => {
  return await runTransaction(db, async (transaction) => {
    const pollRef = doc(db, 'polls', pollId);
    const pollDoc = await transaction.get(pollRef);

    if (!pollDoc.exists()) {
      throw new Error("설문조사를 찾을 수 없습니다.");
    }

    const pollData = pollDoc.data();
    if (!pollData.isActive) {
      throw new Error("이미 종료된 설문조사입니다.");
    }
    
    const allVotes = Object.values(pollData.votes || {}).flat();
    if (allVotes.includes(userId)) {
        throw new Error("이미 이 설문조사에 투표했습니다.");
    }

    // This is not a great way to handle nested objects, but it's a workaround for this specific structure.
    const newVotes = { ...pollData.votes };
    if (!newVotes[option]) {
        newVotes[option] = [];
    }
    newVotes[option].push(userId);
    
    transaction.update(pollRef, { votes: newVotes });
  });
};

export const updateBoothReasons = async (reasons: string[]) => {
    const settingsRef = doc(db, 'system_settings', 'booth_reasons');
    await setDoc(settingsRef, { reasons }, { merge: true });
};

export const sendNotification = async (roleCode: string, message: string) => {
    if (!roleCode || !message) {
        throw new Error('호출 코드와 메시지는 필수입니다.');
    }
    await addDoc(collection(db, 'notifications'), {
        roleCode,
        message,
        createdAt: Timestamp.now()
    });
};

export const submitPoem = async (studentId: string, poemContent: string) => {
  return await runTransaction(db, async (transaction) => {
    const userQuery = query(collection(db, 'users'), where('studentId', '==', studentId));
    const userSnapshot = await getDocs(userQuery);
    if (userSnapshot.empty) {
      throw new Error('학생 정보를 찾을 수 없습니다.');
    }
    const userRef = userSnapshot.docs[0].ref;
    const userDoc = await transaction.get(userRef);
    if(!userDoc.exists()) throw new Error('학생 데이터를 찾을 수 없습니다.');
    
    if (checkSuspiciousContent(poemContent)) {
        await createReport(userDoc.id, "성의 없는 삼행시 작성", {
            content: poemContent,
            timestamp: Timestamp.now(),
        });
    }
    
    const today = new Date().toISOString().split('T')[0];
    const usageRef = doc(collection(db, 'kiosk_usage'));
    transaction.set(usageRef, {
        studentId,
        activity: 'poem',
        date: today,
        timestamp: Timestamp.now()
    });

    const poemRef = doc(collection(db, 'poems'));
    transaction.set(poemRef, {
      studentId,
      content: poemContent,
      createdAt: Timestamp.now(),
    });

    await distributePoints(transaction, userRef, userDoc.data(), 5, '삼행시 참여 보상', false);
  });
};

export const sendSecretLetter = async (senderStudentId: string, receiverIdentifier: string, content: string) => {
  return await runTransaction(db, async (transaction) => {
    const senderQuery = query(collection(db, 'users'), where('studentId', '==', senderStudentId));
    const senderSnapshot = await getDocs(senderQuery);
    if (senderSnapshot.empty) throw new Error('보내는 학생 정보를 찾을 수 없습니다.');
    const senderRef = senderSnapshot.docs[0].ref;
    const senderDoc = await transaction.get(senderRef);
    if(!senderDoc.exists()) throw new Error('보내는 학생 데이터를 찾을 수 없습니다.');

    if (checkSuspiciousContent(content)) {
        await createReport(senderDoc.id, "성의 없는 비밀 편지 작성", {
            content: content,
            receiver: receiverIdentifier,
            timestamp: Timestamp.now(),
        });
    }

    // We don't check receiver for this special kiosk function to allow sending to anyone.
    const today = new Date().toISOString().split('T')[0];
    const usageRef = doc(collection(db, 'kiosk_usage'));
    transaction.set(usageRef, {
        studentId: senderStudentId,
        activity: 'letter',
        date: today,
        timestamp: Timestamp.now()
    });
    
    const letterRef = doc(collection(db, 'letters'));
    transaction.set(letterRef, {
      senderStudentId: '익명', // Anonymous sender
      receiverStudentId: receiverIdentifier,
      content,
      isOffline: true, // Secret letters are always offline for review.
      status: 'pending',
      createdAt: Timestamp.now(),
    });

    await distributePoints(transaction, senderRef, senderDoc.data(), 5, '비밀 편지 작성 보상', false);
  });
};

export const setGlobalDiscount = async (discount: number) => {
    const settingsRef = doc(db, 'system_settings', 'main');
    await setDoc(settingsRef, { globalDiscount: discount }, { merge: true });
};

export const bulkUpdateProductPrices = async (multiplier: number) => {
  if (isNaN(multiplier) || multiplier < 0) {
    throw new Error("유효한 배율(0 또는 양수)을 입력해야 합니다.");
  }
  const productsRef = collection(db, "products");
  const snapshot = await getDocs(productsRef);
  const batch = writeBatch(db);

  snapshot.forEach(doc => {
    const product = doc.data();
    const currentPrice = product.price || 0;
    const newPrice = Math.round(currentPrice * multiplier);
    batch.update(doc.ref, { price: newPrice });
  });

  await batch.commit();
};

export const submitPurchaseDispute = async (userId: string, purchaseId: string, reason: string) => {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) throw new Error("User data not found.");
    
    const purchaseRef = doc(db, 'purchases', purchaseId);
    const purchaseDoc = await getDoc(purchaseRef);
    if (!purchaseDoc.exists()) throw new Error("Purchase not found.");
    if (purchaseDoc.data().userId !== userId) throw new Error("Not authorized to dispute this purchase.");

    const disputeData = {
        userId,
        purchaseId,
        reason,
        studentId: userDoc.data().studentId,
        purchaseItems: purchaseDoc.data().items,
        status: 'open',
        createdAt: Timestamp.now(),
    };

    await addDoc(collection(db, 'disputes'), disputeData);
    await updateDoc(purchaseRef, { disputeStatus: 'open' });
};

export const resolvePurchaseDispute = async (disputeId: string, purchaseId: string) => {
    const disputeRef = doc(db, 'disputes', disputeId);
    const purchaseRef = doc(db, 'purchases', purchaseId);
    
    const batch = writeBatch(db);
    batch.update(disputeRef, { status: 'resolved' });
    batch.update(purchaseRef, { disputeStatus: 'resolved' });
    
    await batch.commit();
};


export { auth, db, storage };
