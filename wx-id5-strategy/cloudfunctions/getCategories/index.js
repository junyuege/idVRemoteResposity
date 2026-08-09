/**
 * 云函数：获取分类列表（含每个分类的攻略数量）
 * 返回：{ code, data, message }
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async () => {
  try {
    // 获取所有分类
    const catResult = await db.collection('categories')
      .orderBy('order', 'asc')
      .get();

    const categories = catResult.data || [];

    // 获取每个分类的攻略数量
    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => {
        const countResult = await db.collection('strategy_categories')
          .where({ categoryId: cat._id })
          .count();
        return {
          ...cat,
          count: countResult.total
        };
      })
    );

    return {
      code: 0,
      data: categoriesWithCount,
      message: 'success'
    };
  } catch (err) {
    console.error(err);
    return {
      code: -1,
      data: [],
      message: err.message || '获取分类失败'
    };
  }
};
