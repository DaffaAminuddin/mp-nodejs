const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

const db = mysql.createPool({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE,
});

// API untuk mendapatkan daftar all_currencies
router.get('/api/expenses/currencies', async (req, res) => {
    const { userId } = req.query;

    try {
        const [currencyResult] = await db.execute(`
            SELECT 
                GROUP_CONCAT(DISTINCT currency) AS all_currencies
            FROM expenses_tracking
            WHERE user_id = ?
        `, [userId]);

        const allCurrencies = currencyResult[0].all_currencies.split(',');
        res.json(allCurrencies);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch currencies' });
    }
});


// API untuk Statistik
router.get('/api/expenses/statistics', async (req, res) => {
    const { userId, currency, startDate, endDate } = req.query;

    // Cek apakah userId ada
    if (!userId) {
        return res.status(400).json({ 
            message: "User ID is missing. Please start tracking your expenses at /expenses-tracking" 
        });
    }

    try {
        // Validasi keberadaan userId di database tabel expenses_tracking untuk user login namun belum upload expenses
        const [userCheck] = await db.execute(`SELECT COUNT(*) AS count FROM expenses_tracking WHERE user_id = ?`, [userId]);
        if (userCheck[0].count === 0) {
            return res.status(404).json({ 
                message: "No expenses found for this user. Please start tracking your expenses at /expenses-tracking" 
            });
        }

        // Default tanggal jika tidak diberikan
        const start = startDate || new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0];
        const end = endDate || new Date().toISOString().split('T')[0];

        // Mendapatkan most_used_currency jika currency tidak diberikan
        const [currencyResult] = await db.execute(`
            SELECT 
                GROUP_CONCAT(DISTINCT currency) AS all_currencies,
                (SELECT currency 
                FROM expenses_tracking 
                WHERE user_id = ? 
                GROUP BY currency 
                ORDER BY COUNT(*) DESC 
                LIMIT 1) AS most_used_currency
            FROM expenses_tracking
            WHERE user_id = ?
        `, [userId, userId]);
        const mostUsedCurrency = currencyResult[0].most_used_currency;
        const selectedCurrency = currency || mostUsedCurrency;

        // Query statistik
        const [stats] = await db.execute(`
            SELECT
                currency,                
                COUNT(*) AS transaction_count,
                COALESCE(SUM(total), 0) AS total_expenses,
                (
                    SELECT category
                    FROM expenses_tracking
                    WHERE user_id = ? AND currency = ?
                    AND transaction_timestamp BETWEEN ? AND ?
                    GROUP BY category
                    ORDER BY SUM(total) DESC
                    LIMIT 1
                ) AS top_category,
                (
                    SELECT JSON_UNQUOTE(JSON_EXTRACT(items, '$[0].title')) 
                    FROM expenses_tracking 
                    WHERE user_id = ? AND currency = ?
                    AND transaction_timestamp BETWEEN ? AND ?
                    ORDER BY total DESC 
                    LIMIT 1
                ) AS most_expensive,
                COALESCE((
                    SELECT SUM(CAST(JSON_UNQUOTE(JSON_EXTRACT(items, CONCAT('$[', numbers.n, '].discount'))) AS UNSIGNED))
                    FROM expenses_tracking
                    JOIN (
                        SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL 
                        SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9
                    ) numbers
                    ON JSON_EXTRACT(items, CONCAT('$[', numbers.n, '].discount')) IS NOT NULL
                    WHERE user_id = ? AND currency = ?
                    AND transaction_timestamp BETWEEN ? AND ?
                ), 0) AS total_discount
            FROM expenses_tracking
            WHERE user_id = ? AND currency = ?
            AND transaction_timestamp BETWEEN ? AND ?
            GROUP BY currency;
        `, [userId, selectedCurrency, start, end, userId, selectedCurrency, start, end, userId, selectedCurrency, start, end, userId, selectedCurrency, start, end]);

        // console.log(stats); // Tambahkan logging di sini
        if (stats.length === 0) {
            // Jika stats array kosong
            console.error("No record found"); // Logging tambahan
            return res.status(400).json({
                message: "No data available for the given criteria."
            });
        }

        res.json(stats);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }  
});


  

// API untuk Data Detail
router.get('/api/expenses/detail', async (req, res) => {
    const { userId, currency, startDate, endDate } = req.query;
    // Default time
    const start = startDate || new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];
    
    // Mendapatkan most_used_currency jika currency tidak diberikan
    const [currencyResult] = await db.execute(`
        SELECT 
            GROUP_CONCAT(DISTINCT currency) AS all_currencies,
            (SELECT currency 
            FROM expenses_tracking 
            WHERE user_id = ? 
            GROUP BY currency 
            ORDER BY COUNT(*) DESC 
            LIMIT 1) AS most_used_currency
        FROM expenses_tracking
        WHERE user_id = ?
    `, [userId, userId]);
    const mostUsedCurrency = currencyResult[0].most_used_currency;
    const selectedCurrency = currency || mostUsedCurrency;

    try {
        const [details] = await db.execute(
            'SELECT transaction_timestamp, total, items FROM expenses_tracking WHERE user_id = ? AND currency = ? AND transaction_timestamp BETWEEN ? AND ?',
            [userId, selectedCurrency, start, end]
        );
        const parsedDetails = details.map((detail) => {
            const items = JSON.parse(detail.items);
            return {
                transaction_timestamp: detail.transaction_timestamp,
                total: detail.total,
                items: items.map(i => ({
                    title: i.title,
                    quantity: i.quantity,
                    price: i.price,
                    discount: i.discount
                }))
            };
        });
        res.json(parsedDetails);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch expense details' });
    }
});

// API untuk Ekspor Data
router.get('/api/expenses/export/:type', async (req, res) => {
    const { userId, currency, startDate, endDate } = req.query;
    const { type } = req.params;

    // Default time
    const start = startDate || new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    // Mendapatkan most_used_currency jika currency tidak diberikan
    const [currencyResult] = await db.execute(`
        SELECT 
            GROUP_CONCAT(DISTINCT currency) AS all_currencies,
            (SELECT currency 
            FROM expenses_tracking 
            WHERE user_id = ? 
            GROUP BY currency 
            ORDER BY COUNT(*) DESC 
            LIMIT 1) AS most_used_currency
        FROM expenses_tracking
        WHERE user_id = ?
    `, [userId, userId]);
    const mostUsedCurrency = currencyResult[0].most_used_currency;
    const selectedCurrency = currency || mostUsedCurrency;

    try {
        const [data] = await db.execute(
            'SELECT transaction_timestamp, total, items FROM expenses_tracking WHERE user_id = ? AND currency = ? AND transaction_timestamp BETWEEN ? AND ?',
            [userId, selectedCurrency, start, end]
        );

        // Fungsi untuk mengonversi items dari JSON ke format yang lebih mudah dibaca
        const formatItems = (items) => {
            const parsedItems = JSON.parse(items);
            return parsedItems.map(item => `Title: ${item.title}, Quantity: ${item.quantity}, Price: ${item.price}, Discount: ${item.discount}`).join(', ');
        };

        if (type === 'csv') {
            const flatData = data.map(item => ({
                transaction_timestamp: item.transaction_timestamp,
                total: item.total,
                items: formatItems(item.items),
            }));
            const parser = new Parser();
            const csv = parser.parse(flatData);
            res.header('Content-Type', 'text/csv');
            res.attachment('expenses.csv');
            res.send(csv);
        } else if (type === 'excel') {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Expenses');
            worksheet.columns = [
                { header: 'Timestamp', key: 'transaction_timestamp' },
                { header: 'Total', key: 'total' },
                { header: 'Items', key: 'items' },
            ];
            worksheet.addRows(data.map(item => ({
                ...item,
                items: formatItems(item.items)
            })));
            res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.attachment('expenses.xlsx');
            await workbook.xlsx.write(res);
            res.end();
        } else if (type === 'pdf') {
            const doc = new PDFDocument();
            res.header('Content-Type', 'application/pdf');
            res.attachment('expenses.pdf');
            doc.pipe(res);

            // Membuat tabel dalam PDF
            data.forEach(item => {
                doc.text(`Timestamp: ${item.transaction_timestamp}`);
                doc.text(`Total: ${item.total}`);
                doc.text('Items:');
                const parsedItems = JSON.parse(item.items);
                parsedItems.forEach(i => {
                    doc.text(`  - Title: ${i.title}, Quantity: ${i.quantity}, Price: ${i.price}, Discount: ${i.discount}`);
                });
                doc.text('---------------------------');
            });

            doc.end();
        } else {
            res.status(400).json({ error: 'Invalid export type' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to export data' });
    }
});

// API untuk Data Grafik
router.get('/api/expenses/chart', async (req, res) => {
    const { userId, currency, startDate, endDate } = req.query;
    //default time
    const start = startDate || new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    // Mendapatkan most_used_currency jika currency tidak diberikan
    const [currencyResult] = await db.execute(`
        SELECT 
            GROUP_CONCAT(DISTINCT currency) AS all_currencies,
            (SELECT currency 
            FROM expenses_tracking 
            WHERE user_id = ? 
            GROUP BY currency 
            ORDER BY COUNT(*) DESC 
            LIMIT 1) AS most_used_currency
        FROM expenses_tracking
        WHERE user_id = ?
    `, [userId, userId]);
    const mostUsedCurrency = currencyResult[0].most_used_currency;
    const selectedCurrency = currency || mostUsedCurrency;

    try {
        const [data] = await db.execute(`
            SELECT 
                DATE_FORMAT(transaction_timestamp, '%Y-%m') AS month, 
                SUM(total) AS total 
            FROM expenses_tracking 
            WHERE user_id = ? AND currency = ?
            AND transaction_timestamp BETWEEN ? AND ?
            GROUP BY month
        `, [userId, selectedCurrency, start, end]);
        const labels = data.map(d => d.month);
        const values = data.map(d => d.total);
        res.json({ labels, values });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch chart data' });
    }
});

// API untuk Data Radar Chart Stacked
router.get('/api/expenses/radar-chart', async (req, res) => {
    const { userId, currency, startDate, endDate } = req.query;
    // Default time
    const start = startDate || new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    // Mendapatkan most_used_currency jika currency tidak diberikan
    const [currencyResult] = await db.execute(`
        SELECT 
            GROUP_CONCAT(DISTINCT currency) AS all_currencies,
            (SELECT currency 
            FROM expenses_tracking 
            WHERE user_id = ? 
            GROUP BY currency 
            ORDER BY COUNT(*) DESC 
            LIMIT 1) AS most_used_currency
        FROM expenses_tracking
        WHERE user_id = ?
    `, [userId, userId]);
    const mostUsedCurrency = currencyResult[0].most_used_currency;
    const selectedCurrency = currency || mostUsedCurrency;

    try {
        const [data] = await db.execute(`
            SELECT 
                category,
                SUM(price) AS total_price
            FROM (
                SELECT 
                    JSON_UNQUOTE(JSON_EXTRACT(items, CONCAT('$[', seq.num, '].title'))) AS category,
                    CAST(JSON_UNQUOTE(JSON_EXTRACT(items, CONCAT('$[', seq.num, '].price'))) AS DECIMAL(10, 2)) AS price
                FROM expenses_tracking
                CROSS JOIN (
                    SELECT 0 AS num UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
                    UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7
                    UNION ALL SELECT 8 UNION ALL SELECT 9
                ) seq
                WHERE user_id = ? AND currency = ?
                AND transaction_timestamp BETWEEN ? AND ?
            ) subquery
            WHERE category IS NOT NULL
            GROUP BY category
            ORDER BY total_price DESC
        `, [userId, selectedCurrency, start, end]);

        // Format data untuk radar chart
        const labels = data.map(row => row.category);
        const totalPrices = data.map(row => parseFloat(row.total_price) || 0);

        res.json({
            labels,
            datasets: [
                {
                    label: 'Total Price',
                    data: totalPrices,
                }
            ],
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch radar chart data' });
    }
});

router.get('/api/expenses/line-chart', async (req, res) => {
    const { userId, currency, startDate, endDate } = req.query;
    // Default time
    const start = startDate || new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    // Mendapatkan most_used_currency jika currency tidak diberikan
    const [currencyResult] = await db.execute(`
        SELECT 
            GROUP_CONCAT(DISTINCT currency) AS all_currencies,
            (SELECT currency 
            FROM expenses_tracking 
            WHERE user_id = ? 
            GROUP BY currency 
            ORDER BY COUNT(*) DESC 
            LIMIT 1) AS most_used_currency
        FROM expenses_tracking
        WHERE user_id = ?
    `, [userId, userId]);
    const mostUsedCurrency = currencyResult[0].most_used_currency;
    const selectedCurrency = currency || mostUsedCurrency;

    try {
        const [data] = await db.execute(`
            SELECT 
                DATE_FORMAT(transaction_timestamp, '%Y-%m-%d') AS date, 
                SUM(total) AS total 
            FROM expenses_tracking 
            WHERE user_id = ? AND currency = ?
            AND transaction_timestamp BETWEEN ? AND ?
            GROUP BY date
        `, [userId, selectedCurrency, start, end]);
        const labels = data.map(d => d.date);
        const values = data.map(d => d.total);
        res.json({ labels, values });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch chart data' });
    }
});


module.exports = router;
