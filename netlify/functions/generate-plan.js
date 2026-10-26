exports.handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const { type, name, location, guests, budget, preferences } = JSON.parse(event.body);
        const apiKey = process.env.GEMINI_API_KEY;
        
        if (!apiKey) throw new Error("API Key missing on server.");

        const prompt = `Act as a premium event architect. Plan a ${type} named "${name}". Location: ${location}. Guests: ${guests}. Budget: ₹${budget}. Preferences: ${preferences}. Provide strictly clean HTML using <h3>, <ul>, <li>. Structure exactly: <h3>🎭 Creative Theme</h3>[text] <h3>💡 Unique Ideas</h3>[list] <h3>⚠️ Risk Management</h3>[list]`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ plan: data.candidates[0].content.parts[0].text.replace(/```html/g, '').replace(/```/g, '') })
        };
    } catch (err) {
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: err.message, plan: `<h3>🎭 Classic Elegance</h3><ul><li>Digital invitations</li><li>DIY photo booth</li></ul>` })
        };
    }
};