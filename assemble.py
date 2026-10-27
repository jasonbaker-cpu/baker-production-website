import json,glob,re,base64,sys,os
D=sys.argv[1] if len(sys.argv)>1 else '/root/.claude/projects/-home-claude/123b6bc4-adfa-5095-9578-7622ec75f692/tool-results/'   # pass this session's tool-results dir
parts={}
for f in glob.glob(D+'mcp-remote-devices-Claude_Browser__javascript_tool-*.txt'):
    try: t=json.load(open(f))[0]['text']
    except Exception: continue
    try: t=json.JSONDecoder().raw_decode(t)[0] if t.startswith('"') else t
    except Exception: continue
    m=re.match(r'CHUNK\|([^|]+)\|(\d+)\|(\d+)\|',t)
    if m:
        k,i,n=m.group(1),int(m.group(2)),int(m.group(3)); body=t[m.end():t.index('|END|')]
        parts.setdefault(k,{})[i]=(n,body)
    m=re.match(r'CHUNK(\d)\|',t)
    if m: parts.setdefault('balga',{}).setdefault(int(m.group(1)),(5,t[m.end():]))
for k,d in parts.items():
    n=list(d.values())[0][0]
    if all(i in d for i in range(n)):
        s=''.join(d[i][1] for i in range(n)); o=json.loads(s)
        b=base64.b64decode(o['d'].split(',',1)[1]); open(f'sat/{k}.jpg','wb').write(b)
        json.dump({x:o[x] for x in ('z','x0','y0','N')},open(f'sat/{k}.json','w')); print(k,'ok',len(b))
    else: print(k,'missing',[i for i in range(n) if i not in d])
