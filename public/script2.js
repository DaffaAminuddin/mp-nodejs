let apiKey = "c4Ce5rPdwPYc6RmcjwSVyZzA";

// Handle file input
document.getElementById('file').addEventListener('change', async function() {
    const fileInput = document.getElementById('file');
    const files = fileInput.files;

    if (files.length === 0) {
        alert("Please select at least one image.");
        return;
    }

    document.querySelector('.custum-file-upload').style.display ='none';
    document.querySelector('.p').style.display ='none';
    document.querySelector('.removing').style.display = '';

    const resultContainer = document.getElementById('resultContainer');
    resultContainer.innerHTML = ""; // Clear previous results

    for (let i = 0; i < files.length; i++) {
        const image = files[i];
        const formData = new FormData();
        formData.append('image_file', image);
        formData.append('size', 'auto');

        try {
            const response = await fetch('https://api.remove.bg/v1.0/removebg', {
                method: 'POST',
                headers: {
                    'X-Api-Key': apiKey
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error("Failed to process image");
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);

            // Create image result element
            const imageWrapper = document.createElement('div');
            imageWrapper.style.marginBottom = "20px";

            const img = document.createElement('img');
            img.src = url;
            img.width = 400;

            const downloadButton = document.createElement('button');
            downloadButton.textContent = "Download Image";
            downloadButton.style.marginTop = "10px";
            downloadButton.onclick = () => {
                const a = document.createElement('a');
                a.href = url;
                a.download = `background_removed_${i + 1}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            };

            imageWrapper.appendChild(img);
            imageWrapper.appendChild(downloadButton);
            resultContainer.appendChild(imageWrapper);
        } catch (error) {
            console.error("Error processing image", error);
            alert(`Failed to process image ${i + 1}. Please try again.`);
        }
    }

    document.querySelector('.removing').style.display = 'none';
    resultContainer.style.display = '';
});