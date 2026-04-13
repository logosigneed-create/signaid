const { exec } = require('child_process');
const fs = require('fs');
const readline = require('readline');

// Extracts values from .env
function getEnvValue(key) {
    const content = fs.readFileSync('.env', 'utf-8');
    const lines = content.split('\n');
    for (const line of lines) {
        if (line.startsWith(key + '=')) {
            let val = line.substring((key + '=').length).trim();
            if (val.startsWith('"') && val.endsWith('"')) {
                val = val.substring(1, val.length - 1);
            }
            return val;
        }
    }
    return null;
}

const secrets = {
    'GEMINI_API_KEY': getEnvValue('VITE_GEMINI_API_KEY'),
    'REMOVE_BG_API_KEY': getEnvValue('VITE_REMOVE_BG_API_KEY'),
    'SMTP_PASS': getEnvValue('SMTP_PASS')
};

async function setSecrets() {
    for (const [key, value] of Object.entries(secrets)) {
        if (!value) {
            console.log(`Skipping ${key}, not found in .env`);
            continue;
        }

        console.log(`Setting ${key}...`);

        await new Promise((resolve) => {
            // Echo the value and pipe it to firebase functions:secrets:set
            // --project signaid-d2d08 ensures it targets the right DB
            const cmd = `echo ${value} | npx firebase functions:secrets:set ${key} --project signaid-d2d08`;

            exec(cmd, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error setting ${key}: ${error.message}`);
                } else if (stderr && stderr.includes('Error')) {
                    console.error(`Stderr setting ${key}: ${stderr}`);
                } else {
                    console.log(`Successfully set ${key}`);
                }
                resolve();
            });
        });
    }
    console.log("Done.");
}

setSecrets();
