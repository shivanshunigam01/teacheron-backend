/**
 * Combine workshop date with HH:mm time string.
 * @param {Date|string} date
 * @param {string} time
 */
export function combineDateAndTime(date, time) {
  const d = new Date(date);
  const [h, m] = String(time).split(':').map((n) => parseInt(n, 10));
  d.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
  return d;
}

/** @param {{ workshopDate: Date|string; endTime: string }} workshop */
export function getWorkshopEndDateTime(workshop) {
  return combineDateAndTime(workshop.workshopDate, workshop.endTime);
}

/** @param {{ workshopDate: Date|string; endTime: string }} workshop */
export function isWorkshopUpcoming(workshop) {
  return getWorkshopEndDateTime(workshop) >= new Date();
}

/** @param {import('mongoose').Document} workshop */
export function shapeWorkshop(workshop, extra = {}) {
  const obj = workshop.toObject ? workshop.toObject() : workshop;
  return {
    id: String(obj._id ?? obj.id),
    title: obj.title,
    category: obj.category,
    description: obj.description,
    teacherId: obj.teacherId ? String(obj.teacherId) : undefined,
    teacherName: obj.teacherName,
    workshopDate: obj.workshopDate,
    startTime: obj.startTime,
    endTime: obj.endTime,
    mode: obj.mode,
    meetingLink: obj.meetingLink || '',
    location: obj.location || '',
    isFree: obj.isFree,
    price: obj.price ?? 0,
    maxStudents: obj.maxStudents,
    enrolledStudents: obj.enrolledStudents ?? 0,
    spotsLeft: Math.max(0, (obj.maxStudents ?? 0) - (obj.enrolledStudents ?? 0)),
    imageUrl: obj.imageUrl || '',
    status: obj.status,
    adminRemark: obj.adminRemark || '',
    isUpcoming: isWorkshopUpcoming(obj),
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
    ...extra,
  };
}
