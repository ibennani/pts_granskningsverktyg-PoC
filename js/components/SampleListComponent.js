// js/components/SampleListComponent.js

// import { create_element, get_icon_svg, load_css, escape_html, add_protocol_if_missing } from '../../utils/helpers.js';
// import { get_relevant_requirements_for_sample, find_first_incomplete_requirement_key_for_sample, calculate_requirement_status, calculate_check_status } from '../audit_logic.js';

// // NYTT: Importera 't' direkt från translation_logic.js
// import { t } from '../translation_logic.js'; // Justera sökväg om nödvändigt


const SampleListComponent_internal = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/sample_list_component.css';
    let list_container_ref;
    let on_edit_callback;
    let on_delete_callback;
    let router_ref_from_parent;

    let local_getState;

    // Translation_t_local och get_t_func_local_scope() tas bort

    let ul_element_for_delegation = null;

    // BORTTAGEN: get_t_func_local_scope()

    function handle_list_click(event) {
        // 't' är nu direkt tillgänglig från import
        const target = event.target;
        const current_global_state = local_getState ? local_getState() : null;
        if (!current_global_state) { /* ... */ return; }

        const action_button = target.closest('button[data-action]');
        if (!action_button) return;
        const sample_list_item_element = action_button.closest('.sample-list-item[data-sample-id]');
        if (!sample_list_item_element) return;
        const sample_id = sample_list_item_element.dataset.sampleId;
        const action = action_button.dataset.action;
        const sample = current_global_state.samples.find(s => s.id === sample_id);
        if (!sample) { /* ... */ return; }

        switch (action) {
            case 'edit-sample': /* ... */ break;
            case 'delete-sample': /* ... */ break;
            case 'view-requirements': /* ... */ break;
            case 'visit-url': /* ... */ break;
            case 'review-sample':
                if (router_ref_from_parent && current_global_state.ruleFileContent && typeof find_first_incomplete_requirement_key_for_sample === 'function') {
                    const first_incomplete_req_key = find_first_incomplete_requirement_key_for_sample(current_global_state.ruleFileContent, sample);
                    if (first_incomplete_req_key) {
                        router_ref_from_parent('requirement_audit', { sampleId: sample.id, requirementId: first_incomplete_req_key });
                    } else {
                        router_ref_from_parent('requirement_list', { sampleId: sample.id });
                    }
                }
                break;
        }
    }

    async function init( _list_container, _on_edit_cb, _on_delete_cb, _router_cb, _getState ) {
        list_container_ref = _list_container;
        on_edit_callback = _on_edit_cb;
        on_delete_callback = _on_delete_cb;
        router_ref_from_parent = _router_cb;
        local_getState = _getState;

        // Ta bort tilldelning av Translation_t_local

        if (!local_getState) { /* ... */ }
        if (typeof get_relevant_requirements_for_sample !== 'function' || /* ... */ typeof calculate_check_status !== 'function') { /* ... */ }

        if (typeof load_css === 'function') {
            try {
                const link_tag = document.querySelector(`link[href="${CSS_PATH}"]`);
                if (!link_tag) await load_css(CSS_PATH);
            } catch (error) { console.warn("Failed to load CSS for SampleListComponent:", error); }
        } else { console.warn("[SampleListComponent] load_css (importerad) not available."); }
    }

    function render() {
        // 't' är nu direkt tillgänglig från import
        if (!list_container_ref || typeof t !== 'function' || !local_getState || typeof create_element !== 'function' ||
            typeof get_relevant_requirements_for_sample !== 'function' || typeof calculate_requirement_status !== 'function' ||
            typeof calculate_check_status !== 'function') { // Kontrollera importerad t
            console.error("SampleListComponent: Core dependencies missing for render.");
            if (list_container_ref) list_container_ref.innerHTML = `<p>${t ? t('error_render_component', {componentName: 'SampleList'}) : 'Error rendering SampleList.'}</p>`;
            return;
        }
        list_container_ref.innerHTML = '';

        const current_global_state = local_getState();
        if (!current_global_state || !current_global_state.ruleFileContent) { /* ... */ return; }
        if (!current_global_state.samples || current_global_state.samples.length === 0) { /* ... */ return; }

        if (!ul_element_for_delegation) {
            ul_element_for_delegation = create_element('ul', { class_name: 'sample-list item-list' });
            ul_element_for_delegation.addEventListener('click', handle_list_click);
        } else { ul_element_for_delegation.innerHTML = ''; }

        const can_edit_or_delete = current_global_state.auditStatus === 'not_started' || current_global_state.auditStatus === 'in_progress';
        const esc_func = typeof escape_html === 'function' ? escape_html : (s) => s;
        const add_proto_func = typeof add_protocol_if_missing === 'function' ? add_protocol_if_missing : url => url;
        const get_icon_func = typeof get_icon_svg === 'function' ? get_icon_svg : () => '';


        current_global_state.samples.forEach(sample => {
            const li = create_element('li', { class_name: 'sample-list-item item-list-item', attributes: {'data-sample-id': sample.id} });
            const info_div = create_element('div', { class_name: 'sample-info' });
            const desc_h3 = create_element('h3', { text_content: sample.description || t('undefined_description') });
            const type_p = create_element('p');
            type_p.innerHTML = `<strong>${t('page_type')}:</strong> ${esc_func(sample.pageType)}`;
            info_div.appendChild(desc_h3); info_div.appendChild(type_p);

            if(sample.url) {
                const url_p = create_element('p');
                const safe_url = add_proto_func(sample.url);
                url_p.innerHTML = `<strong>${t('url')}:</strong> <a href="${esc_func(safe_url)}" target="_blank" rel="noopener noreferrer" title="${t('visit_url')}: ${esc_func(sample.url)}">${esc_func(sample.url)}</a>`;
                info_div.appendChild(url_p);
            }

            const relevant_reqs_for_sample_list_info = get_relevant_requirements_for_sample(current_global_state.ruleFileContent, sample);
            const total_relevant_reqs_info = relevant_reqs_for_sample_list_info.length;
            let audited_reqs_count_info = 0;
            relevant_reqs_for_sample_list_info.forEach(req_definition_from_list => { /* ... oförändrad logik, använder calculate_requirement_status ... */ });
            const progress_p = create_element('p');
            progress_p.innerHTML = `<strong>${t('requirements_audited')}:</strong> ${audited_reqs_count_info} / ${total_relevant_reqs_info}`;
            info_div.appendChild(progress_p);
            if (window.ProgressBarComponent && typeof window.ProgressBarComponent.create === 'function') { /* ... */ }
            if (sample.selectedContentTypes && sample.selectedContentTypes.length > 0 ) 
            li.appendChild(info_div);

            const actions_wrapper_div = create_element('div', { class_name: 'sample-actions-wrapper' });
            const main_actions_div = create_element('div', { class_name: 'sample-actions-main' });
            const delete_actions_div = create_element('div', { class_name: 'sample-actions-delete' });
            const icon_list_svg = get_icon_func('list', ['currentColor'], 16);
            // ... (liknande för andra ikoner) ...
            const total_relevant_reqs = relevant_reqs_for_sample_list_info.length;
            if (total_relevant_reqs > 0) { /* ... knapp med t() ... */ } else { /* ... text med t() ... */ }
            if (sample.url) { /* ... knapp med t() ... */ }
            if (current_global_state.auditStatus === 'in_progress' && total_relevant_reqs > 0 && typeof find_first_incomplete_requirement_key_for_sample === 'function') { /* ... knapp med t() ... */ }
            if (can_edit_or_delete && typeof on_edit_callback === 'function') { /* ... knapp med t() ... */ }
            if (can_edit_or_delete && typeof on_delete_callback === 'function' && current_global_state.samples.length > 1) { /* ... knapp med t() ... */ }

            if (main_actions_div.hasChildNodes()) actions_wrapper_div.appendChild(main_actions_div);
            if (delete_actions_div.hasChildNodes()) actions_wrapper_div.appendChild(delete_actions_div);
            if (actions_wrapper_div.hasChildNodes()) li.appendChild(actions_wrapper_div);
            ul_element_for_delegation.appendChild(li);
        });
        list_container_ref.appendChild(ul_element_for_delegation);
    }

    function destroy() { /* ... oförändrad ... */ }

    return { init, render, destroy };
})();

export const SampleListComponent = SampleListComponent_internal;