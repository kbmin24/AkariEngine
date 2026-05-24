import { Meilisearch } from 'meilisearch'

let client = null
let index = null

export async function initMeilisearch(config) {
  client = new Meilisearch({ host: config.host, apiKey: config.apiKey })
  index = client.index('pages')
  await index.updateSettings({
    searchableAttributes: ['title', 'content'],
    displayedAttributes: ['title', 'content'],
    rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness']
  })
  return index
}

export function getMeilisearchIndex() { return index }
