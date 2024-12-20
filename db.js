const { Sequelize } = require('sequelize')
const dotenv = require('dotenv')

// Konfigurasi koneksi ke database MySQL
const sequelize = new Sequelize(
  process.env.DATABASE,
  process.env.DATABASE_USER,
  process.env.DATABASE_PASSWORD,
  {
    host: 'localhost', // Host database
    dialect: 'mysql', // Gunakan MySQL sebagai database
    logging: false // Nonaktifkan logging query SQL (opsional)
  }
)

module.exports = sequelize
