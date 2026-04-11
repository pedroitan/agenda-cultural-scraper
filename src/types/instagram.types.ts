// Instagram-specific types

export enum ContentType {
  TEXT_ONLY = 'text_only',
  IMAGE_POST = 'image_post',
  IMAGE_STORY = 'image_story',
  VIDEO_STORY = 'video_story',
  CAROUSEL = 'carousel',
}

export interface ContentMetadata {
  type: ContentType
  hasCaption: boolean
  hasImages: boolean
  hasVideo: boolean
  imageCount: number
  isStory: boolean
}

export interface InstagramPost {
  id: string
  type: 'post' | 'story'
  caption: string
  images: string[]
  videoUrl?: string
  timestamp: string
  url: string
  likesCount?: number
  commentsCount?: number
}

export interface ExtractedEvent {
  title: string
  date: string // DD/MM/YYYY
  time: string // HH:MM
  venue: string
  price: string // "Grátis" | "Consulte" | "R$ XX"
  description?: string
}

export interface InstagramScraperConfig {
  enabled: boolean
  instagramUsername: string
  maxPosts: number
  includeStories: boolean
  apifyToken: string
  geminiApiKey: string
  formats: {
    text: {
      enabled: boolean
      priority: number
    }
    image: {
      enabled: boolean
      priority: number
      maxImagesPerPost: number
    }
    video: {
      enabled: boolean
      priority: number
      maxFrames: number
      frameInterval: number
    }
  }
}
