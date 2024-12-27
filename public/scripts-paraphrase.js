document.getElementById('paraphrase-btn').addEventListener('click', async () => {
    const inputText = document.getElementById('input-text').value.trim();
    const outputText = document.getElementById('output-text');
  
    if (!inputText) {
      alert('Please enter text to paraphrase.');
      return;
    }

    // Display "Please wait, paraphrasing..." message 
    outputText.textContent = 'Please wait, paraphrasing...';
  
    try {
      const response = await fetch('/api/paraphrase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ input_text: inputText })
      });
  
      if (!response.ok) {
        throw new Error('Failed to fetch response from middleware');
      }
  
      const data = await response.json();
      outputText.textContent = data.response || 'No response from backend';
    } catch (error) {
      console.error('Error fetching response:', error);
      outputText.textContent = 'An error occurred. Please try again.';
    }
  });
  