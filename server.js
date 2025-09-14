// Importerer nødvendige biblioteker
const express = require('express');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fetch = require('node-fetch'); // Sørger for at denne er i bruk
require('dotenv').config(); // Laster inn miljøvariabler

// Initialiserer Express-appen
const app = express();
const port = process.env.PORT || 3000;

// Konfigurerer Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API-endepunkt for å generere oppskrifter
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
        const response = result.response;
        const text = response.text();
        res.json({ text });
    } catch (error) {
        console.error('Feil under generering av oppskrift:', error);
        res.status(500).json({ error: error.message || 'En intern feil oppstod under generering.' });
    }
});

// **ENDELIG, ROBUST LØSNING MED DIREKTE API-KALL**
app.post('/api/generate-image', async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: 'Mangler prompt for bildegenerering.' });
        }
        
        const API_KEY = process.env.GEMINI_API_KEY;
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-image-preview:generateContent?key=${API_KEY}`;

        const fullPrompt = `Generer et fotorealistisk og appetittvekkende bilde av ${prompt}, servert på en tallerken, profesjonell matfotografering, høy kvalitet.`;

        const payload = {
            contents: [{
                parts: [{ text: fullPrompt }]
            }],
            generationConfig: {
                responseModalities: ['IMAGE'] // Vi ber spesifikt om et bilde
            },
        };

        const imageResponse = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!imageResponse.ok) {
            const errorBody = await imageResponse.text();
            console.error('Bildegenererings-API feilet:', errorBody);
            throw new Error(`API-feil: ${errorBody}`);
        }
        
        const result = await imageResponse.json();
        const imagePart = result.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

        if (!imagePart) {
             console.error("API respons manglet bilde-del:", result);
            throw new Error('Modellen returnerte ikke et bilde.');
        }

        const base64Image = imagePart.inlineData.data;
        res.json({ base64Image });

    } catch (error) {
        console.error('Total feil under bildegenerering:', error);
        res.status(500).json({ error: error.message || 'En ukjent intern feil oppstod under bildegenerering.' });
    }
});


// API-endepunkt for AI-chat
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
        const response = result.response;
        const text = response.text();
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


