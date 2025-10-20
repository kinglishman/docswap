# DocSwap - User Authentication API Endpoints

from flask import Blueprint, request, jsonify
from supabase import create_client, Client
import os
import logging
from datetime import datetime, timezone
import re

# Initialize logger
logger = logging.getLogger(__name__)

# Initialize Supabase client
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')
SUPABASE_ANON_KEY = os.environ.get('SUPABASE_ANON_KEY')

if not all([SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_ANON_KEY]):
    logger.error("Missing required Supabase environment variables for user auth")
    raise ValueError("Missing required Supabase environment variables")

# Create Supabase client for admin operations
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Create Blueprint for user authentication routes
auth_bp = Blueprint('auth', __name__)

# Email validation pattern
EMAIL_PATTERN = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')

@auth_bp.route('/api/auth/register', methods=['POST'])
def register_user():
    """Register a new user with email and password"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        # Validate input
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        if not EMAIL_PATTERN.match(email):
            return jsonify({'error': 'Invalid email format'}), 400
        
        if len(password) < 8:
            return jsonify({'error': 'Password must be at least 8 characters long'}), 400
        
        # Check if user already exists
        try:
            existing_user = supabase.auth.admin.get_user_by_email(email)
            if existing_user.user:
                return jsonify({'error': 'User already exists with this email'}), 409
        except Exception:
            # User doesn't exist, which is what we want
            pass
        
        # Create user with Supabase Auth
        try:
            response = supabase.auth.admin.create_user({
                "email": email,
                "password": password,
                "email_confirm": True  # Auto-confirm for development
            })
            
            if response.user:
                logger.info(f"User registered successfully: {email}")
                return jsonify({
                    'message': 'User registered successfully',
                    'user': {
                        'id': response.user.id,
                        'email': response.user.email,
                        'created_at': response.user.created_at
                    }
                }), 201
            else:
                logger.error(f"Failed to create user: {email}")
                return jsonify({'error': 'Failed to create user'}), 500
                
        except Exception as e:
            logger.error(f"Supabase registration error: {str(e)}")
            return jsonify({'error': 'Registration failed'}), 500
        
    except Exception as e:
        logger.error(f"Registration endpoint error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@auth_bp.route('/api/auth/login', methods=['POST'])
def login_user():
    """Login user with email and password"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        # Validate input
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        if not EMAIL_PATTERN.match(email):
            return jsonify({'error': 'Invalid email format'}), 400
        
        # Attempt to sign in with Supabase
        try:
            # Use anon key for client-side authentication
            client_supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
            response = client_supabase.auth.sign_in_with_password({
                "email": email,
                "password": password
            })
            
            if response.user and response.session:
                logger.info(f"User logged in successfully: {email}")
                return jsonify({
                    'message': 'Login successful',
                    'user': {
                        'id': response.user.id,
                        'email': response.user.email,
                        'last_sign_in_at': response.user.last_sign_in_at
                    },
                    'session': {
                        'access_token': response.session.access_token,
                        'refresh_token': response.session.refresh_token,
                        'expires_at': response.session.expires_at
                    }
                }), 200
            else:
                return jsonify({'error': 'Invalid credentials'}), 401
                
        except Exception as e:
            logger.error(f"Supabase login error: {str(e)}")
            if "Invalid login credentials" in str(e):
                return jsonify({'error': 'Invalid email or password'}), 401
            return jsonify({'error': 'Login failed'}), 500
        
    except Exception as e:
        logger.error(f"Login endpoint error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@auth_bp.route('/api/auth/logout', methods=['POST'])
def logout_user():
    """Logout user and invalidate session"""
    try:
        # Get the authorization header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'No valid session found'}), 401
        
        access_token = auth_header.split(' ')[1]
        
        # Create client with the user's access token
        client_supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        
        # Sign out the user
        try:
            response = client_supabase.auth.sign_out()
            logger.info("User logged out successfully")
            return jsonify({'message': 'Logout successful'}), 200
            
        except Exception as e:
            logger.error(f"Supabase logout error: {str(e)}")
            return jsonify({'error': 'Logout failed'}), 500
        
    except Exception as e:
        logger.error(f"Logout endpoint error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@auth_bp.route('/api/auth/refresh', methods=['POST'])
def refresh_token():
    """Refresh user access token"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        refresh_token = data.get('refresh_token')
        
        if not refresh_token:
            return jsonify({'error': 'Refresh token is required'}), 400
        
        # Create client and refresh session
        try:
            client_supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
            response = client_supabase.auth.refresh_session(refresh_token)
            
            if response.session:
                logger.info("Token refreshed successfully")
                return jsonify({
                    'message': 'Token refreshed successfully',
                    'session': {
                        'access_token': response.session.access_token,
                        'refresh_token': response.session.refresh_token,
                        'expires_at': response.session.expires_at
                    }
                }), 200
            else:
                return jsonify({'error': 'Failed to refresh token'}), 401
                
        except Exception as e:
            logger.error(f"Token refresh error: {str(e)}")
            return jsonify({'error': 'Token refresh failed'}), 401
        
    except Exception as e:
        logger.error(f"Refresh endpoint error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@auth_bp.route('/api/auth/user', methods=['GET'])
def get_current_user():
    """Get current authenticated user information"""
    try:
        # Get the authorization header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authentication required'}), 401
        
        access_token = auth_header.split(' ')[1]
        
        # Create client and get user
        try:
            client_supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
            response = client_supabase.auth.get_user(access_token)
            
            if response.user:
                return jsonify({
                    'user': {
                        'id': response.user.id,
                        'email': response.user.email,
                        'created_at': response.user.created_at,
                        'last_sign_in_at': response.user.last_sign_in_at,
                        'email_confirmed_at': response.user.email_confirmed_at
                    }
                }), 200
            else:
                return jsonify({'error': 'User not found'}), 404
                
        except Exception as e:
            logger.error(f"Get user error: {str(e)}")
            return jsonify({'error': 'Failed to get user information'}), 401
        
    except Exception as e:
        logger.error(f"Get user endpoint error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500