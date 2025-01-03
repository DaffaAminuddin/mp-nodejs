document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);

    // const userId = "{{user.id}}"; // Ambil userId dari template jika login
    formData.append("userId", userId);

    try {
        const response = await fetch('/api/expenses-upload', {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();

        if (data.message) {
            // Jika user login, tampilkan pesan sukses            
            const messageContainer = document.getElementById('message-container');
            messageContainer.style.display = 'block';
            messageContainer.innerHTML = data.message; // Set the message content
            messageContainer.innerHTML = data.message.replace('expenses dashboard page', '<a href="/expenses-dashboard">Expenses Dashboard</a>');
        } else {
            // Jika user tidak login, konversi JSON ke tabel
            document.getElementById('responseContainer').style.display = 'block';
            const tableBody = document.querySelector('#responseTable tbody');
            tableBody.innerHTML = ''; // Kosongkan tabel sebelumnya

            data.forEach((entry) => {
                const row = document.createElement('tr');
                
                // Tambahkan kolom transaction_timestamp
                const timestampCell = document.createElement('td');
                timestampCell.textContent = entry.transaction_timestamp;
                row.appendChild(timestampCell);

                // Tambahkan kolom total
                const totalCell = document.createElement('td');
                totalCell.textContent = entry.total;
                row.appendChild(totalCell);

                // Tambahkan kolom items (dikonversi ke tabel kecil)
                const itemsCell = document.createElement('td');
                const itemsTable = document.createElement('table');
                itemsTable.classList.add('table', 'table-sm');

                // Header tabel kecil
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

                // Body tabel kecil
                const itemsBody = document.createElement('tbody');
                entry.items.forEach((item) => {
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

                tableBody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to upload expenses. Please try again.');
    }
});