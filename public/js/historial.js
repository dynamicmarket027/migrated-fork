/**
 * ============================================
 * HISTORIAL.JS - CON ESCUDOS DE EQUIPOS
 * ============================================
 * Actualizado para mostrar logos de equipos
 */

document.addEventListener('DOMContentLoaded', () => {
  const loadingContainer = document.getElementById('loading-container');
  const contenedorJornadas = document.getElementById('contenedor-jornadas');
  
  if (!loadingContainer || !contenedorJornadas) return;
  
  loadHistorial();
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

/**
 * Mapa de nombres de equipos a IDs
 * Necesario porque el historial no tiene IDs
 */
const TEAM_IDS = {
  'FC Barcelona': 81,
  'Barcelona': 81,
  'Real Madrid CF': 86,
  'Real Madrid': 86,
  'Atlético de Madrid': 78,
  'Atletico Madrid': 78,
  'Athletic Club': 77,
  'Athletic Bilbao': 77,
  'Real Sociedad': 92,
  'Real Betis': 90,
  'Betis': 90,
  'Villarreal CF': 94,
  'Villarreal': 94,
  'Sevilla FC': 559,
  'Sevilla': 559,
  'Valencia CF': 95,
  'Valencia': 95,
  'Getafe CF': 82,
  'Getafe': 82,
  'CA Osasuna': 79,
  'Osasuna': 79,
  'RC Celta de Vigo': 558,
  'Celta Vigo': 558,
  'Celta': 558,
  'RCD Mallorca': 89,
  'Mallorca': 89,
  'Rayo Vallecano': 87,
  'Rayo': 87,
  'UD Las Palmas': 275,
  'Las Palmas': 275,
  'Deportivo Alavés': 263,
  'Alaves': 263,
  'RCD Espanyol': 80,
  'Espanyol': 80,
  'Real Valladolid CF': 250,
  'Valladolid': 250,
  'CD Leganés': 745,
  'Leganes': 745,
  'Girona FC': 298,
  'Girona': 298
};

/**
 * Obtiene el ID de un equipo por su nombre
 */
function getTeamIdByName(teamName) {
  if (!teamName) return null;
  
  // Buscar coincidencia exacta
  if (TEAM_IDS[teamName]) {
    return TEAM_IDS[teamName];
  }
  
  // Buscar coincidencia parcial
  const normalizedName = teamName.toLowerCase().trim();
  for (const [name, id] of Object.entries(TEAM_IDS)) {
    if (name.toLowerCase().includes(normalizedName) || 
        normalizedName.includes(name.toLowerCase())) {
      return id;
    }
  }
  
  return null;
}

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
 * Crea la celda de equipo con logo
 */
function createTeamCell(teamName) {
  const td = document.createElement('td');
  td.className = 'team-cell';
  
  const wrapper = document.createElement('div');
  wrapper.className = 'team-with-logo';
  
  const teamId = getTeamIdByName(teamName);
  
  if (teamId) {
    const img = document.createElement('img');
    img.src = getLogoPath(teamId);
    img.alt = teamName || '';
    img.className = 'team-logo';
    img.onerror = function() { 
      this.style.display = 'none'; 
    };
    wrapper.appendChild(img);
  }
  
  const nameSpan = document.createElement('span');
  nameSpan.className = 'team-name';
  nameSpan.textContent = teamName || '-';
  wrapper.appendChild(nameSpan);
  
  td.appendChild(wrapper);
  return td;
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
      <span class="label">Aciertos</span>
      <span class="value">${datosResumen.acierto_puntos || 0}</span>
    </div>
    <div class="resumen-item">
      <span class="label">Suma cuotas</span>
      <span class="value">${datosResumen.cuota_puntos ? parseFloat(datosResumen.cuota_puntos).toFixed(2).replace('.', ',') : '0,00'}</span>
    </div>
    <div class="resumen-item">
      <span class="label">Puntos</span>
      <span class="value">${datosResumen.resultado_puntos ? parseFloat(datosResumen.resultado_puntos).toFixed(2).replace('.', ',') : '0,00'}</span>
    </div>
  `;
  
  // Tabla de apuestas (con escudos)
  const tabla = document.createElement('table');
  tabla.className = 'tabla-jornada';
  tabla.innerHTML = `
    <thead>
      <tr>
        <th>Local</th>
        <th>Visitante</th>
        <th>Pron.</th>
        <th>Res.</th>
        <th>Cuota</th>
        <th></th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  
  const tbody = tabla.querySelector('tbody');
  
  apuestas.forEach(apuesta => {
    const fila = document.createElement('tr');
    
    // Equipo Local con logo
    const tdLocal = createTeamCell(apuesta.equipo_Local);
    fila.appendChild(tdLocal);
    
    // Equipo Visitante con logo
    const tdVisitante = createTeamCell(apuesta.equipo_Visitante);
    fila.appendChild(tdVisitante);
    
    // Pronóstico
    const tdPronostico = document.createElement('td');
    tdPronostico.innerHTML = `<span class="pronostico-badge">${apuesta.pronostico || '-'}</span>`;
    fila.appendChild(tdPronostico);
    
    // Resultado
    const tdResultado = document.createElement('td');
    tdResultado.className = 'resultado-value';
    tdResultado.textContent = apuesta.resultado || '-';
    fila.appendChild(tdResultado);
    
    // Cuota
    const tdCuota = document.createElement('td');
    tdCuota.className = 'cuota-value';
    tdCuota.textContent = apuesta.cuota ? 
      parseFloat(apuesta.cuota).toFixed(2).replace('.', ',') : '-';
    fila.appendChild(tdCuota);
    
    // Acierto icon
    const tdAcierto = document.createElement('td');
    let aciertoIcon = '';
    if (apuesta.acierto === true) {
      aciertoIcon = '<span class="acierto-icon correct">✅</span>';
    } else if (apuesta.acierto === false) {
      aciertoIcon = '<span class="acierto-icon incorrect">❌</span>';
    } else {
      aciertoIcon = '<span class="acierto-icon">⏳</span>';
    }
    tdAcierto.innerHTML = aciertoIcon;
    fila.appendChild(tdAcierto);
    
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