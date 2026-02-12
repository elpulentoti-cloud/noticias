
import { GoogleGenAI } from "@google/genai";
import { RadarItem } from "../types";

export const getInitiateInsights = async (items: RadarItem[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-flash-preview';

  const context = items.map(i => `${i.source}: ${i.headline}`).join('\n');
  const prompt = `
    Como un alto iniciado de una orden secreta, analiza las siguientes noticias del mundo "profano" y extrae 3 verdades ocultas o patrones arquitectónicos que los demás ignoran. 
    Usa un lenguaje formal, místico y geopolíticamente denso. Evita mencionar la palabra "masón". 
    Habla de la "Geometría del Poder", la "Luz de la Verdad" y el "Gran Diseño".
    
    Noticias:
    ${context}
    
    Formato: Devuelve un objeto JSON con esta estructura:
    {
      "insights": [
        {"title": "string", "insight": "string"},
        {"title": "string", "insight": "string"},
        {"title": "string", "insight": "string"}
      ],
      "globalMood": "string (una frase corta)"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Error fetching insights:", error);
    return null;
  }
};
