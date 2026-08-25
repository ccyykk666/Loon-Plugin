const FILTER_OPTIONS = {
  hideShorts: readBooleanArgument("HideShorts", true)
};

const AD_RENDERER_FIELDS = new Set([454362329, 478840678, 491441836]);
const BROWSE_CONTAINER_FIELD = 49399797;
const SHORTS_SHELF_FIELD = 51845067;
const LIST_FIELD = 50195462;
const AD_ITEM_PATH = [153515154, 172660663, 1, 168777401, 5];
const BROWSE_CONTAINER_KEY = encodeVarint(BROWSE_CONTAINER_FIELD * 8 + 2);
const SHORTS_TEXT = asciiBytes("Shorts");
const VISIT_ADVERTISER_TEXT = asciiBytes("Visit advertiser");

let removedAds = 0;
let removedShorts = 0;

try {
  const input = normalizeBody($response.body);
  if (!input.length) {
    $done({});
  } else {
    const path = requestPath($request.url);
    let result = { bytes: input, changed: false };

    if (path.endsWith("/browse") || path.endsWith("/next")) {
      result = rewriteBrowseTree(input, 0);
      if (path.endsWith("/next")) {
        result = mergeResults(result, removeNextPlaybackAdMetadata(result.bytes));
      }
    } else if (path.endsWith("/player")) {
      result = removePlayerAds(input);
    } else if (path.endsWith("/get_watch")) {
      result = removeWatchAds(input);
    }

    if (result.changed) {
      console.log(
        `YouTube净化完成: ads=${removedAds}, shorts=${removedShorts}`
      );
      $done({ body: result.bytes });
    } else {
      $done({});
    }
  }
} catch (error) {
  console.log(`YouTube净化失败，放行原响应: ${error}`);
  $done({});
}

function readBooleanArgument(name, fallback) {
  if (typeof $argument !== "object" || $argument === null) return fallback;
  if (!Object.prototype.hasOwnProperty.call($argument, name)) return fallback;
  const value = $argument[name];
  return value === true || value === "true" || value === 1 || value === "1";
}

function requestPath(url) {
  const match = String(url || "").match(/^https?:\/\/[^/]+([^?#]*)/i);
  return match ? match[1] : "";
}

function normalizeBody(body) {
  if (body instanceof Uint8Array) return body;
  if (body instanceof ArrayBuffer) return new Uint8Array(body);
  if (body && body.buffer instanceof ArrayBuffer) {
    return new Uint8Array(body.buffer, body.byteOffset || 0, body.byteLength);
  }
  return new Uint8Array();
}

function readVarint(bytes, start, end) {
  let value = 0;
  let shift = 0;
  let position = start;
  while (position < end && shift <= 63) {
    const byte = bytes[position++];
    if (shift < 53) value += (byte & 0x7f) * 2 ** shift;
    if ((byte & 0x80) === 0) return { value, position };
    shift += 7;
  }
  throw new Error("invalid protobuf varint");
}

function encodeVarint(value) {
  const output = [];
  let current = value;
  while (current > 127) {
    output.push((current % 128) | 128);
    current = Math.floor(current / 128);
  }
  output.push(current);
  return new Uint8Array(output);
}

function parseMessage(bytes) {
  const fields = [];
  let position = 0;
  while (position < bytes.length) {
    const fieldStart = position;
    const key = readVarint(bytes, position, bytes.length);
    position = key.position;
    const number = Math.floor(key.value / 8);
    const wireType = key.value & 7;
    if (number < 1 || number > 536870911 || wireType === 4 || wireType > 5) {
      throw new Error("invalid protobuf field");
    }

    const keyBytes = bytes.slice(fieldStart, position);
    let payloadStart = position;
    let payloadEnd = position;
    if (wireType === 0) {
      position = readVarint(bytes, position, bytes.length).position;
      payloadEnd = position;
    } else if (wireType === 1) {
      position += 8;
      payloadEnd = position;
    } else if (wireType === 2) {
      const length = readVarint(bytes, position, bytes.length);
      position = length.position;
      payloadStart = position;
      position += length.value;
      payloadEnd = position;
    } else if (wireType === 3) {
      throw new Error("protobuf groups are unsupported");
    } else if (wireType === 5) {
      position += 4;
      payloadEnd = position;
    }
    if (position > bytes.length) throw new Error("protobuf field exceeds body");

    fields.push({
      number,
      wireType,
      keyBytes,
      payload: bytes.slice(payloadStart, payloadEnd),
      raw: bytes.slice(fieldStart, position)
    });
  }
  return fields;
}

function encodeField(field, payload) {
  if (field.wireType !== 2) return field.raw;
  return concatBytes([field.keyBytes, encodeVarint(payload.length), payload]);
}

function concatBytes(parts) {
  let length = 0;
  for (const part of parts) length += part.length;
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function asciiBytes(text) {
  const output = new Uint8Array(text.length);
  for (let index = 0; index < text.length; index++) {
    output[index] = text.charCodeAt(index);
  }
  return output;
}

function containsBytes(bytes, needle) {
  if (!needle.length || needle.length > bytes.length) return false;
  outer: for (let index = 0; index <= bytes.length - needle.length; index++) {
    for (let inner = 0; inner < needle.length; inner++) {
      if (bytes[index + inner] !== needle[inner]) continue outer;
    }
    return true;
  }
  return false;
}

function rebuildMessage(fields, replacements, removedIndexes) {
  const chunks = [];
  for (let index = 0; index < fields.length; index++) {
    if (removedIndexes && removedIndexes.has(index)) continue;
    chunks.push(replacements && replacements.has(index) ? replacements.get(index) : fields[index].raw);
  }
  return concatBytes(chunks);
}

function rewriteBrowseTree(bytes, depth) {
  if (depth > 18 || !containsBytes(bytes, BROWSE_CONTAINER_KEY)) {
    return { bytes, changed: false };
  }
  let fields;
  try {
    fields = parseMessage(bytes);
  } catch (_) {
    return { bytes, changed: false };
  }

  const replacements = new Map();
  let changed = false;
  for (let index = 0; index < fields.length; index++) {
    const field = fields[index];
    if (field.wireType !== 2) continue;
    let child;
    if (field.number === BROWSE_CONTAINER_FIELD) {
      child = rewriteBrowseContainer(field.payload);
    } else if (containsBytes(field.payload, BROWSE_CONTAINER_KEY)) {
      child = rewriteBrowseTree(field.payload, depth + 1);
    } else {
      continue;
    }
    if (!child.changed) continue;
    replacements.set(index, encodeField(field, child.bytes));
    changed = true;
  }

  return {
    bytes: changed ? rebuildMessage(fields, replacements) : bytes,
    changed
  };
}

function rewriteBrowseContainer(bytes) {
  const fields = parseMessage(bytes);
  const replacements = new Map();
  const removed = new Set();
  let changed = false;

  for (let index = 0; index < fields.length; index++) {
    const field = fields[index];
    if (field.number !== 1 || field.wireType !== 2) continue;
    const itemFields = tryParseMessage(field.payload);
    if (!itemFields) continue;

    if (
      FILTER_OPTIONS.hideShorts &&
      itemFields.some(
        (itemField) =>
          itemField.number === SHORTS_SHELF_FIELD &&
          itemField.wireType === 2 &&
          containsBytes(itemField.payload, SHORTS_TEXT)
      )
    ) {
      removed.add(index);
      removedShorts += 1;
      changed = true;
      continue;
    }

    const itemReplacements = new Map();
    let itemChanged = false;
    for (let itemIndex = 0; itemIndex < itemFields.length; itemIndex++) {
      const itemField = itemFields[itemIndex];
      if (itemField.number !== LIST_FIELD || itemField.wireType !== 2) continue;
      const listResult = filterAdList(itemField.payload);
      if (!listResult.changed) continue;
      itemReplacements.set(itemIndex, encodeField(itemField, listResult.bytes));
      itemChanged = true;
    }
    if (itemChanged) {
      const itemBytes = rebuildMessage(itemFields, itemReplacements);
      replacements.set(index, encodeField(field, itemBytes));
      changed = true;
    }
  }

  return {
    bytes: changed ? rebuildMessage(fields, replacements, removed) : bytes,
    changed
  };
}

function filterAdList(bytes) {
  const fields = parseMessage(bytes);
  const removed = new Set();
  for (let index = 0; index < fields.length; index++) {
    const field = fields[index];
    if (field.number !== 1 || field.wireType !== 2) continue;
    if (!isAdItem(field.payload)) continue;
    removed.add(index);
    removedAds += 1;
  }
  return {
    bytes: removed.size ? rebuildMessage(fields, null, removed) : bytes,
    changed: removed.size > 0
  };
}

function isAdItem(bytes) {
  let candidates = [bytes];
  for (const number of AD_ITEM_PATH) {
    const next = [];
    for (const candidate of candidates) {
      const fields = tryParseMessage(candidate);
      if (!fields) continue;
      for (const field of fields) {
        if (field.number === number && field.wireType === 2) next.push(field.payload);
      }
    }
    if (!next.length) return false;
    candidates = next;
  }

  for (const candidate of candidates) {
    const fields = tryParseMessage(candidate);
    if (fields && fields.some((field) => AD_RENDERER_FIELDS.has(field.number))) {
      return true;
    }
  }
  return false;
}

function removeNextPlaybackAdMetadata(bytes) {
  const fields = tryParseMessage(bytes);
  if (!fields) return { bytes, changed: false };
  const removed = new Set();
  for (let index = 0; index < fields.length; index++) {
    const field = fields[index];
    if (field.number !== 14 || field.wireType !== 2) continue;
    const children = tryParseMessage(field.payload);
    if (
      children &&
      children.some((child) => child.number === 62960614) &&
      containsBytes(field.payload, VISIT_ADVERTISER_TEXT)
    ) {
      removed.add(index);
      removedAds += 1;
    }
  }
  return {
    bytes: removed.size ? rebuildMessage(fields, null, removed) : bytes,
    changed: removed.size > 0
  };
}

function removePlayerAds(bytes) {
  const fields = parseMessage(bytes);
  const removed = new Set();
  for (let index = 0; index < fields.length; index++) {
    if (fields[index].number === 7 || fields[index].number === 68) {
      removed.add(index);
      removedAds += 1;
    }
  }
  return {
    bytes: removed.size ? rebuildMessage(fields, null, removed) : bytes,
    changed: removed.size > 0
  };
}

function removeWatchAds(bytes) {
  const fields = parseMessage(bytes);
  const replacements = new Map();
  let changed = false;
  for (let index = 0; index < fields.length; index++) {
    const field = fields[index];
    if (field.number !== 1 || field.wireType !== 2) continue;
    const contentFields = tryParseMessage(field.payload);
    if (!contentFields) continue;
    const contentReplacements = new Map();
    let contentChanged = false;
    for (let contentIndex = 0; contentIndex < contentFields.length; contentIndex++) {
      const contentField = contentFields[contentIndex];
      if (contentField.number !== 2 || contentField.wireType !== 2) continue;
      const playerResult = removePlayerAds(contentField.payload);
      if (!playerResult.changed) continue;
      contentReplacements.set(
        contentIndex,
        encodeField(contentField, playerResult.bytes)
      );
      contentChanged = true;
    }
    if (contentChanged) {
      replacements.set(
        index,
        encodeField(field, rebuildMessage(contentFields, contentReplacements))
      );
      changed = true;
    }
  }
  return {
    bytes: changed ? rebuildMessage(fields, replacements) : bytes,
    changed
  };
}

function tryParseMessage(bytes) {
  try {
    return parseMessage(bytes);
  } catch (_) {
    return null;
  }
}

function mergeResults(previous, next) {
  return {
    bytes: next.bytes,
    changed: previous.changed || next.changed
  };
}
