const nodemailer = require('nodemailer');

// Konfigurasi nodemailer
const transporter = nodemailer.createTransport({
    host: "mail.mesinpintar.com",
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_ACCOUNT, // Email
        pass: process.env.EMAIL_PASSWORD, // Password email 
    },
    tls: {
        // do not fail on invalid certs
        rejectUnauthorized: false,
      },
});

// Mengatur transporter untuk email
// const transporter = nodemailer.createTransport({
//     service: "gmail",
//     auth: {
//         user: process.env.GMAIL_ACCOUNT,
//         pass: process.env.GMAIL_PASSWORD,
//     },
// });

// verify connection configuration
transporter.verify(function (error, success) {
    if (error) {
      console.log(error);
    } else {
      console.log("Server SMTP is ready to take our messages");
    }
});

module.exports = transporter;