// file: js/components/RequirementAuditComponent.js
import { CheckItemComponent } from './CheckItemComponent.js';
import { MetadataDisplayComponent } from './MetadataDisplayComponent.js';

// KORRIGERAD SÖKVÄG till helpers.js
import { create_element, get_icon_svg, load_css, escape_html, get_current_iso_datetime_utc, add_protocol_if_missing, format_iso_to_local_datetime } from '../utils/helpers.js';

// KORRIGERADE SÖKVÄGAR till audit_logic och translation_logic
import { calculate_check_status, calculate_requirement_status, get_ordered_relevant_requirement_keys, find_first_incomplete_requirement_key_for_sample } from '../audit_logic.js';
import { t } from '../translation_logic.js';

// KORRIGERAD SÖKVÄG till NotificationComponent
import { show_global_message, clear_global_message, get_global_message_element_reference } from './NotificationComponent.js';


export const RequirementAuditComponent = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/requirement_audit_component.css'; // Relativt till index.html
    let app_container_ref;
    let router_ref;
    let params_ref;

    let local_getState;
    let local_dispatch;
    let local_StoreActionTypes;

    let global_message_element_ref_local;

    let current_sample_object_from_store = null;
    let current_requirement_object_from_store = null;
    let current_requirement_result_for_view = null;
    let actual_observation_input, comment_to_auditor_input, comment_to_actor_input;
    let checks_ui_container_element = null;
    let requirement_status_display_element = null;
    let ordered_requirement_keys_for_sample = [];

    async function init(_app_container, _router, _params, _getState, _dispatch, _StoreActionTypes) {
        app_container_ref = _app_container; router_ref = _router; params_ref = _params;
        local_getState = _getState; local_dispatch = _dispatch; local_StoreActionTypes = _StoreActionTypes;

        if (!local_StoreActionTypes || !local_StoreActionTypes.UPDATE_REQUIREMENT_RESULT) { /* ... */ }
        if (typeof calculate_check_status !== 'function' || /* ... */ typeof find_first_incomplete_requirement_key_for_sample !== 'function') { /* ... */ }
        if (typeof show_global_message !== 'function' || typeof clear_global_message !== 'function' || typeof get_global_message_element_reference !== 'function') { /* ... */ }
        if (typeof create_element !== 'function') { /* ... */ }


        if (typeof get_global_message_element_reference === 'function') {
            global_message_element_ref_local = get_global_message_element_reference();
        }

        if (typeof load_css === 'function') {
            try {
                const link_tag = document.querySelector(`link[href="${CSS_PATH}"]`);
                if (!link_tag) await load_css(CSS_PATH);
            } catch (error) { console.warn("Failed to load CSS for RequirementAuditComponent:", error); }
        } else { console.warn("[RequirementAuditComponent] load_css (importerad) not available."); }
    }

    function handle_check_item_component_event(event) { /* ... oförändrad, använder redan importerade funktioner ... */ }
    function load_and_prepare_view_data() { /* ... oförändrad, använder redan importerade funktioner ... */ }
    function auto_save_text_data() { /* ... oförändrad, använder redan importerade funktioner ... */ }
    function render_audit_section_internal(title_key, content_data, parent_element) { /* ... oförändrad, använder redan importerade funktioner ... */ }
    function render_checks_section(container_element) { /* ... oförändrad, använder redan importerade funktioner ... */ }
    function get_current_requirement_index_in_ordered_list() { /* ... oförändrad ... */ }
    function navigate_to_requirement_by_index(index) { /* ... oförändrad ... */ }
    function go_to_previous_requirement() { /* ... oförändrad ... */ }
    function go_to_next_requirement() { /* ... oförändrad ... */ }
    
    function find_next_unhandled_requirement_key_internal_rac() {
        if (typeof find_first_incomplete_requirement_key_for_sample === 'function' && current_sample_object_from_store) {
            const current_global_state_nav = local_getState();
            if (current_global_state_nav && current_global_state_nav.ruleFileContent) {
                return find_first_incomplete_requirement_key_for_sample(current_global_state_nav.ruleFileContent, current_sample_object_from_store);
            }
        }
        console.warn("[ReqAudit] find_next_unhandled_requirement_key_internal_rac: Dependencies missing for find_first_incomplete_requirement_key_for_sample.");
        return null;
    }

    function go_to_next_unhandled_requirement() { /* ... oförändrad, använder redan importerade funktioner ... */ }
    function render_navigation_buttons(is_top_or_bottom = 'bottom') { /* ... oförändrad, använder redan importerade funktioner ... */ }

    function render() {
        if (!app_container_ref || typeof create_element !== 'function' || typeof t !== 'function' || !local_getState) { /* ... */ return; }
        app_container_ref.innerHTML = '';
        if (!load_and_prepare_view_data()) {
            if (typeof show_global_message === 'function' && typeof t === 'function') show_global_message(t('error_loading_sample_or_requirement_data'), "error");
            const back_button = create_element('button',{class_name:['button','button-default'],text_content:t('back_to_requirement_list')});
            const sampleIdForBack = params_ref ? params_ref.sampleId : '';
            back_button.addEventListener('click', () => router_ref('requirement_list', { sampleId: sampleIdForBack }));
            app_container_ref.appendChild(back_button);
            return;
        }
        const req_for_render = current_requirement_object_from_store;
        const result_for_render = current_requirement_result_for_view;
        const plate_element = create_element('div', { class_name: 'content-plate requirement-audit-plate' });
        app_container_ref.appendChild(plate_element);

        if (global_message_element_ref_local) {
            plate_element.appendChild(global_message_element_ref_local);
            if(typeof clear_global_message === 'function') clear_global_message();
        }

        const header_div = create_element('div', { class_name: 'requirement-audit-header' });
        header_div.appendChild(create_element('h1', { text_content: req_for_render.title }));
        if (req_for_render.standardReference && req_for_render.standardReference.text) {
            const ref_p = create_element('p', { class_name: 'standard-reference' });
            if (req_for_render.standardReference.url) {
                const link = create_element('a', { text_content: req_for_render.standardReference.text, attributes: { href: req_for_render.standardReference.url, target: '_blank', rel: 'noopener noreferrer' } });
                ref_p.appendChild(link);
            } else { ref_p.textContent = req_for_render.standardReference.text; }
            header_div.appendChild(ref_p);
        }
        requirement_status_display_element = create_element('p', { class_name: 'overall-requirement-status-display'});
        const overall_status_key = result_for_render?.status || 'not_audited';
        const overall_status_text = t(`audit_status_${overall_status_key}`, {defaultValue: overall_status_key});
        requirement_status_display_element.innerHTML = `<strong>${t('overall_requirement_status')}:</strong> <span class="status-text status-${overall_status_key}">${overall_status_text}</span>`;
        header_div.appendChild(requirement_status_display_element);
        plate_element.appendChild(header_div);

        render_audit_section_internal('requirement_expected_observation', req_for_render.expectedObservation, plate_element);
        render_audit_section_internal('requirement_instructions', req_for_render.instructions, plate_element);
        render_audit_section_internal('requirement_tips', req_for_render.tips, plate_element);
        render_audit_section_internal('requirement_exceptions', req_for_render.exceptions, plate_element);
        render_audit_section_internal('requirement_common_errors', req_for_render.commonErrors, plate_element);

        if (req_for_render.metadata) {
            const meta_section = create_element('div', { class_name: 'audit-section requirement-metadata-section' });
            meta_section.appendChild(create_element('h2', { text_content: t('requirement_metadata_title') }));
            const requirement_metadata_container = create_element('div', { class_name: 'requirement-metadata-grid' });
            meta_section.appendChild(requirement_metadata_container);
            plate_element.appendChild(meta_section);
            const requirement_metadata_config = [
                { labelKey: 'main_category', valuePath: 'metadata.mainCategory.text', type: 'text', showWhenEmptyAs: { labelKey: 'value_not_set' } },
                { labelKey: 'sub_category', valuePath: 'metadata.subCategory.text', type: 'text', showWhenEmptyAs: { labelKey: 'value_not_set' } },
                { labelKey: 'impact', valuePath: 'metadata.impact', type: 'text', formatter: (impact_obj) => { if (!impact_obj) return t('value_not_set'); return impact_obj.isCritical ? t('critical') : t('impact_normal'); }, isVisibleWhen: (data) => data.metadata && data.metadata.impact }
            ];
            if (MetadataDisplayComponent && typeof MetadataDisplayComponent.init === 'function') {
                MetadataDisplayComponent.init(requirement_metadata_container, req_for_render, requirement_metadata_config, t, { create_element, escape_html, add_protocol_if_missing, format_iso_to_local_datetime });
                MetadataDisplayComponent.render();
            } else { requirement_metadata_container.textContent = "Error: MetadataDisplayComponent not loaded."; }
        }

        plate_element.appendChild(render_navigation_buttons('top'));
        if (!checks_ui_container_element) {
            checks_ui_container_element = create_element('div', { class_name: 'checks-container audit-section' });
            checks_ui_container_element.addEventListener('checkOverallStatusChange', handle_check_item_component_event);
            checks_ui_container_element.addEventListener('passCriterionStatusChange', handle_check_item_component_event);
        } else { checks_ui_container_element.innerHTML = ''; }
        checks_ui_container_element.appendChild(create_element('h2', { text_content: t('checks_title') }));
        render_checks_section(checks_ui_container_element);
        plate_element.appendChild(checks_ui_container_element);

        const input_fields_container = create_element('div', { class_name: 'input-fields-container audit-section' });
        input_fields_container.appendChild(create_element('h2', { text_content: t('observations_and_comments_title')}));
        let fg, label_elem; // Bytte namn på 'label' för att undvika konflikt med labelKey
        const current_global_state_for_render = local_getState();
        const is_audit_locked_for_render = current_global_state_for_render && current_global_state_for_render.auditStatus === 'locked';
        
        fg = create_element('div', {class_name: 'form-group'});
        label_elem = create_element('label', {attributes: {for: 'actualObservation'}, text_content: t('actual_observation')});
        actual_observation_input = create_element('textarea', {id: 'actualObservation', class_name: 'form-control', attributes: {rows: '4'}});
        actual_observation_input.value = result_for_render.actualObservation || '';
        if (!is_audit_locked_for_render) actual_observation_input.addEventListener('input', auto_save_text_data);
        else { actual_observation_input.setAttribute('readonly', 'true'); actual_observation_input.classList.add('readonly-textarea'); }
        fg.appendChild(label_elem); fg.appendChild(actual_observation_input);
        input_fields_container.appendChild(fg);

        fg = create_element('div', {class_name: 'form-group'});
        label_elem = create_element('label', {attributes: {for: 'commentToAuditor'}, text_content: t('comment_to_auditor')});
        comment_to_auditor_input = create_element('textarea', {id: 'commentToAuditor', class_name: 'form-control', attributes: {rows: '3'}});
        comment_to_auditor_input.value = result_for_render.commentToAuditor || '';
        if (!is_audit_locked_for_render) comment_to_auditor_input.addEventListener('input', auto_save_text_data);
        else { comment_to_auditor_input.setAttribute('readonly', 'true'); comment_to_auditor_input.classList.add('readonly-textarea'); }
        fg.appendChild(label_elem); fg.appendChild(comment_to_auditor_input);
        input_fields_container.appendChild(fg);

        fg = create_element('div', {class_name: 'form-group'});
        label_elem = create_element('label', {attributes: {for: 'commentToActor'}, text_content: t('comment_to_actor')});
        comment_to_actor_input = create_element('textarea', {id: 'commentToActor', class_name: 'form-control', attributes: {rows: '3'}});
        comment_to_actor_input.value = result_for_render.commentToActor || '';
        if (!is_audit_locked_for_render) comment_to_actor_input.addEventListener('input', auto_save_text_data);
        else { comment_to_actor_input.setAttribute('readonly', 'true'); comment_to_actor_input.classList.add('readonly-textarea'); }
        fg.appendChild(label_elem); fg.appendChild(comment_to_actor_input);
        input_fields_container.appendChild(fg);
        plate_element.appendChild(input_fields_container);
        plate_element.appendChild(render_navigation_buttons('bottom'));
    }

    function destroy() { /* ... oförändrad ... */ }

    return { init, render, destroy };
})();