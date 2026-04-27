import { supabaseAdmin } from '../utils/supabase';

async function seedSuperAdmin() {
  console.log('Seeding super_admin account...');
  
  const email = 'admin@predictiq.com';
  const password = 'PredictIQ@Admin2024!';
  const username = 'admin';

  try {
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      console.log('Super admin already exists in public.users.');
      return;
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        username,
        full_name: 'System Administrator',
        role: 'super_admin' // This will copy to public.users via the trigger
      }
    });

    if (error) {
      console.error('Error creating super_admin:', error.message);
      return;
    }

    console.log('Successfully created super_admin!');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

seedSuperAdmin();
