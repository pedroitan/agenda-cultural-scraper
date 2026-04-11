import { ContentType } from '../../types/instagram.types.js'
import type { InstagramPost, ContentMetadata } from '../../types/instagram.types.js'

export class ContentDetector {
  detect(post: InstagramPost): ContentMetadata {
    const hasCaption = this.hasStructuredCaption(post.caption)
    const hasImages = post.images && post.images.length > 0
    const hasVideo = post.videoUrl !== undefined
    const isStory = post.type === 'story'

    // Determinar tipo principal
    let type: ContentType

    if (hasVideo && isStory) {
      type = ContentType.VIDEO_STORY
    } else if (hasImages && isStory) {
      type = ContentType.IMAGE_STORY
    } else if (hasImages && post.images.length > 1) {
      type = ContentType.CAROUSEL
    } else if (hasImages) {
      type = ContentType.IMAGE_POST
    } else if (hasCaption) {
      type = ContentType.TEXT_ONLY
    } else {
      type = ContentType.TEXT_ONLY // fallback
    }

    return {
      type,
      hasCaption,
      hasImages,
      hasVideo,
      imageCount: post.images?.length || 0,
      isStory,
    }
  }

  private hasStructuredCaption(caption: string): boolean {
    if (!caption || caption.length < 20) {
      return false
    }

    // Detectar se caption tem estrutura de eventos
    const patterns = [
      /\d{1,2}:\d{2}/, // Horário (ex: 19:00, 21:30)
      /📍|📅|⏰|💰|🎭|🎪|🎨|🎵/, // Emojis comuns em eventos
      /(sexta|sábado|domingo|segunda|terça|quarta|quinta)(-feira)?/i, // Dias da semana
      /\d{1,2}\/\d{1,2}/, // Datas (ex: 30/01)
      /(grátis|gratuito|entrada franca)/i, // Indicadores de preço
    ]

    // Contar quantos padrões foram encontrados
    const matchCount = patterns.filter(pattern => pattern.test(caption)).length

    // Considerar estruturado se tiver pelo menos 2 padrões
    return matchCount >= 2
  }

  /**
   * Estima a qualidade do conteúdo para priorização
   * Retorna um score de 0-100
   */
  estimateQuality(post: InstagramPost, metadata: ContentMetadata): number {
    let score = 0

    // Caption estruturado é bom sinal
    if (metadata.hasCaption) {
      score += 30
    }

    // Múltiplas imagens geralmente têm mais eventos
    if (metadata.imageCount > 1) {
      score += 20
    }

    // Posts recentes são mais relevantes
    const postAge = Date.now() - new Date(post.timestamp).getTime()
    const daysOld = postAge / (1000 * 60 * 60 * 24)
    if (daysOld < 1) {
      score += 30
    } else if (daysOld < 3) {
      score += 20
    } else if (daysOld < 7) {
      score += 10
    }

    // Engajamento alto indica conteúdo relevante
    if (post.likesCount) {
      if (post.likesCount > 1000) score += 20
      else if (post.likesCount > 500) score += 15
      else if (post.likesCount > 100) score += 10
    }

    return Math.min(score, 100)
  }
}
