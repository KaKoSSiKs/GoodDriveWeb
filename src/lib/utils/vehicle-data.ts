// Данные об автомобилях для подбора запчастей
// Марки и модели из списка декодирования VIN

// Годы выпуска (1995-2025)
export const vehicleYears = Array.from({ length: 31 }, (_, i) => 2025 - i);

// Уникальные марки автомобилей (из списка декодирования VIN)
export const vehicleBrands = [
  // Российские
  'LADA (АвтоВАЗ)',
  'UAZ (УАЗ)',
  'GAZ (ГАЗ)',
  'KAMAZ (КамАЗ)',
  'Москвич',
  'Aurus Motors',
  'Evolute',
  
  // Немецкие
  'Volkswagen',
  'BMW',
  'Mercedes-Benz',
  'Audi',
  'Porsche',
  
  // Французские
  'Renault',
  'Peugeot',
  'Citroen',
  
  // Итальянские
  'Fiat',
  'Alfa Romeo',
  'Ferrari',
  'Lamborghini',
  'Maserati',
  'Lancia',
  'Iveco',
  
  // Шведские
  'Volvo',
  'Saab',
  'Scania',
  
  // Британские
  'Jaguar',
  'Land Rover',
  'Aston Martin',
  'McLaren',
  'Lotus',
  
  // Японские
  'Toyota',
  'Honda',
  'Nissan',
  'Mazda',
  'Mitsubishi',
  'Lexus',
  'Infiniti',
  'Subaru',
  'Suzuki',
  'Isuzu',
  
  // Корейские
  'Hyundai',
  'Kia',
  
  // Американские
  'Chevrolet',
  'Ford',
  'Jeep',
  'Dodge',
  'Chrysler',
  'Buick',
  'Cadillac',
  'GMC',
  'Lincoln',
  'Tesla',
  
  // Китайские (популярные в России)
  'Geely',
  'Chery',
  'Haval',
  'Changan',
  'BYD',
  'Exeed',
  'Omoda',
  'Xcite',
  'Lifan',
  'Great Wall',
  'FAW',
  'GAC Motor',
  
  // Чешские
  'Skoda',
].sort((a, b) => a.localeCompare(b, 'ru'));

// Модели по маркам
export const vehicleModels: { [brand: string]: string[] } = {
  // LADA (АвтоВАЗ)
  'LADA (АвтоВАЗ)': [
    'Vesta',
    'Granta',
    'Largus',
    'XRAY',
    'Niva Travel',
    'Niva Legend',
    'Kalina',
    'Priora',
    'Samara',
    '2110',
    '2111',
    '2112',
    '2113',
    '2114',
    '2115',
    '2101',
    '2102',
    '2103',
    '2104',
    '2105',
    '2106',
    '2107',
    '2108',
    '2109',
    '2121 Niva',
    '2123 Chevy Niva'
  ],
  
  // UAZ (УАЗ)
  'UAZ (УАЗ)': [
    'Патриот',
    'Хантер',
    'Пикап',
    'Буханка',
    'Cargo',
    'Профи',
    '3151',
    '469',
    '2206'
  ],
  
  // GAZ (ГАЗ)
  'GAZ (ГАЗ)': [
    'Gazelle Next',
    'Соболь',
    'Волга',
    'GAZelle',
    'GAZelle Business',
    '3102',
    '31029',
    '3110',
    '31105',
    '3111'
  ],
  
  // KAMAZ (КамАЗ)
  'KAMAZ (КамАЗ)': [
    '5490',
    '6520',
    '65117',
    '43118',
    '5320',
    '5360'
  ],
  
  // Москвич
  'Москвич': [
    'Москвич 3',
    'Москвич 3е',
    'Москвич 6'
  ],
  
  // Geely
  'Geely': [
    'Monjaro',
    'Tugella',
    'Coolray',
    'Atlas',
    'Boyue',
    'Freedy',
    'Emgrand'
  ],
  
  // Volkswagen
  'Volkswagen': [
    'Polo',
    'Jetta',
    'Passat',
    'Tiguan',
    'Touareg',
    'Golf',
    'Touran',
    'Multivan',
    'Amarok',
    'Caddy',
    'Transporter',
    'Crafter'
  ],
  
  // BMW
  'BMW': [
    '1 Series',
    '2 Series',
    '3 Series',
    '4 Series',
    '5 Series',
    '6 Series',
    '7 Series',
    'X1',
    'X2',
    'X3',
    'X4',
    'X5',
    'X6',
    'X7',
    'Z4',
    'i3',
    'i4',
    'iX'
  ],
  
  // Mercedes-Benz
  'Mercedes-Benz': [
    'A-Class',
    'B-Class',
    'C-Class',
    'E-Class',
    'S-Class',
    'CLA',
    'CLS',
    'GLA',
    'GLB',
    'GLC',
    'GLE',
    'GLS',
    'G-Class',
    'V-Class',
    'Sprinter'
  ],
  
  // Audi
  'Audi': [
    'A1',
    'A3',
    'A4',
    'A5',
    'A6',
    'A7',
    'A8',
    'Q2',
    'Q3',
    'Q5',
    'Q7',
    'Q8',
    'e-tron',
    'TT',
    'R8'
  ],
  
  // Renault
  'Renault': [
    'Logan',
    'Sandero',
    'Fluence',
    'Megane',
    'Laguna',
    'Koleos',
    'Duster',
    'Kaptur',
    'Arkana',
    'Kadjar',
    'Scenic',
    'Espace',
    'Kangoo',
    'Master',
    'Trafic'
  ],
  
  // Peugeot
  'Peugeot': [
    '208',
    '301',
    '308',
    '408',
    '508',
    '2008',
    '3008',
    '4008',
    '5008',
    'Partner',
    'Expert',
    'Boxer'
  ],
  
  // Citroen
  'Citroen': [
    'C3',
    'C4',
    'C5',
    'C6',
    'Berlingo',
    'Jumper',
    'Picasso',
    'DS3',
    'DS4',
    'DS5',
    'Xsara',
    'XM'
  ],
  
  // Toyota
  'Toyota': [
    'Camry',
    'Corolla',
    'RAV4',
    'Land Cruiser',
    'Highlander',
    'Prius',
    'Auris',
    'Yaris',
    'Avensis',
    'Hilux',
    'Prado',
    'Sequoia',
    'Tacoma',
    'Tundra'
  ],
  
  // Honda
  'Honda': [
    'Civic',
    'Accord',
    'CR-V',
    'Pilot',
    'Fit',
    'City',
    'HR-V',
    'Passport',
    'Ridgeline',
    'Odyssey'
  ],
  
  // Nissan
  'Nissan': [
    'Sentra',
    'Altima',
    'Maxima',
    'Qashqai',
    'X-Trail',
    'Pathfinder',
    'Patrol',
    'Murano',
    'Juke',
    'Almera',
    'Tiida',
    'Note',
    'Micra',
    'Navara',
    'Frontier'
  ],
  
  // Mazda
  'Mazda': [
    '2',
    '3',
    '6',
    'CX-3',
    'CX-5',
    'CX-7',
    'CX-9',
    'MX-5',
    'BT-50'
  ],
  
  // Hyundai
  'Hyundai': [
    'Solaris',
    'Elantra',
    'Sonata',
    'Creta',
    'Tucson',
    'Santa Fe',
    'Palisade',
    'i20',
    'i30',
    'Kona',
    'Venue',
    'H-1',
    'Porter'
  ],
  
  // Kia
  'Kia': [
    'Rio',
    'Cerato',
    'Optima',
    'Sportage',
    'Sorento',
    'Mohave',
    'Soul',
    'Stonic',
    'Picanto',
    'Ceed',
    'ProCeed',
    'Stinger',
    'Carnival'
  ],
  
  // Chevrolet
  'Chevrolet': [
    'Aveo',
    'Cruze',
    'Malibu',
    'Impala',
    'Trax',
    'Equinox',
    'Traverse',
    'Tahoe',
    'Suburban',
    'Silverado',
    'Camaro',
    'Corvette',
    'Spark',
    'Orlando',
    'Captiva'
  ],
  
  // Ford
  'Ford': [
    'Fiesta',
    'Focus',
    'Mondeo',
    'Fusion',
    'EcoSport',
    'Kuga',
    'Edge',
    'Explorer',
    'Expedition',
    'F-150',
    'Ranger',
    'Mustang',
    'Transit',
    'Tourneo'
  ],
  
  // Skoda
  'Skoda': [
    'Fabia',
    'Rapid',
    'Octavia',
    'Superb',
    'Kodiaq',
    'Karoq',
    'Kamiq',
    'Scala'
  ],
  
  // Volvo
  'Volvo': [
    'S40',
    'S60',
    'S80',
    'V40',
    'V60',
    'V70',
    'XC40',
    'XC60',
    'XC70',
    'XC90'
  ],
  
  // Lexus
  'Lexus': [
    'IS',
    'ES',
    'GS',
    'LS',
    'NX',
    'RX',
    'GX',
    'LX',
    'CT',
    'RC',
    'LC'
  ],
  
  // Chery
  'Chery': [
    'Tiggo',
    'Exeed',
    'QQ',
    'Amulet',
    'Fora',
    'Bonus',
    'Very',
    'M11',
    'CrossEastar'
  ],
  
  // Haval
  'Haval': [
    'H2',
    'H6',
    'H9',
    'F7',
    'Jolion',
    'Dargo'
  ],
  
  // Subaru
  'Subaru': [
    'Impreza',
    'Legacy',
    'Outback',
    'Forester',
    'XV',
    'Ascent',
    'BRZ',
    'WRX'
  ],
  
  // Mitsubishi
  'Mitsubishi': [
    'Lancer',
    'Outlander',
    'Pajero',
    'ASX',
    'Eclipse Cross',
    'Montero',
    'Delica'
  ]
};

// Модификации по моделям (базовый список - можно расширить)
export const vehicleModifications: { [brand: string]: { [model: string]: string[] } } = {
  'LADA (АвтоВАЗ)': {
    'Vesta': ['1.6 MT', '1.6 AMT', '1.8 AMT', 'SW 1.6', 'SW 1.8', 'Cross'],
    'Granta': ['1.6 MT', '1.6 AMT', 'Sport', 'Cross'],
    'Largus': ['1.6 MT', '1.6 AMT', 'Cross'],
    'XRAY': ['1.6 MT', '1.6 AMT', 'Cross'],
    'Niva Travel': ['1.7 MT', '1.8 AMT'],
    'Niva Legend': ['1.7 MT']
  },
  'Geely': {
    'Monjaro': ['2.0T AT', '2.0T 4WD'],
    'Tugella': ['2.0T AT', '2.0T 4WD'],
    'Coolray': ['1.5T AT', '1.5T CVT'],
    'Atlas': ['1.5T AT', '2.0T AT'],
    'Boyue': ['1.5T AT', '2.0T AT']
  },
  'Volkswagen': {
    'Polo': ['1.6 MT', '1.6 AT', '1.4 TSI', 'GTI'],
    'Jetta': ['1.6 MT', '1.6 AT', '1.4 TSI', '2.0 TSI'],
    'Passat': ['1.4 TSI', '1.8 TSI', '2.0 TSI', '2.0 TDI'],
    'Tiguan': ['1.4 TSI', '2.0 TSI', '2.0 TDI', 'R-Line']
  },
  'Toyota': {
    'Camry': ['2.0', '2.5', '3.5 V6', 'Hybrid'],
    'RAV4': ['2.0', '2.5', 'Hybrid', 'Prime'],
    'Land Cruiser': ['4.5 V8', '4.6 V8', '4.7 V8']
  },
  'Chery': {
    'Tiggo': [
      '1.5T CVT FWD',
      '1.6T DCT AWD',
      'Pro 2.0T AWD',
      '8 Pro Max 2.0T'
    ],
    'Tiggo 4': ['1.5T MT', '1.5T CVT', '1.5T CVT AWD'],
    'Tiggo 7': ['1.5T CVT', '1.6T DCT AWD'],
    'Tiggo 8': ['1.6T DCT', '2.0T DCT AWD'],
    'QQ': ['0.8 MT', '1.0 MT'],
    'Amulet': ['1.6 MT', '1.8 MT'],
    'Fora': ['1.6 CVT', '2.0 CVT'],
    'Bonus': ['1.5 MT'],
    'Very': ['1.5 MT'],
    'M11': ['1.6 MT', '1.8 MT'],
    'CrossEastar': ['2.0 CVT', '2.4 CVT']
  }
};

// Функция для получения моделей по марке
export function getModelsByBrand(brand: string): string[] {
  return vehicleModels[brand] || [];
}

// Функция для получения модификаций по марке и модели
export function getModificationsByBrandAndModel(brand: string, model: string): string[] {
  if (vehicleModifications[brand] && vehicleModifications[brand][model]) {
    return vehicleModifications[brand][model];
  }
  return [];
}

