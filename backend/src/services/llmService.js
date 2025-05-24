// backend/services/llmService.js
const axios = require("axios");

const OLLAMA_API_URL = process.env.OLLAMA_API_URL;
const OLLAMA_MODEL_NAME = process.env.OLLAMA_MODEL_NAME;

async function generateMCQs(textSegment) {
  if (!textSegment || textSegment.trim().length < 20) {
    // Min length for text
    console.warn(
      "[LLMService] Received short/empty text segment, skipping MCQ generation."
    );
    return [];
  }
  const prompt = `Context: "${textSegment}"

Based ONLY on the context provided above, generate exactly 3 multiple-choice questions (MCQs).
Each MCQ must have:
1. A "question" statement.
2. An "options" array containing exactly 4 distinct string choices.
3. A "correctAnswer" field indicating the letter of the correct option (e.g., "A", "B", "C", or "D").

Format the output as a VALID JSON array of objects. For example:
[
  {
    "question": "What is the main topic discussed?",
    "options": ["Topic X", "Topic Y", "Topic Z", "Topic W"],
    "correctAnswer": "A"
  },
  {
    "question": "Which concept is explained in detail?",
    "options": ["Concept 1", "Concept 2", "Concept 3", "Concept 4"],
    "correctAnswer": "C"
  }
]
Ensure the JSON is well-formed and can be parsed directly. Do not include any text or explanation outside the JSON array.
`;

  try {
    console.log(
      `[LLMService] Sending prompt to Ollama (${OLLAMA_MODEL_NAME}) for segment starting with: "${textSegment.substring(
        0,
        70
      )}..."`
    );
    const response = await axios.post(OLLAMA_API_URL, {
      model: OLLAMA_MODEL_NAME,
      prompt: prompt,
      stream: false,
      format: "json",
    });

    // console.log("[LLMService] Ollama raw response string:", response.data.response); // Log for debugging

    if (response.data && response.data.response) {
      try {
        const mcqsParsed = JSON.parse(response.data.response);

        // Handle both array of MCQs and single MCQ object
        const mcqsArray = Array.isArray(mcqsParsed) ? mcqsParsed : [mcqsParsed];

        const validMcqs = mcqsArray.filter(
          (q) =>
            q &&
            q.question &&
            Array.isArray(q.options) &&
            q.options.length === 4 &&
            q.correctAnswer
        );

        if (validMcqs.length !== mcqsArray.length) {
          console.warn(
            "[LLMService] Some MCQs from LLM had invalid structure and were filtered out."
          );
        }
        if (validMcqs.length === 0 && mcqsArray.length > 0) {
          console.error(
            "[LLMService] LLM response parsed but no valid MCQs found. Parsed:",
            mcqsParsed
          );
        }

        return validMcqs;
      } catch (parseError) {
        console.error(
          "[LLMService] Error parsing LLM JSON response:",
          parseError
        );
        console.error(
          "[LLMService] Problematic LLM response string:",
          response.data.response
        );
        throw new Error(
          `Failed to parse LLM response. Raw: ${response.data.response.substring(
            0,
            200
          )}`
        );
      }
    } else {
      console.error(
        "[LLMService] Invalid or empty response structure from Ollama:",
        response.data
      );
      throw new Error("Invalid response structure from LLM service");
    }
  } catch (error) {
    const errMsg = error.response
      ? JSON.stringify(error.response.data)
      : error.message;
    console.error("[LLMService] Error calling Ollama service:", errMsg);
    throw new Error(`LLM MCQ generation failed: ${error.message}`);
  }
}

module.exports = { generateMCQs };
