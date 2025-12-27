/**
 * Netlify Function: Standings Players
 * Devuelve la clasificación de jugadores
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=60'
};

function loadPlayerStandings() {
  try {
    const filePath = join(process.cwd(), 'public', 'data', 'player-standings.json');
    const data = readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('[standings-players] Error loading standings:', error);
    return null;
  }
}

export async function handler(event, context) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Solo GET
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const standingsData = loadPlayerStandings();

    if (!standingsData || !standingsData.standings) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Standings not available' })
      };
    }

    // Formatear para compatibilidad con frontend existente
    const formattedStandings = standingsData.standings.map(player => ({
      Posicion: player.position,
      Jugador: player.username,
      'Puntos ganados': player.points,
      Aciertos: player.correctPredictions,
      'Apuestas realizadas': player.matchdaysPlayed
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(formattedStandings)
    };

  } catch (error) {
    console.error('[standings-players] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server error' })
    };
  }
}
