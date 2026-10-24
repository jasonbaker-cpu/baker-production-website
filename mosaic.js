(async (lat,lng,z,N,q)=>{const n=2**z, xt=(lng+180)/360*n, la=lat*Math.PI/180, yt=(1-Math.log(Math.tan(la)+1/Math.cos(la))/Math.PI)/2*n;
const x0=Math.floor(xt)-Math.floor(N/2), y0=Math.floor(yt)-Math.floor(N/2);
const cv=document.createElement('canvas'); cv.width=cv.height=256*N; const cx=cv.getContext('2d');
await Promise.all([...Array(N*N).keys()].map(async k=>{const i=k%N,j=Math.floor(k/N);
 const r=await fetch(`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y0+j}/${x0+i}`); const b=await createImageBitmap(await r.blob()); cx.drawImage(b,i*256,j*256);}));
const d=cv.toDataURL('image/jpeg',q); return JSON.stringify({z,x0,y0,N,d});})
