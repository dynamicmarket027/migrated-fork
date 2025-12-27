/**
 * ============================================
 * CLASIFICACION-JUGADORES.JS
 * ============================================
 * Carga y muestra la clasificación de jugadores
 */

document.addEventListener('DOMContentLoaded', () => {
  const tablaContainer = document.getElementById('tabla-container');
  const loadingContainer = document.getElementById('loading-container');
  const tablaBody = document.getElementById('bodyRows');
  
  if (!tablaContainer || !loadingContainer || !tablaBody) return;
  
  loadClasificacionJugadores();
});

/**
 * Carga los datos de clasificación de jugadores
 */
async function loadClasificacionJugadores() {
  const tablaContainer = document.getElementById('tabla-container');
  const loadingContainer = document.getElementById('loading-container');
  const tablaBody = document.getElementById('bodyRows');
  
  try {
    const response = await fetch(API_URLS.clasificacionJugadores);
    const data = await response.json();
    
    // Ordenar por puntos descendente
    data.sort((a, b) => parseFloat(b["Puntos ganados"]) - parseFloat(a["Puntos ganados"]));
    
    const total = data.length;
    
    data.forEach((row, index) => {
      const tr = document.createElement('tr');
      
      // Asignar clase según posición
      tr.className = getRowClass(index, total);
      
      // Posición
      const tdPosicion = document.createElement('td');
      tdPosicion.textContent = index + 1;
      tr.appendChild(tdPosicion);
      
      // Jugador
      const tdJugador = document.createElement('td');
      tdJugador.textContent = row["Jugador"] || '';
      tr.appendChild(tdJugador);
      
      // Puntos ganados
      const tdPuntos = document.createElement('td');
      const puntos = parseFloat(row["Puntos ganados"]);
      tdPuntos.textContent = isNaN(puntos) ? '0.00' : puntos.toFixed(2);
      tr.appendChild(tdPuntos);
      
      // Aciertos
      const tdAciertos = document.createElement('td');
      tdAciertos.textContent = row["Aciertos"] || 0;
      tr.appendChild(tdAciertos);
      
      // Apuestas realizadas
      const tdApuestas = document.createElement('td');
      tdApuestas.className = 'hide-mobile';
      tdApuestas.textContent = row["Apuestas realizadas"] || 0;
      tr.appendChild(tdApuestas);
      
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
  if (index === 0) return 'fila-oro';
  if (index === 1) return 'fila-plata';
  if (index === 2) return 'fila-bronce';
  if (index >= total - 3) return 'fila-ultima';
  return 'fila-azul';
}
