from flask import Blueprint, render_template, redirect, url_for, flash, request, jsonify
from flask_login import login_required, current_user
from flask_app import db
from flask_app.models.game_settings import GameSettings
from flask_app.models.user import User
import functools
import json
from datetime import datetime

admin = Blueprint('admin', __name__, url_prefix='/admin')

def admin_required(f):
    """Decorator to require admin access for a route"""
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        # Check if user is admin (ID 1 is admin for simplicity)
        if not current_user.is_authenticated or current_user.id != 1:
            flash('Admin access required')
            return redirect(url_for('main.index'))
        return f(*args, **kwargs)
    return decorated_function

@admin.route('/')
@login_required
@admin_required
def index():
    """Admin dashboard"""
    settings = GameSettings.get_settings()
    users = User.query.all()
    
    # Calculate key metrics
    user_count = len(users)
    active_users = sum(1 for user in users if user.game_data and user.game_data != '{}')
    
    # Total facilities and planets across all users
    total_facilities = 0
    total_planets = 0
    
    # For the resource distribution chart
    resource_labels = []
    resource_data = []
    
    # Get data for recent users table
    recent_users = []
    
    for user in users:
        if user.game_data and user.game_data != '{}':
            try:
                game_data = json.loads(user.game_data)
                
                # Count facilities
                mining_facilities = sum(planet.get('mining_facilities', 0) 
                                       for planet in game_data.get('planets', []))
                total_facilities += mining_facilities
                
                # Count planets
                planets_count = len(game_data.get('planets', []))
                total_planets += planets_count
                
                # Add to resource chart if not admin
                if user.id != 1:  # Skip admin for chart
                    resource_labels.append(user.username)
                    resource_data.append(game_data.get('resources', 0))
                
                # Add to recent users list
                status = 'Active'
                status_class = 'success'
                
                recent_users.append({
                    'username': user.username,
                    'email': user.email,
                    'resources': game_data.get('resources', 0),
                    'planets': planets_count,
                    'facilities': mining_facilities,
                    'status': status,
                    'status_class': status_class
                })
            except (json.JSONDecodeError, KeyError):
                # Handle invalid JSON or missing keys
                pass
    
    # Sort recent users by resources (descending)
    recent_users.sort(key=lambda x: x['resources'], reverse=True)
    
    # Limit to top 10 users
    recent_users = recent_users[:10]
    
    return render_template('admin/index.html', 
                          settings=settings,
                          user_count=user_count,
                          active_users=active_users,
                          total_facilities=total_facilities,
                          total_planets=total_planets,
                          resource_labels=resource_labels,
                          resource_data=resource_data,
                          recent_users=recent_users)

@admin.route('/settings', methods=['GET', 'POST'])
@login_required
@admin_required
def settings():
    """View and update game settings"""
    settings = GameSettings.get_settings()
    
    if request.method == 'POST':
        # Update settings
        settings.initial_resources = int(request.form.get('initial_resources', 500))
        settings.mining_rate = int(request.form.get('mining_rate', 5))
        settings.mining_interval = int(request.form.get('mining_interval', 60))
        settings.min_planets = int(request.form.get('min_planets', 5))
        settings.max_planets = int(request.form.get('max_planets', 10))
        settings.mining_facility_cost = int(request.form.get('mining_facility_cost', 100))
        settings.defense_facility_cost = int(request.form.get('defense_facility_cost', 200))
        
        # Handle orbit speed factor (as float)
        if 'orbit_speed_factor' in request.form:
            try:
                settings.orbit_speed_factor = float(request.form.get('orbit_speed_factor', 0.00001))
            except ValueError:
                settings.orbit_speed_factor = 0.00001
        
        # Handle new fields
        if 'ship_cost' in request.form:
            settings.ship_cost = int(request.form.get('ship_cost', 300))
            
        if 'research_facility_cost' in request.form:
            settings.research_facility_cost = int(request.form.get('research_facility_cost', 250))
        
        db.session.commit()
        flash('Settings updated successfully')
        return redirect(url_for('admin.settings'))
    
    return render_template('admin/settings.html', settings=settings)

@admin.route('/api/settings', methods=['GET', 'PUT'])
@login_required
@admin_required
def api_settings():
    """API endpoint for game settings"""
    settings = GameSettings.get_settings()
    
    if request.method == 'GET':
        return jsonify({
            'initial_resources': settings.initial_resources,
            'mining_rate': settings.mining_rate,
            'mining_interval': settings.mining_interval if settings.mining_interval else 60,
            'min_planets': settings.min_planets,
            'max_planets': settings.max_planets,
            'orbit_speed_factor': float(settings.orbit_speed_factor) if settings.orbit_speed_factor else 0.00001,
            'mining_facility_cost': settings.mining_facility_cost,
            'defense_facility_cost': settings.defense_facility_cost,
            'ship_cost': getattr(settings, 'ship_cost', 300),
            'research_facility_cost': getattr(settings, 'research_facility_cost', 250),
        })
    
    if request.method == 'PUT':
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Update settings
        if 'initial_resources' in data:
            settings.initial_resources = int(data['initial_resources'])
        if 'mining_rate' in data:
            settings.mining_rate = int(data['mining_rate'])
        if 'mining_interval' in data:
            settings.mining_interval = int(data['mining_interval'])
        if 'min_planets' in data:
            settings.min_planets = int(data['min_planets'])
        if 'max_planets' in data:
            settings.max_planets = int(data['max_planets'])
        if 'orbit_speed_factor' in data:
            try:
                settings.orbit_speed_factor = float(data['orbit_speed_factor'])
            except (ValueError, TypeError):
                settings.orbit_speed_factor = 0.00001
        if 'mining_facility_cost' in data:
            settings.mining_facility_cost = int(data['mining_facility_cost'])
        if 'defense_facility_cost' in data:
            settings.defense_facility_cost = int(data['defense_facility_cost'])
        if 'ship_cost' in data:
            settings.ship_cost = int(data['ship_cost'])
        if 'research_facility_cost' in data:
            settings.research_facility_cost = int(data['research_facility_cost'])
        
        db.session.commit()
        return jsonify({'success': True})

@admin.route('/users')
@login_required
@admin_required
def users():
    """View all users"""
    users = User.query.all()
    
    # Count active users and admin users
    active_count = sum(1 for user in users if user.game_data and user.game_data != '{}')
    admin_count = sum(1 for user in users if user.id == 1)  # Simplified admin check
    
    return render_template('admin/users.html', 
                          users=users, 
                          active_count=active_count, 
                          admin_count=admin_count)

@admin.route('/reset_user/<int:user_id>', methods=['POST'])
@login_required
@admin_required
def reset_user(user_id):
    """Reset a user's game data"""
    user = User.query.get_or_404(user_id)
    user.game_data = "{}"
    db.session.commit()
    flash(f'Game data reset for user {user.username}')
    return redirect(url_for('admin.users'))

@admin.route('/api/user/<int:user_id>/game_data')
@login_required
@admin_required
def api_user_game_data(user_id):
    """API endpoint to get a user's game data"""
    user = User.query.get_or_404(user_id)
    
    try:
        game_data = json.loads(user.game_data) if user.game_data else {}
        return jsonify(game_data)
    except json.JSONDecodeError:
        return jsonify({"error": "Invalid game data format"}), 400

@admin.route('/api/reset_users', methods=['POST'])
@login_required
@admin_required
def api_reset_users():
    """API endpoint to reset multiple users' game data"""
    data = request.json
    
    if not data or 'user_ids' not in data:
        return jsonify({"error": "No user IDs provided"}), 400
    
    user_ids = data['user_ids']
    reset_count = 0
    
    for user_id in user_ids:
        user = User.query.get(user_id)
        if user:
            user.game_data = "{}"
            reset_count += 1
    
    db.session.commit()
    
    return jsonify({
        "success": True,
        "message": f"Reset game data for {reset_count} users"
    })

@admin.route('/api/delete_user/<int:user_id>', methods=['DELETE'])
@login_required
@admin_required
def api_delete_user(user_id):
    """API endpoint to delete a user"""
    # Prevent deleting the admin user
    if user_id == 1:
        return jsonify({"error": "Cannot delete admin user"}), 403
    
    user = User.query.get_or_404(user_id)
    username = user.username
    
    db.session.delete(user)
    db.session.commit()
    
    return jsonify({
        "success": True,
        "message": f"Deleted user {username}"
    })

@admin.route('/user_resources', methods=['GET'])
@login_required
@admin_required
def user_resources():
    """View to manage user resources"""
    users = User.query.all()
    
    # Process user data for display
    user_data = []
    for user in users:
        try:
            # Parse game data if available
            game_data = json.loads(user.game_data) if user.game_data else {}
            
            # Extract resource information
            resources = game_data.get('resources', 0)
            research_points = game_data.get('research_points', 0)
            population = game_data.get('population', 0)
            blue_material = game_data.get('materials', {}).get('blue', 0)
            red_material = game_data.get('materials', {}).get('red', 0)
            green_material = game_data.get('materials', {}).get('green', 0)
            
            # Create a user entry for display
            user_entry = {
                'id': user.id,
                'username': user.username,
                'faction': user.faction,
                'resources': resources,
                'research_points': research_points,
                'population': population,
                'blue_material': blue_material,
                'red_material': red_material,
                'green_material': green_material
            }
            
            user_data.append(user_entry)
            
        except (json.JSONDecodeError, KeyError):
            # Handle invalid JSON or missing keys
            user_data.append({
                'id': user.id,
                'username': user.username,
                'faction': user.faction,
                'resources': 0,
                'research_points': 0,
                'population': 0,
                'blue_material': 0,
                'red_material': 0,
                'green_material': 0
            })
    
    return render_template('admin/user_resources.html', users=user_data)

@admin.route('/api/update_user_resources/<int:user_id>', methods=['POST'])
@login_required
@admin_required
def api_update_user_resources(user_id):
    """API endpoint to update a user's resources"""
    user = User.query.get_or_404(user_id)
    data = request.json
    
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    try:
        # Parse current game data
        game_data = json.loads(user.game_data) if user.game_data else {}
        
        # Update resources
        if 'resources' in data:
            game_data['resources'] = float(data['resources'])
        
        # Update research points
        if 'research_points' in data:
            game_data['research_points'] = float(data['research_points'])
        
        # Update population
        if 'population' in data:
            game_data['population'] = float(data['population'])
        
        # Initialize materials if not present
        if 'materials' not in game_data:
            game_data['materials'] = {'blue': 0, 'red': 0, 'green': 0}
        
        # Update faction materials
        if 'blue_material' in data:
            game_data['materials']['blue'] = float(data['blue_material'])
        
        if 'red_material' in data:
            game_data['materials']['red'] = float(data['red_material'])
        
        if 'green_material' in data:
            game_data['materials']['green'] = float(data['green_material'])
        
        # Save updated game data
        user.game_data = json.dumps(game_data)
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": f"Updated resources for user {user.username}"
        })
        
    except (json.JSONDecodeError, ValueError) as e:
        return jsonify({"error": f"Failed to update resources: {str(e)}"}), 400