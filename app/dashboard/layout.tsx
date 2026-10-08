import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-[#090a0f] text-white flex selection:bg-emerald-500 selection:text-black">
      {/* Barra Lateral de Navegação - Estilo Carbono & Gradientes Modernos */}
      <aside className="w-72 bg-[#0d0f17]/80 backdrop-blur-2xl border-r border-white/[0.06] p-6 hidden md:flex flex-col justify-between shadow-[10px_0_30px_-15px_rgba(0,0,0,0.5)] relative overflow-hidden">
        
        {/* Detalhe de textura subtil de carbono / brilho de fundo */}
        <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-emerald-500/[0.07] to-transparent pointer-events-none"></div>
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="space-y-8 relative z-10">
          {/* Logo / Título com Gradiente */}
          <div className="flex items-center gap-3.5 px-2 py-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/25 ring-1 ring-white/20 animate-pulse">
              <span className="text-black font-black text-xl tracking-tighter">F</span>
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                Finanças Seguras
              </h1>
              <span className="text-[9px] font-mono tracking-widest text-emerald-400 uppercase bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Carbon Core
              </span>
            </div>
          </div>

          {/* Menu de Navegação Animado */}
          <nav className="space-y-1.5">
            <a 
              href="/dashboard" 
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06] transition-all duration-300 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <span className="text-gray-500 group-hover:text-emerald-400 transition-colors relative z-10 text-base">📊</span>
              <span className="relative z-10">Visão Geral</span>
            </a>

            <a 
              href="/dashboard/gastos" 
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06] transition-all duration-300 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <span className="text-gray-500 group-hover:text-emerald-400 transition-colors relative z-10 text-base">💸</span>
              <span className="relative z-10">Gastos & Receitas</span>
            </a>

            <a 
              href="/dashboard/metas" 
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06] transition-all duration-300 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <span className="text-gray-500 group-hover:text-emerald-400 transition-colors relative z-10 text-base">🎯</span>
              <span className="relative z-10">Metas</span>
            </a>

            <a 
              href="/dashboard/alertas" 
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06] transition-all duration-300 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <span className="text-gray-500 group-hover:text-emerald-400 transition-colors relative z-10 text-base">🔔</span>
              <span className="relative z-10">Alertas & Orçamentos</span>
            </a>

            <a 
              href="/dashboard/investimentos" 
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06] transition-all duration-300 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <span className="text-gray-500 group-hover:text-emerald-400 transition-colors relative z-10 text-base">📈</span>
              <span className="relative z-10">Investimentos & Notícias</span>
            </a>

            <a 
              href="/dashboard/simulador" 
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06] transition-all duration-300 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <span className="text-gray-500 group-hover:text-emerald-400 transition-colors relative z-10 text-base">🧮</span>
              <span className="relative z-10">Simulador de Parcelas</span>
            </a>

            {/* Link Especial IA com Gradiente Ativo */}
            <a 
              href="/dashboard/scanner" 
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-emerald-300 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-cyan-500/15 border border-emerald-500/30 shadow-lg shadow-emerald-500/10 transition-all duration-300 hover:scale-[1.02] group"
            >
              <span className="text-emerald-400 animate-spin text-base" style={{ animationDuration: '6s' }}>✨</span>
              <span className="bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">Scanner de Faturas (IA)</span>
            </a>
          </nav>
        </div>

        {/* Rodapé da Barra Lateral Estilo Carbono */}
        <div className="pt-6 border-t border-white/[0.06] px-2 relative z-10">
          <div className="flex items-center gap-3 bg-white/[0.02] p-3 rounded-xl border border-white/[0.04]">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-black font-black text-xs shadow-md">
              U
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-gray-200 truncate">Sessão Ativa</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                <p className="text-[9px] text-emerald-400 font-mono tracking-wider uppercase">Online Supabase</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Conteúdo Principal com Fundo Degradê Dinâmico */}
      <main className="flex-1 p-8 overflow-y-auto bg-gradient-to-br from-[#090a0f] via-[#0d0f17] to-[#07080c]">
        {children}
      </main>
    </div>
  )
}