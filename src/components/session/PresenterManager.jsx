import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { 
  Loader2, 
  Search, 
  UserPlus, 
  Mic,
  X,
  Check,
  Clock,
  XCircle,
  GripVertical,
  Trash2,
  Edit,
  ChevronUp,
  ChevronDown
} from 'lucide-react'

/**
 * 세션 강사 관리 컴포넌트
 * - 팀원 지정 (승인 불필요)
 * - 강사 파트너 초대 (승인 필요)
 * - 직접 입력 (승인 불필요)
 */
export default function PresenterManager({ sessionId, partnerId, onUpdate }) {
  const { user } = useAuth()
  const { t } = useLanguage()
  
  const [loading, setLoading] = useState(true)
  const [presenters, setPresenters] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  
  // 추가 다이얼로그
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [addType, setAddType] = useState('member') // 'member' | 'partner' | 'manual'
  const [selectedMember, setSelectedMember] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState(false)
  
  // 직접 입력 폼
  const [manualForm, setManualForm] = useState({
    name: '',
    title: '',
    bio: '',
    image: ''
  })
  
  // 수정 다이얼로그
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingPresenter, setEditingPresenter] = useState(null)
  const [editForm, setEditForm] = useState({
    display_name: '',
    display_title: ''
  })
  
  // 삭제 다이얼로그
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletingPresenter, setDeletingPresenter] = useState(null)

  /**
   * 강사 목록 로드
   */
  const loadPresenters = async () => {
    if (!sessionId) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('session_presenters')
        .select(`
          *,
          user:profiles!session_presenters_user_id_fkey(id, email),
          partner:partners(
            id,
            representative_name,
            profile:profiles(email)
          )
        `)
        .eq('session_id', sessionId)
        .order('display_order')
      
      if (error) throw error
      
      // 강사 파트너 상세 정보 로드
      const presentersWithDetails = await Promise.all(
        (data || []).map(async (presenter) => {
          if (presenter.presenter_type === 'partner' && presenter.partner_id) {
            const { data: instructorData } = await supabase
              .from('partner_instructors')
              .select('display_name, specialty')
              .eq('partner_id', presenter.partner_id)
              .single()
            return { ...presenter, instructorDetails: instructorData }
          }
          return presenter
        })
      )
      
      setPresenters(presentersWithDetails)
    } catch (error) {
      console.error('Error loading presenters:', error)
    } finally {
      setLoading(false)
    }
  }

  /**
   * 팀원 목록 로드
   */
  const loadTeamMembers = async () => {
    if (!partnerId) return
    
    try {
      const { data, error } = await supabase
        .from('partner_members')
        .select(`
          id,
          user_id,
          email,
          role,
          profile:profiles!partner_members_user_id_fkey(id, email)
        `)
        .eq('partner_id', partnerId)
        .eq('status', 'accepted')
      
      if (error) throw error
      setTeamMembers(data || [])
    } catch (error) {
      console.error('Error loading team members:', error)
    }
  }

  useEffect(() => {
    loadPresenters()
    loadTeamMembers()
  }, [sessionId, partnerId])

  /**
   * 강사 파트너 검색
   */
  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    
    setSearching(true)
    try {
      // 강사 파트너만 검색
      const { data: partners, error } = await supabase
        .from('partners')
        .select(`
          id,
          representative_name,
          phone,
          is_active,
          profile:profiles(email)
        `)
        .eq('partner_type', 'instructor')
        .eq('is_active', true)
      
      if (error) throw error
      
      // 강사 상세 정보 로드
      const resultsWithDetails = await Promise.all(
        partners.map(async (partner) => {
          const { data } = await supabase
            .from('partner_instructors')
            .select('display_name, specialty, bio')
            .eq('partner_id', partner.id)
            .single()
          return { ...partner, details: data }
        })
      )
      
      // 검색어로 필터링
      const query = searchQuery.toLowerCase()
      const filtered = resultsWithDetails.filter(p => 
        p.details?.display_name?.toLowerCase().includes(query) ||
        p.representative_name?.toLowerCase().includes(query) ||
        p.details?.specialty?.toLowerCase().includes(query) ||
        p.profile?.email?.toLowerCase().includes(query)
      )
      
      setSearchResults(filtered)
    } catch (error) {
      console.error('Error searching instructors:', error)
      toast.error(t('error.searchFailed'))
    } finally {
      setSearching(false)
    }
  }

  /**
   * 강사 추가
   */
  const handleAdd = async (targetData) => {
    setAdding(true)
    try {
      const maxOrder = presenters.reduce((max, p) => Math.max(max, p.display_order || 0), -1)
      
      let insertData = {
        session_id: sessionId,
        display_order: maxOrder + 1,
      }
      
      if (addType === 'member') {
        // 팀원 지정
        const member = teamMembers.find(m => m.id === targetData)
        if (!member) throw new Error('Member not found')
        
        insertData = {
          ...insertData,
          presenter_type: 'member',
          user_id: member.user_id,
          display_name: member.profile?.email?.split('@')[0] || member.email.split('@')[0],
          status: 'confirmed'
        }
      } else if (addType === 'partner') {
        // 강사 파트너 초대
        insertData = {
          ...insertData,
          presenter_type: 'partner',
          partner_id: targetData.id,
          display_name: targetData.details?.display_name || targetData.representative_name,
          display_title: targetData.details?.specialty,
          status: 'pending'
        }
      } else if (addType === 'manual') {
        // 직접 입력
        if (!manualForm.name.trim()) {
          toast.error(t('presenter.nameRequired'))
          setAdding(false)
          return
        }
        
        insertData = {
          ...insertData,
          presenter_type: 'manual',
          manual_name: manualForm.name,
          manual_title: manualForm.title,
          manual_bio: manualForm.bio,
          manual_image: manualForm.image,
          display_name: manualForm.name,
          display_title: manualForm.title,
          status: 'confirmed'
        }
      }
      
      const { error } = await supabase
        .from('session_presenters')
        .insert(insertData)
      
      if (error) throw error
      
      toast.success(
        addType === 'partner' ? t('presenter.inviteSent') : t('presenter.added')
      )
      
      // 초기화
      setShowAddDialog(false)
      setAddType('member')
      setSelectedMember('')
      setSearchQuery('')
      setSearchResults([])
      setManualForm({ name: '', title: '', bio: '', image: '' })
      
      loadPresenters()
      onUpdate?.()
    } catch (error) {
      console.error('Error adding presenter:', error)
      toast.error(t('error.addFailed'))
    } finally {
      setAdding(false)
    }
  }

  /**
   * 강사 수정
   */
  const handleEdit = async () => {
    if (!editingPresenter) return
    
    try {
      const { error } = await supabase
        .from('session_presenters')
        .update({
          display_name: editForm.display_name,
          display_title: editForm.display_title
        })
        .eq('id', editingPresenter.id)
      
      if (error) throw error
      
      toast.success(t('presenter.updated'))
      setShowEditDialog(false)
      setEditingPresenter(null)
      loadPresenters()
    } catch (error) {
      console.error('Error updating presenter:', error)
      toast.error(t('error.updateFailed'))
    }
  }

  /**
   * 강사 삭제
   */
  const handleDelete = async () => {
    if (!deletingPresenter) return
    
    try {
      const { error } = await supabase
        .from('session_presenters')
        .delete()
        .eq('id', deletingPresenter.id)
      
      if (error) throw error
      
      toast.success(t('presenter.removed'))
      setShowDeleteDialog(false)
      setDeletingPresenter(null)
      loadPresenters()
      onUpdate?.()
    } catch (error) {
      console.error('Error deleting presenter:', error)
      toast.error(t('error.deleteFailed'))
    }
  }

  /**
   * 순서 변경
   */
  const handleReorder = async (index, direction) => {
    const newPresenters = [...presenters]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    
    if (targetIndex < 0 || targetIndex >= newPresenters.length) return
    
    // 스왑
    [newPresenters[index], newPresenters[targetIndex]] = [newPresenters[targetIndex], newPresenters[index]]
    
    // display_order 업데이트
    try {
      await Promise.all(
        newPresenters.map((p, i) => 
          supabase
            .from('session_presenters')
            .update({ display_order: i })
            .eq('id', p.id)
        )
      )
      
      setPresenters(newPresenters)
    } catch (error) {
      console.error('Error reordering presenters:', error)
      toast.error(t('error.updateFailed'))
    }
  }

  /**
   * 상태 배지
   */
  const getStatusBadge = (status) => {
    const config = {
      pending: { 
        label: t('presenter.pending'), 
        icon: Clock,
        className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' 
      },
      confirmed: { 
        label: t('presenter.confirmed'), 
        icon: Check,
        className: 'bg-green-500/10 text-green-500 border-green-500/20' 
      },
      rejected: { 
        label: t('presenter.rejected'), 
        icon: XCircle,
        className: 'bg-red-500/10 text-red-500 border-red-500/20' 
      },
    }
    const c = config[status] || config.confirmed
    const Icon = c.icon
    return (
      <Badge variant="outline" className={c.className}>
        <Icon className="h-3 w-3 mr-1" />
        {c.label}
      </Badge>
    )
  }

  /**
   * 강사 타입 배지
   */
  const getTypeBadge = (type) => {
    const config = {
      member: { label: t('presenter.typeTeamMember'), className: 'bg-blue-500/10 text-blue-500' },
      partner: { label: t('presenter.typePartner'), className: 'bg-purple-500/10 text-purple-500' },
      manual: { label: t('presenter.typeManual'), className: 'bg-gray-500/10 text-gray-500' },
    }
    const c = config[type] || config.manual
    return <Badge variant="outline" className={c.className}>{c.label}</Badge>
  }

  /**
   * 수정 다이얼로그 열기
   */
  const openEditDialog = (presenter) => {
    setEditingPresenter(presenter)
    setEditForm({
      display_name: presenter.display_name || '',
      display_title: presenter.display_title || ''
    })
    setShowEditDialog(true)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t('presenter.title')}</CardTitle>
            <CardDescription>{t('presenter.desc')}</CardDescription>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            {t('presenter.add')}
          </Button>
        </CardHeader>
        <CardContent>
          {presenters.length === 0 ? (
            <div className="text-center py-8">
              <Mic className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {t('presenter.noPresenters')}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {presenters.map((presenter, index) => (
                <div 
                  key={presenter.id}
                  className="flex items-center gap-3 p-3 border rounded-lg"
                >
                  {/* 순서 변경 버튼 */}
                  <div className="flex flex-col">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-5 w-5"
                      onClick={() => handleReorder(index, 'up')}
                      disabled={index === 0}
                    >
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-5 w-5"
                      onClick={() => handleReorder(index, 'down')}
                      disabled={index === presenters.length - 1}
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  {/* 강사 정보 */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{presenter.display_name}</span>
                      {getTypeBadge(presenter.presenter_type)}
                      {presenter.presenter_type === 'partner' && getStatusBadge(presenter.status)}
                    </div>
                    {presenter.display_title && (
                      <p className="text-sm text-muted-foreground">{presenter.display_title}</p>
                    )}
                  </div>
                  
                  {/* 액션 버튼 */}
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => openEditDialog(presenter)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        setDeletingPresenter(presenter)
                        setShowDeleteDialog(true)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 강사 추가 다이얼로그 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t('presenter.add')}</DialogTitle>
            <DialogDescription>
              {t('presenter.addDesc')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* 추가 방식 선택 */}
            <div className="space-y-2">
              <Label>{t('presenter.addType')}</Label>
              <RadioGroup value={addType} onValueChange={setAddType}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="member" id="type-member" />
                  <Label htmlFor="type-member" className="cursor-pointer">
                    {t('presenter.typeTeamMember')}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="partner" id="type-partner" />
                  <Label htmlFor="type-partner" className="cursor-pointer">
                    {t('presenter.typePartner')}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="manual" id="type-manual" />
                  <Label htmlFor="type-manual" className="cursor-pointer">
                    {t('presenter.typeManual')}
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* 팀원 선택 */}
            {addType === 'member' && (
              <div className="space-y-2">
                <Label>{t('presenter.selectTeamMember')}</Label>
                {teamMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t('presenter.noTeamMembers')}
                  </p>
                ) : (
                  <Select value={selectedMember} onValueChange={setSelectedMember}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('presenter.selectTeamMember')} />
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.profile?.email || member.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* 강사 파트너 검색 */}
            {addType === 'partner' && (
              <div className="space-y-2">
                <Label>{t('presenter.searchInstructor')}</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder={t('presenter.searchInstructorPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <Button onClick={handleSearch} disabled={searching}>
                    {searching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                <div className="max-h-[200px] overflow-y-auto space-y-2">
                  {searchResults.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4 text-sm">
                      {searchQuery ? t('presenter.noInstructorsFound') : t('session.searchToFind')}
                    </p>
                  ) : (
                    searchResults.map((instructor) => (
                      <div 
                        key={instructor.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div>
                          <div className="font-medium">
                            {instructor.details?.display_name || instructor.representative_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {instructor.details?.specialty}
                          </div>
                        </div>
                        <Button 
                          size="sm"
                          onClick={() => handleAdd(instructor)}
                          disabled={adding}
                        >
                          {adding ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <UserPlus className="h-4 w-4 mr-1" />
                              {t('common.invite')}
                            </>
                          )}
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 직접 입력 */}
            {addType === 'manual' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('presenter.manualName')} *</Label>
                  <Input
                    value={manualForm.name}
                    onChange={(e) => setManualForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder={t('presenter.namePlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('presenter.manualTitle')}</Label>
                  <Input
                    value={manualForm.title}
                    onChange={(e) => setManualForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder={t('presenter.titlePlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('presenter.manualBio')}</Label>
                  <Textarea
                    value={manualForm.bio}
                    onChange={(e) => setManualForm(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder={t('presenter.bioPlaceholder')}
                    rows={3}
                  />
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              {t('common.cancel')}
            </Button>
            {addType === 'member' && (
              <Button 
                onClick={() => handleAdd(selectedMember)} 
                disabled={!selectedMember || adding}
              >
                {adding && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {t('common.add')}
              </Button>
            )}
            {addType === 'manual' && (
              <Button 
                onClick={() => handleAdd(null)} 
                disabled={!manualForm.name.trim() || adding}
              >
                {adding && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {t('common.add')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 강사 수정 다이얼로그 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('presenter.edit')}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('presenter.displayName')}</Label>
              <Input
                value={editForm.display_name}
                onChange={(e) => setEditForm(prev => ({ ...prev, display_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('presenter.displayTitle')}</Label>
              <Input
                value={editForm.display_title}
                onChange={(e) => setEditForm(prev => ({ ...prev, display_title: e.target.value }))}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleEdit}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('presenter.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('presenter.deleteConfirmDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

