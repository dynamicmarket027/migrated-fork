/**
 * ============================================
 * AUTH.JS - Módulo de Autenticación
 * ============================================
 * Maneja login, logout y verificación de sesión
 */

// URLs de las APIs - ACTUALIZADAS para Netlify Functions
const API_URLS = {
  login: '/api/login',
  clasificacionJugadores: '/api/standings/players',
  clasificacionLiga: '/api/standings/league',
  partidos: '/api/matches',
  enviarApuestas: '/api/predictions',
  historial: '/api/history',
  verificarApuesta: '/api/check-bet'
};

// Estado de la aplicación
const AppState = {
  isSubmitting: false
};

/**
 * Obtiene el usuario actual del localStorage
 */
function getCurrentUser() {
  return localStorage.getItem('usuario');
}

/**
 * Verifica si el usuario está autenticado
 * Redirige a login si no lo está
 */
function checkAuth() {
  const usuario = getCurrentUser();
  if (!usuario) {
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

/**
 * Actualiza el nombre de usuario en el header
 */
function updateUserDisplay() {
  const nombreUsuarioEl = document.getElementById('nombre-usuario');
  const usuario = getCurrentUser();
  
  if (nombreUsuarioEl && usuario) {
    nombreUsuarioEl.textContent = usuario;
  }
}

/**
 * Maneja el cierre de sesión
 */
function handleLogout() {
  localStorage.removeItem('usuario');
  window.location.href = 'index.html';
}

/**
 * Maneja el login del usuario
 */
async function handleLogin(event) {
  event.preventDefault();
  
  const usuarioInput = document.getElementById('usuario');
  const contrasenaInput = document.getElementById('contrasena');
  const errorMessage = document.getElementById('error-message');
  const loginBtn = document.getElementById('login-btn');
  
  const usuario = usuarioInput.value.trim();
  const contrasena = contrasenaInput.value.trim();
  
  // Limpiar errores previos
  errorMessage.textContent = '';
  
  // Deshabilitar botón durante la petición
  if (loginBtn) {
    loginBtn.disabled = true;
    loginBtn.textContent = 'Entrando...';
  }
  
  try {
    const response = await fetch(API_URLS.login, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ usuario, contrasena })
    });
    
    const data = await response.json();
    
    if (data.success) {
      localStorage.setItem('usuario', usuario);
      window.location.href = 'lobby.html';
    } else {
      errorMessage.textContent = 'Usuario o contraseña incorrectos.';
    }
  } catch (error) {
    console.error('Error de conexión:', error);
    errorMessage.textContent = 'Error de conexión. Inténtalo más tarde.';
  } finally {
    if (loginBtn) {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Entrar';
    }
  }
}

/**
 * Inicialización cuando el DOM está listo
 */
document.addEventListener('DOMContentLoaded', () => {
  // Configurar formulario de login
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
    return; // En la página de login, no verificamos auth
  }
  
  // Para el resto de páginas, verificar autenticación
  if (!checkAuth()) return;
  
  // Actualizar nombre de usuario en header
  updateUserDisplay();
  
  // Configurar botón de cerrar sesión
  const cerrarSesionBtn = document.getElementById('cerrar-sesion');
  if (cerrarSesionBtn) {
    cerrarSesionBtn.addEventListener('click', handleLogout);
  }
});

// Exportar para uso en otros módulos
window.API_URLS = API_URLS;
window.AppState = AppState;
window.getCurrentUser = getCurrentUser;
