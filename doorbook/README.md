# Doorbook

Jordan London's prospecting app: doors, calls, follow-ups and notes.
Live at https://www.bakerproduction.com/doorbook/

## Who can get in

Only Google accounts listed in `ALLOW` in `index.html` can open it.
To add someone (e.g. Jordan), add their Google email to `ALLOW` **and** to the Firestore rules below.

## Data

Stored in the `baker-leads` Firebase project, in three collections:
`doorbook_leads`, `doorbook_days`, `doorbook_notes`.

## Firestore rules (required for real security)

The sign-in screen only hides the app. What actually protects the data is
Firestore's security rules. In the Firebase console, open
**baker-leads → Firestore Database → Rules** and add this inside the existing
`match /databases/{database}/documents { ... }` block (keep your other rules):

```
function doorbookUser() {
  return request.auth != null
    && request.auth.token.email_verified == true
    && request.auth.token.email in [
      'admin@bakerproduction.com',
      'jasonbaker@bakerproduction.com'
    ];
}
match /doorbook_leads/{id} { allow read, write: if doorbookUser(); }
match /doorbook_days/{id}  { allow read, write: if doorbookUser(); }
match /doorbook_notes/{id} { allow read, write: if doorbookUser(); }
```

Then click **Publish**.
