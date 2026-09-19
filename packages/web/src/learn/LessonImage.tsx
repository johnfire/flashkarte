import { useRef, useState } from "react";
import { useParams } from "react-router";
import { useTranslation } from "react-i18next";
import type { ImageBlock } from "@flashkarte/shared";
import { useImageSource } from "./useAssetUrl";

/**
 * A lesson's picture. It sits on a white surface in light and dark mode alike, so a diagram drawn
 * with dark lines stays readable. An expandable diagram is opened full-screen from a "Show
 * diagram" button and closed back to the same place on the screen.
 */
export function LessonImage({ block }: { block: ImageBlock }) {
  const { t } = useTranslation();
  const { subjectId } = useParams<{ subjectId: string }>();
  const source = useImageSource(subjectId, block.src);
  const description = block.caption ?? block.alt;

  if (source.status !== "ready") {
    return (
      <figure className="rounded-lg border p-4 text-sm text-gray-700 dark:text-gray-300">
        <p role={source.status === "failed" ? "alert" : "status"}>
          {source.status === "failed"
            ? t("learn.imageUnavailable")
            : t("learn.loading")}
        </p>
        <figcaption className="mt-1">{block.alt}</figcaption>
      </figure>
    );
  }

  if (block.display === "expandable") {
    return (
      <ExpandableImage url={source.url} alt={block.alt} caption={description} />
    );
  }
  return (
    <figure className="rounded-lg border bg-white p-3">
      <img
        src={source.url}
        alt={block.alt}
        className="mx-auto max-h-[60vh] max-w-full"
      />
      {block.caption && (
        <figcaption className="mt-2 text-center text-sm text-gray-700">
          {block.caption}
        </figcaption>
      )}
    </figure>
  );
}

const ZOOM_STEP = 0.5;
const MAX_ZOOM = 4;

function ExpandableImage({
  url,
  alt,
  caption,
}: {
  url: string;
  alt: string;
  caption: string;
}) {
  const { t } = useTranslation();
  const dialog = useRef<HTMLDialogElement>(null);
  const [zoom, setZoom] = useState(1);

  function open() {
    setZoom(1);
    const element = dialog.current;
    if (!element) return;
    if (typeof element.showModal === "function") element.showModal();
    else element.setAttribute("open", "");
  }
  function close() {
    const element = dialog.current;
    if (typeof element?.close === "function") element.close();
    else element?.removeAttribute("open");
  }

  return (
    <figure className="rounded-lg border p-3 text-sm">
      <button
        type="button"
        onClick={open}
        className="rounded-lg border px-4 py-2 font-medium text-indigo-700 dark:text-indigo-300"
      >
        {t("learn.showDiagram")}
      </button>
      <figcaption className="mt-2 text-gray-700 dark:text-gray-300">
        {caption}
      </figcaption>
      <dialog
        ref={dialog}
        aria-label={alt}
        className="m-0 h-screen max-h-none w-screen max-w-none bg-white p-0 text-gray-900 backdrop:bg-black/70"
      >
        <div className="flex h-full flex-col">
          <div className="flex flex-wrap gap-2 border-b p-3">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP))}
              className="rounded border px-3 py-1"
            >
              {t("learn.zoomIn")}
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(1, z - ZOOM_STEP))}
              className="rounded border px-3 py-1"
            >
              {t("learn.zoomOut")}
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="rounded border px-3 py-1"
            >
              {t("learn.zoomFit")}
            </button>
            <button
              type="button"
              onClick={close}
              className="ml-auto rounded bg-indigo-600 px-4 py-1 font-medium text-white"
            >
              {t("learn.closeDiagram")}
            </button>
          </div>
          <div
            className="flex-1 overflow-auto p-3"
            style={{ touchAction: "pan-x pan-y pinch-zoom" }}
          >
            <img
              src={url}
              alt={alt}
              style={{ width: `${zoom * 100}%`, maxWidth: "none" }}
              className="mx-auto"
            />
          </div>
        </div>
      </dialog>
    </figure>
  );
}
