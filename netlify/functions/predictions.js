/**
 * Netlify Function: Predictions
 * Recibe y guarda las apuestas de los usuarios
 */

import { 
  hasPlayerBet, 
  registerBet, 
  addPrediction,
  getCurrentPredictions 
} from '../../lib/blob-storage.js';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

export async function handler(event, context) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Solo POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parsear body
    const bets = JSON.parse(event.body || '[]');

    if (!Array.isArray(bets) || bets.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid data format' })
      };
    }

    // Extraer info del jugador y jornada
    const jugador = bets[0].jugador;
    const jornada = bets[0].jornada;

    if (!jugador || !jornada) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing player or matchday' })
      };
    }

    // Verificar si ya apostó en esta jornada
    const alreadyBet = await hasPlayerBet(jugador, jornada);
    
    if (alreadyBet) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ 
          error: 'Ya has enviado tu apuesta para esta jornada.',
          alreadySubmitted: true 
        })
      };
    }

    // Formatear predicción para guardar
    const prediction = {
      username: jugador,
      matchday: parseInt(jornada, 10),
      timestamp: new Date().toISOString(),
      bets: bets.map(bet => ({
        matchId: parseInt(bet.idpartido, 10),
        homeTeam: bet.equipo_Local,
        awayTeam: bet.equipo_Visitante,
        prediction: bet.pronostico,
        odds: parseFloat(String(bet.cuota).replace(',', '.'))
      }))
    };

    // Guardar apuesta
    const saved = await addPrediction(prediction);
    
    if (!saved) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Error saving prediction' })
      };
    }

    // Registrar en el control de duplicados
    await registerBet(jugador, jornada);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'ok' })
    };

  } catch (error) {
    console.error('[predictions] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server error' })
    };
  }
}
