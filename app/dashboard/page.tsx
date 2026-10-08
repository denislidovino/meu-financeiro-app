'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

// Componente em JS para animar contadores suavemente
function AnimatedCounter({ value, isCurrency = true }: { value: number; isCurrency?: boolean }) {
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

  if (!isCurrency) return <span>{displayValue.toFixed(0)}</span>
  return <span>R$ {displayValue.toFixed(2)}</span>
}

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    fetchTransactions()
  }, [])

  async function fetchTransactions() {
    const { data } = await supabase.from('transactions').select('*').order('date', { ascending: false })
    if (data) setTransactions(data)
    setLoading(false)
  }

  // Cálculos financeiros globais
  const totalIncome = transactions
    .filter(tx => tx.type === 'income')
    .reduce((acc, tx) => acc + tx.amount, 0)

  const totalExpense = transactions
    .filter(tx => tx.type === 'expense')
    .reduce((acc, tx) => acc + tx.amount, 0)

  const netBalance = totalIncome - totalExpense

  // Agrupar despesas por Mês (YYYY-MM) para o gráfico de evolução
  const monthlyExpenses = transactions
    .filter(tx => tx.type === 'expense')
    .reduce((acc: any, tx) => {
      const month = tx.date ? tx.date.slice(0, 7) : 'Outros'
      if (!acc[month]) acc[month] = 0
      acc[month] += tx.amount
      return acc
    }, {})

  const sortedMonths = Object.keys(monthlyExpenses).sort()
  const maxMonthlyExpense = Math.max(...Object.values(monthlyExpenses) as number[], 1)

  // Agrupar despesas por Categoria para o gráfico de distribuição
  const categoryExpenses = transactions
    .filter(tx => tx.type === 'expense')
    .reduce((acc: any, tx) => {
      const cat = tx.category || 'Outros'
      if (!acc[cat]) acc[cat] = 0
      acc[cat] += tx.amount
      return acc
    }, {})

  const sortedCategories = Object.keys(categoryExpenses).sort((a, b) => categoryExpenses[b] - categoryExpenses[a])
  const maxCategoryExpense = Math.max(...Object.values(categoryExpenses) as number[], 1)

  return (
    <div className="space-y-8 max-w-5xl pb-16 animate-fadeIn">
      {/* Cabeçalho Luxuoso */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-gray-900 via-gray-900/90 to-emerald-950/30 p-6 rounded-2xl border border-gray-800 shadow-2xl backdrop-blur-xl">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            Painel Geral <span className="text-xs px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-mono uppercase tracking-widest">Command Center</span>
          </h1>
          <p className="text-gray-400 mt-1 text-sm">Visão geral das tuas finanças, saldos e evolução mensal em tempo real.</p>
        </div>
      </div>

      {/* Cartões de Indicadores Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Saldo Total */}
        <div className="bg-gray-900/85 backdrop-blur-xl border border-gray-800 p-6 rounded-2xl shadow-2xl space-y-2 relative overflow-hidden group hover:border-emerald-500/40 transition-all duration-300">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all"></div>
          <p className="text-xs font-mono uppercase tracking-wider text-gray-400">Saldo Total</p>
          <p className={`text-2xl font-extrabold font-mono ${netBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            <AnimatedCounter value={netBalance} />
          </p>
          <p className="text-[11px] text-gray-500">Balanço geral de receitas e saídas</p>
        </div>

        {/* Total de Receitas */}
        <div className="bg-gray-900/85 backdrop-blur-xl border border-gray-800 p-6 rounded-2xl shadow-2xl space-y-2 relative overflow-hidden group hover:border-emerald-500/40 transition-all duration-300">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all"></div>
          <p className="text-xs font-mono uppercase tracking-wider text-gray-400">Total de Receitas</p>
          <p className="text-2xl font-extrabold text-emerald-400 font-mono">
            <AnimatedCounter value={totalIncome} />
          </p>
          <p className="text-[11px] text-gray-500">Entradas registadas</p>
        </div>

        {/* Total de Despesas */}
        <div className="bg-gray-900/85 backdrop-blur-xl border border-gray-800 p-6 rounded-2xl shadow-2xl space-y-2 relative overflow-hidden group hover:border-red-500/40 transition-all duration-300">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-red-500/5 rounded-full blur-2xl group-hover:bg-red-500/10 transition-all"></div>
          <p className="text-xs font-mono uppercase tracking-wider text-gray-400">Total de Despesas</p>
          <p className="text-2xl font-extrabold text-red-400 font-mono">
            <AnimatedCounter value={totalExpense} />
          </p>
          <p className="text-[11px] text-gray-500">Gastos e faturas acumuladas</p>
        </div>
      </div>

      {/* Gráfico 1: Evolução Mensal de Despesas */}
      <div className="bg-gray-900/85 backdrop-blur-xl border border-gray-800/80 p-8 rounded-2xl shadow-2xl space-y-6">
        <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
          <span>📈</span> Evolução Mensal de Despesas
        </h3>

        {sortedMonths.length > 0 ? (
          <div className="space-y-4 pt-2">
            {sortedMonths.map((month) => {
              const amount = monthlyExpenses[month]
              const percentage = Math.min(100, (amount / maxMonthlyExpense) * 100)

              return (
                <div key={month} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-gray-300 font-semibold">{month}</span>
                    <span className="text-red-400 font-bold">R$ {amount.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-gray-950 h-3 rounded-full overflow-hidden p-0.5 border border-gray-800">
                    <div 
                      className="bg-gradient-to-r from-red-500 to-amber-500 h-full rounded-full transition-all duration-1000 shadow-sm shadow-red-500/30"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-500 py-10 text-center">Ainda não existem despesas registadas para gerar o gráfico de evolução.</p>
        )}
      </div>

      {/* Gráfico 2: Gastos por Categoria */}
      <div className="bg-gray-900/85 backdrop-blur-xl border border-gray-800/80 p-8 rounded-2xl shadow-2xl space-y-6">
        <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
          <span>🏷️</span> Gastos por Categoria
        </h3>

        {sortedCategories.length > 0 ? (
          <div className="space-y-4 pt-2">
            {sortedCategories.map((cat) => {
              const amount = categoryExpenses[cat]
              const percentage = Math.min(100, (amount / maxCategoryExpense) * 100)

              return (
                <div key={cat} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-gray-300 font-semibold">{cat}</span>
                    <span className="text-emerald-400 font-bold">R$ {amount.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-gray-950 h-3 rounded-full overflow-hidden p-0.5 border border-gray-800">
                    <div 
                      className="bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 h-full rounded-full transition-all duration-1000 shadow-sm shadow-emerald-500/30"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-500 py-10 text-center">Ainda não existem despesas registadas para calcular gráficos.</p>
        )}
      </div>
    </div>
  )
}