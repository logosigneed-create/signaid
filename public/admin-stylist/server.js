const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// Fichier CSS à modifier (Signaid V7)
const TARGET_CSS = path.join(__dirname, '../../src/index.css');

app.post('/update-style', (req, res) => {
    const { selector, updates, mode, breakpoint } = req.body;

    if (!selector || !updates) {
        return res.status(400).json({ error: 'Données manquantes' });
    }

    console.log(`Mise à jour pour ${selector} (Mode: ${mode || 'desktop'}):`, updates);

    try {
        let cssContent = fs.readFileSync(TARGET_CSS, 'utf8');

        // Construction de la chaîne de styles
        const stylesStr = Object.entries(updates)
            .map(([prop, val]) => {
                // Conversion camelCase vers kebab-case (ex: fontSize -> font-size)
                const kebabProp = prop.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
                return `    ${kebabProp}: ${val};`;
            })
            .join('\n');

        if (mode === 'mobile' && breakpoint) {
            // Pour le mode mobile, on génère une media query
            const mediaQueryStart = `@media (max-width: ${breakpoint}px)`;
            const mediaQueryRegex = new RegExp(`${mediaQueryStart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([\\s\\S]*?)\\n\\}`, 'g');

            const newRule = `${selector} {\n${stylesStr}\n    }`;

            if (cssContent.match(mediaQueryRegex)) {
                // Media query existe déjà, on ajoute ou met à jour la règle à l'intérieur
                cssContent = cssContent.replace(mediaQueryRegex, (match, inner) => {
                    const selectorRegex = new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{[^}]*\\}`, 'g');
                    if (inner.match(selectorRegex)) {
                        // Le sélecteur existe dans la media query, on le remplace
                        inner = inner.replace(selectorRegex, newRule);
                    } else {
                        // On ajoute la nouvelle règle
                        inner += `\n    ${newRule}`;
                    }
                    return `${mediaQueryStart} {${inner}\n}`;
                });
            } else {
                // Créer une nouvelle media query
                cssContent += `\n\n/* Styles Mobile */\n${mediaQueryStart} {\n    ${newRule}\n}`;
            }

            console.log('✅ Media query mobile générée/mise à jour');
        } else {
            // Mode desktop : mise à jour normale
            const selectorRegex = new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*{([^}]*)}`, 'g');

            if (cssContent.match(selectorRegex)) {
                cssContent = cssContent.replace(selectorRegex, `${selector} {\n${stylesStr}\n}`);
            } else {
                cssContent += `\n\n${selector} {\n${stylesStr}\n}`;
            }
        }

        fs.writeFileSync(TARGET_CSS, cssContent);

        const modeText = mode === 'mobile' ? 'mobile (via @media query)' : 'desktop';
        res.json({ message: `Code source mis à jour avec succès ! (Mode: ${modeText})` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur lors de l\'écriture du fichier' });
    }
});

// Servir les fichiers statiques pour la démo
app.use(express.static(__dirname));

app.listen(PORT, () => {
    console.log(`\n🎨 AdminStylist Companion Server`);
    console.log(`   ➜ Serveur: http://localhost:${PORT}`);
    console.log(`   ➜ Demo page ouvrez: http://localhost:${PORT}/index.html`);
    console.log(`\n   Les modifications en Desktop seront sauvées directement.`);
    console.log(`   Les modifications en Mobile généreront des @media queries.\n`);
});
