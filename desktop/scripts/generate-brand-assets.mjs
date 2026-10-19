// Rasterize the site's exact Goal SVG for Windows Explorer, taskbar and native splash.
import{readFileSync,writeFileSync}from'node:fs';import{fileURLToPath}from'node:url';import{createRequire}from'node:module';
const sharp=createRequire(new URL('../../website/package.json',import.meta.url))('sharp');
const dir=new URL('../src/HuroofAlKora/Assets/',import.meta.url),svg=readFileSync(new URL('brand-goal.svg',dir));
for(const [file,width,height]of[['HuroofAlKora-master.png',512,512],['Square44x44Logo.png',44,44],['Square150x150Logo.png',150,150],['Square310x310Logo.png',310,310],['StoreLogo.png',50,50],['Wide310x150Logo.png',310,150]])await sharp(svg).resize(width,height,{fit:'contain',background:'#00000000'}).png().toFile(fileURLToPath(new URL(file,dir)));
const sizes=[16,24,32,48,64,128,256],images=await Promise.all(sizes.map(n=>sharp(svg).resize(n,n).png().toBuffer()));let offset=6+16*sizes.length;const header=Buffer.alloc(offset);header.writeUInt16LE(1,2);header.writeUInt16LE(sizes.length,4);
sizes.forEach((n,i)=>{const o=6+i*16;header[o]=header[o+1]=n===256?0:n;header.writeUInt16LE(1,o+4);header.writeUInt16LE(32,o+6);header.writeUInt32LE(images[i].length,o+8);header.writeUInt32LE(offset,o+12);offset+=images[i].length;});writeFileSync(new URL('HuroofAlKora.ico',dir),Buffer.concat([header,...images]));console.log('Official Goal assets ready: PNG and 7-size ICO.');
