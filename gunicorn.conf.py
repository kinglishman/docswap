# Gunicorn Configuration for DocSwap Production Deployment
# High-performance WSGI server configuration

import os
import multiprocessing

# Server socket
bind = f"0.0.0.0:{os.getenv('PORT', '5000')}"
backlog = 2048

# Worker processes
workers = int(os.getenv('WEB_CONCURRENCY', multiprocessing.cpu_count() * 2 + 1))
worker_class = os.getenv('WORKER_CLASS', 'gevent')
worker_connections = 1000
max_requests = int(os.getenv('MAX_REQUESTS', 1000))
max_requests_jitter = int(os.getenv('MAX_REQUESTS_JITTER', 100))

# Timeout settings
timeout = int(os.getenv('WORKER_TIMEOUT', 300))
keepalive = 2
graceful_timeout = 30

# Memory management
preload_app = True
max_worker_memory = int(os.getenv('MEMORY_LIMIT_MB', 512)) * 1024 * 1024

# Logging
accesslog = '/var/log/docswap/gunicorn_access.log'
errorlog = '/var/log/docswap/gunicorn_error.log'
loglevel = os.getenv('LOG_LEVEL', 'info').lower()
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = 'docswap'

# Security
limit_request_line = 4094
limit_request_fields = 100
limit_request_field_size = 8190

# SSL (if using HTTPS directly with Gunicorn)
# keyfile = '/path/to/your/private.key'
# certfile = '/path/to/your/certificate.crt'

# Performance tuning
worker_tmp_dir = '/dev/shm'  # Use RAM for temporary files

# Hooks for monitoring and management
def on_starting(server):
    """Called just before the master process is initialized."""
    server.log.info("DocSwap server is starting...")

def on_reload(server):
    """Called to recycle workers during a reload via SIGHUP."""
    server.log.info("DocSwap server is reloading...")

def worker_int(worker):
    """Called just after a worker exited on SIGINT or SIGQUIT."""
    worker.log.info("Worker received INT or QUIT signal")

def pre_fork(server, worker):
    """Called just before a worker is forked."""
    server.log.info(f"Worker {worker.pid} is being forked")

def post_fork(server, worker):
    """Called just after a worker has been forked."""
    server.log.info(f"Worker {worker.pid} has been forked")

def worker_abort(worker):
    """Called when a worker receives the SIGABRT signal."""
    worker.log.info(f"Worker {worker.pid} received SIGABRT signal")

# Environment variables
raw_env = [
    'PYTHONPATH=/var/www/docswap',
    f'PYTHONUNBUFFERED={os.getenv("PYTHONUNBUFFERED", "1")}',
    f'PYTHONDONTWRITEBYTECODE={os.getenv("PYTHONDONTWRITEBYTECODE", "1")}',
]

# Restart workers after this many requests (helps prevent memory leaks)
max_requests = 1000
max_requests_jitter = 100

# Restart workers after this much time (helps prevent memory leaks)
# max_worker_memory = 512 * 1024 * 1024  # 512MB

print(f"Gunicorn configuration loaded:")
print(f"  Workers: {workers}")
print(f"  Worker class: {worker_class}")
print(f"  Bind: {bind}")
print(f"  Timeout: {timeout}s")
print(f"  Max requests: {max_requests}")