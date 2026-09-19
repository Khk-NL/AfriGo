// miniprogram/data/attractions.js
const attractionsData = {
    "刚果(金)": [
        {
            id: 1,
            name: "维龙加国家公园",
            image: "/assets/images/virunga.jpg", // 建议放一张精美缩略图在本地assets
            tags: ["自然风光", "大猩猩"],
            desc: "非洲最古老的国家公园，以山地大猩猩闻名。",
            tips: "安全提示：由于处于边境地区，建议随团并在护卫陪同下前往。"
        },
        {
            id: 2,
            name: "尼拉贡戈火山",
            image: "/assets/images/volcano.jpg",
            tags: ["地质奇观", "徒步"],
            desc: "拥有世界上最大的熔岩湖之一，夜晚景观极其震撼。",
            tips: "装备建议：海拔较高，需准备防寒衣物和登山鞋。"
        }
    ],
    "埃及": [
        {
            id: 1,
            name: "胡夫金字塔",
            image: "/assets/images/pyramid.jpg",
            tags: ["历史古迹", "世界遗产"],
            desc: "古代世界七大奇迹之首，埃及的象征。",
            tips: "避坑指南：景区内骑骆驼需提前商定价格，防止恶意加价。"
        }
    ]
};

module.exports = {
    attractions: attractionsData
};