
import { GoogleGenAI, Type } from "@google/genai";
import { ParsedData } from "../types";

export const parseThoughts = async (rawText: string): Promise<ParsedData> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [{ text: `Analysiere und strukturiere diesen Gedankenstrom für ein Executive Board: ${rawText}` }] },
    config: {
      systemInstruction: `Du bist der ultimative Thought-Parser für Führungskräfte. 
      Wandle chaotische Ideen in Projekte, Aufgaben und Listen um. 
      Antworte strikt im JSON-Format.`,
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
                type: { type: Type.STRING },
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

  const text = response.text;
  if (!text) throw new Error("No response text");
  return JSON.parse(text) as ParsedData;
};
