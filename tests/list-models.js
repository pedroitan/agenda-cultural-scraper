import 'dotenv/config';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('❌ GEMINI_API_KEY not set in .env file');
  process.exit(1);
}

console.log('🔍 Listing available Gemini models...\n');

const url = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;

try {
  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    console.log('❌ Error:', data.error?.message || 'Unknown error');
    console.log(JSON.stringify(data, null, 2));
    process.exit(1);
  }

  console.log('✅ Available models:\n');
  
  if (data.models && data.models.length > 0) {
    data.models.forEach(model => {
      console.log(`📦 ${model.name}`);
      console.log(`   Display Name: ${model.displayName}`);
      console.log(`   Description: ${model.description}`);
      console.log(`   Supported Methods: ${model.supportedGenerationMethods?.join(', ') || 'N/A'}`);
      console.log(`   Input Token Limit: ${model.inputTokenLimit || 'N/A'}`);
      console.log(`   Output Token Limit: ${model.outputTokenLimit || 'N/A'}`);
      console.log('');
    });
  } else {
    console.log('⚠️  No models found');
  }

} catch (err) {
  console.log('❌ Request failed:', err.message);
}
