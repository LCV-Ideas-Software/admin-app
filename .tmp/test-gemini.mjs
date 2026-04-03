import { GoogleGenAI } from '@google/genai';

const GEMINI_CONFIG = {
  model: 'gemini-pro-latest',
  temperature: 0.1,
  topP: 0.8,
  maxRetries: 2,
  retryDelayMs: 1000
};

const safetySettings = [
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" }
];

const config = {
  systemInstruction: "You are an extractor",
  safetySettings: safetySettings,
  temperature: GEMINI_CONFIG.temperature,
  topP: GEMINI_CONFIG.topP,
  responseMimeType: "application/json",
  responseSchema: {
    type: "OBJECT",
    properties: {
      title: {
        type: "STRING",
        description: "Title"
      },
      markdown: {
        type: "STRING",
        description: "Markdown"
      }
    },
    required: ["title", "markdown"],
  }
};

const ai = new GoogleGenAI({ apiKey: "AIzaSyFakeKeyJustForValidation123" });

async function run() {
  try {
    console.log("Calling model generateContent...");
    const response = await ai.models.generateContent({
      model: GEMINI_CONFIG.model,
      contents: "Hello, World",
      config: config
    });
    console.log("Success", response);
  } catch (err) {
    console.error("Caught error:", err.message);
    if (err.status) console.error("Status:", err.status);
    if (err.details) console.error("Details:", err.details);
  }
}

run();
