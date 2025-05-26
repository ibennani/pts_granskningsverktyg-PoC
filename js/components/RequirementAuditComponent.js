// file: js/components/RequirementAuditComponent.js
import { CheckItemComponent } from './CheckItemComponent.js';
import { MetadataDisplayComponent } from './MetadataDisplayComponent.js';

// NYTT: Importera specifika hjälpfunktioner
import { create_element, get_icon_svg, load_css, escape_html, get_current_iso_datetime_utc, add_protocol_if_missing } from '../../utils/helpers.js'; // Justerad sökväg

export const RequirementAuditComponent = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/requirement_audit_component.css';
    let app_container_ref;
    let router_ref;
    let params_ref;

    let local_getState;
    let local_dispatch;
    let local_StoreActionTypes;

    // Beroenden som används direkt av denna komponent
    let Translation_t_local;
    // Helpers-funktioner importeras nu direkt
    let NotificationComponent_show_global_message_local;
    let NotificationComponent_clear_global_message_local;
    let NotificationComponent_get_global_message_element_reference_local;
    // AuditLogic-funktioner hämtas fortfarande från window.AuditLogic i init
    let AuditLogic_calculate_check_status_local;
    let AuditLogic_calculate_requirement_status_local;
    let AuditLogic_get_ordered_relevant_requirement_keys_local;
    let AuditLogic_find_first_incomplete_requirement_key_for_sample_local;

    let global_message_element_ref;

    let current_sample_object_from_store = null;
    let current_requirement_object_from_store = null;
    let current_requirement_result_for_view = null;

    let actual_observation_input, comment_to_auditor_input, comment_to_actor_input;
    let checks_ui_container_element = null;
    let requirement_status_display_element = null;

    let ordered_requirement_keys_for_sample = [];


    function get_t_func_local_scope() {
        if (Translation_t_local) return Translation_t_local;
        if (window.Translation && typeof window.Translation.t === 'function') {
            Translation_t_local = window.Translation.t;
            return Translation_t_local;
        }
        return (key, replacements) => `**${key}** (ReqAudit t not found)`;
    }

    // assign_globals_once tas bort

    async function init(_app_container, _router, _params, _getState, _dispatch, _StoreActionTypes) {
        app_container_ref = _app_container;
        router_ref = _router;
        params_ref = _params;
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
        if (window.AuditLogic) {
            AuditLogic_calculate_check_status_local = window.AuditLogic.calculate_check_status;
            AuditLogic_calculate_requirement_status_local = window.AuditLogic.calculate_requirement_status;
            AuditLogic_get_ordered_relevant_requirement_keys_local = window.AuditLogic.get_ordered_relevant_requirement_keys;
            AuditLogic_find_first_incomplete_requirement_key_for_sample_local = window.AuditLogic.find_first_incomplete_requirement_key_for_sample;
        }

        if (!local_StoreActionTypes || !local_StoreActionTypes.UPDATE_REQUIREMENT_RESULT) {
            console.error("[RequirementAuditComponent] CRITICAL: StoreActionTypes.UPDATE_REQUIREMENT_RESULT was not passed to init or is undefined. Using fallback.");
            local_StoreActionTypes = { ...local_StoreActionTypes, UPDATE_REQUIREMENT_RESULT: 'UPDATE_REQUIREMENT_RESULT_ERROR_FALLBACK' };
        }
        if (!AuditLogic_calculate_check_status_local || !AuditLogic_calculate_requirement_status_local || !AuditLogic_get_ordered_relevant_requirement_keys_local || !AuditLogic_find_first_incomplete_requirement_key_for_sample_local) {
            console.error("[RequirementAuditComponent] CRITICAL: One or more AuditLogic functions not available after init.");
        }


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
                console.warn("Failed to load CSS for RequirementAuditComponent:", error);
            }
        } else {
             console.warn("[RequirementAuditComponent] load_css (importerad) not available.");
        }
    }


    function handle_check_item_component_event(event) {
        const t = get_t_func_local_scope();
        if (!current_requirement_result_for_view || !current_requirement_object_from_store || !local_dispatch || !params_ref) {
            if (NotificationComponent_show_global_message_local) NotificationComponent_show_global_message_local(t('error_internal_data_structure_pc'), 'error');
            console.error("ReqAudit: Missing data or dispatch for handling check item event.");
            return;
        }

        const { checkId, newOverallStatus, currentOverallStatus, passCriterionId, newPcStatus, currentPassCriterionStatus } = event.detail;
        let modified_result_for_dispatch = JSON.parse(JSON.stringify(current_requirement_result_for_view));
        let check_result_to_modify = modified_result_for_dispatch.checkResults[checkId];

        if (!check_result_to_modify) {
            console.error(`[ReqAudit] Event for unknown checkId: ${checkId}`);
            modified_result_for_dispatch.checkResults[checkId] = { status: 'not_audited', overallStatus: 'not_audited', passCriteria: {} };
            check_result_to_modify = modified_result_for_dispatch.checkResults[checkId];
        }

        if (event.type === 'checkOverallStatusChange') {
            const check_definition = current_requirement_object_from_store.checks.find(c => c.id === checkId);
            if (currentOverallStatus === newOverallStatus) {
                check_result_to_modify.overallStatus = 'not_audited';
            } else {
                check_result_to_modify.overallStatus = newOverallStatus;
            }
            if (check_result_to_modify.overallStatus === 'failed' && check_definition && check_definition.passCriteria) {
                if (!check_result_to_modify.passCriteria) check_result_to_modify.passCriteria = {};
                check_definition.passCriteria.forEach(pc_def => {
                    check_result_to_modify.passCriteria[pc_def.id] = 'passed';
                });
            }
        } else if (event.type === 'passCriterionStatusChange') {
            if (check_result_to_modify.overallStatus === 'failed') {
                if (NotificationComponent_show_global_message_local) NotificationComponent_show_global_message_local(t('cannot_change_criteria_if_check_not_compliant'), 'warning');
                return;
            }
            if (check_result_to_modify.overallStatus === 'not_audited') {
                if (NotificationComponent_show_global_message_local) NotificationComponent_show_global_message_local(t('error_set_check_status_first', {defaultValue: "Please set the main check status first."}), 'warning');
                return;
            }
            if (!check_result_to_modify.passCriteria) check_result_to_modify.passCriteria = {};
            if (currentPassCriterionStatus === newPcStatus) {
                check_result_to_modify.passCriteria[passCriterionId] = 'not_audited';
            } else {
                check_result_to_modify.passCriteria[passCriterionId] = newPcStatus;
            }
        }

        const check_definition_for_calc = current_requirement_object_from_store.checks.find(c => c.id === checkId);
        if (check_definition_for_calc && AuditLogic_calculate_check_status_local) {
            check_result_to_modify.status = AuditLogic_calculate_check_status_local(
                check_definition_for_calc,
                check_result_to_modify.passCriteria || {},
                check_result_to_modify.overallStatus
            );
        }
        if (AuditLogic_calculate_requirement_status_local) {
            modified_result_for_dispatch.status = AuditLogic_calculate_requirement_status_local(current_requirement_object_from_store, modified_result_for_dispatch);
        }
        // Använd importerad get_current_iso_datetime_utc
        if (typeof get_current_iso_datetime_utc === 'function') modified_result_for_dispatch.lastStatusUpdate = get_current_iso_datetime_utc();

        if (!local_StoreActionTypes || !local_StoreActionTypes.UPDATE_REQUIREMENT_RESULT) {
            console.error("[RequirementAuditComponent] local_StoreActionTypes.UPDATE_REQUIREMENT_RESULT is undefined in handle_check_item_component_event!");
            if(NotificationComponent_show_global_message_local) NotificationComponent_show_global_message_local("Internal error: Action type for update result is missing.", "error");
            return;
        }
        local_dispatch({
            type: local_StoreActionTypes.UPDATE_REQUIREMENT_RESULT,
            payload: {
                sampleId: params_ref.sampleId,
                requirementId: params_ref.requirementId,
                newRequirementResult: modified_result_for_dispatch
            }
        });
    }

    function load_and_prepare_view_data() {
        const current_global_state = local_getState();
        current_sample_object_from_store = null;
        current_requirement_object_from_store = null;
        current_requirement_result_for_view = null;
        if (!current_global_state || !current_global_state.ruleFileContent ||
            !params_ref || !params_ref.sampleId || !params_ref.requirementId) {
            console.error("[RequirementAuditComponent] Missing global state, ruleFileContent, or params for loading data.");
            return false;
        }
        current_sample_object_from_store = current_global_state.samples.find(s => s.id === params_ref.sampleId);
        if (!current_sample_object_from_store) {
            console.error(`[RequirementAuditComponent] Sample with ID ${params_ref.sampleId} not found in store.`);
            return false;
        }
        if (!current_global_state.ruleFileContent.requirements) {
            console.error("[RequirementAuditComponent] ruleFileContent.requirements is missing from store.");
            return false;
        }
        const requirement_key_from_params = params_ref.requirementId;
        current_requirement_object_from_store = current_global_state.ruleFileContent.requirements[requirement_key_from_params];
        if (!current_requirement_object_from_store) {
            console.error(`[RequirementAuditComponent] Requirement with ID/key "${requirement_key_from_params}" NOT FOUND in ruleFileContent.requirements.`);
            return false;
        }
        const requirement_id_for_results_lookup = requirement_key_from_params;
        const result_from_store = (current_sample_object_from_store.requirementResults || {})[requirement_id_for_results_lookup];
        if (result_from_store) {
            current_requirement_result_for_view = JSON.parse(JSON.stringify(result_from_store));
        } else {
            current_requirement_result_for_view = {
                status: 'not_audited', actualObservation: '', commentToAuditor: '', commentToActor: '',
                lastStatusUpdate: null, checkResults: {}
            };
        }
        (current_requirement_object_from_store.checks || []).forEach(check_definition => {
            if (!current_requirement_result_for_view.checkResults[check_definition.id]) {
                current_requirement_result_for_view.checkResults[check_definition.id] = {
                    status: 'not_audited', overallStatus: 'not_audited', passCriteria: {}
                };
            } else {
                if (current_requirement_result_for_view.checkResults[check_definition.id].overallStatus === undefined) {
                    current_requirement_result_for_view.checkResults[check_definition.id].overallStatus = 'not_audited';
                }
                if (current_requirement_result_for_view.checkResults[check_definition.id].status === undefined && AuditLogic_calculate_check_status_local) {
                     current_requirement_result_for_view.checkResults[check_definition.id].status = AuditLogic_calculate_check_status_local(
                        check_definition,
                        current_requirement_result_for_view.checkResults[check_definition.id].passCriteria || {},
                        current_requirement_result_for_view.checkResults[check_definition.id].overallStatus
                    );
                }
                 if (current_requirement_result_for_view.checkResults[check_definition.id].passCriteria === undefined) {
                    current_requirement_result_for_view.checkResults[check_definition.id].passCriteria = {};
                }
            }
            (check_definition.passCriteria || []).forEach(pc_definition => {
                if (current_requirement_result_for_view.checkResults[check_definition.id].passCriteria[pc_definition.id] === undefined) {
                    current_requirement_result_for_view.checkResults[check_definition.id].passCriteria[pc_definition.id] = 'not_audited';
                }
            });
        });
        if (AuditLogic_get_ordered_relevant_requirement_keys_local) {
            ordered_requirement_keys_for_sample = AuditLogic_get_ordered_relevant_requirement_keys_local(current_global_state.ruleFileContent, current_sample_object_from_store);
        } else {
            ordered_requirement_keys_for_sample = [];
        }
        return true;
    }

    function auto_save_text_data() {
        if (!current_requirement_result_for_view || !local_dispatch || !params_ref) {
            return;
        }
        let modified_result_for_dispatch = JSON.parse(JSON.stringify(current_requirement_result_for_view));
        let changed = false;
        if (actual_observation_input && modified_result_for_dispatch.actualObservation !== actual_observation_input.value) {
            modified_result_for_dispatch.actualObservation = actual_observation_input.value; changed = true;
        }
        if (comment_to_auditor_input && modified_result_for_dispatch.commentToAuditor !== comment_to_auditor_input.value) {
            modified_result_for_dispatch.commentToAuditor = comment_to_auditor_input.value; changed = true;
        }
        if (comment_to_actor_input && modified_result_for_dispatch.commentToActor !== comment_to_actor_input.value) {
            modified_result_for_dispatch.commentToActor = comment_to_actor_input.value; changed = true;
        }
        if (changed) {
            // Använd importerad get_current_iso_datetime_utc
            if (typeof get_current_iso_datetime_utc === 'function') {
                modified_result_for_dispatch.lastStatusUpdate = get_current_iso_datetime_utc();
            }
            if (!local_StoreActionTypes || !local_StoreActionTypes.UPDATE_REQUIREMENT_RESULT) {
                console.error("[RequirementAuditComponent] local_StoreActionTypes.UPDATE_REQUIREMENT_RESULT is undefined in auto_save!");
                if(NotificationComponent_show_global_message_local) NotificationComponent_show_global_message_local("Internal error: Action type for update result is missing.", "error");
                return;
            }
            local_dispatch({
                type: local_StoreActionTypes.UPDATE_REQUIREMENT_RESULT,
                payload: {
                    sampleId: params_ref.sampleId,
                    requirementId: params_ref.requirementId,
                    newRequirementResult: modified_result_for_dispatch
                }
            });
        }
    }

    function render_audit_section_internal(title_key, content_data, parent_element) {
        const t = get_t_func_local_scope();
        // Använd importerad create_element och escape_html
        const esc_func = typeof escape_html === 'function' ? escape_html : (s) => s;

        if (content_data && ((typeof content_data === 'string' && content_data.trim() !== '') || (Array.isArray(content_data) && content_data.length > 0))) {
            const section = create_element('div', { class_name: 'audit-section' });
            section.appendChild(create_element('h2', { text_content: t(title_key) }));
            if (Array.isArray(content_data)) {
                const ul = create_element('ul');
                content_data.forEach(item_obj => {
                    const text_content = (typeof item_obj === 'object' && item_obj.text) ? item_obj.text : String(item_obj);
                    ul.appendChild(create_element('li', { html_content: esc_func(text_content).replace(/\n/g, '<br>') }));
                });
                section.appendChild(ul);
            } else {
                const p = create_element('p');
                p.innerHTML = esc_func(String(content_data)).replace(/\n/g, '<br>');
                section.appendChild(p);
            }
            parent_element.appendChild(section);
        }
    }

    function render_checks_section(container_element) {
        const t = get_t_func_local_scope();
        container_element.innerHTML = '';
        const current_global_state_for_render = local_getState();
        const is_audit_locked = current_global_state_for_render && current_global_state_for_render.auditStatus === 'locked';
        if (!current_requirement_object_from_store || !current_requirement_object_from_store.checks || current_requirement_object_from_store.checks.length === 0) {
            container_element.appendChild(create_element('p', { class_name: 'text-muted', text_content: t('no_checks_for_this_requirement') })); // Använd importerad
            return;
        }
        if (!current_requirement_result_for_view || !current_requirement_result_for_view.checkResults) {
            console.error("[ReqAudit] render_checks_section: current_requirement_result_for_view or its checkResults are missing.");
            container_element.appendChild(create_element('p', { text_content: "Error: Could not load check results data." })); // Använd importerad
            return;
        }
        current_requirement_object_from_store.checks.forEach(check_definition => {
            const check_result_data = current_requirement_result_for_view.checkResults[check_definition.id] ||
                                      { status: 'not_audited', overallStatus: 'not_audited', passCriteria: {} };
            const check_item_wrapper_element = create_element('div', { class_name: 'check-item-wrapper' }); // Använd importerad
            container_element.appendChild(check_item_wrapper_element);
            if (CheckItemComponent && typeof CheckItemComponent.init === 'function' && typeof CheckItemComponent.render === 'function') {
                CheckItemComponent.init(
                    check_item_wrapper_element, check_definition, check_result_data, is_audit_locked
                ).then(() => {
                    CheckItemComponent.render();
                }).catch(err => {
                    console.error(`[ReqAudit] Error initializing CheckItemComponent for check: ${check_definition.id}`, err);
                    check_item_wrapper_element.textContent = "Error: Could not load sub-component for this check.";
                });
            } else {
                console.error(`[ReqAudit] CheckItemComponent not available or not correctly structured for check: ${check_definition.id}`);
                check_item_wrapper_element.textContent = "Error: Could not load sub-component for this check.";
            }
        });
    }

    function get_current_requirement_index_in_ordered_list() { /* ... oförändrad ... */ 
        if (!ordered_requirement_keys_for_sample || ordered_requirement_keys_for_sample.length === 0 || !params_ref || !params_ref.requirementId) {
            return -1;
        }
        return ordered_requirement_keys_for_sample.indexOf(params_ref.requirementId);
    }
    function navigate_to_requirement_by_index(index) { /* ... oförändrad ... */ 
        if (current_sample_object_from_store && index >= 0 && index < ordered_requirement_keys_for_sample.length) {
            const new_requirement_key = ordered_requirement_keys_for_sample[index];
            router_ref('requirement_audit', { sampleId: current_sample_object_from_store.id, requirementId: new_requirement_key });
        }
    }
    function go_to_previous_requirement() { /* ... oförändrad ... */ 
         const current_index = get_current_requirement_index_in_ordered_list();
        if (current_index > 0) {
            navigate_to_requirement_by_index(current_index - 1);
        }
    }
    function go_to_next_requirement() { /* ... oförändrad ... */ 
        const current_index = get_current_requirement_index_in_ordered_list();
        if (current_index < ordered_requirement_keys_for_sample.length - 1) {
            navigate_to_requirement_by_index(current_index + 1);
        }
    }
    function find_next_unhandled_requirement_key() { /* ... oförändrad ... */  
        const current_index = get_current_requirement_index_in_ordered_list();
        if (current_index === -1 || !current_sample_object_from_store || !current_requirement_object_from_store) return null;
        const current_global_state_nav = local_getState();
        for (let i = current_index + 1; i < ordered_requirement_keys_for_sample.length; i++) {
            const req_key = ordered_requirement_keys_for_sample[i];
            const req_def = current_global_state_nav.ruleFileContent.requirements[req_key];
            const req_res = current_sample_object_from_store.requirementResults ? current_sample_object_from_store.requirementResults[req_key] : null;
            if (req_def && AuditLogic_calculate_requirement_status_local) {
                const status = AuditLogic_calculate_requirement_status_local(req_def, req_res);
                if (status === 'not_audited' || status === 'partially_audited') {
                    return req_key;
                }
            }
        }
        for (let i = 0; i < current_index; i++) {
            const req_key = ordered_requirement_keys_for_sample[i];
            const req_def = current_global_state_nav.ruleFileContent.requirements[req_key];
            const req_res = current_sample_object_from_store.requirementResults ? current_sample_object_from_store.requirementResults[req_key] : null;
            if (req_def && AuditLogic_calculate_requirement_status_local) {
                const status = AuditLogic_calculate_requirement_status_local(req_def, req_res);
                if (status === 'not_audited' || status === 'partially_audited') {
                    return req_key;
                }
            }
        }
        return null;
    }
    function go_to_next_unhandled_requirement() { /* ... oförändrad ... */   
        const t = get_t_func_local_scope();
        const next_unhandled_key = find_next_unhandled_requirement_key();
        if (next_unhandled_key && current_sample_object_from_store) {
            router_ref('requirement_audit', { sampleId: current_sample_object_from_store.id, requirementId: next_unhandled_key });
        } else {
            if (NotificationComponent_show_global_message_local) NotificationComponent_show_global_message_local(t('all_requirements_handled_for_sample'), 'info');
        }
    }

    function render_navigation_buttons(is_top_or_bottom = 'bottom') {
        const t = get_t_func_local_scope();
        // Använd importerade create_element och get_icon_svg
        const nav_buttons_div = create_element('div', { class_name: 'audit-navigation-buttons' });
        nav_buttons_div.classList.add(is_top_or_bottom === 'top' ? 'top-nav' : 'bottom-nav');
        const nav_group_left = create_element('div', { class_name: 'nav-group-left' });
        const nav_group_right = create_element('div', { class_name: 'nav-group-right' });
        const icon_back_svg = typeof get_icon_svg === 'function' ? get_icon_svg('arrow_back', ['currentColor'], 18) : '';
        const icon_forward_svg = typeof get_icon_svg === 'function' ? get_icon_svg('arrow_forward', ['currentColor'], 18) : '';
        const icon_forward_alt_svg = typeof get_icon_svg === 'function' ? get_icon_svg('arrow_forward_alt', ['currentColor'], 18) : '';

        const back_to_list_btn = create_element('button', {
            class_name: 'button button-default',
            html_content: icon_back_svg + `<span>${t('back_to_requirement_list')}</span>`
        });
        back_to_list_btn.addEventListener('click', () => router_ref('requirement_list', {sampleId: params_ref.sampleId}));
        nav_group_left.appendChild(back_to_list_btn);
        const current_global_state_for_nav = local_getState();
        const current_index = get_current_requirement_index_in_ordered_list();
        if (current_global_state_for_nav && current_global_state_for_nav.auditStatus !== 'locked') {
            if (current_index > 0) {
                const temp_prev_req_btn = create_element('button', {
                    class_name: 'button button-secondary',
                    html_content: icon_back_svg + `<span>${t('previous_requirement')}</span>`
                });
                temp_prev_req_btn.addEventListener('click', go_to_previous_requirement);
                nav_group_right.appendChild(temp_prev_req_btn);
            }
            if (current_index < ordered_requirement_keys_for_sample.length - 1) {
                const temp_next_req_btn = create_element('button', {
                    class_name: 'button button-secondary',
                    html_content: `<span>${t('next_requirement')}</span>` + icon_forward_svg
                });
                temp_next_req_btn.addEventListener('click', go_to_next_requirement);
                nav_group_right.appendChild(temp_next_req_btn);
            }
            if (AuditLogic_find_first_incomplete_requirement_key_for_sample_local) {
                const next_unhandled_key = AuditLogic_find_first_incomplete_requirement_key_for_sample_local(
                    current_global_state_for_nav.ruleFileContent,
                    current_sample_object_from_store
                );
                if (next_unhandled_key !== null) {
                     const temp_next_unhandled_btn = create_element('button', {
                        class_name: 'button button-primary',
                        html_content: `<span>${t('next_unhandled_requirement')}</span>` + icon_forward_alt_svg
                    });
                    temp_next_unhandled_btn.addEventListener('click', go_to_next_unhandled_requirement);
                    nav_group_right.appendChild(temp_next_unhandled_btn);
                }
            }
        }
        nav_buttons_div.appendChild(nav_group_left);
        if(nav_group_right.hasChildNodes()) nav_buttons_div.appendChild(nav_group_right);
        return nav_buttons_div;
    }

    function render() {
        const t = get_t_func_local_scope();
        // Använd importerade create_element, escape_html etc.
        if (!app_container_ref || typeof create_element !== 'function' || !t || !local_getState) {
            console.error("[ReqAudit] Core dependencies for render are missing.");
            if(app_container_ref) app_container_ref.innerHTML = `<p>${t('error_render_requirement_audit_view')}</p>`;
            return;
        }
        app_container_ref.innerHTML = '';
        if (!load_and_prepare_view_data()) {
            if (NotificationComponent_show_global_message_local) NotificationComponent_show_global_message_local(t('error_loading_sample_or_requirement_data'), "error");
            const back_button = create_element('button', {class_name: ['button', 'button-default'], text_content: t('back_to_requirement_list')});
            const sampleIdForBack = params_ref ? params_ref.sampleId : '';
            back_button.addEventListener('click', () => router_ref('requirement_list', { sampleId: sampleIdForBack }));
            app_container_ref.appendChild(back_button);
            return;
        }
        const req_for_render = current_requirement_object_from_store;
        const result_for_render = current_requirement_result_for_view;
        const plate_element = create_element('div', { class_name: 'content-plate requirement-audit-plate' });
        app_container_ref.appendChild(plate_element);
        if (global_message_element_ref) {
            plate_element.appendChild(global_message_element_ref);
            if(NotificationComponent_clear_global_message_local) NotificationComponent_clear_global_message_local();
        }
        const header_div = create_element('div', { class_name: 'requirement-audit-header' });
        header_div.appendChild(create_element('h1', { text_content: req_for_render.title }));
        if (req_for_render.standardReference && req_for_render.standardReference.text) {
            const ref_p = create_element('p', { class_name: 'standard-reference' });
            if (req_for_render.standardReference.url) {
                const link = create_element('a', {
                    text_content: req_for_render.standardReference.text,
                    attributes: { href: req_for_render.standardReference.url, target: '_blank', rel: 'noopener noreferrer' }
                });
                ref_p.appendChild(link);
            } else {
                ref_p.textContent = req_for_render.standardReference.text;
            }
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
            const esc_html_func = typeof escape_html === 'function' ? escape_html : s => s; // fallback

            const requirement_metadata_config = [
                { labelKey: 'main_category', valuePath: 'metadata.mainCategory.text', type: 'text', showWhenEmptyAs: { labelKey: 'value_not_set' } },
                { labelKey: 'sub_category', valuePath: 'metadata.subCategory.text', type: 'text', showWhenEmptyAs: { labelKey: 'value_not_set' } },
                {
                    labelKey: 'impact', valuePath: 'metadata.impact', type: 'text',
                    formatter: (impact_obj) => {
                        if (!impact_obj) return t('value_not_set', {defaultValue: '(Not set)'});
                        return impact_obj.isCritical ? t('critical') : t('impact_normal');
                    },
                    isVisibleWhen: (data) => data.metadata && data.metadata.impact
                }
            ];
            if (MetadataDisplayComponent && typeof MetadataDisplayComponent.init === 'function') {
                MetadataDisplayComponent.init(requirement_metadata_container, req_for_render, requirement_metadata_config, t, { create_element, escape_html, add_protocol_if_missing, format_iso_to_local_datetime }); // Skicka med importerade helpers
                MetadataDisplayComponent.render();
            } else {
                requirement_metadata_container.textContent = "Error: MetadataDisplayComponent not loaded.";
            }
        }

        plate_element.appendChild(render_navigation_buttons('top'));
        if (!checks_ui_container_element) {
            checks_ui_container_element = create_element('div', { class_name: 'checks-container audit-section' });
            checks_ui_container_element.addEventListener('checkOverallStatusChange', handle_check_item_component_event);
            checks_ui_container_element.addEventListener('passCriterionStatusChange', handle_check_item_component_event);
        } else {
            checks_ui_container_element.innerHTML = '';
        }
        checks_ui_container_element.appendChild(create_element('h2', { text_content: t('checks_title') }));
        render_checks_section(checks_ui_container_element);
        plate_element.appendChild(checks_ui_container_element);

        const input_fields_container = create_element('div', { class_name: 'input-fields-container audit-section' });
        input_fields_container.appendChild(create_element('h2', { text_content: t('observations_and_comments_title')}));
        let fg, label;
        const current_global_state_for_render = local_getState();
        const is_audit_locked_for_render = current_global_state_for_render && current_global_state_for_render.auditStatus === 'locked';
        fg = create_element('div', {class_name: 'form-group'});
        label = create_element('label', {attributes: {for: 'actualObservation'}, text_content: t('actual_observation')});
        actual_observation_input = create_element('textarea', {id: 'actualObservation', class_name: 'form-control', attributes: {rows: '4'}});
        actual_observation_input.value = result_for_render.actualObservation || '';
        if (!is_audit_locked_for_render) {
            actual_observation_input.addEventListener('input', auto_save_text_data);
        } else {
            actual_observation_input.setAttribute('readonly', 'true');
            actual_observation_input.classList.add('readonly-textarea');
        }
        fg.appendChild(label); fg.appendChild(actual_observation_input);
        input_fields_container.appendChild(fg);
        fg = create_element('div', {class_name: 'form-group'});
        label = create_element('label', {attributes: {for: 'commentToAuditor'}, text_content: t('comment_to_auditor')});
        comment_to_auditor_input = create_element('textarea', {id: 'commentToAuditor', class_name: 'form-control', attributes: {rows: '3'}});
        comment_to_auditor_input.value = result_for_render.commentToAuditor || '';
        if (!is_audit_locked_for_render) {
            comment_to_auditor_input.addEventListener('input', auto_save_text_data);
        } else {
            comment_to_auditor_input.setAttribute('readonly', 'true');
            comment_to_auditor_input.classList.add('readonly-textarea');
        }
        fg.appendChild(label); fg.appendChild(comment_to_auditor_input);
        input_fields_container.appendChild(fg);
        fg = create_element('div', {class_name: 'form-group'});
        label = create_element('label', {attributes: {for: 'commentToActor'}, text_content: t('comment_to_actor')});
        comment_to_actor_input = create_element('textarea', {id: 'commentToActor', class_name: 'form-control', attributes: {rows: '3'}});
        comment_to_actor_input.value = result_for_render.commentToActor || '';
        if (!is_audit_locked_for_render) {
            comment_to_actor_input.addEventListener('input', auto_save_text_data);
        } else {
            comment_to_actor_input.setAttribute('readonly', 'true');
            comment_to_actor_input.classList.add('readonly-textarea');
        }
        fg.appendChild(label); fg.appendChild(comment_to_actor_input);
        input_fields_container.appendChild(fg);
        plate_element.appendChild(input_fields_container);
        plate_element.appendChild(render_navigation_buttons('bottom'));
    }

    function destroy() { /* ... oförändrad ... */ 
        if (actual_observation_input) actual_observation_input.removeEventListener('input', auto_save_text_data);
        if (comment_to_auditor_input) comment_to_auditor_input.removeEventListener('input', auto_save_text_data);
        if (comment_to_actor_input) comment_to_actor_input.removeEventListener('input', auto_save_text_data);
        if (checks_ui_container_element) {
            checks_ui_container_element.removeEventListener('checkOverallStatusChange', handle_check_item_component_event);
            checks_ui_container_element.removeEventListener('passCriterionStatusChange', handle_check_item_component_event);
            checks_ui_container_element = null;
        }
        current_sample_object_from_store = null; current_requirement_object_from_store = null; current_requirement_result_for_view = null;
        actual_observation_input = null; comment_to_auditor_input = null; comment_to_actor_input = null;
        global_message_element_ref = null; requirement_status_display_element = null;
        ordered_requirement_keys_for_sample = [];
        local_getState = null; local_dispatch = null; local_StoreActionTypes = null;
        Translation_t_local = null;
        NotificationComponent_show_global_message_local = null; NotificationComponent_clear_global_message_local = null; NotificationComponent_get_global_message_element_reference_local = null;
        AuditLogic_calculate_check_status_local = null; AuditLogic_calculate_requirement_status_local = null; AuditLogic_get_ordered_relevant_requirement_keys_local = null; AuditLogic_find_first_incomplete_requirement_key_for_sample_local = null;
    }

    return { init, render, destroy };
})();