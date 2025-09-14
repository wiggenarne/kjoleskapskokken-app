// Importerer nødvendige biblioteker
const express = require('express');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config(); // Laster inn miljøvariabler fra .env-filen

// Initialiserer Express-appen
const app = express();
const port = process.env.PORT || 3000;

// Konfigurerer Google Generative AI med API-nøkkelen fra miljøvariablene
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Middleware for å parse JSON-data i forespørsler
app.use(express.json());

// Serverer de statiske filene (HTML, CSS, JS for frontend) fra 'public'-mappen
app.use(express.static(path.join(__dirname, 'public')));

// Definerer API-endepunktet for å generere innhold
app.post('/api/generate', async (req, res) => {
    try {
        // Henter data sendt fra frontend
        const { userPrompt, systemPrompt, schema } = req.body;

        // Validering for å sikre at nødvendig data er til stede
        if (!userPrompt || !systemPrompt || !schema) {
            return res.status(400).json({ error: 'Mangler userPrompt, systemPrompt eller schema i forespørselen.' });
        }

        // Velger og konfigurerer AI-modellen
        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            systemInstruction: systemPrompt,
            generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: schema,
            },
        });

        // Genererer innholdet basert på brukerens prompt
        const result = await model.generateContent(userPrompt);
        const response = result.response;
        const text = response.text();

        // Sender det genererte innholdet tilbake til frontend
        res.json({ text });

    } catch (error) {
        // Logger den fulle feilen på serveren for dypere analyse
        console.error('Feil under generering:', error);
        // Sender en mer detaljert feilmelding tilbake til frontend
        res.status(500).json({ error: error.message || 'En ukjent intern feil oppstod.' });
    }
});

// Starter serveren og lytter på den definerte porten
app.listen(port, () => {
    console.log(`Serveren kjører på http://localhost:${port}`);
});

