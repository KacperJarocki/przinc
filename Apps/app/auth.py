from flask import Blueprint, render_template, request, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
import psycopg2, os

auth_bp = Blueprint("auth", __name__)

def get_db_connection():
    return psycopg2.connect(
        host="db",
        database=os.getenv("POSTGRES_DB"),
        user=os.getenv("POSTGRES_USER"),
        password=os.getenv("POSTGRES_PASSWORD")
    )

@auth_bp.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        username = request.form["username"]
        email = request.form["email"]
        password_hash = generate_password_hash(request.form["password"])

        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
		"INSERT INTO users (username, email, password_hash) VALUES (%s,%s,%s)",
		(username, email, password_hash)
	)
        conn.commit()
        cur.close()
        conn.close()
        return redirect(url_for("auth.login"))
    return render_template("register.html")

@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form["email"]
        password = request.form["password"]

        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT id, username, password_hash, role FROM users WHERE email=%s", (email,))
        user = cur.fetchone()
        cur.close()
        conn.close()

        if user and check_password_hash(user[2], password):
            return redirect(url_for("home"))
        return "Błąd logowania", 401
    return render_template("login.html")

