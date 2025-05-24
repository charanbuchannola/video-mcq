const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const WHISPER_CPP_PATH = process.env.WHISPER_CPP_PATH;
const WHISPER_MODEL_PATH = process.env.WHISPER_MODEL_PATH;

// Set your ffmpeg absolute path here
const FFMPEG_PATH =
  "C:/Users/buchannola charan/OneDrive/Desktop/ffmpeg-7.0.2-essentials_build/ffmpeg-7.0.2-essentials_build/bin/ffmpeg.exe";

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

    // --- Extract audio to WAV ---
    const audioPath = videoPath.replace(path.extname(videoPath), ".wav");
    if (!fs.existsSync(audioPath)) {
      const ffmpeg = spawn(FFMPEG_PATH, [
        "-i",
        videoPath,
        "-ar",
        "16000",
        "-ac",
        "1",
        "-f",
        "wav",
        audioPath,
      ]);
      ffmpeg.stderr.on("data", (data) => {
        // Optionally log ffmpeg output
        console.error(`ffmpeg stderr: ${data}`);
      });
      ffmpeg.on("close", (code) => {
        if (code !== 0) {
          return reject(new Error("Failed to extract audio with ffmpeg"));
        }
        runWhisper(audioPath);
      });
      ffmpeg.on("error", (err) => {
        return reject(new Error("Failed to start ffmpeg: " + err.message));
      });
    } else {
      runWhisper(audioPath);
    }

    function runWhisper(audioFile) {
      const outputFileName = path.basename(audioFile, path.extname(audioFile));
      const outputDir = path.dirname(audioFile);

      // Try both possible VTT file names
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

      whisperProcess.stdout.on("data", (data) =>
        console.log(`Whisper stdout: ${data}`)
      );
      whisperProcess.stderr.on("data", (data) => {
        stderrData += data.toString();
        console.error(`Whisper stderr: ${data}`);
      });

      whisperProcess.on("close", (code) => {
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
            resolve({ vttContent, vttFilePath });
          } else {
            reject(
              new Error(
                `VTT file not found: ${vttFilePath1} or ${vttFilePath2}. Stderr: ${stderrData}`
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
        reject(
          new Error("Failed to start transcription process: " + err.message)
        )
      );
    }
  });
}

// Simple VTT parser: returns array of { startTime, endTime, text }
function parseVTT(vttContent) {
  const lines = vttContent.split(/\r?\n/);
  const segments = [];
  let current = null;

  for (let line of lines) {
    line = line.trim();
    // Match timecode lines
    const match = line.match(
      /^(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})/
    );
    if (match) {
      if (current) segments.push(current);
      current = { startTime: match[1], endTime: match[2], text: "" };
    } else if (current && line) {
      current.text += (current.text ? " " : "") + line;
    }
  }
  if (current) segments.push(current);
  return segments;
}

// Convert VTT time string to seconds (number)
function vttTimeToSeconds(ts) {
  const [h, m, s] = ts.split(":");
  const [sec, ms] = s.split(".");
  return (
    parseInt(h) * 3600 +
    parseInt(m) * 60 +
    parseInt(sec) +
    (ms ? parseInt(ms) / 1000 : 0)
  );
}

// Segments parsed VTT into N-minute chunks
function segmentTranscription(segments, minutes = 5) {
  const result = [];
  let currentStart = null;
  let currentEnd = null;
  let currentText = [];

  function toSeconds(ts) {
    const [h, m, s] = ts.split(":");
    const [sec, ms] = s.split(".");
    return (
      parseInt(h) * 3600 +
      parseInt(m) * 60 +
      parseInt(sec) +
      (ms ? parseInt(ms) / 1000 : 0)
    );
  }

  for (const seg of segments) {
    if (!currentStart) currentStart = seg.startTime;
    currentEnd = seg.endTime;
    currentText.push(seg.text);

    if (toSeconds(currentEnd) - toSeconds(currentStart) >= minutes * 60) {
      result.push({
        startTime: currentStart,
        endTime: currentEnd,
        text: currentText.join(" "),
      });
      currentStart = null;
      currentEnd = null;
      currentText = [];
    }
  }
  // Push any remaining text as the last segment
  if (currentText.length > 0) {
    result.push({
      startTime: currentStart,
      endTime: currentEnd,
      text: currentText.join(" "),
    });
  }
  return result;
}

module.exports = {
  transcribeVideo,
  parseVTT,
  segmentTranscription,
  vttTimeToSeconds,
};
