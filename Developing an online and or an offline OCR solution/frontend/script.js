const API_BASE_URL = 'http://localhost:8000/api';

document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const imagePreview = document.getElementById('image-preview');
    const extractBtn = document.getElementById('extract-btn');
    const clearBtn = document.getElementById('clear-btn');
    const resultContainer = document.getElementById('result-container');
    const resultText = document.getElementById('result-text');
    const loadingOverlay = document.getElementById('loading-overlay');
    const placeholder = resultContainer.querySelector('.placeholder');
    const copyBtn = document.getElementById('copy-btn');
    const toast = document.getElementById('toast');
    const apiStatus = document.getElementById('api-status');

    let currentFile = null;

    // Check API Status on load
    checkApiStatus();

    async function checkApiStatus() {
        try {
            const response = await fetch(`${API_BASE_URL}/status`);
            if (response.ok) {
                const data = await response.json();
                apiStatus.className = 'status-badge online';
                apiStatus.textContent = `Online: ${data.engine}`;
            } else {
                throw new Error('API Error');
            }
        } catch (error) {
            apiStatus.className = 'status-badge offline';
            apiStatus.textContent = 'API Offline';
            console.error('Failed to connect to API:', error);
        }
    }

    // Drag and Drop Handlers
    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length) {
            handleFile(fileInput.files[0]);
        }
    });

    function handleFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file.');
            return;
        }

        currentFile = file;
        const reader = new FileReader();
        
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            imagePreview.classList.remove('preview-hidden');
            extractBtn.disabled = false;
        };
        
        reader.readAsDataURL(file);
    }

    // Extraction logic
    extractBtn.addEventListener('click', async () => {
        if (!currentFile) return;

        // UI State: Loading
        extractBtn.disabled = true;
        placeholder.classList.add('hidden');
        resultText.classList.add('hidden');
        loadingOverlay.classList.remove('hidden');

        const formData = new FormData();
        formData.append('file', currentFile);

        try {
            const response = await fetch(`${API_BASE_URL}/extract`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                resultText.value = data.text;
                if (!data.text.trim()) {
                    resultText.value = "No text found in this image.";
                }
                resultText.classList.remove('hidden');
            } else {
                resultText.value = `Error: ${data.error}`;
                resultText.classList.remove('hidden');
            }
        } catch (error) {
            resultText.value = `Connection Error: Make sure the FastAPI server is running. (${error.message})`;
            resultText.classList.remove('hidden');
        } finally {
            // UI State: Done
            loadingOverlay.classList.add('hidden');
            extractBtn.disabled = false;
        }
    });

    // Clear logic
    clearBtn.addEventListener('click', () => {
        currentFile = null;
        fileInput.value = '';
        imagePreview.src = '';
        imagePreview.classList.add('preview-hidden');
        extractBtn.disabled = true;
        
        resultText.value = '';
        resultText.classList.add('hidden');
        placeholder.classList.remove('hidden');
    });

    // Copy logic
    copyBtn.addEventListener('click', async () => {
        if (resultText.value && !resultText.classList.contains('hidden')) {
            try {
                await navigator.clipboard.writeText(resultText.value);
                showToast();
            } catch (err) {
                console.error('Failed to copy text: ', err);
            }
        }
    });

    function showToast() {
        toast.classList.remove('hidden');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }
});
