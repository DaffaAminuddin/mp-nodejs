const express = require('express');
const authController = require('../controllers/auth');
const router = express.Router();
const { SitemapStream, streamToPromise } = require('sitemap');
const { createWriteStream } = require('fs');


//sitemap
// Daftar URL untuk halaman
const pages = [
  { url: '/', changefreq: 'daily', priority: 1.0 },
  { url: '/about', changefreq: 'monthly', priority: 0.8 },
  { url: '/contact', changefreq: 'monthly', priority: 0.7 },
  { url: '/register', changefreq: 'monthly', priority: 0.8 },
  { url: '/login', changefreq: 'monthly', priority: 0.8 },
  { url: '/all-tools', changefreq: 'daily', priority: 1.0 },
  { url: '/cv-bulk-extractor', changefreq: 'daily', priority: 1.0 },
  { url: '/excel-to-json-xml', changefreq: 'daily', priority: 1.0 },
  { url: '/paraphrase', changefreq: 'daily', priority: 1.0 },
  { url: '/background-remover', changefreq: 'daily', priority: 1.0 },
  { url: '/pricing', changefreq: 'daily', priority: 1.0 },
  { url: '/activation', changefreq: 'monthly', priority: 0.7 },
  { url: '/forgot-password', changefreq: 'monthly', priority: 0.7 },
  { url: '/profile', changefreq: 'monthly', priority: 0.7 },
  { url: '/reset-password', changefreq: 'monthly', priority: 0.7 },
];

// Endpoint untuk sitemap
router.get('/sitemap.xml', async (req, res) => {
  try {
    const sitemap = new SitemapStream({ hostname: 'https://www.mesinpintar.com' });
    pages.forEach((page) => sitemap.write(page));
    sitemap.end();

    const sitemapXML = await streamToPromise(sitemap);
    res.header('Content-Type', 'application/xml');
    res.send(sitemapXML.toString());
  } catch (error) {
    console.error(error);
    res.status(500).send('Unable to generate sitemap');
  }
});

router.get('/', authController.isLoggedIn, (req, res) => {
    res.render('index', {
      user: req.user
    });
  });

router.get('/register', authController.isLoggedIn, (req, res) => {
  res.render('register', {
    user: req.user
  });
});

router.get('/all-tools', authController.isLoggedIn, (req, res) => {
  res.render('all-tools', {
    user: req.user
  });
});

router.get('/login', authController.isLoggedIn, (req, res) => {
  res.render('login', {
    user: req.user
  });
});

router.get('/pricing', authController.isLoggedIn, (req, res) => {
  res.render('pricing', {
    user: req.user
  });
});

router.get('/profile', authController.isLoggedIn, (req, res) => {
    console.log(req.user);
    if( req.user ) {
      res.render('profile', {
        user: req.user
      });
    } else {
      res.redirect('/login');
    }
});


router.get("/forgot-password",(req, res) => {
  res.render("forgot-password");
});

router.get("/not-found",(req, res) => {
  res.render("not-found");
});

router.get("/cv-extractor", authController.isLoggedIn, (req, res) => {
  res.render("cv-bulk-extractor" , {
    user: req.user
  });
});

router.get("/background-remover", authController.isLoggedIn, (req, res) => {
  res.render("background-remover" , {
    user: req.user
  });
});

router.get("/excel-to-json-xml", authController.isLoggedIn, (req, res) => {
  res.render("excel-to-json-xml" , {
    user: req.user
  });
});

router.get("/about", authController.isLoggedIn, (req, res) => {
  res.render("about" , {
    user: req.user
  });
});

router.get("/contact", authController.isLoggedIn, (req, res) => {
  res.render("contact" , {
    user: req.user
  });
});

router.get("/acintya-dalam-hindu", authController.isLoggedIn, (req, res) => {
  res.render("acintya" , {
    user: req.user
  });
});

router.get("/paraphrase", authController.isLoggedIn, (req, res) => {
  res.render("paraphrase" , {
    user: req.user
  });
});

router.get("/robots.txt",  (req, res) => {
  res.render("../robots.txt");
});

module.exports = router;