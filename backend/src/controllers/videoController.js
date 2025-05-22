
const Video = require("../models/videoModel");
const Transcription = require("../models/transcriptionModel");
const MCQ = require("../models/mcqModel");
const transcriptionService = require("../services/transcriptionService");
const llmService = require("../services/llmService");
const fs = require("fs");
const path = require("path");

exports.uploadVideo = async (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ message: "No file uploaded or file type incorrect." });
  }

  const video = new Video({
    originalFilename: req.file.originalname,
    filename: req.file.filename,
    path: req.file.path, // Full path from multer
    status: "uploaded",
  });

  try {
    await video.save();
    res.status(201).json({
      message: "Video uploaded successfully. Processing started.",
      videoId: video._id,
    });

    // --- Start processing asynchronously ---
    processVideo(video._id); // Don't await this
  } catch (error) {
    console.error("Error saving video record:", error);
    // Clean up uploaded file if DB save fails
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Error deleting orphaned file:", err);
      });
    }
    res
      .status(500)
      .json({ message: "Error saving video record.", error: error.message });
  }
};

async function processVideo(videoId) {
  let video;
  try {
    video = await Video.findById(videoId);
    if (!video) {
      console.error(`Video not found for processing: ${videoId}`);
      return;
    }

    // 1. Transcription
    video.status = "transcribing";
    await video.save();
    console.log(`Starting transcription for ${video.originalFilename}`);

    const { vttContent, vttFilePath } =
      await transcriptionService.transcribeVideo(video.path);
    const parsedVttSegments = transcriptionService.parseVTT(vttContent);

    const fullTranscriptionText = parsedVttSegments
      .map((s) => s.text)
      .join(" ");
    const fiveMinSegments = transcriptionService.segmentTranscription(
      parsedVttSegments,
      5
    );

    const transcription = new Transcription({
      videoId: video._id,
      fullText: fullTranscriptionText,
      segments: fiveMinSegments.map((s) => ({
        // Store the 5-min summary segments
        startTime: s.startTime,
        endTime: s.endTime,
        text: s.text,
      })),
    });
    await transcription.save();
    video.transcriptionId = transcription._id;
    console.log(`Transcription complete for ${video.originalFilename}`);

    // Optionally delete the VTT file after processing
    if (fs.existsSync(vttFilePath)) {
      fs.unlink(vttFilePath, (err) => {
        if (err) console.error(`Error deleting VTT file ${vttFilePath}:`, err);
        else console.log(`Deleted VTT file: ${vttFilePath}`);
      });
    }

    // 2. MCQ Generation
    video.status = "generating_mcqs";
    await video.save();
    console.log(`Starting MCQ generation for ${video.originalFilename}`);

    const generatedMcqs = [];
    for (const segment of fiveMinSegments) {
      if (!segment.text || segment.text.trim().length < 50) {
        // Skip very short segments
        console.log(
          `Skipping MCQ generation for short segment: ${segment.startTime}s - ${segment.endTime}s`
        );
        continue;
      }
      try {
        const mcqsForSegment = await llmService.generateMCQs(segment.text);
        for (const mcqData of mcqsForSegment) {
          const newMcq = new MCQ({
            videoId: video._id,
            segmentStartTime: segment.startTime,
            segmentEndTime: segment.endTime,
            ...mcqData, // spread question, options, correctAnswer
          });
          await newMcq.save();
          generatedMcqs.push(newMcq._id);
        }
      } catch (mcqError) {
        console.error(
          `Error generating MCQs for segment ${segment.startTime}-${segment.endTime}:`,
          mcqError.message
        );
        // Decide if you want to mark video as failed or just log and continue
      }
    }
    video.mcqs = generatedMcqs;
    video.status = "completed";
    console.log(`MCQ generation complete for ${video.originalFilename}`);
    await video.save();
  } catch (error) {
    console.error(`Error processing video ${videoId}:`, error);
    if (video) {
      video.status = "failed";
      video.errorMessage = error.message;
      await video.save();
    }
  } finally {
    // Optional: Clean up the original uploaded video file after processing
    // if (video && video.path && video.status === 'completed') {
    //     fs.unlink(video.path, (err) => {
    //         if (err) console.error("Error deleting processed video file:", err);
    //         else console.log(`Deleted processed video file: ${video.path}`);
    //     });
    // }
  }
}

exports.getVideoStatus = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id).select(
      "status errorMessage"
    );
    if (!video) {
      return res.status(404).json({ message: "Video not found." });
    }
    res.json({ status: video.status, errorMessage: video.errorMessage });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching video status.", error: error.message });
  }
};

exports.getVideoResults = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id)
      .populate("transcriptionId")
      .populate("mcqs");

    if (!video) {
      return res.status(404).json({ message: "Video not found." });
    }
    if (video.status !== "completed") {
      return res.status(202).json({
        message: "Video processing not yet complete.",
        status: video.status,
      });
    }

    res.json({
      video: {
        _id: video._id,
        originalFilename: video.originalFilename,
        status: video.status,
        uploadDate: video.uploadDate,
      },
      transcription: video.transcriptionId, // This will be the populated object
      mcqs: video.mcqs, // This will be the populated array of MCQ objects
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching video results.", error: error.message });
  }
};
