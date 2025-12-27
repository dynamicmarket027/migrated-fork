/**
 * Cálculo de clasificaciones (liga y jugadores)
 * Replica exactamente la lógica del Apps Script original
 */

/**
 * Calcula la clasificación de la liga a partir de los partidos
 * 
 * @param {object[]} matches - Todos los partidos (normalizados)
 * @returns {object[]} - Clasificación ordenada
 */
export function calculateLeagueStandings(matches) {
  const standings = {};
  
  // Inicializar equipo
  const initTeam = (id, name) => ({
    team: { id, name },
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0
  });
  
  // Procesar solo partidos terminados
  const finishedMatches = matches.filter(m => m.status === 'FINISHED' && m.score);
  
  for (const match of finishedMatches) {
    const homeId = match.homeTeam.id;
    const awayId = match.awayTeam.id;
    
    // Inicializar si no existe
    if (!standings[homeId]) {
      standings[homeId] = initTeam(homeId, match.homeTeam.name);
    }
    if (!standings[awayId]) {
      standings[awayId] = initTeam(awayId, match.awayTeam.name);
    }
    
    // Parsear marcador "X - Y"
    const [homeGoals, awayGoals] = match.score.split(' - ').map(n => parseInt(n, 10));
    
    if (isNaN(homeGoals) || isNaN(awayGoals)) continue;
    
    // Actualizar estadísticas
    standings[homeId].played++;
    standings[awayId].played++;
    
    standings[homeId].goalsFor += homeGoals;
    standings[homeId].goalsAgainst += awayGoals;
    standings[awayId].goalsFor += awayGoals;
    standings[awayId].goalsAgainst += homeGoals;
    
    if (homeGoals > awayGoals) {
      // Victoria local
      standings[homeId].won++;
      standings[homeId].points += 3;
      standings[awayId].lost++;
    } else if (homeGoals < awayGoals) {
      // Victoria visitante
      standings[awayId].won++;
      standings[awayId].points += 3;
      standings[homeId].lost++;
    } else {
      // Empate
      standings[homeId].drawn++;
      standings[awayId].drawn++;
      standings[homeId].points++;
      standings[awayId].points++;
    }
    
    // Actualizar diferencia de goles
    standings[homeId].goalDifference = standings[homeId].goalsFor - standings[homeId].goalsAgainst;
    standings[awayId].goalDifference = standings[awayId].goalsFor - standings[awayId].goalsAgainst;
  }
  
  // Convertir a array y ordenar
  const standingsArray = Object.values(standings);
  
  standingsArray.sort((a, b) => {
    // 1. Por puntos (descendente)
    if (b.points !== a.points) return b.points - a.points;
    // 2. Por diferencia de goles (descendente)
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    // 3. Por goles a favor (descendente)
    return b.goalsFor - a.goalsFor;
  });
  
  // Añadir posición
  return standingsArray.map((team, index) => ({
    position: index + 1,
    ...team
  }));
}

/**
 * Calcula los puntos de un jugador por jornada
 * Fórmula: puntos = aciertos * sumaCuotasAcertadas
 * 
 * @param {object[]} bets - Apuestas del jugador para una jornada
 * @returns {object} - Resumen { correctCount, oddsSum, points }
 */
export function calculateMatchdayPoints(bets) {
  let correctCount = 0;
  let oddsSum = 0;
  
  for (const bet of bets) {
    if (bet.correct === true) {
      correctCount++;
      const odds = parseFloat(String(bet.odds).replace(',', '.')) || 0;
      oddsSum += odds;
    }
  }
  
  const points = correctCount * oddsSum;
  
  return {
    correctCount,
    oddsSum: parseFloat(oddsSum.toFixed(2)),
    points: parseFloat(points.toFixed(2))
  };
}

/**
 * Calcula la clasificación de jugadores a partir del histórico
 * 
 * @param {object[]} history - Histórico de apuestas con resultados
 * @returns {object[]} - Clasificación de jugadores ordenada
 */
export function calculatePlayerStandings(history) {
  const players = {};
  
  for (const entry of history) {
    const username = entry.username;
    
    if (!players[username]) {
      players[username] = {
        username,
        points: 0,
        correctPredictions: 0,
        matchdaysPlayed: 0
      };
    }
    
    // Calcular puntos de esta jornada
    const summary = entry.summary || calculateMatchdayPoints(entry.bets || []);
    
    players[username].points += summary.points || 0;
    players[username].correctPredictions += summary.correctCount || 0;
    players[username].matchdaysPlayed++;
  }
  
  // Convertir a array y ordenar por puntos
  const standingsArray = Object.values(players);
  
  standingsArray.sort((a, b) => b.points - a.points);
  
  // Añadir posición
  return standingsArray.map((player, index) => ({
    position: index + 1,
    ...player
  }));
}

/**
 * Actualiza las apuestas con los resultados reales
 * 
 * @param {object[]} predictions - Apuestas pendientes
 * @param {object[]} matches - Partidos con resultados
 * @returns {object[]} - Apuestas actualizadas con aciertos
 */
export function updatePredictionsWithResults(predictions, matches) {
  // Crear mapa de resultados por ID de partido
  const resultsMap = {};
  for (const match of matches) {
    if (match.status === 'FINISHED' && match.result) {
      resultsMap[match.id] = match.result;
    }
  }
  
  return predictions.map(prediction => {
    const updatedBets = prediction.bets.map(bet => {
      const actualResult = resultsMap[bet.matchId];
      
      if (actualResult) {
        return {
          ...bet,
          result: actualResult,
          correct: bet.prediction === actualResult
        };
      }
      
      return bet;
    });
    
    // Recalcular resumen si todos los partidos terminaron
    const allFinished = updatedBets.every(bet => bet.result !== undefined);
    const summary = allFinished ? calculateMatchdayPoints(updatedBets) : null;
    
    return {
      ...prediction,
      bets: updatedBets,
      summary: summary || prediction.summary
    };
  });
}

/**
 * Verifica si una jornada está completamente terminada
 * 
 * @param {object[]} matches - Partidos de la jornada
 * @returns {boolean}
 */
export function isMatchdayComplete(matches) {
  return matches.every(m => m.status === 'FINISHED');
}
