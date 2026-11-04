# Quick Pay brand pack v1

## Which version to use
- Light website/header/footer: website/header-light.svg or footer-light.svg.
- Dark/violet website/header/footer: website/header-dark.svg or footer-dark.svg (white transparent artwork).
- Mobile headers: mobile-headers contains full and compact logos with 1x/2x/3x PNG exports.
- Standalone brand symbol: symbols/svg, with transparent PNG exports under symbols/png.
- Monochrome printing: logos/svg/quick-pay-black.svg or quick-pay-white.svg.
- Full logo: logos/svg; primary = violet symbol plus deep-purple lettering.
- Website tabs: website/favicon.svg or favicon.ico. The ICO contains 16–256px frames.
- iPhone home-screen website bookmark: website/apple-touch-icon.png.
- PWA: copy website assets to public/brand and use site.webmanifest. Adjust start_url and scope if the app is hosted in a subdirectory.
- Apple modern asset catalog: apple/modern/AppIcon.appiconset (default, dark, tinted).
- Apple legacy size catalog: apple/legacy/AppIcon.appiconset. Choose the catalog suitable for your Xcode target; do not import both under the same asset name.
- App Store image: apple/app-store-1024.png (opaque RGB, square, no baked-in rounded corners).
- Apple Icon Composer: import foreground.svg and background.svg from apple/icon-composer-source. These are source layers, not a compiled .icon file.
- Android: merge android/res into the native project's res directory. See manifest-example.xml. Preserve your existing colors and resource names when merging.
- Android includes legacy density PNGs, circular PNGs, adaptive foreground/background resources, API 33 monochrome resources, SVG layers and PNG layer exports.
- Google Play listing: android/google-play-512.png.

## Design and source
Violet #6D28D9; deep purple #2E1065; warm white #FAF9FF; lime #D9F86C; ink #191425.
These are cleaned, flat-color vector traces of the original generated Quick Pay concept. Symbol and lettering are paths, not embedded PNGs and not live fonts. The subtle raster gradients have deliberately been replaced with consistent brand colors. Original raster concept is retained outside this pack.
Do not stretch the logo, alter the spacing, add shadows, or redraw it independently for each platform. Keep at least half the symbol width clear around the full logo when layout permits. At very small sizes, use the symbol instead of the full wordmark. White transparent files need a dark surface to be visible.

## Verification and limits
All SVGs and Android XML are parsed locally. PNG dimensions, alpha behavior, Apple catalogs, Android resource references, favicon frames and ZIP integrity are checked by the exporter. The preview is rendered from the exported vector geometry.
The pack is an asset export, not an Apple/Google submission. Xcode asset compilation, Icon Composer appearance tuning and Android device launcher behavior need verification inside the eventual native projects. No trademark-clearance claim is made.

## Official platform references
- https://developer.apple.com/design/human-interface-guidelines/app-icons/
- https://developer.apple.com/documentation/xcode/creating-your-app-icon-using-icon-composer
- https://developer.android.com/develop/ui/compose/system/icon_design_adaptive
- https://support.google.com/googleplay/android-developer/answer/9866151

## Rebuilding
The reproducible Python exporter is alongside the original concept at assets/brand/build_brand_pack.py. It uses Pillow, VTracer and resvg-py; it does not change application dependencies.
