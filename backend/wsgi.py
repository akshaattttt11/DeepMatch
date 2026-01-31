from app import app, socketio

# WSGI entrypoint for Gunicorn.
# Use the eventlet worker for WebSocket support:
#   gunicorn -k eventlet -w 1 wsgi:app --bind 0.0.0.0:$PORT

# Expose 'app' for Gunicorn. 'socketio' is imported so other scripts can access it if needed.
__all__ = ["app", "socketio"]

