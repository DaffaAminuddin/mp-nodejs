const moment = require('moment')
const Token = require('../models/Token')
const mysql = require('mysql')

// konfigurasi connection database
const db = mysql.createConnection({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE
})

const validateToken = async (req, res, next) => {
  const { token } = req.params

  try {
    console.log('Token from URL:', token)

    // Query ke database berdasarkan activation_token
    const foundToken = await Token.findOne({
      where: { activation_token: token }
    })

    if (!foundToken) {
      console.log('Token not found in database')
      return res.status(404).render('not-found') // Render halaman 404
    }

    // Periksa apakah token sudah kedaluwarsa
    const expirationTime = moment(foundToken.reset_token_expires) // Ambil waktu kedaluwarsa dari database
    const currentTime = moment() // Waktu saat ini

    // Bandingkan waktu kedaluwarsa dengan waktu saat ini
    if (currentTime.isAfter(expirationTime)) {
      console.log('Token expired')
      return res
        .status(403)
        .render('login', { message: 'Code expired. Please request a new one.' }) // Render halaman login dengan pesan token expired
    }

    console.log('Token is valid')
    // res.render('code-verification', { token: token }); // Render halaman code-verification jika token valid
    db.query(
      'SELECT * FROM users WHERE activation_token = ?',
      [token],
      (err, results) => {
        if (err) {
          console.error(err)
          return res.status(500).render('login', {
            message: 'An error occurred. Please try again later.',
            success: false
          })
        }
        const user = results[0]
        // console.log(user);
        return res.render('reset-password', { token: token })
      }
    )
  } catch (error) {
    console.error('Error validating token:', error)
    return res
      .status(500)
      .render('login', { message: 'Server error, please try again later.' }) // Handle error dan render halaman code-verification dengan pesan error
  }
}

module.exports = validateToken
