const endpoints = {
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    logout: '/auth/logout',
    me: '/auth/me',
  },
  courses: {
    list: '/courses',
    bySlug: (slug) => `/courses/${slug}`,
    purchase: (id) => `/courses/${id}/purchase`,
    verifyQuiz: (id) => `/courses/${id}/verify-quiz`,
  },
  cart: {
    base: '/cart',
    items: '/cart/items',
    removeItem: (courseId) => `/cart/items/${courseId}`,
  },
  orders: {
    mine: '/orders/my-orders',
  },
  chat: {
    messages: (roomId, cursor) => `/chat/messages?roomId=${roomId}${cursor ? `&cursor=${cursor}` : ''}`,
    rooms: '/chat/rooms',
  },
  admin: {
    instructors: '/admin/instructors',
    staff: '/admin/staff',
    staffPermissions: (userId) => `/admin/staff/${userId}/permissions`,
    coupons: '/admin/coupons',
    videoPresign: (courseId, lectureId) => `/admin/courses/${courseId}/lectures/${lectureId}/video/presign`,
    videoConfirm: (courseId, lectureId) => `/admin/courses/${courseId}/lectures/${lectureId}/video/confirm`,
    videoYoutube: (courseId, lectureId) => `/admin/courses/${courseId}/lectures/${lectureId}/video/youtube`,
  },
};

export default endpoints;
