/** Keep model and licence links portable under a GitHub Pages repository path. */
export function publicAsset(path:string){
 const base=(process.env.NEXT_PUBLIC_BASE_PATH??'').replace(/\/$/,'');
 return base+'/'+path.replace(/^\//,'');
}
