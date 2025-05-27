// file: js/components/AuditOverviewComponent.js
import { SampleListComponent } from './SampleListComponent.js';
import { AddSampleFormComponent } from './AddSampleFormComponent.js';
import { SaveAuditButtonComponent } from './SaveAuditButtonComponent.js';
import { MetadataDisplayComponent } from './MetadataDisplayComponent.js';

// KORRIGERAD SÖKVÄG till helpers.js
import { create_element, get_icon_svg, load_css, escape_html, add_protocol_if_missing, format_iso_to_local_datetime, get_current_iso_datetime_utc } from '../utils/helpers.js';

import { calculate_overall_audit_progress } from '../audit_logic.js';
import { create_progress_bar_component } from './ProgressBarComponent.js';
import { export_to_csv, export_to_excel } from '../export_logic.js';
import { save_audit_to_json_file } from '../logic/save_audit_logic.js';
import { t } from '../translation_logic.js';
import { show_global_message, clear_global_message, get_global_message_element_reference } from './NotificationComponent.js';


const AuditOverviewComponent_internal = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/audit_overview_component.css';
    let app_container_ref;
    let router_ref;

    let local_getState;
    let local_dispatch;
    let local_StoreActionTypes;

    let global_message_element_ref_local;

    let sample_list_component_instance;
    let sample_list_container_element;
    let add_sample_form_component_instance = null;
    let add_sample_form_container_element = null;
    let is_add_sample_form_visible = false;
    let add_sample_button_ref = null;
    let save_audit_button_component_instance = null;
    let save_audit_button_container_element = null;
    let previously_focused_element = null;


    async function init(_app_container, _router, _params, _getState, _dispatch, _StoreActionTypes) {
        app_container_ref = _app_container; router_ref = _router; local_getState = _getState; local_dispatch = _dispatch; local_StoreActionTypes = _StoreActionTypes;

        if (!local_StoreActionTypes) { /* ... */ }
        if (typeof calculate_overall_audit_progress !== 'function') { /* ... */ }
        if (typeof export_to_csv !== 'function' || typeof export_to_excel !== 'function') { /* ... */ }
        if (typeof save_audit_to_json_file !== 'function') { /* ... */ }
        if (typeof show_global_message !== 'function' || typeof clear_global_message !== 'function' || typeof get_global_message_element_reference !== 'function') {
            console.error("[AuditOverviewComponent] CRITICAL: One or more NotificationComponent functions (importerade) not available.");
        }
        if (typeof create_element !== 'function') { // Kontrollera att helpers är tillgängliga
             console.error("[AuditOverviewComponent] CRITICAL: Helper function create_element (importerad) not available.");
        }


        if (typeof get_global_message_element_reference === 'function') {
            global_message_element_ref_local = get_global_message_element_reference();
        } else {
            console.warn("[AuditOverviewComponent] get_global_message_element_reference (importerad) not available.");
        }
        await init_sub_components_internal();
        if (typeof load_css === 'function') {
            try {
                const link_tag = document.querySelector(`link[href="${CSS_PATH}"]`);
                if (!link_tag) await load_css(CSS_PATH);
            }
            catch (error) { console.warn("Failed to load CSS for AuditOverviewComponent:", error); }
        } else {
            console.warn("[AuditOverviewComponent] load_css (importerad) not available.");
        }
    }

    function handle_sample_saved_or_updated_in_form() { toggle_add_sample_form(false); }

    function handle_edit_sample_request_from_list(sample_id) {
        const current_global_state = local_getState();
        if (current_global_state.auditStatus !== 'in_progress') {
            if(typeof show_global_message === 'function') show_global_message(t('cannot_edit_sample_audit_not_in_progress'), "warning");
            return;
        }
        if (typeof clear_global_message === 'function') clear_global_message();
        toggle_add_sample_form(true, sample_id);
    }

    function handle_delete_sample_request_from_list(sample_id) {
        const current_global_state = local_getState();
        if (current_global_state.auditStatus !== 'in_progress') { /* ... */ return; }
        if (current_global_state.samples.length <= 1) { /* ... */ return; }
        const esc_func = typeof escape_html === 'function' ? escape_html : s => s;
        const sample_to_delete = current_global_state.samples.find(s => s.id === sample_id);
        const sample_name_for_confirm = sample_to_delete ? esc_func(sample_to_delete.description) : sample_id;
        previously_focused_element = document.activeElement;
        if (confirm(t('confirm_delete_sample', { sampleName: sample_name_for_confirm }))) {
            if (!local_StoreActionTypes || !local_StoreActionTypes.DELETE_SAMPLE) { /* ... */ return; }
            local_dispatch({ type: local_StoreActionTypes.DELETE_SAMPLE, payload: { sampleId: sample_id } });
            if (typeof show_global_message === 'function') show_global_message(t('sample_deleted_successfully', { sampleName: sample_name_for_confirm }), "success");
            if (is_add_sample_form_visible && add_sample_form_component_instance && add_sample_form_component_instance.current_editing_sample_id === sample_id) {
                toggle_add_sample_form(false);
            }
        } else { if (previously_focused_element) previously_focused_element.focus(); previously_focused_element = null; }
    }

    function toggle_add_sample_form(show, sample_id_to_edit = null) {
        is_add_sample_form_visible = !!show;
        const get_icon_func = typeof get_icon_svg === 'function' ? get_icon_svg : () => '';
        const icon_list_svg = get_icon_func('list', ['currentColor'], 18);
        const icon_add_svg = get_icon_func('add', ['currentColor'], 18);
        if (add_sample_form_container_element && sample_list_container_element && add_sample_button_ref && typeof t === 'function') {
            if (is_add_sample_form_visible) {
                previously_focused_element = document.activeElement;
                add_sample_form_container_element.removeAttribute('hidden');
                sample_list_container_element.setAttribute('hidden', 'true');
                add_sample_button_ref.innerHTML = `<span>${t('show_existing_samples')}</span>` + icon_list_svg;
                if (add_sample_form_component_instance && typeof add_sample_form_component_instance.render === 'function') add_sample_form_component_instance.render(sample_id_to_edit);
                const first_input = add_sample_form_container_element.querySelector('input, select, textarea'); if (first_input) first_input.focus();
            } else {
                add_sample_form_container_element.setAttribute('hidden', 'true');
                sample_list_container_element.removeAttribute('hidden');
                add_sample_button_ref.innerHTML = `<span>${t('add_new_sample')}</span>` + icon_add_svg;
                if (previously_focused_element) { previously_focused_element.focus(); previously_focused_element = null; }
                else if (add_sample_button_ref) add_sample_button_ref.focus();
                if (sample_list_component_instance && typeof sample_list_component_instance.render === 'function') sample_list_component_instance.render();
            }
        }
    }

    function handle_lock_audit() { /* ... */ }
    function handle_unlock_audit() { /* ... */ }
    function handle_export_csv_internal() { /* ... */ }
    function handle_export_excel_internal() { /* ... */ }

    async function init_sub_components_internal() {
        if (typeof create_element !== 'function') { return; }
        sample_list_container_element = create_element('div', { id: 'overview-sample-list-area' });
        sample_list_component_instance = SampleListComponent;
        if (sample_list_component_instance && typeof sample_list_component_instance.init === 'function') {
            await sample_list_component_instance.init(sample_list_container_element, handle_edit_sample_request_from_list, handle_delete_sample_request_from_list, router_ref, local_getState);
        }
        add_sample_form_container_element = create_element('div', { id: 'overview-add-sample-form-area' });
        add_sample_form_container_element.setAttribute('hidden', 'true');
        add_sample_form_component_instance = AddSampleFormComponent;
        if (add_sample_form_component_instance && typeof add_sample_form_component_instance.init === 'function') {
            await add_sample_form_component_instance.init(add_sample_form_container_element, handle_sample_saved_or_updated_in_form, () => toggle_add_sample_form(false), local_getState, local_dispatch, local_StoreActionTypes);
        }
        save_audit_button_container_element = create_element('div', { id: 'save-audit-button-area-overview' });
        save_audit_button_component_instance = SaveAuditButtonComponent;
        if (save_audit_button_component_instance && typeof save_audit_button_component_instance.init === 'function') {
            if (typeof save_audit_to_json_file !== 'function') { console.error("AuditOverview: save_audit_to_json_file (importerad) is missing for SaveAuditButtonComponent init!"); }
            else {
                 await save_audit_button_component_instance.init(save_audit_button_container_element, local_getState, save_audit_to_json_file, t, show_global_message, create_element, get_icon_svg, load_css );
            }
        } else { console.error("AuditOverview: SaveAuditButtonComponent is not correctly initialized or its init function is missing."); }
    }

    async function render() {
        if (!app_container_ref || typeof create_element !== 'function' || typeof t !== 'function' || !local_getState) { /* ... */ return; }
        app_container_ref.innerHTML = '';
        const current_global_state = local_getState();
        if (!current_global_state || !current_global_state.ruleFileContent) { /* ... */ return; }

        const plate_element = create_element('div', { class_name: 'content-plate audit-overview-plate' });
        app_container_ref.appendChild(plate_element);
        if (global_message_element_ref_local) plate_element.appendChild(global_message_element_ref_local);
        if (is_add_sample_form_visible && typeof show_global_message === 'function' && global_message_element_ref_local && (global_message_element_ref_local.hasAttribute('hidden') || !global_message_element_ref_local.textContent.trim() || (!global_message_element_ref_local.classList.contains('message-error') && !global_message_element_ref_local.classList.contains('message-warning')))) {
            show_global_message(t('add_sample_form_intro'), "info");
        }
        plate_element.appendChild(create_element('h1', { text_content: t('audit_overview_title') }));

        if (typeof calculate_overall_audit_progress === 'function' && typeof create_progress_bar_component === 'function') {
            const progress_data = calculate_overall_audit_progress(current_global_state);
            const overall_progress_section = create_element('section', { class_name: 'audit-overview-section overall-progress-section' });
            overall_progress_section.appendChild(create_element('h2', { text_content: t('overall_audit_progress_title') }));
            const progress_info_text_p = create_element('p', { class_name: 'info-item' });
            progress_info_text_p.innerHTML = `<strong>${t('total_requirements_audited_label')}:</strong> <span class="value">${progress_data.audited} / ${progress_data.total}</span>`;
            overall_progress_section.appendChild(progress_info_text_p);
            const overall_progress_bar = await create_progress_bar_component(progress_data.audited, progress_data.total, { id: 'overall-audit-progress-bar' });
            overall_progress_section.appendChild(overall_progress_bar);
            plate_element.appendChild(overall_progress_section);
        }

        const section1 = create_element('section', { class_name: 'audit-overview-section' });
        section1.appendChild(create_element('h2', { text_content: t('audit_info_title') }));
        const audit_metadata_container = create_element('div', { class_name: 'info-grid' });
        section1.appendChild(audit_metadata_container);
        const format_date_func = typeof format_iso_to_local_datetime === 'function' ? format_iso_to_local_datetime : (val) => val;
        const audit_metadata_config = [ /* ... */ ];
        if (MetadataDisplayComponent && typeof MetadataDisplayComponent.init === 'function') {
            await MetadataDisplayComponent.init(audit_metadata_container, current_global_state, audit_metadata_config, t, { create_element, escape_html, add_protocol_if_missing, format_iso_to_local_datetime });
            MetadataDisplayComponent.render();
        }
        const esc_func = typeof escape_html === 'function' ? escape_html : (s) => s;
        if (current_global_state.auditMetadata && current_global_state.auditMetadata.internalComment) { /* ... */ }
        plate_element.appendChild(section1);

        const section2 = create_element('section', { class_name: 'audit-overview-section' }); /* ... */ plate_element.appendChild(section2);
        // ... (all section 2 and 3 rendering logic remains the same) ...
    }

    function destroy() { /* ... oförändrad ... */ }

    return { init, render, destroy };
})();

export const AuditOverviewComponent = AuditOverviewComponent_internal;