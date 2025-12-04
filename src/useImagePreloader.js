import { useEffect, useState, useRef } from 'react';

/**
 * Hook pour précharger toutes les images d'un round
 * Retourne le statut de chargement et un cache d'images
 */
export function useImagePreloader(imageUrls, shouldLoad = false) {
  const [loaded, setLoaded] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  const imageCache = useRef({});

  useEffect(() => {
    if (!shouldLoad || !imageUrls || imageUrls.length === 0) {
      setLoaded(false);
      setLoadedCount(0);
      return;
    }

    // Reset
    setLoaded(false);
    setLoadedCount(0);
    imageCache.current = {};

    let count = 0;
    const total = imageUrls.length;

    // Précharge toutes les images en parallèle
    imageUrls.forEach((url, index) => {
      const img = new Image();
      
      img.onload = () => {
        imageCache.current[url] = img;
        count++;
        setLoadedCount(count);
        
        if (count === total) {
          setLoaded(true);
        }
      };

      img.onerror = () => {
        console.error(`❌ Erreur chargement image: ${url}`);
        count++;
        setLoadedCount(count);
        
        // Continue même si une image échoue
        if (count === total) {
          setLoaded(true);
        }
      };

      img.src = url;
    });

    // Cleanup si le composant démonte ou si shouldLoad change
    return () => {
      imageCache.current = {};
    };
  }, [imageUrls, shouldLoad]);

  return {
    loaded,
    loadedCount,
    totalImages: imageUrls?.length || 0,
    progress: imageUrls?.length > 0 ? (loadedCount / imageUrls.length) * 100 : 0,
    imageCache: imageCache.current
  };
}

export default useImagePreloader;
