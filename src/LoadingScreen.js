import React from 'react';

const LoadingScreen = ({ progress, loadedCount, totalImages, round, maxRounds, translations }) => {
  return (
    <div className="container">
      <p className="roundLarge">
        {translations.round} {round + 1}/{maxRounds}
      </p>
      
      <h2 style={{ 
        color: '#fff', 
        marginBottom: '30px',
        fontSize: '24px'
      }}>
        {translations.loading || 'Chargement des images...'}
      </h2>

      {/* Barre de progression */}
      <div style={{
        width: '100%',
        maxWidth: '600px',
        marginBottom: '20px'
      }}>
        <div style={{
          width: '100%',
          height: '30px',
          backgroundColor: '#333',
          borderRadius: '15px',
          overflow: 'hidden',
          border: '2px solid #555'
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            backgroundColor: '#4CAF50',
            transition: 'width 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '14px'
          }}>
            {Math.round(progress)}%
          </div>
        </div>
      </div>

      {/* Compteur d'images */}
      <p style={{
        color: '#aaa',
        fontSize: '16px',
        marginTop: '10px'
      }}>
        {loadedCount} / {totalImages} images
      </p>

      {/* Animation de chargement */}
      <div style={{
        marginTop: '30px',
        display: 'flex',
        gap: '10px',
        justifyContent: 'center'
      }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: '15px',
              height: '15px',
              backgroundColor: '#4CAF50',
              borderRadius: '50%',
              animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default LoadingScreen;
