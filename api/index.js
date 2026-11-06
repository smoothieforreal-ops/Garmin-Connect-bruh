export default async function handler(req, res) {
  try {
    const headers = {
      'Authorization': `Bearer ${process.env.TREDICT_API_TOKEN}`,
      'Accept': 'application/json'
    };

    const [sleepReq, bodyReq] = await Promise.all([
      fetch('https://www.tredict.com/api/oauth/v2/sleep', { headers }),
      fetch('https://www.tredict.com/api/oauth/v2/bodyvalues', { headers })
    ]);

    const sleepData = await sleepReq.json();
    const bodyData = await bodyReq.json();

    res.status(200).json({ 
      sleep: sleepData, 
      bodyValues: bodyData 
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
