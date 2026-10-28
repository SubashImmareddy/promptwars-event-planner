exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const body = JSON.parse(event.body);
        const apiKey = process.env.GEMINI_API_KEY;
        
        if (!apiKey) throw new Error("API Key missing on Netlify server.");

        // V2 PROMPT: Strict JSON Format
        const prompt = `Act as a premium event architect. Plan a ${body.type} named "${body.name}". Location: ${body.location}. Guests: ${body.guests}. Budget: ₹${body.budget}. Preferences: ${body.preferences}. 
        You MUST respond strictly in valid JSON format. Do not use markdown wrappers like \`\`\`json.
        Structure the JSON exactly like this:
        {
            "summary": "<h3>Creative Strategy</h3><p>A 2-sentence executive summary.</p>",
            "expenses": [
                { "name": "Venue Deposit", "cost": ${Math.round(body.budget * 0.4)} },
                { "name": "Catering & Food", "cost": ${Math.round(body.budget * 0.3)} }
            ],
            "tasks": [
                "Lock in primary venue",
                "Send out digital invitations",
                "Finalize catering menu"
            ]
        }
        Ensure the total of all expense costs roughly equals ₹${body.budget}. Provide at least 4 expenses and 5 tasks.`;

        // UPDATED API ENDPOINT: gemini-3.8-flash
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        // Clean the JSON string before sending it back to app.js
        let rawOutput = data.candidates[0].content.parts[0].text;
        rawOutput = rawOutput.replace(/```json/g, '').replace(/```html/g, '').replace(/```/g, '').trim();

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