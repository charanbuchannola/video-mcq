# Lecture-to-Quiz AI (MERN + Local LLM)

This project is a full-stack web application that enables users to upload an MP4 lecture video (~60 minutes), automatically transcribe its contents, and generate objective-type questions (MCQs) for every 5-minute segment. All processing—including transcription and MCQ generation—is performed locally using open-source tools and a locally hosted Large Language Model (LLM), ensuring data privacy and offline capability.

---

## Features

- **Video Upload:** Upload MP4 lecture videos via a web interface.
- **Automatic Transcription:** Audio is extracted and transcribed using [Whisper.cpp](https://github.com/ggerganov/whisper.cpp).
- **MCQ Generation:** For every 5-minute segment, MCQs are generated using a locally hosted LLM (e.g., Ollama).
- **Full Privacy:** No data leaves your machine; all AI runs locally.
- **Modern UI:** Built with React and Tailwind CSS.
- **Robust Backend:** Node.js, Express, MongoDB.

---

## Architecture

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Node.js + Express + MongoDB (Mongoose)
- **Transcription:** Whisper.cpp (invoked via child process)
- **MCQ Generation:** Local LLM (Ollama, invoked via HTTP API)
- **File Uploads:** Multer middleware

---

## Prerequisites

- **Node.js** (v18+ recommended)
- **npm** (comes with Node.js)
- **MongoDB** (local or Docker)
- **ffmpeg** (installed and in PATH)
- **Whisper.cpp** (built locally, see below)
- **Ollama** or another local LLM server (see below)

---

## Getting Started

### 1. **Clone the Repository**

```sh
git clone https://github.com/yourusername/lecture-to-quiz-ai.git
cd lecture-to-quiz-ai
```

### 2. **Backend Setup**

```sh
cd backend
npm install
```

#### **Environment Variables**

Create a `.env` file in the `backend` folder:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/lecture2quiz
WHISPER_CPP_PATH=C:/path/to/whisper.cpp/main.exe
WHISPER_MODEL_PATH=C:/path/to/whisper.cpp/models/ggml-base.en.bin
FFMPEG_COMMAND=ffmpeg
OLLAMA_API_URL=http://localhost:11434/api/generate
OLLAMA_MODEL_NAME=llama3
UPLOAD_DIR=uploads
```

- Adjust paths as needed for your system.

#### **Start MongoDB**

Make sure MongoDB is running locally.

#### **Start Backend**

```sh
npm start
```

---

### 3. **Frontend Setup**

```sh
cd ../frontend
npm install
```

#### **Configure API URL**

If your backend runs on a different port or host, update `src/services/api.js`:

```js
const API_BASE_URL = "http://localhost:5000/api";
```

#### **Start Frontend**

```sh
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

### 4. **Local AI Tools Setup**

#### **Whisper.cpp**

- Download and build [Whisper.cpp](https://github.com/ggerganov/whisper.cpp) for your OS.
- Download the English model (e.g., `ggml-base.en.bin`) and place it in the `models` folder.
- Update `WHISPER_CPP_PATH` and `WHISPER_MODEL_PATH` in your `.env`.

#### **Ollama (or other LLM)**

- Install [Ollama](https://ollama.com/) and pull a model (e.g., `ollama pull llama3`).
- Start the Ollama server.
- Ensure `OLLAMA_API_URL` and `OLLAMA_MODEL_NAME` in your `.env` are correct.

---

## Usage

1. **Upload a video** via the web UI.
2. **Wait for processing** (status updates shown).
3. **View results:** Full transcription and MCQs for each 5-minute segment.

---

## Project Structure

```
backend/
  src/
    controllers/
    db/
    middleware/
    models/
    routes/
    services/
    uploads/
  .env
  package.json
  server.js

frontend/
  src/
    components/
    services/
    App.jsx
    index.css
    main.jsx
  vite.config.js
  package.json
```

---

## API Endpoints

- `POST /api/videos/upload` — Upload a video file (form field: `videoFile`)
- `GET /api/videos/:id/status` — Get processing status
- `GET /api/videos/:id/results` — Get transcription and MCQs

---

## Customization

- **Segment Length:** Change the segment duration in `segmentTranscription` (default: 5 minutes).
- **MCQ Prompt:** Edit the prompt in `backend/src/services/llmService.js` for different question styles.
- **Frontend Styling:** Tweak Tailwind classes in `frontend/src/components`.

---

## Troubleshooting

- **CORS errors:** Ensure backend CORS is set to allow your frontend origin.
- **ffmpeg/Whisper/Ollama not found:** Double-check paths in `.env`.
- **MongoDB connection issues:** Make sure MongoDB is running and URI is correct.

---

## License

MIT

---

## Credits

- [Whisper.cpp](https://github.com/ggerganov/whisper.cpp)
- [Ollama](https://ollama.com/)
- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Node.js](https://nodejs.org/)
- [Express](https://expressjs.com/)
- [MongoDB](https://www.mongodb.com/)

---

## Screenshots

*(Add screenshots of your UI and results here!)*

---

## Author

- [BUCHANNOLA CHARAN](https://github.com/charanbuchannola/video-mcq)
