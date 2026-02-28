from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from backend.llm_service import generate_response
from backend.sheets_service import export_to_sheet

app = FastAPI(title="AI Chat App with Google Sheets")

# Enable CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    prompt: str

class ExportRequest(BaseModel):
    prompt: str
    response: str

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        response_text = generate_response(request.prompt)
        return {"response": response_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/export")
async def export_endpoint(request: ExportRequest):
    try:
        success = export_to_sheet(request.prompt, request.response)
        if success:
            return {"status": "success", "message": "Exported to Google Sheets"}
        else:
            raise HTTPException(status_code=500, detail="Failed to export data")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8888)
