from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import json
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Elo calculation constants
K_FACTOR = 32
DEFAULT_ELO = 1200

# Database setup
def get_db_connection():
    conn = sqlite3.connect('football_elo.db')
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    conn.execute('''
    CREATE TABLE IF NOT EXISTS players (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        elo INTEGER NOT NULL,
        matches INTEGER NOT NULL,
        wins INTEGER NOT NULL,
        losses INTEGER NOT NULL,
        draws INTEGER NOT NULL
    )
    ''')
    
    conn.execute('''
    CREATE TABLE IF NOT EXISTS matches (
        id INTEGER PRIMARY KEY,
        date TEXT NOT NULL,
        name TEXT NOT NULL,
        team1_players TEXT NOT NULL,
        team2_players TEXT NOT NULL,
        team1_score INTEGER NOT NULL,
        team2_score INTEGER NOT NULL,
        team1_elo_change REAL NOT NULL,
        team2_elo_change REAL NOT NULL
    )
    ''')
    
    conn.execute('''
    CREATE TABLE IF NOT EXISTS player_history (
        id INTEGER PRIMARY KEY,
        player_id INTEGER NOT NULL,
        match_id INTEGER NOT NULL,
        old_elo INTEGER NOT NULL,
        new_elo INTEGER NOT NULL,
        date TEXT NOT NULL,
        FOREIGN KEY (player_id) REFERENCES players (id),
        FOREIGN KEY (match_id) REFERENCES matches (id)
    )
    ''')
    
    conn.commit()
    conn.close()

# Elo calculation functions
def calculate_expected_score(elo1, elo2):
    """Calculate the expected score based on Elo ratings"""
    return 1 / (1 + 10 ** ((elo2 - elo1) / 400))

def calculate_new_elo(current_elo, expected_score, actual_score):
    """Calculate the new Elo rating"""
    return round(current_elo + K_FACTOR * (actual_score - expected_score))

# API Routes
@app.route('/api/players', methods=['GET'])
def get_players():
    """Get all players with their stats"""
    conn = get_db_connection()
    players = conn.execute('SELECT * FROM players ORDER BY elo DESC').fetchall()
    
    # Convert to list of dictionaries
    result = []
    for player in players:
        # Get player history
        history = conn.execute(
            'SELECT * FROM player_history WHERE player_id = ? ORDER BY date DESC LIMIT 5', 
            (player['id'],)
        ).fetchall()
        
        history_list = []
        for entry in history:
            history_list.append({
                'date': entry['date'],
                'oldElo': entry['old_elo'],
                'newElo': entry['new_elo']
            })
        
        result.append({
            'id': player['id'],
            'name': player['name'],
            'elo': player['elo'],
            'matches': player['matches'],
            'wins': player['wins'],
            'losses': player['losses'],
            'draws': player['draws'],
            'history': history_list
        })
    
    conn.close()
    return jsonify(result)

@app.route('/api/players', methods=['POST'])
def add_player():
    """Add a new player"""
    data = request.json
    name = data.get('name')
    
    if not name:
        return jsonify({'error': 'Player name is required'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO players (name, elo, matches, wins, losses, draws) VALUES (?, ?, ?, ?, ?, ?)',
        (name, DEFAULT_ELO, 0, 0, 0, 0)
    )
    player_id = cursor.lastrowid
    conn.commit()
    
    # Get the newly created player
    player = conn.execute('SELECT * FROM players WHERE id = ?', (player_id,)).fetchone()
    conn.close()
    
    return jsonify({
        'id': player['id'],
        'name': player['name'],
        'elo': player['elo'],
        'matches': player['matches'],
        'wins': player['wins'],
        'losses': player['losses'],
        'draws': player['draws'],
        'history': []
    })

@app.route('/api/matches', methods=['GET'])
def get_matches():
    """Get all matches"""
    conn = get_db_connection()
    matches = conn.execute('SELECT * FROM matches ORDER BY date DESC').fetchall()
    
    # Convert to list of dictionaries
    result = []
    for match in matches:
        result.append({
            'id': match['id'],
            'date': match['date'],
            'name': match['name'],
            'team1Players': json.loads(match['team1_players']),
            'team2Players': json.loads(match['team2_players']),
            'team1Score': match['team1_score'],
            'team2Score': match['team2_score'],
            'team1EloChange': match['team1_elo_change'],
            'team2EloChange': match['team2_elo_change']
        })
    
    conn.close()
    return jsonify(result)

@app.route('/api/matches', methods=['POST'])
def record_match():
    """Record a match and update player Elo ratings"""
    data = request.json
    team1_players = data.get('team1Players', [])
    team2_players = data.get('team2Players', [])
    team1_score = data.get('team1Score', 0)
    team2_score = data.get('team2Score', 0)
    match_name = data.get('name', 'Training match')
    
    if not team1_players or not team2_players:
        return jsonify({'error': 'Both teams must have players'}), 400
    
    conn = get_db_connection()
    
    # Get all player objects
    player_ids = team1_players + team2_players
    placeholders = ','.join('?' for _ in player_ids)
    query = f'SELECT * FROM players WHERE id IN ({placeholders})'
    all_players = conn.execute(query, player_ids).fetchall()
    
    # Split into team1 and team2 players
    team1_player_objects = [p for p in all_players if p['id'] in team1_players]
    team2_player_objects = [p for p in all_players if p['id'] in team2_players]
    
    # Calculate average Elo for each team
    team1_elo = sum(p['elo'] for p in team1_player_objects) / len(team1_player_objects)
    team2_elo = sum(p['elo'] for p in team2_player_objects) / len(team2_player_objects)
    
    # Calculate expected scores
    team1_expected = calculate_expected_score(team1_elo, team2_elo)
    team2_expected = calculate_expected_score(team2_elo, team1_elo)
    
    # Determine actual score (1 for win, 0.5 for draw, 0 for loss)
    if team1_score > team2_score:
        team1_actual = 1
        team2_actual = 0
    elif team1_score < team2_score:
        team1_actual = 0
        team2_actual = 1
    else:
        team1_actual = 0.5
        team2_actual = 0.5
    
    # Insert match record
    cursor = conn.cursor()
    current_time = datetime.now().isoformat()
    cursor.execute(
        '''INSERT INTO matches (date, name, team1_players, team2_players, 
                               team1_score, team2_score, team1_elo_change, team2_elo_change) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
        (
            current_time,
            match_name,
            json.dumps(team1_players),
            json.dumps(team2_players),
            team1_score,
            team2_score,
            0,  # Temporary value, will update after calculating player Elo changes
            0   # Temporary value, will update after calculating player Elo changes
        )
    )
    match_id = cursor.lastrowid
    
    # Update Elo for each team1 player
    team1_elo_changes = []
    for player in team1_player_objects:
        old_elo = player['elo']
        new_elo = calculate_new_elo(old_elo, team1_expected, team1_actual)
        elo_change = new_elo - old_elo
        team1_elo_changes.append(elo_change)
        
        # Update wins/losses/draws
        wins = player['wins'] + (1 if team1_actual == 1 else 0)
        losses = player['losses'] + (1 if team1_actual == 0 else 0)
        draws = player['draws'] + (1 if team1_actual == 0.5 else 0)
        
        # Update player record
        cursor.execute(
            '''UPDATE players 
               SET elo = ?, matches = matches + 1, wins = ?, losses = ?, draws = ? 
               WHERE id = ?''',
            (new_elo, wins, losses, draws, player['id'])
        )
        
        # Add to history
        cursor.execute(
            '''INSERT INTO player_history (player_id, match_id, old_elo, new_elo, date) 
               VALUES (?, ?, ?, ?, ?)''',
            (player['id'], match_id, old_elo, new_elo, current_time)
        )
    
    # Update Elo for each team2 player
    team2_elo_changes = []
    for player in team2_player_objects:
        old_elo = player['elo']
        new_elo = calculate_new_elo(old_elo, team2_expected, team2_actual)
        elo_change = new_elo - old_elo
        team2_elo_changes.append(elo_change)
        
        # Update wins/losses/draws
        wins = player['wins'] + (1 if team2_actual == 1 else 0)
        losses = player['losses'] + (1 if team2_actual == 0 else 0)
        draws = player['draws'] + (1 if team2_actual == 0.5 else 0)
        
        # Update player record
        cursor.execute(
            '''UPDATE players 
               SET elo = ?, matches = matches + 1, wins = ?, losses = ?, draws = ? 
               WHERE id = ?''',
            (new_elo, wins, losses, draws, player['id'])
        )
        
        # Add to history
        cursor.execute(
            '''INSERT INTO player_history (player_id, match_id, old_elo, new_elo, date) 
               VALUES (?, ?, ?, ?, ?)''',
            (player['id'], match_id, old_elo, new_elo, current_time)
        )
    
    # Calculate average Elo changes and update the match record
    avg_team1_elo_change = sum(team1_elo_changes) / len(team1_elo_changes) if team1_elo_changes else 0
    avg_team2_elo_change = sum(team2_elo_changes) / len(team2_elo_changes) if team2_elo_changes else 0
    
    cursor.execute(
        '''UPDATE matches SET team1_elo_change = ?, team2_elo_change = ? WHERE id = ?''',
        (avg_team1_elo_change, avg_team2_elo_change, match_id)
    )
    
    conn.commit()
    
    # Get updated match record
    match = conn.execute('SELECT * FROM matches WHERE id = ?', (match_id,)).fetchone()
    
    conn.close()
    
    # Return the new match with updated data
    return jsonify({
        'id': match['id'],
        'date': match['date'],
        'name': match['name'],
        'team1Players': json.loads(match['team1_players']),
        'team2Players': json.loads(match['team2_players']),
        'team1Score': match['team1_score'],
        'team2Score': match['team2_score'],
        'team1EloChange': match['team1_elo_change'],
        'team2EloChange': match['team2_elo_change']
    })

# Initialize the database and start the app
if __name__ == '__main__':
    init_db()
    app.run(debug=True)
