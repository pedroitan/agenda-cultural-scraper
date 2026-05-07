import { ApifyClient } from 'apify-client'
import type { InstagramPost } from '../../types/instagram.types.js'
import * as fs from 'fs'
import * as path from 'path'

export interface ApifyInstagramOptions {
  username: string
  maxPosts: number
  includeStories?: boolean
  maxDaysOld?: number  // Máximo de dias de antiguidade do post (padrão: 7)
  specificPostUrls?: string[]  // URLs específicas de posts para buscar
}

export class ApifyAdapter {
  private client: ApifyClient
  private cacheDir: string
  private cacheTTL: number = 24 * 60 * 60 * 1000 // 24 horas
  private loggedFields: boolean = false

  constructor(token: string) {
    this.client = new ApifyClient({ token })
    this.cacheDir = path.join(process.cwd(), '.cache', 'instagram-apify')
    this.ensureCacheDir()
  }

  private ensureCacheDir(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true })
    }
  }

  private getCacheKey(username: string, specificUrls?: string[]): string {
    if (specificUrls && specificUrls.length > 0) {
      return `specific-${specificUrls.sort().join(',')}`
    }
    return `profile-${username}`
  }

  private getCacheFilePath(key: string, raw: boolean = false): string {
    const suffix = raw ? '-raw' : ''
    return path.join(this.cacheDir, `${key}${suffix}.json`)
  }

  private loadFromCache(key: string): InstagramPost[] | null {
    const filePath = this.getCacheFilePath(key)
    
    try {
      if (!fs.existsSync(filePath)) {
        return null
      }

      const stats = fs.statSync(filePath)
      const age = Date.now() - stats.mtimeMs

      if (age > this.cacheTTL) {
        // Cache expirado, deletar
        fs.unlinkSync(filePath)
        return null
      }

      const data = fs.readFileSync(filePath, 'utf-8')
      const cached = JSON.parse(data)
      
      console.log(`   💾 Loaded ${cached.length} posts from cache (age: ${Math.round(age / 1000 / 60)}min)`)
      return cached
    } catch (error) {
      console.warn(`   ⚠️ Failed to load from cache: ${error}`)
      return null
    }
  }

  private saveToCache(key: string, posts: InstagramPost[], rawItems?: any[]): void {
    const filePath = this.getCacheFilePath(key)
    
    try {
      fs.writeFileSync(filePath, JSON.stringify(posts, null, 2))
      console.log(`   💾 Saved ${posts.length} posts to cache`)
      
      // Salvar raw items para debug
      if (rawItems) {
        const rawPath = this.getCacheFilePath(key, true)
        fs.writeFileSync(rawPath, JSON.stringify(rawItems[0], null, 2))
        console.log(`   💾 Saved raw Apify item to cache for debug`)
      }
    } catch (error) {
      console.warn(`   ⚠️ Failed to save to cache: ${error}`)
    }
  }

  /**
   * Busca posts do Instagram usando Apify Instagram Profile Scraper
   */
  async getInstagramPosts(options: ApifyInstagramOptions): Promise<InstagramPost[]> {
    console.log(`📱 Fetching Instagram posts for @${options.username}...`)

    const cacheKey = this.getCacheKey(options.username, options.specificPostUrls)
    
    // Tentar carregar do cache primeiro
    const cachedPosts = this.loadFromCache(cacheKey)
    if (cachedPosts) {
      // Aplicar filtros localmente nos dados em cache
      return this.applyLocalFilters(cachedPosts, options)
    }

    try {
      // Se tem URLs específicas, usar parâmetro correto do Apify
      let input: any
      if (options.specificPostUrls && options.specificPostUrls.length > 0) {
        input = {
          directUrls: options.specificPostUrls,
          resultsType: 'posts',
          resultsLimit: options.specificPostUrls.length,
          scrapeComments: true,
          commentsLimit: 50,
        }
        console.log(`   Fetching specific posts: ${options.specificPostUrls.join(', ')}`)
      } else {
        input = {
          directUrls: [`https://www.instagram.com/${options.username}/`],
          resultsType: 'posts',
          resultsLimit: options.maxPosts,
          searchType: 'user',
          searchLimit: options.maxPosts,
          scrapeComments: true,
          commentsLimit: 50,
        }
      }

      console.log(`⏳ Starting Apify actor...`)
      console.log(`   Input:`, JSON.stringify(input, null, 2))
      
      const run = await this.client.actor('apify/instagram-scraper').call(input)

      console.log(`⏳ Waiting for results...`)
      console.log(`   Run ID: ${run.id}`)
      console.log(`   Dataset ID: ${run.defaultDatasetId}`)
      
      const { items } = await this.client.dataset(run.defaultDatasetId).listItems()
      
      console.log(`   Raw items count: ${items.length}`)
      
      // Transformar items para InstagramPost
      const posts = items.map(item => {
        // Logar campos do item raw para debug (primeira vez apenas)
        if (!this.loggedFields) {
          console.log(`   🔍 Available fields in Apify item:`, Object.keys(item).join(', '))
          // Logar campos que contenham 'pic', 'avatar', 'profile', 'image'
          const picFields = Object.keys(item).filter(k => 
            k.toLowerCase().includes('pic') || 
            k.toLowerCase().includes('avatar') || 
            k.toLowerCase().includes('profile') ||
            k.toLowerCase().includes('owner')
          )
          if (picFields.length > 0) {
            console.log(`   🖼️ Profile-related fields:`, picFields.join(', '))
            picFields.forEach(field => {
              console.log(`      ${field}:`, typeof item[field] === 'string' ? item[field].substring(0, 50) + '...' : item[field])
            })
          }
          this.loggedFields = true
        }
        return this.transformToInstagramPost(item)
      })
      
      // Salvar no cache
      this.saveToCache(cacheKey, posts, items)
      
      // Aplicar filtros localmente
      return this.applyLocalFilters(posts, options)
    } catch (error) {
      console.error('❌ Apify error:', error)
      throw new Error(`Failed to fetch Instagram posts: ${error}`)
    }
  }

  /**
   * Aplica filtros localmente (data, etc.) nos posts
   */
  private applyLocalFilters(posts: InstagramPost[], options: ApifyInstagramOptions): InstagramPost[] {
    // Se tem URLs específicas, não filtrar por data
    if (options.specificPostUrls && options.specificPostUrls.length > 0) {
      console.log(`   Using specific posts, no date filter applied`)
      // Limitar ao número de URLs específicas
      return posts.slice(0, options.specificPostUrls.length)
    }
    
    // Filtrar posts por data (apenas posts recentes)
    const maxDaysOld = options.maxDaysOld || 7
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - maxDaysOld)
    
    const filteredPosts = posts.filter(post => {
      if (!post.timestamp || typeof post.timestamp !== 'string' && typeof post.timestamp !== 'number') {
        return false
      }
      try {
        const postDate = new Date(post.timestamp as string | number)
        return !isNaN(postDate.getTime()) && postDate >= cutoffDate
      } catch {
        return false
      }
    })
    
    // Ordenar por data (mais recentes primeiro)
    filteredPosts.sort((a, b) => {
      const dateA = new Date(a.timestamp as string | number).getTime()
      const dateB = new Date(b.timestamp as string | number).getTime()
      return dateB - dateA
    })
    
    console.log(`   Filtered to ${filteredPosts.length} posts from last ${maxDaysOld} days (sorted by date)`)
    
    return filteredPosts
  }

  /**
   * Transforma item do Apify para formato InstagramPost
   */
  private transformToInstagramPost(item: any): InstagramPost {
    // Extrair imagens
    const images: string[] = []
    
    // displayUrl é a imagem principal do post (sempre incluir)
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

    // Extrair imagem de perfil (para usar como thumbnail dos eventos)
    const profilePicture = item.ownerProfilePicUrl || item.profilePictureUrl || item.ownerProfilePicture || item.profilePicUrl

    if (profilePicture) {
      console.log(`   👤 Profile picture found: ${profilePicture.substring(0, 50)}...`)
    } else {
      console.log(`   ⚠️ No profile picture found in item`)
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
      profilePicture, // Adicionar imagem de perfil
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
