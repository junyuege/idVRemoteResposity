/**
 * 工具函数
 */

// 格式化时间
const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 难度转星星
const difficultyToStars = (level) => {
  const star = '★';
  const empty = '☆';
  const full = star.repeat(level);
  const blank = empty.repeat(3 - level);
  return full + blank;
};

// 数字格式化（浏览量）
const formatCount = (num) => {
  if (!num) return '0';
  if (num >= 10000) return (num / 10000).toFixed(1) + 'w';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return String(num);
};

module.exports = {
  formatTime,
  difficultyToStars,
  formatCount
};
