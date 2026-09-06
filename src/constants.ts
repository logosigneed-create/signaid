import { ProductDatabase, Post, User, CartItem, PredefinedLogo } from './types';

const DEFAULT_SIZE_CHART = {
  "XS": "67", "S": "69", "M": "71", "L": "74", "XL": "76",
  "XXL": "79", "2XL": "79", "3XL": "81", "4XL": "84", "5XL": "86",
  "6XL": "89", "7XL": "91", "8XL": "94", "9XL": "96", "10XL": "99"
};

export const productDatabase: ProductDatabase = {
  bctu05t: {
    name: "T-shirt Sport",
    price: 20,
    sizes: ["S", "M", "L", "XL", "XXL", "3XL"],
    slideImage: "/imported_products/VETEMENTS/BCTU05T_Sport-Grey-(Heather).jpg",
    supplierLink: "https://signeed.printwear.store/detail/1297900",
    reference: "BCTU05T",
    sizeChart: DEFAULT_SIZE_CHART,
    images: {
      "#A9A9A9": "/imported_products/VETEMENTS/BCTU05T_Sport-Grey-(Heather).jpg"
    },
    backImages: {
      "#A9A9A9": "/imported_products/VETEMENTS/BCTU05T_Sport-Grey-(Heather) vue dos .jpg"
    }
  },
  debardeur: {
    name: "Débardeur Vision Room",
    category: 'vêtement',
    price: 27.99,
    sizes: ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL"],
    slideImage: "/imported_products/VETEMENTS/debardeur/BYBB011/debardeur-black-BYBB011.png",
    supplierLink: "https://shop.l-shop-team.be/fr/Assortiment/T-shirts-fashion/sans-manches/Basic-Tank.html",
    reference: "BYBB011",
    sizeChart: DEFAULT_SIZE_CHART,
    images: {
      "#000000": "/assets/tank-black-BYBB011.png",
      "#FFFFFF": "/assets/tank-white-BYBB011.png"
    },
    backImages: {
      "#000000": "/assets/tank-black-BYBB011-dos.png",
      "#FFFFFF": "/assets/tank-white-BYBB011-dos.png"
    }
  },
  tshirt_oversize: {
    name: "T-Shirt Heavyweight Oversize",
    category: 'vêtement',
    price: 34.99,
    sizes: ["XS", "S", "M", "L", "XL", "XXL", "3XL"],
    slideImage: "/imported_products/VETEMENTS/tshirt/NX7200/tshirt-black-NX7200.png",
    supplierLink: "https://shop.l-shop-team.be/fr/Assortiment/T-shirts-fashion/col-rond/Unisex-Heavyweight-T-Shirt.html",
    reference: "NX7200",
    sizeChart: DEFAULT_SIZE_CHART,
    images: {
      "#000000": "/assets/tshirt-black-NX7200.png"
    },
    backImages: {
      "#000000": "/assets/tshirt-black-NX7200-dos.png"
    }
  },
  tshirt: {
    name: "T-shirt",
    price: 18,
    sizes: ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL", "7XL", "8XL", "9XL", "10XL"],
    slideImage: "/assets/tshirt-black-JHK170.png",
    supplierLink: "https://signeed.printwear.store/detail/1297900",
    reference: "JHK170",
    sizeChart: DEFAULT_SIZE_CHART,
    images: {
      "#000000": "/assets/tshirt-black-JHK170.png",
      "#FFFFFF": "/imported_products/VETEMENTS/tshirt/JHK170/hostinger_png/tshirt-white-JHK170.png",
      "#EF4444": "/imported_products/VETEMENTS/tshirt/JHK170/hostinger_png/tshirt-red-JHK170.png",
      "#FFA500": "/imported_products/VETEMENTS/tshirt/JHK170/hostinger_png/tshirt-orange-JHK170.png",
      "#4169E1": "/imported_products/VETEMENTS/tshirt/JHK170/hostinger_png/tshirt-royal-blue-JHK170.png",
      "#000080": "/imported_products/VETEMENTS/tshirt/JHK170/hostinger_png/tshirt-navy-JHK170.png",
      "#FFFF00": "/imported_products/VETEMENTS/tshirt/JHK170/hostinger_png/tshirt-yellow-JHK170.png",
    },
    backImages: {
      "#000000": "/assets/tshirt-black-JHK170-dos.png",
      "#FFFFFF": "/imported_products/VETEMENTS/tshirt/JHK170/hostinger_png/tshirt-white-JHK170-dos.png",
      "#EF4444": "/imported_products/VETEMENTS/tshirt/JHK170/hostinger_png/tshirt-red-JHK170-dos.png",
      "#FFA500": "/imported_products/VETEMENTS/tshirt/JHK170/hostinger_png/tshirt-orange-JHK170-dos.png",
      "#4169E1": "/imported_products/VETEMENTS/tshirt/JHK170/hostinger_png/tshirt-royal-blue-JHK170-dos.png",
      "#000080": "/imported_products/VETEMENTS/tshirt/JHK170/hostinger_png/tshirt-navy-JHK170-dos.png",
      "#FFFF00": "/imported_products/VETEMENTS/tshirt/JHK170/hostinger_png/tshirt-yellow-JHK170-dos.png",
    },
  },
  tshirtfemme: {
    name: "T-shirt femme",
    category: 'vêtement',
    price: 19,
    sizes: ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL", "7XL", "8XL", "9XL", "10XL"],
    slideImage: "/imported_products/VETEMENTS/tshirtfemme/bctw02t/studio-tshirtfemme-apricot-bctw02t.png",
    supplierLink: "https://signeed.printwear.store/detail/1144250",
    reference: "BCTW02T",
    sizeChart: {
      "XS": "62", "S": "64", "M": "66", "L": "68", "XL": "70", "XXL": "72",
      "3XL": "74", "4XL": "76", "5XL": "78", "6XL": "80"
    },
    images: {
      "#FFB366": "/imported_products/VETEMENTS/tshirtfemme/bctw02t/studio-tshirtfemme-apricot-bctw02t.png",
      "#007FFF": "/imported_products/VETEMENTS/tshirtfemme/bctw02t/studio-tshirtfemme-sky-blue-bctw02t.png",
      "#000000": "/imported_products/VETEMENTS/tshirtfemme/bctw02t/studio-tshirtfemme-black-bctw02t.png",
      "#355E3B": "/imported_products/VETEMENTS/tshirtfemme/bctw02t/studio-tshirtfemme-bottle-green-bctw02t.png",
      "#800020": "/imported_products/VETEMENTS/tshirtfemme/bctw02t/studio-tshirtfemme-burgundy-bctw02t-dos.png", // Fallback if no front? Wait, I saw burgundy-dos. I'll use it as front if front missing.
      "#8B0000": "/imported_products/VETEMENTS/tshirtfemme/bctw02t/studio-tshirtfemme-deep-red-bctw02t.png",
      "#6495ED": "/imported_products/VETEMENTS/tshirtfemme/bctw02t/studio-tshirtfemme-diva-blue-bctw02t.png",
      "#DC143C": "/imported_products/VETEMENTS/tshirtfemme/bctw02t/studio-tshirtfemme-fire-red-bctw02t.png",
      "#FF1493": "/imported_products/VETEMENTS/tshirtfemme/bctw02t/studio-tshirtfemme-fuchsia-bctw02t.png",
      "#228B22": "/imported_products/VETEMENTS/tshirtfemme/bctw02t/studio-tshirtfemme-kelly-green-bctw02t.png",
      "#F0E68C": "/imported_products/VETEMENTS/tshirtfemme/bctw02t/studio-tshirtfemme-millennial-khaki-bctw02t.png",
      "#FADADD": "/imported_products/VETEMENTS/tshirtfemme/bctw02t/studio-tshirtfemme-millennial-pink-bctw02t.png",
      "#FFA500": "/imported_products/VETEMENTS/tshirtfemme/bctw02t/studio-tshirtfemme-orange-bctw02t.png",
      "#DA70D6": "/imported_products/VETEMENTS/tshirtfemme/bctw02t/studio-tshirtfemme-orchid-green-bctw02t.png",
      "#93C572": "/imported_products/VETEMENTS/tshirtfemme/bctw02t/studio-tshirtfemme-pistachio-bctw02t.png",
      "#663399": "/imported_products/VETEMENTS/tshirtfemme/bctw02t/studio-tshirtfemme-radiant-purple-bctw02t.png",
      "#30D5C8": "/imported_products/VETEMENTS/tshirtfemme/bctw02t/studio-tshirtfemme-real-turquoise-bctw02t.png",
      "#FF0000": "/imported_products/VETEMENTS/tshirtfemme/bctw02t/studio-tshirtfemme-red-bctw02t.png",
      "#4169E1": "/imported_products/VETEMENTS/tshirtfemme/bctw02t/studio-tshirtfemme-royal-blue-bctw02t.png",
      "#C2B280": "/imported_products/VETEMENTS/tshirtfemme/bctw02t/studio-tshirtfemme-sand-bctw02t.png",
      "#87CEEB": "/imported_products/VETEMENTS/tshirtfemme/bctw02t/studio-tshirtfemme-sky-blue-bctw02t.png",
      "#FFFF00": "/imported_products/VETEMENTS/tshirtfemme/bctw02t/studio-tshirtfemme-solar-yellow-bctw02t.png",
      "#40E0D0": "/imported_products/VETEMENTS/tshirtfemme/bctw02t/studio-tshirtfemme-turquoise-bctw02t.png",
      "#C3B091": "/imported_products/VETEMENTS/tshirtfemme/bctw02t/tshirtfemme-urban-khaki-bctw02t.png",
      "#FFFFFF": "/imported_products/VETEMENTS/tshirtfemme/bctw02t/tshirtfemme-white-bctw02t.png",
    },
    backImages: {
      "#FFB366": "/imported_products/VETEMENTS/tshirtfemme/bctw02t/studio-tshirtfemme-apricot-bctw02t-dos.png",
      "#007FFF": "/imported_products/VETEMENTS/tshirtfemme/bctw02t/studio-tshirtfemme-sky-blue-bctw02t-dos.png",
      "#000000": "/imported_products/VETEMENTS/tshirtfemme/bctw02t/studio-tshirtfemme-black-bctw02t-dos.png",
      "#355E3B": "/imported_products/VETEMENTS/tshirtfemme/bctw02t/studio-tshirtfemme-bottle-green-bctw02t-dos.png",
      "#800020": "/imported_products/VETEMENTS/tshirtfemme/bctw02t/studio-tshirtfemme-burgundy-bctw02t-dos.png",
      "#8B0000": "/imported_products/VETEMENTS/tshirtfemme/bctw02t/studio-tshirtfemme-deep-red-bctw02t-dos.png",
      "#6495ED": "/imported_products/VETEMENTS/tshirtfemme/bctw02t/studio-tshirtfemme-diva-blue-bctw02t-dos.png",
      "#DC143C": "/imported_products/VETEMENTS/tshirtfemme/bctw02t/studio-tshirtfemme-fire-red-bctw02t-dos.png",
      "#FF1493": "/imported_products/VETEMENTS/tshirtfemme/bctw02t/studio-tshirtfemme-fuchsia-bctw02t-dos.png",
      "#228B22": "/imported_products/VETEMENTS/tshirtfemme/bctw02t/studio-tshirtfemme-kelly-green-bctw02t-dos_nobg.png",
      "#F0E68C": "/imported_products/VETEMENTS/tshirtfemme/bctw02t/studio-tshirtfemme-millennial-khaki-bctw02t-dos.png",
      "#FADADD": "/imported_products/VETEMENTS/tshirtfemme/bctw02t/studio-tshirtfemme-millennial-pink-bctw02t-dos.png",
      "#FFA500": "/imported_products/VETEMENTS/tshirtfemme/bctw02t/studio-tshirtfemme-orange-bctw02t-dos.png",
      "#DA70D6": "/imported_products/VETEMENTS/tshirtfemme/bctw02t/studio-tshirtfemme-orchid-green-bctw02t-dos.png",
      "#93C572": "/imported_products/VETEMENTS/tshirtfemme/bctw02t/studio-tshirtfemme-pistachio-bctw02t-dos.png",
      "#663399": "/imported_products/VETEMENTS/tshirtfemme/bctw02t/studio-tshirtfemme-radiant-purple-bctw02t-dos.png",
      "#30D5C8": "/imported_products/VETEMENTS/tshirtfemme/bctw02t/studio-tshirtfemme-real-turquoise-bctw02t-dos.png",
      "#FF0000": "/imported_products/VETEMENTS/tshirtfemme/bctw02t/studio-tshirtfemme-red-bctw02t-dos.png",
      "#4169E1": "/imported_products/VETEMENTS/tshirtfemme/bctw02t/studio-tshirtfemme-royal-blue-bctw02t-dos.png",
      "#C2B280": "/imported_products/VETEMENTS/tshirtfemme/bctw02t/studio-tshirtfemme-sand-bctw02t-dos.png",
      "#87CEEB": "/imported_products/VETEMENTS/tshirtfemme/bctw02t/studio-tshirtfemme-sky-blue-bctw02t-dos.png",
      "#FFFF00": "/imported_products/VETEMENTS/tshirtfemme/bctw02t/studio-tshirtfemme-solar-yellow-bctw02t-dos.png",
      "#40E0D0": "/imported_products/VETEMENTS/tshirtfemme/bctw02t/studio-tshirtfemme-turquoise-bctw02t-dos.png",
      "#C3B091": "/imported_products/VETEMENTS/tshirtfemme/bctw02t/tshirtfemme-urban-khaki-bctw02t-dos.png",
      "#FFFFFF": "/imported_products/VETEMENTS/tshirtfemme/bctw02t/tshirtfemme-white-bctw02-tdos.png",
    },
  },
  SW375: {
    name: "Sweatshirt",
    price: 25,
    sizes: ["S", "M", "L", "XL", "XXL", "3XL"],
    reference: "SW375",
    sizeChart: DEFAULT_SIZE_CHART,
    images: { "#000000": "/imported_products/VETEMENTS/SW375/SW375-black.png" },
    backImages: { "#000000": "/imported_products/VETEMENTS/SW375/SW375-black-dos.png" }
  },
  hoodie: {
    name: "Sweat capuche",
    price: 27,
    sizes: ["S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL", "7XL", "8XL", "9XL", "10XL"],
    slideImage: "/assets/hoodie-black-JHK421.png",
    supplierLink: "https://signeed.printwear.store/detail/638292",
    reference: "JHK421",
    sizeChart: DEFAULT_SIZE_CHART,
    images: {
      "#FFFFFF": "/imported_products/VETEMENTS/JHK421/hoodie-white-JHK421.png",
      "#000000": "/assets/hoodie-black-JHK421.png",
      "#4CBB17": "/imported_products/VETEMENTS/JHK421/hoodie-kellygreen-JHK421.png",
      "#4169E1": "/imported_products/VETEMENTS/JHK421/hoodie-royalblue-JHK421.png",
      "#87CEEB": "/imported_products/VETEMENTS/JHK421/hoodie-sky-JHK421.png",
      "#FF0000": "/imported_products/VETEMENTS/JHK421/hoodie-red-JHK421.png",
      "#FFA500": "/imported_products/VETEMENTS/JHK421/hoodie-orange-JHK421.png",
      "#FFD700": "/imported_products/VETEMENTS/JHK421/hoodie-gold-JHK421.png",
      "#800020": "/imported_products/VETEMENTS/JHK421/hoodie-burgundy-JHK421.png",
      "#800080": "/imported_products/VETEMENTS/JHK421/hoodie-purple-JHK421.png",
      "#808080": "/imported_products/VETEMENTS/JHK421/hoodie-grey-JHK421.png",
      "#000080": "/imported_products/VETEMENTS/JHK421/hoodie-navy-JHK421.png",
    },
    backImages: {
      "#FFFFFF": "/imported_products/VETEMENTS/JHK421/hoodie-white-JHK421-dos.png",
      "#000000": "/assets/hoodie-black-JHK421-dos.png",
      "#4CBB17": "/imported_products/VETEMENTS/JHK421/hoodie-kellygreen-JHK421-dos.jpg",
      "#4169E1": "/imported_products/VETEMENTS/JHK421/hoodie-royalblue-JHK421-dos.png",
      "#87CEEB": "/imported_products/VETEMENTS/JHK421/hoodie-sky-JHK421-dos.png",
      "#FF0000": "/imported_products/VETEMENTS/JHK421/hoodie-red-JHK421-dos.jpg",
      "#FFA500": "/imported_products/VETEMENTS/JHK421/hoodie-orange-JHK421-dos.jpg",
      "#FFD700": "/imported_products/VETEMENTS/JHK421/hoodie-gold-JHK421-dos.jpg",
      "#800020": "/imported_products/VETEMENTS/JHK421/hoodie-burgundy-JHK421-dos.jpg",
      "#800080": "/imported_products/VETEMENTS/JHK421/hoodie-purple-JHK421-dos.jpg",
      "#808080": "/imported_products/VETEMENTS/JHK421/hoodie-grey-JHK421-dos.jpg",
      "#000080": "/imported_products/VETEMENTS/JHK421/hoodie-navy-JHK421-dos.jpg",
    },
  },
  hoodie_jhk422: {
    name: "Gilet capuche",
    price: 28,
    sizes: ["S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL", "7XL", "8XL", "9XL", "10XL"],
    slideImage: "/imported_products/VETEMENTS/JHK422/gilet-black-JHK422.png",
    supplierLink: "https://signeed.printwear.store/detail/791111",
    reference: "JHK422",
    sizeChart: DEFAULT_SIZE_CHART,
    images: {
      "#FFFFFF": "/imported_products/VETEMENTS/JHK422/front/hoodie-white-JHK422.png",
      "#000000": "/imported_products/VETEMENTS/JHK422/front/hoodie-black-JHK422.png",
      "#4CBB17": "/imported_products/VETEMENTS/JHK422/front/hoodie-kellygreen-JHK422.png",
      "#C3B091": "/imported_products/VETEMENTS/JHK422/front/hoodie-khaki-JHK422.png",
      "#FFDB58": "/imported_products/VETEMENTS/JHK422/front/hoodie-mustard-JHK422.png",
      "#000080": "/imported_products/VETEMENTS/JHK422/front/hoodie-navy-JHK422.png",
      "#4169E1": "/imported_products/VETEMENTS/JHK422/front/hoodie-royalblue-JHK422.png",
      "#FF0000": "/imported_products/VETEMENTS/JHK422/front/hoodie-red-JHK422.png",
    },
    backImages: {
      "#FFFFFF": "/imported_products/VETEMENTS/JHK422/Back/hoodie-white-JHK422-dos.png",
      "#000000": "/imported_products/VETEMENTS/JHK422/Back/hoodie-black-JHK422-dos.png",
      "#4CBB17": "/imported_products/VETEMENTS/JHK422/Back/hoodie-kellygreen-JHK422-dos.png",
      "#C3B091": "/imported_products/VETEMENTS/JHK422/Back/hoodie-khaki-JHK422-dos.png",
      "#FFDB58": "/imported_products/VETEMENTS/JHK422/Back/hoodie-moustard-JHK422-dos.png",
      "#000080": "/imported_products/VETEMENTS/JHK422/Back/hoodie-navy-JHK422-dos.png",
      "#4169E1": "/imported_products/VETEMENTS/JHK422/Back/hoodie-royalblue-JHK422-dos.png",
      "#FF0000": "/imported_products/VETEMENTS/JHK422/Back/hoodie-red-JHK422-dos.png",
    },
  },
  hoodie_bcwg008: {
    name: "Sweat Capuche",
    price: 35,
    sizes: ["XS", "S", "M", "L", "XL", "XXL", "3XL"],
    slideImage: "/assets/products/black_edition/hoodie_bcwg008_black_front.png",
    supplierLink: "",
    reference: "BCWG008",
    sizeChart: { "XS": "68", "S": "70", "M": "72", "L": "74", "XL": "76", "XXL": "78", "3XL": "80" },
    images: {
      "#000000": "/imported_products/VETEMENTS/BCWG008/BCWG008 black.png"
    },
    backImages: {
      "#000000": "/imported_products/VETEMENTS/BCWG008/BCWG008 black dos.png"
    }
  },
  hoodie_bybb001: {
    name: "Sweat Organic",
    price: 45,
    sizes: ["XS", "S", "M", "L", "XL", "XXL", "3XL"],
    slideImage: "/assets/products/black_edition/hoodie_bybb001_black_front.png",
    supplierLink: "",
    reference: "BYBB001",
    sizeChart: { "XS": "68", "S": "70", "M": "72", "L": "74", "XL": "76", "XXL": "78", "3XL": "80" },
    images: {
      "#000000": "/assets/products/black_edition/hoodie_bybb001_black_front.png"
    },
    backImages: {
      "#000000": "/assets/products/black_edition/hoodie_bybb001_black_back.png"
    }
  },
  sweater_BCWG008: {
    name: "Sweater",
    price: 32,
    sizes: ["XS", "S", "M", "L", "XL", "XXL", "3XL"],
    slideImage: "/imported_products/VETEMENTS/BCWG008/BCWG008 black.png",
    supplierLink: "",
    reference: "BCWG008",
    sizeChart: { "XS": "68", "S": "70", "M": "72", "L": "74", "XL": "76", "XXL": "78", "3XL": "80" },
    images: {
      "#000000": "/imported_products/VETEMENTS/BCWG008/BCWG008 black.png"
    },
    backImages: {
      "#000000": "/imported_products/VETEMENTS/BCWG008/BCWG008 black dos.png"
    }
  },
  tshirt_140: {
    name: "T-shirt",
    price: 22,
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    slideImage: "/assets/products/black_edition/tshirt_s140_black_front.png",
    supplierLink: "",
    reference: "S140",
    sizeChart: { "XS": "66", "S": "68", "M": "70", "L": "72", "XL": "74", "XXL": "76" },
    images: {
      "#000000": "/imported_products/VETEMENTS/S140_Black-Opal.png"
    },
    backImages: {
      "#000000": "/imported_products/VETEMENTS/S140_Black-Opal dos.png"
    }
  },
  tshirt_p68: {
    name: "T-shirt",
    price: 24,
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    slideImage: "/assets/products/black_edition/tshirt_p68_black_front.png",
    supplierLink: "",
    reference: "P68",
    sizeChart: { "XS": "66", "S": "68", "M": "70", "L": "72", "XL": "74", "XXL": "76" },
    images: {
      "#000000": "/imported_products/VETEMENTS/Oversize/tshirt_oversize_100 T.png"
    },
    backImages: {
      "#000000": "/imported_products/VETEMENTS/Oversize/tshirt_oversize_100 T_dos.png"
    }
  },
  polo: {
    name: "Polo",
    price: 22,
    sizes: ["S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL", "7XL", "8XL", "9XL", "10XL"],
    slideImage: "/imported_products/VETEMENTS/Polo/JHK510/PNG/FRONT/polo-black-JHK510.png",
    supplierLink: "https://signeed.printwear.store/detail/637867",
    reference: "JHK510",
    sizeChart: DEFAULT_SIZE_CHART,
    images: {
      "#FFFFFF": "/imported_products/VETEMENTS/Polo/JHK510/PNG/FRONT/polo-white-JHK510.png",
      "#000000": "/imported_products/VETEMENTS/Polo/JHK510/PNG/FRONT/polo-black-JHK510.png",
      "#185938": "/imported_products/VETEMENTS/Polo/JHK510/PNG/FRONT/polo-bottlegreen-JHK510.png",
      "#E4E4E4": "/imported_products/VETEMENTS/Polo/JHK510/PNG/FRONT/polo-ashmelange-JHK510.png",
      "#007FFF": "/imported_products/VETEMENTS/Polo/JHK510/PNG/FRONT/polo-azure-JHK510.png",
      "#800020": "/imported_products/VETEMENTS/Polo/JHK510/PNG/FRONT/polo-burgundy-JHK510.png",
      "#71717A": "/imported_products/VETEMENTS/Polo/JHK510/PNG/FRONT/polo-zinc-JHK510.png",
      "#40E0D0": "/imported_products/VETEMENTS/Polo/JHK510/PNG/FRONT/polo-turquoise-JHK510.png",
      "#87CEEB": "/imported_products/VETEMENTS/Polo/JHK510/PNG/FRONT/polo-sky-JHK510.png",
      "#C2B280": "/imported_products/VETEMENTS/Polo/JHK510/PNG/FRONT/polo-sand-JHK510.png",
      "#4169E1": "/imported_products/VETEMENTS/Polo/JHK510/PNG/FRONT/polo-royalblue-JHK510.png",
      "#FF0000": "/imported_products/VETEMENTS/Polo/JHK510/PNG/FRONT/polo-red-JHK510.png",
      "#800080": "/imported_products/VETEMENTS/Polo/JHK510/PNG/FRONT/polo-purple-JHK510.png",
      "#BFFF00": "/imported_products/VETEMENTS/Polo/JHK510/PNG/FRONT/polo-lime-JHK510.png",
      "#FFD700": "/imported_products/VETEMENTS/Polo/JHK510/PNG/FRONT/polo-gold-JHK510.png",
      "#FFC0CB": "/imported_products/VETEMENTS/Polo/JHK510/PNG/FRONT/polo-pink-JHK510.png",
      "#FFA500": "/imported_products/VETEMENTS/Polo/JHK510/PNG/FRONT/polo-orange-JHK510.png",
      "#000080": "/imported_products/VETEMENTS/Polo/JHK510/PNG/FRONT/polo-navy-JHK510.png",
      "#E6E6FA": "/imported_products/VETEMENTS/Polo/JHK510/PNG/FRONT/polo-lavender-JHK510.png",
      "#C3B091": "/imported_products/VETEMENTS/Polo/JHK510/PNG/FRONT/polo-khaki-JHK510.png",
      "#4CBB17": "/imported_products/VETEMENTS/Polo/JHK510/PNG/FRONT/polo-kellygreen-JHK510.png",
      "#A9A9A9": "/imported_products/VETEMENTS/Polo/JHK510/PNG/FRONT/polo-greymelange-JHK510.png",
      "#383838": "/imported_products/VETEMENTS/Polo/JHK510/PNG/FRONT/polo-graphite-JHK510.png",
      "#FF00FF": "/imported_products/VETEMENTS/Polo/JHK510/PNG/FRONT/polo-fuchsia-JHK510.png",
      "#D2691E": "/imported_products/VETEMENTS/Polo/JHK510/PNG/FRONT/polo-chocolate-JHK510.png",
    },
    backImages: {
      "#FFFFFF": "/imported_products/VETEMENTS/Polo/JHK510/PNG/BACK/polo-white-JHK510-dos.png",
      "#000000": "/imported_products/VETEMENTS/Polo/JHK510/PNG/BACK/polo-black-JHK510-dos.png",
      "#185938": "/imported_products/VETEMENTS/Polo/JHK510/PNG/BACK/polo-bottlegreen-JHK510-dos.png",
      "#E4E4E4": "/imported_products/VETEMENTS/Polo/JHK510/PNG/BACK/polo-ashmelange-JHK510-dos.png",
      "#007FFF": "/imported_products/VETEMENTS/Polo/JHK510/PNG/BACK/polo-azure-JHK510-dos.png",
      "#800020": "/imported_products/VETEMENTS/Polo/JHK510/PNG/BACK/polo-burgundy-JHK510-dos.png",
      "#71717A": "/imported_products/VETEMENTS/Polo/JHK510/PNG/BACK/polo-zinc-JHK510-dos.png",
      "#40E0D0": "/imported_products/VETEMENTS/Polo/JHK510/PNG/BACK/polo-turquoise-JHK510-dos.png",
      "#87CEEB": "/imported_products/VETEMENTS/Polo/JHK510/PNG/BACK/polo-sky-JHK510-dos.png",
      "#C2B280": "/imported_products/VETEMENTS/Polo/JHK510/PNG/BACK/polo-sand-JHK510-dos.png",
      "#4169E1": "/imported_products/VETEMENTS/Polo/JHK510/PNG/BACK/polo-royalblue-JHK510-dos.png",
      "#FF0000": "/imported_products/VETEMENTS/Polo/JHK510/PNG/BACK/polo-red-JHK510-dos.png",
      "#800080": "/imported_products/VETEMENTS/Polo/JHK510/PNG/BACK/polo-purple-JHK510-dos.png",
      "#BFFF00": "/imported_products/VETEMENTS/Polo/JHK510/PNG/BACK/polo-lime-JHK510-dos.png",
      "#FFD700": "/imported_products/VETEMENTS/Polo/JHK510/PNG/BACK/polo-gold-JHK510-dos.png",
      "#FFC0CB": "/imported_products/VETEMENTS/Polo/JHK510/PNG/BACK/polo-pink-JHK510-dos.png",
      "#FFA500": "/imported_products/VETEMENTS/Polo/JHK510/PNG/BACK/polo-orange-JHK510-dos.png",
      "#000080": "/imported_products/VETEMENTS/Polo/JHK510/PNG/BACK/polo-navy-JHK510-dos.png",
      "#E6E6FA": "/imported_products/VETEMENTS/Polo/JHK510/PNG/BACK/polo-lavender-JHK510-dos.png",
      "#C3B091": "/imported_products/VETEMENTS/Polo/JHK510/PNG/BACK/polo-khaki-JHK510-dos.png",
      "#4CBB17": "/imported_products/VETEMENTS/Polo/JHK510/PNG/BACK/polo-kellygreen-JHK510-dos.png",
      "#A9A9A9": "/imported_products/VETEMENTS/Polo/JHK510/PNG/BACK/polo-greymelange-JHK510-dos.png",
      "#383838": "/imported_products/VETEMENTS/Polo/JHK510/PNG/BACK/polo-graphite-JHK510-dos.png",
      "#FF00FF": "/imported_products/VETEMENTS/Polo/JHK510/PNG/BACK/polo-fuchsia-JHK510-dos.png",
      "#D2691E": "/imported_products/VETEMENTS/Polo/JHK510/PNG/BACK/polo-chocolate-JHK510-dos.png",
    },
  },
  tshirt_ry6424: {
    name: "T-shirt Col V",
    price: 18,
    sizes: ["S", "M", "L", "XL", "XXL", "3XL"],
    slideImage: "/imported_products/VETEMENTS/tshirt-black-RY6424.png",
    supplierLink: "https://signeed.printwear.store/detail/1297900",
    reference: "RY6424",
    sizeChart: DEFAULT_SIZE_CHART,
    images: {
      "#000000": "/imported_products/VETEMENTS/tshirt-black-RY6424.png",
      "#A9A9A9": "/imported_products/VETEMENTS/tshirt-heather-grey-RY6424.png",
      "#4CBB17": "/imported_products/VETEMENTS/tshirt-kelly-green-RY6424.png",
      "#000080": "/imported_products/VETEMENTS/tshirt-navy-blue-RY6424.png",
      "#FFA500": "/imported_products/VETEMENTS/tshirt-orange-RY6424.png",
      "#EF4444": "/imported_products/VETEMENTS/tshirt-red-RY6424.png",
      "#FFC0CB": "/imported_products/VETEMENTS/tshirt-rosette-RY6424.png",
      "#4169E1": "/imported_products/VETEMENTS/tshirt-royal-blue-RY6424.png",
      "#40E0D0": "/imported_products/VETEMENTS/tshirt-turquoise-RY6424.png",
      "#FFFFFF": "/imported_products/VETEMENTS/tshirt-white-RY6424.png",
      "#F59E0B": "/imported_products/VETEMENTS/tshirt-yellow-RY6424.png",
    },
    backImages: {
      "#000000": "/imported_products/VETEMENTS/tshirt-black-RY6424-dos.png",
      "#A9A9A9": "/imported_products/VETEMENTS/tshirt-heather-grey-RY6424-dos.png",
      "#4CBB17": "/imported_products/VETEMENTS/tshirt-kelly-green-RY6424-dos.png",
      "#000080": "/imported_products/VETEMENTS/tshirt-navy-blue-RY6424-dos.png",
      "#FFA500": "/imported_products/VETEMENTS/tshirt-orange-RY6424-dos.png",
      "#EF4444": "/imported_products/VETEMENTS/tshirt-red-RY6424-dos.png",
      "#FFC0CB": "/imported_products/VETEMENTS/tshirt-rosette-RY6424-dos.png",
      "#4169E1": "/imported_products/VETEMENTS/tshirt-royal-blue-RY6424-dos.png",
      "#40E0D0": "/imported_products/VETEMENTS/tshirt-turquoise-RY6424-dos.png",
      "#FFFFFF": "/imported_products/VETEMENTS/tshirt-white-RY6424-dos.png",
      "#F59E0B": "/imported_products/VETEMENTS/tshirt-yellow-RY6424-dos.png",
    },
  },
  bcpui12: {
    name: "T-shirt Premium",
    price: 24,
    sizes: ["S", "M", "L", "XL", "XXL", "3XL"],
    slideImage: "/imported_products/VETEMENTS/BCPUI12_Heather-Grey.jpg",
    supplierLink: "https://signeed.printwear.store/detail/1297900",
    reference: "BCPUI12",
    sizeChart: DEFAULT_SIZE_CHART,
    images: {
      "#A9A9A9": "/imported_products/VETEMENTS/BCPUI12_Heather-Grey.jpg"
    },
    backImages: {
      "#A9A9A9": "/imported_products/VETEMENTS/BCPUI12_Heather-Grey-dos.jpg"
    }
  },

  kx167: {
    name: "Gilet de Sécurité",
    price: 15,
    sizes: ["S", "M", "L", "XL", "XXL", "3XL"],
    slideImage: "/imported_products/VETEMENTS/KX167/Gilet jaune fluo KX167 personnalisable.png",
    supplierLink: "https://signeed.printwear.store/detail/1297900",
    reference: "KX167",
    sizeChart: DEFAULT_SIZE_CHART,
    images: {
      "#FFFF00": "/imported_products/VETEMENTS/KX167/Gilet jaune fluo KX167 personnalisable.png"
    },
    backImages: {
      "#FFFF00": "/imported_products/VETEMENTS/KX167/Gilet jaune fluo KX167 personnalisable dos.png"
    }
  },
  rt230m: {
    name: "Polo Premium",
    price: 28,
    sizes: ["S", "M", "L", "XL", "XXL", "3XL"],
    slideImage: "/imported_products/VETEMENTS/RT230M/RT230M bleu.jpg",
    supplierLink: "https://signeed.printwear.store/detail/1297900",
    reference: "RT230M",
    sizeChart: DEFAULT_SIZE_CHART,
    aiDisabled: true,
    images: {
      "#4169E1": "/imported_products/VETEMENTS/RT230M/RT230M bleu.jpg"
    },
    backImages: {
      "#4169E1": "/imported_products/VETEMENTS/RT230M/RT230M bleu.jpg"
    }
  },
  catalogue: {
    name: "Catalogue",
    price: 0,
    sizes: [], // Handled externally
    slideImage: "/assets/polo-black-JHK510.png",
    images: {
      "#FFFFFF": "/assets/polo-black-JHK510.png"
    },
    backImages: {}
  }
};

export const POSE_IMAGES = {
  front: "/assets/hoodie-grey-JHK421.png",
  back: "/assets/hoodie-grey-JHK421-dos.png"
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
  logoSizeFront: 100, logoPositionXFront: 50, logoPositionYFront: 50, originalLogoUrlFront: null, processedLogoUrlFront_original: null,
  textFront: { ...defaultTextState, text: "" },
  logoSizeBack: 100, logoPositionXBack: 50, logoPositionYBack: 50, originalLogoUrlBack: null, processedLogoUrlBack_original: null,
  textBack: defaultTextState,
  activeLogoColorFront: 'original', backgroundRemovedFront: false, logoInvertedFront: false,
  activeLogoColorBack: 'original', backgroundRemovedBack: false, logoInvertedBack: false,
  processedLogoUrlFront_white: null, processedLogoUrlFront_black: null, processedLogoUrlFront_noBackground: null,
  processedLogoUrlBack_white: null, processedLogoUrlBack_black: null, processedLogoUrlBack_noBackground: null,
  isPredefinedLogoFront: false, predefinedLogoUrlFront: null,
  isPredefinedLogoBack: false, predefinedLogoUrlBack: null,
  serviceRetouche: false, serviceModernisation: false,
  previewImageUrlFront: "/assets/tshirt-grey-JHK170.png"
};

const mockCustomizationHoodie: CartItem = {
  id: 'mock2', productType: 'hoodie', color: '#EF4444', sizes: {},
  logoSizeFront: 100, logoPositionXFront: 50, logoPositionYFront: 50, originalLogoUrlFront: null, processedLogoUrlFront_original: null,
  textFront: { ...defaultTextState, text: "" },
  logoSizeBack: 100, logoPositionXBack: 50, logoPositionYBack: 50, originalLogoUrlBack: null, processedLogoUrlBack_original: null,
  textBack: defaultTextState,
  activeLogoColorFront: 'original', backgroundRemovedFront: false, logoInvertedFront: false,
  activeLogoColorBack: 'original', backgroundRemovedBack: false, logoInvertedBack: false,
  processedLogoUrlFront_white: null, processedLogoUrlFront_black: null, processedLogoUrlFront_noBackground: null,
  processedLogoUrlBack_white: null, processedLogoUrlBack_black: null, processedLogoUrlBack_noBackground: null,
  isPredefinedLogoFront: false, predefinedLogoUrlFront: null,
  isPredefinedLogoBack: false, predefinedLogoUrlBack: null,
  serviceRetouche: false, serviceModernisation: false,
  previewImageUrlFront: "/assets/hoodie-grey-JHK421.png"
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
    url: 'https://signaid.eu/logos/mentalistlogo25.png',
    code: 'MENTALIST25'
  },
  {
    name: 'anthonybourikas',
    url: 'https://signaid.eu/logos/anthonybourikas.png',
    code: 'BOURIKAS'
  },
  {
    name: 'ibizafboss',
    url: 'https://signaid.eu/logos/ibizafboss.png',
    code: 'IBIZAFBOSS'
  },
  {
    name: 'kvrbelgium',
    url: [
      'https://signaid.eu/logos/kvrbelgium.png',
      'https://signaid.eu/logos/musicismyreligion.png'
    ],
    code: 'KVR'
  },
  {
    name: 'bizouauchat',
    url: 'https://signaid.eu/logos/logo4.png',
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
    heart: { x: 72, y: 28, scale: 70 },
    center: { x: 50, y: 40, scale: 180 }
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
  hoodie_bcwg008: {
    heart: { x: 70, y: 32, scale: 75 },
    center: { x: 50, y: 40, scale: 200 }
  },
  hoodie_bybb001: {
    heart: { x: 70, y: 32, scale: 75 },
    center: { x: 50, y: 40, scale: 200 }
  },
  sweater_f310: {
    heart: { x: 70, y: 32, scale: 75 },
    center: { x: 50, y: 40, scale: 200 }
  },
  tshirt_s140: {
    heart: { x: 70, y: 30, scale: 70 },
    center: { x: 50, y: 40, scale: 170 }
  },
  tshirt_p68: {
    heart: { x: 70, y: 30, scale: 70 },
    center: { x: 50, y: 40, scale: 170 }
  },

};

export type StyleCategory = "Sans Filtre" | "Trends" | "Réaliste" | "Art & Peinture" | "Pop & Graphique" | "Digital & Futuriste" | "Fun & Rétro" | "Custom";

export interface StylePreset {
  name: string;
  prompt: string;
  image: string;
  icon?: string; // Optional icon class
  glasses?: string | null; // Optional glasses prompt part
}

export const STYLE_MATRIX: Record<string, StylePreset[]> = {
  "Sans Filtre": [
    {
      name: "Standard V-TON",
      prompt: "V-TON_DIRECT",
      image: "/assets/ai_styles/vton_direct.png",
      icon: "fa-shirt",
      glasses: "wearing stylish sunglasses"
    }
  ],
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
      prompt: "Single person in urban street photography, natural sunlight, golden hour, city blurred background, candid, lifestyle, strictly one person, portrait mode",
      image: "/assets/ai_styles/street.webp",
      icon: "fa-building",
      glasses: "wearing stylish casual sunglasses"
    },
    {
      name: "Paparazzi",
      prompt: "Single person in direct flash photography, hard shadows, vignette, paparazzi style, night out, strictly one person, portrait mode",
      image: "/assets/ai_styles/paparazzi.webp",
      icon: "fa-camera-flash",
      glasses: "wearing oversized dark celebrity sunglasses to hide eyes"
    },
    {
      name: "Cinematic",
      prompt: "Single person in dramatic lighting, teal and orange, bokeh, movie scene, arri alexa, strictly one person, portrait mode",
      image: "/assets/ai_styles/cinematic.webp",
      icon: "fa-film",
      glasses: "wearing classic aviator sunglasses reflecting the scene"
    },
    {
      name: "Influence",
      prompt: "Single fashion influencer portrait, golden hour photography, warm soft sunlight, bokeh sparkles overlay, dreamy aesthetic, trendy luxury cafe background, high key lighting, editorial fashion style, polished look, instagram filter aesthetic, soft focus background, strictly one person, portrait mode",
      image: "/assets/ai_styles/influence.webp",
      icon: "fa-hashtag",
      glasses: "wearing luxury designer cat-eye sunglasses"
    },
    {
      name: "Worker",
      prompt: "Single skilled manual worker portrait, industrial workshop background, raw concrete and metal textures, cinematic warm lighting, honest and gritty aesthetic, craftsmanship vibe, tools in background (blurred), sharp focus, 8k, rugged look, authentic atmosphere, strictly one person, portrait mode",
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
  ],
  "Fun & Rétro": [
    {
      name: "Anime Ghibli",
      prompt: "anime style, 2d flat illustration, cel shaded, vibrant colors, clean lines",
      image: "/assets/ai_styles/anime.jpg",
      icon: "fa-dragon",
      glasses: null
    },
    {
      name: "Cartoon 1930",
      prompt: "rubber hose animation, black and white, grainy film texture, cuphead style",
      image: "/assets/ai_styles/old_cartoon.jpg",
      icon: "fa-face-grin-wink",
      glasses: null
    },
    {
      name: "Pixel Art",
      prompt: "16-bit game sprite, dithering, limited color palette, retro gaming",
      image: "/assets/ai_styles/pixel_art.webp",
      icon: "fa-gamepad",
      glasses: null
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
