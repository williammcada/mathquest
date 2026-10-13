// Builds the self-contained DEV/story review files from canonical public/ sources.
// Replaces the hand-patched v0.1.0/v0.2.0 bundles for new versions (13 Oct 2026):
//   public/reviews/BLACKLINE-v0.3.0.html  ← public/blackline-preview.html
//   public/reviews/Ironbreak-v0.2.0.html  ← public/ironbreak-review.html
// Stylesheets are inlined, the module entry is bundled, and local art/audio are
// embedded as data URLs (only the reviewed game's own assets; other cartridges in
// the in-memory session engine keep their unused relative paths). ?dev=action is handled by the sources themselves.
// Run from the repository root: node scripts/build-review-bundles.mjs
import {build} from 'esbuild';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,dirname,extname} from 'node:path';
import {createHash} from 'node:crypto';

const PUBLIC=resolve('public');
const MIME={'.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.wav':'audio/wav','.mp3':'audio/mpeg','.json':'application/json'};
const dataUrl=path=>`data:${MIME[extname(path)]};base64,${readFileSync(path).toString('base64')}`;

async function bundle({page,out,version,assets}){
  const htmlPath=resolve(PUBLIC,page);let html=readFileSync(htmlPath,'utf8');
  html=html.replace(/<link rel="stylesheet" href="([^"]+)">/g,(_,href)=>{
    const css=readFileSync(resolve(dirname(htmlPath),href.split('?')[0]),'utf8');
    return `<style>${css}</style>`;
  });
  let entry;html=html.replace(/<script type="module" src="([^"]+)"><\/script>/,(_,src)=>{entry=resolve(dirname(htmlPath),src.split('?')[0]);return '<!--MQ_BUNDLE-->';});
  if(!entry)throw Error(`${page}: module entry not found`);
  const result=await build({entryPoints:[entry],bundle:true,write:false,format:'iife',platform:'browser',target:'es2022',minify:true,
    loader:{'.svg':'dataurl','.webp':'dataurl','.png':'dataurl'},
    plugins:[{name:'strip-cache-query',setup(b){b.onResolve({filter:/\?/},a=>({path:resolve(a.resolveDir,a.path.split('?')[0])}));}}]});
  let js=result.outputFiles[0].text;
  // Embed runtime asset paths such as './assets/blackline/cover.webp'.
  const embedded=new Set();
  js=js.replace(/(["'`])\.\/(assets\/[A-Za-z0-9_\-/]+\.(?:webp|png|svg|wav|mp3))\1/g,(m,q,rel)=>{if(!rel.startsWith(assets))return m;const file=resolve(PUBLIC,rel);if(!existsSync(file))throw Error(`Missing asset ${rel}`);embedded.add(rel);return q+dataUrl(file)+q;});
  html=html.replace('<!--MQ_BUNDLE-->',()=>'<script>'+js.replaceAll('</script','<\\/script')+'</script>');
  html=html.replace('</head>',`<meta name="mq-build" content="${version} · built from public/${page}"></head>`);
  writeFileSync(resolve(PUBLIC,out),html);
  const hash=createHash('sha256').update(html).digest('hex');
  console.log(`${out}: ${Buffer.byteLength(html)} bytes, sha256 ${hash.slice(0,16)}…, embedded ${[...embedded].join(', ')||'none'}`);
}

await bundle({page:'blackline-preview.html',out:'reviews/BLACKLINE-v0.3.1.html',version:'BLACKLINE v0.3.1',assets:'assets/blackline/'});
await bundle({page:'ironbreak-review.html',out:'reviews/Ironbreak-v0.2.1.html',version:'Ironbreak v0.2.1',assets:'assets/ironbreak/'});
