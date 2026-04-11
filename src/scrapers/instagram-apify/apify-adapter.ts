import { ApifyClient } from 'apify-client'
import type { InstagramPost } from '../../types/instagram.types.js'

export interface ApifyInstagramOptions {
  username: string
  maxPosts: number
  includeStories?: boolean
}

export class ApifyAdapter {
  private client: ApifyClient

  constructor(token: string) {
    this.client = new ApifyClient({ token })
  }

  /**
   * Busca posts do Instagram usando Apify Instagram Profile Scraper
   */
  async getInstagramPosts(options: ApifyInstagramOptions): Promise<InstagramPost[]> {
    console.log(`📱 Fetching Instagram posts for @${options.username}...`)

    try {
      // Usar Instagram Post Scraper do Apify
      // Actor ID: apify/instagram-scraper
      const input = {
        directUrls: [`https://www.instagram.com/${options.username}/`],
        resultsType: 'posts',
        resultsLimit: options.maxPosts,
        searchType: 'user',
        searchLimit: options.maxPosts,
        // Buscar comentários para capturar eventos que continuam nos comments
        scrapeComments: true,
        commentsLimit: 50, // Buscar até 50 comentários por post
      }

      console.log(`⏳ Starting Apify actor...`)
      console.log(`   Input:`, JSON.stringify(input, null, 2))
      
      const run = await this.client.actor('apify/instagram-scraper').call(input)

      console.log(`⏳ Waiting for results...`)
      console.log(`   Run ID: ${run.id}`)
      console.log(`   Dataset ID: ${run.defaultDatasetId}`)
      
      const { items } = await this.client.dataset(run.defaultDatasetId).listItems()
      
      console.log(`   Raw items count: ${items.length}`)
      
      console.log(`✅ Fetched ${items.length} posts from Instagram`)

      return items.map(item => this.transformToInstagramPost(item))
    } catch (error) {
      console.error('❌ Apify error:', error)
      throw new Error(`Failed to fetch Instagram posts: ${error}`)
    }
  }

  /**
   * Transforma item do Apify para formato InstagramPost
   */
  private transformToInstagramPost(item: any): InstagramPost {
    // Extrair imagens
    const images: string[] = []
    
    if (item.displayUrl) {
      images.push(item.displayUrl)
    }
    
    // Se tem carrossel de imagens
    if (item.images && Array.isArray(item.images)) {
      images.push(...item.images)
    }
    
    // Se tem sidecar (múltiplas imagens)
    if (item.childPosts && Array.isArray(item.childPosts)) {
      for (const child of item.childPosts) {
        if (child.displayUrl) {
          images.push(child.displayUrl)
        }
      }
    }

    // Combinar caption + comentários do próprio autor
    let fullCaption = item.caption || ''
    
    if (item.latestComments && Array.isArray(item.latestComments)) {
      // Filtrar apenas comentários do próprio autor (continuação do post)
      const ownerUsername = item.ownerUsername || item.username
      const authorComments = item.latestComments
        .filter((comment: any) => comment.ownerUsername === ownerUsername)
        .map((comment: any) => comment.text)
        .join('\n\n')
      
      if (authorComments) {
        console.log(`    📝 Found ${item.latestComments.filter((c: any) => c.ownerUsername === ownerUsername).length} author comments (continuation)`)
        fullCaption += '\n\n' + authorComments
      }
    }

    return {
      id: item.id || item.shortCode || `post-${Date.now()}`,
      type: 'post', // Apify não retorna stories facilmente
      caption: fullCaption,
      images: this.deduplicateImages(images),
      videoUrl: item.videoUrl,
      timestamp: item.timestamp || new Date().toISOString(),
      url: item.url || `https://instagram.com/p/${item.shortCode}`,
      likesCount: item.likesCount,
      commentsCount: item.commentsCount,
    }
  }

  /**
   * Remove URLs de imagens duplicadas
   */
  private deduplicateImages(images: string[]): string[] {
    return Array.from(new Set(images))
  }

  /**
   * Testa conexão com Apify
   */
  async testConnection(): Promise<boolean> {
    try {
      const user = await this.client.user().get()
      console.log(`✅ Connected to Apify as: ${user?.username || 'unknown'}`)
      return true
    } catch (error) {
      console.error('❌ Failed to connect to Apify:', error)
      return false
    }
  }

  /**
   * Verifica créditos disponíveis
   */
  async checkCredits(): Promise<number> {
    try {
      const user = await this.client.user().get()
      const credits = (user as any)?.usage?.platformCredits || 0
      console.log(`💰 Available Apify credits: ${credits}`)
      return credits
    } catch (error) {
      console.error('❌ Failed to check credits:', error)
      return 0
    }
  }
}
