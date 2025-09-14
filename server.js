// Importerer nødvendige biblioteker
const express = require('express');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fetch = require('node-fetch');
require('dotenv').config(); // Laster inn miljøvariabler fra .env-filen

// Initialiserer Express-appen
const app = express();
const port = process.env.PORT || 3000;

// Konfigurerer Google Generative AI med API-nøkkelen
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- API ENDEPUNKTER ---

// 1. Endepunkt for å generere OPPSKRIFTER (strukturert JSON)
app.post('/api/generate-recipes', async (req, res) => {
    try {
        const { userPrompt, systemPrompt, schema } = req.body;
        if (!userPrompt || !systemPrompt || !schema) {
            return res.status(400).json({ error: 'Mangler nødvendig data for oppskriftsgenerering.' });
        }

        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: schema,
            },
        });

        const result = await model.generateContent(userPrompt);
        const response = result.response;
        const text = response.text();
        res.json({ text });

    } catch (error) {
        console.error('Feil under oppskriftsgenerering:', error);
        res.status(500).json({ error: error.message || 'En intern feil oppstod under generering av oppskrift.' });
    }
});

// 2. Endepunkt for å generere BILDER
app.post('/api/generate-image', async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: 'Mangler "prompt" for bildegenerering.' });
        }

        const API_KEY = process.env.GEMINI_API_KEY;
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${API_KEY}`;

        const payload = {
            instances: [{ prompt: `Fotorealistisk, appetittvekkende matfotografi av ${prompt}, servert på en tallerken, lyst og rent.` }],
            parameters: { sampleCount: 1 }
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Imagen API feil: ${response.status} ${errorBody}`);
        }

        const result = await response.json();
        const base64Image = result.predictions?.[0]?.bytesBase64Encoded;

        if (!base64Image) {
            throw new Error('Inget bilde ble generert av Imagen API.');
        }

        res.json({ base64Image });

    } catch (error) {
        console.error('Feil under bildegenerering:', error);
        res.status(500).json({ error: error.message || 'En intern feil oppstod under generering av bilde.' });
    }
});


// 3. Endepunkt for AI CHAT
app.post('/api/chat', async (req, res) => {
    try {
        const { conversation } = req.body;
        if (!conversation || !Array.isArray(conversation)) {
            return res.status(400).json({ error: 'Mangler "conversation" i chat-forespørsel.' });
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const chat = model.startChat({ history: conversation.slice(0, -1) }); // Starter chat med historikk
        const lastMessage = conversation[conversation.length - 1].parts[0].text;
        
        const result = await chat.sendMessage(lastMessage);
        const response = result.response;
        const text = response.text();
        res.json({ text });

    } catch (error) {
        console.error('Feil under chat:', error);
        res.status(500).json({ error: error.message || 'En intern feil oppstod under chat.' });
    }
});


// Starter serveren
app.listen(port, () => {
    console.log(`Serveren kjører på http://localhost:${port}`);
});
