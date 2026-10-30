import json
import glob
import os

step_files = [
    r"C:\Users\Akshatha\.gemini\antigravity-ide\brain\171139cc-2720-4d89-94bd-6ba6feb2bf67\.system_generated\steps\45\content.md",
    r"C:\Users\Akshatha\.gemini\antigravity-ide\brain\171139cc-2720-4d89-94bd-6ba6feb2bf67\.system_generated\steps\47\content.md",
    r"C:\Users\Akshatha\.gemini\antigravity-ide\brain\171139cc-2720-4d89-94bd-6ba6feb2bf67\.system_generated\steps\49\content.md"
]

out = []
for filepath in step_files:
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            for line in lines:
                if line.startswith('{'):
                    try:
                        data = json.loads(line.strip())
                        results = data.get('results', [])
                        for item in results:
                            title = item.get('display_name')
                            year = item.get('publication_year')
                            doi = item.get('doi')
                            source = item.get('primary_location', {}).get('source', {})
                            journal = source.get('display_name', 'N/A')
                            publisher = source.get('publisher', 'N/A')
                            authorships = item.get('authorships', [])
                            authors = [a.get('author', {}).get('display_name', '') for a in authorships[:3]]
                            if year and year >= 2023:
                                out.append({
                                    "title": title,
                                    "authors": ", ".join(authors),
                                    "year": year,
                                    "journal": journal,
                                    "publisher": publisher,
                                    "doi": doi
                                })
                    except Exception as e:
                        pass

with open("c:\\Alzheimer\\parsed_papers.json", "w", encoding="utf-8") as f:
    json.dump(out, f, indent=2)

print(f"Total papers extracted: {len(out)}")
