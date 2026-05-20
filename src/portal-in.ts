/**
 * Portal IN Restaurant Scraper
 * 
 * This script imports restaurants from the Portal IN article about new restaurants in Salvador.
 * The article features 20 new restaurants opened in 2025.
 * 
 * Source: https://www.portalin.com.br/notas/conheca-20-novos-restaurantes-para-saborear-em-salvador/
 * 
 * Usage: npx tsx src/portal-in.ts
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface RestaurantInput {
  name: string
  ranking?: number
  address?: string
  neighborhood?: string
  city?: string
  state?: string
  phone?: string
  description?: string
  cuisine_type?: string
  price_range?: string
  average_price?: number
  hours?: string
  image_url?: string
  instagram_url?: string
  website_url?: string
  source: string
  external_id?: string
}

// Restaurants from Portal IN - manually extracted from article
const portalInRestaurants: RestaurantInput[] = [
  {
    name: 'Pala7 Rooftop',
    neighborhood: 'Centro Histórico',
    city: 'Salvador',
    state: 'BA',
    description: 'No topo do histórico Palacete Tira-Chapéu, o chef Claude Troisgros, referência internacional em gastronomia, une a culinária mediterrânea à sofisticação francesa. O cardápio surpreende ao destacar ingredientes locais com a assinatura criativa de Troisgros.',
    cuisine_type: 'Mediterrânea francesa',
    instagram_url: 'https://www.instagram.com/palacetetirachapeu',
    source: 'portal_in_2025',
    external_id: 'portal-in-pala7'
  },
  {
    name: 'Mōrea Asian Fusion',
    neighborhood: 'Horto Florestal',
    city: 'Salvador',
    state: 'BA',
    description: 'Sob a batuta dos chefs Carolina Schaper e Marcelo Fugita, o Mōrea celebra a culinária asiática com pratos que vão além do sushi tradicional. Destaques incluem o mongolian beef e o bao de copa lombo. Localizado no rooftop do Alameda Vert.',
    cuisine_type: 'Asiática fusion',
    instagram_url: 'https://www.instagram.com/morea.asian',
    source: 'portal_in_2025',
    external_id: 'portal-in-morea'
  },
  {
    name: 'Gero',
    neighborhood: 'Barra',
    city: 'Salvador',
    state: 'BA',
    description: 'No Fasano Salvador, o chef Bahia Brito comanda o Gero, que traz uma proposta mais casual, mas mantendo a essência da gastronomia italiana clássica. A atmosfera elegante convida a desfrutar o melhor da culinária italiana.',
    cuisine_type: 'Italiana clássica',
    instagram_url: 'https://www.instagram.com/fasano',
    source: 'portal_in_2025',
    external_id: 'portal-in-gero'
  },
  {
    name: 'Ainá Lamen',
    neighborhood: 'Rio Vermelho',
    city: 'Salvador',
    state: 'BA',
    description: 'O chef Vini Figueira, renomado na cena gastronômica baiana, apresenta o primeiro restaurante especializado em lámen de Salvador. Localizado no Rio Vermelho, o Ainá combina um conceito dinâmico e pratos de alta qualidade.',
    cuisine_type: 'Lamen japonesa',
    instagram_url: 'https://www.instagram.com/ainalamen',
    source: 'portal_in_2025',
    external_id: 'portal-in-aina'
  },
  {
    name: 'Casaria',
    neighborhood: 'Centro Histórico',
    city: 'Salvador',
    state: 'BA',
    description: 'Dentro do Palacete Tira-Chapéu, o Casaria une história e inovação em um ambiente sofisticado. Um destino que exala charme e gastronomia de qualidade.',
    cuisine_type: 'Gastronomia contemporânea',
    instagram_url: 'https://www.instagram.com/casaria.ssa',
    source: 'portal_in_2025',
    external_id: 'portal-in-casaria'
  },
  {
    name: 'Cazinha Bistrô',
    neighborhood: 'Comércio',
    city: 'Salvador',
    state: 'BA',
    description: 'No Solar do Unhão, o chef Leo Cazinha combina hospitalidade e uma abordagem artesanal. Sua paixão pelos detalhes reflete-se em pratos que exploram ingredientes frescos e locais, tudo com um toque acolhedor.',
    cuisine_type: 'Gastronomia artesanal',
    instagram_url: 'https://www.instagram.com/cazinhabistro',
    source: 'portal_in_2025',
    external_id: 'portal-in-cazinha'
  },
  {
    name: 'Genaro por Vini Figueira',
    neighborhood: 'Centro',
    city: 'Salvador',
    state: 'BA',
    description: 'O chef Vini Figueira também assina este restaurante no Wish Hotel da Bahia. Inspirado na grandiosidade do painel de Genaro de Carvalho, o espaço celebra a alta gastronomia em um cenário repleto de história.',
    cuisine_type: 'Alta gastronomia',
    source: 'portal_in_2025',
    external_id: 'portal-in-genaro'
  },
  {
    name: 'Jeanne Garcia Confeitaria',
    neighborhood: 'Pituba',
    city: 'Salvador',
    state: 'BA',
    description: 'Conhecida por seus macarons impecáveis, Jeanne Garcia traz sua experiência para sua primeira loja física, na Pituba. Um espaço encantador para quem aprecia doces refinados.',
    cuisine_type: 'Confeitaria refinada',
    instagram_url: 'https://www.instagram.com/jeannegarciaconfeitaria',
    source: 'portal_in_2025',
    external_id: 'portal-in-jeanne'
  },
  {
    name: 'Leto Gastronomia',
    neighborhood: 'Comércio',
    city: 'Salvador',
    state: 'BA',
    description: 'O chef Raphael Sepúlveda, com mais de 15 anos de experiência internacional, eleva o nível da alta gastronomia na Bahia Marina. O Leto oferece pratos sofisticados em um ambiente elegante.',
    cuisine_type: 'Alta gastronomia',
    instagram_url: 'https://www.instagram.com/letogastronomia',
    source: 'portal_in_2025',
    external_id: 'portal-in-leto'
  },
  {
    name: 'Megiro',
    neighborhood: 'Horto Florestal',
    city: 'Salvador',
    state: 'BA',
    description: 'Comandado pelos chefs Fabricio Lemos e Lisiane Arouca, o Megiro é um boteco contemporâneo que resgata sabores tradicionais com um toque inovador. Um espaço descontraído e cheio de personalidade no Horto Florestal.',
    cuisine_type: 'Boteco contemporâneo',
    instagram_url: 'https://www.instagram.com/megiroboteco',
    source: 'portal_in_2025',
    external_id: 'portal-in-megiro'
  },
  {
    name: 'Nagui Restaurante',
    neighborhood: 'Horto Florestal',
    city: 'Salvador',
    state: 'BA',
    description: 'Sob a liderança do chef Luciano Costa, o Nagui traz uma nova proposta de culinária japonesa ao Horto Florestal, mesclando sofisticação e inovação para atender ao público exigente da região.',
    cuisine_type: 'Japonesa contemporânea',
    instagram_url: 'https://www.instagram.com/naguirestaurante',
    source: 'portal_in_2025',
    external_id: 'portal-in-nagui'
  },
  {
    name: 'Pier VinteOitoTrinta',
    neighborhood: 'Barra',
    city: 'Salvador',
    state: 'BA',
    description: 'Comandado pela equipe do restaurante Egeu, o Pier oferece pratos compartilháveis em um espaço que combina design sofisticado e vistas deslumbrantes da Baía de Todos-os-Santos.',
    cuisine_type: 'Gastronomia compartilhável',
    instagram_url: 'https://www.instagram.com/piervinteoitotrinta',
    source: 'portal_in_2025',
    external_id: 'portal-in-pier'
  },
  {
    name: 'Pissa',
    neighborhood: 'Barra',
    city: 'Salvador',
    state: 'BA',
    description: 'Agora localizada na Villa da Barra, a Pissa renova seu conceito de pizzas artesanais, combinando ingredientes de alta qualidade com uma massa leve e irresistível.',
    cuisine_type: 'Pizza artesanal',
    instagram_url: 'https://www.instagram.com/pissa_salvador',
    source: 'portal_in_2025',
    external_id: 'portal-in-pissa'
  },
  {
    name: 'Pur Doux Confeitaria',
    neighborhood: 'Horto Florestal',
    city: 'Salvador',
    state: 'BA',
    description: 'Na Alameda Vert, a Pur Doux se destaca como uma das melhores confeitarias da cidade, oferecendo um mix de doces impecáveis.',
    cuisine_type: 'Confeitaria',
    instagram_url: 'https://www.instagram.com/purdouxpatisserie',
    source: 'portal_in_2025',
    external_id: 'portal-in-pur-doux'
  },
  {
    name: 'Sagratto Café Bar',
    neighborhood: 'Bonfim',
    city: 'Salvador',
    state: 'BA',
    description: 'Aos pés da Basílica do Senhor do Bonfim, o Sagratto, comandado pelo chef Victor Bebé, combina gastronomia de excelência com um ambiente sagrado e acolhedor.',
    cuisine_type: 'Café bar',
    instagram_url: 'https://www.instagram.com/sagrattocafebar',
    source: 'portal_in_2025',
    external_id: 'portal-in-sagratto'
  },
  {
    name: 'Santiago Culinária Ibérica',
    neighborhood: 'Barra',
    city: 'Salvador',
    state: 'BA',
    description: 'O novo endereço no Shopping Barra mantém a tradição da culinária mediterrânea e espanhola, com destaque para as paellas que encantam o paladar.',
    cuisine_type: 'Mediterrânea e espanhola',
    instagram_url: 'https://www.instagram.com/santiago.culinaria',
    source: 'portal_in_2025',
    external_id: 'portal-in-santiago'
  },
  {
    name: 'Seu Zelito',
    neighborhood: 'Pituba',
    city: 'Salvador',
    state: 'BA',
    description: 'Inspirado pelo avô do proprietário Daniel Freire, o Seu Zelito é um boteco que homenageia a boemia baiana com petiscos autênticos e atmosfera descontraída na Pituba.',
    cuisine_type: 'Boteco baiano',
    source: 'portal_in_2025',
    external_id: 'portal-in-seu-zelito'
  },
  {
    name: 'Vino!',
    neighborhood: 'Barra',
    city: 'Salvador',
    state: 'BA',
    description: 'Comandada pelas sócias Ananda Rodrigues, Rochele Dourado e Jessica Martins, a Vino! é a maior rede de wine bars do país e oferece uma seleção impecável de rótulos, harmonizados com um menu de inspiração regional.',
    cuisine_type: 'Wine bar',
    instagram_url: 'https://www.instagram.com/vino.salvador',
    source: 'portal_in_2025',
    external_id: 'portal-in-vino'
  }
]

async function importPortalInRestaurants() {
  console.log('Importing 18 restaurants from Portal IN...')
  
  let inserted = 0
  let errors = 0
  for (const restaurant of portalInRestaurants) {
    const { error } = await supabase
      .from('restaurants')
      .insert(restaurant)
    
    if (error) {
      // If duplicate, ignore
      if (error.code === '23505') {
        console.log(`- Skipped (duplicate): ${restaurant.name}`)
      } else {
        console.error(`Error inserting ${restaurant.name}:`, error.message)
        errors++
      }
    } else {
      inserted++
      console.log(`✓ Inserted: ${restaurant.name}`)
    }
  }
  
  console.log(`\nInserted ${inserted}/${portalInRestaurants.length} restaurants`)
  if (errors > 0) console.log(`Errors: ${errors}`)
}

importPortalInRestaurants()
