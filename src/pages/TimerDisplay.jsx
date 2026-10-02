import { useParams } from 'react-router-dom'
import { Loader2, Timer } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { useSessionTimer } from '@/hooks/useSessionTimer'
import TimerFace from '@/components/session/TimerFace'

/**
 * 발표 타이머 전용 화면 (028) — /timer/:code
 * 발표자 앞 모니터·별도 디스플레이용. 로그인 없이 열린다(송출 화면과 같음).
 * 송출 화면(/broadcast/:code)은 콘솔에서 «송출 화면에 타이머 띄우기»를 눌렀을 때만 타이머를 보여준다.
 */
export function TimerStage({ code, showTitle = true }) {
  const { t } = useLanguage()
  const { timer, remaining, title, error } = useSessionTimer(code)

  if (error === 'session_not_found') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0d0d14] text-slate-500">
        <Timer className="w-16 h-16 mb-4 opacity-40" />
        <p className="text-xl">{t('error.sessionNotFound', '세션을 찾을 수 없습니다')}</p>
      </div>
    )
  }
  if (!timer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0d14]">
        <Loader2 className="w-12 h-12 animate-spin text-slate-600" />
      </div>
    )
  }
  return <TimerFace remaining={remaining} warnSec={timer.warn_sec} running={timer.running} title={showTitle ? title : ''} size="full" />
}

export default function TimerDisplay() {
  const { code } = useParams()
  return <TimerStage code={code} />
}
