export type ScraperInput = {
  source: 'sympla' | 'elcabong' | 'instagram'
  city: 'salvador' | 'rio-de-janeiro' | 'sao-paulo'
  untilDays?: number
}

export type EventInput = {
  source: string
  external_id: string
  title: string
  start_datetime: string
  city: string
  venue_name?: string
  image_url?: string
  is_free: boolean
  min_price?: number
  price_text?: string
  category?: string
  tags?: string[]
  url: string
  description?: string
  performers?: string
  duration?: string
  age_restriction?: string
  organizer?: string
  raw_payload: unknown
}

export type ScrapeRunStatus = 'running' | 'success' | 'failed'

export type ScrapeRunInsert = {
  source: string
  city: string
  status?: ScrapeRunStatus
  started_at?: string
  ended_at?: string
  items_fetched?: number
  items_valid?: number
  items_upserted?: number
  items_invalid?: number
  error_message?: string | null
}
