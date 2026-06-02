import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { pdfjs } from 'react-pdf'
import { toast } from 'sonner'
import { FileText, UploadCloud, Trash2, Loader2 } from 'lucide-react'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

/**
 * 강연자료(PDF) 다중 업로드/관리
 * - storage(session-assets)에 PDF 업로드
 * - pdf.js로 총 페이지 수 추출
 * - lecture_files 메타는 sp_partner_lecture_s 로 저장
 */
export default function LectureManager({ sessionId }) {
  const [lectures, setLectures] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef(null)

  const load = useCallback(async () => {
    if (!sessionId) return
    const { data } = await supabase.rpc('sp_partner_lectures_q', { p_session_id: sessionId })
    setLectures(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [sessionId])

  useEffect(() => {
    load()
  }, [load])

  const handleFiles = async (files) => {
    const list = Array.from(files || []).filter((f) => f.type === 'application/pdf')
    if (list.length === 0) {
      toast.error('PDF 파일만 업로드할 수 있습니다')
      return
    }
    setUploading(true)
    try {
      for (let i = 0; i < list.length; i++) {
        const file = list[i]
        // 페이지 수 추출
        let pageCount = 0
        try {
          const buf = await file.arrayBuffer()
          const doc = await pdfjs.getDocument({ data: buf }).promise
          pageCount = doc.numPages
        } catch (e) {
          console.error('PDF parse error:', e)
        }

        const filePath = `${sessionId}/lectures/${Date.now()}_${i}.pdf`
        const { error: upErr } = await supabase.storage
          .from('session-assets')
          .upload(filePath, file, { upsert: true, contentType: 'application/pdf' })
        if (upErr) throw upErr
        const { data: urlData } = supabase.storage.from('session-assets').getPublicUrl(filePath)

        const { data, error } = await supabase.rpc('sp_partner_lecture_s', {
          p_action: 'create',
          p_session_id: sessionId,
          p_title: file.name.replace(/\.pdf$/i, ''),
          p_file_url: urlData.publicUrl,
          p_file_path: filePath,
          p_page_count: pageCount,
          p_file_size: file.size,
          p_display_order: lectures.length + i,
        })
        if (error || !data?.success) throw new Error('저장 실패')
      }
      toast.success('강연자료를 업로드했습니다')
      load()
    } catch (err) {
      console.error('Lecture upload error:', err)
      toast.error('업로드 실패')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleDelete = async (lecture) => {
    if (!confirm(`'${lecture.title}' 자료를 삭제할까요?`)) return
    try {
      if (lecture.file_path) {
        await supabase.storage.from('session-assets').remove([lecture.file_path])
      }
      const { error } = await supabase.rpc('sp_partner_lecture_s', {
        p_action: 'delete',
        p_session_id: sessionId,
        p_lecture_id: lecture.id,
      })
      if (error) throw error
      toast.success('삭제했습니다')
      load()
    } catch (err) {
      console.error('Lecture delete error:', err)
      toast.error('삭제 실패')
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-sm">강연 자료 (PDF)</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            여러 파일을 올려두면 라이브에서 골라 송출하고 페이지를 넘길 수 있습니다.
          </p>
        </div>
        <span className="text-xs text-slate-400">{lectures.length}개</span>
      </div>

      {/* 업로드 영역 */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center hover:border-indigo-400 transition mb-4 disabled:opacity-60"
      >
        {uploading ? (
          <Loader2 className="w-7 h-7 text-indigo-600 mx-auto animate-spin" />
        ) : (
          <UploadCloud className="w-7 h-7 text-indigo-600 mx-auto mb-2" />
        )}
        <div className="font-semibold text-sm">{uploading ? '업로드 중...' : 'PDF 파일 업로드 (여러 개 선택 가능)'}</div>
        <div className="text-xs text-slate-400 mt-1">클릭해서 선택</div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* 목록 */}
      {loading ? (
        <div className="text-center py-6 text-slate-400 text-sm">불러오는 중...</div>
      ) : lectures.length === 0 ? (
        <div className="text-center py-6 text-slate-400 text-sm">아직 업로드한 자료가 없습니다</div>
      ) : (
        <div className="space-y-2.5">
          {lectures.map((l) => (
            <div
              key={l.id}
              className="flex items-center gap-4 rounded-xl border border-slate-200 dark:border-slate-800 p-3"
            >
              <div className="w-12 h-12 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-indigo-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{l.title}</div>
                <div className="text-xs text-slate-400 mt-0.5">{l.page_count || '?'} 페이지</div>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(l)}
                className="text-slate-400 hover:text-rose-600 p-2"
                title="삭제"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
