import { ProductDatabase, Post, User, CartItem, PredefinedLogo } from './types';

export const productDatabase: ProductDatabase = {
  tshirt: {
    name: "T-shirt",
    price: 16,
    sizes: ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL", "7XL", "8XL", "9XL", "10XL"],
    slideImage: "https://signeedclub.com/wp-content/uploads/2025/06/slide-tshirt.jpeg",
    images: {
      "#000000": "https://signeedclub.com/wp-content/uploads/2025/06/tshirt-black-JHK170.png",
      "#FFFFFF": "https://signeedclub.com/wp-content/uploads/2025/06/tshirt-white-JHK170.png",
      "#EF4444": "https://signeedclub.com/wp-content/uploads/2025/06/tshirt-red-JHK170.png",
      "#F59E0B": "https://signeedclub.com/wp-content/uploads/2025/06/tshirt-yellow-JHK170.png",
      "#FFA500": "https://signeedclub.com/wp-content/uploads/2025/06/tshirt-orange-JHK170.png",
      "#4169E1": "https://signeedclub.com/wp-content/uploads/2025/06/tshirt-royal-blue-JHK170.png",
    },
    backImages: {
      "#000000": "https://signeedclub.com/wp-content/uploads/2025/06/tshirt-black-JHK170-dos.png",
      "#FFFFFF": "https://signeedclub.com/wp-content/uploads/2025/06/tshirt-white-JHK170-dos.png",
      "#EF4444": "https://signeedclub.com/wp-content/uploads/2025/06/tshirt-red-JHK170-dos.png",
      "#F59E0B": "https://signeedclub.com/wp-content/uploads/2025/06/tshirt-yellow-JHK170-dos.png",
      "#FFA500": "https://signeedclub.com/wp-content/uploads/2025/06/tshirt-orange-JHK170-dos.png",
      "#4169E1": "https://signeedclub.com/wp-content/uploads/2025/06/tshirt-royal-blue-JHK170-dos.png",
    },
  },
  tshirtfemme: {
    name: "T-shirt femme",
    price: 16,
    sizes: ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL", "7XL", "8XL", "9XL", "10XL"],
    slideImage: "https://signeedclub.com/wp-content/uploads/2025/06/slide-tshirtfemme.JPG",
    images: {
      "#FFB366": "https://signeedclub.com/wp-content/uploads/2025/06/tshirtfemme-apricot-bctw02t.JPG",
      "#007FFF": "https://signeedclub.com/wp-content/uploads/2025/06/tshirtfemme-sky-blue-bctw02t.JPG",
      "#000000": "https://signeedclub.com/wp-content/uploads/2025/06/tshirtfemme-black-bctw02t.JPG",
      "#355E3B": "https://signeedclub.com/wp-content/uploads/2025/06/tshirtfemme-bottle-green-bctw02t.JPG",
      "#800020": "https://signeedclub.com/wp-content/uploads/2025/06/tshirtfemme-burgundy-bctw02t.JPG",
      "#8B0000": "https://signeedclub.com/wp-content/uploads/2025/06/tshirtfemme-deep-red-bctw02t.JPG",
      "#6495ED": "https://signeedclub.com/wp-content/uploads/2025/06/tshirtfemme-diva-blue-bctw02t.JPG",
      "#DC143C": "https://signeedclub.com/wp-content/uploads/2025/06/tshirtfemme-fire-red-bctw02t.JPG",
      "#FF1493": "https://signeedclub.com/wp-content/uploads/2025/06/tshirtfemme-fuchsia-bctw02t.JPG",
      "#228B22": "https://signeedclub.com/wp-content/uploads/2025/06/tshirtfemme-kelly-green-bctw02t.JPG",
      "#F0E68C": "https://signeedclub.com/wp-content/uploads/2025/06/tshirtfemme-millennial-khaki-bctw02t.JPG",
      "#FADADD": "https://signeedclub.com/wp-content/uploads/2025/06/tshirtfemme-millennial-pink-bctw02t.JPG",
      "#FFA500": "https://signeedclub.com/wp-content/uploads/2025/06/tshirtfemme-orange-bctw02t.JPG",
      "#DA70D6": "https://signeedclub.com/wp-content/uploads/2025/06/tshirtfemme-orchid-green-bctw02t.JPG",
      "#93C572": "https://signeedclub.com/wp-content/uploads/2025/06/tshirtfemme-pistachio-bctw02t.JPG",
      "#663399": "https://signeedclub.com/wp-content/uploads/2025/06/tshirtfemme-radiant-purple-bctw02t.JPG",
      "#30D5C8": "https://signeedclub.com/wp-content/uploads/2025/06/tshirtfemme-real-turquoise-bctw02t.JPG",
      "#FF0000": "https://signeedclub.com/wp-content/uploads/2025/06/tshirtfemme-red-bctw02t.JPG",
      "#4169E1": "https://signeedclub.com/wp-content/uploads/2025/06/tshirtfemme-royal-blue-bctw02t.JPG",
      "#C2B280": "https://signeedclub.com/wp-content/uploads/2025/06/tshirtfemme-sand-bctw02t.JPG",
      "#87CEEB": "https://signeedclub.com/wp-content/uploads/2025/06/tshirtfemme-sky-blue-bctw02t.JPG",
      "#FFFF00": "https://signeedclub.com/wp-content/uploads/2025/06/tshirtfemme-solar-yellow-bctw02t.JPG",
      "#40E0D0": "https://signeedclub.com/wp-content/uploads/2025/06/tshirtfemme-turquoise-bctw02t.JPG",
      "#C3B091": "https://signeedclub.com/wp-content/uploads/2025/06/tshirtfemme-urban-khaki-bctw02t.JPG",
      "#FFFFFF": "https://signeedclub.com/wp-content/uploads/2025/06/tshirtfemme-white-bctw02t.JPG",
    },
    backImages: {
      "#FFB366": "https://signeedclub.com/wp-content/uploads/2025/06/tshirtfemme-apricot-bctw02t-dos.JPG",
      "#007FFF": "https://signeedclub.com/wp-content/uploads/2025/06/tshirtfemme-sky-blue-bctw02t-dos.JPG",
      "#000000": "https://signeedclub.com/wp-content/uploads/2025/06/tshirtfemme-black-bctw02t-dos.JPG",
      "#355E3B": "https://signeedclub.com/wp-content/uploads/2025/06/tshirtfemme-bottle-green-bctw02t-dos.JPG",
      "#800020": "https://signeedclub.com/wp-content/uploads/2025/06/tshirtfemme-burgundy-bctw02t-dos.JPG",
      "#8B0000": "https://signeedclub.com/wp-content/uploads/2025/06/tshirtfemme-deep-red-bctw02t-dos.JPG",
      "#6495ED": "https://signeedclub.com/wp-content/uploads/2025/06/tshirtfemme-diva-blue-bctw02t-dos.JPG",
      "#DC143C": "https://signeedclub.com/wp-content/uploads/2025/06/tshirtfemme-fire-red-bctw02t-dos.JPG",
      "#FF1493": "https://signeedclub.com/wp-content/uploads/2025/06/tshirtfemme-fuchsia-bctw02t-dos.JPG",
      "#228B22": "https://signeedclub.com/wp-content/uploads/2025/06/tshirtfemme-kelly-green-bctw02t-dos.JPG",
      "#F0E68C": "https://signeedclub.com/wp-content/uploads/2025/06/tshirtfemme-millennial-khaki-bctw02t-dos.JPG",
      "#FADADD": "https://signeedclub.com/wp-content/uploads/2025/06/tshirtfemme-millennial-pink-bctw02t-dos.JPG",
      "#FFA500": "https://signeedclub.com/wp-content/uploads/2025/06/tshirtfemme-orange-bctw02t-dos.JPG",
      "#DA70D6": "https://signeedclub.com/wp-content/uploads/2025/06/tshirtfemme-orchid-green-bctw02t-dos.JPG",
      "#93C572": "https://signeedclub.com/wp-content/uploads/2025/06/tshirtfemme-pistachio-bctw02t-dos.JPG",
      "#663399": "https://signeedclub.com/wp-content/uploads/2025/06/tshirtfemme-radiant-purple-bctw02t-dos.JPG",
      "#30D5C8": "https://signeedclub.com/wp-content/uploads/2025/06/tshirtfemme-real-turquoise-bctw02t-dos.JPG",
      "#FF0000": "https://signeedclub.com/wp-content/uploads/2025/06/tshirtfemme-red-bctw02t-dos.JPG",
      "#4169E1": "https://signeedclub.com/wp-content/uploads/2025/06/tshirtfemme-royal-blue-bctw02t-dos.JPG",
      "#C2B280": "https://signeedclub.com/wp-content/uploads/2025/06/tshirtfemme-sand-bctw02t-dos.JPG",
      "#87CEEB": "https://signeedclub.com/wp-content/uploads/2025/06/tshirtfemme-sky-blue-bctw02t-dos.JPG",
      "#FFFF00": "https://signeedclub.com/wp-content/uploads/2025/06/tshirtfemme-solar-yellow-bctw02t-dos.JPG",
      "#40E0D0": "https://signeedclub.com/wp-content/uploads/2025/06/tshirtfemme-turquoise-bctw02t-dos.JPG",
      "#C3B091": "https://signeedclub.com/wp-content/uploads/2025/06/tshirtfemme-urban-khaki-bctw02t-dos.JPG",
      "#FFFFFF": "https://signeedclub.com/wp-content/uploads/2025/06/tshirtfemme-white-bctw02t-dos.JPG",
    },
  },
  hoodie: {
    name: "Sweat capuche",
    price: 25,
    sizes: ["S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL", "7XL", "8XL", "9XL", "10XL"],
    slideImage: "https://signeedclub.com/wp-content/uploads/2025/06/slide-hoodie.jpeg",
    images: {
      "#FFFFFF": "https://signeedclub.com/wp-content/uploads/2025/06/hoodie-white-JHK421.png",
      "#000000": "https://signeedclub.com/wp-content/uploads/2025/06/hoodie-black-JHK421.png",
      "#4CBB17": "https://signeedclub.com/wp-content/uploads/2025/06/hoodie-kellygreen-JHK421.png",
      "#4169E1": "https://signeedclub.com/wp-content/uploads/2025/06/hoodie-royalblue-JHK421.png",
      "#87CEEB": "https://signeedclub.com/wp-content/uploads/2025/06/hoodie-sky-JHK421.png",
      "#FF0000": "https://signeedclub.com/wp-content/uploads/2025/06/hoodie-red-JHK421.png",
      "#FFA500": "https://signeedclub.com/wp-content/uploads/2025/06/hoodie-orange-JHK421.png",
      "#FFD700": "https://signeedclub.com/wp-content/uploads/2025/06/hoodie-gold-JHK421.png",
      "#800020": "https://signeedclub.com/wp-content/uploads/2025/06/hoodie-burgundy-JHK421.png",
      "#800080": "https://signeedclub.com/wp-content/uploads/2025/06/hoodie-purple-JHK421.png",
      "#808080": "https://signeedclub.com/wp-content/uploads/2025/06/hoodie-grey-JHK421.png",
      "#000080": "https://signeedclub.com/wp-content/uploads/2025/06/hoodie-navy-JHK421.png",
    },
    backImages: {
      "#FFFFFF": "https://signeedclub.com/wp-content/uploads/2025/06/hoodie-white-JHK421-dos.png",
      "#000000": "https://signeedclub.com/wp-content/uploads/2025/06/hoodie-black-JHK421-dos.png",
      "#FFD700": "https://signeedclub.com/wp-content/uploads/2025/06/hoodie-gold-JHK421-dos.png",
      "#808080": "https://signeedclub.com/wp-content/uploads/2025/06/hoodie-grey-JHK421-dos.png",
      "#4CBB17": "https://signeedclub.com/wp-content/uploads/2025/06/hoodie-kellygreen-JHK421-dos.png",
      "#000080": "https://signeedclub.com/wp-content/uploads/2025/06/hoodie-navy-JHK421-dos.png",
      "#FFA500": "https://signeedclub.com/wp-content/uploads/2025/06/hoodie-orange-JHK421-dos.png",
      "#800080": "https://signeedclub.com/wp-content/uploads/2025/06/hoodie-purple-JHK421-dos.png",
      "#FF0000": "https://signeedclub.com/wp-content/uploads/2025/06/hoodie-red-JHK421-dos.png",
      "#4169E1": "https://signeedclub.com/wp-content/uploads/2025/06/hoodie-royalblue-JHK421-dos.png",
      "#87CEEB": "https://signeedclub.com/wp-content/uploads/2025/06/hoodie-sky-JHK421-dos.png",
      "#800020": "https://signeedclub.com/wp-content/uploads/2025/06/hoodie-burgundy-JHK421-dos.png",
    },
  },
  hoodie_jhk422: {
    name: "Gilet capuche",
    price: 26,
    sizes: ["S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL", "7XL", "8XL", "9XL", "10XL"],
    slideImage: "https://signeedclub.com/wp-content/uploads/2025/06/slide-gilet.jpeg",
    images: {
      "#FFFFFF": "https://signeedclub.com/wp-content/uploads/2025/06/hoodie-white-JHK422.png",
      "#000000": "https://signeedclub.com/wp-content/uploads/2025/06/hoodie-black-JHK422.png",
      "#4CBB17": "https://signeedclub.com/wp-content/uploads/2025/06/hoodie-kellygreen-JHK422.png",
      "#C3B091": "https://signeedclub.com/wp-content/uploads/2025/06/hoodie-khaki-JHK422.png",
      "#FFDB58": "https://signeedclub.com/wp-content/uploads/2025/06/hoodie-mustard-JHK422.png",
      "#000080": "https://signeedclub.com/wp-content/uploads/2025/06/hoodie-navy-JHK422.png",
      "#4169E1": "https://signeedclub.com/wp-content/uploads/2025/06/hoodie-royalblue-JHK422.png",
      "#FF0000": "https://signeedclub.com/wp-content/uploads/2025/06/hoodie-red-JHK422.png",
    },
    backImages: {
      "#FFFFFF": "https://signeedclub.com/wp-content/uploads/2025/06/hoodie-white-JHK422-dos.png",
      "#000000": "https://signeedclub.com/wp-content/uploads/2025/06/hoodie-black-JHK422-dos.png",
      "#4CBB17": "https://signeedclub.com/wp-content/uploads/2025/06/hoodie-kellygreen-JHK422-dos.png",
      "#C3B091": "https://signeedclub.com/wp-content/uploads/2025/06/hoodie-khaki-JHK422-dos.png",
      "#FFDB58": "https://signeedclub.com/wp-content/uploads/2025/06/hoodie-mustard-JHK422-dos.png",
      "#000080": "https://signeedclub.com/wp-content/uploads/2025/06/hoodie-navy-JHK422-dos.png",
      "#4169E1": "https://signeedclub.com/wp-content/uploads/2025/06/hoodie-royalblue-JHK422-dos.png",
      "#FF0000": "https://signeedclub.com/wp-content/uploads/2025/06/hoodie-red-JHK422-dos.png",
    },
  },
  polo: {
    name: "Polo",
    price: 19,
    sizes: ["S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL", "7XL", "8XL", "9XL", "10XL"],
    slideImage: "https://signeedclub.com/wp-content/uploads/2025/06/slide-polo.jpeg",
    images: {
      "#FFFFFF": "https://signeedclub.com/wp-content/uploads/2025/06/polo-white-JHK510.png",
      "#000000": "https://signeedclub.com/wp-content/uploads/2025/06/polo-black-JHK510.png",
      "#185938": "https://signeedclub.com/wp-content/uploads/2025/06/polo-bottlegreen-JHK510.png",
      "#E4E4E4": "https://signeedclub.com/wp-content/uploads/2025/06/polo-ashmelange-JHK510.png",
      "#007FFF": "https://signeedclub.com/wp-content/uploads/2025/06/polo-azure-JHK510.png",
      "#800020": "https://signeedclub.com/wp-content/uploads/2025/06/polo-burgundy-JHK510.png",
      "#71717A": "https://signeedclub.com/wp-content/uploads/2025/06/polo-zinc-JHK510.png",
      "#40E0D0": "https://signeedclub.com/wp-content/uploads/2025/06/polo-turquoise-JHK510.png",
      "#87CEEB": "https://signeedclub.com/wp-content/uploads/2025/06/polo-sky-JHK510.png",
      "#C2B280": "https://signeedclub.com/wp-content/uploads/2025/06/polo-sand-JHK510.png",
      "#4169E1": "https://signeedclub.com/wp-content/uploads/2025/06/polo-royalblue-JHK510.png",
      "#FF0000": "https://signeedclub.com/wp-content/uploads/2025/06/polo-red-JHK510.png",
      "#800080": "https://signeedclub.com/wp-content/uploads/2025/06/polo-purple-JHK510.png",
      "#BFFF00": "https://signeedclub.com/wp-content/uploads/2025/06/polo-lime-JHK510.png",
      "#FFD700": "https://signeedclub.com/wp-content/uploads/2025/06/polo-gold-JHK510.png",
      "#FFC0CB": "https://signeedclub.com/wp-content/uploads/2025/06/polo-pink-JHK510.png",
      "#FFA500": "https://signeedclub.com/wp-content/uploads/2025/06/polo-orange-JHK510.png",
      "#000080": "https://signeedclub.com/wp-content/uploads/2025/06/polo-navy-JHK510.png",
      "#E6E6FA": "https://signeedclub.com/wp-content/uploads/2025/06/polo-lavender-JHK510.png",
      "#C3B091": "https://signeedclub.com/wp-content/uploads/2025/06/polo-khaki-JHK510.png",
      "#4CBB17": "https://signeedclub.com/wp-content/uploads/2025/06/polo-kellygreen-JHK510.png",
      "#A9A9A9": "https://signeedclub.com/wp-content/uploads/2025/06/polo-greymelange-JHK510.png",
      "#383838": "https://signeedclub.com/wp-content/uploads/2025/06/polo-graphite-JHK510.png",
      "#FF00FF": "https://signeedclub.com/wp-content/uploads/2025/06/polo-fuchsia-JHK510.png",
      "#D2691E": "https://signeedclub.com/wp-content/uploads/2025/06/polo-chocolate-JHK510.png",
    },
    backImages: {
      "#FFFFFF": "https://signeedclub.com/wp-content/uploads/2025/06/polo-white-JHK510-dos.png",
      "#000000": "https://signeedclub.com/wp-content/uploads/2025/06/polo-black-JHK510-dos.png",
      "#185938": "https://signeedclub.com/wp-content/uploads/2025/06/polo-bottlegreen-JHK510-dos.png",
      "#E4E4E4": "https://signeedclub.com/wp-content/uploads/2025/06/polo-ashmelange-JHK510-dos.png",
      "#007FFF": "https://signeedclub.com/wp-content/uploads/2025/06/polo-azure-JHK510-dos.png",
      "#800020": "https://signeedclub.com/wp-content/uploads/2025/06/polo-burgundy-JHK510-dos.png",
      "#71717A": "https://signeedclub.com/wp-content/uploads/2025/06/polo-zinc-JHK510-dos.png",
      "#40E0D0": "https://signeedclub.com/wp-content/uploads/2025/06/polo-turquoise-JHK510-dos.png",
      "#87CEEB": "https://signeedclub.com/wp-content/uploads/2025/06/polo-sky-JHK510-dos.png",
      "#C2B280": "https://signeedclub.com/wp-content/uploads/2025/06/polo-sand-JHK510-dos.png",
      "#4169E1": "https://signeedclub.com/wp-content/uploads/2025/06/polo-royalblue-JHK510-dos.png",
      "#FF0000": "https://signeedclub.com/wp-content/uploads/2025/06/polo-red-JHK510-dos.png",
      "#800080": "https://signeedclub.com/wp-content/uploads/2025/06/polo-purple-JHK510-dos.png",
      "#BFFF00": "https://signeedclub.com/wp-content/uploads/2025/06/polo-lime-JHK510-dos.png",
      "#FFD700": "https://signeedclub.com/wp-content/uploads/2025/06/polo-gold-JHK510-dos.png",
      "#FFC0CB": "https://signeedclub.com/wp-content/uploads/2025/06/polo-pink-JHK510-dos.png",
      "#FFA500": "https://signeedclub.com/wp-content/uploads/2025/06/polo-orange-JHK510-dos.png",
      "#000080": "https://signeedclub.com/wp-content/uploads/2025/06/polo-navy-JHK510-dos.png",
      "#E6E6FA": "https://signeedclub.com/wp-content/uploads/2025/06/polo-lavender-JHK510-dos.png",
      "#C3B091": "https://signeedclub.com/wp-content/uploads/2025/06/polo-khaki-JHK510-dos.png",
      "#4CBB17": "https://signeedclub.com/wp-content/uploads/2025/06/polo-kellygreen-JHK510-dos.png",
      "#A9A9A9": "https://signeedclub.com/wp-content/uploads/2025/06/polo-greymelange-JHK510-dos.png",
      "#383838": "https://signeedclub.com/wp-content/uploads/2025/06/polo-graphite-JHK510-dos.png",
      "#FF00FF": "https://signeedclub.com/wp-content/uploads/2025/06/polo-fuchsia-JHK510-dos.png",
      "#D2691E": "https://signeedclub.com/wp-content/uploads/2025/06/polo-chocolate-JHK510-dos.png",
    },
  },

};

export const POSE_IMAGES = {
  front: "https://signeedclub.com/wp-content/uploads/2025/06/hoodie-black-JHK421.png",
  back: "https://signeedclub.com/wp-content/uploads/2025/06/hoodie-black-JHK421-dos.png"
};

export const users: User[] = [
  { id: 'u2', username: 'Fashion Killa', avatarUrl: 'https://ui-avatars.com/api/?name=Fashion+Killa&background=random', email: 'fashion@example.com', wishlist: [], savedPostIds: [], credits: 0 },
];

const defaultTextState = {
  lines: [''], text: '', fontSize: 24, fontFamily: 'Inter', fontWeight: '700',
  textTransform: 'none' as const, color: '#ffffff', position: { x: 50, y: 50 },
  letterSpacing: 0
};

// ... (skipping unchanged parts if possible, but replace_file_content needs contiguous)
// To avoid large replaces, I'll target specific blocks. 
// I will split this into a multi_replace for safety and precision.


const mockCustomizationTshirt: CartItem = {
  id: 'mock1', productType: 'tshirt', color: '#000000', sizes: {},
  logoSizeFront: 100, logoPositionXFront: 50, logoPositionYFront: 30, originalLogoUrlFront: null, processedLogoUrlFront_original: null,
  textFront: { ...defaultTextState, text: "" },
  logoSizeBack: 100, logoPositionXBack: 50, logoPositionYBack: 30, originalLogoUrlBack: null, processedLogoUrlBack_original: null,
  textBack: defaultTextState,
  activeLogoColorFront: 'original', backgroundRemovedFront: false, logoInvertedFront: false,
  activeLogoColorBack: 'original', backgroundRemovedBack: false, logoInvertedBack: false,
  processedLogoUrlFront_white: null, processedLogoUrlFront_black: null, processedLogoUrlFront_noBackground: null,
  processedLogoUrlBack_white: null, processedLogoUrlBack_black: null, processedLogoUrlBack_noBackground: null,
  isPredefinedLogoFront: false, predefinedLogoUrlFront: null,
  isPredefinedLogoBack: false, predefinedLogoUrlBack: null,
  serviceRetouche: false, serviceModernisation: false,
  previewImageUrlFront: "https://signeedclub.com/wp-content/uploads/2025/06/tshirt-black-JHK170.png"
};

const mockCustomizationHoodie: CartItem = {
  id: 'mock2', productType: 'hoodie', color: '#EF4444', sizes: {},
  logoSizeFront: 100, logoPositionXFront: 50, logoPositionYFront: 30, originalLogoUrlFront: null, processedLogoUrlFront_original: null,
  textFront: { ...defaultTextState, text: "" },
  logoSizeBack: 100, logoPositionXBack: 50, logoPositionYBack: 30, originalLogoUrlBack: null, processedLogoUrlBack_original: null,
  textBack: defaultTextState,
  activeLogoColorFront: 'original', backgroundRemovedFront: false, logoInvertedFront: false,
  activeLogoColorBack: 'original', backgroundRemovedBack: false, logoInvertedBack: false,
  processedLogoUrlFront_white: null, processedLogoUrlFront_black: null, processedLogoUrlFront_noBackground: null,
  processedLogoUrlBack_white: null, processedLogoUrlBack_black: null, processedLogoUrlBack_noBackground: null,
  isPredefinedLogoFront: false, predefinedLogoUrlFront: null,
  isPredefinedLogoBack: false, predefinedLogoUrlBack: null,
  serviceRetouche: false, serviceModernisation: false,
  previewImageUrlFront: "https://signeedclub.com/wp-content/uploads/2025/06/hoodie-royalblue-JHK421.png"
};


export const mockPosts: Post[] = [];


export const mockPurchaseHistory: CartItem[] = [];

export const SPECIAL_CODES: Record<string, string> = {
  "MENTALIST25": "mentalist24",
  "BOURIKAS": "anthonybourikas",
  "IBIZAFBOSS": "ibizafboss",
  "KVR": "kvrbelgium",
  "BIZOUAUCHAT": "bizouauchat"
};

export const PREDEFINED_LOGOS: PredefinedLogo[] = [
  {
    name: 'mentalist24',
    url: 'https://signeedclub.com/logos/mentalistlogo25.png',
    code: 'MENTALIST25'
  },
  {
    name: 'anthonybourikas',
    url: 'https://signeedclub.com/logos/anthonybourikas.png',
    code: 'BOURIKAS'
  },
  {
    name: 'ibizafboss',
    url: 'https://signeedclub.com/logos/ibizafboss.png',
    code: 'IBIZAFBOSS'
  },
  {
    name: 'kvrbelgium',
    url: [
      'https://signeedclub.com/logos/kvrbelgium.png',
      'https://signeedclub.com/logos/musicismyreligion.png'
    ],
    code: 'KVR'
  },
  {
    name: 'bizouauchat',
    url: 'https://signeedclub.com/logos/logo4.png',
    code: 'BIZOUAUCHAT'
  }
];

// Coordinates: X% (0-100 from left), Y% (0-100 from top), scale (px width reference)
// Note: "Heart" (Left Chest) is visually on the RIGHT side of the shirt when facing it.
export const PLACEMENT_PRESETS: Record<string, Record<string, { x: number, y: number, scale: number }>> = {
  default: {
    heart: { x: 70, y: 30, scale: 70 },
    center: { x: 50, y: 40, scale: 150 }
  },
  tshirt: {
    heart: { x: 72, y: 28, scale: 70 },
    center: { x: 50, y: 40, scale: 180 }
  },
  tshirtfemme: {
    heart: { x: 70, y: 30, scale: 65 },
    center: { x: 50, y: 40, scale: 160 }
  },
  polo: {
    heart: { x: 72, y: 30, scale: 60 },
    center: { x: 50, y: 42, scale: 150 }
  },
  hoodie: {
    heart: { x: 70, y: 32, scale: 75 },
    center: { x: 50, y: 40, scale: 200 }
  },
  hoodie_jhk422: {
    heart: { x: 70, y: 32, scale: 75 },
    center: { x: 50, y: 40, scale: 200 }
  },

};

export type StyleCategory = "Trends" | "Réaliste" | "Art & Peinture" | "Pop & Graphique" | "Digital & Futuriste" | "Fun & Rétro" | "Custom";

export interface StylePreset {
  name: string;
  prompt: string;
  image: string;
  icon?: string; // Optional icon class
  glasses?: string | null; // Optional glasses prompt part
}

export const STYLE_MATRIX: Record<string, StylePreset[]> = {
  "Trends": [
    {
      name: "Hangover",
      prompt: "medium shot of a person with messy hair, wearing sunglasses holding two green beer bottles with both hands, at a chaotic house party morning after, messy room, bust and chest fully visible, candid vertical photography, detailed texture, 8k --ar 9:16",
      image: "/assets/ai_styles/hangover.jpg",
      icon: "fa-champagne-glasses",
      glasses: "wearing stylish party sunglasses"
    }
  ],
  "Réaliste": [
    {
      name: "Urban Daily",
      prompt: "urban street photography, natural sunlight, golden hour, city blurred background, candid, lifestyle",
      image: "/assets/ai_styles/street.webp",
      icon: "fa-building",
      glasses: "wearing stylish casual sunglasses"
    },
    {
      name: "Paparazzi",
      prompt: "direct flash photography, hard shadows, vignette, paparazzi style, night out",
      image: "/assets/ai_styles/paparazzi.webp",
      icon: "fa-camera-flash",
      glasses: "wearing oversized dark celebrity sunglasses to hide eyes"
    },
    {
      name: "Cinematic",
      prompt: "dramatic lighting, teal and orange, bokeh, movie scene, arri alexa",
      image: "/assets/ai_styles/cinematic.webp",
      icon: "fa-film",
      glasses: "wearing classic aviator sunglasses reflecting the scene"
    },
    {
      name: "Influence",
      prompt: "Medium shot portrait of a fashion influencer, golden hour photography, warm soft sunlight, bokeh sparkles overlay, dreamy aesthetic, trendy luxury cafe background, high key lighting, editorial fashion style, polished look, instagram filter aesthetic, soft focus background",
      image: "/assets/ai_styles/influence.webp",
      icon: "fa-hashtag",
      glasses: "wearing luxury designer cat-eye sunglasses"
    },
    {
      name: "Worker",
      prompt: "Medium shot portrait of a skilled manual worker , industrial workshop background, raw concrete and metal textures, cinematic warm lighting, honest and gritty aesthetic, craftsmanship vibe, tools in background (blurred), sharp focus, 8k, rugged look, authentic atmosphere",
      image: "/assets/ai_styles/worker.webp",
      icon: "fa-hammer",
      glasses: "wearing transparent protective safety goggles dust covered"
    },
  ],
  "Pop & Graphique": [
    {
      name: "Comics",
      prompt: "Portrait of a person , comic book style, bold lines, halftone dots, vibrant, marvel style illustration",
      image: "/assets/ai_styles/comic.webp",
      icon: "fa-mask",
      glasses: null
    },
    {
      name: "Pop Vinyle",
      prompt: "collectible vinyl figure style, funko pop style, big head, large head, small body, chibi proportions, black button eyes, cute, plastic texture, 3d render, studio lighting, toy packaging aesthetics",
      image: "/assets/ai_styles/pop_vinyl.webp",
      icon: "fa-child-reaching",
      glasses: null
    }
  ],
  "Digital & Futuriste": [
    {
      name: "Cyberpunk",
      prompt: "neon blue and pink lights, futuristic city background, glow effect, high tech",
      image: "/assets/ai_styles/cyberpunk.webp",
      icon: "fa-robot",
      glasses: "wearing futuristic glowing neon visor glasses"
    },
    {
      name: "Disney Pixar 3D",
      prompt: "Medium shot portrait of a cute charming character , Disney Pixar 3D animation style, big expressive eyes, soft rounded features, magical volumetric lighting, octane render, 4k, charming smile, dreamy blue and purple background, 3d render masterpiece",
      image: "/assets/ai_styles/pixar.webp",
      icon: "fa-cube",
      glasses: null
    },
    {
      name: "Deejay",
      prompt: "Medium shot portrait of a DJ , nightlife atmosphere, neon lighting (cyan and magenta), club background with crowd silhouettes, glitch art aesthetic, smoke machine fog, energetic vibe, dynamic angles, high contrast, digital art style, clean composition ( bras en l'air )",
      image: "/assets/ai_styles/deejay.webp",
      icon: "fa-headphones",
      glasses: "wearing cool tinted modern nightlife sunglasses"
    }

  ]
};

export const COLOR_NAMES: Record<string, string> = {
  "#000000": "Noir", "#FFFFFF": "Blanc", "#EF4444": "Rouge", "#F59E0B": "Jaune",
  "#FFA500": "Orange", "#4169E1": "Bleu Royal", "#800080": "Mauve", "#808080": "Gris",
  "#000080": "Marine", "#4CBB17": "Vert Kelly", "#C3B091": "Kaki", "#FFD700": "Or",
  "#FFB366": "Abricot", "#007FFF": "Bleu Ciel", "#355E3B": "Vert Bouteille",
  "#800020": "Bordeaux", "#8B0000": "Rouge Foncé", "#6495ED": "Bleu Diva",
  "#DC143C": "Rouge Feu", "#FF1493": "Fuchsia", "#228B22": "Vert Forêt",
  "#F0E68C": "Khaki Millennial", "#FADADD": "Rose Millennial", "#DA70D6": "Orchidée",
  "#93C572": "Pistache", "#663399": "Violet Radiant", "#30D5C8": "Turquoise Réel",
  "#C2B280": "Sable", "#FFFF00": "Jaune Solaire", "#40E0D0": "Turquoise",
  "#185938": "Vert Bouteille", "#E4E4E4": "Cendré", "#71717A": "Zinc",
  "#BFFF00": "Citron Vert", "#FFC0CB": "Rose", "#E6E6FA": "Lavande",
  "#A9A9A9": "Gris Chiné", "#383838": "Graphite", "#FF00FF": "Magenta",
  "#D2691E": "Chocolat", "#FFDB58": "Moutarde"
};