/**
 * ============================================
 * CLASIFICACION-JUGADORES.JS - PREMIUM PODIUM VERSION
 * ============================================
 * Carga y muestra la clasificación con podio destacado
 */

document.addEventListener('DOMContentLoaded', () => {
  loadClasificacionJugadores();
});

/**
 * Carga los datos de clasificación de jugadores
 */
async function loadClasificacionJugadores() {
  const loadingContainer = document.getElementById('loading-container');
  const podiumSection = document.getElementById('podium-section');
  const restSection = document.getElementById('rest-section');
  const playersList = document.getElementById('players-list');
  
  try {
    const response = await fetch(API_URLS.clasificacionJugadores);
    const data = await response.json();
    
    if (!data || data.length === 0) {
      loadingContainer.innerHTML = `
        <p style="color: rgba(255,255,255,0.7);">No hay datos de clasificación disponibles.</p>
        <a href="lobby.html" class="btn-back" style="margin-top: 1rem;">Volver</a>
      `;
      return;
    }
    
    // Ordenar por puntos descendente
    data.sort((a, b) => parseFloat(b["Puntos ganados"]) - parseFloat(a["Puntos ganados"]));
    
    // Populate Top 3 (Podium)
    const top3 = data.slice(0, 3);
    top3.forEach((player, index) => {
      const position = index + 1;
      const name = player["Jugador"] || 'Jugador';
      const points = parseFloat(player["Puntos ganados"]) || 0;
      const hits = player["Aciertos"] || 0;
      
      // Set avatar letter
      const avatarEl = document.getElementById(`avatar-${position}`);
      if (avatarEl) {
        avatarEl.textContent = name.charAt(0).toUpperCase();
      }
      
      // Set name
      const nameEl = document.getElementById(`name-${position}`);
      if (nameEl) {
        nameEl.textContent = name;
      }
      
      // Set points
      const pointsEl = document.getElementById(`points-${position}`);
      if (pointsEl) {
        pointsEl.textContent = formatPoints(points);
      }
      
      // Set hits
      const hitsEl = document.getElementById(`hits-${position}`);
      if (hitsEl) {
        hitsEl.textContent = hits;
      }
    });
    
    // Populate rest of players (4th onwards)
    const restPlayers = data.slice(3);
    restPlayers.forEach((player, index) => {
      const position = index + 4;
      const name = player["Jugador"] || 'Jugador';
      const points = parseFloat(player["Puntos ganados"]) || 0;
      const hits = player["Aciertos"] || 0;
      const bets = player["Apuestas realizadas"] || 0;
      
      const playerRow = createPlayerRow(position, name, points, hits, bets);
      playersList.appendChild(playerRow);
    });
    
    // Show sections with animation
    loadingContainer.classList.add('hidden');
    podiumSection.classList.remove('hidden');
    
    if (restPlayers.length > 0) {
      restSection.classList.remove('hidden');
    }
    
  } catch (error) {
    console.error('Error cargando clasificación:', error);
    loadingContainer.innerHTML = `
      <p style="color: #ef5350;">Error cargando la clasificación.</p>
      <button class="btn-back" onclick="location.reload()" style="margin-top: 1rem;">Reintentar</button>
    `;
  }
}

/**
 * Creates a player row element for players 4th and beyond
 */
function createPlayerRow(position, name, points, hits, bets) {
  const row = document.createElement('div');
  row.className = 'player-row';
  
  row.innerHTML = `
    <div class="player-position">${position}</div>
    <div class="player-avatar-small">${name.charAt(0).toUpperCase()}</div>
    <div class="player-info">
      <p class="player-name">${escapeHtml(name)}</p>
      <p class="player-meta">${hits} aciertos · ${bets} jornadas</p>
    </div>
    <div class="player-points">
      <div class="points-value">${formatPoints(points)}</div>
      <div class="points-label">pts</div>
    </div>
  `;
  
  return row;
}

/**
 * Formats points with Spanish decimal separator
 */
function formatPoints(points) {
  return points.toFixed(2).replace('.', ',');
}

/**
 * Escapes HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}