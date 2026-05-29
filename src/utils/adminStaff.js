import AdminMember from '../models/AdminMember.model.js';
import { toJSON } from './serialize.js';

/** Attach staffRole to admin user JSON for auth responses. */
export async function withStaffRole(userDoc) {
  const data = toJSON(userDoc);
  if (data.role !== 'admin') return data;
  const member = await AdminMember.findOne({ userId: userDoc._id, isActive: true }).select(
    'staffRole permissions',
  );
  if (member) {
    data.staffRole = member.staffRole;
    if (member.permissions?.length) data.adminPermissions = member.permissions;
  }
  return data;
}
