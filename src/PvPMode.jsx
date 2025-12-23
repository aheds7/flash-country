import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { countries as cloudinaryCountries } from './countries';
import { generatePvPGameConfig, getCurrentImageIndex } from './gameSeed';
import { ref, update, onValue, onDisconnect } from 'firebase/database'; 
import { database } from './firebase';
import { useImagePreloader } from './useImagePreloader'; 
import { EmojiText } from './emojiParser'
import {
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
  updatePlayerActivity
} from './firebasePvP';


const PvPMode = ({ user, userPseudo, onBack, translations, language }) => {
  const t = translations[language];
  
  // États principaux
  const [pvpState, setPvpState] = useState('menu');
  const [roomCode, setRoomCode] = useState('');
  const [roomData, setRoomData] = useState(null);
  const [gameConfig, setGameConfig] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [reconnectionTimer, setReconnectionTimer] = useState(null);
  const [disconnectionCountdown, setDisconnectionCountdown] = useState(null);
  
  // États du jeu
  const [countdown, setCountdown] = useState(3);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [hasAnswered, setHasAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isStressed, setIsStressed] = useState(false);
  const [roundEndData, setRoundEndData] = useState(null);
  const [gameEndData, setGameEndData] = useState(null);
  
  // 🔥 NOUVEAUX ÉTATS POUR LE PRÉCHARGEMENT
  const [imagesToPreload, setImagesToPreload] = useState([]);
  const [shouldPreload, setShouldPreload] = useState(false);
  
  // 🔥 HOOK DE PRÉCHARGEMENT
  const { loaded, loadedCount, totalImages, progress } = useImagePreloader(
    imagesToPreload,
    shouldPreload
  );
  
  // Refs
  const unsubscribeRef = useRef(null);
  const animationRef = useRef(null);
  const heartbeatRef = useRef(null);
  const timeoutRef = useRef(null);
  const hasAnsweredRef = useRef(false);
  const isProcessingRef = useRef(false);
  const currentStateRef = useRef('menu');

  // Données des joueurs
  const myId = user?.uid;
  const myData = roomData?.players?.[myId];
  const opponentId = roomData?.players ? Object.keys(roomData.players).find(id => id !== myId) : null;
  const opponentData = opponentId ? roomData?.players?.[opponentId] : null;

  // Nettoyage à la sortie
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      if (timeoutRef.current) {
        clearInterval(timeoutRef.current);
      }
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (roomCode && myId) {
        leaveRoom(roomCode, myId);
      }
    };
  }, [roomCode, myId]);

  // Fonction pour tout nettoyer
  function stopAllTimers() {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (timeoutRef.current) {
      clearInterval(timeoutRef.current);
      timeoutRef.current = null;
    }
  }

  // Listener Firebase
  useEffect(() => {
    if (!roomCode || !myId) return;

    console.log('🎧 Écoute de la room:', roomCode);
    
    const unsubscribe = listenToRoom(roomCode, async (data) => {
      if (!data) {
        console.warn('⚠️ Room supprimée');
        setError('La partie a été annulée');
        setPvpState('menu');
        currentStateRef.current = 'menu';
        return;
      }

      console.log(`📡 Firebase update: status=${data.status}, currentState=${currentStateRef.current}`);
      setRoomData(data);

      // VÉRIFIER SI LES 2 JOUEURS SONT PRÊTS (seulement si on est en waiting)
      if (data.status === 'waiting' && currentStateRef.current === 'waiting') {
        const players = Object.values(data.players || {});
        const bothReady = players.length === 2 && players.every(p => p.ready);
        
        if (bothReady) {
          console.log('✅ Les 2 joueurs sont prêts !');
          // Seul l'hôte lance le countdown
          const amIHost = data.players[myId]?.isHost;
          if (amIHost) {
            console.log('👑 HOST: Lancement du countdown...');
            await checkAndStartCountdown(roomCode);
          }
        }
      }

      // 🔥 VÉRIFIER SI LES 2 SONT PRÊTS POUR LE ROUND SUIVANT (pendant round_end)
      if (data.status === 'round_end' && currentStateRef.current === 'round_end') {
        const players = Object.values(data.players || {});
        const playerIds = Object.keys(data.players);
        const amIHost = data.players[myId]?.isHost;
        
        // 🔥 VÉRIFIER SI C'EST LE DERNIER ROUND
        const isLastRound = (data.currentRound + 1) >= data.maxRounds;
        
        if (isLastRound) {
          // 🔥 DERNIER ROUND - Chaque joueur va aux résultats indépendamment via le bouton
          console.log('📊 Dernier round - En attente de la décision des joueurs (pas de synchronisation)');
          // Ne rien faire ici, le bouton "VOIR LES RÉSULTATS" appelle directement endGame()
          return;
        }
        
        // 🔥 ROUNDS INTERMÉDIAIRES - Logique normale
        const opponentPlayer = players.find(p => Object.keys(data.players).find(id => id !== myId && data.players[id] === p));
        const opponentIsDisconnected = opponentPlayer && opponentPlayer.connected === false;
        
        // Si l'hôte est déconnecté, le joueur connecté prend le relais
        const hostIsDisconnected = opponentIsDisconnected && players.find(p => p.isHost)?.connected === false;
        const canProcess = amIHost || hostIsDisconnected;
        
        if (opponentIsDisconnected && canProcess) {
          console.log('⚠️ Adversaire déconnecté en round_end - Timer de 30s géré par useEffect');
        } else {
          // Logique normale : attendre que les 2 soient prêts
          const bothReady = players.length === 2 && players.every(p => p.ready);
          
          if (bothReady && canProcess) {
            console.log('✅ Les 2 joueurs sont prêts pour le round suivant !');
            const nextRound = data.currentRound + 1;
            
            console.log(`🔄 Passage au round ${nextRound + 1}`);
            
            // 🔥 RÉINITIALISER ready POUR TOUS LES JOUEURS
            const updates = {
              status: 'countdown',
              countdown: 3,
              currentRound: nextRound
            };
            
            playerIds.forEach(pid => {
              updates[`players/${pid}/ready`] = false;
            });
            
            await update(ref(database, `pvp_rooms/${roomCode}`), updates);
          }
        }
      }

      // VÉRIFIER SI LES 2 ONT RÉPONDU (pendant le jeu)
      if (data.status === 'playing' && currentStateRef.current === 'playing') {
        const players = Object.values(data.players || {});
        
        // 🔥 VÉRIFIER SI QUELQU'UN EST DÉCONNECTÉ
        const someoneDisconnected = players.some(p => p.connected === false);
        
        const bothAnswered = players.length === 2 && players.every(p => p.hasAnswered);
        const amIHost = data.players[myId]?.isHost;
        
        // 🔥 LOGS DE DEBUG
        console.log('🔍 VÉRIFICATION RÉPONSES:');
        console.log(`   someoneDisconnected: ${someoneDisconnected}`);
        console.log(`   bothAnswered: ${bothAnswered}`);
        console.log(`   amIHost: ${amIHost}`);
        console.log(`   isProcessingRef: ${isProcessingRef.current}`);
        
        // Détail de chaque joueur
        players.forEach((p, idx) => {
          const playerId = Object.keys(data.players)[idx];
          console.log(`   Joueur ${idx + 1} (${p.pseudo}):`, {
            hasAnswered: p.hasAnswered,
            connected: p.connected,
            answer: p.answer,
            isHost: p.isHost
          });
        });
        
        // 🔥 DÉCLENCHER LA FIN SI : les 2 ont répondu OU quelqu'un est déconnecté et au moins 1 a répondu
        const shouldEndRound = bothAnswered || (someoneDisconnected && players.some(p => p.hasAnswered));
        
        console.log(`   shouldEndRound: ${shouldEndRound}`);
        
        const hostIsDisconnected = someoneDisconnected && Object.values(data.players).find(p => p.isHost)?.connected === false;
        const canProcess = amIHost || hostIsDisconnected;

        if (shouldEndRound && canProcess && !isProcessingRef.current) {
          console.log('🔔 FIREBASE DÉTECTE: Fin du round (réponses ou déconnexion)');
          isProcessingRef.current = true;
          
          console.log('🏆 ========== CALCUL AUTOMATIQUE DES SCORES ==========');
          
          const playerIds = Object.keys(data.players);
          
          let firstPlayerId = null;
          let minTime = Infinity;
          
          for (const pid of playerIds) {
            const p = data.players[pid];
            if (p.isCorrect && p.answerTime < minTime) {
              minTime = p.answerTime;
              firstPlayerId = pid;
            }
          }

          console.log(`⚡ Premier: ${firstPlayerId ? data.players[firstPlayerId].pseudo : 'Aucun'}`);

          const scores = {};
          for (const pid of playerIds) {
            const p = data.players[pid];
            const isFirst = (pid === firstPlayerId && p.isCorrect);
            scores[pid] = calculateRoundScore(p.isCorrect, p.answerTime, isFirst);
            
            console.log(`📊 ${p.pseudo}: ${scores[pid]} pts`);
            await updatePlayerScore(roomCode, pid, scores[pid]);
          }

          const roundResults = {};
          for (const pid of playerIds) {
            const p = data.players[pid];
            roundResults[pid] = {
              answer: p.answer || '',
              isCorrect: p.isCorrect || false,
              time: p.answerTime || 0,
              roundScore: scores[pid] || 0,
              wasFirst: pid === firstPlayerId
            };
          }

          if (gameConfig) {
            const currentRound = data.currentRound;
            const roundConfig = gameConfig.rounds[currentRound];
            const correctCountry = roundConfig.countryName;

            console.log('📤 Envoi à Firebase: status="round_end"');
            await update(ref(database, `pvp_rooms/${roomCode}`), {
              status: 'round_end',
              lastRoundResult: {
                correctAnswer: correctCountry,
                players: roundResults
              }
            });

            console.log('🏁 Round terminé via listener Firebase');
            console.log('🏆 ========================================');
          }
        }
      }

      // === 🔥 MACHINE À ÉTATS STRICTE (empêche les retours en arrière) ===
      const stateOrder = ['menu', 'waiting', 'countdown', 'playing', 'round_end', 'game_end'];
      const getCurrentStateIndex = () => stateOrder.indexOf(currentStateRef.current);
      const getNewStateIndex = () => stateOrder.indexOf(data.status);
      
      // Protection contre les transitions invalides
      const canTransition = () => {
        const current = currentStateRef.current;
        const next = data.status;
        
        // Autoriser countdown après round_end (nouveau round)
        if (current === 'round_end' && next === 'countdown') return true;
        
        // 🔥 BLOQUER countdown ou waiting après countdown/playing/round_end
        if ((current === 'countdown' || current === 'playing' || current === 'round_end') && 
            (next === 'waiting')) {
          return false;
        }
        
        // 🔥 BLOQUER round_end si on est déjà en countdown (nouveau round)
        if (current === 'countdown' && next === 'round_end') return false;
        
        // Autoriser les états identiques (updates Firebase)
        if (current === next) return true;
        
        // Autoriser seulement d'avancer dans l'ordre
        return getNewStateIndex() > getCurrentStateIndex();
      };

      if (!canTransition()) {
        console.log(`⚠️ Transition invalide ignorée: ${currentStateRef.current} → ${data.status}`);
        return; // Ignorer cette mise à jour
      }

      // COUNTDOWN
      if (data.status === 'countdown' && currentStateRef.current !== 'countdown') {
        console.log('🔄 Changement → countdown');
        currentStateRef.current = 'countdown';
        setPvpState('countdown');
        setCountdown(data.countdown || 3);
        
        // 🔥 RÉINITIALISER TOUTES LES REFS
        hasAnsweredRef.current = false;
        isProcessingRef.current = false;
        setHasAnswered(false);
        setUserAnswer('');
        setIsStressed(false);
        stopAllTimers();
        
        // 🔥 PHASE 3 : CONTINUER le préchargement si pas fini
        // Le préchargement lancé dans round_end continue automatiquement
        // On vérifie juste qu'il est bien actif
        if (gameConfig && !shouldPreload) {
          const nextRound = data.currentRound || 0;
          const roundConfig = gameConfig.rounds[nextRound];
          if (roundConfig && roundConfig.images) {
            console.log(`🖼️ Préchargement countdown: ${roundConfig.images.length} images`);
            setImagesToPreload(roundConfig.images);
            setShouldPreload(true);
          }
        }
      }
      
      // PLAYING
      else if (data.status === 'playing' && currentStateRef.current !== 'playing') {
        console.log('🔄 Changement → playing');
        currentStateRef.current = 'playing';
        setPvpState('playing');
        
        // 🔥 RÉINITIALISER TOUT
        hasAnsweredRef.current = false;
        isProcessingRef.current = false;
        setHasAnswered(false);
        setUserAnswer('');
        setTimeLeft(30);
        setIsStressed(false);
        setCurrentImageIndex(0);
        setShouldPreload(false); // Stop le préchargement actuel
        
        // 🔥 PHASE 1 : Préchargement LÉGER après 10 secondes de jeu
        if (gameConfig) {
          const currentRoundIndex = data.currentRound;
          const nextRoundIndex = currentRoundIndex + 1;
          
          if (nextRoundIndex < gameConfig.rounds.length) {
            const nextRoundImages = gameConfig.rounds[nextRoundIndex].images;
            
            // Attendre 10 secondes avant de commencer (laisser le jeu bien démarrer)
            setTimeout(() => {
              // Vérifier qu'on est toujours en train de jouer
              if (currentStateRef.current === 'playing') {
                console.log(`🐌 Préchargement LÉGER du round ${nextRoundIndex + 1} (20 premières images)`);
                // Charger seulement les 20 premières images en mode léger
                setImagesToPreload(nextRoundImages.slice(0, 20));
                setShouldPreload(true);
              }
            }, 10000); // 10 secondes après le début
          }
        }
      }
      
      // ROUND_END
      else if (data.status === 'round_end' && currentStateRef.current !== 'round_end') {
        console.log('🔄 Changement → round_end');
        currentStateRef.current = 'round_end';
        setPvpState('round_end');
        stopAllTimers();
        
        // 🔥 CAPTURER LES DONNÉES DU ROUND TERMINÉ
        setRoundEndData({
          roundNumber: data.currentRound + 1,
          lastResult: data.lastRoundResult,
          myData: { ...data.players[myId] },
          opponentData: opponentId ? { ...data.players[opponentId] } : null
        });
        
        // 🔥 PHASE 2 : Préchargement INTENSIF de toutes les images
        if (gameConfig) {
          const nextRoundIndex = data.currentRound + 1;
          if (nextRoundIndex < gameConfig.rounds.length) {
            const nextRoundImages = gameConfig.rounds[nextRoundIndex].images;
            console.log(`🚀 Préchargement INTENSIF du round ${nextRoundIndex + 1}: ${nextRoundImages.length} images`);
            setImagesToPreload(nextRoundImages);
            setShouldPreload(true);
          }
        }
        
        // 🔥 RÉINITIALISER POUR LE PROCHAIN ROUND
        hasAnsweredRef.current = false;
        isProcessingRef.current = false;
        setHasAnswered(false);
        setIsStressed(false);
      }
      
      // GAME_END
      else if (data.status === 'game_end' && currentStateRef.current !== 'game_end') {
        console.log('🔄 Changement → game_end');
        currentStateRef.current = 'game_end';
        setPvpState('game_end');
        stopAllTimers();
        
        // 🔥 CAPTURER LES DONNÉES FINALES (avant que le joueur quitte)
        setGameEndData({
          myScore: data.players[myId]?.score || 0,
          myPseudo: userPseudo,
          opponentScore: opponentId ? (data.players[opponentId]?.score || 0) : 0,
          opponentPseudo: opponentId ? (data.players[opponentId]?.pseudo || 'Adversaire') : 'Adversaire'
        });
      }
    });

    unsubscribeRef.current = unsubscribe;
    
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [roomCode, myId, gameConfig]);

// Gestion de la connexion/déconnexion
useEffect(() => {
  if (!roomCode || !myId || !opponentId || pvpState === 'menu') return;

  const playerRef = ref(database, `pvp_rooms/${roomCode}/players/${myId}`);
  const opponentRef = ref(database, `pvp_rooms/${roomCode}/players/${opponentId}`);

  // Marquer le joueur comme connecté
  update(playerRef, {
    connected: true,
    lastSeen: Date.now()
  });

  // Gérer la déconnexion automatique
  const disconnectRef = onDisconnect(playerRef);
  disconnectRef.update({
    connected: false,
    lastSeen: Date.now()
  });

  // Surveiller le statut de l'adversaire
  const unsubscribe = onValue(opponentRef, (snapshot) => {
    const opponent = snapshot.val();
    
    if (!opponent) return;

    if (opponent.connected === false && !opponentDisconnected) {
      console.log('⚠️ Adversaire déconnecté');
      setOpponentDisconnected(true);
      
      // 🔥 SEULEMENT EN ROUND_END OU WAITING - Timer de 30s avant victoire
      if (pvpState === 'round_end' || pvpState === 'waiting') {
        console.log(`🚨 Déconnexion en ${pvpState} - Timer de 30s avant victoire par forfait`);
        
        // DÉCOMPTE VISUEL
        let countdown = 30;
        setDisconnectionCountdown(countdown);
        
        const countdownInterval = setInterval(() => {
          countdown -= 1;
          setDisconnectionCountdown(countdown);
          
          if (countdown <= 0) {
            clearInterval(countdownInterval);
          }
        }, 1000);
        
        const timer = setTimeout(async () => {
          console.log('⏰ 30 secondes écoulées - Victoire par forfait');
          clearInterval(countdownInterval);
          setDisconnectionCountdown(null);
          await endGameByDisconnection();
        }, 30000);
        
        setReconnectionTimer(timer);
      }
      // 🔥 PENDANT LE JEU - Pas de timer, on attend que le joueur connecté réponde
      else if (pvpState === 'playing') {
        console.log('🚨 Déconnexion pendant le round - Aucun timer, attente de la réponse du joueur connecté');
        // Pas de timer ici, handleSubmitAnswer ou handleTimeOut gérera
      }
    } else if (opponent.connected === true && opponentDisconnected) {
      console.log('✅ Adversaire reconnecté');
      setOpponentDisconnected(false);
      setDisconnectionCountdown(null);
      if (reconnectionTimer) {
        clearTimeout(reconnectionTimer);
        setReconnectionTimer(null);
      }
    }
  });

  return () => {
    unsubscribe();
    if (reconnectionTimer) {
      clearTimeout(reconnectionTimer);
    }
    disconnectRef.cancel();
  };
}, [roomCode, myId, opponentId, pvpState, opponentDisconnected]);

// 🔥 TIMER SPÉCIFIQUE pour round_end avec adversaire déconnecté
useEffect(() => {
  if (pvpState !== 'round_end' || !opponentDisconnected) return;
  
  console.log('🚨 round_end avec adversaire déconnecté - Démarrage timer 30s');
  
  // DÉCOMPTE VISUEL
  let countdown = 30;
  setDisconnectionCountdown(countdown);
  
  const countdownInterval = setInterval(() => {
    countdown -= 1;
    setDisconnectionCountdown(countdown);
    
    if (countdown <= 0) {
      clearInterval(countdownInterval);
    }
  }, 1000);
  
  const timer = setTimeout(async () => {
    console.log('⏰ 30 secondes écoulées en round_end - Victoire par forfait');
    clearInterval(countdownInterval);
    setDisconnectionCountdown(null);
    await endGameByDisconnection();
  }, 30000);
  
  setReconnectionTimer(timer);
  
  return () => {
    clearTimeout(timer);
    clearInterval(countdownInterval);
  };
}, [pvpState, opponentDisconnected]);

  // Heartbeat
  useEffect(() => {
    if (roomCode && myId && pvpState !== 'menu') {
      const interval = setInterval(() => {
        updatePlayerActivity(roomCode, myId);
      }, 10000);
      heartbeatRef.current = interval;
      return () => clearInterval(interval);
    }
  }, [roomCode, myId, pvpState]);

  // Countdown
  useEffect(() => {
    if (pvpState === 'countdown' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (pvpState === 'countdown' && countdown === 0 && myData?.isHost) {
      console.log(`✅ Démarrage du round`);
      startRound(roomCode, roomData.currentRound);
    }
  }, [pvpState, countdown, myData?.isHost, roomCode, roomData?.currentRound]);

  // DÉTECTION DU MODE STRESS
  useEffect(() => {
    // 🔥 VÉRIFICATIONS DE SÉCURITÉ
    if (pvpState !== 'playing') return;
    if (currentStateRef.current !== 'playing') return;
    if (hasAnsweredRef.current || hasAnswered) return;
    if (!roomData?.gameConfig?.roundStartTime) return; // Attendre que le round soit vraiment démarré
    
    // 🔥 VÉRIFIER QUE L'ADVERSAIRE A RÉPONDU PENDANT CE ROUND (pas le précédent)
    if (opponentData?.hasAnswered && !isStressed) {
      const roundStartTime = roomData.gameConfig.roundStartTime;
      const opponentAnswerTime = opponentData.answerTime || 0;
      
      // L'adversaire doit avoir répondu APRÈS le début de ce round
      if (opponentAnswerTime > 0 && opponentAnswerTime < 30) {
        console.log('🚨 MODE STRESS ACTIVÉ');
        setIsStressed(true);
      }
    }
  }, [pvpState, opponentData?.hasAnswered, opponentData?.answerTime, hasAnswered, isStressed, roomData?.gameConfig?.roundStartTime]);

  // TIMER PRINCIPAL
  // TIMER PRINCIPAL - Continue même après avoir répondu
useEffect(() => {
  if (pvpState !== 'playing' || !roomData?.gameConfig?.roundStartTime) return;
  
  if (currentStateRef.current === 'round_end' || currentStateRef.current === 'game_end') {
    return;
  }

  const roundStartTime = roomData.gameConfig.roundStartTime;
  
  console.log('⏱️ Timer démarré');
  const interval = setInterval(() => {
    if (currentStateRef.current !== 'playing') {
      console.log('⏹️ Arrêt du timer - changement d\'état');
      clearInterval(interval);
      return;
    }

    const currentTime = Date.now();
    const elapsedSeconds = (currentTime - roundStartTime) / 1000;
    
    // 🔥 LOGIQUE CORRIGÉE
    const iHaveAnswered = hasAnsweredRef.current || hasAnswered;
    const opponentHasAnswered = opponentData?.hasAnswered;
    
    // 🔥 CAS SPÉCIAL : Adversaire déconnecté
    if (opponentDisconnected) {
      // Si je n'ai pas encore répondu, je continue avec le timer normal de 30s
      if (!iHaveAnswered) {
        const timeLeftNormal = Math.max(0, 30 - elapsedSeconds);
        setTimeLeft(Math.ceil(timeLeftNormal));
        
        if (timeLeftNormal <= 0) {
          console.log('⏰ TEMPS ÉCOULÉ (30s) - Adversaire déconnecté !');
          clearInterval(interval);
          handleTimeOut();
          return;
        }
      } else {
        // Si j'ai répondu, afficher 0 et attendre le calcul des scores
        setTimeLeft(0);
      }
      return;
    }
    
    // CAS 1 : Personne n'a répondu → 30 secondes normales
    if (!iHaveAnswered && !opponentHasAnswered) {
      const timeLeftNormal = Math.max(0, 30 - elapsedSeconds);
      setTimeLeft(Math.ceil(timeLeftNormal));
      
      if (timeLeftNormal <= 0) {
        console.log('⏰ TEMPS ÉCOULÉ (30s) !');
        clearInterval(interval);
        handleTimeOut();
        return;
      }
    }
    
    // CAS 2 : MOI j'ai répondu en premier, adversaire non
    else if (iHaveAnswered && !opponentHasAnswered) {
      const myAnswerTime = myData?.answerTime || 0;
      const opponentDeadline = myAnswerTime + 10;
      const timeLeftForOpponent = Math.max(0, opponentDeadline - elapsedSeconds);
      
      setTimeLeft(Math.ceil(timeLeftForOpponent));
      // Pas de timeout ici, je ne joue plus
    }
    
    // CAS 3 : ADVERSAIRE a répondu en premier, moi non
    else if (!iHaveAnswered && opponentHasAnswered) {
      const opponentAnswerTime = opponentData.answerTime || 0;
      const myDeadline = opponentAnswerTime + 10;
      const timeLeftForMe = Math.max(0, myDeadline - elapsedSeconds);
      
      setTimeLeft(Math.ceil(timeLeftForMe));
      
      if (timeLeftForMe <= 0) {
        console.log('⏰ TEMPS ÉCOULÉ EN MODE STRESS !');
        clearInterval(interval);
        handleTimeOut();
        return;
      }
    }
    
    // CAS 4 : Les deux ont répondu
    else if (iHaveAnswered && opponentHasAnswered) {
      setTimeLeft(0);
    }
  }, 100);
  
  timeoutRef.current = interval;
  
  return () => {
    console.log('🧹 Nettoyage du timer');
    clearInterval(interval);
    if (timeoutRef.current === interval) {
      timeoutRef.current = null;
    }
  };
}, [pvpState, roomData?.gameConfig?.roundStartTime, roomData?.currentRound, opponentData?.hasAnswered, opponentData?.answerTime, myData?.answerTime, hasAnswered, opponentDisconnected]);
  // Animation des images
  useEffect(() => {
    if (pvpState !== 'playing' || !gameConfig || hasAnsweredRef.current) return;
    
    const currentRound = roomData?.currentRound || 0;
    const roundConfig = gameConfig.rounds[currentRound];
    if (!roundConfig) return;

    const totalImages = roundConfig.images.length;
    const imageChangeInterval = 80;

    const animate = () => {
      if (hasAnsweredRef.current) {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
        return;
      }

      const elapsed = Date.now() - roomData.gameConfig.roundStartTime;
      const index = Math.floor(elapsed / imageChangeInterval);
      
      // 🔥 BOUCLER EN CONTINU avec modulo
      setCurrentImageIndex(index % totalImages);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [pvpState, gameConfig, roomData?.currentRound, roomData?.gameConfig?.roundStartTime]);


// Fonction pour terminer le jeu par déconnexion
const endGameByDisconnection = async () => {
  if (!roomCode || !myId) {
    console.error('❌ Impossible de terminer - pas de roomCode ou myId');
    return;
  }
  
  console.log('🏆 ========== VICTOIRE PAR FORFAIT ==========');
  console.log(`Room: ${roomCode}, Winner: ${myId}`);
  
  try {
    const gameRef = ref(database, `pvp_rooms/${roomCode}`);
    await update(gameRef, {
      status: 'game_end',
      winner: myId,
      endReason: 'opponent_disconnected',
      endTime: Date.now()
    });
    console.log('✅ Firebase mis à jour avec game_end');
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour Firebase:', error);
  }
  
  console.log('🏆 =========================================');
};

// Touche Enter pour "ROUND SUIVANT"
useEffect(() => {
  if (pvpState !== 'round_end' || myData?.ready) return;
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleNextRound();
    }
  };

  window.addEventListener('keydown', handleKeyPress);
  
  return () => {
    window.removeEventListener('keydown', handleKeyPress);
  };
}, [pvpState, myData?.ready, roomCode, myId]);

useEffect(() => {
  if (pvpState !== 'waiting' || !opponentData || myData?.ready) return;
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleReady();
    }
  };

  window.addEventListener('keydown', handleKeyPress);
  
  return () => {
    window.removeEventListener('keydown', handleKeyPress);
  };
}, [pvpState, opponentData, myData?.ready, roomCode, myId, gameConfig, roomData?.seed]);



  // === HANDLERS ===

  const handleQuickMatch = async () => {
    try {
      setError('');
      currentStateRef.current = 'waiting';
      setPvpState('waiting');
      const code = await findOrCreateMatch(myId, userPseudo);
      setRoomCode(code);
    } catch (err) {
      setError(err.message);
      setPvpState('menu');
      currentStateRef.current = 'menu';
    }
  };

  const handleCreatePrivateRoom = async () => {
    try {
      setError('');
      const code = await createPvPRoom(myId, userPseudo, true);
      setRoomCode(code);
      currentStateRef.current = 'waiting';
      setPvpState('waiting');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleJoinPrivateRoom = async () => {
    try {
      setError('');
      const code = roomCode.toUpperCase().trim();
      if (code.length !== 5) {
        setError('Code invalide (5 caractères)');
        return;
      }
      await joinPvPRoom(code, myId, userPseudo);
      setRoomCode(code);
      currentStateRef.current = 'waiting';
      setPvpState('waiting');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleReady = async () => {
    if (!roomCode || !myId) return;

    try {
      console.log('✅ Marquage comme prêt...');
      
      // 🔥 JUSTE GÉNÉRER LA CONFIG (pas de préchargement ici)
      if (!gameConfig && roomData?.seed) {
        console.log('📦 Génération config avec seed:', roomData.seed);
        const config = generatePvPGameConfig(
          roomData.seed,
          'easy',
          cloudinaryCountries
        );
        setGameConfig(config);
      }
      
      await setPlayerReady(roomCode, myId);
    } catch (err) {
      console.error('❌ Erreur ready:', err);
    }
  };

  const handleSubmitAnswer = async () => {
    console.log(`🔍 handleSubmitAnswer appelé - hasAnsweredRef=${hasAnsweredRef.current}, isProcessingRef=${isProcessingRef.current}, userAnswer="${userAnswer}"`);
    
    if (hasAnsweredRef.current || isProcessingRef.current || !userAnswer.trim()) {
      console.log('⚠️ Soumission bloquée');
      return;
    }

    console.log('📝 ========== SOUMISSION RÉPONSE ==========');
    
    hasAnsweredRef.current = true;
    setHasAnswered(true);
    console.log('🔒 Verrouillage activé');
    
    setIsStressed(false);
    console.log('✅ Réponse verrouillée, timer continue');

    const currentRound = roomData.currentRound;
    const roundConfig = gameConfig.rounds[currentRound];
    const correctCountry = roundConfig.countryName;
    const countryData = cloudinaryCountries[correctCountry];

    const removeAccents = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const normalizedAnswer = removeAccents(userAnswer.toLowerCase().trim());
    const correctNames = countryData.names.map(name => removeAccents(name));
    const isCorrect = correctNames.includes(normalizedAnswer);

    console.log(`🎯 Réponse: "${userAnswer}" → ${isCorrect ? '✅' : '❌'}`);

    const roundStartTime = roomData.gameConfig.roundStartTime;
    const actualTimeElapsed = (Date.now() - roundStartTime) / 1000;
    console.log(`⏱️ Temps: ${actualTimeElapsed.toFixed(2)}s`);

    await submitAnswer(roomCode, myId, userAnswer, actualTimeElapsed, isCorrect, roundStartTime);
    console.log('✅ Soumis à Firebase');
    
    // 🔥 SI L'ADVERSAIRE EST DÉCONNECTÉ, FORCER SA RÉPONSE IMMÉDIATEMENT
    if (opponentDisconnected && opponentId) {
      console.log('🚨 Adversaire déconnecté - Forçage de sa réponse immédiate');
      console.log(`   opponentId: ${opponentId}`);
      console.log(`   roomCode: ${roomCode}`);
      
      // Annuler le timer de 30s si il existe
      if (reconnectionTimer) {
        clearTimeout(reconnectionTimer);
        setReconnectionTimer(null);
      }
      setDisconnectionCountdown(null);
      
      // Forcer la réponse de l'adversaire
      const opponentAnswerTime = (Date.now() - roundStartTime) / 1000;
      console.log(`   Forçage réponse adversaire avec temps: ${opponentAnswerTime.toFixed(2)}s`);
      
      await submitAnswer(roomCode, opponentId, '', opponentAnswerTime, false, roundStartTime);
      console.log('✅ Réponse de l\'adversaire forcée - Firebase devrait détecter les 2 réponses');
    }

    console.log('📝 ========================================');
    console.log('⏳ Le listener Firebase calculera les scores automatiquement...');
  };

 const handleTimeOut = async () => {
  console.log(`🔍 handleTimeOut appelé - hasAnsweredRef=${hasAnsweredRef.current}, isProcessingRef=${isProcessingRef.current}`);
  
  if (hasAnsweredRef.current || isProcessingRef.current) {
    console.log('⏹️ Timer ignoré - déjà répondu');
    return;
  }

  console.log('⏰ ========== TIMEOUT ==========');
  
  hasAnsweredRef.current = true;
  setHasAnswered(true);
  console.log('🔒 Verrouillage activé');
  
  stopAllTimers();
  setIsStressed(false);
  console.log('🧹 Timers nettoyés');

  const roundStartTime = roomData.gameConfig.roundStartTime;
  const actualTimeElapsed = (Date.now() - roundStartTime) / 1000;

  console.log(`⏱️ Temps: ${actualTimeElapsed.toFixed(2)}s`);

  await submitAnswer(roomCode, myId, '', actualTimeElapsed, false, roundStartTime);
  console.log('✅ Soumis à Firebase (réponse vide)');
  
  // 🔥 SI L'ADVERSAIRE EST DÉCONNECTÉ, FORCER SA RÉPONSE IMMÉDIATEMENT
  if (opponentDisconnected && opponentId) {
    console.log('🚨 Adversaire déconnecté - Forçage de sa réponse immédiate');
    
    // Annuler le timer de 30s si il existe
    if (reconnectionTimer) {
      clearTimeout(reconnectionTimer);
      setReconnectionTimer(null);
    }
    setDisconnectionCountdown(null);
    
    // Forcer la réponse de l'adversaire
    const opponentAnswerTime = (Date.now() - roundStartTime) / 1000;
    await submitAnswer(roomCode, opponentId, '', opponentAnswerTime, false, roundStartTime);
    console.log('✅ Réponse de l\'adversaire forcée');
  }
  
  console.log('⏰ ====================================');
  console.log('⏳ Le listener Firebase calculera les scores automatiquement...');
};

  const handleNextRound = async () => {
    if (!roomCode || !myId) return;

    console.log('➡️ handleNextRound: Joueur prêt pour le round suivant');
    await setPlayerReady(roomCode, myId);
    
    // 🔥 La vérification sera faite dans le listener Firebase, pas ici !
  };

  const handleLeaveRoom = async () => {
    console.log('🚪 Quitter la room');
    stopAllTimers();
    if (roomCode && myId) {
      await leaveRoom(roomCode, myId);
    }
    setRoomCode('');
    currentStateRef.current = 'menu';
    setPvpState('menu');
    onBack();
  };

  // === RENDERS ===

  if (pvpState === 'menu') {
    return (
      <div className="container">
        <button className="langButton" onClick={onBack} style={{position: 'absolute', top: '20px', left: '20px'}}>
          ← Retour
        </button>

        <h1 className="title">⚔️ MODE PVP</h1>
        <p className="subtitle">Affrontez un adversaire en temps réel !</p>

        {error && <p style={{color: '#f44336', marginBottom: '20px'}}>{error}</p>}

        <div className="pvp-menu-container">
          <div className="pvp-menu-card" onClick={handleQuickMatch}>
            <h2>🎲 MATCH RAPIDE</h2>
            <p>Trouve automatiquement un adversaire</p>
          </div>

          <div className="modeCard" onClick={handleCreatePrivateRoom}>
            <h2>🔒 PARTIE PRIVÉE</h2>
            <p>Crée une room et partage le code</p>
          </div>
        </div>

        <div className="pvp-join-section">
          <p>Ou rejoins une partie avec un code :</p>
          <div className="pvp-join-input-container">
            <div className="pvp-input-with-paste">
              <input
                type="text"
                className="pvp-join-input"
                placeholder="CODE"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && roomCode.trim().length === 5) {
                    handleJoinPrivateRoom();
                  }
                }}
                maxLength={5}
                autoFocus
              />
              <button 
                className="pvp-paste-button" 
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    setRoomCode(text.toUpperCase().trim().slice(0, 5));
                  } catch (err) {
                    console.error('Erreur copie:', err);
                  }
                }}
                title="Coller"
              >
                <span>📋</span>
              </button>
            </div>
            <button className="pvp-join-button" onClick={handleJoinPrivateRoom}>
              Rejoindre
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (pvpState === 'waiting') {
    const isWaitingForOpponent = !opponentData;

    return (
      <div className="container">
        <div style={{textAlign: 'center'}}>
          {roomData?.isPrivate && !opponentData && (
            <div className="pvp-room-code-display">
              <p>Code de la partie :</p>
              <div className="pvp-room-code-container">
                <h1 className="pvp-room-code">{roomCode}</h1>
                <button 
                  className={`pvp-copy-button ${copied ? 'copied' : ''}`}
                  onClick={() => {
                    navigator.clipboard.writeText(roomCode);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  {copied ? '✓ Copié' : '📋 Copier'}
                </button>
              </div>
              <p style={{color: 'var(--text-muted)', fontSize: '0.9375rem', marginTop: '12px'}}>
                Partage ce code avec ton adversaire
              </p>
            </div>
          )}

          <h2 style={{color: '#fff', marginBottom: '20px'}}>
            {isWaitingForOpponent ? '⏳ En attente d\'un adversaire...' : '✅ Adversaire trouvé !'}
          </h2>

          {opponentData && (
            <div style={{marginBottom: '30px'}}>
              <div style={{display: 'flex', justifyContent: 'center', gap: '50px', marginTop: '30px'}}>
                <div style={{textAlign: 'center'}}>
                  <div style={{fontSize: '48px', marginBottom: '10px'}}>
                    {myData?.ready ? '✅' : '⏳'}
                  </div>
                  <p style={{color: '#fff', fontWeight: 'bold'}}>{userPseudo}</p>
                  <p style={{color: '#888', fontSize: '14px'}}>
                    {myData?.ready ? 'Prêt' : 'En attente...'}
                  </p>
                </div>

                <div style={{fontSize: '48px', color: '#fff'}}>VS</div>

                <div style={{textAlign: 'center'}}>
                  <div style={{fontSize: '48px', marginBottom: '10px'}}>
                    {opponentData?.ready ? '✅' : '⏳'}
                  </div>
                  <p style={{color: '#fff', fontWeight: 'bold'}}>{opponentData?.pseudo}</p>
                  <p style={{color: '#888', fontSize: '14px'}}>
                    {opponentData?.ready ? 'Prêt' : 'En attente...'}
                  </p>
                </div>
              </div>

              {!myData?.ready && (
                <button className="button" onClick={handleReady} style={{marginTop: '40px'}}>
                  JE SUIS PRÊT
                </button>
              )}

              {myData?.ready && !opponentData?.ready && (
                <p style={{color: '#888', marginTop: '30px'}}>
                  En attente de l'adversaire...
                </p>
              )}
            </div>
          )}

          <button className="button secondary" onClick={handleLeaveRoom} style={{marginTop: '20px'}}>
            Annuler
          </button>
        </div>
      </div>
    );
  }

  if (pvpState === 'countdown') {
    return (
      <div className="container">
        <p className="roundLarge">Round {(roomData?.currentRound || 0) + 1}/{roomData?.maxRounds || 5}</p>
        <h1 className="countdown">{countdown === 0 ? 'GO!' : countdown}</h1>
      </div>
    );
  }

  if (pvpState === 'playing' && gameConfig) {
    const currentRound = roomData.currentRound;
    const roundConfig = gameConfig.rounds[currentRound];
    const currentImage = roundConfig?.images[currentImageIndex];

    return (
      <div className="container">
        <div className="gameContent">
          <div className="gameHeader" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
            <div style={{textAlign: 'left'}}>
              <p style={{color: '#4CAF50', fontWeight: 'bold', fontSize: '16px'}}>{userPseudo}</p>
              <p style={{color: '#fff', fontSize: '20px'}}>{myData?.score || 0} pts</p>
            </div>

            <div style={{textAlign: 'center'}}>
              <p className="question">{t.question}</p>
              <p className="round">Round {currentRound + 1}/{roomData.maxRounds}</p>
            </div>

            <div style={{textAlign: 'right'}}>
              <p style={{color: '#f44336', fontWeight: 'bold', fontSize: '16px'}}>{opponentData?.pseudo}</p>
              <p style={{color: '#fff', fontSize: '20px'}}>{opponentData?.score || 0} pts</p>
            </div>
          </div>

          {isStressed && !hasAnswered && (
            <div style={{
              backgroundColor: '#f44336',
              color: '#fff',
              padding: '10px',
              borderRadius: '5px',
              marginBottom: '10px',
              fontWeight: 'bold',
              animation: 'pulse 1s infinite'
            }}>
              ⚠️ ADVERSAIRE A RÉPONDU - 10 SECONDES !
            </div>
          )}

          <div style={{width: '100%', maxWidth: '600px', display: 'flex', alignItems: 'center', marginBottom: '15px', gap: '10px'}}>
            <div style={{flex: 1, height: '20px', backgroundColor: '#333', borderRadius: '10px', overflow: 'hidden'}}>
              <div style={{
                width: `${(() => {
                  // 🔥 CALCUL CORRECT DU POURCENTAGE
                  const iHaveAnswered = hasAnswered;
                  const opponentHasAnswered = opponentData?.hasAnswered;
                  
                  // Si quelqu'un a répondu → mode stress (10s)
                  if (iHaveAnswered || opponentHasAnswered) {
                    return (timeLeft / 10) * 100;
                  }
                  // Sinon → mode normal (30s)
                  return (timeLeft / 30) * 100;
                })()}%`,
                height: '100%',
                backgroundColor: (() => {
                  if (opponentDisconnected) return '#9C27B0'; // Violet pour déconnexion
                  if (isStressed || hasAnswered || opponentData?.hasAnswered) {
                    // Mode stress (10s)
                    return timeLeft <= 3 ? '#f44336' : timeLeft <= 7 ? '#FF9800' : '#4CAF50';
                  }
                  // Mode normal (30s)
                  return timeLeft <= 10 ? '#f44336' : timeLeft <= 20 ? '#FF9800' : '#4CAF50';
                })(),
                borderRadius: '10px',
                transition: 'width 0.1s linear, background-color 0.3s ease'
              }}></div>
            </div>
            <span style={{fontSize: '18px', fontWeight: 'bold', color: '#fff', width: '50px', textAlign: 'right'}}>
              {timeLeft}s
            </span>
          </div>

          <div className="imageContainer">
            <img 
              src={currentImage} 
              alt="country" 
              className="image"
            />
          </div>

          <div className="inputContainer">
            <input
              type="text"
              className="input"
              placeholder={t.typeCountry}
              value={userAnswer}
              onChange={(e) => !hasAnswered && setUserAnswer(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !hasAnswered && !hasAnsweredRef.current && userAnswer.trim()) {
                  handleSubmitAnswer();
                }
              }}
              autoFocus
              disabled={hasAnswered}
              readOnly={hasAnswered}
            />
            <button 
              className="submitButton" 
              onClick={handleSubmitAnswer} 
              disabled={hasAnswered || !userAnswer.trim()}
            >
              {hasAnswered ? '✅' : '✓'}
            </button>
          </div>

          {hasAnswered && (
            <div style={{
              backgroundColor: 'rgba(76, 175, 80, 0.2)',
              border: '2px solid #4CAF50',
              color: '#4CAF50',
              padding: '12px',
              borderRadius: '8px',
              marginTop: '10px',
              fontWeight: 'bold',
              textAlign: 'center'
            }}>
              ✅ Réponse envoyée !
              {!opponentData?.hasAnswered && !opponentDisconnected && (
                <div style={{marginTop: '8px', fontSize: '14px'}}>
                  En attente de l'adversaire... ({timeLeft}s restantes)
                </div>
              )}
              {opponentDisconnected && disconnectionCountdown !== null && (
                <div style={{marginTop: '8px', fontSize: '14px', color: '#FF9800'}}>
                  Adversaire déconnecté - Fin dans {disconnectionCountdown}s
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (pvpState === 'round_end' && gameConfig && roundEndData) {
    const { roundNumber, lastResult, myData: frozenMyData, opponentData: frozenOpponentData } = roundEndData;
    
    if (!lastResult) {
      return (
        <div className="container">
          <p style={{color: '#fff'}}>⏳ Chargement des résultats...</p>
        </div>
      );
    }
    
    const correctCountry = lastResult.correctAnswer;
    const countryData = cloudinaryCountries[correctCountry];

    const myAnswerTime = frozenMyData?.answerTime || 30;
    const opponentAnswerTime = frozenOpponentData?.answerTime || 30;
    
    const myIsFirst = frozenMyData?.isCorrect && myAnswerTime < opponentAnswerTime;
    const opponentIsFirst = frozenOpponentData?.isCorrect && opponentAnswerTime < myAnswerTime;
    
    const myRoundScore = calculateRoundScore(frozenMyData?.isCorrect, myAnswerTime, myIsFirst);
    const opponentRoundScore = calculateRoundScore(frozenOpponentData?.isCorrect, opponentAnswerTime, opponentIsFirst);

    return (
      <div className="container">
        <div className="roundEndTop">
          {opponentDisconnected && (  // ✅ AVANT le titre
            <div style={{
              backgroundColor: '#FF9800',
              color: '#fff',
              padding: '15px',
              borderRadius: '10px',
              marginBottom: '20px',
              fontWeight: 'bold',
              textAlign: 'center',
              animation: 'pulse 1.5s infinite'
            }}>
              ⚠️ Adversaire déconnecté
              {disconnectionCountdown !== null && (
                <div style={{fontSize: '24px', marginTop: '8px'}}>
                  Victoire par forfait dans {disconnectionCountdown}s
                </div>
              )}
            </div>
          )}
          <h1 className="resultTitle">Round {roundNumber} terminé !</h1>

          <div className="flag">
            <EmojiText>{countryData.flag}</EmojiText>
          </div>
          <p className="countryName">{t.countries[correctCountry] || correctCountry}</p>

          <div style={{display: 'flex', justifyContent: 'space-around', width: '100%', maxWidth: '600px', marginTop: '30px'}}>
            <div style={{textAlign: 'center', flex: 1, padding: '20px', backgroundColor: frozenMyData?.isCorrect ? '#1b5e20' : '#b71c1c', borderRadius: '10px', margin: '0 10px'}}>
              <p style={{fontWeight: 'bold', fontSize: '18px', marginBottom: '10px'}}>{userPseudo}</p>
              <p style={{fontSize: '16px', marginBottom: '5px'}}>
                <EmojiText>{frozenMyData?.isCorrect ? '✅' : '❌'}</EmojiText> {frozenMyData?.answer || '(pas de réponse)'}
              </p>
              <p style={{fontSize: '14px', color: '#ccc', marginBottom: '10px'}}>
                {myAnswerTime.toFixed(1)}s {myIsFirst && '⚡ BONUS'}
              </p>
              <p style={{fontSize: '24px', fontWeight: 'bold', color: '#4CAF50'}}>
                +{myRoundScore} pts
              </p>
              <p style={{fontSize: '14px', color: '#888'}}>Total: {frozenMyData?.score || 0}</p>
            </div>

            <div style={{textAlign: 'center', flex: 1, padding: '20px', backgroundColor: frozenOpponentData?.isCorrect ? '#1b5e20' : '#b71c1c', borderRadius: '10px', margin: '0 10px'}}>
              <p style={{fontWeight: 'bold', fontSize: '18px', marginBottom: '10px'}}>{frozenOpponentData?.pseudo}</p>
              <p style={{fontSize: '16px', marginBottom: '5px'}}>
                {frozenOpponentData?.isCorrect ? '✅' : '❌'} {frozenOpponentData?.answer || '(pas de réponse)'}
              </p>
              <p style={{fontSize: '14px', color: '#ccc', marginBottom: '10px'}}>
                {opponentAnswerTime.toFixed(1)}s {opponentIsFirst && '⚡ BONUS'}
              </p>
              <p style={{fontSize: '24px', fontWeight: 'bold', color: '#4CAF50'}}>
                +{opponentRoundScore} pts
              </p>
              <p style={{fontSize: '14px', color: '#888'}}>Total: {frozenOpponentData?.score || 0}</p>
            </div>
          </div>

          <div style={{marginTop: '30px'}}>
            <div style={{display: 'flex', justifyContent: 'center', gap: '40px', marginBottom: '20px'}}>
              <div style={{textAlign: 'center'}}>
                <div style={{fontSize: '36px', marginBottom: '8px'}}>
                  {myData?.ready ? '✅' : '⏳'}
                </div>
                <p style={{color: '#fff', fontWeight: 'bold', fontSize: '16px'}}>{userPseudo}</p>
                <p style={{color: myData?.ready ? '#4CAF50' : '#888', fontSize: '14px'}}>
                  {myData?.ready ? 'Prêt' : 'En attente...'}
                </p>
              </div>

              <div style={{fontSize: '28px', color: '#fff', alignSelf: 'center'}}>VS</div>

              <div style={{textAlign: 'center'}}>
                <div style={{fontSize: '36px', marginBottom: '8px'}}>
                  {opponentData?.ready ? '✅' : '⏳'}
                </div>
                <p style={{color: '#fff', fontWeight: 'bold', fontSize: '16px'}}>{frozenOpponentData?.pseudo}</p>
                <p style={{color: opponentData?.ready ? '#4CAF50' : '#888', fontSize: '14px'}}>
                  {opponentData?.ready ? 'Prêt' : 'En attente...'}
                </p>
              </div>
            </div>

            {/* 🔥 VÉRIFIER SI C'EST LE DERNIER ROUND */}
            {(() => {
              const isLastRound = (roomData?.currentRound + 1) >= (roomData?.maxRounds || 5);
              
              if (isLastRound) {
                // Dernier round - Bouton direct vers les résultats (LOCAL, pas Firebase)
                return (
                  <button 
                    className="button" 
                    onClick={() => {
                      console.log('🏁 Dernier round - Passage LOCAL aux résultats finaux');
                      
                      // 🔥 CAPTURER LES DONNÉES FINALES MAINTENANT
                      setGameEndData({
                        myScore: frozenMyData?.score || 0,
                        myPseudo: userPseudo,
                        opponentScore: frozenOpponentData?.score || 0,
                        opponentPseudo: frozenOpponentData?.pseudo || 'Adversaire'
                      });
                      
                      // 🔥 CHANGEMENT LOCAL uniquement
                      currentStateRef.current = 'game_end';
                      setPvpState('game_end');
                      stopAllTimers();
                    }}
                  >
                    VOIR LES RÉSULTATS
                  </button>
                );
              } else {
                // Round normal - Attendre que les 2 soient prêts
                return !myData?.ready ? (
                  <button className="button" onClick={handleNextRound}>
                    ROUND SUIVANT
                  </button>
                ) : (
                  <p style={{color: '#888', fontSize: '16px'}}>
                    {opponentData?.ready ? '⏳ Démarrage...' : '⏳ En attente de l\'adversaire...'}
                  </p>
                );
              }
            })()}
          </div>
        </div>

        <div className="countryInfo">
          <p>{t.capital}: {countryData.capital[language]}</p>
          <p>{t.population}: {countryData.population[language]}</p>
          <p>{t.area}: {countryData.area[language]}</p>
        </div>
      </div>
    );
  }

  if (pvpState === 'game_end' && gameEndData) {
    const { myScore, myPseudo, opponentScore, opponentPseudo } = gameEndData;
    const iWon = myScore > opponentScore;
    const isDraw = myScore === opponentScore;

    return (
      <div className="container">
        <h1 className="title">
          {isDraw ? '🤝 ÉGALITÉ !' : iWon ? '🏆 VICTOIRE !' : '😢 DÉFAITE'}
        </h1>

        <div style={{display: 'flex', justifyContent: 'center', gap: '50px', marginTop: '40px'}}>
          <div style={{textAlign: 'center'}}>
            <div style={{fontSize: '72px', marginBottom: '10px'}}>
              <EmojiText>{iWon ? '🥇' : isDraw ? '🤝' : '🥈'}</EmojiText>
            </div>
            <p style={{color: '#fff', fontWeight: 'bold', fontSize: '24px'}}>{myPseudo}</p>
            <p style={{
              color: isDraw ? '#FF9800' : (iWon ? '#4CAF50' : '#f44336'),
              fontSize: '48px', 
              fontWeight: 'bold'
            }}>
              {myScore}
            </p>
          </div>

          <div style={{fontSize: '48px', color: '#fff', alignSelf: 'center'}}>-</div>

          <div style={{textAlign: 'center'}}>
            <div style={{fontSize: '72px', marginBottom: '10px'}}>
              <EmojiText>{!iWon && !isDraw ? '🥇' : isDraw ? '🤝' : '🥈'}</EmojiText>
            </div>
            <p style={{color: '#fff', fontWeight: 'bold', fontSize: '24px'}}>{opponentPseudo}</p>
            <p style={{
              color: isDraw ? '#FF9800' : (!iWon && !isDraw ? '#4CAF50' : '#f44336'),
              fontSize: '48px', 
              fontWeight: 'bold'
            }}>
              {opponentScore}
            </p>
          </div>
        </div>

        <button className="button" onClick={handleLeaveRoom} style={{marginTop: '50px'}}>
          RETOUR AU MENU
        </button>
      </div>
    );
  }

  if (pvpState === 'playing' && !gameConfig) {
    return (
      <div className="container">
        <p style={{color: '#fff'}}>⏳ Chargement de la configuration...</p>
      </div>
    );
  }

  return <div className="container"><p>Chargement...</p></div>;
};

export default PvPMode;