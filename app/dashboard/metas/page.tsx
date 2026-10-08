'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

// Componente auxiliar em JS para animar a contagem de números suavemente
function AnimatedCounter({ value, hide }: { value: number; hide: boolean }) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    if (hide) return
    let startTime: number | null = null
    const duration = 800 // Duração da animação em milissegundos

    const animateCount = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      // Efeito de suavização (easeOutQuart)
      const easeProgress = 1 - Math.pow(1 - progress, 4)
      
      setDisplayValue(easeProgress * value)

      if (progress < 1) {
        requestAnimationFrame(animateCount)
      }
    }

    requestAnimationFrame(animateCount)
  }, [value, hide])

  if (hide) return <span>R$ ••••••</span>

  return <span>R$ {displayValue.toFixed(2)}</span>
}

export default function MetasPage() {
  const [goals, setGoals] = useState<any[]>([])
  const [title, setTitle] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [currentAmount, setCurrentAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [hideValues, setHideValues] = useState(false)

  const [customDepositGoalId, setCustomDepositGoalId] = useState<string | null>(null)
  const [customDepositValue, setCustomDepositValue] = useState('')

  const supabase = createClient()

  useEffect(() => {
    fetchGoals()
  }, [])

  async function fetchGoals() {
    const { data } = await supabase.from('goals').select('*').order('created_at', { ascending: false })
    if (data) setGoals(data)
  }

  async function handleAddGoal(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('goals').insert({
      user_id: user.id,
      title,
      target_amount: parseFloat(targetAmount),
      current_amount: currentAmount ? parseFloat(currentAmount) : 0,
    })

    setTitle('')
    setTargetAmount('')
    setCurrentAmount('')
    setLoading(false)
    fetchGoals()
  }

  async function handleUpdateProgress(id: string, newCurrent: number) {
    await supabase.from('goals').update({ current_amount: newCurrent }).eq('id', id)
    fetchGoals()
  }

  async function handleCustomDeposit(goalId: string) {
    if (!customDepositValue) return
    const goal = goals.find(g => g.id === goalId)
    if (!goal) return

    const added = parseFloat(customDepositValue)
    const newTotal = goal.current_amount + added

    await supabase.from('goals').update({ current_amount: newTotal }).eq('id', goalId)
    setCustomDepositValue('')
    setCustomDepositGoalId(null)
    fetchGoals()
  }

  // Permissão / Confirmação de segurança rigorosa para eliminar
  async function handleDelete(id: string, goalTitle: string) {
    const confirmed = window.confirm(`⚠️ PERMISSÃO NECESSÁRIA:\n\nTens a certeza absoluta que pretendes eliminar a meta "${goalTitle}"? Esta ação é irreversível.`)
    if (!confirmed) return

    const passwordConfirm = prompt(`Para confirmar a eliminação de "${goalTitle}", escreve "ELIMINAR" abaixo:`)
    if (passwordConfirm !== "ELIMINAR") {
      alert("Ação cancelada. Palavra de confirmação incorreta.")
      return
    }

    await supabase.from('goals').delete().eq('id', id)
    fetchGoals()
  }

  return (
    <div className="space-y-8 max-w-4xl pb-16 animate-fadeIn">
      {/* Cabeçalho Moderno */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-gray-900 via-gray-900/90 to-emerald-950/20 p-6 rounded-2xl border border-gray-800 shadow-2xl backdrop-blur-xl">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            Metas & Objetivos <span className="text-xs px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-mono uppercase tracking-widest">Growth</span>
          </h1>
          <p className="text-gray-400 mt-1 text-sm">Define metas de poupança, acompanha o progresso e alcança a tua liberdade financeira.</p>
        </div>

        <button
          onClick={() => setHideValues(!hideValues)}
          className="px-4 py-2.5 bg-gray-800/80 hover:bg-gray-700/80 text-emerald-400 border border-gray-700/80 text-xs font-semibold rounded-xl transition-all duration-300 shadow-lg flex items-center gap-2 hover:scale-105"
        >
          {hideValues ? '👁️ Mostrar Valores' : '🙈 Ocultar Valores'}
        </button>
      </div>

      {/* Formulário Nova Meta */}
      <form onSubmit={handleAddGoal} className="bg-gray-900/80 backdrop-blur-xl border border-gray-800/80 p-8 rounded-2xl shadow-2xl space-y-5 relative overflow-hidden">
        <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
          <span>🎯</span> Criar Nova Meta
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-300 uppercase tracking-wider">Nome da Meta</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Fundo de Emergência, Moto..."
              className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-300 uppercase tracking-wider">Valor Alvo (R$)</label>
            <input
              type="number"
              step="0.01"
              required
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="5000.00"
              className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-300 uppercase tracking-wider">Valor Já Poupado (R$)</label>
            <input
              type="number"
              step="0.01"
              value={currentAmount}
              onChange={(e) => setCurrentAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/20 transition-all duration-300 mt-2"
        >
          {loading ? 'A criar...' : 'Adicionar Meta'}
        </button>
      </form>

      {/* Listagem de Metas com Animação JS */}
      <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800/80 p-8 rounded-2xl shadow-2xl space-y-6">
        <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
          <span>📈</span> As Minhas Metas
        </h3>

        {goals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {goals.map((goal) => {
              const percentage = Math.min(100, (goal.current_amount / goal.target_amount) * 100)
              const isCompleted = percentage >= 100

              return (
                <div 
                  key={goal.id} 
                  className={`p-6 rounded-2xl border transition-all duration-300 space-y-4 relative overflow-hidden group hover:scale-[1.01] ${
                    isCompleted 
                      ? 'bg-gradient-to-br from-emerald-950/30 to-gray-950 border-emerald-500/40 shadow-xl shadow-emerald-500/10' 
                      : 'bg-gray-950/60 border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-extrabold text-white text-base flex items-center gap-2">
                        {goal.title}
                        {isCompleted && <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full font-mono">Concluída 🏆</span>}
                      </p>
                    </div>
                    
                    <button
                      onClick={() => handleDelete(goal.id, goal.title)}
                      className="text-gray-500 hover:text-red-400 text-xs px-2.5 py-1 rounded-lg hover:bg-red-500/10 transition"
                      title="Eliminar Meta (Requer Permissão)"
                    >
                      🗑️ Eliminar
                    </button>
                  </div>

                  {/* Valores com Animação de Contador em JS */}
                  <div className="flex justify-between text-xs text-gray-400 font-mono">
                    <span>
                      Atual: <strong className="text-gray-200"><AnimatedCounter value={goal.current_amount} hide={hideValues} /></strong>
                    </span>
                    <span>
                      Meta: <strong className="text-gray-200">{hideValues ? 'R$ ••••••' : `R$ ${goal.target_amount.toFixed(2)}`}</strong> ({percentage.toFixed(0)}%)
                    </span>
                  </div>

                  {/* Barra de Progresso com Transição Animada */}
                  <div className="w-full bg-gray-900 h-3 rounded-full overflow-hidden p-0.5 border border-gray-800">
                    <div 
                      className="bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 h-full rounded-full transition-all duration-1000 shadow-md shadow-emerald-500/40" 
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>

                  {/* Botões de Depósito */}
                  <div className="space-y-2 pt-2 border-t border-gray-900">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleUpdateProgress(goal.id, goal.current_amount + 50)}
                        className="px-2.5 py-1 bg-gray-900 hover:bg-gray-800 text-emerald-400 border border-gray-800 text-xs rounded-lg transition font-mono hover:scale-105 active:scale-95"
                      >
                        + R$ 50
                      </button>
                      <button
                        onClick={() => handleUpdateProgress(goal.id, goal.current_amount + 100)}
                        className="px-2.5 py-1 bg-gray-900 hover:bg-gray-800 text-emerald-400 border border-gray-800 text-xs rounded-lg transition font-mono hover:scale-105 active:scale-95"
                      >
                        + R$ 100
                      </button>
                      <button
                        onClick={() => handleUpdateProgress(goal.id, goal.current_amount + 500)}
                        className="px-2.5 py-1 bg-gray-900 hover:bg-gray-800 text-emerald-400 border border-gray-800 text-xs rounded-lg transition font-mono hover:scale-105 active:scale-95"
                      >
                        + R$ 500
                      </button>
                      <button
                        onClick={() => setCustomDepositGoalId(customDepositGoalId === goal.id ? null : goal.id)}
                        className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs rounded-lg transition font-medium ml-auto"
                      >
                        Outro Valor ➕
                      </button>
                    </div>

                    {customDepositGoalId === goal.id && (
                      <div className="flex gap-2 pt-2 animate-fadeIn">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Valor a depositar..."
                          value={customDepositValue}
                          onChange={(e) => setCustomDepositValue(e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500"
                        />
                        <button
                          onClick={() => handleCustomDeposit(goal.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition"
                        >
                          Depositar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-500 py-10 text-center">Nenhuma meta configurada de momento.</p>
        )}
      </div>
    </div>
  )
}