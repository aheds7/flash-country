import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import AuthScreen from './AuthScreen';
import UserProfile from './UserProfile';
import Leaderboard from './Leaderboard';
import PvPMode from './PvPMode';
import { onAuthChange, saveScore } from './firebase';
import { countries as cloudflareCountries, getRandomImages } from './countries';
import { addToHistory } from './imageHistory';
import { useImagePreloader } from './useImagePreloader';
import { EmojiText } from './emojiParser';


const translations = {
  fr: {
    // Jeu existant
    appName: 'FLASH COUNTRY', selectMode: 'Choisissez un mode', quickMode: 'RAPIDE', normalMode: 'NORMAL', marathonMode: 'MARATHON', quickDesc: '3 rounds', normalDesc: '5 rounds', marathonDesc: '10 rounds', difficulty: 'Difficulté', easy: 'FACILE', medium: 'MOYEN', hard: 'DIFFICILE', round: 'Round', question: 'De quel pays s\'agit-il ?', typeCountry: 'Tapez le nom du pays...', congratulations: '🎉 Félicitations !', failed: '❌ Raté !', youAnswered: 'Vous avez répondu', capital: 'Capitale', population: 'Population', area: 'Superficie', points: 'points', totalScore: 'Score total :', nextRound: 'ROUND SUIVANT', seeResults: 'VOIR RÉSULTATS', gameOver: 'Partie terminée !', finalScore: 'Score final :', replay: 'REJOUER', menu: 'MENU', loading: 'Chargement des images...',
    // Firebase
    welcomeMessage: 'Bienvenue ! Comment veux-tu jouer ?', playAsGuest: 'Jouer en invité', guestDesc: 'Joue rapidement sans créer de compte', withAccount: 'Avec un compte', accountDesc: 'Garde ta progression et tes scores', guestInfo: 'Entre ton pseudo pour commencer', guestWarning: 'En mode invité, ta progression ne sera pas sauvegardée', pseudoPlaceholder: 'Ton pseudo', pseudoError: 'Le pseudo doit contenir au moins 3 caractères', pseudoTooLong: 'Le pseudo ne peut pas dépasser 20 caractères', login: 'Connexion', loginSubtitle: 'Connecte-toi à ton compte', emailPlaceholder: 'Email', emailOrPseudoPlaceholder: 'Email ou pseudo', passwordPlaceholder: 'Mot de passe (min. 6 caractères)', connecting: 'Connexion...', noAccount: 'Pas encore de compte ?', signup: "S'inscrire", signupSubtitle: 'Rejoins la communauté Flash Country !', confirmPasswordPlaceholder: 'Confirmer le mot de passe', creating: 'Création...', createAccount: 'Créer mon compte', alreadyAccount: 'Déjà un compte ?', emailError: 'Email invalide', passwordError: 'Le mot de passe doit contenir au moins 6 caractères', passwordMismatch: 'Les mots de passe ne correspondent pas', emailInUse: 'Cet email est déjà utilisé', weakPassword: 'Mot de passe trop faible', wrongCredentials: 'Identifiant ou mot de passe incorrect', signupError: 'Erreur lors de la création du compte', loginError: 'Erreur de connexion', connectionError: 'Erreur de connexion. Réessayez.', profile: 'Mon Profil', statistics: 'Statistiques', history: 'Historique', bestScore: 'Meilleur score', totalGames: 'Parties jouées', average: 'Moyenne', memberSince: 'Membre depuis', noHistory: 'Aucune partie jouée pour le moment', logout: 'Se déconnecter', leaderboard: '🏆 Classement', viewLeaderboard: 'Voir le classement', allScores: 'Tous', currentSettings: 'Paramètres actuels', noScores: 'Aucun score enregistré', beFirst: 'Sois le premier à jouer dans cette catégorie !', refresh: 'Actualiser', back: 'Retour', startGame: 'Commencer à jouer', pseudoInfo: 'Ton pseudo sera affiché dans le classement',
    // PvP
    pvpMode: 'FACE A FACE', pvpDesc: 'Affrontez un adversaire !',
    countries: { 
      Spain: 'Espagne', 
      Portugal: 'Portugal', 
      France: 'France', 
      Japan: 'Japon', 
      Australia: 'Australie', 
      Italy: 'Italie', 
      Germany: 'Allemagne', 
      England: 'Angleterre',
      Brazil: 'Brésil', 
      Argentina: 'Argentine', 
      Mexico: 'Mexique', 
      Canada: 'Canada', 
      USA: 'États-Unis', 
      China: 'Chine', 
      India: 'Inde', 
      Thailand: 'Thaïlande', 
      Egypt: 'Égypte', 
      Morocco: 'Maroc', 
      SouthAfrica: 'Afrique du Sud', 
      NewZeeland: 'Nouvelle-Zélande', 
      Russia: 'Russie', 
      Greece: 'Grèce',
      Austria: 'Autriche',
      Belgium: 'Belgique',
      Chile: 'Chili',
      Croatia: 'Croatie',
      Cuba: 'Cuba',
      EmiratsArabesUnis: 'Emirats Arabes Unis',
      Ireland: 'Irlande',
      Malaysia: 'Malaisie',
      Netherlands: 'Pays-Bas',
      Norway: 'Norvège',
      Peru: 'Pérou',
      Sweden: 'Suède',
      Switzerland: 'Suisse',
      Turkey: 'Turquie',
      Vietnam: 'Vietnam',
      England: 'Angleterre'
    }
  },
  en: {
    // Existing game
    appName: 'FLASH COUNTRY', selectMode: 'Select a mode', quickMode: 'QUICK', normalMode: 'NORMAL', marathonMode: 'MARATHON', quickDesc: '3 rounds', normalDesc: '5 rounds', marathonDesc: '10 rounds', difficulty: 'Difficulty', easy: 'EASY', medium: 'MEDIUM', hard: 'HARD', round: 'Round', question: 'Which country is this?', typeCountry: 'Type the country name...', congratulations: '🎉 Congratulations!', failed: '❌ Failed!', youAnswered: 'You answered', capital: 'Capital', population: 'Population', area: 'Area', points: 'points', totalScore: 'Total score:', nextRound: 'NEXT ROUND', seeResults: 'SEE RESULTS', gameOver: 'Game Over!', finalScore: 'Final score:', replay: 'REPLAY', menu: 'MENU', loading: 'Loading images...',
    // Firebase
    welcomeMessage: 'Welcome! How do you want to play?', playAsGuest: 'Play as Guest', guestDesc: 'Play quickly without creating an account', withAccount: 'With an Account', accountDesc: 'Keep your progress and scores', guestInfo: 'Enter your nickname to start', guestWarning: 'In guest mode, your progress will not be saved', pseudoPlaceholder: 'Your nickname', pseudoError: 'Nickname must be at least 3 characters', pseudoTooLong: 'Nickname cannot exceed 20 characters', login: 'Login', loginSubtitle: 'Sign in to your account', emailPlaceholder: 'Email', emailOrPseudoPlaceholder: 'Email ou pseudo', passwordPlaceholder: 'Password (min. 6 characters)', connecting: 'Connecting...', noAccount: "Don't have an account?", signup: 'Sign Up', signupSubtitle: 'Join the Flash Country community!', confirmPasswordPlaceholder: 'Confirm password', creating: 'Creating...', createAccount: 'Create my account', alreadyAccount: 'Already have an account?', emailError: 'Invalid email', passwordError: 'Password must be at least 6 characters', passwordMismatch: 'Passwords do not match', emailInUse: 'This email is already in use', weakPassword: 'Password too weak', wrongCredentials: 'Incorrect email or password', signupError: 'Error creating account', loginError: 'Connection error', connectionError: 'Connection error. Try again.', profile: 'My Profile', statistics: 'Statistics', history: 'History', bestScore: 'Best Score', totalGames: 'Games Played', average: 'Average', memberSince: 'Member since', noHistory: 'No games played yet', logout: 'Log Out', leaderboard: '🏆 Leaderboard 🏆', viewLeaderboard: 'View Leaderboard', allScores: 'All', currentSettings: 'Current Settings', noScores: 'No scores recorded yet', beFirst: 'Be the first to play in this category!', refresh: 'Refresh', back: 'Back', startGame: 'Start Playing', pseudoInfo: 'Your nickname will be displayed in the leaderboard',
    // PvP
    pvpMode: 'PVP MODE', pvpDesc: 'Challenge an opponent!',
    countries: { Spain: 'Spain', Portugal: 'Portugal', France: 'France', Japan: 'Japan', Australia: 'Australia', Italy: 'Italy', Germany: 'Germany', England: 'England', Brazil: 'Brazil', Argentina: 'Argentina', Mexico: 'Mexico', Canada: 'Canada', USA: 'USA', China: 'China', India: 'India', Thailand: 'Thailand', Egypt: 'Egypt', Morocco: 'Morocco', SouthAfrica: 'South Africa', NewZealand: 'New Zealand' }
  }
};

const countryPools = cloudflareCountries;

const ProgressBar = ({ timeLeft }) => {
  const percentage = (timeLeft / 30) * 100;
  let color = '#4CAF50';
  if (timeLeft <= 10) color = '#f44336';
  else if (timeLeft <= 20) color = '#FF9800';
  return (
    <div style={{width: '100%', maxWidth: '600px', display: 'flex', alignItems: 'center', marginBottom: '15px', gap: '10px'}}>
      <div style={{flex: 1, height: '20px', backgroundColor: '#333', borderRadius: '10px', overflow: 'hidden'}}>
        <div style={{width: `${percentage}%`, height: '100%', backgroundColor: color, borderRadius: '10px'}}></div>
      </div>
      <span style={{fontSize: '18px', fontWeight: 'bold', color: '#fff', width: '50px', textAlign: 'right'}}>{timeLeft}s</span>
    </div>
  );
};

function App() {
  // États Firebase
  const [user, setUser] = useState(null);
  const [userPseudo, setUserPseudo] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showPvP, setShowPvP] = useState(false);
  
  // États jeu existants
  const [gameState, setGameState] = useState('auth');
  const [language, setLanguage] = useState('fr');
  const [theme, setTheme] = useState('dark');
  const [gameMode, setGameMode] = useState('quick');
  const [difficulty, setDifficulty] = useState('medium');
  const [currentRound, setCurrentRound] = useState(0);
  const [maxRounds, setMaxRounds] = useState(3);
  const [currentCountry, setCurrentCountry] = useState(null);
  const [usedCountries, setUsedCountries] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [roundScore, setRoundScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [countdown, setCountdown] = useState(5);
  const [isCorrect, setIsCorrect] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [wrongAnswer, setWrongAnswer] = useState('');
  const intervalRef = useRef(null);
  const roundTimerRef = useRef(null);
  const [currentCountryData, setCurrentCountryData] = useState(null);
  const inputRef = useRef(null);
  
  // 🔥 NOUVEAUX ÉTATS POUR LE PRÉCHARGEMENT
  const [imagesToPreload, setImagesToPreload] = useState([]);
  const [shouldPreload, setShouldPreload] = useState(false);
  
  // 🔥 HOOK DE PRÉCHARGEMENT
  const { loaded, loadedCount, totalImages, progress } = useImagePreloader(
    imagesToPreload,
    shouldPreload
  );

  useEffect(() => {
  const unsubscribe = onAuthChange((firebaseUser) => {
    if (firebaseUser) {
      setUser(firebaseUser);
      
      // Récupérer le pseudo
      const savedPseudo = firebaseUser.displayName || localStorage.getItem('userPseudo') || '';
      setUserPseudo(savedPseudo);
      
      // ✅ REDIRIGER vers le menu si on est sur l'écran auth
      setGameState(prevState => prevState === 'auth' ? 'modeSelect' : prevState);
    } else {
      setUser(null);
      setUserPseudo('');
      setGameState('auth');
    }
  });
  
  return () => unsubscribe();
}, []);

  useEffect(() => {
    // Charger le thème sauvegardé
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const handleLogin = (firebaseUser, pseudo) => {
    setUser(firebaseUser);
    setUserPseudo(pseudo);
    setGameState('modeSelect');
  };

  const selectMode = (mode) => {
    setGameMode(mode);
    setMaxRounds(mode === 'quick' ? 3 : mode === 'normal' ? 5 : 10);
    setGameState('difficultySelect');
  };

  const selectDifficulty = (diff) => {
    setDifficulty(diff);
    startGame();
  };

  const startGame = () => {
    setCurrentRound(0);
    setTotalScore(0);
    setUsedCountries([]);
    setGameState('countdown');
    setCountdown(5);
  };

  useEffect(() => {
    if (gameState === 'countdown' && countdown === 5) {
      // 🔥 LANCER LE PRÉCHARGEMENT DÈS LE DÉBUT DU COUNTDOWN
      prepareRound();
    }
    
    if (gameState === 'countdown' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
    // Le démarrage du jeu se fait dans l'autre useEffect quand loaded = true et countdown = 0
  }, [countdown, gameState]);

  useEffect(() => {
    if (gameState === 'roundEnd' || gameState === 'gameEnd') {
      // Attends un peu que le DOM soit mis à jour
      setTimeout(() => {
        // Retire le focus de TOUS les inputs
        document.querySelectorAll('input').forEach(input => {
          input.blur();
        });
        document.activeElement?.blur();
      }, 50);
    }
  }, [gameState]);

  // 🔥 QUAND LES IMAGES SONT CHARGÉES ET QUE LE COUNTDOWN EST FINI, DÉMARRER LE JEU
  useEffect(() => {
    if (loaded && gameState === 'countdown' && countdown === 0) {
      startRound();
    }
  }, [loaded, gameState, countdown]);

  const getCountriesByDifficulty = () => {
    return Object.keys(countryPools).filter(country => countryPools[country].difficulty === difficulty);
  };

  // 🔥 PRÉPARER LE ROUND (GÉNÉRER LES IMAGES ET LANCER LE PRÉCHARGEMENT)
  const prepareRound = () => {
    const availableCountries = getCountriesByDifficulty().filter(c => !usedCountries.includes(c));
    
    if (availableCountries.length === 0) {
      console.warn('⚠️ Plus de pays disponibles pour cette difficulté !');
      handleGameEnd();
      return;
    }
    
    const randomCountryName = availableCountries[Math.floor(Math.random() * availableCountries.length)];
    setWrongAnswer('');

    const countryData = countryPools[randomCountryName];
    const seenImageIds = [];
    const randomImages = getRandomImages(countryData, 100, seenImageIds);
    
    addToHistory(randomCountryName, randomImages.map(img => img.id));
    
    const currentCountryData = {
      ...countryData,
      images: randomImages.map(img => img.url)
    };
    
    // 🔥 PRÉPARATION DES DONNÉES
    setCurrentCountry(randomCountryName);
    setCurrentCountryData(currentCountryData);
    setUsedCountries([...usedCountries, randomCountryName]);
    setCurrentImageIndex(0);
    setUserAnswer('');
    setHasAnswered(false);
    
    // 🔥 LANCER LE PRÉCHARGEMENT (pendant le countdown)
    setImagesToPreload(currentCountryData.images);
    setShouldPreload(true);
  };

  // 🔥 DÉMARRER LE ROUND (APRÈS CHARGEMENT)
  const startRound = () => {
    setTimeElapsed(30);
    setGameState('playing');
    setShouldPreload(false); // Stop le hook de préchargement

    // Timer
    let timeLeft = 30;
    const timerInterval = setInterval(() => {
      timeLeft--;
      setTimeElapsed(timeLeft);
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        if (intervalRef.current?.stop) {
          intervalRef.current.stop();
        }
        setHasAnswered(true);
        
        if (userAnswer.trim()) {
          setWrongAnswer(userAnswer);
        }
        
        endRound(false, 0);
      }
    }, 1000);
    roundTimerRef.current = timerInterval;

    // 🔥 DÉFILEMENT OPTIMISÉ - 60ms pour une fluidité parfaite
    let animationId;
    let lastTime = Date.now();
    const imageLength = currentCountryData.images.length;

    const animateImages = () => {
      const now = Date.now();
      if (now - lastTime >= 60) {
        setCurrentImageIndex(prev => (prev + 1) % imageLength);
        lastTime = now;
      }
      animationId = requestAnimationFrame(animateImages);
    };

    animationId = requestAnimationFrame(animateImages);
    intervalRef.current = { stop: () => cancelAnimationFrame(animationId) };
  };

  const checkAnswer = () => {
      // Ferme le clavier sur mobile
    if (inputRef.current) {
      inputRef.current.blur();
    }
    if (!currentCountry || !userAnswer.trim() || hasAnswered) return;
    setHasAnswered(true);
    // Ferme le clavier à nouveau (sécurité)
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.blur();
      }
      document.activeElement?.blur();
    }, 100);
    const removeAccents = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const normalizedAnswer = removeAccents(userAnswer.toLowerCase().trim());
    const correctNames = countryPools[currentCountry].names.map(name => removeAccents(name));
    const timeUsed = 30 - timeElapsed;
    if (correctNames.includes(normalizedAnswer)) {
      const score = Math.max(30 - timeUsed, 0);
      setWrongAnswer('');
      endRound(true, score);
    } else {
      setWrongAnswer(userAnswer);
      endRound(false, 0);
    }
  };

  const endRound = (correct, score = 0) => {
    if (intervalRef.current?.stop) {
      intervalRef.current.stop();
    } else {
      clearInterval(intervalRef.current);
    }
    clearInterval(roundTimerRef.current);
    
    setTimeout(() => {
      setIsCorrect(correct);
      setRoundScore(score);
      setTotalScore(totalScore + score);
      setGameState('roundEnd');
    }, 100);
  };

  const nextRound = () => {
    if (inputRef.current) {
      inputRef.current.blur();
    }
    document.activeElement?.blur();

    if (currentRound < maxRounds - 1) {
      setCurrentRound(currentRound + 1);
      setGameState('countdown');
      setCountdown(5);
    } else handleGameEnd();
  };

  const handleGameEnd = async () => {
    setGameState('gameEnd');
    
    console.log('💾 Tentative de sauvegarde:', {
      user: user?.uid,
      pseudo: userPseudo,
      score: totalScore,
      mode: gameMode,
      difficulty: difficulty
    });
    
    if (user && userPseudo && totalScore > 0) {
      try {
        await saveScore(userPseudo, totalScore, gameMode, difficulty);
        console.log('✅ Score sauvegardé avec succès !');
      } catch (error) {
        console.error('❌ Erreur sauvegarde:', error);
      }
    } else {
      console.log('⚠️ Conditions non remplies pour sauvegarder:', {
        hasUser: !!user,
        hasPseudo: !!userPseudo,
        score: totalScore
      });
    }
  };

  const t = translations[language];

  let screenContent = null;

  if (gameState === 'auth') {
    screenContent = (
      <AuthScreen 
        onLogin={handleLogin}
        translations={translations}
        currentLang={language}
      />
    );
  }

  if (showPvP) {
    return (
      <PvPMode 
        user={user}
        userPseudo={userPseudo}
        onBack={() => setShowPvP(false)}
        translations={translations}
        language={language}
      />
    );
  }

  if (gameState === 'modeSelect') {
    screenContent = (
      <div className="container">
        <div className="nav-bar">
          {/* Gauche : Langues */}
          <div className="nav-left">
            <button 
              className={`langButton ${language === 'fr' ? 'active' : ''}`} 
              onClick={() => setLanguage('fr')}
            >
              <span>🇫🇷 FR</span>
            </button>
            <button 
              className={`langButton ${language === 'en' ? 'active' : ''}`} 
              onClick={() => setLanguage('en')}
            >
              <span>🇬🇧 EN</span>
            </button>
          </div>

          {/* Centre : Profil et Classement */}
          <div className="nav-center">
            <button className="nav-button" onClick={() => setShowProfile(true)}>
              <span>👤 {userPseudo}</span>
            </button>
            <button className="nav-button" onClick={() => setShowLeaderboard(true)}>
              <span><EmojiText>{t.leaderboard}</EmojiText></span>
            </button>
          </div>

          {/* Droite : Theme toggle */}
          <div className="nav-right">
            <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'dark' ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <h1 className="title">{t.appName}</h1>
        <p className="subtitle">{t.selectMode}</p>
        
        <div className="modeContainer">
          <div className="modeCard" onClick={() => selectMode('quick')}>
            <h2>{t.quickMode}</h2>
            <p>{t.quickDesc}</p>
          </div>
          <div className="modeCard" onClick={() => selectMode('normal')}>
            <h2>{t.normalMode}</h2>
            <p>{t.normalDesc}</p>
          </div>
          <div className="modeCard" onClick={() => selectMode('marathon')}>
            <h2>{t.marathonMode}</h2>
            <p>{t.marathonDesc}</p>
          </div>
          
          <div className="modeCard pvp" onClick={() => setShowPvP(true)}>
            <h2>{t.pvpMode}</h2>
            <p>{t.pvpDesc}</p>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'difficultySelect') {
    screenContent = (
     <div className="container" style={{paddingTop: '0px', marginTop: '-30px'}}>
        <h1 className="title">{t.difficulty}</h1>
        <p className="subtitle">&nbsp;</p> 
        
        <div className="difficultyContainer">
          <div className="difficultyCard easy" onClick={() => selectDifficulty('easy')}>
            <h2>{t.easy}</h2>
            <p>🟢</p>
          </div>
          <div className="difficultyCard medium" onClick={() => selectDifficulty('medium')}>
            <h2>{t.medium}</h2>
            <p>🟠</p>
          </div>
          <div className="difficultyCard hard" onClick={() => selectDifficulty('hard')}>
            <h2>{t.hard}</h2>
            <p>🔴</p>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'countdown') {
    screenContent = (
      <div className="container">
        <p className="roundLarge">{t.round} {currentRound + 1}/{maxRounds}</p>
        <h1 className="countdown">{countdown === 0 ? 'GO!' : countdown}</h1>
      </div>
    );
  }

  // 🔥 NOUVEL ÉCRAN DE CHARGEMENT - Supprimé car chargement silencieux pendant countdown

  if (gameState === 'playing') {
    screenContent = (
      <div className="container">
        <div className="gameContent">
          <div className="gameHeader">
            <p className="question">{t.question}</p>
            <p className="round">{t.round} {currentRound + 1}/{maxRounds}</p>
          </div>
          <ProgressBar timeLeft={timeElapsed} />
          <div className="imageContainer">
            <img 
              src={currentCountryData?.images[currentImageIndex]} 
              alt="country" 
              className="image"
              onError={(e) => {
                console.error('❌ Erreur chargement image:', e.target.src);
                setCurrentImageIndex((currentImageIndex + 1) % (currentCountryData?.images.length || 1));
              }}
            />
          </div>
          <div className="inputContainer">
            <input
              ref={inputRef}
              type="text"
              className="input"
              placeholder={t.typeCountry}
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && checkAnswer()}
              autoFocus
              disabled={hasAnswered}
            />
            <button className="submitButton" onClick={checkAnswer} disabled={hasAnswered}>✓</button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'roundEnd') {
    const countryData = countryPools[currentCountry];
    screenContent = (
      <div className="container">
        <div className="roundEndTop">
          <h1 className="resultTitle">
            <EmojiText>{isCorrect ? t.congratulations : t.failed}</EmojiText>
          </h1>
          {!isCorrect && wrongAnswer && <p className="wrongAnswer">{t.youAnswered}: "{wrongAnswer}"</p>}
          <div className="flag">
            <EmojiText style={{fontSize: '80px'}}>{countryData.flag}</EmojiText>
          </div>
          <p className="countryName">{t.countries[currentCountry] || currentCountry}</p>
          <p className="score">{isCorrect ? `+${roundScore} ${t.points}` : `0 ${t.points}`}</p>
          <p className="totalScore">{t.totalScore} {totalScore}</p>
          <button className="button" onClick={nextRound}>
            {currentRound < maxRounds - 1 ? t.nextRound : t.seeResults}
          </button>
        </div>
        <div className="countryInfo">
          <p>{t.capital}: {countryData.capital[language]}</p>
          <p>{t.population}: {countryData.population[language]}</p>
          <p>{t.area}: {countryData.area[language]}</p>
        </div>
      </div>
    );
  }

  if (gameState === 'gameEnd') {
    screenContent = (
      <div className="container">
        <h1 className="title">{t.gameOver}</h1>
        <p className="finalScore">{t.finalScore} {totalScore} {t.points}</p>
        <button className="button" onClick={startGame}>{t.replay}</button>
        <button className="button secondary" onClick={() => setGameState('modeSelect')}>{t.menu}</button>
        <button className="button" onClick={() => setShowLeaderboard(true)} style={{marginTop: '20px'}}>
          {t.viewLeaderboard}
        </button>
      </div>
    );
  }

  return (
    <>
      {screenContent}
      
      {showProfile && (
        <UserProfile
          onClose={() => setShowProfile(false)}
          translations={translations}
          currentLang={language}
          userId={user?.uid}
          userPseudo={userPseudo}
        />
      )}
      
      {showLeaderboard && (
        <Leaderboard
          onClose={() => setShowLeaderboard(false)}
          translations={translations}
          currentLang={language}
          currentMode={gameMode}
          currentDifficulty={difficulty}
        />
      )}
    </>
  );
}

export default App;
