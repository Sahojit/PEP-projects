import os
from fastapi import FastAPI, Request, Form
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
import pandas as pd
from sklearn.tree import DecisionTreeClassifier

# ========== Absolute Paths (FIXES SPACE IN FOLDER) ==========
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "data.csv")
TEMPLATES_PATH = os.path.join(BASE_DIR, "templates")

# ========== App Setup ==========
app = FastAPI()
templates = Jinja2Templates(directory=TEMPLATES_PATH)

# ========== Load & Train Model Safely ==========
def train_model():
    print("Loading dataset from:", DATA_PATH)

    df = pd.read_csv(DATA_PATH)

    X = df[["hours", "attendance"]]
    y = df["result"]

    model = DecisionTreeClassifier(random_state=42)
    model.fit(X, y)

    print("Model trained successfully!")
    return model

model = train_model()

# ========== Routes ==========

@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    return templates.TemplateResponse(
        "index.html",
        {"request": request}
    )


@app.post("/predict", response_class=HTMLResponse)
def predict(
    request: Request,
    hours: int = Form(...),
    attendance: int = Form(...)
):
    prediction = model.predict([[hours, attendance]])[0]

    result = "PASS ✅" if prediction == 1 else "FAIL ❌"

    return templates.TemplateResponse(
        "result.html",
        {
            "request": request,
            "hours": hours,
            "attendance": attendance,
            "result": result
        }
    )
