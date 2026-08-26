export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export const paginate = (query, page = 1, limit = 10) => {
  const skip = (Number(page) - 1) * Number(limit);
  return query.skip(skip).limit(Number(limit));
};

export const paginationMeta = (total, page, limit) => ({
  total,
  page: Number(page),
  limit: Number(limit),
  pages: Math.ceil(total / limit),
});
