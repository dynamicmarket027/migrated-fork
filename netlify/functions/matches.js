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
    // IMPORTANTE: Fecha y Hora se envían como strings simples, no como objetos Date
    const formattedMatches = matches.map(match => {
      // La fecha viene como string de Supabase (ej: "5/12/2025" o "2025-12-05")
      let fechaFormateada = match.fecha;
      
      // Si es formato ISO (2025-12-05), convertir a formato español
      if (match.fecha && match.fecha.includes('-')) {
        const parts = match.fecha.split('-');
        if (parts.length === 3) {
          fechaFormateada = `${parseInt(parts[2])}/${parseInt(parts[1])}/${parts[0]}`;
        }
      }
      
      // La hora viene como string (ej: "21:00" o "21:00:00")
      let horaFormateada = match.hora;
      if (match.hora) {
        // Extraer solo HH:MM
        const horaMatch = match.hora.match(/(\d{1,2}):(\d{2})/);
        if (horaMatch) {
          horaFormateada = `${horaMatch[1].padStart(2, '0')}:${horaMatch[2]}`;
        }
      }
      
      return {
        Jornada: jornada || `Regular season - ${matchday}`,
        Fecha: fechaFormateada,  // String: "5/12/2025"
        Hora: horaFormateada,    // String: "21:00"
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