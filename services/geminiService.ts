
import { GoogleGenAI, Type } from "@google/genai";
import { ParsedData } from "../types";

// Service to parse chaotic thoughts into structured JSON using Gemini 3
export const parseThoughts = async (rawText: string): Promise<ParsedData> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Use ai.models.generateContent directly with model and prompt as per SDK rules
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    // Using a single Content object for standard contents structure
    contents: { parts: [{ text: `Analysiere und strukturiere: ${rawText}` }] },
    config: {
      systemInstruction: `Du bist ein Thought-Parser Pro. Deine Aufgabe ist es, chaotische Gedanken in strukturierte, ausführbare Listen zu verwandeln.
      
      Regeln:
      - Generiere für jede Aufgabe (Task) eine eindeutige 'id' (String).
      - Setze 'completed' standardmäßig auf false.
      - Aufgaben sollten im Imperativ formuliert sein.
      - Erkenne Kategorien wie Arbeit, Privat, Haushalt, Finanzen.
      - Bestimme die Priorität (hoch, mittel, niedrig) basierend auf dem Kontext.
      - Erfinde keine Fakten, bleibe am Originaltext.
      
      Antworte ausschließlich im JSON-Format.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          tasks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                category: { type: Type.STRING },
                priority: { type: Type.STRING, enum: ["hoch", "mittel", "niedrig"] },
                deadline: { type: Type.STRING },
                completed: { type: Type.BOOLEAN }
              },
              required: ["id", "title", "category", "priority", "completed"]
            }
          },
          projects: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                subtasks: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["name", "subtasks"]
            }
          },
          lists: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                type: { type: Type.STRING, enum: ["Einkauf", "Ideen", "Notizen"] },
                items: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["title", "type", "items"]
            }
          },
          summary: { type: Type.STRING }
        },
        required: ["tasks", "projects", "lists", "summary"]
      }
    }
  });

  try {
    // Access response.text directly as a property, not as a method()
    const text = response.text;
    if (!text) {
      throw new Error("Keine Textantwort von der KI erhalten.");
    }
    return JSON.parse(text) as ParsedData;
  } catch (err) {
    throw new Error("Fehler beim Parsen der KI-Antwort. Bitte versuche es erneut.");
  }
};
