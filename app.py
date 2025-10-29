import os
import sys

# Vercel serverless environment setup
if os.environ.get('VERCEL'):
    print("[VERCEL] Running in Vercel environment")
    # Force directory creation
    os.makedirs('/tmp/uploads', exist_ok=True)
    os.makedirs('/tmp/output', exist_ok=True)
    os.makedirs('/tmp/sessions', exist_ok=True)
    print("[VERCEL] Directories created successfully")

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import json
import uuid
import time
from datetime import datetime
import tempfile
import shutil

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configuration
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB
ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png']

# Environment variables
SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://qzuwonueyvouvrhiwcob.supabase.co')
SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6dXdvbnVleXZvdXZyaGl3Y29iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNzM2ODgsImV4cCI6MjA2MjY0OTY4OH0.hRGTJ4oPFs6lJ4O17oeRbFOMYAgMxyMM2DSjSd5_W00')

# Directory setup
if os.environ.get('VERCEL'):
    UPLOAD_DIR = '/tmp/uploads'
    OUTPUT_DIR = '/tmp/output'
    SESSIONS_DIR = '/tmp/sessions'
else:
    UPLOAD_DIR = './uploads'
    OUTPUT_DIR = './output'
    SESSIONS_DIR = './sessions'

# Ensure directories exist
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(SESSIONS_DIR, exist_ok=True)

@app.route('/api/test', methods=['GET'])
def test_endpoint():
    """Test endpoint to verify API is working"""
    return jsonify({
        'status': 'success',
        'message': 'Python Flask API is working!',
        'timestamp': datetime.now().isoformat(),
        'environment': {
            'vercel': bool(os.environ.get('VERCEL')),
            'upload_dir': UPLOAD_DIR,
            'output_dir': OUTPUT_DIR,
            'sessions_dir': SESSIONS_DIR
        }
    })

@app.route('/api/config', methods=['GET'])
def config_endpoint():
    """Configuration endpoint"""
    return jsonify({
        'supabaseUrl': SUPABASE_URL,
        'supabaseAnonKey': SUPABASE_ANON_KEY,
        'maxFileSize': MAX_FILE_SIZE,
        'allowedExtensions': ALLOWED_EXTENSIONS
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'directories': {
            'upload_exists': os.path.exists(UPLOAD_DIR),
            'output_exists': os.path.exists(OUTPUT_DIR),
            'sessions_exists': os.path.exists(SESSIONS_DIR)
        }
    })

@app.route('/api/upload', methods=['POST'])
def upload_file():
    """File upload endpoint"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Check file extension
        file_ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
        if file_ext not in ALLOWED_EXTENSIONS:
            return jsonify({'error': f'File type not allowed. Allowed: {", ".join(ALLOWED_EXTENSIONS)}'}), 400
        
        # Generate session ID and filename
        session_id = str(uuid.uuid4())
        timestamp = int(time.time())
        safe_filename = f"{session_id}_{timestamp}_{file.filename}"
        file_path = os.path.join(UPLOAD_DIR, safe_filename)
        
        # Save file
        file.save(file_path)
        
        # Create session data
        session_data = {
            'session_id': session_id,
            'original_filename': file.filename,
            'file_path': file_path,
            'file_size': os.path.getsize(file_path),
            'upload_time': datetime.now().isoformat(),
            'status': 'uploaded'
        }
        
        # Save session
        session_file = os.path.join(SESSIONS_DIR, f"{session_id}.json")
        with open(session_file, 'w') as f:
            json.dump(session_data, f)
        
        return jsonify({
            'success': True,
            'session_id': session_id,
            'filename': safe_filename,
            'original_filename': file.filename,
            'file_size': session_data['file_size']
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/convert', methods=['POST'])
def convert_file():
    """File conversion endpoint"""
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        target_format = data.get('target_format', 'pdf')
        
        if not session_id:
            return jsonify({'error': 'Session ID required'}), 400
        
        # Load session data
        session_file = os.path.join(SESSIONS_DIR, f"{session_id}.json")
        if not os.path.exists(session_file):
            return jsonify({'error': 'Session not found'}), 404
        
        with open(session_file, 'r') as f:
            session_data = json.load(f)
        
        # For now, just simulate conversion by copying the file
        input_path = session_data['file_path']
        if not os.path.exists(input_path):
            return jsonify({'error': 'Original file not found'}), 404
        
        # Generate output filename
        original_name = session_data['original_filename']
        name_without_ext = original_name.rsplit('.', 1)[0]
        output_filename = f"{session_id}_{name_without_ext}.{target_format}"
        output_path = os.path.join(OUTPUT_DIR, output_filename)
        
        # Simulate conversion (just copy for now)
        shutil.copy2(input_path, output_path)
        
        # Update session data
        session_data['converted_filename'] = output_filename
        session_data['converted_path'] = output_path
        session_data['target_format'] = target_format
        session_data['conversion_time'] = datetime.now().isoformat()
        session_data['status'] = 'converted'
        
        # Save updated session
        with open(session_file, 'w') as f:
            json.dump(session_data, f)
        
        return jsonify({
            'success': True,
            'session_id': session_id,
            'converted_filename': output_filename,
            'download_url': f'/api/download/{session_id}'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/download/<session_id>', methods=['GET'])
def download_file(session_id):
    """File download endpoint"""
    try:
        # Load session data
        session_file = os.path.join(SESSIONS_DIR, f"{session_id}.json")
        if not os.path.exists(session_file):
            return jsonify({'error': 'Session not found'}), 404
        
        with open(session_file, 'r') as f:
            session_data = json.load(f)
        
        if 'converted_path' not in session_data:
            return jsonify({'error': 'File not converted yet'}), 400
        
        converted_path = session_data['converted_path']
        if not os.path.exists(converted_path):
            return jsonify({'error': 'Converted file not found'}), 404
        
        return send_file(
            converted_path,
            as_attachment=True,
            download_name=session_data['converted_filename']
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port, debug=False)