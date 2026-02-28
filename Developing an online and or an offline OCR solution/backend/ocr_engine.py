import easyocr
import logging

class OCREngine:
    def __init__(self, use_gpu: bool = False):
        """
        Initializes the OCR Engine. Currently uses EasyOCR for offline processing.
        """
        self.logger = logging.getLogger(__name__)
        self.logger.setLevel(logging.INFO)
        # Using English by default
        try:
            # EasyOCR downloads models on first run if they don't exist
            # Note: setting gpu=False for broader compatibility by default.
            self.reader = easyocr.Reader(['en'], gpu=use_gpu) 
            self.logger.info("EasyOCR Reader initialized successfully.")
        except Exception as e:
            self.logger.error(f"Failed to initialize EasyOCR: {e}")
            self.reader = None

    def extract(self, image_path: str) -> str:
        """
        Extracts text from the given image path.
        """
        if not self.reader:
            raise RuntimeError("OCR Engine is not properly initialized.")
        
        try:
            # Read text from image, join results with a space or newline
            results = self.reader.readtext(image_path, detail=0) # detail=0 returns just the text list
            extracted_text = "\n".join(results)
            return extracted_text
        except Exception as e:
            self.logger.error(f"Error during extraction: {e}")
            raise e
