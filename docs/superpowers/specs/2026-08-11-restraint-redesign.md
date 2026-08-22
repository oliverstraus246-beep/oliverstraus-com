# 2026-08-11 — Restraint redesign + real venture pages

## Context

Oliver rejected the current site outright ("I hate everything about this
website... does not look professional one bit") and handed over full
creative direction ("Just do whatever you want... take this project in a
whole other direction"). Two concrete requirements came with that:

1. It needs to look genuinely professional, cybersecurity/hacker-adjacent,
   dark + white + blue — but restrained, not gimmicky. Research on
   CrowdStrike, HackerOne, and SentinelOne's real marketing sites (done
   earlier this session) confirms: none of them use literal hacker tropes.
   What reads as expensive is a disciplined dark palette + one accent color
   + clean typography + technical credibility through data/precision, not
   through decoration.
2. Each venture (Topher Straus Fine Art, Imperial Detailing, etc.) needs a
   real detail page that "genuinely shows stuff," not a modal. The venture
   modal built last session was already a step up from fully-dead markup,
   but a modal caps how much real content it can hold.
3. Content is stale — a real project, THE REAPER (a multi-band ESP32-S3
   wireless pentesting device, `~/Sandbox/esp32-div`, real GitHub repo
   `oliverstraus246-beep/the-reaper`, MIT-licensed fork of the open-source
   ESP32-DIV project), exists and isn't represented anywhere on the site.

## Decisions

**Strip, don't add.** The custom cursor's blue glow + traveling dash pulse
and the social-links particle carousel's 3D spin/scatter physics are cut.
Both were individually-reasoned additions from the prior session that,
per Oliver's own reaction, add up to "doesn't look professional" rather
than "polished." Replacing them with quieter equivalents (a plain cursor
mark, a plain icon/text social row) is the correction, not a new trick to
replace the old one.

**Ventures move from modal to real routes.** `/work/[slug]/page.tsx`,
one per venture, linked from the homepage grid instead of opened in a
`VentureModal`. Venture data moves to a single shared module
(`src/lib/ventures.ts`) so the homepage grid and detail pages read from
one source of truth — no duplicated facts to drift out of sync.

**THE REAPER joins as a seventh venture**, sourced only from its own
`README.md` and `LICENSE` (feature list by radio/protocol, MIT license
with required CiferTech attribution, real logo asset). No GitHub link —
the repo is currently private (confirmed via a live API call, 404).

**Hero stays text-only.** Not revisited in this pass — matches the
restrained direction and every real reference site checked.

## What's explicitly out of scope for this pass

- Press section real routing (still blocked on Oliver confirming or
  providing real destinations for content; existing 3-item trim from
  earlier this session stands).
- Spotlight-card hover glow — already subtle, left as is.
- Any new hero visual centerpiece.

## Verification

Typecheck, full test suite, and a real-browser pass (not the sandboxed
preview, which has a documented visibility bug in this environment) after
implementation. GitNexus `impact()` before touching `VenturesSection`,
`VentureModal`, `Hero`-adjacent cursor code; `detect_changes()` before
calling this done.
