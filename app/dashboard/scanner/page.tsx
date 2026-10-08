'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ScannerPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [extractedData, setExtractedData] = useState<any[] | null>(null)
  const [cards, setCards] = useState<any[]>([])
  const [selectedCardId, setSelectedCardId] = useState<string>('')
  const [successMsg, setSuccessMsg] = useState('')

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchCards()
  }, [])

  async function fetchCards() {
    const { data } = await supabase.from('cards').select('*')
    if (data) setCards(data)
  }

  async function compressImage(imageFile: File): Promise<File> {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.readAsDataURL(imageFile)
      reader.onload = (event) => {
        const img = new Image()
        img.src = event.target?.result as string
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const MAX_WIDTH = 1200
          const MAX_HEIGHT = 1200
          let width = img.width
          let height = img.height

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width
              width = MAX_WIDTH
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height
              height = MAX_HEIGHT
            }
          }

          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0, width, height)

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], imageFile.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                })
                resolve(compressedFile)
              } else {
                resolve(imageFile)
              }
            },
            'image/jpeg',
            0.8
          )
        }
      }
    })
  }

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return

    setLoading(true)
    setSuccessMsg('')

    try {
      const optimizedFile = await compressImage(file)
      const formData = new FormData()
      formData.append('file', optimizedFile)

      const res = await fetch('/api/scan-receipt', {
        method: 'POST',
        body: formData,
      })

      const json = await res.json()
      if (json.success) {
        const items = Array.isArray(json.data) ? json.data : [json.data]
        const itemsWithCard = items.map(item => ({
          ...item,
          card_id: selectedCardId || ''
        }))
        setExtractedData(itemsWithCard)
      } else {
        alert(json.error || 'Erro ao processar imagem.')
      }
    } catch (err) {
      alert('Erro de ligação ao servidor.')
    } finally {
      setLoading(false)
    }
  }

  function handleItemCardChange(index: number, cardId: string) {
    if (!extractedData) return
    const updated = [...extractedData]
    updated[index].card_id = cardId ? cardId : null
    setExtractedData(updated)
  }

  async function handleSaveAll() {
    if (!extractedData) return

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert('Utilizador não autenticado!')
      setLoading(false)
      return
    }

    for (const item of extractedData) {
      const totalValue = item.amount
      const cardIdToSave = item.card_id || null

      const { error: insertError } = await supabase.from('transactions').insert({
        user_id: user.id,
        card_id: cardIdToSave,
        description: item.description,
        amount: parseFloat(Number(totalValue).toFixed(2)),
        type: 'expense',
        category: item.category || 'Outros',
        date: item.date || new Date().toISOString().split('T')[0],
        installments_total: item.installments_total || 1,
        installment_current: 1,
        is_paid: false,
      })

      if (insertError) {
        console.error('Erro ao inserir transação:', insertError.message)
      }
    }

    setLoading(false)
    setSuccessMsg('Gastos adicionados com sucesso à base de dados!')
    setExtractedData(null)
    setFile(null)
    setTimeout(() => router.push('/dashboard/gastos'), 2000)
  }

  return (
    <div className="space-y-8 max-w-3xl pb-12 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-gray-900 via-gray-900/90 to-emerald-950/20 p-6 rounded-2xl border border-gray-800 shadow-2xl backdrop-blur-xl">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            Leitor Inteligente <span className="text-xs px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-mono uppercase tracking-widest">IA Powered</span>
          </h1>
          <p className="text-gray-400 mt-1 text-sm">Carrega o print da fatura e deixa a inteligência artificial tratar do resto.</p>
        </div>
      </div>

      <form onSubmit={handleAnalyze} className="bg-gray-900/80 backdrop-blur-xl border border-gray-800/80 p-8 rounded-2xl shadow-2xl space-y-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-all duration-500 pointer-events-none"></div>

        <h3 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
          <span>📸</span> Carregar Fatura / Print
        </h3>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Cartão Padrão para o Lote (Opcional)</label>
          <select
            value={selectedCardId}
            onChange={(e) => setSelectedCardId(e.target.value)}
            className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
          >
            <option value="">Nenhum cartão específico (Geral)</option>
            {cards.map((card) => (
              <option key={card.id} value={card.id}>
                {card.name}
              </option>
            ))}
          </select>
        </div>

        <div className="border-2 border-dashed border-gray-800 hover:border-emerald-500/50 rounded-2xl p-6 text-center transition-all duration-300 bg-gray-950/40">
          <input
            type="file"
            accept="image/*"
            required
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full text-sm text-gray-400 file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 file:transition-all cursor-pointer"
          />
          <p className="text-xs text-gray-500 mt-2">Formatos suportados: PNG, JPG, WEBP (Comprimido automaticamente)</p>
        </div>

        <button
          type="submit"
          disabled={loading || !file}
          className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              A otimizar e ler fatura com IA...
            </>
          ) : (
            '✨ Ler Fatura com Inteligência Artificial'
          )}
        </button>
      </form>

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm p-4 rounded-2xl animate-bounce">
          {successMsg}
        </div>
      )}

      {extractedData && (
        <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800/80 p-8 rounded-2xl shadow-2xl space-y-6 animate-fadeIn">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-white">Dados Reconhecidos</h3>
              <p className="text-xs text-gray-400 mt-0.5">Podes ajustar o cartão de cada transação individualmente antes de confirmar.</p>
            </div>
            <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full font-mono">
              {extractedData.length} itens encontrados
            </span>
          </div>

          <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
            {extractedData.map((item, index) => (
              <div key={index} className="bg-gray-950/60 p-5 rounded-xl border border-gray-800 hover:border-gray-700 transition-all space-y-3 group">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-white group-hover:text-emerald-400 transition-colors">{item.description}</span>
                  <span className="text-red-400 font-bold font-mono">R$ {Number(item.amount).toFixed(2)}</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-gray-400">
                  <span className="bg-gray-900 px-2.5 py-1 rounded-lg border border-gray-800">Categoria: <strong className="text-gray-200">{item.category}</strong></span>
                  <span className="bg-gray-900 px-2.5 py-1 rounded-lg border border-gray-800">Data: <strong className="text-gray-200">{item.date}</strong></span>
                  <span className="bg-gray-900 px-2.5 py-1 rounded-lg border border-gray-800">Parcelas: <strong className="text-gray-200">{item.installments_total || 1}x</strong></span>
                </div>

                <div className="pt-2 border-t border-gray-900 flex items-center gap-3">
                  <span className="text-xs text-gray-400 font-medium">Atribuir Cartão:</span>
                  <select
                    value={item.card_id || ''}
                    onChange={(e) => handleItemCardChange(index, e.target.value)}
                    className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Sem cartão (Geral)</option>
                    {cards.map((card) => (
                      <option key={card.id} value={card.id}>
                        {card.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleSaveAll}
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-xl shadow-emerald-600/20 hover:shadow-emerald-600/40 transition-all duration-300"
          >
            {loading ? 'A guardar transações...' : '✓ Confirmar e Gravar nos Gastos'}
          </button>
        </div>
      )}
    </div>
  )
}