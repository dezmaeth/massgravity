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
# Store combat rooms and pending battle requests
combat_rooms = {}
pending_battles = {}
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

@socketio.on('get_active_players')
def handle_get_active_players():
    """Handle client request for list of active players"""
    if current_user.is_authenticated:
        try:
            # Get app context
            from flask import current_app
            app = current_app._get_current_object()
            
            # Prepare list of active players (excluding current user)
            player_list = []
            for user_id, room_id in active_users.items():
                if user_id != current_user.id:
                    with app.app_context():
                        user = User.query.get(user_id)
                        if user:
                            player_list.append({
                                'id': user.id,
                                'username': user.username,
                                'faction': user.faction
                            })
            
            # Send the player list to the client
            emit('active_players_list', {'players': player_list})
        except Exception as e:
            print(f"Error getting active players: {e}")
    else:
        print("Unauthenticated active players request")


@socketio.on('request_battle')
def handle_request_battle(data):
    """Handle request to battle another player"""
    if current_user.is_authenticated:
        try:
            # Ensure required fields are present
            if 'target_id' not in data:
                emit('battle_request_error', {'message': 'Missing target player ID'})
                return
                
            target_id = data['target_id']
            
            # Check if target player is online
            if target_id not in active_users:
                emit('battle_request_error', {'message': 'Target player is not online'})
                return
                
            # Get app context
            from flask import current_app
            app = current_app._get_current_object()
            
            # Get target user info
            with app.app_context():
                target_user = User.query.get(target_id)
                if not target_user:
                    emit('battle_request_error', {'message': 'Target player not found'})
                    return
                    
                # Create battle request data
                battle_request = {
                    'requester_id': current_user.id,
                    'requester_name': current_user.username,
                    'requester_faction': current_user.faction,
                    'timestamp': datetime.utcnow().isoformat()
                }
                
                # Store pending battle request
                pending_battles[target_id] = battle_request
                
                # Send battle request to target player
                target_room = active_users[target_id]
                socketio.emit('battle_request', {
                    'from_id': current_user.id,
                    'from_name': current_user.username,
                    'from_faction': current_user.faction
                }, room=target_room)
                
                # Confirm to requesting player
                emit('battle_request_sent', {
                    'target_id': target_id,
                    'target_name': target_user.username
                })
                
        except Exception as e:
            print(f"Error handling battle request: {e}")
            emit('battle_request_error', {'message': f'Error: {str(e)}'})
    else:
        print("Unauthenticated battle request")


@socketio.on('accept_battle')
def handle_accept_battle(data):
    """Handle acceptance of a battle request"""
    if current_user.is_authenticated:
        try:
            # Ensure required fields are present
            if 'requester_id' not in data:
                emit('battle_response_error', {'message': 'Missing requester ID'})
                return
                
            requester_id = data['requester_id']
            
            # Check if there's a pending battle request
            if current_user.id not in pending_battles or pending_battles[current_user.id]['requester_id'] != requester_id:
                emit('battle_response_error', {'message': 'No such battle request found'})
                return
                
            # Check if requester is still online
            if requester_id not in active_users:
                emit('battle_response_error', {'message': 'Requesting player is no longer online'})
                pending_battles.pop(current_user.id, None)  # Clean up
                return
                
            # Get app context
            from flask import current_app
            app = current_app._get_current_object()
            
            # Create a unique room ID for the battle
            battle_room_id = f"battle_{min(requester_id, current_user.id)}_{max(requester_id, current_user.id)}"
            
            # Store battle room info with initial ready states as False
            combat_rooms[battle_room_id] = {
                'player1': requester_id,
                'player2': current_user.id,
                'player1_ready': False,
                'player2_ready': False,
                'start_time': datetime.utcnow().isoformat(),
                'status': 'active'
            }
            
            # Get user game data for ships
            with app.app_context():
                requester = User.query.get(requester_id)
                
                if not requester:
                    emit('battle_response_error', {'message': 'Requesting player not found'})
                    return
                    
                # Get ship counts from game data
                requester_data = json.loads(requester.game_data)
                current_user_data = json.loads(current_user.game_data)
                
                requester_ships = requester_data.get('ships', {'fighters': 0, 'capital_ships': 0})
                current_user_ships = current_user_data.get('ships', {'fighters': 0, 'capital_ships': 0})
                
                # Create response data for each player
                requester_data = {
                    'opponent_id': current_user.id,
                    'opponent_name': current_user.username,
                    'opponent_faction': current_user.faction,
                    'battle_room': battle_room_id,
                    'ships': requester_ships,
                    'opponent_ships': current_user_ships,
                    'is_requester': True
                }
                
                acceptor_data = {
                    'opponent_id': requester_id,
                    'opponent_name': requester.username,
                    'opponent_faction': requester.faction,
                    'battle_room': battle_room_id,
                    'ships': current_user_ships,
                    'opponent_ships': requester_ships,
                    'is_requester': False
                }
                
                # Join both users to the battle room first
                join_room(battle_room_id, sid=active_users[requester_id])
                join_room(battle_room_id)
                
                # Now notify both players that battle is accepted
                socketio.emit('battle_accepted', requester_data, room=active_users[requester_id])
                emit('battle_accepted', acceptor_data)
                
                # Set timeout to check if both players become ready
                def check_readiness():
                    if battle_room_id in combat_rooms:
                        battle_info = combat_rooms[battle_room_id]
                        if not (battle_info.get('player1_ready') and battle_info.get('player2_ready')):
                            # Not all players are ready after timeout, notify both
                            socketio.emit('combat_timeout', {
                                'message': 'Opponent failed to initialize combat properly'
                            }, room=battle_room_id)
                
                # Schedule readiness check after 10 seconds
                socketio.sleep(10)
                check_readiness()
                
                # Clean up pending request
                pending_battles.pop(current_user.id, None)
                
        except Exception as e:
            print(f"Error handling battle acceptance: {e}")
            emit('battle_response_error', {'message': f'Error: {str(e)}'})
    else:
        print("Unauthenticated battle acceptance")


@socketio.on('decline_battle')
def handle_decline_battle(data):
    """Handle decline of a battle request"""
    if current_user.is_authenticated:
        try:
            # Ensure required fields are present
            if 'requester_id' not in data:
                return
                
            requester_id = data['requester_id']
            
            # Check if requester is still online
            if requester_id in active_users:
                # Notify requester that the battle was declined
                socketio.emit('battle_declined', {
                    'opponent_id': current_user.id,
                    'opponent_name': current_user.username
                }, room=active_users[requester_id])
                
            # Clean up pending request
            if current_user.id in pending_battles:
                pending_battles.pop(current_user.id, None)
                
        except Exception as e:
            print(f"Error handling battle decline: {e}")
    else:
        print("Unauthenticated battle decline")
        
@socketio.on('join_combat')
def handle_join_combat(data):
    """Handle player joining a combat session"""
    if current_user.is_authenticated:
        try:
            # Ensure required fields are present
            if 'opponent_id' not in data:
                return
                
            opponent_id = data['opponent_id']
            
            # Create/get the battle room ID
            battle_room_id = f"battle_{min(opponent_id, current_user.id)}_{max(opponent_id, current_user.id)}"
            
            # Join the room
            join_room(battle_room_id)
            
            print(f"User {current_user.id} joined combat room {battle_room_id}")
            
            # Check if this battle room exists in combat_rooms
            if battle_room_id in combat_rooms:
                # If both players have already joined, re-send the battle_accepted event
                # to ensure the client gets it even if they reconnect
                battle_info = combat_rooms[battle_room_id]
                if battle_info['status'] == 'active':
                    # Get app context for database queries
                    from flask import current_app
                    app = current_app._get_current_object()
                    
                    with app.app_context():
                        # Determine if this user is player1 or player2
                        is_player1 = current_user.id == battle_info['player1']
                        opponent_id = battle_info['player2'] if is_player1 else battle_info['player1']
                        
                        # Get opponent info
                        opponent = User.query.get(opponent_id)
                        if opponent:
                            # Get game data for ships
                            current_user_data = json.loads(current_user.game_data)
                            opponent_data = json.loads(opponent.game_data)
                            
                            current_user_ships = current_user_data.get('ships', {'fighters': 0, 'capital_ships': 0})
                            opponent_ships = opponent_data.get('ships', {'fighters': 0, 'capital_ships': 0})
                            
                            # Re-emit battle_accepted event
                            emit('battle_accepted', {
                                'opponent_id': opponent_id,
                                'opponent_name': opponent.username,
                                'opponent_faction': opponent.faction,
                                'battle_room': battle_room_id,
                                'ships': current_user_ships if is_player1 else opponent_ships,
                                'opponent_ships': opponent_ships if is_player1 else current_user_ships,
                                'is_requester': is_player1
                            })
            
        except Exception as e:
            print(f"Error joining combat: {e}")
    else:
        print("Unauthenticated combat join attempt")
        
@socketio.on('combat_ready')
def handle_combat_ready(data):
    """Handle player ready state for combat"""
    if current_user.is_authenticated:
        try:
            # Ensure required fields are present
            if 'battle_room' not in data:
                return
                
            battle_room = data['battle_room']
            
            # Verify this is a valid battle room
            if battle_room not in combat_rooms:
                return
                
            # Verify user is part of this battle
            battle_info = combat_rooms[battle_room]
            if current_user.id not in [battle_info['player1'], battle_info['player2']]:
                return
                
            # Mark this player as ready
            player_key = 'player1_ready' if current_user.id == battle_info['player1'] else 'player2_ready'
            combat_rooms[battle_room][player_key] = True
            
            # Check if both players are ready
            if combat_rooms[battle_room].get('player1_ready') and combat_rooms[battle_room].get('player2_ready'):
                # Both players are ready, notify them
                socketio.emit('combat_synchronized', {
                    'battle_room': battle_room,
                    'status': 'ready'
                }, room=battle_room)
                
            # Update the other player about this player's readiness
            opponent_id = battle_info['player1'] if current_user.id == battle_info['player2'] else battle_info['player2']
            if opponent_id in active_users:
                socketio.emit('opponent_ready', {
                    'user_id': current_user.id,
                    'battle_room': battle_room
                }, room=active_users[opponent_id])
                
        except Exception as e:
            print(f"Error handling combat ready state: {e}")
    else:
        print("Unauthenticated combat ready attempt")
        
@socketio.on('ship_move')
def handle_ship_move(data):
    """Handle ship movement in combat"""
    if current_user.is_authenticated:
        try:
            # Ensure required fields are present
            if not all(k in data for k in ['battle_room', 'ship_id', 'position']):
                return
                
            battle_room = data['battle_room']
            
            # Verify this is a valid battle room
            if battle_room not in combat_rooms:
                return
                
            # Verify user is part of this battle
            battle_info = combat_rooms[battle_room]
            if current_user.id not in [battle_info['player1'], battle_info['player2']]:
                return
                
            # Get opponent ID
            opponent_id = battle_info['player1'] if current_user.id == battle_info['player2'] else battle_info['player2']
            
            # Forward the move to the opponent
            if opponent_id in active_users:
                socketio.emit('opponent_move', {
                    'ship_id': data['ship_id'],
                    'position': data['position']
                }, room=battle_room)
                
        except Exception as e:
            print(f"Error handling ship move: {e}")
    else:
        print("Unauthenticated ship move attempt")
        
@socketio.on('ship_attack')
def handle_ship_attack(data):
    """Handle ship attack in combat"""
    if current_user.is_authenticated:
        try:
            # Ensure required fields are present
            if not all(k in data for k in ['battle_room', 'attacker_id', 'target_id']):
                return
                
            battle_room = data['battle_room']
            
            # Verify this is a valid battle room
            if battle_room not in combat_rooms:
                return
                
            # Verify user is part of this battle
            battle_info = combat_rooms[battle_room]
            if current_user.id not in [battle_info['player1'], battle_info['player2']]:
                return
                
            # Forward the attack to the battle room
            socketio.emit('opponent_attack', {
                'attacker_id': data['attacker_id'],
                'target_id': data['target_id'],
                'damage': data.get('damage', 1)  # Default damage if not specified
            }, room=battle_room)
                
        except Exception as e:
            print(f"Error handling ship attack: {e}")
    else:
        print("Unauthenticated ship attack attempt")
        
@socketio.on('end_battle')
def handle_end_battle(data):
    """Handle end of battle"""
    if current_user.is_authenticated:
        try:
            # Ensure required fields are present
            if 'battle_room' not in data:
                return
                
            battle_room = data['battle_room']
            
            # Verify this is a valid battle room
            if battle_room not in combat_rooms:
                return
                
            # Verify user is part of this battle
            battle_info = combat_rooms[battle_room]
            if current_user.id not in [battle_info['player1'], battle_info['player2']]:
                return
                
            # Get opponent ID
            opponent_id = battle_info['player1'] if current_user.id == battle_info['player2'] else battle_info['player2']
            
            # Mark battle as ended
            combat_rooms[battle_room]['status'] = 'ended'
            combat_rooms[battle_room]['end_time'] = datetime.utcnow().isoformat()
            combat_rooms[battle_room]['winner'] = data.get('winner')
            
            # Notify both players
            socketio.emit('battle_ended', {
                'winner': data.get('winner'),
                'result': data.get('result', 'unknown')
            }, room=battle_room)
                
        except Exception as e:
            print(f"Error handling end battle: {e}")
    else:
        print("Unauthenticated end battle attempt")
        
@socketio.on('cancel_battle')
def handle_cancel_battle(data):
    """Handle cancellation of a battle"""
    if current_user.is_authenticated:
        try:
            # Ensure required fields are present
            if 'opponent_id' not in data:
                return
                
            opponent_id = data['opponent_id']
            
            # Create the battle room ID
            battle_room_id = f"battle_{min(opponent_id, current_user.id)}_{max(opponent_id, current_user.id)}"
            
            # Notify opponent if they're online
            if opponent_id in active_users:
                socketio.emit('battle_cancelled', {
                    'opponent_id': current_user.id,
                    'opponent_name': current_user.username
                }, room=active_users[opponent_id])
            
            # Clean up any pending battle
            if opponent_id in pending_battles and pending_battles[opponent_id]['requester_id'] == current_user.id:
                pending_battles.pop(opponent_id, None)
                
            # Clean up combat room if it exists
            if battle_room_id in combat_rooms:
                combat_rooms.pop(battle_room_id, None)
                
        except Exception as e:
            print(f"Error handling battle cancellation: {e}")
    else:
        print("Unauthenticated battle cancellation")