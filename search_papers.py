import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# We will search OpenAlex API for published works from 2023-2026 on:
# 1. Alzheimer cognitive serious games
# 2. Random forest / machine learning adaptive difficulty cognitive assessment
# 3. Voice assistant / speech dementia care
# 4. Caregiver dashboard memory care smart system

queries = [
    "Alzheimer cognitive serious games machine learning",
    "Alzheimer adaptive difficulty Random Forest cognitive training",
    "dementia voice assistant speech recognition caregiver platform",
    "memory care cognitive activity caregiver dashboard Alzheimer"
]

for q in queries:
    url = f"https://api.openalex.org/works?search={urllib.parse.quote(q)}&filter=publication_year:2023-2026&per-page=5"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'MindCareResearch/1.0'})
        with urllib.request.urlopen(req, context=ctx) as response:
            data = json.loads(response.read().decode())
            print(f"=== Query: {q} ===")
            for item in data.get('results', []):
                title = item.get('display_name')
                year = item.get('publication_year')
                doi = item.get('doi')
                host = item.get('primary_location', {}).get('source', {}).get('display_name', '')
                publisher = item.get('primary_location', {}).get('source', {}).get('publisher', '')
                authors = [a.get('author', {}).get('display_name', '') for a in item.get('authorships', [])[:3]]
                print(f"- Title: {title}\n  Authors: {', '.join(authors)}\n  Year: {year}\n  Source/Publisher: {host} / {publisher}\n  DOI: {doi}\n")
    except Exception as e:
        print(f"Error querying {q}: {e}")
