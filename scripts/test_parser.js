const notifications = [
  {
    text: 'Marc Lemoine vous a invité à aimer la Page Toitures Express. il y a 2 jours',
    links: ['https://www.facebook.com/toituresexpress?notif_id=123', 'https://www.facebook.com/marc.lemoine']
  },
  {
    text: 'Jean Dupont vous a invité(e) à aimer Pizza Bella.',
    links: ['https://www.facebook.com/pizzabella?ref=notif']
  },
  {
    text: 'AFAD vous a invité à aimer sa Page.',
    links: ['https://www.facebook.com/afad/']
  },
  {
    text: 'Non lu\nDavid Martin vous a invité à aimer la page BTP Construct SPRL\nil y a 3 heures',
    links: ['https://www.facebook.com/btpconstruct/?notif_id=999', 'https://www.facebook.com/profile.php?id=10008888']
  }
];

function analyzeNotif(notif) {
  const cleanText = notif.text.replace(/\s+/g, ' ').trim();
  if (!/invit/i.test(cleanText) || !/aimer/i.test(cleanText)) return null;

  let inviterName = '';
  let pageName = '';

  const m1 = cleanText.match(/(?:Non lu\s+)?(.*?)\s+vous\s+a\s+invit[ée\(\)]*\s+[àa]\s+aimer\s+(?:la\s+[Pp]age\s+|une\s+[Pp]age\s*:\s*)?(.*?)(?:[\.·]|\s+il\s+y\s+a|\s*$)/i);
  if (m1) {
    inviterName = m1[1].trim();
    pageName = m1[2].trim().replace(/^["'«\s]+|["'»\.\,\s]+$/g, '');
  } else {
    const parts = cleanText.split(/invit[ée\(\)]*\s+[àa]\s+aimer/i);
    if (parts.length === 2) {
      inviterName = parts[0].replace(/Non lu/gi, '').trim();
      pageName = parts[1].replace(/(?:la\s+page|sa\s+page|une\s+page)/gi, '').split(/[\.·]|il y a/)[0].trim();
    }
  }

  let pageUrl = '';
  let inviterUrl = '';

  for (const l of notif.links) {
    const cleanL = l.split('?')[0].replace(/\/$/, '');
    if (/profile\.php\?id=|\/user\//.test(l)) {
      inviterUrl = l.split('&')[0];
    } else if (pageName && cleanL.toLowerCase().includes(pageName.toLowerCase().replace(/[^a-z0-9]/g, ''))) {
      pageUrl = cleanL;
    } else if (!pageUrl && !cleanL.includes('/messages/')) {
      pageUrl = cleanL;
    } else if (!inviterUrl && cleanL !== pageUrl) {
      inviterUrl = cleanL;
    }
  }

  if (!inviterUrl && inviterName) {
    inviterUrl = 'https://www.facebook.com/search/people/?q=' + encodeURIComponent(inviterName);
  }
  if (!pageUrl && pageName) {
    pageUrl = 'https://www.facebook.com/search/pages/?q=' + encodeURIComponent(pageName);
  }

  let messengerUrl = 'https://www.facebook.com/messages/';
  if (inviterUrl && !inviterUrl.includes('/search/')) {
    const username = inviterUrl.split('facebook.com/')[1]?.replace(/\/$/, '');
    if (username) {
      messengerUrl = 'https://www.facebook.com/messages/t/' + username;
    }
  }

  return {
    pageName: pageName || 'Page Prospect',
    pageUrl,
    inviterName: inviterName || 'Contact Facebook',
    inviterUrl,
    messengerUrl
  };
}

notifications.forEach(n => console.log(analyzeNotif(n)));
