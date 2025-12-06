from flask import Flask, jsonify
from flask_cors import CORS

from auth import auth_bp
from tickets import tickets_bp
from admin import admin_bp

app = Flask(__name__)
CORS(app)

app.register_blueprint(auth_bp, url_prefix="/api")
app.register_blueprint(tickets_bp, url_prefix="/api")
app.register_blueprint(admin_bp, url_prefiks="/api")

@app.route("/")
def home():
    return jsonify({
	"status": "OK",
	"message": "Dziala"
	})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)

