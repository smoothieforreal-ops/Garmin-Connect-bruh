import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  try {
    // 1. Fetch SLEEP data instead of the workout activity list
    const tredictReq = await fetch('https://www.tredict.com/api/oauth/v2/sleep', {
      headers: {
        'Authorization': `Bearer ${process.env.TREDICT_API_TOKEN}`,
        'Accept': 'application/json'
      }
    });
    
    if (!tredictReq.ok) throw new Error(`Tredict Error: ${tredictReq.status}`);
    const data = await tredictReq.json();

    // 2. Initialize Gemini
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // 3. Ask Gemini for a clean HTML analysis
    const prompt = `Analyze this Garmin sleep data. Output the response in clean, readable HTML using <h1>, <h2>, <p>, and <ul> tags. Do not use Markdown backticks. Data: ${JSON.stringify(data).substring(0, 15000)}`;
    const aiRes = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: prompt,
    });

    // 4. Output the formatted HTML directly to the browser
    let htmlOutput = aiRes.text.replace(/```html|```/g, ''); 
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(htmlOutput);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
