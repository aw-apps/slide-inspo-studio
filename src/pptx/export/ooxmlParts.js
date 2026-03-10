import { escapeXml, xmlDecl, hexToSrgbVal, joinXml } from './xml.js';

const EMU_PER_INCH = 914400;
const PX_PER_INCH = 96;
const EMU_PER_PX = EMU_PER_INCH / PX_PER_INCH; // 9525

function pxToEmu(px) {
  const n = Number(px);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * EMU_PER_PX);
}

function pxToPt100(px) {
  const n = Number(px);
  if (!Number.isFinite(n)) return 1200;
  const pt = (n * 72) / 96;
  return Math.max(100, Math.round(pt * 100));
}

function degToRot60000(deg) {
  const n = Number(deg);
  if (!Number.isFinite(n) || n === 0) return null;
  return Math.round(n * 60000);
}

function slideSizePx(doc) {
  const w = doc?.meta?.page?.w;
  const h = doc?.meta?.page?.h;
  const ww = Number.isFinite(w) ? w : 960;
  const hh = Number.isFinite(h) ? h : 540;
  return { w: Math.max(1, Math.round(ww)), h: Math.max(1, Math.round(hh)) };
}

function textAlignAttr(align) {
  if (align === 'center') return 'ctr';
  if (align === 'right') return 'r';
  return 'l';
}

function mkContentTypes(slideCount) {
  const overrides = [];
  for (let i = 1; i <= slideCount; i++) {
    overrides.push(
      `<Override PartName="/ppt/slides/slide${i}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`
    );
  }

  return joinXml([
    xmlDecl(),
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
    '<Default Extension="xml" ContentType="application/xml"/>',
    '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>',
    '<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>',
    '<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>',
    '<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>',
    '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>',
    '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>',
    ...overrides,
    '</Types>',
  ]);
}

function mkRootRels() {
  return joinXml([
    xmlDecl(),
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>',
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>',
    '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>',
    '</Relationships>',
  ]);
}

function mkCoreProps(doc) {
  const title = escapeXml(doc?.meta?.title || 'Untitled');
  return joinXml([
    xmlDecl(),
    '<cp:coreProperties',
    ' xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"',
    ' xmlns:dc="http://purl.org/dc/elements/1.1/"',
    ' xmlns:dcterms="http://purl.org/dc/terms/"',
    ' xmlns:dcmitype="http://purl.org/dc/dcmitype/"',
    ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">',
    `<dc:title>${title}</dc:title>`,
    '<dc:creator>Slide Inspo Studio</dc:creator>',
    '<cp:lastModifiedBy>Slide Inspo Studio</cp:lastModifiedBy>',
    '<dcterms:created xsi:type="dcterms:W3CDTF">2026-01-01T00:00:00Z</dcterms:created>',
    '<dcterms:modified xsi:type="dcterms:W3CDTF">2026-01-01T00:00:00Z</dcterms:modified>',
    '</cp:coreProperties>',
  ]);
}

function mkAppProps(slideCount) {
  return joinXml([
    xmlDecl(),
    '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">',
    '<Application>Slide Inspo Studio</Application>',
    `<Slides>${slideCount}</Slides>`,
    '<ScaleCrop>false</ScaleCrop>',
    '<Company></Company>',
    '<LinksUpToDate>false</LinksUpToDate>',
    '<SharedDoc>false</SharedDoc>',
    '<HyperlinksChanged>false</HyperlinksChanged>',
    '<AppVersion>16.0000</AppVersion>',
    '</Properties>',
  ]);
}

function mkPresentation(doc, slideCount, presSizeEmu) {
  const { cx, cy } = presSizeEmu;

  const sldIdLst = [];
  const baseId = 256;
  for (let i = 1; i <= slideCount; i++) {
    sldIdLst.push(`<p:sldId id="${baseId + i}" r:id="rId${i + 1}"/>`);
  }

  return joinXml([
    xmlDecl(),
    '<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"',
    ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"',
    ' xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">',
    `<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>`,
    `<p:sldIdLst>${sldIdLst.join('')}</p:sldIdLst>`,
    `<p:sldSz cx="${cx}" cy="${cy}" type="screen16x9"/>`,
    '<p:notesSz cx="6858000" cy="9144000"/>',
    '<p:defaultTextStyle/>' ,
    '</p:presentation>',
  ]);
}

function mkPresentationRels(slideCount) {
  const rels = [
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>',
  ];
  for (let i = 1; i <= slideCount; i++) {
    rels.push(
      `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i}.xml"/>`
    );
  }

  return joinXml([
    xmlDecl(),
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    ...rels,
    '</Relationships>',
  ]);
}

function mkSlideMaster(presSizeEmu) {
  const { cx, cy } = presSizeEmu;
  return joinXml([
    xmlDecl(),
    '<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"',
    ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"',
    ' xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">',
    '<p:cSld>',
    '<p:spTree>',
    '<p:nvGrpSpPr>',
    '<p:cNvPr id="1" name=""/>',
    '<p:cNvGrpSpPr/>',
    '<p:nvPr/>',
    '</p:nvGrpSpPr>',
    '<p:grpSpPr>',
    '<a:xfrm>',
    '<a:off x="0" y="0"/>',
    `<a:ext cx="${cx}" cy="${cy}"/>`,
    '<a:chOff x="0" y="0"/>',
    `<a:chExt cx="${cx}" cy="${cy}"/>`,
    '</a:xfrm>',
    '</p:grpSpPr>',
    '</p:spTree>',
    '</p:cSld>',
    '<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>',
    '<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>',
    '<p:txStyles/>',
    '</p:sldMaster>',
  ]);
}

function mkSlideMasterRels() {
  return joinXml([
    xmlDecl(),
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>',
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>',
    '</Relationships>',
  ]);
}

function mkSlideLayout(presSizeEmu) {
  const { cx, cy } = presSizeEmu;
  return joinXml([
    xmlDecl(),
    '<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"',
    ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"',
    ' xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank">',
    '<p:cSld>',
    '<p:spTree>',
    '<p:nvGrpSpPr>',
    '<p:cNvPr id="1" name=""/>',
    '<p:cNvGrpSpPr/>',
    '<p:nvPr/>',
    '</p:nvGrpSpPr>',
    '<p:grpSpPr>',
    '<a:xfrm>',
    '<a:off x="0" y="0"/>',
    `<a:ext cx="${cx}" cy="${cy}"/>`,
    '<a:chOff x="0" y="0"/>',
    `<a:chExt cx="${cx}" cy="${cy}"/>`,
    '</a:xfrm>',
    '</p:grpSpPr>',
    '</p:spTree>',
    '</p:cSld>',
    '<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>',
    '</p:sldLayout>',
  ]);
}

function mkSlideLayoutRels() {
  return joinXml([
    xmlDecl(),
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>',
    '</Relationships>',
  ]);
}

function mkTheme() {
  // Minimal, standard-ish theme that PowerPoint accepts.
  return joinXml([
    xmlDecl(),
    '<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="SlideInspoTheme">',
    '<a:themeElements>',
    '<a:clrScheme name="Office">',
    '<a:dk1><a:srgbClr val="000000"/></a:dk1>',
    '<a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>',
    '<a:dk2><a:srgbClr val="1F1F1F"/></a:dk2>',
    '<a:lt2><a:srgbClr val="EEEEEE"/></a:lt2>',
    '<a:accent1><a:srgbClr val="2B4CFF"/></a:accent1>',
    '<a:accent2><a:srgbClr val="FF6B2B"/></a:accent2>',
    '<a:accent3><a:srgbClr val="00A389"/></a:accent3>',
    '<a:accent4><a:srgbClr val="7B61FF"/></a:accent4>',
    '<a:accent5><a:srgbClr val="FFC857"/></a:accent5>',
    '<a:accent6><a:srgbClr val="4D96FF"/></a:accent6>',
    '<a:hlink><a:srgbClr val="0000FF"/></a:hlink>',
    '<a:folHlink><a:srgbClr val="800080"/></a:folHlink>',
    '</a:clrScheme>',
    '<a:fontScheme name="Office">',
    '<a:majorFont><a:latin typeface="Calibri"/></a:majorFont>',
    '<a:minorFont><a:latin typeface="Calibri"/></a:minorFont>',
    '</a:fontScheme>',
    '<a:fmtScheme name="Office">',
    '<a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst>',
    '<a:lnStyleLst><a:ln w="6350" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln></a:lnStyleLst>',
    '<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>',
    '<a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst>',
    '</a:fmtScheme>',
    '</a:themeElements>',
    '<a:objectDefaults/>',
    '<a:extraClrSchemeLst/>',
    '</a:theme>',
  ]);
}

function mkSlideXml(slide, slideIndex, presSizeEmu) {
  const { cx, cy } = presSizeEmu;

  /** @type {string[]} */
  const shapes = [];
  let shapeId = 2;

  const els = Array.isArray(slide?.elements) ? slide.elements : [];

  for (const el of els) {
    if (!el || typeof el !== 'object') continue;

    const x = pxToEmu(el.x);
    const y = pxToEmu(el.y);
    const w = pxToEmu(el.w);
    const h = pxToEmu(el.h);
    const rot = degToRot60000(el.rotation);

    const xfrm = joinXml([
      `<a:xfrm${rot != null ? ` rot=\"${rot}\"` : ''}>`,
      `<a:off x=\"${x}\" y=\"${y}\"/>`,
      `<a:ext cx=\"${w}\" cy=\"${h}\"/>`,
      '</a:xfrm>',
    ]);

    if (el.type === 'rect') {
      const fillVal = el.fill === 'transparent' ? null : hexToSrgbVal(el.fill);
      const strokeVal = hexToSrgbVal(el.stroke);
      const prst = Number(el.radius) > 0 ? 'roundRect' : 'rect';

      const spPr = joinXml([
        '<p:spPr>',
        xfrm,
        `<a:prstGeom prst=\"${prst}\"><a:avLst/></a:prstGeom>`,
        fillVal ? `<a:solidFill><a:srgbClr val=\"${fillVal}\"/></a:solidFill>` : '<a:noFill/>',
        strokeVal
          ? `<a:ln w=\"${Math.max(1, Math.round((Number(el.strokeWidth || 1) * EMU_PER_PX))) }\"><a:solidFill><a:srgbClr val=\"${strokeVal}\"/></a:solidFill></a:ln>`
          : '',
        '</p:spPr>',
      ]);

      shapes.push(joinXml([
        '<p:sp>',
        '<p:nvSpPr>',
        `<p:cNvPr id=\"${shapeId}\" name=\"${escapeXml(el.name || `Rect ${shapeId - 1}`)}\"/>`,
        '<p:cNvSpPr/>',
        '<p:nvPr/>',
        '</p:nvSpPr>',
        spPr,
        '</p:sp>',
      ]));

      shapeId++;
      continue;
    }

    if (el.type === 'text') {
      const colorVal = hexToSrgbVal(el.color) ?? '111111';
      const fontSz = pxToPt100(el.fontSize);
      const fontFamily = el.fontFamily ? String(el.fontFamily).split(',')[0].trim() : null;
      const algn = textAlignAttr(el.align);

      const paras = String(el.text || '').split(/\n/);
      const ps = paras.map((line) => {
        const t = escapeXml(line);
        return joinXml([
          `<a:p><a:pPr algn=\"${algn}\"/>`,
          '<a:r>',
          `<a:rPr lang=\"en-US\" dirty=\"0\" sz=\"${fontSz}\">`,
          `<a:solidFill><a:srgbClr val=\"${colorVal}\"/></a:solidFill>`,
          fontFamily ? `<a:latin typeface=\"${escapeXml(fontFamily)}\"/>` : '',
          '</a:rPr>',
          `<a:t>${t}</a:t>`,
          '</a:r>',
          `<a:endParaRPr lang=\"en-US\" sz=\"${fontSz}\"/>`,
          '</a:p>',
        ]);
      });

      const txBody = joinXml([
        '<p:txBody>',
        '<a:bodyPr wrap="square"/>',
        '<a:lstStyle/>',
        ...ps,
        '</p:txBody>',
      ]);

      const spPr = joinXml([
        '<p:spPr>',
        xfrm,
        '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>',
        '<a:noFill/>',
        '</p:spPr>',
      ]);

      shapes.push(joinXml([
        '<p:sp>',
        '<p:nvSpPr>',
        `<p:cNvPr id=\"${shapeId}\" name=\"${escapeXml(el.name || `Text ${shapeId - 1}`)}\"/>`,
        '<p:cNvSpPr txBox="1"/>',
        '<p:nvPr/>',
        '</p:nvSpPr>',
        spPr,
        txBody,
        '</p:sp>',
      ]));

      shapeId++;
      continue;
    }
  }

  const bg = slide?.bg?.color ? hexToSrgbVal(slide.bg.color) : null;
  const bgXml = bg
    ? `<p:bg><p:bgPr><a:solidFill><a:srgbClr val=\"${bg}\"/></a:solidFill></p:bgPr></p:bg>`
    : '';

  return joinXml([
    xmlDecl(),
    '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"',
    ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"',
    ' xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">',
    '<p:cSld>',
    bgXml,
    '<p:spTree>',
    '<p:nvGrpSpPr>',
    '<p:cNvPr id="1" name=""/>',
    '<p:cNvGrpSpPr/>',
    '<p:nvPr/>',
    '</p:nvGrpSpPr>',
    '<p:grpSpPr>',
    '<a:xfrm>',
    '<a:off x="0" y="0"/>',
    `<a:ext cx="${cx}" cy="${cy}"/>`,
    '<a:chOff x="0" y="0"/>',
    `<a:chExt cx="${cx}" cy="${cy}"/>`,
    '</a:xfrm>',
    '</p:grpSpPr>',
    ...shapes,
    '</p:spTree>',
    '</p:cSld>',
    '<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>',
    '</p:sld>',
  ]);
}

function mkSlideRels() {
  return joinXml([
    xmlDecl(),
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>',
    '</Relationships>',
  ]);
}

export function buildPptxParts(doc) {
  const slides = Array.isArray(doc?.slides) && doc.slides.length ? doc.slides : [{ elements: [] }];
  const slideCount = slides.length;

  const sizePx = slideSizePx(doc);
  const presSizeEmu = { cx: pxToEmu(sizePx.w), cy: pxToEmu(sizePx.h) };

  /** @type {{path:string, text:string}[]} */
  const files = [];

  files.push({ path: '[Content_Types].xml', text: mkContentTypes(slideCount) });
  files.push({ path: '_rels/.rels', text: mkRootRels() });
  files.push({ path: 'docProps/core.xml', text: mkCoreProps(doc) });
  files.push({ path: 'docProps/app.xml', text: mkAppProps(slideCount) });

  files.push({ path: 'ppt/presentation.xml', text: mkPresentation(doc, slideCount, presSizeEmu) });
  files.push({ path: 'ppt/_rels/presentation.xml.rels', text: mkPresentationRels(slideCount) });

  files.push({ path: 'ppt/slideMasters/slideMaster1.xml', text: mkSlideMaster(presSizeEmu) });
  files.push({ path: 'ppt/slideMasters/_rels/slideMaster1.xml.rels', text: mkSlideMasterRels() });

  files.push({ path: 'ppt/slideLayouts/slideLayout1.xml', text: mkSlideLayout(presSizeEmu) });
  files.push({ path: 'ppt/slideLayouts/_rels/slideLayout1.xml.rels', text: mkSlideLayoutRels() });

  files.push({ path: 'ppt/theme/theme1.xml', text: mkTheme() });

  for (let i = 0; i < slideCount; i++) {
    files.push({ path: `ppt/slides/slide${i + 1}.xml`, text: mkSlideXml(slides[i], i + 1, presSizeEmu) });
    files.push({ path: `ppt/slides/_rels/slide${i + 1}.xml.rels`, text: mkSlideRels() });
  }

  return files.map(f => ({ path: f.path, data: new TextEncoder().encode(f.text) }));
}
