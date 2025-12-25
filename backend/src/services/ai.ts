// backend/src/services/ai.ts
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const AIService = {
  rewriteMemory: async (rawText: string): Promise<string> => {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Updated to the cost-efficient model
        messages: [
          {
            role: "system",
            content: "You are a professional storyteller. Rewrite the following memory into a beautiful, polished, and emotional short story. Keep it under 100 words."
          },
          { role: "user", content: rawText }
        ],
        temperature: 0.7,
      });

      return response.choices[0].message.content || rawText;
    } catch (error) {
      console.error('AI ERROR:', error);
      console.error('AI Rewriting failed:', error);
      return rawText; // Fallback to original text if AI fails
    }
  }
};