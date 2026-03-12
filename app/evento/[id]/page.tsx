'use client'  // ← Isso é importante! Significa que este componente roda no navegador

import { supabase } from "@/lib/supabase"
import { Evento, Post } from "@/lib/types"
import Image from "next/image"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"

function sanitizeFileName(fileName: string): string {
  return fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .toLowerCase()
}

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export default function EventoPage() {
  const params = useParams()
  const eventId = params.id as string // ← pega o ID da URL

  //Estados (dados que mudam na tela)
  const [evento, setEvento] = useState<Evento | null>(null) // ← aqui vamos guardar os dados do evento
  const [post, setpost] = useState<Post[]>([]) // ← aqui vamos guardar os post relacionados ao evento
  const [tipo, setTipo] = useState<'message' | 'image' | 'video'>('message') // ← tipo do post que o usuário quer criar
  const [conteudo, setConteudo] = useState('') // ← conteúdo do post que o usuário quer criar
  const [arquivo, setArquivo] = useState<File | null>(null) // ← arquivo para post de imagem ou vídeo
  const [carregando, setCarregando] = useState(false) // ← para mostrar um loading enquanto os dados estão sendo buscados

  // Carregar dados do evento e post quando a página abrir
  useEffect(() => {
    carregarDados()
  }, [eventId]) // ← diz qual evento carregar quando o ID mudar

  async function carregarDados() {
    //1. Buscar dados do evento
    const { data: eventoData, error: eventoError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single() // ← queremos só um evento, não uma lista

    if (eventoData) {
      setEvento(eventoData) // ← guarda os dados do evento no estado
    }
    //2. Buscar post relacionados ao evento
    const { data: postData, error: postError } = await supabase
      .from('post')
      .select('*')
      .eq('event_id', eventId) // ← só queremos post desse evento
      .order('created_at', { ascending: false }) // ← os mais recentes primeiro

    if (postData) {
      setpost(postData || []) // ← guarda os post no estado
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault() // ← evita que a página recarregue ao enviar o formulário
    setCarregando(true) // ← mostra o loading

    try {
      let mediaUrl = ''

      //3. Se for imagem ou vídeo, fazer upload para o Supabase Storage
      if (arquivo && (tipo === 'image' || tipo === 'video')) {
        const nomeOriginal = arquivo.name // ← nome original do arquivo
        const nomeSanitizado = sanitizeFileName(nomeOriginal) // ← nome sanitizado para evitar problemas
        const nomeArquivo = `${Date.now()}_${nomeSanitizado}` // ← nome único para evitar sobrescrever arquivos

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('event-media')
          .upload(`${eventId}/${nomeArquivo}`, arquivo)

        if (uploadError) throw uploadError // ← se der erro no upload, para tudo

        // Pegar URL pública do arquivo
        const { data: urlData } = supabase.storage
          .from('event-media')
          .getPublicUrl(`${eventId}/${nomeArquivo}`)

        mediaUrl = urlData.publicUrl
      }

      //4. Salvar post no banco de dados
      const { error: insertError } = await supabase
        .from('post')
        .insert({
          event_id: eventId,
          type: tipo,
          content: tipo === 'message' ? conteudo : mediaUrl, // ← se for mensagem, salva o texto; se for imagem/vídeo, salva a URL
        })

      if (insertError) throw insertError // ← se der erro ao salvar o post, para tudo

      //5. Limpar formulário e recarregar post
      setConteudo('')
      setArquivo(null)
      setTipo('message')
      await carregarDados() // ← recarrega os dados para mostrar o novo post

      alert('Enviado com sucesso! 🎉')
    } catch (error) {
      console.error('=== ERRO DETALHADO ===')
      console.error(error)
      console.error('=====================')

      let errorMessage = 'Erro desconhecido'

      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'object' && error !== null) {
        // Erro do Supabase
        const supabaseError = error as { message?: string; details?: string }
        errorMessage = supabaseError.message ||
          supabaseError.details ||
          JSON.stringify(error)
      } else if (typeof error === 'string') {
        errorMessage = error
      }

      alert('Ops, algo deu errado:\n\n' + errorMessage)
    } finally {
      setCarregando(false) // ← esconde o loading
    }
  }

  //Se ainda não carregou o evento
  if (!evento) {
    return <div className="flex items-center justify-center min-h-screen">Carregando evento...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 p-4">
      {/*cabeçalho do evento*/}
      <header className="max-w-2xl mx-auto text-center mb-8 pt-8">
        <h1 className="text-4xl font-bold text-purple-800 mb-2">
          {evento.name}
        </h1>
        <p className="text-purple-600">
          {new Date(evento.event_date).toLocaleDateString('pt-BR')}
        </p>
      </header>

      {/*formulário para criar post*/}
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-6 mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4 text-center">
          Compartilhe este momento! 📸
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Seleção de Tipo */}
          <div className="flex gap-2 justify-center">
            <button
              type="button"
              onClick={() => setTipo('message')}
              className={`px-4 py-2 rounded-lg font-medium transition ${tipo === 'message'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-700'
                }`}
            >
              💬 Mensagem
            </button>
            <button
              type="button"
              onClick={() => setTipo('image')}
              className={`px-4 py-2 rounded-lg font-medium transition ${tipo === 'image'

                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-700'
                }`}
            >
              📸 Foto
            </button>
            <button
              type="button"
              onClick={() => setTipo('video')}
              className={`px-4 py-2 rounded-lg font-medium transition ${tipo === 'video'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-700'
                }`}
            >
              🎥 Vídeo
            </button>
          </div>
          {/*Campo de mensagem */}
          {tipo === 'message' && (
            <textarea
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              placeholder="Deixe sua mensagem..."
              className="w-full p-3 border border-gray-300 rounded-lg
                text-gray-800 placeholder-gray-400
                focus:ring-2 focus:ring-purple-500 focus:border-transparent
                bg-white"
              rows={4}
              required
            />
          )}

          {/*Campos de upload para imagem ou vídeo */}
          {(tipo === 'image' || tipo === 'video') && (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                accept={tipo === 'image' ? 'image/*' : 'video/*'}
                onChange={(e) => {
                  const file = e.target.files?.[0] || null
                  if (file && file.size > MAX_FILE_SIZE) {
                    alert('Arquivo muito grande! O tamanho máximo é 50MB.')
                    e.target.value = ""// Limpa o input
                    return
                  }
                  setArquivo(file)
                }}
                className="hidden"
                id="arquivo-input"
                required
              />
              <label htmlFor="arquivo-input" // é um atributo do React que conecta o <label> ao <input> com o mesmo id. É uma forma acessível e estilizável de criar um botão de upload customizado
                className="cursor-pointer clock" // muda o cursor do mouse para uma mãozinha (👆), indicando que o elemento é clicável.
              >
                <span className="text-4xl mb-2 block">
                  {tipo === 'image' ? '📸' : '🎥'}
                </span>
                <span className="text-purple-600 font-medium">
                  {arquivo ? arquivo.name : `Clique para selecionar ${tipo === 'image' ? 'uma foto' : 'um vídeo'}`}
                </span>
              </label>
            </div>
          )}

          {/* Botão de Enviar */}
          <button
            type="submit"
            disabled={carregando} // ← desabilita o botão enquanto estiver carregando
            className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition disabled:bg-gray-400"
          >
            {carregando ? 'Enviando...' : 'Enviar 🚀'}
          </button>
        </form>
      </div>

      {/* Galeria de post */}
      <div className="max-w-2xl mx-auto space-y-4 pb-8">
        <h2 className="text-2xl font-semibold text-gray-800 text-center mb-4">
          Momentos Compartilhados ({post.length})
        </h2>

        {post.map((post) => (
          <div key={post.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Mensagem */}
            {post.type === 'message' && (
              <div className="p-4">
                <p className="text-gray-700 text-lg">{post.content}</p>
                <p className="text-gray-400 text-sm mt-2">
                  {new Date(post.created_at).toLocaleString('pt-BR')}
                </p>
              </div>
            )}

            {/* Imagem */}
            {post.type === 'image' && (
              <div className="relative w-full" style={{ paddingBottom: '75%' }}>
                <Image
                  src={post.content}
                  alt="Foto do evento"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            )}

            {/* Vídeo */}
            {post.type === 'video' && (
              <video
                src={post.content}
                controls
                className="w-full h-auto"
              />
            )}
          </div>
        ))}

        {post.length === 0 && (
          <p className="text-center text-gray-500 py-8">
            Seja o primeiro a compartilhar! 🎉
          </p>
        )}
      </div>
    </div>
  )
}