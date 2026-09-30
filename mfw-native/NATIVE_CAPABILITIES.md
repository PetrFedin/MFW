# Native capability readiness

This file is a deployment checklist, not a claim that Apple credentials already exist.

| Capability | App code | Server contract | Apple dependency | Current status |
|---|---:|---:|---|---|
| Native haptics | ready | n/a | none | prepared |
| Native QR scanner | bridge ready | access/network authority ready | camera usage description | prepared; AVFoundation plugin target pending generated iOS project |
| APNs push | bridge ready | notification authority exists | Apple Team + APNs entitlement | prepared, not activated |
| Universal Links | route handler ready | web routes exist | final bundle ID + AASA + Associated Domains | prepared, not activated |
| Wallet | PassKit bridge contract ready | live pass authority exists | Pass Type ID + pass signing certificate | prepared, signing not configured |
| TestFlight | Capacitor v8 config ready | production API needed | Apple Team + App Store Connect + signing | not publishable until credentials |
| Camera permission | fallback works in PWA | n/a | NSCameraUsageDescription | pending generated Xcode target |
| Keychain | optional next hardening | JWK/revocation data available | Security framework | not yet required for investor build |

## Wallet product rule

Wallet must not contain the reusable equivalent of the rotating gate token.

The Wallet pass should carry:
- season/event identity;
- venue/date;
- credential summary;
- safe barcode/deep link that opens the app;
- update capability.

The app then retrieves/refreshes the short-lived ES256 gate credential. This preserves revocation and duplicate check-in authority.

## Production activation sequence

1. Approve final bundle identifier.
2. Add Apple Developer Team and App Store Connect app.
3. Generate iOS platform with Capacitor v8.
4. Add camera usage description and Associated Domains.
5. Host finalized AASA at the production HTTPS domain.
6. Configure APNs environment and server token/certificate flow.
7. Create Pass Type ID and server-side .pkpass signing if Wallet is in scope.
8. Build archive, validate privacy strings, distribute to internal TestFlight.
