from flask import Flask, render_template, jsonify, request
import random

app = Flask(__name__)

# Store game state (target location) - in production, use sessions or database
game_state = {}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/new-game', methods=['POST'])
def new_game():
    """Initialize a new game with a random target location"""
    try:
        data = request.json or {}
        grid_size = data.get('grid_size', 10)
        
        # Validate grid size
        if grid_size < 3 or grid_size > 20:
            grid_size = 10
        
        target_row = random.randint(0, grid_size - 1)
        target_col = random.randint(0, grid_size - 1)
        
        game_id = random.randint(1000, 9999)
        game_state[game_id] = {
            'target': (target_row, target_col),
            'attempts': 0,
            'found': False
        }
        
        return jsonify({
            'game_id': game_id,
            'grid_size': grid_size
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/guess', methods=['POST'])
def guess():
    """Check if the guess is correct"""
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        game_id = data.get('game_id')
        row = data.get('row')
        col = data.get('col')
        
        if game_id is None or row is None or col is None:
            return jsonify({'error': 'Missing required fields'}), 400
        
        if game_id not in game_state:
            return jsonify({'error': 'Invalid game ID. Please start a new game.'}), 400
        
        game = game_state[game_id]
        
        if game['found']:
            return jsonify({
                'found': True,
                'message': 'You already found the target! Start a new game.',
                'attempts': game['attempts']
            })
        
        game['attempts'] += 1
        target_row, target_col = game['target']
        
        # Calculate distance hint (Manhattan distance)
        distance = abs(row - target_row) + abs(col - target_col)
        
        if row == target_row and col == target_col:
            game['found'] = True
            return jsonify({
                'found': True,
                'message': f'🎉 Target found! It took you {game["attempts"]} attempt{"s" if game["attempts"] != 1 else ""}.',
                'attempts': game['attempts']
            })
        else:
            hint = 'Very close!' if distance <= 2 else 'Getting warmer!' if distance <= 4 else 'Cold...'
            return jsonify({
                'found': False,
                'hint': hint,
                'distance': distance,
                'attempts': game['attempts']
            })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

