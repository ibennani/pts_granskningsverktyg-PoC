// js/components/SampleManagementViewComponent.js
import { AddSampleFormComponent } from './AddSampleFormComponent.js';
import { SampleListComponent } from './SampleListComponent.js';

// NYTT: Importera specifika hjälpfunktioner
import { create_element, get_icon_svg, load_css, escape_html, get_current_iso_datetime_utc } from '../../utils/helpers.js'; // Justerad sökväg

const SampleManagementViewComponent_internal = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/sample_management_view_component.css';
    let app_container_ref;
    let router_ref;

    let local_getState;
    let local_dispatch;
    let local_StoreActionTypes;

    // Beroenden som används direkt av denna komponent
    let Translation_t_local;
    // Helpers-funktioner importeras nu direkt
    let NotificationComponent_show_global_message_local;
    let NotificationComponent_clear_global_message_local;
    let NotificationComponent_get_global_message_element_reference_local;
    // get_current_iso_datetime_utc importeras nu direkt

    let add_sample_form_component_instance;
    let sample_list_component_instance;
    let add_sample_form_container_element;
    let sample_list_container_element;
    let toggle_form_button_element;
    let start_audit_button_ref;

    let global_message_element_ref;
    let is_form_visible = false;
    let intro_text_element = null;
    let previously_focused_element_for_delete_confirm = null;


    function get_t_func_local_scope() {
        if (Translation_t_local) return Translation_t_local;
        if (window.Translation && typeof window.Translation.t === 'function') {
            Translation_t_local = window.Translation.t;
            return Translation_t_local;
        }
        return (key, replacements) => `**${key}** (SampleMgmt t not found)`;
    }

    // assign_globals_once tas bort

    async function init_sub_components() {
        // create_element importeras nu direkt
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
        const t = get_t_func_local_scope();
        const current_global_state = local_getState();
        if (current_global_state.auditStatus !== 'not_started') {
            if(NotificationComponent_show_global_message_local) NotificationComponent_show_global_message_local(t('audit_already_started_or_locked'), "info");
            return;
        }
        if(NotificationComponent_clear_global_message_local) NotificationComponent_clear_global_message_local();
        toggle_add_sample_form_visibility(true, sample_id);
    }

    function handle_delete_sample_request_from_list(sample_id) {
        const t = get_t_func_local_scope();
        const current_global_state = local_getState();

        if (current_global_state.auditStatus !== 'not_started') {
            if(NotificationComponent_show_global_message_local) NotificationComponent_show_global_message_local(t('audit_already_started_or_locked'), "info");
            return;
        }

        // escape_html importeras nu direkt
        const sample_to_delete = current_global_state.samples.find(s => s.id === sample_id);
        const sample_name_for_confirm = sample_to_delete && typeof escape_html === 'function' ? escape_html(sample_to_delete.description) : sample_id;

        previously_focused_element_for_delete_confirm = document.activeElement;

        if (confirm(t('confirm_delete_sample', {sampleName: sample_name_for_confirm }))) {
            if (!local_StoreActionTypes || !local_StoreActionTypes.DELETE_SAMPLE) {
                console.error("[SampleManagementView] local_StoreActionTypes.DELETE_SAMPLE is undefined!");
                if (NotificationComponent_show_global_message_local) NotificationComponent_show_global_message_local("Internal error: Action type for delete is missing.", "error");
                return;
            }
            local_dispatch({
                type: local_StoreActionTypes.DELETE_SAMPLE,
                payload: { sampleId: sample_id }
            });
            if(NotificationComponent_show_global_message_local) NotificationComponent_show_global_message_local(t('sample_deleted_successfully', {sampleName: sample_name_for_confirm}), "success");

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
        const t = get_t_func_local_scope();
        is_form_visible = !!show;
        const current_global_state = local_getState();
        const is_readonly = current_global_state.auditStatus !== 'not_started';

        if (is_readonly && is_form_visible) {
            is_form_visible = false;
            if(NotificationComponent_show_global_message_local) NotificationComponent_show_global_message_local(t('audit_already_started_or_locked'), "info");
        }

        // get_icon_svg importeras nu direkt
        if (add_sample_form_container_element && sample_list_container_element && typeof get_icon_svg === 'function' && t) {
            const icon_list_svg = get_icon_svg('list', ['currentColor'], 18) || '';
            const icon_add_svg = get_icon_svg('add', ['currentColor'], 18) || '';

            if (is_form_visible) {
                add_sample_form_container_element.removeAttribute('hidden');
                sample_list_container_element.setAttribute('hidden', 'true');
                if (toggle_form_button_element) {
                    toggle_form_button_element.innerHTML = `<span>${t('show_existing_samples')}</span>` + icon_list_svg;
                }
                if (intro_text_element) intro_text_element.setAttribute('hidden', 'true');
                if (add_sample_form_component_instance && typeof add_sample_form_component_instance.render === 'function') {
                     add_sample_form_component_instance.render(sample_id_to_edit);
                } else { console.error("[SampleManagementView/toggle] AddSampleFormComponent.render is not a function or instance is null"); }
                 const first_input = add_sample_form_container_element.querySelector('input, select, textarea');
                if (first_input) first_input.focus();

            } else {
                add_sample_form_container_element.setAttribute('hidden', 'true');
                sample_list_container_element.removeAttribute('hidden');
                if (toggle_form_button_element) {
                    toggle_form_button_element.innerHTML = `<span>${t('add_new_sample')}</span>` + icon_add_svg;
                }
                if (intro_text_element && !is_readonly) intro_text_element.removeAttribute('hidden');
                else if (intro_text_element && is_readonly) intro_text_element.setAttribute('hidden', 'true');

                if (sample_list_component_instance && typeof sample_list_component_instance.render === 'function') {
                     sample_list_component_instance.render();
                } else { console.error("[SampleManagementView/toggle] SampleListComponent.render is not a function or instance is null"); }
                if (add_sample_form_component_instance && typeof add_sample_form_component_instance.render === 'function' && !sample_id_to_edit) {
                    add_sample_form_component_instance.render(null);
                }
                if(previously_focused_element_for_delete_confirm) {
                    previously_focused_element_for_delete_confirm.focus();
                    previously_focused_element_for_delete_confirm = null;
                } else if (toggle_form_button_element) {
                    toggle_form_button_element.focus();
                }
            }
        }
    }

    function handle_start_audit() {
        const t = get_t_func_local_scope();
        const current_global_state = local_getState();

        // get_current_iso_datetime_utc importeras nu direkt
        if (!current_global_state || !t || typeof get_current_iso_datetime_utc !== 'function' || !local_dispatch || !NotificationComponent_show_global_message_local || !router_ref) {
            console.error("[SampleManagementView/handle_start_audit] Kritiska beroenden saknas!");
            if (NotificationComponent_show_global_message_local) NotificationComponent_show_global_message_local(t('error_internal_cannot_start_audit_deps_missing'), "error");
            return;
        }

        if (current_global_state.samples && current_global_state.samples.length > 0 && current_global_state.auditStatus === 'not_started') {
            if (!local_StoreActionTypes || !local_StoreActionTypes.SET_AUDIT_STATUS) {
                console.error("[SampleManagementView] local_StoreActionTypes.SET_AUDIT_STATUS is undefined!");
                if (NotificationComponent_show_global_message_local) NotificationComponent_show_global_message_local("Internal error: Action type for start audit is missing.", "error");
                return;
            }
            local_dispatch({
                type: local_StoreActionTypes.SET_AUDIT_STATUS,
                payload: { status: 'in_progress' } // startTime sätts av reducern
            });
            NotificationComponent_show_global_message_local(t('audit_started_successfully'), "success");
            setTimeout(() => {
                if(NotificationComponent_clear_global_message_local) NotificationComponent_clear_global_message_local();
                router_ref('audit_overview');
            }, 500);
        } else if (current_global_state.auditStatus !== 'not_started') {
            NotificationComponent_show_global_message_local(t('audit_already_started_or_locked'), "info");
        } else {
            NotificationComponent_show_global_message_local(t('error_no_samples_to_start_audit'), "warning");
        }
    }

    async function init(_app_container, _router_cb, _params, _getState, _dispatch, _StoreActionTypes) {
        app_container_ref = _app_container;
        router_ref = _router_cb;

        local_getState = _getState;
        local_dispatch = _dispatch;
        local_StoreActionTypes = _StoreActionTypes;

        // Tilldela lokala referenser
        if (window.Translation && typeof window.Translation.t === 'function') Translation_t_local = window.Translation.t;
        if (window.NotificationComponent) {
            NotificationComponent_show_global_message_local = window.NotificationComponent.show_global_message;
            NotificationComponent_clear_global_message_local = window.NotificationComponent.clear_global_message;
            NotificationComponent_get_global_message_element_reference_local = window.NotificationComponent.get_global_message_element_reference;
        }
        // get_current_iso_datetime_utc importeras nu direkt

        if (!local_StoreActionTypes) {
            console.error("[SampleManagementViewComponent] CRITICAL: StoreActionTypes was not passed to init or is undefined. Using fallback.");
            local_StoreActionTypes = {
                SET_AUDIT_STATUS: 'SET_AUDIT_STATUS_ERROR_FALLBACK',
                DELETE_SAMPLE: 'DELETE_SAMPLE_ERROR_FALLBACK',
                ADD_SAMPLE: 'ADD_SAMPLE_ERROR_FALLBACK',
                UPDATE_SAMPLE: 'UPDATE_SAMPLE_ERROR_FALLBACK'
            };
        }

        if (NotificationComponent_get_global_message_element_reference_local) {
            global_message_element_ref = NotificationComponent_get_global_message_element_reference_local();
        }

        await init_sub_components(); // Denna funktion använder redan den importerade create_element

        // Använd importerad load_css
        if (typeof load_css === 'function') {
            try {
                const link_tag = document.querySelector(`link[href="${CSS_PATH}"]`);
                if (!link_tag) {
                    await load_css(CSS_PATH);
                }
            }
            catch (error) { console.warn("Failed to load CSS for SampleManagementViewComponent:", error); }
        } else {
            console.warn("[SampleManagementViewComponent] load_css (importerad) not available.");
        }
    }

    function render() {
        const t = get_t_func_local_scope();
        // Använd importerade create_element och get_icon_svg
        if (!app_container_ref || typeof create_element !== 'function' || !t || !local_getState) {
            console.error("SampleManagementView: Core dependencies missing for render. Has init completed successfully?");
            if(app_container_ref) app_container_ref.innerHTML = `<p>${t('error_render_sample_management_view_deps_missing')}</p>`;
            return;
        }
        app_container_ref.innerHTML = '';
        const plate_element = create_element('div', { class_name: 'content-plate sample-management-view-plate' });
        app_container_ref.appendChild(plate_element);

        if (global_message_element_ref) {
            plate_element.appendChild(global_message_element_ref);
        }

        const current_global_state = local_getState();
        if (current_global_state.auditStatus !== 'not_started') {
            if (NotificationComponent_show_global_message_local) NotificationComponent_show_global_message_local(t('audit_already_started_or_locked'), "info");
            const go_to_overview_btn = create_element('button', {
                class_name: ['button', 'button-primary'],
                text_content: t('back_to_audit_overview')
            });
            go_to_overview_btn.addEventListener('click', () => router_ref('audit_overview'));
            plate_element.appendChild(go_to_overview_btn);
            return;
        }

        plate_element.appendChild(create_element('h1', { text_content: t('sample_management_title') }));

        intro_text_element = create_element('p', {
            class_name: 'view-intro-text',
            text_content: t('add_samples_intro_message')
        });
        plate_element.appendChild(intro_text_element);
        if ((current_global_state.samples && current_global_state.samples.length === 0) || is_form_visible) {
            intro_text_element.setAttribute('hidden', 'true');
        }

        if (is_form_visible && global_message_element_ref && NotificationComponent_show_global_message_local &&
            (global_message_element_ref.hasAttribute('hidden') || !global_message_element_ref.textContent.trim())) {
            NotificationComponent_show_global_message_local(t('add_sample_form_intro'), "info");
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

        if (add_sample_form_container_element) {
            plate_element.appendChild(add_sample_form_container_element);
        } else { console.error("[SampleManagementView] add_sample_form_container_element is undefined before append in render!"); }

        if (sample_list_container_element) {
            plate_element.appendChild(sample_list_container_element);
        } else { console.error("[SampleManagementView] sample_list_container_element is undefined before append in render!"); }

        const bottom_actions_div = create_element('div', {
            class_name: ['form-actions', 'space-between-groups'],
            style: 'margin-top: 2rem; width: 100%;'
        });
        const left_group_bottom = create_element('div', { class_name: 'action-group-left' });
        const right_group_bottom = create_element('div', { class_name: 'action-group-right' });

        start_audit_button_ref = null;
        if (current_global_state.samples && current_global_state.samples.length > 0) {
            const start_audit_icon_svg = typeof get_icon_svg === 'function' ? get_icon_svg('check_circle_green_yellow', ['var(--button-success-text)', 'var(--button-success-hover-bg)'], 18) : '';
            start_audit_button_ref = create_element('button', {
                id: 'start-audit-main-btn',
                class_name: ['button', 'button-success'],
                html_content: `<span>${t('start_audit')}</span>` + start_audit_icon_svg
            });
            start_audit_button_ref.addEventListener('click', handle_start_audit);
            right_group_bottom.appendChild(start_audit_button_ref);
        }

        bottom_actions_div.appendChild(left_group_bottom);
        if (right_group_bottom.hasChildNodes()) {
            bottom_actions_div.appendChild(right_group_bottom);
            plate_element.appendChild(bottom_actions_div);
        }

        let should_form_be_visible_initially = is_form_visible;
        if (!current_global_state.samples || current_global_state.samples.length === 0) {
            should_form_be_visible_initially = true;
        }
        toggle_add_sample_form_visibility(should_form_be_visible_initially,
            add_sample_form_component_instance ? add_sample_form_component_instance.current_editing_sample_id : null);
    }

    function destroy() {
        if (add_sample_form_component_instance && typeof add_sample_form_component_instance.destroy === 'function') {
            add_sample_form_component_instance.destroy();
        }
        if (sample_list_component_instance && typeof sample_list_component_instance.destroy === 'function') {
            sample_list_component_instance.destroy();
        }
        add_sample_form_container_element = null; sample_list_container_element = null;
        toggle_form_button_element = null;
        start_audit_button_ref = null;
        global_message_element_ref = null;
        intro_text_element = null;
        is_form_visible = false;
        local_getState = null;
        local_dispatch = null;
        local_StoreActionTypes = null;
        Translation_t_local = null;
        NotificationComponent_show_global_message_local = null;
        NotificationComponent_clear_global_message_local = null;
        NotificationComponent_get_global_message_element_reference_local = null;
        previously_focused_element_for_delete_confirm = null;
    }

    return {
        init,
        render,
        destroy
    };
})();

export const SampleManagementViewComponent = SampleManagementViewComponent_internal;