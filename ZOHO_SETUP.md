# Configuración de Zoho Mail para BSK Motorcycle Team Backend

## Pasos para obtener las credenciales de Zoho Mail

### 1. Registrar la aplicación en Zoho Developer Console

1. Ve a https://accounts.zoho.com/developerconsole
2. Haz clic en **GET STARTED**
3. Selecciona **Server-Based Applications**
4. Completa los siguientes campos:
   - **Client Name**: BSK Motorcycle Team Backend
   - **Homepage URL**: https://api.bskmt.com
   - **Authorized Redirect URIs**: https://api.bskmt.com/auth/zoho/callback
5. Haz clic en **CREATE**
6. Guarda el **Client ID** y **Client Secret** que se generan

### 2. Obtener el Authorization Code

Construye la siguiente URL y ábrela en un navegador (reemplaza `YOUR_CLIENT_ID`):

```
https://accounts.zoho.com/oauth/v2/auth?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=https://api.bskmt.com/auth/zoho/callback&scope=ZohoMail.messages.ALL,ZohoMail.accounts.READ&access_type=offline&prompt=consent
```

**Importante**: 
- `access_type=offline` es necesario para obtener el refresh token
- `prompt=consent` fuerza a mostrar la pantalla de consentimiento cada vez

Después de autorizar, serás redirigido a:
```
https://api.bskmt.com/auth/zoho/callback?code=AUTHORIZATION_CODE&location=us&accounts-server=...
```

Copia el valor del parámetro `code` (AUTHORIZATION_CODE).

### 3. Intercambiar Authorization Code por Access Token y Refresh Token

Usa Postman, curl o cualquier herramienta API para hacer una petición POST:

**Usando curl (Windows PowerShell):**
```powershell
Invoke-WebRequest -Uri "https://accounts.zoho.com/oauth/v2/token" `
  -Method POST `
  -Body @{
    code = "AUTHORIZATION_CODE"
    grant_type = "authorization_code"
    client_id = "YOUR_CLIENT_ID"
    client_secret = "YOUR_CLIENT_SECRET"
    redirect_uri = "https://api.bskmt.com/auth/zoho/callback"
  }
```

**Respuesta esperada:**
```json
{
  "access_token": "1000.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "refresh_token": "1000.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "scope": "ZohoMail.messages.ALL ZohoMail.accounts.READ",
  "api_domain": "https://www.zohoapis.com",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

**Guarda el `refresh_token`** - este es el valor que necesitas en tu `.env` file.

### 4. Obtener el Account ID

Usa el access token obtenido en el paso anterior para obtener la lista de cuentas:

```powershell
$accessToken = "ACCESS_TOKEN_DEL_PASO_ANTERIOR"
Invoke-WebRequest -Uri "https://mail.zoho.com/api/accounts" `
  -Method GET `
  -Headers @{
    "Authorization" = "Zoho-oauthtoken $accessToken"
  }
```

**Respuesta esperada:**
```json
{
  "status": {
    "code": 200,
    "description": "success"
  },
  "data": [
    {
      "accountId": "12345678901234567",
      "accountName": "noreply@bskmt.com",
      "primaryEmailAddress": "noreply@bskmt.com",
      ...
    }
  ]
}
```

Guarda el valor de `accountId`.

### 5. Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto Backend con los siguientes valores:

```env
# Zoho Mail Configuration
ZOHO_CLIENT_ID=1000.XXXXXXXXXXXXXXXXXXXXXX
ZOHO_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ZOHO_REFRESH_TOKEN=1000.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ZOHO_ACCOUNT_ID=12345678901234567
ZOHO_FROM_ADDRESS=noreply@bskmt.com

# Frontend URL
FRONTEND_URL=https://bskmt.com

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here
JWT_REFRESH_EXPIRES_IN=7d
```

### 6. Verificar la Configuración

El EmailService automáticamente:
- Usa el refresh_token para obtener nuevos access_tokens cuando expiran
- Cachea el access_token actual hasta 5 minutos antes de su expiración
- Maneja automáticamente la renovación de tokens

## Scopes Necesarios

El backend utiliza los siguientes scopes de Zoho Mail:

- `ZohoMail.messages.ALL` - Para enviar correos electrónicos
- `ZohoMail.accounts.READ` - Para obtener información de la cuenta

## Tipos de Correos Implementados

### 1. Correo de Verificación (`verification`)
- Enviado automáticamente al registrarse
- Incluye enlace de verificación con token
- Expira en 24 horas

### 2. Correo de Bienvenida (`welcome`)
- Enviado después de verificar el email
- Incluye información de membresía

### 3. Correo de Restablecimiento de Contraseña (`password-reset`)
- Enviado al solicitar restablecer contraseña
- Incluye enlace con token que expira en 1 hora

## Troubleshooting

### Error: "Failed to authenticate with Zoho Mail"
- Verifica que el `ZOHO_REFRESH_TOKEN` sea válido
- Verifica que el `ZOHO_CLIENT_ID` y `ZOHO_CLIENT_SECRET` sean correctos
- Asegúrate de que la aplicación no haya sido revocada en Zoho Developer Console

### Error: "Zoho account ID not configured"
- Verifica que `ZOHO_ACCOUNT_ID` esté configurado en el archivo `.env`
- Obtén el Account ID usando la API "Get All User Accounts"

### Error: "From address not configured"
- Verifica que `ZOHO_FROM_ADDRESS` esté configurado
- Asegúrate de que la dirección de correo esté asociada a tu cuenta de Zoho

### El token de verificación no funciona
- Verifica que `FRONTEND_URL` esté correctamente configurado
- Los tokens de verificación no expiran automáticamente en el backend actual
- Implementar expiración de tokens si es necesario

## Seguridad

⚠️ **Importante:**
- **NUNCA** commits el archivo `.env` a Git
- El `.gitignore` ya debe incluir `.env`
- Usa variables de entorno en producción (Vercel, Heroku, etc.)
- Rota el `client_secret` periódicamente
- Revoca el refresh_token si crees que ha sido comprometido

## Renovación del Refresh Token

El refresh token de Zoho **no expira** a menos que:
1. Lo revoques manualmente
2. El usuario cambie su contraseña de Zoho
3. Haya actividad sospechosa detectada por Zoho

Si necesitas renovar el refresh token, repite los pasos 2 y 3.
