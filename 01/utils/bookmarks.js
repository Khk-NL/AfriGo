import { addBookmark, getStoredCurrentUser, isLoggedIn, loadBookmarks, removeBookmark } from './cloud-service.js';
import { getSelectedDestination } from './countries.js';

async function decorateBookmarks(items, resourceType) {
  if (!isLoggedIn(getStoredCurrentUser())) {
    return (items || []).map((item) => ({ ...item, isBookmarked: false, bookmarkId: '' }));
  }
  const bookmarks = await loadBookmarks();
  const destination = getSelectedDestination();
  const index = new Map(
    bookmarks
      .filter((bookmark) => bookmark.resourceType === resourceType && (!destination.code || bookmark.countryCode === destination.code))
      .map((bookmark) => [String(bookmark.resourceId), bookmark])
  );
  return (items || []).map((item) => {
    const bookmark = index.get(String(item.id));
    return {
      ...item,
      isBookmarked: !!bookmark,
      bookmarkId: bookmark ? bookmark.id : ''
    };
  });
}

async function toggleBookmark(resourceType, item, { title, category = '', payload = {} } = {}) {
  if (!isLoggedIn(getStoredCurrentUser())) {
    const error = new Error('请先登录后再收藏');
    error.code = 'LOGIN_REQUIRED';
    throw error;
  }
  if (item.isBookmarked && item.bookmarkId) {
    await removeBookmark(item.bookmarkId);
    return { isBookmarked: false, bookmarkId: '' };
  }
  const destination = getSelectedDestination();
  const result = await addBookmark({
    resourceType,
    resourceId: String(item.id),
    title,
    category,
    countryCode: destination.code || '',
    payload
  });
  return { isBookmarked: true, bookmarkId: result.id || '' };
}

export {
  decorateBookmarks,
  toggleBookmark
};
