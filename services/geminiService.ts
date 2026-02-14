
import { GoogleGenAI } from "@google/genai";
import { RadarItem } from "../types";

export const getTraditionInsights = async (news: RadarItem[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-flash-preview';

  const date = new Date().toLocaleDateString('es-CL');
  
  const prompt = `
    Hoy es ${date}. 
    1. Genera una efeméride histórica de Chile relacionada con "Constructores de la República" (figuras ilustradas, fundadores, hitos de orden y libertad).
    2. Analiza estas noticias y extrae una directriz para el Directorio:
    ${news.map(n => n.headline).join('\n')}

    Formato JSON:
    {
      "efemeride": {
        "titulo": "string",
        "descripcion": "string (máximo 150 caracteres)"
      },
      "directriz": "string (frase formal de mando)",
      "clima_social": "string (estado de la obra)"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    return null;
  }
};
