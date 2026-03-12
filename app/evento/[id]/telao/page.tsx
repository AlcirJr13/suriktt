'use client'

import { supabase } from "@/lib/supabase"
import { Evento, Post } from "@/lib/types"
import Image from 'next/image'
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"

export default function LiveWAllPage() {
  const params = useParams()
  const eventId = params.id as string // ← pega o ID da URL

  const [posts, setPosts] = useState<Post[]>([])
  const [evento, setEvento] = useState<Evento | null>(null)
  const [novoPost, setNovoPost] = useState<string | null>(null)

  async function carregarDados() {
    //carregar evento
    const { data: eventoData, error: eventoError } = await supabase
      .from('eventos')
      .select('*')
      .eq('id', eventId)
      .single()
    if (eventoError) {
      console.error('Erro ao carregar evento:', eventoError)
      return
    }

    //carregar posts
    const { data: postsData, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .eq('evento_id', eventId)
      .order('created_at', { ascending: false }) // Ordem dos posts, do mais recente para o mais antigo - true seria do mais antigo para o mais recente
      .limit(50) // Limite de posts para evitar sobrecarregar a tela
    if (postsError) {
      console.error('Erro ao carregar posts:', postsError)
      return
    }
  }

  //carregar dados iniciais do evento e posts
  useEffect(() => {
    carregarDados()
  }, [eventId])

  // REALTIME - Ver novos posts
  useEffect(() => {
    const channel = supabase
      .channel(`post-${eventId}`) // permite atualizações automaticamente sem precisar atualizar a página
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
          filter: `evento_id=eq.${eventId}`
        },
        (payload) => {
          console.log('🎉 Novo post recebido!', payload.new)
          const novoPost: Post = payload.new as Post
          setNovoPost(novoPost.id) // Atualiza o estado com o ID do novo post
          setPosts((prev) => [novoPost, ...prev]) // Adiciona o novo post no início da lista

          //Remove o destaque após 3 segundos
          setTimeout(() => {
            setNovoPost(null)
          }, 3000)
        }
      ).subscribe()

    return () => {
      supabase.removeChannel(channel) // Limpa a inscrição quando o componente for desmontado
    }
  }, [eventId])

  if (!evento) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-2xl">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-blue-900 p-8">
      {/* Cabeçalho */}
      <header className="text-center mb-8">
        <h1 className="text-5xl font-bold text-white mb-2">
          {evento.name}
        </h1>
        <p className="text-2xl text-pink-200">
          Compartilhe este momento! 📸
        </p>
      </header>

      {/* Grid de Posts */}
      <div className="grid grid-cols-3 gap-4 auto-rows-[300px]">
        {posts.map((post, index) => (
          <div
            key={post.id}
            className={`
              relative rounded-2xl overflow-hidden shadow-2xl
              ${novoPost === post.id ? 'ring-8 ring-yellow-400 scale-105' : ''}
              ${post.type === 'message' ? 'col-span-1' : ''}
              transition-all duration-500
            `}
            style={{
              animation: novoPost === post.id ? 'pulse 0.5s ease-in-out' : 'none'
            }}
          >
            {/* Mensagem */}
            {post.type === 'message' && (
              <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center p-6">
                <p className="text-2xl text-gray-800 text-center font-medium">
                  {post.content}
                </p>
              </div>
            )}

            {/* Imagem */}
            {post.type === 'image' && (
              <div className="relative w-full h-full">
                <Image
                  src={post.content}
                  alt="Foto do evento"
                  fill
                  className="w-full h-full object-cover"
                  unoptimized  // ← Necessário para imagens do Supabase
                />
              </div>
            )}

            {/* Vídeo */}
            {post.type === 'video' && (
              <video
                src={post.content}
                className="w-full h-full object-cover"
                autoPlay
                muted
                loop
                playsInline
              />
            )}

            {/* Timestamp */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
              <p className="text-white text-sm">
                {new Date(post.created_at).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        ))}
      </div>

      {posts.length === 0 && (
        <div className="text-center text-white text-3xl mt-20">
          Seja o primeiro a compartilhar! 🎉
        </div>
      )}

      {/* Animação CSS */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </div>
  )
}