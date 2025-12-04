// Leaderboard.js - Classement avec 9 catégories (difficulté × mode)
import React, { useState, useEffect } from 'react';
import { getTopScores } from './firebase';
import './Leaderboard.css';

const Leaderboard = ({ onClose, translations, currentLang, currentMode, currentDifficulty }) => {
  const [scores, setScores] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDifficulty, setSelectedDifficulty] = useState(currentDifficulty || 'medium');
  const [selectedMode, setSelectedMode] = useState(currentMode || 'normal');

  useEffect(() => {
    loadScores();
  }, [selectedDifficulty, selectedMode]);

  const loadScores = async () => {
    setIsLoading(true);
    try {
      const fetchedScores = await getTopScores(10, selectedMode, selectedDifficulty);
      setScores(fetchedScores);
    } catch (error) {
      console.error('Erreur lors du chargement des scores:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getMedalEmoji = (position) => {
    switch (position) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return `${position + 1}.`;
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString(currentLang === 'fr' ? 'fr-FR' : 'en-US');
  };

  const getModeLabel = (mode) => {
    const labels = {
      quick: translations[currentLang].quickMode || 'Rapide',
      normal: translations[currentLang].normalMode || 'Normal',
      marathon: translations[currentLang].marathonMode || 'Marathon'
    };
    return labels[mode] || mode;
  };

  const getDifficultyLabel = (difficulty) => {
    const labels = {
      easy: translations[currentLang].easy || 'Facile',
      medium: translations[currentLang].medium || 'Moyen',
      hard: translations[currentLang].hard || 'Difficile'
    };
    return labels[difficulty] || difficulty;
  };

  const getDifficultyEmoji = (difficulty) => {
    switch (difficulty) {
      case 'easy': return '🟢';
      case 'medium': return '🟠';
      case 'hard': return '🔴';
      default: return '';
    }
  };

  const getModeEmoji = (mode) => {
    switch (mode) {
      case 'quick': return '⚡';
      case 'normal': return '🎯';
      case 'marathon': return '🏃';
      default: return '';
    }
  };

  return (
    <div className="leaderboardOverlay" onClick={onClose}>
      <div className="leaderboardCard" onClick={(e) => e.stopPropagation()}>
        <div className="leaderboardHeader">
          <h2 className="leaderboardTitle">
            🏆 {translations[currentLang].leaderboard || 'Classement'}
          </h2>
          <button className="closeButton" onClick={onClose}>✕</button>
        </div>

        {/* Onglets Difficulté */}
        <div className="difficultyTabs">
          <button
            className={`difficultyTab easy ${selectedDifficulty === 'easy' ? 'active' : ''}`}
            onClick={() => setSelectedDifficulty('easy')}
          >
            🟢 {getDifficultyLabel('easy')}
          </button>
          <button
            className={`difficultyTab medium ${selectedDifficulty === 'medium' ? 'active' : ''}`}
            onClick={() => setSelectedDifficulty('medium')}
          >
            🟠 {getDifficultyLabel('medium')}
          </button>
          <button
            className={`difficultyTab hard ${selectedDifficulty === 'hard' ? 'active' : ''}`}
            onClick={() => setSelectedDifficulty('hard')}
          >
            🔴 {getDifficultyLabel('hard')}
          </button>
        </div>

        {/* Onglets Mode */}
        <div className="modeTabs">
          <button
            className={`modeTab ${selectedMode === 'quick' ? 'active' : ''}`}
            onClick={() => setSelectedMode('quick')}
          >
            ⚡ {getModeLabel('quick')}
          </button>
          <button
            className={`modeTab ${selectedMode === 'normal' ? 'active' : ''}`}
            onClick={() => setSelectedMode('normal')}
          >
            🎯 {getModeLabel('normal')}
          </button>
          <button
            className={`modeTab ${selectedMode === 'marathon' ? 'active' : ''}`}
            onClick={() => setSelectedMode('marathon')}
          >
            🏃 {getModeLabel('marathon')}
          </button>
        </div>

        {/* Indicateur de la catégorie actuelle */}
        <div className="currentCategory">
          <span className="categoryBadge">
            {getDifficultyEmoji(selectedDifficulty)} {getDifficultyLabel(selectedDifficulty)}
          </span>
          <span className="categorySeparator">×</span>
          <span className="categoryBadge">
            {getModeEmoji(selectedMode)} {getModeLabel(selectedMode)}
          </span>
        </div>

        {/* Liste des scores */}
        <div className="scoresContainer">
          {isLoading ? (
            <div className="loadingScores">
              <p>{translations[currentLang].loading || 'Chargement...'}</p>
            </div>
          ) : scores.length === 0 ? (
            <div className="noScores">
              <p className="noScoresEmoji">🎮</p>
              <p>{translations[currentLang].noScores || 'Aucun score enregistré pour le moment'}</p>
              <p className="noScoresSubtext">
                {translations[currentLang].beFirst || 'Sois le premier à jouer dans cette catégorie !'}
              </p>
            </div>
          ) : (
            <div className="scoresList">
              {scores.map((score, index) => (
                <div 
                  key={score.id} 
                  className={`scoreItem ${index < 3 ? 'topThree' : ''} ${index === 0 ? 'firstPlace' : ''}`}
                >
                  <div className="scoreRank">
                    <span className="rankBadge">{getMedalEmoji(index)}</span>
                  </div>
                  
                  <div className="scoreInfo">
                    <p className="scorePseudo">{score.pseudo}</p>
                    <div className="scoreDetails">
                      <span className="scoreDate">{formatDate(score.timestamp)}</span>
                    </div>
                  </div>
                  
                  <div className="scorePoints">
                    <span className="scoreValue">{score.score}</span>
                    <span className="scoreLabel">pts</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button className="refreshButton" onClick={loadScores} disabled={isLoading}>
          🔄 {translations[currentLang].refresh || 'Actualiser'}
        </button>
      </div>
    </div>
  );
};

export default Leaderboard;
