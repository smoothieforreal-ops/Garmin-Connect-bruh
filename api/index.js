const { GoogleGenerativeAI } = require("@google/generative-ai");

export default async function handler(req, res) {
  try {
    const tredictResponse = await fetch('https://tredict.com/api/v1/bodyvalues', {
      headers: { 'Authorization': `Bearer ${process.env.TREDICT_API_TOKEN}` }
    });
    const healthData = await tredictResponse.json();
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Log and analyze my latest Tredict/Garmin health data: ${JSON.stringify(healthData)}`;
    
    const result = await model.generateContent(prompt);
    const aiResponse = await result.response;

    return res.status(200).json({ success: true, ai_analysis: aiResponse.text() });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
