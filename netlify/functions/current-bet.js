/**
 * Netlify Function: Current Bet
 * Obtiene la apuesta actual del jugador
 */

import { getPlayerCurrentPredictions } from '../../lib/supabase.js';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

export async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { jugador } = event.queryStringParameters || {};

    if (!jugador) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Falta jugador' }) };
    }

    const predictions = await getPlayerCurrentPredictions(jugador);

    if (!predictions || predictions.length === 0) {
      return { statusCode: 200, headers, body: JSON.stringify({ matchday: null, bets: [] }) };
    }

    // Extraer número de jornada
    const jornadaStr = predictions[0].jornada;
    const matchdayNum = parseInt(jornadaStr.replace('Regular season - ', ''), 10);

    const response = {
      matchday: matchdayNum,
      timestamp: predictions[0].created_at,
      bets: predictions.map(p => ({
        matchId: p.id_partido,
        homeTeam: p.equipo_local,
        awayTeam: p.equipo_visitante,
        prediction: p.pronostico,
        odds: parseFloat(p.cuota),
        actualResult: p.resultado_real,
        correct: p.acierto
      }))
    };

    return { statusCode: 200, headers, body: JSON.stringify(response) };

  } catch (error) {
    console.error('[current-bet] Error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
}
