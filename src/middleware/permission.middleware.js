import AdminMember from '../models/AdminMember.model.js';
import { ApiError } from '../utils/ApiError.js';

/** Default permissions when AdminMember.permissions is empty. */
export const ROLE_PERMISSIONS = {
  super_admin: ['*'],
  manager: [
    'courses.read',
    'courses.write',
    'courses.approve',
    'listings.read',
    'listings.write',
    'listings.approve',
    'accommodations.read',
    'accommodations.write',
    'banners.read',
    'banners.write',
    'reports.read',
    'reports.resolve',
    'users.read',
    'users.write',
    'tickets.read',
    'tickets.write',
    'notifications.send',
    'smtp.read',
    'smtp.write',
    'team.read',
  ],
  moderator: [
    'courses.read',
    'courses.approve',
    'listings.read',
    'listings.approve',
    'reports.read',
    'reports.resolve',
    'tickets.read',
    'tickets.write',
  ],
};

async function resolvePermissions(userId) {
  const member = await AdminMember.findOne({ userId, isActive: true });
  if (!member) {
    return null;
  }
  if (member.permissions?.length) {
    return member.permissions;
  }
  return ROLE_PERMISSIONS[member.staffRole] || [];
}

function hasPermission(perms, required) {
  if (!perms?.length) return false;
  if (perms.includes('*')) return true;
  return perms.includes(required);
}

export const requirePermission = (perm) => async (req, res, next) => {
  try {
    const perms = await resolvePermissions(req.user.id);
    if (!perms) {
      throw ApiError.forbidden('Admin member not found — contact a super admin');
    }
    if (!hasPermission(perms, perm)) {
      throw ApiError.forbidden('Missing permission');
    }
    next();
  } catch (err) {
    next(err);
  }
};

/** Pass if the staff member has any of the listed permissions. */
export const requireAnyPermission =
  (...required) =>
  async (req, res, next) => {
    try {
      const perms = await resolvePermissions(req.user.id);
      if (!perms) {
        throw ApiError.forbidden('Admin member not found — contact a super admin');
      }
      if (perms.includes('*')) return next();
      const ok = required.some((p) => perms.includes(p));
      if (!ok) throw ApiError.forbidden('Missing permission');
      next();
    } catch (err) {
      next(err);
    }
  };
