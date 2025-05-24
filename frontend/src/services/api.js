// frontend/src/services/api.js
import axios from "axios";

// Use the full backend URL since we are not using the CRA proxy
// Ensure your backend is configured with CORS to allow requests from http://localhost:3000
const API_BASE_URL = "http://localhost:5000/api"; // Adjust port if your backend runs elsewhere

export const uploadVideoFile = (file, onUploadProgress) => {
  const formData = new FormData();
  formData.append("videoFile", file); // Matches backend 'videoFile'

  return axios.post(`${API_BASE_URL}/videos/upload`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    onUploadProgress,
  });
};

export const getVideoStatus = (videoId) => {
  return axios.get(`${API_BASE_URL}/videos/${videoId}/status`);
};

export const getVideoResults = (videoId) => {
  return axios.get(`${API_BASE_URL}/videos/${videoId}/results`);
};
