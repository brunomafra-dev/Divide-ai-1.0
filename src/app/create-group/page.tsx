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

  // "Você" sempre existe
  const [participants, setParticipants] = useState<Participant[]>([
    { id: '1', name: 'Você', email: 'voce@email.com' },
  ])

  const [newParticipantName, setNewParticipantName] = useState('')
  const [newParticipantEmail, setNewParticipantEmail] = useState('')

  const [saving, setSaving] = useState(false)

  const categories = useMemo(
    () => [
      { id: 'apartment', label: 'Apartamento', icon: '🏢' },
      { id: 'house', label: 'Casa', icon: '🏠' },
      { id: 'trip', label: 'Viagem', icon: '✈️' },
      { id: 'other', label: 'Outro', icon: '📋' },
    ],
    []
  )

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
    if (saving) return

    const name = groupName.trim()
    if (!name || participants.length < 2) {
      alert('Adicione um nome e pelo menos 2 participantes')
      return
    }

    setSaving(true)

    try {
      // 1) sessão
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

      // 2) monta participants jsonb (pro UI e pra não depender de user_id dos convidados)
      const participantsJson = participants.map((p) => ({
        // "Você" vira o id real do auth
        id: p.id === '1' ? myId : p.id,
        name: p.id === '1' ? (session.user.user_metadata?.name ?? 'Você') : p.name,
        email: p.id === '1' ? session.user.email : p.email,
      }))

      // 3) cria grupo (retorna id)
      const { data: insertedGroup, error: gErr } = await supabase
        .from('groups')
        .insert({
          owner_id: myId,
          name,
          category,
          participants: participantsJson, // <-- jsonb no groups
        })
        .select('id')
        .single()

      if (gErr) throw new Error(gErr.message)
      if (!insertedGroup?.id) throw new Error('Grupo criado mas não retornou ID.')

      const groupId = insertedGroup.id as string

      // 4) garante o owner na tabela participants (user_id NOT NULL)
      // (não tenta inserir convidados com user_id nulo pra não quebrar)
      const { error: pErr } = await supabase.from('participants').insert({
        group_id: groupId,
        user_id: myId,
        name: participantsJson[0]?.name ?? 'Você',
        email: session.user.email ?? null,
      })

      if (pErr) {
        // Se isso falhar, melhor avisar pq afeta RLS de leitura/edição
        throw new Error(`Grupo criado, mas falhou ao salvar participante dono: ${pErr.message}`)
      }

      // 5) redireciona pro grupo
      router.push(`/group/${groupId}`)
      router.refresh()
    } catch (err: any) {
      console.error('Erro ao criar grupo:', err)
      alert(err?.message ?? 'Erro ao criar grupo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" aria-label="Voltar">
            <button type="button" className="text-gray-600 hover:text-gray-800">
              <ArrowLeft className="w-6 h-6" />
            </button>
          </Link>

          <h1 className="text-lg font-semibold text-gray-800">Criar grupo</h1>

          <button
            type="button"
            onClick={handleCreateGroup}
            disabled={saving}
            className="text-[#5BC5A7] font-medium hover:text-[#4AB396] disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Criar'}
          </button>
        </div>
      </header>

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
                onClick={() => setCategory(cat.id as Category)}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                  category === cat.id ? 'border-[#5BC5A7] bg-green-50' : 'border-gray-200 hover:border-gray-300'
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

          {/* Lista */}
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

          {/* Adicionar */}
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
          disabled={saving}
          className="w-full py-4 bg-[#5BC5A7] text-white rounded-xl font-medium hover:bg-[#4AB396] transition-colors shadow-sm disabled:opacity-50"
        >
          {saving ? 'Salvando...' : 'Criar grupo'}
        </button>
      </main>
    </div>
  )
}
