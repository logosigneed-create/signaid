import asyncio
import os
import json
import csv
import re
from playwright.async_api import async_playwright

OUTPUT_JSON = os.path.join(os.path.dirname(__file__), '..', 'facebook_prospects_invites.json')
OUTPUT_CSV = os.path.join(os.path.dirname(__file__), '..', 'prospect_links_facebook.csv')
MASTER_CSV = os.path.join(os.path.dirname(__file__), '..', 'prospect_links.csv')

def detect_textile_needs(name, category=""):
    text = f"{name} {category}".lower()
    if re.search(r"(toiture|couverture|zinguerie|charpente|ardois)", text):
        return ("Toitures & Rénovation", "Hoodies chauds, T-shirts de chantier, Polos")
    if re.search(r"(construct|macon|renov|batiment|chassis|facade|terrassement|demolition)", text):
        return ("BTP & Construction Générale", "T-shirts haute résistance, Polos pro, Softshells brodés")
    if re.search(r"(plomb|chauff|sanit|electr|clim|chauffage)", text):
        return ("Électricité & Sanitaire / Chauffage", "Polos floqués, Vestes de travail, Sweatshirts")
    if re.search(r"(peint|decor|carrel|parquet|menuiserie|bois)", text):
        return ("Finitions & Menuiserie", "T-shirts 100% coton logo poitrine + dos, Tabliers")
    if re.search(r"(jardin|paysag|espace vert|piscine|elag)", text):
        return ("Parcs & Jardins / Paysagiste", "T-shirts respirants, Polos verts/noirs, Casquettes brodées")
    if re.search(r"(auto|carrosserie|garage|mecan|detailing|lavage|depannage)", text):
        return ("Automobile & Detailing", "T-shirts noirs anti-tâches, Polos, Casquettes")
    if re.search(r"(restaurant|resto|snack|brasserie|bistrot|pizza|burger|traiteur|bar|cafe)", text):
        return ("Horeca & Restauration", "Polos service brodés, Tabliers de cuisine, T-shirts équipe")
    if re.search(r"(coiff|barber|barbier|esthet|beaute|ongle|spa|tattoo|tatouage)", text):
        return ("Beauté & Salons / Barber", "T-shirts coupe stylée noir mat, Tabliers personnalisés")
    if re.search(r"(fit|coach|sport|boxe|crossfit|club|foot|gym|danse)", text):
        return ("Sport & Coaching / Fitness", "T-shirts techniques respirants, Sweats zippés, Casquettes")
    if re.search(r"(securit|gardien|protection)", text):
        return ("Sécurité & Gardiennage", "Polos noirs brodés, Vestes Softshell badge")
    if re.search(r"(event|evenement|dj|fest|musique|photo|prod)", text):
        return ("Événementiel & Audiovisuel", "Hoodies oversize, T-shirts crew dos XL, Bonnets/Casquettes")
    return (category or "Commerce & Activité Indépendante", "T-shirts promotionnels, Polos corporate brodés")

async def run():
    print("=" * 60)
    print("🚀 SCRAPER PLAYWRIGHT - FACEBOOK PAGE INVITES (SIGNAID)")
    print("=" * 60)
    
    # Use a persistent user data directory so cookies/login stay intact
    user_data_dir = os.path.expanduser("~/.facebook_playwright_session")
    os.makedirs(user_data_dir, exist_ok=True)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch_persistent_context(
            user_data_dir=user_data_dir,
            headless=False,
            channel="chrome",
            args=["--disable-blink-features=AutomationControlled"]
        )
        
        page = browser.pages[0] if browser.pages else await browser.new_page()
        target_url = "https://www.facebook.com/pages/?category=invites&ref=bookmarks"
        
        print(f"🌐 Navigation vers : {target_url}")
        await page.goto(target_url, wait_until="networkidle")
        
        # Check if login is needed
        if "login" in page.url:
            print("\n⚠️ ATTENTION : Veuillez vous connecter à votre compte Facebook dans la fenêtre ouverte.")
            print("Le script attend que vous arriviez sur la page des invitations...\n")
            await page.wait_for_url(lambda u: "category=invites" in u or "/pages" in u, timeout=180000)
            print("✅ Connecté avec succès !")
            await page.goto(target_url, wait_until="networkidle")
        
        print("🔍 Scan des invitations en cours...")
        prospects = {}
        idle_scrolls = 0
        
        for _ in range(30):
            # Extract cards
            cards_data = await page.evaluate('''() => {
                const results = [];
                const links = Array.from(document.querySelectorAll('a[href]'));
                for (const l of links) {
                    const href = l.href;
                    if (!href || href.includes('category=invites') || href.includes('/help/') || href.includes('/settings')) continue;
                    const text = (l.innerText || '').trim();
                    if (text.length < 2 || text.length > 70) continue;
                    if (['accepter', 'refuser', 'confirmer', 'j\\'aime', 'suivre'].includes(text.toLowerCase())) continue;
                    
                    const card = l.closest('div[role="listitem"]') || l.parentElement?.parentElement?.parentElement;
                    const img = card ? card.querySelector('img[src*="scontent"], img') : null;
                    const cardText = card ? card.innerText : '';
                    
                    results.push({
                        name: text.split('\\n')[0],
                        url: href.split('?')[0],
                        logoUrl: img ? img.src : '',
                        rawText: cardText
                    });
                }
                return results;
            }''')
            
            initial_count = len(prospects)
            for item in cards_data:
                name = item['name']
                url = item['url']
                if not url or url in prospects:
                    continue
                if name.lower() in ['facebook', 'invitation', 'accueil', 'pages']:
                    continue
                
                sector, needs = detect_textile_needs(name)
                clean_slug = re.sub(r'[^a-z0-9]', '', name.lower())[:15]
                audit_key = f"audit-{clean_slug or 'prospect'}-{os.urandom(2).hex()}"
                
                prospects[url] = {
                    "name": name,
                    "auditKey": audit_key,
                    "facebookUrl": url,
                    "sector": sector,
                    "textileNeeds": needs,
                    "logoUrl": item.get('logoUrl', '')
                }
                print(f"🎯 Trouvé : {name} ({sector})")
                
            if len(prospects) == initial_count:
                idle_scrolls += 1
                if idle_scrolls >= 5:
                    print("✅ Aucun nouvel élément après plusieurs défilements. Fin du scan.")
                    break
            else:
                idle_scrolls = 0
                
            await page.mouse.wheel(0, 900)
            await asyncio.sleep(1.5)
            
        prospect_list = list(prospects.values())
        print(f"\n📦 Total récolté : {len(prospect_list)} prospects.")
        
        # Save JSON
        with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
            json.dump(prospect_list, f, indent=2, ensure_ascii=False)
        print(f"✅ JSON : {OUTPUT_JSON}")
        
        # Save CSV
        with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            writer.writerow(['Nom Entreprise', 'Cle Audit', 'Lien Facebook', 'Secteur d\'activite', 'Besoins Textiles', 'Logo URL'])
            for p_item in prospect_list:
                writer.writerow([
                    p_item['name'],
                    p_item['auditKey'],
                    p_item['facebookUrl'],
                    p_item['sector'],
                    p_item['textileNeeds'],
                    p_item['logoUrl']
                ])
        print(f"✅ CSV : {OUTPUT_CSV}")
        
        await browser.close()

if __name__ == '__main__':
    asyncio.run(run())
