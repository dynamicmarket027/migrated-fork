/**
 * Netlify Function: Standings Players
 * Lee de player_standings
 */

import { getPlayerStandings } from '../../lib/supabase.js';

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
    const standings = await getPlayerStandings();

    if (!standings || standings.length === 0) {
      return { statusCode: 200, headers, body: JSON.stringify([]) };
    }

    // Formatear para el frontend existente
    const formatted = standings.map(p => ({
      Posicion: p.posicion,
      Jugador: p.username,
      'Puntos ganados': parseFloat(p.puntos_totales) || 0,
      Aciertos: p.aciertos_totales || 0,
      'Apuestas realizadas': p.jornadas_jugadas || 0
    }));

    return { statusCode: 200, headers, body: JSON.stringify(formatted) };

  } catch (error) {
    console.error('[standings-players] Error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
}
