/**
 * Runs inline in <head> BEFORE the first paint, so the page never flashes the wrong theme.
 * Stored value: "light" | "dark" | "system" (default "system").
 */
export const THEME_STORAGE_KEY = "jobsync-theme";

export const themeInitScript = `(function(){try{var k='${THEME_STORAGE_KEY}';var m=localStorage.getItem(k);if(m!=='light'&&m!=='dark'&&m!=='system')m='system';var d=m==='dark'||(m==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.setAttribute('data-theme',d?'dark':'light');r.setAttribute('data-bs-theme',d?'dark':'light');r.setAttribute('data-theme-mode',m);}catch(e){}})();`;
