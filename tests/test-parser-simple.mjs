// Simple test without compilation - run with: node test-parser-simple.mjs

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
Horário: 8h`;

console.log('='.repeat(60));
console.log('TESTE DO PARSER DE INSTAGRAM');
console.log('='.repeat(60));
console.log('\nTexto do post:\n');
console.log(samplePost.substring(0, 200) + '...\n');

// Simulate the parsing logic inline for testing
const MONTH_MAP = {
  janeiro: 0, fevereiro: 1, março: 2, abril: 3,
  maio: 4, junho: 5, julho: 6, agosto: 7,
  setembro: 8, outubro: 9, novembro: 10, dezembro: 11,
};

// Extract date
const dateMatch = samplePost.match(/(\d{1,2})\s+de\s+(\w+)/i);
if (!dateMatch) {
  console.log('❌ Erro: Não conseguiu extrair data do título');
  process.exit(1);
}

const day = parseInt(dateMatch[1], 10);
const monthName = dateMatch[2].toLowerCase();
const month = MONTH_MAP[monthName];
const year = new Date().getFullYear();
const baseDate = new Date(year, month, day);

console.log(`✅ Data extraída: ${day} de ${monthName} de ${year}`);
console.log(`   Date object: ${baseDate.toISOString()}\n`);

// Split by separator
const blocks = samplePost.split(/_{5,}/).filter(b => b.trim());
console.log(`✅ Eventos encontrados: ${blocks.length - 1} blocos (primeiro é o título)\n`);
console.log('='.repeat(60));

// Parse each block (including first which may have title + first event)
const events = [];
for (let i = 0; i < blocks.length; i++) {
  let blockToParse = blocks[i];
  
  // Check if this is the title block (contains ♫ or #)
  if (blockToParse.includes('♫') || blockToParse.includes('#')) {
    // Try to find event after title
    const lines = blockToParse.split('\n');
    const eventStartIndex = lines.findIndex(l => 
      /^(Projeto:|Atra[çc][õo](?:es)?:|Local:)/i.test(l.trim())
    );
    
    if (eventStartIndex <= 0) continue; // No event in title block
    
    // Extract event from title block
    const eventLines = lines.slice(eventStartIndex);
    blockToParse = eventLines.join('\n');
  }
  
  const lines = blockToParse.trim().split('\n').filter(l => l.trim());
  
  const event = {
    projeto: null,
    atracoes: null,
    local: null,
    quanto: null,
    horario: null,
  };
  
  for (const line of lines) {
    const cleaned = line.trim();
    if (/^Projeto:/i.test(cleaned)) {
      event.projeto = cleaned.replace(/^Projeto:\s*/i, '').trim();
    } else if (/^Atra[çc][õo](?:es)?:/i.test(cleaned)) {
      event.atracoes = cleaned.replace(/^Atra[çc][õo](?:es)?:\s*/i, '').trim();
    } else if (/^Local:/i.test(cleaned)) {
      event.local = cleaned.replace(/^Local:\s*/i, '').trim();
    } else if (/^Quanto:/i.test(cleaned)) {
      event.quanto = cleaned.replace(/^Quanto:\s*/i, '').trim();
    } else if (/^Hor[áa]rio:/i.test(cleaned)) {
      event.horario = cleaned.replace(/^Hor[áa]rio:\s*/i, '').trim();
    }
  }
  
  const title = event.projeto || event.atracoes || 'Evento sem nome';
  
  // Parse time
  const timeMatch = event.horario?.match(/(\d{1,2})h(\d{2})?/);
  const hour = timeMatch ? timeMatch[1].padStart(2, '0') : '20';
  const minute = timeMatch && timeMatch[2] ? timeMatch[2] : '00';
  
  const eventDate = new Date(baseDate);
  eventDate.setHours(parseInt(hour, 10), parseInt(minute, 10), 0, 0);
  
  // Parse price
  let priceInfo = 'N/A';
  if (event.quanto) {
    const lower = event.quanto.toLowerCase();
    if (lower.includes('gratuito') || lower.includes('grátis')) {
      priceInfo = 'GRATUITO';
    } else if (lower.includes('sympla')) {
      priceInfo = 'Ver Sympla';
    } else {
      priceInfo = event.quanto;
    }
  }
  
  events.push({
    numero: i,
    titulo: title,
    local: event.local || 'N/A',
    dataHora: eventDate.toISOString(),
    preco: priceInfo,
  });
  
  console.log(`\nEvento ${i}:`);
  console.log(`  📌 Título: ${title}`);
  console.log(`  📍 Local: ${event.local || 'N/A'}`);
  console.log(`  🕐 Horário: ${hour}:${minute}`);
  console.log(`  📅 Data/Hora completa: ${eventDate.toLocaleString('pt-BR')}`);
  console.log(`  💰 Preço: ${priceInfo}`);
}

console.log('\n' + '='.repeat(60));
console.log(`✅ SUCESSO: ${events.length} eventos extraídos com sucesso!`);
console.log('='.repeat(60));
