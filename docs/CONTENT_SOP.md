# JIJU Content SOP

How all JIJU content (FAQs, blogs/hubs, and the knowledge base) is created and
formatted. Derived from Atlys's published hub and rejection-reason articles
(see `references/sampleblogs.md`: UK hub, US hub, Schengen rejection guide).

This is the standard the tool's prompts encode and that a human reviewer checks
against before publishing.

---

## 1. Non-negotiables (JIJU hard rules)

1. **No em dashes (—) or en dashes (–). Ever.** The sample blogs use them heavily;
   JIJU does NOT. Use commas, periods, or "to" for ranges ("2 to 4 weeks", "EUR 80 to 100").
   This is enforced by a deterministic post-pass and an export gate.
2. **Never invent facts.** Every fee, date, salary threshold, refusal rate, processing
   time, and legal citation must be grounded (live atlys.com + provided facts) and is
   flagged for human verification. The samples are extremely fact-dense (£41,700, Section
   214(b), 1.65 lakh rejections); that precision is the standard, but only with real numbers.
3. **Global by default.** Tailor to the applicant's citizenship, residence, and destination.
   The samples are India-framed (en-IN, lakh/crore, ₹); JIJU generalizes. Use the audience's
   currency and idiom, not India's, unless the audience is Indian.
4. **Date-stamp + disclaimer.** Long content ends with "Information is current as of <date>.
   Always check the latest official guidance for your specific case." Rules change fast.

---

## 2. Voice and style

- **Authoritative and data-driven.** Lead with specific numbers and recency ("visitor visa
  approval ~85%", "expanded to 50 countries on 2 April 2026"). Specificity is the brand.
- **Second person, direct, no fluff.** "You need to prove you're not." Short sentences mixed
  with longer ones. Confident, helpful, expert-friend tone.
- **No AI cliches.** Banned: "in today's world", "when it comes to", "rest assured", "look no
  further", "navigating the", "it's worth noting", "moreover", "furthermore", "seamless",
  "robust", "leverage".
- **Honest and balanced.** Every hub includes a "When DIY Makes Sense" section. This builds
  trust and converts better than pure salesmanship.

---

## 3. Content types

| Type | What it is | JIJU module |
|---|---|---|
| **Country Hub** | Long, comprehensive blog covering a whole visa system (see UK/US hubs) | Blog mode (planned) |
| **Topic / sub-article** | One focused issue under a hub (e.g. Schengen rejection reasons) | Blog mode (planned) |
| **FAQ block** | The FAQ section of a CLP + its FAQPage JSON-LD | FAQs (live) |
| **Knowledge base** | Exhaustive question bank, no answers, for the agent | KB (live) |

---

## 4. Structural template (hub / blog)

In order:

1. **Frontmatter** (YAML): `title` (long, keyword-rich, lists every subtopic), `url`,
   `last_updated`, `author` (name + role, e.g. "Visa Policy Analyst at Atlys"),
   `hub_type`/`parent_hub`, `meta_description` (detailed, keyword-rich, every major entity).
2. **Breadcrumb** line: `Home › ... › This Page`.
3. **H1** = the page title (shorter than the frontmatter title).
4. **Opening hook** (1 to 3 paragraphs): a striking stat or the most consequential recent
   change, establishing authority and recency.
5. **Early CTA blockquote** (see CTA system): a managed-application pitch with concrete value props.
6. **"What's New in <year>"**: bulleted list, each item a **bold lead-in** + specific date/figure.
7. **Body sections** (`##` / `###`): the substance. Legal framework, breakdowns, tests, etc.
8. **"Every <X> Visa Type at a Glance"**: one bullet per type in the format
   `**Name**: fee; processing time; validity/stay; best-fit profile`.
9. **Document checklist**: bold category headers (Identity, Financial, Employment, ...) + bullets.
10. **"What Atlys Handles"**: value-prop bullets (see library) + a CTA.
11. **"When DIY Makes Sense"**: honest guidance on who can self-apply.
12. **FAQ section** (see §6).
13. **Related Hubs/Guides**, **Tools You Can Use** (internal links), **closing CTA**.
14. **Footer**: "current as of" date + disclaimer + contact link.
15. **Structured Data (for dev team)**: BreadcrumbList + FAQPage JSON-LD in fenced code blocks.

---

## 5. Repeatable micro-patterns

- **Bullet with bold lead-in**: `- **Skilled Worker salary raised to £41,700** for most roles...`
- **Problem / solution pair** (used per rejection reason):
  - `What gets you rejected:` + bullets
  - `**How Atlys prevents this:**` + one paragraph
- **At-a-glance bullet**: `**B1/B2 Visitor Visa**: $185; 10-year validity; up to 6 months per stay; for tourism and business`.
- **Numbered steps** with bold lead-ins: `**Step 1: Read the refusal letter.** ...`
- **Callout blockquote** for warnings: `> **Important: UK fees are non-refundable.** ...`
- **Markdown tables** for comparative data (e.g. rejection rate by country).

---

## 6. FAQ rules (what JIJU generates today)

- Each question is an `###` H3; the answer follows directly. This maps 1:1 to **FAQPage
  JSON-LD** (`mainEntity` → `Question`/`acceptedAnswer`), which JIJU emits automatically.
- 10 to 20 questions for a hub; fewer for a focused page.
- Answers are **specific and self-contained**: lead with the direct answer, then the key
  detail (numbers, dates, the one caveat). 1 to 4 sentences.
- **Weave keywords** the way real searchers phrase the question ("What is the minimum salary
  for a UK Skilled Worker visa in 2026?").
- **Link out** where useful (Atlys tools, the apply page, related hubs).
- Cover the predictable spread: eligibility, fee, processing time, documents, refusal/appeal,
  "does it affect other countries", and the recent change everyone is searching.

---

## 7. CTA system (woven throughout, not bolted on)

Cadence seen in the samples: an **early** CTA, **section** CTAs every few sections, a
**closing** CTA, plus a managed-application blockquote near the top.

- **Early blockquote CTA**: `> **Apply through [Atlys](url) for a fully managed application**, ...`
- **Inline section CTA** (own line, bold link): `### **[Start your UK visa application on Atlys](url)**`
- **Arrow CTA** after a high-stakes section: `### 👉 **[Don't risk a rejection, apply with Atlys →](url)**`
- **Per-FAQ link**: drop the relevant Atlys tool/apply link inside answers where natural.
- **Closing CTA**: a final apply link, often with the money-back hook.

Rule: most sections about applying, documents, timelines, fees, or refusals should make the
Atlys value clear and invite action. Vary the phrasing. Do not turn every sentence into an ad.

---

## 8. Atlys value-props library (reuse, keep accurate)

- Fully managed application; disclosure-first document review
- Expert visa specialists; consulate-specific (not generic) checklists
- ~99.2% delivery prediction accuracy on supported categories
- Money-back protection / AtlysProtect (refund if a supported application is refused after review)
- 2 million+ applications processed across 150+ destinations
- Appointment booking handled; real-time tracking; courier passport return
- ~90% faster processing through automation
- Exclusive MakeMyTrip flight partnership after approval

**Tools to link:** Passport Index, Rejection Recovery, DS-160 Fill Tool, US Mock Interview,
Visa Photo Creator, Visa Requirements Checker, Emergency Helpline, Appointment Tracker.

> Keep these claims accurate and current. They are marketing claims, not grounded facts;
> a reviewer owns their correctness.

---

## 9. SEO / GEO

- **Title + meta_description**: pack every major entity and subtopic (the samples list them all).
- **FAQPage + BreadcrumbList JSON-LD**: always ship both for hubs; JIJU emits FAQPage for FAQ blocks.
- **Internal linking**: link to related hubs, the apply page, and the relevant Atlys tools.
- **Entity coverage**: name the specific rules, forms, fees, and routes (Appendix V, DS-160,
  Section 214(b), ILR, ETA). This is what makes pages rank and what AI engines extract.

---

## 10. How JIJU maps to this today, and what to wire next

- **FAQs (live):** already extensive, keyword-rich, CTA-woven, dash-free, with FAQPage JSON-LD.
  Next: optionally add per-answer Atlys tool links and the at-a-glance/callout patterns.
- **Knowledge base (live):** produces the question bank that seeds hub FAQ sections and the agent.
- **Blog mode (planned):** implement the full §4 hub template (frontmatter → ... → dev schema),
  driven by the same grounding (SEMrush + live atlys.com) and the value-props library here.

---

## 11. Pre-publish checklist

- [ ] Zero em/en dashes (JIJU guarantees this; confirm on any hand edits).
- [ ] Every number/date/fee/citation verified against an official or atlys.com source.
- [ ] Tailored to the right citizenship/residence/destination; correct currency and idiom.
- [ ] CTAs present (early, section, closing) and varied; value-prop claims accurate.
- [ ] FAQ questions are `###` H3s; FAQPage JSON-LD generated.
- [ ] Internal links resolve; related hubs + tools linked.
- [ ] "Current as of <date>" + disclaimer present on long content.
