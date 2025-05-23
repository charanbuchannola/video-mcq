const mongoose = require("mongoose");

const mcqSchema = new mongoose.Schema({
  videoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Video",
    required: true,
  },
  segmentStartTime: { type: Number, required: true },
  segmentEndTime: { type: Number, required: true },
  question: { type: String, required: true },
  options: {
    type: [String],
    required: true,
    validate: [(val) => val.length === 4, "Must have 4 options"],
  },
  correctAnswer: { type: String, required: true },
  generatedDate: { type: Date, default: Date.now },
});
module.exports = mongoose.model("MCQ", mcqSchema);
