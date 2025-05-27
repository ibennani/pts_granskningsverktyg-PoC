// js/components/SampleManagementViewComponent.js
import { AddSampleFormComponent } from './AddSampleFormComponent.js';
import { SampleListComponent } from './SampleListComponent.js';

// KORRIGERADE SÖKVÄGAR
import { create_element, get_icon_svg, load_css, escape_html, get_current_iso_datetime_utc } from '../utils/helpers.js';
import { t } from '../translation_logic.js';
import { show_global_message, clear_global_message, get_global_message_element_reference } from './NotificationComponent.js';


const SampleManagementViewComponent_internal = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/sample_management_view_component.css';
    let app_container_ref;
    let router_ref;

    let local_getState;
    let local_dispatch;
    let local_StoreActionTypes;

    let global_message_element_ref_local;

    let add_sample_form_component_instance;
    let sample_list_component_instance;
    let add_sample_form_container_element;
    let sample_list_container_element;
    let toggle_form_button_element;
    let start_audit_button_ref;
    let is_form_visible = false;
    let intro_text_element = null;
    let previously_focused_element_for_delete_confirm = null;


    async function init_sub_components() {
        if (typeof create_element !== 'function') { console.error("SampleManagementView: create_element (importerad) not available for init_sub_components."); return; }

        add_sample_form_container_element = create_element('div', { id: 'add-sample-form-area' });
        sample_list_container_element = create_element('div', { id: 'sample-list-area' });

        add_sample_form_component_instance = AddSampleFormComponent;
        if (add_sample_form_component_instance && typeof add_sample_form_component_instance.init === 'function') {
            await add_sample_form_component_instance.init(
                add_sample_form_container_element,
                on_sample_saved_or_updated_in_form,
                toggle_add_sample_form_visibility,
                local_getState,
                local_dispatch,
                local_StoreActionTypes
            );
        } else { console.error("SampleManagementView: AddSampleFormComponent is not correctly initialized or init function is missing."); }

        sample_list_component_instance = SampleListComponent;
        if (sample_list_component_instance && typeof sample_list_component_instance.init === 'function') {
            await sample_list_component_instance.init(
                sample_list_container_element,
                handle_edit_sample_request_from_list,
                handle_delete_sample_request_from_list,
                router_ref,
                local_getState
            );
        } else { console.error("SampleManagementView: SampleListComponent is not correctly initialized or init function is missing."); }
    }

    function on_sample_saved_or_updated_in_form() {
        toggle_add_sample_form_visibility(false);
    }

    function handle_edit_sample_request_from_list(sample_id) {
        const current_global_state = local_getState();
        if (current_global_state.auditStatus !== 'not_started') {
            if(typeof show_global_message === 'function') show_global_message(t('audit_already_started_or_locked'), "info");
            return;
        }
        if(typeof clear_global_message === 'function') clear_global_message();
        toggle_add_sample_form_visibility(true, sample_id);
    }

    function handle_delete_sample_request_from_list(sample_id) {
        const current_global_state = local_getState();
        if (current_global_state.auditStatus !== 'not_started') {
            if(typeof show_global_message === 'function') show_global_message(t('audit_already_started_or_locked'), "info");
            return;
        }
        const esc_func = typeof escape_html === 'function' ? escape_html : s => s;
        const sample_to_delete = current_global_state.samples.find(s => s.id === sample_id);
        const sample_name_for_confirm = sample_to_delete ? esc_func(sample_to_delete.description) : sample_id;
        previously_focused_element_for_delete_confirm = document.activeElement;

        if (confirm(t('confirm_delete_sample', {sampleName: sample_name_for_confirm }))) {
            if (!local_StoreActionTypes || !local_StoreActionTypes.DELETE_SAMPLE) {
                console.error("[SampleManagementView] local_StoreActionTypes.DELETE_SAMPLE is undefined!");
                if (typeof show_global_message === 'function') show_global_message("Internal error: Action type for delete is missing.", "error");
                return;
            }
            local_dispatch({ type: local_StoreActionTypes.DELETE_SAMPLE, payload: { sampleId: sample_id } });
            if(typeof show_global_message === 'function') show_global_message(t('sample_deleted_successfully', {sampleName: sample_name_for_confirm}), "success");
            if (is_form_visible && add_sample_form_component_instance && add_sample_form_component_instance.current_editing_sample_id === sample_id) {
                toggle_add_sample_form_visibility(false);
            }
        } else {
            if (previously_focused_element_for_delete_confirm) {
                previously_focused_element_for_delete_confirm.focus();
                previously_focused_element_for_delete_confirm = null;
            }
        }
    }

    function toggle_add_sample_form_visibility(show, sample_id_to_edit = null) {
        is_form_visible = !!show;
        const current_global_state = local_getState();
        const is_readonly = current_global_state.auditStatus !== 'not_started';
        if (is_readonly && is_form_visible) {
            is_form_visible = false;
            if(typeof show_global_message === 'function') show_global_message(t('audit_already_started_or_locked'), "info");
        }
        const get_icon_func = typeof get_icon_svg === 'function' ? get_icon_svg : () => '';

        if (add_sample_form_container_element && sample_list_container_element && typeof t === 'function') {
            const icon_list_svg = get_icon_func('list', ['currentColor'], 18);
            const icon_add_svg = get_icon_func('add', ['currentColor'], 18);
            if (is_form_visible) {
                add_sample_form_container_element.removeAttribute('hidden');
                sample_list_container_element.setAttribute('hidden', 'true');
                if (toggle_form_button_element) toggle_form_button_element.innerHTML = `<span>${t('show_existing_samples')}</span>` + icon_list_svg;
                if (intro_text_element) intro_text_element.setAttribute('hidden', 'true');
                if (add_sample_form_component_instance && typeof add_sample_form_component_instance.render === 'function') add_sample_form_component_instance.render(sample_id_to_edit);
                const first_input = add_sample_form_container_element.querySelector('input, select, textarea'); if (first_input) first_input.focus();
            } else {
                add_sample_form_container_element.setAttribute('hidden', 'true');
                sample_list_container_element.removeAttribute('hidden');
                if (toggle_form_button_element) toggle_form_button_element.innerHTML = `<span>${t('add_new_sample')}</span>` + icon_add_svg;
                if (intro_text_element && !is_readonly) intro_text_element.removeAttribute('hidden'); else if (intro_text_element && is_readonly) intro_text_element.setAttribute('hidden', 'true');
                if (sample_list_component_instance && typeof sample_list_component_instance.render === 'function') sample_list_component_instance.render();
                if (add_sample_form_component_instance && typeof add_sample_form_component_instance.render === 'function' && !sample_id_to_edit) add_sample_form_component_instance.render(null);
                if(previously_focused_element_for_delete_confirm) { previously_focused_element_for_delete_confirm.focus(); previously_focused_element_for_delete_confirm = null; }
                else if (toggle_form_button_element) { toggle_form_button_element.focus(); }
            }
        }
    }

    function handle_start_audit() {
        const current_global_state = local_getState();
        const get_iso_func = typeof get_current_iso_datetime_utc === 'function' ? get_current_iso_datetime_utc : () => new Date().toISOString();

        if (!current_global_state || typeof t !== 'function' || typeof get_iso_func !== 'function' || !local_dispatch || typeof show_global_message !== 'function' || !router_ref) {
            console.error("[SampleManagementView/handle_start_audit] Kritiska beroenden saknas!");
            if (typeof show_global_message === 'function' && typeof t === 'function') show_global_message(t('error_internal_cannot_start_audit_deps_missing'), "error");
            return;
        }
        if (current_global_state.samples && current_global_state.samples.length > 0 && current_global_state.auditStatus === 'not_started') {
            if (!local_StoreActionTypes || !local_StoreActionTypes.SET_AUDIT_STATUS) {
                console.error("[SampleManagementView] local_StoreActionTypes.SET_AUDIT_STATUS is undefined!");
                if (typeof show_global_message === 'function') show_global_message("Internal error: Action type for start audit is missing.", "error");
                return;
            }
            local_dispatch({ type: local_StoreActionTypes.SET_AUDIT_STATUS, payload: { status: 'in_progress' } });
            show_global_message(t('audit_started_successfully'), "success");
            setTimeout(() => {
                if(typeof clear_global_message === 'function') clear_global_message();
                router_ref('audit_overview');
            }, 500);
        } else if (current_global_state.auditStatus !== 'not_started') {
            show_global_message(t('audit_already_started_or_locked'), "info");
        } else {
            show_global_message(t('error_no_samples_to_start_audit'), "warning");
        }
    }

    async function init(_app_container, _router_cb, _params, _getState, _dispatch, _StoreActionTypes) {
        app_container_ref = _app_container; router_ref = _router_cb;
        local_getState = _getState; local_dispatch = _dispatch; local_StoreActionTypes = _StoreActionTypes;

        if (!local_StoreActionTypes) {
            console.error("[SampleManagementViewComponent] CRITICAL: StoreActionTypes was not passed to init or is undefined.");
            local_StoreActionTypes = { /* fallback */ };
        }
        if (typeof get_global_message_element_reference === 'function') {
            global_message_element_ref_local = get_global_message_element_reference();
        } else {
            console.warn("[SampleManagementViewComponent] get_global_message_element_reference (importerad) not available.");
        }

        await init_sub_components();
        if (typeof load_css === 'function') {
            try {
                const link_tag = document.querySelector(`link[href="${CSS_PATH}"]`);
                if (!link_tag) await load_css(CSS_PATH);
            } catch (error) { console.warn("Failed to load CSS for SampleManagementViewComponent:", error); }
        } else { console.warn("[SampleManagementViewComponent] load_css (importerad) not available."); }
    }

    function render() {
        if (!app_container_ref || typeof create_element !== 'function' || typeof t !== 'function' || !local_getState) {
            console.error("SampleManagementView: Core dependencies missing for render.");
            if(app_container_ref) app_container_ref.innerHTML = `<p>${t ? t('error_render_sample_management_view_deps_missing') : 'Error rendering view.'}</p>`;
            return;
        }
        app_container_ref.innerHTML = '';
        const plate_element = create_element('div', { class_name: 'content-plate sample-management-view-plate' });
        app_container_ref.appendChild(plate_element);

        if (global_message_element_ref_local) {
            plate_element.appendChild(global_message_element_ref_local);
            if (typeof clear_global_message === 'function' && global_message_element_ref_local &&
                !global_message_element_ref_local.classList.contains('message-error') &&
                !global_message_element_ref_local.classList.contains('message-warning')) {
                clear_global_message();
            }
        }

        const current_global_state = local_getState();
        if (current_global_state.auditStatus !== 'not_started') {
            if (typeof show_global_message === 'function') show_global_message(t('audit_already_started_or_locked'), "info");
            const go_to_overview_btn = create_element('button', { class_name: ['button', 'button-primary'], text_content: t('back_to_audit_overview') });
            go_to_overview_btn.addEventListener('click', () => router_ref('audit_overview'));
            plate_element.appendChild(go_to_overview_btn);
            return;
        }

        plate_element.appendChild(create_element('h1', { text_content: t('sample_management_title') }));
        intro_text_element = create_element('p', { class_name: 'view-intro-text', text_content: t('add_samples_intro_message') });
        plate_element.appendChild(intro_text_element);
        if ((current_global_state.samples && current_global_state.samples.length === 0 && !is_form_visible) ) {
            // Behåll synlig
        } else if (is_form_visible || (current_global_state.samples && current_global_state.samples.length > 0)) {
             intro_text_element.setAttribute('hidden', 'true');
        }

        if (is_form_visible && global_message_element_ref_local && typeof show_global_message === 'function' &&
            (global_message_element_ref_local.hasAttribute('hidden') || !global_message_element_ref_local.textContent.trim())) {
            show_global_message(t('add_sample_form_intro'), "info");
       }

        const top_actions_div = create_element('div', { class_name: 'sample-management-actions' });
        toggle_form_button_element = create_element('button', { class_name: ['button', 'button-default'] });
        toggle_form_button_element.addEventListener('click', () => {
            toggle_add_sample_form_visibility(!is_form_visible,
                is_form_visible && add_sample_form_component_instance ? add_sample_form_component_instance.current_editing_sample_id : null
            );
        });
        top_actions_div.appendChild(toggle_form_button_element);
        plate_element.appendChild(top_actions_div);

        if (add_sample_form_container_element) plate_element.appendChild(add_sample_form_container_element);
        else console.error("[SampleManagementView] add_sample_form_container_element is undefined before append in render!");
        if (sample_list_container_element) plate_element.appendChild(sample_list_container_element);
        else console.error("[SampleManagementView] sample_list_container_element is undefined before append in render!");

        const bottom_actions_div = create_element('div', { class_name: ['form-actions', 'space-between-groups'], style: 'margin-top: 2rem; width: 100%;' });
        const left_group_bottom = create_element('div', { class_name: 'action-group-left' });
        const right_group_bottom = create_element('div', { class_name: 'action-group-right' });
        start_audit_button_ref = null;
        if (current_global_state.samples && current_global_state.samples.length > 0) {
            const get_icon_func = typeof get_icon_svg === 'function' ? get_icon_svg : () => '';
            const start_audit_icon_svg = get_icon_func('check_circle_green_yellow', ['var(--button-success-text)', 'var(--button-success-hover-bg)'], 18);
            start_audit_button_ref = create_element('button', { id: 'start-audit-main-btn', class_name: ['button', 'button-success'], html_content: `<span>${t('start_audit')}</span>` + start_audit_icon_svg });
            start_audit_button_ref.addEventListener('click', handle_start_audit);
            right_group_bottom.appendChild(start_audit_button_ref);
        }
        bottom_actions_div.appendChild(left_group_bottom);
        if (right_group_bottom.hasChildNodes()) { bottom_actions_div.appendChild(right_group_bottom); plate_element.appendChild(bottom_actions_div); }

        let should_form_be_visible_initially = is_form_visible;
        if (!current_global_state.samples || current_global_state.samples.length === 0) {
            should_form_be_visible_initially = true;
        }
        toggle_add_sample_form_visibility(should_form_be_visible_initially,
            add_sample_form_component_instance ? add_sample_form_component_instance.current_editing_sample_id : null);
    }

    function destroy() {
        if (add_sample_form_component_instance && typeof add_sample_form_component_instance.destroy === 'function') add_sample_form_component_instance.destroy();
        if (sample_list_component_instance && typeof sample_list_component_instance.destroy === 'function') sample_list_component_instance.destroy();
        add_sample_form_container_element = null; sample_list_container_element = null;
        toggle_form_button_element = null; start_audit_button_ref = null;
        global_message_element_ref_local = null; intro_text_element = null; is_form_visible = false;
        local_getState = null; local_dispatch = null; local_StoreActionTypes = null;
        previously_focused_element_for_delete_confirm = null;
    }

    return { init, render, destroy };
})();

export const SampleManagementViewComponent = SampleManagementViewComponent_internal;