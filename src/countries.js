// ========================================
// COUNTRIES DATA - Optimisé pour Cloudinary
// ========================================

/**
 * Structure des données pays pour Flash Country
 * 
 * Chaque pays doit avoir :
 * - cloudinaryFolder: chemin vers le dossier Cloudinary
 * - totalImages: nombre total d'images disponibles
 * - difficulty: 'easy', 'medium', ou 'hard'
 * - flag: emoji du drapeau
 * - names: tableau des noms acceptés (en minuscules, sans accents)
 * - capital, population, area: infos en FR et EN
 */

export const countries = {
  France: {
    difficulty: 'medium',
    cloudinaryFolder: 'countries/france',
    totalImages: 226,
    flag: '🇫🇷',
    names: ['france', 'francia'],
    capital: {
      fr: 'Paris',
      en: 'Paris'
    },
    population: {
      fr: '67 millions d\'habitants',
      en: '67 million inhabitants'
    },
    area: {
      fr: '643 801 km²',
      en: '643,801 km²'
    }
  },
  
  Spain: {
    difficulty: 'medium',
    cloudinaryFolder: 'countries/spain',
    totalImages: 221,
    flag: '🇪🇸',
    names: ['spain', 'espagne', 'espana'],
    capital: {
      fr: 'Madrid',
      en: 'Madrid'
    },
    population: {
      fr: '47 millions d\'habitants',
      en: '47 million inhabitants'
    },
    area: {
      fr: '505 990 km²',
      en: '505,990 km²'
    }
  },
  
  Italy: {
    difficulty: 'medium',
    cloudinaryFolder: 'countries/italy',
    totalImages: 221,
    flag: '🇮🇹',
    names: ['italy', 'italie', 'italia'],
    capital: {
      fr: 'Rome',
      en: 'Rome'
    },
    population: {
      fr: '60 millions d\'habitants',
      en: '60 million inhabitants'
    },
    area: {
      fr: '301 340 km²',
      en: '301,340 km²'
    }
  },
  
  Germany: {
    difficulty: 'medium',
    cloudinaryFolder: 'countries/germany',
    totalImages: 223,
    flag: '🇩🇪',
    names: ['germany', 'allemagne', 'deutschland'],
    capital: {
      fr: 'Berlin',
      en: 'Berlin'
    },
    population: {
      fr: '83 millions d\'habitants',
      en: '83 million inhabitants'
    },
    area: {
      fr: '357 386 km²',
      en: '357,386 km²'
    }
  },
  
  UnitedKingdom: {
    difficulty: 'medium',
    cloudinaryFolder: 'countries/uk',
    totalImages: 214,
    flag: '🇬🇧',
    names: ['united kingdom', 'royaume-uni', 'royaume uni', 'uk', 'angleterre', 'england'],
    capital: {
      fr: 'Londres',
      en: 'London'
    },
    population: {
      fr: '67 millions d\'habitants',
      en: '67 million inhabitants'
    },
    area: {
      fr: '242 495 km²',
      en: '242,495 km²'
    }
  },
  
  Portugal: {
    difficulty: 'medium',
    cloudinaryFolder: 'countries/portugal',
    totalImages: 224,
    flag: '🇵🇹',
    names: ['portugal'],
    capital: {
      fr: 'Lisbonne',
      en: 'Lisbon'
    },
    population: {
      fr: '10 millions d\'habitants',
      en: '10 million inhabitants'
    },
    area: {
      fr: '92 212 km²',
      en: '92,212 km²'
    }
  },
  
  Japan: {
    difficulty: 'medium',
    cloudinaryFolder: 'countries/japan',
    totalImages: 229,
    flag: '🇯🇵',
    names: ['japan', 'japon', 'nippon'],
    capital: {
      fr: 'Tokyo',
      en: 'Tokyo'
    },
    population: {
      fr: '125 millions d\'habitants',
      en: '125 million inhabitants'
    },
    area: {
      fr: '377 975 km²',
      en: '377,975 km²'
    }
  },
  
  USA: {
    difficulty: 'medium',
    cloudinaryFolder: 'countries/usa',
    totalImages: 226,
    flag: '🇺🇸',
    names: ['usa', 'united states', 'etats-unis', 'etats unis', 'us', 'america', 'amerique'],
    capital: {
      fr: 'Washington D.C.',
      en: 'Washington D.C.'
    },
    population: {
      fr: '331 millions d\'habitants',
      en: '331 million inhabitants'
    },
    area: {
      fr: '9 833 517 km²',
      en: '9,833,517 km²'
    }
  },
  
  Canada: {
    difficulty: 'medium',
    cloudinaryFolder: 'countries/canada',
    totalImages: 223,
    flag: '🇨🇦',
    names: ['canada'],
    capital: {
      fr: 'Ottawa',
      en: 'Ottawa'
    },
    population: {
      fr: '38 millions d\'habitants',
      en: '38 million inhabitants'
    },
    area: {
      fr: '9 984 670 km²',
      en: '9,984,670 km²'
    }
  },
  
  Brazil: {
    difficulty: 'medium',
    cloudinaryFolder: 'countries/brazil',
    totalImages: 221,
    flag: '🇧🇷',
    names: ['brazil', 'bresil', 'brasil'],
    capital: {
      fr: 'Brasília',
      en: 'Brasília'
    },
    population: {
      fr: '214 millions d\'habitants',
      en: '214 million inhabitants'
    },
    area: {
      fr: '8 515 767 km²',
      en: '8,515,767 km²'
    }
  },
  
  Argentina: {
    difficulty: 'hard',
    cloudinaryFolder: 'countries/argentina',
    totalImages: 204,
    flag: '🇦🇷',
    names: ['argentina', 'argentine'],
    capital: {
      fr: 'Buenos Aires',
      en: 'Buenos Aires'
    },
    population: {
      fr: '45 millions d\'habitants',
      en: '45 million inhabitants'
    },
    area: {
      fr: '2 780 400 km²',
      en: '2,780,400 km²'
    }
  },
  
  Mexico: {
    difficulty: 'hard',
    cloudinaryFolder: 'countries/mexico',
    totalImages: 213,
    flag: '🇲🇽',
    names: ['mexico', 'mexique'],
    capital: {
      fr: 'Mexico',
      en: 'Mexico City'
    },
    population: {
      fr: '128 millions d\'habitants',
      en: '128 million inhabitants'
    },
    area: {
      fr: '1 964 375 km²',
      en: '1,964,375 km²'
    }
  },
  
  Australia: {
    difficulty: 'hard',
    cloudinaryFolder: 'countries/australia',
    totalImages: 227,
    flag: '🇦🇺',
    names: ['australia', 'australie'],
    capital: {
      fr: 'Canberra',
      en: 'Canberra'
    },
    population: {
      fr: '26 millions d\'habitants',
      en: '26 million inhabitants'
    },
    area: {
      fr: '7 692 024 km²',
      en: '7,692,024 km²'
    }
  },
  
  NewZealand: {
    difficulty: 'hard',
    cloudinaryFolder: 'countries/new-zealand',
    totalImages: 121,
    flag: '🇳🇿',
    names: ['new zealand', 'nouvelle-zelande', 'nouvelle zelande'],
    capital: {
      fr: 'Wellington',
      en: 'Wellington'
    },
    population: {
      fr: '5 millions d\'habitants',
      en: '5 million inhabitants'
    },
    area: {
      fr: '268 021 km²',
      en: '268,021 km²'
    }
  },
  
  China: {
    difficulty: 'hard',
    cloudinaryFolder: 'countries/china',
    totalImages: 217,
    flag: '🇨🇳',
    names: ['china', 'chine'],
    capital: {
      fr: 'Pékin',
      en: 'Beijing'
    },
    population: {
      fr: '1,4 milliard d\'habitants',
      en: '1.4 billion inhabitants'
    },
    area: {
      fr: '9 596 961 km²',
      en: '9,596,961 km²'
    }
  },
  
  India: {
    difficulty: 'hard',
    cloudinaryFolder: 'countries/india',
    totalImages: 213,
    flag: '🇮🇳',
    names: ['india', 'inde'],
    capital: {
      fr: 'New Delhi',
      en: 'New Delhi'
    },
    population: {
      fr: '1,4 milliard d\'habitants',
      en: '1.4 billion inhabitants'
    },
    area: {
      fr: '3 287 263 km²',
      en: '3,287,263 km²'
    }
  },
  
  Thailand: {
    difficulty: 'hard',
    cloudinaryFolder: 'countries/thailand',
    totalImages: 228,
    flag: '🇹🇭',
    names: ['thailand', 'thailande', 'siam'],
    capital: {
      fr: 'Bangkok',
      en: 'Bangkok'
    },
    population: {
      fr: '70 millions d\'habitants',
      en: '70 million inhabitants'
    },
    area: {
      fr: '513 120 km²',
      en: '513,120 km²'
    }
  },
  
  Egypt: {
    difficulty: 'easy',
    cloudinaryFolder: 'countries/egypt',
    totalImages: 197,
    flag: '🇪🇬',
    names: ['egypt', 'egypte'],
    capital: {
      fr: 'Le Caire',
      en: 'Cairo'
    },
    population: {
      fr: '104 millions d\'habitants',
      en: '104 million inhabitants'
    },
    area: {
      fr: '1 001 450 km²',
      en: '1,001,450 km²'
    }
  },
  
  Morocco: {
    difficulty: 'hard',
    cloudinaryFolder: 'countries/morocco',
    totalImages: 134,
    flag: '🇲🇦',
    names: ['morocco', 'maroc'],
    capital: {
      fr: 'Rabat',
      en: 'Rabat'
    },
    population: {
      fr: '37 millions d\'habitants',
      en: '37 million inhabitants'
    },
    area: {
      fr: '446 550 km²',
      en: '446,550 km²'
    }
  },
  
  SouthAfrica: {
    difficulty: 'hard',
    cloudinaryFolder: 'countries/south-africa',
    totalImages: 203,
    flag: '🇿🇦',
    names: ['south africa', 'afrique du sud'],
    capital: {
      fr: 'Pretoria / Le Cap / Bloemfontein',
      en: 'Pretoria / Cape Town / Bloemfontein'
    },
    population: {
      fr: '60 millions d\'habitants',
      en: '60 million inhabitants'
    },
    area: {
      fr: '1 221 037 km²',
      en: '1,221,037 km²'
    }
  }
};

/**
 * 🖼️ Fonction pour générer des URLs d'images aléatoires
 */
export const getRandomImages = (countryData, count = 100, excludeIds = []) => {
  const { cloudinaryFolder, totalImages } = countryData;
  
  if (!cloudinaryFolder || !totalImages) {
    console.error('❌ Données manquantes:', countryData);
    return [];
  }

  const availableIds = Array.from({ length: totalImages }, (_, i) => i + 1)
    .filter(id => !excludeIds.includes(id));

  // Mélange Fisher-Yates
  for (let i = availableIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [availableIds[i], availableIds[j]] = [availableIds[j], availableIds[i]];
  }

  const selectedIds = availableIds.slice(0, Math.min(count, availableIds.length));
  const cloudName = 'dc4ydqgbz';

  return selectedIds.map(id => {
    const paddedId = String(id).padStart(3, '0');

    // 🔥 On reproduit exactement ton chemin doublé
    return {
      id,
      url: `https://res.cloudinary.com/${cloudName}/image/upload/${cloudinaryFolder}/${cloudinaryFolder}/${paddedId}.jpg`
    };
  });
};


/**
 * 📊 Statistiques des pays
 */
export const getCountriesStats = () => {
  const stats = {
    total: Object.keys(countries).length,
    easy: 0,
    medium: 0,
    hard: 0,
    totalImages: 0
  };
  
  Object.values(countries).forEach(country => {
    stats[country.difficulty]++;
    stats.totalImages += country.totalImages;
  });
  
  return stats;
};

// Log des statistiques au chargement
console.log('📊 Statistiques pays:', getCountriesStats());

export default countries;
