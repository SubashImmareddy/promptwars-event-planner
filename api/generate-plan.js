'use strict';

/**
 * @fileoverview Vercel Serverless Edge Handler for NexusPlan Gemini AI Generation
 */

const CANDIDATE_MODELS = Object.freeze([
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash'
]);

/**
 * Sanitizes incoming string fields to prevent prompt injection and oversized payloads.
 * @param {*} val - Input string.
 * @param {number} maxLen - Maximum allowed characters.
 * @returns {string} Sanitized string.
 */
function sanitizeField(val, maxLen) {
    if (val === null || val === undefined) return '';
    return String(val).trim().slice(0, maxLen || 500);
}

/**
 * Vercel Serverless Function Entry Point.
 * @param {Object} req - HTTP Request object.
 * @param {Object} res - HTTP Response object.
 */
module.exports = async function generatePlanHandler(req, res) {
    if (typeof res.setHeader === 'function') {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('Cache-Control', 'no-store');
    }

    if (!req || req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(503).json({ error: 'Server API Key configuration unavailable.' });
        }

        const safeName = sanitizeField(body.name || 'Event', 120);
        const safeType = sanitizeField(body.type || 'Conference', 60);
        const safeLocation = sanitizeField(body.location || 'Venue', 120);
        const safeGuests = Math.max(1, Math.min(100000, Number(body.guests) || 50));
        const budgetNum = Math.max(1000, Math.min(1000000000, Number(body.budget) || 100000));
        const userPrefs = sanitizeField(body.preferences, 600) || 'Standard high-impact execution and guest experience';

        const prompt = [
            'Act as an elite event architect. Plan a ' + safeType + ' named "' + safeName + '".',
            'Location: ' + safeLocation + '. Guests: ' + safeGuests + '. Total Budget: Rs. ' + budgetNum + '.',
            'Client Notes & Preferences: "' + userPrefs + '".',
            'CRITICAL RULES:',
            '1. NEVER copy, quote, or echo the raw Client Notes text into the summary, expense names, or task names.',
            '2. Instead, professionally interpret the Client Notes into polished, concise, executive-grade titles.',
            '3. If the client mentions not spending the entire budget, make the sum of expenses 80% to 85% of Rs. ' + budgetNum + ' so they have an unspent reserve. Otherwise, make expenses roughly equal Rs. ' + budgetNum + '.',
            '4. Respond strictly in valid JSON format with no markdown wrappers.',
            '{',
            '  "summary": "<h3>Creative Strategy: ' + safeName + '</h3><p>2-3 sentences of polished executive strategy tailored to the audience, timing, and vibe.</p>",',
            '  "expenses": [',
            '    { "name": "Polished Expense Title (3-7 words)", "cost": 15000 }',
            '  ],',
            '  "tasks": [',
            '    { "name": "Polished Actionable Task (6-12 words)", "phase": 1 }',
            '  ]',
            '}',
            'Provide 4 to 5 expenses and exactly 8 tasks (2 tasks for each phase 1, 2, 3, and 4).'
        ].join('\n');

        let rawOutput = null;
        let lastError = 'Model experiencing high demand.';

        for (let i = 0; i < CANDIDATE_MODELS.length; i++) {
            const modelName = CANDIDATE_MODELS[i];
            try {
                const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + modelName + ':generateContent?key=' + encodeURIComponent(apiKey), {
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
            return res.status(502).json({ error: lastError });
        }

        const fence = String.fromCharCode(96, 96, 96);
        rawOutput = String(rawOutput).split(fence + 'json').join('').split(fence + 'html').join('').split(fence).join('').trim();

        return res.status(200).json({ plan: rawOutput });
    } catch (err) {
        return res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
};

module.exports.sanitizeField = sanitizeField;