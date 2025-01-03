const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const mysql = require('mysql2/promise');

const router = express.Router();

// Konfigurasi Multer untuk upload file tanpa menyimpan ke disk
const upload = multer();

// Konfigurasi database MySQL dengan Promise
const db = mysql.createPool({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE,
});

router.post('/expenses-upload', upload.array('images'), async (req, res) => {
  console.log("API '/api/expenses-upload' was called!");

  try {
    const files = req.files;
    const userId = req.body.userId || null; // Ambil userId dari FormData

    console.log("User ID yang diterima:", userId);

    // Validasi file yang diterima
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files were uploaded.' });
    }

    // Buat form data untuk mengirim file ke Flask API
    const form = new FormData();
    files.forEach((file) => {
      form.append('images', file.buffer, file.originalname);
    });

    // Kirim gambar ke Flask API
    const flaskResponse = await axios.post('http://127.0.0.1:8000/process_receipts', form, {
      headers: {
        ...form.getHeaders(),
      },
    });

    const expensesData = flaskResponse.data;
    console.log('Response from Flask:', expensesData);

    if (!Array.isArray(expensesData) || expensesData.some((exp) => !exp.total || !exp.transaction_timestamp)) {
      return res.status(400).json({ error: 'Invalid response format from Flask API.' });
    }

    // Jika user tidak login, kirimkan JSON langsung ke frontend
    if (!userId) {
      console.log('User not logged in. Returning JSON directly to client.');
      return res.json(expensesData);
    }

    // Validasi apakah user ada di database
    const [existingUser] = await db.query('SELECT id FROM users WHERE id = ?', [userId]);
    if (existingUser.length === 0) {
      return res.status(400).json({ error: 'Invalid user ID.' });
    }

    // Simpan data ke database
    await Promise.all(
      expensesData.map(async (expanse) => {
        let { transaction_timestamp, total, items, category, currency } = expanse;

        // Check if transaction_timestamp is "N/A" and use current time if true
        if (transaction_timestamp === "N/A") {
          transaction_timestamp = new Date().toISOString();
        }

        await db.query(
          'INSERT INTO expenses_tracking (user_id, transaction_timestamp, category, currency, total, items) VALUES (?, ?, ?, ?, ?, ?)',
          [userId, transaction_timestamp, category, currency, total, JSON.stringify(items)]
        );
      })
    );
    
    return res.status(200).json({
        message: "Your receipt was saved. Please check your expenses dashboard page for updates."
    });
    // res.json({ message: 'Your receipt was saved. Please check your expenses dashboard for updates.' });

  } catch (error) {
    console.error('Error processing images:', error.message);
    res.status(500).json({ error: 'Failed to process images.' });
  }
});

module.exports = router;
