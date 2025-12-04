// ========================================
// FIREBASE PVP - Gestion des rooms et matchmaking
// ========================================

import { database } from './firebase';
import { ref, set, get, onValue, update, remove, push, serverTimestamp, query, orderByChild, equalTo, limitToFirst } from 'firebase/database';
import { generateRandomSeed } from './gameSeed';

/**
 * Crée une nouvelle room PvP
 * @param {string} userId - ID du créateur
 * @param {string} pseudo - Pseudo du créateur
 * @param {boolean} isPrivate - Room privée ou matchmaking
 * @returns {Promise<string>} Code de la room
 */
export const createPvPRoom = async (userId, pseudo, isPrivate = false) => {
  const roomCode = generateRoomCode();
  const roomRef = ref(database, `pvp_rooms/${roomCode}`);
  const seed = Date.now();
  
  const roomData = {
    code: roomCode,
    seed: seed,              // ⬅️ SEED AU PREMIER NIVEAU (important!)
    status: 'waiting',
    isPrivate,
    createdAt: Date.now(),
    currentRound: 0,
    maxRounds: 5,
    players: {
      [userId]: {
        pseudo,
        ready: false,
        score: 0,
        hasAnswered: false,
        answer: null,
        answerTime: null,
        isCorrect: null,
        isHost: true,
        lastActivity: Date.now()
      }
    }
  };

  await set(roomRef, roomData);
  
  console.log('✅ Room créée:', roomCode, 'avec seed:', seed);
  return roomCode;
};

/**
 * Rejoint une room existante
 */
export const joinPvPRoom = async (roomCode, userId, pseudo) => {
  const roomRef = ref(database, `pvp_rooms/${roomCode}`);
  const snapshot = await get(roomRef);

  if (!snapshot.exists()) {
    throw new Error('Room introuvable');
  }

  const roomData = snapshot.val();
  
  if (roomData.status !== 'waiting') {
    throw new Error('Partie déjà commencée');
  }

  const playerCount = Object.keys(roomData.players || {}).length;
  if (playerCount >= 2) {
    throw new Error('Room complète');
  }

  await update(ref(database, `pvp_rooms/${roomCode}/players/${userId}`), {
    pseudo,
    ready: false,
    score: 0,
    hasAnswered: false,
    answer: null,
    answerTime: null,
    isCorrect: null,
    isHost: false,
    lastActivity: Date.now()
  });

  console.log('✅ Joueur rejoint la room:', roomCode);
  return roomCode;
};

/**
 * Matchmaking automatique - trouve ou crée une room publique
 */
export const findOrCreateMatch = async (userId, pseudo) => {
  // Cherche une room publique en attente
  const roomsRef = ref(database, 'pvp_rooms');
  const waitingRoomsQuery = query(
    roomsRef,
    orderByChild('status'),
    equalTo('waiting')
  );

  const snapshot = await get(waitingRoomsQuery);

  if (snapshot.exists()) {
    const rooms = snapshot.val();
    
    // Trouve une room publique avec 1 seul joueur
    for (const [roomCode, roomData] of Object.entries(rooms)) {
      if (!roomData.isPrivate) {
        const playerCount = Object.keys(roomData.players || {}).length;
        if (playerCount === 1) {
          // Rejoint cette room
          try {
            await joinPvPRoom(roomCode, userId, pseudo);
            return roomCode;
          } catch (err) {
            console.warn('⚠️ Impossible de rejoindre:', err.message);
            continue;
          }
        }
      }
    }
  }

  // Aucune room disponible, en crée une nouvelle
  return await createPvPRoom(userId, pseudo, false);
};

/**
 * Marque un joueur comme prêt
 */
export const setPlayerReady = async (roomCode, userId) => {
  await update(ref(database, `pvp_rooms/${roomCode}/players/${userId}`), {
    ready: true,
    lastActivity: serverTimestamp()
  });
};

/**
 * Démarre le countdown si les 2 joueurs sont prêts
 */
export const checkAndStartCountdown = async (roomCode) => {
  const roomRef = ref(database, `pvp_rooms/${roomCode}`);
  const snapshot = await get(roomRef);
  
  if (!snapshot.exists()) return false;
  
  const data = snapshot.val();
  const players = Object.values(data.players || {});
  
  // Vérifie que les 2 joueurs sont prêts
  if (players.length === 2 && players.every(p => p.ready)) {
    
    await update(roomRef, {
      status: 'countdown',
      countdown: 3
    });
    
    console.log('✅ Countdown démarré');
    return true;
  }
  
  return false;
};

/**
 * Démarre un round
 */
export const startRound = async (roomCode, roundNumber) => {
  const roomRef = ref(database, `pvp_rooms/${roomCode}`);
  
  await update(roomRef, {
    status: 'playing',
    currentRound: roundNumber,
    'gameConfig/roundStartTime': serverTimestamp()
  });

  // Reset les états des joueurs
  const snapshot = await get(roomRef);
  if (snapshot.exists()) {
    const players = snapshot.val().players || {};
    
    for (const playerId of Object.keys(players)) {
      await update(ref(database, `pvp_rooms/${roomCode}/players/${playerId}`), {
        hasAnswered: false,
        answer: null,
        answerTime: null,
        isCorrect: null,
        ready: false
      });
    }
  }
};

/**
 * Soumet une réponse
 */
export const submitAnswer = async (roomCode, userId, answer, timeElapsed, isCorrect, roundStartTime) => {
  const actualTimeElapsed = (Date.now() - roundStartTime) / 1000; // Temps réel depuis le début
  
  console.log(`🔥 Firebase: Soumission réponse pour ${userId}`);
  console.log(`   ├─ Réponse: "${answer}" (${isCorrect ? 'CORRECT' : 'FAUX'})`);
  console.log(`   └─ Temps: ${actualTimeElapsed.toFixed(2)}s`);
  
  await update(ref(database, `pvp_rooms/${roomCode}/players/${userId}`), {
    hasAnswered: true,
    answer,
    answerTime: actualTimeElapsed,
    isCorrect,
    lastActivity: serverTimestamp()
  });

  console.log(`✅ Firebase: Réponse enregistrée pour ${userId}`);
};

/**
 * Calcule le score d'un joueur pour un round
 */
export const calculateRoundScore = (isCorrect, answerTime, isFirst) => {
  if (!isCorrect) {
    return 0;
  }
  
  const baseScore = 30;
  const timeElapsed = Math.floor(answerTime);
  const timePenalty = Math.min(timeElapsed, 30);
  const firstBonus = isFirst ? 5 : 0;
  
  const score = Math.max(0, baseScore - timePenalty + firstBonus);
  
  return score;
};

/**
 * Met à jour le score total d'un joueur
 */
export const updatePlayerScore = async (roomCode, userId, roundScore) => {
  const playerRef = ref(database, `pvp_rooms/${roomCode}/players/${userId}`);
  const snapshot = await get(playerRef);
  
  if (snapshot.exists()) {
    const currentScore = snapshot.val().score || 0;
    await update(playerRef, {
      score: currentScore + roundScore
    });
  }
};

/**
 * Vérifie si les 2 joueurs ont répondu
 */
export const checkBothAnswered = async (roomCode) => {
  const roomRef = ref(database, `pvp_rooms/${roomCode}`);
  const snapshot = await get(roomRef);

  if (!snapshot.exists()) return false;

  const players = snapshot.val().players || {};
  const playerList = Object.values(players);

  if (playerList.length < 2) return false;

  return playerList.every(p => p.hasAnswered);
};

/**
 * Termine un round
 */
export const endRound = async (roomCode, correctAnswer, scores) => {
  const roomRef = ref(database, `pvp_rooms/${roomCode}`);
  
  await update(roomRef, {
    status: 'round_end',
    lastRoundResult: {
      correctAnswer,
      players: scores
    }
  });
  
  console.log('🏁 Round terminé');
};

/**
 * Termine la partie
 */
export const endGame = async (roomCode) => {
  await update(ref(database, `pvp_rooms/${roomCode}`), {
    status: 'game_end'
  });
};

/**
 * Écoute les changements d'une room en temps réel
 */
export const listenToRoom = (roomCode, callback) => {
  const roomRef = ref(database, `pvp_rooms/${roomCode}`);
  return onValue(roomRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val());
    } else {
      callback(null);
    }
  });
};

/**
 * Quitte une room
 */
export const leaveRoom = async (roomCode, userId) => {
  const playerRef = ref(database, `pvp_rooms/${roomCode}/players/${userId}`);
  await remove(playerRef);

  // Si plus de joueurs, supprime la room
  const roomRef = ref(database, `pvp_rooms/${roomCode}`);
  const snapshot = await get(roomRef);
  
  if (snapshot.exists()) {
    const players = snapshot.val().players || {};
    if (Object.keys(players).length === 0) {
      await remove(roomRef);
      console.log('🗑️ Room supprimée:', roomCode);
    }
  }
};

/**
 * Met à jour l'activité d'un joueur (heartbeat)
 */
export const updatePlayerActivity = async (roomCode, userId) => {
  await update(ref(database, `pvp_rooms/${roomCode}/players/${userId}`), {
    lastActivity: serverTimestamp()
  });
};

/**
 * Détecte si un joueur est AFK
 */
export const checkAFK = async (roomCode) => {
  const roomRef = ref(database, `pvp_rooms/${roomCode}`);
  const snapshot = await get(roomRef);

  if (!snapshot.exists()) return null;

  const players = snapshot.val().players || {};
  const now = Date.now();
  
  for (const [playerId, playerData] of Object.entries(players)) {
    const lastActivity = playerData.lastActivity || 0;
    const timeSinceActivity = now - lastActivity;
    
    // AFK si > 60 secondes sans activité
    if (timeSinceActivity > 60000) {
      return playerId;
    }
  }

  return null;
};

/**
 * Génère un code de room (4 caractères)
 */
const generateRoomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

/**
 * Nettoie les rooms inactives (à appeler périodiquement)
 */
export const cleanupInactiveRooms = async () => {
  const roomsRef = ref(database, 'pvp_rooms');
  const snapshot = await get(roomsRef);

  if (!snapshot.exists()) return;

  const rooms = snapshot.val();
  const now = Date.now();

  for (const [roomCode, roomData] of Object.entries(rooms)) {
    const createdAt = roomData.createdAt || 0;
    const age = now - createdAt;

    // Supprime les rooms > 1 heure
    if (age > 3600000) {
      await remove(ref(database, `pvp_rooms/${roomCode}`));
      console.log('🗑️ Room inactive supprimée:', roomCode);
    }
  }
};

export default {
  createPvPRoom,
  joinPvPRoom,
  findOrCreateMatch,
  setPlayerReady,
  checkAndStartCountdown,
  startRound,
  submitAnswer,
  calculateRoundScore,
  updatePlayerScore,
  checkBothAnswered,
  endRound,
  endGame,
  listenToRoom,
  leaveRoom,
  updatePlayerActivity,
  checkAFK,
  cleanupInactiveRooms
};
