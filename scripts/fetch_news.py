#!/usr/bin/env python3
"""
The Marketing Kitchen - News Fetcher
Fetches RSS feeds, scores relevance, classifies by industry,
deduplicates, and writes JSON data files for the static frontend.
"""

import feedparser
import requests
import json
import hashlib
import re
import html
import time
import sys
from datetime import datetime, timezone, timedelta
from dateutil import parser as date_parser
from pathlib import Path

# ─── Paths ────────────────────────────────────────
ROOT_DIR = Path(__file__).parent.parent
DATA_DIR = ROOT_DIR / "data"
CONFIG_FILE = Path(__file__).parent / "feed_config.json"

# ─── Constants ────────────────────────────────────
MAX_ARTICLES_PER_FEED = 30
MAX_ARTICLES_PER_OUTPUT = 100
MAX_ARTICLE_AGE_DAYS = 7
FETCH_TIMEOUT = 15
DELAY_BETWEEN_FEEDS = 1  # seconds

USER_AGENT = (
    "TheMarketingKitchen/1.0 "
    "(+https://github.com; news aggregator for internal marketing team)"
)


def load_config():
    """Load feed configuration."""
    with open(CONFIG_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def fetch_single_feed(feed_info):
    """Fetch and parse a single RSS feed. Returns list of normalized articles."""
    url = feed_info["url"]
    name = feed_info["name"]

    try:
        headers = {"User-Agent": USER_AGENT}
        resp = requests.get(url, headers=headers, timeout=FETCH_TIMEOUT)
        resp.raise_for_status()

        feed = feedparser.parse(resp.content)

        if feed.bozo and not feed.entries:
            print(f"  [WARN] Malformed feed from {name}: {feed.bozo_exception}")
            return []

        articles = []
        for entry in feed.entries[:MAX_ARTICLES_PER_FEED]:
            article = normalize_entry(entry, feed_info)
            if article and is_recent(article["published"]):
                articles.append(article)

        return articles

    except requests.exceptions.Timeout:
        print(f"  [ERROR] Timeout fetching {name}")
        return []
    except requests.exceptions.RequestException as e:
        print(f"  [ERROR] Failed to fetch {name}: {e}")
        return []
    except Exception as e:
        print(f"  [ERROR] Unexpected error with {name}: {e}")
        return []


def normalize_entry(entry, feed_info):
    """Convert a feedparser entry to a standardized dict."""
    # Get URL
    url = entry.get("link", "").strip()
    if not url:
        return None

    # Get title
    title = entry.get("title", "").strip()
    if not title:
        return None

    # Clean HTML from title
    title = clean_html(title)
    if len(title) > 300:
        title = title[:297] + "..."

    # Generate stable ID
    article_id = hashlib.sha256(url.encode("utf-8")).hexdigest()[:12]

    # Parse published date
    published = None
    for date_field in ["published", "updated", "created"]:
        raw_date = entry.get(date_field) or entry.get(f"{date_field}_parsed")
        if raw_date:
            try:
                if isinstance(raw_date, str):
                    published = date_parser.parse(raw_date).astimezone(timezone.utc)
                elif hasattr(raw_date, "tm_year"):
                    published = datetime(*raw_date[:6], tzinfo=timezone.utc)
                break
            except (ValueError, TypeError):
                continue

    if not published:
        published = datetime.now(timezone.utc)

    # Get summary/description
    summary = ""
    for field in ["summary", "description", "content"]:
        val = entry.get(field, "")
        if isinstance(val, list) and val:
            val = val[0].get("value", "") if isinstance(val[0], dict) else str(val[0])
        if val:
            summary = clean_html(str(val))
            break

    if len(summary) > 280:
        summary = summary[:277].rsplit(" ", 1)[0] + "..."

    # Extract image URL
    image_url = extract_image(entry)

    # Extract tags
    tags = []
    if entry.get("tags"):
        for tag_obj in entry["tags"][:5]:
            term = tag_obj.get("term", "").strip()
            if term and len(term) < 50:
                tags.append(term)

    return {
        "id": article_id,
        "title": title,
        "url": url,
        "source": feed_info["name"].replace("GN - ", ""),
        "source_category": feed_info["category"],
        "published": published.isoformat(),
        "summary": summary,
        "image_url": image_url,
        "tags": tags,
        "industries": [],
        "relevance_score": 0,
    }


def extract_image(entry):
    """Try to extract an image URL from the entry."""
    # media:content
    media = entry.get("media_content", [])
    if media:
        for m in media:
            url = m.get("url", "")
            if url and ("image" in m.get("type", "image") or m.get("medium") == "image"):
                return url

    # media:thumbnail
    thumbnail = entry.get("media_thumbnail", [])
    if thumbnail:
        return thumbnail[0].get("url", "") or None

    # enclosure
    enclosures = entry.get("enclosures", [])
    for enc in enclosures:
        if "image" in enc.get("type", ""):
            return enc.get("href", "") or enc.get("url", "")

    # og:image from content
    content = entry.get("summary", "") or entry.get("description", "")
    if content:
        match = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', str(content))
        if match:
            url = match.group(1)
            if url.startswith("http") and not url.endswith(".gif"):
                return url

    return None


def fetch_og_image(url):
    """Fetch the article page and extract og:image or twitter:image meta tag."""
    try:
        headers = {"User-Agent": USER_AGENT}
        resp = requests.get(url, headers=headers, timeout=8, allow_redirects=True)
        resp.raise_for_status()

        # Only parse first 50KB to avoid large page downloads
        head = resp.text[:50000]

        # Try og:image and twitter:image (both attribute orders)
        for pattern in [
            r'<meta\s+(?:property|name)=["\'](?:og:image|twitter:image(?::src)?)["\']\s+content=["\']([^"\']+)["\']',
            r'<meta\s+content=["\']([^"\']+)["\']\s+(?:property|name)=["\'](?:og:image|twitter:image(?::src)?)["\']',
        ]:
            match = re.search(pattern, head, re.IGNORECASE)
            if match:
                img_url = match.group(1).strip()
                if img_url.startswith("http") and not img_url.endswith(".gif"):
                    return img_url

    except Exception:
        pass
    return None


def clean_html(text):
    """Remove HTML tags and decode entities."""
    if not text:
        return ""
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def is_recent(published_str):
    """Return True if article is within MAX_ARTICLE_AGE_DAYS."""
    try:
        pub_date = date_parser.parse(published_str)
        if pub_date.tzinfo is None:
            pub_date = pub_date.replace(tzinfo=timezone.utc)
        cutoff = datetime.now(timezone.utc) - timedelta(days=MAX_ARTICLE_AGE_DAYS)
        return pub_date > cutoff
    except (ValueError, TypeError):
        return True


def compute_relevance_score(article, config):
    """Score 0-100 across 5 dimensions: source authority, keyword relevance,
    specificity, content quality, and recency."""
    title_lower = article["title"].lower()
    summary_lower = article["summary"].lower()
    source_name = article.get("source", "")

    # ── 1. Source Authority (0-20) ───────────────────────────
    source_tiers = config.get("source_tiers", {})
    tier1 = [s.lower() for s in source_tiers.get("tier1", [])]
    tier2 = [s.lower() for s in source_tiers.get("tier2", [])]
    tier3_prefixes = source_tiers.get("tier3_prefix", [])

    source_lower = source_name.lower()
    is_tier3 = any(source_name.startswith(p.replace("GN - ", "")) for p in tier3_prefixes)
    # Google News sources have "GN - " stripped to just the query name

    if source_lower in tier1:
        source_score = 20
    elif source_lower in tier2:
        source_score = 14
    elif article.get("source_category", "").startswith("industry_") or is_tier3:
        source_score = 6
    else:
        source_score = 10  # unknown source gets middle score

    # ── 2. Keyword Relevance (0-30, capped) ──────────────────
    relevance = config.get("relevance_keywords", {})
    kw_score = 0

    for kw in relevance.get("high_weight", []):
        kw_lower = kw.lower()
        if kw_lower in title_lower:
            kw_score += 12
        elif kw_lower in summary_lower:
            kw_score += 5

    for kw in relevance.get("medium_weight", []):
        kw_lower = kw.lower()
        if kw_lower in title_lower:
            kw_score += 8
        elif kw_lower in summary_lower:
            kw_score += 3

    for kw in relevance.get("low_weight", []):
        kw_lower = kw.lower()
        if kw_lower in title_lower:
            kw_score += 4
        elif kw_lower in summary_lower:
            kw_score += 1

    kw_score = min(kw_score, 30)  # cap to prevent buzzword stacking

    # ── 3. Specificity Signals (0-20) ────────────────────────
    spec_score = 0
    text_lower = title_lower + " " + summary_lower

    # Numbers/data in title = concrete, not vague
    if re.search(r'\d', article["title"]):
        spec_score += 6

    # Specificity keywords (earnings, launches, studies, etc.)
    signals = config.get("specificity_signals", [])
    signal_hits = sum(1 for s in signals if s.lower() in text_lower)
    spec_score += min(signal_hits * 3, 9)

    # Named entities (company/brand names = specific story, not generic take)
    named_brands = ["google", "apple", "amazon", "meta", "microsoft", "adobe",
                    "salesforce", "netflix", "disney", "walmart", "nike", "coca-cola",
                    "pepsi", "jpmorgan", "visa", "mastercard", "pfizer", "openai"]
    brand_hits = sum(1 for b in named_brands if b in text_lower)
    spec_score += min(brand_hits * 3, 5)

    spec_score = min(spec_score, 20)

    # ── 4. Content Quality (0-10) ────────────────────────────
    quality_score = 0

    # Substantive summary (not stub/empty)
    if len(article["summary"]) > 120:
        quality_score += 4
    elif len(article["summary"]) > 60:
        quality_score += 2

    # Has tags (structured metadata = better source)
    if article.get("tags") and len(article["tags"]) >= 2:
        quality_score += 3

    # Title in sweet spot (not too short/vague, not clickbait-long)
    title_len = len(article["title"])
    if 30 <= title_len <= 120:
        quality_score += 3
    elif title_len > 120:
        quality_score += 1

    quality_score = min(quality_score, 10)

    # ── 5. Recency (0-20, smooth decay) ──────────────────────
    recency_score = 0
    try:
        pub_date = date_parser.parse(article["published"])
        if pub_date.tzinfo is None:
            pub_date = pub_date.replace(tzinfo=timezone.utc)
        hours_ago = (datetime.now(timezone.utc) - pub_date).total_seconds() / 3600

        if hours_ago < 4:
            recency_score = 20
        elif hours_ago < 8:
            recency_score = 17
        elif hours_ago < 16:
            recency_score = 14
        elif hours_ago < 24:
            recency_score = 11
        elif hours_ago < 48:
            recency_score = 7
        elif hours_ago < 72:
            recency_score = 4
        else:
            recency_score = 1
    except (ValueError, TypeError):
        recency_score = 1

    total = source_score + kw_score + spec_score + quality_score + recency_score

    # Relevance gate: articles with ZERO keyword relevance get heavily penalized
    # (e.g. a Verge doorbell review has no marketing keywords — shouldn't rank high)
    if kw_score == 0:
        total = int(total * 0.35)

    return max(min(total, 100), 5)


def classify_industries(article, config):
    """Match article text against industry keyword lists."""
    text = (article["title"] + " " + article["summary"]).lower()
    matched = []

    for industry, keywords in config.get("industry_keywords", {}).items():
        for kw in keywords:
            if kw.lower() in text:
                matched.append(industry)
                break

    return matched


def classify_vendors(article, config):
    """Check if article is about Adobe or Salesforce."""
    text = (article["title"] + " " + article["summary"]).lower()
    vendors = []

    for vendor, keywords in config.get("vendor_keywords", {}).items():
        for kw in keywords:
            if kw.lower() in text:
                vendors.append(vendor)
                break

    return vendors


def deduplicate(articles):
    """Remove duplicate articles by URL hash and fuzzy title match."""
    seen_ids = {}
    unique = []

    # First pass: exact URL dedup (keep highest scored)
    for article in articles:
        aid = article["id"]
        if aid in seen_ids:
            if article["relevance_score"] > seen_ids[aid]["relevance_score"]:
                # Replace with higher-scored version
                unique = [a for a in unique if a["id"] != aid]
                unique.append(article)
                seen_ids[aid] = article
        else:
            seen_ids[aid] = article
            unique.append(article)

    # Second pass: fuzzy title dedup
    final = []
    title_words_list = []

    for article in unique:
        words = set(re.findall(r"\w+", article["title"].lower()))
        if len(words) < 3:
            final.append(article)
            title_words_list.append(words)
            continue

        is_dup = False
        for i, existing_words in enumerate(title_words_list):
            if len(existing_words) < 3:
                continue
            intersection = words & existing_words
            union = words | existing_words
            similarity = len(intersection) / len(union) if union else 0

            if similarity > 0.85:
                # Keep the higher-scored one
                if article["relevance_score"] > final[i]["relevance_score"]:
                    final[i] = article
                    title_words_list[i] = words
                is_dup = True
                break

        if not is_dup:
            final.append(article)
            title_words_list.append(words)

    return final


def time_decay_score(article):
    """Score for main feed: relevance * exponential time decay (halves every 24h).
    Ensures no article stays #1 indefinitely — recency always matters."""
    try:
        pub_date = date_parser.parse(article["published"])
        if pub_date.tzinfo is None:
            pub_date = pub_date.replace(tzinfo=timezone.utc)
        hours_ago = (datetime.now(timezone.utc) - pub_date).total_seconds() / 3600
    except (ValueError, TypeError):
        hours_ago = 48

    decay = 0.5 ** (hours_ago / 24)  # 100% now → 50% at 24h → 25% at 48h → 3% at 5d
    return article["relevance_score"] * decay


def build_output_files(all_articles, config):
    """Sort and write articles into JSON data files."""
    DATA_DIR.mkdir(exist_ok=True)

    # Main feed: relevance score with time-decay so old articles don't stick at #1
    main = sorted(all_articles, key=lambda a: -time_decay_score(a))
    write_json(DATA_DIR / "main-feed.json", main[:MAX_ARTICLES_PER_OUTPUT])

    # Industry feeds
    for industry in config.get("industry_keywords", {}).keys():
        subset = [a for a in all_articles if industry in a.get("industries", [])]
        subset.sort(key=lambda a: (-a["relevance_score"], a["published"]))
        write_json(
            DATA_DIR / f"industry-{industry}.json",
            subset[:MAX_ARTICLES_PER_OUTPUT],
        )

    # Vendor feeds
    adobe = [
        a for a in all_articles
        if a["source_category"] == "adobe" or "adobe" in a.get("vendors", [])
    ]
    adobe.sort(key=lambda a: (-a["relevance_score"], a["published"]))
    write_json(DATA_DIR / "vendor-adobe.json", adobe[:MAX_ARTICLES_PER_OUTPUT])

    salesforce = [
        a for a in all_articles
        if a["source_category"] == "salesforce" or "salesforce" in a.get("vendors", [])
    ]
    salesforce.sort(key=lambda a: (-a["relevance_score"], a["published"]))
    write_json(DATA_DIR / "vendor-salesforce.json", salesforce[:MAX_ARTICLES_PER_OUTPUT])

    # Metadata
    feed_health = {}
    for group in config.get("feeds", {}).values():
        for feed_info in group:
            name = feed_info["name"]
            count = len([a for a in all_articles if a["source"] == name.replace("GN - ", "")])
            feed_health[name] = {"status": "ok" if count > 0 else "empty", "articles": count}

    metadata = {
        "last_updated": datetime.now(timezone.utc).isoformat(),
        "article_count": len(all_articles),
        "feed_health": feed_health,
        "next_update_approx": (
            datetime.now(timezone.utc) + timedelta(hours=4)
        ).isoformat(),
    }
    write_json(DATA_DIR / "metadata.json", metadata)


def write_json(path, data):
    """Write JSON with compact formatting."""
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2, default=str)
    print(f"  Written: {path.name} ({len(data) if isinstance(data, list) else 'metadata'})")


def main():
    print("=" * 60)
    print("The Marketing Kitchen - News Fetcher")
    print(f"Started: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
    print("=" * 60)

    config = load_config()
    all_articles = []
    total_feeds = sum(len(feeds) for feeds in config["feeds"].values())
    fetched_count = 0

    for group_name, feeds in config["feeds"].items():
        print(f"\n--- {group_name} ---")
        for feed_info in feeds:
            fetched_count += 1
            print(f"[{fetched_count}/{total_feeds}] Fetching: {feed_info['name']}...")

            articles = fetch_single_feed(feed_info)

            for article in articles:
                article["relevance_score"] = compute_relevance_score(article, config)
                article["industries"] = classify_industries(article, config)
                article["vendors"] = classify_vendors(article, config)

            all_articles.extend(articles)
            print(f"  -> {len(articles)} articles")

            time.sleep(DELAY_BETWEEN_FEEDS)

    print(f"\n--- Processing ---")
    print(f"Total raw articles: {len(all_articles)}")

    # Deduplicate
    all_articles = deduplicate(all_articles)
    print(f"After dedup: {len(all_articles)}")

    # Fetch og:image for articles missing images
    no_image = [a for a in all_articles if not a["image_url"]]
    print(f"\n--- Fetching og:image for {len(no_image)} articles without images ---")
    og_found = 0
    for i, article in enumerate(no_image):
        img = fetch_og_image(article["url"])
        if img:
            article["image_url"] = img
            og_found += 1
        if (i + 1) % 20 == 0:
            print(f"  Progress: {i + 1}/{len(no_image)} checked, {og_found} images found")
        time.sleep(0.5)
    print(f"  og:image scraping done: found {og_found}/{len(no_image)} images")

    # Clean up vendor field before output (not needed in JSON)
    for article in all_articles:
        article.pop("vendors", None)

    # Build output files
    print(f"\n--- Writing output ---")
    build_output_files(all_articles, config)

    print(f"\n{'=' * 60}")
    print(f"Done! {len(all_articles)} unique articles processed.")
    print(f"Finished: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
    print("=" * 60)


if __name__ == "__main__":
    main()
