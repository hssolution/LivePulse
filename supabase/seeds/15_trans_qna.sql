-- =====================================================
-- Phase 13: Q&A 관련 언어팩
-- =====================================================

-- Q&A 기본
SELECT _seed_trans('qna.title', '00000000-0000-0000-0001-000000000004'::uuid, 'Q&A', 'Q&A');
SELECT _seed_trans('qna.desc', '00000000-0000-0000-0001-000000000004'::uuid, '궁금한 점을 질문하세요. 강연자가 답변해 드립니다.', 'Ask your questions. The presenter will answer them.');
SELECT _seed_trans('qna.askQuestion', '00000000-0000-0000-0001-000000000004'::uuid, '질문하기', 'Ask a Question');
SELECT _seed_trans('qna.placeholder', '00000000-0000-0000-0001-000000000004'::uuid, '질문을 입력하세요...', 'Enter your question...');
SELECT _seed_trans('qna.submit', '00000000-0000-0000-0001-000000000004'::uuid, '질문 등록', 'Submit Question');
SELECT _seed_trans('qna.submitting', '00000000-0000-0000-0001-000000000004'::uuid, '등록 중...', 'Submitting...');
SELECT _seed_trans('qna.submitted', '00000000-0000-0000-0001-000000000004'::uuid, '질문이 등록되었습니다.', 'Your question has been submitted.');
SELECT _seed_trans('qna.noQuestions', '00000000-0000-0000-0001-000000000004'::uuid, '아직 질문이 없습니다.', 'No questions yet.');
SELECT _seed_trans('qna.beFirst', '00000000-0000-0000-0001-000000000004'::uuid, '첫 번째 질문을 남겨보세요!', 'Be the first to ask a question!');

-- 익명 설정
SELECT _seed_trans('qna.anonymous', '00000000-0000-0000-0001-000000000004'::uuid, '익명', 'Anonymous');
SELECT _seed_trans('qna.postAnonymously', '00000000-0000-0000-0001-000000000004'::uuid, '익명으로 질문하기', 'Post anonymously');
SELECT _seed_trans('qna.yourName', '00000000-0000-0000-0001-000000000004'::uuid, '이름 (선택)', 'Your name (optional)');
SELECT _seed_trans('qna.namePlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, '표시될 이름을 입력하세요', 'Enter your display name');

-- 좋아요
SELECT _seed_trans('qna.like', '00000000-0000-0000-0001-000000000004'::uuid, '좋아요', 'Like');
SELECT _seed_trans('qna.likes', '00000000-0000-0000-0001-000000000004'::uuid, '좋아요', 'Likes');
SELECT _seed_trans('qna.liked', '00000000-0000-0000-0001-000000000004'::uuid, '좋아요 취소', 'Unlike');

-- 상태
SELECT _seed_trans('qna.statusPending', '00000000-0000-0000-0001-000000000004'::uuid, '검토 대기', 'Pending Review');
SELECT _seed_trans('qna.statusApproved', '00000000-0000-0000-0001-000000000004'::uuid, '승인됨', 'Approved');
SELECT _seed_trans('qna.statusAnswered', '00000000-0000-0000-0001-000000000004'::uuid, '답변 완료', 'Answered');
SELECT _seed_trans('qna.statusHidden', '00000000-0000-0000-0001-000000000004'::uuid, '숨김', 'Hidden');
SELECT _seed_trans('qna.statusRejected', '00000000-0000-0000-0001-000000000004'::uuid, '거부됨', 'Rejected');

-- 정렬
SELECT _seed_trans('qna.sortNewest', '00000000-0000-0000-0001-000000000004'::uuid, '최신순', 'Newest');
SELECT _seed_trans('qna.sortPopular', '00000000-0000-0000-0001-000000000004'::uuid, '인기순', 'Most Popular');
SELECT _seed_trans('qna.sortOldest', '00000000-0000-0000-0001-000000000004'::uuid, '오래된순', 'Oldest');

-- 필터
SELECT _seed_trans('qna.filterAll', '00000000-0000-0000-0001-000000000004'::uuid, '전체', 'All');
SELECT _seed_trans('qna.filterPending', '00000000-0000-0000-0001-000000000004'::uuid, '대기 중', 'Pending');
SELECT _seed_trans('qna.filterAnswered', '00000000-0000-0000-0001-000000000004'::uuid, '답변됨', 'Answered');
SELECT _seed_trans('qna.filterUnanswered', '00000000-0000-0000-0001-000000000004'::uuid, '미답변', 'Unanswered');

-- 관리자/파트너 기능
SELECT _seed_trans('qna.management', '00000000-0000-0000-0001-000000000004'::uuid, 'Q&A 관리', 'Q&A Management');
SELECT _seed_trans('qna.managementDesc', '00000000-0000-0000-0001-000000000004'::uuid, '청중의 질문을 관리하고 답변하세요.', 'Manage and answer questions from the audience.');
SELECT _seed_trans('qna.approve', '00000000-0000-0000-0001-000000000004'::uuid, '승인', 'Approve');
SELECT _seed_trans('qna.reject', '00000000-0000-0000-0001-000000000004'::uuid, '거부', 'Reject');
SELECT _seed_trans('qna.hide', '00000000-0000-0000-0001-000000000004'::uuid, '숨기기', 'Hide');
SELECT _seed_trans('qna.unhide', '00000000-0000-0000-0001-000000000004'::uuid, '숨김 해제', 'Unhide');
SELECT _seed_trans('qna.pin', '00000000-0000-0000-0001-000000000004'::uuid, '상단 고정', 'Pin');
SELECT _seed_trans('qna.unpin', '00000000-0000-0000-0001-000000000004'::uuid, '고정 해제', 'Unpin');
SELECT _seed_trans('qna.highlight', '00000000-0000-0000-0001-000000000004'::uuid, '하이라이트', 'Highlight');
SELECT _seed_trans('qna.unhighlight', '00000000-0000-0000-0001-000000000004'::uuid, '하이라이트 해제', 'Remove Highlight');
SELECT _seed_trans('qna.delete', '00000000-0000-0000-0001-000000000004'::uuid, '삭제', 'Delete');

-- 답변
SELECT _seed_trans('qna.answer', '00000000-0000-0000-0001-000000000004'::uuid, '답변', 'Answer');
SELECT _seed_trans('qna.answerPlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, '답변을 입력하세요...', 'Enter your answer...');
SELECT _seed_trans('qna.submitAnswer', '00000000-0000-0000-0001-000000000004'::uuid, '답변 등록', 'Submit Answer');
SELECT _seed_trans('qna.answerSubmitted', '00000000-0000-0000-0001-000000000004'::uuid, '답변이 등록되었습니다.', 'Answer has been submitted.');
SELECT _seed_trans('qna.editAnswer', '00000000-0000-0000-0001-000000000004'::uuid, '답변 수정', 'Edit Answer');
SELECT _seed_trans('qna.deleteAnswer', '00000000-0000-0000-0001-000000000004'::uuid, '답변 삭제', 'Delete Answer');
SELECT _seed_trans('qna.answeredBy', '00000000-0000-0000-0001-000000000004'::uuid, '답변자', 'Answered by');

-- 거부 사유
SELECT _seed_trans('qna.rejectReason', '00000000-0000-0000-0001-000000000004'::uuid, '거부 사유', 'Rejection Reason');
SELECT _seed_trans('qna.rejectReasonPlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, '거부 사유를 입력하세요 (선택)', 'Enter rejection reason (optional)');

-- 통계
SELECT _seed_trans('qna.totalQuestions', '00000000-0000-0000-0001-000000000004'::uuid, '전체 질문', 'Total Questions');
SELECT _seed_trans('qna.pendingQuestions', '00000000-0000-0000-0001-000000000004'::uuid, '대기 중', 'Pending');
SELECT _seed_trans('qna.answeredQuestions', '00000000-0000-0000-0001-000000000004'::uuid, '답변 완료', 'Answered');

-- 실시간
SELECT _seed_trans('qna.newQuestion', '00000000-0000-0000-0001-000000000004'::uuid, '새 질문이 등록되었습니다.', 'New question submitted.');
SELECT _seed_trans('qna.questionUpdated', '00000000-0000-0000-0001-000000000004'::uuid, '질문이 업데이트되었습니다.', 'Question updated.');

-- 송출 기능
SELECT _seed_trans('qna.broadcasting', '00000000-0000-0000-0001-000000000004'::uuid, '송출 중', 'Broadcasting');
SELECT _seed_trans('qna.displayed', '00000000-0000-0000-0001-000000000004'::uuid, '화면 표시', 'Displayed');
SELECT _seed_trans('qna.startBroadcast', '00000000-0000-0000-0001-000000000004'::uuid, '송출 시작', 'Start Broadcast');
SELECT _seed_trans('qna.stopBroadcast', '00000000-0000-0000-0001-000000000004'::uuid, '송출 중지', 'Stop Broadcast');
SELECT _seed_trans('qna.broadcastStarted', '00000000-0000-0000-0001-000000000004'::uuid, '질문 송출을 시작합니다.', 'Broadcasting started.');
SELECT _seed_trans('qna.broadcastStopped', '00000000-0000-0000-0001-000000000004'::uuid, '질문 송출을 종료합니다.', 'Broadcasting stopped.');
SELECT _seed_trans('qna.showOnScreen', '00000000-0000-0000-0001-000000000004'::uuid, '화면에 표시', 'Show on Screen');
SELECT _seed_trans('qna.hideFromScreen', '00000000-0000-0000-0001-000000000004'::uuid, '화면에서 숨김', 'Hide from Screen');

-- 강연자 지정
SELECT _seed_trans('qna.assignPresenter', '00000000-0000-0000-0001-000000000004'::uuid, '강연자 지정', 'Assign Presenter');
SELECT _seed_trans('qna.noPresenter', '00000000-0000-0000-0001-000000000004'::uuid, '지정 안함', 'No Presenter');
SELECT _seed_trans('qna.presenterAssigned', '00000000-0000-0000-0001-000000000004'::uuid, '강연자가 지정되었습니다.', 'Presenter assigned.');

-- 드래그 앤 드랍 순서 변경
SELECT _seed_trans('qna.orderUpdated', '00000000-0000-0000-0001-000000000004'::uuid, '순서가 변경되었습니다.', 'Order updated.');
SELECT _seed_trans('qna.cannotReorderWhileBroadcasting', '00000000-0000-0000-0001-000000000004'::uuid, '송출 중에는 순서를 변경할 수 없습니다.', 'Cannot reorder while broadcasting.');

-- 에러
SELECT _seed_trans('error.questionEmpty', '00000000-0000-0000-0001-000000000006'::uuid, '질문 내용을 입력하세요.', 'Please enter your question.');
SELECT _seed_trans('error.questionTooLong', '00000000-0000-0000-0001-000000000006'::uuid, '질문이 너무 깁니다. (최대 500자)', 'Question is too long. (Max 500 characters)');
SELECT _seed_trans('error.questionSubmitFailed', '00000000-0000-0000-0001-000000000006'::uuid, '질문 등록에 실패했습니다.', 'Failed to submit question.');
SELECT _seed_trans('error.answerSubmitFailed', '00000000-0000-0000-0001-000000000006'::uuid, '답변 등록에 실패했습니다.', 'Failed to submit answer.');

-- 세션 탭
SELECT _seed_trans('session.qna', '00000000-0000-0000-0001-000000000004'::uuid, 'Q&A', 'Q&A');

-- 실시간 참여 페이지
SELECT _seed_trans('live.live', '00000000-0000-0000-0001-000000000004'::uuid, 'LIVE', 'LIVE');
SELECT _seed_trans('live.poll', '00000000-0000-0000-0001-000000000004'::uuid, '설문', 'Poll');
SELECT _seed_trans('live.info', '00000000-0000-0000-0001-000000000004'::uuid, '정보', 'Info');
SELECT _seed_trans('live.noPoll', '00000000-0000-0000-0001-000000000004'::uuid, '진행 중인 설문이 없습니다.', 'No active poll.');
SELECT _seed_trans('live.presenters', '00000000-0000-0000-0001-000000000004'::uuid, '강연자/발표자', 'Presenters');
SELECT _seed_trans('live.sessionEnded', '00000000-0000-0000-0001-000000000004'::uuid, '세션이 종료되었습니다.', 'Session has ended.');
SELECT _seed_trans('live.sessionEndedDesc', '00000000-0000-0000-0001-000000000004'::uuid, '이 세션은 종료되었습니다. 참여해 주셔서 감사합니다.', 'This session has ended. Thank you for participating.');
SELECT _seed_trans('live.backToJoin', '00000000-0000-0000-0001-000000000004'::uuid, '세션 정보로 돌아가기', 'Back to Session Info');
SELECT _seed_trans('live.error.notActive', '00000000-0000-0000-0001-000000000006'::uuid, '세션이 활성화되지 않았습니다.', 'Session is not active.');
SELECT _seed_trans('live.error.notActiveDesc', '00000000-0000-0000-0001-000000000006'::uuid, '세션이 아직 시작되지 않았거나 종료되었습니다.', 'The session has not started yet or has already ended.');

-- 강연자 페이지
SELECT _seed_trans('presenter.qnaControl', '00000000-0000-0000-0001-000000000004'::uuid, 'Q&A 송출 컨트롤', 'Q&A Broadcast Control');
SELECT _seed_trans('presenter.openBroadcast', '00000000-0000-0000-0001-000000000004'::uuid, '송출 화면 열기', 'Open Broadcast');
SELECT _seed_trans('presenter.nowBroadcasting', '00000000-0000-0000-0001-000000000004'::uuid, '현재 송출 중', 'Now Broadcasting');
SELECT _seed_trans('presenter.stopBroadcast', '00000000-0000-0000-0001-000000000004'::uuid, '송출 중지', 'Stop Broadcast');
SELECT _seed_trans('presenter.questionList', '00000000-0000-0000-0001-000000000004'::uuid, '질문 목록', 'Question List');
SELECT _seed_trans('presenter.questions', '00000000-0000-0000-0001-000000000004'::uuid, '개', 'questions');
SELECT _seed_trans('presenter.noQuestions', '00000000-0000-0000-0001-000000000004'::uuid, '표시할 질문이 없습니다.', 'No questions to display.');

-- 좌장 선택 화면
SELECT _seed_trans('presenter.selectQuestion', '00000000-0000-0000-0001-000000000004'::uuid, '질문을 선택하면 질문이 송출됩니다.', 'Select a question to broadcast.');
SELECT _seed_trans('presenter.selectQuestionDesc', '00000000-0000-0000-0001-000000000004'::uuid, '선택했던 질문은 회색 배경으로 표시됩니다.', 'Previously selected questions are shown with a gray background.');
SELECT _seed_trans('presenter.broadcasting', '00000000-0000-0000-0001-000000000004'::uuid, '송출중', 'Broadcasting');
SELECT _seed_trans('presenter.select', '00000000-0000-0000-0001-000000000004'::uuid, '선택', 'Select');
SELECT _seed_trans('presenter.noDisplayedQuestions', '00000000-0000-0000-0001-000000000004'::uuid, '표시할 질문이 없습니다.', 'No questions to display.');
SELECT _seed_trans('presenter.noPermission', '00000000-0000-0000-0001-000000000004'::uuid, '이 화면에 접근할 권한이 없습니다.', 'You do not have permission to access this page.');
SELECT _seed_trans('presenter.selectScreen', '00000000-0000-0000-0001-000000000004'::uuid, '좌장 선택', 'Presenter Selection');

-- 송출 화면
SELECT _seed_trans('broadcast.live', '00000000-0000-0000-0001-000000000004'::uuid, 'LIVE', 'LIVE');
SELECT _seed_trans('broadcast.waitingForQuestion', '00000000-0000-0000-0001-000000000004'::uuid, '질문 대기 중...', 'Waiting for question...');

-- 송출 설정
SELECT _seed_trans('broadcast.settings', '00000000-0000-0000-0001-000000000004'::uuid, '송출 설정', 'Broadcast Settings');
SELECT _seed_trans('broadcast.screen', '00000000-0000-0000-0001-000000000004'::uuid, '송출 화면', 'Broadcast Screen');
SELECT _seed_trans('broadcast.settingsTitle', '00000000-0000-0000-0001-000000000004'::uuid, '송출화면 설정', 'Broadcast Screen Settings');
SELECT _seed_trans('broadcast.settingsDesc', '00000000-0000-0000-0001-000000000004'::uuid, '질문이 송출되는 화면의 스타일을 설정합니다.', 'Configure the style of the broadcast screen.');
SELECT _seed_trans('broadcast.width', '00000000-0000-0000-0001-000000000004'::uuid, '너비', 'Width');
SELECT _seed_trans('broadcast.fontSize', '00000000-0000-0000-0001-000000000004'::uuid, '폰트 크기', 'Font Size');
SELECT _seed_trans('broadcast.fontColor', '00000000-0000-0000-0001-000000000004'::uuid, '폰트 색상', 'Font Color');
SELECT _seed_trans('broadcast.backgroundColor', '00000000-0000-0000-0001-000000000004'::uuid, '배경 색상', 'Background Color');
SELECT _seed_trans('broadcast.borderColor', '00000000-0000-0000-0001-000000000004'::uuid, '테두리 색상', 'Border Color');
SELECT _seed_trans('broadcast.innerBgColor', '00000000-0000-0000-0001-000000000004'::uuid, '테두리 안 배경', 'Inner Background');
SELECT _seed_trans('broadcast.textAlign', '00000000-0000-0000-0001-000000000004'::uuid, '폰트 정렬', 'Text Align');
SELECT _seed_trans('broadcast.verticalAlign', '00000000-0000-0000-0001-000000000004'::uuid, '세로 정렬', 'Vertical Align');
SELECT _seed_trans('broadcast.alignLeft', '00000000-0000-0000-0001-000000000004'::uuid, '왼쪽', 'Left');
SELECT _seed_trans('broadcast.alignCenter', '00000000-0000-0000-0001-000000000004'::uuid, '가운데', 'Center');
SELECT _seed_trans('broadcast.alignRight', '00000000-0000-0000-0001-000000000004'::uuid, '오른쪽', 'Right');
SELECT _seed_trans('broadcast.alignTop', '00000000-0000-0000-0001-000000000004'::uuid, '위', 'Top');
SELECT _seed_trans('broadcast.alignMiddle', '00000000-0000-0000-0001-000000000004'::uuid, '가운데', 'Middle');
SELECT _seed_trans('broadcast.alignBottom', '00000000-0000-0000-0001-000000000004'::uuid, '아래', 'Bottom');

-- 질문 직접 등록
SELECT _seed_trans('qna.addQuestion', '00000000-0000-0000-0001-000000000004'::uuid, '질문 등록', 'Add Question');
SELECT _seed_trans('qna.addQuestionDesc', '00000000-0000-0000-0001-000000000004'::uuid, '관리자가 직접 질문을 등록합니다.', 'Manager adds a question directly.');
SELECT _seed_trans('qna.authorName', '00000000-0000-0000-0001-000000000004'::uuid, '작성자명', 'Author Name');
SELECT _seed_trans('qna.authorNamePlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, '작성자 이름을 입력하세요', 'Enter author name');
SELECT _seed_trans('qna.questionContent', '00000000-0000-0000-0001-000000000004'::uuid, '질문 내용', 'Question Content');
SELECT _seed_trans('qna.questionPlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, '질문 내용을 입력하세요...', 'Enter your question...');
SELECT _seed_trans('qna.autoApprove', '00000000-0000-0000-0001-000000000004'::uuid, '자동 승인', 'Auto Approve');
SELECT _seed_trans('qna.autoApproveDesc', '00000000-0000-0000-0001-000000000004'::uuid, '등록 즉시 승인 상태로 표시합니다.', 'Automatically approve upon registration.');
SELECT _seed_trans('qna.questionAdded', '00000000-0000-0000-0001-000000000004'::uuid, '질문이 등록되었습니다.', 'Question has been added.');
SELECT _seed_trans('qna.contentRequired', '00000000-0000-0000-0001-000000000004'::uuid, '질문 내용을 입력해주세요.', 'Please enter the question content.');

