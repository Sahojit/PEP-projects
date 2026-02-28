from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import numpy as np
import io
import os
import tempfile
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.preprocessing import LabelEncoder

app = FastAPI(title="ML Full Stack App")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store uploaded dataframes temporarily in memory for simplicity in this prototype.
# In a real-world app, store them in a database or blob storage, along with metadata.
uploaded_datasets = {}

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed.")
    
    try:
        content = await file.read()
        df = pd.read_csv(io.StringIO(content.decode("utf-8")))
        
        # basic cleaning
        file_id = file.filename
        uploaded_datasets[file_id] = df
        
        columns = df.columns.tolist()
        return {"filename": file_id, "columns": columns, "info": "File uploaded successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class TrainRequest(BaseModel):
    filename: str
    target_column: str
    task_type: str  # "classification" or "regression"

def preprocess_data(df: pd.DataFrame, target_column: str, task_type: str):
    df = df.dropna(subset=[target_column])
    y = df[target_column]
    X = df.drop(columns=[target_column])
    
    # Handle missing values
    for col in X.columns:
        if X[col].dtype == 'object':
            X[col] = X[col].fillna(X[col].mode()[0] if not X[col].mode().empty else 'Unknown')
        else:
            X[col] = X[col].fillna(X[col].mean())
            
    # Label encode categorical target if classification
    if task_type == "classification" and y.dtype == 'object':
        le = LabelEncoder()
        y = le.fit_transform(y)
            
    # One-hot encode categorical features Let's use get_dummies
    X = pd.get_dummies(X, drop_first=True)
    
    return X, y

@app.post("/api/train")
async def train_model(request: TrainRequest):
    if request.filename not in uploaded_datasets:
        raise HTTPException(status_code=400, detail="File not found. Please upload it again.")
    
    df = uploaded_datasets[request.filename]
    if request.target_column not in df.columns:
        raise HTTPException(status_code=400, detail=f"Column '{request.target_column}' not found.")
    
    if request.task_type not in ["classification", "regression"]:
        raise HTTPException(status_code=400, detail="Invalid task_type. Must be 'classification' or 'regression'.")
        
    try:
        X, y = preprocess_data(df, request.target_column, request.task_type)
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        results = {}
        
        if request.task_type == "classification":
            clf = RandomForestClassifier(random_state=42)
            clf.fit(X_train, y_train)
            y_pred = clf.predict(X_test)
            
            # Use 'weighted' average to handle both binary and multi-class automatically
            results = {
                "Model": "Random Forest Classifier",
                "Accuracy": float(accuracy_score(y_test, y_pred)),
                "Precision": float(precision_score(y_test, y_pred, average='weighted', zero_division=0)),
                "Recall": float(recall_score(y_test, y_pred, average='weighted', zero_division=0)),
                "F1 Score": float(f1_score(y_test, y_pred, average='weighted', zero_division=0))
            }
        else:
            reg = RandomForestRegressor(random_state=42)
            reg.fit(X_train, y_train)
            y_pred = reg.predict(X_test)
            
            results = {
                "Model": "Random Forest Regressor",
                "MSE": float(mean_squared_error(y_test, y_pred)),
                "RMSE": float(np.sqrt(mean_squared_error(y_test, y_pred))),
                "MAE": float(mean_absolute_error(y_test, y_pred)),
                "R2 Score": float(r2_score(y_test, y_pred))
            }
            
        return {"status": "success", "metrics": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")

# Health check
@app.get("/api/health")
def health_check():
    return {"status": "ok"}
