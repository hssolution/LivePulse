import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollText } from "lucide-react"

export default function Logs() {
  return (
    <div className="h-full flex flex-col p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 md:mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">로그 관리</h2>
          <p className="text-sm text-muted-foreground mt-1">
            시스템 &gt; 로그 관리
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ScrollText className="h-5 w-5" />
              <CardTitle>시스템 로그</CardTitle>
            </div>
            <CardDescription>
              시스템의 모든 로그를 확인하고 관리할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              로그 목록이 표시될 영역입니다.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
