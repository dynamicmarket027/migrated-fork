/**
 * Cliente Supabase - Conectado a la nueva estructura
 * Tablas: all_matches, current_matchday, current_predictions, 
 *         predictions_history, points_by_matchday, player_standings, bet_registry
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[supabase] Missing SUPABASE_URL or SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '');

// ============================================
// PARTIDOS - Lee de current_matchday
// ============================================

export async function getCurrentMatchdayMatches() {
  const { data, error } = await supabase
    .from('current_matchday')
    .select('*')
    .order('fecha', { ascending: true })
    .order('hora', { ascending: true });

  if (error) {
    console.error('[supabase] Error getting current matchday:', error);
    return { matchday: null, matches: [] };
  }

  if (!data || data.length === 0) {
    return { matchday: null, matches: [] };
  }

  // Extraer número de jornada
  const jornadaStr = data[0].jornada; // "Regular season - 17"
  const matchdayNum = parseInt(jornadaStr.replace('Regular season - ', ''), 10);

  // Formatear para el frontend
  const matches = data.map(m => ({
    id: m.id_partido,
    matchday: matchdayNum,
    jornada: m.jornada,
    fecha: m.fecha,
    hora: m.hora,
    homeTeam: {
      id: m.id_local,
      name: m.equipo_local
    },
    awayTeam: {
      id: m.id_visitante,
      name: m.equipo_visitante
    },
    status: m.estado,
    score: m.marcador,
    result: m.resultado,
    odds: {
      home: parseFloat(m.cuota_local) || 2.0,
      draw: parseFloat(m.cuota_empate) || 3.25,
      away: parseFloat(m.cuota_visitante) || 3.5
    }
  }));

  return { matchday: matchdayNum, jornada: jornadaStr, matches };
}

// ============================================
// PREDICCIONES - Escribe en current_predictions
// ============================================

export async function addPrediction(prediction) {
  const { username, jornada, bets } = prediction;

  const rows = bets.map(bet => ({
    username: username.toLowerCase(),
    id_partido: bet.matchId,
    jornada: jornada,
    equipo_local: bet.homeTeam,
    equipo_visitante: bet.awayTeam,
    pronostico: bet.prediction,
    cuota: bet.odds
  }));

  const { error } = await supabase
    .from('current_predictions')
    .insert(rows);

  if (error) {
    console.error('[supabase] Error adding prediction:', error);
    throw error;
  }

  return true;
}

export async function getPlayerCurrentPredictions(username) {
  const { data, error } = await supabase
    .from('current_predictions')
    .select('*')
    .eq('username', username.toLowerCase())
    .order('id_partido', { ascending: true });

  if (error) {
    console.error('[supabase] Error getting current predictions:', error);
    return [];
  }

  return data || [];
}

// ============================================
// REGISTRO DE APUESTAS - bet_registry
// ============================================

export async function hasPlayerBet(username, jornada) {
  // jornada puede venir como número (17) o string ("Regular season - 17")
  const jornadaStr = typeof jornada === 'number' 
    ? `Regular season - ${jornada}` 
    : jornada;

  const { data, error } = await supabase
    .from('bet_registry')
    .select('id')
    .eq('username', username.toLowerCase())
    .eq('jornada', jornadaStr)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('[supabase] Error checking bet:', error);
  }

  return !!data;
}

export async function registerBet(username, jornada) {
  const jornadaStr = typeof jornada === 'number' 
    ? `Regular season - ${jornada}` 
    : jornada;

  const { error } = await supabase
    .from('bet_registry')
    .insert({
      username: username.toLowerCase(),
      jornada: jornadaStr
    });

  if (error && error.code !== '23505') { // Ignorar duplicados
    console.error('[supabase] Error registering bet:', error);
    throw error;
  }

  return true;
}

// ============================================
// HISTORIAL - predictions_history
// ============================================

export async function getPlayerHistory(username) {
  const { data, error } = await supabase
    .from('predictions_history')
    .select('*')
    .eq('username', username.toLowerCase())
    .order('jornada', { ascending: false });

  if (error) {
    console.error('[supabase] Error getting history:', error);
    return [];
  }

  return data || [];
}

// ============================================
// PUNTOS POR JORNADA - points_by_matchday
// ============================================

export async function getPointsByMatchday(username) {
  const { data, error } = await supabase
    .from('points_by_matchday')
    .select('*')
    .eq('username', username.toLowerCase())
    .order('jornada', { ascending: false });

  if (error) {
    console.error('[supabase] Error getting points by matchday:', error);
    return [];
  }

  return data || [];
}

// ============================================
// CLASIFICACIÓN JUGADORES - player_standings
// ============================================

export async function getPlayerStandings() {
  const { data, error } = await supabase
    .from('player_standings')
    .select('*')
    .order('posicion', { ascending: true });

  if (error) {
    console.error('[supabase] Error getting player standings:', error);
    return [];
  }

  return data || [];
}

// ============================================
// CLASIFICACIÓN LIGA - league_standings (si existe)
// Si no tienes esta tabla, puedes crearla o dejarla vacía
// ============================================

export async function getLeagueStandings() {
  const { data, error } = await supabase
    .from('league_standings')
    .select('*')
    .order('position', { ascending: true });

  if (error) {
    console.error('[supabase] Error getting league standings:', error);
    return [];
  }

  // Formatear
  return (data || []).map(team => ({
    position: team.position,
    team: {
      id: team.team_id,
      name: team.team_name
    },
    played: team.played,
    won: team.won,
    drawn: team.drawn,
    lost: team.lost,
    goalsFor: team.goals_for,
    goalsAgainst: team.goals_against,
    goalDifference: team.goal_difference,
    points: team.points
  }));
}
