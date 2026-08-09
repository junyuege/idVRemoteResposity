/**
 * 云函数：获取攻略列表
 * 参数：page, pageSize, categoryId (可选)
 * 返回：{ code, data, message }
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { page = 1, pageSize = 10, categoryId } = event;
  const skip = (page - 1) * pageSize;

  try {
    let query = {};
    if (categoryId) {
      // 如果有分类筛选，先查关联表获取策略ID列表
      const catResult = await db.collection('strategy_categories')
        .where({ categoryId })
        .get();
      const strategyIds = catResult.data.map(item => item.strategyId);
      if (strategyIds.length === 0) {
        return { code: 0, data: [], message: 'success' };
      }
      query._id = db.command.in(strategyIds);
    }

    const result = await db.collection('strategies')
      .where(query)
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get();

    return {
      code: 0,
      data: result.data,
      message: 'success'
    };
  } catch (err) {
    console.error(err);
    return {
      code: -1,
      data: [],
      message: err.message || '获取攻略列表失败'
    };
  }
};
