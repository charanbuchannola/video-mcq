const express = require("express");
const router = express.Router();
const videoController = require("../controllers/videoController");
const upload = require("../middleware/uploadMiddleware");

router.post("/upload", upload.single("videoFile"), videoController.uploadVideo);
router.get("/:id/status", videoController.getVideoStatus);
router.get("/:id/results", videoController.getVideoResults);

module.exports = router;
