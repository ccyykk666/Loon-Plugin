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
  TopPodcast: readSetting("TopPodcast", false),
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

const AES_SBOX = Uint8Array.from([
  0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe,
  0xd7, 0xab, 0x76, 0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4,
  0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0, 0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7,
  0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15, 0x04, 0xc7, 0x23, 0xc3,
  0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75, 0x09,
  0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3,
  0x2f, 0x84, 0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe,
  0x39, 0x4a, 0x4c, 0x58, 0xcf, 0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85,
  0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8, 0x51, 0xa3, 0x40, 0x8f, 0x92,
  0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2, 0xcd, 0x0c,
  0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19,
  0x73, 0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14,
  0xde, 0x5e, 0x0b, 0xdb, 0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2,
  0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79, 0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5,
  0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08, 0xba, 0x78, 0x25,
  0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
  0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86,
  0xc1, 0x1d, 0x9e, 0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e,
  0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf, 0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42,
  0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16,
]);
const AES_INV_SBOX = new Uint8Array(256);
for (let index = 0; index < AES_SBOX.length; index += 1) {
  AES_INV_SBOX[AES_SBOX[index]] = index;
}

function xtime(value) {
  return ((value << 1) ^ (value & 0x80 ? 0x1b : 0)) & 0xff;
}

function packAesWord(a, b, c, d) {
  return ((a << 24) | (b << 16) | (c << 8) | d) >>> 0;
}

function readAesWord(bytes, offset) {
  return packAesWord(
    bytes[offset],
    bytes[offset + 1],
    bytes[offset + 2],
    bytes[offset + 3],
  );
}

function writeAesWord(word, bytes, offset) {
  bytes[offset] = word >>> 24;
  bytes[offset + 1] = word >>> 16;
  bytes[offset + 2] = word >>> 8;
  bytes[offset + 3] = word;
}

let AES_ENC_T0;
let AES_ENC_T1;
let AES_ENC_T2;
let AES_ENC_T3;
let AES_DEC_T0;
let AES_DEC_T1;
let AES_DEC_T2;
let AES_DEC_T3;

function ensureAesTables(decrypt) {
  if (decrypt ? AES_DEC_T0 : AES_ENC_T0) return;
  const t0 = new Uint32Array(256);
  const t1 = new Uint32Array(256);
  const t2 = new Uint32Array(256);
  const t3 = new Uint32Array(256);
  for (let value = 0; value < 256; value += 1) {
    const byte = decrypt ? AES_INV_SBOX[value] : AES_SBOX[value];
    const x2 = xtime(byte);
    const x4 = xtime(x2);
    const x8 = xtime(x4);
    const word = decrypt
      ? packAesWord(
          x8 ^ x4 ^ x2,
          x8 ^ byte,
          x8 ^ x4 ^ byte,
          x8 ^ x2 ^ byte,
        )
      : packAesWord(x2, byte, byte, x2 ^ byte);
    t0[value] = word;
    t1[value] = ((word >>> 8) | (word << 24)) >>> 0;
    t2[value] = ((word >>> 16) | (word << 16)) >>> 0;
    t3[value] = ((word >>> 24) | (word << 8)) >>> 0;
  }
  if (decrypt) {
    AES_DEC_T0 = t0;
    AES_DEC_T1 = t1;
    AES_DEC_T2 = t2;
    AES_DEC_T3 = t3;
  } else {
    AES_ENC_T0 = t0;
    AES_ENC_T1 = t1;
    AES_ENC_T2 = t2;
    AES_ENC_T3 = t3;
  }
}

const AES_ENCRYPT_KEYS = new Uint32Array([
  1698181731, 1801809512, 946104675, 1751477816,
  698823974, 1120033614, 2057712173, 314792981,
  99445999, 1194276769, 1032390028, 793401753,
  3609625338, 2416555355, 2910892247, 2194336078,
  2872618473, 993073330, 2528225381, 343621931,
  2595970067, 2710193313, 926674116, 591441391,
  3006169909, 312788884, 631188304, 115312319,
  1835699034, 2144226510, 1515284382, 1552867617,
  4103239184, 2338077406, 3507313984, 2374220897,
  66558285, 2292949907, 1504116435, 3559211698,
  182169093, 2188381590, 3688297285, 267629047,
]);
const AES_DECRYPT_KEYS = new Uint32Array([
  182169093, 2188381590, 3688297285, 267629047,
  2513325876, 3922781390, 247535115, 1250483741,
  109020413, 2082384890, 3876713157, 1145686038,
  3931093960, 2053189383, 2601474367, 2740468435,
  980114470, 2418971855, 3782112824, 945251308,
  3737896127, 2856700137, 1900077815, 3644397012,
  3142912049, 1955466326, 3674548766, 2826565411,
  3431305296, 3487237223, 2945132104, 1937562941,
  1877135414, 56529975, 1615864367, 3707239285,
  1202944531, 1824277505, 1661908504, 3165116762,
  1698181731, 1801809512, 946104675, 1751477816,
]);

function encryptAesBlock(input, offset, output, outputOffset = offset) {
  let s0 = readAesWord(input, offset) ^ AES_ENCRYPT_KEYS[0];
  let s1 = readAesWord(input, offset + 4) ^ AES_ENCRYPT_KEYS[1];
  let s2 = readAesWord(input, offset + 8) ^ AES_ENCRYPT_KEYS[2];
  let s3 = readAesWord(input, offset + 12) ^ AES_ENCRYPT_KEYS[3];
  for (let key = 4; key < 40; key += 4) {
    const t0 = AES_ENC_T0[s0 >>> 24] ^ AES_ENC_T1[(s1 >>> 16) & 0xff] ^ AES_ENC_T2[(s2 >>> 8) & 0xff] ^ AES_ENC_T3[s3 & 0xff] ^ AES_ENCRYPT_KEYS[key];
    const t1 = AES_ENC_T0[s1 >>> 24] ^ AES_ENC_T1[(s2 >>> 16) & 0xff] ^ AES_ENC_T2[(s3 >>> 8) & 0xff] ^ AES_ENC_T3[s0 & 0xff] ^ AES_ENCRYPT_KEYS[key + 1];
    const t2 = AES_ENC_T0[s2 >>> 24] ^ AES_ENC_T1[(s3 >>> 16) & 0xff] ^ AES_ENC_T2[(s0 >>> 8) & 0xff] ^ AES_ENC_T3[s1 & 0xff] ^ AES_ENCRYPT_KEYS[key + 2];
    const t3 = AES_ENC_T0[s3 >>> 24] ^ AES_ENC_T1[(s0 >>> 16) & 0xff] ^ AES_ENC_T2[(s1 >>> 8) & 0xff] ^ AES_ENC_T3[s2 & 0xff] ^ AES_ENCRYPT_KEYS[key + 3];
    s0 = t0;
    s1 = t1;
    s2 = t2;
    s3 = t3;
  }
  writeAesWord(packAesWord(AES_SBOX[s0 >>> 24], AES_SBOX[(s1 >>> 16) & 0xff], AES_SBOX[(s2 >>> 8) & 0xff], AES_SBOX[s3 & 0xff]) ^ AES_ENCRYPT_KEYS[40], output, outputOffset);
  writeAesWord(packAesWord(AES_SBOX[s1 >>> 24], AES_SBOX[(s2 >>> 16) & 0xff], AES_SBOX[(s3 >>> 8) & 0xff], AES_SBOX[s0 & 0xff]) ^ AES_ENCRYPT_KEYS[41], output, outputOffset + 4);
  writeAesWord(packAesWord(AES_SBOX[s2 >>> 24], AES_SBOX[(s3 >>> 16) & 0xff], AES_SBOX[(s0 >>> 8) & 0xff], AES_SBOX[s1 & 0xff]) ^ AES_ENCRYPT_KEYS[42], output, outputOffset + 8);
  writeAesWord(packAesWord(AES_SBOX[s3 >>> 24], AES_SBOX[(s0 >>> 16) & 0xff], AES_SBOX[(s1 >>> 8) & 0xff], AES_SBOX[s2 & 0xff]) ^ AES_ENCRYPT_KEYS[43], output, outputOffset + 12);
}

function decryptAesBlock(input, offset, output) {
  let s0 = readAesWord(input, offset) ^ AES_DECRYPT_KEYS[0];
  let s1 = readAesWord(input, offset + 4) ^ AES_DECRYPT_KEYS[1];
  let s2 = readAesWord(input, offset + 8) ^ AES_DECRYPT_KEYS[2];
  let s3 = readAesWord(input, offset + 12) ^ AES_DECRYPT_KEYS[3];
  for (let key = 4; key < 40; key += 4) {
    const t0 = AES_DEC_T0[s0 >>> 24] ^ AES_DEC_T1[(s3 >>> 16) & 0xff] ^ AES_DEC_T2[(s2 >>> 8) & 0xff] ^ AES_DEC_T3[s1 & 0xff] ^ AES_DECRYPT_KEYS[key];
    const t1 = AES_DEC_T0[s1 >>> 24] ^ AES_DEC_T1[(s0 >>> 16) & 0xff] ^ AES_DEC_T2[(s3 >>> 8) & 0xff] ^ AES_DEC_T3[s2 & 0xff] ^ AES_DECRYPT_KEYS[key + 1];
    const t2 = AES_DEC_T0[s2 >>> 24] ^ AES_DEC_T1[(s1 >>> 16) & 0xff] ^ AES_DEC_T2[(s0 >>> 8) & 0xff] ^ AES_DEC_T3[s3 & 0xff] ^ AES_DECRYPT_KEYS[key + 2];
    const t3 = AES_DEC_T0[s3 >>> 24] ^ AES_DEC_T1[(s2 >>> 16) & 0xff] ^ AES_DEC_T2[(s1 >>> 8) & 0xff] ^ AES_DEC_T3[s0 & 0xff] ^ AES_DECRYPT_KEYS[key + 3];
    s0 = t0;
    s1 = t1;
    s2 = t2;
    s3 = t3;
  }
  writeAesWord(packAesWord(AES_INV_SBOX[s0 >>> 24], AES_INV_SBOX[(s3 >>> 16) & 0xff], AES_INV_SBOX[(s2 >>> 8) & 0xff], AES_INV_SBOX[s1 & 0xff]) ^ AES_DECRYPT_KEYS[40], output, offset);
  writeAesWord(packAesWord(AES_INV_SBOX[s1 >>> 24], AES_INV_SBOX[(s0 >>> 16) & 0xff], AES_INV_SBOX[(s3 >>> 8) & 0xff], AES_INV_SBOX[s2 & 0xff]) ^ AES_DECRYPT_KEYS[41], output, offset + 4);
  writeAesWord(packAesWord(AES_INV_SBOX[s2 >>> 24], AES_INV_SBOX[(s1 >>> 16) & 0xff], AES_INV_SBOX[(s0 >>> 8) & 0xff], AES_INV_SBOX[s3 & 0xff]) ^ AES_DECRYPT_KEYS[42], output, offset + 8);
  writeAesWord(packAesWord(AES_INV_SBOX[s3 >>> 24], AES_INV_SBOX[(s2 >>> 16) & 0xff], AES_INV_SBOX[(s1 >>> 8) & 0xff], AES_INV_SBOX[s0 & 0xff]) ^ AES_DECRYPT_KEYS[43], output, offset + 12);
}

function encryptAesEcb(bytes) {
  ensureAesTables(false);
  const padding = 16 - (bytes.length % 16);
  const encrypted = new Uint8Array(bytes.length + padding);
  const completeLength = bytes.length - (bytes.length % 16);
  for (let offset = 0; offset < completeLength; offset += 16) {
    encryptAesBlock(bytes, offset, encrypted);
  }
  const tail = new Uint8Array(16);
  tail.set(bytes.subarray(completeLength));
  tail.fill(padding, bytes.length - completeLength);
  encryptAesBlock(tail, 0, encrypted, completeLength);
  return encrypted;
}

function decryptAesEcb(bytes) {
  if (!bytes.length || bytes.length % 16 !== 0)
    throw new Error("invalid AES payload length");
  ensureAesTables(true);
  const decrypted = new Uint8Array(bytes.length);
  for (let offset = 0; offset < bytes.length; offset += 16) {
    decryptAesBlock(bytes, offset, decrypted);
  }
  const padding = decrypted[decrypted.length - 1];
  if (padding < 1 || padding > 16) throw new Error("invalid PKCS#7 padding");
  for (let index = decrypted.length - padding; index < decrypted.length; index += 1) {
    if (decrypted[index] !== padding) throw new Error("invalid PKCS#7 padding");
  }
  return decrypted.subarray(0, decrypted.length - padding);
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
