import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { countries as cloudinaryCountries } from './countries';
import { generatePvPGameConfig, getCurrentImageIndex } from './gameSeed';
import { ref, update } from 'firebase/database'; 
import { database } from './firebase';
import { useImagePreloader } from './useImagePreloader'; // 🔥 AJOUT
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
        const bothReady = players.length === 2 && players.every(p => p.ready);
        const amIHost = data.players[myId]?.isHost;
        
        if (bothReady && amIHost) {
          console.log('✅ Les 2 joueurs sont prêts pour le round suivant !');
          const nextRound = data.currentRound + 1;
          
          if (nextRound >= data.maxRounds) {
            console.log('🏁 Partie terminée !');
            await endGame(roomCode);
          } else {
            console.log(`🔄 Passage au round ${nextRound + 1}`);
            
            // 🔥 RÉINITIALISER ready POUR TOUS LES JOUEURS
            const playerIds = Object.keys(data.players);
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
        const bothAnswered = players.length === 2 && players.every(p => p.hasAnswered);
        const amIHost = data.players[myId]?.isHost;
        
        if (bothAnswered && amIHost && !isProcessingRef.current) {
          console.log('🔔 FIREBASE DÉTECTE: Les 2 ont répondu !');
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
  useEffect(() => {
    if (hasAnsweredRef.current || isProcessingRef.current || currentStateRef.current !== 'playing') {
      console.log('⏹️ Timer ignoré - déjà répondu');
      return;
    }
    
    if (currentStateRef.current === 'round_end' || currentStateRef.current === 'game_end') {
      console.log('⏹️ Timer ignoré - partie terminée');
      return;
    }
    
    if (pvpState !== 'playing' || !roomData?.gameConfig?.roundStartTime) return;

    const roundStartTime = roomData.gameConfig.roundStartTime;
    
    console.log('⏱️ Timer démarré');
    const interval = setInterval(() => {
      if (hasAnsweredRef.current || currentStateRef.current !== 'playing') {
        console.log('⏹️ Arrêt du timer - réponse détectée ou changement d\'état');
        clearInterval(interval);
        return;
      }

      const currentTime = Date.now();
      const elapsedSeconds = (currentTime - roundStartTime) / 1000;
      
      if (opponentData?.hasAnswered) {
        const opponentAnswerTime = opponentData.answerTime || 0;
        const stressDeadline = opponentAnswerTime + 10;
        const timeLeftInStress = Math.max(0, stressDeadline - elapsedSeconds);
        
        setTimeLeft(Math.ceil(timeLeftInStress));
        
        if (timeLeftInStress <= 0) {
          console.log('⏰ TEMPS ÉCOULÉ EN MODE STRESS !');
          clearInterval(interval);
          handleTimeOut();
          return;
        }
      } else {
        const timeLeftNormal = Math.max(0, 30 - elapsedSeconds);
        setTimeLeft(Math.ceil(timeLeftNormal));
        
        if (timeLeftNormal <= 0) {
          console.log('⏰ TEMPS ÉCOULÉ (30s) !');
          clearInterval(interval);
          handleTimeOut();
          return;
        }
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
  }, [pvpState, roomData?.gameConfig?.roundStartTime, roomData?.currentRound, opponentData?.hasAnswered, opponentData?.answerTime]);

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
    
    stopAllTimers();
    setIsStressed(false);
    console.log('🧹 Timers nettoyés');

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
                maxLength={5}
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
                width: `${(timeLeft / 30) * 100}%`,
                height: '100%',
                backgroundColor: isStressed ? '#f44336' : (timeLeft <= 10 ? '#f44336' : timeLeft <= 20 ? '#FF9800' : '#4CAF50'),
                borderRadius: '10px',
                transition: 'width 0.1s linear'
              }}></div>
            </div>
            <span style={{fontSize: '18px', fontWeight: 'bold', color: '#fff', width: '50px', textAlign: 'right'}}>{timeLeft}s</span>
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
            <p style={{color: '#4CAF50', marginTop: '10px', fontWeight: 'bold'}}>
              ✅ Réponse envoyée ! En attente de l'adversaire...
            </p>
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
          <h1 className="resultTitle">Round {roundNumber} terminé !</h1>

          <div className="flag">{countryData.flag}</div>
          <p className="countryName">{t.countries[correctCountry] || correctCountry}</p>

          <div style={{display: 'flex', justifyContent: 'space-around', width: '100%', maxWidth: '600px', marginTop: '30px'}}>
            <div style={{textAlign: 'center', flex: 1, padding: '20px', backgroundColor: frozenMyData?.isCorrect ? '#1b5e20' : '#b71c1c', borderRadius: '10px', margin: '0 10px'}}>
              <p style={{fontWeight: 'bold', fontSize: '18px', marginBottom: '10px'}}>{userPseudo}</p>
              <p style={{fontSize: '16px', marginBottom: '5px'}}>
                {frozenMyData?.isCorrect ? '✅' : '❌'} {frozenMyData?.answer || '(pas de réponse)'}
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
            {!myData?.ready ? (
              <button className="button" onClick={handleNextRound}>
                ROUND SUIVANT
              </button>
            ) : (
              <p style={{color: '#888'}}>
                {opponentData?.ready ? 'Démarrage...' : 'En attente de l\'adversaire...'}
              </p>
            )}
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
              {iWon ? '🥇' : isDraw ? '🤝' : '🥈'}
            </div>
            <p style={{color: '#fff', fontWeight: 'bold', fontSize: '24px'}}>{myPseudo}</p>
            <p style={{color: '#4CAF50', fontSize: '48px', fontWeight: 'bold'}}>{myScore}</p>
          </div>

          <div style={{fontSize: '48px', color: '#fff', alignSelf: 'center'}}>-</div>

          <div style={{textAlign: 'center'}}>
            <div style={{fontSize: '72px', marginBottom: '10px'}}>
              {!iWon && !isDraw ? '🥇' : isDraw ? '🤝' : '🥈'}
            </div>
            <p style={{color: '#fff', fontWeight: 'bold', fontSize: '24px'}}>{opponentPseudo}</p>
            <p style={{color: '#f44336', fontSize: '48px', fontWeight: 'bold'}}>{opponentScore}</p>
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