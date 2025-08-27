
'use server';

/**
 * @fileOverview An AI Word-Chain (끝말잇기) agent.
 *
 * - playWordChain - A function that handles the word chain game logic.
 * - WordChainInput - The input type for the playWordChain function.
 * - WordChainOutput - The return type for the playWordChain function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const WordChainTurnSchema = z.object({
  speaker: z.enum(['user', 'ai']),
  word: z.string(),
});

const WordChainInputSchema = z.object({
  word: z.string(),
  history: z.array(WordChainTurnSchema),
});
export type WordChainInput = z.infer<typeof WordChainInputSchema>;

const WordChainOutputSchema = z.object({
  isValid: z.boolean(),
  isGameOver: z.boolean(),
  aiWord: z.string().optional(),
  reason: z.string(),
});
export type WordChainOutput = z.infer<typeof WordChainOutputSchema>;


const wordChainPrompt = ai.definePrompt({
    name: 'wordChainPrompt',
    input: { schema: WordChainInputSchema },
    output: { schema: WordChainOutputSchema },
    model: 'googleai/gemini-1.5-flash-latest',
    prompt: `You are a master of the Korean word chain game (끝말잇기).
Your role is to act as the opponent and referee.

The user has just said the word: "{{word}}"

Here is the game history so far:
{{#each history}}
- {{speaker}}: {{word}}
{{/each}}

Follow these rules strictly:
1.  **Game Start**: If the user's word is "시작" (start), it's a signal to begin the game. You must respond with your first word. Your word must be a valid Korean noun of two or more syllables. In this case, set 'isValid' to true, 'isGameOver' to false, and provide your 'aiWord'.

2.  **Word Validation**: You must validate the user's word based on the following criteria:
    *   It must be a real noun in the Korean dictionary.
    *   It must be at least two syllables long.
    *   The first letter of the user's word must match the last letter of the previous AI word (if any). 두음법칙 is not allowed.
    *   The word must not have been used before in this game session (check the history).
    *   If the user's word is invalid for any of these reasons, set 'isValid' to false, 'isGameOver' to true, and provide a clear 'reason' for their loss. Do not provide an 'aiWord'.

3.  **Your Turn**: If the user's word is valid:
    *   Set 'isValid' to true.
    *   You must find a valid follow-up word. Your word must start with the last letter of the user's word.
    *   Your word must also be a real Korean noun, be at least two syllables long, and must not have been used before in the game.
    *   If you successfully find a word, set 'isGameOver' to false, provide the 'aiWord', and set the 'reason' to "Your turn!".
    *   If you cannot think of a valid word, you (the AI) lose. Set 'isGameOver' to true, 'isWin' to true, and the 'reason' to "I give up! You win!".

4.  **Game-Ending Words**: The game is lost if a player uses a word for which there are very few or no subsequent words (e.g., words ending in 슘, 녘, 꾼, 듐, 쁨).
    *   If the user plays such a word, they lose. Set 'isValid' to true (as the word itself is valid), but set 'isGameOver' to true and the 'reason' to "You used a difficult word to follow, so you lose!".
    *   You must not use such a word yourself. If you do, you lose.

Analyze the user's move according to these rules and generate your response in the specified JSON format.`,
});


const playWordChainFlow = ai.defineFlow(
  {
    name: 'playWordChainFlow',
    inputSchema: WordChainInputSchema,
    outputSchema: WordChainOutputSchema,
  },
  async (input) => {
    const { output } = await playWordChainPrompt(input);
    if (!output) {
        throw new Error("AI failed to respond.");
    }
    return output;
  }
);

export async function playWordChain(input: WordChainInput): Promise<WordChainOutput> {
    return playWordChainFlow(input);
}
