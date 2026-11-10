// Catalog data is a versioned Worker static asset: /catalog.json.

const ETAG = '"ebuzz-8dbcd13490e44197de59c13a9d0034a34f7fc05b"';
function headers(){return {'content-type':'application/json;charset=utf-8','cache-control':'public,max-age=3600,stale-while-revalidate=86400','etag':ETAG,'access-control-allow-origin':'*','access-control-allow-methods':'GET,HEAD,OPTIONS','x-content-type-options':'nosniff'};}
function response(req,value,status=200){return new Response(req.method==='HEAD'?null:JSON.stringify(value),{status,headers:headers()});}
export default {
 async fetch(req,env){
  const url=new URL(req.url),path=url.pathname;
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:headers()});
  if(!['GET','HEAD'].includes(req.method))return response(req,{error:'Method not allowed'},405);
  if(!['/api/catalog','/api/tv/catalog','/api/tv/channels','/api/tv/categories','/api/tv/countries','/api/tv/health'].includes(path))return response(req,{error:'Not found'},404);
  if(req.headers.get('if-none-match')===ETAG)return new Response(null,{status:304,headers:headers()});
  const asset=await env.ASSETS.fetch(new Request(new URL('/catalog.json',req.url)));
  if(!asset.ok)return response(req,{error:'Catalog data unavailable'},503);
  if(path==='/api/catalog'||path==='/api/tv/catalog')return new Response(req.method==='HEAD'?null:asset.body,{headers:headers()});
  const catalog=await asset.json();
  if(path==='/api/tv/health')return response(req,{status:'ok',service:'playbeat-tv-catalog',channels:catalog.channels.length,countries:catalog.countries.length,categories:catalog.categories.length,catalog_generated_at:catalog.meta.generatedAt,source_commit_blob:'8dbcd13490e44197de59c13a9d0034a34f7fc05b',notice:'Catalog snapshot; playback availability can change.'});
  if(path==='/api/tv/categories')return response(req,{categories:catalog.categories.map(c=>({...c,count:catalog.channels.filter(x=>x.cats.includes(c.id)).length}))});
  if(path==='/api/tv/countries')return response(req,{countries:catalog.countries.map(c=>({...c,count:catalog.channels.filter(x=>x.country===c.code).length}))});
  const q=(url.searchParams.get('q')||'').trim().slice(0,200).toLowerCase(),country=(url.searchParams.get('country')||'').toUpperCase(),category=url.searchParams.get('category')||'',id=url.searchParams.get('id');
  const page=Math.max(1,Math.min(100000,parseInt(url.searchParams.get('page')||'1',10)||1)),limit=Math.max(1,Math.min(100,parseInt(url.searchParams.get('limit')||'24',10)||24));
  const rows=catalog.channels.filter(c=>(!q||c.name.toLowerCase().includes(q)||c.id.toLowerCase().includes(q))&&(!country||c.country===country)&&(!category||c.cats.includes(category))&&(!id||c.id===id));
  return response(req,{total:rows.length,page,limit,pages:Math.ceil(rows.length/limit),channels:rows.slice((page-1)*limit,page*limit)});
 }
};
