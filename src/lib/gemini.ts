import { GoogleGenAI } from '@google/genai'

if (!process.env.GOOGLE_AI_API_KEY) {
  console.warn('[gemini] GOOGLE_AI_API_KEY is not set — invoice extraction will fail')
}

export const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY ?? '' })

// gemini-2.5-flash: free tier, vision-capable, best free model available
export const GEMINI_MODEL = 'gemini-2.5-flash'
