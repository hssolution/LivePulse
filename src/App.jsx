import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { LanguageProvider } from './context/LanguageContext'
import { PublicThemeProvider } from './context/PublicThemeContext'
import { AdminThemeProvider } from './context/AdminThemeContext'
import { PartnerProvider } from './context/PartnerContext'
import { AppInitProvider, useAppInit } from './context/AppInitContext'
import { Toaster } from './components/ui/sonner'
import ErrorBoundary from './components/ErrorBoundary'
import { PageLoading } from './components/ui/loading'
import InitialLoading from './components/ui/InitialLoading'

// Auth Components (not lazy - needed immediately)
import PublicRoute from './components/auth/PublicRoute'
import { AdminRoute } from './components/auth/AdminRoute'
import { PartnerRoute } from './components/auth/PartnerRoute'
import ViewAsBanner from './components/admin/ViewAsBanner'

// Lazy loaded pages
const Home = lazy(() => import('./pages/Home'))
const Lectures = lazy(() => import('./pages/Lectures'))
const Instructors = lazy(() => import('./pages/Instructors'))
const Agencies = lazy(() => import('./pages/Agencies'))
const Login = lazy(() => import('./pages/Login'))
const Signup = lazy(() => import('./pages/Signup'))
const ServicePage = lazy(() => import('./pages/ServicePage'))
const NotFound = lazy(() => import('./pages/NotFound'))
const MyPage = lazy(() => import('./pages/MyPage'))

// Admin Layout
const AdminLayout = lazy(() => import('./components/layout/AdminLayout'))

// Admin Pages
const Dashboard = lazy(() => import('./pages/admin/Dashboard'))
const UsersPage = lazy(() => import('./pages/admin/Users'))
const ProfileTest = lazy(() => import('./pages/admin/ProfileTest'))
const PartnerRequests = lazy(() => import('./pages/admin/PartnerRequests'))
const Partners = lazy(() => import('./pages/admin/Partners'))
const AdminSessions = lazy(() => import('./pages/admin/Sessions'))

// Content Management Pages
const Posts = lazy(() => import('./pages/content/Posts'))

// System Pages (Admin Only)
const Database = lazy(() => import('./pages/system/Database'))
const Logs = lazy(() => import('./pages/system/Logs'))
const LoginLogs = lazy(() => import('./pages/admin/LoginLogs'))
const Backup = lazy(() => import('./pages/system/Backup'))
const SessionTemplates = lazy(() => import('./pages/admin/SessionTemplates'))
const TemplatePreview = lazy(() => import('./pages/admin/TemplatePreview'))
const FaqManagement = lazy(() => import('./pages/admin/FaqManagement'))
const InquiryManagement = lazy(() => import('./pages/admin/InquiryManagement'))

// Common Pages (Admin & Partner)
const Profile = lazy(() => import('./pages/common/Profile'))
const Settings = lazy(() => import('./pages/common/Settings'))
const Support = lazy(() => import('./pages/common/Support'))

// Partner Pages
const PartnerDashboard = lazy(() => import('./pages/partner/PartnerDashboard'))
const PartnerProfile = lazy(() => import('./pages/partner/PartnerProfile'))
const TeamMembers = lazy(() => import('./pages/partner/TeamMembers'))
const Sessions = lazy(() => import('./pages/partner/Sessions'))
const SessionCreate = lazy(() => import('./pages/partner/SessionCreate'))
const SessionDetail = lazy(() => import('./pages/partner/SessionDetail'))
const SessionConsole = lazy(() => import('./pages/partner/SessionConsole'))
const SessionReport = lazy(() => import('./pages/partner/SessionReport'))
const Invitations = lazy(() => import('./pages/partner/Invitations'))
const PartnerFaq = lazy(() => import('./pages/partner/Faq'))
const PartnerInquiry = lazy(() => import('./pages/partner/Inquiry'))

// Legal Pages (Public)
const TermsOfService = lazy(() => import('./pages/legal/TermsOfService'))
const PrivacyPolicy = lazy(() => import('./pages/legal/PrivacyPolicy'))
const RefundPolicy = lazy(() => import('./pages/legal/RefundPolicy'))

// Invite Page
const InviteAccept = lazy(() => import('./pages/InviteAccept'))

// Session Pages (Public)
const JoinSession = lazy(() => import('./pages/JoinSession'))
const LiveSession = lazy(() => import('./pages/LiveSession'))
const PresenterQnA = lazy(() => import('./pages/PresenterQnA'))
const BroadcastQnA = lazy(() => import('./pages/BroadcastQnA'))
const SpeakerScreen = lazy(() => import('./pages/SpeakerScreen'))
const TemplatePreviewPublic = lazy(() => import('./pages/TemplatePreviewPublic'))

/**
 * Suspense Wrapper 컴포넌트
 * 페이지 로딩 중 로딩 UI를 표시합니다.
 */
function SuspenseWrapper({ children }) {
  return (
    <Suspense fallback={
      <InitialLoading 
        title="LivePulse"
        messages={['페이지를 불러오고 있습니다...', '잠시만 기다려주세요...']}
        speed={2}
      />
    }>
      {children}
    </Suspense>
  )
}

/**
 * 관리자 페이지 로딩용 래퍼
 */
function AdminSuspenseWrapper({ children }) {
  return (
    <Suspense fallback={
      <InitialLoading 
        title="Administrator"
        messages={['관리자 화면을 불러오고 있습니다...']}
        speed={3}
      />
    }>
      {children}
    </Suspense>
  )
}

/**
 * 파트너 페이지 로딩용 래퍼
 */
function PartnerSuspenseWrapper({ children }) {
  return (
    <Suspense fallback={
      <InitialLoading 
        title="Partner Center"
        messages={['파트너 센터를 불러오고 있습니다...']}
        speed={3}
      />
    }>
      {children}
    </Suspense>
  )
}

function AppContent() {
  const initData = useAppInit()

  return (
    <LanguageProvider initialData={initData}>
        <AuthProvider>
          <PartnerProvider>
          <Toaster position="top-right" richColors closeButton />
          <Router>
          <ViewAsBanner />
          <Routes>
            {/* Public Routes (Accessible by everyone) - with PublicThemeProvider */}
            <Route path="/" element={
              <PublicThemeProvider>
                <SuspenseWrapper>
                  <Home />
                </SuspenseWrapper>
              </PublicThemeProvider>
            } />
            <Route path="/lectures" element={
              <PublicThemeProvider>
                <SuspenseWrapper>
                  <Lectures />
                </SuspenseWrapper>
              </PublicThemeProvider>
            } />
            <Route path="/instructors" element={
              <PublicThemeProvider>
                <SuspenseWrapper>
                  <Instructors />
                </SuspenseWrapper>
              </PublicThemeProvider>
            } />
            <Route path="/agencies" element={
              <PublicThemeProvider>
                <SuspenseWrapper>
                  <Agencies />
                </SuspenseWrapper>
              </PublicThemeProvider>
            } />
            <Route path="/service/:slug" element={
              <PublicThemeProvider>
                <SuspenseWrapper>
                  <ServicePage />
                </SuspenseWrapper>
              </PublicThemeProvider>
            } />
            
            {/* MyPage - 로그인한 일반 회원용 */}
            <Route path="/mypage" element={
              <PublicThemeProvider>
                <SuspenseWrapper>
                  <MyPage />
                </SuspenseWrapper>
              </PublicThemeProvider>
            } />
            
            {/* 법적 고지 페이지 (공개) */}
            <Route path="/legal/terms" element={
              <PublicThemeProvider>
                <SuspenseWrapper>
                  <TermsOfService />
                </SuspenseWrapper>
              </PublicThemeProvider>
            } />
            <Route path="/legal/privacy" element={
              <PublicThemeProvider>
                <SuspenseWrapper>
                  <PrivacyPolicy />
                </SuspenseWrapper>
              </PublicThemeProvider>
            } />
            <Route path="/legal/refund" element={
              <PublicThemeProvider>
                <SuspenseWrapper>
                  <RefundPolicy />
                </SuspenseWrapper>
              </PublicThemeProvider>
            } />

            {/* 초대 수락 페이지 */}
            <Route path="/invite/:token" element={
              <PublicThemeProvider>
                <SuspenseWrapper>
                  <InviteAccept />
                </SuspenseWrapper>
              </PublicThemeProvider>
            } />
            
            {/* 세션 참여 페이지 (청중용) */}
            <Route path="/join/:code" element={
              <SuspenseWrapper>
                <JoinSession />
              </SuspenseWrapper>
            } />
            
            {/* 실시간 참여 페이지 (청중용) - Q&A, 설문, 정보 탭 포함 */}
            <Route path="/live/:code" element={
              <SuspenseWrapper>
                <LiveSession />
              </SuspenseWrapper>
            } />
            
            {/* 강연자/좌장 Q&A 컨트롤 페이지 */}
            <Route path="/presenter/:code" element={
              <SuspenseWrapper>
                <PresenterQnA />
              </SuspenseWrapper>
            } />
            
            {/* 송출 화면 (프로젝터용) - 강연자료/Q&A/설문 */}
            <Route path="/broadcast/:code" element={
              <SuspenseWrapper>
                <BroadcastQnA />
              </SuspenseWrapper>
            } />

            {/* 강연자 화면 - PDF 직접 넘김 + 동기화 */}
            <Route path="/speaker/:code" element={
              <SuspenseWrapper>
                <SpeakerScreen />
              </SuspenseWrapper>
            } />
            
            {/* 템플릿 미리보기 (공개) */}
            <Route path="/template-preview/:code" element={
              <SuspenseWrapper>
                <TemplatePreviewPublic />
              </SuspenseWrapper>
            } />

            {/* 세션 설정 에디터 (파트너 전용, 풀스크린) */}
            <Route path="/partner/sessions/:id" element={
              <AdminThemeProvider initialTheme={initData.adminTheme}>
                <PartnerRoute>
                  <PartnerSuspenseWrapper>
                    <SessionDetail />
                  </PartnerSuspenseWrapper>
                </PartnerRoute>
              </AdminThemeProvider>
            } />

            {/* 라이브 진행 콘솔 (파트너 전용, 풀스크린) */}
            <Route path="/partner/sessions/:id/console" element={
              <AdminThemeProvider initialTheme={initData.adminTheme}>
                <PartnerRoute>
                  <PartnerSuspenseWrapper>
                    <SessionConsole />
                  </PartnerSuspenseWrapper>
                </PartnerRoute>
              </AdminThemeProvider>
            } />

            {/* 세션 리포트 (파트너 전용, 풀스크린) */}
            <Route path="/partner/sessions/:id/report" element={
              <AdminThemeProvider initialTheme={initData.adminTheme}>
                <PartnerRoute>
                  <PartnerSuspenseWrapper>
                    <SessionReport />
                  </PartnerSuspenseWrapper>
                </PartnerRoute>
              </AdminThemeProvider>
            } />

            {/* Auth Routes (Redirect based on role) - with PublicThemeProvider */}
            <Route path="/login" element={
              <PublicThemeProvider>
                <PublicRoute>
                  <SuspenseWrapper>
                    <Login />
                  </SuspenseWrapper>
                </PublicRoute>
              </PublicThemeProvider>
            } />
            <Route path="/signup" element={
              <PublicThemeProvider>
                <PublicRoute>
                  <SuspenseWrapper>
                    <Signup />
                  </SuspenseWrapper>
                </PublicRoute>
              </PublicThemeProvider>
            } />

            {/* Admin Routes (Protected, role: admin) - with AdminThemeProvider */}
            <Route path="/adm" element={
            <AdminThemeProvider initialTheme={initData.adminTheme}>
                <AdminRoute>
                <AdminSuspenseWrapper>
                    <AdminLayout />
                </AdminSuspenseWrapper>
                </AdminRoute>
              </AdminThemeProvider>
            }>
              <Route index element={<SuspenseWrapper><Dashboard /></SuspenseWrapper>} />
              <Route path="users" element={<SuspenseWrapper><UsersPage /></SuspenseWrapper>} />
              <Route path="partner-requests" element={<SuspenseWrapper><PartnerRequests /></SuspenseWrapper>} />
              <Route path="partners" element={<SuspenseWrapper><Partners /></SuspenseWrapper>} />
              <Route path="sessions" element={<SuspenseWrapper><AdminSessions /></SuspenseWrapper>} />
              <Route path="profile" element={<SuspenseWrapper><Profile /></SuspenseWrapper>} />
              <Route path="profile-test" element={<SuspenseWrapper><ProfileTest /></SuspenseWrapper>} />
              
              {/* Content Management Routes */}
              <Route path="content/posts" element={<SuspenseWrapper><Posts /></SuspenseWrapper>} />
              
              {/* Template Management Routes */}
              <Route path="templates/:screenType" element={<SuspenseWrapper><SessionTemplates /></SuspenseWrapper>} />
              <Route path="templates/:screenType/:id/preview" element={<SuspenseWrapper><TemplatePreview /></SuspenseWrapper>} />
              
              {/* Support Management Routes (Admin Only) */}
              <Route path="support/faq" element={<SuspenseWrapper><FaqManagement /></SuspenseWrapper>} />
              <Route path="support/inquiries" element={<SuspenseWrapper><InquiryManagement /></SuspenseWrapper>} />
              
              {/* System Routes (Admin Only) */}
              <Route path="system/database" element={<SuspenseWrapper><Database /></SuspenseWrapper>} />
              <Route path="system/logs" element={<SuspenseWrapper><Logs /></SuspenseWrapper>} />
              <Route path="system/login-logs" element={<SuspenseWrapper><LoginLogs /></SuspenseWrapper>} />
              <Route path="system/backup" element={<SuspenseWrapper><Backup /></SuspenseWrapper>} />

              {/* Common Routes */}
              <Route path="support" element={<SuspenseWrapper><Support /></SuspenseWrapper>} />
              <Route path="settings" element={<SuspenseWrapper><Settings /></SuspenseWrapper>} />
            </Route>

            {/* Partner Routes (Protected, user_type: partner) - 동일한 레이아웃, 다른 메뉴 */}
            <Route path="/partner" element={
            <AdminThemeProvider initialTheme={initData.adminTheme}>
                <PartnerRoute>
                <PartnerSuspenseWrapper>
                    <AdminLayout />
                </PartnerSuspenseWrapper>
                </PartnerRoute>
              </AdminThemeProvider>
            }>
              <Route index element={<SuspenseWrapper><PartnerDashboard /></SuspenseWrapper>} />
              <Route path="profile" element={<SuspenseWrapper><Profile /></SuspenseWrapper>} />
              <Route path="partner-profile" element={<SuspenseWrapper><PartnerProfile /></SuspenseWrapper>} />
              <Route path="team" element={<SuspenseWrapper><TeamMembers /></SuspenseWrapper>} />
              <Route path="invitations" element={<SuspenseWrapper><Invitations /></SuspenseWrapper>} />
              
              {/* Support Routes */}
              <Route path="support/faq" element={<SuspenseWrapper><PartnerFaq /></SuspenseWrapper>} />
              <Route path="support/inquiry" element={<SuspenseWrapper><PartnerInquiry /></SuspenseWrapper>} />
              
              {/* Session Routes (목록·만들기만 사이드바 포함; 상세는 풀스크린) */}
              <Route path="sessions" element={<SuspenseWrapper><Sessions /></SuspenseWrapper>} />
              <Route path="sessions/new" element={<SuspenseWrapper><SessionCreate /></SuspenseWrapper>} />
              
              {/* Content Management Routes */}
              <Route path="content/posts" element={<SuspenseWrapper><Posts /></SuspenseWrapper>} />
              
              {/* Common Routes */}
              <Route path="support" element={<SuspenseWrapper><Support /></SuspenseWrapper>} />
              <Route path="settings" element={<SuspenseWrapper><Settings /></SuspenseWrapper>} />
            </Route>

            {/* 404 Not Found */}
            <Route path="*" element={
              <PublicThemeProvider>
                <SuspenseWrapper>
                  <NotFound />
                </SuspenseWrapper>
              </PublicThemeProvider>
            } />
          </Routes>
        </Router>
        </PartnerProvider>
        </AuthProvider>
      </LanguageProvider>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <AppInitProvider>
        <AppContent />
      </AppInitProvider>
    </ErrorBoundary>
  )
}

export default App
