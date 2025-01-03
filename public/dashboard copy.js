document.addEventListener('DOMContentLoaded', async () => {
    let expenseChart; // Variabel global untuk instance bar chart
    let radarChart;   // Variabel global untuk instance radar chart
    let lineChart; // Variabel global untuk instance line chart
    
    const updateChart = (chartData) => {
        if (expenseChart) {
            // Update data pada chart yang sudah ada
            expenseChart.data.labels = chartData.labels;
            expenseChart.data.datasets[0].data = chartData.values;
            expenseChart.update();
        } else {
            // Jika chart belum ada, buat chart baru
            const ctx = document.getElementById('expense-chart').getContext('2d');
            expenseChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: chartData.labels,
                    datasets: [{
                        label: 'Expenses',
                        data: chartData.values,
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        title:{
                            display: true,
                            text: 'Bar Chart - Total Expanses by Month'
                        }
                    }
                }
            });
        }
    };

    const updateRadarChart = (radarChartData) => {
        // Ambil label dan data dari radarChartData
        let labels = radarChartData.labels || [];
        let dataValues = radarChartData.datasets?.[0]?.data || []; // Ambil data dari datasets array
    
        // Gabungkan labels dan dataValues menjadi array objek
        let combinedData = labels.map((label, index) => ({
            label: label,
            value: dataValues[index]
        }));
    
        // Urutkan data berdasarkan nilai (value) secara menurun
        combinedData.sort((a, b) => b.value - a.value);
    
        // Ambil hanya 10 item teratas
        combinedData = combinedData.slice(0, 10);
    
        // Pisahkan kembali labels dan dataValues
        labels = combinedData.map(item => item.label);
        dataValues = combinedData.map(item => item.value);
    
        // Hitung nilai maksimum dari dataValues
        const maxDataValue = Math.max(...dataValues) * 1.1;
    
        if (radarChart) {
            // Update data pada radar chart yang sudah ada
            radarChart.data.labels = labels;
            radarChart.data.datasets[0].data = dataValues;
            radarChart.options.scales.r.suggestedMax = maxDataValue; // Update suggestedMax
            radarChart.update();
        } else {
            // Jika radar chart belum ada, buat chart baru
            const ctx = document.getElementById('radarChart').getContext('2d');
            radarChart = new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: radarChartData.datasets?.[0]?.label || 'Category', // Gunakan label dari data atau fallback
                        data: dataValues,
                        borderColor: 'rgba(153, 102, 255, 1)',
                        backgroundColor: 'rgba(153, 102, 255, 0.2)',
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: 'top' },
                        title: {
                            display: true,
                            text: 'Radar Chart - Top 10 Item Prices'
                        },
                    },
                    scales: {
                        r: {
                            angleLines: {
                                display: true
                            },
                            suggestedMin: 0,
                            suggestedMax: maxDataValue, // Maksimum skala dinamis
                        }
                    }
                }
            });
        }
    };
    const updatelineChart = (lineChartData) => {
        if (lineChart) {
            // Update data pada chart yang sudah ada
            lineChart.data.labels = lineChartData.labels;
            lineChart.data.datasets[0].data = lineChartData.values;
            lineChart.update();
        } else {
            // Jika chart belum ada, buat chart baru
            const ctx = document.getElementById('line-chart').getContext('2d');
            lineChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: lineChartData.labels,
                    datasets: [{
                        label: 'Total Expenses per Transaction',
                        data: lineChartData.values,
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        title: {
                            display: true,
                            text: 'Line Chart - Total Expenses per Transaction'
                        }
                    },
                    scales: {
                        x: {
                            type: 'time',
                            time: {
                                unit: 'day'
                            }
                        },
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }
    };       

    try {
        // Fetch all_currencies
        const currenciesResponse = await fetch(`/api/expenses/currencies?userId=${userId}`);
        const currencies = await currenciesResponse.json();
        if (!currenciesResponse.ok) {
            throw new Error(currencies.message || 'Failed to fetch currencies');
        }

        // Isi opsi pada elemen <select>
        const currencyFilter = document.getElementById('currency-filter');
        currencyFilter.innerHTML = ''; // Kosongkan opsi sebelumnya
        currencies.forEach(currency => {
            const option = document.createElement('option');
            option.value = currency;
            option.textContent = currency;
            currencyFilter.appendChild(option);
        });

        // Set default currency
        const defaultCurrency = currencies[0]; // Atau logika lain untuk menentukan default currency
        currencyFilter.value = defaultCurrency;

    } catch (error) {
        console.error(error);
        // Tampilkan pesan kesalahan jika diperlukan
    }

    const filterButton = document.getElementById('filter-button');
    filterButton.addEventListener('click', async () => {
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        const currency = document.getElementById('currency-filter').value; // Ambil nilai currency dari dropdown

        try {
            // Fetch statistics
            const statsResponse = await fetch(`/api/expenses/statistics?userId=${userId}&currency=${currency}&startDate=${startDate}&endDate=${endDate}`);
            const stats = await statsResponse.json();
            // console.log(stats); // Tambahkan logging di sini
            if (!statsResponse.ok) {
                throw new Error(stats.message || 'Failed to fetch statistics');
            }
            const stat = stats[0]; // Akses elemen pertama dari array
            
            // Pastikan nilai total_expenses adalah angka
            const totalExpenses = parseFloat(stat.total_expenses) || 0;
            const totalDiscounts = parseFloat(stat.total_discount) || 0;

            // Peta untuk menentukan locale berdasarkan mata uang
            const currencyLocales = {
                IDR: 'id-ID', // Indonesia
                USD: 'en-US', // Amerika Serikat
                EUR: 'de-DE', // Jerman
                // Tambahkan mata uang lain jika diperlukan
            };

            // Dapatkan locale berdasarkan currency, default ke 'en-US' jika tidak ditemukan
            const locale = currencyLocales[stat.currency] || 'en-US';
            // Format angka sesuai dengan locale
            const formattedExpenses = totalExpenses.toLocaleString(locale);
            const formattedDiscount = totalDiscounts.toLocaleString(locale);

            document.getElementById('total-expenses').textContent = stat.currency + " " + formattedExpenses || '0';
            document.getElementById('transaction-count').textContent = stat.transaction_count || '0';
            document.getElementById('most-expensive').textContent = stat.most_expensive || '-';
            document.getElementById('total-discount').textContent = stat.currency + " " + formattedDiscount || '0';
            document.getElementById('top-category').textContent = stat.top_category || '-';

            // Fetch expense details
            const detailsResponse = await fetch(`/api/expenses/detail?userId=${userId}&currency=${currency}&startDate=${startDate}&endDate=${endDate}`);
            const details = await detailsResponse.json();
            if (!detailsResponse.ok) {
                throw new Error(details.message || 'Failed to fetch expense details');
            }
            const tbody = document.querySelector('#expense-table tbody');
            tbody.innerHTML = ''; // Kosongkan tabel sebelumnya

            details.forEach(detail => {
                const row = document.createElement('tr');
                const date = new Date(detail.transaction_timestamp);
                const formattedDate = date.toLocaleDateString();
                const formattedTime = date.toLocaleTimeString();

                const timestampCell = document.createElement('td');
                timestampCell.textContent = `${formattedDate} ${formattedTime}`;
                row.appendChild(timestampCell);

                const totalCell = document.createElement('td');
                totalCell.textContent = detail.total;
                row.appendChild(totalCell);

                const itemsCell = document.createElement('td');
                const itemsTable = document.createElement('table');
                itemsTable.classList.add('table', 'table-sm', 'items-table');
                const itemsHeader = document.createElement('thead');
                itemsHeader.innerHTML = `
                    <tr>
                        <th>Title</th>
                        <th>Quantity</th>
                        <th>Price</th>
                        <th>Discount</th>
                    </tr>
                `;
                itemsTable.appendChild(itemsHeader);

                const itemsBody = document.createElement('tbody');
                detail.items.forEach(item => {
                    const itemRow = document.createElement('tr');
                    itemRow.innerHTML = `
                        <td>${item.title || 'N/A'}</td>
                        <td>${item.quantity || 'N/A'}</td>
                        <td>${item.price || 'N/A'}</td>
                        <td>${item.discount || 'N/A'}</td>
                    `;
                    itemsBody.appendChild(itemRow);
                });

                itemsTable.appendChild(itemsBody);
                itemsCell.appendChild(itemsTable);
                row.appendChild(itemsCell);
                tbody.appendChild(row);
            });

            // Fetch and render chart data
            const chartResponse = await fetch(`/api/expenses/chart?userId=${userId}&currency=${currency}&startDate=${startDate}&endDate=${endDate}`);
            const chartData = await chartResponse.json();
            console.log(chartData);
            if (!chartResponse.ok) {
                throw new Error(chartData.message || 'Failed to fetch chart data');
            }

            // Fetch and render radar chart data
            const radarChartResponse = await fetch(`/api/expenses/radar-chart?userId=${userId}&currency=${currency}&startDate=${startDate}&endDate=${endDate}`);
            const radarChartData = await radarChartResponse.json();
            if (!radarChartResponse.ok) {
                throw new Error(radarChartData.message || 'Failed to fetch radar chart data');
            }

            // Fetch and update line chart data
            const lineChartresponse = await fetch(`/api/expenses/line-chart?userId=${userId}&currency=${currency}&startDate=${startDate}&endDate=${endDate}`);
            const lineChartData = await lineChartresponse.json();
            console.log(lineChartData);
            if (!lineChartresponse.ok) {
                throw new Error(lineChartData.message || 'Failed to fetch radar chart data');
            }

            updateChart(chartData);
            updateRadarChart(radarChartData);
            updatelineChart(lineChartData);

            // Sembunyikan pesan jika berhasil
            const messageContainer = document.getElementById('message-container');
            messageContainer.style.display = 'none';

        } catch (error) {
            // Tampilkan pesan kesalahan
            const messageContainer = document.getElementById('message-container');
            messageContainer.innerHTML = error.message.replace('/expenses-tracking', '<a href="/expenses-tracking">Expenses Tracking</a>');
            messageContainer.style.display = 'block';
        }        
    });
    filterButton.click();

});

function downloadReport(type) {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const currency = document.getElementById('currency-filter').value; // Ambil nilai currency dari dropdown
    window.location.href = `/api/expenses/export/${type}?userId=${userId}&currency=${currency}&startDate=${startDate}&endDate=${endDate}`;
}

