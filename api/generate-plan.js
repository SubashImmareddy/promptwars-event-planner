module.exports = async function(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // Vercel parses the JSON body automatically, unlike Netlify
        const body = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) throw new Error("API Key missing on Vercel server.");

        const prompt = [
            'Act as a premium event architect. Plan a ' + body.type + ' named "' + body.name + '".',
            'Location: ' + body.location + '. Guests: ' + body.guests + '. Budget: Rs. ' + body.budget + '. Preferences: ' + body.preferences + '.',
            'You MUST respond strictly in valid JSON format. Do not include markdown codeblocks.',
            'Structure the JSON exactly like this, ensuring every task is an object with "name" and "phase" (integer 1 to 4):',
            '{',
            '  "summary": "<h3>Creative Strategy</h3><p>A 2-sentence executive summary.</p>",',
            '  "expenses": [',
            '    { "name": "Venue Deposit", "cost": ' + Math.round(body.budget * 0.4) + ' },',
            '    { "name": "Catering & Food", "cost": ' + Math.round(body.budget * 0.3) + ' }',
            '  ],',
            '  "tasks": [',
            '    { "name": "Lock in primary venue", "phase": 1 },',
            '    { "name": "Send out digital invitations", "phase": 2 },',
            '    { "name": "Finalize catering menu", "phase": 3 },',
            '    { "name": "Execute day-of coordination", "phase": 4 }',
            '  ]',
            '}',
            'Ensure the total of all expense costs roughly equals ' + body.budget + '. Provide at least 4 expenses and 8 tasks (2 for each of the 4 phases).'
        ].join('\n');

        const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
        let rawOutput = null;
        let lastError = "Model experiencing high demand.";

        for (let i = 0; i < modelsToTry.length; i++) {
            const modelName = modelsToTry[i];
            try {
                const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + modelName + ':generateContent?key=' + apiKey, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                });

                const data = await response.json();
                if (data.error) {
                    lastError = data.error.message;
                    continue; 
                }

                const candidateText = data.candidates &&
                    data.candidates[0] &&
                    data.candidates[0].content &&
                    data.candidates[0].content.parts &&
                    data.candidates[0].content.parts[0] &&
                    data.candidates[0].content.parts[0].text;

                if (candidateText) {
                    rawOutput = candidateText;
                    break; 
                }
            } catch (innerErr) {
                lastError = innerErr.message;
            }
        }

        if (!rawOutput) {
            throw new Error(lastError);
        }

        const fence = String.fromCharCode(96, 96, 96);
        rawOutput = String(rawOutput).split(fence + 'json').join('').split(fence + 'html').join('').split(fence).join('').trim();

        return res.status(200).json({ plan: rawOutput });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message });
    }
}