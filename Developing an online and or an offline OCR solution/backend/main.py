from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from ocr_engine import OCREngine
from models import OCRResponse
import os
import aiofiles

app = FastAPI(title="OCR Service API")

# Add CORS middleware for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OCR Engine (we will default to EasyOCR for offline initially)
ocr_engine = OCREngine()

@app.post("/api/extract", response_model=OCRResponse)
async def extract_text(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File provided is not an image.")
    
    # Save uploaded file temporarily
    temp_file_path = f"temp_{file.filename}"
    try:
        async with aiofiles.open(temp_file_path, 'wb') as out_file:
            content = await file.read()
            await out_file.write(content)
        
        # Process the image
        extracted_text = ocr_engine.extract(temp_file_path)
        
        return OCRResponse(filename=file.filename, text=extracted_text, success=True)
    except Exception as e:
        return OCRResponse(filename=file.filename, text="", success=False, error=str(e))
    finally:
        # Cleanup temporary file
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

@app.get("/api/status")
def status():
    return {"status": "ok", "engine": "EasyOCR (Offline)"}
