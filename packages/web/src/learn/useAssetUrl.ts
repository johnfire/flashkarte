import { useEffect, useState } from "react";
import { assetDataUrl } from "../api/client";

export type AssetState =
  | { status: "loading" }
  | { status: "ready"; url: string }
  | { status: "failed" };

const ASSET_SOURCE = /^asset:([0-9a-f-]{36})$/i;

/**
 * Where an image block's picture comes from. A stored diagram (`asset:<id>`) is fetched with the
 * learner's sign-in; a web link or an app-relative path is used as it is.
 */
export function useImageSource(
  subjectId: string | undefined,
  src: string,
): AssetState {
  const asset = ASSET_SOURCE.exec(src)?.[1];
  const [state, setState] = useState<AssetState>({ status: "loading" });

  useEffect(() => {
    if (!asset) return;
    if (!subjectId) {
      setState({ status: "failed" });
      return;
    }
    let live = true;
    setState({ status: "loading" });
    assetDataUrl(subjectId, asset).then(
      (url) => live && setState({ status: "ready", url }),
      () => live && setState({ status: "failed" }),
    );
    return () => {
      live = false;
    };
  }, [subjectId, asset]);

  if (asset) return state;
  return /^(https:\/\/|\/)/.test(src)
    ? { status: "ready", url: src }
    : { status: "failed" };
}
