@@
 'use client'
 
 import { ArrowLeft, Plus, X } from 'lucide-react'
 import Link from 'next/link'
 import { useRouter } from 'next/navigation'
 import { useState } from 'react'
+import { supabase } from '@/lib/supabase'
 
 interface Participant {
   id: string
   name: string
   email?: string
 }
 
 export default function CreateGroup() {
   const router = useRouter()
   const [groupName, setGroupName] = useState('')
   const [category, setCategory] = useState<'apartment' | 'house' | 'trip' | 'other'>('other')
   const [participants, setParticipants] = useState<Participant[]>([
     { id: '1', name: 'Você', email: 'voce@email.com' }
   ])
   const [newParticipantName, setNewParticipantName] = useState('')
   const [newParticipantEmail, setNewParticipantEmail] = useState('')
+  const [isSaving, setIsSaving] = useState(false)
 
   const categories = [
     { id: 'apartment', label: 'Apartamento', icon: '🏢' },
     { id: 'house', label: 'Casa', icon: '🏠' },
     { id: 'trip', label: 'Viagem', icon: '✈️' },
     { id: 'other', label: 'Outro', icon: '📋' },
   ]
@@
   const removeParticipant = (id: string) => {
     if (id === '1') return // Não pode remover "Você"
     setParticipants(participants.filter(p => p.id !== id))
   }
 
-  const handleCreateGroup = () => {
-    if (!groupName.trim() || participants.length < 2) {
-      alert('Adicione um nome e pelo menos 2 participantes')
-      return
-    }
-
-    // Salvar grupo no localStorage
-    const savedGroups = localStorage.getItem('divideai_groups')
-    const groups = savedGroups ? JSON.parse(savedGroups) : []
-    
-    const newGroup = {
-      id: Date.now().toString(),
-      name: groupName,
-      category,
-      totalSpent: 0,
-      balance: 0,
-      participants: participants.length,
-      participantsList: participants,
-      transactions: [],
-    }
-
-    groups.push(newGroup)
-    localStorage.setItem('divideai_groups', JSON.stringify(groups))
-    localStorage.setItem(`divideai_group_${newGroup.id}`, JSON.stringify(newGroup))
-
-    router.push(`/group/${newGroup.id}`)
-  }
+  const handleCreateGroup = async () => {
+    const name = groupName.trim()
+    if (!name || participants.length < 2) {
+      alert('Adicione um nome e pelo menos 2 participantes')
+      return
+    }
+
+    if (isSaving) return
+    setIsSaving(true)
+
+    try {
+      // 1) Sessão
+      const { data: { session }, error: sErr } = await supabase.auth.getSession()
+      if (sErr) throw new Error(sErr.message)
+      if (!session) {
+        router.replace('/login')
+        return
+      }
+
+      const myId = session.user.id
+
+      // 2) Cria grupo no banco
+      // OBS: se sua tabela tiver owner_id default auth.uid(), não precisa mandar owner_id
+      const { data: group, error: gErr } = await supabase
+        .from('groups')
+        .insert({
+          name,
+          category,
+          // owner_id: myId, // <- descomenta se seu schema NÃO tiver default no owner_id
+        })
+        .select('id')
+        .single()
+
+      if (gErr) throw new Error(gErr.message)
+      if (!group?.id) throw new Error('Grupo criado mas não retornou id.')
+
+      const groupId = group.id as string
+
+      // 3) Cria participantes
+      // Dono: user_id = myId (obrigatório)
+      // Convidados: user_id = null (se seu schema permitir)
+      const rows = participants.map((p) => {
+        const isYou = p.id === '1'
+        return {
+          group_id: groupId,
+          user_id: isYou ? myId : null,
+          name: isYou ? (session.user.user_metadata?.name ?? 'Você') : p.name,
+          email: isYou ? (session.user.email ?? null) : (p.email ?? null),
+        }
+      })
+
+      const { error: pErr } = await supabase.from('participants').insert(rows)
+      if (pErr) throw new Error(pErr.message)
+
+      // 4) Vai pro grupo
+      router.push(`/group/${groupId}`)
+    } catch (err: any) {
+      console.error('Erro ao criar grupo:', err)
+      alert(err?.message ?? 'Erro ao criar grupo.')
+    } finally {
+      setIsSaving(false)
+    }
+  }
@@
           <button
             onClick={handleCreateGroup}
-            className="text-[#5BC5A7] font-medium hover:text-[#4AB396]"
+            className="text-[#5BC5A7] font-medium hover:text-[#4AB396] disabled:opacity-50"
+            disabled={isSaving}
+            type="button"
           >
-            Criar
+            {isSaving ? 'Salvando...' : 'Criar'}
           </button>
         </div>
       </header>
@@
               <button
                 key={cat.id}
                 onClick={() => setCategory(cat.id as any)}
                 className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                   category === cat.id
                     ? 'border-[#5BC5A7] bg-green-50'
                     : 'border-gray-200 hover:border-gray-300'
                 }`}
+                type="button"
               >
                 <span className="text-2xl">{cat.icon}</span>
                 <span className="text-xs font-medium text-gray-700">{cat.label}</span>
               </button>
             ))}
           </div>
         </div>
@@
                   <button
                     onClick={() => removeParticipant(participant.id)}
                     className="text-gray-400 hover:text-red-500"
+                    type="button"
                   >
                     <X className="w-5 h-5" />
                   </button>
                 )}
               </div>
             ))}
@@
             <button
               onClick={addParticipant}
               className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#5BC5A7] text-white rounded-lg hover:bg-[#4AB396] transition-colors"
+              type="button"
             >
               <Plus className="w-4 h-4" />
               <span className="text-sm font-medium">Adicionar participante</span>
             </button>
           </div>
         </div>
 
         {/* Botão Criar */}
         <button
           onClick={handleCreateGroup}
-          className="w-full py-4 bg-[#5BC5A7] text-white rounded-xl font-medium hover:bg-[#4AB396] transition-colors shadow-sm"
+          className="w-full py-4 bg-[#5BC5A7] text-white rounded-xl font-medium hover:bg-[#4AB396] transition-colors shadow-sm disabled:opacity-50"
+          disabled={isSaving}
+          type="button"
         >
-          Criar grupo
+          {isSaving ? 'Salvando...' : 'Criar grupo'}
         </button>
       </main>
     </div>
   )
 }
