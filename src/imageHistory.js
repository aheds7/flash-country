// src/utils/imageHistory.js
// Système anti-répétition des images

const HISTORY_KEY_PREFIX = 'flashcountry_history_';
const MAX_HISTORY_SIZE = 800; // Garde en mémoire les 800 dernières images vues

/**
 * Récupère l'historique des images vues pour un pays
 * @param {string} countryId - ID du pays (ex: 'france')
 * @returns {number[]} Tableau des IDs d'images déjà vues
 */
export function getImageHistory(countryId) {
  try {
    const key = HISTORY_KEY_PREFIX + countryId;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Erreur lecture historique:', error);
    return [];
  }
}

/**
 * Ajoute des images à l'historique
 * @param {string} countryId - ID du pays
 * @param {number[]} imageIds - IDs des images à ajouter
 */
export function addToHistory(countryId, imageIds) {
  try {
    const key = HISTORY_KEY_PREFIX + countryId;
    let history = getImageHistory(countryId);
    
    // Ajoute les nouvelles images
    history = [...history, ...imageIds];
    
    // Garde seulement les N dernières
    if (history.length > MAX_HISTORY_SIZE) {
      history = history.slice(-MAX_HISTORY_SIZE);
    }
    
    localStorage.setItem(key, JSON.stringify(history));
  } catch (error) {
    console.error('Erreur sauvegarde historique:', error);
  }
}

/**
 * Reset l'historique d'un pays (utile pour debug ou reset manuel)
 * @param {string} countryId - ID du pays
 */
export function resetHistory(countryId) {
  try {
    const key = HISTORY_KEY_PREFIX + countryId;
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Erreur reset historique:', error);
  }
}

/**
 * Reset tout l'historique (tous les pays)
 */
export function resetAllHistory() {
  try {
    Object.keys(localStorage)
      .filter(key => key.startsWith(HISTORY_KEY_PREFIX))
      .forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.error('Erreur reset total historique:', error);
  }
}

/**
 * Sélectionne N images aléatoires en évitant celles déjà vues
 * @param {number} totalImages - Nombre total d'images disponibles (ex: 1000)
 * @param {number} count - Nombre d'images à sélectionner (ex: 100)
 * @param {string} countryId - ID du pays pour l'historique
 * @returns {number[]} Tableau d'IDs d'images sélectionnées (1-based: 1 à 1000)
 */
export function selectRandomImages(totalImages, count, countryId) {
  // Récupère l'historique
  const history = getImageHistory(countryId);
  
  // Crée le pool d'images disponibles (1 à totalImages)
  const allImages = Array.from({ length: totalImages }, (_, i) => i + 1);
  
  // Retire les images récemment vues
  const availableImages = allImages.filter(id => !history.includes(id));
  
  // Si pas assez d'images disponibles, reset partiel de l'historique
  if (availableImages.length < count) {
    console.log(`Pool épuisé pour ${countryId}, reset partiel de l'historique`);
    
    // Garde seulement les 100 dernières images vues
    const recentHistory = history.slice(-100);
    localStorage.setItem(
      HISTORY_KEY_PREFIX + countryId,
      JSON.stringify(recentHistory)
    );
    
    // Refait le pool
    return selectRandomImages(totalImages, count, countryId);
  }
  
  // Mélange le pool disponible (Fisher-Yates shuffle)
  const shuffled = shuffleArray([...availableImages]);
  
  // Prend les N premières
  const selected = shuffled.slice(0, count);
  
  // Ajoute à l'historique
  addToHistory(countryId, selected);
  
  return selected;
}

/**
 * Mélange un tableau (algorithme Fisher-Yates)
 * @param {Array} array - Tableau à mélanger
 * @returns {Array} Tableau mélangé
 */
function shuffleArray(array) {
  const shuffled = [...array];
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

/**
 * Obtient des statistiques sur l'historique d'un pays
 * @param {string} countryId - ID du pays
 * @param {number} totalImages - Nombre total d'images disponibles
 * @returns {Object} Statistiques
 */
export function getHistoryStats(countryId, totalImages) {
  const history = getImageHistory(countryId);
  const uniqueImages = new Set(history).size;
  const percentageSeen = ((uniqueImages / totalImages) * 100).toFixed(1);
  
  return {
    totalViewed: history.length,
    uniqueImages: uniqueImages,
    percentageSeen: percentageSeen,
    historySize: history.length,
    maxHistorySize: MAX_HISTORY_SIZE
  };
}

export default {
  getImageHistory,
  addToHistory,
  resetHistory,
  resetAllHistory,
  selectRandomImages,
  getHistoryStats
};
