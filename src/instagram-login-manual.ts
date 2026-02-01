import 'dotenv/config'
import { chromium } from 'playwright'
import { writeFileSync } from 'fs'

async function manualLogin() {
  console.log('='.repeat(60))
  console.log('INSTAGRAM - LOGIN MANUAL')
  console.log('='.repeat(60))
  console.log('\n📌 Instruções:')
  console.log('1. O navegador vai abrir')
  console.log('2. Faça login MANUALMENTE no Instagram')
  console.log('3. Após login bem-sucedido, pressione ENTER aqui no terminal')
  console.log('4. Os cookies serão salvos automaticamente\n')

  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100,
  })

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
  })

  const page = await context.newPage()
  
  console.log('🌐 Abrindo Instagram...')
  await page.goto('https://www.instagram.com/accounts/login/')

  console.log('\n⏳ Aguardando você fazer login...')
  console.log('💡 Pressione ENTER após fazer login com sucesso')

  // Wait for user to press Enter
  await new Promise<void>((resolve) => {
    process.stdin.once('data', () => resolve())
  })

  console.log('\n💾 Salvando cookies...')
  const cookies = await context.cookies()
  writeFileSync('instagram-cookies.json', JSON.stringify(cookies, null, 2))
  
  console.log('✅ Cookies salvos em instagram-cookies.json')
  console.log('✅ Agora você pode rodar o scraper normalmente!')
  
  await browser.close()
  process.exit(0)
}

manualLogin().catch((error) => {
  console.error('❌ Erro:', error)
  process.exit(1)
})
