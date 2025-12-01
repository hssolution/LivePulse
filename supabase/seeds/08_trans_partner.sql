-- =====================================================
-- 파트너 번역 (partner)
-- =====================================================
SELECT _seed_trans('partner.partner', '00000000-0000-0000-0001-000000000004'::uuid, '파트너', 'Partner');
SELECT _seed_trans('partner.dashboard', '00000000-0000-0000-0001-000000000004'::uuid, '파트너 대시보드', 'Partner Dashboard');
SELECT _seed_trans('partner.name', '00000000-0000-0000-0001-000000000004'::uuid, '이름', 'Name');
SELECT _seed_trans('partner.phone', '00000000-0000-0000-0001-000000000004'::uuid, '연락처', 'Phone');
SELECT _seed_trans('partner.purpose', '00000000-0000-0000-0001-000000000004'::uuid, '사용 목적', 'Purpose');
SELECT _seed_trans('partner.companyName', '00000000-0000-0000-0001-000000000004'::uuid, '소속/회사명', 'Company Name');
SELECT _seed_trans('partner.companyOrOrg', '00000000-0000-0000-0001-000000000004'::uuid, '회사/단체명', 'Company/Organization');
SELECT _seed_trans('partner.businessNumber', '00000000-0000-0000-0001-000000000004'::uuid, '사업자번호', 'Business Number');
SELECT _seed_trans('partner.apply', '00000000-0000-0000-0001-000000000004'::uuid, '파트너 신청', 'Apply for Partner');
SELECT _seed_trans('partner.applyDesc', '00000000-0000-0000-0001-000000000004'::uuid, '파트너로 등록하면 세션을 만들고 청중과 실시간으로 소통할 수 있습니다.', 'As a partner, you can create sessions and interact with your audience in real-time.');
SELECT _seed_trans('partner.applySuccess', '00000000-0000-0000-0001-000000000004'::uuid, '파트너 신청이 완료되었습니다!', 'Partner application submitted!');
SELECT _seed_trans('partner.pendingDesc', '00000000-0000-0000-0001-000000000004'::uuid, '관리자가 신청 내용을 검토하고 있습니다.', 'Your application is being reviewed by admin.');
SELECT _seed_trans('partner.statusPending', '00000000-0000-0000-0001-000000000004'::uuid, '검토 중', 'Pending');
SELECT _seed_trans('partner.statusApproved', '00000000-0000-0000-0001-000000000004'::uuid, '승인됨', 'Approved');
SELECT _seed_trans('partner.statusRejected', '00000000-0000-0000-0001-000000000004'::uuid, '거부됨', 'Rejected');
SELECT _seed_trans('partner.type', '00000000-0000-0000-0001-000000000004'::uuid, '파트너 유형', 'Partner Type');
SELECT _seed_trans('partner.typeOrganizer', '00000000-0000-0000-0001-000000000004'::uuid, '행사자', 'Organizer');
SELECT _seed_trans('partner.typeAgency', '00000000-0000-0000-0001-000000000004'::uuid, '대행업체', 'Agency');
SELECT _seed_trans('partner.typeInstructor', '00000000-0000-0000-0001-000000000004'::uuid, '강연자', 'Instructor');
SELECT _seed_trans('partner.industry', '00000000-0000-0000-0001-000000000004'::uuid, '업종/분야', 'Industry');
SELECT _seed_trans('partner.industryPlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, '예: IT, 교육, 마케팅', 'e.g. IT, Education, Marketing');
SELECT _seed_trans('partner.expectedScale', '00000000-0000-0000-0001-000000000004'::uuid, '예상 규모', 'Expected Scale');
SELECT _seed_trans('partner.selectScale', '00000000-0000-0000-0001-000000000004'::uuid, '규모를 선택하세요', 'Select scale');
SELECT _seed_trans('partner.scaleSmall', '00000000-0000-0000-0001-000000000004'::uuid, '소규모 (50명 이하)', 'Small (under 50)');
SELECT _seed_trans('partner.scaleMedium', '00000000-0000-0000-0001-000000000004'::uuid, '중규모 (50-200명)', 'Medium (50-200)');
SELECT _seed_trans('partner.scaleLarge', '00000000-0000-0000-0001-000000000004'::uuid, '대규모 (200-500명)', 'Large (200-500)');
SELECT _seed_trans('partner.scaleEnterprise', '00000000-0000-0000-0001-000000000004'::uuid, '엔터프라이즈 (500명 이상)', 'Enterprise (500+)');
SELECT _seed_trans('partner.clientType', '00000000-0000-0000-0001-000000000004'::uuid, '주요 클라이언트 유형', 'Main Client Type');
SELECT _seed_trans('partner.clientTypePlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, '예: 기업, 학교, 공공기관', 'e.g. Corporate, School, Government');
SELECT _seed_trans('partner.displayName', '00000000-0000-0000-0001-000000000004'::uuid, '활동명/닉네임', 'Display Name');
SELECT _seed_trans('partner.displayNamePlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, '강의 시 사용할 이름', 'Name to use during sessions');
SELECT _seed_trans('partner.specialty', '00000000-0000-0000-0001-000000000004'::uuid, '전문 분야', 'Specialty');
SELECT _seed_trans('partner.specialtyPlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, '예: 리더십, 커뮤니케이션, 기술', 'e.g. Leadership, Communication, Tech');
SELECT _seed_trans('partner.bio', '00000000-0000-0000-0001-000000000004'::uuid, '소개', 'Bio');
SELECT _seed_trans('partner.bioPlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, '간단한 자기소개를 작성해주세요', 'Write a brief introduction');
SELECT _seed_trans('partner.active', '00000000-0000-0000-0001-000000000004'::uuid, '활성', 'Active');
SELECT _seed_trans('partner.inactive', '00000000-0000-0000-0001-000000000004'::uuid, '비활성', 'Inactive');
SELECT _seed_trans('partner.activate', '00000000-0000-0000-0001-000000000004'::uuid, '활성화', 'Activate');
SELECT _seed_trans('partner.deactivate', '00000000-0000-0000-0001-000000000004'::uuid, '비활성화', 'Deactivate');
SELECT _seed_trans('partner.activated', '00000000-0000-0000-0001-000000000004'::uuid, '파트너가 활성화되었습니다.', 'Partner has been activated.');
SELECT _seed_trans('partner.deactivated', '00000000-0000-0000-0001-000000000004'::uuid, '파트너가 비활성화되었습니다.', 'Partner has been deactivated.');
SELECT _seed_trans('partner.activateConfirm', '00000000-0000-0000-0001-000000000004'::uuid, '파트너 활성화', 'Activate Partner');
SELECT _seed_trans('partner.deactivateConfirm', '00000000-0000-0000-0001-000000000004'::uuid, '파트너 비활성화', 'Deactivate Partner');
SELECT _seed_trans('partner.activateDesc', '00000000-0000-0000-0001-000000000004'::uuid, '이 파트너를 활성화하시겠습니까? 파트너 기능을 다시 사용할 수 있습니다.', 'Are you sure you want to activate this partner? They will be able to use partner features again.');
SELECT _seed_trans('partner.deactivateDesc', '00000000-0000-0000-0001-000000000004'::uuid, '이 파트너를 비활성화하시겠습니까? 파트너 기능이 일시 중단됩니다.', 'Are you sure you want to deactivate this partner? Partner features will be suspended.');
SELECT _seed_trans('mypage.companyRequired', '00000000-0000-0000-0001-000000000004'::uuid, '회사/단체명을 입력해주세요.', 'Please enter company/organization name.');
SELECT _seed_trans('mypage.businessNumberRequired', '00000000-0000-0000-0001-000000000004'::uuid, '사업자번호를 입력해주세요.', 'Please enter business number.');
SELECT _seed_trans('title.partnerCenter', '00000000-0000-0000-0001-000000000004'::uuid, '파트너 센터', 'Partner Center');

-- 파트너 정보 팝업
SELECT _seed_trans('partner.info', '00000000-0000-0000-0001-000000000004'::uuid, '파트너 정보', 'Partner Info');
SELECT _seed_trans('partner.representativeName', '00000000-0000-0000-0001-000000000004'::uuid, '대표자명', 'Representative Name');
SELECT _seed_trans('partner.address', '00000000-0000-0000-0001-000000000004'::uuid, '주소', 'Address');
SELECT _seed_trans('partner.joinedAt', '00000000-0000-0000-0001-000000000004'::uuid, '가입일', 'Joined At');
SELECT _seed_trans('partner.statusActive', '00000000-0000-0000-0001-000000000004'::uuid, '활성', 'Active');
SELECT _seed_trans('partner.statusInactive', '00000000-0000-0000-0001-000000000004'::uuid, '비활성', 'Inactive');
SELECT _seed_trans('common.email', '00000000-0000-0000-0001-000000000001'::uuid, '이메일', 'Email');
SELECT _seed_trans('common.phone', '00000000-0000-0000-0001-000000000001'::uuid, '전화번호', 'Phone');

-- 파트너 정보 수정 페이지
SELECT _seed_trans('menu.partnerProfile', '00000000-0000-0000-0001-000000000004'::uuid, '파트너 정보', 'Partner Info');
SELECT _seed_trans('partner.profileTitle', '00000000-0000-0000-0001-000000000004'::uuid, '파트너 정보 관리', 'Partner Profile');
SELECT _seed_trans('partner.profileDesc', '00000000-0000-0000-0001-000000000004'::uuid, '파트너 정보를 확인하고 수정하세요.', 'View and edit your partner information.');
SELECT _seed_trans('partner.basicInfo', '00000000-0000-0000-0001-000000000004'::uuid, '기본 정보', 'Basic Information');
SELECT _seed_trans('partner.basicInfoDesc', '00000000-0000-0000-0001-000000000004'::uuid, '파트너 계정의 기본 정보입니다.', 'Basic information for your partner account.');
SELECT _seed_trans('partner.organizerInfo', '00000000-0000-0000-0001-000000000004'::uuid, '행사자 정보', 'Organizer Information');
SELECT _seed_trans('partner.agencyInfo', '00000000-0000-0000-0001-000000000004'::uuid, '대행업체 정보', 'Agency Information');
SELECT _seed_trans('partner.instructorInfo', '00000000-0000-0000-0001-000000000004'::uuid, '강연자 정보', 'Instructor Information');
SELECT _seed_trans('partner.roleOwner', '00000000-0000-0000-0001-000000000004'::uuid, '소유자', 'Owner');
SELECT _seed_trans('partner.roleMember', '00000000-0000-0000-0001-000000000004'::uuid, '팀원', 'Member');
SELECT _seed_trans('partner.viewOnlyNotice', '00000000-0000-0000-0001-000000000004'::uuid, '팀원은 파트너 정보를 조회만 할 수 있습니다. 수정은 소유자만 가능합니다.', 'Team members can only view partner information. Only the owner can edit.');
SELECT _seed_trans('partner.noEditPermission', '00000000-0000-0000-0001-000000000004'::uuid, '수정 권한이 없습니다.', 'You do not have permission to edit.');
SELECT _seed_trans('partner.updateSuccess', '00000000-0000-0000-0001-000000000004'::uuid, '파트너 정보가 수정되었습니다.', 'Partner information has been updated.');
SELECT _seed_trans('partner.notFound', '00000000-0000-0000-0001-000000000004'::uuid, '파트너 정보를 찾을 수 없습니다.', 'Partner information not found.');
SELECT _seed_trans('partner.addressPlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, '주소를 입력하세요', 'Enter address');

-- 최초 접속 시 사용자명 입력
SELECT _seed_trans('partner.setupDisplayName', '00000000-0000-0000-0001-000000000004'::uuid, '사용자명 설정', 'Set Display Name');
SELECT _seed_trans('partner.setupDisplayNameDesc', '00000000-0000-0000-0001-000000000004'::uuid, '파트너 센터에서 사용할 이름을 설정해주세요. 다른 사용자에게 표시되는 이름입니다.', 'Please set a name to use in Partner Center. This name will be displayed to other users.');
SELECT _seed_trans('partner.displayNameUsage', '00000000-0000-0000-0001-000000000004'::uuid, '세션 및 협업 시 표시되는 이름입니다.', 'This name will be shown during sessions and collaborations.');

