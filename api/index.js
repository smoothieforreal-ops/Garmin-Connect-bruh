import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  try {
    // 1. Fetch your activities from the correct Tredict endpoint
    const tredictReq = await fetch('https://www.tredict.com/api/oauth/v2/activityList', {
      headers: {
        'Authorization': `Bearer ${process.env.TREDICT_API_TOKEN}`,
        'Accept': 'application/json'
      }
    });
    
    if (!tredictReq.ok) throw new Error(`Tredict Error: ${tredictReq.status}`);
    const data = await tredictReq.json();

    // 2. Initialize Gemini
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // 3. Send data to Gemini (using a substring to prevent token limit crashes)
    const prompt = `Analyze this Garmin training data: ${JSON.stringify(data).substring(0, 15000)}`;
    const aiRes = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: prompt,
    });

    // 4. Output the AI's analysis
    res.status(200).json({ analysis: aiRes.text });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
