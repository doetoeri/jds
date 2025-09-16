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

export const PlayWordChainInputSchema = z.object({
  userId: z.string().describe('The UID of the user playing the game.'),
  word: z.string().describe('The word submitted by the user.'),
});
export type PlayWordChainInput = z.infer<typeof PlayWordChainInputSchema>;

export const PlayWordChainOutputSchema = z.object({
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

        if (word.length <= 1) {
          throw new Error('단어는 두 글자 이상이어야 합니다.');
        }

        if (history.some((h) => h.text === word)) {
          throw new Error('이미 사용된 단어입니다.');
        }

        if (lastWord && lastWord[lastWord.length - 1] !== word[0]) {
          throw new Error(
            `'${lastWord[lastWord.length - 1]}'(으)로 시작하는 단어를 입력해야 합니다.`
          );
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
