/**
 * Netlify Function: Matches
 * Lee partidos de current_matchday
 * VERSIÓN CORREGIDA - Formatea fecha y hora correctamente
 */

import { getCurrentMatchdayMatches } from '../../lib/supabase.js';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
};

/**
 * Formatea una fecha al formato D/M/YYYY
 */
function formatDate(dateValue) {
  if (!dateValue) return '-';
  
  // Si ya está en formato D/M/YYYY
  if (typeof dateValue === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateValue)) {
    return dateValue;
  }
  
  // Si es formato ISO o YYYY-MM-DD
  if (typeof dateValue === 'string') {
    // Formato YYYY-MM-DD
    const isoMatch = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      return `${parseInt(day, 10)}/${parseInt(month, 10)}/${year}`;
    }
    
    // Intentar parsear como Date
    try {
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
      }
    } catch (e) {
      // ignorar
    }
  }
  
  return String(dateValue);
}

/**
 * Formatea una hora al formato HH:MM
 */
function formatTime(timeValue) {
  if (!timeValue) return '-';
  
  // Si ya está en formato HH:MM o HH:MM:SS
  if (typeof timeValue === 'string') {
    const timeMatch = timeValue.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      return `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
    }
    
    // Intentar parsear como Date ISO
    try {
      const date = new Date(timeValue);
      if (!isNaN(date.getTime())) {
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      }
    } catch (e) {
      // ignorar
    }
  }
  
  return String(timeValue);
}

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
    const formattedMatches = matches.map(match => {
      return {
        Jornada: jornada || `Regular season - ${matchday}`,
        Fecha: formatDate(match.fecha),
        Hora: formatTime(match.hora),
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
      };
    });

    return { statusCode: 200, headers, body: JSON.stringify(formattedMatches) };

  } catch (error) {
    console.error('[matches] Error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
}