// Minimal ZIP writer for PPTX.
// Emits stored (method 0) entries only.

function u16le(n) {
  const a = new Uint8Array(2);
  new DataView(a.buffer).setUint16(0, n & 0xffff, true);
  return a;
}

function u32le(n) {
  const a = new Uint8Array(4);
  new DataView(a.buffer).setUint32(0, n >>> 0, true);
  return a;
}

function concat(chunks) {
  let len = 0;
  for (const c of chunks) len += c.length;
  const out = new Uint8Array(len);
  let p = 0;
  for (const c of chunks) {
    out.set(c, p);
    p += c.length;
  }
  return out;
}

const CRC_TABLE = (() => {
  /** @type {number[]} */
  const table = new Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(u8) {
  let c = 0xffffffff;
  for (let i = 0; i < u8.length; i++) c = CRC_TABLE[(c ^ u8[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function encodeUtf8(s) {
  return new TextEncoder().encode(String(s));
}

export class ZipWriter {
  constructor() {
    /** @type {{name:string, data:Uint8Array, crc:number, off:number}[]} */
    this._files = [];
    /** @type {Uint8Array[]} */
    this._chunks = [];
    this._offset = 0;
  }

  /** @param {string} name @param {Uint8Array} data */
  addFile(name, data) {
    const fileName = String(name).replace(/^\//, '');
    const fileData = data instanceof Uint8Array ? data : new Uint8Array(data);
    const nameBytes = encodeUtf8(fileName);
    const crc = crc32(fileData);
    const compSize = fileData.length;
    const uncompSize = fileData.length;

    const localHeader = concat([
      u32le(0x04034b50),
      u16le(20), // version needed
      u16le(0), // flags
      u16le(0), // method = store
      u16le(0), // mod time
      u16le(0), // mod date
      u32le(crc),
      u32le(compSize),
      u32le(uncompSize),
      u16le(nameBytes.length),
      u16le(0), // extra len
      nameBytes,
    ]);

    const off = this._offset;
    this._chunks.push(localHeader, fileData);
    this._offset += localHeader.length + fileData.length;

    this._files.push({ name: fileName, data: fileData, crc, off });
  }

  finish() {
    const cdStart = this._offset;
    /** @type {Uint8Array[]} */
    const cdChunks = [];

    for (const f of this._files) {
      const nameBytes = encodeUtf8(f.name);
      const cd = concat([
        u32le(0x02014b50),
        u16le(20), // version made by
        u16le(20), // version needed
        u16le(0), // flags
        u16le(0), // method
        u16le(0), // mod time
        u16le(0), // mod date
        u32le(f.crc),
        u32le(f.data.length),
        u32le(f.data.length),
        u16le(nameBytes.length),
        u16le(0), // extra
        u16le(0), // comment
        u16le(0), // disk start
        u16le(0), // int attrs
        u32le(0), // ext attrs
        u32le(f.off),
        nameBytes,
      ]);
      cdChunks.push(cd);
      this._offset += cd.length;
    }

    const cd = concat(cdChunks);
    const cdSize = cd.length;

    const eocd = concat([
      u32le(0x06054b50),
      u16le(0),
      u16le(0),
      u16le(this._files.length),
      u16le(this._files.length),
      u32le(cdSize),
      u32le(cdStart),
      u16le(0), // comment
    ]);

    return concat([...this._chunks, cd, eocd]).buffer;
  }
}
