import fs from 'fs'

const html = fs.readFileSync('elcabong-detail-1.html', 'utf8')
const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i)

if (match) {
  const json = JSON.parse(match[1])
  const graph = json['@graph'] || json
  const event = Array.isArray(graph) ? graph.find(item => item['@type'] === 'Event') : (graph['@type'] === 'Event' ? graph : null)
  
  if (event) {
    console.log(JSON.stringify(event, null, 2))
  } else {
    console.log('No Event type found in JSON-LD')
    console.log('Available types:', Array.isArray(graph) ? graph.map(g => g['@type']) : graph['@type'])
  }
} else {
  console.log('No JSON-LD found')
}
