import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Footer from './landing/Footer';

const LegalPage: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
    return (
        <div className="min-h-screen flex flex-col bg-white text-zinc-900 font-sans">
            <header className="bg-zinc-900 text-white py-16 px-6">
                <div className="max-w-4xl mx-auto">
                    <Link to="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 text-sm">
                        <ArrowLeft size={16} /> Retour à l'accueil
                    </Link>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight">{title}</h1>
                    <p className="text-gray-400 mt-3">Dernière mise à jour : 27 février 2026</p>
                </div>
            </header>
            <main className="flex-grow py-16 px-6">
                <div className="max-w-4xl mx-auto prose prose-zinc prose-lg prose-headings:font-bold prose-headings:tracking-tight prose-a:text-orange-600">
                    {children}
                </div>
            </main>
            <Footer />
        </div>
    );
};

/* ─────────────────── CONDITIONS GÉNÉRALES ─────────────────── */
export const ConditionsGenerales: React.FC = () => (
    <LegalPage title="Conditions Générales d'Utilisation et de Vente">
        <h2>1. Identification de l'entreprise</h2>
        <p>
            <strong>Logo Signeed — Didier Nicolas</strong><br />
            Rue Sinton 27, Fosses-la-Ville, Belgique<br />
            N° d'entreprise : BE0786.527.864<br />
            E-mail : <a href="mailto:contact@signaid.eu">contact@signaid.eu</a>
        </p>

        <h2>2. Objet</h2>
        <p>Les présentes Conditions Générales d'Utilisation et de Vente (CGU/CGV) régissent l'utilisation de la plateforme SIGNAID, accessible à l'adresse <a href="https://signaid.eu" target="_blank" rel="noopener noreferrer">signaid.eu</a>, ainsi que la vente de produits personnalisés proposés par Logo Signeed.</p>

        <h2>3. Acceptation des conditions</h2>
        <p>L'accès et l'utilisation de la plateforme impliquent l'acceptation pleine et entière des présentes CGU/CGV. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser nos services.</p>

        <h2>4. Services proposés</h2>
        <p>SIGNAID propose un studio de création en ligne permettant de personnaliser des produits textiles et d'impression. Les services incluent :</p>
        <ul>
            <li>La personnalisation de produits via un éditeur en ligne (textes, logos, images)</li>
            <li>La génération d'images assistée par intelligence artificielle (essayage virtuel)</li>
            <li>La commande et la livraison de produits personnalisés</li>
            <li>Le partage de créations via une galerie communautaire</li>
        </ul>

        <h2>5. Compte utilisateur</h2>
        <p>L'utilisation de certaines fonctionnalités (panier, commandes, galerie) nécessite la création d'un compte via Google ou e-mail. L'utilisateur s'engage à fournir des informations exactes et à maintenir la confidentialité de ses identifiants de connexion. Logo Signeed se réserve le droit de suspendre tout compte en cas d'utilisation frauduleuse.</p>

        <h2>6. Prix et paiement</h2>
        <p>Les prix sont indiqués en euros (€), toutes taxes comprises (TTC). Le paiement s'effectue en ligne via la plateforme sécurisée <strong>Mollie</strong>, qui accepte les cartes bancaires (Visa, Mastercard) et d'autres moyens de paiement locaux. La commande est confirmée après réception du paiement complet.</p>

        <h2>7. Livraison</h2>
        <p>Les produits sont livrés dans un délai de <strong>3 à 5 jours ouvrables</strong> après confirmation de la commande. Les délais peuvent varier en fonction de la complexité de la personnalisation et du lieu de livraison. Logo Signeed ne saurait être tenu responsable des retards imputables au transporteur.</p>

        <h2>8. Droit de rétractation et retours</h2>
        <p>Conformément à la législation belge sur les achats en ligne, vous disposez d'un droit de rétractation. Toutefois, les produits personnalisés sur mesure étant confectionnés selon vos spécifications, le droit de rétractation ne s'applique pas sauf en cas de défaut de fabrication ou d'erreur de notre part.</p>
        <p>En cas de produit défectueux ou non conforme, vous disposez de <strong>48 heures</strong> après réception pour nous signaler le problème à <a href="mailto:contact@signaid.eu">contact@signaid.eu</a> avec photos à l'appui. Après vérification, un échange ou un remboursement sera proposé.</p>

        <h2>9. Propriété intellectuelle</h2>
        <p>L'ensemble du contenu de la plateforme (textes, images, logos, logiciels, algorithmes) est la propriété de Logo Signeed et est protégé par le droit de la propriété intellectuelle. L'utilisateur conserve les droits sur ses créations originales téléchargées sur la plateforme.</p>
        <p>L'utilisateur garantit qu'il dispose des droits nécessaires sur tout contenu (logo, image, texte) qu'il télécharge pour personnalisation. Logo Signeed décline toute responsabilité en cas de violation de droits de tiers par l'utilisateur.</p>

        <h2>10. Responsabilité</h2>
        <p>Logo Signeed s'efforce d'assurer la disponibilité et le bon fonctionnement de la plateforme mais ne saurait être tenu responsable des interruptions temporaires de service, des erreurs techniques ou des pertes de données.</p>

        <h2>11. Droit applicable et litiges</h2>
        <p>Les présentes CGU/CGV sont soumises au droit belge. En cas de litige, les parties s'engagent à rechercher une solution amiable. À défaut, les tribunaux de l'arrondissement judiciaire de Namur seront compétents.</p>

        <h2>12. Contact</h2>
        <p>Pour toute question relative aux présentes CGU/CGV :<br />
            <strong>Logo Signeed — Didier Nicolas</strong><br />
            E-mail : <a href="mailto:contact@signaid.eu">contact@signaid.eu</a><br />
            Adresse : Rue Sinton 27, Fosses-la-Ville, Belgique</p>
    </LegalPage>
);

/* ─────────────────── CONFIDENTIALITÉ ─────────────────── */
export const Confidentialite: React.FC = () => (
    <LegalPage title="Politique de Confidentialité">
        <h2>1. Responsable du traitement</h2>
        <p>
            <strong>Logo Signeed — Didier Nicolas</strong><br />
            Rue Sinton 27, Fosses-la-Ville, Belgique<br />
            N° d'entreprise : BE0786.527.864<br />
            E-mail : <a href="mailto:contact@signaid.eu">contact@signaid.eu</a>
        </p>

        <h2>2. Données collectées</h2>
        <p>Dans le cadre de l'utilisation de la plateforme SIGNAID, nous collectons les données suivantes :</p>
        <ul>
            <li><strong>Données d'identification :</strong> nom, prénom, adresse e-mail (via inscription Google ou e-mail)</li>
            <li><strong>Données de commande :</strong> adresse de livraison, numéro de téléphone, historique de commandes</li>
            <li><strong>Contenus téléchargés :</strong> photos, logos et designs envoyés pour la personnalisation de produits</li>
            <li><strong>Données de navigation :</strong> adresse IP, type de navigateur, pages visitées (via Firebase Analytics — anonymisé)</li>
        </ul>

        <h2>3. Finalités du traitement</h2>
        <p>Vos données sont utilisées pour :</p>
        <ul>
            <li>Créer et gérer votre compte utilisateur</li>
            <li>Traiter et suivre vos commandes de produits personnalisés</li>
            <li>Vous envoyer des confirmations de commande et de devis par e-mail</li>
            <li>Améliorer nos services et l'expérience utilisateur (analyses anonymisées)</li>
            <li>Répondre à vos demandes via le formulaire de contact</li>
        </ul>

        <h2>4. Base légale</h2>
        <p>Le traitement de vos données repose sur :</p>
        <ul>
            <li>L'exécution du contrat (traitement des commandes)</li>
            <li>Votre consentement (création de compte, cookies analytiques)</li>
            <li>L'intérêt légitime (amélioration du service, sécurité)</li>
        </ul>

        <h2>5. Partage des données</h2>
        <p>Vos données personnelles ne sont <strong>jamais vendues</strong> à des tiers. Elles peuvent être partagées avec :</p>
        <ul>
            <li><strong>Mollie</strong> : prestataire de paiement sécurisé (traitement des transactions)</li>
            <li><strong>Google Firebase / Google Cloud</strong> : hébergement et infrastructure technique</li>
            <li><strong>Transporteurs</strong> : pour la livraison de vos commandes</li>
        </ul>

        <h2>6. Durée de conservation</h2>
        <p>Vos données personnelles sont conservées pendant toute la durée de votre inscription. En cas de suppression de compte, vos données sont effacées dans un délai de 30 jours, à l'exception des données comptables conservées conformément aux obligations légales (7 ans).</p>

        <h2>7. Vos droits (RGPD)</h2>
        <p>Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des droits suivants :</p>
        <ul>
            <li><strong>Droit d'accès :</strong> obtenir une copie de vos données personnelles</li>
            <li><strong>Droit de rectification :</strong> corriger vos données inexactes ou incomplètes</li>
            <li><strong>Droit à l'effacement :</strong> demander la suppression de vos données</li>
            <li><strong>Droit à la portabilité :</strong> recevoir vos données dans un format structuré</li>
            <li><strong>Droit d'opposition :</strong> vous opposer au traitement de vos données</li>
        </ul>
        <p>Pour exercer ces droits, contactez-nous à <a href="mailto:contact@signaid.eu">contact@signaid.eu</a>. Nous répondrons dans un délai de 30 jours.</p>

        <h2>8. Sécurité</h2>
        <p>Nous prenons des mesures techniques et organisationnelles pour protéger vos données : chiffrement des connexions (HTTPS/SSL), authentification sécurisée via Firebase Auth, accès restreint aux bases de données, et stockage sécurisé sur Google Cloud.</p>

        <h2>9. Autorité de contrôle</h2>
        <p>Si vous estimez que le traitement de vos données n'est pas conforme, vous avez le droit d'introduire une réclamation auprès de :<br />
            <strong>Autorité de Protection des Données (APD)</strong><br />
            Rue de la Presse 35, 1000 Bruxelles<br />
            <a href="https://www.autoriteprotectiondonnees.be" target="_blank" rel="noopener noreferrer">www.autoriteprotectiondonnees.be</a></p>
    </LegalPage>
);

/* ─────────────────── COOKIES ─────────────────── */
export const CookiesPage: React.FC = () => (
    <LegalPage title="Politique de Cookies">
        <h2>1. Qu'est-ce qu'un cookie ?</h2>
        <p>Un cookie est un petit fichier texte stocké sur votre appareil (ordinateur, smartphone, tablette) lors de votre visite sur notre site. Il permet de mémoriser vos préférences, votre session de connexion et d'améliorer votre expérience de navigation.</p>

        <h2>2. Cookies utilisés</h2>

        <h3>🔒 Cookies strictement nécessaires</h3>
        <p>Ces cookies sont indispensables au fonctionnement de la plateforme. Ils ne peuvent pas être désactivés.</p>
        <ul>
            <li><strong>Session Firebase Auth :</strong> maintient votre connexion active</li>
            <li><strong>Panier :</strong> sauvegarde temporaire de vos articles en cours de commande</li>
            <li><strong>Préférences d'affichage :</strong> thème, langue, dernière vue visitée</li>
        </ul>

        <h3>📊 Cookies analytiques</h3>
        <p>Nous utilisons <strong>Firebase Analytics</strong> (Google) pour comprendre comment les visiteurs utilisent notre site. Ces données sont <strong>anonymisées</strong> et nous aident à améliorer nos services.</p>
        <ul>
            <li>Pages visitées et durée de navigation</li>
            <li>Type d'appareil, système d'exploitation et navigateur</li>
            <li>Source de la visite (lien direct, recherche, réseaux sociaux)</li>
        </ul>

        <h3>💳 Cookies de paiement</h3>
        <p>Le prestataire de paiement <strong>Mollie</strong> utilise des cookies pour sécuriser le processus de paiement et prévenir la fraude. Ces cookies sont gérés directement par Mollie.</p>

        <h2>3. Durée de conservation</h2>
        <ul>
            <li><strong>Cookies de session :</strong> supprimés à la fermeture du navigateur</li>
            <li><strong>Cookies persistants :</strong> conservés jusqu'à 12 mois maximum</li>
            <li><strong>Cookies analytiques :</strong> conservés 14 mois (politique Google)</li>
        </ul>

        <h2>4. Gestion des cookies</h2>
        <p>Vous pouvez gérer vos préférences de cookies via les paramètres de votre navigateur :</p>
        <ul>
            <li><strong>Chrome :</strong> Paramètres → Confidentialité et sécurité → Cookies</li>
            <li><strong>Firefox :</strong> Options → Vie privée et sécurité → Cookies</li>
            <li><strong>Safari :</strong> Préférences → Confidentialité → Cookies</li>
            <li><strong>Edge :</strong> Paramètres → Cookies et autorisations de sites</li>
        </ul>
        <p>⚠️ La désactivation de certains cookies peut affecter le fonctionnement du site (connexion, panier, paiement).</p>

        <h2>5. Contact</h2>
        <p>Pour toute question concernant notre utilisation des cookies :<br />
            <strong>Logo Signeed — Didier Nicolas</strong><br />
            E-mail : <a href="mailto:contact@signaid.eu">contact@signaid.eu</a></p>
    </LegalPage>
);
