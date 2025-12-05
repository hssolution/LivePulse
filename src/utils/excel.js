import * as XLSX from 'xlsx'
import { format } from 'date-fns'

/**
 * 데이터를 엑셀 파일로 내보내는 유틸리티
 * 
 * @param {Object} sheets - 시트 이름과 데이터 배열의 매핑 (예: { 'Participants': [...], 'Q&A': [...] })
 * @param {string} fileName - 파일명 (확장자 제외)
 */
export const exportToExcel = (sheets, fileName) => {
  // 1. 워크북 생성
  const wb = XLSX.utils.book_new()

  // 2. 시트 추가
  Object.entries(sheets).forEach(([sheetName, data]) => {
    let ws;
    
    if (!data || data.length === 0) {
      // 데이터가 없으면 안내 메시지가 담긴 시트 생성
      ws = XLSX.utils.json_to_sheet([{ "알림": "데이터가 없습니다." }])
    } else if (Array.isArray(data) && Array.isArray(data[0])) {
      // 데이터가 2차원 배열인 경우 (aoa_to_sheet 사용)
      ws = XLSX.utils.aoa_to_sheet(data)
      
      // 컬럼 너비 자동 조정 (대략적인 계산) - 첫 번째 행(헤더) 기준
      const colWidths = data[0].map(cell => ({
        wch: Math.max(String(cell).length * 2, 10) // 한글 고려해서 너비 조정
      }))
      ws['!cols'] = colWidths
    } else {
      // 데이터가 객체 배열인 경우 (json_to_sheet 사용)
      ws = XLSX.utils.json_to_sheet(data)
      
      // 컬럼 너비 자동 조정 (대략적인 계산)
      const colWidths = Object.keys(data[0] || {}).map(key => ({
        wch: Math.max(key.length * 2, 15) // 한글 고려해서 너비 조정
      }))
      ws['!cols'] = colWidths
    }

    // 시트 추가
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
  })

  // 3. 파일 저장
  const timestamp = format(new Date(), 'yyyyMMdd_HHmmss')
  XLSX.writeFile(wb, `${fileName}_${timestamp}.xlsx`)
}

