-- =====================================================
-- 팀원 관리 관련 언어팩
-- =====================================================

-- 메뉴
SELECT _seed_trans('menu.teamMembers', '00000000-0000-0000-0001-000000000004', '팀원 관리', 'Team Members');

-- 팀원 관리 페이지
SELECT _seed_trans('team.title', '00000000-0000-0000-0001-000000000004', '팀원 관리', 'Team Members');
SELECT _seed_trans('team.description', '00000000-0000-0000-0001-000000000004', '팀원을 초대하고 관리합니다.', 'Invite and manage team members.');
SELECT _seed_trans('team.invite', '00000000-0000-0000-0001-000000000004', '팀원 초대', 'Invite Member');
SELECT _seed_trans('team.inviteMember', '00000000-0000-0000-0001-000000000004', '팀원 초대', 'Invite Team Member');
SELECT _seed_trans('team.inviteDesc', '00000000-0000-0000-0001-000000000004', '이메일 주소를 입력하여 팀원을 초대합니다.', 'Enter an email address to invite a team member.');
SELECT _seed_trans('team.sendInvite', '00000000-0000-0000-0001-000000000004', '초대 발송', 'Send Invite');
SELECT _seed_trans('team.inviteSent', '00000000-0000-0000-0001-000000000004', '초대가 발송되었습니다.', 'Invitation sent successfully.');
SELECT _seed_trans('team.alreadyInvited', '00000000-0000-0000-0001-000000000004', '이미 초대된 이메일입니다.', 'This email has already been invited.');

-- 역할
SELECT _seed_trans('team.owner', '00000000-0000-0000-0001-000000000004', '소유자', 'Owner');
SELECT _seed_trans('team.admin', '00000000-0000-0000-0001-000000000004', '관리자', 'Admin');
SELECT _seed_trans('team.member', '00000000-0000-0000-0001-000000000004', '멤버', 'Member');
SELECT _seed_trans('team.role', '00000000-0000-0000-0001-000000000004', '역할', 'Role');
SELECT _seed_trans('team.newRole', '00000000-0000-0000-0001-000000000004', '새 역할', 'New Role');
SELECT _seed_trans('team.changeRole', '00000000-0000-0000-0001-000000000004', '역할 변경', 'Change Role');
SELECT _seed_trans('team.roleChanged', '00000000-0000-0000-0001-000000000004', '역할이 변경되었습니다.', 'Role changed successfully.');
SELECT _seed_trans('team.cannotChangeOwner', '00000000-0000-0000-0001-000000000004', '소유자의 역할은 변경할 수 없습니다.', 'Cannot change owner role.');

-- 상태
SELECT _seed_trans('team.pending', '00000000-0000-0000-0001-000000000004', '대기중', 'Pending');
SELECT _seed_trans('team.accepted', '00000000-0000-0000-0001-000000000004', '수락됨', 'Accepted');
SELECT _seed_trans('team.rejected', '00000000-0000-0000-0001-000000000004', '거부됨', 'Rejected');
SELECT _seed_trans('team.status', '00000000-0000-0000-0001-000000000004', '상태', 'Status');

-- 목록
SELECT _seed_trans('team.memberList', '00000000-0000-0000-0001-000000000004', '팀원 목록', 'Team Members List');
SELECT _seed_trans('team.memberListDesc', '00000000-0000-0000-0001-000000000004', '현재 팀에 소속된 멤버 목록입니다.', 'List of members in your team.');
SELECT _seed_trans('team.noMembers', '00000000-0000-0000-0001-000000000004', '팀원이 없습니다.', 'No team members.');
SELECT _seed_trans('team.email', '00000000-0000-0000-0001-000000000004', '이메일', 'Email');
SELECT _seed_trans('team.invitedAt', '00000000-0000-0000-0001-000000000004', '초대일', 'Invited At');

-- 통계
SELECT _seed_trans('team.totalMembers', '00000000-0000-0000-0001-000000000004', '전체 팀원', 'Total Members');
SELECT _seed_trans('team.activeMembers', '00000000-0000-0000-0001-000000000004', '활성 팀원', 'Active Members');
SELECT _seed_trans('team.pendingInvites', '00000000-0000-0000-0001-000000000004', '대기중 초대', 'Pending Invites');
SELECT _seed_trans('team.admins', '00000000-0000-0000-0001-000000000004', '관리자 수', 'Admins');

-- 삭제
SELECT _seed_trans('team.removeMember', '00000000-0000-0000-0001-000000000004', '팀원 제거', 'Remove Member');
SELECT _seed_trans('team.removeConfirm', '00000000-0000-0000-0001-000000000004', '{email}을(를) 팀에서 제거하시겠습니까?', 'Are you sure you want to remove {email} from the team?');
SELECT _seed_trans('team.memberRemoved', '00000000-0000-0000-0001-000000000004', '팀원이 제거되었습니다.', 'Member removed successfully.');
SELECT _seed_trans('team.cannotDeleteOwner', '00000000-0000-0000-0001-000000000004', '소유자는 제거할 수 없습니다.', 'Cannot remove owner.');

-- 링크
SELECT _seed_trans('team.copyLink', '00000000-0000-0000-0001-000000000004', '초대 링크 복사', 'Copy Invite Link');
SELECT _seed_trans('team.linkCopied', '00000000-0000-0000-0001-000000000004', '초대 링크가 복사되었습니다.', 'Invite link copied to clipboard.');

-- 제한
SELECT _seed_trans('team.instructorNotAllowed', '00000000-0000-0000-0001-000000000004', '강연자 타입은 팀원 관리 기능을 사용할 수 없습니다.', 'Instructor type cannot use team management.');
SELECT _seed_trans('team.notPartner', '00000000-0000-0000-0001-000000000004', '파트너 정보가 없습니다.', 'No partner information found.');

-- 초대 수락 페이지
SELECT _seed_trans('invite.title', '00000000-0000-0000-0001-000000000004', '팀 초대', 'Team Invitation');
SELECT _seed_trans('invite.description', '00000000-0000-0000-0001-000000000004', '팀에 초대되었습니다.', 'You have been invited to join a team.');
SELECT _seed_trans('invite.from', '00000000-0000-0000-0001-000000000004', '초대자', 'From');
SELECT _seed_trans('invite.role', '00000000-0000-0000-0001-000000000004', '역할', 'Role');
SELECT _seed_trans('invite.email', '00000000-0000-0000-0001-000000000004', '이메일', 'Email');
SELECT _seed_trans('invite.accept', '00000000-0000-0000-0001-000000000004', '초대 수락', 'Accept Invitation');
SELECT _seed_trans('invite.accepted', '00000000-0000-0000-0001-000000000004', '초대가 수락되었습니다!', 'Invitation Accepted!');
SELECT _seed_trans('invite.acceptedDesc', '00000000-0000-0000-0001-000000000004', '{name} 팀에 합류했습니다.', 'You have joined the {name} team.');
SELECT _seed_trans('invite.goToPartner', '00000000-0000-0000-0001-000000000004', '파트너 센터로 이동', 'Go to Partner Center');
SELECT _seed_trans('invite.loginRequired', '00000000-0000-0000-0001-000000000004', '초대를 수락하려면 로그인이 필요합니다.', 'Please log in to accept the invitation.');
SELECT _seed_trans('invite.wrongAccount', '00000000-0000-0000-0001-000000000004', '초대된 이메일({email})과 다른 계정으로 로그인되어 있습니다.', 'You are logged in with a different account than the invited email ({email}).');
SELECT _seed_trans('invite.switchAccount', '00000000-0000-0000-0001-000000000004', '다른 계정으로 로그인', 'Switch Account');

-- 초대 에러
SELECT _seed_trans('invite.error.invalidTokenTitle', '00000000-0000-0000-0001-000000000006', '유효하지 않은 초대', 'Invalid Invitation');
SELECT _seed_trans('invite.error.invalidTokenDesc', '00000000-0000-0000-0001-000000000006', '초대 링크가 유효하지 않거나 만료되었습니다.', 'The invitation link is invalid or has expired.');
SELECT _seed_trans('invite.error.loadFailedTitle', '00000000-0000-0000-0001-000000000006', '로드 실패', 'Load Failed');
SELECT _seed_trans('invite.error.loadFailedDesc', '00000000-0000-0000-0001-000000000006', '초대 정보를 불러오는데 실패했습니다.', 'Failed to load invitation information.');
SELECT _seed_trans('invite.error.emailMismatchTitle', '00000000-0000-0000-0001-000000000006', '이메일 불일치', 'Email Mismatch');
SELECT _seed_trans('invite.error.emailMismatchDesc', '00000000-0000-0000-0001-000000000006', '로그인한 이메일이 초대된 이메일과 일치하지 않습니다.', 'Your logged in email does not match the invited email.');
SELECT _seed_trans('invite.error.acceptFailedTitle', '00000000-0000-0000-0001-000000000006', '수락 실패', 'Accept Failed');
SELECT _seed_trans('invite.error.acceptFailedDesc', '00000000-0000-0000-0001-000000000006', '초대 수락 중 오류가 발생했습니다.', 'An error occurred while accepting the invitation.');

-- 에러 메시지
SELECT _seed_trans('error.inviteFailed', '00000000-0000-0000-0001-000000000006', '초대 발송에 실패했습니다.', 'Failed to send invitation.');

