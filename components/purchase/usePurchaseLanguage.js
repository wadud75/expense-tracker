"use client";

import { useEffect, useState } from "react";
import {
  detectLanguage,
  LANGUAGE_STORAGE_KEY,
  menuConfig,
  statCardConfig,
  translations,
} from "@/components/purchase/purchaseContent";

export default function usePurchaseLanguage() {
  const [language, setLanguage] = useState("en");

  const t = translations[language];
  const locale = language === "bn" ? "bn-BD" : "en-US";
  const menuItems = menuConfig.map((item, index) => ({
    ...item,
    label: t.menuItems[index],
  }));
  const statCards = statCardConfig.map((card, index) => ({
    ...card,
    title: t.statCards[index],
    formattedValue: new Intl.NumberFormat(locale).format(card.value),
  }));

  useEffect(() => {
    setLanguage(detectLanguage());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  return {
    language,
    setLanguage,
    t,
    menuItems,
    statCards,
  };
}
