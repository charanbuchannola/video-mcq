// frontend/src/components/VideoUpload.js
import React, { useState, useRef } from "react";
import { uploadVideoFile } from "../services/api";

// Simple loading spinner component (optional, or use a library)
const Spinner = () => (
  <svg
    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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

function VideoUpload({ onUploadSuccess, onError, onProcessingStart }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorDetail, setErrorDetail] = useState("");
  const fileInputRef = useRef(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type !== "video/mp4") {
        setMessage("Invalid file type. Please select an MP4 video.");
        setSelectedFile(null);
        setErrorDetail("");
        return;
      }
      if (file.size > 1024 * 1024 * 1024) {
        // 1GB limit example
        setMessage("File is too large. Maximum size is 1GB.");
        setSelectedFile(null);
        setErrorDetail("");
        return;
      }
      setSelectedFile(file);
      setMessage(`Selected: ${file.name}`);
      setErrorDetail("");
      setUploadProgress(0);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setMessage("Please select an MP4 file first.");
      setErrorDetail("");
      return;
    }

    setIsUploading(true);
    setMessage("Uploading...");
    setErrorDetail("");
    setUploadProgress(0);

    try {
      const response = await uploadVideoFile(selectedFile, (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) /
            (progressEvent.total || selectedFile.size)
        );
        setUploadProgress(percentCompleted);
      });
      setMessage(
        response.data.message || "Upload successful. Processing started."
      );
      setIsUploading(false);
      onUploadSuccess(response.data.videoId);
      onProcessingStart(response.data.videoId); // Notify App component
      setSelectedFile(null); // Clear selection after successful upload
      if (fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
    } catch (err) {
      console.error("Upload error object:", err);
      const backendError =
        err.response?.data?.message || err.response?.data?.error;
      const genericError = "Upload failed. Please try again.";
      setMessage(`Error: ${backendError || genericError}`);
      setErrorDetail(err.message); // More technical detail
      onError(backendError || genericError); // Notify App component
      setIsUploading(false);
      // Don't clear selectedFile on error, user might want to retry
    }
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-xl shadow-xl">
      <h2 className="text-2xl font-bold mb-6 text-slate-700 text-center">
        Upload Lecture Video
      </h2>

      <div className="mb-4">
        <label
          htmlFor="videoFile"
          className="block text-sm font-medium text-slate-600 mb-1"
        >
          Choose MP4 video (max 1GB)
        </label>
        <input
          id="videoFile"
          ref={fileInputRef}
          type="file"
          accept="video/mp4"
          onChange={handleFileChange}
          disabled={isUploading}
          className="block w-full text-sm text-slate-500 border border-slate-300 rounded-lg cursor-pointer
                               file:mr-4 file:py-2.5 file:px-4 file:rounded-l-lg file:border-0
                               file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700
                               hover:file:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {selectedFile && !isUploading && (
        <p className="text-sm text-slate-500 mb-4">
          File: {selectedFile.name} (
          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
        </p>
      )}

      {isUploading && (
        <div className="w-full bg-slate-200 rounded-full h-2.5 mb-4 dark:bg-slate-700">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${uploadProgress}%` }}
          ></div>
          <p className="text-xs text-center text-slate-600 mt-1">
            {uploadProgress}%
          </p>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={isUploading || !selectedFile}
        className="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg
                           transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                           disabled:bg-slate-400 disabled:cursor-not-allowed"
      >
        {isUploading && <Spinner />}
        {isUploading ? `Uploading...` : "Upload and Process"}
      </button>

      {message && (
        <p
          className={`mt-4 text-sm text-center font-medium ${
            message.startsWith("Error:") || errorDetail
              ? "text-red-600"
              : "text-green-600"
          }`}
        >
          {message}
        </p>
      )}
      {errorDetail && message.startsWith("Error:") && (
        <p className="mt-1 text-xs text-center text-red-500">
          Details: {errorDetail}
        </p>
      )}
    </div>
  );
}

export default VideoUpload;
