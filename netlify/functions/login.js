/**
 * Netlify Function: Login
 * Autenticación de usuarios con bcrypt
 */

import bcrypt from 'bcryptjs';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Headers CORS
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

// Usuarios embebidos como fallback (en caso de que no se pueda leer el archivo)
const FALLBACK_USERS = [
  { "username": "p", "password": "soe" },
  { "username": "prueba0", "password": "prueba" },
  { "username": "Elmiguel", "password": "1149" },
  { "username": "Sr.rompeortos", "password": "123456789" },
  { "username": "Pablodom", "password": "1234567Aa" },
  { "username": "Mamuel", "password": "mamadas" },
  { "username": "Mimisiku", "password": "070707" },
  { "username": "Helenanito", "password": "mariamarita" },
  { "username": "Darling", "password": "potota" },
  { "username": "Rey898", "password": "Rey898" },
  { "username": "Milinka", "password": "maik99" },
  { "username": "Oviwan", "password": "12345" },
  { "username": "Play", "password": "0707" },
  { "username": "BetoBetito", "password": "pelele" },
  { "username": "Grandma", "password": "12345" },
  { "username": "Sergiodlc", "password": "JulianArana" },
  { "username": "LuciaSandia", "password": "070707Lucia" },
  { "username": "Acrox98", "password": "12345" },
  { "username": "Pableti", "password": "1010" },
  { "username": "Pa70", "password": "vazquez" },
  { "username": "TomyOne", "password": "asdf8/gh" },
  { "username": "Atorres", "password": "12345" },
  { "username": "fricobets", "password": "12345" },
  { "username": "Riete13", "password": "Mtg1305" },
  { "username": "BailaVini", "password": "yoquese123" }
];

// Cargar usuarios
function loadUsers() {
  const possiblePaths = [
    join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'data', 'users.json'),
    join(process.cwd(), 'public', 'data', 'users.json'),
    join(process.cwd(), 'data', 'users.json'),
  ];

  for (const usersPath of possiblePaths) {
    try {
      if (existsSync(usersPath)) {
        console.log('[login] Loading users from:', usersPath);
        const data = readFileSync(usersPath, 'utf-8');
        const parsed = JSON.parse(data);
        if (parsed.users && parsed.users.length > 0) {
          return parsed;
        }
      }
    } catch (error) {
      console.log('[login] Could not load from:', usersPath, error.message);
    }
  }

  console.log('[login] Using fallback embedded users');
  return { users: FALLBACK_USERS };
}

export async function handler(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { usuario, contrasena } = body;

    if (!usuario || !contrasena) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Missing credentials' })
      };
    }

    const usersData = loadUsers();
    
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

    let isValid = false;
    
    if (user.passwordHash) {
      isValid = await bcrypt.compare(contrasena, user.passwordHash);
    } else if (user.password) {
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
      body: JSON.stringify({ success: false, error: 'Server error', details: error.message })
    };
  }
}