import { Link } from "react-router";
import { useTranslation } from "react-i18next";

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <p
        className="text-8xl font-bold text-[var(--primary)] opacity-20"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        404
      </p>
      <h1
        className="mt-4 text-2xl font-bold text-[var(--foreground)]"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {t("notFound.title")}
      </h1>
      <p className="mt-2 text-[var(--muted-foreground)] max-w-xs">
        {t("notFound.description")}
      </p>
      <Link
        to="/"
        className="mt-6 rounded-md bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-[var(--primary-foreground)] hover:bg-[#15392a] transition-colors"
      >
        {t("notFound.backHome")}
      </Link>
    </div>
  );
}
