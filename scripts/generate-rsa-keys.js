#!/usr/bin/env node

/**
 * Script para generar par de llaves RSA para JWT RS256
 * Uso: node scripts/generate-rsa-keys.js
 */

const { generateKeyPairSync } = require('crypto');
const fs = require('fs');
const path = require('path');

// Crear directorio de llaves si no existe
const keysDir = path.join(__dirname, '..', 'keys');
if (!fs.existsSync(keysDir)) {
  fs.mkdirSync(keysDir, { recursive: true });
}

console.log('🔐 Generando par de llaves RSA para JWT RS256...\n');

// Generar par de llaves RSA de 2048 bits
const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem',
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem',
  },
});

// Guardar llave privada
const privateKeyPath = path.join(keysDir, 'jwt-private.key');
fs.writeFileSync(privateKeyPath, privateKey);
console.log(`✅ Llave privada guardada en: ${privateKeyPath}`);

// Guardar llave pública
const publicKeyPath = path.join(keysDir, 'jwt-public.key');
fs.writeFileSync(publicKeyPath, publicKey);
console.log(`✅ Llave pública guardada en: ${publicKeyPath}`);

// Crear versión base64 para .env
const privateKeyBase64 = Buffer.from(privateKey).toString('base64');
const publicKeyBase64 = Buffer.from(publicKey).toString('base64');

// Crear archivo de ejemplo para .env
const envExample = `
# ===============================================
# JWT RSA Keys (RS256)
# ===============================================
# Estas llaves se generaron con: npm run generate:keys
# IMPORTANTE: Mantén JWT_PRIVATE_KEY en secreto absoluto

# Llave privada para FIRMAR tokens (base64)
JWT_PRIVATE_KEY="${privateKeyBase64}"

# Llave pública para VERIFICAR tokens (base64)
JWT_PUBLIC_KEY="${publicKeyBase64}"

# Alternativa: usar archivos (más seguro en producción)
# JWT_PRIVATE_KEY_PATH="./keys/jwt-private.key"
# JWT_PUBLIC_KEY_PATH="./keys/jwt-public.key"

# Configuración JWT
JWT_ALGORITHM=RS256
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
`;

const envKeysPath = path.join(__dirname, '..', '.env.keys.example');
fs.writeFileSync(envKeysPath, envExample.trim());
console.log(`✅ Ejemplo de configuración .env guardado en: ${envKeysPath}\n`);

console.log('📋 INSTRUCCIONES:');
console.log('1. Copia las llaves base64 del archivo .env.keys.example a tu .env');
console.log('2. O configura las rutas de archivos si prefieres usar archivos');
console.log('3. NUNCA compartas JWT_PRIVATE_KEY en control de versiones');
console.log('4. Agrega /keys/*.key y .env.keys.example a .gitignore\n');

// Crear/actualizar .gitignore
const gitignorePath = path.join(__dirname, '..', '.gitignore');
const gitignoreContent = `
# JWT RSA Keys - NO COMPARTIR
keys/
*.key
.env.keys.example
`;

if (fs.existsSync(gitignorePath)) {
  const currentGitignore = fs.readFileSync(gitignorePath, 'utf-8');
  if (!currentGitignore.includes('keys/')) {
    fs.appendFileSync(gitignorePath, gitignoreContent);
    console.log('✅ .gitignore actualizado con reglas de seguridad');
  }
} else {
  fs.writeFileSync(gitignorePath, gitignoreContent.trim());
  console.log('✅ .gitignore creado con reglas de seguridad');
}

console.log('\n🎉 ¡Llaves RSA generadas exitosamente!');
