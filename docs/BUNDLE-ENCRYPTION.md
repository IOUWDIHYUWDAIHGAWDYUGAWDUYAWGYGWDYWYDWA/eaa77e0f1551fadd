# Bundle encryption and migration

Requires Node.js 22 and Python 3. No additional packages are required.

## Changes

- New bundles contain a ZIP encrypted using AES-256-GCM, with a versioned `VYBOTENC` header authenticated as additional data.
- The decoder also reads the deployed legacy `[16-byte IV][AES-256-CBC encrypted ZIP]` format. Legacy CBC is not authenticated; this compatibility does not make old bundles tamper-proof.
- The previous unversioned GCM/JSON encryptor output is not supported. It was already incompatible with the deployed CBC/ZIP decoder. Rebuild from your private source using these matched tools.
- No default encryption key, no key logging. A 64-character hexadecimal DECRYPTION_KEY environment variable is required. Positional-key input remains only for compatibility with the existing workflow; prefer environment input.
- Both operations use restricted temporary directories and remove temporary plaintext ZIPs. Encryption verifies a byte-for-byte round-trip before replacing bundle.enc. Decryption validates archive paths, sizes and configuration syntax before replacing src.
- Do not commit decrypted src, keys, plaintext ZIPs, .env files, or cookies. Keep runtime credentials in secret storage. Hard-coded credentials elsewhere in source are not automatically detected by these tools.

## Tests

Run `node --test tests/bundle-crypto.test.cjs`.

Local validation: 12 tests passed, covering GCM round-trip, unique nonces, wrong keys, tampering, truncation, legacy CBC, key validation, CLI round-trip, key-log absence, preservation on failure, ZIP traversal and legacy config repair. A separate private test verified all 51 supplied source files byte-for-byte without executing the bot. No private source, test key or test ciphertext was committed.

## Production migration is not completed by this code change

The deployed bundle.enc and GitHub Secrets are intentionally unchanged. A historical encryption script contained a hard-coded fallback key and printed keys; treat any key used through that path as exposed. Removing it from the current source does not remove it from Git history or old logs. Rotate credentials contained in affected archives as appropriate.

To migrate safely, coordinate a maintenance window:

1. Keep a private backup of the working encrypted bundle and its key. Suspend scheduled/manual bot starts while coordinating the update; do not rotate the Actions secret independently of its matching ciphertext.
2. In a trusted local environment, obtain a fresh random 32-byte key and store it securely. Set DECRYPTION_KEY without echoing it, using a protected environment/secret manager. Never put it in source, shell history, chat, or workflow logs.
3. Place the private source under src/ with index.js and deploy-commands.js. Run `node encrypt.js`. Test `node decrypt.js` in an isolated copy and compare source files. The existing missing-comma repair can normalize config.js during extraction.
4. Through GitHub's encrypted secret settings, set the matching DECRYPTION_KEY, and publish only the corresponding bundle.enc. Resume the workflow only once both are paired correctly. Never publish the key beside the bundle or as an artifact.
5. Check the decrypt/start steps in Actions. On failure, restore the prior ciphertext and matching secret together.

These changes do not implement Discord OAuth, change the website, or modify the running bot's settings API. OAuth still needs its client secret configured securely and a registered stable HTTPS callback address.
