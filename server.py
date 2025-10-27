#!/usr/bin/env python3
"""
Custom HTTP server with cache control headers to prevent browser caching issues.
This ensures that JavaScript and CSS files are always fetched fresh from the server.
"""

import http.server
import socketserver
import os
import sys
from urllib.parse import urlparse

class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add cache control headers to prevent browser caching
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        
        # Add CORS headers for API calls
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        
        super().end_headers()

    def do_OPTIONS(self):
        # Handle preflight requests
        self.send_response(200)
        self.end_headers()

def run_server(port=8000):
    """Run the HTTP server with cache control headers."""
    try:
        with socketserver.TCPServer(("", port), NoCacheHTTPRequestHandler) as httpd:
            print(f"Server running at http://localhost:{port}/")
            print("Cache control headers enabled - files will not be cached by browsers")
            print("Press Ctrl+C to stop the server")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"Port {port} is already in use. Please stop the existing server or use a different port.")
            sys.exit(1)
        else:
            raise

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    run_server(port)