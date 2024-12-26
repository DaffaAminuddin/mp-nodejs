const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { promisify } = require('util');
const Subscription = require('../models/subscription');
const User = require('../models/user');
const knex = require('../db/knex');
const crypto = require('crypto');
const moment = require('moment');
const { resendVerificationEmail } = require('../middleware/resendEmail');
const axios = require("axios");
const transporter = require('../smtp')
const db = require('../db_connection')
const nodemailer = require('nodemailer');

exports.login = async (req, res) => {
  try {
      const { email, password } = req.body;
      let turnstileToken = req.body["cf-turnstile-response"]; // Token CAPTCHA dari frontend
      console.log("Site Key:", process.env.TURNSTILE_SITE_KEY);
      console.log("Secret Key:", process.env.TURNSTILE_SECRET_KEY);
      console.log("Token Received:", turnstileToken);         

      if (!email || !password) {
          return res.status(400).render('login', {
              message: 'Please fill email and password!'
          });
      }

      if (!turnstileToken) {
        return res.status(400).render("login", {
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
          return res.status(400).render("login", {
            message: "CAPTCHA verification failed. Please try again.",
          });
        }
        } catch (error) {
            console.error("CAPTCHA verification error:", error);
            return res.status(500).render("login", {
            message: "An error occurred during CAPTCHA verification.",
            });
            }

      db.query('SELECT * FROM users WHERE email = ?', [email], async (error, results) => {
          if (error) {
              console.log(error);
              return res.status(500).render('login', {
                  message: 'An error occurred. Please try again later.'
              });
          }

          // memeriksa apakah `results` kosong
          if (!results || results.length === 0) {
              return res.status(401).render('login', {
                  message: 'Email or Password is incorrect'
              });
          }

          // Periksa apakah password sesuai
          const isPasswordMatch = await bcrypt.compare(password, results[0].password);
          if (!isPasswordMatch) {
              return res.status(401).render('login', {
                  message: 'Email or Password is incorrect'
              });
          }
          // Periksa status verifikasi
          if (results[0].is_verified === 0) {
            return res.status(401).render('login', {
                message3: email
            });
        }
          
        // Jika akun sudah terverifikasi, buat token dan login
          const id = results[0].id;

          const token = jwt.sign({ id }, process.env.JWT_SECRET, {
              expiresIn: process.env.JWT_EXPIRES_IN
          });

          console.log("The token is: " + token);

          const cookieOptions = {
              expires: new Date(
                  Date.now() + process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000
              ),
              httpOnly: true
          };

          res.cookie('jwt', token, cookieOptions);
          res.status(200).redirect("/");
      });
  } catch (error) {
      console.log(error);
      res.status(500).render('login', {
          message: 'An error occurred. Please try again later.'
      });
  }
};


exports.register = async (req, res) => {
    console.log(req.body);
      
    const { name, email, password, passwordConfirm } = req.body;
    let turnstileToken = req.body["cf-turnstile-response"]; // Token CAPTCHA dari frontend
    
    if (!name || !email || !password || !passwordConfirm) {
      return res.redirect('/register?message=' + encodeURIComponent('Please fill in all fields!'));
    }

    // Validasi Mengharuskan kombinasi huruf dan angka pada password
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
        if (!passwordRegex.test(password)) {
            return res.render('register', {
                message: 'Password must be at least 6 characters long and contain both letters and numbers.'
            });
        }

    if (!turnstileToken) {
        return res.status(400).render("register", {
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
  
        if (!captchaResponse.data.success) {
          return res.status(400).render("register", {
            message: "CAPTCHA verification failed. Please try again.",
          });
        }
        } catch (error) {
            console.error("CAPTCHA verification error:", error);
            return res.status(500).render("register", {
            message: "An error occurred during CAPTCHA verification.",
            });
            }

    // Periksa apakah email sudah ada di database
   db.query('SELECT email FROM users WHERE email = ?', [email], async (error, results) => {
    if(error){
        console.log(error);
        return res.status(500).render('register', {
          message: 'An error occurred. Please try again later.'
      });
    }

    if(results.length > 0){
        return res.render('register', {
            message: 'The email is already in use'
        })
    } else if (password !== passwordConfirm){
        return res.render('register', {
            message: 'Passwords do not match!'
        })
    }

    // Hash password sebelum disimpan
    let hashedPassword = await bcrypt.hash(password, 8);
    console.log(hashedPassword);

    // Generate token aktivasi
    const activationToken = crypto.randomBytes(20).toString('hex');

    // Masukkan data user baru ke database    
    db.query('INSERT INTO users SET ?', {name: name, email: email, password: hashedPassword, activation_token: activationToken, is_verified: false}, (error, results) =>{
        if(error) {
            console.log(error);
            return res.status(500).render('register', {
              message: 'An error occurred. Please try again later.'
            });
        }      
        
        const verificationLink = `https://www.mesinpintar.com/auth/activate/${activationToken}`;

        const mailOptions = {
            from: '"Mesinpintar" <noreply@mesinpintar.com>',
            to: email,
            subject: 'Activate Your Account - Mesinpintar',
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
                                    background-color: #dac508);
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
                                    Hello ${name},<br>
                                    Thank you for registering. Please activate your account by clicking the link below:                                    
                                </div>                                
                                <a href="${verificationLink}" class="btn">Activate Account</a>
                                <div class="email-footer">
                                    Please use the following link to activate your account. This code is valid for 1 hour.
                                    If you didn't request this code, please ignore this email or contact support if you have concerns.<br>
                                    <strong>Thank you!</strong>
                                </div>
                            </div>
                        </body>
                        </html>
            `
        };
        // Kirim email verifikasi        
        transporter.sendMail(mailOptions, (err, info) => {
                    if (err) {
                        console.error(err);
                        return res.status(500).render('register', {
                            message: 'Could not send verification email. Please try again later.'
                        });
                    }

                    console.log('Verification email sent:', info.response);
                    return res.render('register', {
                        message2: 'Successfully Registered! Please check your email to activate your account.'
                    });
                });

        const userId = results.insertId;

        // Masukan data ke tabel sub => default is_active: false
        db.query('INSERT INTO subscriptions SET ?', {
            user_id: userId,
            is_active: false, // Free plan (tidak aktif)
            start_date: null, // Belum dimulai
            end_date: null,   // Tidak memiliki tanggal akhir
        } , (subError, subResults) => {
            if(subError) {
                console.log(subError);
                return res.status(500).render('register', {
                message: 'An error occurred. Please try again later.'
                });
            }
            console.log('Subscription created:', subResults);
            
    })

   }); 
})
};

// Route untuk mengirim ulang email verifikasi
exports.resendVerificationEmail = async (req, res) => {
    const { email } = req.query; // Ambil email dari query string

    if (!email) {
        return res.status(400).send('Email is required');
    }

    // Cari pengguna berdasarkan email
    db.query('SELECT * FROM users WHERE email = ?', [email], (error, results) => {
        if (error) {
            console.log(error);
            return res.status(500).send('An error occurred. Please try again later.');
        }

        if (results.length === 0) {            
            return res.status(404).render('login', {message: 'User not found'});
        }

        if (results[0].is_verified === 1) {
            return res.status(400).send('Account already verified');
        }

        const activationToken = crypto.randomBytes(20).toString('hex');
        const expiresAt = moment().add(60, 'minutes').format('YYYY-MM-DD HH:mm:ss'); // Set 30 menit dari sekarang

        // Update token verifikasi
        db.query('UPDATE users SET activation_token = ?, reset_token_expires = ? WHERE email = ?', [activationToken, expiresAt, email], (err, updateResult) => {
            if (err) {
                console.log(err);
                return res.status(500).render('login', {message: 'Failed to send verification email'});
            }

            // Kirim email verifikasi
            resendVerificationEmail(email, activationToken);

            // res.status(200).send('Verification email sent. Please check your inbox.');
            res.status(200).render('login', {
                message2: 'Verification email sent. Please check your inbox.'
            });
            
        });
    });
};

exports.isLoggedIn = async (req, res, next) => {
    if (req.cookies.jwt) {
        try {
            // 1) Verifikasi token JWT
            const decoded = await promisify(jwt.verify)(
                req.cookies.jwt,
                process.env.JWT_SECRET
            );

            console.log(decoded);

            // 2) Ambil data user dan subscription
            const query = `
                SELECT users.*, subscriptions.is_active, subscriptions.start_date, subscriptions.end_date
                FROM users 
                LEFT JOIN subscriptions 
                ON users.id = subscriptions.user_id 
                WHERE users.id = ?
            `;
            db.query(query, [decoded.id], (error, result) => {
                if (error) {
                    console.error(error);
                    return next();
                }

                if (!result || result.length === 0) {
                    return next();
                }

                // Simpan data user dan status subscription di `req.user`
                req.user = result[0]; // Data user beserta is_active
                console.log("User with subscription info:");
                console.log(req.user);

                return next();
            });
        } catch (error) {
            console.error(error);
            return next();
        }
    } else {
        next();
    }
};
  
exports.logout = async (req, res) => {
    res.cookie('jwt', 'logout', {
        expires: new Date(Date.now() + 2*1000),
        httpOnly: true
    });

    res.status(200).redirect('/');
}

// Permintaan reset password
exports.requestPasswordReset = async (req, res) => {
    const { email } = req.body;
    let turnstileToken = req.body["cf-turnstile-response"]; // Token CAPTCHA dari frontend

    if (!email) {
        return res.render('forgot-password', {
            message: 'Please provide a valid email address.',
        });
    }
    if (!turnstileToken) {
        return res.status(400).render("forgot-password", {
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
  
        if (!captchaResponse.data.success) {
          return res.status(400).render("forgot-password", {
            message: "CAPTCHA verification failed. Please try again.",
          });
        }
        } catch (error) {
            console.error("CAPTCHA verification error:", error);
            return res.status(500).render("forgot-password", {
            message: "An error occurred during CAPTCHA verification.",
            });
            }

    db.query('SELECT * FROM users WHERE email = ?', [email], async (error, results) => {
        if (error) {
            console.error('Database error:', error);
            return res.status(500).render('forgot-password', {
                message: 'An error occurred. Please try again later.',
            });
        }

        if (results.length === 0) {
            return res.render('forgot-password', {
                message: 'Email not found, please register your account.',
            });
        }
        // Periksa status verifikasi
        if (results[0].is_verified === 0) {
            return res.status(401).render('login', {
                message: 'Your account is not activated yet'
            });
        }

        // Generate 5-digit reset token
        const resetToken = Math.floor(10000 + Math.random() * 90000); // Generate angka 5 digit
        const expiresAt = moment().add(60, 'minutes').format('YYYY-MM-DD HH:mm:ss'); // Set 30 menit dari sekarang

        //buat token proteksi
        const tokenProtect = crypto.randomBytes(20).toString('hex');
              

        console.log('Generated Reset Token:', resetToken); // Debug token
        console.log('Expires At:', expiresAt); // Debug waktu kadaluarsa
        console.log('Generated Token Protect:', tokenProtect);

        // Update database with the reset token and expiry
        db.query(
            'UPDATE users SET reset_token = ?, reset_token_expires = ?, activation_token = ? WHERE email = ?',
            [resetToken, expiresAt, tokenProtect, email],
            (err) => {
                if (err) {
                    console.error('Database update error:', err);
                    return res.status(500).render('forgot-password', {
                        message: 'An error occurred. Please try again later.',
                    });
                }

                // Send the reset token via email
                const mailOptions = {
                    from: '"Mesinpintar" <noreply@mesinpintar.com>',
                    to: email,
                    subject: 'Password Reset Request - Mesinpintar',
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
                                    Please use the following code to reset your password. This code is valid for 30 minutes.
                                </div>
                                <div class="verification-code">${resetToken}</div>                                
                                <a href="https://www.mesinpintar.com/auth/reset-password/${tokenProtect}" class="btn">Verify Your Code Here</a>
                                <div class="email-footer">
                                    If you didn't request this code, please ignore this email or contact support if you have concerns.<br>
                                    <strong>Thank you!</strong>
                                </div>
                            </div>
                        </body>
                        </html>
                    `,
                };

                transporter.sendMail(mailOptions, (mailErr, info) => {
                    if (mailErr) {
                        console.error('Email send error:', mailErr);
                        return res.status(500).render('forgot-password', {
                            message: 'Failed to send reset email. Please try again later.',
                        });
                    }

                    console.log('Reset email sent:', info.response);
                    res.render('forgot-password', {
                        message2: 'Verification link sent successfully, Please check your inbox and enter new password',
                    });
                });
            }
        );
    });
};

exports.resetPassword = async (req, res) => {
    // const { token } = req.query; // Ambil token dari URL
    const { code, password, passwordConfirm } = req.body;  
    
    // Validasi input
    if (!code || code.length !== 5) {
        return res.render('reset-password', {
            message: 'Invalid or incomplete verification code. Try to fill in the code without using copy-paste.',
        });
    }
    
    if (password !== passwordConfirm) {
        return res.render('reset-password', {
            message: 'Passwords do not match.',
        });
    }
    
    if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/.test(password)) {
        return res.render('reset-password', {
            message: 'Password must be at least 6 characters long and include letters and numbers.',
        });
    }

    console.log(code);

    // Cari user berdasarkan kode verifikasi
    db.query('SELECT * FROM users WHERE reset_token = ?', [code], async (error, results) => {
        if (error) {
            console.error('Database error:', error);
            return res.status(500).render('reset-password', {
                message: 'An error occurred. Please try again later.',
            });
        }

        if (results.length === 0) {
            return res.render('reset-password', {
                message: 'Invalid verification code.',
            });
        }

        const user = results[0];

        // Verifikasi apakah token masih berlaku
        const tokenExpires = moment(user.reset_token_expires);
        if (moment().isAfter(tokenExpires)) {
            return res.render('reset-password', {
                message: 'The verification code has expired. Please request a new one.',
            });
        }

        // Hash password baru
        const hashedPassword = await bcrypt.hash(password, 8);

        db.query(
            'UPDATE users SET password = ?, activation_token = NULL, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
            [hashedPassword, user.id],
            (updateError) => {
                if (updateError) {
                    console.error('Database update error:', updateError);
                    return res.status(500).render('reset-password', {
                        message: 'An error occurred while updating your password. Please try again.',
                    });
                }

                // Password berhasil diubah
                res.render('login', {
                    message2: 'Your password has been successfully updated. Please log in with your new password.',
                });
            }
        );

    });    
    
};




