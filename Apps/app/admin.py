from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash
from datetime import datetime
import psycopg2
import os
import json
from db import get_db_connection
from decorators import admin_required

admin_bp = Blueprint("admin", __name__)

@admin_bp.route("/admin/users", methods=["GET"])
@admin_required
def get_users():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('pageSize', 10))
        
        cur.execute("""
            SELECT id, username, email, first_name, last_name, role, created_at
            FROM users
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
        """, (page_size, (page-1)*page_size))
        
        users = cur.fetchall()

        cur.execute("SELECT COUNT(*) FROM users")
        total = cur.fetchone()[0]
        
        users_list = [
            {
                'id': u[0],
                'username': u[1],
                'email': u[2],
                'firstName': u[3],
                'lastName': u[4],
                'role': u[5],
                'createdAt': u[6].isoformat() if u[6] else None
            }
            for u in users
        ]
        
        cur.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Użytkownicy pobrani',
            'data': users_list,
            'timestamp': datetime.now().isoformat(),
            'pagination': {
                'total': total,
                'page': page,
                'pageSize': page_size
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@admin_bp.route("/admin/users", methods=["POST"])
@admin_required
def create_user():
    try:
        data = request.json
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            INSERT INTO users (username, email, password_hash, first_name, last_name, role)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id, created_at
        """, (
            data.get('username'),
            data.get('email'),
            generate_password_hash(data.get('password', 'temp_password')),
            data.get('firstName'),
            data.get('lastName'),
            data.get('role', 'user')
        ))
        
        user = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Użytkownik utworzony',
            'data': {
                'id': user[0],
                'createdAt': user[1].isoformat()
            },
            'timestamp': datetime.now().isoformat()
        }), 201
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@admin_bp.route("/admin/users/<int:user_id>", methods=["PUT"])
@admin_required
def update_user(user_id):
    try:
        data = request.json
        conn = get_db_connection()
        cur = conn.cursor()
        
        update_fields = ["updated_at = CURRENT_TIMESTAMP"]
        params = []
        
        if 'email' in data:
            update_fields.append("email = %s")
            params.append(data['email'])
        if 'firstName' in data:
            update_fields.append("first_name = %s")
            params.append(data['firstName'])
        if 'lastName' in data:
            update_fields.append("last_name = %s")
            params.append(data['lastName'])
        if 'role' in data:
            update_fields.append("role = %s")
            params.append(data['role'])
        
        params.append(user_id)
        
        query = f"UPDATE users SET {', '.join(update_fields)} WHERE id = %s"
        cur.execute(query, params)
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Użytkownik zaktualizowany',
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@admin_required
@admin_bp.route("/admin/users/<int:user_id>", methods=["DELETE"])
def delete_user(user_id):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("DELETE FROM users WHERE id = %s", (user_id,))
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Użytkownik usunięty',
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@admin_bp.route("/admin/dashboard", methods=["GET"])
@admin_required
def get_dashboard_stats():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'Nowy' THEN 1 ELSE 0 END) as new,
                SUM(CASE WHEN status = 'Otwarte' THEN 1 ELSE 0 END) as open,
                SUM(CASE WHEN status = 'W trakcie' THEN 1 ELSE 0 END) as in_progress,
                SUM(CASE WHEN status = 'Rozwiązane' THEN 1 ELSE 0 END) as resolved,
                SUM(CASE WHEN status = 'Zamknięte' THEN 1 ELSE 0 END) as closed,
                SUM(CASE WHEN priority = 'Krytyczny' THEN 1 ELSE 0 END) as critical
            FROM tickets
        """)
        
        stats = cur.fetchone()
        
        cur.execute("SELECT COUNT(*) FROM users")
        user_count = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM ticket_groups")
        group_count = cur.fetchone()[0]
        
        cur.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Statystyki dashboarda',
            'data': {
                'tickets': {
                    'total': stats[0] or 0,
                    'new': stats[1] or 0,
                    'open': stats[2] or 0,
                    'inProgress': stats[3] or 0,
                    'resolved': stats[4] or 0,
                    'closed': stats[5] or 0,
                    'critical': stats[6] or 0
                },
                'users': user_count,
                'groups': group_count
            },
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@admin_bp.route("/admin/allowed-domains", methods=["GET"])
@admin_required
def get_allowed_domains():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT id, domain FROM allowed_domains ORDER BY domain")
        domains = [{'id': r[0], 'domain': r[1]} for r in cur.fetchall()]
        cur.close()
        conn.close()
        return jsonify(domains)
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@admin_bp.route("/admin/allowed-domains", methods=["POST"])
@admin_required
def add_allowed_domain():
    try:
        data = request.json
        domain = data.get('domain', '').strip().lower()
        if not domain.startswith('@'):
            domain = '@' + domain
            
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("INSERT INTO allowed_domains (domain) VALUES (%s) ON CONFLICT (domain) DO NOTHING RETURNING id", (domain,))
        new_id = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        
        if new_id:
            return jsonify({'success': True, 'message': 'Domena dodana', 'id': new_id[0]}), 201
        else:
            return jsonify({'success': False, 'message': 'Domena już istnieje'}), 409
            
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@admin_bp.route("/admin/allowed-domains/<int:domain_id>", methods=["DELETE"])
@admin_required
def delete_allowed_domain(domain_id):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM allowed_domains WHERE id = %s", (domain_id,))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({'success': True, 'message': 'Domena usunięta'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

