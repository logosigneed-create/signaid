from curl_cffi import requests
from bs4 import BeautifulSoup
import re

url = "https://www.facebook.com/61566467420783"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7"
}

try:
    resp = requests.get(url, headers=headers, impersonate="chrome124", allow_redirects=True, timeout=10)
    print("Status:", resp.status_code)
    print("Final URL:", resp.url)
    
    soup = BeautifulSoup(resp.text, 'html.parser')
    title = soup.find('title')
    print("Title:", title.text if title else "None")
    
    # Check meta tags (og:image, og:title)
    og_title = soup.find('meta', property='og:title')
    og_image = soup.find('meta', property='og:image')
    
    print("og:title:", og_title['content'] if og_title else "None")
    print("og:image:", og_image['content'] if og_image else "None")
    
    # Check for scontent urls
    scontent_urls = set(re.findall(r'https://scontent[^\s"\'\\]+', resp.text))
    print(f"Found {len(scontent_urls)} scontent image URLs")
    for u in list(scontent_urls)[:5]:
        print(" -", u[:100])
except Exception as e:
    print("Error:", e)
