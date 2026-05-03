"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  detectLanguage,
  LANGUAGE_STORAGE_KEY,
  menuConfig,
  statCardConfig,
  translations,
} from "@/components/purchase/purchaseContent";

const LANGUAGE_CHANGE_EVENT = "expense-tracker-language-change";
const MENU_LABEL_INDEX_BY_KEY = {
  dashboard: 0,
  purchase: 1,
  salesPos: 2,
  salesList: 3,
  productList: 4,
  stock: 5,
  due: 6,
  warranty: 7,
  customers: 8,
  sellers: 9,
};

export default function usePurchaseLanguage() {
  const initialLanguage = detectLanguage();
  const [language, setLanguage] = useState(initialLanguage);
  const languageRef = useRef(initialLanguage);
  const updateLanguage = useCallback((nextLanguage) => {
    const resolvedLanguage =
      typeof nextLanguage === "function" ? nextLanguage(languageRef.current) : nextLanguage;

    languageRef.current = resolvedLanguage;
    setLanguage(resolvedLanguage);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, resolvedLanguage);
      document.documentElement.lang = resolvedLanguage;
      window.setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent(LANGUAGE_CHANGE_EVENT, {
            detail: { language: resolvedLanguage },
          }),
        );
      }, 0);
    }
  }, []);

  const t = translations[language];
  const locale = language === "bn" ? "bn-BD" : "en-US";
  const menuItems = menuConfig.map((item, index) => ({
    ...item,
    label: t.menuItems[MENU_LABEL_INDEX_BY_KEY[item.key] ?? index],
  }));
  const statCards = statCardConfig.map((card, index) => ({
    ...card,
    title: t.statCards[index],
    formattedValue: new Intl.NumberFormat(locale).format(card.value),
  }));

  useEffect(() => {
    document.documentElement.lang = languageRef.current;
  }, []);

  useEffect(() => {
    function syncLanguage(event) {
      const nextLanguage = event?.detail?.language || detectLanguage();
      languageRef.current = nextLanguage;
      setLanguage(nextLanguage);
      document.documentElement.lang = nextLanguage;
    }

    function handleStorage(event) {
      if (event.key && event.key !== LANGUAGE_STORAGE_KEY) {
        return;
      }

      syncLanguage();
    }

    window.addEventListener(LANGUAGE_CHANGE_EVENT, syncLanguage);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(LANGUAGE_CHANGE_EVENT, syncLanguage);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return {
    language,
    setLanguage: updateLanguage,
    t,
    menuItems,
    statCards,
  };
}
