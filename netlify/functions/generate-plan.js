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
            'Act as a premium event architect. Plan a ' + body.type + ' named "' + body.name + '".',
            'Location: ' + body.location + '. Guests: ' + body.guests + '. Budget: Rs. ' + budgetNum + '.',
            'CLIENT PREFERENCES & SPECIFIC REQUIREMENTS: "' + userPrefs + '".',
            'CRITICAL INSTRUCTION: You MUST heavily customize the specific names of your generated expenses, tasks, and strategy summary so they directly reflect the CLIENT PREFERENCES above. Explicitly mention their specific requests in the expense names and task descriptions. Do NOT output generic placeholder names.',
            'You MUST respond strictly in valid JSON format. Do not include markdown codeblocks.',
            'Structure the JSON exactly like this schema, ensuring every task is an object with "name" and "phase" (integer 1 to 4):',
            '{',
            '  "summary": "<h3>Creative Strategy: ' + body.name + '</h3><p>A 2-3 sentence executive summary explaining how the event in ' + body.location + ' specifically integrates: ' + userPrefs.replace(/"/g, '\\"') + '.</p>",',
            '  "expenses": [',
            '    { "name": "<Custom Venue/Setup item tailored to ' + body.type + ' & preferences>", "cost": ' + Math.round(budgetNum * 0.35) + ' },',
            '    { "name": "<Custom Catering/Hospitality item tailored to preferences>", "cost": ' + Math.round(budgetNum * 0.25) + ' },',
            '    { "name": "<Dedicated allocation specifically for: ' + userPrefs.replace(/"/g, '\\"') + '>", "cost": ' + Math.round(budgetNum * 0.25) + ' },',
            '    { "name": "<Custom Production/Logistics item>", "cost": ' + Math.round(budgetNum * 0.15) + ' }',
            '  ],',
            '  "tasks": [',
            '    { "name": "<Custom Phase 1 task incorporating client preferences>", "phase": 1 },',
            '    { "name": "<Custom Phase 2 vendor task incorporating client preferences>", "phase": 2 },',
            '    { "name": "<Custom Phase 3 prep task incorporating client preferences>", "phase": 3 },',
            '    { "name": "<Custom Phase 4 execution task incorporating client preferences>", "phase": 4 }',
            '  ]',
            '}',
            'Ensure the total of all expense costs roughly equals ' + budgetNum + '. Provide at least 5 custom expenses and 8 custom tasks (2 for each of the 4 phases).'
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