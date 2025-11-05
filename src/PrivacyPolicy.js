import React from 'react';
import './App.css';

function PrivacyPolicy({ onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        
        <h1>Politique de Confidentialité</h1>
        
        <h2>1. Données collectées</h2>
        <p>Nous collectons :</p>
        <ul>
          <li>Votre adresse email (pour la connexion)</li>
          <li>Votre pseudo (affiché dans le classement)</li>
          <li>Vos scores de jeu</li>
        </ul>
        
        <h2>2. Utilisation des données</h2>
        <p>Vos données sont utilisées uniquement pour :</p>
        <ul>
          <li>Gérer votre compte</li>
          <li>Afficher vos scores dans le classement</li>
          <li>Améliorer le jeu</li>
        </ul>
        
        <h2>3. Stockage des données</h2>
        <p>Vos données sont stockées de manière sécurisée sur Firebase (Google Cloud), conforme RGPD.</p>
        
        <h2>4. Vos droits</h2>
        <p>Vous pouvez à tout moment :</p>
        <ul>
          <li>Accéder à vos données</li>
          <li>Modifier vos informations</li>
          <li>Supprimer votre compte</li>
        </ul>
        
        <h2>5. Contact</h2>
        <p>Pour toute question : contact@flashcountry.com</p>
        
        <p><small>Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</small></p>
      </div>
    </div>
  );
}

export default PrivacyPolicy;