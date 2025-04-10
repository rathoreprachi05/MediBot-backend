// server.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fetch = require("node-fetch");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

// ✅ Allow only GitHub Pages origin to make requests
const allowedOrigins = ["https://rathoreprachi05.github.io"];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

app.use(bodyParser.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-002:generateContent?key=${GEMINI_API_KEY}`;

app.get("/", (req, res) => {
  res.send("🚑 MediBot backend is alive!");
});

app.post("/api/message", async (req, res) => {
  const userMessage = req.body.message;
  console.log("📩 Received message from frontend:", userMessage);

  const behaviorPrompt = `
You are MediBot, a friendly AI chatbot helping users understand their medical symptoms and device-reported stats.
Respond in a concise, polite tone.
Also classify the condition as one of the following:
- normal
- risky
- critical

Your JSON reply must strictly follow this format (do not add extra text or formatting):

{
  "response": "Your actual reply to the user's input.",
  "conditionLevel": "normal" | "risky" | "critical",
  "note": "Optional extra advice or warning."
}
`;

  const geminiPayload = {
    contents: [
      {
        role: "user",
        parts: [{ text: `${behaviorPrompt}\nUser input: ${userMessage}` }]
      }
    ]
  };

  try {
    const response = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(geminiPayload)
    });

    const data = await response.json();
    console.log("🤖 Gemini API raw response:", data);

    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    let reply = "Sorry, I couldn't understand that.";
    let conditionLevel = "";
    let note = "";

    try {
      // Strip markdown formatting like ```json ... ```
      const cleanedText = rawText.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleanedText);

      reply = parsed.response || reply;
      conditionLevel = parsed.conditionLevel || "";
      note = parsed.note || "";
    } catch (e) {
      console.error("❌ Failed to parse Gemini JSON:", e);
      reply = rawText; // fallback to raw output
    }

    res.json({ reply, conditionLevel, note });
  } catch (error) {
    console.error("🚨 Gemini API error:", error);
    res.status(500).json({ error: "Something went wrong with Gemini API." });
  }
});

app.listen(port, () => {
  console.log(`✅ MediBot backend running on http://localhost:${port}`);
});
