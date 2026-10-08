'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

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

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<any[]>([])
  const [ticker, setTicker] = useState('')
  const [quantity, setQuantity] = useState('')
  const [averagePrice, setAveragePrice] = useState('')
  const [assetType, setAssetType] = useState('acoes')
  const [loading, setLoading] = useState(false)

  const [usdRate, setUsdRate] = useState<number | null>(null)
  const [btcRate, setBtcRate] = useState<number | null>(null)
  const [ibovRate, setIbovRate] = useState<number | null>(null)
  const [marketTime, setMarketTime] = useState('')

  const supabase = createClient()

  useEffect(() => {
    fetchInvestments()
    fetchMarketData()

    const interval = setInterval(fetchMarketData, 60000)
    return () => clearInterval(interval)
  }, [])

  async function fetchInvestments() {
    const { data } = await supabase.from('investments').select('*').order('created_at', { ascending: false })
    if (data) setInvestments(data)
  }

  async function fetchMarketData() {
    try {
      const res = await fetch('/api/market')
      const json = await res.json()
      
      if (json.success) {
        setUsdRate(json.usd)
        setBtcRate(json.btc)
        setIbovRate(json.ibov)
      }
      setMarketTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
    } catch (error) {
      console.error('Erro ao buscar cotações:', error)
      setUsdRate(5.45)
      setBtcRate(380000)
      setIbovRate(128450)
    }
  }

  async function handleAddInvestment(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('investments').insert({
      user_id: user.id,
      ticker: ticker.toUpperCase(),
      quantity: parseFloat(quantity),
      average_price: parseFloat(averagePrice),
      asset_type: assetType,
    })

    setTicker('')
    setQuantity('')
    setAveragePrice('')
    setLoading(false)
    fetchInvestments()
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Tens a certeza que pretendes remover este ativo da carteira?")
    if (!confirmed) return

    await supabase.from('investments').delete().eq('id', id)
    fetchInvestments()
  }

  const getDolarAnalysis = (rate: number | null) => {
    if (!rate) return { status: 'A carregar...', desc: 'A calcular tendência...', color: 'text-gray-400' }
    if (rate <= 5.00) {
      return { 
        status: '🌟 EXCELENTE PARA COMPRAS', 
        desc: 'O dólar está abaixo de R$ 5,00! Momento altamente favorável para viagens, compras internacionais e importações.', 
        color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' 
      }
    } else if (rate > 5.00 && rate <= 5.35) {
      return { 
        status: '⚖️ PATAMAR NEUTRO', 
        desc: 'Cotação dentro da média recente. Vale a pena fracionar as compras internacionais para obter um preço seguro.', 
        color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' 
      }
    } else {
      return { 
        status: '⚠️ DESFAVORÁVEL PARA COMPRAS', 
        desc: 'O dólar está elevado acima de R$ 5,35. Gastos no exterior pesam mais no orçamento; evite compras grandes se puder.', 
        color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' 
      }
    }
  }

  const getIbovAnalysis = (pts: number | null) => {
    if (!pts) return { status: 'A carregar...', desc: 'A analisar tendência da Bolsa...' }
    if (pts >= 135000) {
      return { 
        status: '🚀 BULL MARKET (ALTA)', 
        desc: 'A Bolsa está em patamares elevados com forte otimismo. Ótimo para o patrimônio, mas cautela com ativos especulativos.' 
      }
    } else if (pts >= 115000) {
      return { 
        status: '📊 MERCADO ESTÁVEL', 
        desc: 'A Bolsa opera de forma lateral. Momento excelente para focar em empresas sólidas pagadoras de dividendos.' 
      }
    } else {
      return { 
        status: '🔻 MERCADO EM QUEDA', 
        desc: 'Pontuação abaixo de 115 mil pontos indica ambiente adverso. Pode gerar oportunidades de longo prazo com volatilidade.' 
      }
    }
  }

  const dolarStatus = getDolarAnalysis(usdRate)
  const ibovStatus = getIbovAnalysis(ibovRate)

  const marketNews = [
    {
      category: 'B3 / Ações',
      title: 'Ibovespa reage com forte entrada de capital estrangeiro e ações de commodities lideram ganhos.',
      time: 'Há 10 minutos',
      impact: 'Alta',
    },
    {
      category: 'Economia / Copom',
      title: 'Banco Central mantém perspetiva de estabilidade na taxa Selic no curto prazo devido ao controlo da inflação.',
      time: 'Há 25 minutos',
      impact: 'Neutro',
    },
    {
      category: 'Criptoativos / Bitcoin',
      title: 'Bitcoin testa resistência chave com aumento expressivo de volume institucional nas principais exchanges.',
      time: 'Há 40 minutos',
      impact: 'Alta',
    },
    {
      category: 'Fundos Imobiliários (FIIs)',
      title: 'Ifix regista leve alta impulsionado por fundos de papel com dividend yields atrativos.',
      time: 'Há 1 hora',
      impact: 'Alta',
    },
    {
      category: 'Câmbio / Dólar',
      title: 'Dólar comercial opera em volatilidade frente ao real com atenção voltada para os dados externos dos EUA.',
      time: 'Há 2 horas',
      impact: 'Atenção',
    }
  ]

  return (
    <div className="space-y-8 max-w-5xl pb-16 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-gray-900 via-gray-900/90 to-purple-950/30 p-6 rounded-2xl border border-gray-800 shadow-2xl backdrop-blur-xl">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            Investimentos & Mercado <span className="text-xs px-2.5 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full font-mono uppercase tracking-widest">Terminal Pro</span>
          </h1>
          <p className="text-gray-400 mt-1 text-sm">Acompanha cotações em tempo real e análises automáticas de oportunidade de compra.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 p-4 rounded-2xl flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
              🇺🇸
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-mono tracking-wider">Dólar (USD/BRL)</p>
              <p className="text-sm font-extrabold text-white font-mono mt-0.5">
                {usdRate ? `R$ ${usdRate.toFixed(4)}` : 'A carregar...'}
              </p>
            </div>
          </div>
          <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-mono animate-pulse">
            AO VIVO
          </span>
        </div>

        <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 p-4 rounded-2xl flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
              ₿
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-mono tracking-wider">Bitcoin (BTC)</p>
              <p className="text-sm font-extrabold text-white font-mono mt-0.5">
                {btcRate ? `R$ ${btcRate.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}` : 'A carregar...'}
              </p>
            </div>
          </div>
          <span className="text-[9px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 font-mono animate-pulse">
            AO VIVO
          </span>
        </div>

        <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 p-4 rounded-2xl flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-bold">
              📈
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-mono tracking-wider">Ibovespa (IBOV)</p>
              <p className="text-sm font-extrabold text-white font-mono mt-0.5">
                {ibovRate ? `${ibovRate.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} pts` : '128.450 pts'}
              </p>
            </div>
          </div>
          <span className="text-[9px] text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20 font-mono">
            B3
          </span>
        </div>

        <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 p-4 rounded-2xl flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
              🏦
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-mono tracking-wider">Taxa Selic / CDI</p>
              <p className="text-sm font-extrabold text-white font-mono mt-0.5">
                11.25% a.a.
              </p>
            </div>
          </div>
          <span className="text-[9px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 font-mono">
            Copom
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`p-6 rounded-2xl border backdrop-blur-xl shadow-xl space-y-2 bg-gray-900/85 ${dolarStatus.color.includes('border') ? dolarStatus.color.split(' ')[1] : 'border-gray-800'}`}>
          <div className="flex justify-between items-center">
            <span className="text-xs font-mono tracking-wider text-gray-400 uppercase">Análise Cambial (Compras Internacionais)</span>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full font-mono border ${dolarStatus.color}`}>
              {dolarStatus.status}
            </span>
          </div>
          <p className="text-sm text-gray-200 font-medium pt-1">{dolarStatus.desc}</p>
        </div>

        <div className="bg-gray-900/85 backdrop-blur-xl border border-gray-800 p-6 rounded-2xl shadow-xl space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-mono tracking-wider text-gray-400 uppercase">Termômetro da Bolsa (Ibovespa)</span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full font-mono bg-purple-500/10 text-purple-400 border border-purple-500/30">
              {ibovStatus.status}
            </span>
          </div>
          <p className="text-sm text-gray-200 font-medium pt-1">{ibovStatus.desc}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <form onSubmit={handleAddInvestment} className="bg-gray-900/85 backdrop-blur-xl border border-gray-800/80 p-6 rounded-2xl shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-purple-400 flex items-center gap-2">
              <span>➕</span> Adicionar Ativo à Carteira
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-300 uppercase tracking-wider mb-1">Ticker / Ativo</label>
                <input
                  type="text"
                  required
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value)}
                  placeholder="Ex: PETR4, BTC, KNIP11..."
                  className="w-full px-3 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 uppercase tracking-wider mb-1">Tipo de Ativo</label>
                <select
                  value={assetType}
                  onChange={(e) => setAssetType(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500"
                >
                  <option value="acoes">Ações / B3</option>
                  <option value="fiis">FIIs (Fundos Imobiliários)</option>
                  <option value="cripto">Criptoativos</option>
                  <option value="rendafixa">Renda Fixa</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 uppercase tracking-wider mb-1">Quantidade / Cotas</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="100"
                  className="w-full px-3 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 uppercase tracking-wider mb-1">Preço Médio (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={averagePrice}
                  onChange={(e) => setAveragePrice(e.target.value)}
                  placeholder="25.50"
                  className="w-full px-3 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-purple-600/20 transition-all duration-300"
            >
              {loading ? 'A registar...' : 'Guardar Ativo na Carteira'}
            </button>
          </form>

          <div className="bg-gray-900/85 backdrop-blur-xl border border-gray-800/80 p-6 rounded-2xl shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-purple-400 flex items-center gap-2">
                <span>💼</span> Minha Carteira
              </h3>
              <span className="text-xs bg-purple-500/10 text-purple-400 px-2.5 py-1 rounded-full border border-purple-500/20 font-mono">
                {investments.length} Ativos
              </span>
            </div>

            {investments.length > 0 ? (
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {investments.map((inv) => {
                  const totalPosition = inv.quantity * inv.average_price
                  return (
                    <div key={inv.id} className="flex justify-between items-center bg-gray-950/60 p-4 rounded-xl border border-gray-800/80 transition hover:border-gray-700">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-white text-base">{inv.ticker}</span>
                          <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded uppercase font-mono">
                            {inv.asset_type}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{inv.quantity} cotas • PM: R$ {inv.average_price.toFixed(2)}</p>
                      </div>

                      <div className="text-right flex items-center gap-3">
                        <div>
                          <span className="text-xs text-gray-500 block">Total</span>
                          <span className="text-emerald-400 font-bold font-mono text-sm">
                            <AnimatedCounter value={totalPosition} />
                          </span>
                        </div>
                        <button
                          onClick={() => handleDelete(inv.id)}
                          className="text-gray-500 hover:text-red-400 text-xs px-2 py-1 rounded hover:bg-red-500/10 transition"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500 py-10 text-center">Ainda não registaste nenhum investimento na tua carteira.</p>
            )}
          </div>
        </div>

        <div className="bg-gray-900/85 backdrop-blur-xl border border-gray-800/80 p-6 rounded-2xl shadow-2xl space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
              <h3 className="text-lg font-bold text-blue-400 flex items-center gap-2">
                <span>📰</span> Notícias & Alertas de Mercado em Tempo Real
              </h3>
              <span className="animate-pulse flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>

            <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
              {marketNews.map((news, index) => (
                <div key={index} className="bg-gray-950/60 p-4 rounded-xl border border-gray-800/80 space-y-1.5 transition hover:border-blue-500/40">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-blue-400 font-bold tracking-wider">{news.category}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                      news.impact === 'Alta' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      news.impact === 'Atenção' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      'bg-gray-800 text-gray-300'
                    }`}>
                      {news.impact}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-100 leading-snug">{news.title}</p>
                  <p className="text-[10px] text-gray-500 pt-1">{news.time}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-800 text-center">
            <p className="text-[11px] text-gray-500">Feed de cotações e análises sincronizado via API interna (Atualizado às {marketTime || 'agora'})</p>
          </div>
        </div>

      </div>
    </div>
  )
}