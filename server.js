const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { executeCode } = require("./executor");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

// Serve frontend
app.use(express.static(path.join(__dirname, "public")));

const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Home page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    service: "SMAT",
    status: "online"
  });
});

// Execute SMAT code
app.post("/api/execute", async (req, res) => {
  try {
    const code = String(req.body.code || "");

    if (!code.trim()) {
      return res.json({
        success: true,
        output: "",
        error: null
      });
    }

    const result = await executeCode(code);
    res.json(result);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      output: "",
      error: error.message
    });
  }
});

// Save file
app.post("/api/files/save", (req, res) => {
  try {
    const filename = sanitizeFilename(req.body.filename);
    const content = String(req.body.content || "");

    fs.writeFileSync(
      path.join(DATA_DIR, filename),
      content,
      "utf8"
    );

    res.json({
      success: true,
      filename
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// List files
app.get("/api/files", (req, res) => {
  try {
    res.json({
      success: true,
      files: fs.readdirSync(DATA_DIR)
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Read file
app.get("/api/files/:filename", (req, res) => {
  try {
    const filename = sanitizeFilename(req.params.filename);
    const filePath = path.join(DATA_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: "File not found"
      });
    }

    res.json({
      success: true,
      filename,
      content: fs.readFileSync(filePath, "utf8")
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Delete file
app.delete("/api/files/:filename", (req, res) => {
  try {
    const filename = sanitizeFilename(req.params.filename);
    const filePath = path.join(DATA_DIR, filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({
      success: true
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

function sanitizeFilename(filename) {
  let name = String(filename || "")
    .replace(/\\/g, "")
    .replace(/\//g, "")
    .replace(/\.\./g, "")
    .trim();

  if (!name) {
    name = "untitled.m";
  }

  if (!name.endsWith(".m")) {
    name += ".m";
  }

  return name;
}

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`SMAT running on port ${PORT}`);
});
