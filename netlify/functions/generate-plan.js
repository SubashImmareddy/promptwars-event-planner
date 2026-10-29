exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) throw new Error("API Key missing on Netlify server.");

        const budgetNum = Number(body.budget) || 100000;
        const userPrefs = (body.preferences && String(body.preferences).trim())
            ? String(body.preferences).trim()
            : 'Standard high-impact execution and guest experience';

        const prompt = [
            'Act as an elite event architect. Plan a ' + body.type + ' named "' + body.name + '".',
            'Location: ' + body.location + '. Guests: ' + body.guests + '. Total Budget: Rs. ' + budgetNum + '.',
            'Client Notes & Preferences: "' + userPrefs + '".',
            'CRITICAL RULES:',
            '1. NEVER copy, quote, or echo the raw Client Notes text into the summary, expense names, or task names.',
            '2. Instead, professionally interpret the Client Notes (such as age group, evening timing, fun activities, food style, or keeping total spend under budget) into polished, concise, executive-grade titles.',
            '3. If the client mentions not spending the entire budget, make the sum of expenses 80% to 85% of Rs. ' + budgetNum + ' so they have an unspent reserve. Otherwise, make expenses roughly equal Rs. ' + budgetNum + '.',
            '4. Respond strictly in valid JSON format with no markdown wrappers.',
            '{',
            '  "summary": "<h3>Creative Strategy: ' + body.name + '</h3><p>2-3 sentences of polished executive strategy tailored to the audience, timing, and vibe.</p>",',
            '  "expenses": [',
            '    { "name": "Polished Expense Title (3-7 words)", "cost": 15000 }',
            '  ],',
            '  "tasks": [',
            '    { "name": "Polished Actionable Task (6-12 words)", "phase": 1 }',
            '  ]',
            '}',
            'Provide 4 to 5 expenses and exactly 8 tasks (2 tasks for each phase 1, 2, 3, and 4).'
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