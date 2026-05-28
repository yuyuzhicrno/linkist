const BASE = '/api';

const getToken = () => localStorage.getItem('linkist_token');

const request = async (method, path, body, token) => {
  const headers = { 'Content-Type': 'application/json' };
  const t = token || getToken();
  if (t) headers['Authorization'] = `Bearer ${t}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data;
};

export const api = {
  get: (path, token) => request('GET', path, null, token),
  post: (path, body, token) => request('POST', path, body, token),
  put: (path, body, token) => request('PUT', path, body, token),
  delete: (path, token) => request('DELETE', path, null, token),

  // Tags
  getTags: (q = '') => request('GET', `/tags${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  getTagContent: (tag) => request('GET', `/tags/${encodeURIComponent(tag)}/content`),

  // Polls
  getPoll: (id) => request('GET', `/polls/${id}`),
  getPollByPost: (postId) => request('GET', `/polls/post/${postId}`),
  createPoll: (data) => request('POST', '/polls', data),
  votePoll: (id, optionIds) => request('POST', `/polls/${id}/vote`, { optionIds }),

  // Friends & DMs
  getFriends: () => request('GET', '/friends'),
  sendFriendRequest: (targetId) => request('POST', `/friends/request/${targetId}`, {}),
  acceptFriendRequest: (requesterId) => request('POST', `/friends/accept/${requesterId}`, {}),
  removeFriend: (otherId) => request('DELETE', `/friends/remove/${otherId}`),
  getDMList: () => request('GET', '/friends/dms'),
  getDM: (userId) => request('GET', `/friends/dms/${userId}`),
  sendDM: (userId, content) => request('POST', `/friends/dms/${userId}`, { content }),

  // Avatar upload
  uploadAvatar: (dataUrl) => request('POST', '/users/me/avatar', { dataUrl }),

  // Post comments & votes
  voteComment: (postId, commentId, type) => request('POST', `/posts/${postId}/comments/${commentId}/vote`, { type }),
  replyComment: (postId, commentId, content) => request('POST', `/posts/${postId}/comments/${commentId}/replies`, { content }),
};