type InfoHoverProps = {
  info: string | null;
  overlayClassName?: string;
  wrapperClassName?: string;
  panelClassName?: string;
};

export function InfoHover({
  info,
  overlayClassName,
  wrapperClassName,
  panelClassName,
}: InfoHoverProps) {
  if (!info) {
    return null;
  }

  return (
    <>
      <div
        className={
          overlayClassName ??
          "pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-transparent opacity-0 transition duration-300 group-hover:opacity-100"
        }
      />
      <div
        className={
          wrapperClassName ??
          "pointer-events-none absolute inset-x-3 bottom-3 z-[1] translate-y-2 opacity-0 transition duration-300 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100"
        }
      >
        <div
          className={
            panelClassName ??
            "max-h-[calc(100%-1.5rem)] overflow-y-auto rounded-[1.35rem] border border-white/15 bg-slate-950/88 p-4 text-sm leading-6 text-slate-100 shadow-[0_18px_40px_rgba(2,6,23,0.45)] backdrop-blur-md"
          }
        >
          <p className="whitespace-pre-wrap break-words">{info}</p>
        </div>
      </div>
    </>
  );
}

export const VideoInfoHover = InfoHover;
