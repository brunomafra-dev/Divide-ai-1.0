'use client'

import { ArrowLeft, Plus, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
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

  // Debug visível (pra gente não depender do console)
  const [debug, setDebug] = useState<string>('')

  const categories = useMemo(
    () =>
      [
        { id: 'apartment', label: 'Apartamento', icon: '🏢' },
        { id: 'house', label: 'Casa', icon: '🏠' },
        { id: 'trip', label: 'Viagem', icon: '✈️' },
        { id: 'other', label: 'Outro', icon: '📋' },
      ] as const,
    []
  )

  const addParticipant = (e?: React.MouseEvent) => {
    e?.preventDefault?.()
    e?.stopPropagation?.()

    if (newParticipantName.trim()) {
      const newParticipant: Participant = {
        id: Date.now().toString(),
        name: newParticipantName.trim(),
        email: newParticipantEmail.trim() || undefined,
      }
      setParticipants((prev) => [...prev, newParticipant])
      setNewParticipantName('')
      setNewParticipantEmail('')
    }
  }

  const removeParticipant = (id: string, e?: React.MouseEvent) => {
    e?.preventDefault?.()
    e?.stopPropagation?.()

    if (id === '1') return
    setParticipants((prev) => prev.filter((p) => p.id !== id))
  }

  const handleCreateGroup = async (e?: any) => {
    // Blindagem total contra submit/refresh
    if (e?.preventDefault) e.preventDefault()
    if (e?.stopPropagation) e.stopPropagation()

    if (isSaving) return

    setDebug('Iniciando...')
    if (!groupName.trim() || participants.length < 2) {
      alert('Adicione um nome e pelo menos 2 participantes')
      setDebug('Validação falhou (nome/participantes)')
      return
    }

    setIsSaving(true)

    try {
      setDebug('Checando sessão...')
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession()
      if (sessionErr) {
        console.error(sessionErr)
        setDebug(`Erro getSession: ${sessionErr.message}`)
        alert('Erro ao verificar login.')
        return
      }

      const user = sessionData.session?.user
      if (!user) {
        setDebug('Sem usuário logado -> indo /login')
        // hard redirect (pra evitar qualquer bug de router/middleware)
        window.location.assign('/login')
        return
      }

      setDebug('Criando grupo no Supabase...')
      const { data: createdGroup, error: groupErr } = await supabase
        .from('groups')
        .insert({
          name: groupName.trim(),
          category,
          owner_id: user.id,
        })
        .select('id')
        .single()

      if (groupErr) {
        console.error(groupErr)
        setDebug(`Erro insert groups: ${groupErr.message}`)
        alert(`Erro ao criar grupo: ${groupErr.message}`)
        return
      }

      const groupId = createdGroup.id as string

      setDebug('Criando participantes...')
      const ownerParticipant = {
        group_id: groupId,
        user_id: user.id,
        name: (participants[0]?.name || 'Você').trim(),
        email: user.email || null,
      }

      const otherParticipants = participants
        .filter((p) => p.id !== '1')
        .map((p) => ({
          group_id: groupId,
          user_id: null,
          name: p.name.trim(),
          email: p.email?.trim() || null,
        }))
        .filter((p) => p.name.length > 0)

      const payload = [ownerParticipant, ...otherParticipants]

      const { error: partErr } = await supabase.from('participants').insert(payload)

      if (partErr) {
        console.error(partErr)
        setDebug(`Erro insert participants: ${partErr.message} -> rollback group`)
        await supabase.from('groups').delete().eq('id', groupId)
        alert(`Grupo criado, mas falhou ao salvar participantes: ${partErr.message}`)
        return
      }

      setDebug(`OK! Indo pro grupo: ${groupId}`)
      // hard navigation (sem depender do router)
      window.location.assign(`/group/${groupId}`)
    } catch (err: any) {
      console.error(err)
      setDebug(`Erro inesperado: ${err?.message || 'sem mensagem'}`)
      alert(err?.message || 'Erro inesperado ao criar grupo.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      {/* Header */}
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
            className="text-[#5BC5A7] font-medium hover:text-[#4AB396] disabled:opacity-60"
          >
            {isSaving ? 'Salvando...' : 'Criar'}
          </button>
        </div>
      </header>

      {/* Debug bar */}
      <div className="max-w-4xl mx-auto px-4 pt-3">
        <div className="text-xs text-gray-600 bg-white rounded-lg p-2 shadow-sm">
          <b>Debug:</b> {debug || '—'}
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Nome do Grupo */}
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

        {/* Categoria */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="block text-sm font-medium text-gray-700 mb-3">Categoria</label>
          <div className="grid grid-cols-4 gap-3">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setCategory(cat.id)
                }}
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

        {/* Participantes */}
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
                    {participant.email && (
                      <p className="text-xs text-gray-500">{participant.email}</p>
                    )}
                  </div>
                </div>

                {participant.id !== '1' && (
                  <button
                    type="button"
                    onClick={(e) => removeParticipant(participant.id, e)}
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
          className="w-full py-4 bg-[#5BC5A7] text-white rounded-xl font-medium hover:bg-[#4AB396] transition-colors shadow-sm disabled:opacity-60"
        >
          {isSaving ? 'Salvando...' : 'Criar grupo'}
        </button>
      </main>
    </div>
  )
}
