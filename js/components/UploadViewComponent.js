// js/components/UploadViewComponent.js

import { RuleFileLoader } from '../logic/rule_file_loader.js';
import { SavedAuditLoader } from '../logic/saved_audit_loader.js';

// KORRIGERAD SÖKVÄG till helpers.js
import { create_element, get_icon_svg, load_css } from '../utils/helpers.js';

import { t } from '../translation_logic.js';
import { validate_rule_file_json, validate_saved_audit_file } from '../validation_logic.js';
import { show_global_message, get_global_message_element_reference, clear_global_message } from './NotificationComponent.js';


const UploadViewComponent_internal = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/upload_view_component.css';
    let app_container_ref;
    let router_ref;
    let global_message_element_ref_local;

    let rule_file_input_element;
    let saved_audit_input_element;
    let load_ongoing_audit_btn;
    let start_new_audit_btn;

    let local_getState;
    let local_dispatch;
    let local_StoreActionTypes;

    function handle_rule_file_select(event) {
        const file = event.target.files[0];
        if (file) {
            RuleFileLoader.loadAndProcessRuleFile(
                file,
                { validate_rule_file_json: validate_rule_file_json },
                local_dispatch,
                local_StoreActionTypes.INITIALIZE_NEW_AUDIT,
                t,
                show_global_message,
                () => { router_ref('metadata'); },
                (errorMessage) => {
                    if (typeof show_global_message === 'function') {
                        show_global_message(errorMessage, 'error');
                    }
                    if (rule_file_input_element) rule_file_input_element.value = '';
                }
            );
        }
        if (rule_file_input_element) rule_file_input_element.value = '';
    }

    function handle_saved_audit_file_select(event) {
        const file = event.target.files[0];
        if (file) {
            SavedAuditLoader.loadAndProcessSavedAudit(
                file,
                { validate_saved_audit_file: validate_saved_audit_file },
                local_dispatch,
                local_StoreActionTypes.LOAD_AUDIT_FROM_FILE,
                local_getState,
                t,
                show_global_message,
                () => { router_ref('audit_overview'); },
                (errorMessage) => {
                    if (typeof show_global_message === 'function') {
                        show_global_message(errorMessage, 'error');
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

        if (!local_StoreActionTypes) { /* ... */ }
        if (typeof validate_rule_file_json !== 'function' || typeof validate_saved_audit_file !== 'function') { /* ... */ }

        if (typeof get_global_message_element_reference === 'function') {
            global_message_element_ref_local = get_global_message_element_reference();
        } else {
            console.warn("[UploadViewComponent] get_global_message_element_reference (importerad) not available.");
        }

        if (typeof load_css === 'function') {
            try {
                const link_tag = document.querySelector(`link[href="${CSS_PATH}"]`);
                if (!link_tag) await load_css(CSS_PATH);
            } catch (error) { console.warn(`Failed to load CSS for UploadViewComponent: ${CSS_PATH}`, error); }
        } else { console.warn("[UploadViewComponent] load_css (importerad) not available."); }
    }

    function render() {
        if (!app_container_ref || typeof create_element !== 'function' || typeof t !== 'function') {
            console.error("[UploadViewComponent] app_container_ref, create_element, or t (importerad) is MISSING in render!");
            if (app_container_ref) app_container_ref.innerHTML = `<p>${t?t('error_render_component',{componentName:'UploadView'}):'Error rendering Upload View.'}</p>`;
            return;
        }
        app_container_ref.innerHTML = '';

        if (global_message_element_ref_local) {
            app_container_ref.appendChild(global_message_element_ref_local);
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
        rule_file_input_element = null; saved_audit_input_element = null; load_ongoing_audit_btn = null; start_new_audit_btn = null;
        app_container_ref = null; router_ref = null; global_message_element_ref_local = null;
        local_getState = null; local_dispatch = null; local_StoreActionTypes = null;
    }

    return {
        init,
        render,
        destroy
    };
})();

export const UploadViewComponent = UploadViewComponent_internal;