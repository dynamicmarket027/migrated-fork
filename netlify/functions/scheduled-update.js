/**
 * Netlify Scheduled Function: Update Matches
 * Se ejecuta cada 15 minutos para actualizar datos de partidos
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

import { 
  fetchAllMatches, 
  normalizeMatches, 
  getCurrentMatchday,
  getMatchesByMatchday
} from '../../lib/football-data.js';

import { 
  calculateLeagueStandings,
  calculatePlayerStandings,
  updatePredictionsWithResults,
  isMatchdayComplete
} from '../../lib/compute-standings.js';

import { addOddsToMatches } from '../../lib/compute-odds.js';

import {
  getMatchesEtag,
  saveMatchesEtag,
  getCurrentPredictions,
  archivePredictions,
  getHistory
} from '../../lib/blob-storage.js';

// Directorio de datos
const DATA_DIR = join(process.cwd(), 'public', 'data');

/**
 * Guarda JSON en archivo
 */
function saveDataFile(filename, data) {
  const filePath = join(DATA_DIR, filename);
  
  // Asegurar que el directorio existe
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  
  writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`[scheduled] Saved ${filename}`);
}

/**
 * Carga JSON de archivo
 */
function loadDataFile(filename) {
  try {
    const filePath = join(DATA_DIR, filename);
    const data = readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

export async function handler(event, context) {
  console.log('[scheduled] Starting match update...');
  
  const apiToken = process.env.FOOTBALL_DATA_API_TOKEN;
  
  if (!apiToken) {
    console.error('[scheduled] Missing FOOTBALL_DATA_API_TOKEN');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing API token' })
    };
  }

  try {
    // 1. Obtener ETag guardado
    const savedEtag = await getMatchesEtag();
    
    // 2. Fetch partidos de la API
    const { data, etag, notModified } = await fetchAllMatches(apiToken, savedEtag);
    
    // Si no hay cambios, solo actualizar predicciones con resultados
    if (notModified) {
      console.log('[scheduled] No changes from API, checking predictions...');
      await updatePredictionsAndStandings();
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No changes, predictions updated' })
      };
    }
    
    // 3. Guardar nuevo ETag
    if (etag) {
      await saveMatchesEtag(etag);
    }
    
    // 4. Normalizar partidos
    const matches = normalizeMatches(data);
    console.log(`[scheduled] Normalized ${matches.length} matches`);
    
    // 5. Guardar todos los partidos
    saveDataFile('all-matches.json', {
      version: '1.0.0',
      competition: 'PD',
      season: '2024',
      updatedAt: new Date().toISOString(),
      etag: etag,
      matches: matches
    });
    
    // 6. Calcular clasificación de la liga
    const leagueStandings = calculateLeagueStandings(matches);
    saveDataFile('league-standings.json', {
      version: '1.0.0',
      updatedAt: new Date().toISOString(),
      standings: leagueStandings
    });
    
    // 7. Determinar jornada actual y preparar partidos con cuotas
    const currentMatchday = getCurrentMatchday(matches);
    const currentMatches = getMatchesByMatchday(matches, currentMatchday);
    const matchesWithOdds = addOddsToMatches(currentMatches, leagueStandings);
    
    saveDataFile('current-matchday.json', {
      version: '1.0.0',
      matchday: currentMatchday,
      updatedAt: new Date().toISOString(),
      matches: matchesWithOdds
    });
    
    console.log(`[scheduled] Current matchday: ${currentMatchday} with ${matchesWithOdds.length} matches`);
    
    // 8. Actualizar predicciones y clasificación de jugadores
    await updatePredictionsAndStandings();
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Update successful',
        matchesCount: matches.length,
        currentMatchday: currentMatchday
      })
    };

  } catch (error) {
    console.error('[scheduled] Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}

/**
 * Actualiza predicciones con resultados y recalcula clasificación de jugadores
 */
async function updatePredictionsAndStandings() {
  try {
    // Cargar partidos
    const allMatchesData = loadDataFile('all-matches.json');
    if (!allMatchesData) return;
    
    const matches = allMatchesData.matches;
    
    // Obtener predicciones actuales
    const currentPredictions = await getCurrentPredictions();
    
    if (currentPredictions.predictions.length > 0) {
      const matchday = currentPredictions.matchday;
      const matchdayMatches = getMatchesByMatchday(matches, matchday);
      
      // Verificar si la jornada terminó
      if (isMatchdayComplete(matchdayMatches)) {
        console.log(`[scheduled] Matchday ${matchday} complete, archiving predictions`);
        
        // Actualizar predicciones con resultados
        const updatedPredictions = updatePredictionsWithResults(
          currentPredictions.predictions,
          matchdayMatches
        );
        
        // Mover al histórico
        await archivePredictions(updatedPredictions);
        
        console.log(`[scheduled] Archived ${updatedPredictions.length} predictions`);
      }
    }
    
    // Recalcular clasificación de jugadores
    const historyData = await getHistory();
    const playerStandings = calculatePlayerStandings(historyData.history);
    
    saveDataFile('player-standings.json', {
      version: '1.0.0',
      updatedAt: new Date().toISOString(),
      standings: playerStandings
    });
    
    console.log(`[scheduled] Updated player standings: ${playerStandings.length} players`);
    
  } catch (error) {
    console.error('[scheduled] Error updating predictions:', error);
  }
}
