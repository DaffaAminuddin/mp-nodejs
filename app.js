const express = require("express");
const path = require("path");
const mysql = require("mysql");
const dotenv = require("dotenv");
const cookieParser = require('cookie-parser');
const pagesRoutes = require('./routes/pages');  // Impor rute dari pages.js
require('./helpers'); // Import file helper
const sequelize = require('./db'); // Import koneksi Sequelize
const Token = require('./models/Token'); // Import model Token
const authRoutes = require('./routes/auth');
const validateToken = require('./middleware/validateToken');
const uploadRoutes = require("./routes/upload"); // Import file upload.js
const downloadRoutes = require("./routes/download");
const excelToJsonXmlRoutes = require("./routes/excel-to-json-xml");
const imageBGremoveRoutes = require("./routes/imageBGremove");
const multer = require("multer");
const hbs = require("hbs");
const favicon = require('serve-favicon');



dotenv.config({ path: './.env'});

const app = express();

const db = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE,
});

const publicDirectory = path.join(__dirname, './public')

// Path ke file favicon
app.use(favicon(path.join(__dirname, './public', 'favicon.ico')));

// Konfigurasi Multer untuk menyimpan file di memori (buffer)
const upload = multer(); // Jika Anda ingin menyimpan file di memori

app.use(express.static(publicDirectory));

// parsing URl encoded body (sent by HTML forms)
app.use(express.urlencoded({ extended: false}));
// parsing JSON bodie (sent by API clients)
app.use(express.json());
app.use(cookieParser());
app.use(authRoutes);


// API TOOLS DISINI!!!!
app.use('/api', pagesRoutes);  // Gunakan rute dengan prefix '/api'
app.use('/api', uploadRoutes); // Semua rute di upload.js akan diakses melalui "/api"
app.use("/api", downloadRoutes); //path api download file

// Gunakan rute excel-to-json-xml
app.use("/api/excel-to-json-xml", excelToJsonXmlRoutes); // API path diubah menjadi /api/excel-to-json-xml
// Gunakan rute excel-to-json-xml
app.use("/api", imageBGremoveRoutes); // API path diubah menjadi /api/excel-to-json-xml


// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Koneksi ke database
sequelize.authenticate()
.then(() => console.log('Connected to MySQL database'))
.catch(err => console.error('Database connection error:', err));


app.set('view engine', 'hbs');

// Daftarkan helper `ifEquals` di Handlebars
hbs.registerHelper('ifEquals', function(arg1, arg2, options) {
    if (arg1 === arg2) {
      return options.fn(this); // Jika nilai arg1 dan arg2 sama, jalankan blok kode di dalam {{#ifEquals}}...{{/ifEquals}}
    } else {
      return options.inverse(this); // Jika nilai arg1 dan arg2 berbeda, jalankan blok kode di dalam {{else}} (opsional)
    }
  });


db.connect((error) => {
    if(error){
        console.log(error)
    } else {
        console.log("MySQL Connected")
    }
})
//define routes
app.use('/',require('./routes/pages'))
app.use('/auth', require('./routes/auth'))
app.use('/images', express.static(path.join(__dirname, './images')));

// Middleware untuk menangani 404
app.use((req, res, next) => {
    res.redirect('/not-found'); // Redirect ke rute /not-found
});


//upload api
app.post("/api/upload", upload.array("files"), async (req, res) => {
    console.log("API '/api/upload' was called!"); // Debug log
});

app.listen(5000, () => {
    console.log("Node.js server running on http://localhost:5000");
})