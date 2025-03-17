from flask_app import db
from datetime import datetime

class GameSettings(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    
    # Resource settings
    initial_resources = db.Column(db.Integer, default=500)
    mining_rate = db.Column(db.Integer, default=5)  # Resources per mining facility
    mining_interval = db.Column(db.Integer, default=60)  # Seconds between mining operations
    
    # Planet settings
    min_planets = db.Column(db.Integer, default=5)
    max_planets = db.Column(db.Integer, default=10)
    orbit_speed_factor = db.Column(db.Float, default=0.000000001)  # Orbital speed multiplier (extremely slow)
    
    # Building costs
    mining_facility_cost = db.Column(db.Integer, default=100)
    defense_facility_cost = db.Column(db.Integer, default=200)
    ship_cost = db.Column(db.Integer, default=300)
    research_facility_cost = db.Column(db.Integer, default=250)
    
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