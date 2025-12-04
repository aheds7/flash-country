// ========================================
// INTELLIGENT IMAGE CACHE SYSTEM
// Gestion avancée du cache pour performances optimales
// ========================================

/**
 * 🧠 Classe de gestion du cache d'images
 */
class ImageCacheManager {
  constructor(maxSize = 200) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0
    };
  }
  
  /**
   * 📥 Récupère une image du cache
   */
  get(url) {
    if (this.cache.has(url)) {
      this.stats.hits++;
      const item = this.cache.get(url);
      
      // Met à jour le timestamp d'accès (LRU)
      item.lastAccessed = Date.now();
      item.accessCount++;
      
      return item.data;
    }
    
    this.stats.misses++;
    return null;
  }
  
  /**
   * 💾 Ajoute une image au cache
   */
  set(url, data) {
    // Éviction si le cache est plein
    if (this.cache.size >= this.maxSize && !this.cache.has(url)) {
      this.evictLRU();
    }
    
    this.cache.set(url, {
      data,
      timestamp: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 1
    });
  }
  
  /**
   * 🗑️ Éviction LRU (Least Recently Used)
   */
  evictLRU() {
    let oldestUrl = null;
    let oldestTime = Infinity;
    
    for (const [url, item] of this.cache.entries()) {
      if (item.lastAccessed < oldestTime) {
        oldestTime = item.lastAccessed;
        oldestUrl = url;
      }
    }
    
    if (oldestUrl) {
      this.cache.delete(oldestUrl);
      this.stats.evictions++;
    }
  }
  
  /**
   * 🧹 Nettoie le cache
   */
  clear() {
    this.cache.clear();
    console.log('🧹 Cache nettoyé');
  }
  
  /**
   * 📊 Obtient les statistiques du cache
   */
  getStats() {
    const hitRate = this.stats.hits / (this.stats.hits + this.stats.misses) * 100;
    
    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: hitRate.toFixed(2) + '%'
    };
  }
  
  /**
   * 🎯 Précharge plusieurs images
   */
  async preloadBatch(urls, priority = 'high') {
    const promises = urls.map(url => this.preloadSingle(url, priority));
    const results = await Promise.allSettled(promises);
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    console.log(`✅ ${successful}/${urls.length} images préchargées`);
    
    return results;
  }
  
  /**
   * 📥 Précharge une image
   */
  preloadSingle(url, priority = 'high') {
    return new Promise((resolve, reject) => {
      // Vérifie si déjà en cache
      if (this.cache.has(url)) {
        resolve(url);
        return;
      }
      
      const img = new Image();
      
      if (priority === 'high') {
        img.fetchPriority = 'high';
      }
      
      img.onload = () => {
        this.set(url, url);
        resolve(url);
      };
      
      img.onerror = (error) => {
        console.error('❌ Erreur préchargement:', url);
        reject(error);
      };
      
      img.src = url;
    });
  }
}

// 🌐 Instance globale du cache
export const globalImageCache = new ImageCacheManager(200);

/**
 * 🎮 Hook React pour utiliser le cache
 */
export const useImageCache = () => {
  const [cacheStats, setCacheStats] = React.useState(globalImageCache.getStats());
  
  const updateStats = () => {
    setCacheStats(globalImageCache.getStats());
  };
  
  const preloadImages = async (urls, priority = 'high') => {
    const results = await globalImageCache.preloadBatch(urls, priority);
    updateStats();
    return results;
  };
  
  const clearCache = () => {
    globalImageCache.clear();
    updateStats();
  };
  
  return {
    cache: globalImageCache,
    stats: cacheStats,
    preloadImages,
    clearCache,
    updateStats
  };
};

/**
 * 🔄 Service Worker pour cache offline (avancé)
 */
export const registerImageCacheServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/image-cache-sw.js')
      .then(registration => {
        console.log('✅ Service Worker enregistré:', registration);
      })
      .catch(error => {
        console.error('❌ Erreur Service Worker:', error);
      });
  }
};

/**
 * 📱 Détection de la connexion réseau
 */
export const getConnectionQuality = () => {
  if (!navigator.connection) {
    return 'unknown';
  }
  
  const connection = navigator.connection;
  const effectiveType = connection.effectiveType;
  
  // Adapte la qualité d'image selon la connexion
  const qualityMap = {
    'slow-2g': 'very-low',
    '2g': 'low',
    '3g': 'medium',
    '4g': 'high'
  };
  
  return {
    type: effectiveType,
    quality: qualityMap[effectiveType] || 'medium',
    downlink: connection.downlink,
    rtt: connection.rtt
  };
};

/**
 * 🎯 Stratégie de préchargement adaptative
 */
export const getAdaptivePreloadStrategy = () => {
  const connection = getConnectionQuality();
  
  const strategies = {
    'very-low': {
      priorityCount: 10,
      backgroundCount: 20,
      imageQuality: 'q_auto:low,w_400'
    },
    'low': {
      priorityCount: 15,
      backgroundCount: 40,
      imageQuality: 'q_auto:low,w_500'
    },
    'medium': {
      priorityCount: 20,
      backgroundCount: 60,
      imageQuality: 'q_auto:good,w_600'
    },
    'high': {
      priorityCount: 30,
      backgroundCount: 100,
      imageQuality: 'q_auto:good,w_800'
    }
  };
  
  return strategies[connection.quality] || strategies['medium'];
};

/**
 * 🚀 Système de file d'attente de préchargement
 */
class PreloadQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.maxConcurrent = 6; // Nombre max de téléchargements simultanés
    this.currentlyLoading = 0;
  }
  
  /**
   * ➕ Ajoute des URLs à la file
   */
  add(urls, priority = 'normal') {
    const items = urls.map(url => ({ url, priority }));
    
    if (priority === 'high') {
      this.queue.unshift(...items);
    } else {
      this.queue.push(...items);
    }
    
    this.process();
  }
  
  /**
   * ⚙️ Traite la file d'attente
   */
  async process() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    while (this.queue.length > 0 && this.currentlyLoading < this.maxConcurrent) {
      const item = this.queue.shift();
      this.currentlyLoading++;
      
      globalImageCache.preloadSingle(item.url, item.priority)
        .then(() => {
          this.currentlyLoading--;
          this.process();
        })
        .catch(() => {
          this.currentlyLoading--;
          this.process();
        });
    }
    
    if (this.currentlyLoading === 0) {
      this.isProcessing = false;
    }
  }
  
  /**
   * 🧹 Vide la file
   */
  clear() {
    this.queue = [];
    this.isProcessing = false;
  }
}

export const globalPreloadQueue = new PreloadQueue();

/**
 * 📊 Moniteur de performance
 */
export class ImagePerformanceMonitor {
  constructor() {
    this.metrics = {
      totalLoaded: 0,
      totalFailed: 0,
      averageLoadTime: 0,
      loadTimes: []
    };
  }
  
  recordLoad(url, startTime, success = true) {
    const loadTime = Date.now() - startTime;
    
    if (success) {
      this.metrics.totalLoaded++;
      this.metrics.loadTimes.push(loadTime);
      
      // Garde seulement les 100 derniers temps de chargement
      if (this.metrics.loadTimes.length > 100) {
        this.metrics.loadTimes.shift();
      }
      
      this.metrics.averageLoadTime = 
        this.metrics.loadTimes.reduce((a, b) => a + b, 0) / this.metrics.loadTimes.length;
    } else {
      this.metrics.totalFailed++;
    }
  }
  
  getReport() {
    const successRate = (this.metrics.totalLoaded / 
      (this.metrics.totalLoaded + this.metrics.totalFailed)) * 100;
    
    return {
      ...this.metrics,
      successRate: successRate.toFixed(2) + '%',
      averageLoadTime: Math.round(this.metrics.averageLoadTime) + 'ms'
    };
  }
}

export const imagePerformanceMonitor = new ImagePerformanceMonitor();

console.log('✅ Intelligent Image Cache System chargé');
