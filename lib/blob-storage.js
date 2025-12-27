/**
 * Wrapper para Netlify Blobs con fallback a archivos locales
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const IS_LOCAL = !process.env.NETLIFY_BLOBS_CONTEXT;
const LOCAL_DATA_DIR = join(process.cwd(), '.local-data');

const STORES = {
  PREDICTIONS: 'predictions',
  HISTORY: 'history',
  REGISTRY: 'bet-registry',
  CACHE: 'api-cache'
};

function ensureLocalDir() {
  if (!existsSync(LOCAL_DATA_DIR)) {
    mkdirSync(LOCAL_DATA_DIR, { recursive: true });
  }
}

function getLocalPath(store, key) {
  return join(LOCAL_DATA_DIR, `${store}-${key}.json`);
}

function localGet(store, key) {
  const path = getLocalPath(store, key);
  if (existsSync(path)) {
    try {
      return JSON.parse(readFileSync(path, 'utf-8'));
    } catch (e) {
      return null;
    }
  }
  return null;
}

function localSet(store, key, data) {
  ensureLocalDir();
  const path = getLocalPath(store, key);
  writeFileSync(path, JSON.stringify(data, null, 2));
  return true;
}

let blobsModule = null;
let blobsAvailable = null;

async function checkBlobsAvailable() {
  if (blobsAvailable !== null) return blobsAvailable;
  
  try {
    blobsModule = await import('@netlify/blobs');
    blobsModule.getStore({ name: 'test' });
    blobsAvailable = true;
  } catch (e) {
    console.log('[storage] Netlify Blobs not available, using local files');
    blobsAvailable = false;
  }
  
  return blobsAvailable;
}

async function getBlobStore(name) {
  const available = await checkBlobsAvailable();
  if (!available) return null;
  
  try {
    return blobsModule.getStore({ name });
  } catch (e) {
    return null;
  }
}

async function getData(store, key, defaultValue = null) {
  if (IS_LOCAL) {
    const data = localGet(store, key);
    return data !== null ? data : defaultValue;
  }
  
  try {
    const blobStore = await getBlobStore(store);
    if (!blobStore) {
      const data = localGet(store, key);
      return data !== null ? data : defaultValue;
    }
    const data = await blobStore.get(key, { type: 'json' });
    return data || defaultValue;
  } catch (error) {
    const data = localGet(store, key);
    return data !== null ? data : defaultValue;
  }
}

async function setData(store, key, data) {
  if (IS_LOCAL) {
    return localSet(store, key, data);
  }
  
  try {
    const blobStore = await getBlobStore(store);
    if (!blobStore) {
      return localSet(store, key, data);
    }
    await blobStore.setJSON(key, data);
    return true;
  } catch (error) {
    return localSet(store, key, data);
  }
}

export async function getCurrentPredictions() {
  return await getData(STORES.PREDICTIONS, 'current', { matchday: null, predictions: [] });
}

export async function saveCurrentPredictions(data) {
  return await setData(STORES.PREDICTIONS, 'current', data);
}

export async function addPrediction(prediction) {
  const current = await getCurrentPredictions();
  if (!current.matchday) {
    current.matchday = prediction.matchday;
  }
  current.predictions.push(prediction);
  return await saveCurrentPredictions(current);
}

export async function getHistory() {
  return await getData(STORES.HISTORY, 'all', { history: [] });
}

export async function saveHistory(data) {
  return await setData(STORES.HISTORY, 'all', data);
}

export async function archivePredictions(predictionsWithResults) {
  const historyData = await getHistory();
  for (const prediction of predictionsWithResults) {
    historyData.history.push(prediction);
  }
  await saveHistory(historyData);
  await saveCurrentPredictions({ matchday: null, predictions: [] });
  return true;
}

export async function getPlayerHistory(username) {
  const historyData = await getHistory();
  return historyData.history.filter(
    entry => entry.username.toLowerCase() === username.toLowerCase()
  );
}

export async function getBetRegistry() {
  return await getData(STORES.REGISTRY, 'registry', { entries: [] });
}

export async function saveBetRegistry(data) {
  return await setData(STORES.REGISTRY, 'registry', data);
}

export async function hasPlayerBet(username, matchday) {
  const registry = await getBetRegistry();
  const key = `${username.toLowerCase()}_${matchday}`;
  return registry.entries.includes(key);
}

export async function registerBet(username, matchday) {
  const registry = await getBetRegistry();
  const key = `${username.toLowerCase()}_${matchday}`;
  if (!registry.entries.includes(key)) {
    registry.entries.push(key);
    await saveBetRegistry(registry);
  }
  return true;
}

export async function getMatchesEtag() {
  const data = await getData(STORES.CACHE, 'matches-etag', null);
  return data?.etag || null;
}

export async function saveMatchesEtag(etag) {
  return await setData(STORES.CACHE, 'matches-etag', { 
    etag, 
    updatedAt: new Date().toISOString() 
  });
}