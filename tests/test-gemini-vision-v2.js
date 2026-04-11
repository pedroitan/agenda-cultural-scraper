import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('❌ GEMINI_API_KEY not set in .env file');
  process.exit(1);
}

const getCurrentDateContext = () => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${day}/${month}/${year}`;
};

const PROMPT = `
Analise esta imagem de post do Instagram e extraia TODOS os eventos culturais mencionados.

CONTEXTO TEMPORAL:
- Data de hoje: ${getCurrentDateContext()}
- Eventos geralmente ocorrem no FUTURO PRÓXIMO ou presente (hoje, amanhã, próximos dias)
- Se hoje é 01/02/2026 (sábado):
  * "30/01" = sexta-feira (ontem)
  * "31/01" = sábado (hoje, mas pode ser referência ao dia anterior se já passou)
  * "01/02" = domingo (amanhã)
- Use a data de HOJE como referência principal para interpretar as datas

ATENÇÃO ESPECIAL AOS CABEÇALHOS DE DATA E LAYOUT:
- A imagem tem CABEÇALHOS DE DATA em DESTAQUE com formato: "SEXTA-FEIRA (30/01)", "SÁBADO (31/01)", "DOMINGO (01/02)"
- CRÍTICO: Antes de processar eventos, ESCANEIE A IMAGEM INTEIRA procurando por TODOS os cabeçalhos de data
- A imagem pode ter LAYOUT DE DUAS COLUNAS lado a lado
- As datas nos cabeçalhos estão no formato DD/MM (sem ano)
- Use o ano atual (2026) e ajuste o mês se necessário baseado na data de hoje

REGRA CRÍTICA - PROCESSO DE LEITURA EM 3 ETAPAS:

ETAPA 1 - ESCANEAR CABEÇALHOS (FAÇA ISSO PRIMEIRO):
- Olhe para o TOPO da imagem, lado ESQUERDO: há um cabeçalho de data?
- Olhe para o TOPO da imagem, lado DIREITO: há um cabeçalho de data?
- Olhe para o MEIO da imagem, lado ESQUERDO: há um cabeçalho de data?
- Olhe para o MEIO da imagem, lado DIREITO: há um cabeçalho de data?
- Liste TODOS os cabeçalhos encontrados antes de processar eventos

ETAPA 2 - VALIDAÇÃO DE HORÁRIOS:
- Se você vê eventos com horários 19:00-21:30, depois 11:00-16:00, isso indica MUDANÇA DE DATA
- Horários que "voltam no tempo" significam novo dia
- Procure o cabeçalho de data acima desses eventos de horário mais cedo

ETAPA 3 - ATRIBUIR DATAS:
- Para cada evento, identifique qual cabeçalho está IMEDIATAMENTE ACIMA dele
- Se não há cabeçalho visível acima, use o último cabeçalho visto na mesma coluna
- NUNCA use a data de um cabeçalho da coluna esquerda para eventos da coluna direita

LAYOUT DE DUAS COLUNAS - REGRAS:
- Coluna esquerda e direita podem ter cabeçalhos DIFERENTES
- Um cabeçalho "SÁBADO (31/01)" na coluna esquerda NÃO se aplica à coluna direita
- Se a coluna direita tem "DOMINGO (01/02)", TODOS os eventos abaixo dele são de DOMINGO
- Se a coluna direita NÃO tem cabeçalho próprio, continua a data da coluna esquerda
- ATENÇÃO: Eventos como "Ensaio do Bloco Olodum", "Syren Festival", "ClubLatty", "Samba Ohana" podem estar sob um cabeçalho "DOMINGO" que você precisa encontrar

DICA ADICIONAL - EVOLUÇÃO CRONOLÓGICA DOS HORÁRIOS:
- Dentro de uma mesma data, os horários geralmente progridem cronologicamente (11:00, 12:00, 13:00, etc.)
- Se você vê horários voltando no tempo (ex: 21:00, depois 11:00), provavelmente mudou de data
- Use a progressão de horários como PISTA ADICIONAL para identificar mudanças de data
- Exemplo: Se eventos vão de 13:00 até 21:30, e depois volta para 11:00, o evento de 11:00 provavelmente é do dia seguinte

EXEMPLO DE ESTRUTURA (DUAS COLUNAS):

CASO 1 - Continuação da mesma data:
COLUNA ESQUERDA:          |  COLUNA DIREITA:
SÁBADO (31/01)            |  (continua SÁBADO 31/01)
- Evento A (31/01)        |  - Evento E (31/01)
- Evento B (31/01)        |  - Evento F (31/01)
- Evento C (31/01)        |  - Evento G (31/01)
- Evento D (31/01)        |  - Evento H (31/01)

CASO 2 - Novo cabeçalho na segunda coluna:
COLUNA ESQUERDA:          |  COLUNA DIREITA:
SÁBADO (31/01)            |  (continua SÁBADO 31/01)
- Evento A (31/01)        |  - Evento E (31/01)
- Evento B (31/01)        |  - Evento F (31/01)
                          |  
                          |  DOMINGO (01/02)
                          |  - Evento G (01/02)
                          |  - Evento H (01/02)

IMPORTANTE - EXTRAIA TODOS OS EVENTOS:
- Não pule nenhum evento da lista
- Cada linha com nome de evento, local ou horário é um evento separado
- Continue lendo até encontrar o próximo cabeçalho de data ou o fim da imagem

Para cada evento, retorne um objeto JSON com:
- title: Nome do evento (máximo 100 caracteres)
- date: Data no formato DD/MM/YYYY (do cabeçalho + ano atual)
- time: Horário no formato HH:MM (se não especificado, use "19:00")
- venue: Local do evento (nome do local, endereço ou bairro)
- price: Preço ("Grátis" se gratuito, "Consulte" se não especificado, ou valor como "R$ 50")
- description: Descrição adicional se houver (opcional)

IMPORTANTE:
- Retorne APENAS um array JSON válido, sem texto adicional
- Se não houver eventos, retorne um array vazio: []
- EXTRAIA TODOS OS EVENTOS, não apenas alguns
- LEIA a data do cabeçalho que está ACIMA de cada grupo de eventos

Exemplo de resposta:
[
  {
    "title": "Show de Fulano",
    "date": "30/01/2026",
    "time": "20:00",
    "venue": "Teatro Castro Alves",
    "price": "R$ 50"
  },
  {
    "title": "Show de Beltrano",
    "date": "31/01/2026",
    "time": "21:00",
    "venue": "TCA",
    "price": "Grátis"
  }
]
`.trim();

async function testImage(imagePath) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📸 Testing: ${path.basename(imagePath)}`);
  console.log('='.repeat(80));

  try {
    // Read image file
    const imageBuffer = fs.readFileSync(imagePath);
    const ext = path.extname(imagePath).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';

    console.log(`📊 Image size: ${(imageBuffer.length / 1024).toFixed(2)} KB`);
    console.log(`📋 MIME type: ${mimeType}`);
    console.log(`\n🤖 Analyzing with Gemini Vision (API v1)...`);

    // Call Gemini API v1 directly
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: PROMPT },
            {
              inline_data: {
                mime_type: mimeType,
                data: imageBuffer.toString('base64')
              }
            }
          ]
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.log(`\n❌ API Error: ${data.error?.message || 'Unknown error'}`);
      console.log(JSON.stringify(data, null, 2));
      return;
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      console.log('\n❌ No text in response');
      console.log(JSON.stringify(data, null, 2));
      return;
    }

    console.log(`\n📝 Raw Response:`);
    console.log(text);

    // Extract JSON from response
    let jsonText = text.trim();
    
    // Remove markdown code blocks if present
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```\n?$/g, '').trim();
    }

    // Parse JSON
    const events = JSON.parse(jsonText);

    if (!Array.isArray(events)) {
      console.log('\n❌ Response is not an array');
      return;
    }

    console.log(`\n✅ Extracted ${events.length} event(s):`);
    console.log(JSON.stringify(events, null, 2));

  } catch (err) {
    console.log(`\n❌ Error: ${err.message}`);
  }
}

async function main() {
  const postsDir = path.join(process.cwd(), 'postref');

  console.log('🖼️  Gemini Vision Test - Instagram Stories (API v1)\n');
  console.log(`📁 Looking for images in: ${postsDir}\n`);

  if (!fs.existsSync(postsDir)) {
    console.log('❌ Directory not found');
    return;
  }

  const files = fs.readdirSync(postsDir)
    .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
    .map(f => path.join(postsDir, f));

  if (files.length === 0) {
    console.log('❌ No images found in postref/ directory');
    return;
  }

  console.log(`✅ Found ${files.length} image(s)\n`);

  for (const file of files) {
    await testImage(file);
    
    if (files.indexOf(file) < files.length - 1) {
      console.log('\n⏳ Waiting 2 seconds before next image...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('✅ Test complete!');
  console.log('='.repeat(80));
}

main().catch(console.error);
