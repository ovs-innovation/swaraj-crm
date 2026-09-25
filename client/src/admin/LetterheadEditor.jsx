import { useEffect, useRef, useState } from "react";
import { Bold, Italic, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { settingsAPI } from "../services/api";
import { useLang } from "../shared/context/LanguageContext";
import { mediaUrl } from "../utils/mediaUrl";
import { sizeTo8k } from "../utils/composePoster";
import "./LetterheadEditor.css";

const FONTS = [
  { group: "English", items: [
    { id: "Inter", label: "Inter" },
    { id: "Poppins", label: "Poppins" },
    { id: "Montserrat", label: "Montserrat" },
    { id: "Roboto", label: "Roboto" },
    { id: "Oswald", label: "Oswald" },
    { id: "Georgia", label: "Georgia" },
    { id: "Times New Roman", label: "Times" },
    { id: "Arial", label: "Arial" },
  ]},
  { group: "Display", items: [
    { id: "Playfair Display", label: "Playfair" },
    { id: "Cormorant Garamond", label: "Cormorant" },
    { id: "Lora", label: "Lora" },
    { id: "Merriweather", label: "Merriweather" },
  ]},
  { group: "हिंदी", items: [
    { id: "Noto Sans Devanagari", label: "Noto Sans हिंदी" },
    { id: "Noto Serif Devanagari", label: "Noto Serif हिंदी" },
    { id: "Tiro Devanagari Hindi", label: "Tiro हिंदी" },
    { id: "Hind", label: "Hind" },
    { id: "Mukta", label: "Mukta" },
    { id: "Kalam", label: "Kalam" },
    { id: "Yatra One", label: "Yatra One" },
  ]},
];

const COLORS = ["#ffffff", "#111111", "#e8f4fc", "#0078D4", "#1B365D", "#4aa3e8", "#166534", "#9a3412"];

const KEYS = ["headerText", "headerSub", "footerLeft", "footerRight"];

const defaultTexts = {
  headerText: { value: "SWARAJ", x: 4, y: 3, w: 55, size: 28, font: "Inter", bold: true, italic: false, align: "left", color: "#ffffff" },
  headerSub: { value: "Dealer CRM · Mahindra & Mahindra Ltd.", x: 4, y: 9, w: 70, size: 14, font: "Inter", bold: false, italic: false, align: "left", color: "#ffffff" },
  footerLeft: { value: "Confidential — internal use", x: 4, y: 90, w: 40, size: 13, font: "Inter", bold: false, italic: false, align: "left", color: "#ffffff" },
  footerRight: { value: "www.swarajtractors.com", x: 55, y: 90, w: 40, size: 13, font: "Inter", bold: false, italic: false, align: "right", color: "#ffffff" },
};

const empty = {
  imageUrl: "",
  headerPct: 16,
  footerPct: 11,
  headerBg: "rgba(122, 8, 18, 0.72)",
  footerBg: "rgba(28, 25, 23, 0.72)",
  texts: defaultTexts,
};

const hydrate = (lh = {}) => {
  const texts = {};
  KEYS.forEach((k) => {
    texts[k] = {
      ...defaultTexts[k],
      value: lh.texts?.[k]?.value ?? lh[k] ?? defaultTexts[k].value,
      x: lh.texts?.[k]?.x ?? lh.pos?.[k]?.x ?? defaultTexts[k].x,
      y: lh.texts?.[k]?.y ?? lh.pos?.[k]?.y ?? defaultTexts[k].y,
      w: lh.texts?.[k]?.w ?? defaultTexts[k].w,
      size: lh.texts?.[k]?.size ?? (k === "headerText" ? lh.headerSize : k === "headerSub" ? lh.subSize : lh.footerSize) ?? defaultTexts[k].size,
      font: lh.texts?.[k]?.font ?? lh.fontFamily ?? defaultTexts[k].font,
      bold: lh.texts?.[k]?.bold ?? (k === "headerText" ? lh.bold : false) ?? defaultTexts[k].bold,
      italic: lh.texts?.[k]?.italic ?? lh.italic ?? defaultTexts[k].italic,
      align: lh.texts?.[k]?.align ?? lh.align ?? defaultTexts[k].align,
      color: lh.texts?.[k]?.color ?? (k.startsWith("footer") ? lh.footerColor : lh.headerColor) ?? defaultTexts[k].color,
    };
  });
  return { ...empty, ...lh, texts };
};

const LetterheadEditor = () => {
  const { t } = useLang();
  const canvasRef = useRef(null);
  const [draft, setDraft] = useState(empty);
  const [localPreview, setLocalPreview] = useState("");
  const [imgError, setImgError] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [focus, setFocus] = useState("headerText");
  const drag = useRef(null);

  useEffect(() => {
    settingsAPI.get().then((res) => setDraft(hydrate(res.data.data?.letterhead || {})));
  }, []);

  const pictureSrc = localPreview || mediaUrl(draft.imageUrl);

  useEffect(() => {
    setImgError(false);
  }, [pictureSrc]);

  const active = draft.texts?.[focus] || defaultTexts.headerText;

  const patchText = (key, patch) => {
    setDraft((d) => ({
      ...d,
      texts: { ...d.texts, [key]: { ...d.texts[key], ...patch } },
      [key]: patch.value != null ? patch.value : d[key],
    }));
  };

  const patchActive = (patch) => patchText(focus, patch);

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLocalPreview(URL.createObjectURL(file));
    setImgError(false);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await settingsAPI.uploadLetterhead(fd);
      setDraft((d) => hydrate({ ...d, ...(res.data.data?.letterhead || {}) }));
    } finally {
      setBusy(false);
    }
  };

  const saveTexts = async () => {
    setBusy(true);
    try {
      const payload = {
        ...draft,
        headerText: draft.texts.headerText.value,
        headerSub: draft.texts.headerSub.value,
        footerLeft: draft.texts.footerLeft.value,
        footerRight: draft.texts.footerRight.value,
      };
      await settingsAPI.update({ letterhead: payload });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setBusy(false);
    }
  };

  const downloadHd = async () => {
    const root = canvasRef.current;
    const imgEl = root?.querySelector("img");
    if (!imgEl?.naturalWidth) return;
    setBusy(true);
    root.classList.add("lh-exporting");
    try {
      await document.fonts.ready;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const src = await new Promise((resolve, reject) => {
        const im = new Image();
        im.crossOrigin = "anonymous";
        im.onload = () => resolve(im);
        im.onerror = reject;
        im.src = imgEl.src;
      });
      const { W, H } = sizeTo8k(src.naturalWidth, src.naturalHeight);
      const out = document.createElement("canvas");
      out.width = W;
      out.height = H;
      const ctx = out.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(src, 0, 0, W, H);
      const imgBox = imgEl.getBoundingClientRect();
      const sx = W / imgBox.width;
      const sy = H / imgBox.height;
      root.querySelectorAll(".lh-band").forEach((band) => {
        const r = band.getBoundingClientRect();
        ctx.fillStyle = getComputedStyle(band).backgroundColor;
        ctx.fillRect((r.left - imgBox.left) * sx, (r.top - imgBox.top) * sy, r.width * sx, r.height * sy);
      });
      KEYS.forEach((key) => {
        const input = root.querySelector(`[data-key="${key}"] .lh-line`);
        if (!input?.value) return;
        const r = input.getBoundingClientRect();
        const cs = getComputedStyle(input);
        const size = parseFloat(cs.fontSize) * sy;
        ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${size}px ${cs.fontFamily}`;
        ctx.fillStyle = cs.color;
        ctx.textBaseline = "top";
        const align = cs.textAlign;
        ctx.textAlign = align === "right" || align === "center" ? align : "left";
        let x = (r.left - imgBox.left) * sx;
        if (align === "center") x += (r.width * sx) / 2;
        if (align === "right") x += r.width * sx;
        ctx.fillText(input.value, x, (r.top - imgBox.top) * sy, r.width * sx);
      });
      await new Promise((resolve, reject) => {
        out.toBlob((blob) => {
          if (!blob) return reject(new Error("export failed"));
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "swaraj-letterhead-8k.png";
          a.click();
          URL.revokeObjectURL(a.href);
          resolve();
        }, "image/png");
      });
    } finally {
      root.classList.remove("lh-exporting");
      setBusy(false);
    }
  };

  const startResizeBand = (edge) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    drag.current = { type: "band", edge, startY: e.clientY };
    const move = (ev) => {
      const box = canvasRef.current;
      if (!box || drag.current?.type !== "band") return;
      const h = box.getBoundingClientRect().height;
      const delta = ((ev.clientY - drag.current.startY) / h) * 100;
      drag.current.startY = ev.clientY;
      setDraft((d) => {
        if (drag.current.edge === "header") {
          return { ...d, headerPct: Math.min(40, Math.max(6, d.headerPct + delta)) };
        }
        return { ...d, footerPct: Math.min(36, Math.max(6, d.footerPct - delta)) };
      });
    };
    const up = () => {
      drag.current = null;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const startMove = (key) => (e) => {
    if (e.target.tagName === "INPUT" || e.target.classList.contains("lh-resize")) return;
    e.preventDefault();
    e.stopPropagation();
    setFocus(key);
    const box = canvasRef.current.getBoundingClientRect();
    const pos = draft.texts[key];
    drag.current = {
      type: "move",
      key,
      dx: ((e.clientX - box.left) / box.width) * 100 - pos.x,
      dy: ((e.clientY - box.top) / box.height) * 100 - pos.y,
    };
    const move = (ev) => {
      const c = canvasRef.current;
      if (!c || drag.current?.type !== "move") return;
      const r = c.getBoundingClientRect();
      const x = Math.min(88, Math.max(0, ((ev.clientX - r.left) / r.width) * 100 - drag.current.dx));
      const y = Math.min(94, Math.max(0, ((ev.clientY - r.top) / r.height) * 100 - drag.current.dy));
      patchText(drag.current.key, { x, y });
    };
    const up = () => {
      drag.current = null;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const startBoxResize = (key) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    setFocus(key);
    const item = draft.texts[key];
    drag.current = { type: "box", key, startX: e.clientX, startY: e.clientY, w: item.w, size: item.size };
    const move = (ev) => {
      if (drag.current?.type !== "box") return;
      const dw = (ev.clientX - drag.current.startX) / 6;
      const ds = (ev.clientY - drag.current.startY) / 4;
      patchText(drag.current.key, {
        w: Math.min(90, Math.max(12, drag.current.w + dw)),
        size: Math.min(96, Math.max(10, Math.round(drag.current.size + ds))),
      });
    };
    const up = () => {
      drag.current = null;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const bandKey = focus.startsWith("footer") ? "footer" : "header";

  return (
    <div className="lh-page">
      <div className="page-header">
        <div>
          <h1>{t("lh.title")}</h1>
          <p className="page-subtitle">{t("lh.sub")}</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <label className="btn btn-outline" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", margin: 0 }}>
            <input type="file" accept="image/*" onChange={onPick} hidden />
            {pictureSrc && !imgError ? (t("lh.replace") || "Change picture") : (t("lh.drop") || "Choose picture")}
          </label>
          <button className="btn btn-outline" type="button" disabled={busy || !pictureSrc || imgError} onClick={downloadHd}>
            {t("lh.download")}
          </button>
          <button className="btn btn-primary" type="button" disabled={busy} onClick={saveTexts}>
            {t("lh.save")}
          </button>
        </div>
      </div>
      {saved && <div className="alert alert-success">{t("lh.saved")}</div>}

      <div className="lh-toolbar">
        <select className="lh-font" value={active.font} onChange={(e) => patchActive({ font: e.target.value })}>
          {FONTS.map((g) => (
            <optgroup key={g.group} label={g.group}>
              {g.items.map((f) => (
                <option key={f.id} value={f.id} style={{ fontFamily: f.id }}>
                  {f.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <label>
          {t("lh.size")}
          <input type="number" min="10" max="96" value={active.size} onChange={(e) => patchActive({ size: Number(e.target.value) })} />
        </label>
        <button type="button" className={active.bold ? "on" : ""} onClick={() => patchActive({ bold: !active.bold })}>
          <Bold size={15} />
        </button>
        <button type="button" className={active.italic ? "on" : ""} onClick={() => patchActive({ italic: !active.italic })}>
          <Italic size={15} />
        </button>
        <button type="button" className={active.align === "left" ? "on" : ""} onClick={() => patchActive({ align: "left" })}>
          <AlignLeft size={15} />
        </button>
        <button type="button" className={active.align === "center" ? "on" : ""} onClick={() => patchActive({ align: "center" })}>
          <AlignCenter size={15} />
        </button>
        <button type="button" className={active.align === "right" ? "on" : ""} onClick={() => patchActive({ align: "right" })}>
          <AlignRight size={15} />
        </button>
        <div className="lh-swatch">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={active.color?.toLowerCase() === c ? "on" : ""}
              style={{ background: c }}
              onClick={() => patchActive({ color: c })}
              title={c}
            />
          ))}
          <label className="lh-color">
            {t("lh.text")}
            <input type="color" value={active.color?.startsWith("#") ? active.color : "#ffffff"} onChange={(e) => patchActive({ color: e.target.value })} />
          </label>
        </div>
        <label className="lh-color">
          {t("lh.band")}
          <input
            type="color"
            value={toHex(bandKey === "footer" ? draft.footerBg : draft.headerBg)}
            onChange={(e) =>
              setDraft((d) =>
                bandKey === "footer"
                  ? { ...d, footerBg: hexToRgba(e.target.value, 0.72) }
                  : { ...d, headerBg: hexToRgba(e.target.value, 0.72) }
              )
            }
          />
        </label>
      </div>

      <div className="lh-grid">
        <div className="lh-stage card">
          {(!pictureSrc || imgError) ? (
            <label className="lh-drop">
              <input type="file" accept="image/*" onChange={onPick} hidden />
              <strong>{imgError ? (t("lh.drop") || "Choose picture (file missing on server)") : t("lh.drop")}</strong>
              <span>{t("lh.dropHint")}</span>
            </label>
          ) : (
            <div className="lh-canvas" ref={canvasRef}>
              <img src={pictureSrc} alt="" onError={() => setImgError(true)} />
              <div className={`lh-band header ${bandKey === "header" ? "on" : ""}`} style={{ height: `${draft.headerPct}%`, background: draft.headerBg }}>
                <button type="button" className="lh-handle bottom" onMouseDown={startResizeBand("header")} />
              </div>
              <div className={`lh-band footer ${bandKey === "footer" ? "on" : ""}`} style={{ height: `${draft.footerPct}%`, background: draft.footerBg }}>
                <button type="button" className="lh-handle top" onMouseDown={startResizeBand("footer")} />
              </div>
              {KEYS.map((key) => {
                const item = draft.texts[key];
                return (
                  <div
                    key={key}
                    className={`lh-float ${focus === key ? "sel" : ""}`}
                    data-key={key}
                    style={{
                      left: `${item.x}%`,
                      top: `${item.y}%`,
                      width: `${item.w}%`,
                      color: item.color,
                      fontFamily: `'${item.font}', 'Noto Sans Devanagari', sans-serif`,
                      fontWeight: item.bold ? 700 : 400,
                      fontStyle: item.italic ? "italic" : "normal",
                    }}
                    onMouseDown={startMove(key)}
                    onClick={() => setFocus(key)}
                  >
                    <span className="lh-grip" />
                    <input
                      className="lh-line"
                      style={{ fontSize: item.size, textAlign: item.align, color: item.color }}
                      value={item.value}
                      onChange={(e) => patchText(key, { value: e.target.value })}
                    />
                    {focus === key && (
                      <button type="button" className="lh-resize" onMouseDown={startBoxResize(key)} title="Resize" />
                    )}
                  </div>
                );
              })}
              <label className="lh-replace">
                <input type="file" accept="image/*" onChange={onPick} hidden />
                {t("lh.replace")}
              </label>
            </div>
          )}
        </div>

        <aside className="lh-side card">
          <h3 className="card-title">{t("lh.panel")}</h3>
          <p className="hint">{t("lh.hint")}</p>
          <div className="form-group">
            <label>{t("lh.header")}</label>
            <div className="lh-side-row">
              <input value={draft.texts.headerText.value} onFocus={() => setFocus("headerText")} onChange={(e) => patchText("headerText", { value: e.target.value })} />
              <input type="color" value={draft.texts.headerText.color?.startsWith("#") ? draft.texts.headerText.color : "#ffffff"} onFocus={() => setFocus("headerText")} onChange={(e) => patchText("headerText", { color: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label>{t("lh.headerSub")}</label>
            <div className="lh-side-row">
              <input value={draft.texts.headerSub.value} onFocus={() => setFocus("headerSub")} onChange={(e) => patchText("headerSub", { value: e.target.value })} />
              <input type="color" value={draft.texts.headerSub.color?.startsWith("#") ? draft.texts.headerSub.color : "#ffffff"} onFocus={() => setFocus("headerSub")} onChange={(e) => patchText("headerSub", { color: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label>{t("lh.footerL")}</label>
            <div className="lh-side-row">
              <input value={draft.texts.footerLeft.value} onFocus={() => setFocus("footerLeft")} onChange={(e) => patchText("footerLeft", { value: e.target.value })} />
              <input type="color" value={draft.texts.footerLeft.color?.startsWith("#") ? draft.texts.footerLeft.color : "#ffffff"} onFocus={() => setFocus("footerLeft")} onChange={(e) => patchText("footerLeft", { color: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label>{t("lh.footerR")}</label>
            <div className="lh-side-row">
              <input value={draft.texts.footerRight.value} onFocus={() => setFocus("footerRight")} onChange={(e) => patchText("footerRight", { value: e.target.value })} />
              <input type="color" value={draft.texts.footerRight.color?.startsWith("#") ? draft.texts.footerRight.color : "#ffffff"} onFocus={() => setFocus("footerRight")} onChange={(e) => patchText("footerRight", { color: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>{t("lh.headerH")}</label>
              <input type="range" min="6" max="40" value={draft.headerPct} onChange={(e) => setDraft((d) => ({ ...d, headerPct: Number(e.target.value) }))} />
            </div>
            <div className="form-group">
              <label>{t("lh.footerH")}</label>
              <input type="range" min="6" max="36" value={draft.footerPct} onChange={(e) => setDraft((d) => ({ ...d, footerPct: Number(e.target.value) }))} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

const toHex = (value) => {
  if (!value) return "#0078D4";
  if (value.startsWith("#")) return value.slice(0, 7);
  const m = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return "#0078D4";
  return `#${[m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("")}`;
};

const hexToRgba = (hex, a) => {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

export default LetterheadEditor;
