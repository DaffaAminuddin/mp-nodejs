const express = require("express");
const authController = require("../controllers/auth");
const validateToken = require('../middleware/validateToken');
const activationToken = require('../middleware/activationToken');
const router = express.Router();


router.post('/register', authController.register);

router.post('/login', authController.login );

router.get('/logout', authController.logout );

// router.get('/activate/:token', authController.activateAccount,);

router.post('/forgot-password', authController.requestPasswordReset);

router.post('/reset-password', authController.resetPassword);

router.get('/resend-verification-email', authController.resendVerificationEmail);  // Route untuk mengirim ulang email verifikasi

router.get('/auth/reset-password/:token', validateToken, (req, res) => {
    res.send('Access granted to code verification page');
    user: req.user
});

router.get('/auth/activate/:token', activationToken, (req, res) => {
    res.send('Access granted to code verification page');
    user: req.user
});
module.exports = router;

