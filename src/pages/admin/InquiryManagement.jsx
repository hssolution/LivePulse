import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  MessagesSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
  Building2,
  Briefcase,
  Mic,
  User
} from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

/**
 * 관리자 1:1 문의 관리 페이지
 */
export default function InquiryManagement() {
  const { user } = useAuth()
  const { t, language } = useLanguage()
  
  const [loading, setLoading] = useState(true)
  const [inquiries, setInquiries] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  // 상세 보기 다이얼로그
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [selectedInquiry, setSelectedInquiry] = useState(null)
  const [replies, setReplies] = useState([])
  const [newReply, setNewReply] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingReplies, setLoadingReplies] = useState(false)

  /**
   * 문의 목록 로드
   */
  const loadInquiries = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('inquiries')
        .select(`
          *,
          partner:partners(
            id, 
            partner_type, 
            representative_name,
            profile:profiles(email)
          )
        `)
        .order('created_at', { ascending: false })
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      setInquiries(data || [])
    } catch (error) {
      console.error('Error loading inquiries:', error)
      toast.error(t('error.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [statusFilter, t])

  useEffect(() => {
    loadInquiries()
  }, [loadInquiries])

  /**
   * 답변 로드
   */
  const loadReplies = async (inquiryId) => {
    setLoadingReplies(true)
    try {
      const { data, error } = await supabase
        .from('inquiry_replies')
        .select(`
          *,
          user:profiles(email, display_name)
        `)
        .eq('inquiry_id', inquiryId)
        .order('created_at', { ascending: true })
      
      if (error) throw error
      setReplies(data || [])
    } catch (error) {
      console.error('Error loading replies:', error)
    } finally {
      setLoadingReplies(false)
    }
  }

  /**
   * 상세 보기 열기
   */
  const openDetail = (inquiry) => {
    setSelectedInquiry(inquiry)
    setNewReply('')
    setShowDetailDialog(true)
    loadReplies(inquiry.id)
  }

  /**
   * 답변 전송
   */
  const handleSendReply = async () => {
    if (!newReply.trim()) return
    
    setSending(true)
    try {
      // 답변 등록
      const { error: replyError } = await supabase
        .from('inquiry_replies')
        .insert({
          inquiry_id: selectedInquiry.id,
          user_id: user.id,
          content: newReply.trim(),
          is_admin: true
        })
      
      if (replyError) throw replyError
      
      // 상태 업데이트 (처리중으로)
      if (selectedInquiry.status === 'pending') {
        await supabase
          .from('inquiries')
          .update({ status: 'in_progress' })
          .eq('id', selectedInquiry.id)
        
        setSelectedInquiry({ ...selectedInquiry, status: 'in_progress' })
      }
      
      setNewReply('')
      loadReplies(selectedInquiry.id)
      loadInquiries()
      toast.success(t('inquiry.replySent'))
    } catch (error) {
      console.error('Error sending reply:', error)
      toast.error(t('error.saveFailed'))
    } finally {
      setSending(false)
    }
  }

  /**
   * 상태 변경
   */
  const handleStatusChange = async (status) => {
    try {
      const { error } = await supabase
        .from('inquiries')
        .update({ status })
        .eq('id', selectedInquiry.id)
      
      if (error) throw error
      
      setSelectedInquiry({ ...selectedInquiry, status })
      loadInquiries()
      toast.success(t('inquiry.statusUpdated'))
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error(t('error.updateFailed'))
    }
  }

  /**
   * 상태 배지
   */
  const getStatusBadge = (status) => {
    const config = {
      pending: { 
        label: t('inquiry.statusPending'), 
        className: 'bg-yellow-500/10 text-yellow-600',
        icon: Clock
      },
      in_progress: { 
        label: t('inquiry.statusInProgress'), 
        className: 'bg-blue-500/10 text-blue-600',
        icon: AlertCircle
      },
      resolved: { 
        label: t('inquiry.statusResolved'), 
        className: 'bg-green-500/10 text-green-600',
        icon: CheckCircle
      },
    }
    const c = config[status] || config.pending
    const Icon = c.icon
    return (
      <Badge variant="outline" className={c.className}>
        <Icon className="h-3 w-3 mr-1" />
        {c.label}
      </Badge>
    )
  }

  /**
   * 파트너 타입 아이콘
   */
  const getPartnerTypeIcon = (type) => {
    switch (type) {
      case 'organizer': return <Briefcase className="h-4 w-4" />
      case 'agency': return <Building2 className="h-4 w-4" />
      case 'instructor': return <Mic className="h-4 w-4" />
      default: return <User className="h-4 w-4" />
    }
  }

  // 검색 필터링
  const filteredInquiries = inquiries.filter(inquiry => 
    inquiry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inquiry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inquiry.partner?.representative_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // 통계
  const stats = {
    total: inquiries.length,
    pending: inquiries.filter(i => i.status === 'pending').length,
    in_progress: inquiries.filter(i => i.status === 'in_progress').length,
    resolved: inquiries.filter(i => i.status === 'resolved').length,
  }

  return (
    <div className="h-full flex flex-col p-4 md:p-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('inquiry.management')}</h2>
          <p className="text-muted-foreground mt-1">{t('inquiry.managementDesc')}</p>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card 
          className={`cursor-pointer transition-all ${statusFilter === 'all' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t('common.all')}</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all ${statusFilter === 'pending' ? 'ring-2 ring-yellow-500' : ''}`}
          onClick={() => setStatusFilter('pending')}
        >
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t('inquiry.statusPending')}</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all ${statusFilter === 'in_progress' ? 'ring-2 ring-blue-500' : ''}`}
          onClick={() => setStatusFilter('in_progress')}
        >
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t('inquiry.statusInProgress')}</p>
            <p className="text-2xl font-bold text-blue-600">{stats.in_progress}</p>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all ${statusFilter === 'resolved' ? 'ring-2 ring-green-500' : ''}`}
          onClick={() => setStatusFilter('resolved')}
        >
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t('inquiry.statusResolved')}</p>
            <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
          </CardContent>
        </Card>
      </div>

      {/* 검색 */}
      <div className="relative mb-4 w-full sm:w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('common.search')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* 문의 목록 */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filteredInquiries.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <MessagesSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">{t('inquiry.noInquiries')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredInquiries.map((inquiry) => (
              <Card 
                key={inquiry.id} 
                className="cursor-pointer hover:border-primary/50 transition-all"
                onClick={() => openDetail(inquiry)}
              >
                <CardContent className="pt-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {getStatusBadge(inquiry.status)}
                        <Badge variant="outline" className="gap-1">
                          {getPartnerTypeIcon(inquiry.partner?.partner_type)}
                          {t(`partner.type${inquiry.partner?.partner_type?.charAt(0).toUpperCase()}${inquiry.partner?.partner_type?.slice(1)}`)}
                        </Badge>
                      </div>
                      
                      <p className="font-medium">{inquiry.title}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {inquiry.content}
                      </p>
                      
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>{inquiry.partner?.representative_name}</span>
                        <span>·</span>
                        <span>{inquiry.partner?.profile?.email}</span>
                        <span>·</span>
                        <span>{format(new Date(inquiry.created_at), 'yyyy.MM.dd HH:mm', { locale: language === 'ko' ? ko : undefined })}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 상세 보기 다이얼로그 */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-2">
              {selectedInquiry && getStatusBadge(selectedInquiry.status)}
              <Badge variant="outline" className="gap-1">
                {selectedInquiry && getPartnerTypeIcon(selectedInquiry.partner?.partner_type)}
                {selectedInquiry && t(`partner.type${selectedInquiry.partner?.partner_type?.charAt(0).toUpperCase()}${selectedInquiry.partner?.partner_type?.slice(1)}`)}
              </Badge>
            </div>
            <DialogTitle className="mt-2">{selectedInquiry?.title}</DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              <span>{selectedInquiry?.partner?.representative_name}</span>
              <span>·</span>
              <span>{selectedInquiry?.partner?.profile?.email}</span>
              <span>·</span>
              <span>{selectedInquiry && format(new Date(selectedInquiry.created_at), 'yyyy.MM.dd HH:mm')}</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto space-y-4 py-4">
            {/* 원본 문의 */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="whitespace-pre-wrap">{selectedInquiry?.content}</p>
            </div>
            
            {/* 답변 목록 */}
            {loadingReplies ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : replies.length > 0 ? (
              <div className="space-y-3">
                {replies.map((reply) => (
                  <div 
                    key={reply.id} 
                    className={`p-4 rounded-lg ${reply.is_admin 
                      ? 'bg-primary/10 border-l-4 border-primary ml-4' 
                      : 'bg-muted/50 mr-4'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                      <span className="font-medium">
                        {reply.is_admin ? t('inquiry.adminReply') : reply.user?.display_name || reply.user?.email}
                      </span>
                      <span>·</span>
                      <span>{format(new Date(reply.created_at), 'yyyy.MM.dd HH:mm')}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm">{reply.content}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          
          {/* 상태 변경 & 답변 입력 */}
          <div className="border-t pt-4 space-y-4">
            {/* 상태 변경 */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">{t('inquiry.changeStatus')}</span>
              <Select
                value={selectedInquiry?.status}
                onValueChange={handleStatusChange}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">{t('inquiry.statusPending')}</SelectItem>
                  <SelectItem value="in_progress">{t('inquiry.statusInProgress')}</SelectItem>
                  <SelectItem value="resolved">{t('inquiry.statusResolved')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* 답변 입력 */}
            <div className="flex gap-2 items-end">
              <Textarea
                value={newReply}
                onChange={(e) => setNewReply(e.target.value)}
                placeholder={t('inquiry.replyPlaceholder')}
                rows={10}
                className="flex-1 min-h-[240px]"
              />
              <Button 
                onClick={handleSendReply} 
                disabled={sending || !newReply.trim()}
                className="self-end"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

