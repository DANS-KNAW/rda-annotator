import { isValidUrl } from "@/utils/annotation-helpers";

interface VocabularyBadgeProps {
  label: string;
  url?: string | null;
  description?: string;
  variant?: "default" | "custom";
}

export default function VocabularyBadge({
  label,
  url,
  description,
  variant = "default",
}: VocabularyBadgeProps) {
  const baseClasses =
    "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium inset-ring transition-colors";

  const variantClasses =
    variant === "custom"
      ? "bg-blue-50 text-blue-700 inset-ring-blue-500/10 hover:bg-blue-100 hover:text-blue-900"
      : "bg-rda-50 text-rda-700 inset-ring-rda-500/10 hover:bg-rda-100 hover:text-rda-900";

  const isClickable = url && isValidUrl(url);

  if (isClickable) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={description}
        className={`${baseClasses} ${variantClasses} hover:underline underline-offset-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rda-500`}
        aria-label={`View ${label} in external source`}
      >
        {label}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="size-3"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5Z"
            clipRule="evenodd"
          />
          <path
            fillRule="evenodd"
            d="M6.194 12.753a.75.75 0 0 0 1.06.053L16.5 4.44v2.81a.75.75 0 0 0 1.5 0v-4.5a.75.75 0 0 0-.75-.75h-4.5a.75.75 0 0 0 0 1.5h2.553l-9.056 8.194a.75.75 0 0 0-.053 1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </a>
    );
  }

  return (
    <span className={`${baseClasses} ${variantClasses}`} title={description}>
      {label}
    </span>
  );
}
