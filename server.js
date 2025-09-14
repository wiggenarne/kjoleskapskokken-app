// Importerer nødvendige biblioteker
const express = require('express');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors'); // Importerer CORS-biblioteket
const fetch = require('node-fetch'); // Sørger for at denne er i bruk
require('dotenv').config(); // Laster inn miljøvariabler

// Initialiserer Express-appen
const app = express();
const port = process.env.PORT || 3000;

// Konfigurerer Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Middleware
app.use(cors()); // Tillater forespørsler fra andre domener
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API-endepunkt for å generere oppskrifter (Denne fungerer)
app.post('/api/generate-recipes', async (req, res) => {
    try {
        const { userPrompt, systemPrompt, schema } = req.body;
        if (!userPrompt || !systemPrompt || !schema) {
            return res.status(400).json({ error: 'Mangler nødvendig data i forespørselen.' });
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
        const text = result.response.text();
        res.json({ text });
    } catch (error) {
        console.error('Feil under generering av oppskrift:', error);
        res.status(500).json({ error: error.message || 'En intern feil oppstod under generering.' });
    }
});

// **ENDELIG, ROBUST ENDEPUNKT FOR BILDER**
app.post('/api/generate-image', async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: 'Mangler prompt for bildegenerering.' });
        }
        
        const API_KEY = process.env.GEMINI_API_KEY;
        // Bytter til den stabile Imagen-modellen
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${API_KEY}`;
        
        const payload = {
            instances: [{ "prompt": `Fotorealistisk og appetittvekkende bilde av ${prompt}, servert på en tallerken, profesjonell matfotografering, høy kvalitet` }],
            parameters: { "sampleCount": 1 }
        };

        const imageResponse = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        // Forbedret feil-logging
        if (!imageResponse.ok) {
            const errorBody = await imageResponse.text();
            console.error('Bildegenererings-API feilet:', errorBody);
            throw new Error(`API-feil: ${errorBody}`);
        }

        const imageData = await imageResponse.json();
        const base64Image = imageData.predictions?.[0]?.bytesBase64Encoded;

        if (!base64Image) {
            throw new Error('API-en returnerte ikke et gyldig bilde.');
        }

        res.json({ base64Image });
    } catch (error) {
        console.error('Total feil under bildegenerering:', error);
        res.status(500).json({ error: error.message || 'En ukjent intern feil oppstod under bildegenerering.' });
    }
});

// API-endepunkt for AI-chat (Denne fungerer)
app.post('/api/chat', async (req, res) => {
    try {
        const { conversation } = req.body;
        if (!conversation) {
            return res.status(400).json({ error: 'Mangler samtalehistorikk.' });
        }
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const chat = model.startChat({ history: conversation.slice(0, -1) });
        const lastMessage = conversation[conversation.length - 1].parts[0].text;
        const result = await chat.sendMessage(lastMessage);
        const text = result.response.text();
        res.json({ text });
    } catch (error) {
        console.error('Feil under AI-chat:', error);
        res.status(500).json({ error: error.message || 'En intern feil oppstod i chat-funksjonen.' });
    }
});

// Starter serveren
app.listen(port, () => {
    console.log(`Serveren kjører på http://localhost:${port}`);
});


