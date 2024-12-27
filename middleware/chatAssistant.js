const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");

const router = express();
router.use(bodyParser.json());

// Endpoint untuk menghubungkan frontend dan Flask API
router.post("/chatbot-assistant", async (req, res) => {
  try {
    const { input_text } = req.body;

    if (!input_text) {
      return res.status(400).json({ error: "Input text is required" });
    }

    // Kirim permintaan ke Flask API
    const flaskResponse = await axios.post("https://api-chatbot.mesinpintar.com/chat", {
      input_text,
    });

    // Kirimkan respon Flask API ke frontend
    return res.json(flaskResponse.data);
  } catch (error) {
    console.error("Error communicating with Flask API:", error.message);
    return res.status(500).json({ error: "Failed to fetch response from backend" });
  }
});

module.exports = router;
