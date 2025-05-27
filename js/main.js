// js/main.js

// Importer för vyer
import { UploadViewComponent } from './components/UploadViewComponent.js';
import { MetadataViewComponent } from './components/MetadataViewComponent.js';
import { SampleManagementViewComponent } from './components/SampleManagementViewComponent.js';
import { AuditOverviewComponent } from './components/AuditOverviewComponent.js';
import { RequirementListComponent } from './components/RequirementListComponent.js';
import { RequirementAuditComponent } from './components/RequirementAuditComponent.js';

// Importera från storen
import { getState, dispatch, subscribe, StoreActionTypes } from './state.js';

// Importera funktioner från translation_logic.js
import {
    t,
    set_language,
    get_current_language_code,
    get_supported_languages,
    ensure_initial_load
} from './translation_logic.js';

// Importera nödvändiga hjälpfunktioner
import { create_element, get_icon_svg, escape_html } from './utils/helpers.js';

// Importera funktioner från NotificationComponent.js
import {
    init_notification_module,
    show_global_message,
    clear_global_message
    // get_global_message_element_reference importeras inte direkt här,
    // komponenter som behöver den kan importera den själv eller så kan vi skicka den
} from './components/NotificationComponent.js';


(function () { // Behåll IIFE för main.js för att undvika att dess interna variabler blir globala
    'use-strict';

    const app_container = document.getElementById('app-container');
    if (!app_container) {
        const error_msg_key = 'critical_error_app_container_not_found';
        const fallback_error = "Application Error: App container not found. Check HTML and script load order.";
        const message = (typeof t === 'function' && t(error_msg_key, {defaultValue: null}) !== `**${error_msg_key}**`)
            ? t(error_msg_key, {defaultValue: fallback_error})
            : fallback_error;
        document.body.innerHTML = `<p style='color:red; font-weight:bold;'>${message}</p>`;
        return;
    }

    let current_view_component_instance = null;
    let current_view_name_rendered = null;
    let current_view_params_rendered_json = "{}";

    let theme_toggle_button_element = null;
    let language_selector_element = null;
    let language_label_element = null;
    let store_unsubscribe_function = null;

    function update_app_chrome_texts() {
        if (typeof get_icon_svg !== 'function' || typeof t !== 'function') {
             console.warn("[Main.js] update_app_chrome_texts: get_icon_svg or t is not available.");
             return;
        }
        document.title = t('app_title');
        if (theme_toggle_button_element && theme_toggle_button_element.themeFunctions &&
            typeof theme_toggle_button_element.themeFunctions.updateContent === 'function') {
            const current_theme = document.documentElement.getAttribute('data-theme') || 'light';
            theme_toggle_button_element.themeFunctions.updateContent(current_theme);
        }
        if (language_selector_element) {
            const supported_langs = get_supported_languages();
            Array.from(language_selector_element.options).forEach(option => {
                if (supported_langs[option.value]) {
                    option.textContent = supported_langs[option.value];
                }
            });
            language_selector_element.value = get_current_language_code();
            if(language_label_element) language_label_element.textContent = t('language_switcher_label');
        }
    }

    function init_ui_controls() {
        if (typeof create_element !== 'function' || typeof t !== 'function' || typeof get_supported_languages !== 'function' || typeof get_current_language_code !== 'function' || typeof set_language !== 'function') {
            console.error("[Main.js] init_ui_controls: Core dependencies not available!");
            return;
        }
        const controls_wrapper = create_element('div', { class_name: 'global-controls'});
        const language_selector_container = create_element('div', { class_name: 'language-selector-container' });
        language_label_element = create_element('label', { attributes: {for: 'language-selector'}, text_content: t('language_switcher_label'), class_name: 'visually-hidden'});
        language_selector_container.appendChild(language_label_element);
        language_selector_element = create_element('select', { id: 'language-selector', class_name: ['form-control', 'form-control-small']});
        const supported_langs = get_supported_languages();
        for (const lang_code in supported_langs) {
            const option = create_element('option', { value: lang_code, text_content: supported_langs[lang_code] });
            language_selector_element.appendChild(option);
        }
        language_selector_element.value = get_current_language_code();
        language_selector_element.addEventListener('change', async (event) => {
            if (typeof clear_global_message === 'function') {
                 clear_global_message();
            }
            const selected_lang_code = event.target.value;
            await set_language(selected_lang_code);
        });
        language_selector_container.appendChild(language_selector_element);
        controls_wrapper.appendChild(language_selector_container);
        theme_toggle_button_element = create_element('button', { id: 'theme-toggle', class_name: ['button', 'button-default'] });
        function set_theme_button_content(theme) {
            if (!theme_toggle_button_element || typeof get_icon_svg !== 'function' || typeof t !== 'function') return;
            let icon_svg_string; let button_label_text;
            let icon_color_val = getComputedStyle(document.documentElement).getPropertyValue('--button-default-text').trim();
            if (!icon_color_val || icon_color_val === "initial" || icon_color_val === "inherit" || icon_color_val === "") icon_color_val = (theme === 'dark') ? 'var(--text-color)' : 'var(--text-color)';
            if (theme === 'dark') { icon_svg_string = get_icon_svg('light_mode', [icon_color_val], 18); button_label_text = t('light_mode'); }
            else { icon_svg_string = get_icon_svg('dark_mode', [icon_color_val], 18); button_label_text = t('dark_mode'); }
            theme_toggle_button_element.innerHTML = `<span> ${button_label_text}</span>` + (icon_svg_string || '');
        }
        function set_theme(theme) { document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('theme_preference', theme); set_theme_button_content(theme); }
        theme_toggle_button_element.themeFunctions = { updateContent: set_theme_button_content };
        theme_toggle_button_element.addEventListener('click', () => { const ct = document.documentElement.getAttribute('data-theme')||'light'; set_theme(ct==='dark'?'light':'dark'); });
        controls_wrapper.appendChild(theme_toggle_button_element);
        const saved_theme_val = localStorage.getItem('theme_preference');
        const initial_theme_val = saved_theme_val || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', initial_theme_val);
        set_theme_button_content(initial_theme_val);
        const existing_controls = document.body.querySelector('.global-controls');
        if (existing_controls) existing_controls.remove();
        document.body.appendChild(controls_wrapper);
    }

    function navigate_and_set_hash(target_view_name, target_params = {}) {
        const target_hash_part = target_params && Object.keys(target_params).length > 0 ? `${target_view_name}?${new URLSearchParams(target_params).toString()}` : target_view_name;
        const new_hash = `#${target_hash_part}`;
        if (window.location.hash === new_hash && current_view_name_rendered === target_view_name) {
            render_view(target_view_name, target_params);
        } else {
            window.location.hash = new_hash;
        }
    }

    async function render_view(view_name_to_render, params_to_render = {}) {
        if (typeof escape_html !== 'function' || typeof t !== 'function' || typeof create_element !== 'function') {
            console.error("[Main.js] render_view: Core dependencies missing!");
            if(app_container) app_container.innerHTML = `<p>Critical system error during view render (dependencies missing).</p>`;
            return;
        }
        current_view_name_rendered = view_name_to_render; current_view_params_rendered_json = JSON.stringify(params_to_render);
        if (!app_container) { console.error("[Main.js] App container not found in render_view!"); return; }
        app_container.innerHTML = ''; if (current_view_component_instance && typeof current_view_component_instance.destroy === 'function') current_view_component_instance.destroy();
        current_view_component_instance = null; let ComponentClass;
        switch (view_name_to_render) {
            case 'upload': ComponentClass = UploadViewComponent; break; case 'metadata': ComponentClass = MetadataViewComponent; break;
            case 'sample_management': ComponentClass = SampleManagementViewComponent; break; case 'audit_overview': ComponentClass = AuditOverviewComponent; break;
            case 'requirement_list': ComponentClass = RequirementListComponent; break; case 'requirement_audit': ComponentClass = RequirementAuditComponent; break;
            default: app_container.innerHTML = `<p>${t("error_view_not_found", {viewName: escape_html(view_name_to_render)})}</p>`; return;
        }
        try {
            current_view_component_instance = ComponentClass;
            if (!current_view_component_instance || typeof current_view_component_instance.init !== 'function' || typeof current_view_component_instance.render !== 'function') {
                 console.error(`[Main.js] Component for view ${view_name_to_render} is invalid.`);
                 app_container.innerHTML = `<p>${t("error_component_load", {viewName: escape_html(view_name_to_render)})}</p>`; return;
            }
            await current_view_component_instance.init( app_container, navigate_and_set_hash, params_to_render, getState, dispatch, StoreActionTypes );
            // render anropas nu av store-subskriptionen om init ändrar state, eller av handle_hash_change
            // current_view_component_instance.render(); // Ta bort detta direkta anrop
        } catch (error) {
            console.error(`[Main.js] CATCH BLOCK: Error during view ${view_name_to_render} lifecycle:`, error);
            if(app_container) app_container.innerHTML = `<p>${t("error_loading_view", {viewName: escape_html(view_name_to_render), errorMessage: error.message})}</p>`;
            if (typeof show_global_message === 'function') {
                show_global_message(t("error_loading_view_details", {viewName: view_name_to_render}), 'error');
            }
        }
    }

    function handle_hash_change() {
        const hash = window.location.hash.substring(1); const [view_name_from_hash, ...param_pairs] = hash.split('?');
        const params = {}; if (param_pairs.length > 0) { const qs = param_pairs.join('?'); const up = new URLSearchParams(qs); for(const [k,v] of up){params[k]=v;}}
        let target_view = 'upload'; let target_params = params; const cgs = getState();
        if (view_name_from_hash) target_view = view_name_from_hash;
        else if (cgs && cgs.ruleFileContent) { target_view = 'audit_overview'; target_params = {}; }
        const npj = JSON.stringify(target_params);
        // Rendera alltid om vyn vid hash-ändring, även om det är samma vy, ifall parametrar eller state ändrats.
        // Den gamla if-satsen (current_view_name_rendered !== target_view || ...) är för restriktiv.
        render_view(target_view, target_params);
    }
    function on_language_changed_event() {
        update_app_chrome_texts();
        if (current_view_name_rendered && current_view_component_instance && typeof current_view_component_instance.render === 'function') {
            // console.log(`[Main.js/on_language_changed_event] Re-rendering current view: ${current_view_name_rendered} due to language change.`);
            current_view_component_instance.render();
        }
    }
    function on_store_change_event(new_state) {
        if (current_view_component_instance && typeof current_view_component_instance.render === 'function') {
            try { current_view_component_instance.render(); } catch (e) {
                console.error(`[Main.js] Error re-rendering ${current_view_name_rendered} on state change:`, e);
                if (typeof show_global_message === 'function' && typeof t === 'function') { show_global_message(t('critical_error_system_render_view_failed'), 'error'); }
            }
        }
    }

    async function init_app() {
        if (typeof ensure_initial_load === 'function') { await ensure_initial_load(); }
        else { console.error("[Main.js] ensure_initial_load from translation_logic.js not available!"); if(app_container)app_container.innerHTML = `<p>Language system error.</p>`; return; }
        document.title = t('app_title');
        if (typeof init_notification_module === 'function') { await init_notification_module(); }
        else { console.error("[Main.js] init_notification_module (importerad) is not available."); }
        init_ui_controls();
        if (store_unsubscribe_function) store_unsubscribe_function();
        store_unsubscribe_function = subscribe(on_store_change_event);
        document.addEventListener('languageChanged', on_language_changed_event);
        window.addEventListener('hashchange', handle_hash_change);
        if (typeof clear_global_message === 'function') { clear_global_message(); }
        handle_hash_change(); // Initial view rendering based on current hash or default
        update_app_chrome_texts();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { init_app().catch(err => console.error("Error init_app DOMContentLoaded:", err)); });
    } else {
        init_app().catch(err => console.error("Error init_app direct:", err));
    }

})();