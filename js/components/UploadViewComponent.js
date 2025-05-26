// js/components/UploadViewComponent.js

import { RuleFileLoader } from '../logic/rule_file_loader.js';
import { SavedAuditLoader } from '../logic/saved_audit_loader.js';

// NYTT: Importera specifika hjälpfunktioner
import { create_element, get_icon_svg, load_css } from '../../utils/helpers.js'; // Justerad sökväg

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

    let local_getState;
    let local_dispatch;
    let local_StoreActionTypes;

    // Beroenden som används direkt av denna komponent (importeras eller hämtas från window)
    let Translation_t_local;
    // Helpers_create_element_local, Helpers_get_icon_svg_local, Helpers_load_css_local tas bort, använder importerade
    let NotificationComponent_show_global_message_local;
    let NotificationComponent_get_global_message_element_reference_local;
    let ValidationLogic_local;

    function get_t_func_local_scope() {
        if (Translation_t_local) return Translation_t_local;
        // Försök hämta från window.Translation om det finns (för bakåtkompatibilitet/övergång)
        if (window.Translation && typeof window.Translation.t === 'function') {
            Translation_t_local = window.Translation.t;
            return Translation_t_local;
        }
        // Fallback om inget annat fungerar
        return (key, replacements) => {
            let str = `**${key}**`;
            if (replacements) {
                for (const rKey in replacements) {
                    str += ` (${rKey}: ${replacements[rKey]})`;
                }
            }
            return str + " (UploadView t not found)";
        };
    }

    function handle_rule_file_select(event) {
        const t = get_t_func_local_scope();
        const file = event.target.files[0];
        if (file) {
            RuleFileLoader.loadAndProcessRuleFile(
                file,
                ValidationLogic_local,
                local_dispatch,
                local_StoreActionTypes.INITIALIZE_NEW_AUDIT,
                t,
                NotificationComponent_show_global_message_local,
                () => {
                    router_ref('metadata');
                },
                (errorMessage) => {
                    if (NotificationComponent_show_global_message_local) { // Säkerhetskoll
                        NotificationComponent_show_global_message_local(errorMessage, 'error');
                    }
                    if (rule_file_input_element) rule_file_input_element.value = '';
                }
            );
        }
        if (rule_file_input_element) rule_file_input_element.value = '';
    }

    function handle_saved_audit_file_select(event) {
        const t = get_t_func_local_scope();
        const file = event.target.files[0];
        if (file) {
            SavedAuditLoader.loadAndProcessSavedAudit(
                file,
                ValidationLogic_local,
                local_dispatch,
                local_StoreActionTypes.LOAD_AUDIT_FROM_FILE,
                local_getState,
                t,
                NotificationComponent_show_global_message_local,
                () => {
                    router_ref('audit_overview');
                },
                (errorMessage) => {
                    if (NotificationComponent_show_global_message_local) { // Säkerhetskoll
                        NotificationComponent_show_global_message_local(errorMessage, 'error');
                    }
                    if (saved_audit_input_element) saved_audit_input_element.value = '';
                }
            );
        }
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
        
        // Helpers funktioner importeras nu direkt, så ingen window.Helpers behövs här för dem.

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

        // Använd importerad load_css
        if (typeof load_css === 'function') {
            try {
                const link_tag = document.querySelector(`link[href="${CSS_PATH}"]`);
                if (!link_tag) {
                    await load_css(CSS_PATH);
                }
            } catch (error) {
                console.warn(`Failed to load CSS for UploadViewComponent: ${CSS_PATH}`, error);
            }
        } else {
            console.warn("[UploadViewComponent] load_css (importerad) not available.");
        }
    }

    function render() {
        // Använd importerade create_element och get_icon_svg
        if (!app_container_ref || typeof create_element !== 'function') {
            console.error("[UploadViewComponent] app_container_ref or create_element (importerad) is MISSING in render!");
            if (app_container_ref) app_container_ref.innerHTML = "<p>Error rendering Upload View.</p>";
            return;
        }
        app_container_ref.innerHTML = '';
        const t = get_t_func_local_scope();

        if (global_message_element_ref) {
            app_container_ref.appendChild(global_message_element_ref);
        }

        const title = create_element('h1', { text_content: t('app_title') });
        const intro_text = create_element('p', { text_content: t('upload_view_intro') });

        const load_icon_svg = typeof get_icon_svg === 'function' ? get_icon_svg('upload_file', ['currentColor'], 18) : '';
        load_ongoing_audit_btn = create_element('button', {
            id: 'load-ongoing-audit-btn',
            class_name: 'button button-secondary',
            html_content: `<span>${t('upload_ongoing_audit')}</span>` + load_icon_svg
        });

        start_new_audit_btn = create_element('button', {
            id: 'start-new-audit-btn',
            class_name: 'button button-primary',
            html_content: `<span>${t('start_new_audit')}</span>` + load_icon_svg
        });

        const button_group = create_element('div', { class_name: 'button-group' });
        button_group.appendChild(load_ongoing_audit_btn);
        button_group.appendChild(start_new_audit_btn);

        rule_file_input_element = create_element('input', {
            id: 'rule-file-input',
            attributes: {type: 'file', accept: '.json', style: 'display: none;', 'aria-hidden': 'true'}
        });

        saved_audit_input_element = create_element('input', {
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