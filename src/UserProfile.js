// UserProfile.jsx - Composant de profil utilisateur
import React, { useState, useEffect } from 'react';
import { getUserData, getUserScores, logout, isAnonymous } from './firebase';
import './UserProfile.css';

const UserProfile = ({ onClose, translations, currentLang, userId, userPseudo }) => {
  const [userData, setUserData] = useState(null);
  const [userScores, setUserScores] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('stats'); // 'stats' ou 'history'

  useEffect(() => {
    loadUserData();
  }, [userId]);

  const loadUserData = async () => {
    setIsLoading(true);
    try {
      // Charger les données utilisateur
      const data = await getUserData(userId);
      setUserData(data);

      // Charger l'historique des scores
      const scores = await getUserScores(userId);
      setUserScores(scores);
    } catch (error) {
      console.error('Erreur lors du chargement du profil:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      localStorage.removeItem('userPseudo');
      window.location.reload();
    } catch (error) {
      console.error('Erreur de déconnexion:', error);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString(currentLang === 'fr' ? 'fr-FR' : 'en-US');
  };

  const getModeLabel = (mode) => {
    return mode === 'capitals' 
      ? (translations[currentLang].capitals || 'Capitales')
      : (translations[currentLang].flags || 'Drapeaux');
  };

  const getDifficultyLabel = (difficulty) => {
    const labels = {
      easy: translations[currentLang].easy || 'Facile',
      medium: translations[currentLang].medium || 'Moyen',
      hard: translations[currentLang].hard || 'Difficile'
    };
    return labels[difficulty] || difficulty;
  };

  const isGuest = isAnonymous();

  return (
    <div className="profileOverlay" onClick={onClose}>
      <div className="profileCard" onClick={(e) => e.stopPropagation()}>
        <div className="profileHeader">
          <h2 className="profileTitle">
            {isGuest ? '🎮' : '👤'} {userPseudo}
          </h2>
          <button className="closeButton" onClick={onClose}>✕</button>
        </div>

        {isGuest && (
          <div className="guestWarning">
            <p>⚠️ {translations[currentLang].guestWarning || 'Mode invité - Crée un compte pour sauvegarder ta progression'}</p>
          </div>
        )}

        {/* Tabs */}
        {!isGuest && (
          <div className="profileTabs">
            <button
              className={`profileTab ${activeTab === 'stats' ? 'active' : ''}`}
              onClick={() => setActiveTab('stats')}
            >
              📊 {translations[currentLang].statistics || 'Statistiques'}
            </button>
            <button
              className={`profileTab ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              📜 {translations[currentLang].history || 'Historique'}
            </button>
          </div>
        )}

        {/* Contenu */}
        <div className="profileContent">
          {isLoading ? (
            <div className="profileLoading">
              <p>{translations[currentLang].loading || 'Chargement...'}</p>
            </div>
          ) : (
            <>
              {/* Statistiques */}
              {activeTab === 'stats' && !isGuest && userData && (
                <div className="statsContainer">
                  <div className="statCard">
                    <div className="statIcon">🏆</div>
                    <div className="statInfo">
                      <p className="statLabel">{translations[currentLang].bestScore || 'Meilleur score'}</p>
                      <p className="statValue">{userData.bestScore || 0}</p>
                    </div>
                  </div>

                  <div className="statCard">
                    <div className="statIcon">🎮</div>
                    <div className="statInfo">
                      <p className="statLabel">{translations[currentLang].totalGames || 'Parties jouées'}</p>
                      <p className="statValue">{userData.totalGames || 0}</p>
                    </div>
                  </div>

                  <div className="statCard">
                    <div className="statIcon">⭐</div>
                    <div className="statInfo">
                      <p className="statLabel">{translations[currentLang].totalScore || 'Score total'}</p>
                      <p className="statValue">{userData.totalScore || 0}</p>
                    </div>
                  </div>

                  <div className="statCard">
                    <div className="statIcon">📈</div>
                    <div className="statInfo">
                      <p className="statLabel">{translations[currentLang].average || 'Moyenne'}</p>
                      <p className="statValue">
                        {userData.totalGames > 0 
                          ? Math.round(userData.totalScore / userData.totalGames)
                          : 0
                        }
                      </p>
                    </div>
                  </div>

                  {userData.createdAt && (
                    <div className="memberSince">
                      <p>
                        {translations[currentLang].memberSince || 'Membre depuis'} {formatDate(userData.createdAt)}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Historique */}
              {activeTab === 'history' && (
                <div className="historyContainer">
                  {userScores.length === 0 ? (
                    <div className="noHistory">
                      <p className="noHistoryEmoji">🎮</p>
                      <p>{translations[currentLang].noHistory || 'Aucune partie jouée pour le moment'}</p>
                    </div>
                  ) : (
                    <div className="historyList">
                      {userScores.map((score, index) => (
                        <div key={score.id} className="historyItem">
                          <div className="historyRank">#{index + 1}</div>
                          <div className="historyInfo">
                            <p className="historyMode">{getModeLabel(score.mode)}</p>
                            <div className="historyDetails">
                              <span className="historyDifficulty">{getDifficultyLabel(score.difficulty)}</span>
                              <span className="historySeparator">•</span>
                              <span className="historyDate">{formatDate(score.timestamp)}</span>
                            </div>
                          </div>
                          <div className="historyScore">{score.score}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Mode invité - Historique simple */}
              {isGuest && (
                <div className="historyContainer">
                  {userScores.length === 0 ? (
                    <div className="noHistory">
                      <p className="noHistoryEmoji">🎮</p>
                      <p>{translations[currentLang].noHistory || 'Aucune partie jouée pour le moment'}</p>
                    </div>
                  ) : (
                    <div className="historyList">
                      {userScores.map((score, index) => (
                        <div key={score.id} className="historyItem">
                          <div className="historyRank">#{index + 1}</div>
                          <div className="historyInfo">
                            <p className="historyMode">{getModeLabel(score.mode)}</p>
                            <div className="historyDetails">
                              <span className="historyDifficulty">{getDifficultyLabel(score.difficulty)}</span>
                              <span className="historySeparator">•</span>
                              <span className="historyDate">{formatDate(score.timestamp)}</span>
                            </div>
                          </div>
                          <div className="historyScore">{score.score}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Bouton déconnexion */}
        <button className="logoutButton" onClick={handleLogout}>
          🚪 {translations[currentLang].logout || 'Se déconnecter'}
        </button>
      </div>
    </div>
  );
};

export default UserProfile;
