/**
 * Netlify Function: Login
 */

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

const USERS = [
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

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ success: false }) };
  }

  try {
    const { usuario, contrasena } = JSON.parse(event.body || '{}');

    if (!usuario || !contrasena) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false }) };
    }

    const user = USERS.find(u => u.username.toLowerCase() === usuario.toLowerCase());

    if (user && user.password === contrasena) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, usuario: user.username }) };
    }

    return { statusCode: 401, headers, body: JSON.stringify({ success: false }) };

  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ success: false }) };
  }
}
