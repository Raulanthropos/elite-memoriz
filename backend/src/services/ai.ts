// backend/src/services/ai.ts
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const AIService = {
  rewriteMemory: async (rawText: string, imageBuffer?: Buffer, mimeType?: string): Promise<string> => {
    try {
      const messages: any[] = [
        {
          role: "system",
          content: "You are a poetic storyteller. Analyze the visual details of the image and the user's text. Write a short, pertinent, emotional micro-story. Output in Greek by default. Only output in English if the user's input text is clearly in English."
        }
      ];

      const userContent: any[] = [
        { type: "text", text: rawText || "A memory from this event." }
      ];

      if (imageBuffer && mimeType) {
        const base64Image = imageBuffer.toString('base64');
        userContent.push({
          type: "image_url",
          image_url: {
            url: `data:${mimeType};base64,${base64Image}`
          }
        });
      }

      messages.push({ role: "user", content: userContent });

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages,
        temperature: 0.7,
        max_tokens: 300,
      });

      return response.choices[0].message.content || rawText;
    } catch (error) {
      console.error('AI ERROR:', error);
      return rawText; // Fallback to original text if AI fails
    }
  }
};