import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import { toast } from 'sonner'
import { 
  Languages, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  RefreshCw,
  Globe,
  FolderOpen,
  Key,
  LayoutGrid
} from 'lucide-react'

/**
 * 언어팩 관리 페이지
 * - @tanstack/react-table 기반 DataTable
 * - 서버 사이드 페이징
 */
export default function LanguagePack() {
  const { reload: reloadTranslations, t } = useLanguage()
  
  // 기본 데이터
  const [languages, setLanguages] = useState([])
  const [categories, setCategories] = useState([])
  
  // 테이블 데이터
  const [keys, setKeys] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [totalKeysCount, setTotalKeysCount] = useState(0)
  
  // 로딩
  const [loading, setLoading] = useState(true)
  const [tableLoading, setTableLoading] = useState(false)
  
  // 필터
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedLanguage, setSelectedLanguage] = useState('ko')
  
  // 페이징
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  
  // 다이얼로그
  const [keyDialogOpen, setKeyDialogOpen] = useState(false)
  const [editingKey, setEditingKey] = useState(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingKey, setDeletingKey] = useState(null)
  
  // 폼 데이터
  const [formData, setFormData] = useState({
    key: '',
    categoryId: '',
    description: '',
    translations: {}
  })

  /**
   * 초기 데이터 로드
   */
  const loadInitialData = useCallback(async () => {
    setLoading(true)
    try {
      const [langRes, catRes, countRes] = await Promise.all([
        supabase.from('languages').select('*').order('sort_order'),
        supabase.from('language_categories').select('*').order('sort_order'),
        supabase.from('language_keys').select('*', { count: 'exact', head: true })
      ])
      
      if (langRes.error) throw langRes.error
      if (catRes.error) throw catRes.error
      
      setLanguages(langRes.data || [])
      setCategories(catRes.data || [])
      setTotalKeysCount(countRes.count || 0)
    } catch (error) {
      console.error('Error loading initial data:', error)
      toast.error(t('error.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [])

  // 검색어 디바운스
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setPageIndex(0)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // 카테고리 변경 시 첫 페이지로
  useEffect(() => {
    setPageIndex(0)
  }, [selectedCategory])

  // 초기 로드
  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  /**
   * 키 데이터 로드 (서버 사이드 페이징)
   */
  const loadKeys = useCallback(async () => {
    setTableLoading(true)
    try {
      let query = supabase
        .from('language_keys')
        .select(`
          *,
          category:language_categories(id, name),
          translations(id, language_code, value)
        `, { count: 'exact' })

      if (selectedCategory !== 'all') {
        query = query.eq('category_id', selectedCategory)
      }

      if (debouncedSearch) {
        query = query.or(`key.ilike.%${debouncedSearch}%,description.ilike.%${debouncedSearch}%`)
      }

      query = query.order('key')

      const from = pageIndex * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) throw error

      setKeys(data || [])
      setTotalCount(count || 0)
    } catch (error) {
      console.error('Error loading keys:', error)
      toast.error(t('error.loadFailed'))
    } finally {
      setTableLoading(false)
    }
  }, [pageIndex, pageSize, debouncedSearch, selectedCategory])

  // 키 데이터 로드 (languages 로드 후)
  useEffect(() => {
    if (languages.length > 0) {
      loadKeys()
    }
  }, [pageIndex, pageSize, debouncedSearch, selectedCategory, languages.length]) // loadKeys 대신 직접 의존성 명시

  /**
   * 특정 키의 특정 언어 번역값 가져오기
   */
  const getTranslationValue = (keyItem, langCode) => {
    const translation = keyItem.translations?.find(t => t.language_code === langCode)
    return translation?.value || ''
  }

  /**
   * 인라인 번역 수정
   */
  const handleInlineUpdate = async (keyId, langCode, value) => {
    try {
      const keyItem = keys.find(k => k.id === keyId)
      const existingTranslation = keyItem?.translations?.find(
        t => t.language_code === langCode
      )

      if (existingTranslation) {
        await supabase
          .from('translations')
          .update({ value })
          .eq('id', existingTranslation.id)
      } else {
        await supabase
          .from('translations')
          .insert({
            key_id: keyId,
            language_code: langCode,
            value
          })
      }
      
      // 로컬 상태 업데이트
      setKeys(prev => prev.map(k => {
        if (k.id !== keyId) return k
        const newTranslations = [...(k.translations || [])]
        const idx = newTranslations.findIndex(t => t.language_code === langCode)
        if (idx >= 0) {
          newTranslations[idx] = { ...newTranslations[idx], value }
        } else {
          newTranslations.push({ language_code: langCode, value })
        }
        return { ...k, translations: newTranslations }
      }))
      
      reloadTranslations()
    } catch (error) {
      console.error('Error updating translation:', error)
      toast.error(t('error.saveFailed'))
    }
  }

  /**
   * 테이블 컬럼 정의
   */
  const columns = useMemo(() => [
    {
      id: 'rowNumber',
      header: '#',
      size: 50,
      meta: { headerClassName: 'text-center', cellClassName: 'text-center' },
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {pageIndex * pageSize + row.index + 1}
        </span>
      ),
    },
    {
      accessorKey: 'key',
      header: 'Key',
      size: 200,
      cell: ({ row }) => (
        <div className="font-mono text-sm">
          <span className="font-medium">{row.original.key}</span>
          {row.original.description && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {row.original.description}
            </p>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'category',
      header: t('admin.categories'),
      size: 100,
      cell: ({ row }) => (
        row.original.category ? (
          <Badge variant="outline">{row.original.category.name}</Badge>
        ) : null
      ),
    },
    {
      id: 'translation',
      header: () => (
        <span>
          {languages.find(l => l.code === selectedLanguage)?.native_name || selectedLanguage} {t('admin.translations')}
        </span>
      ),
      cell: ({ row }) => (
        <Input
          value={getTranslationValue(row.original, selectedLanguage)}
          onChange={(e) => handleInlineUpdate(row.original.id, selectedLanguage, e.target.value)}
          className="h-8"
          placeholder={t('admin.translationPlaceholder', { lang: '' })}
        />
      ),
    },
    {
      id: 'actions',
      header: t('common.edit'),
      size: 100,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => openKeyDialog(row.original)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => {
              setDeletingKey(row.original)
              setDeleteDialogOpen(true)
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ], [pageIndex, pageSize, selectedLanguage, languages, t])

  /**
   * 키 추가/수정 다이얼로그 열기
   */
  const openKeyDialog = (keyItem = null) => {
    if (keyItem) {
      setEditingKey(keyItem)
      const translationsObj = {}
      languages.forEach(lang => {
        translationsObj[lang.code] = getTranslationValue(keyItem, lang.code)
      })
      setFormData({
        key: keyItem.key,
        categoryId: keyItem.category?.id || '',
        description: keyItem.description || '',
        translations: translationsObj
      })
    } else {
      setEditingKey(null)
      const translationsObj = {}
      languages.forEach(lang => {
        translationsObj[lang.code] = ''
      })
      setFormData({
        key: '',
        categoryId: categories[0]?.id || '',
        description: '',
        translations: translationsObj
      })
    }
    setKeyDialogOpen(true)
  }

  /**
   * 키 저장
   */
  const handleSaveKey = async () => {
    try {
      if (!formData.key.trim()) {
        toast.error(t('error.keyRequired'))
        return
      }
      
      if (!/^[a-z]+(\.[a-zA-Z]+)+$/.test(formData.key)) {
        toast.error(t('error.invalidKeyFormat'))
        return
      }

      if (editingKey) {
        const { error: keyError } = await supabase
          .from('language_keys')
          .update({
            key: formData.key,
            category_id: formData.categoryId || null,
            description: formData.description || null
          })
          .eq('id', editingKey.id)
        
        if (keyError) throw keyError

        for (const lang of languages) {
          const existingTranslation = editingKey.translations?.find(
            tr => tr.language_code === lang.code
          )
          
          if (existingTranslation) {
            await supabase
              .from('translations')
              .update({ value: formData.translations[lang.code] || '' })
              .eq('id', existingTranslation.id)
          } else if (formData.translations[lang.code]) {
            await supabase
              .from('translations')
              .insert({
                key_id: editingKey.id,
                language_code: lang.code,
                value: formData.translations[lang.code]
              })
          }
        }
        
        toast.success(t('success.updated'))
      } else {
        const { data: newKey, error: keyError } = await supabase
          .from('language_keys')
          .insert({
            key: formData.key,
            category_id: formData.categoryId || null,
            description: formData.description || null
          })
          .select()
          .single()
        
        if (keyError) throw keyError

        const translationsToInsert = languages
          .filter(lang => formData.translations[lang.code])
          .map(lang => ({
            key_id: newKey.id,
            language_code: lang.code,
            value: formData.translations[lang.code]
          }))
        
        if (translationsToInsert.length > 0) {
          const { error: transError } = await supabase
            .from('translations')
            .insert(translationsToInsert)
          
          if (transError) throw transError
        }
        
        toast.success(t('success.added'))
        setTotalKeysCount(prev => prev + 1)
      }

      setKeyDialogOpen(false)
      loadKeys()
      reloadTranslations()
    } catch (error) {
      console.error('Error saving key:', error)
      toast.error(t('error.saveFailed'))
    }
  }

  /**
   * 키 삭제
   */
  const handleDeleteKey = async () => {
    if (!deletingKey) return
    
    try {
      const { error } = await supabase
        .from('language_keys')
        .delete()
        .eq('id', deletingKey.id)
      
      if (error) throw error
      
      toast.success(t('success.deleted'))
      setDeleteDialogOpen(false)
      setDeletingKey(null)
      setTotalKeysCount(prev => prev - 1)
      loadKeys()
      reloadTranslations()
    } catch (error) {
      console.error('Error deleting key:', error)
      toast.error(t('error.deleteFailed'))
    }
  }

  /**
   * 새로고침
   */
  const handleRefresh = () => {
    loadInitialData()
    loadKeys()
  }

  // 탭 아이템 컴포넌트
  const TabItem = ({ id, label, icon: Icon, colorClass }) => (
    <button
      onClick={() => setSelectedCategory(id)}
      className={`
        flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
        ${selectedCategory === id 
          ? `border-primary text-primary bg-primary/5` 
          : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'}
      `}
    >
      {Icon && <Icon className={`h-4 w-4 ${selectedCategory === id ? colorClass : 'text-muted-foreground'}`} />}
      {label}
    </button>
  )

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col p-4 md:p-6">
      {/* 헤더 */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Languages className="h-7 w-7" />
              {t('admin.languagePackTitle')}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {t('admin.languagePackDesc')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={tableLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${tableLoading ? 'animate-spin' : ''}`} />
              {t('common.refresh')}
            </Button>
            <Button size="sm" onClick={() => openKeyDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              {t('admin.addKey')}
            </Button>
          </div>
        </div>

        {/* 카테고리 탭 */}
        <div className="flex items-center border-b overflow-x-auto">
          <TabItem 
            id="all" 
            label={t('admin.allCategories')} 
            icon={LayoutGrid}
            colorClass="text-primary"
          />
          {categories.map(cat => (
            <TabItem 
              key={cat.id}
              id={cat.id} 
              label={cat.name}
              icon={FolderOpen}
              colorClass="text-blue-500"
            />
          ))}
        </div>
      </div>

      {/* 데이터 테이블 */}
      <Card className="flex-1 flex flex-col min-h-0 border-0 shadow-none sm:border sm:shadow-sm">
        <CardHeader className="pb-3 px-0 sm:px-6 pt-0 sm:pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('admin.searchKeyDesc')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder={t('common.language')} />
              </SelectTrigger>
              <SelectContent>
                {languages.map(lang => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.native_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col min-h-0 px-0 sm:px-6 pb-0 sm:pb-6">
          <DataTable
            columns={columns}
            data={keys}
            totalCount={totalCount}
            pageIndex={pageIndex}
            pageSize={pageSize}
            onPageChange={setPageIndex}
            onPageSizeChange={setPageSize}
            loading={tableLoading}
            emptyMessage={
              searchTerm || selectedCategory !== 'all'
                ? t('admin.noSearchResults')
                : t('admin.noTranslationKeys')
            }
          />
        </CardContent>
      </Card>

      {/* 키 추가/수정 다이얼로그 */}
      <Dialog open={keyDialogOpen} onOpenChange={setKeyDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingKey ? t('admin.editKey') : t('admin.addKey')}
            </DialogTitle>
            <DialogDescription>
              {t('admin.languagePackDesc')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="key">
                  Key <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="key"
                  placeholder={t('admin.keyPlaceholder')}
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  disabled={!!editingKey}
                />
                <p className="text-xs text-muted-foreground">
                  {t('admin.keyFormat')}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">{t('admin.categories')}</Label>
                <Select 
                  value={formData.categoryId} 
                  onValueChange={(v) => setFormData({ ...formData, categoryId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('admin.selectCategory')} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">{t('admin.keyDescription')}</Label>
              <Input
                id="description"
                placeholder={t('admin.keyDescPlaceholder')}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            
            <div className="space-y-3">
              <Label>{t('admin.translations')}</Label>
              {languages.map(lang => (
                <div key={lang.code} className="flex items-center gap-3">
                  <Badge variant="outline" className="w-16 justify-center">
                    {lang.code.toUpperCase()}
                  </Badge>
                  <Input
                    placeholder={t('admin.translationPlaceholder', { lang: lang.native_name })}
                    value={formData.translations[lang.code] || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      translations: {
                        ...formData.translations,
                        [lang.code]: e.target.value
                      }
                    })}
                  />
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setKeyDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveKey}>
              {editingKey ? t('common.edit') : t('common.add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.deleteKey')}</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="font-mono">{deletingKey?.key}</strong> {t('admin.deleteKeyConfirm')}
              <br />
              {t('admin.deleteKeyWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteKey}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
