import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  getIpMonitorGroups,
  getIpMonitorSummary,
  getUsersAndLogsByIp,
  listIpLogs,
  updateUserIpFlag,
} from '../services/ipMonitor.service.js';

export const groups = asyncHandler(async (req, res) => {
  const minUsers = Math.max(2, parseInt(req.query.minUsers, 10) || 2);
  const data = await getIpMonitorGroups(minUsers);
  ApiResponse.ok(res, data, 'IP groups fetched');
});

export const summary = asyncHandler(async (req, res) => {
  const data = await getIpMonitorSummary();
  ApiResponse.ok(res, data, 'IP monitor summary fetched');
});

export const usersByIp = asyncHandler(async (req, res) => {
  const ip = decodeURIComponent(req.params.ipAddress || '').trim();
  if (!ip) throw ApiError.badRequest('IP address required');
  const data = await getUsersAndLogsByIp(ip);
  ApiResponse.ok(res, data, 'IP detail fetched');
});

export const logs = asyncHandler(async (req, res) => {
  const data = await listIpLogs(req.query);
  ApiResponse.ok(res, data, 'IP logs fetched');
});

export const flagUser = asyncHandler(async (req, res) => {
  const user = await updateUserIpFlag(req.params.userId, req.body);
  if (!user) throw ApiError.notFound('User not found');
  ApiResponse.ok(res, user, 'User IP flag updated');
});
