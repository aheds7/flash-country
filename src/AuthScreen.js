// AuthScreen.jsx - Écran d'authentification complet
import React, { useState } from 'react';
import { loginAsGuest, createAccount, loginWithEmail } from './firebase';
import './AuthScreen.css';

const AuthScreen = ({ onLogin, translations, currentLang }) => {
  const [authMode, setAuthMode] = useState('choice'); // 'choice', 'guest', 'login', 'signup'
  const [pseudo, setPseudo] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Connexion en tant qu'invité
  const handleGuestLogin = async (e) => {
    e.preventDefault();
    
    if (pseudo.trim().length < 3) {
      setError(translations[currentLang].pseudoError || 'Le pseudo doit contenir au moins 3 caractères');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const user = await loginAsGuest();
      localStorage.setItem('userPseudo', pseudo.trim());
      onLogin(user, pseudo.trim());
    } catch (err) {
      console.error('Erreur de connexion invité:', err);
      setError(translations[currentLang].connectionError || 'Erreur de connexion. Réessayez.');
      setIsLoading(false);
    }
  };

  // Création de compte
  const handleSignup = async (e) => {
    e.preventDefault();
    
    // Validations
    if (pseudo.trim().length < 3) {
      setError(translations[currentLang].pseudoError || 'Le pseudo doit contenir au moins 3 caractères');
      return;
    }

    if (!email.includes('@')) {
      setError(translations[currentLang].emailError || 'Email invalide');
      return;
    }

    if (password.length < 6) {
      setError(translations[currentLang].passwordError || 'Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (password !== confirmPassword) {
      setError(translations[currentLang].passwordMismatch || 'Les mots de passe ne correspondent pas');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const user = await createAccount(email, password, pseudo.trim());
      localStorage.setItem('userPseudo', pseudo.trim());
      onLogin(user, pseudo.trim());
    } catch (err) {
      console.error('Erreur de création de compte:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError(translations[currentLang].emailInUse || 'Cet email est déjà utilisé');
      } else if (err.code === 'auth/weak-password') {
        setError(translations[currentLang].weakPassword || 'Mot de passe trop faible');
      } else {
        setError(translations[currentLang].signupError || 'Erreur lors de la création du compte');
      }
      setIsLoading(false);
    }
  };

  // Connexion avec email
  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!email.includes('@')) {
      setError(translations[currentLang].emailError || 'Email invalide');
      return;
    }

    if (password.length < 6) {
      setError(translations[currentLang].passwordError || 'Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const user = await loginWithEmail(email, password);
      const userPseudo = user.displayName || email.split('@')[0];
      localStorage.setItem('userPseudo', userPseudo);
      onLogin(user, userPseudo);
    } catch (err) {
      console.error('Erreur de connexion:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError(translations[currentLang].wrongCredentials || 'Email ou mot de passe incorrect');
      } else {
        setError(translations[currentLang].loginError || 'Erreur de connexion');
      }
      setIsLoading(false);
    }
  };

  // Réinitialiser le formulaire
  const resetForm = () => {
    setPseudo('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError('');
  };

  // Écran de choix
  if (authMode === 'choice') {
    return (
      <div className="authContainer">
        <div className="authCard">
          <h1 className="authTitle">🌍 Flash Country</h1>
          <p className="authSubtitle">
            {translations[currentLang].welcomeMessage || 'Bienvenue ! Comment veux-tu jouer ?'}
          </p>

          <div className="authChoiceContainer">
            <button 
              className="authChoiceButton guest"
              onClick={() => setAuthMode('guest')}
            >
              <span className="authChoiceIcon">🎮</span>
              <h3>{translations[currentLang].playAsGuest || 'Jouer en invité'}</h3>
              <p>{translations[currentLang].guestDesc || 'Joue rapidement sans créer de compte'}</p>
            </button>

            <button 
              className="authChoiceButton account"
              onClick={() => setAuthMode('login')}
            >
              <span className="authChoiceIcon">👤</span>
              <h3>{translations[currentLang].withAccount || 'Avec un compte'}</h3>
              <p>{translations[currentLang].accountDesc || 'Garde ta progression et tes scores'}</p>
            </button>
          </div>
         <p style={{marginTop: '30px', fontSize: '11px', opacity: 0.5, textAlign: 'center'}}>
            En utilisant ce site, vous acceptez notre{' '}
            <a 
              href="https://www.iubenda.com/privacy-policy/generator" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{color: '#4CAF50', textDecoration: 'underline'}}
            >
              Politique de Confidentialité
            </a>
          </p>
        </div>
      </div>
    );
  }

  // Mode invité
  if (authMode === 'guest') {
    return (
      <div className="authContainer">
        <div className="authCard">
          <button className="backButton" onClick={() => { setAuthMode('choice'); resetForm(); }}>
            ← {translations[currentLang].back || 'Retour'}
          </button>

          <h1 className="authTitle">🎮 {translations[currentLang].playAsGuest || 'Jouer en invité'}</h1>
          <p className="authSubtitle">
            {translations[currentLang].guestInfo || 'Entre ton pseudo pour commencer'}
          </p>

          <form onSubmit={handleGuestLogin} className="authForm">
            <input
              type="text"
              className="authInput"
              placeholder={translations[currentLang].pseudoPlaceholder || 'Ton pseudo'}
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              disabled={isLoading}
              autoFocus
              maxLength={20}
            />

            {error && <p className="authError">{error}</p>}

            <button 
              type="submit" 
              className="authButton"
              disabled={isLoading || pseudo.trim().length < 3}
            >
              {isLoading 
                ? (translations[currentLang].connecting || 'Connexion...') 
                : (translations[currentLang].startGame || 'Commencer à jouer')
              }
            </button>
          </form>

          <p className="authFooterText">
            💡 {translations[currentLang].guestWarning || 'En mode invité, ta progression ne sera pas sauvegardée'}
          </p>
    <p style={{marginTop: '30px', fontSize: '11px', opacity: 0.5, textAlign: 'center'}}>
            En utilisant ce site, vous acceptez notre{' '}
            <a 
              href="https://www.iubenda.com/privacy-policy/generator" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{color: '#4CAF50', textDecoration: 'underline'}}
            >
              Politique de Confidentialité
            </a>
          </p>
        </div>
      </div>
    );
  }

  // Mode connexion
  if (authMode === 'login') {
    return (
      <div className="authContainer">
        <div className="authCard">
          <button className="backButton" onClick={() => { setAuthMode('choice'); resetForm(); }}>
            ← {translations[currentLang].back || 'Retour'}
          </button>

          <h1 className="authTitle">👤 {translations[currentLang].login || 'Connexion'}</h1>
          <p className="authSubtitle">
            {translations[currentLang].loginSubtitle || 'Connecte-toi à ton compte'}
          </p>

          <form onSubmit={handleLogin} className="authForm">
            <input
              type="email"
              className="authInput"
              placeholder={translations[currentLang].emailPlaceholder || 'Email'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              autoFocus
            />

            <input
              type="password"
              className="authInput"
              placeholder={translations[currentLang].passwordPlaceholder || 'Mot de passe'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />

            {error && <p className="authError">{error}</p>}

            <button 
              type="submit" 
              className="authButton"
              disabled={isLoading}
            >
              {isLoading 
                ? (translations[currentLang].connecting || 'Connexion...') 
                : (translations[currentLang].login || 'Se connecter')
              }
            </button>
          </form>

          <p className="authFooterText">
            {translations[currentLang].noAccount || "Pas encore de compte ?"}{' '}
            <button className="authLink" onClick={() => { setAuthMode('signup'); resetForm(); }}>
              {translations[currentLang].signup || "S'inscrire"}
            </button>
          </p>
    <p style={{marginTop: '30px', fontSize: '11px', opacity: 0.5, textAlign: 'center'}}>
            En utilisant ce site, vous acceptez notre{' '}
            <a 
              href="https://www.iubenda.com/privacy-policy/generator" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{color: '#4CAF50', textDecoration: 'underline'}}
            >
              Politique de Confidentialité
            </a>
          </p>
        </div>
      </div>
    );
  }

  // Mode inscription
  if (authMode === 'signup') {
    return (
      <div className="authContainer">
        <div className="authCard">
          <button className="backButton" onClick={() => { setAuthMode('choice'); resetForm(); }}>
            ← {translations[currentLang].back || 'Retour'}
          </button>

          <h1 className="authTitle">✨ {translations[currentLang].signup || 'Créer un compte'}</h1>
          <p className="authSubtitle">
            {translations[currentLang].signupSubtitle || 'Rejoins la communauté Flash Country !'}
          </p>

          <form onSubmit={handleSignup} className="authForm">
            <input
              type="text"
              className="authInput"
              placeholder={translations[currentLang].pseudoPlaceholder || 'Ton pseudo'}
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              disabled={isLoading}
              autoFocus
              maxLength={20}
            />

            <input
              type="email"
              className="authInput"
              placeholder={translations[currentLang].emailPlaceholder || 'Email'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />

            <input
              type="password"
              className="authInput"
              placeholder={translations[currentLang].passwordPlaceholder || 'Mot de passe (min. 6 caractères)'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />

            <input
              type="password"
              className="authInput"
              placeholder={translations[currentLang].confirmPasswordPlaceholder || 'Confirmer le mot de passe'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
            />

            {error && <p className="authError">{error}</p>}

            <button 
              type="submit" 
              className="authButton"
              disabled={isLoading}
            >
              {isLoading 
                ? (translations[currentLang].creating || 'Création...') 
                : (translations[currentLang].createAccount || 'Créer mon compte')
              }
            </button>
          </form>

          <p className="authFooterText">
            {translations[currentLang].alreadyAccount || 'Déjà un compte ?'}{' '}
            <button className="authLink" onClick={() => { setAuthMode('login'); resetForm(); }}>
              {translations[currentLang].login || 'Se connecter'}
            </button>
          </p>
    <p style={{marginTop: '30px', fontSize: '11px', opacity: 0.5, textAlign: 'center'}}>
            En utilisant ce site, vous acceptez notre{' '}
            <a 
              href="https://www.iubenda.com/privacy-policy/generator" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{color: '#4CAF50', textDecoration: 'underline'}}
            >
              Politique de Confidentialité
            </a>
          </p>
        </div>
      </div>
    );
  }
};

export default AuthScreen;
