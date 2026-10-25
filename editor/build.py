import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
head='''<title>Baker Aerial Editor</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;700;800&family=IBM+Plex+Mono:wght@500&family=IBM+Plex+Sans:wght@400;500;600&family=Open+Sans:wght@400&family=Source+Sans+3:wght@300;400;700&display=swap">
<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
'''
css=open('app.css').read(); body=open('body.html').read()
js='\n'.join(open(f).read() for f in ['lut.js','logos.js','icons.js','skyplate.js','core.js','render.js','ui.js','panels.js'])
page=head+'<style>\n'+css+'</style>\n\n'+body+'\n<script>\n(() => {\n'+js+'\n})();\n</script>\n'
open('../aerial-editor.html','w').write(page)
open('../chk.js','w').write('(() => {\n'+js+'\n})();')
print('built',len(page))
