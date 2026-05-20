/**
 * Exame Casual 2025 Restaurant Scraper
 * 
 * This script imports restaurants from the Exame Casual 2025 ranking article.
 * The article features 8 restaurants from Salvador with detailed information.
 * 
 * Source: https://exame.com/casual/os-melhores-restaurantes-de-salvador-segundo-ranking-exame-casual-2025/
 * 
 * Usage: npx tsx src/exame.ts
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

// Restaurants from Exame Casual 2025 - manually extracted from article
const exameRestaurants: RestaurantInput[] = [
  {
    name: 'Origem',
    ranking: 1,
    address: 'Alameda das Algarobas, 74, Caminho das Árvores',
    neighborhood: 'Caminho das Árvores',
    city: 'Salvador',
    state: 'BA',
    description: 'Os reis da alta gastronomia baiana. Assim podem ser definidos os chefs Fabrício Lemos e Lisiane Arouca, que comandam o restaurante autoral Origem, em Salvador. O restaurante foi pioneiro na capital baiana ao apresentar, exclusivamente, um menu degustação. No cardápio mais recente, os chefs desenvolveram uma pesquisa inspirada por uma inquietação sobre as desigualdades e injustiças que remontam à colonização do Brasil e perduram até os dias de hoje. A partir dessa reflexão, surgiu o tema de uma série de menus do Origem, chamada Nossas Heranças. O resultado são receitas que resgatam a culinária baiana como uma herança de resistência e luta pela liberdade, dignidade e humanidade.',
    cuisine_type: 'Alta gastronomia baiana',
    average_price: 380,
    hours: 'De terça a sábado, das 18h30 à meia-noite',
    source: 'exame_casual_2025',
    external_id: 'exame-2025-1'
  },
  {
    name: 'Manga',
    ranking: 9,
    address: 'Rua Professora Almerinda Dultra, 40, Rio Vermelho',
    neighborhood: 'Rio Vermelho',
    city: 'Salvador',
    state: 'BA',
    description: 'O Brasil e a Alemanha se encontram de forma criativa na cozinha do Manga. Os chefs Kafe e Dante Bassi — ela alemã, ele baiano, ambos com passagem pelo aclamado D.O.M. — se destacam pela valorização de alimentos orgânicos e pelo uso de processos feitos na casa, como a arte da charcutaria. O Manga também produz seus próprios pães e sorvetes, e no terraço há uma pequena horta com ervas frescas. O menu degustação, com nove tempos, reflete a união das duas culturas.',
    cuisine_type: 'Brasileira-Alemã',
    average_price: 395,
    hours: 'De terça a sexta, no jantar; sábado, no almoço e no jantar',
    source: 'exame_casual_2025',
    external_id: 'exame-2025-9'
  },
  {
    name: 'Dona Mariquita',
    ranking: 27,
    address: 'Rua do Meio, 178, Rio Vermelho',
    neighborhood: 'Rio Vermelho',
    city: 'Salvador',
    state: 'BA',
    description: 'O Dona Mariquita celebra 20 anos de história resgatando a verdadeira alma da gastronomia baiana. Fundado em 2006, o restaurante se dedica a redescobrir os sabores ancestrais, trazendo à mesa o que há de mais autêntico nas feiras livres da região. Suas receitas, influenciadas pelas tradições indígenas, africanas e sertanejas, são uma viagem no tempo, com destaques como o acarajé e a moqueca.',
    cuisine_type: 'Baiana tradicional',
    hours: 'Segunda a domingo das 12h às 17h',
    source: 'exame_casual_2025',
    external_id: 'exame-2025-27'
  },
  {
    name: 'Ori',
    ranking: 55,
    address: 'Avenida Santa Luzia 656, loja 11, Horto Florestal',
    neighborhood: 'Horto Florestal',
    city: 'Salvador',
    state: 'BA',
    phone: '(71) 3276-3140',
    description: 'O empreendimento mais casual de chefs Fabrício Lemos e Lisiane Arouca – inaugurada em 2018 no Horto Florestal, em Salvador – resgata ingredientes simples da culinária baiana em pratos de preparo cuidadoso. Enquanto no Origem, primeiro restaurante da dupla, a experiência gastronômica é guiada por meio de um menu degustação fechado, no Orí é possível fazer escolhas. No cardápio se evidenciam opções criativas com ingredientes regionais como o "abarajé", combinação dos clássicos locais abará e acarajé.',
    cuisine_type: 'Baiana contemporânea',
    hours: 'Terça, das 19h às 23h; de quarta a sábado, das 12h às 16h e das 19h às 23h; domingo, das 12h às 17h',
    source: 'exame_casual_2025',
    external_id: 'exame-2025-55'
  },
  {
    name: 'Boia',
    ranking: 61,
    address: 'Rua José Avena, 01 - Horto Florestal',
    neighborhood: 'Horto Florestal',
    city: 'Salvador',
    state: 'BA',
    phone: '(71) 99694-2630',
    description: 'No coração de Salvador, no Horto Florestal, o restaurante Boia é um convite a explorar a gastronomia litorânea com um toque contemporâneo. Sob a batuta do chef Kaywa Hilton, a casa celebra os frutos do mar frescos e os ingredientes locais, criando pratos com sabores inusitados e apresentações criativas. O ambiente, sofisticado e descontraído, conta com um jardim arborizado e detalhes artísticos, como o mural de Bel Borba.',
    cuisine_type: 'Gastronomia litorânea contemporânea',
    hours: 'Terça a sábado, das 12h às 16h e das 18h30 às 23h; domingo, das 12h às 16h',
    source: 'exame_casual_2025',
    external_id: 'exame-2025-61'
  },
  {
    name: 'Amado',
    ranking: 71,
    address: 'Avenida Lafayete Coutinho, 660, Comércio',
    neighborhood: 'Comércio',
    city: 'Salvador',
    state: 'BA',
    phone: '(71) 99231-4660',
    description: 'O Restaurante Amado, em Salvador, é conhecido por sua proposta de culinária contemporânea brasileira e por oferecer uma vista privilegiada da Baía de Todos os Santos. Sob o comando do chef Edinho Engel, ao lado do sócio Flávio Bandeira, o menu destaca ingredientes frescos, valorizando sabores brasileiros com toques autorais e técnicas refinadas.',
    cuisine_type: 'Culinária contemporânea brasileira',
    hours: 'Segunda a sábado, das 12h às 23h e domingo das 12h às 17h',
    source: 'exame_casual_2025',
    external_id: 'exame-2025-71'
  },
  {
    name: 'Casa de Tereza',
    ranking: 80,
    address: 'Rua Odilon Santos, 45, Rio Vermelho',
    neighborhood: 'Rio Vermelho',
    city: 'Salvador',
    state: 'BA',
    phone: '(71) 9 9170-6475',
    description: 'Em um casarão no Rio Vermelho, em Salvador, o Casa de Tereza passeia pela história da Bahia por meio da gastronomia. A chef Tereza Paim destaca a cozinha brasileira e regional, resgatando raízes em pratos com sabor e aconchego familiar. No menu, a moqueca é o carro-chefe, com opções de peixe do dia, camarão, mista de camarão e peixe e até vegetariana. O ambiente é composto por quatro salas temáticas.',
    cuisine_type: 'Baiana regional',
    hours: 'Segunda a quarta, das 12h às 23h; quinta a sábado, das 12h às 00h; e domingo, 12h às 22h',
    source: 'exame_casual_2025',
    external_id: 'exame-2025-80'
  },
  {
    name: 'Preta Restaurante',
    ranking: 94,
    address: 'Rua Cláudio Leal Borges, 22, Ilha dos Frades',
    neighborhood: 'Ilha dos Frades',
    city: 'Salvador',
    state: 'BA',
    phone: '(71) 99326-7461',
    description: 'Sob a liderança da chef Preta, o restaurante oferece um cardápio que celebra os sabores autênticos da Bahia. Voltado para a gastronomia com frutos do mar, o lugar disponibiliza ingredientes frescos e oriundos de produtores locais. Localizado na Praia da Ponta de Nossa Senhora de Guadalupe, na Ilha dos Frades, o Preta Restaurante está situado em uma das praias mais limpas do planeta – detentora do selo Bandeira Azul. Além da unidade na Ilha dos Frades, o restaurante conta hoje com duas operações em Salvador: Preta Bistrô, no Museu de Arte Contemporânea da Bahia, e Preta Tira-Chapéu, situado no Palacete Tira-Chapéu.',
    cuisine_type: 'Frutos do mar baianos',
    hours: 'Quarta a domingo, das 12h às 17h (mediante reserva antecipada)',
    source: 'exame_casual_2025',
    external_id: 'exame-2025-94'
  }
]

async function importExameRestaurants() {
  console.log('Importing 8 restaurants from Exame Casual 2025...')
  
  // First, try to create the table
  console.log('Creating restaurants table...')
  const createTableError = await supabase.rpc('exec_sql', { 
    sql: `
      CREATE TABLE IF NOT EXISTS restaurants (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name TEXT NOT NULL,
        ranking INTEGER,
        address TEXT,
        neighborhood TEXT,
        city TEXT DEFAULT 'Salvador',
        state TEXT DEFAULT 'BA',
        phone TEXT,
        description TEXT,
        cuisine_type TEXT,
        price_range TEXT,
        average_price NUMERIC,
        hours TEXT,
        image_url TEXT,
        instagram_url TEXT,
        website_url TEXT,
        is_active BOOLEAN DEFAULT true,
        source TEXT DEFAULT 'exame_casual_2025',
        external_id TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurants_external_id ON restaurants(external_id) WHERE external_id IS NOT NULL;
    `
  })
  
  if (createTableError.error) {
    console.log('Table creation failed (might already exist), continuing...')
  }
  
  let inserted = 0
  let errors = 0
  for (const restaurant of exameRestaurants) {
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
      console.log(`✓ Inserted: ${restaurant.name} (ranking #${restaurant.ranking})`)
    }
  }
  
  console.log(`\nInserted ${inserted}/${exameRestaurants.length} restaurants`)
  if (errors > 0) console.log(`Errors: ${errors}`)
}

importExameRestaurants()
