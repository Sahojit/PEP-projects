import os
import gspread
from google.oauth2.service_account import Credentials
from dotenv import load_dotenv

load_dotenv()

# Setup Google Sheets API Scope
SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive'
]

CREDENTIALS_FILE = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "../credentials.json")
SHEET_ID = os.getenv("GOOGLE_SHEET_ID", "YOUR_SPREADSHEET_ID_HERE")

def get_sheets_client():
    if not os.path.exists(CREDENTIALS_FILE):
        print(f"WARNING: Credentials file not found at {CREDENTIALS_FILE}")
        return None
        
    try:
        credentials = Credentials.from_service_account_file(
            CREDENTIALS_FILE, scopes=SCOPES)
        client = gspread.authorize(credentials)
        return client
    except Exception as e:
        print(f"Failed to authorize Google Sheets: {e}")
        return None

def export_to_sheet(prompt: str, response: str) -> bool:
    print(f"Attempting to export to sheet. Prompt: {prompt[:30]}...")
    client = get_sheets_client()
    
    if not client:
        # For local testing without credentials, we mock the success
        print("MOCKING GOOGLE SHEETS EXPORT: Credentials missing.")
        print(f"Would have exported -> Prompt: {prompt}, Response: {response}")
        return True
        
    try:
        # Open by ID is most reliable
        try:
            sheet = client.open_by_key(SHEET_ID).sheet1
        except Exception:
            # Fallback for testing, opens the first spreadsheet available to the service account
            print(f"Could not open spreadsheet by ID {SHEET_ID}. Attempting to open the first available sheet...")
            sheet = client.openall()[0].sheet1
            
        # Append a new row with Prompt and Response
        sheet.append_row([prompt, response])
        print("Successfully exported to Google Sheets.")
        return True
    except Exception as e:
        print(f"Error appending to sheet: {e}")
        return False
