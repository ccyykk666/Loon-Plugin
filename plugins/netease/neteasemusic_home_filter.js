/*! Original Copyright (c) 2026 Yu9191. Licensed under the MIT License. */

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
  LegacyHomeFramework: readSetting("LegacyHomeFramework", true),
  TopRcmd: readSetting("TopRcmd", true),
  TopMusic: readSetting("TopMusic", true),
  TopPodcast: readSetting("TopPodcast", false),
  TopBook: readSetting("TopBook", false),
  TopLive: readSetting("TopLive", false),
  TopAI: readSetting("TopAI", false),
  HomeSimple: readSetting("HomeSimple", true),
  MineClean: readSetting("MineClean", true),
};
const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder("utf-8");
const EAPI_KEY = TEXT_ENCODER.encode("e82ckenh8dichen8");

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
const AES_RCON = Uint8Array.from([
  0x00, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36,
]);

function xtime(value) {
  return ((value << 1) ^ (value & 0x80 ? 0x1b : 0)) & 0xff;
}

function multiply(value, factor) {
  let result = 0;
  for (let current = value, mask = factor; mask; mask >>>= 1) {
    if (mask & 1) result ^= current;
    current = xtime(current);
  }
  return result;
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
    const word = decrypt
      ? packAesWord(
          multiply(byte, 14),
          multiply(byte, 9),
          multiply(byte, 13),
          multiply(byte, 11),
        )
      : packAesWord(xtime(byte), byte, byte, xtime(byte) ^ byte);
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

function expandAesKey(key) {
  if (key.length !== 16) throw new Error("AES-128 key must be 16 bytes");
  const expanded = new Uint32Array(44);
  for (let index = 0; index < 4; index += 1) {
    expanded[index] = readAesWord(key, index * 4);
  }
  for (let index = 4; index < expanded.length; index += 1) {
    let word = expanded[index - 1];
    if (index % 4 === 0) {
      word =
        packAesWord(
          AES_SBOX[(word >>> 16) & 0xff],
          AES_SBOX[(word >>> 8) & 0xff],
          AES_SBOX[word & 0xff],
          AES_SBOX[word >>> 24],
        ) ^
        (AES_RCON[index / 4] << 24);
    }
    expanded[index] = expanded[index - 4] ^ word;
  }
  return expanded;
}

function inverseMixAesWord(word) {
  const a = word >>> 24;
  const b = (word >>> 16) & 0xff;
  const c = (word >>> 8) & 0xff;
  const d = word & 0xff;
  return packAesWord(
    multiply(a, 14) ^ multiply(b, 11) ^ multiply(c, 13) ^ multiply(d, 9),
    multiply(a, 9) ^ multiply(b, 14) ^ multiply(c, 11) ^ multiply(d, 13),
    multiply(a, 13) ^ multiply(b, 9) ^ multiply(c, 14) ^ multiply(d, 11),
    multiply(a, 11) ^ multiply(b, 13) ^ multiply(c, 9) ^ multiply(d, 14),
  );
}

const AES_ENCRYPT_KEYS = expandAesKey(EAPI_KEY);
const AES_DECRYPT_KEYS = new Uint32Array(44);
for (let round = 0; round <= 10; round += 1) {
  for (let column = 0; column < 4; column += 1) {
    const word = AES_ENCRYPT_KEYS[(10 - round) * 4 + column];
    AES_DECRYPT_KEYS[round * 4 + column] =
      round === 0 || round === 10 ? word : inverseMixAesWord(word);
  }
}

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
    )?.[1] ?? null
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
    for (const field of [
      "vipRights",
      "avatarDetail",
      "commonIdentity",
      "relationTag",
    ]) {
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
  for (const field of [
    "userBizLevels",
    "userNameplates",
    "pendantData",
    "medal",
    "decoration",
  ]) {
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
  for (const child of Object.values(value)) changes += cleanCommentTree(child);
  return changes;
}

const HOME_BLOCK_CODES = new Set([
  "PAGE_RECOMMEND_DAILY_RECOMMEND",
  "PAGE_RECOMMEND_SPECIAL_CLOUD_VILLAGE_PLAYLIST",
  "PAGE_RECOMMEND_RADAR",
  "PAGE_RECOMMEND_RANK",
  "PAGE_RECOMMEND_MY_SHEET",
  "PAGE_RECOMMEND_COMBINATION",
  "PAGE_RECOMMEND_PRIVATE_RCMD_SONG",
  "PAGE_RECOMMEND_RED_SIMILAR_SONG",
]);

function filterSerializedCodes(value) {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return value;
    const filtered = parsed.filter((code) => HOME_BLOCK_CODES.has(code));
    return filtered.length === parsed.length ? value : JSON.stringify(filtered);
  } catch {
    return value;
  }
}

function cleanHomeRecommendation(payload) {
  if (!SETTINGS.HomeSimple || !payload.data) return false;
  const data = payload.data;
  let changed = false;
  if (Array.isArray(data.blocks)) {
    const filtered = data.blocks.filter((block) =>
      HOME_BLOCK_CODES.has(block?.bizCode),
    );
    if (filtered.length !== data.blocks.length) {
      data.blocks = filtered;
      changed = true;
    }
  }
  for (const field of ["blockCodeOrderList", "algDemoteBlockCodeOrderList"]) {
    if (typeof data[field] === "string") {
      const filtered = filterSerializedCodes(data[field]);
      if (filtered !== data[field]) {
        data[field] = filtered;
        changed = true;
      }
    }
  }
  if (Array.isArray(data.requestBlockOrder)) {
    const filtered = data.requestBlockOrder.filter((code) =>
      HOME_BLOCK_CODES.has(code),
    );
    if (filtered.length !== data.requestBlockOrder.length) {
      data.requestBlockOrder = filtered;
      changed = true;
    }
  }
  if ("hasMore" in data && data.hasMore !== false) {
    data.hasMore = false;
    changed = true;
  }
  if ("cursor" in data && data.cursor !== -1) {
    data.cursor = -1;
    changed = true;
  }
  return changed;
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

function replaceData(payload, path, data) {
  if (payload[path]?.data === undefined) return false;
  payload[path].data = data;
  return true;
}

const HANDLERS = {
  "/batch": (payload) => {
    let changed = false;
    changed =
      replaceData(payload, "/api/comment/tips/v2/get", {
        count: 0,
        offset: 0,
        records: [],
      }) || changed;
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
    changed =
      cleanCommentTree(payload["/api/v2/resource/comments"]?.data) > 0 ||
      changed;
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
      payload[path].data = {
        count: 0,
        offset: 0,
        records: [],
        delayRender: false,
      };
      if (Array.isArray(payload[path].trp?.rules))
        payload[path].trp.rules = [];
      changed = true;
    }
    return changed;
  },
  "/v2/resource/comments": (payload) =>
    cleanCommentTree(payload.data) > 0,
  "/v2/resource/comment/floor/get": (payload) =>
    cleanCommentTree(payload.data) > 0,
  "/resource/comments/reply/preload": (payload) =>
    cleanCommentTree(payload.data?.preloadCommentMap ?? payload.data) > 0,
  "/moment/tab/info/get": (payload) => {
    payload.data = { tabStatus: 0, momentNum: 0 };
    return true;
  },
  "/comment/feed/inserted/resources/combined": cleanInsertedResources,
  "/comment/feed/inserted/resources": cleanInsertedResources,
  "/comment/feed/inserted/resources/isolation": cleanCommentMomentRecommendation,
  "/moment/pub/entrance/get": (payload) => {
    payload.data = {
      icon: "",
      targetUrl: "",
      guideUrl: "",
      supportVideo: false,
      commentShowEntrance: false,
    };
    return true;
  },
  "/moment/song/feed/get": (payload) => {
    payload.event = [];
    payload.more = false;
    payload.size = 0;
    payload.cursor = 0;
    return true;
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
    payload.data = {};
    return true;
  },
  "/vipactivity/app/cashier/setting/get": (payload) => {
    if (!payload.data?.cashierTabPopup) return false;
    payload.data.cashierTabPopup = {};
    return true;
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
  "/link/home/framework/top/tab": cleanTopTabs,
  "/search/default/keyword/list": cleanSearchDefaultKeyword,
  "/homepage/block/page": cleanHomepageBanners,
  "/link/page/rcmd/resource/show": cleanHomeRecommendation,
  "/link/page/rcmd/block/resource/multi/refresh": (payload) => {
    if (!SETTINGS.HomeSimple) return false;
    if (!Array.isArray(payload.data)) return false;
    const filtered = payload.data.filter((block) =>
      HOME_BLOCK_CODES.has(block?.blockCode),
    );
    if (filtered.length === payload.data.length) return false;
    payload.data = filtered;
    return true;
  },
};

function cleanInsertedResources(payload) {
  const offset = Number(payload.data?.offset) || 0;
  payload.data = { count: 0, offset, records: [], delayRender: false };
  if (Array.isArray(payload.trp?.rules)) payload.trp.rules = [];
  return true;
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
    const path = extractApiPath(globalThis.$request?.url ?? "");
    const handler = path ? HANDLERS[path] : null;
    const bytes = globalThis.$response?.body;
    if (!handler || !(bytes instanceof Uint8Array) || !bytes.length)
      return $done({});
    const payload = decodeResponseBody(bytes);
    if (!handler(payload)) return $done({});
    return $done({ body: encodeResponseBody(payload) });
  } catch (error) {
    console.log(`[网易云音乐净化] 放行原响应：${error?.message ?? error}`);
    return $done({});
  }
}

run();
