const hbs = require('hbs');
const moment = require('moment'); // Gunakan moment.js untuk manipulasi tanggal


// Daftarkan helper custom
hbs.registerHelper('eq', (a, b) => a === b);


// Helper untuk menghitung remaining days
hbs.registerHelper('remainingDays', (startDate, endDate) => {
    if (!startDate || !endDate) {
        return 'No subscription';
    }

    const today = moment();
    const end = moment(endDate);
    const diff = end.diff(today, 'days');

    if (diff <= 0) {
        return 'Expired';
    } else {
        return `${diff} Days Left`;
    }
});

// Helper untuk format tanggal
hbs.registerHelper('formatDate', function(date) {
    const formattedDate = moment(date).format('Do MMM YYYY'); // Format tanggal yang mudah dibaca
    const relativeTime = moment(date).startOf('day').fromNow(); // Relative time dari hari ini
  
  return `${formattedDate} (${relativeTime})`;
});


// Daftarkan helper `ifEquals` di Handlebars
hbs.registerHelper('ifEquals', function(arg1, arg2, options) {
    if (arg1 === arg2) {
      return options.fn(this); // Jika nilai arg1 dan arg2 sama, jalankan blok kode di dalam {{#ifEquals}}...{{/ifEquals}}
    } else {
      return options.inverse(this); // Jika nilai arg1 dan arg2 berbeda, jalankan blok kode di dalam {{else}} (opsional)
    }
  });

hbs.registerHelper('json', function (context) {
    return JSON.stringify(context);  
});


module.exports = hbs;
