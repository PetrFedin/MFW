# MFW Native iOS shell

This directory prepares the existing MFW web/PWA investor build for a native iOS/TestFlight shell without forking business logic.

## Current target

- Capacitor v8 native container.
- Russian is the default locale; English remains a presentation-layer switch.
- Web authority remains the source of truth for identity, entitlements, programme, streaming, commerce, sponsors, networking and analytics.
- Native code provides device capabilities only.

## Native boundaries

| Capability | Web/PWA today | Native iOS target |
|---|---|---|
| Gate QR | jsQR + camera | AVFoundation scanner through MFWScanner |
| Connect QR | separate jsQR flow | same MFWScanner, mode=networking |
| Push | web demo state | APNs through Capacitor Push Notifications |
| Haptics | CSS/vibrate fallback | Capacitor Haptics |
| Deep links | web routes | Universal Links + Capacitor App URL events |
| Wallet | not authoritative | PassKit add-pass flow; never replaces rotating in-app gate QR |
| Offline pass verify | WebCrypto + cached JWK | same cryptographic contract, optionally Keychain-backed cache |

## Security rule: Wallet != live gate credential

The live MFW entry QR is a short-lived ES256 credential with revocation and duplicate check-in authority. An Apple Wallet pass must not become a static substitute for it.

Recommended Wallet product:
- event/season identity card;
- date, venue, role/credential summary;
- non-sensitive barcode or deep link that opens the current in-app pass;
- updates/notifications when the programme changes.

Actual .pkpass signing requires an Apple Pass Type ID certificate and server-side signing; it must remain disabled until credentials are configured.

## Universal links

Production domain should serve:

`/.well-known/apple-app-site-association`

and the Xcode target should have:

`applinks:<production-mfw-domain>`

Routes:
- `/event/:id`
- `/brand/:id`
- `/pass`
- `/meetup/:id`

All inbound identifiers must be validated by the app and re-authorized by the server before any protected action.

## TestFlight prerequisites not stored in this repo

1. Apple Developer Team.
2. Final bundle identifier.
3. Distribution certificate / automatic signing authorization.
4. App Store Connect app record.
5. APNs entitlement/provisioning.
6. Associated Domains entitlement and production domain.
7. Pass Type ID + certificate if Wallet is activated.
8. Privacy usage descriptions and final data-processing disclosures.

Until those exist, the repository can be build-ready but cannot truthfully be called TestFlight-published.
