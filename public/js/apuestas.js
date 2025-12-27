/**
 * ============================================
 * APUESTAS.JS
 * ============================================
 * Maneja la carga de partidos y envío de apuestas
 * Incluye protección contra envíos múltiples
 */

// Estado local del módulo
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

/**
 * Carga los partidos de la jornada actual
 */
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
    
    // Guardar jornada actual
    if (data[0] && data[0].Jornada) {
      const jornadaNum = data[0].Jornada.replace('Regular season - ', '');
      BettingState.currentJornada = jornadaNum;
      numJornada.textContent = `JORNADA ${jornadaNum}`;
    }
    
    // Renderizar partidos
    data.forEach((partido, index) => {
      const tr = createMatchRow(partido, index);
      tablaBody.appendChild(tr);
    });
    
    // Mostrar tabla y botón
    loadingContainer.classList.add('hidden');
    tablaApuestas.classList.remove('hidden');
    enviarBtn.classList.remove('hidden');
    enviarBtn.disabled = false;
    
  } catch (error) {
    console.error('Error cargando partidos:', error);
    loadingContainer.innerHTML = `
      <p style="color: var(--text-error);">Error cargando los partidos.</p>
      <button class="btn" onclick="location.reload()">Reintentar</button>
    `;
  }
}

/**
 * Crea una fila de partido con las opciones de apuesta
 */
function createMatchRow(partido, index) {
  const tr = document.createElement('tr');
  
  // Fecha
  const tdFecha = document.createElement('td');
  tdFecha.textContent = new Date(partido.Fecha).toLocaleDateString('es-ES');
  tr.appendChild(tdFecha);
  
  // Hora
  const tdHora = document.createElement('td');
  tdHora.textContent = new Date(partido.Hora).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  });
  tr.appendChild(tdHora);
  
  // Equipo Local
  const tdLocal = document.createElement('td');
  tdLocal.className = 'team-cell';
  
  const imgLocal = document.createElement('img');
  imgLocal.src = `logos/${partido.ID_Local}.png`;
  imgLocal.alt = partido.Equipo_Local;
  imgLocal.title = partido.Equipo_Local;
  imgLocal.onerror = function() { this.style.display = 'none'; };
  
  const spanLocal = document.createElement('span');
  spanLocal.className = 'team-name';
  spanLocal.textContent = partido.Equipo_Local;
  
  tdLocal.appendChild(imgLocal);
  tdLocal.appendChild(spanLocal);
  tr.appendChild(tdLocal);
  
  // Equipo Visitante
  const tdVisitante = document.createElement('td');
  tdVisitante.className = 'team-cell';
  
  const imgVisitante = document.createElement('img');
  imgVisitante.src = `logos/${partido.ID_Visitante}.png`;
  imgVisitante.alt = partido.Equipo_Visitante;
  imgVisitante.title = partido.Equipo_Visitante;
  imgVisitante.onerror = function() { this.style.display = 'none'; };
  
  const spanVisitante = document.createElement('span');
  spanVisitante.className = 'team-name';
  spanVisitante.textContent = partido.Equipo_Visitante;
  
  tdVisitante.appendChild(imgVisitante);
  tdVisitante.appendChild(spanVisitante);
  tr.appendChild(tdVisitante);
  
  // Selector de apuesta (1, X, 2)
  const tdApuesta = document.createElement('td');
  const betSelector = createBetSelector(partido, index);
  tdApuesta.appendChild(betSelector);
  tr.appendChild(tdApuesta);
  
  // Campos ocultos para datos
  tr.dataset.idLocal = partido.ID_Local;
  tr.dataset.idVisitante = partido.ID_Visitante;
  tr.dataset.idPartido = partido.ID_partido;
  tr.dataset.equipoLocal = partido.Equipo_Local;
  tr.dataset.equipoVisitante = partido.Equipo_Visitante;
  tr.dataset.jornada = partido.Jornada.replace('Regular season - ', '');
  
  return tr;
}

/**
 * Crea el selector de apuesta 1-X-2
 */
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
    
    // Evento para actualizar clase visual
    radio.addEventListener('change', () => {
      // Quitar clase active de hermanos
      container.querySelectorAll('.bet-option').forEach(opt => {
        opt.classList.remove('active');
      });
      // Añadir a este
      label.classList.add('active');
    });
    
    const valueSpan = document.createElement('span');
    valueSpan.className = 'bet-value';
    valueSpan.textContent = option.value;
    
    const cuotaSpan = document.createElement('span');
    cuotaSpan.className = 'bet-quota';
    // Formatear cuota con coma decimal
    const cuotaFormateada = parseFloat(option.cuota).toFixed(2).replace('.', ',');
    cuotaSpan.textContent = cuotaFormateada;
    
    label.appendChild(radio);
    label.appendChild(valueSpan);
    label.appendChild(cuotaSpan);
    container.appendChild(label);
  });
  
  return container;
}

/**
 * Configura el botón de envío con protección contra envíos múltiples
 */
function setupSubmitButton() {
  const enviarBtn = document.getElementById('enviar-apuestas');
  
  if (!enviarBtn) return;
  
  enviarBtn.addEventListener('click', handleSubmit);
}

/**
 * Maneja el envío de apuestas
 */
async function handleSubmit() {
  const enviarBtn = document.getElementById('enviar-apuestas');
  const statusMessage = document.getElementById('status-message');
  
  // Verificar si ya se está enviando o ya se envió
  if (BettingState.isSubmitting) {
    showStatus('Por favor espera, se están enviando las apuestas...', 'warning');
    return;
  }
  
  if (BettingState.hasSubmitted) {
    showStatus('Ya has enviado tu apuesta para esta jornada.', 'warning');
    return;
  }
  
  // Recoger datos de las apuestas
  const filas = document.querySelectorAll('#bodyRows tr');
  const datosEnviar = [];
  const ahora = new Date();
  const fechaDia = ahora.toLocaleDateString();
  const fechaHora = ahora.toLocaleTimeString();
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
        acierto: "",
        dia: fechaDia,
        hora: fechaHora,
        cuota: radioSeleccionado.dataset.cuota
      });
    }
  });
  
  // Validar que todas las apuestas están completas
  if (apuestasIncompletas) {
    showStatus('Debes seleccionar un resultado en todos los partidos.', 'error');
    return;
  }
  
  // Bloquear botón y marcar como enviando
  BettingState.isSubmitting = true;
  enviarBtn.disabled = true;
  enviarBtn.textContent = 'Enviando...';
  enviarBtn.classList.add('sending');
  
  try {
    const response = await fetch(API_URLS.enviarApuestas, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(datosEnviar)
    });
    
    const result = await response.json();
    
    // Verificar si ya había enviado
    if (result.alreadySubmitted) {
      BettingState.isSubmitting = false;
      enviarBtn.disabled = false;
      enviarBtn.textContent = 'Enviar Apuestas';
      enviarBtn.classList.remove('sending');
      showStatus('Ya has enviado tu apuesta para esta jornada.', 'warning');
      return;
    }
    
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Error desconocido');
    }
    
    // Marcar como enviado exitosamente
    BettingState.hasSubmitted = true;
    BettingState.isSubmitting = false;
    
    enviarBtn.textContent = '✓ Apuestas Enviadas';
    enviarBtn.classList.remove('sending');
    enviarBtn.classList.add('sent');
    
    showStatus('¡Apuestas enviadas correctamente!', 'success');
    
    // Redirigir después de 2 segundos
    setTimeout(() => {
      window.location.href = 'lobby.html';
    }, 2000);
    
  } catch (error) {
    console.error('Error al enviar:', error);
    
    BettingState.isSubmitting = false;
    enviarBtn.disabled = false;
    enviarBtn.textContent = 'Enviar Apuestas';
    enviarBtn.classList.remove('sending');
    
    showStatus('Error al enviar las apuestas. Inténtalo de nuevo.', 'error');
  }
}

/**
 * Muestra un mensaje de estado
 */
function showStatus(message, type) {
  const statusMessage = document.getElementById('status-message');
  if (!statusMessage) return;
  
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
  statusMessage.classList.remove('hidden');
  
  // Auto-ocultar mensajes de éxito y warning después de 5 segundos
  if (type !== 'error') {
    setTimeout(() => {
      statusMessage.classList.add('hidden');
    }, 5000);
  }
}
