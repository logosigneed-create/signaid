// Realistic 3D CGI Scenic Backgrounds (Images de Synthèse 3D Réalistes)
// Conçues selon l'instruction : Élément architectural central dans un paysage panoramique,
// avec lumières adaptées au genre musical (Techno, House, Acid, etc.), rendu 3D photoréaliste (Octane / Cinema 4D / Unreal Engine 5).

export interface RealisticCgiPreset {
  id: string;
  name: string;
  genreMatch: string;
  description: string;
  imageUrl: string;
  lightingType: string;
}

export const REALISTIC_CGI_ATMOSPHERES: RealisticCgiPreset[] = [
  {
    id: 'greenhouse-urban-neon',
    name: 'Verrière Végétale & Néons Ambrés (Urban / Melodic)',
    genreMatch: 'Urban & Melodic',
    description: 'Paysage architectural intimiste de verrière végétale, briques anciennes et néons ambrés.',
    imageUrl: '/demo/bg-demo.jpg',
    lightingType: 'Amber Neon Glow & Diffused Skylight',
  },
  {
    id: 'monolith-obsidian-twilight',
    name: 'Monolithe d\'Obsidienne 3D (Techno)',
    genreMatch: 'Techno & Industrial',
    description: 'Image de synthèse 3D réaliste : monolithe minéral noir biseauté se dressant au centre d\'une plaine volcanique avec clair de lune cyan et brume volumétrique.',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=85',
    lightingType: 'Cyan Moonlight & Cold Rim Light',
  },
  {
    id: 'glass-portal-sunset',
    name: 'Portail de Verre Dépoli & Dunes (Melodic House)',
    genreMatch: 'House & Deep Minimal',
    description: 'Image de synthèse 3D photoréaliste : portail architectural monolithique en verre teinté au milieu des dunes de sable, coucher de soleil doré rasante et lueurs ambrées.',
    imageUrl: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=1200&q=85',
    lightingType: 'Golden Hour & Amber Dusk Luminescence',
  },
  {
    id: 'floating-chrome-torus',
    name: 'Torus Chromé Flottant (Acid / Trance)',
    genreMatch: 'Hard Groove & Acid',
    description: 'Image de synthèse 3D : anneau géométrique en chrome liquide flottant au centre d\'un lac sombre au crépuscule, reflets ultraviolets et lueur néon.',
    imageUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=1200&q=85',
    lightingType: 'Ultraviolet & Electric Cyan Reflections',
  },
  {
    id: 'brutalist-concrete-pavilion',
    name: 'Pavillon Brutaliste dans la Brume (Minimal)',
    genreMatch: 'Techno & Industrial',
    description: 'Image de synthèse 3D architecturale : structure monolithique en béton architectonique dans une vallée brumeuse, éclairage argenté monochrome.',
    imageUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=1200&q=85',
    lightingType: 'Monochrome Silver & Diffused Mist',
  },
  {
    id: 'mirror-sphere-desert',
    name: 'Sphère Miroir sur Désert Salé (Organic)',
    genreMatch: 'House & Deep Minimal',
    description: 'Image de synthèse 3D ultra réaliste : sphère spéculaire réfléchissant le ciel crépusculaire infini sur un salar aux textures craquelées.',
    imageUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200&q=85',
    lightingType: 'Warm Terracotta & Specular Twilight',
  },
  {
    id: 'futuristic-cyber-monolith',
    name: 'Monolithe Luminescent (Rap / Trap Drill)',
    genreMatch: 'Rap & Trap Drill',
    description: 'Image de synthèse 3D : monolithe sombre aux arêtes vives néon dans un décor urbain crépusculaire brut et cinématique.',
    imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=85',
    lightingType: 'Acid Green & High Contrast Strobe',
  },
];
