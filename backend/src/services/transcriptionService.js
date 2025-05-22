// backend/services/transcriptionService.js
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const WHISPER_CPP_PATH = process.env.WHISPER_CPP_PATH;
const WHISPER_MODEL_PATH = process.env.WHISPER_MODEL_PATH;

async function transcribeVideo(videoPath) {
  return new Promise((resolve, reject) => {
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

    const outputFileName = path.basename(videoPath, path.extname(videoPath));
    const outputDir = path.dirname(videoPath);
    const vttFilePath = path.join(outputDir, `${outputFileName}.vtt`);

    const whisperArgs = [
      "-m",
      WHISPER_MODEL_PATH,
      "-f",
      videoPath,
      "-l",
      "en",
      "-ovtt",
      "-t",
      "4", // Threads, adjust based on CPU
      "-p",
      "1", // Processors, adjust based on CPU
    ];

    console.log(
      `Spawning Whisper: ${WHISPER_CPP_PATH} ${whisperArgs.join(" ")}`
    );
    const whisperProcess = spawn(WHISPER_CPP_PATH, whisperArgs);
    let stderrData = "";

    whisperProcess.stdout.on("data", (data) =>
      console.log(`Whisper stdout: ${data}`)
    );
    whisperProcess.stderr.on("data", (data) => {
      stderrData += data.toString();
      console.error(`Whisper stderr: ${data}`);
    });

    whisperProcess.on("close", (code) => {
      if (code === 0) {
        if (fs.existsSync(vttFilePath)) {
          const vttContent = fs.readFileSync(vttFilePath, "utf-8");
          resolve({ vttContent, vttFilePath });
        } else {
          reject(
            new Error(
              `VTT file not found: ${vttFilePath}. Stderr: ${stderrData}`
            )
          );
        }
      } else {
        reject(
          new Error(
            `Transcription failed (code ${code}). Stderr: ${stderrData}`
          )
        );
      }
    });
    whisperProcess.on("error", (err) =>
      reject(new Error("Failed to start transcription process: " + err.message))
    );
  });
}

function parseVTT(vttContent) {
  const lines = vttContent.split("\n");
  const segments = [];
  let currentSegment = null;
  const timeToSeconds = (timeStr) => {
    const [hms, msPart] = timeStr.split(".");
    const [h, m, s] = hms.split(":").map(parseFloat);
    return h * 3600 + m * 60 + s + (msPart ? parseFloat(msPart) / 1000 : 0);
  };
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.includes("-->")) {
      if (currentSegment && currentSegment.text) segments.push(currentSegment);
      const [start, end] = trimmedLine.split(" --> ");
      currentSegment = {
        startTime: timeToSeconds(start),
        endTime: timeToSeconds(end),
        text: "",
      };
    } else if (
      currentSegment &&
      trimmedLine &&
      !trimmedLine.startsWith("WEBVTT") &&
      !/^\d+$/.test(trimmedLine)
    ) {
      currentSegment.text += (currentSegment.text ? " " : "") + trimmedLine;
    }
  }
  if (currentSegment && currentSegment.text) segments.push(currentSegment);
  return segments;
}

function segmentTranscription(parsedVttSegments, intervalMinutes = 5) {
  const intervalSeconds = intervalMinutes * 60;
  if (!parsedVttSegments || parsedVttSegments.length === 0) return [];
  const groupedSegments = [];
  let currentGroupStartTime = 0;
  let currentGroupText = "";

  for (const segment of parsedVttSegments) {
    const segmentGroupStart =
      Math.floor(segment.startTime / intervalSeconds) * intervalSeconds;
    if (currentGroupText && segmentGroupStart > currentGroupStartTime) {
      groupedSegments.push({
        startTime: currentGroupStartTime,
        endTime: currentGroupStartTime + intervalSeconds,
        text: currentGroupText.trim(),
      });
      currentGroupText = "";
    }
    currentGroupStartTime = segmentGroupStart;
    currentGroupText += (currentGroupText ? " " : "") + segment.text;
  }
  if (currentGroupText) {
    groupedSegments.push({
      startTime: currentGroupStartTime,
      endTime: currentGroupStartTime + intervalSeconds,
      text: currentGroupText.trim(),
    });
  }
  return groupedSegments;
}

module.exports = { transcribeVideo, parseVTT, segmentTranscription };
