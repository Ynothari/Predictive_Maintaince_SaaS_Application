import { Router, Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../utils/supabase';
import { requireAdmin, requireSuperAdmin, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Get all users
router.get('/users', requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json(users);
  } catch (err) {
    next(err);
  }
});

// Create a user manually (admin only)
router.post('/users', requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { username, email, full_name, password, role } = req.body;
    const adminRole = req.user!.role;

    if (role === 'super_admin' && adminRole !== 'super_admin') {
      return res.status(403).json({ detail: 'Only super_admin can create super_admin users' });
    }

    // Admin creates user via Supabase Admin Auth API
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        username,
        full_name: full_name || '',
        role: role || 'user',
      }
    });

    if (error) {
      if (error.message.includes('already registered')) {
         return res.status(409).json({ detail: 'Email already registered' });
      }
      return res.status(400).json({ detail: error.message });
    }

    await supabaseAdmin.from('audit_logs').insert({
      user_id: req.user!.id,
      action: 'admin_created_user',
      details: `Created user: ${username} (role=${role})`
    });

    res.status(201).json({ status: 'success', user_id: data.user.id });
  } catch (err) {
    next(err);
  }
});

// Edit user role/profile
router.patch('/users/:userId', requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.userId as string;
    const { email, full_name, role } = req.body;
    const adminRole = req.user!.role;

    if (role === 'super_admin' && adminRole !== 'super_admin') {
      return res.status(403).json({ detail: 'Only super_admin can assign super_admin role' });
    }

    const updates: any = {};
    const authUpdates: any = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (role !== undefined) Object.assign(updates, { role });
    if (email !== undefined) authUpdates.email = email;

    // Update auth email if requested
    if (Object.keys(authUpdates).length > 0) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, authUpdates);
      if (error) return res.status(400).json({ detail: error.message });
      // Email is synced back to public.users via a different approach, or we update it manually here
      updates.email = email;
    }

    if (Object.keys(updates).length > 0) {
      const { error } = await supabaseAdmin.from('users').update(updates).eq('id', userId);
      if (error) throw error;
    }

    await supabaseAdmin.from('audit_logs').insert({
      user_id: req.user!.id,
      action: 'admin_edited_user',
      details: `Edited user ${userId}: role=${role}`
    });

    res.json({ status: 'success' });
  } catch (err) {
    next(err);
  }
});

// Delete user
router.delete('/users/:userId', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.userId as string;

    // Supabase admin API to delete user (triggers cascade delete in public.users)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) {
       return res.status(400).json({ detail: error.message });
    }

    await supabaseAdmin.from('audit_logs').insert({
      user_id: req.user!.id,
      action: 'admin_deleted_user',
      details: `Deleted user: ${userId}`
    });

    res.json({ status: 'deleted', user_id: userId });
  } catch (err) {
    next(err);
  }
});

// Get audit logs
router.get('/audit-log', requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { data: logs, error } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw error;
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

export default router;
