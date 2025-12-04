// ========================================
// CLOUDINARY IMAGE OPTIMIZER
// Système optimisé pour le chargement d'images
// ========================================

/**
 * 🎨 Transformations Cloudinary optimisées
 * Ces paramètres réduisent la taille des images sans perte de qualité visible
 */
const CLOUDINARY_TRANSFORMATIONS = {
  // Pour le défilement rapide (50ms entre chaque image)
  fast: {
    quality: 'auto:low',
    fetch_format: 'auto',
    width: 600,
    crop: 'fill',
    gravity: 'auto'
  },
  
  // Pour l'affichage standard
  standard: {
    quality: 'auto:good',
    fetch_format: 'auto',
    width: 800,
    crop: 'fill',
    gravity: 'auto'
  },
  
  // Pour les écrans haute résolution
  hd: {
    quality: 'auto:best',
    fetch_format: 'auto',
    width: 1200,
    crop: 'fill',
    gravity: 'auto'
  }
};

/**
 * 🔧 Optimise une URL Cloudinary
 * @param {string} url - URL Cloudinary originale
 * @param {string} quality - Niveau de qualité ('fast', 'standard', 'hd')
 * @returns {string} URL optimisée
 */
export const optimizeCloudinaryUrl = (url, quality = 'fast') => {
  if (!url || !url.includes('cloudinary.com')) {
    return url;
  }
  
  const transformation = CLOUDINARY_TRANSFORMATIONS[quality];
  const transformString = Object.entries(transformation)
    .map(([key, value]) => `${key}_${value}`)
    .join(',');
  
  // Insère les transformations dans l'URL Cloudinary
  return url.replace('/upload/', `/upload/${transformString}/`);
};

/**
 * 🎲 Génère des URLs d'images optimisées avec distribution intelligente
 * @param {object} countryData - Données du pays
 * @param {number} count - Nombre d'images à générer
 * @param {array} excludeIds - IDs à exclure
 * @returns {array} Tableau d'objets {id, url}
 */
export const getOptimizedRandomImages = (countryData, count = 100, excludeIds = []) => {
  const { cloudinaryFolder, totalImages } = countryData;
  
  if (!cloudinaryFolder || !totalImages) {
    console.error('❌ Données Cloudinary manquantes pour', countryData);
    return [];
  }
  
  // 🎯 Génère des IDs aléatoires uniques
  const availableIds = Array.from({ length: totalImages }, (_, i) => i + 1)
    .filter(id => !excludeIds.includes(id));
  
  // Mélange aléatoire (Fisher-Yates)
  for (let i = availableIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [availableIds[i], availableIds[j]] = [availableIds[j], availableIds[i]];
  }
  
  // Prend les N premiers IDs
  const selectedIds = availableIds.slice(0, Math.min(count, availableIds.length));
  
  // 🖼️ Génère les URLs optimisées
  return selectedIds.map(id => ({
    id,
    url: optimizeCloudinaryUrl(
      `https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/${cloudinaryFolder}/${id}.jpg`,
      'fast'
    )
  }));
};

/**
 * 📥 Précharge un lot d'images avec gestion d'erreurs
 * @param {array} urls - URLs à précharger
 * @param {function} onProgress - Callback de progression (loaded, total)
 * @returns {Promise} Promesse résolue quand toutes sont chargées
 */
export const batchPreloadImages = (urls, onProgress = null) => {
  return new Promise((resolve) => {
    if (!urls || urls.length === 0) {
      resolve([]);
      return;
    }
    
    let loaded = 0;
    const total = urls.length;
    const results = [];
    
    urls.forEach((url, index) => {
      const img = new Image();
      
      img.onload = () => {
        loaded++;
        results[index] = { url, success: true };
        
        if (onProgress) {
          onProgress(loaded, total);
        }
        
        if (loaded === total) {
          resolve(results);
        }
      };
      
      img.onerror = () => {
        loaded++;
        results[index] = { url, success: false };
        console.warn('⚠️ Échec chargement:', url);
        
        if (onProgress) {
          onProgress(loaded, total);
        }
        
        if (loaded === total) {
          resolve(results);
        }
      };
      
      // Priorisation pour les premières images
      if (index < 20) {
        img.fetchPriority = 'high';
      }
      
      img.src = url;
    });
  });
};

/**
 * 🧹 Nettoie le cache d'images pour libérer la mémoire
 * À appeler en fin de partie
 */
export const clearImageCache = () => {
  // Force le garbage collector sur les images
  const images = document.querySelectorAll('img');
  images.forEach(img => {
    img.src = '';
    img.srcset = '';
  });
  
  console.log('🧹 Cache d\'images nettoyé');
};

/**
 * 🎮 Configuration pour le mode multijoueur
 * Précharge les images pour les deux joueurs
 */
export const preloadMultiplayerRound = async (country1Data, country2Data) => {
  console.log('🎮 Préchargement pour 2 joueurs...');
  
  const images1 = getOptimizedRandomImages(country1Data, 50, []);
  const images2 = getOptimizedRandomImages(country2Data, 50, []);
  
  const allUrls = [
    ...images1.map(img => img.url),
    ...images2.map(img => img.url)
  ];
  
  const results = await batchPreloadImages(allUrls, (loaded, total) => {
    console.log(`📥 Multijoueur: ${loaded}/${total} images chargées`);
  });
  
  const successCount = results.filter(r => r.success).length;
  console.log(`✅ ${successCount}/${results.length} images prêtes pour le duel!`);
  
  return {
    player1Images: images1,
    player2Images: images2,
    successRate: (successCount / results.length) * 100
  };
};

/**
 * 📊 Statistiques de performance
 */
export const getImageLoadStats = () => {
  const performance = window.performance;
  const resources = performance.getEntriesByType('resource');
  
  const imageResources = resources.filter(r => 
    r.initiatorType === 'img' || r.name.includes('cloudinary.com')
  );
  
  const avgLoadTime = imageResources.reduce((sum, r) => sum + r.duration, 0) / imageResources.length;
  
  return {
    totalImages: imageResources.length,
    averageLoadTime: Math.round(avgLoadTime),
    slowestImage: Math.max(...imageResources.map(r => r.duration)),
    fastestImage: Math.min(...imageResources.map(r => r.duration))
  };
};

// 🎯 Configuration recommandée pour Cloudinary
export const CLOUDINARY_CONFIG = {
  // Nom de votre cloud Cloudinary
  cloudName: 'dc4ydqgbz',
  
  // Paramètres optimisés pour le jeu
  defaultTransform: 'q_auto:low,f_auto,w_600,c_fill,g_auto',
  
  // Nombre d'images à précharger en priorité
  priorityPreloadCount: 20,
  
  // Nombre d'images à précharger en arrière-plan
  backgroundPreloadCount: 80,
  
  // Délai avant préchargement du round suivant (ms)
  nextRoundPreloadDelay: 5000
};

console.log('✅ Cloudinary Image Optimizer chargé');
