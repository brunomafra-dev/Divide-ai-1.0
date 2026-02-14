'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function GroupPage() {
  const params = useParams()
  const router = useRouter()
  const groupId = String(params?.id ?? '')
  const [loading, setLoading] = useState(true)
  const [groupName, setGroupName] = useState<string>('')

  useEffect(() => {
    const run = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        router.replace('/login')
        return
      }

      const { data, error } = await supabase
        .from('groups')
        .select('id,name')
        .eq('id', groupId)
        .single()

      if (error) {
        console.error('Erro ao carregar grupo:', error.message)
        setGroupName('Grupo não encontrado')
      } else {
        setGroupName(data?.name ?? '')
      }

      setLoading(false)
    }

    if (groupId) run()
  }, [groupId, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F7F7] flex items-center justify-center">
        <div className="text-gray-600 text-lg">Carregando grupo...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F7F7F7] p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="text-[#5BC5A7] font-medium">← Voltar</Link>
          <div className="text-sm text-gray-500">ID: {groupId}</div>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-2">{groupName}</h1>
        <p className="text-gray-600 mb-6">
          Agora essa rota é a correta. Aqui entra a tela de adicionar gastos/editar grupo.
        </p>

        {/* Aqui você pluga sua tela de gastos */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <p className="text-gray-700">🚧 Tela de gastos vem aqui.</p>
        </div>
      </div>
    </div>
  )
}
