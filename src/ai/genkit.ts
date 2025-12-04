import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

// Initialize Genkit with an empty configuration
// as the Google AI plugin requires an API key which is not currently set.
export const ai = genkit({
  plugins: [],
});
