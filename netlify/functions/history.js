/**
 * Netlify Function: History
 * Devuelve el historial de apuestas de un jugador
 */

import { getPlayerHistory } from '../../lib/blob-storage.js';
import { calculateMatchdayPoints } from '../../lib/compute-standings.js';

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

    if (!jugador) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Falta el parámetro 'jugador'" })
      };
    }

    // Obtener historial del jugador
    const playerHistory = await getPlayerHistory(jugador);

    if (!playerHistory || playerHistory.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify([])
      };
    }

    // Agrupar por jornada y formatear para compatibilidad
    const jornadas = {};

    for (const entry of playerHistory) {
      const matchday = entry.matchday;
      
      if (!jornadas[matchday]) {
        // Calcular resumen si no existe
        const summary = entry.summary || calculateMatchdayPoints(entry.bets || []);
        
        jornadas[matchday] = {
          jornada: matchday.toString(),
          resumen: {
            acierto_puntos: summary.correctCount,
            cuota_puntos: summary.oddsSum,
            resultado_puntos: summary.points
          },
          partidos: []
        };
      }

      // Añadir cada apuesta como "partido"
      for (const bet of entry.bets || []) {
        jornadas[matchday].partidos.push({
          jugador: entry.username,
          jornada: matchday,
          idpartido: bet.matchId,
          equipo_Local: bet.homeTeam,
          equipo_Visitante: bet.awayTeam,
          pronostico: bet.prediction,
          acierto: bet.correct,
          dia: entry.timestamp,
          hora: entry.timestamp,
          cuota: bet.odds,
          resultado: bet.result || '',
          // Añadir resumen a cada partido para compatibilidad
          acierto_puntos: jornadas[matchday].resumen.acierto_puntos,
          cuota_puntos: jornadas[matchday].resumen.cuota_puntos,
          resultado_puntos: jornadas[matchday].resumen.resultado_puntos
        });
      }
    }

    // Ordenar jornadas y devolver
    const result = Object.values(jornadas)
      .sort((a, b) => parseInt(b.jornada) - parseInt(a.jornada));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('[history] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server error' })
    };
  }
}
