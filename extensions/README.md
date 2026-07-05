# Extension Development Guide

Extensions add functionality to AkariEngine without modifying core code. They can register Express routes, Sequelize models, and render-pipeline hooks.

## Enabling an Extension

Add the extension's directory name to the `extensions` array in `LocalSettings.json`:

```json
{
  "extensions": ["Interwiki", "Board"]
}
```

---

## Directory Structure

```
extensions/
└── MyExtension/
    ├── manifest.json   (required)
    ├── main.js         (required)
    └── ...             (any additional files your extension needs)
```

---

## manifest.json

All fields are required. The manifest is shown on the site's license page.

```json
{
  "name": "MyExtension",
  "version": "1.0.0",
  "description": "What this extension does.",
  "author": "Your Name",
  "licence": "GNU AGPL 3.0",
  "homepage": "https://example.com"
}
```

---

## main.js

Must export a default async function. AkariEngine calls it once on startup, passing three arguments:

```javascript
export default async (app, registerHook, registerDB) => {
  // app         — Express application instance
  // registerHook — register a render-pipeline hook
  // registerDB   — register a Sequelize model
}
```

---

## Hooks

Hooks let extensions intercept AkariEngine's code. Register them inside `main.js`.

### Available hooks
#### beginRender
* Signature: `(input [String], renderOptions [Object], canRedirect [boolean])`
* Return value: `{ input, renderOptions, canRedirect }`

Before wikitext is parsed. Update necessary fields and return them.

#### endRender
* Signature: `(input [String], renderOptions [Object], canRedirect [boolean])`
* Return value: `{ input, renderOptions, canRedirect }`

After HTML is generated, before sanitisation. Update necessary fields and return them.

### Registering a hook

```javascript
registerHook('beginRender', (input, renderOptions, canRedirect) => {
  input = input.replace(/foo/g, 'bar')
  return { input, renderOptions, canRedirect }
})
```

## Database Models

Register Sequelize models so they are initialized against the configured database and accessible globally.

```javascript
// myModel.js — returns a Sequelize model given the sequelize instance
export default function myModel(sequelize) {
  return sequelize.define('MyModel', { /* columns */ })
}
```

```javascript
// main.js
import myModel from './myModel.js'

export default async (app, registerHook, registerDB) => {
  registerDB('myModel', myModel)
  // Accessible anywhere as global.db.myModel
}
```

---

## Routes

Use the `app` instance directly to mount routes:

```javascript
import { Router } from 'express'

export default async (app, registerHook, registerDB) => {
  const router = Router()

  router.get('/my-extension', (req, res) => {
    res.send('Hello from MyExtension')
  })

  app.use(router)
}
```

For CSRF-protected POST routes, use `global.csrfProtection`.

---

## Globals Available to Extensions

| Global | Contents |
|--------|----------|
| `global.conf` | Parsed `LocalSettings.json` |
| `global.sequelize` | Sequelize instance |
| `global.db` | All registered models keyed by name |
| `global.extensions` | All loaded extensions `{ name: { manifest, obj } }` |
| `global.csrfProtection` | CSRF middleware |
| `global.sanitiseOptions` | HTML sanitizer config |

---

## Minimal Example: Interwiki

```javascript
// extensions/Interwiki/main.js
const mapping = {
  'Wikipedia': 'https://en.wikipedia.org/wiki/',
}

export default async (app, registerHook, _registerDB) => {
  registerHook('beginRender', (input, renderOptions, canRedirect) => {
    for (const [prefix, base] of Object.entries(mapping)) {
      const re = new RegExp(`\\[\\[${prefix}:([^|\\r\\n]*?)\\]\\]`, 'ig')
      input = input.replace(re, (_, title) =>
        `<a href="${base}${title}" rel="nofollow noopener noreferrer">${prefix}:${title}</a>`
      )
    }
    return { input, renderOptions, canRedirect }
  })
}
```
