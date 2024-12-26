const express = require("express");
const bodyParser = require("body-parser");
const db = require('../db_connection');
const transporter = require('../smtp')
const router = express.Router();
const nodemailer = require('nodemailer');
const axios = require("axios");

// Middleware untuk parsing body dari form
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());

// Endpoint untuk menangani form kontak
router.post("/send-email", async (req, res) => {
    const { name, email, message } = req.body;
    let turnstileToken = req.body["cf-turnstile-response"]; // Token CAPTCHA dari frontend
    console.log("Site Key:", process.env.TURNSTILE_SITE_KEY);
    console.log("Secret Key:", process.env.TURNSTILE_SECRET_KEY);
    console.log("Token Received:", turnstileToken); 
  
    if (!name || !email || !message) {      
      return res.status(400).render("contact", {
        message: "All fields are required!"
      });
    }

    if (!turnstileToken) {
    return res.status(400).render("contact", {
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
        return res.status(400).render("contact", {
        message: "CAPTCHA verification failed2. Please try again.",
        });
    }
    } catch (error) {
        console.error("CAPTCHA verification error:", error);
        return res.status(500).render("contact", {
        message: "An error occurred during CAPTCHA verification.",
        });
        }
  
    try {
      // Konfigurasi email yang akan dikirim
      const mailOptions = {
        from: email,
        to: "contact@mesinpintar.com", // Email tujuan
        subject: `New Message from ${name}`,
        text: `You have received a new message:\n\nName: ${name}\nEmail: ${email}\nMessage: ${message}`,
      };
  
      // Kirim email
      transporter.sendMail(mailOptions);
  
      // Kirim respons sukses ke frontend
      return res.status(200).render("contact", {
            message2: "Your message has been sent successfully!"
      });
    } catch (error) {
      console.error("Error sending email:", error);
      return res.status(500).render("contact", {
            message: "Failed to send the message. Please try again later."
      });  
    }
  });

  module.exports = router;
