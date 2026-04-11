import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('❌ GEMINI_API_KEY not set in .env file');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

const PROMPT = `
Analise esta imagem de post do Instagram e extraia TODOS os eventos culturais mencionados.

Para cada evento, retorne um objeto JSON com:
- title: Nome do evento (máximo 100 caracteres)
- date: Data no formato DD/MM/YYYY (se não tiver ano, use 2026)
- time: Horário no formato HH:MM (se não especificado, use "19:00")
- venue: Local do evento (nome do local, endereço ou bairro)
- price: Preço ("Grátis" se gratuito, "Consulte" se não especificado, ou valor como "R$ 50")
- description: Descrição adicional se houver (opcional)

IMPORTANTE:
- Retorne APENAS um array JSON válido, sem texto adicional
- Se não houver eventos, retorne um array vazio: []
- Ignore informações que não sejam eventos (propaganda, avisos, etc)
- Se a data for relativa (ex: "sábado"), calcule a data mais próxima
- Se houver múltiplos eventos na mesma imagem, retorne todos

Exemplo de resposta:
[
  {
    "title": "Show de Fulano",
    "date": "15/02/2026",
    "time": "20:00",
    "venue": "Teatro Castro Alves",
    "price": "R$ 50",
    "description": "Com participação especial de Beltrano"
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
    console.log(`\n🤖 Analyzing with Gemini Vision...`);

    // Call Gemini Vision API
    const result = await model.generateContent([
      PROMPT,
      {
        inlineData: {
          data: imageBuffer.toString('base64'),
          mimeType,
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();

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
    if (err.stack) {
      console.log(err.stack);
    }
  }
}

async function main() {
  const postsDir = path.join(process.cwd(), 'postref');

  console.log('🖼️  Gemini Vision Test - Instagram Stories\n');
  console.log(`📁 Looking for images in: ${postsDir}\n`);

  // Check if directory exists
  if (!fs.existsSync(postsDir)) {
    console.log('❌ Directory not found. Creating it...');
    fs.mkdirSync(postsDir, { recursive: true });
    console.log('✅ Directory created. Please add images and run again.');
    return;
  }

  // Get all image files
  const files = fs.readdirSync(postsDir)
    .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
    .map(f => path.join(postsDir, f));

  if (files.length === 0) {
    console.log('❌ No images found in postref/ directory');
    console.log('   Supported formats: .jpg, .jpeg, .png, .webp');
    console.log('   Please add some Instagram story images and run again.');
    return;
  }

  console.log(`✅ Found ${files.length} image(s)\n`);

  // Test each image
  for (const file of files) {
    await testImage(file);
    
    // Wait a bit between requests to avoid rate limiting
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
