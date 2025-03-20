import React, { useState } from 'react';
import './App.css'; // Make sure to create this file with some basic styling

const FootballEloApp = () => {
  // State for players and matches
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  
  // State for active tab
  const [activeTab, setActiveTab] = useState('rankings');
  
  // State for new player form
  const [newPlayerName, setNewPlayerName] = useState('');
  
  // State for new match form
  const [team1Players, setTeam1Players] = useState([]);
  const [team2Players, setTeam2Players] = useState([]);
  const [team1Score, setTeam1Score] = useState(0);
  const [team2Score, setTeam2Score] = useState(0);
  const [matchName, setMatchName] = useState('');
  
  // Elo calculation constants
  const K_FACTOR = 32; // Standard K-factor used in Elo calculations
  const DEFAULT_ELO = 1200; // Starting Elo for new players
  
  // Function to calculate expected score based on Elo
  const calculateExpectedScore = (elo1, elo2) => {
    return 1 / (1 + Math.pow(10, (elo2 - elo1) / 400));
  };
  
  // Function to calculate new Elo rating
  const calculateNewElo = (currentElo, expectedScore, actualScore) => {
    return Math.round(currentElo + K_FACTOR * (actualScore - expectedScore));
  };
  
  // Function to add a new player
  const addPlayer = () => {
    if (newPlayerName.trim() === '') {
      alert('Please enter player name');
      return;
    }
    
    const newPlayer = {
      id: Date.now(),
      name: newPlayerName,
      elo: DEFAULT_ELO,
      matches: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      history: []
    };
    
    setPlayers([...players, newPlayer]);
    setNewPlayerName('');
  };
  
  // Helper function to toggle player selection
  const togglePlayerSelection = (playerId, team) => {
    if (team === 'team1') {
      if (team1Players.includes(playerId)) {
        setTeam1Players(team1Players.filter(id => id !== playerId));
      } else {
        if (team2Players.includes(playerId)) {
          setTeam2Players(team2Players.filter(id => id !== playerId));
        }
        setTeam1Players([...team1Players, playerId]);
      }
    } else if (team === 'team2') {
      if (team2Players.includes(playerId)) {
        setTeam2Players(team2Players.filter(id => id !== playerId));
      } else {
        if (team1Players.includes(playerId)) {
          setTeam1Players(team1Players.filter(id => id !== playerId));
        }
        setTeam2Players([...team2Players, playerId]);
      }
    }
  };
  
  // Function to record a match and update Elo ratings
  const recordMatch = () => {
    if (team1Players.length === 0 || team2Players.length === 0) {
      alert('Please select players for both teams');
      return;
    }
    
    if (team1Score < 0 || team2Score < 0) {
      alert('Please enter valid scores');
      return;
    }
    
    // Get player objects for each team
    const team1PlayerObjects = players.filter(player => team1Players.includes(player.id));
    const team2PlayerObjects = players.filter(player => team2Players.includes(player.id));
    
    // Calculate average Elo for each team
    const team1Elo = team1PlayerObjects.reduce((sum, player) => sum + player.elo, 0) / team1PlayerObjects.length;
    const team2Elo = team2PlayerObjects.reduce((sum, player) => sum + player.elo, 0) / team2PlayerObjects.length;
    
    // Calculate expected scores
    const team1ExpectedScore = calculateExpectedScore(team1Elo, team2Elo);
    const team2ExpectedScore = calculateExpectedScore(team2Elo, team1Elo);
    
    // Determine actual score (1 for win, 0.5 for draw, 0 for loss)
    let team1ActualScore, team2ActualScore;
    if (team1Score > team2Score) {
      team1ActualScore = 1;
      team2ActualScore = 0;
    } else if (team1Score < team2Score) {
      team1ActualScore = 0;
      team2ActualScore = 1;
    } else {
      team1ActualScore = 0.5;
      team2ActualScore = 0.5;
    }
    
    // Update Elo for each player
    const updatedPlayers = players.map(player => {
      if (team1Players.includes(player.id)) {
        const newElo = calculateNewElo(player.elo, team1ExpectedScore, team1ActualScore);
        const newHistory = [...player.history, { 
          date: new Date(), 
          matchName: matchName || "Training match", 
          oldElo: player.elo, 
          newElo 
        }];
        
        return {
          ...player,
          elo: newElo,
          matches: player.matches + 1,
          wins: player.wins + (team1ActualScore === 1 ? 1 : 0),
          losses: player.losses + (team1ActualScore === 0 ? 1 : 0),
          draws: player.draws + (team1ActualScore === 0.5 ? 1 : 0),
          history: newHistory
        };
      } else if (team2Players.includes(player.id)) {
        const newElo = calculateNewElo(player.elo, team2ExpectedScore, team2ActualScore);
        const newHistory = [...player.history, { 
          date: new Date(), 
          matchName: matchName || "Training match", 
          oldElo: player.elo, 
          newElo 
        }];
        
        return {
          ...player,
          elo: newElo,
          matches: player.matches + 1,
          wins: player.wins + (team2ActualScore === 1 ? 1 : 0),
          losses: player.losses + (team2ActualScore === 0 ? 1 : 0),
          draws: player.draws + (team2ActualScore === 0.5 ? 1 : 0),
          history: newHistory
        };
      }
      return player;
    });
    
    // Create match record
    const newMatch = {
      id: Date.now(),
      date: new Date(),
      name: matchName || "Training match",
      team1Players: [...team1Players],
      team2Players: [...team2Players],
      team1Score: team1Score,
      team2Score: team2Score,
      team1EloChange: team1PlayerObjects.reduce((sum, player) => {
        const updatedPlayer = updatedPlayers.find(p => p.id === player.id);
        return sum + (updatedPlayer.elo - player.elo);
      }, 0) / team1PlayerObjects.length,
      team2EloChange: team2PlayerObjects.reduce((sum, player) => {
        const updatedPlayer = updatedPlayers.find(p => p.id === player.id);
        return sum + (updatedPlayer.elo - player.elo);
      }, 0) / team2PlayerObjects.length
    };
    
    setPlayers(updatedPlayers);
    setMatches([...matches, newMatch]);
    
    // Reset form
    setTeam1Players([]);
    setTeam2Players([]);
    setTeam1Score(0);
    setTeam2Score(0);
    setMatchName('');
  };

  // Get player name by ID
  const getPlayerName = (playerId) => {
    const player = players.find(p => p.id === playerId);
    return player ? player.name : "Unknown Player";
  };

  return (
    <div className="container">
      <h1 className="title">Football Player Elo Rating System</h1>
      
      {/* Tabs */}
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'rankings' ? 'active' : ''}`}
          onClick={() => setActiveTab('rankings')}
        >
          Player Rankings
        </button>
        <button 
          className={`tab ${activeTab === 'matches' ? 'active' : ''}`}
          onClick={() => setActiveTab('matches')}
        >
          Record Match
        </button>
        <button 
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Match History
        </button>
      </div>
      
      {/* Rankings Tab */}
      {activeTab === 'rankings' && (
        <div className="tab-content">
          {/* Add Player */}
          <div className="card">
            <div className="card-header">
              <h2>Add Player</h2>
            </div>
            <div className="card-content">
              <div className="form-group">
                <label htmlFor="playerName">Player Name</label>
                <input 
                  id="playerName" 
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                />
                <button 
                  onClick={addPlayer}
                  disabled={!newPlayerName.trim()}
                  className="button primary"
                >
                  Add Player
                </button>
              </div>
            </div>
          </div>

          {/* Player Rankings */}
          <div className="card">
            <div className="card-header">
              <h2>Player Rankings</h2>
              <p className="description">Sorted by Elo rating</p>
            </div>
            <div className="card-content">
              {players.length === 0 ? (
                <p>No players added yet. Add players using the form above.</p>
              ) : (
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Name</th>
                        <th>Elo</th>
                        <th>Matches</th>
                        <th>W/L/D</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...players]
                        .sort((a, b) => b.elo - a.elo)
                        .map((player, index) => (
                          <tr key={player.id}>
                            <td>{index + 1}</td>
                            <td>{player.name}</td>
                            <td>{player.elo}</td>
                            <td>{player.matches}</td>
                            <td>{player.wins}/{player.losses}/{player.draws}</td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Player Details */}
          {players.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h2>Player History</h2>
                <p className="description">Individual Elo rating changes</p>
              </div>
              <div className="card-content">
                <div className="player-cards">
                  {[...players]
                    .sort((a, b) => b.matches - a.matches)
                    .slice(0, 6)
                    .map(player => (
                      <div key={player.id} className="player-card">
                        <h3>{player.name}</h3>
                        <p>Current Elo: {player.elo}</p>
                        <p>Matches: {player.matches} (W: {player.wins}, L: {player.losses}, D: {player.draws})</p>
                        
                        <h4>Recent Changes:</h4>
                        <ul className="history-list">
                          {player.history
                            .slice(-5)
                            .reverse()
                            .map((history, idx) => (
                              <li key={idx}>
                                {new Date(history.date).toLocaleDateString()}: 
                                <span className={history.newElo > history.oldElo ? "positive" : "negative"}>
                                  {" "}{history.oldElo} → {history.newElo} 
                                  ({history.newElo > history.oldElo ? "+" : ""}
                                  {history.newElo - history.oldElo})
                                </span>
                              </li>
                            ))
                          }
                          {player.history.length === 0 && (
                            <li>No matches recorded yet</li>
                          )}
                        </ul>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Record Match Tab */}
      {activeTab === 'matches' && (
        <div className="tab-content">
          <div className="card">
            <div className="card-header">
              <h2>Record Match Result</h2>
              <p className="description">Select players for each team and enter the match result</p>
            </div>
            <div className="card-content">
              <div className="form-group">
                <label htmlFor="matchName">Match Name (optional)</label>
                <input 
                  id="matchName" 
                  placeholder="e.g., Morning Training Game 1"
                  value={matchName}
                  onChange={(e) => setMatchName(e.target.value)}
                />
              </div>

              <div className="teams-container">
                {/* Team 1 */}
                <div className="team">
                  <h3>Team 1</h3>
                  <div className="form-group">
                    <label htmlFor="team1Score">Score</label>
                    <input 
                      id="team1Score" 
                      type="number" 
                      min="0"
                      value={team1Score}
                      onChange={(e) => setTeam1Score(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="team1PlayerSelect">Select Players</label>
                    <select 
                      id="team1PlayerSelect"
                      value=""
                      onChange={(e) => {
                        const playerId = parseInt(e.target.value);
                        if (playerId) togglePlayerSelection(playerId, 'team1');
                        e.target.value = ""; // Reset after selection
                      }}
                    >
                      <option value="">-- Add a player --</option>
                      {players
                        .filter(player => !team1Players.includes(player.id) && !team2Players.includes(player.id))
                        .map(player => (
                          <option key={player.id} value={player.id}>
                            {player.name} (Elo: {player.elo})
                          </option>
                        ))
                      }
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Selected Players</label>
                    <div className="selected-players">
                      {team1Players.length === 0 ? (
                        <p className="empty-message">No players selected</p>
                      ) : (
                        <ul>
                          {team1Players.map(playerId => {
                            const player = players.find(p => p.id === playerId);
                            return (
                              <li key={playerId} className="player-item team1">
                                <span>{player.name} (Elo: {player.elo})</span>
                                <button 
                                  onClick={() => togglePlayerSelection(playerId, 'team1')}
                                  className="remove-button"
                                >
                                  Remove
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>
                  
                  {team1Players.length > 0 && (
                    <div className="team-avg">
                      <p>Team Average Elo: {
                        Math.round(
                          players
                            .filter(player => team1Players.includes(player.id))
                            .reduce((sum, player) => sum + player.elo, 0) / team1Players.length
                        )
                      }</p>
                    </div>
                  )}
                </div>
                
                {/* Team 2 */}
                <div className="team">
                  <h3>Team 2</h3>
                  <div className="form-group">
                    <label htmlFor="team2Score">Score</label>
                    <input 
                      id="team2Score" 
                      type="number" 
                      min="0"
                      value={team2Score}
                      onChange={(e) => setTeam2Score(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="team2PlayerSelect">Select Players</label>
                    <select 
                      id="team2PlayerSelect"
                      value=""
                      onChange={(e) => {
                        const playerId = parseInt(e.target.value);
                        if (playerId) togglePlayerSelection(playerId, 'team2');
                        e.target.value = ""; // Reset after selection
                      }}
                    >
                      <option value="">-- Add a player --</option>
                      {players
                        .filter(player => !team1Players.includes(player.id) && !team2Players.includes(player.id))
                        .map(player => (
                          <option key={player.id} value={player.id}>
                            {player.name} (Elo: {player.elo})
                          </option>
                        ))
                      }
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Selected Players</label>
                    <div className="selected-players">
                      {team2Players.length === 0 ? (
                        <p className="empty-message">No players selected</p>
                      ) : (
                        <ul>
                          {team2Players.map(playerId => {
                            const player = players.find(p => p.id === playerId);
                            return (
                              <li key={playerId} className="player-item team2">
                                <span>{player.name} (Elo: {player.elo})</span>
                                <button 
                                  onClick={() => togglePlayerSelection(playerId, 'team2')}
                                  className="remove-button"
                                >
                                  Remove
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>
                  
                  {team2Players.length > 0 && (
                    <div className="team-avg">
                      <p>Team Average Elo: {
                        Math.round(
                          players
                            .filter(player => team2Players.includes(player.id))
                            .reduce((sum, player) => sum + player.elo, 0) / team2Players.length
                        )
                      }</p>
                    </div>
                  )}
                </div>
              </div>
              
              <button 
                onClick={recordMatch}
                className="button primary full-width"
                disabled={team1Players.length === 0 || team2Players.length === 0}
              >
                Record Match Result
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Match History Tab */}
      {activeTab === 'history' && (
        <div className="tab-content">
          <div className="card">
            <div className="card-header">
              <h2>Match History</h2>
              <p className="description">Recent matches and Elo changes</p>
            </div>
            <div className="card-content">
              {matches.length === 0 ? (
                <p>No matches recorded yet. Record matches in the Record Match tab.</p>
              ) : (
                <div className="match-list">
                  {[...matches]
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map(match => (
                      <div key={match.id} className="match-card">
                        <div className="match-header">
                          <div>
                            <h3>{match.name}</h3>
                            <p className="match-date">
                              {new Date(match.date).toLocaleDateString()} - {new Date(match.date).toLocaleTimeString()}
                            </p>
                          </div>
                          <div className="match-score">
                            {match.team1Score} - {match.team2Score}
                          </div>
                        </div>
                        
                        <div className="match-teams">
                          <div className="match-team">
                            <h4>Team 1</h4>
                            <p className={match.team1EloChange > 0 ? "positive" : "negative"}>
                              Elo Change: {match.team1EloChange > 0 ? "+" : ""}{Math.round(match.team1EloChange)}
                            </p>
                            <div className="team-players">
                              <h5>Players:</h5>
                              <ul>
                                {match.team1Players.map(playerId => (
                                  <li key={playerId}>{getPlayerName(playerId)}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                          
                          <div className="match-team">
                            <h4>Team 2</h4>
                            <p className={match.team2EloChange > 0 ? "positive" : "negative"}>
                              Elo Change: {match.team2EloChange > 0 ? "+" : ""}{Math.round(match.team2EloChange)}
                            </p>
                            <div className="team-players">
                              <h5>Players:</h5>
                              <ul>
                                {match.team2Players.map(playerId => (
                                  <li key={playerId}>{getPlayerName(playerId)}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FootballEloApp;