import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import AuthScreen from './AuthScreen';
import UserProfile from './UserProfile';
import Leaderboard from './Leaderboard';
import { onAuthChange, saveScore } from './firebase';
import { countries as cloudinaryCountries, getRandomImages } from './countries';
import { addToHistory } from './imageHistory';

const translations = {
  fr: {
    // Jeu existant
    appName: 'FLASH COUNTRY', selectMode: 'Choisissez un mode', quickMode: 'RAPIDE', normalMode: 'NORMAL', marathonMode: 'MARATHON', quickDesc: '3 rounds', normalDesc: '5 rounds', marathonDesc: '10 rounds', difficulty: 'Difficulté', easy: 'FACILE', medium: 'MOYEN', hard: 'DIFFICILE', round: 'Round', question: 'De quel pays s\'agit-il ?', typeCountry: 'Tapez le nom du pays...', congratulations: '🎉 Félicitations !', failed: '❌ Raté !', youAnswered: 'Vous avez répondu', capital: 'Capitale', population: 'Population', area: 'Superficie', points: 'points', totalScore: 'Score total :', nextRound: 'ROUND SUIVANT', seeResults: 'VOIR RÉSULTATS', gameOver: 'Partie terminée !', finalScore: 'Score final :', replay: 'REJOUER', menu: 'MENU', loading: 'Chargement...',
    // Firebase
    welcomeMessage: 'Bienvenue ! Comment veux-tu jouer ?', playAsGuest: 'Jouer en invité', guestDesc: 'Joue rapidement sans créer de compte', withAccount: 'Avec un compte', accountDesc: 'Garde ta progression et tes scores', guestInfo: 'Entre ton pseudo pour commencer', guestWarning: 'En mode invité, ta progression ne sera pas sauvegardée', pseudoPlaceholder: 'Ton pseudo', pseudoError: 'Le pseudo doit contenir au moins 3 caractères', pseudoTooLong: 'Le pseudo ne peut pas dépasser 20 caractères', login: 'Connexion', loginSubtitle: 'Connecte-toi à ton compte', emailPlaceholder: 'Email', passwordPlaceholder: 'Mot de passe (min. 6 caractères)', connecting: 'Connexion...', noAccount: 'Pas encore de compte ?', signup: "S'inscrire", signupSubtitle: 'Rejoins la communauté Flash Country !', confirmPasswordPlaceholder: 'Confirmer le mot de passe', creating: 'Création...', createAccount: 'Créer mon compte', alreadyAccount: 'Déjà un compte ?', emailError: 'Email invalide', passwordError: 'Le mot de passe doit contenir au moins 6 caractères', passwordMismatch: 'Les mots de passe ne correspondent pas', emailInUse: 'Cet email est déjà utilisé', weakPassword: 'Mot de passe trop faible', wrongCredentials: 'Email ou mot de passe incorrect', signupError: 'Erreur lors de la création du compte', loginError: 'Erreur de connexion', connectionError: 'Erreur de connexion. Réessayez.', profile: 'Mon Profil', statistics: 'Statistiques', history: 'Historique', bestScore: 'Meilleur score', totalGames: 'Parties jouées', average: 'Moyenne', memberSince: 'Membre depuis', noHistory: 'Aucune partie jouée pour le moment', logout: 'Se déconnecter', leaderboard: '🏆 Classement', viewLeaderboard: 'Voir le classement', allScores: 'Tous', currentSettings: 'Paramètres actuels', noScores: 'Aucun score enregistré', beFirst: 'Sois le premier à jouer dans cette catégorie !', refresh: 'Actualiser', back: 'Retour', startGame: 'Commencer à jouer', pseudoInfo: 'Ton pseudo sera affiché dans le classement',
    countries: { Spain: 'Espagne', Portugal: 'Portugal', France: 'France', Japan: 'Japon', Australia: 'Australie', Italy: 'Italie', Germany: 'Allemagne', UnitedKingdom: 'Royaume-Uni', Brazil: 'Brésil', Argentina: 'Argentine', Mexico: 'Mexique', Canada: 'Canada', USA: 'États-Unis', China: 'Chine', India: 'Inde', Thailand: 'Thaïlande', Egypt: 'Égypte', Morocco: 'Maroc', SouthAfrica: 'Afrique du Sud', NewZealand: 'Nouvelle-Zélande' }
  },
  en: {
    // Existing game
    appName: 'FLASH COUNTRY', selectMode: 'Select a mode', quickMode: 'QUICK', normalMode: 'NORMAL', marathonMode: 'MARATHON', quickDesc: '3 rounds', normalDesc: '5 rounds', marathonDesc: '10 rounds', difficulty: 'Difficulty', easy: 'EASY', medium: 'MEDIUM', hard: 'HARD', round: 'Round', question: 'Which country is this?', typeCountry: 'Type the country name...', congratulations: '🎉 Congratulations!', failed: '❌ Failed!', youAnswered: 'You answered', capital: 'Capital', population: 'Population', area: 'Area', points: 'points', totalScore: 'Total score:', nextRound: 'NEXT ROUND', seeResults: 'SEE RESULTS', gameOver: 'Game Over!', finalScore: 'Final score:', replay: 'REPLAY', menu: 'MENU', loading: 'Loading...',
    // Firebase
    welcomeMessage: 'Welcome! How do you want to play?', playAsGuest: 'Play as Guest', guestDesc: 'Play quickly without creating an account', withAccount: 'With an Account', accountDesc: 'Keep your progress and scores', guestInfo: 'Enter your nickname to start', guestWarning: 'In guest mode, your progress will not be saved', pseudoPlaceholder: 'Your nickname', pseudoError: 'Nickname must be at least 3 characters', pseudoTooLong: 'Nickname cannot exceed 20 characters', login: 'Login', loginSubtitle: 'Sign in to your account', emailPlaceholder: 'Email', passwordPlaceholder: 'Password (min. 6 characters)', connecting: 'Connecting...', noAccount: "Don't have an account?", signup: 'Sign Up', signupSubtitle: 'Join the Flash Country community!', confirmPasswordPlaceholder: 'Confirm password', creating: 'Creating...', createAccount: 'Create my account', alreadyAccount: 'Already have an account?', emailError: 'Invalid email', passwordError: 'Password must be at least 6 characters', passwordMismatch: 'Passwords do not match', emailInUse: 'This email is already in use', weakPassword: 'Password too weak', wrongCredentials: 'Incorrect email or password', signupError: 'Error creating account', loginError: 'Connection error', connectionError: 'Connection error. Try again.', profile: 'My Profile', statistics: 'Statistics', history: 'History', bestScore: 'Best Score', totalGames: 'Games Played', average: 'Average', memberSince: 'Member since', noHistory: 'No games played yet', logout: 'Log Out', leaderboard: '🏆 Leaderboard', viewLeaderboard: 'View Leaderboard', allScores: 'All', currentSettings: 'Current Settings', noScores: 'No scores recorded yet', beFirst: 'Be the first to play in this category!', refresh: 'Refresh', back: 'Back', startGame: 'Start Playing', pseudoInfo: 'Your nickname will be displayed in the leaderboard',
    countries: { Spain: 'Spain', Portugal: 'Portugal', France: 'France', Japan: 'Japan', Australia: 'Australia', Italy: 'Italy', Germany: 'Germany', UnitedKingdom: 'United Kingdom', Brazil: 'Brazil', Argentina: 'Argentina', Mexico: 'Mexico', Canada: 'Canada', USA: 'USA', China: 'China', India: 'India', Thailand: 'Thailand', Egypt: 'Egypt', Morocco: 'Morocco', SouthAfrica: 'South Africa', NewZealand: 'New Zealand' }
  }
};

// Utilise les données Cloudinary
const countryPools = cloudinaryCountries;

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
  
  // États jeu existants
  const [gameState, setGameState] = useState('auth');
  const [language, setLanguage] = useState('fr');
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

  useEffect(() => {
    const unsubscribe = onAuthChange((firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const savedPseudo = localStorage.getItem('userPseudo');
        if (savedPseudo) {
          setUserPseudo(savedPseudo);
        }
      } else {
        setUser(null);
        setUserPseudo('');
      }
    });
    return () => unsubscribe();
  }, []);

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
    if (gameState === 'countdown' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (gameState === 'countdown' && countdown === 0) startRound();
  }, [countdown, gameState]);

  useEffect(() => {
    if (gameState === 'roundEnd') {
      const handleKeyPress = (e) => {
        if (e.key === 'Enter' || e.keyCode === 13) {
          e.preventDefault();
          nextRound();
        }
      };
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
  }, [gameState, currentRound, maxRounds]);

const getCountriesByDifficulty = () => {
  return Object.keys(countryPools).filter(country => countryPools[country].difficulty === difficulty);
};

const startRound = async () => {
  const availableCountries = getCountriesByDifficulty().filter(c => !usedCountries.includes(c));
  
  // 🔥 PROTECTION : Si plus de pays disponibles, arrêter le jeu
  if (availableCountries.length === 0) {
    console.warn('⚠️ Plus de pays disponibles pour cette difficulté !');
    handleGameEnd();
    return;
  }
  
  const randomCountryName = availableCountries[Math.floor(Math.random() * availableCountries.length)];

 setWrongAnswer(''); // ⬅️ Réinitialise la mauvaise réponse

  const countryData = countryPools[randomCountryName];
  const seenImageIds = [];
  const randomImages = getRandomImages(countryData, 100, seenImageIds);
  

  
  addToHistory(randomCountryName, randomImages.map(img => img.id));
  
  const currentCountryData = {
    ...countryData,
    images: randomImages.map(img => img.url)
  };
  
  // 🔥 PRÉCHARGEMENT DES 15 PREMIÈRES IMAGES SEULEMENT (plus rapide)

  const priorityImages = currentCountryData.images.slice(0, 10);
  
  // Précharge en parallèle sans bloquer
 let loadedCount = 0;
priorityImages.forEach(url => {
  const img = new Image();
  img.onload = () => {
    loadedCount++;
    if (loadedCount === priorityImages.length) {
    }
  };
  img.src = url;
});
  
  // 🔥 PRÉCHARGEMENT EN ARRIÈRE-PLAN (non bloquant)
  setTimeout(() => {
    const remainingImages = currentCountryData.images.slice(15);
    remainingImages.forEach(url => {
      const img = new Image();
      img.src = url;
    });
  }, 100);
  
  // 🔥 DÉMARRAGE IMMÉDIAT
  setCurrentCountry(randomCountryName);
  setCurrentCountryData(currentCountryData);
  setUsedCountries([...usedCountries, randomCountryName]);
  setCurrentImageIndex(0);
  setUserAnswer('');
  setTimeElapsed(30);
  setHasAnswered(false);
  setGameState('playing');

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
  
  // 🔥 Capture la réponse de l'utilisateur si elle existe
  if (userAnswer.trim()) {
    setWrongAnswer(userAnswer);
  }
  
  endRound(false, 0);
}
  }, 1000);
  roundTimerRef.current = timerInterval;

  // 🔥 DÉFILEMENT OPTIMISÉ - Ralenti à 80ms pour plus de fluidité
  let animationId;
  let lastTime = Date.now();
  const imageLength = currentCountryData.images.length;

  const animateImages = () => {
    const now = Date.now();
    if (now - lastTime >= 80) { // ⬅️ 80ms au lieu de 50ms = plus fluide
      setCurrentImageIndex(prev => (prev + 1) % imageLength);
      lastTime = now;
    }
    animationId = requestAnimationFrame(animateImages);
  };

  animationId = requestAnimationFrame(animateImages);
  intervalRef.current = { stop: () => cancelAnimationFrame(animationId) };
};

  const checkAnswer = () => {
    if (!currentCountry || !userAnswer.trim() || hasAnswered) return;
    setHasAnswered(true);
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
    intervalRef.current.stop(); // Pour requestAnimationFrame
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
    if (currentRound < maxRounds - 1) {
      setCurrentRound(currentRound + 1);
      setGameState('countdown');
      setCountdown(5);
    } else handleGameEnd();
  };

const handleGameEnd = async () => {
  setGameState('gameEnd');
  
  // 🔥 AJOUTEZ DES LOGS POUR DÉBUGGER
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

  // 🔥 MENU PRINCIPAL CORRIGÉ
  if (gameState === 'modeSelect') {
    screenContent = (
      <div className="container">
        <div className="languageSelector">
          <button className={`langButton ${language === 'fr' ? 'active' : ''}`} onClick={() => setLanguage('fr')}>🇫🇷</button>
          <button className={`langButton ${language === 'en' ? 'active' : ''}`} onClick={() => setLanguage('en')}>🇬🇧</button>
        </div>

        <div style={{position: 'absolute', top: '20px', left: '20px', display: 'flex', gap: '10px', zIndex: 999}}>
          <button className="langButton" onClick={() => setShowProfile(true)}>
            👤 {userPseudo}
          </button>
          <button className="langButton" onClick={() => setShowLeaderboard(true)}>
            {t.leaderboard}
          </button>
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
        </div>
      </div>
    );
  }

  // 🔥 SÉLECTION DIFFICULTÉ CORRIGÉE
  if (gameState === 'difficultySelect') {
    screenContent = (
      <div className="container">
        <h1 className="title">{t.difficulty}</h1>
        
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
          <h1 className="resultTitle">{isCorrect ? t.congratulations : t.failed}</h1>
          {!isCorrect && wrongAnswer && <p className="wrongAnswer">{t.youAnswered}: "{wrongAnswer}"</p>}
          <div className="flag">{countryData.flag}</div>
          <p className="countryName">{t.countries[currentCountry]}</p>
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
// Force rebuild
