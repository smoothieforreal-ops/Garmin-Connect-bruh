import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  try {
    // 1. Fetch your activities from Tredict
    const tredictReq = await fetch('https://www.tredict.com/api/v1/activities', {
      headers: {
        'Authorization': `Bearer ${process.env.TREDICT_API_TOKEN}`,
        'Accept': 'application/json'
      }
    });
    
    if (!tredictReq.ok) throw new Error(`Tredict Error: ${tredictReq.status}`);
    const data = await tredictReq.json();

    // 2. Initialize Gemini
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // 3. Send data to Gemini (using a substring to prevent token limit crashes on your first test)
    const prompt = `Analyze this Garmin training data: ${JSON.stringify(data).substring(0, 15000)}`;
    const aiRes = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    // 4. Output the AI's analysis to the screen
    res.status(200).json({ analysis: aiRes.text });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
