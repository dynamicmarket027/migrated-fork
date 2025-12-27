/**
 * Netlify Function: Standings League
 * Lee clasificación de La Liga
 */

import { getLeagueStandings } from '../../lib/supabase.js';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
};

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const standings = await getLeagueStandings();

    if (!standings || standings.length === 0) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'No hay clasificación' }) };
    }

    // Formatear para el frontend existente
    const formatted = standings.map(team => ({
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

    return { statusCode: 200, headers, body: JSON.stringify(formatted) };

  } catch (error) {
    console.error('[standings-league] Error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
}
