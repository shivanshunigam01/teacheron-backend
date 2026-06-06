import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getTeacherProfile, upsertTeacherProfile } from '../services/teacher.service.js';

export const getProfile = asyncHandler(async (req, res) => {
  const data = await getTeacherProfile(req.user.id);
  ApiResponse.ok(res, data, 'Teacher profile fetched');
});

export const createProfile = asyncHandler(async (req, res) => {
  const data = await upsertTeacherProfile(req.user.id, req.body);
  ApiResponse.created(
    res,
    data,
    data.profileComplete ? 'Teacher profile completed' : 'Teacher profile saved',
  );
});

export const updateProfile = asyncHandler(async (req, res) => {
  const data = await upsertTeacherProfile(req.user.id, req.body);
  ApiResponse.ok(
    res,
    data,
    data.profileComplete ? 'Teacher profile updated' : 'Teacher profile saved',
  );
});
