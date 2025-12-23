import twemoji from 'twemoji';

/**
 * Convertit les emojis en images Twemoji (style Apple)
 * @param {string} text - Texte contenant des emojis
 * @returns {string} - HTML avec les emojis en images
 */
export const parseEmojis = (text) => {
  if (!text) return '';
  
  return twemoji.parse(text, {
    folder: 'svg',
    ext: '.svg'
    // Pas de base - utilise le CDN par défaut de twemoji
  });
};

/**
 * Composant React pour afficher du texte avec emojis
 */
export const EmojiText = ({ children, className = '', style = {} }) => {
  // Gérer les cas où children est undefined, null, ou vide
  if (!children && children !== 0) {
    return null;
  }
  
  // Convertir en string si ce n'est pas déjà le cas
  const text = String(children);
  const htmlContent = parseEmojis(text);
  
  return (
    <span
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};