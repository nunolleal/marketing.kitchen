#!/usr/bin/env python3
"""
The Marketing Kitchen - Weekly Email Digest
Reads main-feed.json, picks the top articles, and sends a styled HTML email via Resend.
"""

import json
import os
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

import requests

ROOT_DIR = Path(__file__).parent.parent
DATA_DIR = ROOT_DIR / "data"

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
TO_EMAIL = "Morgan.Stoffel@ey.com"
FROM_EMAIL = os.environ.get("FROM_EMAIL", "digest@themarketing.kitchen")
SITE_URL = "https://marketing-kitchen.netlify.app"

NUM_FEATURED = 3       # large hero cards at top
NUM_SECONDARY = 7      # smaller list below


def load_articles():
    with open(DATA_DIR / "main-feed.json", encoding="utf-8") as f:
        return json.load(f)


def get_week_label():
    today = datetime.now(timezone.utc)
    monday = today - timedelta(days=today.weekday())
    sunday = monday + timedelta(days=6)
    return f"{monday.strftime('%B %d')} – {sunday.strftime('%B %d, %Y')}"


def category_color(category):
    colors = {
        "marketing":       "#6366f1",
        "martech":         "#8b5cf6",
        "ai":              "#06b6d4",
        "ai_marketing":    "#0ea5e9",
        "adobe":           "#ef4444",
        "salesforce":      "#3b82f6",
        "industry_retail": "#f59e0b",
        "industry_lifesciences": "#10b981",
        "industry_financial":    "#f97316",
        "industry_telecom":      "#6366f1",
        "industry_media":        "#ec4899",
        "industry_tech":         "#14b8a6",
        "industry_consumer":     "#a855f7",
        "industry_industrial":   "#64748b",
    }
    return colors.get(category, "#6366f1")


def category_label(category):
    labels = {
        "marketing":       "Marketing",
        "martech":         "MarTech",
        "ai":              "AI & Tech",
        "ai_marketing":    "AI Marketing",
        "adobe":           "Adobe",
        "salesforce":      "Salesforce",
        "industry_retail": "Retail",
        "industry_lifesciences": "Life Sciences",
        "industry_financial":    "Financial",
        "industry_telecom":      "Telecom",
        "industry_media":        "Media",
        "industry_tech":         "Tech",
        "industry_consumer":     "Consumer",
        "industry_industrial":   "Industrial",
    }
    return labels.get(category, category.replace("_", " ").title())


def time_ago(published_str):
    try:
        pub = datetime.fromisoformat(published_str.replace("Z", "+00:00"))
        hours = (datetime.now(timezone.utc) - pub).total_seconds() / 3600
        if hours < 24:
            return f"{int(hours)}h ago"
        days = int(hours / 24)
        return f"{days}d ago"
    except Exception:
        return ""


def build_hero_card(article):
    color = category_color(article.get("source_category", ""))
    label = category_label(article.get("source_category", ""))
    ago = time_ago(article["published"])
    img_style = ""
    if article.get("image_url"):
        img_style = f"""
        <div style="width:100%;height:180px;overflow:hidden;border-radius:8px 8px 0 0;">
          <img src="{article['image_url']}" alt="" width="100%" style="width:100%;height:180px;object-fit:cover;display:block;" />
        </div>"""

    return f"""
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">
      <tr><td>{img_style}
        <div style="padding:20px 24px 22px;">
          <div style="margin-bottom:10px;">
            <span style="display:inline-block;background:{color};color:#fff;font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px;">{label}</span>
            <span style="color:#9ca3af;font-size:12px;margin-left:8px;">{article['source']} &middot; {ago}</span>
          </div>
          <a href="{article['url']}" style="text-decoration:none;color:#111827;font-size:18px;font-weight:700;line-height:1.4;display:block;margin-bottom:10px;">{article['title']}</a>
          <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 14px;">{article.get('summary','')[:200]}{'...' if len(article.get('summary','')) > 200 else ''}</p>
          <a href="{article['url']}" style="color:{color};font-size:13px;font-weight:600;text-decoration:none;">Read article &rarr;</a>
        </div>
      </td></tr>
    </table>"""


def build_list_item(article, index):
    color = category_color(article.get("source_category", ""))
    label = category_label(article.get("source_category", ""))
    ago = time_ago(article["published"])
    bg = "#f9fafb" if index % 2 == 0 else "#ffffff"

    return f"""
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:2px;background:{bg};border-radius:6px;">
      <tr>
        <td style="padding:14px 18px;">
          <div style="margin-bottom:5px;">
            <span style="display:inline-block;background:{color}22;color:{color};font-size:10px;font-weight:700;padding:2px 8px;border-radius:12px;text-transform:uppercase;letter-spacing:0.4px;">{label}</span>
            <span style="color:#9ca3af;font-size:11px;margin-left:6px;">{article['source']} &middot; {ago}</span>
          </div>
          <a href="{article['url']}" style="text-decoration:none;color:#1f2937;font-size:14px;font-weight:600;line-height:1.4;">{article['title']}</a>
        </td>
      </tr>
    </table>"""


def build_html(articles):
    week = get_week_label()
    featured = articles[:NUM_FEATURED]
    secondary = articles[NUM_FEATURED:NUM_FEATURED + NUM_SECONDARY]

    hero_cards = "".join(build_hero_card(a) for a in featured)
    list_items = "".join(build_list_item(a, i) for i, a in enumerate(secondary))

    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>The Marketing Kitchen – Weekly Digest</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
  <tr><td align="center">
  <table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;">

    <!-- Header -->
    <tr><td style="background:linear-gradient(135deg,#0f172a 0%,#1e1b4b 100%);border-radius:12px 12px 0 0;padding:36px 40px 32px;">
      <div style="color:#a5b4fc;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">Weekly Intelligence</div>
      <div style="color:#ffffff;font-size:28px;font-weight:800;letter-spacing:-0.5px;">The Marketing Kitchen</div>
      <div style="color:#94a3b8;font-size:14px;margin-top:6px;">{week}</div>
    </td></tr>

    <!-- Intro bar -->
    <tr><td style="background:#1e293b;padding:14px 40px;">
      <span style="color:#cbd5e1;font-size:13px;">Your weekly briefing on marketing, AI, and industry moves — curated and scored for relevance.</span>
      <a href="{SITE_URL}" style="color:#818cf8;font-size:13px;font-weight:600;text-decoration:none;float:right;">View live feed &rarr;</a>
    </td></tr>

    <!-- Body -->
    <tr><td style="background:#f3f4f6;padding:28px 24px;">

      <!-- Featured section label -->
      <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#6b7280;margin-bottom:14px;padding-left:4px;">&#9733; Top Stories This Week</div>

      {hero_cards}

      <!-- Secondary section label -->
      <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#6b7280;margin:24px 0 12px;padding-left:4px;">Also Worth Reading</div>

      {list_items}

    </td></tr>

    <!-- Footer -->
    <tr><td style="background:#1e293b;border-radius:0 0 12px 12px;padding:24px 40px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="color:#64748b;font-size:12px;line-height:1.6;">
            The Marketing Kitchen &bull; Weekly digest every Monday<br>
            <a href="{SITE_URL}" style="color:#6366f1;text-decoration:none;">Visit the live feed</a>
          </td>
          <td align="right" style="color:#334155;font-size:24px;font-weight:800;">&#127859;</td>
        </tr>
      </table>
    </td></tr>

  </table>
  </td></tr>
  </table>

</body>
</html>"""


def send_email(html, week):
    if not RESEND_API_KEY:
        print("ERROR: RESEND_API_KEY not set")
        sys.exit(1)

    payload = {
        "from": FROM_EMAIL,
        "to": [TO_EMAIL],
        "subject": f"The Marketing Kitchen – {week}",
        "html": html,
    }

    resp = requests.post(
        "https://api.resend.com/emails",
        headers={
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=15,
    )

    if resp.status_code in (200, 201):
        print(f"✓ Digest sent to {TO_EMAIL}")
        print(f"  ID: {resp.json().get('id')}")
    else:
        print(f"ERROR sending email: {resp.status_code} {resp.text}")
        sys.exit(1)


def main():
    print("The Marketing Kitchen – Weekly Digest")
    print(f"Sending to: {TO_EMAIL}")

    articles = load_articles()
    print(f"Loaded {len(articles)} articles")

    week = get_week_label()
    html = build_html(articles)
    send_email(html, week)


if __name__ == "__main__":
    main()
