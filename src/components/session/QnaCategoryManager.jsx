import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Plus, Trash2, Tag } from 'lucide-react'

const PRESET_COLORS = ['#4f46e5', '#059669', '#d97706', '#dc2626', '#0891b2', '#7c3aed', '#db2777']

/**
 * Q&A 카테고리 관리
 * - 카테고리 추가/수정(이름·색상)/삭제
 * - 기본 노출 토글(is_visible)
 */
export default function QnaCategoryManager({ sessionId }) {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(PRESET_COLORS[0])

  const load = useCallback(async () => {
    if (!sessionId) return
    const { data } = await supabase.rpc('sp_partner_qna_categories_q', { p_session_id: sessionId })
    setCategories(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [sessionId])

  useEffect(() => {
    load()
  }, [load])

  const addCategory = async () => {
    const name = newName.trim()
    if (!name) return
    const { data, error } = await supabase.rpc('sp_partner_qna_category_s', {
      p_action: 'create',
      p_session_id: sessionId,
      p_name: name,
      p_color: newColor,
      p_display_order: categories.length,
    })
    if (error || !data?.success) {
      toast.error('추가 실패')
      return
    }
    setNewName('')
    load()
  }

  const updateCategory = async (cat, patch) => {
    setCategories((prev) => prev.map((c) => (c.id === cat.id ? { ...c, ...patch } : c)))
    const { error } = await supabase.rpc('sp_partner_qna_category_s', {
      p_action: 'update',
      p_session_id: sessionId,
      p_category_id: cat.id,
      p_name: patch.name ?? cat.name,
      p_color: patch.color ?? cat.color,
      p_is_visible: patch.is_visible ?? cat.is_visible,
    })
    if (error) toast.error('수정 실패')
  }

  const deleteCategory = async (cat) => {
    if (!confirm(`'${cat.name}' 카테고리를 삭제할까요? 질문은 미분류로 남습니다.`)) return
    const { error } = await supabase.rpc('sp_partner_qna_category_s', {
      p_action: 'delete',
      p_session_id: sessionId,
      p_category_id: cat.id,
    })
    if (error) {
      toast.error('삭제 실패')
      return
    }
    load()
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-sm flex items-center gap-1.5">
            <Tag className="w-4 h-4 text-indigo-600" /> Q&amp;A 카테고리
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            질문에 카테고리를 달면 청중이 종류별로 필터하고, 좌장이 노출을 제어합니다.
          </p>
        </div>
        <span className="text-xs text-slate-400">{categories.length}개</span>
      </div>

      {/* 추가 */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex gap-1">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setNewColor(c)}
              className={`w-6 h-6 rounded-full border-2 ${newColor === c ? 'border-slate-800 dark:border-white' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
              aria-label={c}
            />
          ))}
        </div>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addCategory()}
          placeholder="카테고리 이름"
          className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent"
        />
        <button
          type="button"
          onClick={addCategory}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-3 py-2 rounded-lg flex items-center gap-1"
        >
          <Plus className="w-4 h-4" /> 추가
        </button>
      </div>

      {/* 목록 */}
      {loading ? (
        <div className="text-center py-6 text-slate-400 text-sm">불러오는 중...</div>
      ) : categories.length === 0 ? (
        <div className="text-center py-6 text-slate-400 text-sm">카테고리를 추가하세요</div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center gap-3 py-3">
              <input
                type="color"
                value={c.color || '#4f46e5'}
                onChange={(e) => updateCategory(c, { color: e.target.value })}
                className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent shrink-0"
                title="색상"
              />
              <input
                value={c.name}
                onChange={(e) => setCategories((prev) => prev.map((x) => (x.id === c.id ? { ...x, name: e.target.value } : x)))}
                onBlur={(e) => updateCategory(c, { name: e.target.value.trim() || c.name })}
                className="font-semibold text-sm bg-transparent flex-1 focus:outline-none"
              />
              <span className="text-xs text-slate-400">질문 {c.question_count || 0}</span>
              <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer select-none">
                기본 노출
                <input
                  type="checkbox"
                  checked={!!c.is_visible}
                  onChange={(e) => updateCategory(c, { is_visible: e.target.checked })}
                  className="w-4 h-4 accent-indigo-600"
                />
              </label>
              <button
                type="button"
                onClick={() => deleteCategory(c)}
                className="text-slate-400 hover:text-rose-600 p-1"
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
