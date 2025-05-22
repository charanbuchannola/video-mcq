const axios = require("axios");

const OLLAMA_API_URL = process.env.OLLAMA_API_URL;
const OLLAMA_MODEL_NAME = process.env.OLLAMA_MODEL_NAME;

async function generateMCQs(textSegment) {
  if (!textSegment || textSegment.trim() === "") {
    console.warn(
      "LLMService: Received empty text segment, skipping MCQ generation."
    );
    return []; // Return empty array if segment is empty
  }
  const prompt = `Context: "${textSegment}"
Based ONLY on the context provided above, generate exactly 3 multiple-choice questions (MCQs).
Each MCQ must have:
A "question" statement.
An "options" array containing exactly 4 string choices (A, B, C, D).
A "correctAnswer" field indicating the letter of the correct option (e.g., "A", "B", "C", or "D").
Format the output as a VALID JSON array of objects. For example:
[
{
"question": "What is the main topic discussed?",
"options": ["Topic X", "Topic Y", "Topic Z", "Topic W"],
"correctAnswer": "A"
},
{
// ... next question ...
}
]
Ensure the JSON is well-formed and can be parsed directly. Do not include any text outside the JSON array.
`;

  try {
    console.log(
      `Sending prompt to Ollama for segment starting with: "${textSegment.substring(
        0,
        100
      )}..."`
    );
    const response = await axios.post(OLLAMA_API_URL, {
      model: OLLAMA_MODEL_NAME,
      prompt: prompt,
      stream: false, // Get the full response at once
      format: "json", // Request JSON output format from Ollama
    });

    console.log("Ollama raw response:", response.data.response); // Log raw response string

    if (response.data && response.data.response) {
      // The 'response' field from Ollama with format: 'json' should be a stringified JSON
      try {
        const mcqs = JSON.parse(response.data.response);
        // Basic validation
        if (
          Array.isArray(mcqs) &&
          mcqs.every((q) => q.question && q.options && q.correctAnswer)
        ) {
          return mcqs;
        } else {
          console.error(
            "LLM response is not in the expected MCQ array format:",
            mcqs
          );
          throw new Error("LLM response format error: Invalid MCQ structure.");
        }
      } catch (parseError) {
        console.error("Error parsing LLM JSON response:", parseError);
        console.error(
          "Problematic LLM response string:",
          response.data.response
        );
        throw new Error(
          `Failed to parse LLM response as JSON. Raw response: ${response.data.response.substring(
            0,
            500
          )}`
        );
      }
    } else {
      console.error(
        "Invalid or empty response structure from Ollama:",
        response.data
      );
      throw new Error("Invalid response structure from LLM service");
    }
  } catch (error) {
    console.error(
      "Error calling Ollama service:",
      error.response ? error.response.data : error.message
    );
    throw new Error(`LLM MCQ generation failed: ${error.message}`);
  }
}

module.exports = { generateMCQs };
