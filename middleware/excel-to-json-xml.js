const express = require("express");
const multer = require("multer");
const axios = require("axios");
const path = require("path");
const fs = require("fs");
const router = express.Router();

// Konfigurasi Multer untuk file upload
const upload = multer(); // Tidak menyimpan file sementara di server

// API untuk upload file dan mengonversinya ke JSON atau XML
router.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded." });
  }

  const { format } = req.body; // Format yang dipilih, bisa "json" atau "xml"
  const formData = new (require("form-data"))();
  formData.append("file", req.file.buffer, req.file.originalname);
  formData.append("format", format);

  let turnstileToken = req.body["cf-turnstile-response"]; // Token CAPTCHA dari frontend
  console.log("Site Key:", process.env.TURNSTILE_SITE_KEY);
  console.log("Secret Key:", process.env.TURNSTILE_SECRET_KEY);
  console.log("Token Received:", turnstileToken);

  if (!turnstileToken) {
    return res.status(400).render("excel-to-json-xml", {
      message: "CAPTCHA verification failed. Please try again.",
    });
  }
  // Cek apakah token berisi dua nilai, pisahkan dan ambil hanya yang pertama
  if (Array.isArray(turnstileToken)) {
    turnstileToken = turnstileToken[0];
    console.log("Using the first token:", turnstileToken);
  }       

  // Verifikasi CAPTCHA dengan Cloudflare
  try {        
    const captchaResponse = await axios.post(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      new URLSearchParams({
        secret: process.env.TURNSTILE_SECRET_KEY, // Ganti dengan kunci rahasia Turnstile Anda
        response: turnstileToken,
      })
    );
    
    console.log("CAPTCHA verification response:", captchaResponse.data);

    if (!captchaResponse.data.success) {
      return res.status(400).render("excel-to-json-xml", {
        message: "CAPTCHA verification failed. Please try again.",
      });
    }
    } catch (error) {
        console.error("CAPTCHA verification error:", error);
        return res.status(500).render("excel-to-json-xml", {
        message: "An error occurred during CAPTCHA verification.",
        });
        }

  try {
    // Mengirim file ke API Flask untuk konversi
    const flaskResponse = await axios.post("http://api3.mesinpintar.com/convert", formData, {
      headers: formData.getHeaders(),
    });

    // Mengambil path file yang dihasilkan oleh Flask (misalnya: converted_file.json atau .xml)
    const convertedFilePath = path.join(
      "/home/mesinpin/python-excel-to-json-xml/",
      `converted_file.${format}`
    );

    // Periksa apakah file hasil konversi ada di folder Flask
    if (!fs.existsSync(convertedFilePath)) {
      return res.status(404).json({ error: "Converted file not found." });
    }

    // Kirim respons ke frontend dengan informasi file yang dapat diunduh
    res.status(200).render("excel-to-json-xml", {
      message2: `File successfully converted to ${format.toUpperCase()}.`,
      format: format,
      convertedFilePath: `/api/excel-to-json-xml/download?format=${format}`,
    });
  } catch (error) {
    console.error("Error processing file:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// API untuk mendownload file hasil konversi
router.get("/download", (req, res) => {
  const { format } = req.query; // Format file yang ingin diunduh (json/xml)
  const convertedFilePath = path.join(
    "/home/mesinpin/python-excel-to-json-xml/",
    `converted_file.${format}`
  );

  // Cek jika file ada dan kirimkan untuk diunduh
  if (fs.existsSync(convertedFilePath)) {
    res.download(convertedFilePath, (err) => {
      if (err) {
        console.error("Error downloading the file:", err);
        res.status(500).send("Error downloading the file.");
      }
    });
  } else {
    res.status(404).send("Converted file not found.");
  }
});

module.exports = router;
