export default async function handler(req, res) {
  try {
    const token = process.env.TREDICT_API_TOKEN;
    if (!token) {
      return res.status(500).json({ error: "Missing TREDICT_API_TOKEN in Vercel Environment Variables." });
    }

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json;charset=UTF-8'
    };

    // Helper function so one failed or empty endpoint never crashes the rest of your data
    const fetchEndpoint = async (name, url) => {
      try {
        const response = await fetch(url, { headers });
        if (!response.ok) {
          return { status: response.status, error: `HTTP ${response.status} on ${name}` };
        }
        return await response.json();
      } catch (err) {
        return { error: err.message };
      }
    };

    // 1. Pull every available Tredict health, recovery, and fitness endpoint in parallel
    const [
      sleep,
      hrv,
      bodyValues,
      capacity,
      zones,
      efforts,
      activityList
    ] = await Promise.all([
      fetchEndpoint('sleep', 'https://www.tredict.com/api/oauth/v2/sleep'),
      fetchEndpoint('hrv', 'https://www.tredict.com/api/oauth/v2/hrv'),
      fetchEndpoint('bodyValues', 'https://www.tredict.com/api/oauth/v2/bodyvalues'),
      fetchEndpoint('capacity', 'https://www.tredict.com/api/oauth/v2/capacity'),
      fetchEndpoint('zones', 'https://www.tredict.com/api/oauth/v2/zones'),
      fetchEndpoint('efforts', 'https://www.tredict.com/api/oauth/v2/efforts'),
      fetchEndpoint('activityList', 'https://www.tredict.com/api/oauth/v2/activityList')
    ]);

    // 2. If you have logged workouts, automatically pull the full details of the 5 most recent ones
    let recentActivityDetails = [];
    const activitiesArray = activityList?.activityList || (Array.isArray(activityList) ? activityList : []);
    if (activitiesArray.length > 0) {
      const recentIds = activitiesArray.slice(0, 5).map(a => a.id || a.activityId).filter(Boolean);
      recentActivityDetails = await Promise.all(
        recentIds.map(id => fetchEndpoint(`activity_${id}`, `https://www.tredict.com/api/oauth/v2/activity?id=${id}`))
      );
    }

    // 3. Consolidate everything into a single master payload
    const fullPayload = {
      exportedAt: new Date().toISOString(),
      sleep,
      hrv,
      bodyValues,
      capacity,
      zones,
      efforts,
      activityList,
      recentActivityDetails
    };

    // Optional: Visit /api?raw=true if you ever want pure JSON without the copy buttons
    if (req.query.raw === 'true') {
      return res.status(200).json(fullPayload);
    }

    const jsonString = JSON.stringify(fullPayload, null, 2);

    // 4. Render a mobile-friendly extractor page with 1-tap Copy & Download buttons
    const html = `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Garmin Raw Data Extractor</title>
      <style>
        body { background: #121212; color: #e0e0e0; font-family: system-ui, sans-serif; padding: 16px; margin: 0; }
        h1 { font-size: 1.25rem; color: #60a5fa; margin-top: 0; }
        .btn-group { display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; position: sticky; top: 10px; z-index: 10; }
        button { padding: 16px; font-size: 1rem; font-weight: 700; border: none; border-radius: 10px; cursor: pointer; width: 100%; }
        #copyBtn { background: #2563eb; color: #ffffff; box-shadow: 0 4px 12px rgba(37,99,235,0.4); }
        #downloadBtn { background: #059669; color: #ffffff; box-shadow: 0 4px 12px rgba(5,150,105,0.4); }
        pre { background: #1e1e1e; padding: 12px; border-radius: 8px; overflow-x: auto; font-size: 0.78rem; border: 1px solid #333; white-space: pre-wrap; word-break: break-all; }
      </style>
    </head>
    <body>
      <h1>Garmin Raw Data Dump</h1>
      <div class="btn-group">
        <button id="copyBtn" onclick="copyData()">📋 1-TAP COPY ALL RAW DATA</button>
        <button id="downloadBtn" onclick="downloadData()">💾 DOWNLOAD .JSON FILE FOR GEMINI</button>
      </div>
      <pre id="rawJson">${jsonString.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>

      <script>
        const rawText = document.getElementById('rawJson').innerText;
        function copyData() {
          navigator.clipboard.writeText(rawText).then(() => {
            const btn = document.getElementById('copyBtn');
            btn.innerText = '✅ COPIED! PASTE INTO GEMINI CHAT';
            btn.style.background = '#16a34a';
            setTimeout(() => {
              btn.innerText = '📋 1-TAP COPY ALL RAW DATA';
              btn.style.background = '#2563eb';
            }, 3500);
          });
        }
        function downloadData() {
          const blob = new Blob([rawText], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'garmin-raw-data.json';
          a.click();
          URL.revokeObjectURL(url);
        }
      </script>
    </body>
    </html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
