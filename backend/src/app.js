const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const videoRoutes = require("./routes/videoRoutes");

const app = express();

app.use("/api/videos", videoRoutes);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
