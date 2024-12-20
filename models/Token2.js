// Token untuk code verification => /auth/code-verification/{token}
const { DataTypes } = require('sequelize')
const sequelize = require('../db') // Import koneksi Sequelize

const Token = sequelize.define(
  'Token',
  {
    activation_token: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false // Sesuaikan jika perlu
    },
    reset_token_expires: {
      type: DataTypes.DATE,
      allowNull: false
    }
  },
  {
    tableName: 'users', // Pastikan nama tabel sesuai
    timestamps: false // Nonaktifkan createdAt dan updatedAt jika tidak diperlukan
  }
)

module.exports = Token
