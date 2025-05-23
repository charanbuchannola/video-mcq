const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalFilename: { type: String, required: true },
  path: { type: String, required: true },
  status: {
    type: String,
    enum: [
      "uploaded",
      "transcribing",
      "generating_mcqs",
      "completed",
      "failed",
    ],
    default: "uploaded",
  },
  transcriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Transcription",
  },
  mcqs: [{ type: mongoose.Schema.Types.ObjectId, ref: "MCQ" }],
  errorMessage: { type: String },
  uploadDate: { type: Date, default: Date.now },
});
module.exports = mongoose.model("Video", videoSchema);
