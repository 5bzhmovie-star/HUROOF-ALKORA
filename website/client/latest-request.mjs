/** Only the newest request may update the displayed profile/jersey. */
export function latestRequest(){
 let generation=0;
 return {
 cancel(){generation++;},
 async run(load,onValue,onError=()=>{}){
 const current=++generation;
 try{const value=await load();if(current===generation)onValue(value);}
 catch(error){if(current===generation)onError(error);}
 }
 };
}
