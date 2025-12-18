# Target Finder Game

A simple 2D grid-based game where you find a hidden target by clicking on cells.

## How to Play

1. Click cells on the grid to search for the hidden target
2. Get hints based on how close you are to the target
3. Find the target in as few attempts as possible!

## Local Setup

### Quick Start (Windows)
Double-click `run_game.bat` or run it from command prompt.

### Manual Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the game:
```bash
python app.py
```

3. Open your browser and go to: `http://localhost:5000`

**Note:** If you get a "ModuleNotFoundError: No module named 'flask'" error, make sure to run `pip install -r requirements.txt` first.

## Web Deployment

### Option 1: Heroku

1. Create a `Procfile` with:
```
web: python app.py
```

2. Deploy:
```bash
heroku create your-app-name
git push heroku main
```

### Option 2: Render

1. Connect your GitHub repository to Render
2. Set build command: `pip install -r requirements.txt`
3. Set start command: `python app.py`
4. Deploy!

### Option 3: Railway

1. Connect your repository to Railway
2. Railway will auto-detect Python and install dependencies
3. Set the start command: `python app.py`

### Option 4: PythonAnywhere

1. Upload files to PythonAnywhere
2. Create a new web app
3. Point it to `app.py`
4. Reload the web app

Note: For production, update `app.py` to use a production WSGI server like Gunicorn:
```
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

