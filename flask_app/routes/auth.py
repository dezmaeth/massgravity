from flask import Blueprint, render_template, redirect, url_for, flash, request, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from flask_app.models.user import User
from flask_app import db

auth = Blueprint('auth', __name__)

@auth.route('/login', methods=['GET', 'POST'])
def login():
    # Check if the request is AJAX
    is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'
    
    if current_user.is_authenticated:
        if is_ajax:
            return jsonify({'success': True, 'redirect': url_for('main.game')})
        return redirect(url_for('main.game'))
    
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        user = User.query.filter_by(username=username).first()
        if user and user.check_password(password):
            login_user(user)
            next_page = request.args.get('next')
            
            if is_ajax:
                return jsonify({
                    'success': True, 
                    'message': 'Welcome back, Commander ' + username + '!',
                    'redirect': next_page or url_for('main.game')
                })
            
            return redirect(next_page or url_for('main.game'))
        
        # Login failed
        if is_ajax:
            return jsonify({
                'success': False,
                'message': 'Invalid credentials. Access denied.'
            })
        
        flash('Invalid username or password')
    
    return render_template('login.html')

@auth.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return jsonify({'success': True, 'redirect': url_for('main.game')})
        return redirect(url_for('main.game'))
    
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        faction = request.form.get('faction')
        
        # Check for AJAX request
        is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'
        
        if User.query.filter_by(username=username).first():
            if is_ajax:
                return jsonify({'success': False, 'message': 'Username already exists'})
            flash('Username already exists')
            return render_template('register.html')
        
        if User.query.filter_by(email=email).first():
            if is_ajax:
                return jsonify({'success': False, 'message': 'Email already registered'})
            flash('Email already registered')
            return render_template('register.html')
        
        if not faction or faction not in ['blue', 'red', 'green']:
            if is_ajax:
                return jsonify({'success': False, 'message': 'Please select a valid faction'})
            flash('Please select a valid faction')
            return render_template('register.html')
        
        user = User(username=username, email=email, faction=faction)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        
        # Initialize game data after user is created
        user.initialize_game_data()
        db.session.commit()
        
        # Automatically log in the user
        login_user(user)
        
        if is_ajax:
            return jsonify({'success': True, 'message': 'Registration successful! Welcome aboard, Commander.', 'redirect': url_for('main.game')})
        
        return redirect(url_for('main.game'))
    
    # If it's a GET request, return the normal template
    return render_template('register.html')

@auth.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('main.index'))