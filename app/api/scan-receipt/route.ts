import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' })

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ success: false, error: 'Nenhum ficheiro enviado.' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Image = buffer.toString('base64')

    const prompt = `
      Analisa esta imagem de fatura ou print de pagamento. 
      Extrai todas as transações ou itens de compra encontrados.
      Retorna estritamente um array JSON válido (sem blocos de código markdown extra, apenas JSON puro) com a seguinte estrutura para cada item:
      [
        {
          "description": "Nome do estabelecimento ou produto",
          "amount": 00.00,
          "category": "Alimentação ou Moradia ou Transporte ou Lazer ou Saúde ou Salário ou Compras ou Outros",
          "date": "YYYY-MM-DD",
          "installments_total": 1
        }
      ]
      Se houver apenas um valor total, retorna um array com 1 objeto. Certifica-te de que o campo 'amount' é um número puro e 'installments_total' é um número inteiro.
    `

    // Modelos atualizados recomendados
    const modelsToTry = ['gemini-2.5-pro', 'gemini-3.8-flash', 'gemini-3.1-pro-preview']
    let textResponse = ''
    let success = false

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              inlineData: {
                data: base64Image,
                mimeType: file.type || 'image/jpeg',
              },
            },
            { text: prompt },
          ],
        })

        if (response.text) {
          textResponse = response.text
          success = true
          break
        }
      } catch (err: any) {
        console.warn(`Tentativa com o modelo ${modelName} falhou:`, err?.message)
        continue
      }
    }

    if (!success || !textResponse) {
      return NextResponse.json({
        success: false,
        error: 'Servidores temporariamente ocupados. Tenta novamente em instantes.',
      }, { status: 503 })
    }

    let cleanJsonStr = textResponse.trim()
    if (cleanJsonStr.startsWith('```json')) {
      cleanJsonStr = cleanJsonStr.replace(/^```json/, '').replace(/```$/, '').trim()
    } else if (cleanJsonStr.startsWith('```')) {
      cleanJsonStr = cleanJsonStr.replace(/^```/, '').replace(/```$/, '').trim()
    }

    const parsedData = JSON.parse(cleanJsonStr)

    return NextResponse.json({ success: true, data: parsedData })
  } catch (error: any) {
    console.error('Erro crítico no Scanner IA:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro interno ao processar a fatura com inteligência artificial.',
    }, { status: 500 })
  }
}