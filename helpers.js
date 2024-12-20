const hbs = require('hbs')
const moment = require('moment') // Gunakan moment.js untuk manipulasi tanggal

// Daftarkan helper custom
hbs.registerHelper('eq', (a, b) => a === b)

// Helper untuk menghitung remaining days
hbs.registerHelper('remainingDays', (startDate, endDate) => {
  if (!startDate || !endDate) {
    return 'No subscription'
  }

  const today = moment()
  const end = moment(endDate)
  const diff = end.diff(today, 'days')

  if (diff <= 0) {
    return 'Expired'
  } else {
    return `${diff} Days Left`
  }
})

// Helper untuk format tanggal
hbs.registerHelper('formatDate', function (date) {
  const formattedDate = moment(date).format('Do MMM YYYY') // Format tanggal yang mudah dibaca
  const relativeTime = moment(date).startOf('day').fromNow() // Relative time dari hari ini

  return `${formattedDate} (${relativeTime})`
})

module.exports = hbs
