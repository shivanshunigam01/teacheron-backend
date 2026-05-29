import User from '../models/User.model.js';
import UserIpLog from '../models/UserIpLog.model.js';
import { toJSON } from '../utils/serialize.js';

export function riskLevelForCount(totalUsers) {
  if (totalUsers > 5) return 'high';
  if (totalUsers >= 3) return 'medium';
  return 'low';
}

function parseDeviceInfo(userAgent = '') {
  const ua = String(userAgent);
  if (!ua) return 'Unknown device';
  if (/mobile|android|iphone|ipad/i.test(ua)) return 'Mobile';
  if (/tablet/i.test(ua)) return 'Tablet';
  if (/windows/i.test(ua)) return 'Windows';
  if (/macintosh|mac os/i.test(ua)) return 'Mac';
  if (/linux/i.test(ua)) return 'Linux';
  return 'Desktop';
}

function shapeUserForIpMonitor(user) {
  const u = toJSON(user);
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    registrationIp: u.registrationIp,
    lastLoginIp: u.lastLoginIp,
    lastLoginAt: u.lastLoginAt,
    ipRiskFlag: !!u.ipRiskFlag,
    ipAdminNote: u.ipAdminNote || '',
    createdAt: u.createdAt,
    isActive: u.isActive !== false,
  };
}

function countRoles(users) {
  const counts = { student: 0, teacher: 0, parent: 0, admin: 0 };
  for (const u of users) {
    if (counts[u.role] !== undefined) counts[u.role] += 1;
  }
  return counts;
}

/** After register/login: log IP and refresh risk flags for that IP. */
import { getClientIp } from '../utils/getClientIp.js';

export async function recordUserIpActivity({ user, req, action }) {
  const ipAddress = req ? getClientIp(req) : null;
  if (!ipAddress) return null;

  const userAgent = req.headers['user-agent'] || '';

  await UserIpLog.create({
    userId: user._id,
    email: user.email,
    role: user.role,
    ipAddress,
    action,
    userAgent,
    deviceInfo: parseDeviceInfo(userAgent),
  });

  if (action === 'register') {
    user.registrationIp = ipAddress;
    user.lastLoginIp = ipAddress;
    user.lastLoginAt = new Date();
  } else if (action === 'login') {
    user.lastLoginIp = ipAddress;
    user.lastLoginAt = new Date();
  }

  await user.save({ validateBeforeSave: false });
  await refreshIpRiskFlagsForIp(ipAddress);

  return ipAddress;
}

export async function refreshIpRiskFlagsForIp(ipAddress) {
  if (!ipAddress) return;

  const userIds = await UserIpLog.distinct('userId', { ipAddress });
  if (userIds.length < 2) {
    await User.updateMany(
      { _id: { $in: userIds }, registrationIp: ipAddress },
      { ipRiskFlag: false },
    );
    return;
  }

  await User.updateMany({ _id: { $in: userIds } }, { ipRiskFlag: true });
}

async function buildGroupsFromAggregation(minUsers = 2) {
  const grouped = await UserIpLog.aggregate([
    {
      $group: {
        _id: '$ipAddress',
        userIds: { $addToSet: '$userId' },
        firstSeenAt: { $min: '$createdAt' },
        lastSeenAt: { $max: '$createdAt' },
      },
    },
    { $match: { $expr: { $gte: [{ $size: '$userIds' }, minUsers] } } },
    { $sort: { lastSeenAt: -1 } },
  ]);

  const results = [];
  for (const g of grouped) {
    const users = await User.find({ _id: { $in: g.userIds } }).sort({ createdAt: 1 });
    const roleCounts = countRoles(users);
    results.push({
      ipAddress: g._id,
      totalUsers: g.userIds.length,
      riskLevel: riskLevelForCount(g.userIds.length),
      firstSeenAt: g.firstSeenAt,
      lastSeenAt: g.lastSeenAt,
      roleCounts,
      users: users.map(shapeUserForIpMonitor),
    });
  }
  return results;
}

export async function getIpMonitorGroups(minUsers = 2) {
  return buildGroupsFromAggregation(minUsers);
}

export async function getIpMonitorSummary() {
  const groups = await buildGroupsFromAggregation(2);
  const highRiskIps = groups.filter((g) => g.riskLevel === 'high').length;
  const affectedUserIds = new Set();
  for (const g of groups) {
    for (const u of g.users) affectedUserIds.add(u.id);
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const todayDuplicateLoginIps = await UserIpLog.aggregate([
    { $match: { action: 'login', createdAt: { $gte: startOfDay } } },
    { $group: { _id: '$ipAddress', userIds: { $addToSet: '$userId' } } },
    { $match: { $expr: { $gte: [{ $size: '$userIds' }, 2] } } },
    { $count: 'total' },
  ]);

  return {
    totalFlaggedIps: groups.length,
    totalAffectedUsers: affectedUserIds.size,
    highRiskIps,
    todayDuplicateLoginIps: todayDuplicateLoginIps[0]?.total ?? 0,
  };
}

export async function getUsersAndLogsByIp(ipAddress) {
  const users = await User.find({
    _id: {
      $in: await UserIpLog.distinct('userId', { ipAddress }),
    },
  }).sort({ createdAt: 1 });

  const logs = await UserIpLog.find({ ipAddress }).sort({ createdAt: -1 }).limit(500);

  return {
    ipAddress,
    totalUsers: users.length,
    riskLevel: riskLevelForCount(users.length),
    roleCounts: countRoles(users),
    users: users.map(shapeUserForIpMonitor),
    logs: logs.map((l) => {
      const row = toJSON(l);
      return {
        id: row.id,
        userId: row.userId,
        email: row.email,
        role: row.role,
        ipAddress: row.ipAddress,
        action: row.action,
        userAgent: row.userAgent,
        deviceInfo: row.deviceInfo,
        createdAt: row.createdAt,
      };
    }),
  };
}

export async function listIpLogs(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 25));
  const skip = (page - 1) * limit;
  const filter = {};

  if (query.ipAddress) filter.ipAddress = query.ipAddress;
  if (query.userId) filter.userId = query.userId;
  if (query.action) filter.action = query.action;
  if (query.role) filter.role = query.role;

  if (query.startDate || query.endDate) {
    filter.createdAt = {};
    if (query.startDate) filter.createdAt.$gte = new Date(query.startDate);
    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }

  const [items, total] = await Promise.all([
    UserIpLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    UserIpLog.countDocuments(filter),
  ]);

  return {
    items: items.map((l) => {
      const row = toJSON(l);
      return {
        id: row.id,
        userId: row.userId,
        email: row.email,
        role: row.role,
        ipAddress: row.ipAddress,
        action: row.action,
        userAgent: row.userAgent,
        deviceInfo: row.deviceInfo,
        createdAt: row.createdAt,
      };
    }),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  };
}

export async function updateUserIpFlag(userId, { ipRiskFlag, ipAdminNote }) {
  const user = await User.findById(userId);
  if (!user) return null;
  if (typeof ipRiskFlag === 'boolean') user.ipRiskFlag = ipRiskFlag;
  if (ipAdminNote !== undefined) user.ipAdminNote = String(ipAdminNote).slice(0, 500);
  await user.save();
  return shapeUserForIpMonitor(user);
}
