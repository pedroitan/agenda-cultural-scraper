// Simple JavaScript test (no TypeScript compilation needed)
import { parseInstagramPost } from './dist/instagram.js'

const samplePost = `♫ Agenda de #Sexta, 16 de Janeiro ♫

Projeto: Baile da Massa Real
Local: 2º andar do Bombar, Rio Vermelho
Horário: 21h
_____________________________
Atrações: Magary e Convidados + Dj Magnata King Faya
Local: Mariposa Vilas
Quanto: R$40
Horário: 20h
_____________________________
Projeto: CLIMAXXX
Atrações: Cashu, QueGaleraChata, Títi, Apsü e Jerônio Sodré
Local: Discodelia, Rio Vermelho
Quanto: R$35
Horário: 20h
_____________________________
Atrações: Lucio Mauro Filho e Faustão
Local: Casa Verão Hidden
Quanto: R$90
Horário: 19h
_____________________________
Projeto: Festival Giro Conecta
Atrações: Jota Pê convida Mayra Andrade
Local: Pátio da Aclamação, Campo Grande
Quanto: Sympla
Horário: 19h
_____________________________
Projeto: Ensaios de Verão
Atrações: Katulê convida Misturadinn e Paulo Marcos
Local: Baía Sunset, Aflitos
Horário: 8h`

const postUrl = 'https://www.instagram.com/p/DTjSeeoDZBA/'

console.log('Testing Instagram parser...\n')

const events = parseInstagramPost(samplePost, postUrl)

console.log(`\nExtracted ${events.length} events:\n`)

events.forEach((event, i) => {
  console.log(`${i + 1}. ${event.title}`)
  console.log(`   Local: ${event.venue_name || 'N/A'}`)
  console.log(`   Data/Hora: ${event.start_datetime}`)
  console.log(`   Preço: ${event.is_free ? 'Gratuito' : event.price_text || 'N/A'}`)
  console.log(`   URL: ${event.url}`)
  console.log(`   ID: ${event.external_id}`)
  console.log('')
})
