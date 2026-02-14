'use client'

import { ArrowLeft, Plus, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Participant {
  id: string
  name: string
  email?: string
}

type Category = 'apartment' | 'house' | 'trip' | 'other'

export default function CreateGroup() {
  const router = useRouter()

  const [groupName, setGroupName] = useState('')
  const [category, setCategory] = useState<Category>('other')

  const [participants, setParticipants] = useState<Participant[]>([
    { id: '1', name: 'Você', email: 'voce@email.com' },
  ])

  const [newParticipantName, setNewParticipantName] = useState('')
  const [newParticipantEmail, setNewParticipantEmail] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const categories = [
    { id: 'apartment', label: 'Apartamento', icon: '🏢' },
    { id: 'house', label: 'Casa', icon: '🏠' },
    { id: 'trip', label: 'Viagem', icon: '✈️' },
    { id: 'other', label: 'Outro', icon: '📋' },
  ] as const

  const addParticipant = () => {
    if (!newParticipantName.trim()) return

    const p: Participant = {
      id: Date.now().toString(),
      name: newParticipantName.trim(),
      email: newParticipantEmail.trim() || undefined,
    }

    setParticipants((prev) => [...prev, p])
    setNewParticipantName('')
    setNewParticipantEmail('')
  }

  const removeParticipant = (id: string) => {
    if (id === '1') return
    setParticipants((prev) => prev.filter((p) => p.id !== id))
  }

  const handleCreateGroup = async () => {
    const name = groupName.trim()
    if (!name || participants.length < 2) {
      alert('Adicione um nome e pelo menos 2 participantes')
      return
    }

    if (isSaving) return
    setIsSaving(true)

    try {
      const {
        data: { session },
        error: sErr,
      } = await supabase.auth.getSession()

      if (sErr) throw new Error(sErr.message)
      if (!session) {
        router.replace('/login')
        return
      }

      const myId = session.user.id

      // 1) cria o grupo
      const { data: group, error: gErr } = await supabase
        .from('groups')
        .insert({
          name,
          category,
          // owner_id: myId, // descomenta se sua tabela NÃO tiver default auth.uid()
        })
        .select('id')
        .single()

      if (gErr) throw new Error(gErr.message)
      if (!group?.id) throw new Error('Grupo criado mas não retornou id.')

      const groupId = group.id as string

      // 2) cria participantes
      const rows = participants.map((p) => {
        const isYou = p.id === '1'
        return {
          group_id: groupId,
          user_id: isYou ? myId : null,
          name: isYou ? (session.user.user_metadata?.name ?? 'Você') : p.name,
          email: isYou ? (session.user.email ?? null) : (p.email ?? null),
        }
      })

      const { error: pErr } = await supabase.from('participants').insert(rows)
      if (pErr) throw new Error(pErr.message)

      router.push(`/group/${groupId}`)
    } catch (err: any) {
      console.error('Erro ao criar grupo:', err)
      alert(err?.message ?? 'Erro ao criar grupo.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/">
            <button type="button" className="text-gray-600 hover:text-gray-800">
              <ArrowLeft className="w-6 h-6" />
            </button>
          </Link>

          <h1 className="text-lg font-semibold text-gray-800">Criar grupo</h1>

          <button
            type="button"
            onClick={handleCreateGroup}
            disabled={isSaving}
            className="text-[#5BC5A7] font-medium hover:text-[#4AB396] disabled:opacity-50"
          >
            {isSaving ? 'Salvando...' : 'Criar'}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="block text-sm font-medium text-gray-700 mb-2">Nome do grupo</label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Ex: Viagem para Praia"
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5BC5A7] focus:border-transparent"
          />
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="block text-sm font-medium text-gray-700 mb-3">Categoria</label>
          <div className="grid grid-cols-4 gap-3">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                  category === cat.id
                    ? 'border-[#5BC5A7] bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-2xl">{cat.icon}</span>
                <span className="text-xs font-medium text-gray-700">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Participantes ({participants.length})
          </label>

          <div className="space-y-2 mb-4">
            {participants.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#5BC5A7] rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {participant.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{participant.name}</p>
                    {participant.email && <p className="text-xs text-gray-500">{participant.email}</p>}
                  </div>
                </div>

                {participant.id !== '1' && (
                  <button
                    type="button"
                    onClick={() => removeParticipant(participant.id)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-2 pt-4 border-t border-gray-200">
            <input
              type="text"
              value={newParticipantName}
              onChange={(e) => setNewParticipantName(e.target.value)}
              placeholder="Nome do participante"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5BC5A7] focus:border-transparent text-sm"
            />
            <input
              type="email"
              value={newParticipantEmail}
              onChange={(e) => setNewParticipantEmail(e.target.value)}
              placeholder="Email (opcional)"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5BC5A7] focus:border-transparent text-sm"
            />

            <button
              type="button"
              onClick={addParticipant}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#5BC5A7] text-white rounded-lg hover:bg-[#4AB396] transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">Adicionar participante</span>
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCreateGroup}
          disabled={isSaving}
          className="w-full py-4 bg-[#5BC5A7] text-white rounded-xl font-medium hover:bg-[#4AB396] transition-colors shadow-sm disabled:opacity-50"
        >
          {isSaving ? 'Salvando...' : 'Criar grupo'}
        </button>
      </main>
    </div>
  )
}
