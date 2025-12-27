/**
 * ============================================
 * CLASIFICACION-LIGA.JS
 * ============================================
 * Carga y muestra la clasificación de La Liga
 */

document.addEventListener('DOMContentLoaded', () => {
  const tablaContainer = document.getElementById('tabla-container');
  const loadingContainer = document.getElementById('loading-container');
  const tablaBody = document.getElementById('bodyRows');
  
  if (!tablaContainer || !loadingContainer || !tablaBody) return;
  
  loadClasificacionLiga();
});

/**
 * Carga los datos de clasificación de La Liga
 */
async function loadClasificacionLiga() {
  const tablaContainer = document.getElementById('tabla-container');
  const loadingContainer = document.getElementById('loading-container');
  const tablaBody = document.getElementById('bodyRows');
  
  try {
    const response = await fetch(API_URLS.clasificacionLiga);
    const data = await response.json();
    
    // Los datos ya vienen ordenados por posición normalmente
    const total = data.length;
    
    data.forEach((row, index) => {
      const tr = document.createElement('tr');
      
      // Asignar clase según posición
      tr.className = getRowClass(index, total);
      
      // Posición
      const tdPosicion = document.createElement('td');
      tdPosicion.textContent = index + 1;
      tr.appendChild(tdPosicion);
      
      // Equipo (con logo)
      const tdEquipo = document.createElement('td');
      tdEquipo.className = 'team-cell';
      
      const teamWrapper = document.createElement('div');
      teamWrapper.className = 'team-wrapper';
      
      const img = document.createElement('img');
      img.src = `logos/${row["id_equipo"]}.png`;
      img.alt = row["Equipo"];
      img.title = row["Equipo"];
      img.onerror = function() {
        this.style.display = 'none';
      };
      
      const nombreEquipo = document.createElement('span');
      nombreEquipo.className = 'team-name';
      nombreEquipo.textContent = row["Equipo"];
      
      teamWrapper.appendChild(img);
      teamWrapper.appendChild(nombreEquipo);
      tdEquipo.appendChild(teamWrapper);
      tr.appendChild(tdEquipo);
      
      // PJ - Partidos Jugados
      const tdPJ = document.createElement('td');
      tdPJ.textContent = row["PJ"] || 0;
      tr.appendChild(tdPJ);
      
      // PG - Partidos Ganados
      const tdPG = document.createElement('td');
      tdPG.textContent = row["PG"] || 0;
      tr.appendChild(tdPG);
      
      // PE - Partidos Empatados
      const tdPE = document.createElement('td');
      tdPE.className = 'hide-mobile';
      tdPE.textContent = row["PE"] || 0;
      tr.appendChild(tdPE);
      
      // PP - Partidos Perdidos
      const tdPP = document.createElement('td');
      tdPP.className = 'hide-mobile';
      tdPP.textContent = row["PP"] || 0;
      tr.appendChild(tdPP);
      
      // GF - Goles a Favor
      const tdGF = document.createElement('td');
      tdGF.className = 'hide-mobile';
      tdGF.textContent = row["GF"] || 0;
      tr.appendChild(tdGF);
      
      // GC - Goles en Contra
      const tdGC = document.createElement('td');
      tdGC.className = 'hide-mobile';
      tdGC.textContent = row["GC"] || 0;
      tr.appendChild(tdGC);
      
      // DG - Diferencia de Goles
      const tdDG = document.createElement('td');
      tdDG.textContent = row["DG"] || 0;
      tr.appendChild(tdDG);
      
      // Pts - Puntos
      const tdPts = document.createElement('td');
      tdPts.textContent = row["Pts"] || 0;
      tdPts.style.fontWeight = '600';
      tr.appendChild(tdPts);
      
      tablaBody.appendChild(tr);
    });
    
    // Mostrar tabla y ocultar loader
    loadingContainer.classList.add('hidden');
    tablaContainer.classList.remove('hidden');
    
  } catch (error) {
    console.error('Error cargando clasificación:', error);
    loadingContainer.innerHTML = `
      <p style="color: var(--text-error);">Error cargando la clasificación.</p>
      <button class="btn" onclick="location.reload()">Reintentar</button>
    `;
  }
}

/**
 * Devuelve la clase CSS según la posición
 */
function getRowClass(index, total) {
  if (index < 4) return 'fila-oro'; // Champions
  if (index === 4) return 'fila-plata'; // Europa League
  if (index === 5) return 'fila-bronce'; // Conference League
  if (index >= total - 3) return 'fila-ultima'; // Descenso
  return 'fila-azul';
}
