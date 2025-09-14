// Importerer nødvendige biblioteker
const express = require('express');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
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

// **ENDELIG KORREKSJON: Bytter til korrekt gratis bildemodell**
app.post('/api/generate-image', async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: 'Mangler prompt for bildegenerering.' });
        }
        
        // Bytter til den KORREKTE modellen for bildegenerering i gratis-tier
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-image-preview' });

        const fullPrompt = `Generer et fotorealistisk og appetittvekkende bilde av ${prompt}, servert på en tallerken, profesjonell matfotografering, høy kvalitet.`;
        
        const result = await model.generateContent([fullPrompt]);
        const response = await result.response;
        
        // Finner bildet i responsen
        const imagePart = response.candidates[0].content.parts.find(part => part.inlineData);

        if (!imagePart) {
            console.error("API respons manglet bilde-del:", response.candidates[0].content.parts);
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

