// js/components/MetadataViewComponent.js

// KORRIGERAD SÖKVÄG till helpers.js
import { create_element, get_icon_svg, load_css, escape_html, add_protocol_if_missing } from '../utils/helpers.js';
import { t } from '../translation_logic.js'; // Sökväg från components/ till js/ är ../
import { show_global_message, clear_global_message, get_global_message_element_reference } from './NotificationComponent.js'; // Ligger i samma katalog


const MetadataViewComponent_internal = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/metadata_view_component.css'; // Denna är relativ till index.html, så den är ok
    let app_container_ref;
    let navigate_and_set_hash_ref;

    let local_getState;
    let local_dispatch;
    let local_StoreActionTypes;

    let global_message_element_ref_local;

    let case_number_input, actor_name_input, actor_link_input, auditor_name_input, internal_comment_input;
    let form_element_ref;


    async function init(_app_container, _navigate_cb, _params, _getState, _dispatch, _StoreActionTypes) {
        app_container_ref = _app_container;
        navigate_and_set_hash_ref = _navigate_cb;
        local_getState = _getState;
        local_dispatch = _dispatch;
        local_StoreActionTypes = _StoreActionTypes;

        if (!local_StoreActionTypes) { /* ... */ }

        if (typeof get_global_message_element_reference === 'function') {
            global_message_element_ref_local = get_global_message_element_reference();
        } else {
            console.warn("[MetadataViewComponent] get_global_message_element_reference (importerad) not available.");
        }

        // load_css använder en absolut sökväg från roten av webbplatsen, så den påverkas inte av modulens egen plats
        if (typeof load_css === 'function') {
            try {
                const link_tag = document.querySelector(`link[href="${CSS_PATH}"]`);
                if(!link_tag) await load_css(CSS_PATH); // CSS_PATH är 'css/components/...'
            } catch (error) { console.warn("Failed to load CSS for MetadataViewComponent:", error); }
        } else { console.warn("[MetadataViewComponent] load_css (importerad) not available."); }
    }

    function save_metadata_via_dispatch() {
        const current_global_state = local_getState();
        if (!current_global_state) {
            if(typeof show_global_message === 'function' && typeof t === 'function') show_global_message(t('error_no_active_audit_to_save_metadata'), "error");
            return false;
        }
        if (current_global_state.auditStatus !== 'not_started') { return true; }
        if (!case_number_input || !actor_name_input || !actor_link_input || !auditor_name_input || !internal_comment_input) { return false; }

        let actor_link_value = actor_link_input.value.trim();
        if (actor_link_value && typeof add_protocol_if_missing === 'function') { // Använd importerad
            actor_link_value = add_protocol_if_missing(actor_link_value);
        }
        const metadata_payload = { 
            caseNumber: case_number_input.value.trim(), 
            actorName: actor_name_input.value.trim(), 
            actorLink: actor_link_value, 
            auditorName: auditor_name_input.value.trim(), 
            internalComment: internal_comment_input.value.trim() 
        };
        local_dispatch({ type: local_StoreActionTypes.UPDATE_METADATA, payload: metadata_payload });
        return true;
    }

    function handle_submit(event) {
        event.preventDefault();
        if (save_metadata_via_dispatch()) {
            if(typeof clear_global_message === 'function') clear_global_message();
            if (navigate_and_set_hash_ref) navigate_and_set_hash_ref('sample_management');
        }
    }

    function create_form_field_internal(id, label_key, type = 'text', current_value = '', is_readonly = false) {
        const form_group = create_element('div', { class_name: 'form-group' });
        const label_element = create_element('label', { attributes: { for: id }, text_content: t(label_key) }); // 'label' bytt till 'label_element'
        let input_element_field;
        const attributes = { type: type };
        if (is_readonly) attributes.readonly = true;
        
        input_element_field = create_element(type === 'textarea' ? 'textarea' : 'input', {
            id: id, class_name: 'form-control',
            attributes: type === 'textarea' ? { rows: '3', ...attributes } : attributes
        });
        input_element_field.value = current_value;
        if (is_readonly) input_element_field.classList.add('readonly-textarea');
        
        form_group.appendChild(label_element);
        form_group.appendChild(input_element_field);
        return { form_group, input_element: input_element_field };
    }

    function create_static_field_internal(label_key, value, is_link = false) {
        const field_div = create_element('div', { class_name: 'static-field' });
        field_div.appendChild(create_element('strong', { text_content: t(label_key) + ":" }));
        const esc_func = typeof escape_html === 'function' ? escape_html : s => s;
        const add_proto_func = typeof add_protocol_if_missing === 'function' ? add_protocol_if_missing : url => url;

        if (value && typeof value === 'string' && value.trim() !== '') {
            if (is_link) {
                const safe_url = add_proto_func(value);
                field_div.appendChild(document.createTextNode(' '));
                field_div.appendChild(create_element('a', { href: safe_url, text_content: value, attributes: { target: '_blank', rel: 'noopener noreferrer' } }));
            } else {
                if (label_key === 'internal_comment' && value.includes('\n')) {
                    value.split('\n').forEach((line, index) => {
                        if (index > 0) field_div.appendChild(create_element('br'));
                        field_div.appendChild(document.createTextNode(' ' + esc_func(line)));
                    });
                } else {
                    field_div.appendChild(document.createTextNode(' ' + esc_func(value)));
                }
            }
        } else {
            field_div.appendChild(document.createTextNode(' ' + t('value_not_set', {defaultValue: '(Not set)'})));
        }
        return field_div;
    }

    function render() {
        if (!app_container_ref || typeof create_element !== 'function' || typeof t !== 'function' || !local_getState) { /* ... */ return; }
        app_container_ref.innerHTML = '';
        const current_global_state = local_getState();
        if (!current_global_state || !current_global_state.ruleFileContent) { /* ... */ return; }

        const plate_element = create_element('div', { class_name: 'content-plate metadata-view-plate' });
        app_container_ref.appendChild(plate_element);

        if (global_message_element_ref_local) {
            plate_element.appendChild(global_message_element_ref_local);
            if (typeof clear_global_message === 'function' && global_message_element_ref_local &&
                !global_message_element_ref_local.classList.contains('message-error') &&
                !global_message_element_ref_local.classList.contains('message-warning')) {
                clear_global_message();
            }
        }
        if (current_global_state.auditStatus === 'not_started' && typeof show_global_message === 'function' &&
            (!global_message_element_ref_local || global_message_element_ref_local.hasAttribute('hidden') || !global_message_element_ref_local.textContent.trim())) {
            show_global_message(t('metadata_form_intro'), "info");
        }

        plate_element.appendChild(create_element('h1', { text_content: t('audit_metadata_title') }));
        plate_element.appendChild(create_element('p', { class_name: 'view-intro-text', text_content: t('metadata_form_instruction') }));

        const form_container = create_element('div', { class_name: 'metadata-form-container' });
        const metadata_from_store = current_global_state.auditMetadata || {};
        const is_editable = current_global_state.auditStatus === 'not_started';
        const icon_forward_svg = typeof get_icon_svg === 'function' ? get_icon_svg('arrow_forward', ['currentColor'], 18) : '';

        if (is_editable) {
            form_element_ref = create_element('form');
            form_element_ref.addEventListener('submit', handle_submit);
            const case_field = create_form_field_internal('caseNumber', 'case_number', 'text', metadata_from_store.caseNumber || '', false); // La till fallback för current_value
            case_number_input = case_field.input_element; form_element_ref.appendChild(case_field.form_group);
            const actor_field = create_form_field_internal('actorName', 'actor_name', 'text', metadata_from_store.actorName || '', false);
            actor_name_input = actor_field.input_element; form_element_ref.appendChild(actor_field.form_group);
            const actor_link_field = create_form_field_internal('actorLink', 'actor_link', 'url', metadata_from_store.actorLink || '', true); // Tog bort 'true' för placeholder, menade nog readonly
            actor_link_input = actor_link_field.input_element; form_element_ref.appendChild(actor_link_field.form_group);
            const auditor_field = create_form_field_internal('auditorName', 'auditor_name', 'text', metadata_from_store.auditorName || '', false);
            auditor_name_input = auditor_field.input_element; form_element_ref.appendChild(auditor_field.form_group);
            const comment_field = create_form_field_internal('internalComment', 'internal_comment', 'textarea', metadata_from_store.internalComment || '', false);
            internal_comment_input = comment_field.input_element; form_element_ref.appendChild(comment_field.form_group);
            const form_actions_wrapper_for_form = create_element('div', { class_name: 'form-actions metadata-actions' });
            const submit_button_editable = create_element('button', { class_name: ['button', 'button-primary'], attributes: { type: 'submit' }, html_content: `<span>${t('continue_to_samples')}</span>` + icon_forward_svg });
            form_actions_wrapper_for_form.appendChild(submit_button_editable);
            form_element_ref.appendChild(form_actions_wrapper_for_form);
            form_container.appendChild(form_element_ref);
        } else { /* ... oförändrad statisk visning ... */ }
        plate_element.appendChild(form_container);
    }

    function destroy() {
        if (form_element_ref) form_element_ref.removeEventListener('submit', handle_submit);
        form_element_ref = null; case_number_input = null; actor_name_input = null; actor_link_input = null; auditor_name_input = null; internal_comment_input = null;
        local_getState = null; local_dispatch = null; local_StoreActionTypes = null;
        global_message_element_ref_local = null;
    }

    return { init, render, destroy };
})();

export const MetadataViewComponent = MetadataViewComponent_internal;