// Importerer nødvendige biblioteker
const express = require('express');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors'); // Importerer CORS-biblioteket
require('dotenv').config(); // Laster inn miljøvariabler

// Initialiserer Express-appen
const app = express();
const port = process.env.PORT || 3000;

// Konfigurerer Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Middleware
app.use(cors()); // Tillater forespørsler fra andre domener (som forhåndsvisningen)
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API-endepunkt for å generere oppskrifter
app.post('/api/generate-recipes', async (req, res) => {
    try {
        const { userPrompt, systemPrompt, schema } = req.body;
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

// ENDELIG, FORENKLET OG KORREKT ENDEPUNKT FOR BILDER
app.post('/api/generate-image', async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: 'Mangler prompt for bildegenerering.' });
        }
        
        // Vi bruker den robuste hovedmodellen til alt
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        // Vi lager en "prompt" som består av både tekst og en forespørsel om et bilde
        const imagePrompt = [
            { text: `Generer et fotorealistisk og appetittvekkende bilde av ${prompt}, servert på en tallerken, profesjonell matfotografering, høy kvalitet.` },
        ];
        
        const result = await model.generateContent(imagePrompt);
        const response = await result.response;
        
        // Finner bildet i responsen
        const imagePart = response.candidates[0].content.parts.find(part => part.inlineData);

        if (!imagePart) {
            console.error("Modellen klarte ikke å generere et bilde. Respons:", response.text());
            throw new Error('Modellen returnerte ikke et gyldig bilde.');
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

