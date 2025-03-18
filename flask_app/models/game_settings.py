from flask_app import db
from datetime import datetime

class GameSettings(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    
    # Resource settings
    initial_resources = db.Column(db.Integer, default=500)
    initial_research_points = db.Column(db.Integer, default=100)
    initial_population = db.Column(db.Integer, default=200)
    mining_rate = db.Column(db.Integer, default=5)  # Resources per mining facility
    research_rate = db.Column(db.Integer, default=3)  # Research points per research outpost
    population_rate = db.Column(db.Integer, default=2)  # Population per colony base
    mining_interval = db.Column(db.Integer, default=60)  # Seconds between mining operations
    
    # Planet settings
    min_planets = db.Column(db.Integer, default=5)
    max_planets = db.Column(db.Integer, default=10)
    orbit_speed_factor = db.Column(db.Float, default=0.000000001)  # Orbital speed multiplier (extremely slow)
    
    # Building costs - Resources
    mining_facility_cost = db.Column(db.Integer, default=100)
    defense_facility_cost = db.Column(db.Integer, default=200)
    research_facility_cost = db.Column(db.Integer, default=150)
    colony_base_cost = db.Column(db.Integer, default=200)
    fighter_hangar_cost = db.Column(db.Integer, default=500)  # Basic fighter hangar
    shipyard_cost = db.Column(db.Integer, default=1000)  # Capital ship construction
    
    # Building costs - Research Points
    mining_facility_research_cost = db.Column(db.Integer, default=50)
    defense_facility_research_cost = db.Column(db.Integer, default=80)
    research_facility_research_cost = db.Column(db.Integer, default=0)
    colony_base_research_cost = db.Column(db.Integer, default=100)
    fighter_hangar_research_cost = db.Column(db.Integer, default=300)
    shipyard_research_cost = db.Column(db.Integer, default=800)
    
    # Building costs - Population
    mining_facility_population_cost = db.Column(db.Integer, default=20)
    defense_facility_population_cost = db.Column(db.Integer, default=40)
    research_facility_population_cost = db.Column(db.Integer, default=30)
    colony_base_population_cost = db.Column(db.Integer, default=50)
    fighter_hangar_population_cost = db.Column(db.Integer, default=100)
    shipyard_population_cost = db.Column(db.Integer, default=200)
    
    # Ship costs
    fighter_cost = db.Column(db.Integer, default=150)
    capital_ship_cost = db.Column(db.Integer, default=800)
    
    # Faction materials production rates (per mining facility)
    blue_material_rate = db.Column(db.Float, default=1.0)
    red_material_rate = db.Column(db.Float, default=1.0)
    green_material_rate = db.Column(db.Float, default=1.0)
    
    # Faction materials costs
    fighter_hangar_material_cost = db.Column(db.Integer, default=50)  # Faction-specific material
    shipyard_blue_material_cost = db.Column(db.Integer, default=100)  # Blue faction material
    shipyard_red_material_cost = db.Column(db.Integer, default=100)   # Red faction material
    shipyard_green_material_cost = db.Column(db.Integer, default=100) # Green faction material
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    @classmethod
    def get_settings(cls):
        """Get the game settings, creating default settings if none exist"""
        settings = cls.query.first()
        if not settings:
            settings = cls()
            db.session.add(settings)
            db.session.commit()
        return settings