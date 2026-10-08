'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

// Componente em JS para animar a contagem de valores monetários suavemente
function AnimatedCounter({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    let startTime: number | null = null
    const duration = 800

    const animateCount = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const easeProgress = 1 - Math.pow(1 - progress, 4)
      
      setDisplayValue(easeProgress * value)

      if (progress < 1) {
        requestAnimationFrame(animateCount)
      }
    }

    requestAnimationFrame(animateCount)
  }, [value])

  return <span>R$ {displayValue.toFixed(2)}</span>
}

export default function SimuladorPage() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [cards, setCards] = useState<any[]>([])

  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const { data: txData } = await supabase.from('transactions').select('*').order('date', { ascending: true })
    if (txData) setTransactions(txData)

    const { data: cardData } = await supabase.from('cards').select('*')
    if (cardData) setCards(cardData)
  }

  // Filtrar apenas despesas futuras ou parceladas
  const futureExpenses = transactions.filter(tx => tx.type === 'expense' && tx.installments_total && tx.installments_total > 1)

  // Agrupar por Mês (YYYY-MM)
  const groupedByMonth = futureExpenses.reduce((acc: any, tx) => {
    const month = tx.date.slice(0, 7)
    if (!acc[month]) acc[month] = []
    acc[month].push(tx)
    return acc
  }, {})

  const sortedMonths = Object.keys(groupedByMonth).sort()

  const monthTotals = sortedMonths.map(month => {
    const items = groupedByMonth[month]
    return items.reduce((acc: number, tx: any) => acc + tx.amount, 0)
  })
  const maxMonthTotal = Math.max(...monthTotals, 1)

  return (
    <div className="space-y-8 max-w-4xl pb-16 animate-fadeIn">
      {/* Cabeçalho Luxuoso */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-gray-900 via-gray-900/90 to-emerald-950/30 p-6 rounded-2xl border border-gray-800 shadow-2xl backdrop-blur-xl">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            Simulador de Parcelas <span className="text-xs px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-mono uppercase tracking-widest">Previsão IA</span>
          </h1>
          <p className="text-gray-400 mt-1 text-sm">Previsão interativa do impacto das compras parceladas nas faturas dos próximos meses.</p>
        </div>
      </div>

      {sortedMonths.length > 0 ? (
        <div className="space-y-6">
          {sortedMonths.map((month) => {
            const items = groupedByMonth[month]
            const monthTotal = items.reduce((acc: number, tx: any) => acc + tx.amount, 0)
            const barPercentage = Math.min(100, (monthTotal / maxMonthTotal) * 100)

            return (
              <div key={month} className="bg-gray-900/85 backdrop-blur-xl border border-gray-800/80 p-8 rounded-2xl shadow-2xl space-y-5 transition-all duration-300 hover:border-gray-700">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-gray-800/80 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-emerald-400 font-mono flex items-center gap-2">
                      <span>📅</span> Fatura / Mês: {month}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">{items.length} compra(s) parcelada(s) ativa(s) neste período</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-400 uppercase tracking-wider block">Total Previsto</span>
                    <span className="text-red-400 font-extrabold text-lg font-mono">
                      <AnimatedCounter value={monthTotal} />
                    </span>
                  </div>
                </div>

                <div className="w-full bg-gray-950 h-2.5 rounded-full overflow-hidden p-0.5 border border-gray-800/60">
                  <div 
                    className="bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500 h-full rounded-full transition-all duration-1000 shadow-sm"
                    style={{ width: `${barPercentage}%` }}
                  ></div>
                </div>

                <div className="space-y-3 pt-2">
                  {items.map((tx: any) => {
                    const matchedCard = cards.find(c => c.id === tx.card_id)
                    return (
                      <div key={tx.id} className="flex justify-between items-center bg-gray-950/50 p-4 rounded-xl border border-gray-800/60 transition hover:bg-gray-950/80">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                          <div>
                            <div className="flex items-center gap-2.5">
                              <span className="font-bold text-sm text-white">{tx.description}</span>
                              {matchedCard && (
                                <span className="text-[10px] px-2.5 py-0.5 rounded-md text-white font-semibold shadow-sm" style={{ backgroundColor: matchedCard.color }}>
                                  {matchedCard.name}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-400 mt-0.5 block">{tx.category} • Vencimento: {tx.date}</span>
                          </div>
                        </div>
                        <span className="text-red-400 font-semibold font-mono text-sm">
                          - <AnimatedCounter value={tx.amount} />
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-gray-900/85 backdrop-blur-xl border border-gray-800/80 p-12 rounded-2xl text-center space-y-3 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400 text-xl">
            ✨
          </div>
          <p className="text-gray-300 font-medium">Não existem compras parceladas ativas para simular nos próximos meses.</p>
          <p className="text-xs text-gray-500">Adiciona uma despesa com parcelas superiores a 1x na página de Gastos ou via Scanner para vê-la projetada aqui.</p>
        </div>
      )}
    </div>
  )
}