const express = require("express");
const multer = require("multer");
const axios = require("axios");
const router = express.Router();
const path = require("path");


//api untuk mendapatkan file csv
router.get("/download-csv", (req, res) => {
    const filePath = path.resolve("/home/mesinpin/python-cv-extractor/resumes_data.csv"); // Path ke file CSV
    res.download(filePath, "resumes_data.csv", (err) => {
        if (err) {
            console.error("Error during file download:", err);
            res.status(500).send("Error downloading the file.");
        }
    });
});

module.exports = router;

