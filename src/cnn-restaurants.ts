/**
 * CNN Brasil V&G Restaurant Scraper
 * 
 * This script imports restaurants from the CNN Brasil V&G article about Salvador restaurants.
 * The article features 7 restaurants curated by Felipe Almeida.
 * 
 * Source: https://www.cnnbrasil.com.br/viagemegastronomia/gastronomia/onde-comer-em-salvador-7-restaurantes-para-conhecer-na-capital-baiana/
 * 
 * Usage: npx tsx src/cnn-restaurants.ts
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

// Restaurants from CNN Brasil V&G - manually extracted from article
const cnnRestaurants: RestaurantInput[] = [
  {
    name: 'Lotti Cucina Italiana',
    address: 'Avenida Lafayete Coutinho, 1010 - Comércio',
    neighborhood: 'Comércio',
    city: 'Salvador',
    state: 'BA',
    phone: '(71) 9992-0698',
    description: 'O Lotti é um dos endereços que costumo frequentar semanalmente. Comandado por Daniel Buzzi, aposta em uma culinária italiana mais autoral e contemporânea. Com unidades na Bahia Marina e no Salvador Shopping, não deixe de pedir o Carpaccio di Pesce, o Bastoncini & Parmiggiano, o Filetto con Cacio e Pepe, o Agnello con Risotto e o Rigatoni alla Vodka com \'Nduja e Gamberi.',
    cuisine_type: 'Italiana contemporânea',
    hours: 'Segunda a quinta, das 12h às 15h e das 19h às 23h; sexta e sábado, das 12h às 23h; domingo, das 12h às 22h',
    instagram_url: 'https://www.instagram.com/lotticucina/',
    source: 'cnn_brasil_vg',
    external_id: 'cnn-vg-lotti'
  },
  {
    name: 'Miss Koh',
    address: 'Avenida Tancredo Neves - Salvador Shopping, Caminho das Árvores',
    neighborhood: 'Caminho das Árvores',
    city: 'Salvador',
    state: 'BA',
    phone: '(71) 99648-5710',
    description: 'O Miss Koh faz parte do mesmo grupo do Lotti e se diferencia pela consultoria de Maurício Santi, Murakami e Paulo Shin, que unem em uma só casa influências da culinária tailandesa, japonesa e coreana, criando uma experiência plural e sofisticada. Vale a pena explorar o cardápio como um todo, mas itens como a Asian Salad, os combinados, o trio de carpaccio, o Arroz de Costela Bovina e a Pancetta no Tamarindo têm feito muito sucesso.',
    cuisine_type: 'Tailandesa, japonesa e coreana',
    hours: 'Segunda a sábado, das 11h30 às 23h; domingo, das 12h às 22h',
    instagram_url: 'https://www.instagram.com/misskohrestaurante',
    source: 'cnn_brasil_vg',
    external_id: 'cnn-vg-miss-koh'
  },
  {
    name: 'Pereira Restaurante',
    address: 'Avenida Sete de Setembro, 3959 - Barra',
    neighborhood: 'Barra',
    city: 'Salvador',
    state: 'BA',
    phone: '(71) 3264-6464',
    description: 'O Pereira Restaurante, localizado na orla do Porto da Barra, tem um astral descontraído e sofisticado, com ambiente charmoso e vista privilegiada para o mar. O espaço mistura elegância e leveza, ideal tanto para um almoço à beira-mar, para um happy hour ou para um jantar. Com certeza, tem a melhor varanda da cidade. Sempre peço pratos com algo do mar, como o mix de frutos do mar crocantes, a salada Caesar de camarão, o camarão com coco e tapioca e o arroz de polvo.',
    cuisine_type: 'Frutos do mar',
    hours: 'Terça e quarta, das 12h à 0h; quinta a sábado, das 12h à 1h; domingo, das 12h à 0h; fechado às segundas',
    instagram_url: 'https://www.instagram.com/pereira_restaurante/',
    source: 'cnn_brasil_vg',
    external_id: 'cnn-vg-pereira'
  },
  {
    name: 'Casa Chálabi',
    address: 'Rua Professora Almerinda Dultra, 67 - B Térreo - Rio Vermelho',
    neighborhood: 'Rio Vermelho',
    city: 'Salvador',
    state: 'BA',
    phone: '(71) 3037-3272',
    description: 'A Casa Chálabi combina um ambiente informal e acolhedor com comida libanesa e mediterrânea bem feita, marcada por frescor e sabor. E o melhor: você pode aproveitar tudo isso sentado na calçada do Rio Vermelho, um dos bairros mais boêmios da cidade. Não deixe de pedir o trio de pastas, o quibe cru, o camarão em molho Harissa e o Mac Chálabi de cordeiro.',
    cuisine_type: 'Libanesa e mediterrânea',
    hours: 'Terça a domingo, das 11h às 22h',
    instagram_url: 'https://www.instagram.com/casachalabi/',
    source: 'cnn_brasil_vg',
    external_id: 'cnn-vg-chalabi'
  }
]

async function importCnnRestaurants() {
  console.log('Importing 4 restaurants from CNN Brasil V&G...')
  
  let inserted = 0
  let errors = 0
  for (const restaurant of cnnRestaurants) {
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
  
  console.log(`\nInserted ${inserted}/${cnnRestaurants.length} restaurants`)
  if (errors > 0) console.log(`Errors: ${errors}`)
}

importCnnRestaurants()
