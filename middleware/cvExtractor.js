const express = require("express");
const multer = require("multer");
const axios = require("axios");
const mysql = require("mysql2/promise"); // Gunakan mysql2 dengan promise
const router = express.Router();
const path = require("path");


// Konfigurasi Multer untuk file upload
const upload = multer();

// Konfigurasi database MySQL
const db = mysql.createPool({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE,
});


// API untuk upload file dan meneruskan ke Flask
router.post("/upload", upload.array("files"), async (req, res) => {
    console.log("API '/api/upload' was called!");
            
    try {
        const userId = req.body.userId || null; // Nilai default jika userId tidak dikirim
        
                
        console.log("User ID received:", userId);
            if (!userId) {
                console.log("No userId provided. Assuming user not logged in.");
            }
            
        const files = req.files;

        // Cek apakah ada file yang di-upload
        if (!files || files.length === 0) {
            return res.status(400).json({ error: "No files uploaded." });
        }

        console.log("Request body:", req.body);
        console.log("Request headers:", req.headers);        

        
        // Default: Batas file jika tidak login
        let fileLimit = 10;

        // Jika user login, ambil informasi dari database
        if (userId) {
            const [rows] = await db.query(
                "SELECT is_active FROM subscriptions WHERE user_id = ?",
                [userId]
            );

            console.log("Query Result:", rows); // Debug log
            if (rows.length > 0) {
                const isActive = rows[0].is_active;
                console.log("User isActive:", isActive); // Debug log
                if (isActive === 1) {
                    fileLimit = Infinity; // Tanpa batas jika berlangganan aktif
                } else {
                    fileLimit = 20; // Batas 10 untuk pengguna login, tetapi tidak aktif
                }
            }
        }

        // Batasi jumlah file yang diunggah
        if (files.length > fileLimit) {
            let errorMessage;

            if (!userId) {
                // Jika tidak login
                errorMessage = `Max allowed files is ${fileLimit}. Please log in to upload more files.`;
            } else if (fileLimit === 20) {
                // Jika login tapi batasnya masih 5
                errorMessage = `Max allowed files is ${fileLimit}. Upgrade your subscription for unlimited uploads.`;
            } else {
                // Kondisi default
                errorMessage = `File upload limit exceeded. Maximum allowed files: ${fileLimit}.`;
            }

            return res.status(400).json({ error: errorMessage });
        }

        // Batasi hanya menerima file PDF dan DOCX
        const allowedMimeTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"];

        const isAllowedFileType = files.every(file => allowedMimeTypes.includes(file.mimetype));
        if (!isAllowedFileType) {
            return res.status(400).json({ error: "Only PDF, DOCX and DOC files are allowed." });
        }

        // Kirim file ke Flask
        const formData = new (require("form-data"))(); // FormData untuk mengirim file ke Flask
        files.forEach(file => {
            formData.append("files", file.buffer, file.originalname);
        });

        const flaskResponse = await axios.post("http://api5.mesinpintar.com/api/extract-cv", formData, {
            headers: formData.getHeaders(),
        });

        // Respons ke frontend
        res.status(200).json(flaskResponse.data);

    } catch (error) {
        console.error("Error processing upload:", error.message);
        res.status(500).json({ error: "Internal server error." });
    }
});

//api untuk mendapatkan file csv
router.get("/download-csv", (req, res) => {
    const filePath = path.resolve("/home/mesinpin/python-cv-extractor-v2/extracted_cv.csv"); // Path ke file CSV
    res.download(filePath, "extracted_cv.csv", (err) => {
        if (err) {
            console.error("Error during file download:", err);
            res.status(500).send("Error downloading the file.");
        }
    });
});

module.exports = router;