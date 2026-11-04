# Asset register

Downloaded and inspected on 4 November 2026. All assets are served locally; no placeholder image service or AI-generated person was used. Third-party marks identify catalog subjects and do not imply partnership or endorsement. Stock subjects are models, not testimonials.

| Local asset | Source / author | Usage rights and processing |
|---|---|---|
| `apps/web/public/media/lagos-woman.jpg` | [Smiling Woman with Smartphone in Lagos](https://www.pexels.com/photo/smiling-woman-with-smartphone-in-lagos-30677594/), Ninthgrid | [Pexels license](https://www.pexels.com/license/), commercial use and modification allowed; attribution appreciated, not required. Locally downloaded 1200px JPEG. Used in hero. No endorsement claim. |
| `person-poster.jpg`, `walking.mp4` | [Woman Using Her Phone](https://www.pexels.com/video/woman-using-her-phone-7966944/), Darlene Alderson | Pexels license. Poster 1200px. Original 3840×2160 MP4 locally transcoded to 960px, H.264, no audio, fast-start, ~805 KiB. Desktop only; poster on mobile/reduced motion/failure. Visible credit. |
| `mtn.jpg` | [New MTN logo](https://commons.wikimedia.org/wiki/File:New-mtn-logo.jpg), Wikimedia Commons | Public-domain simple text/geometric logo (PD-textlogo), authored by MTN, source mtn.co.za per Commons. Preserve trademark restrictions; no affiliation claimed. Nominative catalog identification. |
| `airtel.svg`, `apple.svg`, `steam.svg` | [Simple Icons source](https://github.com/simple-icons/simple-icons/tree/develop/icons), respective trademark owners | [Simple Icons CC0 source license](https://github.com/simple-icons/simple-icons/blob/develop/LICENSE.md); trademark rights remain with owners. Retain silhouettes and proportions. SVG files are downloaded originals, not invented logos. |
| `amazon.svg` | [Simple Icons v13.21.0 Amazon asset](https://github.com/simple-icons/simple-icons/blob/13.21.0/icons/amazon.svg), Amazon trademark | CC0 icon source; brand trademark rights remain. Catalog preview only; commercial supplier access not established. |
| Quick Pay wordmarks, symbols and web icons | User-supplied `assets/brand/quick-pay-brand-pack-v1/` | Authoritative brand artwork, copied byte-for-byte by `pnpm brand:sync`. Vector lettering is already included in full lockups; no added lettering, redrawing, stretching or logo effects. The pack documents traced concept provenance; no trademark-clearance claim. |
| Action icons | [Lucide](https://lucide.dev/license) | ISC license via installed package. Consistent action-related icons. No Sparkles icon. |

No stock image is sold as standalone media or used as the Quick Pay trademark. Commercial brand-guideline review is still required before public launch. The source licenses do not establish commercial gift-card resale rights.

## Quick Pay placement map

The shared `Wordmark`/`BrandLogo` component selects the supplied artwork. `light` requests white artwork for a dark surface; the source pack calls this the `dark` variant.

| Placement | Original pack asset |
|---|---|
| Marketing, admin, support and policy headers; customer sidebar | `website/header-light.svg` |
| Authentication dark panel | `website/header-dark.svg` |
| Marketing dark footer | `website/footer-dark.svg` |
| Customer and authentication mobile headers | `mobile-headers/header-light.svg` |
| Small product illustrations on light / dark surfaces | `mobile-headers/compact-light.svg` / `compact-dark.svg` (symbol only) |
| Browser tab and conventional `/favicon.ico` | `website/favicon.svg`, PNG sizes, original multi-size ICO |
| Apple home-screen bookmark | `website/apple-touch-icon.png` |
| PWA normal and maskable icons | Original `website/site.webmanifest` and its 192/512px PNGs |
| Open Graph and Twitter share card | Original `website/header-dark@2x.png`, composed on deep purple with existing tagline at 1200×630; lettering is not recreated |

`scripts/sync-brand.ts` runs before web development and builds, publishing the original website files under `apps/web/public/brand` plus the relevant mobile SVGs. Native Apple/Android exports remain in the source pack for eventual native apps. All five CSS theme tokens already match the pack README exactly. Keep white artwork on dark surfaces and preserve logo proportions and clear space.

Set `NEXT_PUBLIC_SITE_URL` to the deployed public web origin before building so social metadata contains the correct absolute URLs. It falls back to `WEB_ORIGIN`, then localhost for local development. Manifest icons support home-screen branding; they do not add offline behavior.
