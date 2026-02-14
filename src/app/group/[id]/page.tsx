'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Plus } from 'lucide-react'
import Link from 'next/link'

interface Transaction {
  id: string
  description: string
  value: number
  created_at: string
}

export default function GroupPage() {
  const { id } = useParams()
  const router = useRouter()

  const [groupName, setGroupName] = useState('')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      if (!id) return

      // Busca grupo
      const { data: group } = await supabase
        .from('groups')
        .select('name')
        .eq('id', id)
        .single()

      if (!group) {
        router.replace('/')
        return
      }

      setGroupName(group.name)

      // Busca gastos
      const { data: tx } = await supabase
        .from('transactions')
        .select('*')
        .eq('group_id', id)
        .order('created_at', { ascending: false })

      setTransactions(tx || [])
      setLoading(false)
    }

    loadData()
  }, [id, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Carregando...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F7F7F7] pb-24">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/">
            <ArrowLeft className="w-6 h-6 text-gray-600 cursor-pointer" />
          </Link>
          <h1 className="text-xl font-bold">{groupName}</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-3">
        {transactions.length === 0 ? (
          <div className="text-center text-gray-500 py-10">
            Nenhum gasto ainda.
          </div>
        ) : (
          transactions.map((tx) => (
            <div
              key={tx.id}
              className="bg-white p-4 rounded-lg shadow-sm"
            >
              <p className="font-medium">{tx.description}</p>
              <p className="text-sm text-gray-600">
                R$ {Number(tx.value).toFixed(2)}
              </p>
            </div>
          ))
        )}
      </main>

      {/* Botão adicionar gasto */}
      <button
        type="button"
        onClick={() => router.push(`/group/${id}/add-expense`)}
        className="fixed bottom-20 right-6 w-16 h-16 bg-[#5BC5A7] rounded-full flex items-center justify-center shadow-lg hover:bg-[#4AB396] transition-all"
      >
        <Plus className="w-8 h-8 text-white" />
      </button>
    </div>
  )
}
