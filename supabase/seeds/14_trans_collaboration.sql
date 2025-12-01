-- =====================================================
-- Phase 12: 세션 협업 관련 언어팩
-- =====================================================

-- 메뉴
SELECT _seed_trans('menu.invitations', '00000000-0000-0000-0001-000000000003'::uuid, '초대 관리', 'Invitations');
SELECT _seed_trans('menu.teamMembers', '00000000-0000-0000-0001-000000000003'::uuid, '팀원 관리', 'Team Members');

-- 파트너 초대
SELECT _seed_trans('session.invitePartner', '00000000-0000-0000-0001-000000000004'::uuid, '파트너 초대', 'Invite Partner');
SELECT _seed_trans('session.invitePartnerDesc', '00000000-0000-0000-0001-000000000004'::uuid, '다른 파트너를 세션에 초대하여 협업할 수 있습니다.', 'Invite another partner to collaborate on this session.');
SELECT _seed_trans('session.noPartnerInvited', '00000000-0000-0000-0001-000000000004'::uuid, '초대된 파트너가 없습니다.', 'No partner has been invited.');
SELECT _seed_trans('session.partnerInvited', '00000000-0000-0000-0001-000000000004'::uuid, '파트너가 초대되었습니다.', 'Partner has been invited.');
SELECT _seed_trans('session.invitePending', '00000000-0000-0000-0001-000000000004'::uuid, '수락 대기 중', 'Pending Acceptance');
SELECT _seed_trans('session.inviteAccepted', '00000000-0000-0000-0001-000000000004'::uuid, '수락됨', 'Accepted');
SELECT _seed_trans('session.inviteRejected', '00000000-0000-0000-0001-000000000004'::uuid, '거절됨', 'Rejected');
SELECT _seed_trans('session.cancelInvite', '00000000-0000-0000-0001-000000000004'::uuid, '초대 취소', 'Cancel Invite');
SELECT _seed_trans('session.inviteCanceled', '00000000-0000-0000-0001-000000000004'::uuid, '초대가 취소되었습니다.', 'Invitation has been canceled.');
SELECT _seed_trans('session.searchPartner', '00000000-0000-0000-0001-000000000004'::uuid, '파트너 검색', 'Search Partner');
SELECT _seed_trans('session.searchPartnerPlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, '회사명 또는 대표자명으로 검색...', 'Search by company name or representative...');
SELECT _seed_trans('session.selectPartner', '00000000-0000-0000-0001-000000000004'::uuid, '파트너 선택', 'Select Partner');
SELECT _seed_trans('session.noPartnersFound', '00000000-0000-0000-0001-000000000004'::uuid, '검색 결과가 없습니다.', 'No partners found.');
SELECT _seed_trans('session.onlyOnePartner', '00000000-0000-0000-0001-000000000004'::uuid, '세션당 하나의 파트너만 초대할 수 있습니다.', 'Only one partner can be invited per session.');
SELECT _seed_trans('session.incompatiblePartner', '00000000-0000-0000-0001-000000000004'::uuid, '호환되지 않는 파트너 타입입니다. 행사자는 대행업체만, 대행업체는 행사자만 초대할 수 있습니다.', 'Incompatible partner type. Organizers can only invite agencies, and agencies can only invite organizers.');

-- 초대 받은 목록
SELECT _seed_trans('invitation.received', '00000000-0000-0000-0001-000000000004'::uuid, '받은 초대', 'Received Invitations');
SELECT _seed_trans('invitation.receivedDesc', '00000000-0000-0000-0001-000000000004'::uuid, '다른 파트너로부터 받은 세션 초대 목록입니다.', 'List of session invitations from other partners.');
SELECT _seed_trans('invitation.noInvitations', '00000000-0000-0000-0001-000000000004'::uuid, '받은 초대가 없습니다.', 'No invitations received.');
SELECT _seed_trans('invitation.accept', '00000000-0000-0000-0001-000000000004'::uuid, '수락', 'Accept');
SELECT _seed_trans('invitation.reject', '00000000-0000-0000-0001-000000000004'::uuid, '거절', 'Reject');
SELECT _seed_trans('invitation.accepted', '00000000-0000-0000-0001-000000000004'::uuid, '초대를 수락했습니다.', 'Invitation accepted.');
SELECT _seed_trans('invitation.rejected', '00000000-0000-0000-0001-000000000004'::uuid, '초대를 거절했습니다.', 'Invitation rejected.');
SELECT _seed_trans('invitation.rejectReason', '00000000-0000-0000-0001-000000000004'::uuid, '거절 사유', 'Rejection Reason');
SELECT _seed_trans('invitation.rejectReasonPlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, '거절 사유를 입력하세요 (선택)', 'Enter rejection reason (optional)');
SELECT _seed_trans('invitation.from', '00000000-0000-0000-0001-000000000004'::uuid, '초대한 파트너', 'Invited By');
SELECT _seed_trans('invitation.sessionName', '00000000-0000-0000-0001-000000000004'::uuid, '세션명', 'Session Name');
SELECT _seed_trans('invitation.invitedAt', '00000000-0000-0000-0001-000000000004'::uuid, '초대일', 'Invited At');

-- 강연자 관리
SELECT _seed_trans('presenter.title', '00000000-0000-0000-0001-000000000004'::uuid, '강연자 관리', 'Presenter Management');
SELECT _seed_trans('presenter.desc', '00000000-0000-0000-0001-000000000004'::uuid, '세션의 강연자/발표자를 관리합니다.', 'Manage presenters for this session.');
SELECT _seed_trans('presenter.add', '00000000-0000-0000-0001-000000000004'::uuid, '강연자 추가', 'Add Presenter');
SELECT _seed_trans('presenter.noPresenters', '00000000-0000-0000-0001-000000000004'::uuid, '등록된 강연자가 없습니다.', 'No presenters registered.');
SELECT _seed_trans('presenter.addType', '00000000-0000-0000-0001-000000000004'::uuid, '추가 방식', 'Add Method');
SELECT _seed_trans('presenter.typeTeamMember', '00000000-0000-0000-0001-000000000004'::uuid, '팀원 지정', 'Team Member');
SELECT _seed_trans('presenter.typePartner', '00000000-0000-0000-0001-000000000004'::uuid, '강연자 파트너 초대', 'Invite Instructor Partner');
SELECT _seed_trans('presenter.typeManual', '00000000-0000-0000-0001-000000000004'::uuid, '직접 입력', 'Manual Entry');
SELECT _seed_trans('presenter.selectTeamMember', '00000000-0000-0000-0001-000000000004'::uuid, '팀원 선택', 'Select Team Member');
SELECT _seed_trans('presenter.searchInstructor', '00000000-0000-0000-0001-000000000004'::uuid, '강연자 파트너 검색', 'Search Instructor Partner');
SELECT _seed_trans('presenter.searchInstructorPlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, '이메일, 이름, 전문분야로 검색...', 'Search by email, name, or specialty...');
SELECT _seed_trans('presenter.searchMemberPlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, '이메일로 팀원 검색...', 'Search member by email...');
SELECT _seed_trans('presenter.noInstructorsFound', '00000000-0000-0000-0001-000000000004'::uuid, '검색 결과가 없습니다.', 'No instructors found.');
SELECT _seed_trans('presenter.manualName', '00000000-0000-0000-0001-000000000004'::uuid, '강연자 이름', 'Presenter Name');
SELECT _seed_trans('presenter.manualTitle', '00000000-0000-0000-0001-000000000004'::uuid, '직책/소속', 'Title/Affiliation');
SELECT _seed_trans('presenter.manualBio', '00000000-0000-0000-0001-000000000004'::uuid, '소개', 'Bio');
SELECT _seed_trans('presenter.manualImage', '00000000-0000-0000-0001-000000000004'::uuid, '프로필 이미지', 'Profile Image');
SELECT _seed_trans('presenter.displayName', '00000000-0000-0000-0001-000000000004'::uuid, '표시 이름', 'Display Name');
SELECT _seed_trans('presenter.displayTitle', '00000000-0000-0000-0001-000000000004'::uuid, '표시 직책', 'Display Title');
SELECT _seed_trans('presenter.displayOrder', '00000000-0000-0000-0001-000000000004'::uuid, '표시 순서', 'Display Order');
SELECT _seed_trans('presenter.added', '00000000-0000-0000-0001-000000000004'::uuid, '강연자가 추가되었습니다.', 'Presenter has been added.');
SELECT _seed_trans('presenter.removed', '00000000-0000-0000-0001-000000000004'::uuid, '강연자가 삭제되었습니다.', 'Presenter has been removed.');
SELECT _seed_trans('presenter.updated', '00000000-0000-0000-0001-000000000004'::uuid, '강연자 정보가 수정되었습니다.', 'Presenter has been updated.');
SELECT _seed_trans('presenter.inviteSent', '00000000-0000-0000-0001-000000000004'::uuid, '강연자 초대가 발송되었습니다.', 'Presenter invitation has been sent.');
SELECT _seed_trans('presenter.pending', '00000000-0000-0000-0001-000000000004'::uuid, '수락 대기', 'Pending');
SELECT _seed_trans('presenter.confirmed', '00000000-0000-0000-0001-000000000004'::uuid, '확정', 'Confirmed');
SELECT _seed_trans('presenter.rejected', '00000000-0000-0000-0001-000000000004'::uuid, '거절됨', 'Rejected');

-- 강연자 초대 (강연자 파트너 입장)
SELECT _seed_trans('presenterInvite.title', '00000000-0000-0000-0001-000000000004'::uuid, '강연자 초대', 'Presenter Invitations');
SELECT _seed_trans('presenterInvite.desc', '00000000-0000-0000-0001-000000000004'::uuid, '세션 강연자로 초대받은 목록입니다.', 'List of sessions you have been invited to as a presenter.');
SELECT _seed_trans('presenterInvite.noInvitations', '00000000-0000-0000-0001-000000000004'::uuid, '강연자 초대가 없습니다.', 'No presenter invitations.');

-- 세션 협업 탭
SELECT _seed_trans('session.collaboration', '00000000-0000-0000-0001-000000000004'::uuid, '협업', 'Collaboration');
SELECT _seed_trans('session.instructorCannotInvite', '00000000-0000-0000-0001-000000000004'::uuid, '강연자 파트너는 다른 파트너를 초대할 수 없습니다.', 'Instructor partners cannot invite other partners.');
SELECT _seed_trans('session.canInviteAgency', '00000000-0000-0000-0001-000000000004'::uuid, '행사자는 대행업체만 초대할 수 있습니다.', 'Organizers can only invite agencies.');
SELECT _seed_trans('session.canInviteOrganizer', '00000000-0000-0000-0001-000000000004'::uuid, '대행업체는 행사자만 초대할 수 있습니다.', 'Agencies can only invite organizers.');
SELECT _seed_trans('session.searchAgencyDesc', '00000000-0000-0000-0001-000000000004'::uuid, '협업할 대행업체를 검색하세요.', 'Search for an agency to collaborate with.');
SELECT _seed_trans('session.searchOrganizerDesc', '00000000-0000-0000-0001-000000000004'::uuid, '협업할 행사자를 검색하세요.', 'Search for an organizer to collaborate with.');
SELECT _seed_trans('session.searchToFind', '00000000-0000-0000-0001-000000000004'::uuid, '검색어를 입력하세요.', 'Enter a search term.');
SELECT _seed_trans('session.cancelInviteConfirm', '00000000-0000-0000-0001-000000000004'::uuid, '이 초대를 취소하시겠습니까?', 'Are you sure you want to cancel this invitation?');

-- 강연자 추가 관련
SELECT _seed_trans('presenter.addDesc', '00000000-0000-0000-0001-000000000004'::uuid, '세션에 강연자를 추가하는 방식을 선택하세요.', 'Choose how to add a presenter to this session.');
SELECT _seed_trans('presenter.noTeamMembers', '00000000-0000-0000-0001-000000000004'::uuid, '등록된 팀원이 없습니다.', 'No team members registered.');
SELECT _seed_trans('presenter.nameRequired', '00000000-0000-0000-0001-000000000004'::uuid, '강연자 이름을 입력하세요.', 'Please enter the presenter name.');
SELECT _seed_trans('presenter.namePlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, '강연자 이름을 입력하세요', 'Enter presenter name');
SELECT _seed_trans('presenter.titlePlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, '예: CEO, 교수, 전문 강연자', 'e.g. CEO, Professor, Expert Instructor');
SELECT _seed_trans('presenter.bioPlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, '강연자 소개를 입력하세요', 'Enter presenter bio');
SELECT _seed_trans('presenter.edit', '00000000-0000-0000-0001-000000000004'::uuid, '강연자 수정', 'Edit Presenter');
SELECT _seed_trans('presenter.deleteConfirm', '00000000-0000-0000-0001-000000000004'::uuid, '강연자 삭제', 'Delete Presenter');
SELECT _seed_trans('presenter.deleteConfirmDesc', '00000000-0000-0000-0001-000000000004'::uuid, '이 강연자를 삭제하시겠습니까?', 'Are you sure you want to delete this presenter?');

-- 강연자 타입 배지
SELECT _seed_trans('presenter.typeManualBadge', '00000000-0000-0000-0001-000000000004'::uuid, '직접입력', 'Manual');
SELECT _seed_trans('presenter.typeMemberBadge', '00000000-0000-0000-0001-000000000004'::uuid, '팀원', 'Member');
SELECT _seed_trans('presenter.typePartnerBadge', '00000000-0000-0000-0001-000000000004'::uuid, '파트너', 'Partner');

-- 팀원 정보 팝업
SELECT _seed_trans('presenter.memberInfo', '00000000-0000-0000-0001-000000000004'::uuid, '팀원 정보', 'Team Member Info');
SELECT _seed_trans('presenter.memberDetails', '00000000-0000-0000-0001-000000000004'::uuid, '팀원 상세', 'Member Details');
SELECT _seed_trans('presenter.belongsTo', '00000000-0000-0000-0001-000000000004'::uuid, '소속 파트너', 'Belongs To');
SELECT _seed_trans('partner.type', '00000000-0000-0000-0001-000000000004'::uuid, '파트너 유형', 'Partner Type');
SELECT _seed_trans('partner.displayName', '00000000-0000-0000-0001-000000000004'::uuid, '표시 이름', 'Display Name');
SELECT _seed_trans('partner.companyName', '00000000-0000-0000-0001-000000000004'::uuid, '회사명', 'Company Name');
SELECT _seed_trans('partner.representative', '00000000-0000-0000-0001-000000000004'::uuid, '대표자명', 'Representative');

-- 공통
SELECT _seed_trans('common.invite', '00000000-0000-0000-0001-000000000001'::uuid, '초대', 'Invite');
SELECT _seed_trans('common.add', '00000000-0000-0000-0001-000000000001'::uuid, '추가', 'Add');

-- 에러 메시지
SELECT _seed_trans('error.alreadyHasPartner', '00000000-0000-0000-0001-000000000006'::uuid, '이미 초대된 파트너가 있습니다.', 'A partner has already been invited.');
SELECT _seed_trans('error.incompatiblePartnerType', '00000000-0000-0000-0001-000000000006'::uuid, '호환되지 않는 파트너 타입입니다.', 'Incompatible partner type.');
SELECT _seed_trans('error.inviteNotFound', '00000000-0000-0000-0001-000000000006'::uuid, '초대를 찾을 수 없습니다.', 'Invitation not found.');
SELECT _seed_trans('error.alreadyResponded', '00000000-0000-0000-0001-000000000006'::uuid, '이미 응답한 초대입니다.', 'Already responded to this invitation.');
SELECT _seed_trans('error.searchFailed', '00000000-0000-0000-0001-000000000006'::uuid, '검색에 실패했습니다.', 'Search failed.');
SELECT _seed_trans('error.inviteFailed', '00000000-0000-0000-0001-000000000006'::uuid, '초대에 실패했습니다.', 'Invitation failed.');
SELECT _seed_trans('error.cancelFailed', '00000000-0000-0000-0001-000000000006'::uuid, '취소에 실패했습니다.', 'Cancellation failed.');
SELECT _seed_trans('error.addFailed', '00000000-0000-0000-0001-000000000006'::uuid, '추가에 실패했습니다.', 'Failed to add.');
SELECT _seed_trans('error.responseFailed', '00000000-0000-0000-0001-000000000006'::uuid, '응답 처리에 실패했습니다.', 'Failed to process response.');

-- 초대 관련 추가
SELECT _seed_trans('invitation.rejectReasonDesc', '00000000-0000-0000-0001-000000000004'::uuid, '거절 사유를 입력하세요. 이 사유는 초대한 파트너에게 전달됩니다.', 'Enter a reason for rejection. This will be shared with the inviting partner.');

-- 세션 파트너 섹션
SELECT _seed_trans('session.partnerSection', '00000000-0000-0000-0001-000000000004'::uuid, '협업 파트너', 'Collaboration Partners');
SELECT _seed_trans('session.partnerSectionDesc', '00000000-0000-0000-0001-000000000004'::uuid, '세션에 참여하는 행사자와 대행사입니다.', 'Organizers and agencies participating in this session.');
SELECT _seed_trans('session.creator', '00000000-0000-0000-0001-000000000004'::uuid, '생성자', 'Creator');
SELECT _seed_trans('session.inviteOrganizer', '00000000-0000-0000-0001-000000000004'::uuid, '행사자 초대', 'Invite Organizer');
SELECT _seed_trans('session.inviteAgency', '00000000-0000-0000-0001-000000000004'::uuid, '대행사 초대', 'Invite Agency');

-- 파트너 타입
SELECT _seed_trans('partner.typeOrganizer', '00000000-0000-0000-0001-000000000004'::uuid, '행사주최자', 'Event Organizer');
SELECT _seed_trans('partner.typeAgency', '00000000-0000-0000-0001-000000000004'::uuid, '대행사', 'Agency');
SELECT _seed_trans('partner.typeInstructor', '00000000-0000-0000-0001-000000000004'::uuid, '강연자', 'Instructor');

-- 공통 추가
SELECT _seed_trans('common.unknown', '00000000-0000-0000-0001-000000000001'::uuid, '알 수 없음', 'Unknown');
SELECT _seed_trans('common.untitled', '00000000-0000-0000-0001-000000000001'::uuid, '제목 없음', 'Untitled');

