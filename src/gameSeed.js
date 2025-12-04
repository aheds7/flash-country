// ========================================
// GAME SEED - Génération déterministe
// ========================================

/**
 * Générateur de nombres pseudo-aléatoires avec seed
 * Utilise l'algorithme Mulberry32 pour la reproductibilité
 */
class SeededRandom {
  constructor(seed) {
    this.seed = seed;
  }

  next() {
    let t = this.seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

/**
 * Mélange Fisher-Yates avec seed
 */
const shuffleWithSeed = (array, seed) => {
  const rng = new SeededRandom(seed);
  const shuffled = [...array];
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
};

/**
 * Génère la configuration d'une partie PvP
 * @param {number} seed - Seed partagé entre les 2 joueurs
 * @param {string} difficulty - 'easy', 'medium', ou 'hard'
 * @param {object} countryPools - Données des pays
 * @returns {object} Configuration de la partie
 */
export const generatePvPGameConfig = (seed, difficulty, countryPools) => {
  // Filtre les pays par difficulté
  const availableCountries = Object.keys(countryPools).filter(
    country => countryPools[country].difficulty === difficulty
  );

  // Mélange les pays avec le seed
  const shuffledCountries = shuffleWithSeed(availableCountries, seed);
  
  // Prend 5 pays pour la partie
  const selectedCountries = shuffledCountries.slice(0, 5);

  // Pour chaque pays, génère l'ordre des images
  const roundsConfig = selectedCountries.map((countryName, roundIndex) => {
    const countryData = countryPools[countryName];
    const roundSeed = seed + roundIndex; // Seed unique par round
    
    // Génère les IDs d'images disponibles
    const imageIds = Array.from({ length: countryData.totalImages }, (_, i) => i + 1);
    
    // Mélange les IDs avec le seed du round
    const shuffledIds = shuffleWithSeed(imageIds, roundSeed);
    
    // Prend 100 images (ou moins si pas assez disponibles)
    const selectedIds = shuffledIds.slice(0, Math.min(100, countryData.totalImages));

    // Génère les URLs Cloudinary
    const cloudName = 'dc4ydqgbz';
    const images = selectedIds.map(id => {
      const paddedId = String(id).padStart(3, '0');
      return `https://res.cloudinary.com/${cloudName}/image/upload/${countryData.cloudinaryFolder}/${paddedId}.jpg`;
    });

    return {
      countryName,
      images,
      imageIds: selectedIds
    };
  });

  return {
    seed,
    difficulty,
    countries: selectedCountries,
    rounds: roundsConfig
  };
};

/**
 * Calcule l'index de l'image à afficher en fonction du temps écoulé
 * @param {number} roundStartTime - Timestamp de début du round (ms)
 * @param {number} imageCount - Nombre total d'images
 * @returns {number} Index de l'image à afficher
 */
export const getCurrentImageIndex = (roundStartTime, imageCount) => {
  const elapsedTime = Date.now() - roundStartTime;
  const imageIndex = Math.floor(elapsedTime / 80); // 80ms par image
  return imageIndex % imageCount; // Boucle si on dépasse
};

/**
 * Génère un seed aléatoire pour une nouvelle partie
 */
export const generateRandomSeed = () => {
  return Math.floor(Math.random() * 1000000000);
};

export default {
  generatePvPGameConfig,
  getCurrentImageIndex,
  generateRandomSeed,
  shuffleWithSeed
};
