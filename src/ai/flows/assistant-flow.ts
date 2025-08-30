
'use server';

/**
 * @fileOverview A conversational AI assistant for the Jongdalsem Hub.
 *
 * - chat - A function that handles the conversational chat logic.
 * - ChatInput - The input type for the chat function.
 * - ChatOutput - The return type for the chat function.
 */
import { ai } from '@/ai/genkit';
import { getUserData, sendLetter, useCode } from '@/lib/firebase';
import { z } from 'zod';
import { User } from 'firebase/auth';

// Define tools that the AI can use
const useCodeTool = ai.defineTool(
  {
    name: 'useCode',
    description: 'Use a code to get points. This includes regular codes, hidden codes, and mate codes.',
    inputSchema: z.object({
        code: z.string().describe('The code to use.'),
        partnerStudentId: z.string().optional().describe("The partner's 5-digit student ID, required only for 'hidden' codes."),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        message: z.string(),
    }),
  },
  async ({ code, partnerStudentId }, context) => {
    if (!context?.auth) {
        return { success: false, message: "User is not logged in."};
    }
    const user = context.auth as User;
    return useCode(user.uid, code, partnerStudentId);
  }
);


const sendLetterTool = ai.defineTool(
    {
        name: 'sendLetter',
        description: 'Send a letter to another student.',
        inputSchema: z.object({
            receiverStudentId: z.string().describe("The 5-digit student ID of the recipient."),
            content: z.string().describe("The content of the letter."),
        }),
        outputSchema: z.object({
            success: z.boolean(),
            message: z.string(),
        }),
    },
    async ({ receiverStudentId, content }, context) => {
        if (!context?.auth) {
            return { success: false, message: "User is not logged in."};
        }
        const user = context.auth as User;
        try {
            await sendLetter(user.uid, receiverStudentId, content);
            return { success: true, message: `Successfully sent the letter to student ${receiverStudentId}. It is now pending approval.` };
        } catch (error: any) {
            return { success: false, message: error.message || "Failed to send letter." };
        }
    }
);


export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'model', 'tool']),
  content: z.array(
    z.object({
      text: z.string().optional(),
      toolRequest: z
        .object({
          name: z.string(),
          input: z.any(),
        })
        .optional(),
      toolResponse: z
        .object({
          name: z.string(),
          output: z.any(),
        })
        .optional(),
    })
  ),
});

export const ChatHistorySchema = z.array(ChatMessageSchema);

export const ChatInputSchema = z.object({
    message: z.string(),
    history: ChatHistorySchema,
});
export type ChatInput = z.infer<typeof ChatInputSchema>;

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ChatHistory = z.infer<typeof ChatHistorySchema>;


const assistantPrompt = ai.definePrompt({
  name: 'assistantPrompt',
  tools: [useCodeTool, sendLetterTool],
  input: { schema: ChatInputSchema },
  output: { schema: ChatMessageSchema },
  model: 'googleai/gemini-1.5-flash-latest',
  prompt: `You are a helpful and friendly assistant for the "Jongdalsem Hub" app, a point-based community platform for middle school students in Korea. Your name is '종달이'.

Your primary goal is to help students use the app's features by talking to them. You must speak in a friendly, encouraging, and slightly informal tone, like a helpful older sibling. Always use Korean.

You have access to tools to perform actions on behalf of the user.
- When a user asks to use a code, call the 'useCode' tool.
- If the code is a 'hidden code' (히든코드), you must ask the user for their partner's student ID before calling the tool.
- When a user asks to send a letter, call the 'sendLetter' tool. You must confirm the recipient's student ID and the letter's content before sending.
- After a tool is executed, summarize the result to the user in a friendly way based on the tool's output message.

If the user's request is unclear, ask clarifying questions.

Here is the current conversation history:
{{#each history}}
  {{#if (eq role 'model')}}
    You: {{#each content}}{{text}}{{/each}}
  {{else if (eq role 'user')}}
    User: {{#each content}}{{text}}{{/each}}
  {{/if}}
{{/each}}

User's new message:
"{{message}}"

Based on this, generate your response or decide to use a tool.`,
});

const assistantFlow = ai.defineFlow(
    {
        name: 'assistantFlow',
        inputSchema: ChatInputSchema,
        outputSchema: z.any(),
    },
    async (input) => {
        const { output, "final-llm-response": response } = await assistantPrompt(input);
        return response.choices[0].message;
    }
);

export async function chat(input: ChatInput) {
    return await assistantFlow(input);
}
