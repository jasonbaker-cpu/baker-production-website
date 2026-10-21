# Doorbook

Prospecting app for agents: doors, calls, follow-ups and notes.
Live at https://www.bakerproduction.com/doorbook/

## Who can get in

- **Admins** (`ADMINS` in `index.html`): see every agent's Doorbook, switch between them from the header, and add or remove agents on the Score tab.
- **Agents**: anyone with a document at `doorbook_agents/<their google email>`. Each agent sees only their own data.

Add agents from the app (Score tab → Agents). No code change needed.
Agents must sign in with a Google account that uses that exact email.

## Data

Firebase project `baker-leads`:
- `doorbook_agents/<email>` — the agent list (name, date added)
- `doorbook/<email>/leads`, `/days`, `/notes` — each agent's own data

Removing an agent blocks their access but keeps their data.

## Firestore rules (required for real security)

The sign-in screen only hides the app. Firestore's rules are what actually
protect the data. In the Firebase console, open
**baker-leads → Firestore Database → Rules** and add this inside the existing
`match /databases/{database}/documents { ... }` block (keep your other rules),
then click **Publish**:

```
function doorbookAdmin() {
  return request.auth != null
    && request.auth.token.email_verified == true
    && request.auth.token.email in [
      'admin@bakerproduction.com',
      'jasonbaker@bakerproduction.com'
    ];
}
function doorbookAgent(agent) {
  return request.auth != null
    && request.auth.token.email_verified == true
    && request.auth.token.email == agent
    && exists(/databases/$(database)/documents/doorbook_agents/$(agent));
}
match /doorbook_agents/{agent} {
  allow read: if doorbookAdmin() || doorbookAgent(agent);
  allow write: if doorbookAdmin();
}
match /doorbook/{agent}/{coll}/{id} {
  allow read, write: if doorbookAdmin() || doorbookAgent(agent);
}
```
