(() => {
const ROOT = "https://raw.githubusercontent.com/ccyykk666/Loon-Plugin/";
const VERSIONS = [
  { name: "旧版", path: "72f95d7a94e2240691187d8ed0c9dd0fb03c877e/plugins/netease/neteasemusic_ad_filter.js" },
  { name: "回滚前新版", path: "51ba955da51efa813ddc4b54d74046eb8dc4dbbb/plugins/netease/neteasemusic_ad_filter.js" },
  { name: "轻量资源脚本", path: "main/plugins/netease/neteasemusic_resource_filter.js", resourceOnly: true },
];
const LOOPS = 100;
const ROUNDS = 9;

function download(path) {
  return new Promise((resolve, reject) => {
    $httpClient.get({ url: ROOT + path + "?compare=" + Date.now(), timeout: 15000 }, (error, response, body) => {
      if (error || response?.status !== 200 || typeof body !== "string")
        return reject(new Error(error || "脚本下载失败：" + path));
      resolve(body);
    });
  });
}

function median(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

async function run() {
  if (!globalThis.$crypto?.aes || !globalThis.$utils?.ungzip)
    throw new Error("需要 Loon Build 988 或更高版本");
  const sources = await Promise.all(VERSIONS.map((version) => download(version.path)));
  const functions = sources.map((source) => new Function("globalThis", "$done", source));
  const encoder = new TextEncoder();
  const options = { mode: "ecb", padding: "pkcs7", key: encoder.encode("e82ckenh8dichen8") };
  const cases = [
    { name: "播放地址", path: "/song/enhance/player/url/v1", payload: {
      code: 200, data: [{ id: 1, payed: 1, fee: 1, br: 320000, url: "https://example.invalid/audio" }],
    } },
    { name: "无需清理的资源", path: "/link/position/show/resource", payload: {
      code: 200, data: { commonResourceList: [], exposureRecords: [], libraLogList: [] },
    } },
    { name: "歌手推广入口", path: "/link/position/show/resource", payload: {
      code: 200, data: { commonResourceList: [{ positionCode: "artistPageEntrance", generalizedObject: {
        reward: { canReward: true }, commonEntrance: { bizType: "xindong", title: "为TA心动" },
      } }] }, trp: { rules: ["artistPageEntrance::*::example"] },
    } },
    { name: "侧栏净化", path: "/link/position/show/resource", payload: {
      code: 200, data: { dataGroupResourceList: [
        { positionCode: "side_bar_new_test", sideBarItemData3: { code: "mall" }, trp_id: "promo" },
        { positionCode: "side_bar_new_keep", sideBarItemData3: { code: "settings" } },
      ], commonResource: { generalizedObject: [{ code: "concert", subTitle: "推广" }, { code: "settings", subtitle: "设置" }] } },
      trp: { rules: ["::promo::example", "keep"] },
    } },
  ];
  for (const item of cases) {
    item.context = {
      $argument: { MineClean: true },
      $request: { url: "https://interface3.music.163.com/xeapi" + item.path },
      $response: { status: 200, body: $crypto.aes.encrypt(encoder.encode(JSON.stringify(item.payload)), options).ciphertext },
    };
  }
  function execute(index, item) {
    let result;
    let completed = 0;
    functions[index](item.context, (value) => { result = value; completed += 1; });
    if (completed !== 1) throw new Error(VERSIONS[index].name + " 未正常完成");
    return result;
  }
  function signature(result) {
    return result?.body ? Array.from(result.body).join(",") : "unchanged";
  }
  const rows = [];
  for (const item of cases) {
    const indices = VERSIONS.map((version, index) =>
      !version.resourceOnly || item.path === "/link/position/show/resource" ? index : -1,
    ).filter((index) => index >= 0);
    const expected = signature(execute(0, item));
    for (const index of indices) {
      if (signature(execute(index, item)) !== expected)
        throw new Error(item.name + " 输出不一致：" + VERSIONS[index].name);
      for (let warmup = 0; warmup < 20; warmup += 1) execute(index, item);
    }
    const times = indices.map(() => []);
    for (let round = 0; round < ROUNDS; round += 1) {
      for (let order = 0; order < indices.length; order += 1) {
        const position = (order + round) % indices.length;
        const started = Date.now();
        for (let loop = 0; loop < LOOPS; loop += 1) execute(indices[position], item);
        times[position].push((Date.now() - started) / LOOPS);
      }
    }
    rows.push({ scenario: item.name, results: indices.map((index, position) => ({
      version: VERSIONS[index].name,
      medianMs: Number(median(times[position]).toFixed(4)),
      minMs: Number(Math.min(...times[position]).toFixed(4)),
      maxMs: Number(Math.max(...times[position]).toFixed(4)),
    })) });
  }
  return {
    note: "仅比较同一 Loon 运行环境下的核心处理耗时，不包括独立任务启动、脚本下载或进程内存。",
    loopsPerRound: LOOPS, rounds: ROUNDS, results: rows,
  };
}

run().then((report) => {
  const content = JSON.stringify(report, null, 2);
  console.log(content);
  $done({ title: "网易云脚本对比", content });
}).catch((error) => {
  const content = error?.message || String(error);
  console.log(content);
  $done({ title: "网易云脚本对比失败", content });
});
})();
