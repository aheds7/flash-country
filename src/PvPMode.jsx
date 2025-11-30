import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { countries as cloudinaryCountries } from './countries';
import { generatePvPGameConfig, getCurrentImageIndex } from './gameSeed';
import { ref, update } from 'firebase/database'; 
import { database } from './firebase';     
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
  
  // États du jeu
  const [countdown, setCountdown] = useState(3);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [hasAnswered, setHasAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isStressed, setIsStressed] = useState(false);
  
  // Refs
  const unsubscribeRef = useRef(null);
  const animationRef = useRef(null);
  const heartbeatRef = useRef(null);
  const timeoutRef = useRef(null);
  const hasAnsweredRef = useRef(false);
  const isProcessingRef = useRef(false);
  const currentStateRef = useRef('menu'); // Pour éviter les boucles

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

      // VÉRIFIER SI LES 2 ONT RÉPONDU (pendant le jeu)
      if (data.status === 'playing' && currentStateRef.current === 'playing') {
        const players = Object.values(data.players || {});
        const bothAnswered = players.length === 2 && players.every(p => p.hasAnswered);
        const amIHost = data.players[myId]?.isHost;
        
        if (bothAnswered && amIHost && !isProcessingRef.current) {
          console.log('🔔 FIREBASE DÉTECTE: Les 2 ont répondu !');
          isProcessingRef.current = true; // Empêcher le re-calcul
          
          // Calculer les scores
          console.log('🏆 ========== CALCUL AUTOMATIQUE DES SCORES ==========');
          
          const playerIds = Object.keys(data.players);
          
          // Trouve le premier
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

          // Calcule les scores
          const scores = {};
          for (const pid of playerIds) {
            const p = data.players[pid];
            const isFirst = (pid === firstPlayerId && p.isCorrect);
            scores[pid] = calculateRoundScore(p.isCorrect, p.answerTime, isFirst);
            
            console.log(`📊 ${p.pseudo}: ${scores[pid]} pts`);
            await updatePlayerScore(roomCode, pid, scores[pid]);
          }

          // Prépare les résultats
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

          // Trouve la bonne réponse
          if (gameConfig) {
            const currentRound = data.currentRound;
            const roundConfig = gameConfig.rounds[currentRound];
            const correctCountry = roundConfig.countryName;

            // Termine le round
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

      // PROTECTION ANTI-BOUCLE : utiliser la ref au lieu du state
      if (data.status === 'countdown' && currentStateRef.current !== 'countdown') {
        console.log('🔄 Changement: waiting → countdown');
        currentStateRef.current = 'countdown';
        setPvpState('countdown');
        setCountdown(data.countdown || 3);
      } else if (data.status === 'playing' && currentStateRef.current !== 'playing') {
        // NE PAS repasser en playing si on est déjà en round_end
        console.log('🔄 Changement: countdown → playing');
        currentStateRef.current = 'playing';
        setPvpState('playing');
        hasAnsweredRef.current = false;
        isProcessingRef.current = false;
        setHasAnswered(false);
        setUserAnswer('');
        setTimeLeft(30);
        setIsStressed(false);
        setCurrentImageIndex(0);
      } else if (data.status === 'round_end' && currentStateRef.current !== 'round_end') {
        console.log('🔄 Changement: playing → round_end');
        currentStateRef.current = 'round_end';
        setPvpState('round_end');
        stopAllTimers();
      } else if (data.status === 'game_end' && currentStateRef.current !== 'game_end') {
        console.log('🔄 Changement: round_end → game_end');
        currentStateRef.current = 'game_end';
        setPvpState('game_end');
        stopAllTimers();
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
      startRound(roomCode, roomData.currentRound);
    }
  }, [pvpState, countdown, myData?.isHost, roomCode, roomData?.currentRound]);

  // DÉTECTION DU MODE STRESS (useEffect séparé)
  useEffect(() => {
    if (pvpState !== 'playing' || hasAnsweredRef.current || currentStateRef.current !== 'playing') return;
    
    if (opponentData?.hasAnswered && !hasAnsweredRef.current) {
      console.log('🚨 MODE STRESS ACTIVÉ');
      setIsStressed(true);
    }
  }, [pvpState, opponentData?.hasAnswered]);

  // TIMER PRINCIPAL
  useEffect(() => {
    // VÉRIFICATION CRITIQUE EN PREMIER
    if (hasAnsweredRef.current || isProcessingRef.current || currentStateRef.current !== 'playing') {
      console.log('⏹️ Timer ignoré - déjà répondu');
      return;
    }
    
    // NE PAS démarrer le timer si on est en round_end
    if (currentStateRef.current === 'round_end' || currentStateRef.current === 'game_end') {
      console.log('⏹️ Timer ignoré - partie terminée');
      return;
    }
    
    if (pvpState !== 'playing' || !roomData?.gameConfig?.roundStartTime) return;

    const roundStartTime = roomData.gameConfig.roundStartTime;
    
    console.log('⏱️ Timer démarré');
    const interval = setInterval(() => {
      // Double vérification à chaque tick
      if (hasAnsweredRef.current || currentStateRef.current !== 'playing') {
        console.log('⏹️ Arrêt du timer - réponse détectée ou changement d\'état');
        clearInterval(interval);
        return;
      }

      const currentTime = Date.now();
      const elapsedSeconds = (currentTime - roundStartTime) / 1000;
      
      // Mode stress : 10 secondes après la réponse de l'adversaire
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
        // Mode normal : 30 secondes
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
      
      if (index < totalImages) {
        setCurrentImageIndex(index);
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setCurrentImageIndex(totalImages - 1);
      }
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
      if (code.length !== 4) {
        setError('Code invalide (4 caractères)');
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
      await setPlayerReady(roomCode, myId);

      if (!gameConfig && roomData?.seed) {
        console.log('📦 Génération config avec seed:', roomData.seed);
        const config = generatePvPGameConfig(
          roomData.seed,
          'easy',
          cloudinaryCountries
        );
        setGameConfig(config);
      }
      
      // Le countdown sera lancé automatiquement par le listener
      // quand il détectera que les 2 joueurs sont prêts
    } catch (err) {
      console.error('❌ Erreur ready:', err);
    }
  };

  const handleSubmitAnswer = async () => {
    console.log(`🔍 handleSubmitAnswer appelé - hasAnsweredRef=${hasAnsweredRef.current}, isProcessingRef=${isProcessingRef.current}, userAnswer="${userAnswer}"`);
    
    // TRIPLE PROTECTION
    if (hasAnsweredRef.current || isProcessingRef.current || !userAnswer.trim()) {
      console.log('⚠️ Soumission bloquée');
      return;
    }

    console.log('📝 ========== SOUMISSION RÉPONSE ==========');
    
    // VERROUILLER IMMÉDIATEMENT
    hasAnsweredRef.current = true;
    setHasAnswered(true);
    console.log('🔒 Verrouillage activé');
    
    // NETTOYER TOUS LES TIMERS
    stopAllTimers();
    setIsStressed(false);
    console.log('🧹 Timers nettoyés');

    const currentRound = roomData.currentRound;
    const roundConfig = gameConfig.rounds[currentRound];
    const correctCountry = roundConfig.countryName;
    const countryData = cloudinaryCountries[correctCountry];

    // Vérifie la réponse
    const removeAccents = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const normalizedAnswer = removeAccents(userAnswer.toLowerCase().trim());
    const correctNames = countryData.names.map(name => removeAccents(name));
    const isCorrect = correctNames.includes(normalizedAnswer);

    console.log(`🎯 Réponse: "${userAnswer}" → ${isCorrect ? '✅' : '❌'}`);

    // Temps depuis le début du round
    const roundStartTime = roomData.gameConfig.roundStartTime;
    const actualTimeElapsed = (Date.now() - roundStartTime) / 1000;
    console.log(`⏱️ Temps: ${actualTimeElapsed.toFixed(2)}s`);

    // Soumet la réponse
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

    if (myData?.isHost) {
      console.log('👑 HOST: Vérification si tout le monde est prêt');
      const players = roomData.players;
      const allReady = Object.values(players).every(p => p.ready);

      if (allReady) {
        const nextRound = roomData.currentRound + 1;
        console.log(`📈 Round suivant: ${nextRound + 1}/${roomData.maxRounds}`);
        
        if (nextRound >= roomData.maxRounds) {
          console.log('🏁 Partie terminée !');
          await endGame(roomCode);
        } else {
          console.log(`🔄 Passage au round ${nextRound + 1}`);
          // IMPORTANT: Réinitialiser la ref d'état
          currentStateRef.current = 'countdown';
          await update(ref(database, `pvp_rooms/${roomCode}`), {
            status: 'countdown',
            countdown: 3,
            currentRound: nextRound
          });
        }
      } else {
        console.log('⏳ En attente que l\'adversaire soit prêt');
      }
    }
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

        <div className="modeContainer">
          <div className="modeCard" onClick={handleQuickMatch}>
            <h2>🎲 MATCH RAPIDE</h2>
            <p>Trouve automatiquement un adversaire</p>
          </div>

          <div className="modeCard" onClick={handleCreatePrivateRoom}>
            <h2>🔒 PARTIE PRIVÉE</h2>
            <p>Crée une room et partage le code</p>
          </div>
        </div>

        <div style={{marginTop: '30px', width: '100%', maxWidth: '400px'}}>
          <p style={{color: '#fff', marginBottom: '10px'}}>Ou rejoins une partie avec un code :</p>
          <div style={{display: 'flex', gap: '10px'}}>
            <input
              type="text"
              className="input"
              placeholder="CODE (ex: AB12)"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={4}
              style={{flex: 1}}
            />
            <button className="submitButton" onClick={handleJoinPrivateRoom}>
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
          {roomData?.isPrivate && (
            <div style={{marginBottom: '30px', padding: '20px', backgroundColor: '#1a1a1a', borderRadius: '10px'}}>
              <p style={{color: '#fff', fontSize: '18px', marginBottom: '10px'}}>Code de la partie :</p>
              <h1 style={{fontSize: '48px', color: '#4CAF50', letterSpacing: '10px'}}>{roomCode}</h1>
              <p style={{color: '#888', fontSize: '14px'}}>Partage ce code avec ton adversaire</p>
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

  if (pvpState === 'round_end' && gameConfig) {
    const currentRound = roomData.currentRound;
    const roundConfig = gameConfig.rounds[currentRound];
    const countryName = roundConfig.countryName;
    const countryData = cloudinaryCountries[countryName];

    const myAnswerTime = myData?.answerTime || 30;
    const opponentAnswerTime = opponentData?.answerTime || 30;
    
    const myIsFirst = myData?.isCorrect && myAnswerTime < opponentAnswerTime;
    const opponentIsFirst = opponentData?.isCorrect && opponentAnswerTime < myAnswerTime;
    
    const myRoundScore = calculateRoundScore(myData?.isCorrect, myAnswerTime, myIsFirst);
    const opponentRoundScore = calculateRoundScore(opponentData?.isCorrect, opponentAnswerTime, opponentIsFirst);

    return (
      <div className="container">
        <div className="roundEndTop">
          <h1 className="resultTitle">Round {currentRound + 1} terminé !</h1>

          <div className="flag">{countryData.flag}</div>
          <p className="countryName">{t.countries[countryName] || countryName}</p>

          <div style={{display: 'flex', justifyContent: 'space-around', width: '100%', maxWidth: '600px', marginTop: '30px'}}>
            <div style={{textAlign: 'center', flex: 1, padding: '20px', backgroundColor: myData?.isCorrect ? '#1b5e20' : '#b71c1c', borderRadius: '10px', margin: '0 10px'}}>
              <p style={{fontWeight: 'bold', fontSize: '18px', marginBottom: '10px'}}>{userPseudo}</p>
              <p style={{fontSize: '16px', marginBottom: '5px'}}>
                {myData?.isCorrect ? '✅' : '❌'} {myData?.answer || '(pas de réponse)'}
              </p>
              <p style={{fontSize: '14px', color: '#ccc', marginBottom: '10px'}}>
                {myAnswerTime.toFixed(1)}s {myIsFirst && '⚡ BONUS'}
              </p>
              <p style={{fontSize: '24px', fontWeight: 'bold', color: '#4CAF50'}}>
                +{myRoundScore} pts
              </p>
              <p style={{fontSize: '14px', color: '#888'}}>Total: {myData?.score || 0}</p>
            </div>

            <div style={{textAlign: 'center', flex: 1, padding: '20px', backgroundColor: opponentData?.isCorrect ? '#1b5e20' : '#b71c1c', borderRadius: '10px', margin: '0 10px'}}>
              <p style={{fontWeight: 'bold', fontSize: '18px', marginBottom: '10px'}}>{opponentData?.pseudo}</p>
              <p style={{fontSize: '16px', marginBottom: '5px'}}>
                {opponentData?.isCorrect ? '✅' : '❌'} {opponentData?.answer || '(pas de réponse)'}
              </p>
              <p style={{fontSize: '14px', color: '#ccc', marginBottom: '10px'}}>
                {opponentAnswerTime.toFixed(1)}s {opponentIsFirst && '⚡ BONUS'}
              </p>
              <p style={{fontSize: '24px', fontWeight: 'bold', color: '#4CAF50'}}>
                +{opponentRoundScore} pts
              </p>
              <p style={{fontSize: '14px', color: '#888'}}>Total: {opponentData?.score || 0}</p>
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

  if (pvpState === 'game_end') {
    const myScore = myData?.score || 0;
    const opponentScore = opponentData?.score || 0;
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
            <p style={{color: '#fff', fontWeight: 'bold', fontSize: '24px'}}>{userPseudo}</p>
            <p style={{color: '#4CAF50', fontSize: '48px', fontWeight: 'bold'}}>{myScore}</p>
          </div>

          <div style={{fontSize: '48px', color: '#fff', alignSelf: 'center'}}>-</div>

          <div style={{textAlign: 'center'}}>
            <div style={{fontSize: '72px', marginBottom: '10px'}}>
              {!iWon && !isDraw ? '🥇' : isDraw ? '🤝' : '🥈'}
            </div>
            <p style={{color: '#fff', fontWeight: 'bold', fontSize: '24px'}}>{opponentData?.pseudo}</p>
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