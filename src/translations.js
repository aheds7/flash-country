// translations.js - Toutes les traductions pour Flash Country avec système de comptes

export const translations = {
  fr: {
    // Générales
    title: 'Flash Country',
    subtitle: 'Testez vos connaissances en géographie !',
    loading: 'Chargement...',
    back: 'Retour',
    
    // Sélection de mode
    selectMode: 'Choisissez votre mode de jeu',
    capitals: 'Capitales',
    capitalsDesc: 'Devinez la capitale du pays',
    flags: 'Drapeaux',
    flagsDesc: 'Identifiez le pays par son drapeau',
    
    // Difficulté
    selectDifficulty: 'Choisissez la difficulté',
    easy: 'Facile',
    medium: 'Moyen',
    hard: 'Difficile',
    
    // Jeu
    start: 'Commencer',
    question: 'Quelle est la capitale de',
    questionFlag: 'Quel est ce pays ?',
    round: 'Round',
    placeholder: 'Tapez votre réponse...',
    submit: '→',
    
    // Résultats
    correct: 'Bravo ! 🎉',
    incorrect: 'Dommage ! 😢',
    yourAnswer: 'Votre réponse :',
    correctAnswer: 'Bonne réponse :',
    points: 'Points gagnés',
    totalPoints: 'Score total',
    next: 'Question suivante',
    gameOver: 'Partie terminée !',
    finalScore: 'Score final',
    playAgain: 'Rejouer',
    backMenu: 'Menu principal',
    
    // Authentification - Écran de choix
    welcomeMessage: 'Bienvenue ! Comment veux-tu jouer ?',
    playAsGuest: 'Jouer en invité',
    guestDesc: 'Joue rapidement sans créer de compte',
    withAccount: 'Avec un compte',
    accountDesc: 'Garde ta progression et tes scores',
    
    // Mode invité
    guestInfo: 'Entre ton pseudo pour commencer',
    guestWarning: 'En mode invité, ta progression ne sera pas sauvegardée',
    pseudoPlaceholder: 'Ton pseudo',
    pseudoError: 'Le pseudo doit contenir au moins 3 caractères',
    pseudoTooLong: 'Le pseudo ne peut pas dépasser 20 caractères',
    
    // Connexion
    login: 'Connexion',
    loginSubtitle: 'Connecte-toi à ton compte',
    emailPlaceholder: 'Email',
    passwordPlaceholder: 'Mot de passe (min. 6 caractères)',
    connecting: 'Connexion...',
    noAccount: 'Pas encore de compte ?',
    
    // Inscription
    signup: "S'inscrire",
    signupSubtitle: 'Rejoins la communauté Flash Country !',
    confirmPasswordPlaceholder: 'Confirmer le mot de passe',
    creating: 'Création...',
    createAccount: 'Créer mon compte',
    alreadyAccount: 'Déjà un compte ?',
    
    // Erreurs auth
    emailError: 'Email invalide',
    passwordError: 'Le mot de passe doit contenir au moins 6 caractères',
    passwordMismatch: 'Les mots de passe ne correspondent pas',
    emailInUse: 'Cet email est déjà utilisé',
    weakPassword: 'Mot de passe trop faible',
    wrongCredentials: 'Email ou mot de passe incorrect',
    signupError: 'Erreur lors de la création du compte',
    loginError: 'Erreur de connexion',
    connectionError: 'Erreur de connexion. Réessayez.',
    
    // Profil
    profile: 'Mon Profil',
    statistics: 'Statistiques',
    history: 'Historique',
    bestScore: 'Meilleur score',
    totalGames: 'Parties jouées',
    totalScore: 'Score total',
    average: 'Moyenne',
    memberSince: 'Membre depuis',
    noHistory: 'Aucune partie jouée pour le moment',
    logout: 'Se déconnecter',
    
    // Leaderboard
    leaderboard: 'Classement',
    viewLeaderboard: '🏆 Voir le classement',
    allScores: 'Tous',
    currentSettings: 'Paramètres actuels',
    noScores: 'Aucun score enregistré pour le moment',
    refresh: 'Actualiser',
    scoreSaved: 'Score sauvegardé ! 🎉',
    scoreSaveError: 'Erreur lors de la sauvegarde du score',
    
    // Général
    startGame: 'Commencer à jouer',
    pseudoInfo: 'Ton pseudo sera affiché dans le classement',
  },
  
  en: {
    // General
    title: 'Flash Country',
    subtitle: 'Test your geography knowledge!',
    loading: 'Loading...',
    back: 'Back',
    
    // Mode selection
    selectMode: 'Choose your game mode',
    capitals: 'Capitals',
    capitalsDesc: 'Guess the capital city',
    flags: 'Flags',
    flagsDesc: 'Identify the country by its flag',
    
    // Difficulty
    selectDifficulty: 'Choose difficulty',
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
    
    // Game
    start: 'Start',
    question: 'What is the capital of',
    questionFlag: 'What country is this?',
    round: 'Round',
    placeholder: 'Type your answer...',
    submit: '→',
    
    // Results
    correct: 'Correct! 🎉',
    incorrect: 'Wrong! 😢',
    yourAnswer: 'Your answer:',
    correctAnswer: 'Correct answer:',
    points: 'Points earned',
    totalPoints: 'Total score',
    next: 'Next question',
    gameOver: 'Game Over!',
    finalScore: 'Final Score',
    playAgain: 'Play Again',
    backMenu: 'Main Menu',
    
    // Authentication - Choice screen
    welcomeMessage: 'Welcome! How do you want to play?',
    playAsGuest: 'Play as Guest',
    guestDesc: 'Play quickly without creating an account',
    withAccount: 'With an Account',
    accountDesc: 'Keep your progress and scores',
    
    // Guest mode
    guestInfo: 'Enter your nickname to start',
    guestWarning: 'In guest mode, your progress will not be saved',
    pseudoPlaceholder: 'Your nickname',
    pseudoError: 'Nickname must be at least 3 characters',
    pseudoTooLong: 'Nickname cannot exceed 20 characters',
    
    // Login
    login: 'Login',
    loginSubtitle: 'Sign in to your account',
    emailPlaceholder: 'Email',
    passwordPlaceholder: 'Password (min. 6 characters)',
    connecting: 'Connecting...',
    noAccount: "Don't have an account?",
    
    // Signup
    signup: 'Sign Up',
    signupSubtitle: 'Join the Flash Country community!',
    confirmPasswordPlaceholder: 'Confirm password',
    creating: 'Creating...',
    createAccount: 'Create my account',
    alreadyAccount: 'Already have an account?',
    
    // Auth errors
    emailError: 'Invalid email',
    passwordError: 'Password must be at least 6 characters',
    passwordMismatch: 'Passwords do not match',
    emailInUse: 'This email is already in use',
    weakPassword: 'Password too weak',
    wrongCredentials: 'Incorrect email or password',
    signupError: 'Error creating account',
    loginError: 'Connection error',
    connectionError: 'Connection error. Try again.',
    
    // Profile
    profile: 'My Profile',
    statistics: 'Statistics',
    history: 'History',
    bestScore: 'Best Score',
    totalGames: 'Games Played',
    totalScore: 'Total Score',
    average: 'Average',
    memberSince: 'Member since',
    noHistory: 'No games played yet',
    logout: 'Log Out',
    
    // Leaderboard
    leaderboard: 'Leaderboard',
    viewLeaderboard: '🏆 View Leaderboard',
    allScores: 'All',
    currentSettings: 'Current Settings',
    noScores: 'No scores recorded yet',
    refresh: 'Refresh',
    scoreSaved: 'Score saved! 🎉',
    scoreSaveError: 'Error saving score',
    
    // General
    startGame: 'Start Playing',
    pseudoInfo: 'Your nickname will be displayed in the leaderboard',
  }
};
