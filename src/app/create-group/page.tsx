'use client'

import { ArrowLeft, Plus, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Category = 'apartment' | 'house' | 'trip' | 'other'

interface ParticipantUI {
  id: string
  name: string
  email?: string
  // flag apenas pra UI
  isYou?: boolean
}

export default function CreateGroup() {
  const router = useRouter()

  const [isLoading, setIsLoading] = useState(false)

  const [groupName, setGroupName] = useState('')
  const [category, setCategory] = useState<Category>('other')

  const [userId, setUserId] = useState<string | null>(null)
  const [youName, setYouName] = useState<string>('Você')
  const [youEmail, setYouEmail] = useState<string | undefined>(undefined)

  const [participants, setParticipants] = useState<ParticipantUI[]>([
    { id: 'you', name: 'Você', email: undefined, isYou: true },
  ])

  const [newParticipantName, setNewParticipantName] = useState('')
  const [newParticipantEmail, setNewParticipantEmail] = useState('')

  const categories = useMemo(
    () => [
      { id: 'apartment', label: 'Apartamento', icon: '🏢' },
      { id: 'house', label: 'Casa', icon: '🏠' },
      { id: 'trip', label: 'Viagem', icon: '✈️' },
      { id: 'other', label: 'Outro', icon: '📋' },
    ],
    []
  )

  // Carrega usuário logado e substitui o "Você" da lista
  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error) {
        console.error('Erro ao pegar usuário:', error)
      }

      if (!user) {
        // se seu login for outra rota, troca aqui
        router.push('/login')
        return
      }

      setUserId(user.id)

      const metaName =
        (user.user_metadata?.full_name as string | undefined) ||
        (user.user_metadata?.name as string | undefined) ||
        'Você'

      setYouName(metaName)
      setYouEmail(user.email ?? undefined)

      setParticipants([
        { id: 'you', name: metaName, email: user.email ?? undefined, isYou: true },
      ])
    }

    loadUser()
  }, [router])

  const addParticipant = () => {
    const name = newParticipantName.trim()
    const email = newParticipantEmail.trim()

    if (!name) return

    const newP: ParticipantUI = {
      id: crypto.randomUUID(),
      name,
      email: email || undefined,
    }

    setParticipants((prev) => [...prev, newP])
    setNewParticipantName('')
    setNewParticipantEmail('')
  }

  const removeParticipant = (id: string) => {
    if (id === 'you') return
    setParticipants((prev) => prev.filter((p) => p.id !== id))
  }

  const handleCreateGroup = async () => {
    if (!userId) {
      alert('Você precisa estar logado.')
      router.push('/login')
      return
    }

    const name = groupName.trim()
    if (!name || participants.length < 2) {
      alert('Adicione um nome e pelo menos 2 participantes')
      return
    }

    setIsLoading(true)
    try {
      // 1) cria grupo com owner_id
      const { data: createdGroup, error: groupError } = await supabase
        .from('groups')
        .insert({
          name,
          category,
          owner_id: userId,
        })
        .select('id')
        .single()

      if (groupError) {
        console.error('Erro ao criar grupo:', groupError)
        alert(`Erro ao criar grupo: ${groupError.message}`)
        return
      }

      const groupId = createdGroup.id as string

      // 2) cria participants
      // você entra com user_id = auth user
      const rows = participants.map((p) => {
        if (p.id === 'you') {
          return {
            group_id: groupId,
            user_id: userId,
            name: p.name || youName,
            email: p.email || youEmail || null,
          }
        }

        // convidados por email/nome (sem user_id ainda)
        return {
          group_id: groupId,
          user_id: null, // IMPORTANT: precisa user_id aceitar NULL no banco
          name: p.name,
          email: p.email || null,
        }
      })

      const { error: participantsError } = await supabase.from('participants').insert(rows)

      if (participantsError) {
        console.error('Grupo criado mas falhou participants:', participantsError)
        alert(`Grupo criado, mas falhou ao salvar participantes: ${participantsError.message}`)
        // mesmo assim, manda pro grupo (você decide)
        router.push(`/group/${groupId}`)
        return
      }

      // 3) navega pro grupo
      router.push(`/group/${groupId}`)
    } catch (err: any) {
      console.error('Erro inesperado:', err)
      alert(`Erro inesperado: ${err?.message ?? 'desconhecido'}`)
    } finally {
      setIsLoading(false)
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
            disabled={isLoading}
            className="text-[#5BC5A7] font-medium hover:text-[#4AB396] disabled:opacity-60"
          >
            {isLoading ? 'Salvando...' : 'Criar'}
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

          {/* Lista de Participantes */}
          <div className="space-y-2 mb-4">
            {participants.map((participant) => (
              <div key={participant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
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

                {participant.id !== 'you' && (
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
          disabled={isLoading}
          className="w-full py-4 bg-[#5BC5A7] text-white rounded-xl font-medium hover:bg-[#4AB396] transition-colors shadow-sm disabled:opacity-60"
        >
          {isLoading ? 'Salvando...' : 'Criar grupo'}
        </button>
      </main>
    </div>
  )
}
