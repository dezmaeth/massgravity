from flask_app import db, login_manager
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
import json
import random
import math

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, index=True)
    email = db.Column(db.String(120), unique=True, index=True)
    password_hash = db.Column(db.String(128))
    
    # Game data - we'll store this as JSON
    game_data = db.Column(db.Text, default="{}")
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
        
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def initialize_game_data(self):
        """Initialize a new user's game data with default values"""
        num_planets = random.randint(5, 10)
        
        # Create a star
        star = {
            "id": "star_1",
            "position": {
                "x": 0,
                "y": 0,
                "z": 0
            },
            "data": {
                "name": "Sol Prime",
                "type": "Main Sequence",
                "temperature": 5500,
                "luminosity": 1.0
            }
        }
        
        game_data = {
            "resources": 500,  # Starting resources
            "last_updated": None,
            "num_planets": num_planets,
            "planets": [],
            "stars": [star],  # Add the star to the game data
            "seed": str(random.random()),
            "playerPosition": {
                "x": 0,
                "y": 100,
                "z": 400
            },
            "buildings": {},  # Map planet_id -> building data
            "mining_facilities": {},  # Map planet_id -> mining facilities count
        }
        
        # Generate the planets
        planet_types = ["Terrestrial", "Gas Giant", "Ice Giant", "Desert", "Ocean"]
        
        for i in range(num_planets):
            planet_id = f"planet_{i}"
            distance = 80 + i * 50 + random.randint(0, 20)
            angle = random.random() * 6.28  # 2*PI
            
            planet_type = planet_types[random.randint(0, len(planet_types)-1)]
            
            planet = {
                "id": planet_id,
                "position": {
                    "x": distance * math.cos(angle),
                    "y": (random.random() - 0.5) * 20,  # slight y-axis variation
                    "z": distance * math.sin(angle)
                },
                "data": {
                    "name": f"Planet {i+1}",
                    "type": planet_type,
                    "resources": {
                        "minerals": random.randint(20, 100),
                        "energy": random.randint(20, 100),
                        "water": random.randint(20, 100)
                    }
                }
            }
            game_data["planets"].append(planet)
            game_data["buildings"][planet_id] = []
            game_data["mining_facilities"][planet_id] = 0
        
        self.game_data = json.dumps(game_data)
        return game_data
    
    def update_resources(self):
        """Update resources based on mining facilities"""
        data = json.loads(self.game_data)
        
        # Get game settings
        from flask_app.models.game_settings import GameSettings
        settings = GameSettings.get_settings()
        
        # Calculate mining production
        total_mining_facilities = sum(data["mining_facilities"].values())
        resource_gain = total_mining_facilities * settings.mining_rate
        
        # Update resources
        data["resources"] += resource_gain
        
        # Save updated data
        self.game_data = json.dumps(data)
        return data