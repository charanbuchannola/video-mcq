const mongoose = require("mongoose");

const segmentSchema = new mongoose.Schema(
  {
    startTime: { type: Number, required: true },
    endTime: { type: Number, required: true },
    text: { type: String, required: true },
  },
  { _id: false }
);

const transcriptionSchema = new mongoose.Schema({
  videoId: { type: Schema.Types.ObjectId, ref: "Video", required: true },
  fullText: { type: String },
  segments: [segmentSchema],
  generatedDate: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Transcription", transcriptionSchema);
