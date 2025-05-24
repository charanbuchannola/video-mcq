// frontend/src/App.js
import React, { useState, useEffect, useCallback } from "react";
import VideoUpload from "./components/VideoUpload";
import ResultsDisplay from "./components/ResultsDisplay";
import { getVideoStatus, getVideoResults } from "./services/api";

// Simple Status Indicator Icons (Optional)
const StatusIcon = ({ status }) => {
  // ... (same as your previous App.js Spinner or a more elaborate one)
  if (
    status === "transcribing" ||
    status === "generating_mcqs" ||
    status === "processing"
  ) {
    return (
      <svg
        className="animate-spin inline-block -ml-1 mr-2 h-5 w-5 text-blue-600"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
    );
  }
  if (status === "completed") {
    return <span className="text-green-500 mr-2">✓</span>;
  }
  if (status === "failed" || status.startsWith("error")) {
    return <span className="text-red-500 mr-2">✗</span>;
  }
  return null;
};

function App() {
  const [currentVideoId, setCurrentVideoId] = useState(null);
  const [processingStatus, setProcessingStatus] = useState(""); // e.g., uploaded, transcribing, generating_mcqs, completed, failed
  const [statusMessage, setStatusMessage] = useState("Awaiting video upload.");
  const [results, setResults] = useState(null);
  const [isLoadingResults, setIsLoadingResults] = useState(false); // For fetching results specifically

  // Resets state for a new upload or on error
  const resetForNewUpload = () => {
    // setCurrentVideoId(null); // Keep videoId if polling needs to continue for a bit
    setProcessingStatus("");
    setStatusMessage("Awaiting video upload.");
    setResults(null);
    setIsLoadingResults(false);
  };

  const handleUploadSuccess = (videoId) => {
    resetForNewUpload(); // Clear previous states
    setCurrentVideoId(videoId);
    setProcessingStatus("uploaded"); // Initial status before first poll
    setStatusMessage("Video uploaded. Awaiting processing queue...");
  };

  const handleProcessingStart = (videoId) => {
    // This callback might be redundant if polling starts immediately
    // but can be used for an immediate UI update
    if (videoId === currentVideoId) {
      setProcessingStatus("processing"); // Or 'transcribing' if that's the first step
      setStatusMessage("Processing has started...");
    }
  };

  const handleErrorDuringUpload = (errorMsg) => {
    setProcessingStatus("error_upload");
    setStatusMessage(`Upload Error: ${errorMsg}`);
    setResults(null); // Clear any stale results
  };

  const updateDisplayStatus = useCallback(
    (backendStatus, backendErrorMessage = "") => {
      let friendlyMessage = "Status: Unknown";
      switch (backendStatus) {
        case "uploaded":
          friendlyMessage = "File received. Queued for processing...";
          break;
        case "transcribing":
          friendlyMessage =
            "Transcribing video... This can take several minutes.";
          break;
        case "generating_mcqs":
          friendlyMessage = "Generating questions from transcription...";
          break;
        case "completed":
          friendlyMessage = "Processing complete! Results are ready.";
          break;
        case "failed":
          friendlyMessage = `Processing failed: ${
            backendErrorMessage || "An unknown error occurred."
          }`;
          break;
        case "error_upload":
          friendlyMessage = `Upload Error: ${backendErrorMessage}`;
          break;
        case "error_polling":
          friendlyMessage = `Status Check Error: ${
            backendErrorMessage || "Could not connect."
          }`;
          break;
        default:
          friendlyMessage = `Current status: ${backendStatus}`;
      }
      setStatusMessage(friendlyMessage);
    },
    []
  );

  // Polling for status
  useEffect(() => {
    let intervalId;
    const poll = async () => {
      if (!currentVideoId) return;
      try {
        console.log("Polling for videoId:", currentVideoId);
        const response = await getVideoStatus(currentVideoId);
        const { status: newStatus, errorMessage: newErrorMessage } =
          response.data;

        setProcessingStatus(newStatus); // Update raw status
        updateDisplayStatus(newStatus, newErrorMessage); // Update friendly message

        if (newStatus === "completed" || newStatus === "failed") {
          clearInterval(intervalId); // Stop polling
        }
      } catch (error) {
        console.error("Error polling status:", error);
        setProcessingStatus("error_polling");
        updateDisplayStatus("error_polling", error.message);
        clearInterval(intervalId); // Stop polling on network error too
      }
    };

    if (
      currentVideoId &&
      !["completed", "failed", "error_upload", "error_polling"].includes(
        processingStatus
      )
    ) {
      poll(); // Initial poll immediately
      intervalId = setInterval(poll, 7000); // Then poll every 7 seconds
    }

    return () => clearInterval(intervalId); // Cleanup on component unmount or if dependencies change
  }, [currentVideoId, processingStatus, updateDisplayStatus]);

  // Fetching results when 'completed'
  useEffect(() => {
    const fetchResultsData = async () => {
      if (currentVideoId && processingStatus === "completed" && !results) {
        // Fetch only if completed and no results yet
        setIsLoadingResults(true);
        setStatusMessage("Fetching final results...");
        try {
          const response = await getVideoResults(currentVideoId);
          setResults(response.data);
          setStatusMessage("Results loaded successfully!");
        } catch (error) {
          console.error("Error fetching results:", error);
          setStatusMessage(
            `Error fetching results: ${
              error.response?.data?.message || error.message
            }`
          );
          setProcessingStatus("error_results_fetch"); // A specific error state
        } finally {
          setIsLoadingResults(false);
        }
      }
    };
    fetchResultsData();
  }, [currentVideoId, processingStatus, results]); // Add results to dependency to prevent re-fetch if already loaded

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center py-8 px-4 selection:bg-blue-200">
      <header className="w-full max-w-4xl mb-10 text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-800">
          Lecture<span className="text-blue-600">-to-</span>Quiz AI
        </h1>
        <p className="mt-2 text-slate-500 text-md sm:text-lg">
          Automatically transcribe MP4 lectures and generate MCQs using local
          AI.
        </p>
      </header>

      <main className="w-full max-w-2xl space-y-8">
        <VideoUpload
          onUploadSuccess={handleUploadSuccess}
          onError={handleErrorDuringUpload}
          onProcessingStart={handleProcessingStart}
        />

        {currentVideoId && (
          <div
            className={`p-5 rounded-lg shadow-md text-sm font-medium border
                        ${
                          processingStatus === "failed" ||
                          processingStatus.startsWith("error_")
                            ? "bg-red-50 text-red-700 border-red-300"
                            : processingStatus === "completed"
                            ? "bg-green-50 text-green-700 border-green-300"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}
          >
            <div className="flex items-center">
              <StatusIcon status={processingStatus} />
              <p className="flex-1">
                {statusMessage}
                {isLoadingResults && (
                  <span className="ml-1 animate-pulse">
                    (Loading results details...)
                  </span>
                )}
              </p>
            </div>
            {currentVideoId && !results && (
              <p className="text-xs mt-1 text-slate-500">
                Video ID: {currentVideoId}
              </p>
            )}
          </div>
        )}

        {results && <ResultsDisplay results={results} />}
      </main>

      <footer className="w-full text-center py-8 mt-auto text-slate-500 text-xs">
        <p>
          © {new Date().getFullYear()} Local Lecture-to-Quiz Project. All
          processing is done locally.
        </p>
      </footer>
    </div>
  );
}

export default App;
