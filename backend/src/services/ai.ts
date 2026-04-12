// backend/src/services/ai.ts
import OpenAI from 'openai';

let _openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!_openai) {
// #region agent log
    fetch('http://127.0.0.1:7648/ingest/f1af423a-5dbc-47ac-b418-353d9ec9b372',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2329f0'},body:JSON.stringify({sessionId:'2329f0',location:'services/ai.ts:getOpenAIClient',message:'Lazily initializing OpenAI client',data:{hasKey:!!process.env.OPENAI_API_KEY},timestamp:Date.now(),hypothesisId:'FIX'})}).catch(()=>{});
// #endregion
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

export const AIService = {
  rewriteMemory: async (rawText: string, imageBuffer?: Buffer, mimeType?: string): Promise<string> => {
    try {
      console.log('[AIService] Input RawText:', rawText);
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

      const response = await getOpenAIClient().chat.completions.create({
        model: "gpt-4o",
        messages: messages,
        temperature: 0.3,
        max_tokens: 300,
      });

      const content = response.choices[0].message.content || rawText;
      
      // Force UTF-8 encoding to prevent ??? issues
      return Buffer.from(content, 'utf-8').toString();
    } catch (error) {
      console.error('AI ERROR:', error);
      return rawText; // Fallback to original text if AI fails
    }
  }
};