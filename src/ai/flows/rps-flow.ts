
'use server';

/**
 * @fileOverview An AI Rock-Paper-Scissors agent.
 *
 * - playRps - A function that handles the RPS game logic.
 * - RpsInput - The input type for the playRps function.
 * - RpsOutput - The return type for the playRps function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const MoveSchema = z.enum(['rock', 'paper', 'scissors']);
type Move = z.infer<typeof MoveSchema>;

const HistoryItemSchema = z.object({
  userMove: MoveSchema,
  aiMove: MoveSchema,
  result: z.enum(['win', 'loss', 'tie']),
});
type HistoryItem = z.infer<typeof HistoryItemSchema>;

export const RpsInputSchema = z.object({
  userMove: MoveSchema,
  history: z.array(HistoryItemSchema),
});
export type RpsInput = z.infer<typeof RpsInputSchema>;

export const RpsOutputSchema = z.object({
  aiMove: MoveSchema,
  result: z.enum(['win', 'loss', 'tie']),
  message: z.string(),
});
export type RpsOutput = z.infer<typeof RpsOutputSchema>;

const determineWinner = (userMove: Move, aiMove: Move): 'win' | 'loss' | 'tie' => {
    if (userMove === aiMove) return 'tie';
    if (
        (userMove === 'rock' && aiMove === 'scissors') ||
        (userMove === 'paper' && aiMove === 'rock') ||
        (userMove === 'scissors' && aiMove === 'paper')
    ) {
        return 'win';
    }
    return 'loss';
};

const getWinningMessage = (result: 'win' | 'loss' | 'tie'): string => {
    const winMessages = ["대단해요! AI를 이겼어요!", "승리! 역시 만만치 않은 상대군요.", "AI를 상대로 승리! 멋진데요?"];
    const lossMessages = ["아쉽네요! AI의 승리입니다.", "AI에게 지고 말았어요. 다시 도전해보세요!", "이번엔 AI가 더 강했네요!"];
    const tieMessages = ["비겼어요! 다시 한 번 실력을 보여주세요.", "무승부! 생각이 일치했네요.", "같은 선택! 다시 승부해요."];

    switch (result) {
        case 'win':
            return winMessages[Math.floor(Math.random() * winMessages.length)];
        case 'loss':
            return lossMessages[Math.floor(Math.random() * lossMessages.length)];
        case 'tie':
            return tieMessages[Math.floor(Math.random() * tieMessages.length)];
    }
}


const rpsPrompt = ai.definePrompt({
    name: 'rpsPrompt',
    input: { schema: RpsInputSchema },
    output: { schema: z.object({ aiMove: MoveSchema }) },
    prompt: `You are an expert Rock-Paper-Scissors player. Your goal is to win against the user.
Analyze the user's past moves to predict their next one. Do not just play randomly.
The user has just played: {{{userMove}}}.

Here is the history of the game so far:
{{#each history}}
- User: {{{userMove}}}, AI: {{{aiMove}}}, Result: {{{result}}}
{{/each}}

Based on this, what is your next move? You must only output your move.
`,
    config: {
        model: 'googleai/gemini-2.0-flash',
        temperature: 1, // Increase creativity for move prediction
    }
});


const playRpsFlow = ai.defineFlow(
  {
    name: 'playRpsFlow',
    inputSchema: RpsInputSchema,
    outputSchema: RpsOutputSchema,
  },
  async (input) => {
    const { output } = await rpsPrompt(input);
    if (!output) {
        throw new Error("AI failed to make a move.");
    }
    const aiMove = output.aiMove;
    const result = determineWinner(input.userMove, aiMove);
    const message = getWinningMessage(result);

    return {
        aiMove,
        result,
        message,
    };
  }
);

export async function playRps(input: RpsInput): Promise<RpsOutput> {
    return playRpsFlow(input);
}
