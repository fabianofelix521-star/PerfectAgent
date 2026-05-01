import { Link } from "react-router-dom";
import { APP_BRAND_NAME, useConfig } from "@/stores/config";
import { cn } from "@/utils/cn";

export function BrandMark({
  size = 40,
  className,
  alt = APP_BRAND_NAME,
}: {
  size?: number;
  className?: string;
  alt?: string;
}) {
  return (
    <span
      className={cn(
        "brand-mark inline-flex shrink-0 overflow-hidden rounded-[18px] p-[2px]",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <img
        src="/nexus-ultra-mark.svg"
        alt={alt}
        draggable={false}
        className="h-full w-full rounded-[16px] object-cover"
      />
    </span>
  );
}

export function BrandLockup({
  className,
  iconSize = 42,
  caption = "Nexus System",
  subtitle,
  href,
  compact = false,
}: {
  className?: string;
  iconSize?: number;
  caption?: string;
  subtitle?: string;
  href?: string;
  compact?: boolean;
}) {
  const appName = useConfig(
    (state) => state.settings.appName?.trim() || APP_BRAND_NAME,
  );

  const content = (
    <div
      className={cn(
        "brand-lockup inline-flex items-center gap-3 rounded-[20px] border border-white/70 bg-white/65 shadow-[0_18px_50px_rgba(90,105,150,0.10)] backdrop-blur-xl",
        compact ? "px-2.5 py-2" : "px-3.5 py-2.5",
        className,
      )}
    >
      <BrandMark size={iconSize} alt={appName} />
      <div className="min-w-0">
        <p className="truncate text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">
          {caption}
        </p>
        <p
          className={cn(
            "truncate font-semibold tracking-tight text-slate-950",
            compact ? "text-sm" : "text-base",
          )}
        >
          {appName}
        </p>
        {subtitle ? (
          <p className="truncate text-xs font-medium text-slate-500">
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );

  if (!href) return content;

  return (
    <Link to={href} aria-label={appName} className="inline-flex">
      {content}
    </Link>
  );
}