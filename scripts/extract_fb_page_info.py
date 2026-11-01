import sys
import os
import json
import re
from curl_cffi import requests
from bs4 import BeautifulSoup

def extract_fb_page(url):
    # Clean URL
    clean_url = url.split('#')[0]
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7"
    }

    try:
        resp = requests.get(clean_url, headers=headers, impersonate="chrome124", allow_redirects=True, timeout=12)
        if resp.status_code != 200:
            return {"success": False, "error": f"HTTP status {resp.status_code}"}

        soup = BeautifulSoup(resp.text, 'html.parser')
        
        # 1. Page Name
        og_title = soup.find('meta', property='og:title')
        page_name = og_title['content'].strip() if og_title else ""
        if not page_name:
            title_el = soup.find('title')
            if title_el:
                page_name = title_el.text.replace(" | Facebook", "").strip()

        # 2. Logo / Profile Picture
        og_image = soup.find('meta', property='og:image')
        logo_url = og_image['content'].strip() if og_image else ""

        if not logo_url:
            # Search for profile photo scontent link
            scontent_matches = re.findall(r'https://scontent[^\s"\'\\]+', resp.text)
            for m in scontent_matches:
                if 't39.30808-1' in m or 'p720x720' in m or 'scontent' in m:
                    logo_url = m
                    break

        # Description / Bio
        og_desc = soup.find('meta', property='og:description')
        description = og_desc['content'].strip() if og_desc else ""
        if not description:
            desc_el = soup.find('meta', attrs={'name': 'description'})
            description = desc_el['content'].strip() if desc_el else ""

        if not page_name:
            return {"success": False, "error": "Nom de page introuvable"}

        # 3. Download Logo locally
        slug = re.sub(r'[^a-z0-9]', '', page_name.lower())[:20] or "prospect"
        local_dir = os.path.join(os.path.dirname(__file__), '..', 'public', 'prospects_logos')
        os.makedirs(local_dir, exist_ok=True)
        local_logo_path = os.path.join(local_dir, f"{slug}.jpg")

        if logo_url:
            img_resp = requests.get(logo_url, impersonate="chrome124", timeout=10)
            if img_resp.status_code == 200:
                with open(local_logo_path, 'wb') as f:
                    f.write(img_resp.content)
            else:
                local_logo_path = None
        else:
            local_logo_path = None

        return {
            "success": True,
            "pageName": page_name,
            "logoUrl": logo_url,
            "localLogoPath": local_logo_path,
            "canonicalUrl": resp.url,
            "slug": slug,
            "description": description
        }

    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "URL manquante"}))
        sys.exit(1)
    
    target_url = sys.argv[1]
    res = extract_fb_page(target_url)
    print(json.dumps(res, indent=2, ensure_ascii=False))
