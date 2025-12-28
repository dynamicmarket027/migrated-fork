/**
 * ============================================
 * APUESTAS.JS - VERSIÓN CORREGIDA
 * ============================================
 * Correcciones:
 * 1. Manejo correcto de fechas/horas como strings
 * 2. Rutas de logos corregidas
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
 * @param {string} fecha - Puede ser "5/12/2025", "2025-12-05", ISO string, etc.
 * @returns {string} - Fecha formateada en español
 */
function formatearFecha(fecha) {
  if (!fecha) return '-';
  
  // Si ya viene en formato día/mes/año, devolverlo tal cual
  if (typeof fecha === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(fecha)) {
    return fecha;
  }
  
  // Intentar parsear como fecha ISO o similar
  try {
    const date = new Date(fecha);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('es-ES');
    }
  } catch (e) {
    // Ignorar error
  }
  
  // Devolver el valor original si no se puede parsear
  return fecha;
}

/**
 * Formatea la hora - acepta varios formatos
 * @param {string} hora - Puede ser "21:00", "21:00:00", ISO string, etc.
 * @returns {string} - Hora formateada HH:MM
 */
function formatearHora(hora) {
  if (!hora) return '-';
  
  // Si ya viene en formato HH:MM o HH:MM:SS, extraer HH:MM
  if (typeof hora === 'string') {
    const match = hora.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      return `${match[1].padStart(2, '0')}:${match[2]}`;
    }
  }
  
  // Intentar parsear como fecha/hora ISO
  try {
    const date = new Date(hora);
    if (!isNaN(date.getTime())) {
      return date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  } catch (e) {
    // Ignorar error
  }
  
  // Devolver el valor original si no se puede parsear
  return hora;
}

/**
 * Mapeo de IDs de equipo a nombres de archivo de logo
 * Basado en la imagen de logos compartida
 */
const LOGO_MAP = {
  // Athletic Club
  77: '77',
  // Atlético de Madrid  
  78: '78',
  // CA Osasuna
  79: '79',
  // RCD Espanyol
  80: '80',
  // FC Barcelona
  81: '81',
  // Getafe CF
  82: '82',
  // Real Madrid
  86: '86',
  // Rayo Vallecano
  87: '87',
  // Levante UD
  88: '88',
  // RCD Mallorca
  89: '89',
  // Real Betis
  90: '90',
  // Real Sociedad
  92: '92',
  // Villarreal CF
  94: '94',
  // Valencia CF
  95: '95',
  // Real Valladolid
  250: '250',
  // Deportivo Alavés
  263: '263',
  // RC Celta
  264: '558', // Celta usa 558.png según la imagen
  // UD Las Palmas
  275: '275',
  // Real Oviedo (o podría ser Leganés)
  280: '280', 
  // Elche CF
  285: '285',
  // Girona FC
  298: '298',
  // Sevilla FC
  559: '559',
  // CD Leganés
  745: '745',
  // Celta de Vigo (alternativo)
  558: '558',
  // Otros equipos que puedan aparecer
  1048: '1048'
};

/**
 * Obtiene la ruta del logo para un equipo
 * @param {number|string} teamId - ID del equipo
 * @returns {string} - Ruta al archivo de logo
 */
function getLogoPath(teamId) {
  const id = parseInt(teamId, 10);
  const logoFile = LOGO_MAP[id] || id;
  return `logos/${logoFile}.png`;
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
    
    // Debug: ver estructura de datos
    console.log('Datos recibidos:', data[0]);
    
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

function createMatchRow(partido, index) {
  const tr = document.createElement('tr');
  
  // FECHA - Usar función de formateo
  const tdFecha = document.createElement('td');
  tdFecha.textContent = formatearFecha(partido.Fecha);
  tr.appendChild(tdFecha);
  
  // HORA - Usar función de formateo  
  const tdHora = document.createElement('td');
  tdHora.textContent = formatearHora(partido.Hora);
  tr.appendChild(tdHora);
  
  // LOCAL - Con logo
  const tdLocal = document.createElement('td');
  tdLocal.className = 'team-cell';
  
  const imgLocal = document.createElement('img');
  imgLocal.src = getLogoPath(partido.ID_Local);
  imgLocal.alt = partido.Equipo_Local;
  imgLocal.style.height = '40px';
  imgLocal.style.width = '40px';
  imgLocal.style.objectFit = 'contain';
  imgLocal.onerror = function() { 
    this.style.display = 'none'; 
    console.log(`Logo no encontrado: ${this.src}`);
  };
  
  const spanLocal = document.createElement('span');
  spanLocal.className = 'team-name';
  spanLocal.textContent = partido.Equipo_Local;
  
  tdLocal.appendChild(imgLocal);
  tdLocal.appendChild(spanLocal);
  tr.appendChild(tdLocal);
  
  // VISITANTE - Con logo
  const tdVisitante = document.createElement('td');
  tdVisitante.className = 'team-cell';
  
  const imgVisitante = document.createElement('img');
  imgVisitante.src = getLogoPath(partido.ID_Visitante);
  imgVisitante.alt = partido.Equipo_Visitante;
  imgVisitante.style.height = '40px';
  imgVisitante.style.width = '40px';
  imgVisitante.style.objectFit = 'contain';
  imgVisitante.onerror = function() { 
    this.style.display = 'none';
    console.log(`Logo no encontrado: ${this.src}`);
  };
  
  const spanVisitante = document.createElement('span');
  spanVisitante.className = 'team-name';
  spanVisitante.textContent = partido.Equipo_Visitante;
  
  tdVisitante.appendChild(imgVisitante);
  tdVisitante.appendChild(spanVisitante);
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