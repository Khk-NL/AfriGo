// miniprogram/data/labor.js
const laborData = {
    "刚果(金)": [
        {
            id: 1,
            title: "外籍员工配额制度",
            content: "根据2025年部级令，农业、采掘业外籍员工比例上限为6.5%，贸易行业为4%。",
            tag: "政策合规",
            level: "重要"
        },
        {
            id: 2,
            title: "健康证明要求",
            content: "2025年新规要求用工企业必须确保每位员工持有有效健康证明，并承担相关费用。",
            tag: "医疗准入",
            level: "强制"
        }
    ],
    "埃及": [
        {
            id: 1,
            title: "工作签证申请",
            content: "必须由当地雇主发起申请，严禁持旅游签证非法务工。",
            tag: "签证安全",
            level: "强制"
        }
    ]
};

module.exports = {
    labor: laborData
};