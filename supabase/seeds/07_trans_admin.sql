-- =====================================================
-- 관리자 번역 (admin)
-- =====================================================
SELECT _seed_trans('admin.dashboard', '00000000-0000-0000-0001-000000000003'::uuid, '대시보드', 'Dashboard');
SELECT _seed_trans('admin.helloUser', '00000000-0000-0000-0001-000000000003'::uuid, '안녕하세요, {name}님!', 'Hello, {name}!');
SELECT _seed_trans('admin.userManagement', '00000000-0000-0000-0001-000000000003'::uuid, '회원 관리', 'User Management');
SELECT _seed_trans('admin.manageUsers', '00000000-0000-0000-0001-000000000003'::uuid, '시스템 사용자를 관리합니다.', 'Manage system users.');
SELECT _seed_trans('admin.totalUsers', '00000000-0000-0000-0001-000000000003'::uuid, '전체 회원', 'Total Users');
SELECT _seed_trans('admin.activeUsers', '00000000-0000-0000-0001-000000000003'::uuid, '활성 회원', 'Active Users');
SELECT _seed_trans('admin.users', '00000000-0000-0000-0001-000000000003'::uuid, '회원 관리', 'User Management');
SELECT _seed_trans('admin.partners', '00000000-0000-0000-0001-000000000003'::uuid, '파트너', 'Partners');
SELECT _seed_trans('admin.settings', '00000000-0000-0000-0001-000000000003'::uuid, '설정', 'Settings');
SELECT _seed_trans('admin.system', '00000000-0000-0000-0001-000000000003'::uuid, '시스템', 'System');
SELECT _seed_trans('admin.languagePack', '00000000-0000-0000-0001-000000000003'::uuid, '언어팩 관리', 'Language Pack');
SELECT _seed_trans('admin.partnerRequestsTitle', '00000000-0000-0000-0001-000000000003'::uuid, '파트너 신청 관리', 'Partner Request Management');
SELECT _seed_trans('admin.partnerRequestsDesc', '00000000-0000-0000-0001-000000000003'::uuid, '파트너 신청을 검토하고 승인/거부합니다.', 'Review and approve/reject partner applications.');
SELECT _seed_trans('admin.partnerRequests', '00000000-0000-0000-0001-000000000003'::uuid, '파트너 신청', 'Partner Requests');
SELECT _seed_trans('admin.pendingRequests', '00000000-0000-0000-0001-000000000003'::uuid, '대기중', 'Pending');
SELECT _seed_trans('admin.approvedRequests', '00000000-0000-0000-0001-000000000003'::uuid, '승인됨', 'Approved');
SELECT _seed_trans('admin.rejectedRequests', '00000000-0000-0000-0001-000000000003'::uuid, '거부됨', 'Rejected');
SELECT _seed_trans('admin.noRequests', '00000000-0000-0000-0001-000000000003'::uuid, '신청 내역이 없습니다.', 'No requests found.');
SELECT _seed_trans('admin.viewAll', '00000000-0000-0000-0001-000000000003'::uuid, '상세', 'View');
SELECT _seed_trans('admin.requestDate', '00000000-0000-0000-0001-000000000003'::uuid, '신청일', 'Request Date');
SELECT _seed_trans('admin.approve', '00000000-0000-0000-0001-000000000003'::uuid, '승인', 'Approve');
SELECT _seed_trans('admin.reject', '00000000-0000-0000-0001-000000000003'::uuid, '거부', 'Reject');
SELECT _seed_trans('admin.rejectReason', '00000000-0000-0000-0001-000000000003'::uuid, '거부 사유', 'Rejection Reason');
SELECT _seed_trans('admin.rejectConfirm', '00000000-0000-0000-0001-000000000003'::uuid, '파트너 신청 거부', 'Reject Partner Application');
SELECT _seed_trans('admin.rejectReasonPlaceholder', '00000000-0000-0000-0001-000000000003'::uuid, '거부 사유를 입력해주세요.', 'Please enter the reason for rejection.');
SELECT _seed_trans('admin.partnerList', '00000000-0000-0000-0001-000000000003'::uuid, '파트너 목록', 'Partner List');
SELECT _seed_trans('admin.partnerListDesc', '00000000-0000-0000-0001-000000000003'::uuid, '승인된 파트너를 관리합니다.', 'Manage approved partners.');
SELECT _seed_trans('admin.partnersCount', '00000000-0000-0000-0001-000000000003'::uuid, '명', 'partners');
SELECT _seed_trans('admin.noPartners', '00000000-0000-0000-0001-000000000003'::uuid, '등록된 파트너가 없습니다.', 'No partners registered.');
SELECT _seed_trans('admin.partnerDetail', '00000000-0000-0000-0001-000000000003'::uuid, '파트너 상세 정보', 'Partner Details');
SELECT _seed_trans('admin.partnerDetailDesc', '00000000-0000-0000-0001-000000000003'::uuid, '파트너의 상세 정보를 확인합니다.', 'View partner details.');
SELECT _seed_trans('admin.registeredDate', '00000000-0000-0000-0001-000000000003'::uuid, '등록일', 'Registered Date');

-- 메뉴
SELECT _seed_trans('menu.dashboard', '00000000-0000-0000-0001-000000000003'::uuid, '대시보드', 'Dashboard');
SELECT _seed_trans('menu.profile', '00000000-0000-0000-0001-000000000003'::uuid, '내 정보', 'My Profile');
SELECT _seed_trans('menu.posts', '00000000-0000-0000-0001-000000000003'::uuid, '게시글 관리', 'Posts');
SELECT _seed_trans('menu.support', '00000000-0000-0000-0001-000000000003'::uuid, '문의/지원', 'Support');
SELECT _seed_trans('menu.settings', '00000000-0000-0000-0001-000000000003'::uuid, '설정', 'Settings');
SELECT _seed_trans('menu.users', '00000000-0000-0000-0001-000000000003'::uuid, '회원 관리', 'User Management');
SELECT _seed_trans('menu.partnerRequests', '00000000-0000-0000-0001-000000000003'::uuid, '파트너 신청 관리', 'Partner Requests');
SELECT _seed_trans('menu.partnerList', '00000000-0000-0000-0001-000000000003'::uuid, '파트너 목록', 'Partner List');
SELECT _seed_trans('menu.system', '00000000-0000-0000-0001-000000000003'::uuid, '시스템', 'System');
SELECT _seed_trans('menu.database', '00000000-0000-0000-0001-000000000003'::uuid, '데이터베이스', 'Database');
SELECT _seed_trans('menu.logs', '00000000-0000-0000-0001-000000000003'::uuid, '로그 관리', 'Logs');
SELECT _seed_trans('menu.backup', '00000000-0000-0000-0001-000000000003'::uuid, '백업 관리', 'Backup');
SELECT _seed_trans('menu.languagePack', '00000000-0000-0000-0001-000000000003'::uuid, '언어팩 관리', 'Language Pack');
SELECT _seed_trans('menu.profileTest', '00000000-0000-0000-0001-000000000003'::uuid, '프로필 테스트', 'Profile Test');
SELECT _seed_trans('menu.templateManagement', '00000000-0000-0000-0001-000000000003'::uuid, '템플릿 관리', 'Template Management');
SELECT _seed_trans('menu.templateMain', '00000000-0000-0000-0001-000000000003'::uuid, '메인 화면', 'Main Screen');
SELECT _seed_trans('menu.templateQnA', '00000000-0000-0000-0001-000000000003'::uuid, '질문 화면', 'Q&A Screen');
SELECT _seed_trans('menu.templatePoll', '00000000-0000-0000-0001-000000000003'::uuid, '설문 화면', 'Poll Screen');
SELECT _seed_trans('title.adminPanel', '00000000-0000-0000-0001-000000000003'::uuid, '관리자 패널', 'Admin Panel');

-- 템플릿 화면 유형
SELECT _seed_trans('template.mainScreen', '00000000-0000-0000-0001-000000000003'::uuid, '메인 화면 템플릿', 'Main Screen Templates');
SELECT _seed_trans('template.mainScreenDesc', '00000000-0000-0000-0001-000000000003'::uuid, '세션 참여 페이지에 표시되는 메인 화면 템플릿을 관리합니다.', 'Manage main screen templates displayed on session join pages.');
SELECT _seed_trans('template.qnaScreen', '00000000-0000-0000-0001-000000000003'::uuid, '질문 화면 템플릿', 'Q&A Screen Templates');
SELECT _seed_trans('template.qnaScreenDesc', '00000000-0000-0000-0001-000000000003'::uuid, '질문 송출 시 프로젝터/대형 스크린에 표시되는 템플릿을 관리합니다.', 'Manage templates displayed on projectors/large screens during Q&A broadcast.');
SELECT _seed_trans('template.pollScreen', '00000000-0000-0000-0001-000000000003'::uuid, '설문 화면 템플릿', 'Poll Screen Templates');
SELECT _seed_trans('template.pollScreenDesc', '00000000-0000-0000-0001-000000000003'::uuid, '설문 진행 시 표시되는 화면 템플릿을 관리합니다.', 'Manage screen templates displayed during polls.');

