from flask import Flask, jsonify
from flask_cors import CORS
from werkzeug.middleware.proxy_fix import ProxyFix
from datetime import datetime
import os
from extensions import limiter

from auth import auth_bp
from tickets import tickets_bp
from admin import admin_bp

app = Flask(__name__)
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)

limiter.init_app(app)

allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:4200,http://localhost:4201,http://127.0.0.1:4200").split(",")
CORS(app, 
    origins=allowed_origins,
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization", "Access-Control-Allow-Credentials"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]
)

app.register_blueprint(auth_bp, url_prefix="/api")
app.register_blueprint(tickets_bp, url_prefix="/api")
app.register_blueprint(admin_bp, url_prefix="/api")

@app.errorhandler(429)
def ratelimit_handler(e):
    return jsonify({
        "success": False,
        "message": "Przekroczono limit prób. Spróbuj ponownie za chwilę."
    }), 429

@app.errorhandler(500)
def internal_error(e):
    return jsonify({
        "success": False,
        "message": "Wystąpił wewnętrzny błąd serwera."
    }), 500

@app.after_request
def add_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    return response

@app.route("/")
def home():
    return jsonify({
        "status": "OK",
        "message": "Backend API running"
    })

@app.route("/health")
def health_check():
    return jsonify({
        "status": "healthy",
        "timestamp": str(datetime.now())
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)


