from flask import Blueprint, render_template, jsonify, request, current_app
from flask_login import login_required, current_user
import json
from datetime import datetime
from flask_app import db
from flask_app.models.game_settings import GameSettings

main = Blueprint('main', __name__)

@main.route('/')
def index():
    return render_template('index.html')

@main.route('/game')
@login_required
def game():
    # Initialize game data for new users
    if not current_user.game_data or current_user.game_data == "{}":
        current_user.initialize_game_data()
        db.session.commit()
    
    return render_template('game.html')

@main.route('/api/save_game', methods=['POST'])
@login_required
def save_game():
    data = request.json
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    # Add timestamp
    data['last_updated'] = datetime.utcnow().isoformat()
    
    # Save the current game data
    current_user.game_data = json.dumps(data)
    db.session.commit()
    
    # Update resources based on mining facilities
    # Note: update_resources() already updates game_data internally
    updated_data = current_user.update_resources()
    db.session.commit()
    
    # Return the updated data so client can sync
    return jsonify({'success': True, 'updated_data': updated_data})

@main.route('/api/load_game', methods=['GET'])
@login_required
def load_game():
    if not current_user.game_data or current_user.game_data == "{}":
        # Initialize new game data
        game_data = current_user.initialize_game_data()
        db.session.commit()
        return jsonify(game_data)
    
    try:
        # Always update resources when loading the game
        # The update_resources function will calculate resources based on time elapsed
        # since the last update, even if user was offline
        updated_data = current_user.update_resources(force_update=True)
        db.session.commit()
        
        # Return the updated data with newly calculated resources
        return jsonify(updated_data)
    except json.JSONDecodeError:
        # Handle corrupt data
        game_data = current_user.initialize_game_data()
        db.session.commit()
        return jsonify(game_data)

@main.route('/api/game_settings', methods=['GET'])
def game_settings():
    """Get game settings for the front-end"""
    settings = GameSettings.get_settings()
    
    return jsonify({
        'orbit_speed_factor': float(settings.orbit_speed_factor) if settings.orbit_speed_factor else 0.00001,
        'initial_resources': settings.initial_resources,
        'mining_rate': settings.mining_rate,
        'mining_interval': settings.mining_interval if settings.mining_interval else 60,
        'fighter_hangar_cost': settings.fighter_hangar_cost,
        'shipyard_cost': settings.shipyard_cost,
        'fighter_cost': settings.fighter_cost,
        'capital_ship_cost': settings.capital_ship_cost,
        'blue_material_rate': settings.blue_material_rate,
        'red_material_rate': settings.red_material_rate,
        'green_material_rate': settings.green_material_rate
    })