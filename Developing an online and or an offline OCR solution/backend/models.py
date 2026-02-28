from pydantic import BaseModel
from typing import Optional

class OCRResponse(BaseModel):
    filename: str
    text: str
    success: bool
    error: Optional[str] = None
