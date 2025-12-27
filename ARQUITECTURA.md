# Arquitectura de Migración: Quiniela La Liga

## 1. RESUMEN DE ARQUITECTURA ACTUAL (Inferida)

### 1.1 Componentes Actuales

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ARQUITECTURA ACTUAL                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐         ┌─────────────────────────────────────┐  │
│  │   Frontend   │ ──────> │    Google Apps Script (endpoints)   │  │
│  │  HTML/JS/CSS │         │                                     │  │
│  │   (Netlify)  │         │  • Login (maestro-jugadores)        │  │
│  └──────────────┘         │  • GET partidos (bets-matches)      │  │
│                           │  • POST apuestas (bets-prognostics) │  │
│                           │  • GET clasificación jugadores      │  │
│                           │  • GET clasificación liga           │  │
│                           │  • GET historial                    │  │
│                           └─────────────────────────────────────┘  │
│                                          │                          │
│                                          ▼                          │
│                           ┌─────────────────────────────────────┐  │
│                           │       Google Sheets (4 hojas)       │  │
│                           │                                     │  │
│                           │  1. partidos (football-data.org)    │  │
│                           │  2. apuestas (pronósticos actuales) │  │
│                           │  3. historico (apuestas pasadas)    │  │
│                           │  4. usuarios (login)                │  │
│                           │  5. liga (clasificación equipos)    │  │
│                           │  6. puntos_por_jornada              │  │
│                           │  7. Total (clasificación jugadores) │  │
│                           └─────────────────────────────────────┘  │
│                                          ▲                          │
│                                          │                          │
│                           ┌─────────────────────────────────────┐  │
│                           │   football-data.org API             │  │
│                           │   (actualización periódica)         │  │
│                           └─────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Flujo de Datos Actual

1. **Obtención de partidos**: Apps Script consulta football-data.org → escribe en Sheet "partidos"
2. **Login**: Frontend → Apps Script → Sheet "usuarios" → respuesta JSON
3. **Cargar partidos**: Frontend → Apps Script → Sheet "matches" → JSON con cuotas calculadas
4. **Enviar apuestas**: Frontend → Apps Script → Sheet "apuestas" + Sheet "VerificarJornadas"
5. **Calcular clasificación**: Apps Script interno → Sheet "liga" (equipos) / Sheet "Total" (jugadores)
6. **Historial**: Frontend → Apps Script → Sheet "historico" + "puntos_por_jornada"

### 1.3 Lógica de Negocio Identificada

#### Sistema de Cuotas
```javascript
// Fuerza del equipo = (Pts * 3) + (DG * 2) + GF
// fuerzaEmpate = 80 (constante)
// margenCasa = 1.08

totalFuerza = fuerzaLocal + fuerzaVisitante + fuerzaEmpate;
pLocal = fuerzaLocal / totalFuerza;
cuotaLocal = (1 / pLocal) * margenCasa;  // Max 20
```

#### Sistema de Puntuación
```javascript
// Por cada jornada del jugador:
puntos = aciertos * sumaCuotasAcertadas
```

#### Clasificación Liga (Desempate)
1. Puntos (Pts)
2. Diferencia de goles (DG)
3. Goles a favor (GF)

#### Validaciones
- Un jugador solo puede apostar una vez por jornada
- Registro en tabla "VerificarJornadas"

---

## 2. ARQUITECTURA NUEVA PROPUESTA

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ARQUITECTURA NUEVA                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐         ┌─────────────────────────────────────┐  │
│  │   Frontend   │ ──────> │      Netlify Functions (Node.js)    │  │
│  │  HTML/JS/CSS │         │                                     │  │
│  │   (Netlify)  │         │  • /api/login                       │  │
│  │              │<──JSON──│  • /api/matches                     │  │
│  │  + archivos  │         │  • /api/predictions (POST)          │  │
│  │  JSON static │         │  • /api/standings/players           │  │
│  └──────────────┘         │  • /api/standings/league            │  │
│         │                 │  • /api/history                     │  │
│         │                 └─────────────────────────────────────┘  │
│         │                                │                          │
│         ▼                                ▼                          │
│  ┌──────────────┐         ┌─────────────────────────────────────┐  │
│  │  JSON Files  │◄────────│        Netlify Blobs                │  │
│  │  (read-only) │         │   (escrituras: apuestas, registro)  │  │
│  │              │         │                                     │  │
│  │ • matches    │         │   • predictions.json                │  │
│  │ • standings  │         │   • predictions-history.json        │  │
│  │ • users      │         │   • bet-registry.json               │  │
│  └──────────────┘         └─────────────────────────────────────┘  │
│                                          ▲                          │
│                                          │                          │
│                           ┌─────────────────────────────────────┐  │
│                           │   Scheduled Function (cron)         │  │
│                           │   • update-matches (cada 15 min)    │  │
│                           │   • compute-standings (post-update) │  │
│                           └─────────────────────────────────────┘  │
│                                          ▲                          │
│                                          │                          │
│                           ┌─────────────────────────────────────┐  │
│                           │   football-data.org API             │  │
│                           └─────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.1 Decisión de Almacenamiento

**Análisis:**
- Datos de lectura (partidos, clasificaciones, usuarios): **JSON estático en repo** ✓
- Datos de escritura (apuestas de usuarios): **Netlify Blobs** ✓

**Razón:** 
- Las apuestas pueden llegar concurrentemente de múltiples usuarios
- JSON en repo requeriría commits automáticos (complejo, race conditions)
- Netlify Blobs es la opción más simple dentro del ecosistema Netlify

**Alternativas consideradas:**
| Opción | Pros | Contras |
|--------|------|---------|
| JSON en repo (commits) | Historial Git, gratis | Race conditions, complejidad |
| Netlify Blobs | Simple, integrado, gratis tier | 1 año de datos incluido |
| Supabase/Fauna | Más potente | Vendor lock-in, setup extra |
| Upstash Redis | Rápido | Costo si escala |

**Decisión final:** Netlify Blobs para escrituras + JSON estático para lecturas

---

## 3. DISEÑO DE DATOS (JSON Schemas)

### 3.1 data/users.json (estático, en repo)
```json
{
  "$schema": "users",
  "version": "1.0.0",
  "updatedAt": "2025-01-01T00:00:00Z",
  "users": [
    {
      "username": "Darling",
      "passwordHash": "$2b$10$xxxxx"  // bcrypt hash
    }
  ]
}
```

### 3.2 data/all-matches.json (todos los partidos de la temporada)
```json
{
  "$schema": "all-matches",
  "version": "1.0.0",
  "competition": "PD",
  "season": "2024",
  "updatedAt": "2025-01-01T12:00:00Z",
  "etag": "abc123",
  "matches": [
    {
      "id": 544214,
      "matchday": 1,
      "utcDate": "2025-08-15T19:00:00Z",
      "status": "FINISHED",
      "homeTeam": {
        "id": 81,
        "name": "FC Barcelona"
      },
      "awayTeam": {
        "id": 86,
        "name": "Real Madrid CF"
      },
      "score": {
        "fullTime": { "home": 2, "away": 1 },
        "winner": "HOME_TEAM"
      },
      "result": "1"
    }
  ]
}
```

### 3.3 data/current-matchday.json (jornada activa con cuotas)
```json
{
  "$schema": "current-matchday",
  "version": "1.0.0",
  "matchday": 17,
  "updatedAt": "2025-01-01T12:00:00Z",
  "matches": [
    {
      "id": 544380,
      "matchday": 17,
      "date": "2025-12-20",
      "time": "21:00",
      "homeTeam": {
        "id": 95,
        "name": "Valencia CF"
      },
      "awayTeam": {
        "id": 89,
        "name": "RCD Mallorca"
      },
      "status": "SCHEDULED",
      "odds": {
        "home": 2.10,
        "draw": 3.20,
        "away": 3.70
      }
    }
  ]
}
```

### 3.4 data/league-standings.json (clasificación de equipos)
```json
{
  "$schema": "league-standings",
  "version": "1.0.0",
  "updatedAt": "2025-01-01T12:00:00Z",
  "standings": [
    {
      "position": 1,
      "team": {
        "id": 81,
        "name": "FC Barcelona"
      },
      "played": 16,
      "won": 12,
      "drawn": 3,
      "lost": 1,
      "goalsFor": 42,
      "goalsAgainst": 15,
      "goalDifference": 27,
      "points": 39
    }
  ]
}
```

### 3.5 data/player-standings.json (clasificación de jugadores)
```json
{
  "$schema": "player-standings",
  "version": "1.0.0",
  "updatedAt": "2025-01-01T12:00:00Z",
  "standings": [
    {
      "position": 1,
      "username": "Darling",
      "points": 1060.39,
      "correctPredictions": 82,
      "matchdaysPlayed": 16
    }
  ]
}
```

### 3.6 Netlify Blobs: predictions (apuestas activas)
```json
{
  "matchday": 17,
  "predictions": [
    {
      "username": "Darling",
      "matchday": 17,
      "timestamp": "2025-12-17T10:38:37Z",
      "bets": [
        {
          "matchId": 544380,
          "homeTeam": "Valencia CF",
          "awayTeam": "RCD Mallorca",
          "prediction": "2",
          "odds": 3.70
        }
      ]
    }
  ]
}
```

### 3.7 Netlify Blobs: predictions-history (histórico)
```json
{
  "history": [
    {
      "username": "Darling",
      "matchday": 1,
      "timestamp": "2025-08-20T20:32:49Z",
      "bets": [
        {
          "matchId": 544214,
          "homeTeam": "Girona FC",
          "awayTeam": "Rayo Vallecano",
          "prediction": "X",
          "odds": 3.30,
          "result": "2",
          "correct": false
        }
      ],
      "summary": {
        "correctCount": 8,
        "oddsSum": 19.58,
        "points": 156.64
      }
    }
  ]
}
```

---

## 4. PLAN DE IMPLEMENTACIÓN POR FASES

### FASE 1: Infraestructura Base (Día 1)
1. ✅ Definir estructura de carpetas
2. ✅ Crear netlify.toml con funciones
3. ✅ Migrar usuarios a JSON con bcrypt
4. ✅ Implementar función login
5. ✅ Copiar frontend existente

### FASE 2: Datos de Partidos (Día 2)
1. ✅ Script de exportación de Sheets a JSON
2. ✅ Función fetch-matches (football-data.org)
3. ✅ Función compute-odds (cálculo de cuotas)
4. ✅ Scheduled function para actualización
5. ✅ Endpoint /api/matches

### FASE 3: Sistema de Apuestas (Día 3)
1. ✅ Configurar Netlify Blobs
2. ✅ Endpoint POST /api/predictions
3. ✅ Validación de apuestas únicas por jornada
4. ✅ Actualizar frontend para nuevos endpoints

### FASE 4: Clasificaciones y Historial (Día 4)
1. ✅ Función compute-standings (liga + jugadores)
2. ✅ Endpoint /api/standings/league
3. ✅ Endpoint /api/standings/players
4. ✅ Endpoint /api/history
5. ✅ Función para mover apuestas a histórico

### FASE 5: Testing y Deploy (Día 5)
1. ✅ Script de validación old vs new
2. ✅ Testing manual completo
3. ✅ Documentación final
4. ✅ Deploy a producción

---

## 5. SCHEDULING ROBUSTO

### 5.1 Estrategia de Actualización

```javascript
// netlify/functions/scheduled-update.js
// Ejecuta cada 15 minutos cuando hay partidos hoy

Frecuencia:
- Día de partido: cada 15 minutos (durante horas de partido)
- Día sin partidos: 1 vez al día (06:00 UTC)

Rate Limits football-data.org (Free tier):
- 10 requests/minuto
- Usamos: máximo 1 request cada 15 minutos = 4/hora << límite

Cache Strategy:
- Guardar ETag de última respuesta
- Enviar If-None-Match en siguiente request
- Si 304 Not Modified → no procesar
```

### 5.2 Backoff y Reintentos

```javascript
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000,  // 1 segundo
  maxDelay: 30000,     // 30 segundos
  backoffMultiplier: 2
};

async function fetchWithRetry(url, options, retries = 0) {
  try {
    const response = await fetch(url, options);
    if (response.status === 429) {
      // Rate limited - esperar más
      const delay = Math.min(
        RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, retries),
        RETRY_CONFIG.maxDelay
      );
      await sleep(delay);
      return fetchWithRetry(url, options, retries + 1);
    }
    return response;
  } catch (error) {
    if (retries < RETRY_CONFIG.maxRetries) {
      const delay = RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, retries);
      await sleep(delay);
      return fetchWithRetry(url, options, retries + 1);
    }
    throw error;
  }
}
```

### 5.3 Configuración Netlify

```toml
# netlify.toml
[functions]
  directory = "netlify/functions"

[functions."scheduled-update"]
  schedule = "*/15 * * * *"  # Cada 15 minutos
```

---

## 6. CHECKLIST DE MIGRACIÓN

### Pre-migración
- [ ] Exportar datos actuales de Sheets
- [ ] Validar integridad de datos exportados
- [ ] Crear hashes bcrypt de contraseñas
- [ ] Configurar variables de entorno en Netlify

### Durante migración
- [ ] Deploy inicial con funciones
- [ ] Verificar endpoints uno por uno
- [ ] Probar flujo completo de apuesta
- [ ] Verificar cálculo de puntos

### Post-migración
- [ ] Comparar clasificación nueva vs vieja
- [ ] Monitorear logs de scheduled functions
- [ ] Verificar que no hay errores 429
- [ ] Confirmar que datos se persisten

---

## 7. VARIABLES DE ENTORNO REQUERIDAS

```env
# Netlify Environment Variables
FOOTBALL_DATA_API_TOKEN=xxx
BLOB_READ_WRITE_TOKEN=xxx  # Generado automáticamente por Netlify
```

---

## 8. ARCHIVOS A ENTREGAR

```
quiniela-migrated/
├── README.md                    # Instrucciones de deploy
├── ARQUITECTURA.md              # Este documento
├── netlify.toml                 # Configuración Netlify
├── package.json                 # Dependencias Node
│
├── data/                        # Datos estáticos (JSON)
│   ├── users.json
│   ├── all-matches.json
│   ├── current-matchday.json
│   ├── league-standings.json
│   └── player-standings.json
│
├── netlify/functions/           # Serverless functions
│   ├── login.js
│   ├── matches.js
│   ├── predictions.js
│   ├── standings-league.js
│   ├── standings-players.js
│   ├── history.js
│   └── scheduled-update.js
│
├── lib/                         # Módulos compartidos
│   ├── football-data.js         # Cliente API
│   ├── compute-odds.js          # Cálculo de cuotas
│   ├── compute-standings.js     # Cálculo de clasificaciones
│   └── blob-storage.js          # Wrapper Netlify Blobs
│
├── scripts/                     # Scripts de utilidad
│   ├── export-sheets.js         # Exportar datos de Sheets
│   ├── import-data.js           # Importar a nuevo formato
│   ├── hash-passwords.js        # Generar bcrypt hashes
│   └── validate-migration.js    # Comparar old vs new
│
└── public/                      # Frontend (estático)
    ├── index.html
    ├── lobby.html
    ├── apuestas.html
    ├── ... (resto de HTML)
    ├── js/
    │   └── ... (JS actualizado)
    ├── styles/
    │   └── ... (CSS sin cambios)
    ├── imagenes/
    └── logos/
```
