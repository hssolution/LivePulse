import { useCallback, useEffect, useState } from 'react'
import { Globe, Lock, Loader2, Save, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$/

/**
 * 내 강사 공개 프로필 설정 (029) — 공개 여부(기본 비공개)·공개 주소·이름·직함·소개.
 * 본인 계정의 강사 프로필만 다룬다. 프로필이 없으면 allowCreate 일 때만 만들기 폼을 보인다.
 * 공개 페이지에는 이메일·전화번호가 나오지 않는다(소개글에 적어도 서버가 가린다).
 */
export default function InstructorPublicSettings({ allowCreate = false }) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({ is_public: false, slug: '', display_name: '', title: '', bio: '' })

  const apply = (p) => {
    setProfile(p)
    setForm({
      is_public: !!p?.is_public,
      slug: p?.slug || '',
      display_name: p?.display_name || '',
      title: p?.title || '',
      bio: p?.bio || '',
    })
  }

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.rpc('sp_my_instructor_profile_q')
    if (!error && data?.success) apply(data.profile)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const slug = form.slug.trim().toLowerCase()
  const slugInvalid = slug !== '' && (!SLUG_RE.test(slug) || slug.includes('--'))

  const save = async (override = {}) => {
    const next = { ...form, ...override }
    const nextSlug = next.slug.trim().toLowerCase()
    if (nextSlug && (!SLUG_RE.test(nextSlug) || nextSlug.includes('--'))) {
      toast.error(t('instructor.public.slugInvalid', '주소는 영문 소문자·숫자·하이픈 3~40자로 적어 주세요'))
      return
    }
    setSaving(true)
    const { data, error } = await supabase.rpc('sp_my_instructor_public_s', {
      p_is_public: next.is_public,
      p_slug: nextSlug || null,
      p_display_name: next.display_name,
      p_title: next.title,
      p_bio: next.bio,
    })
    setSaving(false)
    if (error || !data?.success) {
      const code = data?.error
      toast.error(
        code === 'slug_taken'
          ? t('instructor.public.slugTaken', '이미 쓰는 주소입니다. 다른 주소를 적어 주세요')
          : code === 'invalid_slug'
            ? t('instructor.public.slugInvalid', '주소는 영문 소문자·숫자·하이픈 3~40자로 적어 주세요')
            : t('instructor.public.saveFailed', '저장하지 못했습니다')
      )
      return
    }
    apply(data.profile)
    toast.success(
      data.profile?.is_public
        ? t('instructor.public.savedPublic', '공개 프로필을 저장했습니다')
        : t('instructor.public.savedPrivate', '비공개로 저장했습니다')
    )
  }

  if (loading) return null
  if (!profile && !allowCreate) return null

  const publicPath = profile ? `/instructors/${profile.slug || profile.id}` : null

  return (
    <Card data-testid="instructor-public-settings">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {form.is_public ? <Globe className="h-5 w-5 text-emerald-600" /> : <Lock className="h-5 w-5" />}
          {t('instructor.public.title', '강사 공개 프로필')}
        </CardTitle>
        <CardDescription>
          {t('instructor.public.desc', '켜면 누구나 공개 주소에서 내 프로필·누적 평점·진행한 공개 행사를 볼 수 있습니다. 이메일·전화번호는 보이지 않습니다.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/50">
          <div>
            <p className="font-medium">{t('instructor.public.toggle', '프로필 공개에 동의합니다')}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {form.is_public
                ? t('instructor.public.isPublic', '지금 공개 중입니다')
                : t('instructor.public.isPrivate', '지금 비공개입니다(기본)')}
            </p>
          </div>
          <Switch
            checked={form.is_public}
            disabled={saving}
            onCheckedChange={(v) => {
              setForm((f) => ({ ...f, is_public: v }))
              save({ is_public: v })
            }}
            aria-label={t('instructor.public.toggle', '프로필 공개에 동의합니다')}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ip-name">{t('instructor.public.name', '이름(활동명)')}</Label>
            <Input id="ip-name" value={form.display_name} maxLength={100}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ip-title">{t('instructor.public.jobTitle', '직함·전문 분야')}</Label>
            <Input id="ip-title" value={form.title} maxLength={200}
              onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="ip-slug">{t('instructor.public.slug', '공개 주소')}</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground shrink-0">/instructors/</span>
              <Input id="ip-slug" value={form.slug} maxLength={40} placeholder={profile?.id || 'my-name'}
                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })} />
            </div>
            {slugInvalid && (
              <p className="text-xs text-destructive">
                {t('instructor.public.slugInvalid', '주소는 영문 소문자·숫자·하이픈 3~40자로 적어 주세요')}
              </p>
            )}
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="ip-bio">{t('instructor.public.bio', '소개')}</Label>
            <Textarea id="ip-bio" rows={4} value={form.bio} maxLength={5000}
              onChange={(e) => setForm({ ...form, bio: e.target.value })} />
            <p className="text-xs text-muted-foreground">
              {t('instructor.public.bioNote', '소개에 이메일·전화번호를 적어도 공개 페이지에서는 [비공개]로 가려집니다')}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          {publicPath ? (
            <a href={publicPath} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:underline">
              <ExternalLink className="h-4 w-4" />
              {form.is_public
                ? t('instructor.public.open', '공개 페이지 열기')
                : t('instructor.public.preview', '미리보기(나만 보임)')}
            </a>
          ) : <span />}
          <Button onClick={() => save()} disabled={saving || slugInvalid}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            {t('common.save', '저장')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
