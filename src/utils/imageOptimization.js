// ========================================
// SYSTÈME OPTIMISÉ DE CHARGEMENT D'IMAGES
// Pour intégrer dans App.js
// ========================================

// 🎯 Ajouter ces états au début du composant App
const [imageCache, setImageCache] = useState(new Map());
const [isLoadingImages, setIsLoadingImages] = useState(false);
const [imageLoadProgress, setImageLoadProgress] = useState(0);
const imageQueueRef = useRef([]);

// 🚀 Fonction de préchargement intelligent
const preloadImages = async (urls, priority = 'high') => {
  return new Promise((resolve) => {
    let loadedCount = 0;
    const total = urls.length;
    
    if (total === 0) {
      resolve([]);
      return;
    }

    const loadedImages = [];

    urls.forEach((url, index) => {
      // Vérifier si l'image est déjà en cache
      if (imageCache.has(url)) {
        loadedCount++;
        loadedImages[index] = imageCache.get(url);
        
        if (loadedCount === total) {
          resolve(loadedImages);
        }
        return;
      }

      const img = new Image();
      
      // Définir la priorité de chargement
      if (priority === 'high') {
        img.fetchPriority = 'high';
      }
      
      img.onload = () => {
        loadedCount++;
        loadedImages[index] = url;
        
        // Mettre en cache
        setImageCache(prev => new Map(prev).set(url, url));
        
        // Mettre à jour la progression
        setImageLoadProgress(Math.round((loadedCount / total) * 100));
        
        if (loadedCount === total) {
          resolve(loadedImages);
        }
      };
      
      img.onerror = () => {
        console.error('❌ Erreur chargement:', url);
        loadedCount++;
        loadedImages[index] = null; // Marquer comme erreur
        
        if (loadedCount === total) {
          resolve(loadedImages.filter(img => img !== null));
        }
      };
      
      img.src = url;
    });
  });
};

// 🎮 Version optimisée de startRound
const startRound = async () => {
  setIsLoadingImages(true);
  setImageLoadProgress(0);
  
  const availableCountries = getCountriesByDifficulty().filter(c => !usedCountries.includes(c));
  const countryPool = availableCountries.length > 0 ? availableCountries : getCountriesByDifficulty();
  const randomCountryName = countryPool[Math.floor(Math.random() * countryPool.length)];

  // 🎲 Récupère l'historique des images vues
  const seenImageIds = getImageHistory(randomCountryName);
  
  // 🖼️ Génère les URLs d'images
  const countryData = countryPools[randomCountryName];
  const randomImages = getRandomImages(countryData, 100, seenImageIds);
  
  // 💾 Sauvegarde les IDs dans l'historique
  addToHistory(randomCountryName, randomImages.map(img => img.id));
  
  // 📊 Met à jour le pays
  const imageUrls = randomImages.map(img => img.url);
  countryPools[randomCountryName] = {
    ...countryData,
    images: imageUrls
  };
  
  setCurrentCountry(randomCountryName);
  setUsedCountries([...usedCountries, randomCountryName]);
  
  // 🔥 PRÉCHARGEMENT PRIORITAIRE DES 20 PREMIÈRES IMAGES
  console.log('🚀 Préchargement prioritaire des 20 premières images...');
  const priorityUrls = imageUrls.slice(0, 20);
  await preloadImages(priorityUrls, 'high');
  
  console.log('✅ Images prioritaires chargées, démarrage du round!');
  setIsLoadingImages(false);
  
  // 🎯 Démarrer le round immédiatement
  setCurrentImageIndex(0);
  setUserAnswer('');
  setTimeElapsed(30);
  setHasAnswered(false);
  setGameState('playing');

  // ⏱️ Timer du round
  let timeLeft = 30;
  const timerInterval = setInterval(() => {
    timeLeft--;
    setTimeElapsed(timeLeft);
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      clearInterval(imageInterval);
      setHasAnswered(true);
      endRound(false, 0);
    }
  }, 1000);
  roundTimerRef.current = timerInterval;

  // 🎬 Défilement des images (vitesse adaptative)
  let currentIndex = 0;
  const imageInterval = setInterval(() => {
    currentIndex = (currentIndex + 1) % imageUrls.length;
    setCurrentImageIndex(currentIndex);
  }, 50);
  intervalRef.current = imageInterval;
  
  // 📥 PRÉCHARGEMENT EN ARRIÈRE-PLAN DES IMAGES RESTANTES
  setTimeout(async () => {
    console.log('🔮 Préchargement des images restantes en arrière-plan...');
    const remainingUrls = imageUrls.slice(20);
    await preloadImages(remainingUrls, 'low');
    console.log('✅ Toutes les images préchargées!');
  }, 2000);
  
  // 🔮 PRÉCHARGEMENT DU ROUND SUIVANT
  setTimeout(async () => {
    if (currentRound < maxRounds - 1) {
      console.log('🎯 Préparation du round suivant...');
      const nextAvailableCountries = getCountriesByDifficulty().filter(c => 
        !usedCountries.includes(c) && c !== randomCountryName
      );
      
      if (nextAvailableCountries.length > 0) {
        const nextCountry = nextAvailableCountries[0];
        const nextSeenIds = getImageHistory(nextCountry);
        const nextImages = getRandomImages(countryPools[nextCountry], 30, nextSeenIds);
        
        console.log('📥 Préchargement de 30 images pour le prochain round...');
        await preloadImages(nextImages.map(img => img.url), 'low');
        console.log('✅ Round suivant prêt!');
      }
    }
  }, 5000);
};

// 🖼️ Composant d'affichage d'image optimisé
const OptimizedImage = ({ src, alt, onError }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {!isLoaded && !hasError && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#4CAF50',
          fontSize: '2rem'
        }}>
          ⏳
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className="image"
        onLoad={() => setIsLoaded(true)}
        onError={(e) => {
          setHasError(true);
          if (onError) onError(e);
        }}
        style={{
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 0.2s ease'
        }}
        loading="eager"
        decoding="async"
      />
    </div>
  );
};

// 🎮 Utilisation dans le rendu du gameState 'playing'
// Remplacer la balise <img> par :
<OptimizedImage
  src={countryPools[currentCountry].images[currentImageIndex]}
  alt="country"
  onError={(e) => {
    console.error('❌ Erreur chargement image:', e.target.src);
    setCurrentImageIndex((currentImageIndex + 1) % countryPools[currentCountry].images.length);
  }}
/>

// 📊 Indicateur de progression du chargement (optionnel)
// À ajouter dans le gameState 'countdown' ou 'playing'
{isLoadingImages && (
  <div style={{
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    padding: '30px',
    borderRadius: '12px',
    zIndex: 9999,
    textAlign: 'center'
  }}>
    <p style={{ fontSize: '1.5rem', marginBottom: '20px' }}>
      Chargement des images...
    </p>
    <div style={{
      width: '300px',
      height: '10px',
      backgroundColor: '#333',
      borderRadius: '5px',
      overflow: 'hidden'
    }}>
      <div style={{
        width: `${imageLoadProgress}%`,
        height: '100%',
        backgroundColor: '#4CAF50',
        transition: 'width 0.3s ease'
      }}></div>
    </div>
    <p style={{ fontSize: '1.2rem', marginTop: '15px', color: '#4CAF50' }}>
      {imageLoadProgress}%
    </p>
  </div>
)}

export { preloadImages, OptimizedImage };
