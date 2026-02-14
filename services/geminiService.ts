
import { GoogleGenAI, Type } from "@google/genai";
import { RadarItem } from "../types";

export const getTraditionInsights = async (news: RadarItem[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-flash-preview';

  const date = new Date().toLocaleDateString('es-CL');
  
  const prompt = `
    Hoy es ${date}. Actúa como el Gran Historiador de una orden masónica republicana.
    1. Genera una efeméride histórica de Chile enfocada en la Ilustración, la Masonería o el desarrollo de las instituciones (Benjamín Vicuña Mackenna, Andrés Bello, Diego Portales, Logia Lautaro, etc.).
    2. Analiza estas crónicas actuales y emite una directriz formal para el Gran Maestro:
    ${news.map(n => n.headline).join('\n')}

    Formato JSON:
    {
      "efemeride": {
        "titulo": "string",
        "descripcion": "string (máximo 150 caracteres, tono ritual)"
      },
      "directriz": "string (frase formal de mando masónico)",
      "clima_social": "string (estado de la cantera/obra)"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        // Adding responseSchema as recommended by the SDK guidelines
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            efemeride: {
              type: Type.OBJECT,
              properties: {
                titulo: { type: Type.STRING },
                descripcion: { type: Type.STRING }
              },
              required: ["titulo", "descripcion"]
            },
            directriz: { type: Type.STRING },
            clima_social: { type: Type.STRING }
          },
          required: ["efemeride", "directriz", "clima_social"]
        },
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Fallo de Sabiduría:", error);
    return null;
  }
};
