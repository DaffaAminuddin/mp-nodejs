const express = require('express')
const multer = require('multer')
const axios = require('axios')
const path = require('path')
const fs = require('fs')
const router = express.Router()

// Konfigurasi Multer untuk file upload
const upload = multer() // Tidak menyimpan file sementara di server

// Middleware untuk verifikasi token Cloudflare Turnstile
const verifyTurnstileToken = async (req, res, next) => {
  const turnstileToken = req.body['cf-turnstile-response']
  const secretKey = process.env.TURNSTILE_SECRET_KEY

  if (!turnstileToken) {
    return res.status(400).json({ error: 'Missing CAPTCHA token.' })
  }

  try {
    const response = await axios.post(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      new URLSearchParams({
        secret: secretKey,
        response: turnstileToken
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    )

    if (!response.data.success) {
      console.error(
        'Turnstile verification failed:',
        response.data['error-codes']
      )
      return res.status(400).json({ error: 'CAPTCHA verification failed.' })
    }

    // Token valid, lanjutkan ke middleware berikutnya
    next()
  } catch (error) {
    console.error('Error verifying CAPTCHA:', error.message)
    return res
      .status(500)
      .json({ error: 'Internal server error during CAPTCHA verification.' })
  }
}

// API untuk upload file dan mengonversinya ke JSON atau XML
router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' })
  }

  const { format } = req.body // Format yang dipilih, bisa "json" atau "xml"
  const formData = new (require('form-data'))()
  formData.append('file', req.file.buffer, req.file.originalname)
  formData.append('format', format)

  try {
    // Mengirim file ke API Flask untuk konversi
    const flaskResponse = await axios.post(
      'http://api3.mesinpintar.com/convert',
      formData,
      {
        headers: formData.getHeaders()
      }
    )

    // Mengambil path file yang dihasilkan oleh Flask (misalnya: converted_file.json atau .xml)
    const convertedFilePath = path.join(
      '/home/mesinpin/python-excel-to-json-xml/',
      `converted_file.${format}`
    )

    // Periksa apakah file hasil konversi ada di folder Flask
    if (!fs.existsSync(convertedFilePath)) {
      return res.status(404).json({ error: 'Converted file not found.' })
    }

    // Kirim respons ke frontend dengan informasi file yang dapat diunduh
    res.status(200).render('excel-to-json-xml', {
      message: `File successfully converted to ${format.toUpperCase()}.`,
      format: format,
      convertedFilePath: `/api/excel-to-json-xml/download?format=${format}`
    })
  } catch (error) {
    console.error('Error processing file:', error)
    res.status(500).json({ error: 'Internal server error.' })
  }
})

// API untuk mendownload file hasil konversi
router.get('/download', (req, res) => {
  const { format } = req.query // Format file yang ingin diunduh (json/xml)
  const convertedFilePath = path.join(
    '/home/mesinpin/python-excel-to-json-xml/',
    `converted_file.${format}`
  )

  // Cek jika file ada dan kirimkan untuk diunduh
  if (fs.existsSync(convertedFilePath)) {
    res.download(convertedFilePath, (err) => {
      if (err) {
        console.error('Error downloading the file:', err)
        res.status(500).send('Error downloading the file.')
      }
    })
  } else {
    res.status(404).send('Converted file not found.')
  }
})

module.exports = router
