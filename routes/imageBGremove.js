const express = require("express");
const multer = require("multer");
const axios = require("axios");
const path = require("path");
const fs = require("fs");
const router = express.Router();


// Konfigurasi Multer untuk menangani file upload
const upload = multer(); // Tidak menyimpan file sementara di server

// Middleware untuk verifikasi token Cloudflare Turnstile
const verifyTurnstileToken = async (req, res, next) => {
    const turnstileToken = req.body["cf-turnstile-response"];
    const secretKey = process.env.TURNSTILE_SECRET_KEY;

    if (!turnstileToken) {
        return res.status(400).json({ error: "Missing CAPTCHA token." });
    }

    try {
        const response = await axios.post(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            new URLSearchParams({
                secret: secretKey,
                response: turnstileToken,
            }),
            { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        );

        if (!response.data.success) {
            console.error("Turnstile verification failed:", response.data["error-codes"]);
            return res.status(400).json({ error: "CAPTCHA verification failed." });
        }

        // Token valid, lanjutkan ke middleware berikutnya
        next();
    } catch (error) {
        console.error("Error verifying CAPTCHA:", error.message);
        return res.status(500).json({ error: "Internal server error during CAPTCHA verification." });
    }
};

// Endpoint untuk upload gambar dan menghapus background
router.post("/remove-bg", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image file provided." });
  } 

  try {
    // Mengirim file ke API Flask
    const formData = new (require("form-data"))();
    formData.append("image", req.file.buffer, req.file.originalname);

    const response = await axios.post("http://api2.mesinpintar.com/api/remove-background", formData, {
      headers: formData.getHeaders(),
      responseType: "stream", // Menerima hasil gambar sebagai stream
    });

    // Mengembalikan hasil langsung ke frontend
    res.set("Content-Type", "image/png");
    response.data.pipe(res);
  } catch (error) {
    console.error("Error processing image:", error.message);
    res.status(500).json({ error: "Failed to process image." });
  }
});

// Endpoint untuk mendownload hasil gambar dengan nama "output.png"
router.get("/download", (req, res) => {
  const filePath = path.join(
    "/home/mesinpin/python-background-remover/",
    "output.png"
  );

  // Cek jika file ada di path yang ditentukan
  if (fs.existsSync(filePath)) {
    res.download(filePath, "output.png", (err) => {
      if (err) {
        console.error("Error downloading the file:", err);
        res.status(500).send("Error downloading the file.");
      }
    });
  } else {
    res.status(404).json({ error: "File not found." });
  }
});

module.exports = router;
