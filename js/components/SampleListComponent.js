// js/components/SampleListComponent.js

// NYTT: Importera specifika hjälpfunktioner
import { create_element, get_icon_svg, load_css, escape_html, add_protocol_if_missing } from '../../utils/helpers.js'; // Justerad sökväg

const SampleListComponent_internal = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/sample_list_component.css';
    let list_container_ref;
    let on_edit_callback;
    let on_delete_callback;
    let router_ref_from_parent;

    let local_getState;

    // Beroenden som används direkt av denna komponent
    let Translation_t_local;
    // Helpers-funktioner importeras nu direkt
    // AuditLogic-funktioner kommer fortfarande från globala window.AuditLogic
    let AuditLogic_get_relevant_requirements_for_sample_local;
    let AuditLogic_find_first_incomplete_requirement_key_for_sample_local;
    let AuditLogic_calculate_requirement_status_local;

    let ul_element_for_delegation = null;

    function get_t_func_local_scope() {
        if (Translation_t_local) return Translation_t_local;
        if (window.Translation && typeof window.Translation.t === 'function') {
            Translation_t_local = window.Translation.t;
            return Translation_t_local;
        }
        return (key, replacements) => `**${key}** (SampleList t not found)`;
    }

    // assign_globals_once tas bort

    function handle_list_click(event) {
        const t = get_t_func_local_scope();
        const target = event.target;

        const current_global_state = local_getState ? local_getState() : null;
        if (!current_global_state) {
            console.warn("[SampleListComponent] handle_list_click: Could not get current state via local_getState.");
            return;
        }

        const action_button = target.closest('button[data-action]');
        if (!action_button) return;

        const sample_list_item_element = action_button.closest('.sample-list-item[data-sample-id]');
        if (!sample_list_item_element) return;

        const sample_id = sample_list_item_element.dataset.sampleId;
        const action = action_button.dataset.action;
        const sample = current_global_state.samples.find(s => s.id === sample_id);

        if (!sample) {
            console.warn(`SampleList: Could not find sample with ID ${sample_id} for action ${action} in current state.`);
            return;
        }
        // console.log(`[SampleListComponent] Clicked action "${action}" for sample ID "${sample_id}"`);

        switch (action) {
            case 'edit-sample':
                if (typeof on_edit_callback === 'function') {
                    on_edit_callback(sample_id);
                }
                break;
            case 'delete-sample':
                if (typeof on_delete_callback === 'function') {
                    on_delete_callback(sample_id);
                }
                break;
            case 'view-requirements':
                if (router_ref_from_parent) {
                    router_ref_from_parent('requirement_list', { sampleId: sample_id });
                }
                break;
            case 'visit-url':
                if (sample.url && typeof add_protocol_if_missing === 'function') { // Använd importerad
                    window.open(add_protocol_if_missing(sample.url), '_blank', 'noopener,noreferrer');
                } else if (sample.url) { // Fallback om importerad funktion saknas
                    window.open(sample.url.startsWith('http') ? sample.url : `https://${sample.url}`, '_blank', 'noopener,noreferrer');
                }
                break;
            case 'review-sample':
                if (router_ref_from_parent && current_global_state.ruleFileContent && AuditLogic_find_first_incomplete_requirement_key_for_sample_local) {
                    const first_incomplete_req_key = AuditLogic_find_first_incomplete_requirement_key_for_sample_local(current_global_state.ruleFileContent, sample);
                    if (first_incomplete_req_key) {
                        router_ref_from_parent('requirement_audit', { sampleId: sample.id, requirementId: first_incomplete_req_key });
                    } else {
                        router_ref_from_parent('requirement_list', { sampleId: sample.id });
                    }
                }
                break;
        }
    }

    async function init(
        _list_container,
        _on_edit_cb,
        _on_delete_cb,
        _router_cb,
        _getState
    ) {
        list_container_ref = _list_container;
        on_edit_callback = _on_edit_cb;
        on_delete_callback = _on_delete_cb;
        router_ref_from_parent = _router_cb;
        local_getState = _getState;

        // Tilldela lokala referenser
        if (window.Translation && typeof window.Translation.t === 'function') Translation_t_local = window.Translation.t;
        if (window.AuditLogic) {
            AuditLogic_get_relevant_requirements_for_sample_local = window.AuditLogic.get_relevant_requirements_for_sample;
            AuditLogic_find_first_incomplete_requirement_key_for_sample_local = window.AuditLogic.find_first_incomplete_requirement_key_for_sample;
            AuditLogic_calculate_requirement_status_local = window.AuditLogic.calculate_requirement_status;
        }

        if (!local_getState) {
            console.error("[SampleListComponent] CRITICAL: getState function not passed correctly during init.");
        }
        if (!AuditLogic_get_relevant_requirements_for_sample_local || !AuditLogic_find_first_incomplete_requirement_key_for_sample_local || !AuditLogic_calculate_requirement_status_local) {
            console.error("[SampleListComponent] CRITICAL: One or more AuditLogic functions not available.");
        }


        if (typeof load_css === 'function') { // Använd importerad
            try {
                const link_tag = document.querySelector(`link[href="${CSS_PATH}"]`);
                if (!link_tag) {
                    await load_css(CSS_PATH);
                }
            } catch (error) {
                console.warn("Failed to load CSS for SampleListComponent:", error);
            }
        } else {
            console.warn("[SampleListComponent] load_css (importerad) not available.");
        }
        // console.log("[SampleListComponent] Init complete.");
    }

    function render() {
        const t = get_t_func_local_scope();

        if (!list_container_ref || !t || !local_getState || typeof create_element !== 'function' || // Använd importerad create_element
            !AuditLogic_get_relevant_requirements_for_sample_local || !AuditLogic_calculate_requirement_status_local) {
            console.error("SampleListComponent: Core dependencies missing for render. Has init completed successfully?");
            if (list_container_ref) list_container_ref.innerHTML = `<p>${t('error_render_component', {componentName: 'SampleList'})}</p>`;
            return;
        }
        list_container_ref.innerHTML = '';

        const current_global_state = local_getState();
        if (!current_global_state || !current_global_state.ruleFileContent) {
             list_container_ref.textContent = t('error_audit_data_missing_for_list');
             return;
        }
        if (!current_global_state.samples || current_global_state.samples.length === 0) {
            const no_samples_msg = create_element('p', { // Använd importerad
                class_name: 'no-samples-message',
                text_content: t('no_samples_added')
            });
            list_container_ref.appendChild(no_samples_msg);
            return;
        }

        if (!ul_element_for_delegation) {
            ul_element_for_delegation = create_element('ul', { class_name: 'sample-list item-list' }); // Använd importerad
            ul_element_for_delegation.addEventListener('click', handle_list_click);
        } else {
            ul_element_for_delegation.innerHTML = '';
        }

        const can_edit_or_delete = current_global_state.auditStatus === 'not_started' || current_global_state.auditStatus === 'in_progress';

        current_global_state.samples.forEach(sample => {
            const li = create_element('li', { // Använd importerad
                class_name: 'sample-list-item item-list-item',
                attributes: {'data-sample-id': sample.id}
            });

            const info_div = create_element('div', { class_name: 'sample-info' }); // Använd importerad
            const desc_h3 = create_element('h3', { text_content: sample.description || t('undefined_description', {defaultValue: "Undefined description"}) }); // Använd importerad
            const type_p = create_element('p'); // Använd importerad
            type_p.innerHTML = `<strong>${t('page_type')}:</strong> ${typeof escape_html === 'function' ? escape_html(sample.pageType) : sample.pageType}`; // Använd importerad
            info_div.appendChild(desc_h3);
            info_div.appendChild(type_p);

            if(sample.url && typeof add_protocol_if_missing === 'function' && typeof escape_html === 'function') { // Använd importerade
                const url_p = create_element('p');
                const safe_url = add_protocol_if_missing(sample.url);
                url_p.innerHTML = `<strong>${t('url')}:</strong> <a href="${escape_html(safe_url)}" target="_blank" rel="noopener noreferrer" title="${t('visit_url')}: ${escape_html(sample.url)}">${escape_html(sample.url)}</a>`;
                info_div.appendChild(url_p);
            }

            const relevant_reqs_for_sample_list_info = AuditLogic_get_relevant_requirements_for_sample_local(current_global_state.ruleFileContent, sample);
            const total_relevant_reqs_info = relevant_reqs_for_sample_list_info.length;
            let audited_reqs_count_info = 0;

            relevant_reqs_for_sample_list_info.forEach(req_definition_from_list => {
                const req_object_from_rulefile = current_global_state.ruleFileContent.requirements[req_definition_from_list.id] || current_global_state.ruleFileContent.requirements[req_definition_from_list.key];
                const req_result_from_sample = sample.requirementResults ? sample.requirementResults[req_definition_from_list.id] || sample.requirementResults[req_definition_from_list.key] : null;

                if (req_object_from_rulefile && AuditLogic_calculate_requirement_status_local) {
                    const req_status = AuditLogic_calculate_requirement_status_local(req_object_from_rulefile, req_result_from_sample);
                    if (req_status === 'passed' || req_status === 'failed') {
                        audited_reqs_count_info++;
                    }
                }
            });

            const progress_p = create_element('p'); // Använd importerad
            progress_p.innerHTML = `<strong>${t('requirements_audited')}:</strong> ${audited_reqs_count_info} / ${total_relevant_reqs_info}`;
            info_div.appendChild(progress_p);

            if (window.ProgressBarComponent && typeof window.ProgressBarComponent.create === 'function') {
                const progress_bar = window.ProgressBarComponent.create(audited_reqs_count_info, total_relevant_reqs_info, {});
                info_div.appendChild(progress_bar);
            }
            if (sample.selectedContentTypes && sample.selectedContentTypes.length > 0 &&
                current_global_state.ruleFileContent.metadata && current_global_state.ruleFileContent.metadata.contentTypes) {
                const content_types_div = create_element('div', { class_name: 'content-types-display' }); // Använd importerad
                const content_types_strong = create_element('strong', { text_content: t('content_types') + ':'}); // Använd importerad
                const content_types_ul = create_element('ul'); // Använd importerad
                sample.selectedContentTypes.forEach(ct_id => {
                    const ct_object = current_global_state.ruleFileContent.metadata.contentTypes.find(c => c.id === ct_id);
                    const ct_text = ct_object ? ct_object.text : ct_id;
                    content_types_ul.appendChild(create_element('li', { text_content: typeof escape_html === 'function' ? escape_html(ct_text) : ct_text })); // Använd importerad
                });
                content_types_div.appendChild(content_types_strong);
                content_types_div.appendChild(content_types_ul);
                info_div.appendChild(content_types_div);
            }
            li.appendChild(info_div);


            const actions_wrapper_div = create_element('div', { class_name: 'sample-actions-wrapper' }); // Använd importerad
            const main_actions_div = create_element('div', { class_name: 'sample-actions-main' }); // Använd importerad
            const delete_actions_div = create_element('div', { class_name: 'sample-actions-delete' }); // Använd importerad
            const icon_list_svg = typeof get_icon_svg === 'function' ? get_icon_svg('list', ['currentColor'], 16) : '';
            const icon_visit_url_svg = typeof get_icon_svg === 'function' ? get_icon_svg('visit_url', ['currentColor'], 16) : '';
            const icon_audit_sample_svg = typeof get_icon_svg === 'function' ? get_icon_svg('audit_sample', ['currentColor'], 16) : '';
            const icon_edit_svg = typeof get_icon_svg === 'function' ? get_icon_svg('edit', ['currentColor'], 16) : '';
            const icon_delete_svg = typeof get_icon_svg === 'function' ? get_icon_svg('delete', ['currentColor'], 16) : '';


            const total_relevant_reqs = relevant_reqs_for_sample_list_info.length;

            if (total_relevant_reqs > 0) {
                const view_reqs_button = create_element('button', { // Använd importerad
                    class_name: ['button', 'button-secondary', 'button-small'],
                    attributes: { 'data-action': 'view-requirements', 'aria-label': `${t('view_all_requirements_button')}: ${sample.description}` },
                    html_content: `<span>${t('view_all_requirements_button')}</span>` + icon_list_svg
                });
                main_actions_div.appendChild(view_reqs_button);
            } else {
                 const no_reqs_info = create_element('span', {class_name: 'text-muted button-small', text_content: t('no_relevant_requirements_for_sample_short', {defaultValue: "(No relevant requirements)"})}); // Använd importerad
                 main_actions_div.appendChild(no_reqs_info);
            }

            if (sample.url) {
                const visit_button = create_element('button', { // Använd importerad
                    class_name: ['button', 'button-secondary', 'button-small'],
                    attributes: { 'data-action': 'visit-url', 'aria-label': `${t('visit_url')}: ${sample.description}` },
                    html_content: `<span>${t('visit_url')}</span>` + icon_visit_url_svg
                });
                main_actions_div.appendChild(visit_button);
            }

            if (current_global_state.auditStatus === 'in_progress' && total_relevant_reqs > 0 && AuditLogic_find_first_incomplete_requirement_key_for_sample_local) {
                const first_incomplete_req_key = AuditLogic_find_first_incomplete_requirement_key_for_sample_local(current_global_state.ruleFileContent, sample);
                let review_button_text_key = first_incomplete_req_key ? 'audit_next_incomplete_requirement' : 'view_audited_sample';

                const review_button = create_element('button', { // Använd importerad
                    class_name: ['button', 'button-primary', 'button-small'],
                    attributes: { 'data-action': 'review-sample', 'aria-label': `${t(review_button_text_key)}: ${sample.description}` },
                    html_content: `<span>${t(review_button_text_key)}</span>` + icon_audit_sample_svg
                });
                main_actions_div.appendChild(review_button);
            }

            if (can_edit_or_delete && typeof on_edit_callback === 'function') {
                const edit_button = create_element('button', { // Använd importerad
                    class_name: ['button', 'button-default', 'button-small'],
                    attributes: { 'data-action': 'edit-sample', 'aria-label': `${t('edit_sample')}: ${sample.description}` },
                    html_content: `<span>${t('edit_sample')}</span>` + icon_edit_svg
                });
                if (main_actions_div.firstChild) {
                    main_actions_div.insertBefore(edit_button, main_actions_div.firstChild);
                } else {
                    main_actions_div.appendChild(edit_button);
                }
            }

            if (can_edit_or_delete && typeof on_delete_callback === 'function' && current_global_state.samples.length > 1) {
                const delete_button = create_element('button', { // Använd importerad
                    class_name: ['button', 'button-danger', 'button-small'],
                    attributes: { 'data-action': 'delete-sample', 'aria-label': `${t('delete_sample')}: ${sample.description}` },
                    html_content: `<span>${t('delete_sample')}</span>` + icon_delete_svg
                });
                delete_actions_div.appendChild(delete_button);
            }

            if (main_actions_div.hasChildNodes()) actions_wrapper_div.appendChild(main_actions_div);
            if (delete_actions_div.hasChildNodes()) actions_wrapper_div.appendChild(delete_actions_div);
            if (actions_wrapper_div.hasChildNodes()) li.appendChild(actions_wrapper_div);

            ul_element_for_delegation.appendChild(li);
        });
        list_container_ref.appendChild(ul_element_for_delegation);
    }

    function destroy() {
        if (ul_element_for_delegation) {
            ul_element_for_delegation.removeEventListener('click', handle_list_click);
            ul_element_for_delegation = null;
        }
        list_container_ref = null;
        on_edit_callback = null;
        on_delete_callback = null;
        router_ref_from_parent = null;
        local_getState = null;
        Translation_t_local = null;
        AuditLogic_get_relevant_requirements_for_sample_local = null;
        AuditLogic_find_first_incomplete_requirement_key_for_sample_local = null;
        AuditLogic_calculate_requirement_status_local = null;
    }

    return {
        init,
        render,
        destroy
    };
})();

export const SampleListComponent = SampleListComponent_internal;