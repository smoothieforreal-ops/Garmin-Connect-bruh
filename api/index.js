import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  try {
    const headers = {
      'Authorization': `Bearer ${process.env.TREDICT_API_TOKEN}`,
      'Accept': 'application/json'
    };

    // 1. Fetch BOTH Sleep and Body Values (Resting HR, Max HR, etc.) simultaneously
    const [sleepReq, bodyReq] = await Promise.all([
      fetch('https://www.tredict.com/api/oauth/v2/sleep', { headers }),
      fetch('https://www.tredict.com/api/oauth/v2/bodyvalues', { headers })
    ]);
    
    if (!sleepReq.ok || !bodyReq.ok) {
      throw new Error(`Tredict Fetch Error: Sleep(${sleepReq.status}), Body(${bodyReq.status})`);
    }

    // 2. Combine the data into a single payload
    const sleepData = await sleepReq.json();
    const bodyData = await bodyReq.json();
    const combinedData = { 
      sleep: sleepData, 
      bodyValues: bodyData 
    };

    // 3. Initialize Gemini
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // 4. Ask Gemini to analyze the combined metrics and build a dark-mode dashboard
    const prompt = `Act as an expert sports scientist and recovery coach. Analyze this Garmin health data (sleep durations, resting heart rate, dynamic heart rates). 
    
    Context to factor into the analysis: I maintain a strict 5:30 AM wake schedule. I follow a targeted cyclical ketogenic diet and consume zero caffeine.
    
    Output a clean HTML dashboard. Include a <style> block with a sleek dark mode theme (background #121212, off-white text, blue accents for headers). 
    Organize with <h1>, <h2>, and metric summary cards. Correlate my resting heart rate and sleep to my lifestyle. Do not use markdown backticks.
    
    Data: ${JSON.stringify(combinedData).substring(0, 15000)}`;
    
    const aiRes = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: prompt,
    });

    // 5. Output the formatted HTML dashboard directly to the browser
    let htmlOutput = aiRes.text.replace(/```html|```/g, ''); 
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(htmlOutput);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
