from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path
from math import sin
import os, struct

root=Path(__file__).resolve().parents[1]
assets=root/'src'/'HuroofAlKora'/'Assets'
assets.mkdir(parents=True,exist_ok=True)
fontpath='/usr/share/fonts/truetype/noto/NotoKufiArabic-Black.ttf'
if not Path(fontpath).exists():
    import subprocess
    fontpath=subprocess.check_output(['fc-match','-f','%{file}','Noto Kufi Arabic:style=Black'],text=True)

def master_icon():
    n=1024
    im=Image.new('RGBA',(n,n),(10,19,41,255));d=ImageDraw.Draw(im)
    for y in range(n):
        t=y/(n-1)
        d.line((0,y,n,y), fill=(int(7+17*t),int(17+16*t),int(36+27*t),255))
    # subtle hex/cell grid, game themed
    for x in range(118,960,150):
        for y in range(90,970,150):
            d.rounded_rectangle((x,y,x+118,y+118),radius=27,outline=(32,58,90,150),width=5)
    d.rounded_rectangle((54,54,970,970),radius=224,outline=(83,116,166,180),width=14)
    d.ellipse((115,100,904,889), fill=(16,35,70,255), outline=(42,116,150,255),width=24)
    # football and little streak decorations
    d.arc((196,166,824,796), 22, 151, fill=(49,217,146),width=32)
    d.arc((194,165,826,797), 192, 303, fill=(80,160,252),width=32)
    # big Arabic letter
    font=ImageFont.truetype(fontpath,580)
    text='ح'
    bbox=d.textbbox((0,0), text, font=font, anchor='mm', direction='rtl')
    d.text((512,479),text,font=font,fill=(244,249,255),anchor='mm',direction='rtl',stroke_width=3,stroke_fill=(230,244,255))
    # ball in lower corner
    cx,cy,r=768,759,107
    d.ellipse((cx-r,cy-r,cx+r,cy+r),fill=(239,245,249),outline=(20,37,68),width=13)
    pts=[(cx,cy-48),(cx+48,cy-15),(cx+30,cy+43),(cx-30,cy+43),(cx-48,cy-15)]
    d.polygon(pts,fill=(11,33,64))
    for theta in (0,72,144,216,288):
        import math
        vx=int(cx+(r-15)*math.sin(math.radians(theta)))
        vy=int(cy-(r-15)*math.cos(math.radians(theta)))
        d.line((cx+(vx-cx)*0.46, cy+(vy-cy)*0.46,vx,vy),fill=(11,33,64),width=10)
    return im

im=master_icon()
im.save(assets/'HuroofAlKora-master.png', optimize=True)
for name,size in [('Square44x44Logo.png',(44,44)),('Square150x150Logo.png',(150,150)),('Square310x310Logo.png',(310,310)),('StoreLogo.png',(50,50))]:
    im.resize(size,Image.Resampling.LANCZOS).save(assets/name,optimize=True)
im.save(assets/'HuroofAlKora.ico',sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)],format='ICO')
# wide tile with mark and Arabic wordmark
wide=Image.new('RGBA',(620,300),(12,23,45,255));w=ImageDraw.Draw(wide)
for y in range(300):
    w.line((0,y,620,y),fill=(11,20+int(y/25),44+int(y/45),255))
w.rounded_rectangle((12,12,608,288),radius=30,outline=(38,98,133,255),width=6)
wide.alpha_composite(im.resize((245,245),Image.Resampling.LANCZOS),(8,28))
wf=ImageFont.truetype(fontpath,58)
w.text((570,120),'حروف الكورة',font=wf,fill=(244,248,255),anchor='rm',direction='rtl')
w.text((561,204),'HUROOF ALKORA',font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',20),fill=(86,204,170),anchor='rm')
wide.resize((310,150),Image.Resampling.LANCZOS).save(assets/'Wide310x150Logo.png',optimize=True)
print('Created icon and five Store asset PNGs in',assets)
