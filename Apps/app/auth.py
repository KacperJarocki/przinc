from flask import Blueprint, request, jsonify, make_response
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor
import os
import jwt
from db import get_db_connection
from extensions import limiter

import re

auth_bp = Blueprint("auth", __name__)

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")

def is_password_strong(password):
    """Sprawdza siłę hasła"""
    if len(password) < 8:
        return False, "Hasło musi mieć co najmniej 8 znaków"
    if not re.search(r"[A-Z]", password):
        return False, "Hasło musi zawierać co najmniej jedną dużą literę"
    if not re.search(r"[a-z]", password):
        return False, "Hasło musi zawierać co najmniej jedną małą literę"
    if not re.search(r"[0-9]", password):
        return False, "Hasło musi zawierać co najmniej jedną cyfrę"
    return True, ""


@auth_bp.route("/auth/login", methods=["POST"])
@limiter.limit("5 per minute")
def login():
    try:
        data = request.json
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute("""
            SELECT id, username, email, password_hash, role, first_name, last_name
            FROM users WHERE email = %s
        """, (data.get('email'),))
        
        user = cur.fetchone()
        
        if not user:
            import time
            time.sleep(1)
            return jsonify({'success': False, 'message': 'Błędny email lub hasło'}), 401
        
        if not check_password_hash(user['password_hash'], data.get('password')):
            import time
            time.sleep(1)
            return jsonify({'success': False, 'message': 'Błędny email lub hasło'}), 401

        if user['role'] != 'admin':
             return jsonify({'success': False, 'message': 'Brak uprawnień do logowania'}), 403

        token = jwt.encode(
            {
                'id': user['id'],
                'email': user['email'],
                'role': user['role']
            },
            SECRET_KEY,
            algorithm='HS256'
        )
        
        response = make_response(jsonify({
            'success': True,
            'message': 'Logowanie pomyślne',
            'data': {
                'id': user['id'],
                'username': user['username'],
                'email': user['email'],
                'role': user['role'],
                'firstName': user['first_name'],
                'lastName': user['last_name']
            },
            'timestamp': datetime.now().isoformat()
        }))

        response.set_cookie(
            'auth_token',
            token,
            httponly=True,
            secure=True,
            path='/',
            samesite='Lax',
            max_age=86400 
        )
        
        return response
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        if 'conn' in locals():
            conn.close()


@auth_bp.route("/auth/logout", methods=["POST"])
def logout():
    response = make_response(jsonify({
        'success': True,
        'message': 'Wylogowanie pomyślne',
        'timestamp': datetime.now().isoformat()
    }))
    
    response.set_cookie(
        'auth_token',
        '',
        httponly=True,
        secure=False,
        path='/',
        samesite='Lax',
        max_age=0 
    )
    
    return response

@auth_bp.route("/auth/check", methods=["GET"])
def check_auth():
    try:
        token = request.cookies.get('auth_token')
        
        if not token:
            return jsonify({'success': False, 'message': 'Brak tokenu'}), 401
        
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        
        return jsonify({
            'success': True,
            'message': 'Użytkownik zalogowany',
            'data': payload,
            'timestamp': datetime.now().isoformat()
        })
    except jwt.ExpiredSignatureError:
        return jsonify({'success': False, 'message': 'Token wygasł'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'success': False, 'message': 'Nieprawidłowy token'}), 401
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


