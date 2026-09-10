import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Languages } from "lucide-react";
import { languageOptions, useLocale, type Language } from "./index";

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLocale();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    menu.current
      ?.querySelector<HTMLButtonElement>('[aria-checked="true"]')
      ?.focus();
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);
  function choose(value: Language) {
    setLanguage(value);
    setOpen(false);
    trigger.current?.focus();
  }
  return (
    <div
      className="language-switcher"
      ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <button
        type="button"
        className="language-trigger"
        ref={trigger}
        aria-label={t("language")}
        title={t("language")}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="language-menu"
        onClick={() => setOpen(!open)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <Languages size={16} />
        <span className="mono">
          {language === "zh" ? "中文" : language === "en" ? "EN" : "日本語"}
        </span>
        <ChevronDown size={12} />
      </button>
      {open && (
        <div
          className="language-menu"
          id="language-menu"
          role="menu"
          aria-label={t("language")}
          ref={menu}
          onKeyDown={(event) => {
            const buttons = [
              ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
                '[role="menuitemradio"]',
              ),
            ];
            const current = buttons.indexOf(
              document.activeElement as HTMLButtonElement,
            );
            const last = buttons.length - 1;
            if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
              event.preventDefault();
              const next =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? last
                    : (current + (event.key === "ArrowDown" ? 1 : last)) %
                      buttons.length;
              buttons[next]?.focus();
            }
          }}
        >
          {languageOptions.map((option) => (
            <button
              type="button"
              role="menuitemradio"
              aria-checked={language === option.value}
              key={option.value}
              lang={option.tag}
              tabIndex={language === option.value ? 0 : -1}
              onClick={() => choose(option.value)}
            >
              <span>{option.label}</span>
              <Check
                size={14}
                className={language === option.value ? "" : "unselected-check"}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
