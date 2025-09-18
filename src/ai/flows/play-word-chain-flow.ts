
'use server';
/**
 * @fileOverview A Genkit flow for the word chain game.
 * - playWordChain - A function that handles the word chain game logic.
 * - PlayWordChainInput - The input type for the playWordChain function.
 * - PlayWordChainOutput - The return type for the playWordChain function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import {
  getFirestore,
  doc,
  runTransaction,
  collection,
  Timestamp,
  increment,
  arrayUnion,
} from 'firebase/firestore';
import { getApps, getApp, initializeApp } from 'firebase/app';

// This is a simplified Firebase initialization for the server-side flow.
// It assumes the environment is already configured for Firebase.
const firebaseConfig = {
  projectId: 'jongdalsem-hub',
  appId: '1:145118642611:web:3d29407e957e6ea4f18bc6',
  storageBucket: 'jongdalsam-hub.appspot.com',
  apiKey: 'AIzaSyCKRYChw1X_FYRhcGxk13B_s2gOgZoZiyc',
  authDomain: 'jongdalsam-hub.firebaseapp.com',
  measurementId: '',
  messagingSenderId: '145118642611',
};
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

const PlayWordChainInputSchema = z.object({
  userId: z.string().describe('The UID of the user playing the game.'),
  word: z.string().describe('The word submitted by the user.'),
});
export type PlayWordChainInput = z.infer<typeof PlayWordChainInputSchema>;

const PlayWordChainOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type PlayWordChainOutput = z.infer<typeof PlayWordChainOutputSchema>;

export async function playWordChain(
  input: PlayWordChainInput
): Promise<PlayWordChainOutput> {
  return playWordChainFlow(input);
}

const playWordChainFlow = ai.defineFlow(
  {
    name: 'playWordChainFlow',
    inputSchema: PlayWordChainInputSchema,
    outputSchema: PlayWordChainOutputSchema,
  },
  async ({ userId, word }) => {
    try {
      const result = await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', userId);
        const gameRef = doc(db, 'games', 'word-chain');
        const leaderboardRef = doc(
          db,
          `leaderboards/word-chain/users`,
          userId
        );

        const [userDoc, gameDoc] = await Promise.all([
          transaction.get(userRef),
          transaction.get(gameRef),
        ]);

        if (!userDoc.exists()) {
          throw new Error('User data not found.');
        }
        const userData = userDoc.data();

        const history: { text: string; uid: string }[] = gameDoc.exists()
          ? gameDoc.data().history || []
          : [];
        const lastWord =
          history.length > 0 ? history[history.length - 1].text : null;
        const lastChar = lastWord ? lastWord[lastWord.length - 1] : null;

        if (word.length <= 1) {
          throw new Error('단어는 두 글자 이상이어야 합니다.');
        }

        if (history.some((h) => h.text === word)) {
          throw new Error('이미 사용된 단어입니다.');
        }

        if (lastChar) {
          const firstChar = word[0];
          let isValid = lastChar === firstChar;

          // 두음법칙 적용
          if (!isValid) {
            // 'ㄹ' -> 'ㅇ' 또는 'ㄴ'
            if (lastChar === '라' && (firstChar === '아' || firstChar === '나')) isValid = true;
            if (lastChar === '락' && (firstChar === '악' || firstChar === '낙')) isValid = true;
            if (lastChar === '란' && (firstChar === '안' || firstChar === '난')) isValid = true;
            if (lastChar === '람' && (firstChar === '암' || firstChar === '남')) isValid = true;
            if (lastChar === '랑' && (firstChar === '앙' || firstChar === '낭')) isValid = true;
            if (lastChar === '래' && (firstChar === '애' || firstChar === '내')) isValid = true;
            if (lastChar === '랭' && (firstChar === '앵' || firstChar === '냉')) isValid = true;
            if (lastChar === '로' && (firstChar === '오' || firstChar === '노')) isValid = true;
            if (lastChar === '록' && (firstChar === '옥' || firstChar === '녹')) isValid = true;
            if (lastChar === '론' && (firstChar === '온' || firstChar === '논')) isValid = true;
            if (lastChar === '롱' && (firstChar === '옹' || firstChar === '농')) isValid = true;
            if (lastChar === '뢰' && (firstChar === '외' || firstChar === '뇌')) isValid = true;
            if (lastChar === '료' && (firstChar === '요' || firstChar === '뇨')) isValid = true;
            if (lastChar === '룡' && (firstChar === '용' || firstChar === '뇽')) isValid = true;
            if (lastChar === '루' && (firstChar === '우' || firstChar === '누')) isValid = true;
            if (lastChar === '류' && (firstChar === '유' || firstChar === '뉴')) isValid = true;
            if (lastChar === '륙' && (firstChar === '육' || firstChar === '뉵')) isValid = true;
            if (lastChar === '륜' && (firstChar === '윤' || firstChar === '뉸')) isValid = true;
            if (lastChar === '률' && (firstChar === '율' || firstChar === '뉼')) isValid = true;
            if (lastChar === '르' && (firstChar === '으' || firstChar === '느')) isValid = true;
            if (lastChar === '름' && (firstChar === '음' || firstChar === '늠')) isValid = true;
            if (lastChar === '리' && (firstChar === '이' || firstChar === '니')) isValid = true;
            // 'ㄴ' -> 'ㅇ'
            if (lastChar === '녀' && firstChar === '여') isValid = true;
            if (lastChar === '뇨' && firstChar === '요') isValid = true;
            if (lastChar === '뉴' && firstChar === '유') isValid = true;
            if (lastChar === '니' && firstChar === '이') isValid = true;
          }
          
          if (!isValid) {
            throw new Error(
              `'${lastChar}'(으)로 시작하는 단어를 입력해야 합니다.`
            );
          }
        }

        const newHistoryEntry = {
          text: word,
          uid: userId,
          displayName: userData.displayName,
          avatarGradient: userData.avatarGradient || 'orange',
          createdAt: Timestamp.now(),
        };
        transaction.update(gameRef, { history: arrayUnion(newHistoryEntry) });

        transaction.set(
          leaderboardRef,
          {
            score: increment(1),
            displayName: userData.displayName,
            studentId: userData.studentId,
            avatarGradient: userData.avatarGradient,
            lastUpdated: Timestamp.now(),
          },
          { merge: true }
        );

        return { success: true, message: `성공! 점수가 기록되었습니다.` };
      });
      return result;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || '끝말잇기 처리 중 오류가 발생했습니다.',
      };
    }
  }
);
