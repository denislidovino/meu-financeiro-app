'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SecurityPage() {
  const [factors, setFactors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  const supabase = createClient()

  useEffect(() => {
    fetchFactors()
  }, [])

  async function fetchFactors() {
    setLoading(true)
    const { data, error } = await supabase.auth.mfa.listFactors()
    if (data) {
      setFactors(data.totp || [])
    }
    setLoading(false)
  }

  async function handleEnroll() {
    setError(null)
    setSuccess(null)
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
    })

    if (error) {
      setError(error.message)
      return
    }

    setFactorId(data.id)
    setQrCode(data.totp.qr_code)
    setSecret(data.totp.secret)
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!factorId) return

    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    })

    if (challengeError) {
      setError(challengeError.message)
      return
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code: verifyCode,
    })

    if (verifyError) {
      setError('Código inválido. Tenta novamente.')
      return
    }

    setSuccess('Autenticação de Dois Fatores (2FA) ativada com sucesso!')
    setQrCode(null)
    setSecret(null)
    setVerifyCode('')
    fetchFactors()
  }

  async function handleUnenroll(id: string) {
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id })
    if (error) {
      setError(error.message)
    } else {
      setSuccess('2FA desativado com sucesso.')
      fetchFactors()
    }
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">Segurança da Conta & 2FA</h1>
        <p className="text-gray-400 mt-1">Protege a tua conta com autenticação de dois fatores baseada em TOTP.</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm p-3 rounded-lg">
          {success}
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl shadow-lg space-y-6">
        <h3 className="text-lg font-semibold text-emerald-400">Estado do 2FA</h3>

        {loading ? (
          <p className="text-sm text-gray-400">A carregar configurações de segurança...</p>
        ) : factors.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-lg">
              <div>
                <p className="font-medium text-emerald-400">2FA Ativo</p>
                <p className="text-xs text-gray-400 mt-0.5">A tua conta está protegida com autenticação de dois passos.</p>
              </div>
              <button
                onClick={() => handleUnenroll(factors[0].id)}
                className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm font-medium rounded-lg border border-red-500/30 transition"
              >
                Desativar 2FA
              </button>
            </div>
          </div>
        ) : qrCode ? (
          <div className="space-y-4 border-t border-gray-800 pt-4">
            <p className="text-sm text-gray-300">1. Lê o QR Code abaixo com o teu aplicativo autenticador (Google Authenticator, Authy, etc.):</p>
            <div className="bg-white p-4 inline-block rounded-lg">
              <img src={qrCode} alt="QR Code 2FA" className="w-48 h-48" />
            </div>
            <p className="text-xs text-gray-400">Chave secreta (caso não consigas ler o QR): <span className="font-mono text-emerald-400">{secret}</span></p>

            <form onSubmit={handleVerify} className="space-y-4 pt-4 border-t border-gray-800">
              <label className="block text-sm font-medium text-gray-300">2. Insere o código de 6 dígitos gerado pelo app:</label>
              <div className="flex gap-4">
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  placeholder="000000"
                  className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-emerald-500 w-36"
                />
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition"
                >
                  Confirmar e Ativar
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-300">Nenhum fator de 2FA configurado. Recomendamos a ativação para proteger o teu histórico financeiro.</p>
            <button
              onClick={handleEnroll}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition"
            >
              Configurar 2FA Agora
            </button>
          </div>
        )}
      </div>
    </div>
  )
}