import os
import joblib
import pandas as pd
import streamlit as st
import numpy as np

# Page Config
st.set_page_config(page_title="California Housing Price Predictor", page_icon="🏡", layout="centered")

st.title("🏡 California Housing Price Predictor")
st.markdown("This ML web application predicts median house values in California based on various features using a **RandomForestRegressor** model.")

# Load Model Function with caching
@st.cache_resource
def load_model():
    model_path = os.path.join(os.path.dirname(__file__), 'model', 'rf_model.joblib')
    if os.path.exists(model_path):
        return joblib.load(model_path)
    return None

model = load_model()

if model is None:
    st.error("Model not found! Please make sure you have run the training script `train.py`.")
else:
    st.sidebar.header("User Input Features")
    st.sidebar.markdown("Use the sliders below to adjust the features.")
    
    # Inputs based on California housing dataset features
    def user_input_features():
        med_inc = st.sidebar.slider("Median Income (in $10,000s)", 0.0, 15.0, 5.0)
        house_age = st.sidebar.slider("House Age (Years)", 1.0, 55.0, 20.0)
        ave_rooms = st.sidebar.slider("Average Rooms", 1.0, 15.0, 5.0)
        ave_bedrms = st.sidebar.slider("Average Bedrooms", 0.5, 5.0, 1.0)
        population = st.sidebar.slider("Population", 10.0, 10000.0, 1000.0)
        ave_occup = st.sidebar.slider("Average Occupancy", 1.0, 10.0, 3.0)
        latitude = st.sidebar.slider("Latitude", 32.0, 42.0, 35.0)
        longitude = st.sidebar.slider("Longitude", -125.0, -114.0, -120.0)
        
        data = {
            'MedInc': med_inc,
            'HouseAge': house_age,
            'AveRooms': ave_rooms,
            'AveBedrms': ave_bedrms,
            'Population': population,
            'AveOccup': ave_occup,
            'Latitude': latitude,
            'Longitude': longitude
        }
        return pd.DataFrame(data, index=[0])
        
    df_input = user_input_features()
    
    st.subheader("Selected Features")
    st.write(df_input)
    
    # Prediction
    st.subheader("Price Prediction")
    if st.button("Predict House Price"):
        with st.spinner('Calculating prediction...'):
            prediction = model.predict(df_input)[0]
            # The target in California Housing is in 100,000s of dollars
            predicted_price_usd = prediction * 100000
            
            st.success(f"The estimated median house value is **${predicted_price_usd:,.2f}**")
            
    st.markdown("---")
    st.markdown("*Model built and deployed by Antigravity*")
