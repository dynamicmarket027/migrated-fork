# Quiniela La Liga - Migración a Netlify

Sistema de quinielas de La Liga migrado de Google Sheets + Apps Script a Netlify + JSON.

## 🚀 Deploy Rápido

### 1. Requisitos previos
- Cuenta de [Netlify](https://netlify.com)
- Token de API de [football-data.org](https://www.football-data.org/) (gratis)
- Node.js 18+

### 2. Configuración

```bash
# Clonar el repositorio
git clone <tu-repo>
cd quiniela-migrated

# Instalar dependencias
npm install

# Hashear contraseñas (¡importante para producción!)
npm run hash-passwords

# (Opcional) Actualizar partidos manualmente
FOOTBALL_DATA_API_TOKEN=tu_token npm run update-matches

# Validar que todo está correcto
npm run validate
```

### 3. Variables de entorno en Netlify

Ve a **Site settings > Environment variables** y añade:

| Variable | Descripción |
|----------|-------------|
| `FOOTBALL_DATA_API_TOKEN` | Token de la API de football-data.org |

### 4. Deploy

```bash
# Con Netlify CLI
netlify deploy --prod

# O simplemente conecta tu repo de GitHub a Netlify
```

## 📁 Estructura del Proyecto

```
quiniela-migrated/
├── netlify.toml              # Configuración de Netlify
├── package.json              # Dependencias Node
│
├── lib/                      # Módulos compartidos
│   ├── football-data.js      # Cliente API football-data.org
│   ├── compute-odds.js       # Cálculo de cuotas
│   ├── compute-standings.js  # Cálculo de clasificaciones
│   └── blob-storage.js       # Wrapper Netlify Blobs
│
├── netlify/functions/        # Serverless functions
│   ├── login.js              # POST /api/login
│   ├── matches.js            # GET /api/matches
│   ├── predictions.js        # POST /api/predictions
│   ├── standings-league.js   # GET /api/standings/league
│   ├── standings-players.js  # GET /api/standings/players
│   ├── history.js            # GET /api/history
│   ├── check-bet.js          # GET /api/check-bet
│   └── scheduled-update.js   # Cron: actualiza partidos
│
├── scripts/                  # Scripts de utilidad
│   ├── hash-passwords.js     # Hashear contraseñas
│   ├── manual-update-matches.js  # Actualizar partidos
│   └── validate-migration.js # Validar migración
│
└── public/                   # Frontend estático
    ├── index.html            # Login
    ├── lobby.html            # Menú principal
    ├── apuestas.html         # Realizar apuestas
    ├── historial.html        # Ver historial
    ├── clasificacion_*.html  # Rankings
    ├── data/                 # Datos JSON
    │   ├── users.json
    │   ├── current-matchday.json
    │   ├── league-standings.json
    │   └── player-standings.json
    ├── js/
    ├── styles/
    └── logos/
```

## ⚙️ Cómo Funciona

### Actualización Automática de Partidos

La función `scheduled-update` se ejecuta cada 15 minutos:

1. Consulta football-data.org (con cache ETag)
2. Actualiza `all-matches.json` y `league-standings.json`
3. Recalcula cuotas para la jornada actual
4. Verifica si la jornada terminó y archiva predicciones
5. Recalcula clasificación de jugadores

### Sistema de Cuotas

Las cuotas se calculan automáticamente basándose en la clasificación:

```
Fuerza del equipo = (Puntos × 3) + (Diferencia de goles × 2) + Goles a favor
```

- Fuerza del empate: 80 (constante)
- Margen de casa: 1.08
- Cuota máxima: 20

### Sistema de Puntuación

```
Puntos por jornada = Aciertos × Suma de cuotas acertadas
```

## 🔌 Endpoints API

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/login` | Autenticación |
| GET | `/api/matches` | Partidos de la jornada actual |
| POST | `/api/predictions` | Enviar apuestas |
| GET | `/api/check-bet?jugador=X&jornada=Y` | Verificar si ya apostó |
| GET | `/api/standings/league` | Clasificación de equipos |
| GET | `/api/standings/players` | Clasificación de jugadores |
| GET | `/api/history?jugador=X` | Historial de un jugador |

## 🛠️ Desarrollo Local

```bash
# Instalar Netlify CLI
npm install -g netlify-cli

# Ejecutar en local
netlify dev

# El sitio estará en http://localhost:8888
```

## 📋 Migrando Datos Existentes

Si tienes datos en Google Sheets:

1. Exporta la clasificación de jugadores a `public/data/player-standings.json`
2. Exporta los usuarios a `public/data/users.json`
3. Ejecuta `npm run hash-passwords`
4. Ejecuta `FOOTBALL_DATA_API_TOKEN=xxx npm run update-matches`

## ⚠️ Notas Importantes

### Seguridad
- Las contraseñas se hashean con bcrypt (10 rounds)
- El token de la API solo está en variables de entorno del servidor
- El frontend nunca ve el token

### Rate Limits
- football-data.org (free): 10 requests/minuto
- Usamos cache ETag para minimizar llamadas
- La scheduled function tiene backoff exponencial

### Persistencia
- **Datos estáticos** (partidos, clasificaciones): JSON en el repo
- **Datos dinámicos** (apuestas): Netlify Blobs

## 🐛 Troubleshooting

### "Error cargando partidos"
- Verifica que `public/data/current-matchday.json` existe
- Ejecuta `npm run update-matches`

### "Usuario o contraseña incorrectos"
- Verifica que el usuario existe en `users.json`
- Ejecuta `npm run hash-passwords` si las contraseñas no están hasheadas

### La scheduled function no se ejecuta
- Verifica que el sitio está publicado (no en draft)
- Revisa los logs en Netlify > Functions

## 📄 Licencia

Uso privado / interno.

---

**Migrado de Google Apps Script a Netlify - Diciembre 2025**
