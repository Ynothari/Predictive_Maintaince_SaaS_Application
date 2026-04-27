import { Router, Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../utils/supabase';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ detail: 'Username and password are required' });
    }

    let emailToLogin = '';

    if (username.includes('@')) {
      // The user entered an email address
      emailToLogin = username;
    } else {
      // The user entered a username
      const { data: profile } = await supabaseAdmin
        .from('users')
        .select('email')
        .eq('username', username)
        .single();

      if (!profile) {
        return res.status(401).json({ detail: 'Invalid credentials' });
      }
      emailToLogin = profile.email;
    }

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email: emailToLogin,
      password: password,
    });

    if (error) {
      // Log failed attempt
      await supabaseAdmin.from('audit_logs').insert({
        action: 'user_login_failed',
        details: `Failed login for ${username}: ${error.message}`
      });
      return res.status(401).json({ detail: 'Invalid credentials' });
    }

    // Update last_login_at
    await supabaseAdmin
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', data.user.id);

    // Audit log
    await supabaseAdmin.from('audit_logs').insert({
      user_id: data.user.id,
      action: 'user_login',
      details: `User ${username} logged in`
    });

    res.json({
      access_token: data.session.access_token,
      token_type: 'bearer',
      refresh_token: data.session.refresh_token,
    });
  } catch (err) {
    next(err);
  }
});

// Register
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, email, password, full_name } = req.body;
    
    // Validation
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
    if (!usernameRegex.test(username)) {
      return res.status(422).json({ detail: 'Username must be 3-30 characters: letters, numbers, underscores only.' });
    }
    if (password.length < 8) {
      return res.status(422).json({ detail: 'Password must be at least 8 characters.' });
    }

    // Check if username already exists in our public table
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('username')
      .eq('username', username)
      .maybeSingle();

    if (existingUser) {
      return res.status(409).json({ detail: 'Username already exists' });
    }

    // Register with Supabase Auth (this triggers the SQL trigger to create user in public.users)
    const { data, error } = await supabaseAdmin.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          full_name: full_name?.trim() || '',
          role: 'user', // default role
        }
      }
    });

    if (error) {
      return res.status(400).json({ detail: error.message });
    }

    if (!data.user || !data.session) {
       // e.g. Email confirmation required scenario
       return res.status(200).json({ detail: 'Registration initiated. Please check your email to confirm.' });
    }

    await supabaseAdmin.from('audit_logs').insert({
      user_id: data.user.id,
      action: 'user_registered',
      details: `New user: ${username}`
    });

    res.json({
      access_token: data.session.access_token,
      token_type: 'bearer',
    });
  } catch (err) {
    next(err);
  }
});

// Get Profile Info
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { data: profile, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      return res.status(404).json({ detail: 'User profile not found' });
    }

    res.json({
      id: profile.id,
      username: profile.username,
      email: profile.email,
      full_name: profile.full_name,
      role: profile.role,
      username_changed: profile.username_changed,
      analysis_count: profile.analysis_count,
      last_login_at: profile.last_login_at,
      totp_enabled: profile.totp_enabled,
      created_at: profile.created_at,
    });
  } catch (err) {
    next(err);
  }
});

// Forgot Password
router.post('/forgot-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ detail: 'Email is required' });

    // Assuming the frontend app is hosted on standard dev port or via environment variable
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${frontendUrl}/reset-password`,
    });

    if (error) {
      return res.status(400).json({ detail: error.message });
    }

    res.json({ message: 'Reset email sent successfully' });
  } catch (err) {
    next(err);
  }
});

// Reset Password
router.post('/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, new_password } = req.body;
    if (!token || !new_password) {
      return res.status(400).json({ detail: 'Token and new password are required' });
    }

    // We instantiate a Supabase client using the reset token provided by the frontend
    const { createClient } = await import('@supabase/supabase-js');
    const userClient = createClient(
      process.env.SUPABASE_URL || '', 
      process.env.SUPABASE_KEY || '', 
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { error } = await userClient.auth.updateUser({ password: new_password });

    if (error) {
      return res.status(400).json({ detail: error.message });
    }

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
