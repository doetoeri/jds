
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
import { playWordChain as playWordChainFlow } from '@/ai/flows/play-word-chain-flow';


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
            
            const teamLinkRef = doc(collection(db, 'team_links'));
            
            transaction.set(userDocRef, {
                studentId: studentId,
                email: email,
                lak: 3,
                createdAt: Timestamp.now(),
                mateCode: mateCode,
                role: 'student',
                displayName: `학생 (${studentId})`,
                avatarGradient: 'orange',
                activeTeamId: teamLinkRef.id, 
            });
            
            const historyRef = doc(collection(userDocRef, 'transactions'));
            transaction.set(historyRef, {
                amount: 3,
                date: Timestamp.now(),
                description: '가입 축하 포인트',
                type: 'credit',
            });
            
            transaction.set(teamLinkRef, {
                ownerUid: user.uid,
                ownerStudentId: studentId,
                members: [studentId],
                isComplete: false,
                createdAt: Timestamp.now(),
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
            lak: 0,
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
  
  return await runTransaction(db, async (transaction) => {
    const userRef = doc(db, 'users', userId);
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists()) throw "존재하지 않는 사용자입니다.";
    
    const userData = userDoc.data();
    const userStudentId = userData.studentId;
    const userCurrentLak = userData.lak || 0;

    const codeQuery = query(collection(db, 'codes'), where('code', '==', upperCaseCode));
    const codeSnapshot = await getDocs(codeQuery); // Use getDocs outside transaction for reads

    if (codeSnapshot.empty) {
        // If no regular code found, check if it's a mate code
        const mateCodeOwnerQuery = query(collection(db, 'users'), where('mateCode', '==', upperCaseCode));
        const mateCodeOwnerSnapshot = await getDocs(mateCodeOwnerQuery);

        if (mateCodeOwnerSnapshot.empty) {
            throw "유효하지 않은 코드입니다.";
        }
        // It's a mate code, proceed with mate code logic
    }
    
    const isMateCode = codeSnapshot.empty;

    if (isMateCode) {
        const mateCodeOwnerQuery = query(collection(db, 'users'), where('mateCode', '==', upperCaseCode));
        const ownerSnapshot = await getDocs(mateCodeOwnerQuery);
        const ownerDoc = ownerSnapshot.docs[0];
        const ownerData = ownerDoc.data();
        const ownerRef = ownerDoc.ref;
        const ownerStudentId = ownerData.studentId;

        if (ownerStudentId === userStudentId) throw "자신의 메이트코드는 사용할 수 없습니다.";

        let teamToJoinId = ownerData.activeTeamId;
        
        // If the owner doesn't have an active team, create one for both users.
        if (!teamToJoinId) {
            const newTeamRef = doc(collection(db, 'team_links'));
            transaction.set(newTeamRef, {
                ownerUid: ownerRef.id,
                ownerStudentId: ownerStudentId,
                members: [ownerStudentId, userStudentId], // Start team with both
                isComplete: false,
                createdAt: Timestamp.now(),
            });
            teamToJoinId = newTeamRef.id;
            transaction.update(ownerRef, { activeTeamId: teamToJoinId });
            transaction.update(userRef, { activeTeamId: teamToJoinId });
            return { success: true, message: `새로운 팀을 만들었습니다! ${3}명만 더 모으면 보너스 포인트를 받을 수 있습니다!` };
        }

        const teamLinkRef = doc(db, 'team_links', teamToJoinId);
        const teamLinkDoc = await transaction.get(teamLinkRef);

        if (!teamLinkDoc.exists()) throw new Error("가입하려는 팀을 찾을 수 없습니다.");
        
        const teamLinkData = teamLinkDoc.data();
        if (teamLinkData.members && teamLinkData.members.includes(userStudentId)) throw new Error("이미 이 팀에 합류했습니다.");
        if (teamLinkData.isComplete) throw new Error("이 팀은 이미 5명이 모두 모여 마감되었습니다.");

        const newMembers = [...(teamLinkData.members || []), userStudentId];
        transaction.update(teamLinkRef, { members: newMembers });
        
        transaction.update(userRef, { activeTeamId: teamToJoinId });

        if (newMembers.length === 5) {
            transaction.update(teamLinkRef, { isComplete: true, completedAt: Timestamp.now() });
            const teamLinkBonus = 7;
            
            for (const memberStudentId of newMembers) {
                const memberQuery = query(collection(db, 'users'), where('studentId', '==', memberStudentId));
                const memberDocs = await getDocs(memberQuery);
                if (!memberDocs.empty) {
                    const memberDoc = memberDocs.docs[0];
                    const memberRef = memberDoc.ref;
                    const memberData = memberDoc.data();
                    const currentPoints = memberData.lak || 0;

                    if (currentPoints < POINT_LIMIT && currentPoints + teamLinkBonus <= POINT_LIMIT) {
                        transaction.update(memberRef, { lak: increment(teamLinkBonus) });
                        const historyRef = doc(collection(memberRef, 'transactions'));
                        transaction.set(historyRef, {
                            amount: teamLinkBonus, date: Timestamp.now(), description: `팀 링크 완성 보너스!`, type: 'credit',
                        });
                    }

                    const newTeamRef = doc(collection(db, 'team_links'));
                    transaction.set(newTeamRef, {
                        ownerUid: memberDoc.id,
                        ownerStudentId: memberStudentId,
                        members: [memberStudentId],
                        isComplete: false,
                        createdAt: Timestamp.now(),
                    });
                    transaction.update(memberRef, { activeTeamId: newTeamRef.id });
                }
            }
            return { success: true, message: `축하합니다! 5명의 팀을 완성하여 모두 ${teamLinkBonus} 포인트를 받았습니다!` };
        } else {
            return { success: true, message: `팀에 합류했습니다. ${5 - newMembers.length}명만 더 모으면 보너스 포인트를 받을 수 있습니다!` };
        }
    }


    // Logic for regular codes
    const codeDoc = codeSnapshot.docs[0];
    const codeRef = codeDoc.ref;
    
    const freshCodeDoc = await transaction.get(codeRef);
    const freshCodeData = freshCodeDoc.data();
    if (!freshCodeData) throw "코드를 찾을 수 없습니다.";

    const checkAndIncrementPoints = (ref: any, currentPoints: number, pointsToAdd: number, historyDesc: string) => {
      if (currentPoints >= POINT_LIMIT) {
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
      const historyRef = doc(collection(userRef, 'transactions'));
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
                batch.update(userRef, { lak: 0, activeTeamId: null });
            }
        }
        await batch.commit();
        
        console.log("All data has been successfully reset.");
    } catch (error) {
        console.error("Error resetting data: ", error);
        throw new Error("데이터 초기화 중 오류가 발생했습니다.");
    }
};

export async function playWordChain(userId: string, word: string) {
  try {
    const result = await playWordChainFlow({ userId, word });
    return result;
  } catch (error: any) {
    console.error('Word chain error:', error);
    const errorMessage = error.message || 'An unknown error occurred.';
    return { success: false, message: errorMessage };
  }
}


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
        
        batch.update(userRef, { lak: increment(amount) });

        const historyRef = doc(collection(userRef, 'transactions'));
        batch.set(historyRef, {
            date: Timestamp.now(),
            description: `관리자 일괄 조정: ${reason}`,
            amount: amount,
            type: amount > 0 ? 'credit' : 'debit',
        });
    }
    await batch.commit();
};

export const bulkSetUserLak = async (userIds: string[], amount: number, reason: string) => {

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

export const sendLetter = async (senderUid: string, receiverIdentifier: string, content: string, isOffline: boolean) => {
  return await runTransaction(db, async (transaction) => {
    const senderRef = doc(db, 'users', senderUid);
    const senderDoc = await transaction.get(senderRef);
    if (!senderDoc.exists()) throw new Error('보내는 사람의 정보를 찾을 수 없습니다.');
    const senderData = senderDoc.data();
    const senderStudentId = senderData.studentId;

    let receiverQuery;
    
    if (/^\d{5}$/.test(receiverIdentifier)) {
      if (senderStudentId === receiverIdentifier) throw new Error('자기 자신에게는 편지를 보낼 수 없습니다.');
      receiverQuery = query(collection(db, 'users'), where('studentId', '==', receiverIdentifier), where('role', '==', 'student'));
    } else {
      receiverQuery = query(collection(db, 'users'), where('nickname', '==', receiverIdentifier), where('role', '==', 'teacher'));
    }

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
      isOffline, 
      status: 'pending' as const, 
      createdAt: Timestamp.now(), 
    };
    transaction.set(letterRef, letterData);

    return { success: true, message: '편지가 성공적으로 전송 요청되었습니다. 관리자 승인 후 전달됩니다.' };
  }).catch((error) => {
    console.error("Send letter error: ", error);
    const errorMessage = typeof error === 'string' ? error : error.message || "편지 전송 중 오류가 발생했습니다.";
    return { success: false, message: errorMessage };
  });
};

export const postTeamChatMessage = async (userId: string, teamId: string, text: string) => {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) throw new Error('사용자 정보를 찾을 수 없습니다.');
    const userData = userDoc.data();

    const teamRef = doc(db, 'team_links', teamId);
    const teamDoc = await getDoc(teamRef);
    if (!teamDoc.exists()) throw new Error('팀 정보를 찾을 수 없습니다.');
    
    const teamData = teamDoc.data();
    if (!teamData.members.includes(userData.studentId)) {
        throw new Error('팀 멤버만 채팅에 참여할 수 있습니다.');
    }

    const messageData = {
        uid: userId,
        text: text,
        createdAt: Timestamp.now(),
        displayName: userData.displayName,
        avatarGradient: userData.avatarGradient || 'orange',
    };

    const messagesCollection = collection(db, `team_chats/${teamId}/messages`);
    await addDoc(messagesCollection, messageData);
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
  const userDoc = await getDoc(userRef);
  if (!userDoc.exists()) throw new Error('사용자를 찾을 수 없습니다.');
  
  const leaderboardRef = doc(db, `leaderboards/minesweeper-${difficulty}/users`, userId);
  const leaderboardDoc = await getDoc(leaderboardRef);

  if (!leaderboardDoc.exists() || time < leaderboardDoc.data().score) {
    await setDoc(leaderboardRef, {
      score: time,
      displayName: userDoc.data().displayName,
      studentId: userDoc.data().studentId,
      avatarGradient: userDoc.data().avatarGradient,
      lastUpdated: Timestamp.now(),
    }, { merge: true });
  }
};

export const awardBreakoutScore = async (userId: string, bricksBroken: number) => {
    if (bricksBroken <= 0) return { success: false, message: "점수가 0점 이하는 기록되지 않습니다."};

    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) throw new Error('사용자를 찾을 수 없습니다.');

    const leaderboardRef = doc(db, 'leaderboards/breakout/users', userId);
    
    await setDoc(leaderboardRef, {
        score: increment(bricksBroken),
        displayName: userDoc.data().displayName,
        studentId: userDoc.data().studentId,
        avatarGradient: userDoc.data().avatarGradient,
        lastUpdated: Timestamp.now()
    }, { merge: true });

    return { success: true, message: `점수 ${bricksBroken}점이 기록되었습니다!`};
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
        const studentQuery = query(collection(db, 'users'), where('studentId', '==', studentId), where('role', '==', 'student'));
        const studentSnapshot = await getDocs(studentQuery);

        if (studentSnapshot.empty) {
          throw new Error(`학번 ${studentId} 학생 없음`);
        }
        
        const studentRef = studentSnapshot.docs[0].ref;
        transaction.update(studentRef, { lak: increment(value) });

        const historyRef = doc(collection(studentRef, 'transactions'));
        transaction.set(historyRef, {
          date: Timestamp.now(),
          description: `부스 참여: ${reason}`,
          amount: value,
          type: 'credit',
          operator: operatorId,
        });
      });
      result.successCount++;
    } catch (error: any) {
      result.failCount++;
      result.errors.push(error.message);
    }
  }

  return result;
};


export const awardLeaderboardRewards = async (leaderboardName: string) => {
  const leaderboardIdMap: Record<string, { path: string, order: 'desc' | 'asc' }> = {
    'word-chain': { path: 'leaderboards/word-chain/users', order: 'desc' },
    'minesweeper-easy': { path: 'leaderboards/minesweeper-easy/users', order: 'asc' },
    'breakout': { path: 'leaderboards/breakout/users', order: 'desc' },
    'tetris': { path: 'leaderboards/tetris/users', order: 'desc' },
  };

  const gameInfo = leaderboardIdMap[leaderboardName];
  if (!gameInfo) {
    throw new Error('유효하지 않은 리더보드 이름입니다.');
  }

  const { path, order } = gameInfo;
  const rewards = [10, 7, 5, 3, 1]; // 1등부터 5등까지 보상
  let successCount = 0;
  let failCount = 0;

  const usersRef = collection(db, path);
  const q = query(usersRef, orderBy('score', order), limit(5));
  const snapshot = await getDocs(q);

  const batch = writeBatch(db);

  snapshot.docs.forEach((docSnapshot, index) => {
    const rankerId = docSnapshot.id;
    const rewardAmount = rewards[index];
    
    if (rankerId && rewardAmount) {
      const userRef = doc(db, 'users', rankerId);
      batch.update(userRef, { lak: increment(rewardAmount) });
      
      const historyRef = doc(collection(userRef, 'transactions'));
      batch.set(historyRef, {
        date: Timestamp.now(),
        description: `리더보드 보상 (${leaderboardName} ${index + 1}등)`,
        amount: rewardAmount,
        type: 'credit',
      });
      successCount++;
    } else {
      failCount++;
    }
  });

  await batch.commit();
  return { successCount, failCount };
};

export const awardTetrisScore = async (userId: string, score: number) => {
    if (score <= 0) return { success: false, message: "점수가 0점 이하는 기록되지 않습니다."};
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) throw new Error('사용자를 찾을 수 없습니다.');

    const points = Math.floor(score / 500); // 500점당 1포인트
    if(points > 0) {
        await updateDoc(userRef, { lak: increment(points) });
        const historyRef = doc(collection(userRef, 'transactions'));
        await setDoc(historyRef, {
            amount: points, date: Timestamp.now(), description: `테트리스 플레이 보상 (${score}점)`, type: 'credit',
        });
    }

    const leaderboardRef = doc(db, 'leaderboards/tetris/users', userId);
    const leaderboardDoc = await getDoc(leaderboardRef);

    // Only update if the new score is higher
    if (!leaderboardDoc.exists() || score > (leaderboardDoc.data().score || 0)) {
        await setDoc(leaderboardRef, {
            score: score,
            displayName: userDoc.data().displayName,
            studentId: userDoc.data().studentId,
            avatarGradient: userDoc.data().avatarGradient,
            lastUpdated: Timestamp.now()
        }, { merge: true });
    }

    return { success: true, message: `점수 ${score}점이 기록되었습니다!${points > 0 ? ` ${points}포인트를 획득했습니다!` : ''}`};
};

export { auth, db, storage, sendPasswordResetEmail };

    