export const toPublicUser = (user) => {
  if (!user) return null;
  const doc = typeof user.toObject === 'function' ? user.toObject() : user;
  return {
    id: String(doc._id || doc.id),
    name: doc.name,
    email: doc.email,
    role: doc.role,
    status: doc.status,
    areaManagerRef: doc.areaManagerRef || null,
    dealerRef: doc.dealerRef || null,
  };
};
