
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
1. If the user's first word is "시작" (start), that means you should start the game. Your response should be your first word, which must be a valid Korean noun of two or more syllables. In this case, isValid is true, isGameOver is false, and you must provide an aiWord.
2. Validate the user's word.
   - It must be a real noun in Korean.
   - It must be at least two syllables long.
   - The first letter of the user's word must match the last letter of the previous AI word (if any).
   - The word must not have been used before in this game session.
   - If the user's word is invalid, set 'isValid' to false, 'isGameOver' to true, and provide the 'reason' for the loss. Do not provide 'aiWord'.
3. If the user's word is valid:
   - Set 'isValid' to true.
   - Find a valid next word. Your word's first letter must match the last letter of the user's word.
   - Your word must also be a real Korean noun, at least two syllables long, and not previously used.
   - If you cannot think of a valid word, the AI (you) loses. Set 'isGameOver' to true and 'reason' to "I give up! You win!".
   - If you find a valid word, set 'isGameOver' to false, provide the 'aiWord', and set the 'reason' to "Your turn!".
4. The game is lost if a player uses a word ending in a difficult character (e.g., 슘, 녘, 꾼) for which there are very few or no starting words. If the user does this, they lose. If you do it, you lose.

Analyze the user's move and generate your response.`,
});


const playWordChainFlow = ai.defineFlow(
  {
    name: 'playWordChainFlow',
    inputSchema: WordChainInputSchema,
    outputSchema: WordChainOutputSchema,
  },
  async (input) => {
    const { output } = await wordChainPrompt(input);
    if (!output) {
        throw new Error("AI failed to respond.");
    }
    return output;
  }
);

export async function playWordChain(input: WordChainInput): Promise<WordChainOutput> {
    return playWordChainFlow(input);
}
