import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import { 
  Users, 
  UserPlus, 
  Mail, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Trash2,
  Shield,
  Crown,
  User,
  Copy,
  RefreshCw,
  Loader2
} from "lucide-react"

/**
 * 팀원 관리 페이지 (파트너용)
 * - 팀원 목록 조회
 * - 팀원 초대 (이메일)
 * - 역할 변경 (owner/admin/member)
 * - 팀원 삭제
 */
export default function TeamMembers() {
  const { user, profile } = useAuth()
  const { t, currentLanguage } = useLanguage()
  
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState([])
  const [partner, setPartner] = useState(null)
  const [myRole, setMyRole] = useState(null)
  
  // 초대 다이얼로그
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [inviting, setInviting] = useState(false)
  
  // 역할 변경 다이얼로그
  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState(null)
  const [newRole, setNewRole] = useState('')
  const [updatingRole, setUpdatingRole] = useState(false)
  
  // 삭제 다이얼로그
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [memberToDelete, setMemberToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadData()
  }, [user])

  /**
   * 파트너 정보 및 팀원 목록 로드
   */
  const loadData = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      // 내 파트너 정보 조회 (이메일 발송을 위해 회사명 등 포함)
      const { data: partnerData, error: partnerError } = await supabase
        .from('partners')
        .select('*, partner_organizers(*), partner_agencies(*)')
        .eq('profile_id', user.id)
        .single()
      
      if (partnerError) {
        if (partnerError.code === 'PGRST116') {
          // 파트너가 아닌 경우
          setPartner(null)
          setLoading(false)
          return
        }
        throw partnerError
      }
      
      setPartner(partnerData)
      
      // 팀원 목록 조회 (profiles 조인 제거)
      const { data: membersData, error: membersError } = await supabase
        .from('partner_members')
        .select('*')
        .eq('partner_id', partnerData.id)
        .order('role', { ascending: true })
        .order('created_at', { ascending: true })
      
      if (membersError) throw membersError
      
      // user_id로 profiles 정보 및 마지막 로그인 시간 매핑 (user_id가 있는 멤버만)
      const userIds = membersData?.filter(m => m.user_id).map(m => m.user_id) || []
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, email, display_name')
          .in('id', userIds)
        
        // 마지막 로그인 시간 조회
        const { data: loginLogsData, error: loginLogsError } = await supabase
          .from('login_logs')
          .select('user_id, created_at')
          .in('user_id', userIds)
          .eq('event_type', 'login_success')
          .order('created_at', { ascending: false })
        
        console.log('🔍 [TeamMembers] Login logs query:', { userIds, loginLogsData, loginLogsError })
        
        // 사용자별 마지막 로그인 시간 매핑 (첫 번째 레코드가 최신)
        const lastLoginMap = {}
        loginLogsData?.forEach(log => {
          if (!lastLoginMap[log.user_id]) {
            lastLoginMap[log.user_id] = log.created_at
          }
        })
        
        const profileMap = {}
        profilesData?.forEach(p => {
          profileMap[p.id] = { email: p.email, display_name: p.display_name }
        })
        
        // 멤버에 프로필 정보 및 마지막 로그인 시간 매핑
        membersData?.forEach(m => {
          if (m.user_id && profileMap[m.user_id]) {
            m.profileEmail = profileMap[m.user_id].email
            m.displayName = profileMap[m.user_id].display_name
          }
          if (m.user_id && lastLoginMap[m.user_id]) {
            m.lastLoginAt = lastLoginMap[m.user_id]
          }
        })
      }
      
      setMembers(membersData || [])
      
      // 내 역할 확인
      const myMember = membersData?.find(m => m.user_id === user.id)
      setMyRole(myMember?.role || null)
      
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error(t('error.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  /**
   * 파트너 이름 가져오기
   */
  const getPartnerName = () => {
    if (partner?.partner_type === 'organizer') {
      return partner.partner_organizers?.[0]?.company_name || partner.representative_name
    } else if (partner?.partner_type === 'agency') {
      return partner.partner_agencies?.[0]?.company_name || partner.representative_name
    }
    return partner?.representative_name || 'Team'
  }

  /**
   * 팀원 초대
   */
  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error(t('error.emailRequired'))
      return
    }
    
    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(inviteEmail)) {
      toast.error(t('error.invalidEmail'))
      return
    }
    
    // 이미 초대된 이메일인지 확인
    if (members.some(m => m.email === inviteEmail)) {
      toast.error(t('team.alreadyInvited'))
      return
    }
    
    setInviting(true)
    try {
      // 초대 토큰 생성
      const { data: tokenData, error: tokenError } = await supabase
        .rpc('generate_invite_token')
      
      if (tokenError) throw tokenError
      
      // 팀원 초대 추가
      const { error: insertError } = await supabase
        .from('partner_members')
        .insert({
          partner_id: partner.id,
          email: inviteEmail,
          role: inviteRole,
          invite_token: tokenData,
          status: 'pending'
        })
      
      if (insertError) throw insertError
      
      // 초대 이메일 발송 (Edge Function 호출)
      try {
        const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-invite-email', {
          body: {
            to: inviteEmail,
            inviteToken: tokenData,
            partnerName: getPartnerName(),
            inviterName: profile?.displayName || profile?.email || user?.email,
            role: inviteRole,
            language: currentLanguage
          }
        })
        
        if (emailError) {
          console.warn('Email sending failed:', emailError)
          // 이메일 발송 실패해도 초대는 성공으로 처리 (링크 복사로 대체 가능)
          toast.success(t('team.inviteSentNoEmail'))
        } else {
          toast.success(t('team.inviteSentWithEmail'))
        }
      } catch (emailErr) {
        console.warn('Email sending error:', emailErr)
        toast.success(t('team.inviteSentNoEmail'))
      }
      
      setInviteOpen(false)
      setInviteEmail('')
      setInviteRole('member')
      loadData()
      
    } catch (error) {
      console.error('Error inviting member:', error)
      toast.error(t('error.inviteFailed'))
    } finally {
      setInviting(false)
    }
  }

  /**
   * 역할 변경
   */
  const handleRoleChange = async () => {
    if (!selectedMember || !newRole) return
    
    // owner는 변경 불가
    if (selectedMember.role === 'owner') {
      toast.error(t('team.cannotChangeOwner'))
      return
    }
    
    setUpdatingRole(true)
    try {
      const { error } = await supabase
        .from('partner_members')
        .update({ role: newRole })
        .eq('id', selectedMember.id)
      
      if (error) throw error
      
      toast.success(t('team.roleChanged'))
      setRoleDialogOpen(false)
      setSelectedMember(null)
      setNewRole('')
      loadData()
      
    } catch (error) {
      console.error('Error changing role:', error)
      toast.error(t('error.updateFailed'))
    } finally {
      setUpdatingRole(false)
    }
  }

  /**
   * 팀원 삭제
   */
  const handleDelete = async () => {
    if (!memberToDelete) return
    
    // owner는 삭제 불가
    if (memberToDelete.role === 'owner') {
      toast.error(t('team.cannotDeleteOwner'))
      return
    }
    
    setDeleting(true)
    try {
      const { error } = await supabase
        .from('partner_members')
        .delete()
        .eq('id', memberToDelete.id)
      
      if (error) throw error
      
      toast.success(t('team.memberRemoved'))
      setDeleteDialogOpen(false)
      setMemberToDelete(null)
      loadData()
      
    } catch (error) {
      console.error('Error deleting member:', error)
      toast.error(t('error.deleteFailed'))
    } finally {
      setDeleting(false)
    }
  }

  /**
   * 초대 링크 복사
   */
  const copyInviteLink = (token) => {
    const link = `${window.location.origin}/invite/${token}`
    navigator.clipboard.writeText(link)
    toast.success(t('team.linkCopied'))
  }

  /**
   * 역할 아이콘
   */
  const getRoleIcon = (role) => {
    switch (role) {
      case 'owner': return <Crown className="h-4 w-4 text-yellow-500" />
      case 'admin': return <Shield className="h-4 w-4 text-blue-500" />
      default: return <User className="h-4 w-4 text-muted-foreground" />
    }
  }

  /**
   * 역할 배지
   */
  const getRoleBadge = (role) => {
    switch (role) {
      case 'owner':
        return <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">{t('team.owner')}</Badge>
      case 'admin':
        return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400">{t('team.admin')}</Badge>
      default:
        return <Badge variant="secondary">{t('team.member')}</Badge>
    }
  }

  /**
   * 상태 배지
   */
  const getStatusBadge = (status) => {
    switch (status) {
      case 'accepted':
        return <Badge className="bg-green-500/10 text-green-600 dark:text-green-400">{t('team.accepted')}</Badge>
      case 'rejected':
        return <Badge className="bg-red-500/10 text-red-600 dark:text-red-400">{t('team.rejected')}</Badge>
      default:
        return <Badge className="bg-orange-500/10 text-orange-600 dark:text-orange-400">{t('team.pending')}</Badge>
    }
  }

  /**
   * 마지막 로그인 시간 포맷팅
   */
  const formatLastLogin = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return t('team.justNow')
    if (diffMins < 60) return t('team.minutesAgo', { count: diffMins })
    if (diffHours < 24) return t('team.hoursAgo', { count: diffHours })
    if (diffDays < 7) return t('team.daysAgo', { count: diffDays })
    return date.toLocaleDateString()
  }

  // 관리 권한 확인 (owner 또는 admin)
  const canManage = myRole === 'owner' || myRole === 'admin'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // 강사 타입은 팀원 관리 불가
  if (partner?.partner_type === 'instructor') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t('team.title')}</h1>
          <p className="text-muted-foreground">{t('team.description')}</p>
        </div>
        
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              {t('team.instructorNotAllowed')}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!partner) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t('team.title')}</h1>
          <p className="text-muted-foreground">{t('team.description')}</p>
        </div>
        
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              {t('team.notPartner')}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('team.title')}</h1>
          <p className="text-muted-foreground">{t('team.description')}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={loadData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          
          {canManage && (
            <Button onClick={() => setInviteOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              {t('team.invite')}
            </Button>
          )}
        </div>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{members.length}</p>
                <p className="text-xs text-muted-foreground">{t('team.totalMembers')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{members.filter(m => m.status === 'accepted').length}</p>
                <p className="text-xs text-muted-foreground">{t('team.activeMembers')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Clock className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{members.filter(m => m.status === 'pending').length}</p>
                <p className="text-xs text-muted-foreground">{t('team.pendingInvites')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Shield className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{members.filter(m => m.role === 'admin').length}</p>
                <p className="text-xs text-muted-foreground">{t('team.admins')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 팀원 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>{t('team.memberList')}</CardTitle>
          <CardDescription>{t('team.memberListDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t('team.noMembers')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('team.email')}</TableHead>
                    <TableHead>{t('common.displayName')}</TableHead>
                    <TableHead>{t('team.role')}</TableHead>
                    <TableHead>{t('team.status')}</TableHead>
                    <TableHead>{t('team.lastLogin')}</TableHead>
                    <TableHead>{t('team.invitedAt')}</TableHead>
                    {canManage && <TableHead className="text-right">{t('common.actions')}</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id} className="odd:bg-muted/50 hover:bg-primary/10">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getRoleIcon(member.role)}
                          <span>{member.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {member.displayName || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>{getRoleBadge(member.role)}</TableCell>
                      <TableCell>{getStatusBadge(member.status)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {member.lastLoginAt ? (
                          formatLastLogin(member.lastLoginAt)
                        ) : (
                          <span className="text-muted-foreground/50">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(member.invited_at).toLocaleDateString()}
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* 대기 중인 초대는 링크 복사 가능 */}
                            {member.status === 'pending' && member.invite_token && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => copyInviteLink(member.invite_token)}
                                title={t('team.copyLink')}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            )}
                            
                            {/* owner가 아닌 경우 역할 변경 가능 */}
                            {member.role !== 'owner' && member.status === 'accepted' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedMember(member)
                                  setNewRole(member.role)
                                  setRoleDialogOpen(true)
                                }}
                                title={t('team.changeRole')}
                              >
                                <Shield className="h-4 w-4" />
                              </Button>
                            )}
                            
                            {/* owner가 아닌 경우 삭제 가능 */}
                            {member.role !== 'owner' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setMemberToDelete(member)
                                  setDeleteDialogOpen(true)
                                }}
                                title={t('common.delete')}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 초대 다이얼로그 */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('team.inviteMember')}</DialogTitle>
            <DialogDescription>{t('team.inviteDesc')}</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">{t('team.email')}</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="member@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="invite-role">{t('team.role')}</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">{t('team.admin')}</SelectItem>
                  <SelectItem value="member">{t('team.member')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleInvite} disabled={inviting}>
              {inviting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('common.processing')}
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  {t('team.sendInvite')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 역할 변경 다이얼로그 */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('team.changeRole')}</DialogTitle>
            <DialogDescription>
              {selectedMember?.email}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('team.newRole')}</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">{t('team.admin')}</SelectItem>
                  <SelectItem value="member">{t('team.member')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleRoleChange} disabled={updatingRole}>
              {updatingRole ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('common.processing')}
                </>
              ) : (
                t('common.save')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('team.removeMember')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('team.removeConfirm', { email: memberToDelete?.email })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('common.processing')}
                </>
              ) : (
                t('common.delete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

