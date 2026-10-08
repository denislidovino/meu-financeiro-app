'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function GastosPage() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [cards, setCards] = useState<any[]>([])
  
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState('expense')
  const [category, setCategory] = useState('Alimentação')
  const [cardId, setCardId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [isInstallment, setIsInstallment] = useState(false)
  const [installmentsTotal, setInstallmentsTotal] = useState('2')
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [selectedCardFilter, setSelectedCardFilter] = useState('all')

  const [showNewCardModal, setShowNewCardModal] = useState(false)
  const [cardName, setCardName] = useState('')
  const [cardBrand, setCardBrand] = useState('Mastercard')
  const [cardColor, setCardColor] = useState('#10B981')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchTransactions()
    fetchCards()
  }, [])

  async function fetchTransactions() {
    const { data } = await supabase.from('transactions').select('*').order('date', { ascending: false })
    if (data) setTransactions(data)
  }

  async function fetchCards() {
    const { data } = await supabase.from('cards').select('*')
    if (data) setCards(data)
  }

  async function handleAddCard(e: React.FormEvent) {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert("Utilizador não autenticado!")
      return
    }

    const { error } = await supabase.from('cards').insert({
      user_id: user.id,
      name: cardName,
      brand: cardBrand,
      color: cardColor,
    })

    if (error) {
      alert("Erro ao salvar cartão: " + error.message)
    } else {
      setCardName('')
      setShowNewCardModal(false)
      fetchCards()
    }
  }

  async function handleDeleteCard(id: string) {
    if (!confirm("Tens a certeza que pretendes eliminar este cartão?")) return

    const { error } = await supabase.from('cards').delete().eq('id', id)
    if (error) {
      alert("Erro ao eliminar cartão: " + error.message)
    } else {
      fetchCards()
    }
  }

  async function handleTogglePaid(id: string, currentStatus: boolean) {
    const { error } = await supabase
      .from('transactions')
      .update({ is_paid: !currentStatus })
      .eq('id', id)

    if (!error) {
      fetchTransactions()
    }
  }

  async function handleMarkAllAsPaid() {
    const filteredIds = filteredTransactions
      .filter(tx => !tx.is_paid)
      .map(tx => tx.id)

    if (filteredIds.length === 0) {
      alert("Não existem transações pendentes nesta vista.")
      return
    }

    for (const id of filteredIds) {
      await supabase.from('transactions').update({ is_paid: true }).eq('id', id)
    }
    fetchTransactions()
  }

  async function handleDeleteLastImportBatch() {
    const savedBatchId = localStorage.getItem('last_import_batch_id')
    if (!savedBatchId) {
      alert("Nenhum lote de importação recente encontrado na memória.")
      return
    }

    const confirmed = window.confirm("Tens a certeza que pretendes apagar todos os gastos da última importação por IA de uma só vez?")
    if (!confirmed) return

    setLoading(true)
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('batch_id', savedBatchId)

    setLoading(false)

    if (error) {
      alert("Erro ao apagar lote: " + error.message)
    } else {
      localStorage.removeItem('last_import_batch_id')
      alert("Última importação apagada com sucesso!")
      fetchTransactions()
    }
  }

  async function handleDeleteFilteredBatch() {
    if (filteredTransactions.length === 0) {
      alert("Não existem transações visíveis para eliminar.")
      return
    }

    const confirmed = window.confirm(`Tens a certeza que pretendes apagar TODAS as ${filteredTransactions.length} transações visíveis nesta vista?`)
    if (!confirmed) return

    setLoading(true)
    for (const tx of filteredTransactions) {
      await supabase.from('transactions').delete().eq('id', tx.id)
    }
    setLoading(false)
    fetchTransactions()
  }

  function handleExportCSV() {
    if (filteredTransactions.length === 0) {
      alert("Não existem transações para exportar na vista selecionada.")
      return
    }

    const headers = "Descrição,Valor,Tipo,Categoria,Data,Estado\n"
    const rows = filteredTransactions.map(tx => 
      `"${tx.description}",${tx.amount},${tx.type},"${tx.category}",${tx.date},${tx.is_paid ? 'Pago' : 'Pendente'}`
    ).join("\n")

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `faturas_gastos_${selectedMonth}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  async function handleAddTransaction(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const totalValue = parseFloat(amount)

    if (isInstallment && type === 'expense') {
      const numInstallments = parseInt(installmentsTotal)
      const installmentValue = totalValue / numInstallments
      const baseDate = new Date(date + 'T00:00:00')

      for (let i = 1; i <= numInstallments; i++) {
        const installmentDate = new Date(baseDate)
        installmentDate.setMonth(installmentDate.getMonth() + (i - 1))

        const { error: insertError } = await supabase.from('transactions').insert({
          user_id: user.id,
          description: `${description} (${i}/${numInstallments})`,
          amount: parseFloat(installmentValue.toFixed(2)),
          type,
          category,
          card_id: cardId || null,
          date: installmentDate.toISOString().split('T')[0],
          installments_total: numInstallments,
          installment_current: i,
          is_paid: false,
        })

        if (insertError) {
          setError(insertError.message)
          setLoading(false)
          return
        }
      }
    } else {
      const { error: insertError } = await supabase.from('transactions').insert({
        user_id: user.id,
        description,
        amount: totalValue,
        type,
        category,
        card_id: cardId || null,
        date,
        installments_total: 1,
        installment_current: 1,
        is_paid: false,
      })

      if (insertError) {
        setError(insertError.message)
        setLoading(false)
        return
      }
    }

    setDescription('')
    setAmount('')
    setIsInstallment(false)
    setLoading(false)
    fetchTransactions()
  }

  async function handleDelete(id: string, description: string, amount: number) {
    const confirmed = window.confirm(`Tens a certeza que pretendes eliminar a transação "${description}" no valor de R$ ${amount.toFixed(2)}?`)
    if (!confirmed) return

    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) {
      alert("Erro ao eliminar transação: " + error.message)
    } else {
      fetchTransactions()
    }
  }

  // Filtragem rigorosa por ciclo de fecho de cartão (dia 06 do mês anterior até dia 05 do mês selecionado)
  const filteredTransactions = transactions.filter((tx) => {
    if (!tx.date) return false

    const txDate = new Date(tx.date + 'T00:00:00')
    const [year, month] = selectedMonth.split('-').map(Number)

    // Ciclo exato: do dia 6 do mês anterior ao dia 5 do mês da fatura
    const startDate = new Date(year, month - 2, 6)
    const endDate = new Date(year, month - 1, 5)

    const matchesBillingCycle = txDate >= startDate && txDate <= endDate

    const matchesCard = 
      selectedCardFilter === 'all' ? true :
      selectedCardFilter === 'none' ? !tx.card_id :
      tx.card_id === selectedCardFilter

    return matchesBillingCycle && matchesCard
  })

  // Soma estrita apenas das despesas (gastos) do cartão para o valor total da fatura do mês
  const totalInvoiceAmount = filteredTransactions
    .filter(tx => tx.type === 'expense')
    .reduce((acc, tx) => acc + tx.amount, 0)

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24 px-3 sm:px-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-gray-900 via-gray-900/90 to-emerald-950/30 p-5 sm:p-6 rounded-2xl border border-gray-800 shadow-2xl backdrop-blur-xl">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex flex-wrap items-center gap-2 sm:gap-3">
            Gestão de Gastos <span className="text-[10px] sm:text-xs px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-mono uppercase tracking-widest">Finance Pro</span>
          </h1>
          <p className="text-gray-400 mt-1 text-xs sm:text-sm">Controle de faturas por ciclo de fecho de cartão e parcelamentos.</p>
        </div>
        <button
          onClick={() => setShowNewCardModal(true)}
          className="w-full sm:w-auto px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
        >
          💳 Adicionar Cartão
        </button>
      </div>

      {showNewCardModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
          <form onSubmit={handleAddCard} className="bg-gray-900 border border-gray-800 p-6 sm:p-8 rounded-2xl max-w-md w-full space-y-4 shadow-2xl relative overflow-hidden">
            <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span>💳</span> Registar Novo Cartão
            </h3>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-300 uppercase tracking-wider">Nome do Cartão / Banco</label>
              <input
                type="text"
                required
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                placeholder="Ex: Nubank, Digio..."
                className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-300 uppercase tracking-wider">Bandeira</label>
              <select
                value={cardBrand}
                onChange={(e) => setCardBrand(e.target.value)}
                className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="Mastercard">Mastercard</option>
                <option value="Visa">Visa</option>
                <option value="Elo">Elo</option>
                <option value="American Express">American Express</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-300 uppercase tracking-wider">Cor Visual do Cartão</label>
              <input
                type="color"
                value={cardColor}
                onChange={(e) => setCardColor(e.target.value)}
                className="w-full h-11 bg-gray-950 border border-gray-800 rounded-xl cursor-pointer px-2 py-1"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowNewCardModal(false)}
                className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-xl transition-all text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/20 transition-all text-sm"
              >
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}

      {cards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => (
            <div
              key={card.id}
              className="p-5 rounded-2xl shadow-xl text-white flex flex-col justify-between h-36 relative overflow-hidden border border-white/10 transition-all duration-300 group"
              style={{ backgroundColor: card.color || '#1f2937' }}
            >
              <div className="flex justify-between items-start z-10">
                <span className="font-extrabold text-base tracking-wider drop-shadow">{card.name}</span>
                <button
                  onClick={() => handleDeleteCard(card.id)}
                  className="text-white/80 hover:text-red-200 text-xs bg-black/30 hover:bg-black/50 px-2 py-0.5 rounded-lg backdrop-blur-sm transition"
                >
                  ✕
                </button>
              </div>

              <div className="flex justify-between items-end z-10">
                <span className="text-[10px] uppercase bg-black/40 px-2 py-0.5 rounded font-mono tracking-wider backdrop-blur-sm">{card.brand}</span>
                <span className="text-xs font-mono tracking-widest opacity-80">••••</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs sm:text-sm p-4 rounded-xl">
          {error}
        </div>
      )}

      <form onSubmit={handleAddTransaction} className="bg-gray-900/85 backdrop-blur-xl border border-gray-800/80 p-5 sm:p-8 rounded-2xl shadow-2xl space-y-5">
        <h3 className="text-base sm:text-lg font-bold text-emerald-400 flex items-center gap-2">
          <span>➕</span> Nova Transação / Compra Parcelada
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-300 uppercase tracking-wider">Descrição</label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Supermercado, Tênis..."
              className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-300 uppercase tracking-wider">Valor Total (R$)</label>
            <input
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-300 uppercase tracking-wider">Tipo</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="expense">Despesa (Gasto / Cartão)</option>
              <option value="income">Receita (Entrada)</option>
            </select>
          </div>

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
              <option value="Salário">Salário</option>
              <option value="Compras">Compras / Vestuário</option>
              <option value="Outros">Outros</option>
            </select>
          </div>

          {type === 'expense' && cards.length > 0 && (
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-300 uppercase tracking-wider">Cartão Utilizado</label>
              <select
                value={cardId}
                onChange={(e) => setCardId(e.target.value)}
                className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="">Nenhum / Dinheiro / Pix</option>
                {cards.map((card) => (
                  <option key={card.id} value={card.id}>{card.name} ({card.brand})</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-300 uppercase tracking-wider">Data da Compra</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {type === 'expense' && (
            <div className="flex flex-col justify-end space-y-3 sm:col-span-2 pt-2 border-t border-gray-800/80">
              <label className="flex items-start sm:items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isInstallment}
                  onChange={(e) => setIsInstallment(e.target.checked)}
                  className="mt-0.5 sm:mt-0 rounded bg-gray-950 border-gray-800 text-emerald-600 w-5 h-5 focus:ring-emerald-500 shrink-0"
                />
                <span className="text-xs sm:text-sm text-gray-300 font-medium">Compra Parcelada no Cartão? (Divide automaticamente pelas faturas mensais)</span>
              </label>

              {isInstallment && (
                <div className="flex items-center gap-3 pt-1">
                  <span className="text-xs text-gray-400 font-medium">Nº de parcelas:</span>
                  <input
                    type="number"
                    min="2"
                    max="48"
                    value={installmentsTotal}
                    onChange={(e) => setInstallmentsTotal(e.target.value)}
                    className="w-20 px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/20 transition-all text-sm sm:text-base"
        >
          {loading ? 'A processar...' : 'Guardar Transação'}
        </button>
      </form>

      {/* Destaque Executivo Exclusivo para Faturas de Cartão (Soma apenas despesas do ciclo) */}
      <div className="bg-gradient-to-r from-gray-900 via-emerald-950/20 to-gray-900 border border-emerald-500/30 p-5 sm:p-6 rounded-2xl shadow-2xl flex flex-col sm:flex-row justify-between items-center gap-4 backdrop-blur-xl">
        <div className="space-y-1 text-center sm:text-left w-full sm:w-auto">
          <span className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-emerald-400">Valor da Fatura Total do Mês (Ciclo de Fecho)</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
            R$ {totalInvoiceAmount.toFixed(2)}
          </h2>
          <p className="text-[11px] sm:text-xs text-gray-400">Soma rigorosa apenas das compras realizadas neste período de fatura.</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-xl font-bold shrink-0">
          💳
        </div>
      </div>

      {/* Histórico & Filtros */}
      <div className="bg-gray-900/85 backdrop-blur-xl border border-gray-800/80 p-5 sm:p-8 rounded-2xl shadow-2xl space-y-6">
        <div className="flex flex-col gap-4 border-b border-gray-800/80 pb-5">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span>📊</span> Histórico de Gastos (Ciclo de Fecho)
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Compras registadas entre o fechamento anterior e o atual.</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            <select
              value={selectedCardFilter}
              onChange={(e) => setSelectedCardFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
            >
              <option value="all">Todos os Cartões / Movimentos</option>
              <option value="none">Sem Cartão (Pix / Dinheiro)</option>
              {cards.map(card => (
                <option key={card.id} value={card.id}>Cartão: {card.name}</option>
              ))}
            </select>

            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            onClick={handleExportCSV}
            className="flex-1 sm:flex-none px-3.5 py-2.5 bg-gray-950 hover:bg-gray-800 text-emerald-400 border border-gray-800 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2 shadow"
          >
            📥 CSV
          </button>

          <button
            onClick={handleDeleteLastImportBatch}
            disabled={loading}
            className="flex-1 sm:flex-none px-3.5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2 shadow"
          >
            🗑️ Desfazer IA
          </button>

          <button
            onClick={handleDeleteFilteredBatch}
            disabled={loading || filteredTransactions.length === 0}
            className="w-full sm:w-auto px-3.5 py-2.5 bg-gray-950 hover:bg-gray-800 text-gray-300 border border-gray-800 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2 shadow disabled:opacity-50"
          >
            🗑️ Apagar Filtrados ({filteredTransactions.length})
          </button>
        </div>

        {filteredTransactions.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gray-950/60 p-4 rounded-xl border border-gray-800/80">
            <span className="text-xs text-gray-300 font-medium">
              Total de despesas no ciclo: <strong className="text-white font-mono">R$ {totalInvoiceAmount.toFixed(2)}</strong>
            </span>
            <button
              onClick={handleMarkAllAsPaid}
              className="w-full sm:w-auto px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-semibold rounded-lg transition text-center"
            >
              ✓ Marcar todos como Pagos
            </button>
          </div>
        )}

        {filteredTransactions.length > 0 ? (
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {filteredTransactions.map((tx) => {
              const matchedCard = cards.find(c => c.id === tx.card_id)
              return (
                <div 
                  key={tx.id} 
                  className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-4 rounded-xl border transition-all duration-300 ${
                    tx.is_paid 
                      ? 'bg-emerald-950/10 border-emerald-900/30' 
                      : 'bg-gray-950/40 border-gray-800/70 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3 w-full sm:w-auto">
                    <button
                      onClick={() => handleTogglePaid(tx.id, tx.is_paid)}
                      className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all shrink-0 mt-0.5 sm:mt-0 ${
                        tx.is_paid 
                          ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/30' 
                          : 'border-gray-700 hover:border-gray-500 bg-gray-900'
                      }`}
                    >
                      {tx.is_paid && '✓'}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`font-bold text-sm truncate max-w-[220px] sm:max-w-xs transition ${tx.is_paid ? 'text-emerald-400 line-through opacity-80' : 'text-white'}`}>
                          {tx.description}
                        </p>
                        {matchedCard && (
                          <span 
                            className="text-[9px] px-2 py-0.5 rounded-md text-white font-semibold shadow-sm shrink-0" 
                            style={{ backgroundColor: matchedCard.color }}
                          >
                            {matchedCard.name}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{tx.category} • {tx.date}</p>
                    </div>
                  </div>

                  <div className="flex justify-between sm:justify-end items-center gap-4 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-800/60">
                    <span className={`font-semibold font-mono text-sm ${tx.is_paid ? 'text-emerald-400 line-through opacity-80' : 'text-red-400'}`}>
                      - R$ {tx.amount.toFixed(2)}
                    </span>
                    <button
                      onClick={() => handleDelete(tx.id, tx.description, tx.amount)}
                      className="text-gray-500 hover:text-red-400 text-xs px-2.5 py-1 rounded-lg hover:bg-red-500/10 transition"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-500 py-10 text-center">Nenhuma transação encontrada para o ciclo de fatura selecionado.</p>
        )}
      </div>
    </div>
  )
}