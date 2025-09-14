// --- STEG 1: IMPORTERE NØDVENDIGE VERKTØY ---
// Her henter vi inn de "verktøyene" (pakkene) vi trenger for at serveren skal fungere.

// 'express' er selve rammeverket vi bruker for å bygge webserveren. Den håndterer innkommende forespørsler (f.eks. fra nettleseren).
const express = require('express');
// '@google/generative-ai' er den offisielle pakken fra Google for å kunne snakke med Gemini AI.
const { GoogleGenerativeAI } = require('@google/generative-ai');
// 'dotenv' er en hjelpepakke som lar oss laste inn hemmeligheter (som API-nøkkelen) fra en egen fil (.env), slik at den ikke ligger åpent i koden.
const dotenv = require('dotenv');
// 'path' er en innebygd Node.js-pakke som hjelper oss med å jobbe med filstier på en trygg måte, uavhengig av operativsystem.
const path = require('path');


// --- STEG 2: SETTE OPP SERVEREN ---

// Laster inn alle variablene fra .env-filen slik at vi kan bruke dem i koden.
dotenv.config();

// Oppretter selve applikasjonen/serveren ved hjelp av Express.
const app = express();
// Definerer hvilken "port" serveren skal lytte på. Den ser først etter en port definert i miljøet (vanlig for hosting-plattformer), ellers bruker den port 3000 som standard.
const port = process.env.PORT || 3000;

// Forteller Express at applikasjonen skal kunne motta og forstå data i JSON-format. Dette er avgjørende for API-kall.
app.use(express.json());

// Forteller Express at den skal servere statiske filer (HTML, CSS, bilder) fra en mappe som heter "public".
// Alt du legger i "public"-mappen, vil være tilgjengelig direkte i nettleseren.
app.use(express.static(path.join(__dirname, 'public')));


// --- STEG 3: KOBLE TIL GEMINI AI ---

// Sjekker om API-nøkkelen faktisk finnes. Dette er en viktig sikkerhetssjekk.
if (!process.env.GEMINI_API_KEY) {
  console.error("FEIL: GEMINI_API_KEY er ikke definert i .env-filen.");
  process.exit(1); // Stopper serveren hvis nøkkelen mangler for å unngå feil.
}
// Initialiserer Gemini AI-klienten med den hemmelige nøkkelen. Nå er vi klare til å snakke med AI-en.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);


// --- STEG 4: DEFINERE API-ENDEPUNKTER (Serverens "Dører") ---

// Definerer "døren" for tekstgenerering. Når frontend sender en forespørsel til '/api/generate', vil koden i denne boksen kjøre.
app.post('/api/generate', async (req, res) => {
  try {
    // Velger hvilken AI-modell vi skal bruke. "gemini-pro" er en kraftig modell for tekst og strukturerte data.
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Henter ut dataene som frontend sendte med i forespørselen.
    const { systemPrompt, userPrompt, schema } = req.body;

    // Validering: Sjekker at vi har fått all nødvendig informasjon fra frontend.
    if (!userPrompt || !schema) {
      return res.status(400).json({ error: "Mangler 'userPrompt' eller 'schema' i forespørselen." });
    }

    // Definerer hvordan vi vil at AI-en skal svare. Her sier vi at svaret MÅ være i JSON-format og følge strukturen vi har definert i 'schema'.
    const generationConfig = {
        response_mime_type: "application/json",
        response_schema: schema
    };
    
    // Starter en "samtale" med AI-en. Vi gir den en systeminstruksjon (hvordan den skal oppføre seg) for å sette konteksten.
     const chat = model.startChat({
        generationConfig,
        history: systemPrompt ? [{ role: "user", parts: [{ text: systemPrompt }] }, {role: "model", parts: [{text: "Ok, jeg er klar."}]}] : []
    });

    // Sender selve oppgaven (brukerens prompt) til AI-en og venter på svar.
    const result = await chat.sendMessage(userPrompt);

    // Henter ut det faktiske tekstsvaret fra AI-en.
    const response = result.response;
    const text = response.text();

    // Sender det ferdige svaret tilbake til frontend som JSON.
    res.json({ text });

  } catch (error) {
    // Hvis noe går galt underveis, logg feilen på serveren og send en generell feilmelding tilbake til frontend.
    console.error("Feil i /api/generate:", error);
    res.status(500).json({ error: "En intern feil oppstod under generering." });
  }
});

// Definerer "døren" for bildegenerering.
app.post('/api/generate-image', async (req, res) => {
    try {
        // Henter ut bildeteksten fra frontend.
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: "Mangler 'prompt' i forespørselen." });
        }
        
        // VIKTIG: Gemini Pro-modellen kan ikke generere bilder. I en ekte app ville du her kalt en annen modell (som Imagen).
        // For å unngå feil, bruker vi en "placeholder"-tjeneste som lager et midlertidig bilde med teksten i.
        const placeholderUrl = `https://placehold.co/600x400?text=${encodeURIComponent(prompt)}`;

        // Sender URL-en til placeholder-bildet tilbake til frontend.
        res.json({ imageUrl: placeholderUrl });

    } catch (error) {
        console.error("Feil i /api/generate-image:", error);
        res.status(500).json({ error: "En intern feil oppstod under bildegenerering." });
    }
});


// --- STEG 5: STARTE SERVEREN ---

// Starter serveren og får den til å begynne å lytte etter forespørsler på den porten vi definerte.
app.listen(port, () => {
  // Skriver ut en melding i server-terminalen for å bekrefte at alt kjører som det skal.
  console.log(`Server kjører på http://localhost:${port}`);
});
