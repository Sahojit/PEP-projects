import os
import requests
from flask import Flask, render_template, request, redirect, url_for

app = Flask(__name__)

API_URL = os.getenv("API_URL", "http://localhost:8000")

@app.route("/", methods=["GET", "POST"])
def index():
    if request.method == "POST":
        # Handle form submission to create a new item
        name = request.form.get("name")
        description = request.form.get("description")
        
        if name:
            try:
                requests.post(f"{API_URL}/items/", json={"name": name, "description": description})
            except requests.exceptions.RequestException as e:
                print(f"Error communicating with API: {e}")
                
        return redirect(url_for("index"))

    # Fetch existing items to display
    items = []
    try:
        response = requests.get(f"{API_URL}/items/")
        if response.status_code == 200:
            items = response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error communicating with API: {e}")

    return render_template("index.html", items=items)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
