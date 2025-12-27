/**
 * Cliente para la API de football-data.org
 * Incluye manejo de rate limits, reintentos y cache ETag
 */

const FOOTBALL_DATA_BASE_URL = 'https://api.football-data.org/v4';
const COMPETITION_ID = 'PD'; // La Liga
const SEASON_YEAR = '2024';  // Temporada 2024-25

const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2
};

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch con reintentos y backoff exponencial
 */
async function fetchWithRetry(url, options, retries = 0) {
  try {
    const response = await fetch(url, options);
    
    // Rate limited
    if (response.status === 429) {
      if (retries < RETRY_CONFIG.maxRetries) {
        const delay = Math.min(
          RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, retries),
          RETRY_CONFIG.maxDelay
        );
        console.log(`[football-data] Rate limited, waiting ${delay}ms before retry ${retries + 1}`);
        await sleep(delay);
        return fetchWithRetry(url, options, retries + 1);
      }
      throw new Error('Rate limit exceeded after max retries');
    }
    
    return response;
  } catch (error) {
    if (retries < RETRY_CONFIG.maxRetries) {
      const delay = RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, retries);
      console.log(`[football-data] Error: ${error.message}, retrying in ${delay}ms`);
      await sleep(delay);
      return fetchWithRetry(url, options, retries + 1);
    }
    throw error;
  }
}

/**
 * Obtiene todos los partidos de la temporada
 * @param {string} apiToken - Token de API
 * @param {string} [etag] - ETag de la última respuesta para cache
 * @returns {Promise<{data: object|null, etag: string, notModified: boolean}>}
 */
export async function fetchAllMatches(apiToken, etag = null) {
  const url = `${FOOTBALL_DATA_BASE_URL}/competitions/${COMPETITION_ID}/matches?season=${SEASON_YEAR}`;
  
  const headers = {
    'X-Auth-Token': apiToken
  };
  
  if (etag) {
    headers['If-None-Match'] = etag;
  }
  
  console.log(`[football-data] Fetching matches from ${url}`);
  
  const response = await fetchWithRetry(url, { headers });
  
  // Not modified - use cache
  if (response.status === 304) {
    console.log('[football-data] Data not modified (304)');
    return { data: null, etag, notModified: true };
  }
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error ${response.status}: ${errorText}`);
  }
  
  const data = await response.json();
  const newEtag = response.headers.get('ETag') || etag;
  
  console.log(`[football-data] Fetched ${data.matches?.length || 0} matches`);
  
  return { data, etag: newEtag, notModified: false };
}

/**
 * Normaliza los datos de partidos de la API
 * @param {object} apiData - Datos crudos de la API
 * @returns {object[]} - Partidos normalizados
 */
export function normalizeMatches(apiData) {
  if (!apiData?.matches) return [];
  
  return apiData.matches.map(match => {
    // Determinar resultado (1, X, 2)
    let result = null;
    if (match.score?.winner === 'HOME_TEAM') result = '1';
    else if (match.score?.winner === 'AWAY_TEAM') result = '2';
    else if (match.score?.winner === 'DRAW') result = 'X';
    
    // Formatear marcador
    let score = null;
    if (match.score?.fullTime?.home !== null && match.score?.fullTime?.away !== null) {
      score = `${match.score.fullTime.home} - ${match.score.fullTime.away}`;
    }
    
    return {
      id: match.id,
      matchday: match.matchday,
      utcDate: match.utcDate,
      status: match.status,
      homeTeam: {
        id: match.homeTeam.id,
        name: match.homeTeam.name
      },
      awayTeam: {
        id: match.awayTeam.id,
        name: match.awayTeam.name
      },
      score: score,
      result: result,
      rawScore: match.score
    };
  });
}

/**
 * Obtiene la jornada actual basándose en partidos no jugados
 * @param {object[]} matches - Partidos normalizados
 * @returns {number} - Número de jornada actual
 */
export function getCurrentMatchday(matches) {
  // Encontrar la primera jornada con partidos no terminados
  const matchdaysWithPending = matches
    .filter(m => m.status !== 'FINISHED')
    .map(m => m.matchday)
    .filter(md => md !== undefined);
  
  if (matchdaysWithPending.length === 0) {
    // Todos los partidos terminados, devolver la última jornada
    return Math.max(...matches.map(m => m.matchday || 0));
  }
  
  return Math.min(...matchdaysWithPending);
}

/**
 * Filtra partidos por jornada
 * @param {object[]} matches - Partidos normalizados
 * @param {number} matchday - Número de jornada
 * @returns {object[]}
 */
export function getMatchesByMatchday(matches, matchday) {
  return matches.filter(m => m.matchday === matchday);
}
