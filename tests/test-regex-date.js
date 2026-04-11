// Teste simples do regex de data

const captions = [
  "♫ Agenda de #Sábado, 28 de Março ♫",
  "♫ Agenda de #Quinta, 26 de Março ♫",
  "♫ Agenda de #Quarta, 25 de Março ♫",
  "♫ Agenda de #Sexta, 27 de Março ♫"
]

const regex = /♫\s*Agenda\s+de\s+#\w+,\s+(\d+)\s+de\s+(\w+)/i

console.log('\n🔍 Testing Date Regex\n')
console.log('='.repeat(70))

captions.forEach((caption, i) => {
  console.log(`\n${i + 1}. Caption: "${caption}"`)
  
  const match = caption.match(regex)
  
  if (match) {
    console.log(`   ✅ Match found!`)
    console.log(`   Day: ${match[1]}`)
    console.log(`   Month: ${match[2]}`)
    
    const monthMap = {
      'janeiro': '01', 'fevereiro': '02', 'março': '03', 'abril': '04',
      'maio': '05', 'junho': '06', 'julho': '07', 'agosto': '08',
      'setembro': '09', 'outubro': '10', 'novembro': '11', 'dezembro': '12'
    }
    
    const monthNum = monthMap[match[2].toLowerCase()]
    const year = new Date().getFullYear()
    const date = `${year}-${monthNum}-${match[1].padStart(2, '0')}`
    
    console.log(`   📅 Formatted date: ${date}`)
  } else {
    console.log(`   ❌ No match`)
  }
})

console.log('\n' + '='.repeat(70))
