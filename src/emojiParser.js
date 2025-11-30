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
    ext: '.svg',
    base: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/'
  });
};

/**
 * Composant React pour afficher du texte avec emojis
 */
export const EmojiText = ({ children, className = '', style = {} }) => {
  const htmlContent = parseEmojis(children);
  
  return (
    <span
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};