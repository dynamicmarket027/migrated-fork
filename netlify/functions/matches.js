/**
 * Netlify Function: Matches
 * Lee partidos de current_matchday
 */

import { getCurrentMatchdayMatches } from '../../lib/supabase.js';

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
    const { matchday, jornada, matches } = await getCurrentMatchdayMatches();

    if (!matches || matches.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'No hay partidos. Ejecuta SELECT load_next_matchday(); en Supabase' })
      };
    }

    // Formatear para el frontend existente
    const formattedMatches = matches.map(match => ({
      Jornada: jornada || `Regular season - ${matchday}`,
      Fecha: match.fecha,
      Hora: match.hora,
      Equipo_Local: match.homeTeam.name,
      ID_Local: match.homeTeam.id,
      Equipo_Visitante: match.awayTeam.name,
      ID_Visitante: match.awayTeam.id,
      Estado: match.status === 'Match finished' ? 'Match finished' : 'Not started yet',
      Marcador: match.score || '',
      Resultado: match.result || '',
      ID_partido: match.id,
      Cuota_Local: match.odds.home,
      Cuota_Empate: match.odds.draw,
      Cuota_Visitante: match.odds.away
    }));

    return { statusCode: 200, headers, body: JSON.stringify(formattedMatches) };

  } catch (error) {
    console.error('[matches] Error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
}
