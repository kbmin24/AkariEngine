# AkariEngine
[![DeepScan grade](https://deepscan.io/api/teams/16356/projects/19628/branches/512678/badge/grade.svg)](https://deepscan.io/dashboard#view=project&tid=16356&pid=19628&bid=512678)
![Screenshot](wikiscreenshot.png)
AkariEngine is a Node.js based wiki engine, built with customizability in mind. Expect blazing fast rendering, customizable skins, flexible deployment and more.

## Key Features
* Simple and powerful markup (grammar) with features such as tables, videos and maps
* Blazing fast wikitext rendering using [Chevrotain](https://chevrotain.io/docs/)
* To-the-point, no hassle configuration with a single .json file
* Real time, thread-like discussion with Socket.IO
* Flexible database choice supporting MySQL/MariaDB and SQLite
* Built in permission/ACL management
* Per-user Vue skin system to customize look
* Full text search via Meilisearch
* Available scalability with Redis caching
* Server side extension system for routes, models and custom rendering behavior

### Use cases
* [GECWiki](https://gecwiki.kr) (website retired)

## Getting Started
Please refer to the wiki's [installation page](https://github.com/kbmin24/AkariEngine/wiki/Installation).

## Directory Structure
```
server.js                 Backend bootstrap
src/
  config/                 Application and database configuration
  routes/                 API routes and middleware chains
  controllers/            HTTP request and response adapters
  services/               Business rules and authorization
  repositories/           Database and search access
  models/                 Sequelize model factories
  middlewares/            Authentication, validation, CSRF, uploads, errors
  socket/                 Real-time event handlers
  utils/wikimark/          Wikitext lexer, parser, and render visitors
frontend/
  app/                    Pages, components, composables, stores, and assets
  server/                 Nuxt server routes
skins/                    Custom Vue layouts
extensions/               Optional backend extensions
locales/                  Shared translation catalogs
public/                   Static assets and vendored browser libraries
uploads/                  Uploaded files

```

## Licence
AkariEngine is distributed under GNU AGPL 3.0.
