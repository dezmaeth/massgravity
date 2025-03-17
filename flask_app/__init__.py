from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_migrate import Migrate
import os

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager()

def create_app():
    app = Flask(__name__)
    
    # Configure app
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-key-for-testing')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///massgravity.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Initialize extensions with app
    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'
    
    # Register blueprints
    from flask_app.routes.main import main
    from flask_app.routes.auth import auth
    from flask_app.routes.admin import admin
    app.register_blueprint(main)
    app.register_blueprint(auth)
    app.register_blueprint(admin)
    
    # Create database tables
    with app.app_context():
        db.create_all()
    
    return app