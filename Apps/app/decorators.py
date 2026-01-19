from functools import wraps
from flask import request, jsonify
import jwt
import os

SECRET_KEY = os.getenv("SECRET_KEY")

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.cookies.get('auth_token')
        
        if not token:
            return jsonify({'message': 'Brak autoryzacji!'}), 401
        
        try:
            data = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            current_user = data
        except Exception as e:
            return jsonify({'message': 'Nieprawidłowy token!'}), 401
            
        return f(current_user, *args, **kwargs)
    
    return decorated

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.cookies.get('auth_token')
        
        # Debugging
        if not token:
            print(f"DEBUG [admin_required]: No token found. Cookies: {request.cookies}", flush=True)
            print(f"DEBUG [admin_required]: Headers: {request.headers}", flush=True)
            return jsonify({'message': 'Brak autoryzacji! (Brak tokenu)'}), 401
        
        try:
            data = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            if data.get('role') != 'admin':
                return jsonify({'message': 'Wymagane uprawnienia administratora!'}), 403
        except Exception as e:
            print(f"DEBUG [admin_required]: Token validation error: {e}", flush=True)
            return jsonify({'message': f'Nieprawidłowy token! ({str(e)})'}), 401
            
        return f(*args, **kwargs)
    
    return decorated
