-- =====================================================
-- 문의/지원 관련 언어팩
-- =====================================================

-- 메뉴
SELECT _seed_trans('menu.support', '00000000-0000-0000-0001-000000000004'::uuid, '문의/지원', 'Support');
SELECT _seed_trans('menu.supportManagement', '00000000-0000-0000-0001-000000000004'::uuid, '문의/지원 관리', 'Support Management');
SELECT _seed_trans('menu.faq', '00000000-0000-0000-0001-000000000004'::uuid, 'FAQ', 'FAQ');
SELECT _seed_trans('menu.inquiry', '00000000-0000-0000-0001-000000000004'::uuid, '1:1 문의', 'Inquiry');
SELECT _seed_trans('menu.faqManagement', '00000000-0000-0000-0001-000000000004'::uuid, 'FAQ 관리', 'FAQ Management');
SELECT _seed_trans('menu.inquiryManagement', '00000000-0000-0000-0001-000000000004'::uuid, '문의 관리', 'Inquiry Management');

-- FAQ
SELECT _seed_trans('faq.title', '00000000-0000-0000-0001-000000000004'::uuid, 'FAQ', 'FAQ');
SELECT _seed_trans('faq.desc', '00000000-0000-0000-0001-000000000004'::uuid, '자주 묻는 질문을 확인하세요.', 'Check frequently asked questions.');
SELECT _seed_trans('faq.management', '00000000-0000-0000-0001-000000000004'::uuid, 'FAQ 관리', 'FAQ Management');
SELECT _seed_trans('faq.managementDesc', '00000000-0000-0000-0001-000000000004'::uuid, '자주 묻는 질문을 등록하고 관리합니다.', 'Register and manage frequently asked questions.');
SELECT _seed_trans('faq.create', '00000000-0000-0000-0001-000000000004'::uuid, 'FAQ 추가', 'Add FAQ');
SELECT _seed_trans('faq.createDesc', '00000000-0000-0000-0001-000000000004'::uuid, '새로운 FAQ를 등록합니다.', 'Register a new FAQ.');
SELECT _seed_trans('faq.createFirst', '00000000-0000-0000-0001-000000000004'::uuid, '첫 FAQ 등록', 'Add First FAQ');
SELECT _seed_trans('faq.edit', '00000000-0000-0000-0001-000000000004'::uuid, 'FAQ 수정', 'Edit FAQ');
SELECT _seed_trans('faq.editDesc', '00000000-0000-0000-0001-000000000004'::uuid, 'FAQ 내용을 수정합니다.', 'Edit FAQ content.');
SELECT _seed_trans('faq.created', '00000000-0000-0000-0001-000000000004'::uuid, 'FAQ가 등록되었습니다.', 'FAQ has been created.');
SELECT _seed_trans('faq.noFaqs', '00000000-0000-0000-0001-000000000004'::uuid, '등록된 FAQ가 없습니다.', 'No FAQs registered.');
SELECT _seed_trans('faq.category', '00000000-0000-0000-0001-000000000004'::uuid, '카테고리', 'Category');
SELECT _seed_trans('faq.question', '00000000-0000-0000-0001-000000000004'::uuid, '질문', 'Question');
SELECT _seed_trans('faq.questionPlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, '질문을 입력하세요.', 'Enter your question.');
SELECT _seed_trans('faq.answer', '00000000-0000-0000-0001-000000000004'::uuid, '답변', 'Answer');
SELECT _seed_trans('faq.answerPlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, '답변을 입력하세요.', 'Enter your answer.');
SELECT _seed_trans('faq.isActive', '00000000-0000-0000-0001-000000000004'::uuid, '활성화', 'Active');
SELECT _seed_trans('faq.inactive', '00000000-0000-0000-0001-000000000004'::uuid, '비활성', 'Inactive');
SELECT _seed_trans('faq.show', '00000000-0000-0000-0001-000000000004'::uuid, '노출', 'Show');
SELECT _seed_trans('faq.hide', '00000000-0000-0000-0001-000000000004'::uuid, '숨김', 'Hide');
SELECT _seed_trans('faq.shown', '00000000-0000-0000-0001-000000000004'::uuid, 'FAQ가 노출되었습니다.', 'FAQ is now visible.');
SELECT _seed_trans('faq.hidden', '00000000-0000-0000-0001-000000000004'::uuid, 'FAQ가 숨겨졌습니다.', 'FAQ is now hidden.');
SELECT _seed_trans('faq.deleteConfirm', '00000000-0000-0000-0001-000000000004'::uuid, 'FAQ를 삭제하시겠습니까?', 'Delete this FAQ?');
SELECT _seed_trans('faq.deleteConfirmDesc', '00000000-0000-0000-0001-000000000004'::uuid, '이 작업은 되돌릴 수 없습니다.', 'This action cannot be undone.');
SELECT _seed_trans('faq.orderUpdated', '00000000-0000-0000-0001-000000000004'::uuid, '순서가 변경되었습니다.', 'Order has been updated.');
SELECT _seed_trans('faq.searchPlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, 'FAQ 검색...', 'Search FAQ...');

-- FAQ 카테고리
SELECT _seed_trans('faq.categoryAll', '00000000-0000-0000-0001-000000000004'::uuid, '전체', 'All');
SELECT _seed_trans('faq.categoryCommon', '00000000-0000-0000-0001-000000000004'::uuid, '공통', 'Common');
SELECT _seed_trans('faq.categoryOrganizer', '00000000-0000-0000-0001-000000000004'::uuid, '행사자', 'Organizer');
SELECT _seed_trans('faq.categoryAgency', '00000000-0000-0000-0001-000000000004'::uuid, '대행사', 'Agency');
SELECT _seed_trans('faq.categoryInstructor', '00000000-0000-0000-0001-000000000004'::uuid, '강연자', 'Instructor');

-- 1:1 문의
SELECT _seed_trans('inquiry.title', '00000000-0000-0000-0001-000000000004'::uuid, '1:1 문의', '1:1 Inquiry');
SELECT _seed_trans('inquiry.desc', '00000000-0000-0000-0001-000000000004'::uuid, '문의 사항을 남겨주시면 빠르게 답변 드리겠습니다.', 'Leave your inquiry and we will respond quickly.');
SELECT _seed_trans('inquiry.management', '00000000-0000-0000-0001-000000000004'::uuid, '문의 관리', 'Inquiry Management');
SELECT _seed_trans('inquiry.managementDesc', '00000000-0000-0000-0001-000000000004'::uuid, '파트너의 문의 내역을 확인하고 답변합니다.', 'Check and respond to partner inquiries.');
SELECT _seed_trans('inquiry.create', '00000000-0000-0000-0001-000000000004'::uuid, '문의하기', 'New Inquiry');
SELECT _seed_trans('inquiry.createDesc', '00000000-0000-0000-0001-000000000004'::uuid, '문의 내용을 작성해 주세요.', 'Please write your inquiry.');
SELECT _seed_trans('inquiry.createFirst', '00000000-0000-0000-0001-000000000004'::uuid, '첫 문의하기', 'Create First Inquiry');
SELECT _seed_trans('inquiry.submit', '00000000-0000-0000-0001-000000000004'::uuid, '문의 등록', 'Submit Inquiry');
SELECT _seed_trans('inquiry.submitted', '00000000-0000-0000-0001-000000000004'::uuid, '문의가 등록되었습니다.', 'Inquiry has been submitted.');
SELECT _seed_trans('inquiry.noInquiries', '00000000-0000-0000-0001-000000000004'::uuid, '문의 내역이 없습니다.', 'No inquiries found.');
SELECT _seed_trans('inquiry.category', '00000000-0000-0000-0001-000000000004'::uuid, '카테고리', 'Category');
SELECT _seed_trans('inquiry.titleLabel', '00000000-0000-0000-0001-000000000004'::uuid, '제목', 'Title');
SELECT _seed_trans('inquiry.titlePlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, '제목을 입력하세요.', 'Enter title.');
SELECT _seed_trans('inquiry.content', '00000000-0000-0000-0001-000000000004'::uuid, '내용', 'Content');
SELECT _seed_trans('inquiry.contentPlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, '문의 내용을 자세히 입력해 주세요.', 'Please enter your inquiry in detail.');

-- 문의 카테고리
SELECT _seed_trans('inquiry.categoryGeneral', '00000000-0000-0000-0001-000000000004'::uuid, '일반 문의', 'General');
SELECT _seed_trans('inquiry.categoryTechnical', '00000000-0000-0000-0001-000000000004'::uuid, '기술 지원', 'Technical');
SELECT _seed_trans('inquiry.categoryBilling', '00000000-0000-0000-0001-000000000004'::uuid, '결제/정산', 'Billing');
SELECT _seed_trans('inquiry.categoryEtc', '00000000-0000-0000-0001-000000000004'::uuid, '기타', 'Other');

-- 문의 상태
SELECT _seed_trans('inquiry.statusPending', '00000000-0000-0000-0001-000000000004'::uuid, '답변 대기', 'Pending');
SELECT _seed_trans('inquiry.statusInProgress', '00000000-0000-0000-0001-000000000004'::uuid, '처리 중', 'In Progress');
SELECT _seed_trans('inquiry.statusResolved', '00000000-0000-0000-0001-000000000004'::uuid, '답변 완료', 'Resolved');
SELECT _seed_trans('inquiry.statusUpdated', '00000000-0000-0000-0001-000000000004'::uuid, '상태가 변경되었습니다.', 'Status has been updated.');
SELECT _seed_trans('inquiry.changeStatus', '00000000-0000-0000-0001-000000000004'::uuid, '상태 변경', 'Change Status');

-- 답변
SELECT _seed_trans('inquiry.adminReply', '00000000-0000-0000-0001-000000000004'::uuid, '관리자 답변', 'Admin Reply');
SELECT _seed_trans('inquiry.myReply', '00000000-0000-0000-0001-000000000004'::uuid, '내 답글', 'My Reply');
SELECT _seed_trans('inquiry.noReplies', '00000000-0000-0000-0001-000000000004'::uuid, '아직 답변이 없습니다.', 'No replies yet.');
SELECT _seed_trans('inquiry.replyPlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, '답변을 입력하세요...', 'Enter your reply...');
SELECT _seed_trans('inquiry.additionalPlaceholder', '00000000-0000-0000-0001-000000000004'::uuid, '추가 문의 사항을 입력하세요...', 'Enter additional inquiry...');
SELECT _seed_trans('inquiry.replySent', '00000000-0000-0000-0001-000000000004'::uuid, '답변이 전송되었습니다.', 'Reply has been sent.');

