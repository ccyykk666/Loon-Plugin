/*! Original Copyright (c) 2026 Yu9191. Licensed under the MIT License. */

(() => {
const ARGUMENTS =
  globalThis.$argument && typeof globalThis.$argument === "object"
    ? globalThis.$argument
    : {};

function readSetting(name, fallback) {
  const value = ARGUMENTS[name];
  return value === undefined || value === null || value === `{${name}}`
    ? fallback
    : value === true || value === 1 || value === "true" || value === "1";
}

const SETTINGS = {
  BottomSimple: readSetting("BottomSimple", true),
  LegacyHomeFramework: readSetting("LegacyHomeFramework", true),
  TopRcmd: readSetting("TopRcmd", true),
  TopMusic: readSetting("TopMusic", true),
  TopPodcast: readSetting("TopPodcast", true),
  TopBook: readSetting("TopBook", false),
  TopLive: readSetting("TopLive", false),
  TopAI: readSetting("TopAI", false),
  MineClean: readSetting("MineClean", true),
  HideSongQuality: readSetting("HideSongQuality", true),
};
const REQUEST_PATH = extractApiPath(globalThis.$request?.url ?? "");
const RESPONSE_BYTES = globalThis.$response?.body;
if (!REQUEST_PATH || !(RESPONSE_BYTES instanceof Uint8Array) || !RESPONSE_BYTES.length ||
    (!SETTINGS.MineClean && (
      REQUEST_PATH === "/v1/user/info" ||
      REQUEST_PATH === "/delivery/batch-deliver" ||
      REQUEST_PATH === "/creator/musician/reminder/message/get"
    ))) return $done({});

const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder("utf-8");

const AES_OPTIONS = {
  mode: "ecb",
  padding: "pkcs7",
  key: TEXT_ENCODER.encode("e82ckenh8dichen8"),
};

function encryptAesEcb(bytes) {
  return $crypto.aes.encrypt(bytes, AES_OPTIONS).ciphertext;
}

function decryptAesEcb(bytes) {
  return $crypto.aes.decrypt(bytes, AES_OPTIONS);
}

function isGzip(bytes) {
  return bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
}

function ungzip(bytes) {
  if (!isGzip(bytes)) return bytes;
  if (typeof globalThis.$utils?.ungzip !== "function")
    throw new Error("Loon $utils.ungzip is unavailable");
  return globalThis.$utils.ungzip(bytes);
}

function decodeResponseBody(bytes) {
  const decrypted = ungzip(decryptAesEcb(bytes));
  return JSON.parse(TEXT_DECODER.decode(decrypted));
}

function encodeResponseBody(payload) {
  return encryptAesEcb(TEXT_ENCODER.encode(JSON.stringify(payload)));
}

function extractApiPath(url) {
  return (
    url.match(
      /^https?:\/\/[^/]+\/x?eapi(\/[a-z0-9_/-]+)(?:\?.*)?$/i,
    )?.[1]?.replace(/\/+$/, "") ?? null
  );
}

const COMMENT_DECORATION_FIELDS = [
  "tag",
  "tags",
  "commentTag",
  "commentTags",
  "contentTags",
  "tagDatas",
  "topicList",
  "bottomTags",
];
const COMMENT_USER_FIELDS = [
  "vipRights", "avatarDetail", "commonIdentity", "relationTag",
];
const COMMENT_BADGE_FIELDS = [
  "userBizLevels", "userNameplates", "pendantData", "medal", "decoration",
];

function cleanCommentTree(value) {
  if (!value || typeof value !== "object") return 0;
  let changes = 0;
  if (Array.isArray(value)) {
    for (const item of value) changes += cleanCommentTree(item);
    return changes;
  }
  if (value.user && typeof value.user === "object") {
    if (value.user.followed === false) {
      value.user.followed = true;
      changes += 1;
    }
    for (const field of COMMENT_USER_FIELDS) {
      if (field in value.user && value.user[field] !== null) {
        value.user[field] = null;
        changes += 1;
      }
    }
    if ("vipType" in value.user && value.user.vipType !== 0) {
      value.user.vipType = 0;
      changes += 1;
    }
  }
  for (const field of COMMENT_BADGE_FIELDS) {
    if (field in value && value[field] !== null) {
      value[field] = null;
      changes += 1;
    }
  }
  for (const field of COMMENT_DECORATION_FIELDS) {
    if (field in value) {
      delete value[field];
      changes += 1;
    }
  }
  for (const key in value) {
    const child = value[key];
    if (child && typeof child === "object" && Object.prototype.hasOwnProperty.call(value, key))
      changes += cleanCommentTree(child);
  }
  return changes;
}

function clearSubtitles(value) {
  if (!value || typeof value !== "object") return 0;
  let changes = 0;
  for (const [key, child] of Object.entries(value)) {
    if ((key === "subTitle" || key === "subtitle") && child !== "") {
      value[key] = "";
      changes += 1;
    } else if (child && typeof child === "object") {
      changes += clearSubtitles(child);
    }
  }
  return changes;
}

const SIDEBAR_ITEM_CODES = new Set([
  "ai_songwriting",
  "mall",
  "concert",
  "cloud_push_song",
]);

function getSidebarItemCode(item) {
  return item?.sideBarItemData3?.code ?? item?.code;
}

function filterGeneralizedObjects(resource) {
  if (
    !resource ||
    typeof resource !== "object" ||
    !Array.isArray(resource.generalizedObject)
  )
    return 0;
  const filtered = resource.generalizedObject.filter(
    (item) => !SIDEBAR_ITEM_CODES.has(getSidebarItemCode(item)),
  );
  const removed = resource.generalizedObject.length - filtered.length;
  if (removed) resource.generalizedObject = filtered;
  return removed;
}

const PLAYER_VIEW_TYPES = new Set([
  "NMHintMVSwitchView",
  "FastPlayRecReasonBubbleView",
  "musicianTalk",
  "artistFollow",
]);
const PLAYER_PROMO_POSITIONS = new Set([
  "player_vinyl_float_guide",
  "player_bottom_toast",
  "player_bottom_left_entrance",
  "player_bottom_left",
  "player_bottom_left_scene",
  "fast_player_middle_left_toast",
  "player_global_bubble",
  "vinyl_comment_entrance",
  "playlist_detail_top_banner",
]);

function cleanPlayerHints(payload) {
  if (!Array.isArray(payload.data?.hints)) return false;
  const removedTokens = new Set();
  const filtered = payload.data.hints.filter((hint) => {
    const viewType = hint?.template?.extra?.viewType;
    const position =
      hint?.position?.code ?? hint?.data?.extra?.positionCode ?? "";
    const identifiers = [
      hint?.code,
      hint?.data?.extra?.code,
      hint?.data?.extra?.channelCode,
      hint?.data?.extra?.trp_id,
    ]
      .filter(Boolean)
      .map(String);
    const joined = identifiers.join("|");
    const remove =
      PLAYER_VIEW_TYPES.has(viewType) ||
      PLAYER_PROMO_POSITIONS.has(position) ||
      joined.includes("heijiao_dj_wiki_pop_channel") ||
      /UgcVideoChange/i.test(joined);
    if (!remove) return true;
    if (position) removedTokens.add(String(position));
    for (const identifier of identifiers) {
      removedTokens.add(identifier);
      const suffix = identifier.split("@").pop();
      if (suffix?.length > 8) removedTokens.add(suffix);
    }
    return false;
  });
  if (filtered.length === payload.data.hints.length) return false;
  payload.data.hints = filtered;
  if (Array.isArray(payload.trp?.rules) && removedTokens.size) {
    payload.trp.rules = payload.trp.rules.filter(
      (rule) =>
        ![...removedTokens].some((token) => String(rule).includes(token)),
    );
  }
  return true;
}

function cleanClientExperiments(payload) {
  if (!Array.isArray(payload.data)) return false;
  let changed = false;
  const index = payload.data.findIndex(
    (experiment) => experiment?.expName === "lyrics_addcomment",
  );
  if (index >= 0) {
    payload.data.splice(index, 1);
    changed = true;
  }
  return changed;
}

function cleanWebExperiments(payload) {
  if (!Array.isArray(payload.data)) return false;
  let changed = false;
  let hasSearchConfig = false;
  let hasSearchLabel = false;
  for (const experiment of payload.data) {
    if (["SearchUI2", "SearchUI3", "SearchSongRec"].includes(experiment?.expName))
      hasSearchConfig = true;
    if (experiment?.expName === "SearchLabel") {
      hasSearchLabel = true;
      if (!experiment.expGroupName || experiment.expGroupName === "c") {
        experiment.expGroupName = "t1";
        changed = true;
      }
    }
    if (experiment?.expName === "Hp_Playlist_Suggest" &&
        experiment.expGroupName === "t1") {
      experiment.expGroupName = "c";
      changed = true;
    }
  }
  if (hasSearchConfig && !hasSearchLabel) {
    payload.data.push({ expName: "SearchLabel", expGroupName: "t1" });
    changed = true;
  }
  return changed;
}

function cleanSongQuality(privilege) {
  if (!privilege || typeof privilege !== "object") return false;
  let changed = false;
  if (Number.isSafeInteger(privilege.flag) && privilege.flag >= 0) {
    const qualityBits = (Math.floor(privilege.flag / 65536) % 8) * 65536 +
      (Math.floor(privilege.flag / 4096) % 2) * 4096;
    if (qualityBits) {
      privilege.flag -= qualityBits;
      changed = true;
    }
  }
  if (typeof privilege.maxbr === "number" && privilege.maxbr > 320000) {
    privilege.maxbr = 320000;
    changed = true;
  } else if (privilege.maxbr === 0 &&
             typeof privilege.playMaxLevel === "number" && privilege.playMaxLevel > 320000) {
    privilege.playMaxLevel = 320000;
    changed = true;
  }
  if (privilege.maxBrLevel === "hires") {
    privilege.maxBrLevel = "exhigh";
    changed = true;
  }
  return changed;
}

const HIDDEN_SEARCH_TAGS = new Set([
  "VIP", "VIP_DOWNLOAD", "Dolby", "HiRes", "SQ",
  "Whale_Cloud_Mica_Belt", "Whale_Cloud_Attain_Sound", "WHALE_CLOUD_AROUND",
]);

function cleanSearchResults(payload) {
  if (!Array.isArray(payload.data?.blocks)) return false;
  let changed = false;
  const blocks = [];
  for (const block of payload.data.blocks) {
    if (block?.blockCode === "search_block_note") {
      changed = true;
      continue;
    }
    if (Array.isArray(block?.resources)) {
      if (block.blockCode === "search_block_best_match") {
        const resources = block.resources.filter((item) => item?.resourceType !== "note");
        if (resources.length !== block.resources.length) {
          block.resources = resources;
          changed = true;
          if (!resources.length) continue;
        }
      }
      for (const resource of block.resources) {
        if (resource?.resourceType !== "song") continue;
        if (Array.isArray(resource.extInfo?.algClickableTags) &&
            resource.extInfo.algClickableTags.length) {
          resource.extInfo.algClickableTags = [];
          changed = true;
        }
        const metadata = resource.baseInfo?.metaData;
        if (!Array.isArray(metadata) || !metadata.length) {
          changed = cleanSongCollection([resource.baseInfo?.simpleSongData]) || changed;
          continue;
        }
        const filtered = metadata.filter((tag) => !HIDDEN_SEARCH_TAGS.has(tag));
        if (filtered.length !== metadata.length) {
          resource.baseInfo.metaData = filtered.length ? filtered : [""];
          changed = true;
        }
      }
    }
    blocks.push(block);
  }
  if (changed) payload.data.blocks = blocks;
  return changed;
}

function cleanSearchRecommendations(payload) {
  const data = payload.data;
  if (!Array.isArray(data?.algWords)) return false;
  let changed = replaceValue(data, "algWords", [{}]);
  changed = replaceValue(data, "operateWords", {}) || changed;
  return changed;
}

function clearEntitledPrivilegeFee(privilege) {
  if (privilege?.payed !== 1 || privilege.fee === 0) return false;
  privilege.fee = 0;
  return true;
}

function cleanSongPrivileges(privileges, hideQuality = false, entitledIds) {
  if (!Array.isArray(privileges)) return false;
  let changed = false;
  for (const privilege of privileges) {
    if (entitledIds && privilege?.payed === 1 && privilege.id != null)
      entitledIds.add(String(privilege.id));
    changed = clearEntitledPrivilegeFee(privilege) || changed;
    if (hideQuality) changed = cleanSongQuality(privilege) || changed;
  }
  return changed;
}

function cleanSongCollection(songs, privileges, hideQuality = false, clearReasons = false) {
  const entitledIds = Array.isArray(songs) && songs.length &&
    Array.isArray(privileges) && privileges.length ? new Set() : null;
  let changed = cleanSongPrivileges(privileges, hideQuality, entitledIds);
  if (!Array.isArray(songs)) return changed;
  for (const song of songs) {
    if (!song || typeof song !== "object") continue;
    changed = clearEntitledPrivilegeFee(song.privilege) || changed;
    if (hideQuality) changed = cleanSongQuality(song.privilege) || changed;
    if (clearReasons) {
      if (song?.reason != null) {
        song.reason = null;
        changed = true;
      }
      if (song?.recommendReason != null) {
        song.recommendReason = null;
        changed = true;
      }
    }
    if (song.privilege?.payed !== 1 && !entitledIds?.has(String(song.id))) continue;
    if (song.fee !== 0) {
      song.fee = 0;
      changed = true;
    }
  }
  return changed;
}

function cleanDailyRecommendation(payload) {
  const data = payload.data;
  if (!data) return false;
  let changed = cleanSongCollection(data.dailySongs, undefined, true, true);
  if (Array.isArray(data.recommendReasons) && data.recommendReasons.length) {
    data.recommendReasons = [];
    changed = true;
  }
  return changed;
}

function cleanSongDetail(payload) {
  return cleanSongCollection(payload.songs, payload.privileges);
}

function cleanPrivilegeVipBadges(payload) {
  return cleanSongPrivileges(payload.data);
}

function cleanPlaylistDetail(payload) {
  let changed = cleanSongCollection(
    payload.playlist?.tracks, payload.privileges, SETTINGS.HideSongQuality,
  );
  for (const track of Array.isArray(payload.playlist?.trackIds) ? payload.playlist.trackIds : []) {
    if (track && Object.prototype.hasOwnProperty.call(track, "dpr")) {
      delete track.dpr;
      changed = true;
    }
  }
  return changed;
}

function cleanPlayerArtistFollow(payload) {
  if (!Array.isArray(payload.data)) return false;
  let changed = false;
  for (const artist of payload.data) {
    if (artist?.followed !== false) continue;
    artist.followed = true;
    changed = true;
  }
  return changed;
}

const TOP_TAB_SETTING_BY_CODE = {
  rcmd: "TopRcmd",
  music: "TopMusic",
  podcast: "TopPodcast",
  vBook: "TopBook",
  live: "TopLive",
  "ai-generate-song": "TopAI",
};
const TOP_TAB_SETTING_BY_TITLE = {
  推荐: "TopRcmd",
  音乐: "TopMusic",
  播客: "TopPodcast",
  听书: "TopBook",
  午夜飞行: "TopLive",
  AI写歌: "TopAI",
};

function matchesValue(value, expected) {
  if (value === expected) return true;
  if (!value || !expected || typeof value !== "object" ||
      typeof expected !== "object" ||
      Array.isArray(value) !== Array.isArray(expected)) return false;
  const keys = Object.keys(expected);
  return Object.keys(value).length === keys.length &&
    keys.every((key) => matchesValue(value[key], expected[key]));
}

function replaceValue(target, key, value) {
  if (matchesValue(target[key], value)) return false;
  target[key] = value;
  return true;
}

function replaceData(payload, path, data) {
  if (payload[path]?.data === undefined) return false;
  return replaceValue(payload[path], "data", data);
}

function cleanCommentList(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  let changed = false;
  if (Array.isArray(data.comments)) {
    const comments = data.comments.filter(
      (comment) =>
        !comment?.voiceNosKey &&
        !comment?.voiceWhaleId &&
        !(comment?.voiceDurationMillSecond > 0),
    );
    if (comments.length !== data.comments.length) {
      data.comments = comments;
      changed = true;
    }
  }
  return cleanCommentTree(data) > 0 || changed;
}

const SONG_HANDLERS = {
  "/v3/song/detail": cleanSongDetail,
  "/v6/playlist/detail": cleanPlaylistDetail,
  "/chart/playlist/detail": cleanPlaylistDetail,
  "/playlist/privilege": (payload) => cleanSongPrivileges(payload.data, true),
  "/song/mix/detail": (payload) =>
    cleanSongCollection(payload.songs, payload.privileges, true),
  "/song/or/podcast/detail": (payload) =>
    cleanSongCollection(payload.data?.songs, payload.data?.privileges, true),
  "/song/enhance/privilege": cleanPrivilegeVipBadges,
  "/song/enhance/player/url/v1": cleanPrivilegeVipBadges,
  "/v3/discovery/recommend/songs": cleanDailyRecommendation,
  "/v1/artist/top/song": (payload) => cleanSongCollection(payload.songs, undefined, true),
  "/search/complex/page/v3": cleanSearchResults,
};

const HANDLERS = {
  ...SONG_HANDLERS,
  "/playlist/detail/rcmd/get": (payload) => {
    const data = payload.data;
    if (!Array.isArray(data?.recPlaylist)) return false;
    if (!data.recPlaylist.length && !data.rcmdTitle && !data.jumpUrl) return false;
    data.recPlaylist = [];
    data.rcmdTitle = "";
    data.jumpUrl = "";
    return true;
  },
  "/homepage/scene/more/rcmd/song": (payload) => {
    const data = payload.data;
    if (!Array.isArray(data?.songList) || !data.songList.length) return false;
    if (!data.songList.every(
      (song) => data.sourceMap?.[song?.id] === "curlist_scene_more_rcmd",
    )) return false;
    data.songList = [];
    data.algMap = null;
    data.sourceMap = null;
    data.offset = 0;
    data.hasMore = false;
    return true;
  },
  "/comments/activity/airborne/enable/voice": (payload) => {
    if (payload.data?.voiceCommentEnabled !== true) return false;
    payload.data.voiceCommentEnabled = false;
    return true;
  },
  "/batch": (payload) => {
    let changed = false;
    for (const [path, value] of Object.entries(payload)) {
      if (!path.startsWith("/api/") || !value || typeof value !== "object") continue;
      const handler = SONG_HANDLERS[path.slice(4).replace(/\/+$/, "")];
      if (handler) changed = handler(value) || changed;
    }
    changed =
      replaceData(payload, "/api/social/event/bff/ad/resources", {}) || changed;
    changed =
      replaceData(payload, "/api/ad/get", { code: 200, ads: {} }) || changed;
    changed =
      replaceData(
        payload,
        "/api/platform/song/bff/grading/song/order/entrance",
        { songOrderEntrance: {} },
      ) || changed;
    if (SETTINGS.MineClean) {
      changed =
        replaceData(payload, "/api/creator/musician/reminder/message/get", {
          message: "",
        }) || changed;
    }
    changed =
      replaceData(payload, "/api/event/rcmd/topic/list", { topicList: [] }) ||
      changed;
    for (const path of [
      "/api/v2/resource/comments",
      "/api/v2/resource/comments/preload",
    ]) {
      changed = cleanCommentList(payload[path]?.data) || changed;
    }
    for (const path of [
      "/api/comment/feed/inserted/resources",
      "/api/comment/feed/inserted/resources/combined",
      "/api/comment/feed/inserted/resources/isolation",
    ]) {
      if (payload[path]?.data === undefined) continue;
      if (path.endsWith("/isolation")) {
        changed = cleanCommentMomentRecommendation(payload[path]) || changed;
        continue;
      }
      changed = cleanInsertedResources(payload[path], 0) || changed;
    }
    return changed;
  },
  "/v2/resource/comments": (payload) =>
    cleanCommentList(payload.data),
  "/v2/resource/comment/floor/get": (payload) =>
    cleanCommentTree(payload.data) > 0,
  "/resource/comments/reply/preload": (payload) =>
    cleanCommentTree(payload.data?.preloadCommentMap ?? payload.data) > 0,
  "/moment/tab/info/get": (payload) => {
    return replaceValue(payload, "data", { tabStatus: 0, momentNum: 0 });
  },
  "/comment/feed/inserted/resources/combined": cleanInsertedResources,
  "/comment/feed/inserted/resources": cleanInsertedResources,
  "/comment/feed/inserted/resources/isolation": cleanCommentMomentRecommendation,
  "/moment/pub/entrance/get": (payload) => {
    return replaceValue(payload, "data", {
      icon: "",
      targetUrl: "",
      guideUrl: "",
      supportVideo: false,
      commentShowEntrance: false,
    });
  },
  "/moment/song/feed/get": (payload) => {
    let changed = replaceValue(payload, "event", []);
    changed = replaceValue(payload, "more", false) || changed;
    changed = replaceValue(payload, "size", 0) || changed;
    changed = replaceValue(payload, "cursor", 0) || changed;
    return changed;
  },
  "/v1/user/info": (payload) => {
    if (!SETTINGS.MineClean) return false;
    let changed = false;
    if (payload.fmConfig !== null) {
      payload.fmConfig = null;
      changed = true;
    }
    if (payload.ticketConfig !== null) {
      payload.ticketConfig = null;
      changed = true;
    }
    return changed;
  },
  "/creator/musician/reminder/message/get": (payload) => {
    if (!SETTINGS.MineClean || !payload.data || payload.data.message === "")
      return false;
    payload.data.message = "";
    return true;
  },
  "/sp/flow/popup/query": (payload) => {
    if (!payload.data) return false;
    return replaceValue(payload, "data", {});
  },
  "/vipactivity/app/cashier/setting/get": (payload) => {
    if (!payload.data?.cashierTabPopup) return false;
    return replaceValue(payload.data, "cashierTabPopup", {});
  },
  "/link/position/show/resource": cleanSidebarResources,
  "/delivery/batch-deliver": (payload) => {
    if (
      !SETTINGS.MineClean ||
      !payload.data ||
      typeof payload.data !== "object" ||
      !(119 in payload.data)
    )
      return false;
    delete payload.data[119];
    return true;
  },
  "/link/scene/show/resource": cleanPlayerHints,
  "/link/scene/show/resource/scene-code/player": cleanPlayerHints,
  "/rtrs/abt/front/expinfo/list": cleanClientExperiments,
  "/rtrs/abt/web/expinfo/list": cleanWebExperiments,
  "/user/sub/artist/exist": cleanPlayerArtistFollow,
  "/link/home/framework/tab": (payload) => {
    const frameworkChanged = cleanHomeFramework(payload);
    const bottomChanged = cleanBottomTabs(payload);
    return frameworkChanged || bottomChanged;
  },
  "/link/home/framework/top/tab": cleanTopTabs,
  "/search/default/keyword/list": cleanSearchDefaultKeyword,
  "/search/rcmd/keyword/get/v2": cleanSearchRecommendations,
  "/homepage/block/page": cleanHomepageBanners,
};

function cleanInsertedResources(payload, offset = Number(payload.data?.offset) || 0) {
  let changed = replaceValue(payload, "data", {
    count: 0, offset, records: [], delayRender: false,
  });
  if (Array.isArray(payload.trp?.rules) && payload.trp.rules.length) {
    payload.trp.rules = [];
    changed = true;
  }
  return changed;
}

function cleanCommentMomentRecommendation(payload) {
  if (!Array.isArray(payload.data?.records)) {
    return false;
  }
  const filtered = payload.data.records.filter(
    (record) => record?.dslJson?.positionCode !== "CommentMomentRcmd",
  );
  if (filtered.length === payload.data.records.length) return false;
  payload.data.records = filtered;
  if ("count" in payload.data) payload.data.count = filtered.length;
  return true;
}

function cleanSidebarResources(payload) {
  if (!payload.data) return false;
  let changes = 0;
  const crossPosition = payload.data.crossPlatformResource?.positionCode;
  if (crossPosition === "MOMENT_MORE_RCMD_PAGE") {
    payload.data.crossPlatformResource = {};
    changes += 1;
  }
  if (!SETTINGS.MineClean) return changes > 0;
  if (["MyPageBar", "MyPageBarRN"].includes(crossPosition)) {
    payload.data.crossPlatformResource = {};
    changes += 1;
  }
  const groups = Array.isArray(payload.data.dataGroupResourceList)
    ? payload.data.dataGroupResourceList
    : [];
  const isSidebarResponse = groups.some((group) =>
    String(group?.positionCode ?? "").startsWith("side_bar_new_"),
  );
  if (!isSidebarResponse) return changes > 0;

  const removedRuleIds = new Set(
    groups
      .filter((group) => SIDEBAR_ITEM_CODES.has(getSidebarItemCode(group)))
      .map((group) => group?.trp_id)
      .filter(Boolean),
  );
  const filteredGroups = groups.filter(
    (group) => !SIDEBAR_ITEM_CODES.has(getSidebarItemCode(group)),
  );
  if (filteredGroups.length !== groups.length) {
    payload.data.dataGroupResourceList = filteredGroups;
    changes += groups.length - filteredGroups.length;
  }
  changes += filterGeneralizedObjects(payload.data.commonResource);
  for (const resource of payload.data.commonResourceList ?? [])
    changes += filterGeneralizedObjects(resource);
  changes += clearSubtitles(payload.data.commonResource);
  changes += clearSubtitles(payload.data.commonResourceList);
  if (Array.isArray(payload.trp?.rules) && removedRuleIds.size) {
    const filteredRules = payload.trp.rules.filter(
      (rule) =>
        ![...removedRuleIds].some((id) => String(rule).includes(`::${id}::`)),
    );
    changes += payload.trp.rules.length - filteredRules.length;
    payload.trp.rules = filteredRules;
  }
  return changes > 0;
}

function cleanBottomTabs(payload) {
  if (
    !SETTINGS.BottomSimple ||
    !Array.isArray(payload.data?.commonResourceList)
  )
    return false;
  const filtered = payload.data.commonResourceList.filter(
    (tab) =>
      ["main", "mine"].includes(tab?.resourceType) ||
      ["首页", "我的"].includes(tab?.title),
  );
  if (filtered.length < 2) return false;
  let changed = filtered.length !== payload.data.commonResourceList.length;
  payload.data.commonResourceList = filtered;

  if (Array.isArray(payload.data.adminList) && payload.data.adminList.length) {
    payload.data.adminList = [];
    changed = true;
  }
  return changed;
}

function cleanHomeFramework(payload) {
  if (!SETTINGS.LegacyHomeFramework || !payload.data) return false;
  let changed = false;

  if (payload.data.homeFrameworkType === "fastPlay") {
    payload.data.homeFrameworkType = "normal";
    if (payload.data.selectedHomeTopTabCode === "fastPlay") {
      payload.data.selectedHomeTopTabCode = "rcmd";
    }
    if (payload.data.haveShowFastPlayGuide !== false) {
      payload.data.haveShowFastPlayGuide = false;
    }
    changed = true;
  }
  return changed;
}

function cleanSearchDefaultKeyword(payload) {
  if (!Array.isArray(payload.data?.keywords)) return false;

  let changed = false;
  if (payload.data.keywords.length) {
    payload.data.keywords = [];
    changed = true;
  }
  if (Array.isArray(payload.trp?.rules)) {
    const filteredRules = payload.trp.rules.filter(
      (rule) => !String(rule).startsWith("default_word_intervene::"),
    );
    if (filteredRules.length !== payload.trp.rules.length) {
      payload.trp.rules = filteredRules;
      changed = true;
    }
  }
  return changed;
}

function cleanTopTabs(payload) {
  if (!Array.isArray(payload.data?.commonResourceList)) return false;
  const original = payload.data.commonResourceList;

  const filtered = original.filter((tab) => {
    if (tab?.resCode === "fastPlay") return !SETTINGS.LegacyHomeFramework;
    const setting =
      TOP_TAB_SETTING_BY_CODE[tab?.resCode] ??
      TOP_TAB_SETTING_BY_TITLE[tab?.title];
    return Boolean(setting && SETTINGS[setting]);
  });

  const fallback =
    original.find(
      (tab) => tab?.resCode === "rcmd" || tab?.title === "推荐",
    ) ?? original.find((tab) => tab?.resCode !== "fastPlay");
  const result = filtered.length ? filtered : fallback ? [fallback] : [];

  let changed =
    result.length !== original.length ||
    result.some((tab, index) => tab !== original[index]);
  payload.data.commonResourceList = result;

  const allowedTopTabIds = new Set(
    result.map((tab) => tab?.trp_id).filter(Boolean),
  );
  if (Array.isArray(payload.trp?.rules) && payload.trp.rules.length) {
    const filteredRules = payload.trp.rules.filter((rule) => {
      if (typeof rule !== "string" || !rule.startsWith("musicTopTab::")) {
        return true;
      }
      const trpId = rule.split("::", 3)[1];
      return allowedTopTabIds.has(trpId);
    });
    if (filteredRules.length !== payload.trp.rules.length) {
      payload.trp.rules = filteredRules;
      changed = true;
    }
  }

  if (Array.isArray(payload.data.adminList) && payload.data.adminList.length) {
    payload.data.adminList = [];
    changed = true;
  }
  return changed;
}

function cleanHomepageBanners(payload) {
  if (!Array.isArray(payload.data?.blocks)) return false;
  const blocks = [];
  let changed = false;
  for (const block of payload.data.blocks) {
    if (block?.showType !== "BANNER" || !Array.isArray(block.extInfo?.banners)) {
      blocks.push(block);
      continue;
    }
    const filtered = block.extInfo.banners.filter(
      (banner) => !["活动", "广告"].includes(banner?.typeTitle),
    );
    if (filtered.length !== block.extInfo.banners.length) {
      block.extInfo.banners = filtered;
      changed = true;
    }
    if (filtered.length) {
      blocks.push(block);
    } else {
      changed = true;
    }
  }
  if (changed) payload.data.blocks = blocks;
  return changed;
}

function run() {
  try {
    const handler = HANDLERS[REQUEST_PATH];
    const bytes = RESPONSE_BYTES;
    if (!handler) return $done({});
    const payload = decodeResponseBody(bytes);
    if (!handler(payload)) return $done({});
    return $done({ body: encodeResponseBody(payload) });
  } catch (error) {
    console.log(`[网易云音乐净化] 放行原响应：${error?.message ?? error}`);
    return $done({});
  }
}

run();
})();
