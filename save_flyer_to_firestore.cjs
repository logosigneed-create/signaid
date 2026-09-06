const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

const flyerData = {
  theme: {
    zoneColor: 'rgba(255, 79, 129, 0.25)',
    zoneBorderColor: 'rgba(255, 79, 129, 0.8)',
    zoneHoverColor: 'rgba(255, 79, 129, 0.4)',
    zoneLabelColor: '#ffffff',
    zoneLabelBg: 'rgba(255, 79, 129, 0.85)',
    backgroundColor: '#0f0f1a'
  },
  globalLink: 'https://signaid.eu/inthedark',
  pages: {
    recto: {
      image: 'recto.png',
      hotspots: [
        {
          id: '1',
          label: 'In the dark — Ajouter au calendrier Google',
          url: 'https://www.google.com/calendar/render?action=TEMPLATE&text=In%20the%20dark&dates=20250418T200000Z/20250418T210000Z',
          x: 16.67,
          y: 86.43,
          w: 66.05,
          h: 9.96
        }
      ]
    },
    verso: {
      image: 'verso.png',
      hotspots: [
        {
          id: '3',
          label: "L'aquarelle - Liège (Itinéraire Google Maps)",
          url: "https://www.google.com/maps/place/L'aquarelle+-+Li%C3%A8ge/@50.6412499,5.5688972,3a,75y,86.93h,90t/data=!3m7!1e1!3m5!1sh9aRG0XuOWtJzSyeyKmeFA!2e0!6shttps:%2F%2Fstreetviewpixels-pa.googleapis.com%2Fv1%2Fthumbnail%3Fcb_client%3Dmaps_sv.tactile%26w%3D900%26h%3D600%26pitch%3D0%26panoid%3Dh9aRG0XuOWtJzSyeyKmeFA%26yaw%3D86.93!7i16384!8i8192!4m16!1m8!3m7!1s0x47c0fba1fa81d24d:0xba76abaeb0cca32a!2sL'aquarelle+-+Li%C3%A8ge!8m2!3d50.6412595!4d5.5691071!10e5!16s%2Fg%2F11tgdlg2_1!3m6!1s0x47c0fba1fa81d24d:0xba76abaeb0cca32a!8m2!3d50.6412595!4d5.5691071!10e5!16s%2Fg%2F11tgdlg2_1?entry=ttu&g_ep=EgoyMDI2MDIxNi4wIKXMDSoASAFQAw%3D%3D",
          x: 12.05,
          y: 3.09,
          w: 76.44,
          h: 10.29
        },
        {
          id: '4',
          label: 'Mégane Brescich (@meganebrescich_techno)',
          url: 'https://www.instagram.com/meganebrescich_techno/',
          x: 4.43,
          y: 33.66,
          w: 87.99,
          h: 11.11
        },
        {
          id: '5',
          label: 'Vadou DJ (Instagram)',
          url: 'https://www.instagram.com/vadou_dj',
          x: 8.59,
          y: 47.51,
          w: 20.55,
          h: 6.04
        },
        {
          id: '6',
          label: 'Whysee 777 (Instagram)',
          url: 'https://www.instagram.com/whysee_777',
          x: 33.07,
          y: 48.13,
          w: 21.94,
          h: 4.41
        },
        {
          id: '7',
          label: 'Passshok (Instagram)',
          url: 'https://www.instagram.com/passshok1',
          x: 59.16,
          y: 48.26,
          w: 27.71,
          h: 4.57
        },
        {
          id: '8',
          label: 'Meven 909 (Instagram)',
          url: 'https://www.instagram.com/meven_909/',
          x: 38.84,
          y: 59.34,
          w: 19.4,
          h: 4.25
        }
      ]
    }
  }
};

async function saveAll() {
  const configs = [
    { name: 'signaid-prod', apiKey: 'AIzaSyDTSKpVei8lCANIQJBZmuKcsjEDIubnvcs', authDomain: 'signaid-prod.firebaseapp.com', projectId: 'signaid-prod' },
    { name: 'signaid-d2d08', apiKey: 'AIzaSyCSBJf55JkrUtB844YXKlGypj2TkRDwUIY', authDomain: 'signaid-d2d08.firebaseapp.com', projectId: 'signaid-d2d08' }
  ];
  for (const cfg of configs) {
    try {
      const a = initializeApp(cfg, cfg.name);
      const db = getFirestore(a);
      await setDoc(doc(db, 'settings', 'flyer'), flyerData);
      console.log('✅ Successfully saved In The Dark flyer data to', cfg.name, 'Firestore (settings/flyer)');
    } catch(err) {
      console.error('❌ Error saving to', cfg.name, err.message);
    }
  }
}
saveAll();
