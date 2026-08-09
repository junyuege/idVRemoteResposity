/**
 * 云函数：获取攻略详情
 * 参数：id - 攻略ID, action - 可选，'view' 表示增加浏览量
 * 返回：{ code, data, message }
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { id, action } = event;

  try {
    if (action === 'view') {
      // 增加浏览量
      await db.collection('strategies')
        .doc(id)
        .update({
          data: {
            viewCount: db.command.inc(1)
          }
        });
      return { code: 0, data: null, message: 'success' };
    }

    // 获取详情
    const result = await db.collection('strategies')
      .doc(id)
      .get();

    if (!result.data) {
      return { code: -1, data: null, message: '攻略不存在' };
    }

    return {
      code: 0,
      data: result.data,
      message: 'success'
    };
  } catch (err) {
    console.error(err);
    return {
      code: -1,
      data: null,
      message: err.message || '获取详情失败'
    };
  }
};
