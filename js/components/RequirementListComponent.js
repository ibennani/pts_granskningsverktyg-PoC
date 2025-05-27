// file: js/components/RequirementListComponent.js

import { create_element, get_icon_svg, load_css, escape_html, add_protocol_if_missing } from '../utils/helpers.js';
import { get_relevant_requirements_for_sample, calculate_requirement_status, calculate_check_status } from '../audit_logic.js';
import { create_progress_bar_component } from './ProgressBarComponent.js';
import { t } from '../translation_logic.js';
import { RequirementCardComponent } from './RequirementCardComponent.js';
import { clear_global_message, get_global_message_element_reference } from './NotificationComponent.js';


const RequirementListComponent_internal = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/requirement_list_component.css';
    let app_container_ref;
    let router_ref;
    let params_ref;
    let local_getState;

    let global_message_element_ref_local;
    let content_div_for_delegation = null;


    function handle_requirement_list_click(event) {
        const target_button = event.target.closest('button.list-title-button[data-requirement-id]');
        if (target_button && router_ref && params_ref && params_ref.sampleId) {
            const requirement_id = target_button.dataset.requirementId;
            router_ref('requirement_audit', { sampleId: params_ref.sampleId, requirementId: requirement_id });
        }
    }

    function create_navigation_bar_internal(is_bottom = false) {
        if (typeof create_element !== 'function' || typeof get_icon_svg !== 'function' || typeof t !== 'function' || !local_getState) return null;

        const nav_bar = create_element('div', { class_name: 'requirements-navigation-bar' });
        if (is_bottom) nav_bar.classList.add('bottom');
        const current_global_state = local_getState();
        let back_button_text_key = 'back_to_sample_management';
        let target_view = 'sample_management';

        if (current_global_state && current_global_state.auditStatus !== 'not_started') {
            back_button_text_key = 'back_to_audit_overview';
            target_view = 'audit_overview';
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
        app_container_ref = _app_container; router_ref = _router_cb; params_ref = _params; local_getState = _getState;

        if (!local_getState) {
             console.error("[RequirementListComponent] CRITICAL: getState function not available post init.");
        }
        if (typeof get_relevant_requirements_for_sample !== 'function' ||
            typeof calculate_requirement_status !== 'function' ||
            typeof calculate_check_status !== 'function') {
            console.error("[RequirementListComponent] CRITICAL: One or more AuditLogic functions (importerade) not available.");
        }
        if (typeof get_global_message_element_reference !== 'function' || typeof clear_global_message !== 'function') {
            console.warn("[RequirementListComponent] Notification functions (importerade) not fully available.");
        }


        if (typeof get_global_message_element_reference === 'function') {
            global_message_element_ref_local = get_global_message_element_reference();
        }

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

    async function render() {
        if (!app_container_ref || typeof create_element !== 'function' || typeof t !== 'function' || !local_getState ||
            typeof calculate_requirement_status !== 'function' || typeof get_relevant_requirements_for_sample !== 'function' ||
            typeof calculate_check_status !== 'function' || typeof create_progress_bar_component !== 'function') {
            console.error("RequirementListComponent: Core dependencies missing for render.");
            if (app_container_ref) app_container_ref.innerHTML = `<p>${t ? t('error_render_requirement_list_view') : 'Error rendering view.'}</p>`;
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

        const relevant_requirements_list = get_relevant_requirements_for_sample(current_global_state.ruleFileContent, current_sample_object);
        const requirements_by_category_map = {};
        if (relevant_requirements_list && relevant_requirements_list.length > 0) {
            relevant_requirements_list.forEach(req => {
                const main_cat_key_actual = req.metadata?.mainCategory?.id || 'uncategorized';
                const main_cat_text_for_grouping = req.metadata?.mainCategory?.text || t('uncategorized', {defaultValue: 'Uncategorized'});
                const main_cat_display_key = main_cat_text_for_grouping;
                if (!requirements_by_category_map[main_cat_display_key]) {
                    requirements_by_category_map[main_cat_display_key] = { id: main_cat_key_actual, text: main_cat_text_for_grouping, subCategories: {} };
                }
                const sub_cat_key_actual = req.metadata?.subCategory?.id || 'default_sub';
                const sub_cat_text_for_grouping = req.metadata?.subCategory?.text || t('other_requirements', {defaultValue: 'Other Requirements'});
                const sub_cat_display_key = sub_cat_text_for_grouping;
                if (!requirements_by_category_map[main_cat_display_key].subCategories[sub_cat_display_key]) {
                    requirements_by_category_map[main_cat_display_key].subCategories[sub_cat_display_key] = { id: sub_cat_key_actual, text: sub_cat_text_for_grouping, requirements: [] };
                }
                requirements_by_category_map[main_cat_display_key].subCategories[sub_cat_display_key].requirements.push(req);
            });
            for (const main_cat_key in requirements_by_category_map) {
                for (const sub_cat_key in requirements_by_category_map[main_cat_key].subCategories) {
                    requirements_by_category_map[main_cat_key].subCategories[sub_cat_key].requirements.sort((a,b) => (a.title||'').localeCompare(b.title||'',undefined,{numeric:true,sensitivity:'base'}));
                }
            }
        }

        app_container_ref.innerHTML = '';
        const plate_element = create_element('div', { class_name: 'content-plate requirement-list-plate' });
        app_container_ref.appendChild(plate_element);

        if (global_message_element_ref_local) {
            plate_element.appendChild(global_message_element_ref_local);
            if (typeof clear_global_message === 'function') {
                clear_global_message();
            }
        }

        const top_nav_bar = create_navigation_bar_internal();
        if (top_nav_bar) plate_element.appendChild(top_nav_bar);

        const header_div = create_element('div', { class_name: 'requirement-list-header' });
        header_div.appendChild(create_element('h1', { text_content: current_sample_object.description || t('undefined_description') }));
        const esc_func = typeof escape_html === 'function' ? escape_html : (s) => s;
        const sample_type_p = create_element('p', { class_name: 'sample-info-display sample-page-type' });
        sample_type_p.innerHTML = `<strong>${t('page_type')}:</strong> ${esc_func(current_sample_object.pageType)}`;
        header_div.appendChild(sample_type_p);

        let audited_requirements_count = 0;
        const total_relevant_requirements = relevant_requirements_list.length;
        relevant_requirements_list.forEach(req_obj => {
            const result_key = req_obj.key || req_obj.id;
            const result = (current_sample_object.requirementResults || {})[result_key];
            const status = calculate_requirement_status(req_obj, result);
            if (status === 'passed' || status === 'failed') audited_requirements_count++;
        });
        const sample_audit_status_p = create_element('p', { class_name: 'sample-info-display sample-audit-progress' });
        sample_audit_status_p.innerHTML = `<strong>${t('requirements_audited_for_sample')}:</strong> ${audited_requirements_count}/${total_relevant_requirements}`;
        header_div.appendChild(sample_audit_status_p);

        if (typeof create_progress_bar_component === 'function') {
            const progress_bar = await create_progress_bar_component(audited_requirements_count, total_relevant_requirements, {});
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
            const sorted_main_category_keys = Object.keys(requirements_by_category_map).sort((a,b) => a.localeCompare(b,undefined,{numeric:true,sensitivity:'base'}));
            // const card_promises = []; // UTKOMMENTERAD FÖR TEST

            sorted_main_category_keys.forEach(main_cat_key => {
                const main_cat = requirements_by_category_map[main_cat_key];
                const main_cat_group = create_element('div', {class_name: 'category-group'});
                main_cat_group.appendChild(create_element('h2', {class_name: 'main-category-title', text_content: main_cat.text}));
                const sorted_sub_category_keys = Object.keys(main_cat.subCategories).sort((a,b) => a.localeCompare(b,undefined,{numeric:true,sensitivity:'base'}));
                
                sorted_sub_category_keys.forEach(sub_cat_key => {
                    const sub_cat = main_cat.subCategories[sub_cat_key];
                    main_cat_group.appendChild(create_element('h3', {class_name: 'sub-category-title', text_content: sub_cat.text}));
                    const req_ul = create_element('ul', {class_name: 'requirement-items-ul'});
                    
                    sub_cat.requirements.forEach(req => {
                        // ---- START PÅ UTKOMMENTERAD DEL ----
                        console.log(`[RequirementListComponent] SKULLE skapa kort för: ${req.title} (ID: ${req.key || req.id})`);
                        const temp_li = create_element('li', {text_content: `(Kort för: ${req.title})`});
                        req_ul.appendChild(temp_li);
                        /*
                        const requirement_result_key = req.key || req.id;
                        const req_result_object = current_sample_object.requirementResults ? current_sample_object.requirementResults[requirement_result_key] : null;
                        const status = calculate_requirement_status(req, req_result_object);
                        
                        if (RequirementCardComponent && typeof RequirementCardComponent.create === 'function') {
                            const card_promise = RequirementCardComponent.create(req, current_sample_object.id, status, router_ref)
                                .then(card_element => {
                                    req_ul.appendChild(card_element);
                                })
                                .catch(err => {
                                    console.error("Error creating requirement card. Full error object:", err); 
                                    console.error("Stack trace for card error:", err.stack); 
                                    const error_li = create_element('li', { text_content: `Error creating card for: ${req.title}. Details in console.`});
                                    req_ul.appendChild(error_li);
                                });
                            card_promises.push(card_promise);
                        } else {
                            console.error("RequirementCardComponent or its create method is not available.");
                            const fallback_li = create_element('li', {text_content: `Fallback: ${req.title}`});
                            req_ul.appendChild(fallback_li);
                        }
                        */
                        // ---- SLUT PÅ UTKOMMENTERAD DEL ----
                    });
                    main_cat_group.appendChild(req_ul);
                });
                content_div_for_delegation.appendChild(main_cat_group);
            });
            
            // UTKOMMENTERAD FÖR TEST:
            // await Promise.all(card_promises).catch(err => {
            //     console.error("Error during rendering of all requirement cards in list:", err);
            // });
        }
        plate_element.appendChild(content_div_for_delegation);
        
        const bottom_nav_bar = create_navigation_bar_internal(true);
        if (bottom_nav_bar) plate_element.appendChild(bottom_nav_bar);
    }

    function destroy() {
        if (content_div_for_delegation) { content_div_for_delegation.removeEventListener('click', handle_requirement_list_click); content_div_for_delegation = null; }
        app_container_ref = null; router_ref = null; params_ref = null;
        global_message_element_ref_local = null;
        local_getState = null;
    }

    return { init, render, destroy };
})();

export const RequirementListComponent = RequirementListComponent_internal;