-- =====================================================
-- 설문(Poll) 관련 언어팩
-- =====================================================

-- 기본
SELECT _seed_trans('poll.management', '00000000-0000-0000-0001-000000000004'::uuid, '설문 관리', 'Poll Management');
SELECT _seed_trans('poll.managementDesc', '00000000-0000-0000-0001-000000000004'::uuid, '실시간 설문을 생성하고 관리합니다.', 'Create and manage live polls.');
SELECT _seed_trans('poll.responseScreen', '00000000-0000-0000-0001-000000000004'::uuid, '응답 화면', 'Response Screen');
SELECT _seed_trans('poll.create', '00000000-0000-0000-0001-000000000004'::uuid, '설문 추가', 'Create Poll');
SELECT _seed_trans('poll.edit', '00000000-0000-0000-0001-000000000004'::uuid, '설문 수정', 'Edit Poll');
SELECT _seed_trans('poll.editDesc', '00000000-0000-0000-0001-000000000004'::uuid, '설문 내용과 보기를 편집합니다.', 'Edit poll content and options.');
SELECT _seed_trans('poll.created', '00000000-0000-0000-0001-000000000004'::uuid, '설문이 생성되었습니다.', 'Poll created.');
SELECT _seed_trans('poll.noPolls', '00000000-0000-0000-0001-000000000004'::uuid, '등록된 설문이 없습니다.', 'No polls registered.');
SELECT _seed_trans('poll.createFirst', '00000000-0000-0000-0001-000000000004'::uuid, '첫 설문 만들기', 'Create first poll');

-- 상태
SELECT _seed_trans('poll.statusDraft', '00000000-0000-0000-0001-000000000004'::uuid, '비노출', 'Hidden');
SELECT _seed_trans('poll.statusActive', '00000000-0000-0000-0001-000000000004'::uuid, '노출', 'Visible');
SELECT _seed_trans('poll.statusClosed', '00000000-0000-0000-0001-000000000004'::uuid, '종료', 'Closed');
SELECT _seed_trans('poll.show', '00000000-0000-0000-0001-000000000004'::uuid, '노출', 'Show');
SELECT _seed_trans('poll.hide', '00000000-0000-0000-0001-000000000004'::uuid, '비노출', 'Hide');
SELECT _seed_trans('poll.shown', '00000000-0000-0000-0001-000000000004'::uuid, '설문이 노출되었습니다.', 'Poll is now visible.');
SELECT _seed_trans('poll.hidden', '00000000-0000-0000-0001-000000000004'::uuid, '설문이 비노출 처리되었습니다.', 'Poll is now hidden.');
SELECT _seed_trans('poll.start', '00000000-0000-0000-0001-000000000004'::uuid, '시작', 'Start');
SELECT _seed_trans('poll.close', '00000000-0000-0000-0001-000000000004'::uuid, '종료', 'Close');
SELECT _seed_trans('poll.started', '00000000-0000-0000-0001-000000000004'::uuid, '설문이 시작되었습니다.', 'Poll started.');
SELECT _seed_trans('poll.closed', '00000000-0000-0000-0001-000000000004'::uuid, '설문이 종료되었습니다.', 'Poll closed.');

-- 유형
SELECT _seed_trans('poll.pollType', '00000000-0000-0000-0001-000000000004'::uuid, '설문 유형', 'Poll Type');
SELECT _seed_trans('poll.type.single', '00000000-0000-0000-0001-000000000004'::uuid, '단일 선택', 'Single Choice');
SELECT _seed_trans('poll.type.multiple', '00000000-0000-0000-0001-000000000004'::uuid, '복수 선택', 'Multiple Choice');
SELECT _seed_trans('poll.type.open', '00000000-0000-0000-0001-000000000004'::uuid, '주관식', 'Open-ended');

-- 질문/보기
SELECT _seed_trans('poll.question', '00000000-0000-0000-0001-000000000004'::uuid, '질문', 'Question');
SELECT _seed_trans('poll.questionPlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, '설문 질문을 입력하세요...', 'Enter your poll question...');
SELECT _seed_trans('poll.options', '00000000-0000-0000-0001-000000000004'::uuid, '보기', 'Options');
SELECT _seed_trans('poll.option', '00000000-0000-0000-0001-000000000004'::uuid, '보기', 'Option');
SELECT _seed_trans('poll.addOption', '00000000-0000-0000-0001-000000000004'::uuid, '보기 추가', 'Add Option');
SELECT _seed_trans('poll.maxSelections', '00000000-0000-0000-0001-000000000004'::uuid, '최대 선택 수', 'Max Selections');
SELECT _seed_trans('poll.maxSelectionsPlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, '제한 없음', 'No limit');

-- 설정
SELECT _seed_trans('poll.showResults', '00000000-0000-0000-0001-000000000004'::uuid, '결과 공개', 'Show Results');
SELECT _seed_trans('poll.allowAnonymous', '00000000-0000-0000-0001-000000000004'::uuid, '익명 응답 허용', 'Allow Anonymous');
SELECT _seed_trans('poll.isRequired', '00000000-0000-0000-0001-000000000004'::uuid, '필수 응답', 'Required');
SELECT _seed_trans('poll.required', '00000000-0000-0000-0001-000000000004'::uuid, '필수', 'Required');

-- 결과
SELECT _seed_trans('poll.results', '00000000-0000-0000-0001-000000000004'::uuid, '결과', 'Results');
SELECT _seed_trans('poll.totalResponses', '00000000-0000-0000-0001-000000000004'::uuid, '총 응답 수', 'Total Responses');
SELECT _seed_trans('poll.noResponses', '00000000-0000-0000-0001-000000000004'::uuid, '응답이 없습니다.', 'No responses yet.');

-- 삭제
SELECT _seed_trans('poll.deleteConfirm', '00000000-0000-0000-0001-000000000004'::uuid, '설문을 삭제하시겠습니까?', 'Delete this poll?');
SELECT _seed_trans('poll.deleteConfirmDesc', '00000000-0000-0000-0001-000000000004'::uuid, '이 작업은 되돌릴 수 없습니다. 설문과 모든 응답이 삭제됩니다.', 'This action cannot be undone. The poll and all responses will be deleted.');

-- 에러
SELECT _seed_trans('poll.error.questionRequired', '00000000-0000-0000-0001-000000000006'::uuid, '질문을 입력하세요.', 'Please enter a question.');
SELECT _seed_trans('poll.error.minOptions', '00000000-0000-0000-0001-000000000006'::uuid, '최소 2개의 보기가 필요합니다.', 'At least 2 options are required.');

-- 청중 화면
SELECT _seed_trans('poll.submit', '00000000-0000-0000-0001-000000000004'::uuid, '응답 제출', 'Submit');
SELECT _seed_trans('poll.submitAll', '00000000-0000-0000-0001-000000000004'::uuid, '설문 등록', 'Submit Survey');
SELECT _seed_trans('poll.submitted', '00000000-0000-0000-0001-000000000004'::uuid, '응답이 제출되었습니다.', 'Response submitted.');
SELECT _seed_trans('poll.allSubmitted', '00000000-0000-0000-0001-000000000004'::uuid, '설문이 제출되었습니다.', 'Survey submitted.');
SELECT _seed_trans('poll.submitComplete', '00000000-0000-0000-0001-000000000004'::uuid, '응답 완료', 'Response Complete');
SELECT _seed_trans('poll.thankYou', '00000000-0000-0000-0001-000000000004'::uuid, '참여해 주셔서 감사합니다.', 'Thank you for participating.');
SELECT _seed_trans('poll.alreadyResponded', '00000000-0000-0000-0001-000000000004'::uuid, '이미 응답하셨습니다.', 'You have already responded.');
SELECT _seed_trans('poll.selectOption', '00000000-0000-0000-0001-000000000004'::uuid, '보기를 선택하세요', 'Select an option');
SELECT _seed_trans('poll.enterResponse', '00000000-0000-0000-0001-000000000004'::uuid, '응답을 입력하세요', 'Enter your response');
SELECT _seed_trans('poll.requiredError', '00000000-0000-0000-0001-000000000004'::uuid, '{{num}}번 질문은 필수입니다.', 'Question {{num}} is required.');
SELECT _seed_trans('poll.maxSelectionsHint', '00000000-0000-0000-0001-000000000004'::uuid, '최대 {{max}}개 선택 가능', 'Select up to {{max}}');
SELECT _seed_trans('poll.maxSelectionsReached', '00000000-0000-0000-0001-000000000004'::uuid, '최대 {{max}}개까지만 선택할 수 있습니다.', 'You can select up to {{max}} options.');
SELECT _seed_trans('poll.viewResults', '00000000-0000-0000-0001-000000000004'::uuid, '결과 보기', 'View Results');

