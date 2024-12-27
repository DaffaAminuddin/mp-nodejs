const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");

const router = express();
router.use(bodyParser.json());

// Endpoint untuk menghubungkan frontend dan Flask API
router.post("/paraphrase", async (req, res) => {
  let turnstileToken = req.body["cf-turnstile-response"]; // Token CAPTCHA dari frontend
  console.log("Site Key:", process.env.TURNSTILE_SITE_KEY);
  console.log("Secret Key:", process.env.TURNSTILE_SECRET_KEY);
  console.log("Token Received:", turnstileToken);
  try {
    const { input_text } = req.body;

    if (!input_text) {
      return res.status(400).json({ error: "Input text is required" });
    }

    // Kirim permintaan ke Flask API
    const flaskResponse = await axios.post("https://api4.mesinpintar.com/paraphrase", {
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
