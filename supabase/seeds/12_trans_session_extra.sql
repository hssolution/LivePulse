-- =====================================================
-- 세션 추가 언어팩
-- =====================================================

-- 세션 상세 페이지
SELECT _seed_trans('session.design', '00000000-0000-0000-0001-000000000005', '디자인', 'Design');
SELECT _seed_trans('session.settings', '00000000-0000-0000-0001-000000000005', '설정', 'Settings');
SELECT _seed_trans('session.assets', '00000000-0000-0000-0001-000000000005', '이미지 및 배너', 'Images & Banners');
SELECT _seed_trans('session.assetsDesc', '00000000-0000-0000-0001-000000000005', '청중 등록 페이지에 표시될 이미지를 업로드하세요.', 'Upload images to be displayed on the audience registration page.');
SELECT _seed_trans('session.preview', '00000000-0000-0000-0001-000000000005', '미리보기', 'Preview');
SELECT _seed_trans('session.imageUploaded', '00000000-0000-0000-0001-000000000005', '이미지가 업로드되었습니다.', 'Image uploaded.');
SELECT _seed_trans('session.imageDeleted', '00000000-0000-0000-0001-000000000005', '이미지가 삭제되었습니다.', 'Image deleted.');
SELECT _seed_trans('session.linkCopied', '00000000-0000-0000-0001-000000000005', '참여 링크가 복사되었습니다.', 'Join link copied.');
SELECT _seed_trans('session.copyLink', '00000000-0000-0000-0001-000000000005', '링크 복사', 'Copy Link');

-- 상태 관리
SELECT _seed_trans('session.statusManagement', '00000000-0000-0000-0001-000000000005', '상태 관리', 'Status Management');
SELECT _seed_trans('session.statusManagementDesc', '00000000-0000-0000-0001-000000000005', '세션의 공개 상태를 관리합니다.', 'Manage the session visibility status.');
SELECT _seed_trans('session.currentStatus', '00000000-0000-0000-0001-000000000005', '현재 상태', 'Current Status');
SELECT _seed_trans('session.statusChanged', '00000000-0000-0000-0001-000000000005', '상태가 변경되었습니다.', 'Status changed.');
SELECT _seed_trans('session.publish', '00000000-0000-0000-0001-000000000005', '공개하기', 'Publish');
SELECT _seed_trans('session.unpublish', '00000000-0000-0000-0001-000000000005', '비공개로 전환', 'Unpublish');
SELECT _seed_trans('session.start', '00000000-0000-0000-0001-000000000005', '세션 시작', 'Start Session');
SELECT _seed_trans('session.end', '00000000-0000-0000-0001-000000000005', '세션 종료', 'End Session');

-- 위험 영역
SELECT _seed_trans('session.dangerZone', '00000000-0000-0000-0001-000000000005', '위험 영역', 'Danger Zone');
SELECT _seed_trans('session.dangerZoneDesc', '00000000-0000-0000-0001-000000000005', '이 작업은 되돌릴 수 없습니다.', 'These actions cannot be undone.');
SELECT _seed_trans('session.delete', '00000000-0000-0000-0001-000000000005', '세션 삭제', 'Delete Session');
SELECT _seed_trans('session.deleteConfirmTitle', '00000000-0000-0000-0001-000000000005', '세션을 삭제하시겠습니까?', 'Delete this session?');
SELECT _seed_trans('session.deleteConfirmDesc', '00000000-0000-0000-0001-000000000005', '이 작업은 되돌릴 수 없습니다. 모든 참여자 데이터와 에셋이 삭제됩니다.', 'This action cannot be undone. All participant data and assets will be deleted.');

-- QR 코드
SELECT _seed_trans('session.qrCode', '00000000-0000-0000-0001-000000000005', 'QR 코드', 'QR Code');
SELECT _seed_trans('session.qrCodeDesc', '00000000-0000-0000-0001-000000000005', '청중이 이 QR 코드를 스캔하여 세션에 참여할 수 있습니다.', 'Audience can scan this QR code to join the session.');

-- 청중 등록 페이지
SELECT _seed_trans('join.sessionInfo', '00000000-0000-0000-0001-000000000005', '행사 정보', 'Event Information');
SELECT _seed_trans('join.enterSession', '00000000-0000-0000-0001-000000000005', '참여하기', 'Join Now');
SELECT _seed_trans('join.joinNow', '00000000-0000-0000-0001-000000000005', '지금 참여하세요', 'Join Now');
SELECT _seed_trans('join.joinDesc', '00000000-0000-0000-0001-000000000005', '버튼을 클릭하여 세션에 참여하세요.', 'Click the button to join the session.');
SELECT _seed_trans('join.participantCount', '00000000-0000-0000-0001-000000000005', '현재 {count}명 / 최대 {max}명', '{count} / {max} participants');
SELECT _seed_trans('join.contact', '00000000-0000-0000-0001-000000000005', '문의', 'Contact');
SELECT _seed_trans('join.code', '00000000-0000-0000-0001-000000000005', '참여 코드', 'Join Code');

-- 에러
SELECT _seed_trans('join.error.invalidCode', '00000000-0000-0000-0001-000000000006', '유효하지 않은 코드', 'Invalid Code');
SELECT _seed_trans('join.error.invalidCodeDesc', '00000000-0000-0000-0001-000000000006', '참여 코드가 유효하지 않습니다.', 'The join code is invalid.');
SELECT _seed_trans('join.error.notFound', '00000000-0000-0000-0001-000000000006', '세션을 찾을 수 없음', 'Session Not Found');
SELECT _seed_trans('join.error.notFoundDesc', '00000000-0000-0000-0001-000000000006', '해당 코드의 세션을 찾을 수 없거나 아직 공개되지 않았습니다.', 'Session not found or not yet published.');
SELECT _seed_trans('join.error.loadFailed', '00000000-0000-0000-0001-000000000006', '로드 실패', 'Load Failed');
SELECT _seed_trans('join.error.loadFailedDesc', '00000000-0000-0000-0001-000000000006', '세션 정보를 불러오는데 실패했습니다.', 'Failed to load session information.');

-- 공통 추가
SELECT _seed_trans('common.view', '00000000-0000-0000-0001-000000000001', '보기', 'View');
SELECT _seed_trans('error.uploadFailed', '00000000-0000-0000-0001-000000000006', '업로드에 실패했습니다.', 'Upload failed.');
SELECT _seed_trans('error.loadFailed', '00000000-0000-0000-0001-000000000006', '불러오기에 실패했습니다.', 'Failed to load.');
SELECT _seed_trans('error.saveFailed', '00000000-0000-0000-0001-000000000006', '저장에 실패했습니다.', 'Failed to save.');
SELECT _seed_trans('error.deleteFailed', '00000000-0000-0000-0001-000000000006', '삭제에 실패했습니다.', 'Failed to delete.');
SELECT _seed_trans('error.updateFailed', '00000000-0000-0000-0001-000000000006', '업데이트에 실패했습니다.', 'Failed to update.');
SELECT _seed_trans('error.createFailed', '00000000-0000-0000-0001-000000000006', '생성에 실패했습니다.', 'Failed to create.');
SELECT _seed_trans('common.saved', '00000000-0000-0000-0001-000000000001', '저장되었습니다.', 'Saved.');

