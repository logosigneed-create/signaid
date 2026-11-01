const fs = require('fs');
const path = require('path');

const JSON_INPUT = path.join(__dirname, '..', 'facebook_prospects_invites.json');
const HTML_VIEWER = path.join(__dirname, '..', 'prospects_viewer.html');

const raw = fs.readFileSync(JSON_INPUT, 'utf-8');
const prospects = JSON.parse(raw);

/**
 * Calcul du Score de Pertinence Print on Demand & Gestion de Merchandising (0 à 100)
 */
function scoreProspect(p) {
  const text = `${p.name} ${p.sector} ${p.url}`.toLowerCase();
  
  let score = 50;
  let tier = 'Standard';
  let badge = 'Commerce & Standard';
  let pitch = 'Boutique en ligne & textiles personnalisés';
  let tagColor = '#94a3b8';

  // 1. Détection des cibles stars du Print on Demand (Fans, followers, communauté d'acheteurs)
  // DJs, Musique, Groupes, Labels, Raves, Festivals
  if (/(dj|records|recordings|music|musique|tribute|band|techno|hardcore|gabber|electro|sound|audio|label|clubbing|rave|dance|coverband|orchestra|chanteur|rap|beatmaker|festival|fest\b|disco\b|reunion\b|live\b|soundsystem)/i.test(text)) {
    score = 95;
    tier = 'POD_STAR';
    badge = '⭐ Cible Star Merch (Musique & Fans)';
    pitch = 'Portail Merch officiel pour tes fans : T-shirts, Hoodies, Casquettes sans gestion de stock ni avance.';
    tagColor = '#ec4899'; // Rose / Fuchsia
  }
  // Festivals, Événementiel, Soirées, Soirée, Concept festif
  else if (/(event|evenement|events|production|booking|afterwork|soiree|party|nightclub|night\b|carnaval|festival|expo\b)/i.test(text)) {
    score = 90;
    tier = 'POD_EVENT';
    badge = '🎉 Événement & Festival';
    pitch = 'Boutique officielle de l\'événement : vente de merch en ligne avant, pendant et après l\'événement.';
    tagColor = '#a855f7'; // Violet
  }
  // Sport, Combat, Boxe, Fitness, Gym, CrossFit, Danse, Clubs sportifs
  else if (/(boxing|boxe|crossfit|fitness|gym|sport|football|foot\b|handbal|judo|club\b|equipe|academy|danse|dance\b|running|padel|rally|motor|racing)/i.test(text)) {
    score = 88;
    tier = 'POD_SPORT';
    badge = '🥊 Club & Sport (Boutique Adhérents)';
    pitch = 'Boutique officielle pour le club : les membres et supporters commandent directement leurs sweats et maillots.';
    tagColor = '#3b82f6'; // Bleu
  }
  // Tatoueurs, Créateurs artistiques, Marques Streetwear, Culture alternative
  else if (/(tattoo|tatouage|ink\b|art\b|artist|creation|design|streetwear|clothing|store\b|shop\b|fan art)/i.test(text)) {
    score = 85;
    tier = 'POD_CREATOR';
    badge = '🎨 Artiste, Tatoueur & Marque';
    pitch = 'Lancement de ta propre ligne de vêtements : drops de t-shirts et hoodies en Print on Demand sans risque.';
    tagColor = '#f59e0b'; // Ambre
  }
  // BTP, Rénovation, Chantier, Toitures (Portail Entreprise B2B / Dotation vêtements de travail)
  else if (/(toiture|construct|renov|batiment|macon|terrassement|chassis|facade|plafond|menuiserie|bois|plomb|chauff|sanit|electr|clim|isolation|peinture|carrelage)/i.test(text)) {
    score = 78;
    tier = 'B2B_WORKWEAR';
    badge = '🏗️ Entreprise BTP (Portail Équipe)';
    pitch = 'Portail de gestion des vêtements de travail : réassort autonome de t-shirts, softshells et vestes pour vos ouvriers.';
    tagColor = '#f97316'; // Orange
  }
  // Automobile, Garages, Detailing, Carrosserie, Lavage auto
  else if (/(auto|garage|mecan|detailing|lavage|depannage|carrosserie|pneu|motors|wash)/i.test(text)) {
    score = 75;
    tier = 'B2B_AUTO';
    badge = '🚗 Automobile & Detailing';
    pitch = 'Portail d\'habillement pro & vêtements floqués pour votre atelier et vos clients passionnés.';
    tagColor = '#06b6d4'; // Cyan
  }
  // Horeca, Bars, Restos, Cafés, Friteries
  else if (/(resto|restaurant|snack|pizza|burger|traiteur|cafe|bar\b|bistrot|friterie|frituur|boucherie|food)/i.test(text)) {
    score = 65;
    tier = 'HORECA';
    badge = '🍽️ Horeca & Restauration';
    pitch = 'Tenues de service unifiées (tabliers, polos brodés) et merchandising de marque pour vos habitués.';
    tagColor = '#10b981'; // Vert
  }
  // Institutionnel, Médias, Villes (faible pertinence POD)
  else if (/(ville de|commune|hopital|hôpital|police|pompiers|sudinfo|rtbf|journal|television|tele|news|presse)/i.test(text)) {
    score = 25;
    tier = 'LOW_RELEVANCE';
    badge = '🏛️ Institutionnel / Médias';
    pitch = 'Organisation institutionnelle (peu adapté au POD agile).';
    tagColor = '#64748b'; // Gris
  }

  // Bonus/Malus spécifiques
  if (p.name.length < 3 || /meta|messagerie|statistiques/i.test(p.name)) {
    score = 10;
  }

  return { score, tier, badge, pitch, tagColor };
}

// Calculer le score pour chacun
const scored = prospects.map(p => {
  const s = scoreProspect(p);
  return {
    ...p,
    score: s.score,
    tier: s.tier,
    badge: s.badge,
    pitch: s.pitch,
    tagColor: s.tagColor
  };
});

// Trier par score décroissant (les meilleures cibles POD en premier !)
scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

// Stats de répartition
const distribution = {};
scored.forEach(p => {
  distribution[p.badge] = (distribution[p.badge] || 0) + 1;
});

console.log("📊 Répartition de la pertinence Print on Demand :");
console.table(distribution);

// Sauvegarder dans le JSON
fs.writeFileSync(JSON_INPUT, JSON.stringify(scored, null, 2), 'utf-8');
console.log("✅ JSON mis à jour avec scores de pertinence :", JSON_INPUT);
