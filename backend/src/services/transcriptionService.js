// backend/services/transcriptionService.js
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const WHISPER_CPP_PATH = process.env.WHISPER_CPP_PATH;
const WHISPER_MODEL_PATH = process.env.WHISPER_MODEL_PATH;
const FFMPEG_COMMAND = process.env.FFMPEG_COMMAND || "ffmpeg";

// Helper function to convert VTT time string "HH:MM:SS.mmm" to seconds (Number)
function vttTimeToSeconds(ts) {
  if (typeof ts !== "string") {
    console.warn(
      `[vttTimeToSeconds] Warning: Received non-string input: ${ts}. Returning 0.`
    );
    return 0;
  }
  const parts = ts.split(":");
  if (parts.length !== 3) {
    // Handle cases like "MM:SS.mmm" if whisper sometimes outputs that for shorter durations
    if (parts.length === 2) {
      const mParts = parts[0].split("."); // Should not happen if format is strict MM:SS.mmm
      const sPartsMs = parts[1].split(".");
      const m = parseInt(mParts[0]);
      const s = parseInt(sPartsMs[0]);
      const ms = sPartsMs.length > 1 ? parseInt(sPartsMs[1]) : 0;
      if (!isNaN(m) && !isNaN(s) && !isNaN(ms)) {
        return m * 60 + s + ms / 1000;
      }
    }
    console.warn(
      `[vttTimeToSeconds] Warning: Received invalid time format: ${ts}. Returning 0.`
    );
    return 0;
  }
  const h = parseInt(parts[0]);
  const m = parseInt(parts[1]);
  const sParts = parts[2].split(".");
  const s = parseInt(sParts[0]);
  const ms = sParts.length > 1 ? parseInt(sParts[1]) : 0;

  if (isNaN(h) || isNaN(m) || isNaN(s) || isNaN(ms)) {
    console.warn(
      `[vttTimeToSeconds] Warning: Parsing resulted in NaN for time: ${ts}. Returning 0.`
    );
    return 0;
  }
  return h * 3600 + m * 60 + s + ms / 1000;
}

async function transcribeVideo(videoPath) {
  return new Promise((resolve, reject) => {
    // ... (ffmpeg and whisper calling logic from the previous full code block)
    // This part remains unchanged from the previous "full updated code" response.
    // Ensure it uses FFMPEG_COMMAND and handles WAV creation and cleanup.
    if (!fs.existsSync(videoPath))
      return reject(new Error(`Video file not found: ${videoPath}`));
    if (!fs.existsSync(WHISPER_CPP_PATH))
      return reject(
        new Error(`Whisper.cpp executable not found: ${WHISPER_CPP_PATH}`)
      );
    if (!fs.existsSync(WHISPER_MODEL_PATH))
      return reject(
        new Error(`Whisper model not found: ${WHISPER_MODEL_PATH}`)
      );

    const audioPath = videoPath.replace(path.extname(videoPath), ".wav");

    if (!fs.existsSync(audioPath)) {
      console.log(
        `[ffmpeg] Extracting audio from ${videoPath} to ${audioPath}`
      );
      const ffmpeg = spawn(FFMPEG_COMMAND, [
        "-i",
        videoPath,
        "-ar",
        "16000",
        "-ac",
        "1",
        "-f",
        "wav",
        "-y",
        audioPath,
      ]);
      let ffmpegStderr = "";
      ffmpeg.stderr.on("data", (data) => {
        ffmpegStderr += data.toString();
      });
      ffmpeg.on("close", (code) => {
        if (code !== 0) {
          console.error(
            `[ffmpeg] Failed to extract audio. Code: ${code}. Stderr: ${ffmpegStderr}`
          );
          return reject(
            new Error(
              `Failed to extract audio with ffmpeg. Code: ${code}. Stderr: ${ffmpegStderr.substring(
                0,
                200
              )}`
            )
          );
        }
        console.log(`[ffmpeg] Audio extracted successfully to ${audioPath}`);
        runWhisper(audioPath);
      });
      ffmpeg.on("error", (err) => {
        console.error(`[ffmpeg] Failed to start ffmpeg: ${err.message}`);
        return reject(new Error("Failed to start ffmpeg: " + err.message));
      });
    } else {
      console.log(
        `[ffmpeg] Audio file ${audioPath} already exists. Proceeding with Whisper.`
      );
      runWhisper(audioPath);
    }

    function runWhisper(audioFile) {
      console.log(`[whisper] Transcribing audio file: ${audioFile}`);
      const outputFileName = path.basename(audioFile, path.extname(audioFile));
      const outputDir = path.dirname(audioFile);
      const vttFilePath1 = path.join(outputDir, `${outputFileName}.vtt`);
      const vttFilePath2 = path.join(
        outputDir,
        `${outputFileName}${path.extname(audioFile)}.vtt`
      );

      const whisperArgs = [
        "-m",
        WHISPER_MODEL_PATH,
        "-f",
        audioFile,
        "-l",
        "en",
        "-ovtt",
        "-t",
        "4",
        "-p",
        "1",
      ];
      const whisperProcess = spawn(WHISPER_CPP_PATH, whisperArgs);
      let stderrData = "";
      whisperProcess.stdout.on("data", (data) => {
        /* console.log(`[whisper stdout]: ${data}`); */
      });
      whisperProcess.stderr.on("data", (data) => {
        stderrData +=
          data.toString(); /* console.error(`[whisper stderr]: ${data}`); */
      });
      whisperProcess.on("close", (code) => {
        if (fs.existsSync(audioFile) && audioFile !== videoPath) {
          fs.unlink(audioFile, (err) => {
            if (err)
              console.error(
                `[whisper] Error deleting temporary WAV file ${audioFile}:`,
                err
              );
            // else console.log(`[whisper] Deleted temporary WAV file: ${audioFile}`);
          });
        }
        if (code === 0) {
          let vttContent = null;
          let vttFilePath = null;
          if (fs.existsSync(vttFilePath1)) {
            vttContent = fs.readFileSync(vttFilePath1, "utf-8");
            vttFilePath = vttFilePath1;
          } else if (fs.existsSync(vttFilePath2)) {
            vttContent = fs.readFileSync(vttFilePath2, "utf-8");
            vttFilePath = vttFilePath2;
          }

          if (vttContent) {
            console.log(
              `[whisper] Transcription successful. VTT file: ${vttFilePath}`
            );
            resolve({ vttContent, vttFilePath });
          } else {
            console.error(
              `[whisper] VTT file not found after transcription. Tried: ${vttFilePath1}, ${vttFilePath2}. Stderr: ${stderrData}`
            );
            reject(
              new Error(
                `VTT file not found. Stderr: ${stderrData.substring(0, 200)}`
              )
            );
          }
        } else {
          console.error(
            `[whisper] Transcription failed (code ${code}). Stderr: ${stderrData}`
          );
          reject(
            new Error(
              `Transcription failed (code ${code}). Stderr: ${stderrData.substring(
                0,
                200
              )}`
            )
          );
        }
      });
      whisperProcess.on("error", (err) => {
        console.error(
          `[whisper] Failed to start transcription process: ${err.message}`
        );
        reject(
          new Error("Failed to start transcription process: " + err.message)
        );
      });
    }
  });
}

// Simple VTT parser: returns array of { startTime, endTime, text }
// where startTime and endTime are VTT time strings "HH:MM:SS.mmm"
function parseVTT(vttContent) {
  const lines = vttContent.split(/\r?\n/);
  const segments = [];
  let current = null;
  const timeRegex =
    /^(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})/; // Strict HH:MM:SS.mmm format

  for (let line of lines) {
    line = line.trim();
    const match = line.match(timeRegex);
    if (match) {
      if (current && current.text.trim()) segments.push(current);
      current = { startTime: match[1], endTime: match[2], text: "" };
    } else if (
      current &&
      line &&
      !line.startsWith("WEBVTT") &&
      !/^\d+$/.test(line) &&
      !line.startsWith("NOTE ")
    ) {
      // Added check for "NOTE " to avoid including VTT comments
      current.text += (current.text ? " " : "") + line;
    }
  }
  if (current && current.text.trim()) segments.push(current);
  return segments;
}

// THIS IS YOUR PROVIDED SEGMENTATION FUNCTION
// It takes segments from parseVTT (where times are VTT strings)
// and returns chunks where times are also VTT strings.
function segmentTranscription(parsedVttSegments, minutes = 5) {
  const result = [];
  if (!parsedVttSegments || parsedVttSegments.length === 0) {
    console.warn(
      "[segmentTranscription] Received empty or null parsedVttSegments. Returning empty array."
    );
    return result;
  }

  let currentChunkStartTimeStr = null; // Stores VTT time string like "00:00:00.000"
  let currentChunkEndTimeStr = null; // Stores VTT time string
  let currentChunkTextAccumulator = [];
  const segmentDurationTargetSeconds = minutes * 60;

  for (const vttSeg of parsedVttSegments) {
    if (
      !vttSeg ||
      typeof vttSeg.startTime !== "string" ||
      typeof vttSeg.endTime !== "string" ||
      typeof vttSeg.text !== "string"
    ) {
      console.warn(
        "[segmentTranscription] Skipping invalid VTT segment:",
        vttSeg
      );
      continue;
    }

    if (!currentChunkStartTimeStr) {
      currentChunkStartTimeStr = vttSeg.startTime;
    }
    currentChunkTextAccumulator.push(vttSeg.text);
    currentChunkEndTimeStr = vttSeg.endTime; // Always update to the end time of the last segment processed for this chunk

    // Check if the DURATION of the accumulated text has reached the target
    // This means from the start of the *first segment in this chunk* to the end of the *current segment*
    const currentChunkDurationSeconds =
      vttTimeToSeconds(currentChunkEndTimeStr) -
      vttTimeToSeconds(currentChunkStartTimeStr);

    if (currentChunkDurationSeconds >= segmentDurationTargetSeconds) {
      result.push({
        startTime: currentChunkStartTimeStr, // VTT time string
        endTime: currentChunkEndTimeStr, // VTT time string
        text: currentChunkTextAccumulator.join(" ").trim(),
      });
      // Reset for the next chunk
      currentChunkStartTimeStr = null;
      currentChunkEndTimeStr = null;
      currentChunkTextAccumulator = [];
    }
  }

  // Add any remaining text as the last segment if it exists
  if (currentChunkTextAccumulator.length > 0 && currentChunkStartTimeStr) {
    result.push({
      startTime: currentChunkStartTimeStr,
      endTime: currentChunkEndTimeStr, // This will be the endTime of the very last VTT segment processed
      text: currentChunkTextAccumulator.join(" ").trim(),
    });
  }
  return result;
}

module.exports = {
  transcribeVideo,
  parseVTT,
  segmentTranscription, // Your segmentation logic
  vttTimeToSeconds, // The helper to convert VTT time strings to numbers
};
