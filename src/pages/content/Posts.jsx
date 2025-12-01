import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText } from "lucide-react"

export default function Posts() {
  return (
    <div className="h-full flex flex-col p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 md:mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">게시글 관리</h2>
          <p className="text-sm text-muted-foreground mt-1">
            콘텐츠 관리 &gt; 게시글 관리
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <CardTitle>게시글 목록</CardTitle>
          </div>
          <CardDescription>
            시스템의 모든 게시글을 관리할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            게시글 목록이 표시될 영역입니다.
          </p>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}

