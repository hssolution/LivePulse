/**
 * 테스트 사용자 생성 스크립트
 * 
 * 실행 방법:
 * node scripts/seed-users.js
 * 
 * 주의: Supabase가 실행 중이어야 합니다 (npx supabase start)
 */

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const TEST_PASSWORD = 'l64047495!';

const testUsers = [
  {
    email: 'lhscj2466@gmail.com',
    role: 'admin',
    userType: 'admin'
  },
  {
    email: 'user01@gmail.com',
    role: 'user',
    userType: 'user'
  },
  {
    email: 'user02@gmail.com',
    role: 'user',
    userType: 'user'
  },
  {
    email: 'user03@gmail.com',
    role: 'user',
    userType: 'user'
  }
];

async function createUser(user) {
  try {
    // Admin API로 사용자 생성
    const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY
      },
      body: JSON.stringify({
        email: user.email,
        password: TEST_PASSWORD,
        email_confirm: true,
        user_metadata: {
          email: user.email
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      if (error.msg?.includes('already been registered') || error.message?.includes('already been registered')) {
        console.log(`⚠️  ${user.email} - 이미 존재함`);
        return null;
      }
      throw new Error(JSON.stringify(error));
    }

    const data = await response.json();
    console.log(`✅ ${user.email} - 생성 완료 (ID: ${data.id})`);
    
    // profile 업데이트 (role, user_type)
    const profileResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${data.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        user_role: user.role,
        user_type: user.userType,
        status: 'active'
      })
    });

    if (!profileResponse.ok) {
      console.log(`⚠️  ${user.email} - 프로필 업데이트 실패`);
    } else {
      console.log(`   → 프로필 업데이트: role=${user.role}, type=${user.userType}`);
    }

    return data;
  } catch (error) {
    console.error(`❌ ${user.email} - 에러:`, error.message);
    return null;
  }
}

async function updateAppConfig() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/app_config?key=eq.admin_initialized`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ value: 'true' })
    });

    if (response.ok) {
      console.log('\n✅ admin_initialized = true 설정 완료');
    }
  } catch (error) {
    console.error('❌ app_config 업데이트 실패:', error.message);
  }
}

async function main() {
  console.log('🚀 테스트 사용자 생성 시작...\n');
  console.log(`비밀번호: ${TEST_PASSWORD}\n`);
  
  for (const user of testUsers) {
    await createUser(user);
  }

  await updateAppConfig();
  
  console.log('\n✨ 완료!');
  console.log('\n테스트 계정:');
  testUsers.forEach(u => {
    console.log(`  - ${u.email} (${u.role})`);
  });
  console.log(`\n비밀번호: ${TEST_PASSWORD}`);
}

main();

