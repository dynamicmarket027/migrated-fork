/**
 * Script de validación de migración
 * Compara datos del sistema viejo con el nuevo
 * 
 * Uso: npm run validate
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'public', 'data');

function loadJSON(filename) {
  try {
    return JSON.parse(readFileSync(join(DATA_DIR, filename), 'utf-8'));
  } catch {
    return null;
  }
}

function validateUsers() {
  console.log('\n📋 Validando usuarios...');
  const users = loadJSON('users.json');
  
  if (!users || !users.users) {
    console.log('  ❌ No se encontró users.json');
    return false;
  }
  
  const expectedUsers = [
    'Darling', 'BetoBetito', 'Pableti', 'Sr.rompeortos', 'Grandma',
    'Helenanito', 'Rey898', 'Mamuel', 'Play', 'Pa70', 'Mimisiku',
    'LuciaSandia', 'Elmiguel', 'Pablodom', 'Milinka', 'Sergiodlc',
    'Oviwan', 'Riete13', 'Acrox98', 'Atorres', 'BailaVini', 'fricobets', 'TomyOne'
  ];
  
  const foundUsers = users.users.map(u => u.username);
  const missing = expectedUsers.filter(u => !foundUsers.includes(u));
  
  if (missing.length > 0) {
    console.log(`  ⚠️  Usuarios faltantes: ${missing.join(', ')}`);
  }
  
  console.log(`  ✓ ${foundUsers.length} usuarios encontrados`);
  
  // Verificar que tienen contraseña
  const withPassword = users.users.filter(u => u.password || u.passwordHash);
  console.log(`  ✓ ${withPassword.length} usuarios con credenciales`);
  
  return true;
}

function validatePlayerStandings() {
  console.log('\n📊 Validando clasificación de jugadores...');
  const standings = loadJSON('player-standings.json');
  
  if (!standings || !standings.standings) {
    console.log('  ❌ No se encontró player-standings.json');
    return false;
  }
  
  // Datos esperados del sistema viejo
  const expectedTop3 = [
    { username: 'Darling', points: 1060.39 },
    { username: 'BetoBetito', points: 1033.93 },
    { username: 'Pableti', points: 993.25 }
  ];
  
  let errors = 0;
  
  for (let i = 0; i < expectedTop3.length; i++) {
    const expected = expectedTop3[i];
    const actual = standings.standings[i];
    
    if (!actual) {
      console.log(`  ❌ Falta posición ${i + 1}`);
      errors++;
      continue;
    }
    
    if (actual.username !== expected.username) {
      console.log(`  ⚠️  Posición ${i + 1}: esperado ${expected.username}, encontrado ${actual.username}`);
    }
    
    // Comparar puntos con tolerancia
    const pointsDiff = Math.abs(actual.points - expected.points);
    if (pointsDiff > 0.01) {
      console.log(`  ⚠️  ${actual.username}: puntos ${actual.points} vs esperado ${expected.points}`);
    }
  }
  
  console.log(`  ✓ ${standings.standings.length} jugadores en clasificación`);
  console.log(`  ✓ Líder: ${standings.standings[0]?.username} con ${standings.standings[0]?.points} puntos`);
  
  return errors === 0;
}

function validateLeagueStandings() {
  console.log('\n⚽ Validando clasificación de liga...');
  const standings = loadJSON('league-standings.json');
  
  if (!standings || !standings.standings) {
    console.log('  ❌ No se encontró league-standings.json');
    return false;
  }
  
  if (standings.standings.length !== 20) {
    console.log(`  ⚠️  Se esperaban 20 equipos, encontrados ${standings.standings.length}`);
  }
  
  // Verificar estructura
  const first = standings.standings[0];
  const requiredFields = ['position', 'team', 'played', 'won', 'drawn', 'lost', 'goalsFor', 'goalsAgainst', 'goalDifference', 'points'];
  const missingFields = requiredFields.filter(f => !(f in first));
  
  if (missingFields.length > 0) {
    console.log(`  ❌ Campos faltantes: ${missingFields.join(', ')}`);
    return false;
  }
  
  console.log(`  ✓ ${standings.standings.length} equipos en clasificación`);
  console.log(`  ✓ Líder: ${first.team.name} con ${first.points} puntos`);
  
  return true;
}

function validateCurrentMatchday() {
  console.log('\n📅 Validando jornada actual...');
  const matchday = loadJSON('current-matchday.json');
  
  if (!matchday || !matchday.matches) {
    console.log('  ❌ No se encontró current-matchday.json');
    return false;
  }
  
  if (matchday.matches.length !== 10) {
    console.log(`  ⚠️  Se esperaban 10 partidos, encontrados ${matchday.matches.length}`);
  }
  
  // Verificar que cada partido tiene cuotas
  const withOdds = matchday.matches.filter(m => m.odds && m.odds.home && m.odds.draw && m.odds.away);
  
  if (withOdds.length !== matchday.matches.length) {
    console.log(`  ⚠️  ${matchday.matches.length - withOdds.length} partidos sin cuotas`);
  }
  
  console.log(`  ✓ Jornada ${matchday.matchday}`);
  console.log(`  ✓ ${matchday.matches.length} partidos`);
  console.log(`  ✓ ${withOdds.length} partidos con cuotas`);
  
  return true;
}

function validateOddsCalculation() {
  console.log('\n🎰 Validando cálculo de cuotas...');
  const matchday = loadJSON('current-matchday.json');
  
  if (!matchday || !matchday.matches) return false;
  
  let valid = true;
  
  for (const match of matchday.matches) {
    if (!match.odds) continue;
    
    const { home, draw, away } = match.odds;
    
    // Verificar rango válido
    if (home < 1 || draw < 1 || away < 1) {
      console.log(`  ❌ Cuota < 1 en ${match.homeTeam.name} vs ${match.awayTeam.name}`);
      valid = false;
    }
    
    if (home > 20 || draw > 20 || away > 20) {
      console.log(`  ⚠️  Cuota > 20 en ${match.homeTeam.name} vs ${match.awayTeam.name}`);
    }
    
    // El empate suele estar entre 2.5 y 4.5
    if (draw < 2 || draw > 6) {
      console.log(`  ⚠️  Cuota empate inusual (${draw}) en ${match.homeTeam.name} vs ${match.awayTeam.name}`);
    }
  }
  
  if (valid) {
    console.log('  ✓ Todas las cuotas en rango válido');
  }
  
  return valid;
}

// Ejecutar validaciones
console.log('═══════════════════════════════════════════');
console.log('        VALIDACIÓN DE MIGRACIÓN           ');
console.log('═══════════════════════════════════════════');

const results = [
  validateUsers(),
  validatePlayerStandings(),
  validateLeagueStandings(),
  validateCurrentMatchday(),
  validateOddsCalculation()
];

const passed = results.filter(r => r).length;
const total = results.length;

console.log('\n═══════════════════════════════════════════');
console.log(`        RESULTADO: ${passed}/${total} validaciones OK`);
console.log('═══════════════════════════════════════════\n');

process.exit(passed === total ? 0 : 1);
