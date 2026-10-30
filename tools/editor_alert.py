"""Email the photo editor about every drone job marked toEditor in aerials/index.json (once per job).
Runs in GitHub Actions. Needs secrets GMAIL_APP_PASSWORD; vars EDITOR_EMAIL (recipient), FROM_EMAIL (default admin@bakerproduction.com)."""
import json, os, smtplib, ssl, sys
from email.message import EmailMessage
SENT = 'aerials/editor_sent.json'
pw, to = os.environ.get('GMAIL_APP_PASSWORD'), (os.environ.get('EDITOR_EMAIL') or 'editingprofocus@gmail.com')   # Profocus (Jason 30 Oct)
frm = os.environ.get('FROM_EMAIL') or 'jasonbaker@bakerproduction.com'   # sender account with 2-Step + app password (Jason 31 Oct)
if not pw or not to: print('not set up yet (GMAIL_APP_PASSWORD secret / EDITOR_EMAIL variable missing) — nothing sent'); sys.exit(0)
if os.environ.get('TEST'):   # login check: one email to the sender's own inbox only
    m = EmailMessage(); m['From'] = f'Baker Production <{frm}>'; m['To'] = frm
    m['Subject'] = 'Editor alert test — working'; m.set_content('The automatic Profocus email is set up. Flagged drone jobs will now email ' + to + ' on their own.')
    with smtplib.SMTP_SSL('smtp.gmail.com', 465, context=ssl.create_default_context()) as s: s.login(frm, pw); s.send_message(m)
    print('test sent to', frm); sys.exit(0)
I = json.load(open('aerials/index.json')); sent = json.load(open(SENT)) if os.path.exists(SENT) else {}
todo = []
for d in I.get('days', []):
    for j in d.get('jobs', []):
        if j.get('toEditor') and f"{d['id']}/{j['slug']}" not in sent: todo.append((d, j))
if not todo: print('nothing new'); sys.exit(0)
ctx = ssl.create_default_context(); n = 0
with smtplib.SMTP_SSL('smtp.gmail.com', 465, context=ctx) as s:
    s.login(frm, pw)
    for d, j in todo:
        key = f"{d['id']}/{j['slug']}"; base = f"https://bakerproduction.com/aerials/{d['id']}/"
        has_map = os.path.exists(f"aerials/{d['id']}/{j['slug']}/editor_map.jpg")
        lines = [f"Hi, can you please edit this drone job for us — {j['addr']} ({j.get('who','')}).", "",
                 f"Why it's coming to you: {j.get('editorReason','needs a manual edit')}.", ""]
        if j.get('rawPath'): lines += [f"Raw files (Dropbox): {j['rawPath']}"]
        if j.get('lot'): lines += [f"Lot: {j['lot']}"]
        if j.get('notes'): lines += ["", "Agent's booking notes:", j['notes']]
        lines += ["", "Please edit sky, colour and horizon only — no graphics.",
                  f"When done, drop your finished photos onto https://bakerproduction.com/pins/?open={d['id']}/{j['slug']} — our pins, boundary and labels go on automatically. Check each pin against the map, drag any that are off, then click Send to Baker. That's it — no need to send files back.", ""]
        if has_map: lines += [f"Map of every place: {base}{j['slug']}/editor_map.jpg"]
        lines += [f"Our reference version: {base}", "", "Thanks,", "Baker Production"]
        m = EmailMessage(); m['From'] = f'Baker Production <{frm}>'; m['To'] = to
        m['Subject'] = f"Drone edit needed — {j['addr']}"; m.set_content('\n'.join(lines))
        s.send_message(m); sent[key] = True; n += 1; print('sent', key)
json.dump(sent, open(SENT, 'w'), indent=1); print(n, 'sent')
