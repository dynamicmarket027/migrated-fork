/**
 * Cálculo de cuotas basado en la fuerza de los equipos
 * Replica exactamente la lógica del Apps Script original
 */

// Constantes del sistema de cuotas
const FUERZA_EMPATE = 80;
const MARGEN_CASA = 1.08;
const CUOTA_MAXIMA = 20;
const CUOTA_MINIMA_PROBABILIDAD = 0.01;

/**
 * Calcula la fuerza de un equipo basada en su clasificación
 * Fórmula: (Pts * 3) + (DG * 2) + GF
 * 
 * @param {object} teamStanding - Datos de clasificación del equipo
 * @returns {number} - Fuerza del equipo (mínimo 1)
 */
export function calculateTeamStrength(teamStanding) {
  if (!teamStanding) return 1;
  
  const pts = parseFloat(teamStanding.points) || 0;
  const dg = parseFloat(teamStanding.goalDifference) || 0;
  const gf = parseFloat(teamStanding.goalsFor) || 0;
  
  let strength = (pts * 3) + (dg * 2) + gf;
  
  // Asegurar fuerza mínima de 1
  if (isNaN(strength) || strength <= 0) {
    strength = 1;
  }
  
  return strength;
}

/**
 * Calcula las cuotas para un partido
 * 
 * @param {number} homeStrength - Fuerza del equipo local
 * @param {number} awayStrength - Fuerza del equipo visitante
 * @returns {object} - Cuotas { home, draw, away }
 */
export function calculateOdds(homeStrength, awayStrength) {
  const homeStr = homeStrength || 1;
  const awayStr = awayStrength || 1;
  
  const totalStrength = homeStr + awayStr + FUERZA_EMPATE;
  
  // Probabilidades
  const pHome = homeStr / totalStrength;
  const pDraw = FUERZA_EMPATE / totalStrength;
  const pAway = awayStr / totalStrength;
  
  // Cuotas con margen de casa
  let oddsHome = (1 / Math.max(pHome, CUOTA_MINIMA_PROBABILIDAD)) * MARGEN_CASA;
  let oddsDraw = (1 / Math.max(pDraw, CUOTA_MINIMA_PROBABILIDAD)) * MARGEN_CASA;
  let oddsAway = (1 / Math.max(pAway, CUOTA_MINIMA_PROBABILIDAD)) * MARGEN_CASA;
  
  // Limitar a máximo 20
  oddsHome = Math.min(oddsHome, CUOTA_MAXIMA);
  oddsDraw = Math.min(oddsDraw, CUOTA_MAXIMA);
  oddsAway = Math.min(oddsAway, CUOTA_MAXIMA);
  
  return {
    home: parseFloat(oddsHome.toFixed(2)),
    draw: parseFloat(oddsDraw.toFixed(2)),
    away: parseFloat(oddsAway.toFixed(2))
  };
}

/**
 * Añade cuotas a los partidos de una jornada
 * 
 * @param {object[]} matches - Partidos de la jornada
 * @param {object[]} standings - Clasificación de equipos
 * @returns {object[]} - Partidos con cuotas añadidas
 */
export function addOddsToMatches(matches, standings) {
  // Crear mapa de fuerzas por ID de equipo
  const strengthMap = {};
  standings.forEach(team => {
    strengthMap[team.team.id] = calculateTeamStrength(team);
  });
  
  return matches.map(match => {
    const homeStrength = strengthMap[match.homeTeam.id] || 1;
    const awayStrength = strengthMap[match.awayTeam.id] || 1;
    const odds = calculateOdds(homeStrength, awayStrength);
    
    return {
      ...match,
      odds
    };
  });
}

/**
 * Formatea cuota para mostrar con coma decimal (estilo español)
 * @param {number} odds - Cuota numérica
 * @returns {string} - Cuota formateada
 */
export function formatOdds(odds) {
  return parseFloat(odds).toFixed(2).replace('.', ',');
}
