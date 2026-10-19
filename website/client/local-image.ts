import{useSyncExternalStore}from'react';
import{api}from'./api';import type{MediaRecord}from'./VisualMediaPicker';
let pending=0;const listeners=new Set<()=>void>();
const emit=()=>listeners.forEach(fn=>fn());
export function useImageUploadsPending(){return useSyncExternalStore(fn=>{listeners.add(fn);return()=>{listeners.delete(fn)}},()=>pending,()=>0)}
export async function uploadLocalImage(file:File):Promise<MediaRecord>{pending++;emit();try{return await prepareLocalImage(file)}finally{pending--;emit()}}
async function prepareLocalImage(file:File):Promise<MediaRecord>{
 if(file.size>20*1024*1024)throw Error('اختر صورة أصغر من 20 ميجابايت.');
 const url=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onerror=()=>reject(Error('تعذر قراءة الصورة.'));r.onload=()=>resolve(String(r.result));r.readAsDataURL(file)});
 const image=new Image();image.src=url;try{await image.decode()}catch{throw Error('تعذر فتح الصورة. جرّب PNG أو JPG أو WebP.');}
 if(!image.naturalWidth||!image.naturalHeight)throw Error('الصورة غير صالحة.');
 const canvas=document.createElement('canvas');const ratio=Math.min(1,1400/Math.max(image.naturalWidth,image.naturalHeight));canvas.width=Math.max(1,Math.round(image.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(image.naturalHeight*ratio));const context=canvas.getContext('2d');if(!context)throw Error('تعذر تجهيز الصورة.');context.drawImage(image,0,0,canvas.width,canvas.height);
 let blob:Blob|null=null;for(const quality of [.88,.74,.58]){blob=await new Promise<Blob|null>(r=>canvas.toBlob(r,'image/webp',quality));if(blob&&blob.size<=1350000)break;}
 if(!blob||blob.size>1350000)throw Error('الصورة كبيرة بعد التجهيز؛ جرّب صورة أصغر.');
 const bytes=new Uint8Array(await blob.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
 const result=await api<any>('/admin/visual-media-upload',{origin:'computer',fileName:file.name,contentType:blob.type,base64:btoa(binary)});
 const record={...result,label:file.name,content_type:blob.type};window.dispatchEvent(new CustomEvent('hk:media-added',{detail:record}));return record;
}
