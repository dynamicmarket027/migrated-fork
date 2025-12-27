/**
 * Netlify Function: History
 * Obtiene historial de predictions_history + points_by_matchday
 */

import { getPlayerHistory, getPointsByMatchday } from '../../lib/supabase.js';

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

    const [history, points] = await Promise.all([
      getPlayerHistory(jugador),
      getPointsByMatchday(jugador)
    ]);

    if (!history || history.length === 0) {
      return { statusCode: 200, headers, body: JSON.stringify([]) };
    }

    // Crear mapa de puntos por jornada
    const pointsMap = {};
    points.forEach(p => {
      pointsMap[p.jornada] = {
        aciertos: p.aciertos,
        suma_cuotas: parseFloat(p.suma_cuotas),
        puntos: parseFloat(p.puntos)
      };
    });

    // Formatear para el frontend existente (estructura plana)
    const result = history.map(entry => {
      const jornadaNum = entry.jornada.replace('Regular season - ', '');
      const pts = pointsMap[entry.jornada] || { aciertos: 0, suma_cuotas: 0, puntos: 0 };
      
      return {
        jornada: jornadaNum,
        acierto_puntos: pts.aciertos,
        cuota_puntos: pts.suma_cuotas,
        resultado_puntos: pts.puntos,
        equipo_Local: entry.equipo_local,
        equipo_Visitante: entry.equipo_visitante,
        pronostico: entry.pronostico,
        cuota: parseFloat(entry.cuota),
        resultado: entry.resultado_real,
        acierto: entry.acierto,
        dia: entry.fecha_apuesta,
        hora: entry.fecha_apuesta
      };
    });

    return { statusCode: 200, headers, body: JSON.stringify(result) };

  } catch (error) {
    console.error('[history] Error:', error);
    return { statusCode: 200, headers, body: JSON.stringify([]) };
  }
}
