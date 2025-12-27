/**
 * Netlify Function: Standings League
 * Devuelve la clasificación de equipos de La Liga
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=300'
};

function loadLeagueStandings() {
  try {
    const filePath = join(process.cwd(), 'public', 'data', 'league-standings.json');
    const data = readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('[standings-league] Error loading standings:', error);
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
    const standingsData = loadLeagueStandings();

    if (!standingsData || !standingsData.standings) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Standings not available' })
      };
    }

    // Formatear para compatibilidad con frontend existente
    const formattedStandings = standingsData.standings.map(team => ({
      Pos: team.position,
      Equipo: team.team.name,
      PJ: team.played,
      PG: team.won,
      PE: team.drawn,
      PP: team.lost,
      GF: team.goalsFor,
      GC: team.goalsAgainst,
      DG: team.goalDifference,
      Pts: team.points,
      id_equipo: team.team.id
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(formattedStandings)
    };

  } catch (error) {
    console.error('[standings-league] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server error' })
    };
  }
}
