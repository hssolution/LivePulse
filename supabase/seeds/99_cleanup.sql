-- =====================================================
-- 정리 (헬퍼 함수 삭제)
-- =====================================================
DROP FUNCTION IF EXISTS _seed_trans;

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Seed data loaded successfully!';
  RAISE NOTICE '- Languages: 2 (ko, en)';
  RAISE NOTICE '- Categories: 6';
  RAISE NOTICE '- Translation keys: 220+';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'First signup will become admin!';
  RAISE NOTICE '===========================================';
END $$;

