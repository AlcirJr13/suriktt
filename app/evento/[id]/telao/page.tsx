'use client'

import { supabase } from "@/lib/supabase"
import { Evento, Post } from "@/lib/types"
import Image from 'next/image'
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"

export default function LiveWallPage() {
  const params = useParams()
  const eventId = params.id as string

  // Estados
  const [posts, setPosts] = useState<Post[]>([])
  const [evento, setEvento] = useState<Evento | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Função para carregar dados


  //  Carregar dados iniciais
  useEffect(() => {
    async function carregarDados() {
      console.log('🔍 Buscando evento ID:', eventId)

      try {
        // Carregar evento
        const { data: eventoData, error: eventoError } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventId)
          .single()

        console.log('📦 Resposta do evento:', eventoData)
        console.log('❌ Erro do evento:', eventoError)

        if (eventoError) {
          console.error('Erro ao carregar evento:', eventoError)
          return
        }

        if (eventoData) {
          console.log('✅ Evento encontrado:', eventoData.name)
          setEvento(eventoData)
        } else {
          console.error('⚠️ Evento NÃO encontrado!')
        }

        // Carregar posts
        const { data: postsData, error: postsError } = await supabase
          .from('post')
          .select('*')
          .eq('event_id', eventId)
          .order('created_at', { ascending: false })

        if (postsError) {
          console.error('Erro ao carregar posts:', postsError)
          return
        }

        if (postsData) {
          setPosts(postsData)
          setCurrentIndex(0)
        }
      } catch (error) {
        console.error('Erro inesperado:', error)
      }
    }

    carregarDados()
  }, [eventId])

  //  REALTIME - Ver novos posts
  useEffect(() => {
    const channel = supabase
      .channel(`post-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'post',
          filter: `event_id=eq.${eventId}`
        },
        (payload) => {
          const novoPost = payload.new as Post
          setPosts((prev) => [novoPost, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId])

  //  Slideshow Automático
  useEffect(() => {
    if (posts.length <= 1) return

    // Verifica se o post atual é vídeo
    const currentPost = posts[currentIndex]
    const isVideo = currentPost?.type === 'video'

    const displayTime = isVideo ? 15000 : 6000 // Tempo diferente para vídeos (15s) e outros (6s)

    const interval = setInterval(() => {
      setIsTransitioning(true)

      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % posts.length)
        setIsTransitioning(false)
      }, 500)
    }, displayTime)

    return () => clearInterval(interval)
  }, [currentIndex, posts.length, posts])

  //  Atualizar relógio
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Loading
  if (!evento) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-blue-900 flex items-center justify-center">
        <div className="text-white text-4xl font-bold animate-pulse">
          Carregando...
        </div>
      </div>
    )
  }

  // Sem posts
  if (posts.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-blue-900 flex items-center justify-center">
        <div className="text-white text-4xl font-bold text-center px-8">
          Seja o primeiro a compartilhar! 🎉
        </div>
      </div>
    )
  }

  const currentPost = posts[currentIndex]

  // Render principal
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-blue-900 relative overflow-hidden">
      {/* Cabeçalho Fixo */}
      <header className="absolute top-0 left-0 right-0 z-20 text-center p-8 bg-gradient-to-b from-black/50 to-transparent">
        <h1 className="text-6xl font-bold text-white mb-2"
          style={{
            textShadow: '2px 2px 4px rgba(0,0,0,0.8), -1px -1px 0 #7c3aed, 1px -1px 0 #7c3aed, -1px 1px 0 #7c3aed, 1px 1px 0 #7c3aed',
          }}>
          {evento.name}
        </h1>
        <p className="text-3xl text-white font-semibold"
          style={{
            textShadow: '2px 2px 4px rgba(0,0,0,0.8), -1px -1px 0 #7c3aed, 1px -1px 0 #7c3aed, -1px 1px 0 #7c3aed, 1px 1px 0 #7c3aed',
          }}>
          Compartilhe este momento! 📸
        </p>
      </header>

      {/* Conteúdo Principal */}
      <div className="relative h-screen flex items-center justify-center pt-48">
        {/* Post Atual */}
        <div
          className={`
            absolute inset-0 flex items-center justify-center p-24
            transition-all duration-500 ease-in-out
            ${isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}
          `}
        >
          {/* Mensagem */}
          {currentPost.type === 'message' && (
            <div className="bg-white/95 backdrop-blur-lg rounded-3xl p-16 shadow-2xl max-w-5xl">
              <p className="text-5xl text-gray-800 text-center font-bold leading-tight">
                {currentPost.content}
              </p>
            </div>
          )}

          {/* Imagem */}
          {currentPost.type === 'image' && (
            <div className="relative w-full h-full flex items-center justify-center">
              <Image
                src={currentPost.content}
                alt="Foto do evento"
                fill
                className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
                unoptimized
              />
            </div>
          )}

          {/* Vídeo */}
          {currentPost.type === 'video' && (
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                src={currentPost.content}
                className="max-w-full max-h-full rounded-2xl shadow-2xl"
                autoPlay
                //muted
                //loop
                playsInline
                onEnded={
                  () => {
                    // Avança para o próximo quando o vídeo terminar
                    setIsTransitioning(true)
                    setTimeout(() => {
                      setCurrentIndex((prev) => (prev + 1) % posts.length)
                      setIsTransitioning(false)
                    }, 500)
                  }}
              />
            </div>
          )}
        </div>

        {/* Indicadores de Progresso */}
        <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 z-20 flex gap-3">
          {posts.map((_, index) => (
            <div
              key={index}
              className={`
                h-3 rounded-full transition-all duration-500
                ${index === currentIndex
                  ? 'w-12 bg-white shadow-lg'
                  : 'w-3 bg-white/40'}
              `}
            />
          ))}
        </div>

        {/* Contador */}
        <div className="absolute bottom-12 right-12 text-white/60 text-xl z-20">
          {currentIndex + 1} / {posts.length}
        </div>

        {/* Hora Atual */}
        <div className="absolute bottom-12 left-12 text-white/60 text-xl z-20">
          {currentTime.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>
    </div>
  )
}