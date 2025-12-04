// firebase.js - Configuration Firebase pour Flash Country (Version avec comptes)
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { 
  getAuth, 
  signInAnonymously, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  getDocs, 
  where,
  doc,
  setDoc,
  getDoc,
  updateDoc
} from 'firebase/firestore';

// ⚠️ REMPLACE CES VALEURS PAR LES TIENNES (voir le guide étape 2.2)
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  databaseURL: "https://flash-country-default-rtdb.europe-west1.firebasedatabase.app"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export const database = getDatabase(app);

// ========================================
// FONCTIONS D'AUTHENTIFICATION
// ========================================

/**
 * Connecter un utilisateur de manière anonyme (mode invité)
 * @returns {Promise<Object>} Informations de l'utilisateur
 */
export const loginAsGuest = async () => {
  try {
    const result = await signInAnonymously(auth);
    return result.user;
  } catch (error) {
    console.error("Erreur de connexion invité:", error);
    throw error;
  }
};

/**
 * Créer un compte avec email et mot de passe
 * @param {string} email - Email de l'utilisateur
 * @param {string} password - Mot de passe
 * @param {string} pseudo - Pseudo du joueur
 * @returns {Promise<Object>} Informations de l'utilisateur
 */
export const createAccount = async (email, password, pseudo) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    
    // Mettre à jour le profil avec le pseudo
    await updateProfile(result.user, {
      displayName: pseudo
    });

    // Créer le document utilisateur dans Firestore
    await setDoc(doc(db, 'users', result.user.uid), {
      pseudo: pseudo,
      email: email,
      createdAt: new Date(),
      totalGames: 0,
      bestScore: 0,
      totalScore: 0
    });

    return result.user;
  } catch (error) {
    console.error("Erreur de création de compte:", error);
    throw error;
  }
};

/**
 * Se connecter avec email OU pseudo
 * @param {string} emailOrPseudo - Email ou pseudo de l'utilisateur
 * @param {string} password - Mot de passe
 * @returns {Promise<Object>} Informations de l'utilisateur
 */
export const loginWithEmail = async (emailOrPseudo, password) => {
  try {
    let email = emailOrPseudo;
    
    // Vérifie si c'est un email (contient @) ou un pseudo
    if (!emailOrPseudo.includes('@')) {
      console.log('🔍 Recherche de l\'email pour le pseudo:', emailOrPseudo);
      
      // Cherche l'utilisateur par pseudo dans Firestore
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('pseudo', '==', emailOrPseudo), limit(1));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error('Pseudo introuvable');
      }
      
      // Récupère l'email associé
      const userDoc = querySnapshot.docs[0];
      email = userDoc.data().email;
      console.log('✅ Email trouvé:', email);
    }
    
    // Connexion avec l'email
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error) {
    console.error("Erreur de connexion:", error);
    
    // Message d'erreur personnalisé
    if (error.message === 'Pseudo introuvable') {
      throw new Error('Pseudo ou mot de passe incorrect');
    }
    throw error;
  }
};

/**
 * Se déconnecter
 * @returns {Promise<void>}
 */
export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Erreur de déconnexion:", error);
    throw error;
  }
};

/**
 * Obtenir l'utilisateur actuellement connecté
 * @returns {Object|null} Utilisateur connecté ou null
 */
export const getCurrentUser = () => {
  return auth.currentUser;
};

/**
 * Observer les changements d'état de l'authentification
 * @param {Function} callback Fonction appelée quand l'état change
 */
export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

/**
 * Vérifier si l'utilisateur est anonyme (invité)
 * @returns {boolean}
 */
export const isAnonymous = () => {
  const user = getCurrentUser();
  return user ? user.isAnonymous : false;
};

// ========================================
// FONCTIONS DE GESTION DES UTILISATEURS
// ========================================

/**
 * Récupérer les informations d'un utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<Object>} Données de l'utilisateur
 */
export const getUserData = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() };
    }
    return null;
  } catch (error) {
    console.error("Erreur lors de la récupération des données utilisateur:", error);
    throw error;
  }
};

/**
 * Mettre à jour les statistiques d'un utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @param {number} score - Score de la partie
 * @returns {Promise<void>}
 */
export const updateUserStats = async (userId, score) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const newBestScore = Math.max(userData.bestScore || 0, score);
      const newTotalGames = (userData.totalGames || 0) + 1;
      const newTotalScore = (userData.totalScore || 0) + score;

      await updateDoc(userRef, {
        bestScore: newBestScore,
        totalGames: newTotalGames,
        totalScore: newTotalScore,
        lastPlayed: new Date()
      });
    }
  } catch (error) {
    console.error("Erreur lors de la mise à jour des stats:", error);
    throw error;
  }
};

// ========================================
// FONCTIONS DE GESTION DES SCORES
// ========================================

/**
 * Sauvegarder un score dans le leaderboard
 * @param {string} pseudo - Pseudo du joueur
 * @param {number} score - Score obtenu
 * @param {string} mode - Mode de jeu (capitals/flags)
 * @param {string} difficulty - Difficulté (easy/medium/hard)
 * @returns {Promise<string>} ID du document créé
 */
export const saveScore = async (pseudo, score, mode, difficulty) => {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error("Utilisateur non connecté");
    }

    const scoreData = {
      pseudo: pseudo,
      score: score,
      mode: mode,
      difficulty: difficulty,
      userId: user.uid,
      isAnonymous: user.isAnonymous,
      timestamp: new Date(),
      date: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, 'leaderboard'), scoreData);
    
    // Mettre à jour les stats si ce n'est pas un invité
    if (!user.isAnonymous) {
      await updateUserStats(user.uid, score);
    }
    
    console.log("Score sauvegardé avec succès:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Erreur lors de la sauvegarde du score:", error);
    throw error;
  }
};

/**
 * Récupérer le top des scores
 * @param {number} limitCount - Nombre de scores à récupérer (par défaut 10)
 * @param {string} mode - Mode de jeu (optionnel)
 * @param {string} difficulty - Difficulté (optionnel)
 * @returns {Promise<Array>} Liste des meilleurs scores
 */
export const getTopScores = async (limitCount = 10, mode = null, difficulty = null) => {
  try {
    let q = query(
      collection(db, 'leaderboard'),
      orderBy('score', 'desc'),
      limit(limitCount)
    );

    // Filtrer par mode si spécifié
    if (mode) {
      q = query(
        collection(db, 'leaderboard'),
        where('mode', '==', mode),
        orderBy('score', 'desc'),
        limit(limitCount)
      );
    }

    // Filtrer par difficulté si spécifié
    if (difficulty) {
      q = query(
        collection(db, 'leaderboard'),
        where('difficulty', '==', difficulty),
        orderBy('score', 'desc'),
        limit(limitCount)
      );
    }

    // Filtrer par mode ET difficulté si les deux sont spécifiés
    if (mode && difficulty) {
      q = query(
        collection(db, 'leaderboard'),
        where('mode', '==', mode),
        where('difficulty', '==', difficulty),
        orderBy('score', 'desc'),
        limit(limitCount)
      );
    }

    const querySnapshot = await getDocs(q);
    const scores = [];
    
    querySnapshot.forEach((doc) => {
      scores.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return scores;
  } catch (error) {
    console.error("Erreur lors de la récupération des scores:", error);
    throw error;
  }
};

/**
 * Récupérer les scores d'un utilisateur spécifique
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<Array>} Liste des scores de l'utilisateur
 */
export const getUserScores = async (userId) => {
  try {
    const q = query(
      collection(db, 'leaderboard'),
      where('userId', '==', userId),
      orderBy('score', 'desc'),
      limit(20)
    );

    const querySnapshot = await getDocs(q);
    const scores = [];
    
    querySnapshot.forEach((doc) => {
      scores.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return scores;
  } catch (error) {
    console.error("Erreur lors de la récupération des scores de l'utilisateur:", error);
    throw error;
  }
};

export { auth, db };
