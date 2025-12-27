/**
 * Netlify Function: Predictions
 * Guarda apuestas en current_predictions
 */

import { hasPlayerBet, registerBet, addPrediction } from '../../lib/supabase.js';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const bets = JSON.parse(event.body || '[]');

    if (!Array.isArray(bets) || bets.length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Datos inválidos' }) };
    }

    const jugador = bets[0].jugador;
    const jornadaNum = bets[0].jornada; // Viene como "17" del frontend
    const jornadaStr = `Regular season - ${jornadaNum}`;

    if (!jugador || !jornadaNum) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Falta jugador o jornada' }) };
    }

    // Verificar si ya apostó
    const alreadyBet = await hasPlayerBet(jugador, jornadaStr);
    if (alreadyBet) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: 'Ya has enviado tu apuesta', alreadySubmitted: true })
      };
    }

    // Formatear predicción para la nueva estructura
    const prediction = {
      username: jugador,
      jornada: jornadaStr,
      bets: bets.map(b => ({
        matchId: parseInt(b.idpartido, 10),
        homeTeam: b.equipo_Local,
        awayTeam: b.equipo_Visitante,
        prediction: b.pronostico,
        odds: parseFloat(String(b.cuota).replace(',', '.'))
      }))
    };

    await addPrediction(prediction);
    await registerBet(jugador, jornadaStr);

    console.log(`[predictions] ${jugador} apostó en ${jornadaStr}`);

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'ok' }) };

  } catch (error) {
    console.error('[predictions] Error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
}
