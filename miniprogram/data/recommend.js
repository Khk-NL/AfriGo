// miniprogram/data/recommend.js
const recommendData = {
    "刚果(金)": [
        {
            id: 1,
            category: "美食",
            name: "本地特色木薯叶 (Pondu)",
            rating: "⭐⭐⭐⭐",
            desc: "刚果金国菜，通常配米饭或齐克旺加（Chikwangue）食用。",
            address: "金沙萨市区各当地餐厅均有供应",
            safetyTip: "建议选择卫生条件较好的餐厅，避免路边摊以防肠胃不适。"
        },
        {
            id: 2,
            category: "交通",
            name: "打车软件 (Yango/Uber)",
            rating: "⭐⭐⭐⭐⭐",
            desc: "相比路边招手的出租车，使用软件呼叫更安全且价格透明。",
            address: "覆盖金沙萨主要城区",
            safetyTip: "上车前核对车牌，行驶中开启小程序内的SOS一键求助。"
        }
    ],
    "埃及": [
        {
            id: 1,
            category: "住宿",
            name: "吉萨金字塔景观酒店",
            rating: "⭐⭐⭐⭐⭐",
            desc: "推窗即见金字塔，体验极佳。",
            address: "吉萨金字塔景区周边",
            safetyTip: "入住后建议向前台咨询合法的导游服务，避免私下接触非法‘导游’。"
        }
    ]
};

module.exports = {
    recommend: recommendData
};