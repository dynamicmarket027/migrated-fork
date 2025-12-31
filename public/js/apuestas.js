/**
 * ============================================
 * APUESTAS.JS - VERSIÓN MOBILE OPTIMIZED
 * ============================================
 * Cambios:
 * 1. Fecha y hora combinadas en una sola columna
 * 2. Mejor responsive para móvil
 */

const BettingState = {
  isSubmitting: false,
  hasSubmitted: false,
  currentJornada: null,
  matches: []
};

document.addEventListener('DOMContentLoaded', () => {
  const tablaApuestas = document.getElementById('tabla-apuestas');
  const loadingContainer = document.getElementById('loading-container');
  
  if (!tablaApuestas || !loadingContainer) return;
  
  loadMatches();
  setupSubmitButton();
});

async function checkIfAlreadyBet(jornada) {
  const usuario = getCurrentUser();
  if (!usuario || !jornada) return false;
  
  try {
    const url = `${API_URLS.verificarApuesta}?jugador=${encodeURIComponent(usuario)}&jornada=${encodeURIComponent(jornada)}`;
    const response = await fetch(url);
    const data = await response.json();
    return data.hasBet === true;
  } catch (error) {
    console.error('Error verificando apuesta:', error);
    return false;
  }
}

/**
 * Formatea la fecha - acepta varios formatos
 */
function formatearFecha(fecha) {
  if (!fecha || fecha === 'Invalid Date') return '-';
  
  if (typeof fecha === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(fecha)) {
    return fecha;
  }
  
  if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    const parts = fecha.split('-');
    return `${parseInt(parts[2], 10)}/${parseInt(parts[1], 10)}`;
  }
  
  try {
    const date = new Date(fecha);
    if (!isNaN(date.getTime())) {
      const day = date.getDate();
      const month = date.getMonth() + 1;
      return `${day}/${month}`;
    }
  } catch (e) {
    // Ignorar
  }
  
  return fecha;
}

/**
 * Formatea la hora
 */
function formatearHora(hora) {
  if (!hora || hora === 'Invalid Date') return '-';
  
  if (typeof hora === 'string') {
    const match = hora.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      return `${match[1].padStart(2, '0')}:${match[2]}`;
    }
  }
  
  try {
    const date = new Date(hora);
    if (!isNaN(date.getTime())) {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    }
  } catch (e) {
    // Ignorar
  }
  
  return hora;
}

/**
 * Obtiene la ruta del logo para un equipo
 */
function getLogoPath(teamId) {
  const id = parseInt(teamId, 10);
  return `/imagenes/${id}.png`;
}

async function loadMatches() {
  const tablaApuestas = document.getElementById('tabla-apuestas');
  const loadingContainer = document.getElementById('loading-container');
  const tablaBody = document.getElementById('bodyRows');
  const numJornada = document.getElementById('num-jornada');
  const enviarBtn = document.getElementById('enviar-apuestas');
  
  try {
    const response = await fetch(API_URLS.partidos);
    const data = await response.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('No hay partidos disponibles');
    }
    
    BettingState.matches = data;
    
    let jornadaNum = '17';
    if (data[0] && data[0].Jornada) {
      jornadaNum = data[0].Jornada.replace('Regular season - ', '');
      BettingState.currentJornada = jornadaNum;
      if (numJornada) {
        numJornada.textContent = `JORNADA ${jornadaNum}`;
      }
    }
    
    // VERIFICAR SI YA APOSTÓ
    const yaAposto = await checkIfAlreadyBet(jornadaNum);
    if (yaAposto) {
      BettingState.hasSubmitted = true;
      loadingContainer.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">✅</div>
          <p style="color: #4CAF50; font-size: 1.2rem; margin-bottom: 1rem;">
            Ya has enviado tu apuesta para la Jornada ${jornadaNum}
          </p>
          <p style="color: #888; margin-bottom: 1.5rem;">
            Puedes ver tu apuesta en "Ver apuesta actual"
          </p>
          <a href="lobby.html" class="btn" style="display: inline-block; padding: 0.75rem 2rem; background: #4CAF50; color: white; text-decoration: none; border-radius: 8px;">
            Volver al menú
          </a>
        </div>
      `;
      if (enviarBtn) enviarBtn.style.display = 'none';
      return;
    }
    
    // Actualizar cabecera de tabla para columna combinada fecha/hora
    updateTableHeader();
    
    data.forEach((partido, index) => {
      const tr = createMatchRow(partido, index);
      tablaBody.appendChild(tr);
    });
    
    loadingContainer.classList.add('hidden');
    tablaApuestas.classList.remove('hidden');
    if (enviarBtn) {
      enviarBtn.classList.remove('hidden');
      enviarBtn.disabled = false;
    }
    
  } catch (error) {
    console.error('Error cargando partidos:', error);
    loadingContainer.innerHTML = `
      <p style="color: var(--text-error);">Error cargando los partidos.</p>
      <button class="btn" onclick="location.reload()">Reintentar</button>
    `;
  }
}

/**
 * Actualiza la cabecera de la tabla para usar columna combinada
 */
function updateTableHeader() {
  const thead = document.querySelector('#tablaApuestas thead tr');
  if (thead) {
    thead.innerHTML = `
      <th>Fecha</th>
      <th>Local</th>
      <th>Visitante</th>
      <th>Apuesta</th>
    `;
  }
}

function createMatchRow(partido, index) {
  const tr = document.createElement('tr');
  
  // FECHA/HORA COMBINADA
  const tdFechaHora = document.createElement('td');
  tdFechaHora.className = 'datetime-cell';
  const fechaFormateada = formatearFecha(partido.Fecha);
  const horaFormateada = formatearHora(partido.Hora);
  
  const datetimeWrapper = document.createElement('div');
  datetimeWrapper.className = 'datetime-wrapper';
  
  const dateSpan = document.createElement('span');
  dateSpan.className = 'datetime-date';
  dateSpan.textContent = fechaFormateada;
  
  const timeSpan = document.createElement('span');
  timeSpan.className = 'datetime-time';
  timeSpan.textContent = horaFormateada;
  
  datetimeWrapper.appendChild(dateSpan);
  datetimeWrapper.appendChild(timeSpan);
  tdFechaHora.appendChild(datetimeWrapper);
  tr.appendChild(tdFechaHora);
  
  // LOCAL - Con logo
  const tdLocal = document.createElement('td');
  tdLocal.className = 'team-cell';
  
  const localWrapper = document.createElement('div');
  localWrapper.className = 'team-wrapper-vertical';
  
  const imgLocal = document.createElement('img');
  imgLocal.src = getLogoPath(partido.ID_Local);
  imgLocal.alt = partido.Equipo_Local;
  imgLocal.className = 'team-logo';
  imgLocal.onerror = function() { 
    this.style.display = 'none'; 
  };
  
  const spanLocal = document.createElement('span');
  spanLocal.className = 'team-name';
  spanLocal.textContent = partido.Equipo_Local;
  
  localWrapper.appendChild(imgLocal);
  localWrapper.appendChild(spanLocal);
  tdLocal.appendChild(localWrapper);
  tr.appendChild(tdLocal);
  
  // VISITANTE - Con logo
  const tdVisitante = document.createElement('td');
  tdVisitante.className = 'team-cell';
  
  const visitanteWrapper = document.createElement('div');
  visitanteWrapper.className = 'team-wrapper-vertical';
  
  const imgVisitante = document.createElement('img');
  imgVisitante.src = getLogoPath(partido.ID_Visitante);
  imgVisitante.alt = partido.Equipo_Visitante;
  imgVisitante.className = 'team-logo';
  imgVisitante.onerror = function() { 
    this.style.display = 'none';
  };
  
  const spanVisitante = document.createElement('span');
  spanVisitante.className = 'team-name';
  spanVisitante.textContent = partido.Equipo_Visitante;
  
  visitanteWrapper.appendChild(imgVisitante);
  visitanteWrapper.appendChild(spanVisitante);
  tdVisitante.appendChild(visitanteWrapper);
  tr.appendChild(tdVisitante);
  
  // APUESTA - Selector 1/X/2
  const tdApuesta = document.createElement('td');
  const betSelector = createBetSelector(partido, index);
  tdApuesta.appendChild(betSelector);
  tr.appendChild(tdApuesta);
  
  // Data attributes para envío
  tr.dataset.idLocal = partido.ID_Local;
  tr.dataset.idVisitante = partido.ID_Visitante;
  tr.dataset.idPartido = partido.ID_partido;
  tr.dataset.equipoLocal = partido.Equipo_Local;
  tr.dataset.equipoVisitante = partido.Equipo_Visitante;
  tr.dataset.jornada = partido.Jornada.replace('Regular season - ', '');
  
  return tr;
}

function createBetSelector(partido, index) {
  const container = document.createElement('div');
  container.className = 'bet-selector';
  
  const options = [
    { value: '1', cuota: partido.Cuota_Local },
    { value: 'X', cuota: partido.Cuota_Empate },
    { value: '2', cuota: partido.Cuota_Visitante }
  ];
  
  options.forEach(option => {
    const label = document.createElement('label');
    label.className = 'bet-option';
    
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = `apuesta-${index}`;
    radio.value = option.value;
    radio.dataset.cuota = option.cuota;
    
    radio.addEventListener('change', () => {
      container.querySelectorAll('.bet-option').forEach(opt => opt.classList.remove('active'));
      label.classList.add('active');
    });
    
    const valueSpan = document.createElement('span');
    valueSpan.className = 'bet-value';
    valueSpan.textContent = option.value;
    
    const cuotaSpan = document.createElement('span');
    cuotaSpan.className = 'bet-quota';
    cuotaSpan.textContent = parseFloat(option.cuota).toFixed(2).replace('.', ',');
    
    label.appendChild(radio);
    label.appendChild(valueSpan);
    label.appendChild(cuotaSpan);
    container.appendChild(label);
  });
  
  return container;
}

function setupSubmitButton() {
  const enviarBtn = document.getElementById('enviar-apuestas');
  if (!enviarBtn) return;
  enviarBtn.addEventListener('click', handleSubmit);
}

async function handleSubmit() {
  const enviarBtn = document.getElementById('enviar-apuestas');
  
  if (BettingState.isSubmitting) {
    showStatus('Por favor espera...', 'warning');
    return;
  }
  
  if (BettingState.hasSubmitted) {
    showStatus('Ya has enviado tu apuesta para esta jornada.', 'warning');
    return;
  }
  
  const filas = document.querySelectorAll('#bodyRows tr');
  const datosEnviar = [];
  const nombreUsuario = getCurrentUser();
  let apuestasIncompletas = false;
  
  filas.forEach((fila) => {
    const radioSeleccionado = fila.querySelector('input[type="radio"]:checked');
    if (!radioSeleccionado) {
      apuestasIncompletas = true;
    } else {
      datosEnviar.push({
        jugador: nombreUsuario,
        jornada: fila.dataset.jornada,
        idpartido: fila.dataset.idPartido,
        equipo_Local: fila.dataset.equipoLocal,
        equipo_Visitante: fila.dataset.equipoVisitante,
        pronostico: radioSeleccionado.value,
        cuota: radioSeleccionado.dataset.cuota
      });
    }
  });
  
  if (apuestasIncompletas) {
    showStatus('Debes seleccionar un resultado en todos los partidos.', 'error');
    return;
  }
  
  BettingState.isSubmitting = true;
  enviarBtn.disabled = true;
  enviarBtn.textContent = 'Enviando...';
  
  try {
    const response = await fetch(API_URLS.enviarApuestas, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datosEnviar)
    });
    
    const result = await response.json();
    
    if (result.alreadySubmitted) {
      BettingState.hasSubmitted = true;
      enviarBtn.textContent = 'Apuesta ya enviada';
      showStatus('Ya has enviado tu apuesta para esta jornada.', 'warning');
      return;
    }
    
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Error desconocido');
    }
    
    BettingState.hasSubmitted = true;
    BettingState.isSubmitting = false;
    enviarBtn.textContent = '✓ Apuestas Enviadas';
    showStatus('¡Apuestas enviadas correctamente!', 'success');
    
    setTimeout(() => { window.location.href = 'lobby.html'; }, 2000);
    
  } catch (error) {
    console.error('Error al enviar:', error);
    BettingState.isSubmitting = false;
    enviarBtn.disabled = false;
    enviarBtn.textContent = 'Enviar Apuestas';
    showStatus('Error al enviar las apuestas. Inténtalo de nuevo.', 'error');
  }
}

function showStatus(message, type) {
  const statusMessage = document.getElementById('status-message');
  if (!statusMessage) return;
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
  statusMessage.classList.remove('hidden');
  if (type !== 'error') {
    setTimeout(() => statusMessage.classList.add('hidden'), 5000);
  }
}