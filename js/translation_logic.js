// js/translation_logic.js
// Konverterad till en ES6-modul

let current_language_tag = 'sv-SE'; // Behåll som modul-lokal variabel
let loaded_translations = {};      // Behåll som modul-lokal variabel
const supported_languages = {
    'sv-SE': 'Svenska (Sverige)',
    'en-GB': 'English (UK)'
};
const DEFAULT_LANGUAGE_TAG = 'sv-SE';
let initial_load_promise_resolver; // För att hantera den initiala laddningen

// Skapa ett promise som kan lösas externt när initial laddning är klar
const initial_load_completed_promise = new Promise(resolve => {
    initial_load_promise_resolver = resolve;
});

async function load_language_file(lang_tag_to_load) {
    let effective_lang_tag = lang_tag_to_load;
    let file_to_fetch = effective_lang_tag;

    if (!supported_languages[effective_lang_tag]) {
        // console.warn(`[TranslationMod] Language tag "${effective_lang_tag}" is not directly in supported_languages list.`);
        const base_lang = effective_lang_tag.split('-')[0];
        const matching_supported_base = Object.keys(supported_languages).find(
            key => key.startsWith(base_lang + '-') || key === base_lang
        );
        if (matching_supported_base) {
            // console.log(`[TranslationMod] Falling back from "${effective_lang_tag}" to supported regional/base variant "${matching_supported_base}".`);
            file_to_fetch = matching_supported_base;
            effective_lang_tag = matching_supported_base;
        } else {
            // console.warn(`[TranslationMod] No regional/base variant for "${effective_lang_tag}" (base: "${base_lang}") found. Falling back to default: ${DEFAULT_LANGUAGE_TAG}.`);
            file_to_fetch = DEFAULT_LANGUAGE_TAG;
            effective_lang_tag = DEFAULT_LANGUAGE_TAG;
        }
    }

    // Undvik onödig fetch om språket redan är laddat och aktivt
    if (current_language_tag === effective_lang_tag && Object.keys(loaded_translations).length > 0 && loaded_translations['app_title']) {
        // console.log(`[TranslationMod] Language "${effective_lang_tag}" is already loaded and current (skipped fetch).`);
        return loaded_translations;
    }

    try {
        const response = await fetch(`js/i18n/${file_to_fetch}.json?v=${new Date().getTime()}`); // Cache-busting
        if (!response.ok) {
            const failed_url = new URL(`js/i18n/${file_to_fetch}.json`, window.location.href).href;
            throw new Error(`Failed to load language file ${failed_url}: ${response.status} ${response.statusText}`);
        }
        const new_translations = await response.json();
        // console.log(`[TranslationMod] Fetched translations for "${file_to_fetch}":`, JSON.parse(JSON.stringify(new_translations)));
        loaded_translations = new_translations;
        current_language_tag = effective_lang_tag;
        // console.log(`[TranslationMod] Global 'loaded_translations' updated for "${current_language_tag}". app_title is now: "${loaded_translations['app_title']}"`);
        document.documentElement.lang = current_language_tag; // Sätt lang-attribut på HTML-elementet
        return loaded_translations;
    } catch (error) {
        console.error(`[TranslationMod] Error loading or parsing language file for "${file_to_fetch}":`, error);
        if (effective_lang_tag !== DEFAULT_LANGUAGE_TAG) {
            // console.warn(`[TranslationMod] Falling back to default language '${DEFAULT_LANGUAGE_TAG}' due to error.`);
            return await load_language_file(DEFAULT_LANGUAGE_TAG); // Försök ladda default
        } else if (Object.keys(loaded_translations).length === 0) { // Om även default misslyckas
            console.error(`[TranslationMod] CRITICAL: Could not load default language file '${DEFAULT_LANGUAGE_TAG}'.`);
            // Skapa en minimal fallback så att appen inte kraschar helt på t()
            loaded_translations = { app_title: "Audit Tool - Language File Error" };
            document.documentElement.lang = 'en'; // Sätt en vettig fallback-lang
        }
        return loaded_translations; // Returnera vad som nu finns (kan vara tomt eller fallback)
    }
}

export async function set_language(lang_tag) {
    // console.log(`[TranslationMod] set_language called with: ${lang_tag}. Current: ${current_language_tag}`);
    const previously_loaded_app_title = loaded_translations['app_title'];

    await load_language_file(lang_tag);

    // console.log(`[TranslationMod] Dispatching languageChanged event for ${current_language_tag} (after load). app_title: "${loaded_translations['app_title']}"`);
    document.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang_tag: current_language_tag } }));
}

export function t(key, replacements = {}) {
    // Ingen ändring i interna logiken för t()
    const current_translations_for_t = loaded_translations;
    let translation = current_translations_for_t[key];

    if (translation === undefined) {
        // console.warn(`[TranslationMod] t(): Key "${key}" not found for lang "${current_language_tag}". Using key as fallback.`);
        // Försök med en defaultValue från replacements om det finns, annars nyckeln
        return replacements.defaultValue !== undefined ? replacements.defaultValue : `**${key}**`;
    }

    translation = translation.replace(/{([^{}]+)}/g, (match, placeholder_key) => {
        return replacements[placeholder_key] !== undefined ? replacements[placeholder_key] : match;
    });
    return translation;
}

export function get_current_language_code() {
    return current_language_tag;
}

export function get_supported_languages() {
    // Returnera en kopia för att förhindra extern modifiering
    return { ...supported_languages };
}

export function ensure_initial_load() {
    return initial_load_completed_promise;
}

// ----- Initialisering av modulen -----
// Bestäm initialt språk och ladda det
let browser_lang_tag_resolved = (navigator.language || DEFAULT_LANGUAGE_TAG);
const base_browser_lang_check = browser_lang_tag_resolved.split('-')[0];
let found_supported_browser_lang = false;

// Försök matcha exakt eller regional variant
for (const key_lang in supported_languages) {
    if (key_lang === browser_lang_tag_resolved || key_lang.startsWith(base_browser_lang_check + '-')) {
        browser_lang_tag_resolved = key_lang;
        found_supported_browser_lang = true;
        break;
    }
}
if (!found_supported_browser_lang) {
    // console.log(`[TranslationMod] Browser language "${navigator.language}" (base: "${base_browser_lang_check}") not directly supported. Trying broader match.`);
    // Försök matcha bara bas-språket om ingen regional variant hittades
    const base_match = Object.keys(supported_languages).find(key => key.startsWith(base_browser_lang_check));
    if (base_match) {
        // console.log(`[TranslationMod] Found broader match for base "${base_browser_lang_check}": "${base_match}".`);
        browser_lang_tag_resolved = base_match;
        found_supported_browser_lang = true;
    }
}

if (!found_supported_browser_lang) {
    // console.log(`[TranslationMod] Still no match. Falling back to default: ${DEFAULT_LANGUAGE_TAG}`);
    browser_lang_tag_resolved = DEFAULT_LANGUAGE_TAG;
}

// console.log(`[TranslationMod] Initial language to load resolved to: "${browser_lang_tag_resolved}"`);

// Ladda den initiala språkfilen och lös promisen när det är klart
load_language_file(browser_lang_tag_resolved).then(() => {
    if (initial_load_promise_resolver) {
        initial_load_promise_resolver();
        // console.log("[TranslationMod] Initial language load completed and promise resolved.");
    }
}).catch(error => {
    console.error("[TranslationMod] CRITICAL error during initial language load:", error);
    if (initial_load_promise_resolver) {
        initial_load_promise_resolver(); // Lös ändå så att appen inte hänger sig, men med felmeddelanden
    }
});

console.log("[translation_logic.js] ES6 Module loaded and initialized.");