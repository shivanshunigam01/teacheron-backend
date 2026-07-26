import Subject from '../models/Subject.model.js';
import { slugify } from '../data/subjects.catalog.js';
import { isValidSubjectName, normalizeSubjectName } from '../utils/subjectName.js';

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function findSubjectByName(name) {
  const normalized = normalizeSubjectName(name);
  if (!normalized) return null;
  const slug = slugify(normalized);
  const regex = new RegExp(`^${escapeRegex(normalized)}$`, 'i');

  return Subject.findOne({
    $or: [{ slug }, { name: regex }, { aliases: regex }],
  });
}

/**
 * Find-or-create a subject/skill by name.
 * Soft-fail: returns null for invalid names instead of throwing.
 *
 * @param {string} rawName
 * @param {{ pendingApproval?: boolean, proposedBy?: string }} [opts]
 * @returns {Promise<import('../models/Subject.model.js').default | null>}
 */
export async function ensureSubjectByName(rawName, opts = {}) {
  const name = normalizeSubjectName(rawName);
  if (!isValidSubjectName(name)) return null;

  const existing = await findSubjectByName(name);
  if (existing) return existing;

  const slug = slugify(name);
  const slugTaken = await Subject.findOne({ slug });
  if (slugTaken) return slugTaken;

  const pending = Boolean(opts.pendingApproval);

  try {
    return await Subject.create({
      name,
      slug,
      group: 'other',
      aliases: [],
      isPopular: false,
      sortOrder: 9000,
      isActive: !pending,
      approvalStatus: pending ? 'pending' : 'approved',
      proposedBy: opts.proposedBy || undefined,
    });
  } catch (err) {
    if (err?.code === 11000) {
      return findSubjectByName(name);
    }
    throw err;
  }
}

/**
 * Ensure many subject/skill names (deduped). Soft-fails per name.
 * @param {string[]} names
 */
export async function ensureSubjectNames(names = []) {
  const unique = [];
  const seen = new Set();
  for (const raw of names) {
    const n = normalizeSubjectName(raw);
    if (!n) continue;
    const key = n.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(n);
  }

  const results = [];
  for (const name of unique) {
    const row = await ensureSubjectByName(name);
    if (row) results.push(row);
  }
  return results;
}
