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
    
    current_user.game_data = json.dumps(data)
    db.session.commit()
    
    # Update resources based on mining facilities
    current_user.update_resources()
    db.session.commit()
    
    return jsonify({'success': True})

@main.route('/api/load_game', methods=['GET'])
@login_required
def load_game():
    if not current_user.game_data or current_user.game_data == "{}":
        # Initialize new game data
        game_data = current_user.initialize_game_data()
        db.session.commit()
        return jsonify(game_data)
    
    try:
        # Load existing game data
        game_data = json.loads(current_user.game_data)
        return jsonify(game_data)
    except json.JSONDecodeError:
        return jsonify({})

@main.route('/api/game_settings', methods=['GET'])
def game_settings():
    """Get game settings for the front-end"""
    settings = GameSettings.get_settings()
    
    return jsonify({
        'orbit_speed_factor': float(settings.orbit_speed_factor) if settings.orbit_speed_factor else 0.00001,
        'initial_resources': settings.initial_resources,
        'mining_rate': settings.mining_rate,
        'mining_interval': settings.mining_interval if settings.mining_interval else 60
    })