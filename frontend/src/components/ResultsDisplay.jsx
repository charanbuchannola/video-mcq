// frontend/src/components/ResultsDisplay.js
import React from "react";

function ResultsDisplay({ results }) {
  if (!results) {
    return null; // Or a placeholder if you prefer
  }

  const { video, transcription, mcqs } = results;

  // Helper to get option letter (A, B, C, D)
  const getOptionLetter = (index) => String.fromCharCode(65 + index);

  return (
    <div className="mt-10 bg-white p-6 md:p-8 rounded-xl shadow-xl">
      <h3 className="text-2xl font-bold mb-6 text-slate-700">
        Results for:{" "}
        <span className="font-normal">
          {video?.originalFilename || "Video"}
        </span>
      </h3>

      {/* Transcription Section */}
      {transcription && (
        <div className="mb-8">
          <h4 className="text-xl font-semibold mb-3 text-slate-600">
            Full Transcription
          </h4>
          <textarea
            readOnly
            value={transcription.fullText || "Transcription not available."}
            rows="12"
            className="w-full p-3 border border-slate-300 rounded-lg bg-slate-50 text-sm
                                   focus:ring-blue-500 focus:border-blue-500 shadow-sm"
            aria-label="Full Video Transcription"
          />
        </div>
      )}

      {/* MCQs Section */}
      <div>
        <h4 className="text-xl font-semibold mb-4 text-slate-600">
          Generated Multiple-Choice Questions
        </h4>
        {mcqs && mcqs.length > 0 ? (
          <div className="space-y-6">
            {mcqs.map((mcqItem, index) => (
              <div
                key={mcqItem._id || index}
                className="border border-slate-200 rounded-lg p-5 bg-slate-50 hover:shadow-lg transition-shadow duration-200"
              >
                <p className="text-xs text-slate-500 mb-2">
                  From video segment: {mcqItem.segmentStartTime.toFixed(0)}s -{" "}
                  {mcqItem.segmentEndTime.toFixed(0)}s
                </p>
                <p className="font-semibold text-md mb-3 text-slate-800">
                  {index + 1}. {mcqItem.question}
                </p>
                <ul className="list-none pl-0 space-y-2 mb-3">
                  {mcqItem.options.map((option, i) => {
                    const optionLetter = getOptionLetter(i);
                    // Check if the current option is the correct one
                    const isCorrect =
                      mcqItem.correctAnswer === optionLetter ||
                      mcqItem.correctAnswer === option;
                    return (
                      <li
                        key={i}
                        className={`py-1.5 px-3 rounded-md text-sm transition-colors
                                                    ${
                                                      isCorrect
                                                        ? "bg-green-100 text-green-800 font-medium ring-1 ring-green-300"
                                                        : "bg-white text-slate-700 hover:bg-slate-100 ring-1 ring-slate-200"
                                                    }`}
                      >
                        <span className="font-semibold mr-1.5">
                          {optionLetter}.
                        </span>{" "}
                        {option}
                      </li>
                    );
                  })}
                </ul>
                <p className="text-sm font-medium text-slate-700">
                  Correct Answer:{" "}
                  <span className="ml-1 text-green-700 font-bold">
                    {mcqItem.correctAnswer}
                  </span>
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-center py-4">
            No MCQs were generated for this video, or they are still being
            processed.
          </p>
        )}
      </div>
    </div>
  );
}

export default ResultsDisplay;
