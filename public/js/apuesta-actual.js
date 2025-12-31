/**
 * ============================================
 * APUESTA-ACTUAL.JS - MOBILE OPTIMIZED
 * ============================================
 * Con logos de equipos y mejor responsive
 */

document.addEventListener('DOMContentLoaded', () => {
  const loadingContainer = document.getElementById('loading-container');
  const apuestaActual = document.getElementById('apuesta-actual');
  
  if (!loadingContainer || !apuestaActual) return;
  
  loadApuestaActual();
});

/**
 * Obtiene la ruta del logo para un equipo
 */
function getLogoPath(teamId) {
  if (!teamId) return null;
  const id = parseInt(teamId, 10);
  if (isNaN(id)) return null;
  return `/imagenes/${id}.png`;
}

async function loadApuestaActual() {
  const loadingContainer = document.getElementById('loading-container');
  const apuestaActualContainer = document.getElementById('apuesta-actual');
  const sinApuestaContainer = document.getElementById('sin-apuesta');
  const tablaBody = document.getElementById('bodyRows');
  const numJornada = document.getElementById('num-jornada');
  const resumenApuesta = document.getElementById('resumen-apuesta');
  
  const jugador = getCurrentUser();
  
  if (!jugador) {
    window.location.href = 'index.html';
    return;
  }
  
  try {
    const url = `${API_URLS.apuestaActual}?jugador=${encodeURIComponent(jugador)}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data || !data.bets || data.bets.length === 0) {
      loadingContainer.classList.add('hidden');
      if (sinApuestaContainer) {
        sinApuestaContainer.classList.remove('hidden');
      } else {
        loadingContainer.innerHTML = `
          <div style="text-align: center; padding: 2rem;">
            <div style="font-size: 3rem; margin-bottom: 1rem;">📋</div>
            <p style="font-size: 1.2rem; margin-bottom: 1rem;">No tienes apuesta activa</p>
            <a href="apuestas.html" class="btn">Realizar apuesta</a>
          </div>
        `;
        loadingContainer.classList.remove('hidden');
      }
      return;
    }
    
    const apuestas = data.bets;
    const jornadaActual = data.matchday;
    
    if (numJornada) {
      numJornada.textContent = `JORNADA ${jornadaActual}`;
    }
    
    // Calcular estadísticas
    let aciertos = 0, fallos = 0, pendientes = 0;
    let sumaCuotasAcertadas = 0;
    
    apuestas.forEach(apuesta => {
      if (apuesta.correct === true) {
        aciertos++;
        sumaCuotasAcertadas += parseFloat(apuesta.odds) || 0;
      } else if (apuesta.correct === false) {
        fallos++;
      } else {
        pendientes++;
      }
    });
    
    // Calcular puntos: aciertos * suma de cuotas acertadas
    const puntosObtenidos = aciertos * sumaCuotasAcertadas;
    
    // Renderizar resumen
    if (resumenApuesta) {
      resumenApuesta.innerHTML = `
        <div class="resumen-grid">
          <div class="resumen-item">
            <span class="resumen-label">Jugados</span>
            <span class="resumen-value">${aciertos + fallos}/${apuestas.length}</span>
          </div>
          <div class="resumen-item">
            <span class="resumen-label">Aciertos</span>
            <span class="resumen-value">${aciertos}</span>
          </div>
          <div class="resumen-item">
            <span class="resumen-label">Σ Cuotas</span>
            <span class="resumen-value">${sumaCuotasAcertadas.toFixed(2).replace('.', ',')}</span>
          </div>
          <div class="resumen-item">
            <span class="resumen-label">Puntos</span>
            <span class="resumen-value highlight">${puntosObtenidos.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>
      `;
    }
    
    // Renderizar cada apuesta
    apuestas.forEach(apuesta => {
      const tr = document.createElement('tr');
      const tieneResultado = apuesta.actualResult && apuesta.actualResult !== '';
      
      // Asignar clase según acierto
      if (tieneResultado) {
        if (apuesta.correct === true) {
          tr.classList.add('fila-acierto');
        } else if (apuesta.correct === false) {
          tr.classList.add('fila-fallo');
        }
      }
      
      // CELDA LOCAL con logo
      const tdLocal = document.createElement('td');
      tdLocal.className = 'team-cell';
      const localWrapper = document.createElement('div');
      localWrapper.className = 'team-wrapper-vertical';
      
      if (apuesta.homeTeamId) {
        const imgLocal = document.createElement('img');
        imgLocal.src = getLogoPath(apuesta.homeTeamId);
        imgLocal.alt = apuesta.homeTeam || '';
        imgLocal.className = 'team-logo';
        imgLocal.onerror = function() { this.style.display = 'none'; };
        localWrapper.appendChild(imgLocal);
      }
      
      const spanLocal = document.createElement('span');
      spanLocal.className = 'team-name';
      spanLocal.textContent = apuesta.homeTeam || '-';
      localWrapper.appendChild(spanLocal);
      tdLocal.appendChild(localWrapper);
      tr.appendChild(tdLocal);
      
      // CELDA VISITANTE con logo
      const tdVisitante = document.createElement('td');
      tdVisitante.className = 'team-cell';
      const visitanteWrapper = document.createElement('div');
      visitanteWrapper.className = 'team-wrapper-vertical';
      
      if (apuesta.awayTeamId) {
        const imgVisitante = document.createElement('img');
        imgVisitante.src = getLogoPath(apuesta.awayTeamId);
        imgVisitante.alt = apuesta.awayTeam || '';
        imgVisitante.className = 'team-logo';
        imgVisitante.onerror = function() { this.style.display = 'none'; };
        visitanteWrapper.appendChild(imgVisitante);
      }
      
      const spanVisitante = document.createElement('span');
      spanVisitante.className = 'team-name';
      spanVisitante.textContent = apuesta.awayTeam || '-';
      visitanteWrapper.appendChild(spanVisitante);
      tdVisitante.appendChild(visitanteWrapper);
      tr.appendChild(tdVisitante);
      
      // PRONÓSTICO
      const tdPronostico = document.createElement('td');
      tdPronostico.innerHTML = `<span class="pronostico-badge">${apuesta.prediction || '-'}</span>`;
      tr.appendChild(tdPronostico);
      
      // CUOTA
      const tdCuota = document.createElement('td');
      tdCuota.className = 'cuota-value';
      tdCuota.textContent = parseFloat(apuesta.odds).toFixed(2).replace('.', ',');
      tr.appendChild(tdCuota);
      
      // RESULTADO
      const tdResultado = document.createElement('td');
      tdResultado.className = 'resultado-value';
      if (tieneResultado) {
        tdResultado.textContent = apuesta.actualResult;
      } else {
        tdResultado.innerHTML = '<span class="pendiente">-</span>';
      }
      tr.appendChild(tdResultado);
      
      // ACIERTO
      const tdAcierto = document.createElement('td');
      let aciertoIcon = '<span class="estado-pendiente">⏳</span>';
      if (tieneResultado) {
        if (apuesta.correct === true) {
          aciertoIcon = '<span class="estado-acierto">✅</span>';
        } else if (apuesta.correct === false) {
          aciertoIcon = '<span class="estado-fallo">❌</span>';
        }
      }
      tdAcierto.innerHTML = aciertoIcon;
      tr.appendChild(tdAcierto);
      
      tablaBody.appendChild(tr);
    });
    
    loadingContainer.classList.add('hidden');
    apuestaActualContainer.classList.remove('hidden');
    
  } catch (error) {
    console.error('Error al cargar apuesta actual:', error);
    loadingContainer.innerHTML = `
      <p style="color: var(--text-error);">Error cargando tu apuesta.</p>
      <button class="btn" onclick="location.reload()">Reintentar</button>
    `;
  }
}