-- =====================================================
-- 세션 번역 (session)
-- =====================================================
SELECT _seed_trans('session.create', '00000000-0000-0000-0001-000000000005'::uuid, '세션 만들기', 'Create Session');
SELECT _seed_trans('session.createDesc', '00000000-0000-0000-0001-000000000005'::uuid, '새로운 세션을 만들어 청중과 소통하세요.', 'Create a new session to engage with your audience.');
SELECT _seed_trans('session.join', '00000000-0000-0000-0001-000000000005'::uuid, '세션 참여', 'Join Session');
SELECT _seed_trans('session.title', '00000000-0000-0000-0001-000000000005'::uuid, '세션 제목', 'Session Title');
SELECT _seed_trans('session.titlePlaceholder', '00000000-0000-0000-0001-000000000005'::uuid, '세션 제목을 입력하세요', 'Enter session title');
SELECT _seed_trans('session.description', '00000000-0000-0000-0001-000000000005'::uuid, '세션 설명', 'Session Description');
SELECT _seed_trans('session.descriptionPlaceholder', '00000000-0000-0000-0001-000000000005'::uuid, '세션에 대한 설명을 입력하세요...', 'Enter a description for your session...');
SELECT _seed_trans('session.code', '00000000-0000-0000-0001-000000000005'::uuid, '세션 코드', 'Session Code');
SELECT _seed_trans('session.enterCode', '00000000-0000-0000-0001-000000000005'::uuid, '세션 코드를 입력하세요', 'Enter session code');
SELECT _seed_trans('session.start', '00000000-0000-0000-0001-000000000005'::uuid, '세션 시작', 'Start Session');
SELECT _seed_trans('session.end', '00000000-0000-0000-0001-000000000005'::uuid, '세션 종료', 'End Session');
SELECT _seed_trans('session.live', '00000000-0000-0000-0001-000000000005'::uuid, '라이브', 'LIVE');
SELECT _seed_trans('session.ended', '00000000-0000-0000-0001-000000000005'::uuid, '종료됨', 'Ended');
SELECT _seed_trans('session.participants', '00000000-0000-0000-0001-000000000005'::uuid, '참여자', 'Participants');
SELECT _seed_trans('session.questions', '00000000-0000-0000-0001-000000000005'::uuid, '질문', 'Questions');
SELECT _seed_trans('session.polls', '00000000-0000-0000-0001-000000000005'::uuid, '투표', 'Polls');
SELECT _seed_trans('session.poll', '00000000-0000-0000-0001-000000000005'::uuid, '설문', 'Poll');

-- 기본 정보
SELECT _seed_trans('session.basicInfo', '00000000-0000-0000-0001-000000000005'::uuid, '기본 정보', 'Basic Information');
SELECT _seed_trans('session.basicInfoDesc', '00000000-0000-0000-0001-000000000005'::uuid, '세션의 기본 정보를 입력하세요.', 'Enter the basic information for your session.');
SELECT _seed_trans('session.venueName', '00000000-0000-0000-0001-000000000005'::uuid, '장소명', 'Venue Name');
SELECT _seed_trans('session.venueAddress', '00000000-0000-0000-0001-000000000005'::uuid, '상세 주소', 'Address');
SELECT _seed_trans('session.venueNamePlaceholder', '00000000-0000-0000-0001-000000000005'::uuid, '예: 코엑스 그랜드볼룸', 'e.g., Grand Ballroom');
SELECT _seed_trans('session.venueAddressPlaceholder', '00000000-0000-0000-0001-000000000005'::uuid, '예: 서울시 강남구 삼성동 159', 'e.g., 123 Main Street');
SELECT _seed_trans('session.startAt', '00000000-0000-0000-0001-000000000005'::uuid, '시작 일시', 'Start Date/Time');
SELECT _seed_trans('session.endAt', '00000000-0000-0000-0001-000000000005'::uuid, '종료 일시', 'End Date/Time');
SELECT _seed_trans('session.contactPhone', '00000000-0000-0000-0001-000000000005'::uuid, '대표 연락처', 'Contact Phone');
SELECT _seed_trans('session.contactEmail', '00000000-0000-0000-0001-000000000005'::uuid, '대표 이메일', 'Contact Email');
SELECT _seed_trans('session.maxParticipants', '00000000-0000-0000-0001-000000000005'::uuid, '최대 참여 인원', 'Max Participants');

-- 템플릿
SELECT _seed_trans('session.template', '00000000-0000-0000-0001-000000000005'::uuid, '템플릿', 'Template');
SELECT _seed_trans('session.templateDesc', '00000000-0000-0000-0001-000000000005'::uuid, '세션 화면에 적용할 템플릿을 선택하세요.', 'Select a template to apply to your session.');
SELECT _seed_trans('session.selectTemplate', '00000000-0000-0000-0001-000000000005'::uuid, '템플릿 선택', 'Select Template');
SELECT _seed_trans('session.createButton', '00000000-0000-0000-0001-000000000005'::uuid, '세션 만들기', 'Create Session');
SELECT _seed_trans('session.createNote', '00000000-0000-0000-0001-000000000005'::uuid, '세션 생성 후 상세 페이지에서 이미지 등을 수정할 수 있습니다.', 'You can edit images and more on the detail page after creation.');

-- 메뉴
SELECT _seed_trans('menu.sessions', '00000000-0000-0000-0001-000000000005'::uuid, '세션 관리', 'Sessions');

-- 세션 목록
SELECT _seed_trans('session.management', '00000000-0000-0000-0001-000000000005'::uuid, '세션 관리', 'Session Management');
SELECT _seed_trans('session.managementDesc', '00000000-0000-0000-0001-000000000005'::uuid, '세션을 생성하고 관리하세요.', 'Create and manage your sessions.');
SELECT _seed_trans('session.total', '00000000-0000-0000-0001-000000000005'::uuid, '전체', 'Total');
SELECT _seed_trans('session.noPartner', '00000000-0000-0000-0001-000000000005'::uuid, '파트너 등록이 필요합니다', 'Partner registration required');
SELECT _seed_trans('session.noPartnerDesc', '00000000-0000-0000-0001-000000000005'::uuid, '세션을 생성하려면 먼저 파트너로 등록해야 합니다.', 'You need to register as a partner to create sessions.');
SELECT _seed_trans('session.searchPlaceholder', '00000000-0000-0000-0001-000000000005'::uuid, '세션 제목으로 검색...', 'Search by session title...');
SELECT _seed_trans('session.filterStatus', '00000000-0000-0000-0001-000000000005'::uuid, '상태 필터', 'Filter by status');
SELECT _seed_trans('session.noSessions', '00000000-0000-0000-0001-000000000005'::uuid, '세션이 없습니다', 'No sessions');
SELECT _seed_trans('session.noSessionsDesc', '00000000-0000-0000-0001-000000000005'::uuid, '첫 번째 세션을 생성해보세요.', 'Create your first session.');
SELECT _seed_trans('session.createFirst', '00000000-0000-0000-0001-000000000005'::uuid, '첫 세션 만들기', 'Create First Session');
SELECT _seed_trans('session.copyCode', '00000000-0000-0000-0001-000000000005'::uuid, '코드 복사', 'Copy Code');
SELECT _seed_trans('session.showQR', '00000000-0000-0000-0001-000000000005'::uuid, 'QR 코드 보기', 'Show QR Code');
SELECT _seed_trans('session.deleteConfirm', '00000000-0000-0000-0001-000000000005'::uuid, '이 세션을 삭제하시겠습니까?', 'Are you sure you want to delete this session?');
SELECT _seed_trans('common.all', '00000000-0000-0000-0001-000000000001'::uuid, '전체', 'All');
SELECT _seed_trans('session.previewTemplate', '00000000-0000-0000-0001-000000000005'::uuid, '새 창에서 미리보기', 'Preview in New Window');
SELECT _seed_trans('session.joinNow', '00000000-0000-0000-0001-000000000005'::uuid, '지금 참여하기', 'Join Now');

-- 탭 메뉴
SELECT _seed_trans('session.design', '00000000-0000-0000-0001-000000000005'::uuid, '디자인', 'Design');
SELECT _seed_trans('session.collaboration', '00000000-0000-0000-0001-000000000005'::uuid, '협업', 'Collaboration');
SELECT _seed_trans('session.qna', '00000000-0000-0000-0001-000000000005'::uuid, 'Q&A', 'Q&A');
SELECT _seed_trans('session.settings', '00000000-0000-0000-0001-000000000005'::uuid, '설정', 'Settings');

-- 디자인 탭
SELECT _seed_trans('session.assets', '00000000-0000-0000-0001-000000000005'::uuid, '이미지 및 배너', 'Images & Banners');
SELECT _seed_trans('session.assetsDesc', '00000000-0000-0000-0001-000000000005'::uuid, '청중 등록 페이지에 표시될 이미지를 업로드하세요.', 'Upload images to be displayed on the audience registration page.');
SELECT _seed_trans('session.preview', '00000000-0000-0000-0001-000000000005'::uuid, '미리보기', 'Preview');
SELECT _seed_trans('session.openPreview', '00000000-0000-0000-0001-000000000005'::uuid, '새 창에서 미리보기', 'Open Preview');
SELECT _seed_trans('session.maxWidthPx', '00000000-0000-0000-0001-000000000005'::uuid, '최대 {width}px', 'Max {width}px');
SELECT _seed_trans('session.imageUrlPlaceholder', '00000000-0000-0000-0001-000000000005'::uuid, '이미지 URL 입력', 'Enter image URL');

-- 상태 관리
SELECT _seed_trans('session.statusDraft', '00000000-0000-0000-0001-000000000005'::uuid, '초안', 'Draft');
SELECT _seed_trans('session.statusPublished', '00000000-0000-0000-0001-000000000005'::uuid, '공개', 'Published');
SELECT _seed_trans('session.statusActive', '00000000-0000-0000-0001-000000000005'::uuid, '진행중', 'Active');
SELECT _seed_trans('session.statusEnded', '00000000-0000-0000-0001-000000000005'::uuid, '종료됨', 'Ended');
SELECT _seed_trans('session.statusCancelled', '00000000-0000-0000-0001-000000000005'::uuid, '취소됨', 'Cancelled');
SELECT _seed_trans('session.statusManagement', '00000000-0000-0000-0001-000000000005'::uuid, '상태 관리', 'Status Management');
SELECT _seed_trans('session.statusManagementDesc', '00000000-0000-0000-0001-000000000005'::uuid, '세션의 공개 상태를 변경합니다.', 'Change the session publish status.');
SELECT _seed_trans('session.currentStatus', '00000000-0000-0000-0001-000000000005'::uuid, '현재 상태', 'Current Status');
SELECT _seed_trans('session.publish', '00000000-0000-0000-0001-000000000005'::uuid, '공개하기', 'Publish');
SELECT _seed_trans('session.unpublish', '00000000-0000-0000-0001-000000000005'::uuid, '비공개로 전환', 'Unpublish');
SELECT _seed_trans('session.statusChanged', '00000000-0000-0000-0001-000000000005'::uuid, '상태가 변경되었습니다.', 'Status has been changed.');

-- 코드/링크
SELECT _seed_trans('session.copyLink', '00000000-0000-0000-0001-000000000005'::uuid, '링크 복사', 'Copy Link');
SELECT _seed_trans('session.codeCopied', '00000000-0000-0000-0001-000000000005'::uuid, '세션 코드가 복사되었습니다.', 'Session code copied.');
SELECT _seed_trans('session.linkCopied', '00000000-0000-0000-0001-000000000005'::uuid, '참여 링크가 복사되었습니다.', 'Join link copied.');
SELECT _seed_trans('session.qrCode', '00000000-0000-0000-0001-000000000005'::uuid, 'QR 코드', 'QR Code');
SELECT _seed_trans('session.qrCodeDesc', '00000000-0000-0000-0001-000000000005'::uuid, '이 QR 코드를 스캔하면 세션에 참여할 수 있습니다.', 'Scan this QR code to join the session.');

-- 이미지
SELECT _seed_trans('session.imageUploaded', '00000000-0000-0000-0001-000000000005'::uuid, '이미지가 업로드되었습니다.', 'Image uploaded.');
SELECT _seed_trans('session.imageDeleted', '00000000-0000-0000-0001-000000000005'::uuid, '이미지가 삭제되었습니다.', 'Image deleted.');

-- 위험 영역
SELECT _seed_trans('session.dangerZone', '00000000-0000-0000-0001-000000000005'::uuid, '위험 영역', 'Danger Zone');
SELECT _seed_trans('session.dangerZoneDesc', '00000000-0000-0000-0001-000000000005'::uuid, '이 작업은 되돌릴 수 없습니다.', 'These actions cannot be undone.');
SELECT _seed_trans('session.delete', '00000000-0000-0000-0001-000000000005'::uuid, '세션 삭제', 'Delete Session');
SELECT _seed_trans('session.deleted', '00000000-0000-0000-0001-000000000005'::uuid, '세션이 삭제되었습니다.', 'Session deleted.');
SELECT _seed_trans('session.deleteConfirmTitle', '00000000-0000-0000-0001-000000000005'::uuid, '세션을 삭제하시겠습니까?', 'Delete this session?');
SELECT _seed_trans('session.deleteConfirmDesc', '00000000-0000-0000-0001-000000000005'::uuid, '이 작업은 되돌릴 수 없습니다. 세션과 관련된 모든 데이터가 영구적으로 삭제됩니다.', 'This action cannot be undone. All data associated with this session will be permanently deleted.');

-- 참여 정보
SELECT _seed_trans('session.participantInfo', '00000000-0000-0000-0001-000000000005'::uuid, '현재 {count}명 / 최대 {max}명', 'Currently {count} / Max {max}');

-- 템플릿 미리보기
SELECT _seed_trans('template.previewMode', '00000000-0000-0000-0001-000000000005'::uuid, '미리보기 모드', 'Preview Mode');
SELECT _seed_trans('template.noFieldsConfigured', '00000000-0000-0000-0001-000000000005'::uuid, '설정된 필드가 없습니다.', 'No fields configured.');
SELECT _seed_trans('template.adminNeedsToSetup', '00000000-0000-0000-0001-000000000005'::uuid, '관리자가 템플릿 필드를 설정해야 합니다.', 'Administrator needs to set up template fields.');
SELECT _seed_trans('template.previewNote', '00000000-0000-0000-0001-000000000005'::uuid, '이것은 관리자가 설정한 기본 템플릿 형태입니다. 실제 세션에서는 파트너가 이미지를 교체합니다.', 'This is the default template set by the administrator. In actual sessions, partners will replace the images.');
SELECT _seed_trans('template.noFieldsPreview', '00000000-0000-0000-0001-000000000005'::uuid, '표시할 필드가 없습니다', 'No fields to display');
SELECT _seed_trans('template.addFieldsToPreview', '00000000-0000-0000-0001-000000000005'::uuid, '필드를 추가하면 미리보기가 표시됩니다', 'Add fields to see preview');

-- Q&A/설문 템플릿
SELECT _seed_trans('session.qnaTemplate', '00000000-0000-0000-0001-000000000005'::uuid, 'Q&A 템플릿', 'Q&A Template');
SELECT _seed_trans('session.qnaTemplateDesc', '00000000-0000-0000-0001-000000000005'::uuid, 'Q&A 화면에 적용할 템플릿을 선택하세요.', 'Select a template for Q&A screen.');
SELECT _seed_trans('session.pollTemplate', '00000000-0000-0000-0001-000000000005'::uuid, '설문 템플릿', 'Poll Template');
SELECT _seed_trans('session.pollTemplateDesc', '00000000-0000-0000-0001-000000000005'::uuid, '설문 화면에 적용할 템플릿을 선택하세요.', 'Select a template for poll screen.');
SELECT _seed_trans('session.useMainTemplate', '00000000-0000-0000-0001-000000000005'::uuid, '메인 템플릿 사용', 'Use Main Template');

