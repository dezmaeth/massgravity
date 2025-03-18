from flask_app import db, login_manager
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
import json
import random
import math
from datetime import datetime

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, index=True)
    email = db.Column(db.String(120), unique=True, index=True)
    password_hash = db.Column(db.String(128))
    
    # User faction (blue, red, green)
    faction = db.Column(db.String(10), nullable=False)
    
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
        
        # Get game settings for initial values
        from flask_app.models.game_settings import GameSettings
        settings = GameSettings.get_settings()
        
        game_data = {
            "resources": settings.initial_resources,
            "research_points": settings.initial_research_points,
            "population": settings.initial_population,
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
            "research_outposts": {},  # Map planet_id -> research outposts count
            "colony_bases": {},  # Map planet_id -> colony bases count
            "materials": {
                "blue": 0,
                "red": 0,
                "green": 0
            },
            "orbital_structures": {},  # Map planet_id -> orbital structures (hangars, shipyards)
            "ships": {
                "fighters": 0,
                "capital_ships": 0
            }
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
    
    def update_resources(self, force_update=True):
        """
        Update resources based on facilities
        
        Args:
            force_update: If True, always update resources regardless of time elapsed
                         If False, only update if at least 5 seconds have passed
        """
        data = json.loads(self.game_data)
        
        # Get game settings
        from flask_app.models.game_settings import GameSettings
        settings = GameSettings.get_settings()
        
        # Set default values if any are missing
        if "resources" not in data:
            data["resources"] = 0
            
        if "research_points" not in data:
            data["research_points"] = 0
            
        if "population" not in data:
            data["population"] = 0
            
        if "materials" not in data:
            data["materials"] = {"blue": 0, "red": 0, "green": 0}
            
        if "mining_facilities" not in data:
            data["mining_facilities"] = {}
            
        if "research_outposts" not in data:
            data["research_outposts"] = {}
            
        if "colony_bases" not in data:
            data["colony_bases"] = {}
            
        # Calculate time since last update to prevent duplicate resource generation
        now = datetime.utcnow()
        last_update_time = None
        
        # Check if we have a last_updated timestamp
        if 'last_updated' in data and data['last_updated']:
            try:
                last_update_time = datetime.fromisoformat(data['last_updated'])
            except (ValueError, TypeError):
                # If invalid timestamp format, use None to indicate first update
                last_update_time = None
        
        # If first update or missing timestamp, set resources but don't calculate increase
        if last_update_time is None:
            data['last_updated'] = now.isoformat()
            self.game_data = json.dumps(data)
            return data
        
        # Calculate seconds since last update
        seconds_since_update = (now - last_update_time).total_seconds()
        
        # Only generate resources if forced or if at least 5 seconds have passed
        if force_update or seconds_since_update >= 5:
            # Calculate facility production
            total_mining_facilities = sum(data["mining_facilities"].values())
            total_research_outposts = sum(data["research_outposts"].values()) if "research_outposts" in data else 0
            total_colony_bases = sum(data["colony_bases"].values()) if "colony_bases" in data else 0
            
            # Ensure rates are not None
            mining_rate = settings.mining_rate or 0
            research_rate = settings.research_rate or 0
            population_rate = settings.population_rate or 0
            blue_rate = settings.blue_material_rate or 0
            red_rate = settings.red_material_rate or 0
            green_rate = settings.green_material_rate or 0
            
            # Adjust resource gain based on time elapsed (scaled to minutes)
            # Rates are per minute, so scale by elapsed time in minutes
            time_factor = seconds_since_update / 60.0
            
            # Calculate gains
            resource_gain = total_mining_facilities * mining_rate * time_factor
            research_gain = total_research_outposts * research_rate * time_factor
            population_gain = total_colony_bases * population_rate * time_factor
            
            # Add resources
            data["resources"] += resource_gain
            data["research_points"] += research_gain
            data["population"] += population_gain
            
            # Update faction materials
            # Each faction produces their special material at higher rates
            if self.faction == "blue":
                data["materials"]["blue"] += total_mining_facilities * blue_rate * time_factor
            elif self.faction == "red":
                data["materials"]["red"] += total_mining_facilities * red_rate * time_factor
            elif self.faction == "green":
                data["materials"]["green"] += total_mining_facilities * green_rate * time_factor
            
            # Update timestamp
            data['last_updated'] = now.isoformat()
            
            # Log the resource update
            print(f"Updated for {self.username}: +{resource_gain:.2f} resources, +{research_gain:.2f} research, +{population_gain:.2f} population (over {seconds_since_update:.2f} seconds)")
        
        # Save updated data
        self.game_data = json.dumps(data)
        return data