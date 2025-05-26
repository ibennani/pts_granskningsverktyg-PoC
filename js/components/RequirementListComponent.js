// file: js/components/RequirementListComponent.js

// NYTT: Importera specifika hjälpfunktioner
import { create_element, get_icon_svg, load_css, escape_html, add_protocol_if_missing } from '../../utils/helpers.js'; // Justerad sökväg

const RequirementListComponent_internal = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/requirement_list_component.css';
    let app_container_ref;
    let router_ref;
    let params_ref;

    let local_getState;
    // local_dispatch och local_StoreActionTypes behövs inte direkt här

    // Beroenden som används direkt av denna komponent
    let Translation_t_local;
    // Helpers-funktioner importeras nu direkt
    let NotificationComponent_clear_global_message_local;
    let NotificationComponent_get_global_message_element_reference_local;
    let AuditLogic_get_relevant_requirements_for_sample_local;
    let AuditLogic_calculate_requirement_status_local;

    let global_message_element_ref;
    let content_div_for_delegation = null;


    function get_t_func_local_scope() {
        if (Translation_t_local) return Translation_t_local;
        if (window.Translation && typeof window.Translation.t === 'function') {
            Translation_t_local = window.Translation.t;
            return Translation_t_local;
        }
        return (key, replacements) => `**${key}** (ReqList t not found)`;
    }

    // assign_globals_once tas bort

    function handle_requirement_list_click(event) {
        const target_button = event.target.closest('button.list-title-button[data-requirement-id]');

        if (target_button && router_ref && params_ref && params_ref.sampleId) {
            const requirement_id = target_button.dataset.requirementId;
            // console.log(`[RequirementListComponent] Navigating to requirement_audit. Sample ID: ${params_ref.sampleId}, Requirement ID from button: "${requirement_id}"`);
            router_ref('requirement_audit', { sampleId: params_ref.sampleId, requirementId: requirement_id });
        }
    }

    function create_navigation_bar_internal(is_bottom = false) { // Omdöpt för att undvika konflikt
        const t = get_t_func_local_scope();
        // Använd importerade create_element och get_icon_svg
        if (typeof create_element !== 'function' || typeof get_icon_svg !== 'function' || !t || !local_getState) return null;

        const nav_bar = create_element('div', { class_name: 'requirements-navigation-bar' });
        if (is_bottom) nav_bar.classList.add('bottom');

        const current_global_state = local_getState();
        let back_button_text_key = 'back_to_sample_management';
        let target_view = 'sample_management';

        if (current_global_state && current_global_state.auditStatus !== 'not_started') {
            back_button_text_key = 'back_to_audit_overview';
            target_view = 'audit_overview';
        } else if (current_global_state && current_global_state.auditStatus === 'not_started') {
            back_button_text_key = 'back_to_sample_management';
            target_view = 'sample_management';
        }

        const back_icon_svg = get_icon_svg('arrow_back', ['currentColor'], 18) || '';
        const back_button = create_element('button', {
            class_name: ['button', 'button-default'],
            html_content: `<span>${t(back_button_text_key)}</span>` + back_icon_svg
        });
        back_button.addEventListener('click', () => router_ref(target_view));
        nav_bar.appendChild(back_button);
        return nav_bar;
    }

    async function init(_app_container, _router_cb, _params, _getState, _dispatch, _StoreActionTypes) {
        app_container_ref = _app_container;
        router_ref = _router_cb;
        params_ref = _params;
        local_getState = _getState;
        // _dispatch och _StoreActionTypes sparas inte då de inte används direkt här

        // Tilldela lokala referenser
        if (window.Translation && typeof window.Translation.t === 'function') Translation_t_local = window.Translation.t;
        if (window.NotificationComponent) {
            NotificationComponent_clear_global_message_local = window.NotificationComponent.clear_global_message;
            NotificationComponent_get_global_message_element_reference_local = window.NotificationComponent.get_global_message_element_reference;
        }
        if (window.AuditLogic) {
            AuditLogic_get_relevant_requirements_for_sample_local = window.AuditLogic.get_relevant_requirements_for_sample;
            AuditLogic_calculate_requirement_status_local = window.AuditLogic.calculate_requirement_status;
        }


        if (!local_getState || !AuditLogic_get_relevant_requirements_for_sample_local || !AuditLogic_calculate_requirement_status_local) {
             console.error("[RequirementListComponent] CRITICAL: getState or AuditLogic functions not available post init.");
        }

        if (NotificationComponent_get_global_message_element_reference_local) {
            global_message_element_ref = NotificationComponent_get_global_message_element_reference_local();
        }
        // Använd importerad load_css
        if (typeof load_css === 'function') {
            try {
                const link_tag = document.querySelector(`link[href="${CSS_PATH}"]`);
                if (!link_tag) await load_css(CSS_PATH);
            }
            catch (error) { console.warn("Failed to load CSS for RequirementListComponent:", error); }
        } else {
            console.warn("[RequirementListComponent] load_css (importerad) not available.");
        }
    }

    function render() {
        const t = get_t_func_local_scope();
        // Använd importerade create_element, escape_html, add_protocol_if_missing
        if (!app_container_ref || typeof create_element !== 'function' || !t || !local_getState ||
            !AuditLogic_calculate_requirement_status_local || !AuditLogic_get_relevant_requirements_for_sample_local) {
            console.error("RequirementListComponent: Core dependencies missing for render.");
            if (app_container_ref) app_container_ref.innerHTML = `<p>${t('error_render_requirement_list_view')}</p>`;
            return;
        }

        const current_global_state = local_getState();
        if (!current_global_state || !current_global_state.ruleFileContent || !params_ref || !params_ref.sampleId) {
            if (app_container_ref) app_container_ref.innerHTML = `<p>${t('error_loading_data_for_view', {viewName: 'RequirementList'})}</p>`;
            const back_button_nav = create_navigation_bar_internal();
            if (back_button_nav && app_container_ref) app_container_ref.appendChild(back_button_nav);
            return;
        }

        const current_sample_object = current_global_state.samples.find(s => s.id === params_ref.sampleId);
        if (!current_sample_object) {
            if (app_container_ref) app_container_ref.innerHTML = `<p>${t('error_loading_data_for_view', {viewName: 'RequirementList_SampleNotFound'})}</p>`;
            const back_button_nav_sample = create_navigation_bar_internal();
            if (back_button_nav_sample && app_container_ref) app_container_ref.appendChild(back_button_nav_sample);
            return;
        }

        const relevant_requirements_list = AuditLogic_get_relevant_requirements_for_sample_local(current_global_state.ruleFileContent, current_sample_object);

        const requirements_by_category_map = {};
        if (relevant_requirements_list && relevant_requirements_list.length > 0) {
            relevant_requirements_list.forEach(req => {
                const main_cat_key_actual = req.metadata?.mainCategory?.id || 'uncategorized';
                const main_cat_text_for_grouping = req.metadata?.mainCategory?.text || t('uncategorized', {defaultValue: 'Uncategorized'});
                const main_cat_display_key = main_cat_text_for_grouping;
                if (!requirements_by_category_map[main_cat_display_key]) {
                    requirements_by_category_map[main_cat_display_key] = {
                        id: main_cat_key_actual, text: main_cat_text_for_grouping, subCategories: {}
                    };
                }
                const sub_cat_key_actual = req.metadata?.subCategory?.id || 'default_sub';
                const sub_cat_text_for_grouping = req.metadata?.subCategory?.text || t('other_requirements', {defaultValue: 'Other Requirements'});
                const sub_cat_display_key = sub_cat_text_for_grouping;
                if (!requirements_by_category_map[main_cat_display_key].subCategories[sub_cat_display_key]) {
                    requirements_by_category_map[main_cat_display_key].subCategories[sub_cat_display_key] = {
                        id: sub_cat_key_actual, text: sub_cat_text_for_grouping, requirements: []
                    };
                }
                requirements_by_category_map[main_cat_display_key].subCategories[sub_cat_display_key].requirements.push(req);
            });
            for (const main_cat_key in requirements_by_category_map) {
                for (const sub_cat_key in requirements_by_category_map[main_cat_key].subCategories) {
                    requirements_by_category_map[main_cat_key].subCategories[sub_cat_key].requirements.sort((a, b) => {
                        const title_a = a.title || ''; const title_b = b.title || '';
                        return title_a.localeCompare(title_b, undefined, { numeric: true, sensitivity: 'base' });
                    });
                }
            }
        }

        app_container_ref.innerHTML = '';
        const plate_element = create_element('div', { class_name: 'content-plate requirement-list-plate' });
        app_container_ref.appendChild(plate_element);

        if (global_message_element_ref) {
            plate_element.appendChild(global_message_element_ref);
            if (NotificationComponent_clear_global_message_local) NotificationComponent_clear_global_message_local();
        }

        const top_nav_bar = create_navigation_bar_internal();
        if (top_nav_bar) plate_element.appendChild(top_nav_bar);

        const header_div = create_element('div', { class_name: 'requirement-list-header' });
        header_div.appendChild(create_element('h1', { text_content: current_sample_object.description || t('undefined_description', {defaultValue: "Undefined Sample"}) }));

        const sample_type_p = create_element('p', { class_name: 'sample-info-display sample-page-type' });
        const esc_func = typeof escape_html === 'function' ? escape_html : (s) => s;
        sample_type_p.innerHTML = `<strong>${t('page_type')}:</strong> ${esc_func(current_sample_object.pageType)}`;
        header_div.appendChild(sample_type_p);

        let audited_requirements_count = 0;
        const total_relevant_requirements = relevant_requirements_list.length;
        relevant_requirements_list.forEach(req_obj_from_list => {
            const result_key = req_obj_from_list.key || req_obj_from_list.id;
            const result = current_sample_object.requirementResults ? current_sample_object.requirementResults[result_key] : null;
            const status = AuditLogic_calculate_requirement_status_local(req_obj_from_list, result);
            if (status === 'passed' || status === 'failed') {
                audited_requirements_count++;
            }
        });
        const sample_audit_status_p = create_element('p', { class_name: 'sample-info-display sample-audit-progress' });
        sample_audit_status_p.innerHTML = `<strong>${t('requirements_audited_for_sample', {defaultValue: 'Reviewed requirements'})}:</strong> ${audited_requirements_count}/${total_relevant_requirements}`;
        header_div.appendChild(sample_audit_status_p);

        if (window.ProgressBarComponent && typeof window.ProgressBarComponent.create === 'function') {
            const progress_bar = window.ProgressBarComponent.create(audited_requirements_count, total_relevant_requirements, {});
            header_div.appendChild(progress_bar);
        }
        plate_element.appendChild(header_div);

        if (!content_div_for_delegation) {
            content_div_for_delegation = create_element('div', { class_name: 'requirements-list-content' });
            content_div_for_delegation.addEventListener('click', handle_requirement_list_click);
        } else {
            content_div_for_delegation.innerHTML = '';
        }

        if (relevant_requirements_list.length === 0) {
            content_div_for_delegation.appendChild(create_element('p', { text_content: t('no_relevant_requirements_for_sample') }));
        } else {
            const sorted_main_category_keys = Object.keys(requirements_by_category_map).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
            sorted_main_category_keys.forEach(main_cat_key => {
                const main_cat = requirements_by_category_map[main_cat_key];
                const main_cat_group = create_element('div', {class_name: 'category-group'});
                main_cat_group.appendChild(create_element('h2', {class_name: 'main-category-title', text_content: main_cat.text}));
                const sorted_sub_category_keys = Object.keys(main_cat.subCategories).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
                sorted_sub_category_keys.forEach(sub_cat_key => {
                    const sub_cat = main_cat.subCategories[sub_cat_key];
                    main_cat_group.appendChild(create_element('h3', {class_name: 'sub-category-title', text_content: sub_cat.text}));
                    const req_ul = create_element('ul', {class_name: 'requirement-items-ul'});
                    sub_cat.requirements.forEach(req => {
                        const requirement_result_key = req.key || req.id;
                        const req_result_object = current_sample_object.requirementResults ? current_sample_object.requirementResults[requirement_result_key] : null;
                        const status = AuditLogic_calculate_requirement_status_local(req, req_result_object);
                        const li = create_element('li', {class_name: 'requirement-item compact-twoline'});
                        const title_row_div = create_element('div', { class_name: 'requirement-title-row' });
                        const title_h_container = create_element('h4', {class_name: 'requirement-title-container'});
                        const requirementIdentifierForButton = req.key || req.id;
                        const title_button = create_element('button', {
                            class_name: 'list-title-button',
                            text_content: req.title,
                            attributes: { 'data-requirement-id': requirementIdentifierForButton }
                        });
                        title_h_container.appendChild(title_button);
                        title_row_div.appendChild(title_h_container);
                        li.appendChild(title_row_div);
                        const details_row_div = create_element('div', { class_name: 'requirement-details-row' });
                        const status_indicator_wrapper = create_element('span', { class_name: 'requirement-status-indicator-wrapper' });
                        const status_indicator_span = create_element('span', {
                           class_name: ['status-indicator', `status-${status}`],
                           attributes: { 'aria-hidden': 'true' }
                        });
                        status_indicator_wrapper.appendChild(status_indicator_span);
                        status_indicator_wrapper.appendChild(document.createTextNode(` ${t('audit_status_' + status, {defaultValue: status})}`));
                        details_row_div.appendChild(status_indicator_wrapper);
                        const total_checks_count = req.checks ? req.checks.length : 0;
                        let audited_checks_count = 0;
                        if (req_result_object && req_result_object.checkResults && req.checks && window.AuditLogic && typeof window.AuditLogic.calculate_check_status === 'function') {
                             Object.keys(req_result_object.checkResults).forEach(check_id_from_data => {
                                const check_res_from_data = req_result_object.checkResults[check_id_from_data];
                                const check_definition_for_status = req.checks.find(c => c.id === check_id_from_data);
                                if (check_definition_for_status) {
                                    const single_check_status = window.AuditLogic.calculate_check_status(
                                        check_definition_for_status,
                                        check_res_from_data.passCriteria || {},
                                        check_res_from_data.overallStatus || 'not_audited'
                                    );
                                    if (single_check_status === 'passed' || single_check_status === 'failed') {
                                        audited_checks_count++;
                                    }
                                }
                            });
                        }
                        const checks_info_span = create_element('span', {
                            class_name: 'requirement-checks-info',
                            text_content: `(${audited_checks_count}/${total_checks_count} ${t('checks_short', {defaultValue: 'checks'})})`
                        });
                        details_row_div.appendChild(checks_info_span);
                        if (req.standardReference && req.standardReference.text) {
                            let reference_element;
                            if (req.standardReference.url && typeof add_protocol_if_missing === 'function') {
                                let url_to_use = add_protocol_if_missing(req.standardReference.url);
                                reference_element = create_element('a', {
                                    class_name: 'list-reference-link',
                                    text_content: req.standardReference.text,
                                    attributes: { href: url_to_use, target: '_blank', rel: 'noopener noreferrer' }
                                });
                            } else {
                                reference_element = create_element('span', {
                                    class_name: 'list-reference-text',
                                    text_content: req.standardReference.text
                                });
                            }
                            details_row_div.appendChild(reference_element);
                        }
                        li.appendChild(details_row_div);
                        req_ul.appendChild(li);
                    });
                    main_cat_group.appendChild(req_ul);
                });
                content_div_for_delegation.appendChild(main_cat_group);
            });
        }
        plate_element.appendChild(content_div_for_delegation);

        const bottom_nav_bar = create_navigation_bar_internal(true);
        if (bottom_nav_bar) plate_element.appendChild(bottom_nav_bar);
    }

    function destroy() {
        if (content_div_for_delegation) {
            content_div_for_delegation.removeEventListener('click', handle_requirement_list_click);
            content_div_for_delegation = null;
        }
        app_container_ref = null; router_ref = null; params_ref = null;
        global_message_element_ref = null;
        local_getState = null;
        Translation_t_local = null;
        NotificationComponent_clear_global_message_local = null;
        NotificationComponent_get_global_message_element_reference_local = null;
        AuditLogic_get_relevant_requirements_for_sample_local = null;
        AuditLogic_calculate_requirement_status_local = null;
    }

    return { init, render, destroy };
})();

export const RequirementListComponent = RequirementListComponent_internal;