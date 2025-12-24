import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY;

if (!apiKey) {
  console.error("API_KEY is not set in the environment variables.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

/**
 * Sends an image and a text prompt to Gemini 2.5 Flash Image for editing.
 * @param base64Image The base64 string of the original image (without data URI prefix).
 * @param mimeType The mime type of the original image.
 * @param prompt The editing instruction.
 * @param aspectRatio Optional aspect ratio for the output image.
 * @returns The generated image as a base64 string (raw).
 */
export const editImageWithGemini = async (
  base64Image: string,
  mimeType: string,
  prompt: string,
  aspectRatio: string = "1:1"
): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
        }
      }
    });

    // Check for inline data (image response)
    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      const parts = candidates[0].content.parts;
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          return part.inlineData.data;
        }
      }
    }

    throw new Error("No image data found in the response.");
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};