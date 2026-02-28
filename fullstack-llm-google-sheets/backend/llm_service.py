import os
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

# Load the model outside the request handler so it's only loaded once when the server starts
# We use a small model for fast CPU inference on a Mac.
MODEL_NAME = "google/flan-t5-small"
print(f"Loading LLM {MODEL_NAME}...")

try:
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME)
    print("LLM loaded successfully.")
except Exception as e:
    print(f"Error loading LLM: {e}")
    tokenizer = None
    model = None

def generate_response(prompt: str) -> str:
    if not model or not tokenizer:
        return "Error: LLM failed to load."
    
    # Generate the response
    try:
        # Wrap the prompt to make it instruction-like for flan-t5
        input_text = f"Answer the following question: {prompt}"
        inputs = tokenizer(input_text, return_tensors="pt")
        outputs = model.generate(**inputs, max_new_tokens=150)
        return tokenizer.decode(outputs[0], skip_special_tokens=True)
    except Exception as e:
        print(f"Generation error: {e}")
        return "An error occurred during text generation."
