/**
 * ============================================
 * HISTORIAL.JS
 * ============================================
 * Carga y muestra el historial de apuestas del usuario
 */

document.addEventListener('DOMContentLoaded', () => {
  const loadingContainer = document.getElementById('loading-container');
  const contenedorJornadas = document.getElementById('contenedor-jornadas');
  
  if (!loadingContainer || !contenedorJornadas) return;
  
  loadHistorial();
});

/**
 * Formatea una fecha ISO a formato legible
 */
function formatearFecha(fechaIso) {
  if (!fechaIso) return '-';
  const fecha = new Date(fechaIso);
  return fecha.toLocaleDateString('es-ES');
}

/**
 * Formatea una hora ISO a formato HH:MM
 */
function formatearHora(horaIso) {
  if (!horaIso) return '-';
  const fecha = new Date(horaIso);
  return fecha.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Carga el historial de apuestas del usuario
 */
async function loadHistorial() {
  const loadingContainer = document.getElementById('loading-container');
  const contenedorJornadas = document.getElementById('contenedor-jornadas');
  const jugador = getCurrentUser();
  
  if (!jugador) {
    alert('No has iniciado sesión.');
    window.location.href = 'index.html';
    return;
  }
  
  try {
    const url = `${API_URLS.historial}?jugador=${encodeURIComponent(jugador)}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (!Array.isArray(data)) {
      throw new Error('Formato de datos incorrecto');
    }
    
    if (data.length === 0) {
      loadingContainer.classList.add('hidden');
      contenedorJornadas.classList.remove('hidden');
      contenedorJornadas.innerHTML = `
        <div class="empty-state">
          <div class="icon">📋</div>
          <p>No tienes apuestas registradas todavía.</p>
          <a href="apuestas.html" class="btn mt-md">Realizar primera apuesta</a>
        </div>
      `;
      return;
    }
    
    // Agrupar por jornada
    const jornadas = {};
    data.forEach(apuesta => {
      const j = apuesta.jornada || 'Sin jornada';
      if (!jornadas[j]) jornadas[j] = [];
      jornadas[j].push(apuesta);
    });
    
    // Ordenar jornadas de más reciente a más antigua
    const jornadasOrdenadas = Object.keys(jornadas).sort((a, b) => {
      const numA = parseInt(a) || 0;
      const numB = parseInt(b) || 0;
      return numB - numA;
    });
    
    // Renderizar cada jornada
    jornadasOrdenadas.forEach(jornada => {
      const divJornada = createJornadaBox(jornada, jornadas[jornada]);
      contenedorJornadas.appendChild(divJornada);
    });
    
    // Mostrar contenedor
    loadingContainer.classList.add('hidden');
    contenedorJornadas.classList.remove('hidden');
    
  } catch (error) {
    console.error('Error al obtener historial:', error);
    loadingContainer.innerHTML = `
      <p style="color: var(--text-error);">Error cargando el historial.</p>
      <button class="btn" onclick="location.reload()">Reintentar</button>
    `;
  }
}

/**
 * Crea la caja de una jornada con su resumen y tabla
 */
function createJornadaBox(jornada, apuestas) {
  const divJornada = document.createElement('div');
  divJornada.className = 'jornada-box';
  
  // Cabecera clickable
  const cabecera = document.createElement('button');
  cabecera.className = 'jornada-header';
  cabecera.textContent = `Jornada ${jornada}`;
  
  // Resumen
  const datosResumen = apuestas[0];
  const resumen = document.createElement('div');
  resumen.className = 'jornada-resumen';
  resumen.innerHTML = `
    <div class="resumen-item">
      <span class="label">Partidos acertados</span>
      <span class="value">${datosResumen.acierto_puntos || 0}</span>
    </div>
    <div class="resumen-item">
      <span class="label">Suma de cuotas</span>
      <span class="value">${datosResumen.cuota_puntos ? parseFloat(datosResumen.cuota_puntos).toFixed(2).replace('.', ',') : '0,00'}</span>
    </div>
    <div class="resumen-item">
      <span class="label">Puntos obtenidos</span>
      <span class="value">${datosResumen.resultado_puntos ? parseFloat(datosResumen.resultado_puntos).toFixed(2).replace('.', ',') : '0,00'}</span>
    </div>
  `;
  
  // Tabla de apuestas
  const tabla = document.createElement('table');
  tabla.className = 'tabla-jornada';
  tabla.innerHTML = `
    <thead>
      <tr>
        <th>Local</th>
        <th>Visitante</th>
        <th>Pronóstico</th>
        <th>Acierto</th>
        <th class="hide-mobile">Día</th>
        <th class="hide-mobile">Hora</th>
        <th>Cuota</th>
        <th>Resultado</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  
  const tbody = tabla.querySelector('tbody');
  
  apuestas.forEach(apuesta => {
    const fila = document.createElement('tr');
    
    // Determinar icono de acierto
    let aciertoIcon = '';
    if (apuesta.acierto === true) {
      aciertoIcon = '<span class="acierto-icon correct">✅</span>';
    } else if (apuesta.acierto === false) {
      aciertoIcon = '<span class="acierto-icon incorrect">❌</span>';
    } else {
      aciertoIcon = '<span class="acierto-icon">⏳</span>';
    }
    
    // Formatear cuota con coma
    const cuotaFormateada = apuesta.cuota ? 
      parseFloat(apuesta.cuota).toFixed(2).replace('.', ',') : '-';
    
    fila.innerHTML = `
      <td>${apuesta.equipo_Local || '-'}</td>
      <td>${apuesta.equipo_Visitante || '-'}</td>
      <td><span class="pronostico-badge">${apuesta.pronostico || '-'}</span></td>
      <td>${aciertoIcon}</td>
      <td class="hide-mobile">${formatearFecha(apuesta.dia)}</td>
      <td class="hide-mobile">${formatearHora(apuesta.hora)}</td>
      <td class="cuota-value">${cuotaFormateada}</td>
      <td class="resultado-value">${apuesta.resultado || '-'}</td>
    `;
    
    tbody.appendChild(fila);
  });
  
  // Toggle de visibilidad
  cabecera.addEventListener('click', () => {
    const isOpen = cabecera.classList.contains('open');
    
    if (isOpen) {
      cabecera.classList.remove('open');
      resumen.classList.remove('show');
      tabla.classList.remove('show');
    } else {
      cabecera.classList.add('open');
      resumen.classList.add('show');
      tabla.classList.add('show');
    }
  });
  
  divJornada.appendChild(cabecera);
  divJornada.appendChild(resumen);
  divJornada.appendChild(tabla);
  
  return divJornada;
}
