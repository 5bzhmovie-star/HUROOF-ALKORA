import {get} from 'node:http';
const origin=new URL(process.env.APP_ORIGIN||'http://localhost:3000');
const req=get({hostname:'127.0.0.1',port:Number(process.env.PORT||3000),path:'/api/health',headers:{Host:origin.host}},res=>{res.resume();res.on('end',()=>process.exit(res.statusCode===200?0:1));});
req.setTimeout(4000,()=>req.destroy());req.on('error',()=>process.exit(1));
