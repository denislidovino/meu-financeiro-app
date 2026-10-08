'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

// Componente em JS para animar contadores suavemente
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

export default function AlertasPage() {
  const [budgets, setBudgets] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [category, setCategory] = useState('Alimentação')
  const [limitAmount, setLimitAmount] = useState('')
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchBudgets()
    fetchTransactions()
  }, [])

  async function fetchBudgets() {
    const { data } = await supabase.from('budgets').select('*')
    if (data) setBudgets(data)
  }

  async function fetchTransactions() {
    const { data } = await supabase.from('transactions').select('*').eq('type', 'expense')
    if (data) setTransactions(data)
  }

  async function handleAddBudget(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('budgets').insert({
      user_id: user.id,
      category,
      limit_amount: parseFloat(limitAmount),
    })

    if (!error) {
      setLimitAmount('')
      fetchBudgets()
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Tens a certeza que pretendes eliminar este orçamento?")
    if (!confirmed) return

    await supabase.from('budgets').delete().eq('id', id)
    fetchBudgets()
  }

  const currentMonth = new Date().toISOString().slice(0, 7)

  // Calcular totais gerais para o gráfico moderno de resumo
  const totalBudgetLimit = budgets.reduce((acc, b) => acc + b.limit_amount, 0)
  const totalSpentAll = budgets.reduce((acc, b) => {
    const spent = transactions
      .filter(tx => tx.category === b.category && tx.date.startsWith(currentMonth))
      .reduce((sum, tx) => sum + tx.amount, 0)
    return acc + spent
  }, 0)

  const overallPercentage = totalBudgetLimit > 0 ? Math.min(100, (totalSpentAll / totalBudgetLimit) * 100) : 0

  return (
    <div className="space-y-8 max-w-4xl pb-16 animate-fadeIn">
      {/* Cabeçalho Luxuoso */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-gray-900 via-gray-900/90 to-emerald-950/30 p-6 rounded-2xl border border-gray-800 shadow-2xl backdrop-blur-xl">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            Alertas & Orçamentos <span className="text-xs px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-mono uppercase tracking-widest">Guards Pro</span>
          </h1>
          <p className="text-gray-400 mt-1 text-sm">Define limites de gastos mensais por categoria e monitoriza o teu orçamento em tempo real[cite: 16].</p>
        </div>
      </div>

      {/* Gráfico de Resumo Geral Executivo */}
      {budgets.length > 0 && (
        <div className="bg-gray-900/85 backdrop-blur-xl border border-gray-800/80 p-6 rounded-2xl shadow-2xl space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
              <span>📊</span> Resumo Geral do Orçamento Mensal
            </h3>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              {overallPercentage.toFixed(0)}% Utilizado
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="bg-gray-950/60 p-4 rounded-xl border border-gray-800">
              <span className="text-xs text-gray-400 block">Total Gasto no Mês</span>
              <span className="text-lg font-extrabold text-white font-mono">
                <AnimatedCounter value={totalSpentAll} />
              </span>
            </div>
            <div className="bg-gray-950/60 p-4 rounded-xl border border-gray-800">
              <span className="text-xs text-gray-400 block">Limite Total Definido</span>
              <span className="text-lg font-extrabold text-emerald-400 font-mono">
                <AnimatedCounter value={totalBudgetLimit} />
              </span>
            </div>
          </div>

          {/* Barra de Progresso Geral Avançada */}
          <div className="w-full bg-gray-950 h-3 rounded-full overflow-hidden p-0.5 border border-gray-800">
            <div
              className={`h-full rounded-full transition-all duration-1000 shadow-md ${
                overallPercentage >= 100 ? 'bg-red-500 shadow-red-500/50' : overallPercentage >= 80 ? 'bg-amber-500 shadow-amber-500/50' : 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-emerald-500/50'
              }`}
              style={{ width: `${overallPercentage}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Formulário para Definir Limite (Estilo Carbono) */}
      <form onSubmit={handleAddBudget} className="bg-gray-900/85 backdrop-blur-xl border border-gray-800/80 p-8 rounded-2xl shadow-2xl space-y-5 relative overflow-hidden">
        <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
          <span>🎯</span> Definir Orçamento Mensal
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-300 uppercase tracking-wider">Categoria</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="Alimentação">Alimentação</option>
              <option value="Moradia">Moradia</option>
              <option value="Transporte">Transporte</option>
              <option value="Lazer">Lazer</option>
              <option value="Saúde">Saúde</option>
              <option value="Compras">Compras / Vestuário</option>
              <option value="Outros">Outros</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-300 uppercase tracking-wider">Limite Máximo Mensal (R$)</label>
            <input
              type="number"
              step="0.01"
              required
              value={limitAmount}
              onChange={(e) => setLimitAmount(e.target.value)}
              placeholder="Ex: 800.00"
              className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/20 transition-all duration-300 mt-2"
        >
          {loading ? 'A guardar...' : 'Definir Orçamento'}
        </button>
      </form>

      {/* Lista de Orçamentos e Alertas */}
      <div className="bg-gray-900/85 backdrop-blur-xl border border-gray-800/80 p-8 rounded-2xl shadow-2xl space-y-6">
        <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
          <span>🛡️</span> Estado dos Orçamentos Mensais
        </h3>

        {budgets.length > 0 ? (
          <div className="space-y-4">
            {budgets.map((budget) => {
              const spent = transactions
                .filter(tx => tx.category === budget.category && tx.date.startsWith(currentMonth))
                .reduce((acc, tx) => acc + tx.amount, 0)

              const percentage = Math.min(100, (spent / budget.limit_amount) * 100)
              const isOver = spent > budget.limit_amount
              const isWarning = percentage >= 80 && !isOver

              return (
                <div 
                  key={budget.id} 
                  className={`p-5 rounded-2xl border transition-all duration-300 space-y-3 ${
                    isOver 
                      ? 'bg-red-950/20 border-red-900/40 shadow-lg shadow-red-500/5' 
                      : isWarning 
                      ? 'bg-amber-950/20 border-amber-900/40' 
                      : 'bg-gray-950/60 border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-white text-base">{budget.category}</span>
                      {isOver && (
                        <span className="bg-red-500/20 text-red-400 text-xs px-2.5 py-0.5 rounded-full font-mono border border-red-500/30">
                          ⚠️ Orçamento Ultrapassado!
                        </span>
                      )}
                      {isWarning && (
                        <span className="bg-amber-500/20 text-amber-400 text-xs px-2.5 py-0.5 rounded-full font-mono border border-amber-500/30">
                          ⚠️ Perto do Limite (80%+)
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(budget.id)}
                      className="text-gray-500 hover:text-red-400 text-xs px-2.5 py-1 rounded hover:bg-red-500/10 transition"
                    >
                      Eliminar
                    </button>
                  </div>

                  <div className="flex justify-between text-xs text-gray-400 font-mono">
                    <span>Gasto atual: <strong className="text-gray-200"><AnimatedCounter value={spent} /></strong></span>
                    <span>Limite: <strong className="text-gray-200">R$ {budget.limit_amount.toFixed(2)}</strong> ({percentage.toFixed(0)}%)</span>
                  </div>

                  <div className="w-full bg-gray-900 h-3 rounded-full overflow-hidden p-0.5 border border-gray-800">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 shadow-sm ${
                        isOver ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                      }`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-500 py-10 text-center">Nenhum orçamento configurado[cite: 16]. Define limites para começares a receber alertas.</p>
        )}
      </div>
    </div>
  )
}