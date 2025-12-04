from flask import Blueprint, render_template, request, redirect, url_for
import psycopg2
import os

admin_bp = Blueprint("admin", __name__)

def get_db_connection():
    return psycopg2.connect(
        host="db",
        database=os.getenv("POSTGRES_DB"),
        user=os.getenv("POSTGRES_USER"),
        password=os.getenv("POSTGRES_PASSWORD")
    )

# Panel admina
@admin_bp.route("/admin")
def admin_panel():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT t.id, t.title, t.status, u.username, c.name 
        FROM tickets t
        JOIN users u ON t.user_id = u.id
        JOIN categories c ON t.category_id = c.id
        ORDER BY t.created_at DESC
    """)
    tickets = cur.fetchall()
    cur.close()
    conn.close()
    return render_template("admin.html", tickets=tickets)

# Zmiana statusu ticketu
@admin_bp.route("/admin/ticket/<int:ticket_id>/status", methods=["POST"])
def change_status(ticket_id):
    new_status = request.form.get("status")
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("UPDATE tickets SET status=%s WHERE id=%s", (new_status, 
ticket_id))
    conn.commit()
    cur.close()
    conn.close()
    return redirect(url_for("admin.admin_panel"))

