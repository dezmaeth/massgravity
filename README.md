# MASS GRAVITY

Version: 0.3.0

A space-based RTS game with progress saving, built with Three.js and Flask.

## Screenshot
[![screenshot](artwork/planet2-01.jpg?raw=true)](http://mass-gravity.appspot.com)

## Features
- 3D space visualization with planets, stars, and ships
- User accounts with progress saving
- Modern Three.js implementation
- Flask backend for user management and game state persistence

## Installation

1. Clone the repository
```
git clone https://github.com/yourusername/massgravity.git
cd massgravity
```

2. Install dependencies
```
npm install
pip install -r requirements.txt
```

3. Run the application in development mode
```
npm run start
```

4. Build the application
```
npm run build
```
or for a clean build:
```
npm run build:clean
```

5. Run the Flask server
```
python app.py
```

6. Visit `http://localhost:5000` in your browser

## Version Management
To update the version number:
```
npm run version:patch  # For bug fixes (0.2.1 -> 0.2.2)
npm run version:minor  # For new features (0.2.1 -> 0.3.0)
npm run version:major  # For breaking changes (0.2.1 -> 1.0.0)
```

## Artwork
[![screenshot](artwork/sketch2-line.jpg?raw=true)](http://mass-gravity.appspot.com)
[![screenshot](artwork/sketch2-process2.jpg?raw=true)](http://mass-gravity.appspot.com)
[![screenshot](artwork/frigate-draft.jpg?raw=true)](http://mass-gravity.appspot.com)