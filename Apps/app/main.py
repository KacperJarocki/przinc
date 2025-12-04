from flask import Flask, render_template
from auth import auth_bp
from tickets import tickets_bp
from admin import admin_bp

app = Flask(__name__)

# Rejestrujemy blueprinty
app.register_blueprint(auth_bp)
app.register_blueprint(tickets_bp)
app.register_blueprint(admin_bp)

@app.route("/")
def home():
    return render_template("index.html")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)

