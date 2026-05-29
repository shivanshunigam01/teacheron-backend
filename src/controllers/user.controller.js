import User from '../models/User.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination, paginationMeta } from '../utils/pagination.js';
import { toJSON, toJSONList } from '../utils/serialize.js';
import { buildTutorFilter, buildTutorSort, mapTutorUser } from '../utils/tutorSearch.js';
export const list=asyncHandler(async(req,res)=>{const {page,limit,skip,sort}=getPagination(req.query);const filter={};if(req.query.role)filter.role=req.query.role;if(req.query.q)filter.$text={$search:req.query.q};const [items,total]=await Promise.all([User.find(filter).sort(sort).skip(skip).limit(limit),User.countDocuments(filter)]);ApiResponse.ok(res,{items:toJSONList(items),pagination:paginationMeta(total,page,limit)},'Users fetched');});
export const getById=asyncHandler(async(req,res)=>{const user=await User.findById(req.params.id);if(!user)throw ApiError.notFound('User not found');ApiResponse.ok(res,toJSON(user),'User fetched');});
export const update=asyncHandler(async(req,res)=>{if(req.user.role!=='admin'&&req.user.id!==req.params.id)throw ApiError.forbidden();const {role,email,passwordHash,googleId,...safe}=req.body;const user=await User.findByIdAndUpdate(req.params.id,safe,{new:true,runValidators:true});ApiResponse.ok(res,toJSON(user),'User updated');});
export const tutorsFacets = asyncHandler(async (req, res) => {
  const teachers = await User.find({ role: 'teacher', isActive: { $ne: false } }).select(
    'teacherProfile.subjects teacherProfile.location teacherProfile.languages',
  );
  const subjects = new Set();
  const locations = new Set();
  const languages = new Set();
  for (const t of teachers) {
    for (const s of t.teacherProfile?.subjects || []) if (s) subjects.add(s);
    if (t.teacherProfile?.location) locations.add(t.teacherProfile.location);
    for (const l of t.teacherProfile?.languages || []) if (l) languages.add(l);
  }
  ApiResponse.ok(
    res,
    {
      subjects: [...subjects].sort((a, b) => a.localeCompare(b)),
      locations: [...locations].sort((a, b) => a.localeCompare(b)),
      languages: [...languages].sort((a, b) => a.localeCompare(b)),
      totalTutors: teachers.length,
    },
    'Tutor facets fetched',
  );
});

export const tutors = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 24));
  const skip = (page - 1) * limit;
  const filter = buildTutorFilter(req.query);
  const sort = buildTutorSort(req.query.sortBy);
  const [items, total] = await Promise.all([
    User.find(filter).sort(sort).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  ApiResponse.ok(
    res,
    { items: items.map(mapTutorUser), pagination: paginationMeta(total, page, limit) },
    'Tutors fetched',
  );
});

export const tutorDetail = asyncHandler(async (req, res) => {
  const u = await User.findOne({ _id: req.params.id, role: 'teacher', isActive: { $ne: false } });
  if (!u) throw ApiError.notFound('Tutor not found');
  ApiResponse.ok(res, mapTutorUser(u), 'Tutor fetched');
});
export const saveTutor=asyncHandler(async(req,res)=>{await User.findByIdAndUpdate(req.user.id,{$addToSet:{savedTutors:req.params.tutorId}});ApiResponse.ok(res,{},'Tutor saved');});
export const unsaveTutor=asyncHandler(async(req,res)=>{await User.findByIdAndUpdate(req.user.id,{$pull:{savedTutors:req.params.tutorId}});ApiResponse.ok(res,{},'Tutor removed');});
export const savedTutors=asyncHandler(async(req,res)=>{const u=await User.findById(req.user.id).populate('savedTutors');ApiResponse.ok(res,toJSONList(u.savedTutors||[]),'Saved tutors fetched');});
