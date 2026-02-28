from flask import Flask, render_template, request, session

app = Flask(__name__)
app.secret_key = "secret"

tree = {
    "question": "Is your number greater than or equal to 5?",
    "yes": {
        "question": "Is it even?",
        "yes": {
            "question": "Is it 8?",
            "yes": {"answer": 8},
            "no": {"answer": 6}
        },
        "no": {
            "question": "Is it 7?",
            "yes": {"answer": 7},
            "no": {"answer": 9}
        }
    },
    "no": {
        "question": "Is it even?",
        "yes": {
            "question": "Is it 2?",
            "yes": {"answer": 2},
            "no": {"answer": 4}
        },
        "no": {
            "question": "Is it 1?",
            "yes": {"answer": 1},
            "no": {
                "question": "Is it 3?",
                "yes": {"answer": 3},
                "no": {"answer": 0}
            }
        }
    }
}

@app.route("/", methods=["GET", "POST"])
def index():

    # Initialize game
    if "node" not in session:
        session["node"] = tree

    node = session["node"]

    # Handle YES / NO answers only
    if request.method == "POST" and "answer" in request.form:
        answer = request.form["answer"]
        node = node[answer]
        session["node"] = node

    # If guessed
    if "answer" in node:
        guessed_number = node["answer"]
        session.clear()
        return render_template("index.html", result=guessed_number)

    return render_template("index.html", question=node["question"])

if __name__ == "__main__":
    app.run(debug=True)
