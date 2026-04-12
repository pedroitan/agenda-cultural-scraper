# 📸 Pasta de Imagens de Teste - Gemini Vision

Esta pasta contém imagens de referência dos stories do Instagram para testar a extração de eventos com Gemini Vision.

## Como Usar

1. **Adicione imagens** dos stories do Instagram nesta pasta
   - Formatos suportados: `.jpg`, `.jpeg`, `.png`, `.webp`
   - Exemplo: `story1.jpg`, `story2.png`, etc.

2. **Execute o teste:**
   ```bash
   node test-gemini-vision.js
   ```

3. **Analise os resultados:**
   - O script vai processar cada imagem
   - Mostrar a resposta bruta do Gemini
   - Exibir os eventos extraídos em JSON

## O Que o Teste Faz

- ✅ Lê todas as imagens desta pasta
- ✅ Envia cada imagem para o Gemini Vision
- ✅ Extrai eventos automaticamente
- ✅ Valida o formato JSON
- ✅ Mostra resultados detalhados

## Exemplo de Saída

```
📸 Testing: story1.jpg
📊 Image size: 245.67 KB
📋 MIME type: image/jpeg

🤖 Analyzing with Gemini Vision...

📝 Raw Response:
[
  {
    "title": "Show de Fulano",
    "date": "15/02/2026",
    "time": "20:00",
    "venue": "Teatro Castro Alves",
    "price": "R$ 50"
  }
]

✅ Extracted 1 event(s)
```

## Dicas

- Use imagens de boa qualidade (não muito comprimidas)
- Prefira imagens com texto legível
- Teste diferentes layouts de stories
- Verifique se o Gemini consegue ler todas as informações
