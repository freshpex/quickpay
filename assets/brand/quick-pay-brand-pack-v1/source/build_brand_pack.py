"""Export the approved Quick Pay raster concept as a portable vector brand kit.

Local tools: python -m pip install --target .local/brand-tools vtracer resvg-py
Run from the repository root: python assets/brand/build_brand_pack.py
"""
from pathlib import Path
import sys, json, re, math, io, zipfile, hashlib
import xml.etree.ElementTree as ET
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / '.local/brand-tools'))
import vtracer
import resvg_py

OUT = ROOT / 'assets/brand/quick-pay-brand-pack-v1'
OUT.mkdir(parents=True, exist_ok=True)
VIOLET, INK, DEEP, WHITE = '#6D28D9', '#191425', '#2E1065', '#FFFFFF'
source = ROOT / 'assets/brand/quick-pay-logo-concept-v1.png'
original = Image.open(source).convert('RGBA')
NS = '{http://www.w3.org/2000/svg}'

def write(name, content):
    p = OUT / name
    p.parent.mkdir(parents=True, exist_ok=True)
    if isinstance(content, bytes): p.write_bytes(content)
    else: p.write_text(content, encoding='utf-8')
    return p

def trace(name, box):
    mask = original.getchannel('A').point(lambda a: 0 if a > 128 else 255).crop(box).convert('RGB')
    p = write(f'source/{name}-trace-mask.png', b'')
    mask.save(p)
    dest = OUT / f'source/{name}-trace.svg'
    vtracer.convert_image_to_svg_py(str(p), str(dest), colormode='binary', mode='spline',
        filter_speckle=32, corner_threshold=70, length_threshold=4, splice_threshold=45, path_precision=3)
    root = ET.parse(dest).getroot()
    paths = []
    for e in root.findall(f'{NS}path'):
        d, t = e.attrib['d'], e.attrib.get('transform', '')
        paths.append(f'<path d="{d}" transform="{t}"/>')
    assert paths
    return '\n'.join(paths), box[2]-box[0], box[3]-box[1]

mark, MW, MH = trace('symbol', (72,150,568,589))
word, WW, WH = trace('wordmark', (624,226,2123,548))

def svg(w,h,body,label='Quick Pay'):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-label="{label}"><title>{label}</title>{body}</svg>'

def group(paths,x=0,y=0,scale=1,color=VIOLET):
    return f'<g fill="{color}" transform="translate({x} {y}) scale({scale})">{paths}</g>'

def logo(mc,tc):
    return svg(2180,540, group(mark,50,50,color=mc)+group(word,602,126,color=tc))

def symbol(color):
    scale=420/MW
    return svg(512,512,group(mark,46,(512-MH*scale)/2,scale,color))

def tile(bg=VIOLET,fg=WHITE,coverage=.62,rounded=False):
    s=1024*coverage/MW
    return svg(1024,1024,f'<rect width="1024" height="1024" rx="{190 if rounded else 0}" fill="{bg}"/>'+group(mark,(1024-MW*s)/2,(1024-MH*s)/2,s,fg))

def render(name,data,width=None,height=None,rgb=False):
    content=resvg_py.svg_to_bytes(svg_string=data,width=width,height=height)
    im=Image.open(io.BytesIO(content))
    if rgb: im=im.convert('RGB')
    p=OUT/name
    p.parent.mkdir(parents=True,exist_ok=True)
    im.save(p)
    return im

logos={
 'primary':logo(VIOLET,DEEP),
 'violet':logo(VIOLET,VIOLET),
 'white':logo(WHITE,WHITE),
 'black':logo('#000000','#000000'),
}
for variant,data in logos.items():
    write(f'logos/svg/quick-pay-{variant}.svg',data)
    for width in [436,872,1744,2616]:
        render(f'logos/png/quick-pay-{variant}-{width}w.png',data,width=width)
for variant,c in [('violet',VIOLET),('white',WHITE),('black','#000000')]:
    data=symbol(c)
    write(f'symbols/svg/quick-pay-symbol-{variant}.svg',data)
    for size in [32,48,64,128,256,512,1024]:
        render(f'symbols/png/quick-pay-symbol-{variant}-{size}.png',data,width=size)

for name,data in [('header-light',logos['primary']),('header-dark',logos['white']),
                  ('footer-light',logos['primary']),('footer-dark',logos['white'])]:
    write(f'website/{name}.svg',data)
    render(f'website/{name}@2x.png',data,width=872)
for name,data in [('header-light',logos['primary']),('header-dark',logos['white'])]:
    write(f'mobile-headers/{name}.svg',data)
    for scale in [1,2,3]:
        render(f'mobile-headers/{name}@{scale}x.png',data,width=174*scale)
for variant,c in [('light',VIOLET),('dark',WHITE)]:
    write(f'mobile-headers/compact-{variant}.svg',symbol(c))
    for scale in [1,2,3]:
        render(f'mobile-headers/compact-{variant}@{scale}x.png',symbol(c),width=32*scale)

default=tile()
dark=tile(DEEP,WHITE)
tinted=tile('#202020',WHITE)
write('app-icons/app-icon-master.svg',default)
render('app-icons/app-icon-master-1024.png',default,width=1024,rgb=True)
write('app-icons/app-icon-dark.svg',dark)
render('app-icons/app-icon-dark-1024.png',dark,width=1024,rgb=True)

fav=tile(coverage=.70,rounded=True)
write('website/favicon.svg',fav)
for size in [16,32,48,64,96]:
    render(f'website/favicon-{size}x{size}.png',fav,width=size)
ico=render('website/favicon-source-256.png',fav,width=256)
ico.save(OUT/'website/favicon.ico',sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])
for size in [120,152,167,180]:
    render(f'website/apple-touch-icon-{size}x{size}.png',default,width=size,rgb=True)
render('website/apple-touch-icon.png',default,width=180,rgb=True)
for size in [192,512]:
    render(f'website/pwa-icon-{size}.png',default,width=size)
    render(f'website/pwa-maskable-{size}.png',tile(coverage=.56),width=size)
write('website/site.webmanifest',json.dumps({
 'name':'Quick Pay','short_name':'Quick Pay','start_url':'/','display':'standalone',
 'background_color':'#FAF9FF','theme_color':VIOLET,
 'icons':[{'src':f'/brand/pwa-icon-{s}.png','sizes':f'{s}x{s}','type':'image/png','purpose':'any'} for s in [192,512]]+
 [{'src':f'/brand/pwa-maskable-{s}.png','sizes':f'{s}x{s}','type':'image/png','purpose':'maskable'} for s in [192,512]]},indent=2))
write('website/head-example.html','''<!-- Copy the website folder contents to public/brand first. -->
<link rel="icon" href="/brand/favicon.ico" sizes="any">
<link rel="icon" href="/brand/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/brand/apple-touch-icon.png" sizes="180x180">
<link rel="manifest" href="/brand/site.webmanifest">
<meta name="theme-color" content="#6D28D9">
<!-- Use header-light.svg on light surfaces and header-dark.svg on dark surfaces. -->
''')

modern=[]
for name,data,appearance in [('default',default,None),('dark',dark,'dark'),('tinted',tinted,'tinted')]:
    filename=f'app-icon-{name}-1024.png'
    render(f'apple/modern/AppIcon.appiconset/{filename}',data,width=1024,rgb=True)
    item={'filename':filename,'idiom':'universal','platform':'ios','size':'1024x1024'}
    if appearance: item['appearances']=[{'appearance':'luminosity','value':appearance}]
    modern.append(item)
write('apple/modern/AppIcon.appiconset/Contents.json',json.dumps({'images':modern,'info':{'author':'xcode','version':1}},indent=2))
legacy=[]
for idiom,sizes,scales in [('iphone',[20,29,40,60],[2,3]),('ipad',[20,29,40,76],[1,2])]:
    for pt in sizes:
        for scale in scales:
            px=int(pt*scale); filename=f'{idiom}-{pt}pt@{scale}x.png'
            render(f'apple/legacy/AppIcon.appiconset/{filename}',default,width=px,rgb=True)
            legacy.append({'filename':filename,'idiom':idiom,'size':f'{pt}x{pt}','scale':f'{scale}x'})
render('apple/legacy/AppIcon.appiconset/ipad-83.5pt@2x.png',default,width=167,rgb=True)
legacy.append({'filename':'ipad-83.5pt@2x.png','idiom':'ipad','size':'83.5x83.5','scale':'2x'})
render('apple/legacy/AppIcon.appiconset/app-store-1024.png',default,width=1024,rgb=True)
legacy.append({'filename':'app-store-1024.png','idiom':'ios-marketing','size':'1024x1024','scale':'1x'})
write('apple/legacy/AppIcon.appiconset/Contents.json',json.dumps({'images':legacy,'info':{'author':'xcode','version':1}},indent=2))
render('apple/app-store-1024.png',default,width=1024,rgb=True)
write('apple/icon-composer-source/foreground.svg',svg(1024,1024,group(mark,194.56,(1024-MH*(634.88/MW))/2,634.88/MW,WHITE)))
write('apple/icon-composer-source/background.svg',svg(1024,1024,f'<rect width="1024" height="1024" fill="{VIOLET}"/>'))

# Android layers are 108dp. The mark's full bounding-box diagonal is 62dp,
# inside the central 66dp safe circle even under circular launcher masks.
AS=62/math.hypot(MW,MH)
AX=(108-MW*AS)/2; AY=(108-MH*AS)/2
adaptive=svg(108,108,group(mark,AX,AY,AS,WHITE))
write('android/adaptive/foreground.svg',adaptive)
write('android/adaptive/monochrome.svg',adaptive)
write('android/adaptive/background.svg',svg(108,108,f'<rect width="108" height="108" fill="{VIOLET}"/>'))
render('android/adaptive/foreground-432.png',adaptive,width=432)
render('android/adaptive/monochrome-432.png',adaptive,width=432)
render('android/google-play-512.png',default,width=512)

paths=ET.fromstring(svg(MW,MH,mark)).findall(f'.//{NS}path')
android_paths=[]
for p in paths:
    t=p.attrib.get('transform','')
    vals=re.findall(r'-?\d+(?:\.\d+)?',t)
    dx,dy=(float(vals[0]),float(vals[1])) if len(vals)>=2 else (0,0)
    android_paths.append(f'<group android:translateX="{dx}" android:translateY="{dy}"><path android:fillColor="#FFFFFFFF" android:pathData="{p.attrib["d"]}"/></group>')
vector=f'<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108"><group android:translateX="{AX}" android:translateY="{AY}" android:scaleX="{AS}" android:scaleY="{AS}">'+''.join(android_paths)+'</group></vector>'
write('android/res/drawable/ic_launcher_foreground.xml',vector)
write('android/res/drawable/ic_launcher_monochrome.xml',vector)
write('android/res/values/colors.xml',f'<resources><color name="quick_pay_icon_background">{VIOLET}</color></resources>')
for version in [26,33]:
    body='<background android:drawable="@color/quick_pay_icon_background"/><foreground android:drawable="@drawable/ic_launcher_foreground"/>'
    if version==33: body+='<monochrome android:drawable="@drawable/ic_launcher_monochrome"/>'
    xml='<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">'+body+'</adaptive-icon>'
    for name in ['ic_launcher','ic_launcher_round']:
        write(f'android/res/mipmap-anydpi-v{version}/{name}.xml',xml)
for density,size,layer in [('mdpi',48,108),('hdpi',72,162),('xhdpi',96,216),('xxhdpi',144,324),('xxxhdpi',192,432)]:
    render(f'android/res/mipmap-{density}/ic_launcher.png',default,width=size)
    im=Image.open(io.BytesIO(resvg_py.svg_to_bytes(svg_string=default,width=size))).convert('RGBA')
    mask=Image.new('L',(size*4,size*4),0); ImageDraw.Draw(mask).ellipse((0,0,size*4-1,size*4-1),fill=255)
    im.putalpha(mask.resize((size,size),Image.Resampling.LANCZOS)); im.save(OUT/f'android/res/mipmap-{density}/ic_launcher_round.png')
    render(f'android/adaptive/png/{density}/foreground.png',adaptive,width=layer)
    render(f'android/adaptive/png/{density}/monochrome.png',adaptive,width=layer)

write('android/manifest-example.xml','''<!-- Merge these attributes into your existing application element. -->
<application xmlns:android="http://schemas.android.com/apk/res/android"
    android:icon="@mipmap/ic_launcher"
    android:roundIcon="@mipmap/ic_launcher_round"
    android:label="Quick Pay" />
''')

# A genuine vector contact sheet plus a PNG preview for immediate inspection.
panels=[(50,170,logos['primary'],'#FAF9FF'),(830,170,logos['white'],DEEP),
        (50,430,logos['violet'],'#FFFFFF'),(830,430,logos['white'],VIOLET)]
body='<rect width="1600" height="1200" fill="#F0EDF7"/>'
body+='<text x="50" y="72" font-family="Segoe UI, sans-serif" font-size="38" font-weight="700" fill="#191425">Quick Pay / Brand asset pack</text>'
body+='<text x="50" y="112" font-family="Segoe UI, sans-serif" font-size="21" fill="#51465F">Violet + white / website, mobile, favicon and launcher assets</text>'
for x,y,data,bg in panels:
    body+=f'<rect x="{x}" y="{y}" width="720" height="220" rx="24" fill="{bg}"/>'
    inner=re.sub(r'^<svg[^>]*>|</svg>$','',data)
    body+=f'<g transform="translate({x+40} {y+31}) scale({640/2180})">{inner}</g>'
for i,(data,label) in enumerate([(default,'App icon'),(dark,'Dark app icon'),(tile('#FAF9FF',VIOLET),'Light variant'),(tile(VIOLET,WHITE,.70,True),'Favicon')]):
    x=80+i*385
    inner=re.sub(r'^<svg[^>]*>|</svg>$','',data)
    body+=f'<g transform="translate({x} 760) scale({280/1024})">{inner}</g>'
    body+=f'<text x="{x}" y="1090" font-family="Segoe UI, sans-serif" font-size="23" fill="#191425">{label}</text>'
preview=svg(1600,1200,body,'Quick Pay brand pack preview')
write('preview/brand-pack-preview.svg',preview)
render('preview/brand-pack-preview.png',preview,width=1600)
render('app-icons/app-icon-light-1024.png',tile('#FAF9FF',VIOLET),width=1024,rgb=True)

readme='''# Quick Pay brand pack v1

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
'''
write('README.md',readme)
write('source/build_brand_pack.py',Path(__file__).read_bytes())

checks={'svg_count':0,'png_count':0,'xml_count':0,'errors':[]}
for p in sorted(OUT.rglob('*')):
    if p.suffix=='.svg':
        el=ET.parse(p).getroot(); checks['svg_count']+=1
        assert not el.findall(f'.//{NS}image'),p
        assert not el.findall(f'.//{NS}text') or 'preview' in str(p),p
        resvg_py.svg_to_bytes(svg_path=str(p),width=64)
    elif p.suffix=='.xml': ET.parse(p); checks['xml_count']+=1
    elif p.suffix=='.png':
        with Image.open(p) as im:
            im.load(); checks['png_count']+=1
            relative=p.relative_to(OUT).as_posix()
            if relative.startswith(('logos/png/','symbols/png/','mobile-headers/')):
                assert im.mode=='RGBA' and im.getchannel('A').getextrema()==(0,255),p
            if 'apple/' in p.relative_to(OUT).as_posix() and 'trace' not in p.name:
                assert im.mode=='RGB',p
    elif p.name=='Contents.json':
        for entry in json.loads(p.read_text())['images']:
            assert (p.parent/entry['filename']).exists(),entry
with Image.open(OUT/'website/favicon.ico') as im:
    checks['favicon_sizes']=sorted([list(s) for s in im.ico.sizes()])
    assert (16,16) in im.ico.sizes() and (32,32) in im.ico.sizes()
assert Image.open(OUT/'android/google-play-512.png').size==(512,512)
assert (OUT/'android/google-play-512.png').stat().st_size<1024*1024
for p in (OUT/'android/res').rglob('*.xml'):
    for reference in re.findall(r'@(?:drawable|color)/([a-z_]+)',p.read_text()):
        if reference=='quick_pay_icon_background':
            assert reference in (OUT/'android/res/values/colors.xml').read_text()
        else:
            assert (OUT/f'android/res/drawable/{reference}.xml').exists(),reference
checks['android_safe_circle_diameter_dp']=62
checks['apple_modern_appearances']=['default','dark','tinted']
checks['native_compilation_verified']=False
write('verification.json',json.dumps(checks,indent=2))
inventory=[]
for p in sorted(OUT.rglob('*')):
    if p.is_file() and p.name!='inventory.json': inventory.append({'path':p.relative_to(OUT).as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
write('inventory.json',json.dumps(inventory,indent=2))
archive=OUT.parent/'quick-pay-brand-pack-v1.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
    for p in sorted(OUT.rglob('*')):
        if p.is_file(): z.write(p,Path(OUT.name)/p.relative_to(OUT))
with zipfile.ZipFile(archive) as z: assert z.testzip() is None
print(json.dumps({'archive':str(archive),'files':len(inventory)+1,'checks':checks,'zip_bytes':archive.stat().st_size},indent=2))
