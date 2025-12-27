/**
 * Script para actualización manual de partidos desde football-data.org
 * Ejecutar: npm run update-matches
 * 
 * Requiere: FOOTBALL_DATA_API_TOKEN como variable de entorno
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'public', 'data');

// Configuración
const API_BASE_URL = 'https://api.football-data.org/v4';
const COMPETITION_ID = 'PD';
const SEASON_YEAR = '2024';

// Constantes de cuotas
const FUERZA_EMPATE = 80;
const MARGEN_CASA = 1.08;
const CUOTA_MAXIMA = 20;

async function fetchMatches(apiToken) {
  const url = `${API_BASE_URL}/competitions/${COMPETITION_ID}/matches?season=${SEASON_YEAR}`;
  
  console.log(`Fetching matches from: ${url}`);
  
  const response = await fetch(url, {
    headers: { 'X-Auth-Token': apiToken }
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${await response.text()}`);
  }
  
  return response.json();
}

function normalizeMatches(apiData) {
  return apiData.matches.map(match => {
    let result = null;
    if (match.score?.winner === 'HOME_TEAM') result = '1';
    else if (match.score?.winner === 'AWAY_TEAM') result = '2';
    else if (match.score?.winner === 'DRAW') result = 'X';
    
    let score = null;
    if (match.score?.fullTime?.home !== null && match.score?.fullTime?.away !== null) {
      score = `${match.score.fullTime.home} - ${match.score.fullTime.away}`;
    }
    
    return {
      id: match.id,
      matchday: match.matchday,
      utcDate: match.utcDate,
      status: match.status,
      homeTeam: { id: match.homeTeam.id, name: match.homeTeam.name },
      awayTeam: { id: match.awayTeam.id, name: match.awayTeam.name },
      score: score,
      result: result
    };
  });
}

function calculateLeagueStandings(matches) {
  const standings = {};
  
  const initTeam = (id, name) => ({
    team: { id, name },
    played: 0, won: 0, drawn: 0, lost: 0,
    goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0
  });
  
  for (const match of matches.filter(m => m.status === 'FINISHED' && m.score)) {
    const homeId = match.homeTeam.id;
    const awayId = match.awayTeam.id;
    
    if (!standings[homeId]) standings[homeId] = initTeam(homeId, match.homeTeam.name);
    if (!standings[awayId]) standings[awayId] = initTeam(awayId, match.awayTeam.name);
    
    const [homeGoals, awayGoals] = match.score.split(' - ').map(n => parseInt(n, 10));
    if (isNaN(homeGoals) || isNaN(awayGoals)) continue;
    
    standings[homeId].played++;
    standings[awayId].played++;
    standings[homeId].goalsFor += homeGoals;
    standings[homeId].goalsAgainst += awayGoals;
    standings[awayId].goalsFor += awayGoals;
    standings[awayId].goalsAgainst += homeGoals;
    
    if (homeGoals > awayGoals) {
      standings[homeId].won++; standings[homeId].points += 3;
      standings[awayId].lost++;
    } else if (homeGoals < awayGoals) {
      standings[awayId].won++; standings[awayId].points += 3;
      standings[homeId].lost++;
    } else {
      standings[homeId].drawn++; standings[awayId].drawn++;
      standings[homeId].points++; standings[awayId].points++;
    }
    
    standings[homeId].goalDifference = standings[homeId].goalsFor - standings[homeId].goalsAgainst;
    standings[awayId].goalDifference = standings[awayId].goalsFor - standings[awayId].goalsAgainst;
  }
  
  return Object.values(standings)
    .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor)
    .map((team, i) => ({ position: i + 1, ...team }));
}

function calculateOdds(standings, match) {
  const strengthMap = {};
  standings.forEach(t => {
    const pts = t.points || 0;
    const dg = t.goalDifference || 0;
    const gf = t.goalsFor || 0;
    strengthMap[t.team.id] = Math.max(1, (pts * 3) + (dg * 2) + gf);
  });
  
  const homeStr = strengthMap[match.homeTeam.id] || 1;
  const awayStr = strengthMap[match.awayTeam.id] || 1;
  const total = homeStr + awayStr + FUERZA_EMPATE;
  
  return {
    home: Math.min(CUOTA_MAXIMA, parseFloat(((1 / (homeStr / total)) * MARGEN_CASA).toFixed(2))),
    draw: Math.min(CUOTA_MAXIMA, parseFloat(((1 / (FUERZA_EMPATE / total)) * MARGEN_CASA).toFixed(2))),
    away: Math.min(CUOTA_MAXIMA, parseFloat(((1 / (awayStr / total)) * MARGEN_CASA).toFixed(2)))
  };
}

function saveJSON(filename, data) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(join(DATA_DIR, filename), JSON.stringify(data, null, 2));
  console.log(`✓ Guardado: ${filename}`);
}

async function main() {
  const apiToken = process.env.FOOTBALL_DATA_API_TOKEN;
  
  if (!apiToken) {
    console.error('Error: Falta FOOTBALL_DATA_API_TOKEN');
    console.log('Uso: FOOTBALL_DATA_API_TOKEN=xxx npm run update-matches');
    process.exit(1);
  }
  
  console.log('Actualizando partidos...\n');
  
  // 1. Fetch y normalizar
  const apiData = await fetchMatches(apiToken);
  const matches = normalizeMatches(apiData);
  console.log(`✓ ${matches.length} partidos obtenidos`);
  
  // 2. Guardar todos los partidos
  saveJSON('all-matches.json', {
    version: '1.0.0',
    competition: 'PD',
    season: '2024',
    updatedAt: new Date().toISOString(),
    matches
  });
  
  // 3. Calcular y guardar clasificación
  const standings = calculateLeagueStandings(matches);
  saveJSON('league-standings.json', {
    version: '1.0.0',
    updatedAt: new Date().toISOString(),
    standings
  });
  console.log(`✓ Clasificación calculada (${standings.length} equipos)`);
  
  // 4. Determinar jornada actual
  const pendingMatchdays = [...new Set(
    matches.filter(m => m.status !== 'FINISHED').map(m => m.matchday)
  )].sort((a, b) => a - b);
  
  const currentMatchday = pendingMatchdays[0] || Math.max(...matches.map(m => m.matchday));
  const currentMatches = matches.filter(m => m.matchday === currentMatchday);
  
  // 5. Añadir cuotas y guardar jornada actual
  const matchesWithOdds = currentMatches.map(m => ({
    ...m,
    odds: calculateOdds(standings, m)
  }));
  
  saveJSON('current-matchday.json', {
    version: '1.0.0',
    matchday: currentMatchday,
    updatedAt: new Date().toISOString(),
    matches: matchesWithOdds
  });
  console.log(`✓ Jornada ${currentMatchday} preparada (${matchesWithOdds.length} partidos)`);
  
  console.log('\n¡Actualización completada!');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
