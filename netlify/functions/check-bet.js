/**
 * Netlify Function: Check Bet
 * Verifica si un jugador ya apostó
 */

import { hasPlayerBet } from '../../lib/supabase.js';

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
    const { jugador, jornada } = event.queryStringParameters || {};

    if (!jugador || !jornada) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Faltan parámetros' }) };
    }

    // Convertir jornada a formato completo
    const jornadaStr = jornada.includes('Regular season') 
      ? jornada 
      : `Regular season - ${jornada}`;

    const hasBet = await hasPlayerBet(jugador, jornadaStr);

    return { statusCode: 200, headers, body: JSON.stringify({ hasBet }) };

  } catch (error) {
    console.error('[check-bet] Error:', error);
    return { statusCode: 200, headers, body: JSON.stringify({ hasBet: false }) };
  }
}
