import 'dotenv/config';

const apiKey = process.env.GEMINI_API_KEY;

console.log('🔑 Checking Gemini API Key...\n');

if (!apiKey) {
  console.error('❌ GEMINI_API_KEY not set in .env file');
  process.exit(1);
}

console.log(`✅ API Key found: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
console.log(`📏 Length: ${apiKey.length} characters`);

// Test with a simple text request (no vision)
console.log('\n🧪 Testing API key with simple text request...\n');

const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;

try {
  const response = await fetch(testUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: 'Say "Hello World" in JSON format: {"message": "..."}'
        }]
      }]
    })
  });

  const data = await response.json();

  if (response.ok) {
    console.log('✅ API Key is valid!');
    console.log('📝 Response:', JSON.stringify(data, null, 2));
  } else {
    console.log('❌ API Key test failed');
    console.log('📝 Error:', JSON.stringify(data, null, 2));
  }
} catch (err) {
  console.log('❌ Request failed:', err.message);
}
