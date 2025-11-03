// ========================================
// DIAGNOSTIC FLASH COUNTRY
// Script pour vérifier que tout fonctionne
// ========================================

/**
 * 🔍 Exécuter ce script dans la console du navigateur
 * pour diagnostiquer les problèmes
 */

const FlashCountryDiagnostic = {
  
  /**
   * 🏥 Test complet du système
   */
  runFullDiagnostic: async function() {
    console.log('🏥 ========================================');
    console.log('🏥 DIAGNOSTIC FLASH COUNTRY');
    console.log('🏥 ========================================\n');
    
    const results = {
      cloudinary: await this.testCloudinary(),
      cache: this.testCache(),
      network: this.testNetwork(),
      browser: this.testBrowser(),
      countries: this.testCountriesData(),
      firebase: this.testFirebase()
    };
    
    console.log('\n🏥 ========================================');
    console.log('🏥 RÉSUMÉ DES TESTS');
    console.log('🏥 ========================================\n');
    
    let totalTests = 0;
    let passedTests = 0;
    
    Object.entries(results).forEach(([category, result]) => {
      totalTests++;
      if (result.status === 'OK') {
        passedTests++;
        console.log(`✅ ${category}: ${result.message}`);
      } else {
        console.error(`❌ ${category}: ${result.message}`);
        if (result.solution) {
          console.log(`   💡 Solution: ${result.solution}`);
        }
      }
    });
    
    console.log(`\n📊 Score: ${passedTests}/${totalTests} tests réussis`);
    
    if (passedTests === totalTests) {
      console.log('🎉 Tous les tests sont OK ! Votre installation est parfaite.');
    } else {
      console.log('⚠️ Certains tests ont échoué. Consultez les solutions ci-dessus.');
    }
    
    return results;
  },
  
  /**
   * ☁️ Test Cloudinary
   */
  testCloudinary: async function() {
    try {
      // Test si cloudinaryOptimizer est chargé
      if (typeof window.cloudinaryOptimizer === 'undefined') {
        return {
          status: 'ERROR',
          message: 'Module cloudinaryOptimizer non chargé',
          solution: 'Vérifier que cloudinaryOptimizer.js est bien importé'
        };
      }
      
      // Test d'une URL Cloudinary
      const testUrl = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
      const img = new Image();
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve({
            status: 'WARNING',
            message: 'Timeout du test Cloudinary',
            solution: 'Vérifier votre connexion internet'
          });
        }, 5000);
        
        img.onload = () => {
          clearTimeout(timeout);
          resolve({
            status: 'OK',
            message: 'Cloudinary fonctionne correctement'
          });
        };
        
        img.onerror = () => {
          clearTimeout(timeout);
          resolve({
            status: 'ERROR',
            message: 'Impossible de charger les images Cloudinary',
            solution: 'Vérifier la configuration CLOUDINARY_CLOUD_NAME'
          });
        };
        
        img.src = testUrl;
      });
      
    } catch (error) {
      return {
        status: 'ERROR',
        message: `Erreur Cloudinary: ${error.message}`,
        solution: 'Consulter CLOUDINARY_SETUP_GUIDE.md'
      };
    }
  },
  
  /**
   * 💾 Test du cache
   */
  testCache: function() {
    try {
      if (typeof window.globalImageCache === 'undefined') {
        return {
          status: 'ERROR',
          message: 'globalImageCache non initialisé',
          solution: 'Importer imageCacheSystem.js'
        };
      }
      
      const stats = window.globalImageCache.getStats();
      
      return {
        status: 'OK',
        message: `Cache opérationnel (${stats.size}/${stats.maxSize} images)`
      };
      
    } catch (error) {
      return {
        status: 'ERROR',
        message: `Erreur cache: ${error.message}`,
        solution: 'Vérifier l\'import de imageCacheSystem.js'
      };
    }
  },
  
  /**
   * 🌐 Test réseau
   */
  testNetwork: function() {
    try {
      if (!navigator.onLine) {
        return {
          status: 'WARNING',
          message: 'Aucune connexion internet détectée',
          solution: 'Le cache fonctionnera mais pas le téléchargement'
        };
      }
      
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      
      if (connection) {
        const effectiveType = connection.effectiveType;
        const downlink = connection.downlink;
        
        let status = 'OK';
        let message = `Connexion ${effectiveType}`;
        
        if (effectiveType === '2g' || effectiveType === 'slow-2g') {
          status = 'WARNING';
          message += ' - Qualité réduite recommandée';
        }
        
        return { status, message };
      }
      
      return {
        status: 'OK',
        message: 'Connexion disponible (type non détectable)'
      };
      
    } catch (error) {
      return {
        status: 'WARNING',
        message: 'Impossible de détecter la qualité réseau',
        solution: 'Le jeu fonctionnera quand même'
      };
    }
  },
  
  /**
   * 🌍 Test navigateur
   */
  testBrowser: function() {
    const features = {
      localStorage: typeof Storage !== 'undefined',
      indexedDB: 'indexedDB' in window,
      serviceWorker: 'serviceWorker' in navigator,
      webp: false
    };
    
    // Test support WebP
    const canvas = document.createElement('canvas');
    if (canvas.getContext && canvas.getContext('2d')) {
      features.webp = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    }
    
    const unsupported = Object.entries(features)
      .filter(([key, value]) => !value)
      .map(([key]) => key);
    
    if (unsupported.length === 0) {
      return {
        status: 'OK',
        message: 'Toutes les fonctionnalités sont supportées'
      };
    } else if (unsupported.includes('localStorage')) {
      return {
        status: 'ERROR',
        message: 'localStorage non supporté',
        solution: 'Utiliser un navigateur moderne'
      };
    } else {
      return {
        status: 'WARNING',
        message: `Fonctionnalités manquantes: ${unsupported.join(', ')}`,
        solution: 'Le jeu fonctionnera avec des performances réduites'
      };
    }
  },
  
  /**
   * 🗺️ Test données pays
   */
  testCountriesData: function() {
    try {
      if (typeof window.countries === 'undefined') {
        return {
          status: 'ERROR',
          message: 'Données pays non chargées',
          solution: 'Vérifier que countries.js est importé'
        };
      }
      
      const countries = window.countries;
      const countryList = Object.keys(countries);
      
      if (countryList.length === 0) {
        return {
          status: 'ERROR',
          message: 'Aucun pays configuré',
          solution: 'Ajouter des pays dans countries.js'
        };
      }
      
      // Vérifier qu'au moins un pays a les bonnes propriétés
      const firstCountry = countries[countryList[0]];
      const requiredFields = ['cloudinaryFolder', 'totalImages', 'difficulty', 'flag', 'names'];
      const missingFields = requiredFields.filter(field => !firstCountry[field]);
      
      if (missingFields.length > 0) {
        return {
          status: 'ERROR',
          message: `Champs manquants dans ${countryList[0]}: ${missingFields.join(', ')}`,
          solution: 'Suivre la structure dans countries.js'
        };
      }
      
      return {
        status: 'OK',
        message: `${countryList.length} pays configurés correctement`
      };
      
    } catch (error) {
      return {
        status: 'ERROR',
        message: `Erreur données pays: ${error.message}`,
        solution: 'Vérifier la syntaxe de countries.js'
      };
    }
  },
  
  /**
   * 🔥 Test Firebase
   */
  testFirebase: function() {
    try {
      if (typeof window.firebase === 'undefined') {
        return {
          status: 'WARNING',
          message: 'Firebase non chargé (optionnel pour le jeu)',
          solution: 'Le jeu fonctionne sans Firebase mais pas de sauvegarde'
        };
      }
      
      return {
        status: 'OK',
        message: 'Firebase configuré'
      };
      
    } catch (error) {
      return {
        status: 'WARNING',
        message: 'Firebase non disponible',
        solution: 'Facultatif, le jeu fonctionne sans'
      };
    }
  },
  
  /**
   * 📊 Test de performance d'une image
   */
  testImageLoad: async function(url) {
    console.log(`⏱️ Test de chargement: ${url}`);
    
    const startTime = performance.now();
    
    return new Promise((resolve) => {
      const img = new Image();
      
      img.onload = () => {
        const loadTime = Math.round(performance.now() - startTime);
        console.log(`✅ Chargée en ${loadTime}ms`);
        resolve({
          success: true,
          loadTime,
          size: `${img.width}x${img.height}`
        });
      };
      
      img.onerror = () => {
        const loadTime = Math.round(performance.now() - startTime);
        console.error(`❌ Échec après ${loadTime}ms`);
        resolve({
          success: false,
          loadTime
        });
      };
      
      img.src = url;
    });
  },
  
  /**
   * 🚀 Test de préchargement de batch
   */
  testBatchPreload: async function(count = 10) {
    console.log(`🚀 Test de préchargement de ${count} images...`);
    
    const testUrls = Array.from({ length: count }, (_, i) => 
      `https://res.cloudinary.com/demo/image/upload/sample${i % 5 + 1}.jpg`
    );
    
    const startTime = performance.now();
    
    const results = await Promise.all(
      testUrls.map(url => this.testImageLoad(url))
    );
    
    const totalTime = Math.round(performance.now() - startTime);
    const successful = results.filter(r => r.success).length;
    const avgTime = Math.round(
      results.reduce((sum, r) => sum + r.loadTime, 0) / results.length
    );
    
    console.log(`\n📊 Résultats du batch:`);
    console.log(`   ✅ ${successful}/${count} images chargées`);
    console.log(`   ⏱️ Temps total: ${totalTime}ms`);
    console.log(`   📈 Temps moyen: ${avgTime}ms/image`);
    
    return {
      successful,
      total: count,
      totalTime,
      avgTime
    };
  },
  
  /**
   * 🔍 Afficher les infos système
   */
  showSystemInfo: function() {
    console.log('💻 ========================================');
    console.log('💻 INFORMATIONS SYSTÈME');
    console.log('💻 ========================================\n');
    
    console.log('🌐 Navigateur:', navigator.userAgent);
    console.log('📱 Plateforme:', navigator.platform);
    console.log('🔌 En ligne:', navigator.onLine);
    console.log('🧠 Mémoire disponible:', 
      navigator.deviceMemory ? `${navigator.deviceMemory}GB` : 'Non disponible');
    console.log('🔋 Économie de batterie:', 
      navigator.getBattery ? 'API disponible' : 'Non supporté');
    
    if (navigator.connection) {
      console.log('📡 Type de connexion:', navigator.connection.effectiveType);
      console.log('⬇️ Débit descendant:', `${navigator.connection.downlink}Mbps`);
      console.log('⏱️ RTT:', `${navigator.connection.rtt}ms`);
    }
    
    console.log('\n');
  },
  
  /**
   * 🧹 Nettoyer et réinitialiser
   */
  reset: function() {
    console.log('🧹 Nettoyage du système...');
    
    if (window.globalImageCache) {
      window.globalImageCache.clear();
      console.log('✅ Cache d\'images nettoyé');
    }
    
    if (window.globalPreloadQueue) {
      window.globalPreloadQueue.clear();
      console.log('✅ File de préchargement vidée');
    }
    
    localStorage.clear();
    console.log('✅ localStorage nettoyé');
    
    console.log('✨ Système réinitialisé');
  }
};

// Exposer globalement pour utilisation dans la console
window.FlashCountryDiagnostic = FlashCountryDiagnostic;

// Afficher les instructions
console.log('🎮 ========================================');
console.log('🎮 FLASH COUNTRY - DIAGNOSTIC TOOL');
console.log('🎮 ========================================\n');
console.log('💡 Commandes disponibles:\n');
console.log('   FlashCountryDiagnostic.runFullDiagnostic()');
console.log('   → Lance tous les tests\n');
console.log('   FlashCountryDiagnostic.testImageLoad(url)');
console.log('   → Test une URL spécifique\n');
console.log('   FlashCountryDiagnostic.testBatchPreload(10)');
console.log('   → Test le préchargement de 10 images\n');
console.log('   FlashCountryDiagnostic.showSystemInfo()');
console.log('   → Affiche les infos système\n');
console.log('   FlashCountryDiagnostic.reset()');
console.log('   → Nettoie et réinitialise le système\n');
console.log('🎮 ========================================\n');

// Lancer automatiquement le diagnostic si demandé
if (window.location.search.includes('diagnostic=true')) {
  FlashCountryDiagnostic.runFullDiagnostic();
}

export default FlashCountryDiagnostic;
