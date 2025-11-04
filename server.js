const express = require("express");
const path = require("path");
const fs = require("fs");
const logger = require("./logger");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(logger.httpLogger); // Log semua HTTP requests

// In-memory storage for notes (in production, use a database)
let notes = [
  {
    id: 1,
    title: "Welcome Note",
    content: "This is your first note!",
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    title: "How to use",
    content:
      "Add new notes using the form above. Click delete to remove notes.",
    createdAt: new Date().toISOString(),
  },
];
let nextId = 3;

// Routes
// Serve the main page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// API Routes
// Get all notes
app.get("/api/notes", (req, res) => {
  res.json(notes);
});

// Add a new note
app.post("/api/notes", (req, res) => {
  const { title, content } = req.body;

  if (!title || !content) {
    logger.warn("Failed to create note: Missing required fields", { title, content });
    return res.status(400).json({ error: "Title and content are required" });
  }

  const newNote = {
    id: nextId++,
    title,
    content,
    createdAt: new Date().toISOString(),
  };

  notes.push(newNote);
  logger.info("New note created", { noteId: newNote.id, title: newNote.title });
  res.status(201).json(newNote);
});

// Delete a note
app.delete("/api/notes/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const noteIndex = notes.findIndex((note) => note.id === id);

  if (noteIndex === -1) {
    logger.warn("Failed to delete note: Note not found", { noteId: id });
    return res.status(404).json({ error: "Note not found" });
  }

  const deletedNote = notes.splice(noteIndex, 1)[0];
  logger.info("Note deleted", { noteId: id, title: deletedNote.title });
  res.json({ message: "Note deleted successfully", note: deletedNote });
});

// Update a note
app.put("/api/notes/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const { title, content } = req.body;
  const noteIndex = notes.findIndex((note) => note.id === id);

  if (noteIndex === -1) {
    logger.warn("Failed to update note: Note not found", { noteId: id });
    return res.status(404).json({ error: "Note not found" });
  }

  if (!title || !content) {
    logger.warn("Failed to update note: Missing required fields", { noteId: id });
    return res.status(400).json({ error: "Title and content are required" });
  }

  notes[noteIndex] = {
    ...notes[noteIndex],
    title,
    content,
    updatedAt: new Date().toISOString(),
  };

  logger.info("Note updated", { noteId: id, title: notes[noteIndex].title });
  res.json(notes[noteIndex]);
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Logs redirect endpoint - Redirect to Grafana with pre-configured query
app.get("/logs", (req, res) => {
  const grafanaUrl = process.env.GRAFANA_URL || "http://localhost:3001";

  // Grafana Explore URL dengan query pre-filled untuk service notes-app
  const exploreQuery = {
    datasource: "Loki",
    queries: [
      {
        refId: "A",
        expr: '{service="notes-app"}',
        queryType: "range"
      }
    ],
    range: {
      from: "now-1h",
      to: "now"
    }
  };

  // Encode query untuk URL
  const encodedQuery = encodeURIComponent(JSON.stringify(exploreQuery));
  const grafanaExploreUrl = `${grafanaUrl}/explore?orgId=1&left=${encodedQuery}`;

  logger.info("Redirecting to Grafana logs", {
    grafanaUrl: grafanaExploreUrl,
    requestIp: req.ip
  });

  res.redirect(grafanaExploreUrl);
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  logger.info(`Notes App started successfully`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version
  });
  console.log(`🚀 Notes App running on http://localhost:${PORT}`);
  console.log(`📝 Open your browser to start taking notes!`);
});

module.exports = app;
