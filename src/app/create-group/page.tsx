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
    if (newParticipantName.trim()) {
      const newParticipant: Participant = {
        id: Date.now().toString(),
        name: newParticipantName.trim(),
        email: newParticipantEmail.trim() || undefined,
      }
      setParticipants([...participants, newParticipant])
      setNewParticipantName('')
      setNewParticipantEmail('')
    }
  }

  const removeParticipant = (id: string) => {
    if (id === '1') return // Não pode remover "Você"
    setParticipants(participants.filter((p) => p.id !== id))
  }

  const handleCreateGroup = async () => {
    if (isSaving) return

    if (!groupName.trim() || participants.length < 2) {
      alert('Adicione um nome e pelo menos 2 participantes')
      return
    }

    setIsSaving(true)

    try {
      // 1) Verifica usuário logado
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser()

      if (userErr) {
        console.error('Erro ao obter usuário:', userErr)
        alert('Erro ao verificar login. Tente novamente.')
        return
      }

      if (!user) {
        alert('Você precisa estar logado para criar um grupo.')
        router.push('/login')
        return
      }

      // 2) Cria o grupo
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
        console.error('Erro ao criar grupo:', groupErr)
        alert(`Erro ao criar grupo: ${groupErr.message}`)
        return
      }

      const groupId = createdGroup.id as string

      // 3) Prepara participantes
      // Dono do grupo: user_id preenchido
      const ownerParticipant = {
        group_id: groupId,
        user_id: user.id,
        name: (participants[0]?.name || 'Você').trim(),
        email: user.email || null,
      }

      // Outros: user_id = null
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

      // 4) Insere participantes
      const { error: partErr } = await supabase.from('participants').insert(payload)

      if (partErr) {
        console.error('Erro ao salvar participantes:', partErr)

        // rollback manual: apaga o grupo criado
        await supabase.from('groups').delete().eq('id', groupId)

        alert(`Grupo criado, mas falhou ao salvar participantes: ${partErr.message}`)
        return
      }

      // 5) Navega para o grupo
      router.push(`/group/${groupId}`)
    } catch (e: any) {
      console.error('Erro inesperado:', e)
      alert(e?.message || 'Erro inesperado ao criar grupo.')
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

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Nome do Grupo */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nome do grupo
          </label>
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
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Categoria
          </label>
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

        {/* Participantes */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Participantes ({participants.length})
          </label>

          {/* Lista de Participantes */}
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
                    onClick={() => removeParticipant(participant.id)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Adicionar Participante */}
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

        {/* Botão Criar */}
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
