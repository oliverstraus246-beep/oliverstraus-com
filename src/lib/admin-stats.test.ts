import { describe, it, expect } from "vitest"
import {
  campaignLabel,
  classifyChannel,
  computeConversionRate,
  computeEngagementScore,
  computeHighIntent,
  computeLifecycleStage,
  groupIntoSessions,
} from "./admin-stats"

describe("groupIntoSessions", () => {
  it("returns zeroes for no visits", () => {
    expect(groupIntoSessions([])).toEqual({ sessionCount: 0, pagesPerSession: 0, bounceRate: 0 })
  })

  it("treats one visit as one bounced session", () => {
    expect(groupIntoSessions(["2026-10-20T10:00:00.000Z"])).toEqual({
      sessionCount: 1,
      pagesPerSession: 1,
      bounceRate: 100,
    })
  })

  it("keeps views under the gap in the same session", () => {
    const result = groupIntoSessions([
      "2026-10-20T10:00:00.000Z",
      "2026-10-20T10:05:00.000Z",
      "2026-10-20T10:10:00.000Z",
    ])
    expect(result).toEqual({ sessionCount: 1, pagesPerSession: 3, bounceRate: 0 })
  })

  it("splits views separated by more than the gap into separate sessions", () => {
    const result = groupIntoSessions([
      "2026-10-20T10:00:00.000Z",
      "2026-10-20T10:05:00.000Z",
      "2026-10-20T12:00:00.000Z",
    ])
    // Session 1: two views (not a bounce). Session 2: one view (a bounce).
    expect(result.sessionCount).toBe(2)
    expect(result.bounceRate).toBe(50)
  })

  it("sorts out-of-order timestamps before bucketing", () => {
    const result = groupIntoSessions([
      "2026-10-20T10:05:00.000Z",
      "2026-10-20T10:00:00.000Z",
      "2026-10-20T10:02:00.000Z",
    ])
    expect(result.sessionCount).toBe(1)
  })

  it("respects a custom gap", () => {
    const result = groupIntoSessions(["2026-10-20T10:00:00.000Z", "2026-10-20T10:04:00.000Z"], 2)
    expect(result.sessionCount).toBe(2)
  })
})

describe("computeHighIntent", () => {
  it("flags a contact-form submitter regardless of page views", () => {
    expect(
      computeHighIntent({ viewedKeyPage: false, maxDurationMs: 0, contacted: true, downloaded: false }),
    ).toBe(true)
  })

  it("flags a downloader regardless of page views", () => {
    expect(
      computeHighIntent({ viewedKeyPage: false, maxDurationMs: 0, contacted: false, downloaded: true }),
    ).toBe(true)
  })

  it("flags a key-page view with real time on page", () => {
    expect(
      computeHighIntent({ viewedKeyPage: true, maxDurationMs: 15_000, contacted: false, downloaded: false }),
    ).toBe(true)
  })

  it("does not flag a key-page bounce", () => {
    expect(
      computeHighIntent({ viewedKeyPage: true, maxDurationMs: 2_000, contacted: false, downloaded: false }),
    ).toBe(false)
  })

  it("does not flag a non-key page with real time on it", () => {
    expect(
      computeHighIntent({ viewedKeyPage: false, maxDurationMs: 60_000, contacted: false, downloaded: false }),
    ).toBe(false)
  })

  it("flags a key-page view scrolled past halfway, even with no real time recorded", () => {
    expect(
      computeHighIntent({
        viewedKeyPage: true,
        maxDurationMs: 0,
        maxScrollPct: 75,
        contacted: false,
        downloaded: false,
      }),
    ).toBe(true)
  })

  it("does not flag a key-page view scrolled only a little with no real time either", () => {
    expect(
      computeHighIntent({
        viewedKeyPage: true,
        maxDurationMs: 0,
        maxScrollPct: 20,
        contacted: false,
        downloaded: false,
      }),
    ).toBe(false)
  })
})

describe("computeConversionRate", () => {
  it("is 0 with no viewers at all", () => {
    expect(computeConversionRate(0, 0)).toBe(0)
  })

  it("rounds to one decimal place", () => {
    expect(computeConversionRate(6, 1)).toBe(16.7)
    expect(computeConversionRate(11, 1)).toBe(9.1)
  })

  it("is 100 when every viewer downloaded", () => {
    expect(computeConversionRate(4, 4)).toBe(100)
  })
})

describe("classifyChannel", () => {
  it("is Direct with no referrer and no UTM", () => {
    expect(classifyChannel(null, null, null)).toBe("Direct")
  })

  it("recognizes a search engine referrer as Organic search", () => {
    expect(classifyChannel("google.com", null, null)).toBe("Organic search")
    expect(classifyChannel("duckduckgo.com", null, null)).toBe("Organic search")
  })

  it("recognizes a social referrer as Social", () => {
    expect(classifyChannel("l.instagram.com", null, null)).toBe("Social")
  })

  it("falls back to Referral for an unrecognized referrer", () => {
    expect(classifyChannel("news.ycombinator.com", null, null)).toBe("Referral")
  })

  it("prefers an explicit UTM medium over referrer guessing", () => {
    expect(classifyChannel("google.com", "newsletter", "email")).toBe("Email")
  })

  it("treats a paid UTM medium as Paid", () => {
    expect(classifyChannel(null, "google", "cpc")).toBe("Paid")
  })

  it("treats a social UTM medium as Social", () => {
    expect(classifyChannel(null, "linkedin", "social")).toBe("Social")
  })

  it("treats any other UTM source with no referrer as Referral", () => {
    expect(classifyChannel(null, "newsletter-tool", "link")).toBe("Referral")
  })
})

describe("computeEngagementScore", () => {
  it("is 0 for a visitor with no engagement at all", () => {
    expect(
      computeEngagementScore({
        sessionCount: 1,
        maxDurationMs: 0,
        maxScrollPct: 0,
        bounceRate: 100,
        contacted: false,
        downloaded: false,
      }),
    ).toBe(0)
  })

  it("is 100 when every factor maxes out", () => {
    expect(
      computeEngagementScore({
        sessionCount: 3,
        maxDurationMs: 300_000,
        maxScrollPct: 100,
        bounceRate: 0,
        contacted: true,
        downloaded: true,
      }),
    ).toBe(100)
  })

  it("never goes negative or over 100", () => {
    const score = computeEngagementScore({
      sessionCount: 10,
      maxDurationMs: 10_000_000,
      maxScrollPct: 500,
      bounceRate: -50,
      contacted: true,
      downloaded: true,
    })
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it("rewards contacting even with otherwise no engagement", () => {
    const score = computeEngagementScore({
      sessionCount: 1,
      maxDurationMs: 0,
      maxScrollPct: 0,
      bounceRate: 100,
      contacted: true,
      downloaded: false,
    })
    expect(score).toBe(15)
  })
})

describe("computeLifecycleStage", () => {
  it("is New for a first-time, unengaged visitor", () => {
    expect(computeLifecycleStage({ visitCount: 1, highIntent: false, contacted: false, downloaded: false })).toBe(
      "New",
    )
  })

  it("is Returning for a repeat visitor with no other signal", () => {
    expect(computeLifecycleStage({ visitCount: 3, highIntent: false, contacted: false, downloaded: false })).toBe(
      "Returning",
    )
  })

  it("is Engaged when high-intent but no download or contact", () => {
    expect(computeLifecycleStage({ visitCount: 1, highIntent: true, contacted: false, downloaded: false })).toBe(
      "Engaged",
    )
  })

  it("is Customer when they downloaded something", () => {
    expect(computeLifecycleStage({ visitCount: 1, highIntent: false, contacted: false, downloaded: true })).toBe(
      "Customer",
    )
  })

  it("is Lead when they contacted, even if they also downloaded", () => {
    expect(computeLifecycleStage({ visitCount: 5, highIntent: true, contacted: true, downloaded: true })).toBe(
      "Lead",
    )
  })
})

describe("campaignLabel", () => {
  it("is null with neither source nor medium", () => {
    expect(campaignLabel(null, null)).toBeNull()
  })

  it("joins source and medium", () => {
    expect(campaignLabel("linkedin", "social")).toBe("linkedin / social")
  })

  it("falls back to whichever one is set", () => {
    expect(campaignLabel("linkedin", null)).toBe("linkedin")
    expect(campaignLabel(null, "email")).toBe("email")
  })
})
