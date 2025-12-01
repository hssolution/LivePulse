import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

/**
 * 에러 바운더리 컴포넌트
 * React 컴포넌트 트리에서 발생하는 JavaScript 에러를 캐치하고
 * 사용자 친화적인 에러 화면을 표시합니다.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo })
    // 에러 로깅 서비스에 전송할 수 있음
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
              <CardTitle className="text-xl">문제가 발생했습니다</CardTitle>
              <CardDescription>
                예상치 못한 오류가 발생했습니다. 페이지를 새로고침하거나 홈으로 이동해주세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="p-3 rounded-lg bg-muted text-xs font-mono overflow-auto max-h-32">
                  {this.state.error.toString()}
                </div>
              )}
              <div className="flex gap-3">
                <Button onClick={this.handleReload} className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  새로고침
                </Button>
                <Button onClick={this.handleGoHome} variant="outline" className="flex-1">
                  <Home className="h-4 w-4 mr-2" />
                  홈으로
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary

