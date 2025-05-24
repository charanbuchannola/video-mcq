// backend/controllers/videoController.js
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
    path: req.file.path,
  });
  try {
    await video.save();
    res.status(201).json({
      message: "Video uploaded successfully. Processing started.",
      videoId: video._id,
    });
    processVideo(video._id);
  } catch (error) {
    console.error(`[${video._id || "N/A"}] Error saving video record:`, error);
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, (err) => {
        if (err)
          console.error(
            `[${video._id || "N/A"}] Error deleting orphaned file:`,
            err
          );
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
      console.error(`[${videoId}] Video not found for processing.`);
      return;
    }

    console.log(
      `[${videoId}] Starting full processing for ${video.originalFilename}`
    );

    // 1. Transcription
    video.status = "transcribing";
    await video.save();
    console.log(`[${videoId}] Starting transcription...`);
    const { vttContent, vttFilePath } =
      await transcriptionService.transcribeVideo(video.path);
    const parsedVttSegments = transcriptionService.parseVTT(vttContent);

    if (!parsedVttSegments || parsedVttSegments.length === 0) {
      throw new Error("Transcription VTT parsing resulted in zero segments.");
    }
    console.log(
      `[${videoId}] Parsed ${parsedVttSegments.length} raw VTT segments.`
    );

    const fullTranscriptionText = parsedVttSegments
      .map((s) => s.text)
      .join(" ");
    const fiveMinChunkedSegments = transcriptionService.segmentTranscription(
      parsedVttSegments,
      5
    ); // VTT time strings

    console.log(
      `[${videoId}] Segmented transcription into ${fiveMinChunkedSegments.length} 5-minute chunks.`
    );

    // Convert VTT time strings to seconds for DB and MCQ generation
    const segmentsForDbAndMcq = fiveMinChunkedSegments.map((s) => ({
      startTime: transcriptionService.vttTimeToSeconds(s.startTime), // Now Number
      endTime: transcriptionService.vttTimeToSeconds(s.endTime), // Now Number
      text: s.text,
    }));

    const transcription = new Transcription({
      videoId: video._id,
      fullText: fullTranscriptionText,
      segments: segmentsForDbAndMcq, // Store segments with numeric times
    });
    await transcription.save();
    video.transcriptionId = transcription._id;
    console.log(`[${videoId}] Transcription complete and saved.`);

    if (vttFilePath && fs.existsSync(vttFilePath)) {
      fs.unlink(vttFilePath, (err) => {
        if (err)
          console.error(
            `[${videoId}] Error deleting VTT file ${vttFilePath}:`,
            err
          );
        else console.log(`[${videoId}] Deleted VTT file: ${vttFilePath}`);
      });
    }

    // 2. MCQ Generation
    video.status = "generating_mcqs";
    await video.save();
    console.log(
      `[${videoId}] Starting MCQ generation for ${segmentsForDbAndMcq.length} segments...`
    );

    const generatedMcqIds = [];
    for (let i = 0; i < segmentsForDbAndMcq.length; i++) {
      const segment = segmentsForDbAndMcq[i];
      console.log(
        `[${videoId}] Processing segment ${i + 1}/${
          segmentsForDbAndMcq.length
        } for MCQs: ${segment.startTime.toFixed(
          0
        )}s - ${segment.endTime.toFixed(0)}s`
      );

      if (!segment.text || segment.text.trim().length < 50) {
        console.warn(
          `[${videoId}] Segment ${i + 1} too short, skipping MCQ generation.`
        );
        continue;
      }
      try {
        const mcqsForSegment = await llmService.generateMCQs(segment.text); // Returns array
        for (const mcqData of mcqsForSegment) {
          // mcqsForSegment is already an array from llmService
          const newMcq = new MCQ({
            videoId: video._id,
            segmentStartTime: segment.startTime, // Already number
            segmentEndTime: segment.endTime, // Already number
            ...mcqData,
          });
          await newMcq.save();
          generatedMcqIds.push(newMcq._id);
        }
        console.log(
          `[${videoId}] Generated ${mcqsForSegment.length} MCQs for segment ${
            i + 1
          }.`
        );
      } catch (mcqError) {
        console.error(
          `[${videoId}] Error generating MCQs for segment ${
            i + 1
          } (${segment.startTime.toFixed(0)}s-${segment.endTime.toFixed(0)}s):`,
          mcqError.message
        );
      }
    }
    video.mcqs = generatedMcqIds;
    video.status = "completed";
    console.log(
      `[${videoId}] MCQ generation complete. Total MCQs: ${generatedMcqIds.length}.`
    );
    await video.save();
  } catch (error) {
    console.error(
      `[${videoId || "N/A"}] Critical error processing video:`,
      error
    );
    if (video) {
      video.status = "failed";
      video.errorMessage = error.message.substring(0, 500);
      await video.save();
    }
  } finally {
    // Optional cleanup:
    // if (video && video.path && (video.status === 'completed' || video.status === 'failed')) {
    //   if (fs.existsSync(video.path)) {
    //     fs.unlink(video.path, (err) => {
    //       if (err) console.error(`[${videoId}] Error deleting original video file:`, err);
    //       else console.log(`[${videoId}] Deleted original video file: ${video.path}`);
    //     });
    //   }
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
      .populate({ path: "transcriptionId", model: "Transcription" }) // Explicitly specify model
      .populate({ path: "mcqs", model: "MCQ" }); // Explicitly specify model

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
      transcription: video.transcriptionId,
      mcqs: video.mcqs,
    });
  } catch (error) {
    console.error("Error fetching video results:", error);
    res
      .status(500)
      .json({ message: "Error fetching video results.", error: error.message });
  }
};
