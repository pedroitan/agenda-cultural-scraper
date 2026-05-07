import { InstagramApifyScraper } from './scrapers/instagram-apify/instagram-apify-scraper.js'
import type { ScraperInput } from './types.js'

/**
 * Wrapper para Instagram Apify Scraper
 * Integra com o sistema de scrapers principal
 */
export async function runInstagramApifyScrape(input: ScraperInput) {
  const config = {
    username: process.env.INSTAGRAM_USERNAME || 'agendaalternativasalvador',
    maxPosts: process.env.INSTAGRAM_MAX_POSTS ? parseInt(process.env.INSTAGRAM_MAX_POSTS) : 20,
    includeStories: false, // Stories serão processados separadamente via Instagram Vision
    apifyToken: process.env.APIFY_TOKEN || '',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
  }

  if (!config.apifyToken) {
    throw new Error('APIFY_TOKEN is required for Instagram Apify scraper')
  }

  const scraper = new InstagramApifyScraper(config)

  // Testar conexão antes de começar
  const connected = await scraper.testConnection()
  if (!connected) {
    throw new Error('Failed to connect to Apify')
  }

  // Verificar créditos
  const credits = await scraper.checkCredits()
  console.log(`💰 Available Apify credits: ${credits}`)

  // Executar scrape
  const result = await scraper.scrape()

  return {
    items_fetched: result.items_fetched,
    valid: result.valid,
    invalid_count: result.invalid_count,
  }
}
