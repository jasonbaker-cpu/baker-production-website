import json,subprocess,sys,os,shutil
jobs=[]
for f in sys.argv[1:]: jobs+=json.load(open(f))
for j in jobs:
    out='e2e/'+j['slug']
    for attempt in range(2):
        shutil.rmtree(out,ignore_errors=True)
        r=subprocess.run(['timeout','2400','python3','t12.py',json.dumps([j])],capture_output=True,text=True)
        n=len([x for x in os.listdir(out) if x.endswith('.jpg')]) if os.path.isdir(out) else 0
        print(j['slug'],'attempt',attempt,'rc',r.returncode,'out',n,'/',len(j['photos']),flush=True)
        if n==len(j['photos']): break
        open(f"e2e/{j['slug']}.err",'w').write(r.stdout[-3000:]+r.stderr[-3000:])
