import { TextProcessor } from './dist/scrapers/instagram-apify/text-processor.js'

const realCaption = `♫ Agenda de #Sábado, 28 de Março ♫

Projeto: Circuito Sound System
Atrações: Ministéreo Público Sistema de Som, Jahmin Sound System, Respiro Soundz Dub System, Setembro Sistema de Som e Vidas Negras Sistema de Som
Local: Fim de linha da Barroquinha
Horário: 10h às 16h
_____________________________
Projeto: Reggae Pras Mulheres
Atrações: Tulani Masai, Jahyne Real, Noêmi, Ivana Sanfer, Elite Miranda, Dj Woston e Ups Vibz
Local: Bloco Afro Kizumba, Pelourinho
Quanto: colaboração consciente
Horário: 16h
_____________________________
Projeto: Bar da Morena
Atrações: Simone Morena, Silfarley e Netto Brito
Local: Cais Dourado, Comércio
Horário: 16h
_____________________________
Atrações: Pedro Pondé + Remind + Duo Star
Local: Seu Astro, Pituba
Horário: 17h
_____________________________
Projeto: Panorama Internacional Coisa de Cinema
Atrações: Sonora Amaralina
Local: Cine Teatro Glauber Rocha
Quanto: R$40
Horário: 18h
_____________________________
Projeto: Série Salvador Sinfônica - Abertura da Temporada
Atrações: Coro Juvenil do NEOJIBA e a Orquestra NEOJIBA
Local: Parque do Queimado, Liberdade
Quanto: R$10/ R$5
Horário: 17h
_____________________________
Projeto: Jam no Mam
Atrações: Geleia Solar
Local: Solar do Unhão - MAM
Quanto: de R$5 à R$40
Horário: 18h
_____________________________
Projeto: Phonica
Atrações: Marisa Monte & Orquestra Ao Vivo
Local: Arena Fonte Nova
Horário: 18h30
_____________________________
Projeto: Sarau da Sereia
Atrações: Jonga Lima, Ivan Maia, Grupo Menos Um No Quarteto, Jorge La Matheus, Bruna Esteves, Jeane Sanchez, Ametista Nunes, Daniel Maio e André Carsant
Local: Espaço Cultural Rumo do Vento, Itapuã
Quanto: colaboração consciente
Horário: 18h
_____________________________
Projeto: BTC Sound Fest
Atrações: Fragmentos de Samba, Freelion e BNegão
Local: Largo Tereza Batista, Pelourinho
Quanto: gratuito
Horário: 19h
_____________________________
Projeto: show Acústico TTSSA
Atrações: Jhaca
Local: Patubar, Sto Antonio
Quanto: R$15
Horário: 19h
_____________________________
Atrações: Samba Só Na Voz
Local: Casa do Espanto, Sto Antonio
Horário: 19h
_____________________________
Projeto: Jota N Roll
Atrações: Jany, Janah e Jorge King
Local: Discodelia, Rio Vermelho
Quanto: R$20
Horário: 22h
_____________________________
Atrações: Vini e os Indomáveis
Local: Area 51 Rio Vermelho
Quanto: R$15
Horário: 22h
_____________________________
Atrações: Dj Lucio K
Local: Borracharia Rio Vermelho
Quanto: R$30
Horário: 23h59
_____________________________
Projeto: Misturinha Boa
Atrações: O Som do Coelho
Local: Baía Sunset, Aflitos
Horário: 18h
_____________________________
Projeto: Heatedrivalrynight
Local: Casa da Felicidade, Rio Vermelho
Horário: 22h
_____________________________
Projeto: Sambasé
Atrações: Victor Lellis e Pretto Du
Local: Só Shape, Rio Vermelho
Quanto: Grátis
Horário: 21h
_____________________________
Atrações: Encontro Circo com Patrimonio e Ponto, Malabares
Local: Circo Picolino
_____________________________
Projeto: Oxe Bruno
Local: Maria Parafina, Stella Maris
Horário: 19h
_____________________________
Projeto: Espetáculo Maria Vai Com As Outras
Local: Boquinha de Brasa do CIMA, Bonfim
Quanto: gratuito
Horário: 11h e 15h
_____________________________
Atrações: Pali & Dj Flavus
Local: Proa Cervejaria, Lauro
Horário: 19h
_____________________________
Atrações: Lu Dakele Jeito convida Soneca do Cavaco e Samba Du Guedes
Local: Casarão das Yabás, Garcia
Quanto: gratuito
Horário: 20h
_____________________________
Atrações: Grupo Rara Raiz com André Mendes
Local: Clube do Samba, Pelourinho
Horário: 20h
_____________________________
Projeto: Os Arianos
Atrações: Magary Lord, Paulo Bass, DomChicla, Ariel Rangel e Nau Scaldaferri
Local: Entre Folhas e Ervas, Lapinha
Horário: 20h
_____________________________
Projeto: Brega & Night
Atrações: Ian Fraguas e Spadina Banks
Local: A Marujada, Sto Antonio
Quanto: R$30
Horário: 20h
_____________________________
Atrações: Búfalos Vermelhos e a Orquestra de Elefantes + André L. R. Mendes + Marcelo Leta e Banda
Local: Centro Cultural Sesi Casa Branca
Quanto: R$30
Horário: 20h
_____________________________
Projeto: Festa Rock'n Beats
Atrações: Dj Jamil B2B Dj Eva
Local: Pub Casa N1, Barbalho
Quanto: R$20
Horário: 20h
_____________________________
Atrações: Samba de Oyá
Local: Point da Diversidade, Pelourinho
Horário: 21h
_____________________________
Projeto: As Raízes do Blues: Histórias e Canções
Atrações: Pedro Friedrich
Local: Varanda do Sesi Rio Vermelho
Quanto: sympla
Horário: 21h
_____________________________
Atrações: Dj Raiz
Local: Chupito Bar, Rio Vermelho
Quanto: R$20 em consumo
Horário: 21h
_____________________________
Atrações: Raults, Duda Nunes & Quarteto D'Boa e Dj Niti Seletor
Local: Beco das Artes, Stella Maris
Quanto: R$20
Horário: 21h
_____________________________
Projeto: Black Samba Total
Atrações: Samba de Lua e Djs Allexuz, DMT e Joarlei Sants
Local: Bombar Rio Vermelho
Quanto: R$20
Horário: 21h
_____________________________
Projeto: Movimento Boca de Brasa
Atrações: Duquesa e Dj Belle vs Gabi da OXE
Local: Espaço Cultural da Barroquinha
Horário: 21h
_____________________________
Projeto: Samba da Tonha
Atrações: Grupo C7
Local: Tonha Preta, Rio Vermelho
Horário: 21h`

async function testRealCaption() {
  console.log('\n🧪 Testing TextProcessor with REAL Instagram Caption\n')
  console.log('='.repeat(70))
  
  const processor = new TextProcessor()
  const events = await processor.extractEvents(realCaption, 'https://instagram.com/p/test')
  
  console.log(`\n✅ Extracted ${events.length} events from real caption:\n`)
  
  events.forEach((event, i) => {
    console.log(`${i + 1}. ${event.title}`)
    console.log(`   📍 ${event.venue}`)
    console.log(`   ⏰ ${event.time}`)
    console.log(`   💰 ${event.price}`)
    console.log()
  })
  
  console.log('='.repeat(70))
  console.log(`\n📊 Total: ${events.length} eventos extraídos`)
  console.log(`🎯 Esperado: ~35 eventos\n`)
}

testRealCaption().catch(console.error)
