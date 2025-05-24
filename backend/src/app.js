const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const videoRoutes = require("./routes/videoRoutes");

const app = express();

// CORS Configuration
const corsOptions = {
  origin: "http://localhost:5173", // Your React frontend's development URL
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true, // If you plan to use cookies or authorization headers
  optionsSuccessStatus: 200, // For compatibility with older browsers
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/videos", videoRoutes);

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_DIR || "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Basic Error Handling (can be improved)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ message: "Something broke!", error: err.message });
});

module.exports = app;
