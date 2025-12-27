/**
 * Script para hashear las contraseñas de usuarios con bcrypt
 * Ejecutar: npm run hash-passwords
 */

import bcrypt from 'bcryptjs';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SALT_ROUNDS = 10;

async function hashPasswords() {
  const usersPath = join(__dirname, '..', 'public', 'data', 'users.json');
  
  console.log('Leyendo archivo de usuarios...');
  const data = JSON.parse(readFileSync(usersPath, 'utf-8'));
  
  let updated = 0;
  
  for (const user of data.users) {
    // Solo hashear si tiene password sin hashear
    if (user.password && !user.passwordHash) {
      console.log(`Hasheando contraseña de ${user.username}...`);
      user.passwordHash = await bcrypt.hash(user.password, SALT_ROUNDS);
      delete user.password; // Eliminar contraseña en texto plano
      updated++;
    }
  }
  
  if (updated > 0) {
    // Actualizar metadata
    data.updatedAt = new Date().toISOString();
    delete data.note; // Eliminar nota sobre contraseñas sin hashear
    
    // Guardar archivo actualizado
    writeFileSync(usersPath, JSON.stringify(data, null, 2));
    console.log(`\n✓ ${updated} contraseñas hasheadas correctamente.`);
  } else {
    console.log('\n✓ Todas las contraseñas ya están hasheadas.');
  }
}

hashPasswords().catch(console.error);
