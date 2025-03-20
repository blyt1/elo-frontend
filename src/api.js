// api.js - API service for interacting with the backend

const API_URL = 'http://localhost:5000/api';

export const api = {
  // Player-related API calls
  async getPlayers() {
    const response = await fetch(`${API_URL}/players`);
    if (!response.ok) {
      throw new Error('Failed to fetch players');
    }
    return response.json();
  },
  
  async addPlayer(name) {
    const response = await fetch(`${API_URL}/players`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to add player');
    }
    return response.json();
  },
  
  // Match-related API calls
  async getMatches() {
    const response = await fetch(`${API_URL}/matches`);
    if (!response.ok) {
      throw new Error('Failed to fetch matches');
    }
    return response.json();
  },
  
  async recordMatch(matchData) {
    const response = await fetch(`${API_URL}/matches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(matchData),
    });
    
    if (!response.ok) {
      throw new Error('Failed to record match');
    }
    return response.json();
  }
};
