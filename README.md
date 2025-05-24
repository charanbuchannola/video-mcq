# Local Lecture-to-Quiz AI

This full-stack MERN application enables users to upload an MP4 video lecture, automatically transcribes its content, and generates multiple-choice questions (MCQs) for every 5-minute segment. All AI processing (transcription and MCQ generation) is done locally using Whisper.cpp and a locally hosted Large Language Model (LLM) via Ollama, ensuring offline capability and data privacy.

## Features

- **Video Upload:** Supports MP4 video file uploads.
- **Local Automatic Transcription:** Transcribes video audio to text with timestamps using `Whisper.cpp`.
- **Text Segmentation:** Divides the transcription into 5-minute segments.
- **Local LLM-Powered MCQ Generation:** Generates MCQs for each segment using a locally run LLM (e.g., Mistral, Llama 2) via `Ollama`.
- **Results Display:** Shows the full transcription and generated MCQs associated with video segments.
- **Offline Capability & Data Privacy:** All core processing happens on the local machine.

## Technology Stack

- **Frontend:** React.js, Tailwind CSS, Axios
- **Backend:** Node.js, Express.js
- **Database:** MongoDB (with Mongoose ODM)
- **Video Transcription (Local):** [Whisper.cpp](https://github.com/ggerganov/whisper.cpp)
- **LLM Hosting (Local):** [Ollama](https://ollama.ai/)
- **File Uploads:** Multer

## Project Structure

Use code with caution.
Markdown
local-lecture-to-quiz/
├── backend/ # Node.js/Express backend
├── frontend/ # React frontend
├── local_ai_tools/ # Houses local AI tools like Whisper.cpp
├── .gitignore
└── README.md

## Prerequisites

Before you begin, ensure you have the following installed:

1.  **Node.js & npm:** (LTS version recommended) [Download Node.js](https://nodejs.org/)
2.  **MongoDB:** (Community Server) [Download MongoDB](https://www.mongodb.com/try/download/community)
    - Ensure the MongoDB service is running (`mongod`).
3.  **Git:** [Download Git](https://git-scm.com/downloads)
4.  **C++ Compiler:**
    - **Linux:** `sudo apt-get install build-essential`
    - **macOS:** Xcode Command Line Tools (`xcode-select --install`)
    - **Windows:** MinGW-w64 or MSVC (Using WSL is recommended for easier C++ compilation on Windows).
5.  **(Optional) Python 3.8+**

## Setup & Installation

### 1. Clone the Repository

```bash
git clone <your-repository-url> local-lecture-to-quiz
cd local-lecture-to-quiz
Use code with caution.
2. Set up Local AI Tools
a. Whisper.cpp (Transcription)
# Navigate to the directory for local AI tools
mkdir -p local_ai_tools
cd local_ai_tools

# Clone Whisper.cpp
git clone https://github.com/ggerganov/whisper.cpp.git
cd whisper.cpp

# Download a Whisper model (e.g., base.en or small.en for better accuracy)
bash ./models/download-ggml-model.sh base.en
# or: bash ./models/download-ggml-model.sh small.en

# Compile Whisper.cpp
make

# Go back to the project root
cd ../../
Use code with caution.
Bash
b. Ollama (Local LLM Hosting)
Download and install Ollama for your operating system from ollama.ai.
Pull an LLM model. We recommend mistral for a good balance of performance and capability:
ollama pull mistral
Use code with caution.
Bash
Other options: ollama pull mistral:instruct or ollama pull llama2:7b-chat
Verify Ollama is running and the model is available:
ollama list
Use code with caution.
Bash
Ollama typically serves its API at http://localhost:11434.
3. Configure Backend
Navigate to the backend directory:
cd backend
Use code with caution.
Bash
Install backend dependencies:
npm install
Use code with caution.
Bash
Create a .env file in the backend directory (backend/.env) and populate it with your local configuration. Update the WHISPER_CPP_PATH and WHISPER_MODEL_PATH with the absolute paths on your system.
PORT=5000
MONGO_URI=mongodb://localhost:27017/lecture_quiz_db

# !!! IMPORTANT: Replace with ABSOLUTE paths on your system !!!
WHISPER_CPP_PATH=/full/path/to/your/local-lecture-to-quiz/local_ai_tools/whisper.cpp/main
WHISPER_MODEL_PATH=/full/path/to/your/local-lecture-to-quiz/local_ai_tools/whisper.cpp/models/ggml-base.en.bin # Or ggml-small.en.bin if you downloaded that

OLLAMA_API_URL=http://localhost:11434/api/generate
OLLAMA_MODEL_NAME=mistral # Or the model you pulled (e.g., mistral:instruct)
UPLOAD_DIR=./uploads
Use code with caution.
Env
Go back to the project root:
cd ..
Use code with caution.
Bash
4. Configure Frontend
Navigate to the frontend directory:
cd frontend
Use code with caution.
Bash
Install frontend dependencies:
npm install
Use code with caution.
Bash
(The proxy for API calls during development is already set in frontend/package.json)
Go back to the project root:
cd ..
Use code with caution.
Bash
Running the Application
Start MongoDB: Ensure your MongoDB server is running.
# (Command might vary based on your OS and installation)
mongod
Use code with caution.
Bash
Start Ollama Service: Ollama usually runs as a background service after installation. You can check its status or start it if necessary.
ollama serve  # (If not running automatically)
ollama list   # (To verify models)
Use code with caution.
Bash
Start the Backend Server:
Open a new terminal window, navigate to the backend directory, and run:
cd backend
npm run dev
Use code with caution.
Bash
The backend server should start on http://localhost:5000 (or the port specified in your .env).
Start the Frontend Development Server:
Open another new terminal window, navigate to the frontend directory, and run:
cd frontend
npm start
Use code with caution.
Bash
The React application should open in your browser, typically at http://localhost:3000.
Usage
Open the application in your web browser (usually http://localhost:3000).
Click the "Choose File" button to select an MP4 video lecture.
Click "Upload and Process."
The application will display the video ID and processing status. This includes:
Uploading the file.
Transcribing the video (can take several minutes depending on video length and your CPU).
Generating MCQs for each 5-minute segment (can also take time depending on the LLM and segment count).
Once processing is complete, the full transcription and generated MCQs will be displayed.
Troubleshooting
Whisper.cpp Path Errors: Double-check the WHISPER_CPP_PATH and WHISPER_MODEL_PATH in backend/.env. They must be absolute paths.
Ollama Not Responding: Ensure Ollama service is running and the model specified in OLLAMA_MODEL_NAME is pulled (ollama list). Check http://localhost:11434 in your browser.
MongoDB Connection Issues: Verify MongoDB is running and accessible at the MONGO_URI specified.
Long Processing Times: Transcription and LLM inference are computationally intensive. For a 60-minute lecture, expect significant processing time. Smaller Whisper models (like base.en) are faster but less accurate than larger ones (small.en, medium.en).
Permissions: Ensure the backend has write permissions to the backend/uploads directory.
LLM JSON Output: If MCQs are not generating correctly, check the backend console for errors from llmService.js. The LLM might occasionally produce malformed JSON. Prompt engineering or retries might be needed for robustness.
Future Enhancements (Ideas)
User authentication.
Option to save/export generated quizzes.
More sophisticated text segmentation (e.g., by topic).
Choice of different LLMs or Whisper models via UI.
Job queue for handling long-running processing tasks more robustly.
Progress bars for transcription and MCQ generation stages.
Option to edit/delete generated MCQs.
Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.
License
MIT
**Remember to:**

1.  Replace `<https://github.com/charanbuchannola/video-mcq>` with the actual URL if you host this on GitHub/GitLab.
2.  Create a `LICENSE` file in your project root (e.g., with MIT License text) if you specify a license like MIT.

This `README.md` provides a good overview for anyone looking to understand, set up, and run your project.
```
