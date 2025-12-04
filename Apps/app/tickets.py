from flask import Blueprint, render_template, request, redirect, url_for
import psycopg2
import os

tickets_bp = Blueprint("tickets", __name__)

def get_db_connection():
    return psycopg2.connect(
        host="db",
        database=os.getenv("POSTGRES_DB"),
        user=os.getenv("POSTGRES_USER"),
        password=os.getenv("POSTGRES_PASSWORD")
    )

# Dodawanie ticketu
@tickets_bp.route("/ticket", methods=["GET", "POST"])
def add_ticket():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, name FROM categories")
    categories = cur.fetchall()
    
    if request.method == "POST":
        title = request.form["title"]
        description = request.form["description"]
        category_id = request.form["category"]
        user_id = 1  # na razie na sztywno, potem z sesji/logowania

        cur.execute(
            "INSERT INTO tickets (title, description, category_id, user_id) VALUES (%s,%s,%s,%s)",
            (title, description, category_id, user_id)
        )
        conn.commit()
        cur.close()
        conn.close()
        return redirect(url_for("tickets.add_ticket"))

    cur.close()
    conn.close()
    return render_template("ticket.html", categories=categories)

# Lista moich ticketów
@tickets_bp.route("/my_tickets")
def my_tickets():
    user_id = 1  # na razie sztywno
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT t.id, t.title, t.status, c.name FROM tickets t "
        "JOIN categories c ON t.category_id = c.id "
        "WHERE t.user_id=%s",
        (user_id,)
    )
    tickets = cur.fetchall()
    cur.close()
    conn.close()
    return render_template("my_tickets.html", tickets=tickets)

