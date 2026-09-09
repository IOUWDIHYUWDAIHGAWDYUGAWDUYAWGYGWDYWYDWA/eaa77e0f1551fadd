# Live panel management

The bot authenticates to Cloudflare with short-lived GitHub Actions OIDC identity. No bot token or new long-lived panel credential is transmitted. Only the named repository, main branch and workflow are accepted.

The existing encrypted bundle.enc is unchanged. A public credential-free preload adapter attaches to the primary Discord.js client and does not publish decrypted source. Settings remain pending until the running bot validates and acknowledges the exact saved version.

Modules default off: link filter; repeated-message filter (fourth identical message in eight seconds); additional welcome message; separate panel XP (+10 per eligible message per minute, 100 XP per level). Existing encrypted bot handlers and rank data remain unchanged. Private D1 stores settings, member counts, modifier IDs and panel XP—not message contents.

Validated locally with 10 tests: OIDC restrictions and signature tampering, schema validation, CSRF and Discord permissions, stale presence, versioned acknowledgment, XP idempotency, moderation, welcome, permission rejection and spam exemptions. Live connectivity must be checked after Actions restarts.
