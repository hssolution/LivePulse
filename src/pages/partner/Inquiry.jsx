import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  Plus,
  Loader2, 
  Search,
  MessagesSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  Send
} from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

/**
 * 파트너 1:1 문의 페이지
 */
export default function Inquiry() {
  const { user, profile } = useAuth()
  const { t, language } = useLanguage()
  
  const [loading, setLoading] = useState(true)
  const [inquiries, setInquiries] = useState([])
  const [partnerId, setPartnerId] = useState(null)
  
  // 새 문의 다이얼로그
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [newInquiry, setNewInquiry] = useState({
    category: 'general',
    title: '',
    content: ''
  })
  const [submitting, setSubmitting] = useState(false)
  
  // 상세 보기 다이얼로그
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [selectedInquiry, setSelectedInquiry] = useState(null)
  const [replies, setReplies] = useState([])
  const [newReply, setNewReply] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingReplies, setLoadingReplies] = useState(false)

  /**
   * 파트너 ID 로드
   */
  useEffect(() => {
    const loadPartnerId = async () => {
      if (!user) return
      
      const { data } = await supabase
        .from('partners')
        .select('id')
        .eq('profile_id', user.id)
        .single()
      
      if (data) {
        setPartnerId(data.id)
      }
    }
    
    loadPartnerId()
  }, [user])

  /**
   * 문의 목록 로드
   */
  const loadInquiries = useCallback(async () => {
    if (!partnerId) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('inquiries')
        .select('*')
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setInquiries(data || [])
    } catch (error) {
      console.error('Error loading inquiries:', error)
      toast.error(t('error.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [partnerId, t])

  useEffect(() => {
    if (partnerId) {
      loadInquiries()
    }
  }, [partnerId, loadInquiries])

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
   * 새 문의 등록
   */
  const handleSubmitInquiry = async () => {
    if (!newInquiry.title.trim() || !newInquiry.content.trim()) {
      toast.error(t('error.requiredFields'))
      return
    }
    
    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('inquiries')
        .insert({
          partner_id: partnerId,
          category: newInquiry.category,
          title: newInquiry.title.trim(),
          content: newInquiry.content.trim()
        })
      
      if (error) throw error
      
      toast.success(t('inquiry.submitted'))
      setShowNewDialog(false)
      setNewInquiry({ category: 'general', title: '', content: '' })
      loadInquiries()
    } catch (error) {
      console.error('Error submitting inquiry:', error)
      toast.error(t('error.saveFailed'))
    } finally {
      setSubmitting(false)
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
      const { error } = await supabase
        .from('inquiry_replies')
        .insert({
          inquiry_id: selectedInquiry.id,
          user_id: user.id,
          content: newReply.trim(),
          is_admin: false
        })
      
      if (error) throw error
      
      setNewReply('')
      loadReplies(selectedInquiry.id)
      toast.success(t('inquiry.replySent'))
    } catch (error) {
      console.error('Error sending reply:', error)
      toast.error(t('error.saveFailed'))
    } finally {
      setSending(false)
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
   * 카테고리 라벨
   */
  const getCategoryLabel = (category) => {
    const labels = {
      general: t('inquiry.categoryGeneral'),
      technical: t('inquiry.categoryTechnical'),
      billing: t('inquiry.categoryBilling'),
      etc: t('inquiry.categoryEtc'),
    }
    return labels[category] || category
  }

  const categories = [
    { id: 'general', label: t('inquiry.categoryGeneral') },
    { id: 'technical', label: t('inquiry.categoryTechnical') },
    { id: 'billing', label: t('inquiry.categoryBilling') },
    { id: 'etc', label: t('inquiry.categoryEtc') },
  ]

  return (
    <div className="h-full flex flex-col p-4 md:p-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('inquiry.title')}</h2>
          <p className="text-muted-foreground mt-1">{t('inquiry.desc')}</p>
        </div>
        <Button onClick={() => setShowNewDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('inquiry.create')}
        </Button>
      </div>

      {/* 문의 목록 */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : inquiries.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <MessagesSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">{t('inquiry.noInquiries')}</p>
              <Button variant="outline" className="mt-4" onClick={() => setShowNewDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('inquiry.createFirst')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {inquiries.map((inquiry) => (
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
                        <Badge variant="secondary">{getCategoryLabel(inquiry.category)}</Badge>
                      </div>
                      
                      <p className="font-medium">{inquiry.title}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {inquiry.content}
                      </p>
                      
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
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

      {/* 새 문의 다이얼로그 */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('inquiry.create')}</DialogTitle>
            <DialogDescription>{t('inquiry.createDesc')}</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* 카테고리 */}
            <div className="space-y-2">
              <Label>{t('inquiry.category')}</Label>
              <Select
                value={newInquiry.category}
                onValueChange={(value) => setNewInquiry({ ...newInquiry, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* 제목 */}
            <div className="space-y-2">
              <Label>{t('inquiry.titleLabel')}</Label>
              <Input
                value={newInquiry.title}
                onChange={(e) => setNewInquiry({ ...newInquiry, title: e.target.value })}
                placeholder={t('inquiry.titlePlaceholder')}
              />
            </div>
            
            {/* 내용 */}
            <div className="space-y-2">
              <Label>{t('inquiry.content')}</Label>
              <Textarea
                value={newInquiry.content}
                onChange={(e) => setNewInquiry({ ...newInquiry, content: e.target.value })}
                placeholder={t('inquiry.contentPlaceholder')}
                rows={5}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSubmitInquiry} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t('inquiry.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 상세 보기 다이얼로그 */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-2">
              {selectedInquiry && getStatusBadge(selectedInquiry.status)}
              <Badge variant="secondary">
                {selectedInquiry && getCategoryLabel(selectedInquiry.category)}
              </Badge>
            </div>
            <DialogTitle className="mt-2">{selectedInquiry?.title}</DialogTitle>
            <DialogDescription>
              {selectedInquiry && format(new Date(selectedInquiry.created_at), 'yyyy.MM.dd HH:mm')}
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
                        {reply.is_admin ? t('inquiry.adminReply') : t('inquiry.myReply')}
                      </span>
                      <span>·</span>
                      <span>{format(new Date(reply.created_at), 'yyyy.MM.dd HH:mm')}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm">{reply.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">{t('inquiry.noReplies')}</p>
            )}
          </div>
          
          {/* 추가 문의 입력 */}
          {selectedInquiry?.status !== 'resolved' && (
            <div className="border-t pt-4">
              <div className="flex gap-2">
                <Textarea
                  value={newReply}
                  onChange={(e) => setNewReply(e.target.value)}
                  placeholder={t('inquiry.additionalPlaceholder')}
                  rows={2}
                  className="flex-1"
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
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

