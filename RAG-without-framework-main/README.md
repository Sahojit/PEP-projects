# 📄 AI Document Intelligence (Advanced PDF RAG)

A deeply refined, high-performance Retrieval-Augmented Generation (RAG) pipeline designed for local document analysis. This application allows you to "chat" with any PDF document, utilizing state-of-the-art embedding models to map relevant context and a powerful Large Language Model to synthesize intelligent, hallucination-free answers.

## 🚀 Features

*   **Dual Interface Architecture:** Choose between a blazing-fast Command Line Interface (CLI) or a sleek, industry-grade Graphical User Interface (GUI) powered by Gradio.
*   **Minimalist Aesthetic:** The Gradio interface is built with custom CSS, ensuring a clean, distraction-free environment that rivals modern enterprise SaaS applications.
*   **Transparent Sourcing:** Features a dedicated "Source Verification" tab in the UI. Check exactly which paragraphs the AI retrieved from your PDF to formulate its response—fostering total trust and auditability.
*   **Fully Tunable Pipeline:** The GUI provides sliders to configure the Vector Search depth (`Top-K Chunks`), tune the LLM's response length (`Max Tokens`), and dynamically alter the AI's behavior by overwriting its `System Persona Prompt` on the fly.
*   **Local Privacy (Embeddings):** Text chunks are vectorized locally on your machine using `SentenceTransformers`. Your entire 384-dimensional vector database is processed and stored strictly in RAM (`FAISS-CPU`).

## 🛠️ Technology Stack

1.  **Text Extraction:** `pdfplumber` (Handles robust page-by-page PDF parsing)
2.  **Dense Embedding Model:** `all-MiniLM-L6-v2` via `sentence-transformers` (Generates rapid, accurate 384-D vector representations)
3.  **Vector Database:** `FAISS` (IndexFlatL2 distance for lightning-fast similarity search)
4.  **Generation Engine:** `Qwen/Qwen2.5-Coder-32B-Instruct` via the Hugging Face Serverless Inference API (`huggingface_hub`)
5.  **Environment Management:** `python-dotenv`
6.  **Web Dashboard:** `gradio` with custom styling

## ⚙️ Setup & Installation

**1. Clone or Download the script**
Make sure `rag_pdf_hf.py` and `requirements.txt` are in your directory.

**2. Install Dependencies**
```bash
pip install -r requirements.txt
```
*(If you do not have requirements.txt, you can install manually:)*
```bash
pip install pdfplumber sentence-transformers faiss-cpu huggingface_hub python-dotenv gradio
```

**3. Configure your API Key**
Because the final generation step relies on Hugging Face's Free Inference API, you need a token.
1. Create a `.env` file in the same directory as the script.
2. Add your token like this:
```env
HF_TOKEN="hf_your_token_here"
```

*(Note: The `dotenv` library will automatically load this into the environment for you!)*

## 🖥️ Usage Guide

Launch the application directly from your terminal:

```bash
python rag_pdf_hf.py
```

You will be greeted with standard startup logs (loading the sentence-transformer) and a menu:

```text
==================================================
Welcome to Advanced PDF RAG!
==================================================
Please choose an interface to launch:
  [1] Command Line Interface (CLI)
  [2] Gradio Web Interface (GUI)

Enter 1 or 2 (or 'quit' to exit):
```

### Option 1: CLI Mode
Perfect for terminal power users. 
1. Enter the absolute or relative path to your PDF (or press enter to fall back to a default `sample_book.pdf`).
2. Wait a brief moment for chunking and FAISS indexing.
3. Start typing your questions directly into the standard input stream.

### Option 2: GUI Mode (Recommended)
Spins up a local web server (usually at `http://127.0.0.1:7860`).
1. Click the link provided in the terminal to open the dashboard in your browser.
2. Under "Knowledge Base", upload a PDF using the file picker.
3. Click **INITIALIZE VECTOR STORE**. Wait for the confirmation status.
4. Navigate to the **INTERACTIVE ANALYSIS** tab and begin querying your document.
5. *(Optional)* Fine-tune the engine settings in the left sidebar, or peek at the exact excerpts pulled from your doc under **SOURCE VERIFICATION**.

---

### Known Caveats & Troubleshooting
*   **No Text Extracted?** Scanned images/PDFs without OCR text layers cannot be read by `pdfplumber`. Ensure your PDF contains actual selectable text.
*   **ImportError for Gradio?** Make sure you ran `pip install gradio`.
*   **Hugging Face Rate Limits:** If the generation API starts throwing errors (like 429 Too Many Requests), you may have hit the free tier quota for the `Qwen2.5-Coder` endpoint. Try again shortly.
