// js/components/UploadViewComponent.js

// NYTT: Importera de nya logikmodulerna
import { RuleFileLoader } from '../logic/rule_file_loader.js';
import { SavedAuditLoader } from '../logic/saved_audit_loader.js';

const UploadViewComponent_internal = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/upload_view_component.css';
    let app_container_ref;
    let router_ref;
    let global_message_element_ref;

    let rule_file_input_element;
    let saved_audit_input_element;
    let load_ongoing_audit_btn;
    let start_new_audit_btn;

    // Dessa kommer fortfarande att behövas för att skickas vidare till logikmodulerna
    let local_getState;
    let local_dispatch;
    let local_StoreActionTypes;

    // Beroenden som används direkt av denna komponent
    let Translation_t_local; // Omdöpt för att undvika konflikt med tFunction i logikmodulerna
    let Helpers_create_element_local;
    let Helpers_get_icon_svg_local;
    let Helpers_load_css_local;
    let NotificationComponent_show_global_message_local;
    let NotificationComponent_get_global_message_element_reference_local;
    let ValidationLogic_local; // Referens till hela ValidationLogic-objektet

    function get_t_func_local_scope() {
        if (Translation_t_local) return Translation_t_local;
        return (typeof window.Translation !== 'undefined' && typeof window.Translation.t === 'function')
            ? window.Translation.t
            : (key, replacements) => {
                let str = `**${key}**`;
                if (replacements) {
                    for (const rKey in replacements) {
                        str += ` (${rKey}: ${replacements[rKey]})`;
                    }
                }
                return str + " (UploadView t not found)";
            };
    }

    // NYTT: Modifierad funktion för att hantera val av regelfil
    function handle_rule_file_select(event) {
        const t = get_t_func_local_scope();
        const file = event.target.files[0];
        if (file) {
            RuleFileLoader.loadAndProcessRuleFile(
                file,
                ValidationLogic_local, // Skicka med ValidationLogic-objektet
                local_dispatch,
                local_StoreActionTypes.INITIALIZE_NEW_AUDIT,
                t, // Skicka med översättningsfunktionen
                NotificationComponent_show_global_message_local, // Skicka med notisfunktionen
                () => { // successCallback
                    // NotificationComponent_show_global_message_local(t('rule_file_loaded_successfully'), 'success'); // Detta sköts nu inuti RuleFileLoader
                    router_ref('metadata');
                },
                (errorMessage) => { // errorCallback
                    NotificationComponent_show_global_message_local(errorMessage, 'error');
                    if (rule_file_input_element) rule_file_input_element.value = '';
                }
            );
        }
        // Nollställ alltid input för att tillåta val av samma fil igen
        if (rule_file_input_element) rule_file_input_element.value = '';
    }

    // NYTT: Modifierad funktion för att hantera val av sparad granskningsfil
    function handle_saved_audit_file_select(event) {
        const t = get_t_func_local_scope();
        const file = event.target.files[0];
        if (file) {
            SavedAuditLoader.loadAndProcessSavedAudit(
                file,
                ValidationLogic_local, // Skicka med ValidationLogic-objektet
                local_dispatch,
                local_StoreActionTypes.LOAD_AUDIT_FROM_FILE,
                local_getState, // Skicka med getState för att hämta app-version
                t, // Skicka med översättningsfunktionen
                NotificationComponent_show_global_message_local, // Skicka med notisfunktionen
                () => { // successCallback
                    // NotificationComponent_show_global_message_local(t('saved_audit_loaded_successfully'), 'success'); // Detta sköts nu inuti SavedAuditLoader
                    router_ref('audit_overview');
                },
                (errorMessage) => { // errorCallback
                    NotificationComponent_show_global_message_local(errorMessage, 'error');
                    if (saved_audit_input_element) saved_audit_input_element.value = '';
                }
            );
        }
        // Nollställ alltid input
        if (saved_audit_input_element) saved_audit_input_element.value = '';
    }

    async function init(_app_container, _router, _params, _getState, _dispatch, _StoreActionTypes) {
        app_container_ref = _app_container;
        router_ref = _router;

        local_getState = _getState;
        local_dispatch = _dispatch;
        local_StoreActionTypes = _StoreActionTypes;

        // Tilldela lokala referenser till globala funktioner/moduler
        if (window.Translation && typeof window.Translation.t === 'function') Translation_t_local = window.Translation.t;
        if (window.Helpers) {
            Helpers_create_element_local = window.Helpers.create_element;
            Helpers_get_icon_svg_local = window.Helpers.get_icon_svg;
            Helpers_load_css_local = window.Helpers.load_css;
        }
        if (window.NotificationComponent) {
            NotificationComponent_show_global_message_local = window.NotificationComponent.show_global_message;
            NotificationComponent_get_global_message_element_reference_local = window.NotificationComponent.get_global_message_element_reference;
        }
        if (window.ValidationLogic) ValidationLogic_local = window.ValidationLogic;


        if (!local_StoreActionTypes) {
            console.error("[UploadViewComponent] CRITICAL: StoreActionTypes was not passed to init or is undefined.");
            local_StoreActionTypes = {
                INITIALIZE_NEW_AUDIT: 'INITIALIZE_NEW_AUDIT_ERROR_FALLBACK',
                LOAD_AUDIT_FROM_FILE: 'LOAD_AUDIT_FROM_FILE_ERROR_FALLBACK'
            };
        }
        if(!ValidationLogic_local) console.error("[UploadViewComponent] CRITICAL: ValidationLogic_local is not set!");


        if (NotificationComponent_get_global_message_element_reference_local) {
            global_message_element_ref = NotificationComponent_get_global_message_element_reference_local();
        }

        if (Helpers_load_css_local) {
            try {
                const link_tag = document.querySelector(`link[href="${CSS_PATH}"]`);
                if (!link_tag) {
                    await Helpers_load_css_local(CSS_PATH);
                }
            } catch (error) {
                console.warn(`Failed to load CSS for UploadViewComponent: ${CSS_PATH}`, error);
            }
        }
    }

    function render() {
        if (!app_container_ref || !Helpers_create_element_local) {
            console.error("[UploadViewComponent] app_container_ref or Helpers_create_element_local is MISSING in render!");
            if (app_container_ref) app_container_ref.innerHTML = "<p>Error rendering Upload View.</p>";
            return;
        }
        app_container_ref.innerHTML = '';
        const t = get_t_func_local_scope();

        if (global_message_element_ref) {
            app_container_ref.appendChild(global_message_element_ref);
        }

        const title = Helpers_create_element_local('h1', { text_content: t('app_title') });
        const intro_text = Helpers_create_element_local('p', { text_content: t('upload_view_intro') });

        load_ongoing_audit_btn = Helpers_create_element_local('button', {
            id: 'load-ongoing-audit-btn',
            class_name: 'button button-secondary',
            html_content: `<span>${t('upload_ongoing_audit')}</span>` + (Helpers_get_icon_svg_local ? Helpers_get_icon_svg_local('upload_file', ['currentColor'], 18) : '')
        });

        start_new_audit_btn = Helpers_create_element_local('button', {
            id: 'start-new-audit-btn',
            class_name: 'button button-primary',
            html_content: `<span>${t('start_new_audit')}</span>` + (Helpers_get_icon_svg_local ? Helpers_get_icon_svg_local('upload_file', ['currentColor'], 18) : '')
        });

        const button_group = Helpers_create_element_local('div', { class_name: 'button-group' });
        button_group.appendChild(load_ongoing_audit_btn);
        button_group.appendChild(start_new_audit_btn);

        rule_file_input_element = Helpers_create_element_local('input', {
            id: 'rule-file-input',
            attributes: {type: 'file', accept: '.json', style: 'display: none;', 'aria-hidden': 'true'}
        });

        saved_audit_input_element = Helpers_create_element_local('input', {
            id: 'saved-audit-input',
            attributes: {type: 'file', accept: '.json', style: 'display: none;', 'aria-hidden': 'true'}
        });

        app_container_ref.appendChild(title);
        app_container_ref.appendChild(intro_text);
        app_container_ref.appendChild(button_group);
        app_container_ref.appendChild(rule_file_input_element);
        app_container_ref.appendChild(saved_audit_input_element);

        start_new_audit_btn.addEventListener('click', () => { if(rule_file_input_element) rule_file_input_element.click(); });
        if(rule_file_input_element) rule_file_input_element.addEventListener('change', handle_rule_file_select);

        load_ongoing_audit_btn.addEventListener('click', () => { if(saved_audit_input_element) saved_audit_input_element.click(); });
        if(saved_audit_input_element) saved_audit_input_element.addEventListener('change', handle_saved_audit_file_select);
    }

    function destroy() {
        if (rule_file_input_element) rule_file_input_element.removeEventListener('change', handle_rule_file_select);
        if (saved_audit_input_element) saved_audit_input_element.removeEventListener('change', handle_saved_audit_file_select);
        
        // Nollställ referenser till DOM-element och callbacks om de inte behövs längre
        rule_file_input_element = null;
        saved_audit_input_element = null;
        load_ongoing_audit_btn = null;
        start_new_audit_btn = null;
        app_container_ref = null;
        router_ref = null;
        global_message_element_ref = null;
        local_getState = null;
        local_dispatch = null;
        local_StoreActionTypes = null;
        Translation_t_local = null;
        Helpers_create_element_local = null;
        Helpers_get_icon_svg_local = null;
        Helpers_load_css_local = null;
        NotificationComponent_show_global_message_local = null;
        NotificationComponent_get_global_message_element_reference_local = null;
        ValidationLogic_local = null;
    }

    return {
        init,
        render,
        destroy
    };
})();

export const UploadViewComponent = UploadViewComponent_internal;