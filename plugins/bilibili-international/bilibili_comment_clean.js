const TOP_REPLY_FIELDS = new Set([2, 4, 5, 6, 14]);
const LEGACY_MEMBER_FIELDS = new Set([5, 18, 19, 20, 21, 25, 26, 27, 28, 29, 34, 35]);

const stats = {
  levels: 0,
  nicknameColors: 0,
  medals: 0
};

main();

function main() {
  try {
    const input = normalizeBody($response.body);
    if (input.length < 5) return $done({});

    const result = rewriteGrpcFrames(input);
    if (!result.changed) return $done({});

    console.log(
      `评论区净化完成: level=${stats.levels}, color=${stats.nicknameColors}, medal=${stats.medals}`
    );
    $done({ body: result.bytes });
  } catch (error) {
    console.log(`评论区净化失败，放行原响应: ${error}`);
    $done({});
  }
}

function rewriteGrpcFrames(bytes) {
  const frames = [];
  let position = 0;
  let changed = false;

  while (position < bytes.length) {
    if (position + 5 > bytes.length) throw new Error("invalid gRPC frame header");
    const flag = bytes[position];
    const length = readUint32(bytes, position + 1);
    const end = position + 5 + length;
    if (end > bytes.length) throw new Error("gRPC frame exceeds body");
    if (flag !== 0 && flag !== 1) throw new Error("unsupported gRPC compression flag");

    const original = bytes.slice(position, end);
    const payload = bytes.slice(position + 5, end);
    const message = flag === 1 ? normalizeBody($utils.ungzip(payload)) : payload;
    const result = cleanMainList(message);

    if (result.changed) {
      frames.push(encodeGrpcFrame(result.bytes));
      changed = true;
    } else {
      frames.push(original);
    }
    position = end;
  }

  return { bytes: changed ? concatBytes(frames) : bytes, changed };
}

function cleanMainList(bytes) {
  const fields = parseMessage(bytes);
  const replacements = new Map();
  let changed = false;

  for (let index = 0; index < fields.length; index++) {
    const field = fields[index];
    if (field.wireType !== 2 || !TOP_REPLY_FIELDS.has(field.number)) continue;
    const result = cleanReply(field.payload);
    if (!result.changed) continue;
    replacements.set(index, encodeField(field, result.bytes));
    changed = true;
  }

  return {
    bytes: changed ? rebuildMessage(fields, replacements) : bytes,
    changed
  };
}

function cleanReply(bytes) {
  const fields = parseMessage(bytes);
  const replacements = new Map();
  let changed = false;

  for (let index = 0; index < fields.length; index++) {
    const field = fields[index];
    if (field.wireType !== 2) continue;

    let result;
    if (field.number === 1) result = cleanReply(field.payload);
    else if (field.number === 13) result = cleanLegacyMember(field.payload);
    else if (field.number === 15) result = cleanMemberV2(field.payload);
    else continue;

    if (!result.changed) continue;
    replacements.set(index, encodeField(field, result.bytes));
    changed = true;
  }

  return {
    bytes: changed ? rebuildMessage(fields, replacements) : bytes,
    changed
  };
}

function cleanLegacyMember(bytes) {
  const fields = parseMessage(bytes);
  const removed = new Set();

  for (let index = 0; index < fields.length; index++) {
    const number = fields[index].number;
    if (!LEGACY_MEMBER_FIELDS.has(number)) continue;
    removed.add(index);
    if (number === 5) stats.levels += 1;
    else if (number === 21) stats.nicknameColors += 1;
    else stats.medals += 1;
  }

  return {
    bytes: removed.size ? rebuildMessage(fields, null, removed) : bytes,
    changed: removed.size > 0
  };
}

function cleanMemberV2(bytes) {
  const fields = parseMessage(bytes);
  const replacements = new Map();
  const removed = new Set();
  let changed = false;

  for (let index = 0; index < fields.length; index++) {
    const field = fields[index];
    if (field.number === 5) {
      removed.add(index);
      stats.medals += 1;
      changed = true;
      continue;
    }
    if (field.wireType !== 2) continue;

    let result;
    if (field.number === 1) result = removeField(field.payload, 5, "level");
    else if (field.number === 3) result = removeField(field.payload, 5, "color");
    else continue;

    if (!result.changed) continue;
    replacements.set(index, encodeField(field, result.bytes));
    changed = true;
  }

  return {
    bytes: changed ? rebuildMessage(fields, replacements, removed) : bytes,
    changed
  };
}

function removeField(bytes, target, kind) {
  const fields = parseMessage(bytes);
  const removed = new Set();

  for (let index = 0; index < fields.length; index++) {
    if (fields[index].number !== target) continue;
    removed.add(index);
    if (kind === "level") stats.levels += 1;
    else stats.nicknameColors += 1;
  }

  return {
    bytes: removed.size ? rebuildMessage(fields, null, removed) : bytes,
    changed: removed.size > 0
  };
}

function normalizeBody(body) {
  if (body instanceof Uint8Array) return body;
  if (body instanceof ArrayBuffer) return new Uint8Array(body);
  if (body && body.buffer instanceof ArrayBuffer) {
    return new Uint8Array(body.buffer, body.byteOffset || 0, body.byteLength);
  }
  return new Uint8Array();
}

function readUint32(bytes, offset) {
  return (
    bytes[offset] * 0x1000000 +
    bytes[offset + 1] * 0x10000 +
    bytes[offset + 2] * 0x100 +
    bytes[offset + 3]
  );
}

function encodeGrpcFrame(payload) {
  const output = new Uint8Array(payload.length + 5);
  output[0] = 0;
  output[1] = (payload.length >>> 24) & 255;
  output[2] = (payload.length >>> 16) & 255;
  output[3] = (payload.length >>> 8) & 255;
  output[4] = payload.length & 255;
  output.set(payload, 5);
  return output;
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
  return concatBytes([field.keyBytes, encodeVarint(payload.length), payload]);
}

function rebuildMessage(fields, replacements, removed) {
  const chunks = [];
  for (let index = 0; index < fields.length; index++) {
    if (removed && removed.has(index)) continue;
    chunks.push(replacements && replacements.has(index) ? replacements.get(index) : fields[index].raw);
  }
  return concatBytes(chunks);
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
