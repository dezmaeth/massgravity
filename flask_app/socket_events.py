from flask_socketio import emit, join_room, leave_room
from flask_login import current_user
from flask import request
import json
from datetime import datetime, timedelta
import threading
import time

from flask_app import socketio, db
from flask_app.models.user import User
from flask_app.models.game_settings import GameSettings

# Store active connections
active_users = {}
# Resource update thread
resource_thread = None
# Thread control
thread_stop_event = threading.Event()

def background_resource_update(app_instance=None):
    """Background thread that updates resources for all active users"""
    print("Starting resource update thread")
    
    # Use passed app instance
    app = app_instance
    
    while not thread_stop_event.is_set():
        # Every 5 seconds, update resources for all active users
        for user_id, room_id in list(active_users.items()):
            try:
                # Use app context for database operations
                with app.app_context():
                    user = User.query.get(user_id)
                    if user:
                        # Update resources server-side
                        updated_data = user.update_resources()
                        db.session.commit()
                        
                        # Emit updated resources to the user
                        socketio.emit('resource_update', updated_data, room=room_id)
            except Exception as e:
                print(f"Error updating resources for user {user_id}: {e}")
        
        # Wait for 5 seconds
        time.sleep(5)

@socketio.on('connect')
def handle_connect():
    """Client connection handler"""
    if current_user.is_authenticated:
        # Add user to active users
        user_id = current_user.id
        room_id = request.sid
        active_users[user_id] = room_id
        join_room(room_id)
        
        print(f"User {user_id} connected with room {room_id}")
        
        # Start the resource update thread if not already running
        global resource_thread
        if resource_thread is None or not resource_thread.is_alive():
            thread_stop_event.clear()
            
            # Get app reference for the background thread
            from flask import current_app
            app = current_app._get_current_object()
            
            # Use Flask-SocketIO's background task function instead of manual thread
            resource_thread = socketio.start_background_task(background_resource_update, app)
        
        # Calculate accumulated resources since last update and send initial update
        try:
            # Get app context
            from flask import current_app
            app = current_app._get_current_object()
            
            # Use app context for database operations
            with app.app_context():
                # Force resource update to calculate accumulated resources while offline
                updated_data = current_user.update_resources(force_update=True)
                db.session.commit()
                
                # Send updated data with accumulated resources
                emit('resource_update', updated_data)
                print(f"Sent initial update to user {user_id} with accumulated resources")
        except Exception as e:
            print(f"Error sending initial update: {e}")
    else:
        print("Unauthenticated user connected")

@socketio.on('disconnect')
def handle_disconnect():
    """Client disconnection handler"""
    if current_user.is_authenticated:
        user_id = current_user.id
        
        # Remove user from active users
        if user_id in active_users:
            room_id = active_users[user_id]
            leave_room(room_id)
            del active_users[user_id]
            print(f"User {user_id} disconnected")
        
        # Stop the thread if no more active users
        if not active_users:
            thread_stop_event.set()
            print("No active users, stopping resource update thread")

@socketio.on('save_game')
def handle_save_game(data):
    """Handle game save events from client"""
    if current_user.is_authenticated:
        try:
            # Get app context
            from flask import current_app
            app = current_app._get_current_object()
            
            # Use app context for database operations
            with app.app_context():
                # Add timestamp
                data['last_updated'] = datetime.utcnow().isoformat()
                
                # Save game state
                current_user.game_data = json.dumps(data)
                db.session.commit()
                
                # Force resource update
                updated_data = current_user.update_resources()
                db.session.commit()
                
                # Send success and updated data
                emit('save_success', {
                    'success': True,
                    'updated_data': updated_data
                })
        except Exception as e:
            print(f"Error saving game: {e}")
            emit('save_error', {'message': str(e)})
    else:
        emit('save_error', {'message': 'Not authenticated'})

@socketio.on('request_update')
def handle_request_update():
    """Handle client request for immediate resource update"""
    if current_user.is_authenticated:
        try:
            # Get app context
            from flask import current_app
            app = current_app._get_current_object()
            
            # Use app context for database operations
            with app.app_context():
                # Update resources
                updated_data = current_user.update_resources()
                db.session.commit()
                
                # Send updated data
                emit('resource_update', updated_data)
        except Exception as e:
            print(f"Error handling update request: {e}")
    else:
        print("Unauthenticated update request")