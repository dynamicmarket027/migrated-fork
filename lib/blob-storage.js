/**
 * Wrapper para Netlify Blobs
 * Maneja persistencia de apuestas e histórico
 */

import { getStore } from '@netlify/blobs';

// Nombres de stores
const STORES = {
  PREDICTIONS: 'predictions',
  HISTORY: 'history',
  REGISTRY: 'bet-registry',
  CACHE: 'api-cache'
};

// Keys dentro de cada store
const KEYS = {
  CURRENT_PREDICTIONS: 'current',
  ALL_HISTORY: 'all',
  BET_REGISTRY: 'registry',
  MATCHES_ETAG: 'matches-etag'
};

/**
 * Obtiene el store de Netlify Blobs
 */
function getBlobStore(name) {
  return getStore({
    name,
    siteID: process.env.SITE_ID,
    token: process.env.BLOB_READ_WRITE_TOKEN
  });
}

// ============================================
// PREDICCIONES (Apuestas activas de la jornada)
// ============================================

/**
 * Obtiene las apuestas de la jornada actual
 */
export async function getCurrentPredictions() {
  try {
    const store = getBlobStore(STORES.PREDICTIONS);
    const data = await store.get(KEYS.CURRENT_PREDICTIONS, { type: 'json' });
    return data || { matchday: null, predictions: [] };
  } catch (error) {
    console.error('[blobs] Error getting predictions:', error);
    return { matchday: null, predictions: [] };
  }
}

/**
 * Guarda las apuestas de la jornada actual
 */
export async function saveCurrentPredictions(data) {
  try {
    const store = getBlobStore(STORES.PREDICTIONS);
    await store.setJSON(KEYS.CURRENT_PREDICTIONS, data);
    return true;
  } catch (error) {
    console.error('[blobs] Error saving predictions:', error);
    return false;
  }
}

/**
 * Añade una nueva apuesta a la jornada actual
 */
export async function addPrediction(prediction) {
  const current = await getCurrentPredictions();
  
  // Actualizar matchday si es necesario
  if (!current.matchday) {
    current.matchday = prediction.matchday;
  }
  
  current.predictions.push(prediction);
  
  return await saveCurrentPredictions(current);
}

// ============================================
// HISTORIAL (Apuestas de jornadas pasadas)
// ============================================

/**
 * Obtiene todo el histórico de apuestas
 */
export async function getHistory() {
  try {
    const store = getBlobStore(STORES.HISTORY);
    const data = await store.get(KEYS.ALL_HISTORY, { type: 'json' });
    return data || { history: [] };
  } catch (error) {
    console.error('[blobs] Error getting history:', error);
    return { history: [] };
  }
}

/**
 * Guarda el histórico completo
 */
export async function saveHistory(data) {
  try {
    const store = getBlobStore(STORES.HISTORY);
    await store.setJSON(KEYS.ALL_HISTORY, data);
    return true;
  } catch (error) {
    console.error('[blobs] Error saving history:', error);
    return false;
  }
}

/**
 * Mueve las apuestas actuales al histórico
 */
export async function archivePredictions(predictionsWithResults) {
  const historyData = await getHistory();
  
  // Añadir cada apuesta al histórico
  for (const prediction of predictionsWithResults) {
    historyData.history.push(prediction);
  }
  
  // Guardar histórico actualizado
  await saveHistory(historyData);
  
  // Limpiar apuestas actuales
  await saveCurrentPredictions({ matchday: null, predictions: [] });
  
  return true;
}

/**
 * Obtiene el historial de un jugador específico
 */
export async function getPlayerHistory(username) {
  const historyData = await getHistory();
  
  return historyData.history.filter(
    entry => entry.username.toLowerCase() === username.toLowerCase()
  );
}

// ============================================
// REGISTRO DE APUESTAS (evitar duplicados)
// ============================================

/**
 * Obtiene el registro de apuestas realizadas
 */
export async function getBetRegistry() {
  try {
    const store = getBlobStore(STORES.REGISTRY);
    const data = await store.get(KEYS.BET_REGISTRY, { type: 'json' });
    return data || { entries: [] };
  } catch (error) {
    console.error('[blobs] Error getting registry:', error);
    return { entries: [] };
  }
}

/**
 * Guarda el registro de apuestas
 */
export async function saveBetRegistry(data) {
  try {
    const store = getBlobStore(STORES.REGISTRY);
    await store.setJSON(KEYS.BET_REGISTRY, data);
    return true;
  } catch (error) {
    console.error('[blobs] Error saving registry:', error);
    return false;
  }
}

/**
 * Verifica si un jugador ya apostó en una jornada
 */
export async function hasPlayerBet(username, matchday) {
  const registry = await getBetRegistry();
  
  const key = `${username.toLowerCase()}_${matchday}`;
  return registry.entries.includes(key);
}

/**
 * Registra que un jugador apostó en una jornada
 */
export async function registerBet(username, matchday) {
  const registry = await getBetRegistry();
  
  const key = `${username.toLowerCase()}_${matchday}`;
  
  if (!registry.entries.includes(key)) {
    registry.entries.push(key);
    await saveBetRegistry(registry);
  }
  
  return true;
}

// ============================================
// CACHE DE API
// ============================================

/**
 * Obtiene el ETag guardado de la última llamada a la API
 */
export async function getMatchesEtag() {
  try {
    const store = getBlobStore(STORES.CACHE);
    const data = await store.get(KEYS.MATCHES_ETAG, { type: 'json' });
    return data?.etag || null;
  } catch (error) {
    return null;
  }
}

/**
 * Guarda el ETag de la API
 */
export async function saveMatchesEtag(etag) {
  try {
    const store = getBlobStore(STORES.CACHE);
    await store.setJSON(KEYS.MATCHES_ETAG, { etag, updatedAt: new Date().toISOString() });
    return true;
  } catch (error) {
    return false;
  }
}
