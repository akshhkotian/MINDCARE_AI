import os
import json
import urllib.request
import urllib.parse
from flask import Blueprint, request, jsonify

translate_bp = Blueprint('translate', __name__)

# In-memory translation cache to make repetitive queries return in 0ms
# Structure: { target_lang: { original_text: translated_text } }
TRANSLATION_CACHE = {
    'hi': {},
    'kn': {},
    'ta': {},
    'te': {},
    'bn': {},
    'mr': {},
    'gu': {},
    'ml': {}
}

# Pre-seed cache from api_translations.json if available
try:
    possible_paths = [
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'frontend', 'src', 'context', 'api_translations.json'),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), 'api_translations.json')
    ]
    for p in possible_paths:
        if os.path.exists(p):
            with open(p, 'r', encoding='utf-8') as f:
                data = json.load(f)
                en_dict = data.get('en', {})
                for lang in TRANSLATION_CACHE:
                    lang_dict = data.get(lang, {})
                    for k, en_val in en_dict.items():
                        if k in lang_dict:
                            TRANSLATION_CACHE[lang][en_val] = lang_dict[k]
                            TRANSLATION_CACHE[lang][k] = lang_dict[k]
            break
except Exception as e:
    print("[Translation Cache Notice] Pre-seed error:", e)

def call_translation_api(text, target_lang, source_lang='en'):
    """
    Calls Google Neural Machine Translation API for high-quality,
    grammatically accurate natural sentence translation.
    """
    if not text or not text.strip() or target_lang == source_lang or target_lang == 'en':
        return text

    trimmed = text.strip()

    # Check cache
    if target_lang in TRANSLATION_CACHE and trimmed in TRANSLATION_CACHE[target_lang]:
        return TRANSLATION_CACHE[target_lang][trimmed]

    try:
        url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl={source_lang}&tl={target_lang}&dt=t&q=" + urllib.parse.quote(trimmed)
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        with urllib.request.urlopen(req, timeout=8) as response:
            data = json.loads(response.read().decode('utf-8'))
            if data and data[0]:
                full_translated = "".join([segment[0] for segment in data[0] if segment and segment[0]])
                if full_translated:
                    if target_lang not in TRANSLATION_CACHE:
                        TRANSLATION_CACHE[target_lang] = {}
                    TRANSLATION_CACHE[target_lang][trimmed] = full_translated
                    return full_translated
    except Exception as e:
        print(f"[Translation API Warning] Failed to translate '{trimmed}' to {target_lang}: {e}")

    return text

@translate_bp.route('', methods=['POST'])
@translate_bp.route('/', methods=['POST'])
def translate():
    """
    Translate a single text or an array of texts.
    Request JSON:
    {
        "text": "Hello world",
        "target_lang": "kn",
        "source_lang": "en"
    }
    OR
    {
        "texts": ["Hello", "World"],
        "target_lang": "kn",
        "source_lang": "en"
    }
    """
    data = request.get_json(silent=True) or {}
    target_lang = data.get('target_lang', 'kn')
    source_lang = data.get('source_lang', 'en')

    # Handle multiple texts batch
    if 'texts' in data and isinstance(data['texts'], list):
        results = {}
        for item in data['texts']:
            if isinstance(item, str):
                results[item] = call_translation_api(item, target_lang, source_lang)
        return jsonify({
            'translations': results,
            'target_lang': target_lang,
            'source_lang': source_lang
        }), 200

    # Handle single text
    text = data.get('text', '')
    translated = call_translation_api(text, target_lang, source_lang)

    return jsonify({
        'original': text,
        'translated': translated,
        'target_lang': target_lang,
        'source_lang': source_lang
    }), 200

@translate_bp.route('/cache', methods=['GET'])
def get_cache_stats():
    stats = {lang: len(entries) for lang, entries in TRANSLATION_CACHE.items()}
    return jsonify({
        'status': 'active',
        'cache_counts': stats
    }), 200
