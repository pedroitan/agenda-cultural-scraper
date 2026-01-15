import { chromium } from 'playwright'

async function debug() {
  const browser = await chromium.launch({ 
    headless: false, // Ver o navegador
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  const page = await browser.newPage()

  try {
    console.log('Navegando para El Cabong...')
    await page.goto('https://elcabong.com.br/agenda/', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    })
    
    // Esperar conteúdo
    await page.waitForTimeout(5000)
    
    // Screenshot inicial
    await page.screenshot({ path: 'debug-1-inicial.png', fullPage: true })
    console.log('Screenshot 1: inicial')
    
    // Contar eventos
    const eventCount = await page.locator('.wpem-event-box-col').count()
    console.log(`Eventos na página: ${eventCount}`)
    
    // Scroll para baixo
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(2000)
    
    // Screenshot após scroll
    await page.screenshot({ path: 'debug-2-scroll.png', fullPage: true })
    console.log('Screenshot 2: após scroll')
    
    // Verificar botão
    const button = page.locator('#load_more_events')
    const buttonCount = await button.count()
    const isVisible = await button.isVisible().catch(() => false)
    
    console.log(`Botão encontrado: ${buttonCount > 0}`)
    console.log(`Botão visível: ${isVisible}`)
    
    // Info do botão via JS
    const buttonInfo = await page.evaluate(() => {
      const btn = document.querySelector('#load_more_events') as HTMLElement
      if (!btn) return null
      const style = getComputedStyle(btn)
      return {
        tagName: btn.tagName,
        className: btn.className,
        id: btn.id,
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        offsetWidth: btn.offsetWidth,
        offsetHeight: btn.offsetHeight,
        innerHTML: btn.innerHTML.slice(0, 100)
      }
    })
    console.log('Info do botão:', JSON.stringify(buttonInfo, null, 2))
    
    if (buttonCount > 0) {
      // Tentar clicar
      console.log('Tentando clicar no botão...')
      
      try {
        await button.click({ timeout: 5000 })
        console.log('Playwright click OK')
      } catch (e) {
        console.log('Playwright click falhou:', e)
        await page.evaluate(() => {
          const btn = document.querySelector('#load_more_events') as HTMLElement
          btn?.click()
        })
        console.log('JS click executado')
      }
      
      await page.waitForTimeout(3000)
      
      // Screenshot após clique
      await page.screenshot({ path: 'debug-3-apos-clique.png', fullPage: true })
      console.log('Screenshot 3: após clique')
      
      // Contar eventos novamente
      const newEventCount = await page.locator('.wpem-event-box-col').count()
      console.log(`Eventos após clique: ${newEventCount}`)
    }
    
    console.log('\nDebug completo! Verifique os screenshots.')
    
    // Manter navegador aberto por 10 segundos para inspeção
    await page.waitForTimeout(10000)
    
  } catch (err) {
    console.error('Erro:', err)
    await page.screenshot({ path: 'debug-error.png', fullPage: true })
  } finally {
    await browser.close()
  }
}

debug().catch(console.error)
