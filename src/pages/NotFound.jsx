import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Home, ArrowLeft, Search } from 'lucide-react'

/**
 * 404 Not Found 페이지
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="text-center max-w-md">
        {/* 404 숫자 */}
        <div className="relative mb-8">
          <h1 className="text-[150px] sm:text-[200px] font-bold text-muted-foreground/10 leading-none select-none">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
              <Search className="h-10 w-10 text-white" />
            </div>
          </div>
        </div>

        {/* 메시지 */}
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">
          페이지를 찾을 수 없습니다
        </h2>
        <p className="text-muted-foreground mb-8">
          요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
          <br />
          URL을 확인하시거나 아래 버튼을 이용해주세요.
        </p>

        {/* 버튼 */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => window.history.back()} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            이전 페이지
          </Button>
          <Link to="/">
            <Button className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600">
              <Home className="h-4 w-4 mr-2" />
              홈으로 이동
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

