import { useState, useEffect, useCallback } from 'react'
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
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { 
  Loader2, 
  Search, 
  UserPlus, 
  Building2,
  Briefcase,
  X,
  Check,
  Clock,
  XCircle,
  Mic,
  Crown,
  MoreVertical,
  Trash2,
  Edit,
  ChevronUp,
  ChevronDown,
  GripVertical
} from 'lucide-react'
import PartnerInfoDialog from '@/components/common/PartnerInfoDialog'

/**
 * 드래그 가능한 강사 아이템 컴포넌트
 */
function SortablePresenterItem({ 
  presenter, 
  index, 
  totalCount, 
  getStatusBadge, 
  getTypeBadge,
  handleReorderPresenter,
  onEdit,
  onDelete,
  onClickPartner,
  onClickMember,
  t 
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: presenter.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
        isDragging ? 'bg-muted shadow-lg' : 'hover:bg-muted/50'
      }`}
    >
      {/* 드래그 핸들 + 순서 버튼 */}
      <div className="flex items-center gap-1">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex flex-col gap-0.5">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-5 w-5"
            onClick={() => handleReorderPresenter(index, 'up')}
            disabled={index === 0}
          >
            <ChevronUp className="h-3 w-3" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-5 w-5"
            onClick={() => handleReorderPresenter(index, 'down')}
            disabled={index === totalCount - 1}
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      {/* 아이콘 */}
      <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
        <Mic className="h-5 w-5 text-orange-500" />
      </div>
      
      {/* 정보 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {/* 타입 배지 */}
          {getTypeBadge(presenter.presenter_type)}
          
          {/* 이름 - 타입별 클릭 처리 */}
          {presenter.presenter_type === 'partner' && presenter.partner_id ? (
            // 파트너: 파트너 정보 팝업
            <button
              type="button"
              className="font-medium text-primary hover:underline cursor-pointer"
              onClick={() => onClickPartner(presenter.partner_id)}
            >
              {presenter.display_name}
            </button>
          ) : presenter.presenter_type === 'member' && presenter.user_id ? (
            // 팀원: 팀원 정보 팝업
            <button
              type="button"
              className="font-medium text-primary hover:underline cursor-pointer"
              onClick={() => onClickMember(presenter)}
            >
              {presenter.display_name}
            </button>
          ) : (
            // 직접 입력: 클릭 불가
            <span className="font-medium">{presenter.display_name}</span>
          )}
          
          {/* 파트너 상태 배지 */}
          {presenter.presenter_type === 'partner' && getStatusBadge(presenter.status)}
        </div>
        {/* 직접 입력이 아닌 경우에만 직책 표시 */}
        {presenter.presenter_type !== 'manual' && presenter.display_title && (
          <p className="text-sm text-muted-foreground">{presenter.display_title}</p>
        )}
      </div>
      
      {/* 액션 */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(presenter)}>
            <Edit className="h-4 w-4 mr-2" />
            {t('common.edit')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            className="text-red-600"
            onClick={() => onDelete(presenter)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t('common.delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

/**
 * 세션 협업 패널
 * - 행사자 (세션 생성자 또는 초대된 행사자)
 * - 대행사 (초대된 대행업체)
 * - 강사 관리
 */
export default function CollaborationPanel({ sessionId, partnerId, partnerType, onUpdate }) {
  const { user } = useAuth()
  const { t } = useLanguage()
  
  const [loading, setLoading] = useState(true)
  const [sessionOwner, setSessionOwner] = useState(null)
  const [invitedPartner, setInvitedPartner] = useState(null)
  const [presenters, setPresenters] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  
  // 파트너 초대 다이얼로그
  const [showPartnerDialog, setShowPartnerDialog] = useState(false)
  const [partnerSearchQuery, setPartnerSearchQuery] = useState('')
  const [partnerSearchResults, setPartnerSearchResults] = useState([])
  const [searchingPartner, setSearchingPartner] = useState(false)
  const [invitingPartner, setInvitingPartner] = useState(false)
  
  // 강사 추가 다이얼로그
  const [showPresenterDialog, setShowPresenterDialog] = useState(false)
  const [presenterAddType, setPresenterAddType] = useState('manual')
  const [selectedMember, setSelectedMember] = useState('')
  const [memberSearchQuery, setMemberSearchQuery] = useState('')
  const [presenterSearchQuery, setPresenterSearchQuery] = useState('')
  const [presenterSearchResults, setPresenterSearchResults] = useState([])
  const [searchingPresenter, setSearchingPresenter] = useState(false)
  const [addingPresenter, setAddingPresenter] = useState(false)
  const [manualPresenter, setManualPresenter] = useState({ name: '', title: '', bio: '' })
  
  // 수정/삭제
  const [editingPresenter, setEditingPresenter] = useState(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editForm, setEditForm] = useState({ display_name: '', display_title: '' })
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletingPresenter, setDeletingPresenter] = useState(null)
  
  // 초대 취소
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  
  // 파트너 정보 팝업
  const [showPartnerInfoDialog, setShowPartnerInfoDialog] = useState(false)
  const [selectedPartnerId, setSelectedPartnerId] = useState(null)
  
  // 팀원 정보 팝업
  const [showMemberInfoDialog, setShowMemberInfoDialog] = useState(false)
  const [selectedMemberPresenter, setSelectedMemberPresenter] = useState(null)
  const [memberInfo, setMemberInfo] = useState(null)
  const [loadingMemberInfo, setLoadingMemberInfo] = useState(false)

  /**
   * 데이터 로드
   */
  const loadData = useCallback(async () => {
    if (!sessionId || !partnerId) return
    
    setLoading(true)
    try {
      // 세션 소유자 정보 (파트너)
      const { data: sessionData } = await supabase
        .from('sessions')
        .select(`
          partner_id,
          partner:partners(
            id,
            partner_type,
            representative_name,
            phone,
            profile:profiles(email)
          )
        `)
        .eq('id', sessionId)
        .single()
      
      if (sessionData?.partner) {
        // 파트너 타입별 상세 정보
        let ownerDetails = null
        if (sessionData.partner.partner_type === 'organizer') {
          const { data } = await supabase
            .from('partner_organizers')
            .select('company_name')
            .eq('partner_id', sessionData.partner.id)
            .single()
          ownerDetails = data
        } else if (sessionData.partner.partner_type === 'agency') {
          const { data } = await supabase
            .from('partner_agencies')
            .select('company_name')
            .eq('partner_id', sessionData.partner.id)
            .single()
          ownerDetails = data
        }
        
        setSessionOwner({
          ...sessionData.partner,
          details: ownerDetails,
          isOwner: true
        })
      }
      
      // 초대된 파트너
      const { data: inviteData } = await supabase
        .from('session_partners')
        .select(`
          *,
          partner:partners(
            id,
            partner_type,
            representative_name,
            phone,
            profile:profiles(email)
          )
        `)
        .eq('session_id', sessionId)
        .maybeSingle()
      
      if (inviteData?.partner) {
        let inviteDetails = null
        if (inviteData.partner.partner_type === 'organizer') {
          const { data } = await supabase
            .from('partner_organizers')
            .select('company_name')
            .eq('partner_id', inviteData.partner.id)
            .single()
          inviteDetails = data
        } else if (inviteData.partner.partner_type === 'agency') {
          const { data } = await supabase
            .from('partner_agencies')
            .select('company_name')
            .eq('partner_id', inviteData.partner.id)
            .single()
          inviteDetails = data
        }
        
        setInvitedPartner({
          ...inviteData,
          partnerDetails: inviteDetails
        })
      } else {
        setInvitedPartner(null)
      }
      
      // 강사 목록
      const { data: presenterData } = await supabase
        .from('session_presenters')
        .select('*')
        .eq('session_id', sessionId)
        .order('display_order')
      
      setPresenters(presenterData || [])
      
      // 팀원 목록 (user_id로 profiles 조회)
      const { data: memberData } = await supabase
        .from('partner_members')
        .select('id, user_id, email, role')
        .eq('partner_id', partnerId)
        .eq('status', 'accepted')
      
      // profiles 정보 추가 조회
      if (memberData && memberData.length > 0) {
        const userIds = memberData.filter(m => m.user_id).map(m => m.user_id)
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, email')
            .in('id', userIds)
          
          const profilesMap = (profilesData || []).reduce((acc, p) => {
            acc[p.id] = p
            return acc
          }, {})
          
          const enrichedMembers = memberData.map(m => ({
            ...m,
            profile: m.user_id ? profilesMap[m.user_id] : null
          }))
          setTeamMembers(enrichedMembers)
        } else {
          setTeamMembers(memberData)
        }
      } else {
        setTeamMembers([])
      }
      
    } catch (error) {
      console.error('Error loading collaboration data:', error)
    } finally {
      setLoading(false)
    }
  }, [sessionId, partnerId])

  useEffect(() => {
    loadData()
  }, [loadData])

  /**
   * 파트너 검색
   */
  const handlePartnerSearch = async () => {
    if (!partnerSearchQuery.trim()) return
    
    setSearchingPartner(true)
    try {
      const targetType = partnerType === 'organizer' ? 'agency' : 'organizer'
      
      const { data: partners } = await supabase
        .from('partners')
        .select('id, partner_type, representative_name, phone, is_active, profile:profiles(email)')
        .eq('partner_type', targetType)
        .eq('is_active', true)
        .neq('id', partnerId)
      
      const resultsWithDetails = await Promise.all(
        (partners || []).map(async (partner) => {
          let details = null
          if (partner.partner_type === 'organizer') {
            const { data } = await supabase
              .from('partner_organizers')
              .select('company_name')
              .eq('partner_id', partner.id)
              .single()
            details = data
          } else if (partner.partner_type === 'agency') {
            const { data } = await supabase
              .from('partner_agencies')
              .select('company_name')
              .eq('partner_id', partner.id)
              .single()
            details = data
          }
          return { ...partner, details }
        })
      )
      
      const query = partnerSearchQuery.toLowerCase()
      const filtered = resultsWithDetails.filter(p => 
        p.details?.company_name?.toLowerCase().includes(query) ||
        p.representative_name?.toLowerCase().includes(query)
      )
      
      setPartnerSearchResults(filtered)
    } catch (error) {
      console.error('Error searching partners:', error)
    } finally {
      setSearchingPartner(false)
    }
  }

  /**
   * 파트너 초대
   */
  const handleInvitePartner = async (targetPartnerId) => {
    setInvitingPartner(true)
    try {
      const { data, error } = await supabase.rpc('invite_partner_to_session', {
        p_session_id: sessionId,
        p_partner_id: targetPartnerId
      })
      
      if (error) throw error
      
      if (!data.success) {
        toast.error(t(`error.${data.error}`))
        return
      }
      
      toast.success(t('session.partnerInvited'))
      setShowPartnerDialog(false)
      setPartnerSearchQuery('')
      setPartnerSearchResults([])
      loadData()
    } catch (error) {
      console.error('Error inviting partner:', error)
      toast.error(t('error.inviteFailed'))
    } finally {
      setInvitingPartner(false)
    }
  }

  /**
   * 초대 취소
   */
  const handleCancelInvite = async () => {
    try {
      const { error } = await supabase
        .from('session_partners')
        .delete()
        .eq('session_id', sessionId)
      
      if (error) throw error
      
      toast.success(t('session.inviteCanceled'))
      setShowCancelDialog(false)
      setInvitedPartner(null)
    } catch (error) {
      console.error('Error canceling invite:', error)
      toast.error(t('error.cancelFailed'))
    }
  }

  /**
   * 강사 파트너 검색
   * 검색 조건: 이메일, 활동명, 대표자명, 전문분야
   */
  const handlePresenterSearch = async () => {
    if (!presenterSearchQuery.trim()) return
    
    setSearchingPresenter(true)
    try {
      const { data: partners } = await supabase
        .from('partners')
        .select('id, representative_name, phone, is_active, profile:profiles(email)')
        .eq('partner_type', 'instructor')
        .eq('is_active', true)
      
      const resultsWithDetails = await Promise.all(
        (partners || []).map(async (partner) => {
          // profiles에서 display_name 가져오기
          const { data: profileData } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', partner.profile_id)
            .single()
          
          // partner_instructors에서 specialty, bio 가져오기
          const { data: instructorData } = await supabase
            .from('partner_instructors')
            .select('specialty, bio')
            .eq('partner_id', partner.id)
            .single()
          
          return { 
            ...partner, 
            details: { 
              display_name: profileData?.display_name,
              specialty: instructorData?.specialty,
              bio: instructorData?.bio
            } 
          }
        })
      )
      
      const query = presenterSearchQuery.toLowerCase()
      const filtered = resultsWithDetails.filter(p => 
        p.profile?.email?.toLowerCase().includes(query) ||           // 이메일
        p.details?.display_name?.toLowerCase().includes(query) ||    // 활동명
        p.representative_name?.toLowerCase().includes(query) ||      // 대표자명
        p.details?.specialty?.toLowerCase().includes(query)          // 전문분야
      )
      
      setPresenterSearchResults(filtered)
    } catch (error) {
      console.error('Error searching presenters:', error)
    } finally {
      setSearchingPresenter(false)
    }
  }

  /**
   * 강사 추가
   */
  const handleAddPresenter = async (data) => {
    setAddingPresenter(true)
    try {
      const maxOrder = presenters.reduce((max, p) => Math.max(max, p.display_order || 0), -1)
      
      let insertData = {
        session_id: sessionId,
        display_order: maxOrder + 1,
      }
      
      if (presenterAddType === 'member') {
        const member = teamMembers.find(m => m.id === data)
        if (!member) throw new Error('Member not found')
        
        insertData = {
          ...insertData,
          presenter_type: 'member',
          user_id: member.user_id,
          display_name: member.profile?.email?.split('@')[0] || member.email.split('@')[0],
          status: 'confirmed'
        }
      } else if (presenterAddType === 'partner') {
        insertData = {
          ...insertData,
          presenter_type: 'partner',
          partner_id: data.id,
          display_name: data.details?.display_name || data.representative_name,
          display_title: data.details?.specialty,
          status: 'pending'
        }
      } else {
        if (!manualPresenter.name.trim()) {
          toast.error(t('presenter.nameRequired'))
          setAddingPresenter(false)
          return
        }
        
        insertData = {
          ...insertData,
          presenter_type: 'manual',
          manual_name: manualPresenter.name,
          manual_title: manualPresenter.title,
          manual_bio: manualPresenter.bio,
          display_name: manualPresenter.name,
          display_title: manualPresenter.title,
          status: 'confirmed'
        }
      }
      
      const { error } = await supabase.from('session_presenters').insert(insertData)
      if (error) throw error
      
      toast.success(presenterAddType === 'partner' ? t('presenter.inviteSent') : t('presenter.added'))
      
      setShowPresenterDialog(false)
      setPresenterAddType('manual')
      setSelectedMember('')
      setMemberSearchQuery('')
      setPresenterSearchQuery('')
      setPresenterSearchResults([])
      setManualPresenter({ name: '', title: '', bio: '' })
      loadData()
    } catch (error) {
      console.error('Error adding presenter:', error)
      toast.error(t('error.addFailed'))
    } finally {
      setAddingPresenter(false)
    }
  }

  /**
   * 강사 수정
   */
  const handleEditPresenter = async () => {
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
      loadData()
    } catch (error) {
      console.error('Error updating presenter:', error)
      toast.error(t('error.updateFailed'))
    }
  }

  /**
   * 강사 삭제
   */
  const handleDeletePresenter = async () => {
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
      loadData()
    } catch (error) {
      console.error('Error deleting presenter:', error)
      toast.error(t('error.deleteFailed'))
    }
  }

  /**
   * 강사 순서 변경
   */
  const handleReorderPresenter = async (index, direction) => {
    const newPresenters = [...presenters]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    
    if (targetIndex < 0 || targetIndex >= newPresenters.length) return
    
    [newPresenters[index], newPresenters[targetIndex]] = [newPresenters[targetIndex], newPresenters[index]]
    
    try {
      await Promise.all(
        newPresenters.map((p, i) => 
          supabase.from('session_presenters').update({ display_order: i }).eq('id', p.id)
        )
      )
      setPresenters(newPresenters)
    } catch (error) {
      console.error('Error reordering presenters:', error)
    }
  }

  /**
   * 드래그 앤 드롭 센서
   */
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  /**
   * 드래그 종료 핸들러
   */
  const handleDragEnd = async (event) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      const oldIndex = presenters.findIndex((p) => p.id === active.id)
      const newIndex = presenters.findIndex((p) => p.id === over.id)

      const newPresenters = arrayMove(presenters, oldIndex, newIndex)
      setPresenters(newPresenters)

      // DB에 순서 저장
      try {
        await Promise.all(
          newPresenters.map((p, i) =>
            supabase.from('session_presenters').update({ display_order: i }).eq('id', p.id)
          )
        )
      } catch (error) {
        console.error('Error saving presenter order:', error)
        // 실패 시 원래 순서로 복원
        setPresenters(presenters)
      }
    }
  }

  /**
   * 상태 배지
   */
  const getStatusBadge = (status) => {
    const config = {
      pending: { label: t('session.invitePending'), className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
      accepted: { label: t('session.inviteAccepted'), className: 'bg-green-500/10 text-green-600 border-green-500/20' },
      rejected: { label: t('session.inviteRejected'), className: 'bg-red-500/10 text-red-600 border-red-500/20' },
      confirmed: { label: t('presenter.confirmed'), className: 'bg-green-500/10 text-green-600 border-green-500/20' },
    }
    const c = config[status] || config.pending
    return <Badge variant="outline" className={c.className}>{c.label}</Badge>
  }

  /**
   * 강연자 타입 배지
   */
  const getTypeBadge = (presenterType) => {
    const config = {
      manual: { label: t('presenter.typeManualBadge'), className: 'bg-gray-500/10 text-gray-600 border-gray-500/20' },
      member: { label: t('presenter.typeMemberBadge'), className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
      partner: { label: t('presenter.typePartnerBadge'), className: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
    }
    const c = config[presenterType] || config.manual
    return <Badge variant="outline" className={`text-xs ${c.className}`}>{c.label}</Badge>
  }

  /**
   * 팀원 정보 로드
   */
  const loadMemberInfo = useCallback(async (presenter) => {
    if (!presenter?.user_id) return
    
    setLoadingMemberInfo(true)
    try {
      // 프로필 정보 로드
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email, display_name')
        .eq('id', presenter.user_id)
        .single()
      
      if (profileError) throw profileError
      
      // 해당 파트너 정보 로드 (팀원이 속한 파트너)
      const { data: partnerData, error: partnerError } = await supabase
        .from('partners')
        .select(`
          id,
          partner_type,
          representative_name,
          phone,
          profile:profiles(display_name),
          partner_organizers(company_name),
          partner_agencies(company_name),
          partner_instructors(specialty)
        `)
        .eq('id', partnerId)
        .single()
      
      if (partnerError) throw partnerError
      
      setMemberInfo({
        profile,
        partner: partnerData,
        presenter
      })
    } catch (error) {
      console.error('Error loading member info:', error)
      setMemberInfo(null)
    } finally {
      setLoadingMemberInfo(false)
    }
  }, [partnerId])
  
  // 팀원 정보 다이얼로그 열릴 때 정보 로드
  useEffect(() => {
    if (showMemberInfoDialog && selectedMemberPresenter) {
      loadMemberInfo(selectedMemberPresenter)
    }
  }, [showMemberInfoDialog, selectedMemberPresenter, loadMemberInfo])

  /**
   * 파트너 타입 라벨
   */
  const getPartnerTypeLabel = (type) => {
    const labels = {
      organizer: t('partner.typeOrganizer'),
      agency: t('partner.typeAgency'),
      instructor: t('partner.typeInstructor'),
    }
    return labels[type] || type
  }

  // 초대 가능 여부
  const canInvitePartner = partnerType !== 'instructor' && !invitedPartner

  /**
   * 파트너 정보 팝업 열기
   */
  const handleOpenPartnerInfo = (pId) => {
    if (pId) {
      setSelectedPartnerId(pId)
      setShowPartnerInfoDialog(true)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 파트너 섹션 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {t('session.partnerSection')}
          </CardTitle>
          <CardDescription>{t('session.partnerSectionDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 행사자 / 대행사 슬롯 */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* 행사자 슬롯 */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{t('partner.typeOrganizer')}</span>
                </div>
              </div>
              
              {/* 행사자 정보 */}
              {sessionOwner?.partner_type === 'organizer' ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Crown className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenPartnerInfo(sessionOwner.id)}
                        className="font-medium truncate hover:text-primary hover:underline transition-colors text-left"
                      >
                        {sessionOwner.details?.company_name || sessionOwner.representative_name}
                      </button>
                      <Badge variant="secondary" className="text-xs">{t('session.creator')}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {sessionOwner.profile?.email}
                    </p>
                  </div>
                </div>
              ) : invitedPartner?.partner?.partner_type === 'organizer' ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Briefcase className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenPartnerInfo(invitedPartner.partner?.id)}
                          className="font-medium truncate hover:text-primary hover:underline transition-colors text-left"
                        >
                          {invitedPartner.partnerDetails?.company_name || invitedPartner.partner?.representative_name}
                        </button>
                        {getStatusBadge(invitedPartner.status)}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {invitedPartner.partner?.profile?.email}
                      </p>
                    </div>
                  </div>
                  {invitedPartner.status !== 'accepted' && (
                    <Button variant="ghost" size="icon" onClick={() => setShowCancelDialog(true)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ) : partnerType === 'agency' && canInvitePartner ? (
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => setShowPartnerDialog(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  {t('session.inviteOrganizer')}
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">-</p>
              )}
            </div>

            {/* 대행사 슬롯 */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{t('partner.typeAgency')}</span>
                </div>
              </div>
              
              {/* 대행사 정보 */}
              {sessionOwner?.partner_type === 'agency' ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Crown className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenPartnerInfo(sessionOwner.id)}
                        className="font-medium truncate hover:text-primary hover:underline transition-colors text-left"
                      >
                        {sessionOwner.details?.company_name || sessionOwner.representative_name}
                      </button>
                      <Badge variant="secondary" className="text-xs">{t('session.creator')}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {sessionOwner.profile?.email}
                    </p>
                  </div>
                </div>
              ) : invitedPartner?.partner?.partner_type === 'agency' ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-purple-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenPartnerInfo(invitedPartner.partner?.id)}
                          className="font-medium truncate hover:text-primary hover:underline transition-colors text-left"
                        >
                          {invitedPartner.partnerDetails?.company_name || invitedPartner.partner?.representative_name}
                        </button>
                        {getStatusBadge(invitedPartner.status)}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {invitedPartner.partner?.profile?.email}
                      </p>
                    </div>
                  </div>
                  {invitedPartner.status !== 'accepted' && (
                    <Button variant="ghost" size="icon" onClick={() => setShowCancelDialog(true)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ) : partnerType === 'organizer' && canInvitePartner ? (
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => setShowPartnerDialog(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  {t('session.inviteAgency')}
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">-</p>
              )}
            </div>
          </div>
          
          {partnerType === 'instructor' && (
            <p className="text-sm text-muted-foreground text-center">
              {t('session.instructorCannotInvite')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* 강사 관리 섹션 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              {t('presenter.title')}
            </CardTitle>
            <CardDescription>{t('presenter.desc')}</CardDescription>
          </div>
          <Button onClick={() => setShowPresenterDialog(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            {t('presenter.add')}
          </Button>
        </CardHeader>
        <CardContent>
          {presenters.length === 0 ? (
            <div className="text-center py-8">
              <Mic className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">{t('presenter.noPresenters')}</p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={presenters.map(p => p.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {presenters.map((presenter, index) => (
                    <SortablePresenterItem
                      key={presenter.id}
                      presenter={presenter}
                      index={index}
                      totalCount={presenters.length}
                      getStatusBadge={getStatusBadge}
                      getTypeBadge={getTypeBadge}
                      handleReorderPresenter={handleReorderPresenter}
                      onEdit={(p) => {
                        setEditingPresenter(p)
                        setEditForm({
                          display_name: p.display_name || '',
                          display_title: p.display_title || ''
                        })
                        setShowEditDialog(true)
                      }}
                      onDelete={(p) => {
                        setDeletingPresenter(p)
                        setShowDeleteDialog(true)
                      }}
                      onClickPartner={(id) => {
                        setSelectedPartnerId(id)
                        setShowPartnerInfoDialog(true)
                      }}
                      onClickMember={(presenter) => {
                        setSelectedMemberPresenter(presenter)
                        setShowMemberInfoDialog(true)
                      }}
                      t={t}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* 파트너 초대 다이얼로그 */}
      <Dialog open={showPartnerDialog} onOpenChange={setShowPartnerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {partnerType === 'organizer' ? t('session.inviteAgency') : t('session.inviteOrganizer')}
            </DialogTitle>
            <DialogDescription>
              {partnerType === 'organizer' ? t('session.searchAgencyDesc') : t('session.searchOrganizerDesc')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder={t('session.searchPartnerPlaceholder')}
                value={partnerSearchQuery}
                onChange={(e) => setPartnerSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePartnerSearch()}
              />
              <Button onClick={handlePartnerSearch} disabled={searchingPartner}>
                {searchingPartner ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
            
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {partnerSearchResults.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {partnerSearchQuery ? t('session.noPartnersFound') : t('session.searchToFind')}
                </p>
              ) : (
                partnerSearchResults.map((partner) => (
                  <div 
                    key={partner.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <div>
                      <div className="font-medium">{partner.details?.company_name || partner.representative_name}</div>
                      <div className="text-sm text-muted-foreground">{partner.profile?.email}</div>
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => handleInvitePartner(partner.id)}
                      disabled={invitingPartner}
                    >
                      {invitingPartner ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4 mr-1" />}
                      {t('common.invite')}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPartnerDialog(false)}>
              {t('common.cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 강사 추가 다이얼로그 */}
      <Dialog open={showPresenterDialog} onOpenChange={setShowPresenterDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('presenter.add')}</DialogTitle>
            <DialogDescription>{t('presenter.addDesc')}</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <RadioGroup value={presenterAddType} onValueChange={setPresenterAddType}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="manual" id="type-manual" />
                <Label htmlFor="type-manual">{t('presenter.typeManual')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="member" id="type-member" />
                <Label htmlFor="type-member">{t('presenter.typeTeamMember')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="partner" id="type-partner" />
                <Label htmlFor="type-partner">{t('presenter.typePartner')}</Label>
              </div>
            </RadioGroup>

            {presenterAddType === 'manual' && (
              <div className="space-y-3">
                <div>
                  <Label>{t('presenter.manualName')} *</Label>
                  <Input
                    value={manualPresenter.name}
                    onChange={(e) => setManualPresenter(prev => ({ ...prev, name: e.target.value }))}
                    placeholder={t('presenter.namePlaceholder')}
                  />
                </div>
                <div>
                  <Label>{t('presenter.manualTitle')}</Label>
                  <Input
                    value={manualPresenter.title}
                    onChange={(e) => setManualPresenter(prev => ({ ...prev, title: e.target.value }))}
                    placeholder={t('presenter.titlePlaceholder')}
                  />
                </div>
              </div>
            )}

            {presenterAddType === 'member' && (
              <div className="space-y-3">
                <Label>{t('presenter.selectTeamMember')}</Label>
                {teamMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground mt-2">{t('presenter.noTeamMembers')}</p>
                ) : (
                  <>
                    <Input
                      placeholder={t('presenter.searchMemberPlaceholder')}
                      value={memberSearchQuery}
                      onChange={(e) => setMemberSearchQuery(e.target.value)}
                    />
                    <div className="max-h-[200px] overflow-y-auto space-y-2">
                      {teamMembers
                        .filter(m => {
                          if (!memberSearchQuery.trim()) return true
                          const query = memberSearchQuery.toLowerCase()
                          return (
                            m.profile?.email?.toLowerCase().includes(query) ||
                            m.email?.toLowerCase().includes(query)
                          )
                        })
                        .map((member) => (
                          <div
                            key={member.id}
                            className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                              selectedMember === member.id 
                                ? 'border-primary bg-primary/5' 
                                : 'hover:bg-muted/50'
                            }`}
                            onClick={() => setSelectedMember(member.id)}
                          >
                            <div>
                              <div className="font-medium">{member.profile?.email || member.email}</div>
                              <div className="text-sm text-muted-foreground">{member.role}</div>
                            </div>
                            {selectedMember === member.id && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </div>
                        ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {presenterAddType === 'partner' && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder={t('presenter.searchInstructorPlaceholder')}
                    value={presenterSearchQuery}
                    onChange={(e) => setPresenterSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePresenterSearch()}
                  />
                  <Button onClick={handlePresenterSearch} disabled={searchingPresenter}>
                    {searchingPresenter ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
                
                <div className="max-h-[200px] overflow-y-auto space-y-2">
                  {presenterSearchResults.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4 text-sm">
                      {presenterSearchQuery ? t('presenter.noInstructorsFound') : t('session.searchToFind')}
                    </p>
                  ) : (
                    presenterSearchResults.map((instructor) => (
                      <div 
                        key={instructor.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                      >
                        <div>
                          <div className="font-medium">{instructor.details?.display_name || instructor.representative_name}</div>
                          <div className="text-sm text-muted-foreground">{instructor.details?.specialty}</div>
                        </div>
                        <Button 
                          size="sm"
                          onClick={() => handleAddPresenter(instructor)}
                          disabled={addingPresenter}
                        >
                          {addingPresenter ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4 mr-1" />}
                          {t('common.invite')}
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPresenterDialog(false)}>
              {t('common.cancel')}
            </Button>
            {presenterAddType === 'manual' && (
              <Button onClick={() => handleAddPresenter(null)} disabled={!manualPresenter.name.trim() || addingPresenter}>
                {addingPresenter && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {t('common.add')}
              </Button>
            )}
            {presenterAddType === 'member' && (
              <Button onClick={() => handleAddPresenter(selectedMember)} disabled={!selectedMember || addingPresenter}>
                {addingPresenter && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
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
            <div>
              <Label>{t('presenter.displayName')}</Label>
              <Input
                value={editForm.display_name}
                onChange={(e) => setEditForm(prev => ({ ...prev, display_name: e.target.value }))}
              />
            </div>
            <div>
              <Label>{t('presenter.displayTitle')}</Label>
              <Input
                value={editForm.display_title}
                onChange={(e) => setEditForm(prev => ({ ...prev, display_title: e.target.value }))}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleEditPresenter}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 강사 삭제 확인 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('presenter.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>{t('presenter.deleteConfirmDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePresenter} className="bg-red-600 hover:bg-red-700">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 초대 취소 확인 */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('session.cancelInvite')}</AlertDialogTitle>
            <AlertDialogDescription>{t('session.cancelInviteConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelInvite} className="bg-red-600 hover:bg-red-700">
              {t('session.cancelInvite')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 파트너 정보 팝업 */}
      <PartnerInfoDialog
        partnerId={selectedPartnerId}
        open={showPartnerInfoDialog}
        onOpenChange={setShowPartnerInfoDialog}
      />
      
      {/* 팀원 정보 팝업 */}
      <Dialog open={showMemberInfoDialog} onOpenChange={setShowMemberInfoDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t('presenter.memberInfo')}</DialogTitle>
          </DialogHeader>
          
          {loadingMemberInfo ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : memberInfo ? (
            <div className="space-y-6">
              {/* 팀원 정보 */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground">{t('presenter.memberDetails')}</h4>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('common.displayName')}</span>
                    <span>{memberInfo.profile?.display_name || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('common.email')}</span>
                    <span>{memberInfo.profile?.email || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('presenter.displayName')}</span>
                    <span>{selectedMemberPresenter?.display_name || '-'}</span>
                  </div>
                  {selectedMemberPresenter?.display_title && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('presenter.displayTitle')}</span>
                      <span>{selectedMemberPresenter.display_title}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* 소속 파트너 정보 */}
              {memberInfo.partner && (
                <div className="space-y-3 pt-4 border-t">
                  <h4 className="font-semibold text-sm text-muted-foreground">{t('presenter.belongsTo')}</h4>
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('partner.type')}</span>
                      <span>{getPartnerTypeLabel(memberInfo.partner.partner_type)}</span>
                    </div>
                    {(memberInfo.partner.partner_organizers?.[0]?.company_name || 
                      memberInfo.partner.partner_agencies?.[0]?.company_name) && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('partner.companyName')}</span>
                        <span>
                          {memberInfo.partner.partner_organizers?.[0]?.company_name || 
                           memberInfo.partner.partner_agencies?.[0]?.company_name}
                        </span>
                      </div>
                    )}
                    {memberInfo.partner.profile?.display_name && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('partner.displayName')}</span>
                        <span>{memberInfo.partner.profile.display_name}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('partner.representative')}</span>
                      <span>{memberInfo.partner.representative_name || '-'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {t('error.loadFailed')}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMemberInfoDialog(false)}>
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

