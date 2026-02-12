
import { GoogleGenAI } from "@google/genai";
import { RadarItem } from "../types";

export const analyzeChileanWork = async (items: RadarItem[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-flash-preview';

  const context = items.map(i => `${i.headline}`).join('\n');
  const prompt = `
    Como el Gran Arquitecto del Análisis Geopolítico en Chile, observa los siguientes sucesos del país. 
    Proporciona un informe para los Iniciados del Nodo Austral.
    No menciones la palabra "masón", "logia" ni términos religiosos. 
    Usa términos como: "Sincronía Institucional", "El Escuadrado de la Realidad", "Nivelación de Fuerzas", "Piedra Bruta Social".
    
    Eventos:
    ${context}
    
    Formato JSON:
    {
      "conclusiones": [
        {"punto": "título corto", "explicacion": "explicación mística/técnica"},
        {"punto": "título corto", "explicacion": "explicación mística/técnica"}
      ],
      "frecuencia_nacional": "string (una frase sobre el estado de Chile)"
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
