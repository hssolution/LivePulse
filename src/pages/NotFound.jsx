import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Home, ArrowLeft, Search } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'

/**
 * 404 Not Found 페이지
 */
export default function NotFound() {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="text-center max-w-md">
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

        <h2 className="text-2xl sm:text-3xl font-bold mb-4">
          {t('notFound.title')}
        </h2>
        <p className="text-muted-foreground mb-8">
          {t('notFound.descLine1')}
          <br />
          {t('notFound.descLine2')}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => window.history.back()} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('notFound.back')}
          </Button>
          <Link to="/">
            <Button className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600">
              <Home className="h-4 w-4 mr-2" />
              {t('notFound.goHome')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

