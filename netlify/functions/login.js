/**
 * Netlify Function: Login
 * Autenticación de usuarios con bcrypt
 */

import bcrypt from 'bcryptjs';
import { readFileSync } from 'fs';
import { join } from 'path';

// Headers CORS
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

// Cargar usuarios (en producción esto vendría de un archivo JSON en el build)
function loadUsers() {
  try {
    // En Netlify Functions, los archivos están en el directorio de la función
    const usersPath = join(process.cwd(), 'public', 'data', 'users.json');
    const data = readFileSync(usersPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('[login] Error loading users:', error);
    // Fallback: usuarios hardcoded para desarrollo
    return { users: [] };
  }
}

export async function handler(event, context) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Solo permitir POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };
  }

  try {
    // Parsear body
    const body = JSON.parse(event.body || '{}');
    const { usuario, contrasena } = body;

    if (!usuario || !contrasena) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Missing credentials' })
      };
    }

    // Cargar usuarios
    const usersData = loadUsers();
    
    // Buscar usuario
    const user = usersData.users.find(
      u => u.username.toLowerCase() === usuario.toLowerCase()
    );

    if (!user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ success: false })
      };
    }

    // Verificar contraseña
    let isValid = false;
    
    if (user.passwordHash) {
      // Contraseña hasheada con bcrypt
      isValid = await bcrypt.compare(contrasena, user.passwordHash);
    } else if (user.password) {
      // Contraseña en texto plano (solo para desarrollo/migración)
      isValid = contrasena === user.password;
    }

    if (isValid) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, usuario: user.username })
      };
    } else {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ success: false })
      };
    }

  } catch (error) {
    console.error('[login] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: 'Server error' })
    };
  }
}
