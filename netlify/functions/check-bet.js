/**
 * Netlify Function: Check Bet
 * Verifica si un jugador ya apostó en una jornada
 */

import { hasPlayerBet } from '../../lib/blob-storage.js';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
};

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
    const params = event.queryStringParameters || {};
    const jugador = params.jugador;
    const jornada = params.jornada;

    if (!jugador || !jornada) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ status: 'error', message: 'Parámetros inválidos' })
      };
    }

    const existe = await hasPlayerBet(jugador, jornada);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ status: 'ok', existe })
    };

  } catch (error) {
    console.error('[check-bet] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ status: 'error', message: 'Server error' })
    };
  }
}
