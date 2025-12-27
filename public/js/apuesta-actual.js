/**
 * ============================================
 * APUESTA-ACTUAL.JS
 * ============================================
 * Carga y muestra la apuesta actual del usuario
 * (la última jornada apostada que está en juego)
 */

document.addEventListener('DOMContentLoaded', () => {
  const loadingContainer = document.getElementById('loading-container');
  const apuestaActual = document.getElementById('apuesta-actual');
  
  if (!loadingContainer || !apuestaActual) return;
  
  loadApuestaActual();
});

/**
 * Carga la apuesta actual del usuario
 */
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
    const url = `${API_URLS.historial}?jugador=${encodeURIComponent(jugador)}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      // No hay apuestas
      loadingContainer.classList.add('hidden');
      sinApuestaContainer.classList.remove('hidden');
      return;
    }
    
    // Agrupar por jornada
    const jornadas = {};
    data.forEach(apuesta => {
      const j = apuesta.jornada || 'Sin jornada';
      if (!jornadas[j]) jornadas[j] = [];
      jornadas[j].push(apuesta);
    });
    
    // Obtener la jornada más reciente (número más alto)
    const jornadasOrdenadas = Object.keys(jornadas).sort((a, b) => {
      const numA = parseInt(a) || 0;
      const numB = parseInt(b) || 0;
      return numB - numA;
    });
    
    const jornadaActual = jornadasOrdenadas[0];
    const apuestasJornada = jornadas[jornadaActual];
    
    if (!apuestasJornada || apuestasJornada.length === 0) {
      loadingContainer.classList.add('hidden');
      sinApuestaContainer.classList.remove('hidden');
      return;
    }
    
    // Mostrar número de jornada
    numJornada.textContent = `JORNADA ${jornadaActual}`;
    
    // Calcular resumen
    const datosResumen = apuestasJornada[0];
    const aciertos = datosResumen.acierto_puntos || 0;
    const sumaCuotas = datosResumen.cuota_puntos ? parseFloat(datosResumen.cuota_puntos).toFixed(2).replace('.', ',') : '0,00';
    const puntosObtenidos = datosResumen.resultado_puntos ? parseFloat(datosResumen.resultado_puntos).toFixed(2).replace('.', ',') : '0,00';
    
    // Contar partidos pendientes (sin resultado aún)
    const partidosPendientes = apuestasJornada.filter(a => !a.resultado || a.resultado === '').length;
    const partidosJugados = apuestasJornada.length - partidosPendientes;
    
    resumenApuesta.innerHTML = `
      <div class="resumen-grid">
        <div class="resumen-item">
          <span class="resumen-label">Partidos jugados</span>
          <span class="resumen-value">${partidosJugados} / ${apuestasJornada.length}</span>
        </div>
        <div class="resumen-item">
          <span class="resumen-label">Aciertos</span>
          <span class="resumen-value">${aciertos}</span>
        </div>
        <div class="resumen-item">
          <span class="resumen-label">Suma cuotas</span>
          <span class="resumen-value">${sumaCuotas}</span>
        </div>
        <div class="resumen-item">
          <span class="resumen-label">Puntos</span>
          <span class="resumen-value highlight">${puntosObtenidos}</span>
        </div>
      </div>
    `;
    
    // Renderizar tabla de apuestas
    apuestasJornada.forEach(apuesta => {
      const tr = document.createElement('tr');
      
      // Determinar estado del partido
      const tieneResultado = apuesta.resultado && apuesta.resultado !== '';
      
      // Icono de acierto
      let aciertoIcon = '<span class="estado-pendiente">⏳</span>';
      if (tieneResultado) {
        if (apuesta.acierto === true) {
          aciertoIcon = '<span class="estado-acierto">✅</span>';
          tr.classList.add('fila-acierto');
        } else if (apuesta.acierto === false) {
          aciertoIcon = '<span class="estado-fallo">❌</span>';
          tr.classList.add('fila-fallo');
        }
      }
      
      // Formatear cuota
      const cuotaFormateada = apuesta.cuota ? 
        parseFloat(apuesta.cuota).toFixed(2).replace('.', ',') : '-';
      
      tr.innerHTML = `
        <td>${apuesta.equipo_Local || '-'}</td>
        <td>${apuesta.equipo_Visitante || '-'}</td>
        <td><span class="pronostico-badge">${apuesta.pronostico || '-'}</span></td>
        <td class="cuota-value">${cuotaFormateada}</td>
        <td class="resultado-value">${apuesta.resultado || '<span class="pendiente">Por jugar</span>'}</td>
        <td>${aciertoIcon}</td>
      `;
      
      tablaBody.appendChild(tr);
    });
    
    // Mostrar contenedor
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
