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

const sendVerificationEmail = (email, token) => {
  const verificationLink = `https://www.mesinpintar.com/auth/activate/${token}`;

  const mailOptions = {
      from: '"MesinPintar" <noreply@mesinpintar.com>',
      to: email,
      subject: 'Email Activation - MesinPintar',
      text: `Please click the link below to activate your account: \n\n ${verificationLink}`,
      html: `            
                <!DOCTYPE html>
                        <html lang="en">
                        <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <title>Verification Code</title>
                            <style>
                                /* Reset CSS */
                                body {
                                    margin: 0;
                                    padding: 0;
                                    font-family: Arial, sans-serif;
                                    background-color: #f4f4f4;
                                }

                                .email-container {
                                    max-width: 600px;
                                    margin: 30px auto;
                                    background-color: #ffffff;
                                    border: 1px solid #e0e0e0;
                                    border-radius: 8px;
                                    padding: 20px;
                                    text-align: center;
                                }

                                .email-header {
                                    font-size: 24px;
                                    font-weight: bold;
                                    color: #333333;
                                    margin-bottom: 10px;
                                }

                                .email-body {
                                    font-size: 16px;
                                    color: #555555;
                                    line-height: 1.5;
                                    margin-bottom: 20px;
                                }

                                .verification-code {
                                    display: inline-block;
                                    margin: 20px 0;
                                    padding: 10px 20px;
                                    font-size: 32px;
                                    font-weight: bold;
                                    color: black;
                                    background-color: white;
                                    border-radius: 5px;
                                    letter-spacing: 5px;
                                }

                                .email-footer {
                                    font-size: 14px;
                                    color: #777777;
                                    margin-top: 20px;
                                }

                                .btn {
                                    display: inline-block;
                                    padding: 10px 20px;
                                    font-size: 16px;
                                    color: #ffffff;
                                    text-decoration: none;
                                    background-color: #ffe600;
                                    border-radius: 5px;
                                    margin-top: 20px;
                                }

                                .btn:hover {
                                    background-color: #dac508;
                                }

                                /* Mobile Responsive */
                                @media (max-width: 600px) {
                                    .email-container {
                                        padding: 15px;
                                    }

                                    .verification-code {
                                        font-size: 28px;
                                        padding: 8px 16px;
                                    }
                                }
                            </style>
                        </head>
                        <body>
                            <div class="email-container">
                                <div class="email-header" style="background-color: white; padding: 5px; text-align: center; border-bottom: 1px solid #ddd;">
                                    <img src="https://img.mesinpintar.com/banner-new-mesinpintar.png" alt="Mesinpintar Logo" style="max-width: 200px; height: auto;">
                                </div>
                                <div class="email-header">Verification Code</div>
                                <div class="email-body">
                                    Hello,<br>
                                    Thank you for waiting, this is resending your activation email. Please activate your account by clicking the link below:                                    
                                </div>                                
                                <a href="${verificationLink}" class="btn">Activate Account</a>
                                <div class="email-footer">
                                    Please use the following link to activate your account. This code is valid for 1 hour.
                                    If you didn't request this code, please ignore this email or contact support if you have concerns.<br>
                                    <strong>Thank you!</strong>
                                </div>
                            </div>
                        </body>
                        </html>`
  };

  transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
          console.log('Error sending email:', error);          
      } else {
          console.log('Verification email sent: ' + info.response);                    
      }
  });
};




module.exports = { sendVerificationEmail };
