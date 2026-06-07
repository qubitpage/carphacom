/**
 * Business Categories — Complete Romanian market taxonomy
 * Each category has subcategories with search keywords in Romanian
 * Used by the scraping engine to build targeted search queries
 */

export interface SubCategory {
  id: string
  name: string
  keywords: string[]
}

export interface BusinessCategory {
  id: string
  name: string
  icon: string  // emoji
  description: string
  subcategories: SubCategory[]
}

export const BUSINESS_CATEGORIES_FULL: BusinessCategory[] = [
  {
    id: 'transport',
    name: 'Transport & Logistică',
    icon: '🚛',
    description: 'Firme de transport marfă, curierat, logistică',
    subcategories: [
      { id: 'transport-rutier', name: 'Transport Rutier Marfă', keywords: ['transport rutier marfa', 'transport marfa romania', 'firma transport marfa', 'camioane transport'] },
      { id: 'transport-international', name: 'Transport Internațional', keywords: ['transport international', 'transport marfa international', 'transport TIR europa'] },
      { id: 'curierat', name: 'Curierat & Coletărie', keywords: ['firma curierat', 'servicii curierat', 'livrare colete', 'curier rapid'] },
      { id: 'curierat-mare', name: 'Curierat Mare (TIR/Camioane)', keywords: ['transport camioane mari', 'firma TIR', 'transport agabaritic', 'flota camion'] },
      { id: 'taxi', name: 'Taxi & Transport Persoane', keywords: ['firma taxi', 'transport persoane', 'taxi romania', 'transport privat persoane'] },
      { id: 'transport-aerian', name: 'Transport Aerian', keywords: ['transport aerian marfa', 'cargo aerian', 'expeditii aeriene', 'transport avion'] },
      { id: 'transport-maritim', name: 'Transport Maritim & Fluvial', keywords: ['transport maritim', 'transport naval', 'shipping romania', 'transport fluvial dunare'] },
      { id: 'transport-feroviar', name: 'Transport Feroviar', keywords: ['transport feroviar', 'transport cale ferata', 'vagoane marfa', 'transport tren'] },
      { id: 'logistica', name: 'Logistică & Depozitare', keywords: ['logistica romania', 'depozitare marfa', 'warehouse romania', 'centru logistic'] },
      { id: 'mutari', name: 'Mutări & Relocări', keywords: ['firma mutari', 'mutari mobila', 'relocari birouri', 'mutari internationale'] },
      { id: 'inchirieri-auto', name: 'Închirieri Auto & Flote', keywords: ['inchirieri auto', 'rent a car romania', 'leasing auto', 'flota auto firma'] },
      { id: 'expeditii', name: 'Expediții & Freight', keywords: ['expeditii marfa', 'freight forwarder romania', 'casa expeditii', 'agent expeditie'] },
    ],
  },
  {
    id: 'constructii',
    name: 'Construcții & Imobiliare',
    icon: '🏗️',
    description: 'Firme de construcții, materiale, instalații',
    subcategories: [
      { id: 'constructii-civile', name: 'Construcții Civile', keywords: ['firma constructii', 'constructii civile', 'antreprenor constructii'] },
      { id: 'constructii-industriale', name: 'Construcții Industriale', keywords: ['constructii industriale', 'hale metalice', 'constructii depozite'] },
      { id: 'materiale', name: 'Materiale de Construcții', keywords: ['materiale constructii', 'depozit materiale', 'ciment caramida'] },
      { id: 'instalatii', name: 'Instalații Sanitare & Termice', keywords: ['instalatii sanitare', 'instalatii termice', 'instalator autorizat'] },
      { id: 'electrician', name: 'Instalații Electrice', keywords: ['electrician autorizat', 'instalatii electrice', 'firma electricitate'] },
      { id: 'finisaje', name: 'Finisaje & Amenajări', keywords: ['finisaje interioare', 'amenajari interioare', 'zugraveli decoratiuni'] },
      { id: 'drumuri', name: 'Infrastructură & Drumuri', keywords: ['constructii drumuri', 'asfaltare', 'infrastructura rutiera'] },
      { id: 'demolari', name: 'Demolări & Excavații', keywords: ['demolari constructii', 'excavatii terasamente', 'sapaturi fundatii'] },
      { id: 'imobiliare', name: 'Agenții Imobiliare', keywords: ['agentie imobiliara', 'imobiliare romania', 'vanzari apartamente'] },
      { id: 'arhitectura', name: 'Arhitectură & Design', keywords: ['birou arhitectura', 'proiectare constructii', 'design interior'] },
    ],
  },
  {
    id: 'auto',
    name: 'Auto & Service',
    icon: '🚗',
    description: 'Service-uri auto, piese, ITP, vulcanizări',
    subcategories: [
      { id: 'service-auto', name: 'Service Auto General', keywords: ['service auto', 'reparatii auto', 'atelier auto'] },
      { id: 'piese-auto', name: 'Piese & Accesorii Auto', keywords: ['piese auto', 'magazin piese auto', 'dezmembrari auto'] },
      { id: 'vulcanizare', name: 'Vulcanizare & Anvelope', keywords: ['vulcanizare', 'anvelope auto', 'schimb anvelope'] },
      { id: 'spalatorie', name: 'Spălătorie Auto', keywords: ['spalatorie auto', 'detailing auto', 'polish auto'] },
      { id: 'itp', name: 'ITP & Verificări Tehnice', keywords: ['statie ITP', 'inspectie tehnica periodica', 'verificare auto'] },
      { id: 'tractari', name: 'Tractări & Asistență Rutieră', keywords: ['tractari auto', 'asistenta rutiera', 'platforma auto'] },
      { id: 'vopsitorie', name: 'Vopsitorie & Tinichigerie', keywords: ['vopsitorie auto', 'tinichigerie auto', 'reparatii caroserie'] },
      { id: 'autoutilitare', name: 'Autoutilitare & Camioane', keywords: ['vanzare camioane', 'autoutilitare', 'vehicule comerciale'] },
    ],
  },
  {
    id: 'securitate',
    name: 'Securitate & Pază',
    icon: '🛡️',
    description: 'Firme pază, sisteme supraveghere, alarme',
    subcategories: [
      { id: 'paza', name: 'Pază & Protecție', keywords: ['firma paza', 'servicii paza', 'agent securitate'] },
      { id: 'supraveghere', name: 'Sisteme Supraveghere Video', keywords: ['camere supraveghere', 'sisteme CCTV', 'monitorizare video'] },
      { id: 'alarme', name: 'Sisteme de Alarmă', keywords: ['sisteme alarma', 'alarma casa', 'alarma antiefractie'] },
      { id: 'control-acces', name: 'Control Acces', keywords: ['control acces', 'sisteme pontaj', 'interfon video'] },
      { id: 'detectie-incendiu', name: 'Detecție Incendiu & PSI', keywords: ['detectie incendiu', 'sisteme PSI', 'stingatoare'] },
      { id: 'securitate-it', name: 'Securitate Cibernetică', keywords: ['securitate cibernetica', 'protectie date', 'cybersecurity firma'] },
    ],
  },
  {
    id: 'horeca',
    name: 'HoReCa',
    icon: '🍽️',
    description: 'Restaurante, hoteluri, catering, cafenele',
    subcategories: [
      { id: 'restaurante', name: 'Restaurante', keywords: ['restaurant romania', 'restaurante bucuresti', 'restaurant traditional'] },
      { id: 'hoteluri', name: 'Hoteluri & Pensiuni', keywords: ['hotel romania', 'pensiune turistica', 'cazare romania'] },
      { id: 'catering', name: 'Catering & Evenimente', keywords: ['catering evenimente', 'firma catering', 'meniu corporate'] },
      { id: 'cafenele', name: 'Cafenele & Bar-uri', keywords: ['cafenea', 'bar cocktail', 'pub restaurant'] },
      { id: 'fast-food', name: 'Fast Food & Delivery', keywords: ['fast food', 'livrare mancare', 'food delivery'] },
      { id: 'cofetarii', name: 'Cofetării & Patiserii', keywords: ['cofetarie', 'patiserie', 'torturi personalizate'] },
      { id: 'echipamente-horeca', name: 'Echipamente HoReCa', keywords: ['echipamente horeca', 'dotari restaurant', 'utilaje bucatarie'] },
    ],
  },
  {
    id: 'retail',
    name: 'Retail & Comerț',
    icon: '🏪',
    description: 'Magazine, supermarket-uri, en-gros',
    subcategories: [
      { id: 'magazine', name: 'Magazine & Retail', keywords: ['magazin romania', 'retail romania', 'comert cu amanuntul'] },
      { id: 'en-gros', name: 'Comerț En-Gros', keywords: ['en gros romania', 'distribuitor romania', 'angro produse'] },
      { id: 'alimentare', name: 'Alimentare & Băcănii', keywords: ['magazin alimentar', 'bacanie', 'minimarket'] },
      { id: 'online', name: 'Magazine Online / E-Commerce', keywords: ['magazin online romania', 'ecommerce romania', 'vanzari online'] },
      { id: 'electrocasnice', name: 'Electrice & Electronice', keywords: ['magazin electronice', 'electrocasnice', 'tehnica'] },
      { id: 'mobilier', name: 'Mobilier & Decorațiuni', keywords: ['magazin mobila', 'mobilier romania', 'decoratiuni interioare'] },
    ],
  },
  {
    id: 'it',
    name: 'IT & Telecomunicații',
    icon: '💻',
    description: 'Firme IT, software, telecomunicații, hosting',
    subcategories: [
      { id: 'software', name: 'Dezvoltare Software', keywords: ['firma software romania', 'dezvoltare aplicatii', 'programare web'] },
      { id: 'web-design', name: 'Web Design & Marketing', keywords: ['web design romania', 'agentie digitala', 'marketing online'] },
      { id: 'hosting', name: 'Hosting & Cloud', keywords: ['hosting romania', 'server dedicat', 'cloud computing'] },
      { id: 'reparatii-it', name: 'Reparații IT & Service', keywords: ['service calculatoare', 'reparatii laptop', 'service IT'] },
      { id: 'telecom', name: 'Telecomunicații', keywords: ['telecomunicatii firma', 'centrala telefonica', 'telefonie IP'] },
      { id: 'retele', name: 'Rețele & Infrastructură IT', keywords: ['retele calculatoare', 'infrastructura IT', 'cablare structurata'] },
    ],
  },
  {
    id: 'agricultura',
    name: 'Agricultură & Ferme',
    icon: '🌾',
    description: 'Ferme, utilaje agricole, produse agricole',
    subcategories: [
      { id: 'ferme', name: 'Ferme & Gospodării', keywords: ['ferma animale', 'ferma legume', 'gospodarie romania'] },
      { id: 'utilaje-agricole', name: 'Utilaje Agricole', keywords: ['utilaje agricole', 'tractoare romania', 'masini agricole'] },
      { id: 'seminte', name: 'Semințe & Îngrășăminte', keywords: ['seminte romania', 'ingrasaminte', 'produse fitosanitare'] },
      { id: 'cereale', name: 'Cereale & Oleaginoase', keywords: ['cereale romania', 'grau porumb', 'oleaginoase'] },
      { id: 'irigatii', name: 'Sisteme Irigații', keywords: ['irigatii', 'sisteme irigatii', 'pompe apa agricola'] },
      { id: 'apicultura', name: 'Apicultură & Produse Bio', keywords: ['apicultura', 'miere romania', 'produse bio ferma'] },
    ],
  },
  {
    id: 'sanatate',
    name: 'Sănătate & Medical',
    icon: '🏥',
    description: 'Clinici, cabinete medicale, farmacii, stomatologie',
    subcategories: [
      { id: 'clinici', name: 'Clinici & Spitale Private', keywords: ['clinica privata', 'spital privat', 'centru medical'] },
      { id: 'stomatologie', name: 'Stomatologie & Dentistică', keywords: ['cabinet stomatologic', 'dentist', 'implant dentar'] },
      { id: 'farmacii', name: 'Farmacii', keywords: ['farmacie romania', 'farmacie online', 'produse farmaceutice'] },
      { id: 'oftalmologie', name: 'Oftalmologie & Optică', keywords: ['oftalmologie', 'optica medicala', 'lentile ochelari'] },
      { id: 'recuperare', name: 'Recuperare & Fizioterapie', keywords: ['fizioterapie', 'recuperare medicala', 'kinetoterapie'] },
      { id: 'laborator', name: 'Laboratoare Analize', keywords: ['laborator analize', 'analize medicale', 'recoltare sange'] },
      { id: 'veterinar', name: 'Cabinete Veterinare', keywords: ['cabinet veterinar', 'clinica veterinara', 'medic veterinar'] },
    ],
  },
  {
    id: 'educatie',
    name: 'Educație & Training',
    icon: '🎓',
    description: 'Școli, universități, cursuri, after-school',
    subcategories: [
      { id: 'scoli-private', name: 'Școli & Licee Private', keywords: ['scoala privata', 'liceu privat', 'invatamant privat'] },
      { id: 'cursuri', name: 'Cursuri & Training', keywords: ['cursuri profesionale', 'training romania', 'centru formare'] },
      { id: 'limbi-straine', name: 'Limbi Străine', keywords: ['cursuri engleza', 'scoala limbi straine', 'traduceri autorizate'] },
      { id: 'after-school', name: 'After School & Grădinițe', keywords: ['after school', 'gradinita privata', 'cresa privata'] },
      { id: 'auto-scoala', name: 'Școli de Șoferi', keywords: ['scoala soferi', 'auto scoala', 'permis conducere'] },
    ],
  },
  {
    id: 'productie',
    name: 'Producție & Industrie',
    icon: '🏭',
    description: 'Fabrici, ateliere, producție industrială',
    subcategories: [
      { id: 'metalurgie', name: 'Metalurgie & Prelucrare Metale', keywords: ['prelucrare metale', 'confectii metalice', 'sudura industriala'] },
      { id: 'mase-plastice', name: 'Mase Plastice & Ambalaje', keywords: ['mase plastice', 'ambalaje romania', 'injectie plastic'] },
      { id: 'lemn', name: 'Prelucrare Lemn & Mobilă', keywords: ['prelucrare lemn', 'fabrica mobila', 'tamplarie'] },
      { id: 'textile', name: 'Textile & Confecții', keywords: ['confectii textile', 'fabrica haine', 'croitorie industriala'] },
      { id: 'alimentar', name: 'Industrie Alimentară', keywords: ['fabrica produse alimentare', 'procesare alimente', 'conserve'] },
      { id: 'chimic', name: 'Industrie Chimică', keywords: ['industrie chimica', 'produse chimice', 'detergenti industriali'] },
    ],
  },
  {
    id: 'turism',
    name: 'Turism & Agrement',
    icon: '✈️',
    description: 'Agenții turism, ghizi, agrement',
    subcategories: [
      { id: 'agentii-turism', name: 'Agenții de Turism', keywords: ['agentie turism', 'bilete avion', 'vacante romania'] },
      { id: 'ghizi', name: 'Ghizi Turistici', keywords: ['ghid turistic', 'tur ghidat', 'excursii organizate'] },
      { id: 'agrement', name: 'Agrement & Aventură', keywords: ['parc aventura', 'agrement outdoor', 'paintball'] },
      { id: 'spa', name: 'SPA & Wellness', keywords: ['spa wellness', 'centru spa', 'relaxare masaj'] },
      { id: 'inchirieri-turistice', name: 'Închirieri Turistice', keywords: ['inchiriere biciclete', 'ATV inchiriere', 'echipament ski'] },
    ],
  },
  {
    id: 'juridic',
    name: 'Juridic & Financiar',
    icon: '⚖️',
    description: 'Avocați, notari, contabilitate, consultanță',
    subcategories: [
      { id: 'avocatura', name: 'Cabinet Avocatură', keywords: ['avocat romania', 'cabinet avocat', 'consultanta juridica'] },
      { id: 'notariat', name: 'Birouri Notariale', keywords: ['notar public', 'birou notarial', 'legalizare acte'] },
      { id: 'contabilitate', name: 'Contabilitate & Audit', keywords: ['firma contabilitate', 'expert contabil', 'audit financiar'] },
      { id: 'consultanta-fiscala', name: 'Consultanță Fiscală', keywords: ['consultanta fiscala', 'planificare fiscala', 'declaratii fiscale'] },
      { id: 'executori', name: 'Executori Judecătorești', keywords: ['executor judecatoresc', 'executare silita', 'birou executor'] },
      { id: 'asigurari', name: 'Asigurări', keywords: ['firma asigurari', 'broker asigurari', 'polita asigurare'] },
    ],
  },
  {
    id: 'sport',
    name: 'Sport & Fitness',
    icon: '⚽',
    description: 'Săli fitness, cluburi sportive, magazine sport',
    subcategories: [
      { id: 'fitness', name: 'Săli Fitness & Gym', keywords: ['sala fitness', 'gym romania', 'antrenament personal'] },
      { id: 'cluburi-sportive', name: 'Cluburi Sportive', keywords: ['club sportiv', 'scoala sport', 'competitii sportive'] },
      { id: 'echipamente-sport', name: 'Echipamente Sportive', keywords: ['magazin sport', 'echipament sportiv', 'articole sportive'] },
      { id: 'piscine', name: 'Piscine & Aqua Park', keywords: ['piscina', 'aqua park', 'natatie'] },
      { id: 'arte-martiale', name: 'Arte Marțiale', keywords: ['arte martiale', 'karate', 'kickboxing sala'] },
    ],
  },
  {
    id: 'energie',
    name: 'Energie & Mediu',
    icon: '⚡',
    description: 'Energie solară, reciclare, utilități',
    subcategories: [
      { id: 'solar', name: 'Panouri Solare & Fotovoltaic', keywords: ['panouri solare', 'sistem fotovoltaic', 'energie solara firma'] },
      { id: 'reciclare', name: 'Reciclare & Deșeuri', keywords: ['reciclare deseuri', 'colectare deseuri', 'firma salubrizare'] },
      { id: 'climatizare', name: 'Climatizare & HVAC', keywords: ['aer conditionat', 'climatizare', 'ventilatie industriala'] },
      { id: 'gaze', name: 'Instalații Gaze', keywords: ['instalatii gaze', 'centrala termica', 'incalzire casa'] },
      { id: 'apa', name: 'Tratare Apă & Foraje', keywords: ['tratare apa', 'foraj put', 'statie epurare'] },
    ],
  },
  {
    id: 'curatenie',
    name: 'Curățenie & Servicii',
    icon: '🧹',
    description: 'Curățenie, DDD, întreținere clădiri',
    subcategories: [
      { id: 'curatenie-profesionala', name: 'Curățenie Profesională', keywords: ['firma curatenie', 'curatenie birouri', 'curatenie industriala'] },
      { id: 'ddd', name: 'DDD — Dezinsecție & Deratizare', keywords: ['dezinsectie', 'deratizare', 'dezinfectie firma'] },
      { id: 'spalatorie-covoare', name: 'Spălătorie Covoare', keywords: ['spalatorie covoare', 'curatare canapele', 'curatare tapiterie'] },
      { id: 'intretinere', name: 'Întreținere Clădiri', keywords: ['intretinere cladiri', 'administrare imobile', 'facility management'] },
    ],
  },
  {
    id: 'publicitate',
    name: 'Publicitate & Media',
    icon: '📢',
    description: 'Agenții publicitate, tipografii, PR',
    subcategories: [
      { id: 'agentii-pub', name: 'Agenții Publicitate', keywords: ['agentie publicitate', 'reclama firma', 'branding romania'] },
      { id: 'tipografii', name: 'Tipografii & Print', keywords: ['tipografie', 'print romania', 'imprimerie digitala'] },
      { id: 'productie-media', name: 'Producție Media & Video', keywords: ['productie video', 'filmare drona', 'studio foto'] },
      { id: 'seo-marketing', name: 'SEO & Marketing Digital', keywords: ['agentie SEO', 'marketing digital', 'social media management'] },
      { id: 'events', name: 'Organizare Evenimente', keywords: ['organizare evenimente', 'event planner', 'sonorizare lumini'] },
    ],
  },
]

/**
 * Flatten categories + subcategories into a flat keyword map
 * for the scraping engine
 */
export function getCategoryKeywords(categoryId: string, subcategoryIds?: string[]): string[] {
  const cat = BUSINESS_CATEGORIES_FULL.find(c => c.id === categoryId)
  if (!cat) return [categoryId]

  const keywords: string[] = []

  if (!subcategoryIds || subcategoryIds.length === 0) {
    // Use all subcategories
    for (const sub of cat.subcategories) {
      keywords.push(...sub.keywords)
    }
  } else {
    for (const subId of subcategoryIds) {
      const sub = cat.subcategories.find(s => s.id === subId)
      if (sub) keywords.push(...sub.keywords)
    }
  }

  return keywords
}

/**
 * Get a flat list for backward compatibility with BUSINESS_CATEGORIES
 */
export function getFlatCategories(): { id: string; name: string; keywords: string[] }[] {
  return BUSINESS_CATEGORIES_FULL.map(cat => ({
    id: cat.id,
    name: cat.name,
    keywords: cat.subcategories.flatMap(s => s.keywords).slice(0, 4),
  }))
}
