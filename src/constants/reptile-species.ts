import type { SupportedLanguage } from "@/i18n/resolve-language";

export type ReptileSpecies = {
  scientificName: string;
  commonNames: Record<SupportedLanguage, string>;
};

function searchReptileSpecies(
  query: string,
  nameOf: (species: ReptileSpecies) => string,
): ReptileSpecies[] {
  const cleanQuery = query.trim().toLocaleLowerCase();
  if (!cleanQuery) return [];

  return REPTILE_SPECIES.filter((species) =>
    nameOf(species).toLocaleLowerCase().startsWith(cleanQuery),
  );
}

export function searchReptileCommonName(
  query: string,
  language: SupportedLanguage,
): ReptileSpecies[] {
  return searchReptileSpecies(
    query,
    (species) => species.commonNames[language],
  );
}

export function searchScientificName(query: string): ReptileSpecies[] {
  return searchReptileSpecies(query, (species) => species.scientificName);
}

export const REPTILE_SPECIES: ReptileSpecies[] = [
  {
    scientificName: "Eublepharis macularius",
    commonNames: { en: "Leopard Gecko", "pt-BR": "Lagartixa leopardo" },
  },
  {
    scientificName: "Correlophus ciliatus",
    commonNames: { en: "Crested Gecko", "pt-BR": "Gecko de crista" },
  },
  {
    scientificName: "Rhacodactylus auriculatus",
    commonNames: { en: "Gargoyle Gecko", "pt-BR": "Gecko gárgula" },
  },
  {
    scientificName: "Rhacodactylus leachianus",
    commonNames: {
      en: "New Caledonian Giant Gecko",
      "pt-BR": "Gecko Gigante da Nova Caledonia",
    },
  },
  {
    scientificName: "Mniarogekko chahoua",
    commonNames: {
      en: "Mossy Prehensile-tailed Gecko",
      "pt-BR": "Gecko chahoua",
    },
  },
  {
    scientificName: "Hemitheconyx caudicinctus",
    commonNames: {
      en: "African Fat-tailed Gecko",
      "pt-BR": "Gecko africano de cauda gorda",
    },
  },
  {
    scientificName: "Phelsuma grandis",
    commonNames: {
      en: "Madagascar Giant Day Gecko",
      "pt-BR": "Gecko gigante diurno de Madagascar",
    },
  },
  {
    scientificName: "Phelsuma laticauda",
    commonNames: {
      en: "Gold Dust Day Gecko",
      "pt-BR": "Gecko diurno de pó dourado",
    },
  },
  {
    scientificName: "Phelsuma klemmeri",
    commonNames: { en: "Neon Day Gecko", "pt-BR": "Gecko diurno neon" },
  },
  {
    scientificName: "Phelsuma lineata",
    commonNames: { en: "Lined Day Gecko", "pt-BR": "Gecko diurno listrado" },
  },
  {
    scientificName: "Gekko gecko",
    commonNames: { en: "Tokay Gecko", "pt-BR": "Gecko tokay" },
  },
  {
    scientificName: "Gekko vittatus",
    commonNames: {
      en: "White-lined Gecko",
      "pt-BR": "Gecko de linhas brancas",
    },
  },
  {
    scientificName: "Ptychozoon kuhli",
    commonNames: { en: "Kuhl's Flying Gecko", "pt-BR": "Gecko voador de Kuhl" },
  },
  {
    scientificName: "Hemidactylus frenatus",
    commonNames: { en: "Common House Gecko", "pt-BR": "Lagartixa de parede" },
  },
  {
    scientificName: "Hemidactylus turcicus",
    commonNames: { en: "Mediterranean House Gecko", "pt-BR": "Osga turca" },
  },
  {
    scientificName: "Hemidactylus imbricatus",
    commonNames: { en: "Viper Gecko", "pt-BR": "Gecko víbora" },
  },
  {
    scientificName: "Uroplatus fimbriatus",
    commonNames: {
      en: "Giant Leaf-tailed Gecko",
      "pt-BR": "Gecko de cauda de folha",
    },
  },
  {
    scientificName: "Uroplatus sikorae",
    commonNames: {
      en: "Mossy Leaf-tailed Gecko",
      "pt-BR": "Gecko folha musgoso",
    },
  },
  {
    scientificName: "Nephrurus levis",
    commonNames: {
      en: "Smooth Knob-tailed Gecko",
      "pt-BR": "Gecko de cauda nodosa",
    },
  },
  {
    scientificName: "Underwoodisaurus milii",
    commonNames: { en: "Thick-tailed Gecko", "pt-BR": "Gecko de cauda grossa" },
  },
  {
    scientificName: "Coleonyx variegatus",
    commonNames: {
      en: "Western Banded Gecko",
      "pt-BR": "Gecko bandeado ocidental",
    },
  },
  {
    scientificName: "Coleonyx mitratus",
    commonNames: {
      en: "Central American Banded Gecko",
      "pt-BR": "Gecko bandeado centro americano",
    },
  },
  {
    scientificName: "Paroedura pictus",
    commonNames: { en: "Panther Gecko", "pt-BR": "Gecko pantera" },
  },
  {
    scientificName: "Lygodactylus williamsi",
    commonNames: { en: "Electric Blue Gecko", "pt-BR": "Gecko azul elétrico" },
  },
  {
    scientificName: "Chondrodactylus turneri",
    commonNames: {
      en: "Turner's Thick-toed Gecko",
      "pt-BR": "Gecko de Turner",
    },
  },
  {
    scientificName: "Teratoscincus scincus",
    commonNames: { en: "Frog-eyed Gecko", "pt-BR": "Gecko de olhos de rã" },
  },
  {
    scientificName: "Goniurosaurus luii",
    commonNames: {
      en: "Chinese Cave Gecko",
      "pt-BR": "Gecko de caverna chinês",
    },
  },
  {
    scientificName: "Goniurosaurus hainanensis",
    commonNames: {
      en: "Hainan Cave Gecko",
      "pt-BR": "Gecko de caverna de Hainan",
    },
  },
  {
    scientificName: "Strophurus williamsi",
    commonNames: {
      en: "Eastern Spiny-tailed Gecko",
      "pt-BR": "Gecko de cauda espinhosa",
    },
  },
  {
    scientificName: "Oedura castelnaui",
    commonNames: {
      en: "Northern Velvet Gecko",
      "pt-BR": "Gecko veludo do norte",
    },
  },
  {
    scientificName: "Pachydactylus rangei",
    commonNames: { en: "Web-footed Gecko", "pt-BR": "Gecko de pés palmados" },
  },
  {
    scientificName: "Sphaerodactylus elegans",
    commonNames: { en: "Ashy Dwarf Gecko", "pt-BR": "Gecko anão" },
  },
  {
    scientificName: "Tarentola mauritanica",
    commonNames: { en: "Moorish Gecko", "pt-BR": "Osga mourisca" },
  },
  {
    scientificName: "Lepidodactylus lugubris",
    commonNames: { en: "Mourning Gecko", "pt-BR": "Gecko luto" },
  },
  {
    scientificName: "Aeluroscalabotes felinus",
    commonNames: { en: "Cat Gecko", "pt-BR": "Gecko gato" },
  },
  {
    scientificName: "Pogona vitticeps",
    commonNames: { en: "Central Bearded Dragon", "pt-BR": "Dragão barbado" },
  },
  {
    scientificName: "Pogona henrylawsoni",
    commonNames: { en: "Rankin's Dragon", "pt-BR": "Dragão de Rankin" },
  },
  {
    scientificName: "Physignathus cocincinus",
    commonNames: {
      en: "Chinese Water Dragon",
      "pt-BR": "Dragão d'água chinês",
    },
  },
  {
    scientificName: "Intellagama lesueurii",
    commonNames: {
      en: "Australian Water Dragon",
      "pt-BR": "Dragão d'água australiano",
    },
  },
  {
    scientificName: "Chlamydosaurus kingii",
    commonNames: { en: "Frilled Dragon", "pt-BR": "Lagarto de gola" },
  },
  {
    scientificName: "Uromastyx geyri",
    commonNames: { en: "Saharan Uromastyx", "pt-BR": "Uromastyx do Saara" },
  },
  {
    scientificName: "Uromastyx ornata",
    commonNames: { en: "Ornate Uromastyx", "pt-BR": "Uromastyx ornamentado" },
  },
  {
    scientificName: "Uromastyx aegyptia",
    commonNames: { en: "Egyptian Uromastyx", "pt-BR": "Uromastyx egípcio" },
  },
  {
    scientificName: "Uromastyx dispar maliensis",
    commonNames: { en: "Mali Uromastyx", "pt-BR": "Uromastyx do Mali" },
  },
  {
    scientificName: "Agama agama",
    commonNames: {
      en: "Red-headed Rock Agama",
      "pt-BR": "Agama de cabeça vermelha",
    },
  },
  {
    scientificName: "Stellagama stellio",
    commonNames: { en: "Starred Agama", "pt-BR": "Agama estrelado" },
  },
  {
    scientificName: "Acanthosaura capra",
    commonNames: {
      en: "Mountain Horned Dragon",
      "pt-BR": "Dragão chifrudo da montanha",
    },
  },
  {
    scientificName: "Calotes versicolor",
    commonNames: { en: "Oriental Garden Lizard", "pt-BR": "Calote de jardim" },
  },
  {
    scientificName: "Chamaeleo calyptratus",
    commonNames: { en: "Veiled Chameleon", "pt-BR": "Camaleão do Iêmen" },
  },
  {
    scientificName: "Furcifer pardalis",
    commonNames: { en: "Panther Chameleon", "pt-BR": "Camaleão pantera" },
  },
  {
    scientificName: "Trioceros jacksonii",
    commonNames: { en: "Jackson's Chameleon", "pt-BR": "Camaleão de Jackson" },
  },
  {
    scientificName: "Rieppeleon brevicaudatus",
    commonNames: {
      en: "Bearded Pygmy Chameleon",
      "pt-BR": "Camaleão pigmeu barbado",
    },
  },
  {
    scientificName: "Chamaeleo senegalensis",
    commonNames: { en: "Senegal Chameleon", "pt-BR": "Camaleão do Senegal" },
  },
  {
    scientificName: "Furcifer oustaleti",
    commonNames: {
      en: "Malagasy Giant Chameleon",
      "pt-BR": "Camaleão gigante de Madagascar",
    },
  },
  {
    scientificName: "Tiliqua scincoides",
    commonNames: {
      en: "Eastern Blue-tongued Skink",
      "pt-BR": "Skink de língua azul oriental",
    },
  },
  {
    scientificName: "Tiliqua gigas",
    commonNames: {
      en: "Indonesian Blue-tongued Skink",
      "pt-BR": "Skink de língua azul indonésio",
    },
  },
  {
    scientificName: "Tiliqua rugosa",
    commonNames: { en: "Shingleback Skink", "pt-BR": "Skink de cauda curta" },
  },
  {
    scientificName: "Cyclodomorphus gerrardii",
    commonNames: { en: "Pink-tongued Skink", "pt-BR": "Skink de língua rosa" },
  },
  {
    scientificName: "Corucia zebrata",
    commonNames: {
      en: "Prehensile-tailed Skink",
      "pt-BR": "Skink de cauda preênsil",
    },
  },
  {
    scientificName: "Lepidothyris fernandi",
    commonNames: { en: "Fire Skink", "pt-BR": "Skink de fogo africano" },
  },
  {
    scientificName: "Tribolonotus gracilis",
    commonNames: {
      en: "Red-eyed Crocodile Skink",
      "pt-BR": "Skink crocodilo de olhos vermelhos",
    },
  },
  {
    scientificName: "Eutropis multifasciata",
    commonNames: { en: "Many-lined Sun Skink", "pt-BR": "Skink do sol" },
  },
  {
    scientificName: "Plestiodon fasciatus",
    commonNames: { en: "Five-lined Skink", "pt-BR": "Skink de cinco linhas" },
  },
  {
    scientificName: "Egernia stokesii",
    commonNames: { en: "Gidgee Skink", "pt-BR": "Skink espinhoso" },
  },
  {
    scientificName: "Eumeces schneideri",
    commonNames: { en: "Schneider's Skink", "pt-BR": "Skink de Schneider" },
  },
  {
    scientificName: "Salvator merianae",
    commonNames: {
      en: "Argentine Black and White Tegu",
      "pt-BR": "Teiú preto e branco",
    },
  },
  {
    scientificName: "Salvator rufescens",
    commonNames: { en: "Red Tegu", "pt-BR": "Teiú vermelho" },
  },
  {
    scientificName: "Tupinambis teguixin",
    commonNames: { en: "Gold Tegu", "pt-BR": "Teiú dourado" },
  },
  {
    scientificName: "Ameiva ameiva",
    commonNames: { en: "Giant Ameiva", "pt-BR": "Calango verde" },
  },
  {
    scientificName: "Crocodilurus amazonicus",
    commonNames: { en: "Crocodile Tegu", "pt-BR": "Jacarerana" },
  },
  {
    scientificName: "Iguana iguana",
    commonNames: { en: "Green Iguana", "pt-BR": "Iguana verde" },
  },
  {
    scientificName: "Cyclura cornuta",
    commonNames: { en: "Rhinoceros Iguana", "pt-BR": "Iguana rinoceronte" },
  },
  {
    scientificName: "Ctenosaura similis",
    commonNames: {
      en: "Black Spiny-tailed Iguana",
      "pt-BR": "Iguana de cauda espinhosa",
    },
  },
  {
    scientificName: "Sauromalus ater",
    commonNames: { en: "Chuckwalla", "pt-BR": "Chuckwalla" },
  },
  {
    scientificName: "Anolis carolinensis",
    commonNames: { en: "Green Anole", "pt-BR": "Anolis verde" },
  },
  {
    scientificName: "Anolis sagrei",
    commonNames: { en: "Brown Anole", "pt-BR": "Anolis marrom" },
  },
  {
    scientificName: "Anolis equestris",
    commonNames: { en: "Knight Anole", "pt-BR": "Anolis cavaleiro" },
  },
  {
    scientificName: "Anolis barbatus",
    commonNames: {
      en: "Cuban False Chameleon",
      "pt-BR": "Falso camaleão cubano",
    },
  },
  {
    scientificName: "Basiliscus plumifrons",
    commonNames: { en: "Green Basilisk", "pt-BR": "Basilisco verde" },
  },
  {
    scientificName: "Varanus exanthematicus",
    commonNames: { en: "Savannah Monitor", "pt-BR": "Monitor da savana" },
  },
  {
    scientificName: "Varanus acanthurus",
    commonNames: { en: "Ridge-tailed Monitor", "pt-BR": "Monitor ackie" },
  },
  {
    scientificName: "Varanus timorensis",
    commonNames: { en: "Timor Monitor", "pt-BR": "Monitor de Timor" },
  },
  {
    scientificName: "Varanus prasinus",
    commonNames: {
      en: "Emerald Tree Monitor",
      "pt-BR": "Monitor arborícola esmeralda",
    },
  },
  {
    scientificName: "Varanus niloticus",
    commonNames: { en: "Nile Monitor", "pt-BR": "Monitor do Nilo" },
  },
  {
    scientificName: "Varanus salvator",
    commonNames: {
      en: "Asian Water Monitor",
      "pt-BR": "Monitor d'água asiático",
    },
  },
  {
    scientificName: "Shinisaurus crocodilurus",
    commonNames: {
      en: "Chinese Crocodile Lizard",
      "pt-BR": "Lagarto jacaré chinês",
    },
  },
  {
    scientificName: "Gerrhosaurus major",
    commonNames: {
      en: "Sudan Plated Lizard",
      "pt-BR": "Lagarto de placas do Sudão",
    },
  },
  {
    scientificName: "Takydromus sexlineatus",
    commonNames: {
      en: "Asian Grass Lizard",
      "pt-BR": "Lagarto do capim asiático",
    },
  },
  {
    scientificName: "Timon lepidus",
    commonNames: { en: "Ocellated Lizard", "pt-BR": "Lacerta ocelada" },
  },
  {
    scientificName: "Lacerta viridis",
    commonNames: {
      en: "European Green Lizard",
      "pt-BR": "Lagarto verde europeu",
    },
  },
  {
    scientificName: "Python regius",
    commonNames: { en: "Ball Python", "pt-BR": "Píton bola" },
  },
  {
    scientificName: "Python bivittatus",
    commonNames: { en: "Burmese Python", "pt-BR": "Píton birmanesa" },
  },
  {
    scientificName: "Malayopython reticulatus",
    commonNames: { en: "Reticulated Python", "pt-BR": "Píton reticulada" },
  },
  {
    scientificName: "Python brongersmai",
    commonNames: { en: "Blood Python", "pt-BR": "Píton de sangue" },
  },
  {
    scientificName: "Python curtus",
    commonNames: {
      en: "Sumatran Short-tailed Python",
      "pt-BR": "Píton de cauda curta de Sumatra",
    },
  },
  {
    scientificName: "Python breitensteini",
    commonNames: {
      en: "Borneo Short-tailed Python",
      "pt-BR": "Píton de cauda curta de Bornéu",
    },
  },
  {
    scientificName: "Python anchietae",
    commonNames: { en: "Angolan Python", "pt-BR": "Píton de Angola" },
  },
  {
    scientificName: "Python molurus",
    commonNames: { en: "Indian Python", "pt-BR": "Píton indiana" },
  },
  {
    scientificName: "Antaresia childreni",
    commonNames: { en: "Children's Python", "pt-BR": "Píton de Children" },
  },
  {
    scientificName: "Antaresia maculosa",
    commonNames: { en: "Spotted Python", "pt-BR": "Píton malhada" },
  },
  {
    scientificName: "Morelia spilota",
    commonNames: { en: "Carpet Python", "pt-BR": "Píton tapete" },
  },
  {
    scientificName: "Morelia viridis",
    commonNames: { en: "Green Tree Python", "pt-BR": "Píton verde arborícola" },
  },
  {
    scientificName: "Aspidites melanocephalus",
    commonNames: {
      en: "Black-headed Python",
      "pt-BR": "Píton de cabeça preta",
    },
  },
  {
    scientificName: "Aspidites ramsayi",
    commonNames: { en: "Woma Python", "pt-BR": "Píton de Woma" },
  },
  {
    scientificName: "Liasis mackloti savuensis",
    commonNames: { en: "Savu Python", "pt-BR": "Píton de Savu" },
  },
  {
    scientificName: "Boa constrictor constrictor",
    commonNames: { en: "Red-tailed Boa", "pt-BR": "Jiboia" },
  },
  {
    scientificName: "Boa constrictor amarali",
    commonNames: { en: "Short-tailed Boa", "pt-BR": "Jiboia do cerrado" },
  },
  {
    scientificName: "Boa constrictor imperator",
    commonNames: {
      en: "Central American Boa",
      "pt-BR": "Jiboia da América Central",
    },
  },
  {
    scientificName: "Acrantophis dumerili",
    commonNames: { en: "Dumeril's Boa", "pt-BR": "Jiboia de Dumeril" },
  },
  {
    scientificName: "Epicrates cenchria",
    commonNames: {
      en: "Brazilian Rainbow Boa",
      "pt-BR": "Jiboia arco-íris da amazônia",
    },
  },
  {
    scientificName: "Epicrates assisi",
    commonNames: {
      en: "Caatinga Rainbow Boa",
      "pt-BR": "Jiboia arco-íris da caatinga",
    },
  },
  {
    scientificName: "Epicrates crassus",
    commonNames: {
      en: "Cerrado Rainbow Boa",
      "pt-BR": "Jiboia arco-íris do cerrado",
    },
  },
  {
    scientificName: "Epicrates maurus",
    commonNames: {
      en: "Colombian Rainbow Boa",
      "pt-BR": "Jiboia arco-íris do norte",
    },
  },
  {
    scientificName: "Corallus hortulanus",
    commonNames: { en: "Amazon Tree Boa", "pt-BR": "Suaçuboia" },
  },
  {
    scientificName: "Corallus caninus",
    commonNames: { en: "Emerald Tree Boa", "pt-BR": "Cobra papagaio" },
  },
  {
    scientificName: "Corallus batesii",
    commonNames: {
      en: "Amazon Basin Emerald Tree Boa",
      "pt-BR": "Periquitamboia",
    },
  },
  {
    scientificName: "Eunectes murinus",
    commonNames: { en: "Green Anaconda", "pt-BR": "Sucuri verde" },
  },
  {
    scientificName: "Eunectes notaeus",
    commonNames: { en: "Yellow Anaconda", "pt-BR": "Sucuri amarela" },
  },
  {
    scientificName: "Eryx colubrinus",
    commonNames: { en: "Kenyan Sand Boa", "pt-BR": "Boa da areia do Quênia" },
  },
  {
    scientificName: "Lichanura trivirgata",
    commonNames: { en: "Rosy Boa", "pt-BR": "Boa rosada" },
  },
  {
    scientificName: "Pantherophis guttatus",
    commonNames: { en: "Corn Snake", "pt-BR": "Cobra do milho" },
  },
  {
    scientificName: "Pantherophis obsoletus",
    commonNames: { en: "Western Rat Snake", "pt-BR": "Cobra rato ocidental" },
  },
  {
    scientificName: "Pantherophis alleghaniensis",
    commonNames: { en: "Eastern Rat Snake", "pt-BR": "Cobra rato oriental" },
  },
  {
    scientificName: "Lampropeltis californiae",
    commonNames: {
      en: "California Kingsnake",
      "pt-BR": "Cobra real californiana",
    },
  },
  {
    scientificName: "Lampropeltis nigrita",
    commonNames: {
      en: "Mexican Black Kingsnake",
      "pt-BR": "Cobra real negra mexicana",
    },
  },
  {
    scientificName: "Lampropeltis getula",
    commonNames: { en: "Common Kingsnake", "pt-BR": "Cobra real comum" },
  },
  {
    scientificName: "Lampropeltis triangulum",
    commonNames: { en: "Milk Snake", "pt-BR": "Cobra do leite" },
  },
  {
    scientificName: "Lampropeltis abnorma",
    commonNames: {
      en: "Honduran Milk Snake",
      "pt-BR": "Cobra do leite de Honduras",
    },
  },
  {
    scientificName: "Lampropeltis polyzona",
    commonNames: {
      en: "Nelson's Milk Snake",
      "pt-BR": "Cobra do leite nelsoni",
    },
  },
  {
    scientificName: "Lampropeltis elapsoides",
    commonNames: { en: "Scarlet Kingsnake", "pt-BR": "Cobra real escarlate" },
  },
  {
    scientificName: "Heterodon nasicus",
    commonNames: {
      en: "Western Hognose Snake",
      "pt-BR": "Cobra nariz de porco ocidental",
    },
  },
  {
    scientificName: "Thamnophis sirtalis",
    commonNames: { en: "Common Garter Snake", "pt-BR": "Cobra liga comum" },
  },
  {
    scientificName: "Pituophis catenifer",
    commonNames: { en: "Gopher Snake", "pt-BR": "Cobra gopher" },
  },
  {
    scientificName: "Pituophis catenifer sayi",
    commonNames: { en: "Bullsnake", "pt-BR": "Cobra touro" },
  },
  {
    scientificName: "Elaphe climacophora",
    commonNames: { en: "Japanese Rat Snake", "pt-BR": "Cobra rato japonesa" },
  },
  {
    scientificName: "Elaphe schrenckii",
    commonNames: { en: "Russian Rat Snake", "pt-BR": "Cobra rato russa" },
  },
  {
    scientificName: "Euprepiophis mandarinus",
    commonNames: { en: "Mandarin Rat Snake", "pt-BR": "Cobra rato mandarim" },
  },
  {
    scientificName: "Orthriophis taeniurus",
    commonNames: { en: "Beauty Rat Snake", "pt-BR": "Cobra rato beleza" },
  },
  {
    scientificName: "Gonyosoma oxycephalum",
    commonNames: {
      en: "Red-tailed Green Rat Snake",
      "pt-BR": "Cobra rato verde de cauda vermelha",
    },
  },
  {
    scientificName: "Bogertophis subocularis",
    commonNames: {
      en: "Trans-Pecos Rat Snake",
      "pt-BR": "Cobra rato do Trans Pecos",
    },
  },
  {
    scientificName: "Zamenis longissimus",
    commonNames: { en: "Aesculapian Snake", "pt-BR": "Cobra de Esculápio" },
  },
  {
    scientificName: "Drymarchon couperi",
    commonNames: { en: "Eastern Indigo Snake", "pt-BR": "Cobra índigo" },
  },
  {
    scientificName: "Xenopeltis unicolor",
    commonNames: { en: "Sunbeam Snake", "pt-BR": "Cobra sol" },
  },
  {
    scientificName: "Boaedon capensis",
    commonNames: {
      en: "African House Snake",
      "pt-BR": "Cobra doméstica africana",
    },
  },
  {
    scientificName: "Dasypeltis scabra",
    commonNames: {
      en: "African Egg-eating Snake",
      "pt-BR": "Cobra comedora de ovos africana",
    },
  },
  {
    scientificName: "Hydrodynastes gigas",
    commonNames: { en: "False Water Cobra", "pt-BR": "Falsa cobra d'água" },
  },
  {
    scientificName: "Spilotes pullatus",
    commonNames: { en: "Tiger Rat Snake", "pt-BR": "Caninana" },
  },
  {
    scientificName: "Boiruna sertaneja",
    commonNames: { en: "Mussurana", "pt-BR": "Mussurana" },
  },
  {
    scientificName: "Trachemys scripta elegans",
    commonNames: { en: "Red-eared Slider", "pt-BR": "Tigre d'água americano" },
  },
  {
    scientificName: "Trachemys dorbigni",
    commonNames: { en: "Brazilian Slider", "pt-BR": "Tigre d'água brasileiro" },
  },
  {
    scientificName: "Chrysemys picta",
    commonNames: { en: "Painted Turtle", "pt-BR": "Tartaruga pintada" },
  },
  {
    scientificName: "Graptemys pseudogeographica",
    commonNames: { en: "False Map Turtle", "pt-BR": "Tartaruga mapa falsa" },
  },
  {
    scientificName: "Graptemys geographica",
    commonNames: {
      en: "Northern Map Turtle",
      "pt-BR": "Tartaruga mapa do norte",
    },
  },
  {
    scientificName: "Pseudemys nelsoni",
    commonNames: {
      en: "Florida Red-bellied Cooter",
      "pt-BR": "Tartaruga de ventre vermelho da Flórida",
    },
  },
  {
    scientificName: "Malaclemys terrapin",
    commonNames: { en: "Diamondback Terrapin", "pt-BR": "Tartaruga diamante" },
  },
  {
    scientificName: "Sternotherus odoratus",
    commonNames: {
      en: "Common Musk Turtle",
      "pt-BR": "Tartaruga almiscarada comum",
    },
  },
  {
    scientificName: "Sternotherus carinatus",
    commonNames: {
      en: "Razor-backed Musk Turtle",
      "pt-BR": "Tartaruga almiscarada de dorso serrilhado",
    },
  },
  {
    scientificName: "Kinosternon subrubrum",
    commonNames: {
      en: "Eastern Mud Turtle",
      "pt-BR": "Tartaruga do lodo oriental",
    },
  },
  {
    scientificName: "Terrapene carolina",
    commonNames: { en: "Eastern Box Turtle", "pt-BR": "Tartaruga caixa comum" },
  },
  {
    scientificName: "Cuora amboinensis",
    commonNames: {
      en: "Southeast Asian Box Turtle",
      "pt-BR": "Tartaruga caixa asiática",
    },
  },
  {
    scientificName: "Mauremys reevesii",
    commonNames: { en: "Reeves' Turtle", "pt-BR": "Tartaruga de Reeves" },
  },
  {
    scientificName: "Mauremys sinensis",
    commonNames: {
      en: "Chinese Stripe-necked Turtle",
      "pt-BR": "Tartaruga de pescoço listrado",
    },
  },
  {
    scientificName: "Emys orbicularis",
    commonNames: { en: "European Pond Turtle", "pt-BR": "Cágado europeu" },
  },
  {
    scientificName: "Chelodina longicollis",
    commonNames: {
      en: "Eastern Snake-necked Turtle",
      "pt-BR": "Tartaruga de pescoço de cobra",
    },
  },
  {
    scientificName: "Emydura subglobosa",
    commonNames: {
      en: "Pink-bellied Side-necked Turtle",
      "pt-BR": "Tartaruga de barriga rosa",
    },
  },
  {
    scientificName: "Pelomedusa subrufa",
    commonNames: {
      en: "African Helmeted Turtle",
      "pt-BR": "Tartaruga africana de pescoço lateral",
    },
  },
  {
    scientificName: "Phrynops geoffroanus",
    commonNames: {
      en: "Geoffroy's Side-necked Turtle",
      "pt-BR": "Cágado de barbicha",
    },
  },
  {
    scientificName: "Podocnemis unifilis",
    commonNames: { en: "Yellow-spotted River Turtle", "pt-BR": "Tracajá" },
  },
  {
    scientificName: "Chelus fimbriata",
    commonNames: { en: "Mata Mata", "pt-BR": "Matamatá" },
  },
  {
    scientificName: "Apalone spinifera",
    commonNames: {
      en: "Spiny Softshell Turtle",
      "pt-BR": "Tartaruga de casco mole espinhosa",
    },
  },
  {
    scientificName: "Chelydra serpentina",
    commonNames: {
      en: "Common Snapping Turtle",
      "pt-BR": "Tartaruga mordedora",
    },
  },
  {
    scientificName: "Testudo hermanni",
    commonNames: { en: "Hermann's Tortoise", "pt-BR": "Jabuti de Hermann" },
  },
  {
    scientificName: "Testudo graeca",
    commonNames: { en: "Greek Tortoise", "pt-BR": "Jabuti grego" },
  },
  {
    scientificName: "Testudo horsfieldii",
    commonNames: { en: "Russian Tortoise", "pt-BR": "Jabuti russo" },
  },
  {
    scientificName: "Testudo marginata",
    commonNames: { en: "Marginated Tortoise", "pt-BR": "Jabuti marginado" },
  },
  {
    scientificName: "Chelonoidis carbonarius",
    commonNames: { en: "Red-footed Tortoise", "pt-BR": "Jabuti piranga" },
  },
  {
    scientificName: "Chelonoidis denticulatus",
    commonNames: { en: "Yellow-footed Tortoise", "pt-BR": "Jabuti tinga" },
  },
  {
    scientificName: "Chelonoidis chilensis",
    commonNames: { en: "Argentine Tortoise", "pt-BR": "Jabuti argentino" },
  },
  {
    scientificName: "Stigmochelys pardalis",
    commonNames: { en: "Leopard Tortoise", "pt-BR": "Jabuti leopardo" },
  },
  {
    scientificName: "Centrochelys sulcata",
    commonNames: { en: "African Spurred Tortoise", "pt-BR": "Jabuti sulcata" },
  },
  {
    scientificName: "Geochelone elegans",
    commonNames: {
      en: "Indian Star Tortoise",
      "pt-BR": "Jabuti estrela indiano",
    },
  },
  {
    scientificName: "Astrochelys radiata",
    commonNames: { en: "Radiated Tortoise", "pt-BR": "Jabuti radiado" },
  },
  {
    scientificName: "Kinixys homeana",
    commonNames: {
      en: "Home's Hinge-back Tortoise",
      "pt-BR": "Jabuti de dobradiça de Home",
    },
  },
  {
    scientificName: "Malacochersus tornieri",
    commonNames: { en: "Pancake Tortoise", "pt-BR": "Jabuti panqueca" },
  },
  {
    scientificName: "Indotestudo elongata",
    commonNames: { en: "Elongated Tortoise", "pt-BR": "Jabuti alongado" },
  },
];
