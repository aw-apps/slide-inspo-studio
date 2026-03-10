// Minimal ZIP reader for PPTX (zip container)
// Supports: stored (method 0) and deflate (method 8) entries.

function u32(dv, off) {
  return dv.getUint32(off, true);
}

function u16(dv, off) {
  return dv.getUint16(off, true);
}

function findEocdOffset(u8) {
  // EOCD is at the end; search backwards up to 64k + EOCD min size.
  const sig = 0x06054b50;
  const maxBack = Math.min(u8.length, 22 + 0xffff);
  for (let i = u8.length - 22; i >= u8.length - maxBack; i--) {
    if (i < 0) break;
    const dv = new DataView(u8.buffer, u8.byteOffset + i, 4);
    if (dv.getUint32(0, true) === sig) return i;
  }
  return -1;
}

async function inflateRaw(deflatedU8) {
  const DS = globalThis.DecompressionStream;
  if (!DS) throw new Error('PPTX import requires DecompressionStream support for deflate streams');

  // ZIP uses raw DEFLATE.
  const ds = new DS('deflate-raw');
  const stream = new Blob([deflatedU8]).stream().pipeThrough(ds);
  const ab = await new Response(stream).arrayBuffer();
  return new Uint8Array(ab);
}

function decodeUtf8(u8) {
  return new TextDecoder('utf-8').decode(u8);
}

export class ZipReader {
  /** @param {ArrayBuffer} arrayBuffer */
  constructor(arrayBuffer) {
    this._u8 = new Uint8Array(arrayBuffer);
    /** @type {Map<string, {method:number, compSize:number, uncompSize:number, localOff:number}>} */
    this._entries = new Map();
    this._parseCentralDirectory();
  }

  _parseCentralDirectory() {
    const u8 = this._u8;
    const eocdOff = findEocdOffset(u8);
    if (eocdOff < 0) throw new Error('Invalid PPTX: cannot find ZIP End Of Central Directory');

    const eocd = new DataView(u8.buffer, u8.byteOffset + eocdOff);
    const cdSize = u32(eocd, 12);
    const cdOff = u32(eocd, 16);

    let p = cdOff;
    const cdEnd = cdOff + cdSize;

    while (p < cdEnd) {
      const dv = new DataView(u8.buffer, u8.byteOffset + p);
      const sig = u32(dv, 0);
      if (sig !== 0x02014b50) break;

      const method = u16(dv, 10);
      const compSize = u32(dv, 20);
      const uncompSize = u32(dv, 24);
      const nameLen = u16(dv, 28);
      const extraLen = u16(dv, 30);
      const commentLen = u16(dv, 32);
      const localOff = u32(dv, 42);

      const nameBytes = u8.subarray(p + 46, p + 46 + nameLen);
      const name = decodeUtf8(nameBytes);

      this._entries.set(name, { method, compSize, uncompSize, localOff });

      p += 46 + nameLen + extraLen + commentLen;
    }
  }

  /** @returns {string[]} */
  list() {
    return [...this._entries.keys()];
  }

  /** @param {string} path */
  has(path) {
    return this._entries.has(path);
  }

  /** @param {string} path */
  async read(path) {
    const meta = this._entries.get(path);
    if (!meta) throw new Error(`Missing ZIP entry: ${path}`);

    const u8 = this._u8;
    const p = meta.localOff;
    const dv = new DataView(u8.buffer, u8.byteOffset + p);
    const sig = u32(dv, 0);
    if (sig !== 0x04034b50) throw new Error(`Invalid ZIP local header for ${path}`);

    const nameLen = u16(dv, 26);
    const extraLen = u16(dv, 28);
    const dataOff = p + 30 + nameLen + extraLen;
    const comp = u8.subarray(dataOff, dataOff + meta.compSize);

    if (meta.method === 0) return comp.slice();
    if (meta.method === 8) return await inflateRaw(comp);

    throw new Error(`Unsupported ZIP compression method ${meta.method} for ${path}`);
  }

  /** @param {string} path */
  async readText(path) {
    const u8 = await this.read(path);
    return decodeUtf8(u8);
  }
}
