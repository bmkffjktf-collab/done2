import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface TrafficAnalysis {
  signalStrategy: string;
  predictedCongestion: number;
  optimizationReasoning: string;
  suggestedRerouting: string[];
}

export async function analyzeTraffic(
  city: string,
  intersection: string,
  densityData: any
): Promise<TrafficAnalysis> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze this traffic density data for an intersection in ${city} (${intersection}): ${JSON.stringify(
        densityData
      )}. Provide an optimization strategy.`,
      config: {
        systemInstruction: "You are an expert urban traffic engineer specializing in Indian road networks. Analyze density and provide adaptive signal strategies.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            signalStrategy: { type: Type.STRING },
            predictedCongestion: { type: Type.NUMBER, description: "Scale 0-100" },
            optimizationReasoning: { type: Type.STRING },
            suggestedRerouting: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["signalStrategy", "predictedCongestion", "optimizationReasoning", "suggestedRerouting"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return {
      signalStrategy: "Default Cycle",
      predictedCongestion: 50,
      optimizationReasoning: "Unable to reach AI engine. Falling back to static timings.",
      suggestedRerouting: []
    };
  }
}
