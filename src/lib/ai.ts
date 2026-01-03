import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL_NAME = "gemini-3-flash-preview";

/**
 * Get the Google Generative AI client
 */
function getClient(): GoogleGenerativeAI | null {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Analyze a document using Gemini AI
 * 
 * @param content Buffer (for PDF/Image) or string (for Text)
 * @param mimeType MIME type of the content
 * @param prompt User instruction or prompt for analysis
 * @returns The analysis result text
 */
export async function analyzeDocument(
  content: Buffer | string,
  mimeType: string,
  prompt?: string
): Promise<{ success: boolean; text?: string; error?: string }> {
  const client = getClient();
  if (!client) {
    return {
      success: false,
      error: "GOOGLE_API_KEY environment variable is not set. AI analysis is unavailable.",
    };
  }

  try {
    const model = client.getGenerativeModel({ model: MODEL_NAME });
    
    // Default prompt if none provided
    const userPrompt = prompt || "Analyze this document and provide a summary of its contents.";
    
    let parts: any[] = [{ text: userPrompt }];

    if (Buffer.isBuffer(content)) {
      // For binary content (PDFs, Images)
      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: content.toString("base64"),
        },
      });
    } else {
      // For text content (extracted from DOCX/PPTX)
      parts.push({
        text: `\n\nDocument Content:\n${content}`,
      });
    }

    const result = await model.generateContent(parts);
    const response = await result.response;
    const text = response.text();

    return {
      success: true,
      text,
    };
  } catch (error) {
    return {
      success: false,
      error: `AI analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
