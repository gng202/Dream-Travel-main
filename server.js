const express = require('express');
const path = require('path');
const {TextGenerationModel} = require('@google/genai');
const locationsRoute = require('./routes/locations');

const app = express();
const PORT = process.env.PORT || 3000;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-oss-20b:free';
const GOOGLE_GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY;
const GOOGLE_GEMINI_MODEL = process.env.GOOGLE_GEMINI_MODEL || 'gemini-2.5-flash';

app.use(express.json());
app.use(express.static(path.join(__dirname)));
app.use('/api/locations', locationsRoute);

if (!OPENROUTER_API_KEY && !GOOGLE_GEMINI_API_KEY) {
    console.warn('Warning: no API key is configured. The /api/chat endpoint will return an error until it is configured.');
}

function getSystemInstruction(persona) {
    let text = "You are Dream AI, a helpful and premium virtual travel assistant for Dream Travel website. Keep replies concise, engaging, and friendly. Guide the user regarding travel destinations, custom itineraries, packing lists, weather, and visa requirements. Encourage booking. Highlight destinations like Vietnam, Japan, France, Switzerland, Bali, Singapore. Avoid pretending to know current live information unless it is provided. Clearly note when information may need verification.";

    if (persona === 'luxury') {
        text = "You are Dream AI, a bespoke Luxury Concierge for Dream Travel. Speak with exceptional elegance, courtesy, and sophistication. Offer exclusive recommendations, luxury resort details, high-end dining, private tours, and personalized concierge services. Focus on high-end hotels and premium packages. Avoid claiming live availability details unless provided.";
    } else if (persona === 'adventure') {
        text = "You are Dream AI, an energetic and thrill-seeking Adventure Explorer. Your tone is enthusiastic, active, and inspiring. Focus on off-the-beaten-path trails, hiking, surfing, paragliding, and exciting local workshops. Recommend adventurous routes in destinations like Mount Fuji in Japan, Bali beaches, or Swiss Alps. Mention that details should be verified before booking.";
    } else if (persona === 'backpacker') {
        text = "You are Dream AI, a street-smart and budget-friendly Backpacker Guru. Your style is casual, practical, and savvy. Share top budget-saving tips, local street food recommendations, free walking tours, hostels, and public transport guides. Be transparent about checking current prices and entry rules.";
    }

    return text;
}

function normalizeGeminiTravelData(parsed) {
    return {
        data: Array.isArray(parsed?.data)
            ? parsed.data.map((item) => ({
                name: String(item?.name || ''),
                description: String(item?.description || ''),
                image_url: String(item?.image_url || ''),
                specialties: Array.isArray(item?.specialties)
                    ? item.specialties.map((specialty) => ({
                        name: String(specialty?.name || ''),
                        description: String(specialty?.description || ''),
                        price_usd: Number(specialty?.price_usd || 0)
                    }))
                    : []
            }))
            : []
    };
}

async function handleGeminiTravel(req, res) {
    if (!GOOGLE_GEMINI_API_KEY) {
        return res.status(500).json({ error: 'Google Gemini API key is not configured.' });
    }

    const model = new TextGenerationModel({
        apiKey: GOOGLE_GEMINI_API_KEY,
        model: GOOGLE_GEMINI_MODEL
    });

    const prompt = `Generate a JSON object with a top-level key named \"data\". Data must be an array of travel destination objects. Each destination object must include: name, description, image_url, and specialties. Each specialty item must include name, description, and price_usd. Respond ONLY with valid JSON and no additional explanation. Example structure:\n{\n  \"data\": [\n    {\n      \"name\": \"string\",\n      \"description\": \"string\",\n      \"image_url\": \"string\",\n      \"specialties\": [\n        {\n          \"name\": \"string\",\n          \"description\": \"string\",\n          \"price_usd\": 0\n        }\n      ]\n    }\n  ]\n}\nGenerate 4 travel destinations with realistic specialties and prices.`;

    try {
        const response = await model.generate({
            prompt,
            temperature: 0.6,
            maxOutputTokens: 512,
            responseMimeType: 'application/json'
        });

        const rawText = response?.candidates?.[0]?.content?.[0]?.text
            || response?.output?.[0]?.content?.[0]?.text
            || response?.candidates?.[0]?.output?.[0]?.content?.[0]?.text
            || '';

        if (!rawText) {
            return res.status(502).json({ error: 'Gemini returned an invalid response format.' });
        }

        let parsed;
        try {
            parsed = JSON.parse(rawText);
        } catch (parseError) {
            console.error('Gemini JSON parse error:', parseError, rawText);
            return res.status(502).json({ error: 'Gemini returned malformed JSON.' });
        }

        const normalized = normalizeGeminiTravelData(parsed);
        if (!Array.isArray(normalized.data)) {
            return res.status(502).json({ error: 'Gemini returned invalid travel data structure.' });
        }

        return res.json(normalized);
    } catch (error) {
        console.error('Gemini travel generation failed:', error);
        return res.status(500).json({ error: 'Unable to generate travel destinations. Please try again later.' });
    }
}

async function handleChat(req, res) {
    if (!OPENROUTER_API_KEY) {
        return res.status(500).json({ error: 'OpenRouter API key is not configured.' });
    }

    const { message, history, persona, model } = req.body || {};
    if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Missing required message field.' });
    }

    if (GOOGLE_GEMINI_API_KEY) {
        const systemText = getSystemInstruction(persona);
        const historyText = Array.isArray(history)
            ? history.filter(item => item && item.role && item.content).map(item => `${item.role === 'assistant' ? 'Assistant' : 'User'}: ${item.content}`).join('\n') + '\n\n'
            : '';
        const promptText = `${systemText}\n\n${historyText}User: ${message}`;

        try {
            const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_GEMINI_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prompt: {
                        text: promptText
                    },
                    temperature: 0.6,
                    maxOutputTokens: 512
                })
            });

            if (!geminiResponse.ok) {
                const errBody = await geminiResponse.text();
                return res.status(geminiResponse.status).json({ error: `Google Gemini error: ${errBody}` });
            }

            const data = await geminiResponse.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) {
                return res.status(502).json({ error: 'Google Gemini returned an invalid response.' });
            }

            return res.json({ message: text });
        } catch (error) {
            console.error('Google Gemini request failed:', error);
            return res.status(500).json({ error: 'Unable to reach Google Gemini. Please try again later.' });
        }
    }

    const selectedModel = typeof model === 'string' && model.trim() !== '' && model.trim() !== 'default'
        ? model.trim()
        : OPENROUTER_MODEL;
    const messages = [
        { role: 'system', content: getSystemInstruction(persona) },
        ...(Array.isArray(history) ? history.filter(item => item && item.role && item.content).map(item => ({ role: item.role, content: item.content })) : []),
        { role: 'user', content: message }
    ];

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`
            },
            body: JSON.stringify({
                model: selectedModel,
                messages,
                temperature: 0.6,
                max_tokens: 1000
            })
        });

        if (!response.ok) {
            const errBody = await response.text();
            return res.status(response.status).json({ error: `OpenRouter error: ${errBody}` });
        }

        const data = await response.json();
        const text = data?.choices?.[0]?.message?.content;

        if (!text) {
            return res.status(502).json({ error: 'OpenRouter returned an invalid response.' });
        }

        return res.json({ message: text });
    } catch (error) {
        console.error('Chat request failed:', error);
        return res.status(500).json({ error: 'Unable to reach OpenRouter. Please try again later.' });
    }
}

app.use('/api/locations', locationsRoute);
app.get('/api/travel', handleGeminiTravel);
app.post('/api/chat', handleChat);
app.post('/api/travel-ai-chat', handleChat);

app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found.' });
});

app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, () => {
    console.log(`Dream Travel server listening on http://localhost:${PORT}`);
});
