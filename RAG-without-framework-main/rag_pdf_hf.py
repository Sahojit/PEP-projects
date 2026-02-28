import os
import sys
import pdfplumber
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
from huggingface_hub import InferenceClient
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Setup Hugging Face Client
# Ensure HF_TOKEN is set in your environment
hf_token = os.environ.get("HF_TOKEN")
if not hf_token:
    print("WARNING: Please ensure the 'HF_TOKEN' environment variable is set.")
    sys.exit(1)

try:
    client = InferenceClient(token=hf_token)
except Exception as e:
    print(f"Failed to initialize Hugging Face Client: {e}")
    sys.exit(1)

# Initialize the embedding model globally
print("Loading sentence-transformers embedding model...")
embedder = SentenceTransformer('all-MiniLM-L6-v2')
EMBEDDING_DIM = 384 # 'all-MiniLM-L6-v2' output dimension

def extract_text(pdf_path: str) -> str:
    """[1] pdfplumber reads every page and returns raw text"""
    print(f"Extracting text from: {pdf_path}")
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"PDF file not found at {pdf_path}")
    
    full_text = []
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages):
            text = page.extract_text()
            if text:
                full_text.append(text)
            else:
                print(f"Warning: No text found on page {i+1}")
                
    return "\n".join(full_text)

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    """[2] text is split into overlapping character windows"""
    print(f"Chunking text (size={chunk_size}, overlap={overlap})...")
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        chunks.append(chunk)
        # Move forward, taking overlap into account
        start += chunk_size - overlap
        
    print(f"Created {len(chunks)} chunks.")
    return chunks

def create_embeddings(chunks: list[str]) -> np.ndarray:
    """[3] each chunk -> 384-dim vector via all-MiniLM-L6-v2"""
    print("Creating embeddings for all chunks...")
    embeddings = embedder.encode(chunks, convert_to_numpy=True)
    return embeddings

def build_faiss_index(embeddings: np.ndarray) -> faiss.IndexFlatL2:
    """[4] embeddings are loaded into a FAISS IndexFlatL2"""
    print("Building FAISS index...")
    # Initialize index with the correct dimension
    index = faiss.IndexFlatL2(EMBEDDING_DIM)
    
    # Add vectors to index
    index.add(embeddings)
    print(f"FAISS index built with {index.ntotal} vectors.")
    return index

def retrieve_chunks(query: str, index: faiss.IndexFlatL2, chunks: list[str], k: int = 3) -> list[str]:
    """[5] question is embedded, FAISS finds top-k closest chunks"""
    # Embed the query
    query_embedding = embedder.encode([query], convert_to_numpy=True)
    
    # Search the index
    # D contains the squared distances, I contains the indices of the nearest neighbors
    D, I = index.search(query_embedding, k)
    
    # Retrieve the text chunks corresponding to the indices
    retrieved = []
    for idx in I[0]:
        if idx < len(chunks): # sanity check
            retrieved.append(chunks[idx])
            
    return retrieved

def generate_answer(query: str, retrieved_chunks: list[str], system_prompt: str = None, max_tokens: int = 500) -> str:
    """[6] chunks + question -> HuggingFace prompt -> final answer"""
    context_text = "\n\n---\n\n".join(retrieved_chunks)
    
    if not system_prompt:
        system_prompt = "You are a helpful assistant answering a question based on a provided PDF document. Use the following pieces of context to answer the user's question. If the answer is not contained within the context, simply state 'I don't know based on the provided document.'"
    
    user_prompt = f"""Context:
{context_text}

Question: {query}"""
    
    print("\nGenerating answer with Hugging Face (Qwen2.5-Coder-32B-Instruct)...")
    
    try:
        response = client.chat_completion(
            # Using Qwen 2.5 standard free inference API
            model="Qwen/Qwen2.5-Coder-32B-Instruct",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"API Error: {e}"


# ==========================================
# CLI MODE
# ==========================================
def run_cli():
    print("\n" + "="*50)
    print("Welcome to PDF Chat (CLI Mode)!")
    print("="*50)
    
    pdf_path = input("\nEnter the path to your PDF file (press Enter to use 'sample_book.pdf'): ").strip()
    if not pdf_path:
        pdf_path = "sample_book.pdf"
    
    try:
        # [1] Extract
        raw_text = extract_text(pdf_path)
        if not raw_text.strip():
            print("No text could be extracted from the PDF.")
            return

        # [2] Chunk
        chunks = chunk_text(raw_text, chunk_size=500, overlap=50)

        # [3] Embed
        embeddings = create_embeddings(chunks)

        # [4] Index
        index = build_faiss_index(embeddings)

        print("\n" + "="*50)
        print("Advanced PDF RAG System Ready!")
        print("Pipeline: pdfplumber -> all-MiniLM-L6-v2 -> FAISS -> Hugging Face API")
        print("="*50)

        # Interaction loop
        while True:
            query = input("\nEnter your question about the PDF (or 'quit' to exit): ")
            if query.lower() in ('quit', 'q', 'exit'):
                break
            if not query.strip():
                continue
            
            print("\nRetrieving context...")
            # [5] Retrieve
            top_chunks = retrieve_chunks(query, index, chunks, k=3)
            
            print(f"Retrieved {len(top_chunks)} chunks for context.")
            
            # [6] Generate
            answer = generate_answer(query, top_chunks)
            print("\n--- Answer ---")
            print(answer)
            print("-" * 50)
            
    except Exception as e:
        print(f"\nAn error occurred during pipeline execution: {e}")

# ==========================================
# GRADIO UI MODE (INDUSTRY GRADE)
# ==========================================
class RAGState:
    def __init__(self):
        self.chunks = None
        self.index = None
        self.last_retrieved = []

state = RAGState()

def process_pdf_gradio(pdf_file):
    if pdf_file is None:
        return "Please upload a PDF first."
    
    try:
        raw_text = extract_text(pdf_file.name)
        if not raw_text.strip():
            return "No text could be extracted from the PDF."
            
        chunks = chunk_text(raw_text, chunk_size=500, overlap=50)
        embeddings = create_embeddings(chunks)
        index = build_faiss_index(embeddings)
        
        state.chunks = chunks
        state.index = index
        return f"✅ '{os.path.basename(pdf_file.name)}' processed.\nCreated {len(chunks)} chunks in vector index.\nReady for queries!"
    except Exception as e:
        return f"❌ Error during processing: {e}"

def chat_gradio(user_message, history, top_k, max_tokens, sys_prompt):
    if state.index is None or state.chunks is None:
        return "", history + [[user_message, "Please upload and process a PDF document first."]], "No context retrieved yet."
        
    try:
        top_chunks = retrieve_chunks(user_message, state.index, state.chunks, k=top_k)
        state.last_retrieved = top_chunks
        
        answer = generate_answer(
            query=user_message, 
            retrieved_chunks=top_chunks, 
            system_prompt=sys_prompt, 
            max_tokens=max_tokens
        )
        
        # Format the retrieved chunks nicely for the source viewer tab
        context_display = "### 📚 Retrieved Context Sources\nThe following chunks were retrieved from your document mapping highest similarity to your query:\n\n"
        for i, chunk in enumerate(top_chunks):
            context_display += f"**Chunk {i+1}**\n```text\n{chunk}\n```\n\n---\n\n"
            
        return "", history + [[user_message, answer]], context_display
    except Exception as e:
        err_msg = f"Error generating answer: {e}"
        return "", history + [[user_message, err_msg]], err_msg

def run_gradio():
    try:
        import gradio as gr
    except ImportError:
        print("Gradio is not installed. Please run 'pip install gradio'")
        sys.exit(1)
        
    print("\nStarting Minimalist RAG Interface...")
    
    custom_css = """
    body, .gradio-container {
        font-family: 'Helvetica Neue', Arial, sans-serif !important;
        background-color: #ffffff !important;
        color: #000000 !important;
    }
    footer {display: none !important;}
    
    /* Navigation Header */
    .nav-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid #000000;
        padding-bottom: 20px;
        margin-bottom: 30px;
        margin-top: 20px;
    }
    .nav-logo {
        display: flex;
        align-items: center;
        gap: 15px;
    }
    .nav-logo-icon {
        width: 32px;
        height: 32px;
        background-color: #000000;
        color: #ffffff;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 18px;
    }
    .nav-logo-text {
        font-size: 20px;
        font-weight: 700;
        letter-spacing: 2px;
        text-transform: uppercase;
        color: #000000;
    }
    .nav-subtitle {
        font-size: 12px;
        color: #666666;
        letter-spacing: 1px;
        text-transform: uppercase;
    }
    
    /* Clean Panels & Typography */
    .panel {
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
    }
    .gradio-container .prose h1, .gradio-container .prose h2, .gradio-container .prose h3 {
        color: #000000 !important;
        font-weight: 600 !important;
        letter-spacing: 1px;
        text-transform: uppercase;
    }
    .gradio-container .prose p {
        color: #333333 !important;
    }
    
    /* Inputs */
    input[type="text"], input[type="number"], textarea, .file-preview {
        border: 1px solid #000000 !important;
        border-radius: 4px !important;
        background-color: #ffffff !important;
        box-shadow: none !important;
        color: #000000 !important;
    }
    input:focus, textarea:focus {
        border-color: #000000 !important;
        border-width: 2px !important;
        box-shadow: none !important;
    }
    
    /* Buttons */
    button.primary {
        background: #000000 !important;
        color: #ffffff !important;
        border: 1px solid #000000 !important;
        border-radius: 4px !important;
        text-transform: uppercase !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        letter-spacing: 1px !important;
        padding: 12px 24px !important;
        transition: all 0.2s ease;
    }
    button.primary:hover {
        background: #333333 !important;
        border-color: #333333 !important;
    }
    button.secondary {
        background: #ffffff !important;
        color: #000000 !important;
        border: 1px solid #dcdcdc !important;
        border-radius: 4px !important;
        text-transform: uppercase !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        letter-spacing: 1px !important;
        transition: all 0.2s ease;
    }
    button.secondary:hover {
        border-color: #000000 !important;
        background: #f8f8f8 !important;
    }
    
    /* Chatbot aesthetic */
    .chatbot {
        border: 2px solid #000000 !important;
        border-radius: 8px !important;
        background-color: #ffffff !important;
    }
    .message-wrap .message.user {
        background-color: #000000 !important;
        color: #ffffff !important;
        border-radius: 8px 8px 0px 8px !important;
    }
    .message-wrap .message.bot {
        background-color: #ffffff !important;
        color: #000000 !important;
        border: 1px solid #000000 !important;
        border-radius: 8px 8px 8px 0px !important;
        box-shadow: none !important;
    }
    
    /* Tabs */
    .tabs { border: none !important; }
    .tab-nav { 
        border-bottom: 2px solid #000000 !important; 
        margin-bottom: 20px !important; 
        padding-bottom: 0px !important;
        background-color: transparent !important;
    }
    .tab-nav button {
        border: 1px solid transparent !important; 
        border-radius: 0px !important;
        text-transform: uppercase !important; 
        font-size: 13px !important;
        letter-spacing: 1px !important; 
        color: #666666 !important;
        background: transparent !important;
        padding: 10px 15px !important;
        margin-right: 10px !important;
        transition: color 0.2s ease;
    }
    .tab-nav button:hover {
        color: #000000 !important;
    }
    .tab-nav button.selected {
        color: #000000 !important; 
        font-weight: 700 !important;
        border: 2px solid #000000 !important;
        border-bottom: none !important;
        background-color: #ffffff !important;
    }
    
    /* Sliders and Labels */
    .app-config label span {
        font-weight: 500 !important;
        color: #333333 !important;
        text-transform: uppercase;
        font-size: 11px;
        letter-spacing: 0.5px;
    }
    """
    
    with gr.Blocks(title="Document Intelligence", css=custom_css, theme=gr.themes.Base()) as demo:
        gr.HTML("""
        <div class="nav-header">
            <div class="nav-logo">
                <div class="nav-logo-icon">D</div>
                <div>
                    <div class="nav-logo-text">DOCUMENT INTELLIGENCE</div>
                    <div class="nav-subtitle">Retrieval Augmented Generation Engine</div>
                </div>
            </div>
            <div class="nav-subtitle">
                Powered by Qwen-2.5-Coder 32B
            </div>
        </div>
        """)
        
        with gr.Row():
            with gr.Column(scale=3, elem_classes="panel"):
                gr.Markdown("## 1. KNOWLEDGE BASE")
                gr.Markdown("Upload a PDF to extract and vectorize its contents.")
                pdf_input = gr.File(label="SELECT DOCUMENT", file_types=[".pdf"])
                process_btn = gr.Button("INITIALIZE VECTOR STORE", variant="primary")
                status_out = gr.Textbox(label="SYSTEM STATUS", interactive=False, value="Awaiting document...", lines=2)
                
                gr.Markdown("<br>")
                gr.Markdown("## 2. CONFIGURATION")
                
                with gr.Accordion("ADVANCED SETTINGS", open=True, elem_classes="app-config"):
                    top_k_slider = gr.Slider(minimum=1, maximum=10, step=1, value=3, label="CONTEXT CHUNKS (TOP-K)")
                    max_tokens_slider = gr.Slider(minimum=100, maximum=2000, step=100, value=500, label="MAX RESPONSE TOKENS")
                    sys_prompt_txt = gr.Textbox(
                        label="SYSTEM PERSONA", 
                        lines=4, 
                        value="You are an expert analyst answering a question based on a provided PDF document. Use the following pieces of context to answer the user's question accurately. Do not hallucinate external facts. If the answer is not contained within the context, simply state 'Data not found in document.'"
                    )
            
            with gr.Column(scale=7):
                with gr.Tabs():
                    with gr.TabItem("INTERACTIVE ANALYSIS"):
                        chatbot = gr.Chatbot(height=550, show_label=False, elem_classes="chatbot")
                        with gr.Row():
                            msg_input = gr.Textbox(show_label=False, placeholder="Enter your analytical query here...", scale=5)
                            clear_btn = gr.ClearButton([msg_input, chatbot], value="CLEAR CONVERSATION", scale=1, variant="secondary")
                    
                    with gr.TabItem("SOURCE VERIFICATION"):
                        gr.Markdown("Transparency view showing the exact document excerpts retrieved to formulate the latest answer.")
                        context_viewer = gr.Markdown("*Submit a query to view retrieved context.*")
                
        # Event wiring
        process_btn.click(fn=process_pdf_gradio, inputs=[pdf_input], outputs=[status_out])
        
        msg_input.submit(
            fn=chat_gradio, 
            inputs=[msg_input, chatbot, top_k_slider, max_tokens_slider, sys_prompt_txt], 
            outputs=[msg_input, chatbot, context_viewer]
        )
        
    demo.launch(inbrowser=True)

# ==========================================
# ENTRY POINT
# ==========================================
def main():
    print("\n" + "="*50)
    print("Welcome to Advanced PDF RAG!")
    print("="*50)
    print("Please choose an interface to launch:")
    print("  [1] Command Line Interface (CLI)")
    print("  [2] Gradio Web Interface (GUI)")
    
    while True:
        choice = input("\nEnter 1 or 2 (or 'quit' to exit): ").strip()
        
        if choice.lower() in ('quit', 'q', 'exit'):
            break
        elif choice == '1':
            run_cli()
            break
        elif choice == '2':
            run_gradio()
            break
        else:
            print("Invalid input. Please enter '1' or '2'.")

if __name__ == "__main__":
    main()
