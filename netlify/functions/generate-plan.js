exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) throw new Error("API Key missing on Netlify server.");

        const budgetNum = Number(body.budget) || 100000;
        const prompt = [
            'Act as a premium event architect. Plan a ' + body.type + ' named "' + body.name + '".',
            'Location: ' + body.location + '. Guests: ' + body.guests + '. Budget: Rs. ' + budgetNum + '. Preferences: ' + body.preferences + '.',
            'You MUST respond strictly in valid JSON format. Do not include markdown codeblocks.',
            'Structure the JSON exactly like this, ensuring every task is an object with "name" and "phase" (integer 1 to 4):',
            '{',
            '  "summary": "<h3>Creative Strategy</h3><p>A 2-sentence executive summary.</p>",',
            '  "expenses": [',
            '    { "name": "Venue Deposit", "cost": ' + Math.round(budgetNum * 0.4) + ' },',
            '    { "name": "Catering & Food", "cost": ' + Math.round(budgetNum * 0.3) + ' }',
            '  ],',
            '  "tasks": [',
            '    { "name": "Lock in primary venue", "phase": 1 },',
            '    { "name": "Send out digital invitations", "phase": 2 },',
            '    { "name": "Finalize catering menu", "phase": 3 },',
            '    { "name": "Execute day-of coordination", "phase": 4 }',
            '  ]',
            '}',
            'Ensure the total of all expense costs roughly equals ' + budgetNum + '. Provide at least 4 expenses and 8 tasks (2 for each of the 4 phases).'
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

        return {
            statusCode: 200,
            body: JSON.stringify({ plan: rawOutput })
        };

    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message })
        };
    }
};