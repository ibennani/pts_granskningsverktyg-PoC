// js/components/AddSampleFormComponent.js

// NYTT: Importera specifika hjälpfunktioner
import { create_element, get_icon_svg, load_css, generate_uuid_v4, add_protocol_if_missing } from '../../utils/helpers.js'; // Justerad sökväg

const AddSampleFormComponent_internal = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/add_sample_form_component.css';
    let form_container_ref;
    let on_sample_saved_callback;
    let toggle_visibility_callback;

    let local_getState;
    let local_dispatch;
    let local_StoreActionTypes;

    // Beroenden som används direkt av denna komponent
    let Translation_t_local;
    // Helpers-funktioner importeras nu direkt
    let NotificationComponent_show_global_message_local;
    // NotificationComponent_clear_global_message behövs inte direkt av denna komponent

    let form_element;
    let page_type_select, description_input, url_input;
    let content_types_group_element;
    let content_type_checkboxes = [];
    let current_editing_sample_id = null;
    let save_button_text_span_ref;
    let save_button_icon_span_ref;
    let previous_page_type_value = "";


    function get_t_func_local_scope() {
        if (Translation_t_local) return Translation_t_local;
        if (window.Translation && typeof window.Translation.t === 'function') {
            Translation_t_local = window.Translation.t;
            return Translation_t_local;
        }
        return (key, replacements) => `**${key}** (AddSampleForm t not found)`;
    }

    // assign_globals_once tas bort

    async function init(
        _form_container,
        _on_sample_saved_cb,
        _toggle_visibility_cb,
        _getState,
        _dispatch,
        _StoreActionTypes
    ) {
        form_container_ref = _form_container;
        on_sample_saved_callback = _on_sample_saved_cb;
        toggle_visibility_callback = _toggle_visibility_cb;

        local_getState = _getState;
        local_dispatch = _dispatch;
        local_StoreActionTypes = _StoreActionTypes;

        // Tilldela lokala referenser
        if (window.Translation && typeof window.Translation.t === 'function') Translation_t_local = window.Translation.t;
        if (window.NotificationComponent) {
            NotificationComponent_show_global_message_local = window.NotificationComponent.show_global_message;
            // NotificationComponent_clear_global_message_local = window.NotificationComponent.clear_global_message; // Behövs ej här
        }


        if (!local_StoreActionTypes) {
            console.error("[AddSampleFormComponent] CRITICAL: StoreActionTypes was not passed to init or is undefined. Using fallback.");
            local_StoreActionTypes = {
                ADD_SAMPLE: 'ADD_SAMPLE_ERROR_FALLBACK',
                UPDATE_SAMPLE: 'UPDATE_SAMPLE_ERROR_FALLBACK'
            };
        }

        if (typeof load_css === 'function') { // Använd importerad
             try {
                const link_tag = document.querySelector(`link[href="${CSS_PATH}"]`);
                if (!link_tag) {
                    await load_css(CSS_PATH);
                }
            } catch (error) {
                console.warn("Failed to load CSS for AddSampleFormComponent:", error);
            }
        } else {
            console.warn("[AddSampleFormComponent] load_css (importerad) not available.");
        }
    }

    function update_description_from_page_type() {
        const t = get_t_func_local_scope();
        if (page_type_select && description_input && NotificationComponent_show_global_message_local && t) {
            const current_description = description_input.value.trim();
            const new_page_type = page_type_select.value;
            if (new_page_type && (current_description === '' || current_description === previous_page_type_value)) {
                description_input.value = new_page_type;
                if (new_page_type !== current_description && new_page_type !== '') {
                    NotificationComponent_show_global_message_local(t('sample_description_auto_filled'), 'info');
                }
            }
            previous_page_type_value = new_page_type;
        }
    }

    function populate_form_fields(sample_data_to_populate_with = null) {
        const t = get_t_func_local_scope();
        if (!local_getState || !t || typeof create_element !== 'function' || typeof generate_uuid_v4 !== 'function') { // Använd importerade
            console.error("AddSampleForm: Core dependencies (local_getState or imported helpers) missing for populate_form_fields.");
            if (form_container_ref) {
                form_container_ref.innerHTML = `<p>${t('error_render_add_sample_form_deps_missing')}</p>`;
            }
            return;
        }
        const current_global_state = local_getState();
        if (!current_global_state || !current_global_state.ruleFileContent || !current_global_state.ruleFileContent.metadata) {
            console.error("AddSampleForm: Audit data or metadata for populating form is missing from store.");
            if (form_container_ref) {
                form_container_ref.innerHTML = `<p>${t('error_no_rulefile_for_form')}</p>`;
            }
            return;
        }

        if (page_type_select) {
            page_type_select.innerHTML = `<option value="">${t('select_option')}</option>`;
            (current_global_state.ruleFileContent.metadata.pageTypes || []).forEach(pt => {
                const option = create_element('option', { value: pt, text_content: pt }); // Använd importerad
                page_type_select.appendChild(option);
            });
        }

        if (content_types_group_element) {
            content_types_group_element.innerHTML = '';
            content_type_checkboxes = [];

            if (!content_types_group_element.querySelector('legend')) {
                 content_types_group_element.appendChild(create_element('legend', { text_content: t('content_types') })); // Använd importerad
            }

            (current_global_state.ruleFileContent.metadata.contentTypes || []).forEach(ct => {
                const safe_ct_id = String(ct.id).replace(/[^a-zA-Z0-9-_]/g, '');
                const field_id = `content-type-${safe_ct_id}-${generate_uuid_v4().substring(0,4)}`; // Använd importerad
                const div_wrapper = create_element('div', { class_name: 'form-check' }); // Använd importerad
                const checkbox_input = create_element('input', { // Använd importerad
                    id: field_id,
                    class_name: 'form-check-input',
                    attributes: { type: 'checkbox', name: 'selectedContentTypes', value: ct.id }
                });
                const label_element = create_element('label', { // Använd importerad
                    attributes: { for: field_id },
                    text_content: ct.text
                });
                div_wrapper.appendChild(checkbox_input);
                div_wrapper.appendChild(label_element);
                content_types_group_element.appendChild(div_wrapper);
                content_type_checkboxes.push(checkbox_input);
            });
        }

        const icon_save = typeof get_icon_svg === 'function' ? get_icon_svg('save', ['currentColor'], 18) : '';
        const icon_add = typeof get_icon_svg === 'function' ? get_icon_svg('add', ['currentColor'], 18) : '';

        if (sample_data_to_populate_with) {
            if (page_type_select) page_type_select.value = sample_data_to_populate_with.pageType || "";
            previous_page_type_value = page_type_select ? page_type_select.value : "";
            if (description_input) description_input.value = sample_data_to_populate_with.description || "";
            if (url_input) url_input.value = sample_data_to_populate_with.url || "";
            content_type_checkboxes.forEach(cb => {
                cb.checked = (sample_data_to_populate_with.selectedContentTypes || []).includes(cb.value);
            });
            if (save_button_text_span_ref) save_button_text_span_ref.textContent = t('save_changes_button');
            if (save_button_icon_span_ref) save_button_icon_span_ref.innerHTML = icon_save;
        } else {
            if (page_type_select) page_type_select.value = "";
            previous_page_type_value = "";
            if (description_input) description_input.value = "";
            if (url_input) url_input.value = "";
            content_type_checkboxes.forEach(cb => cb.checked = false);
            if (save_button_text_span_ref) save_button_text_span_ref.textContent = t('save_sample_button');
            if (save_button_icon_span_ref) save_button_icon_span_ref.innerHTML = icon_add;
        }
    }

    function validate_and_save_sample(event) {
        event.preventDefault();
        const t = get_t_func_local_scope();

        if(window.NotificationComponent && typeof window.NotificationComponent.clear_global_message === 'function') { // Temporär lösning
            window.NotificationComponent.clear_global_message();
        }


        if (!page_type_select || !description_input || !url_input || !content_type_checkboxes || !local_dispatch || !local_StoreActionTypes) {
            console.error("AddSampleForm: Form elements not initialized or dispatch/StoreActionTypes function missing before save.");
            if(NotificationComponent_show_global_message_local) NotificationComponent_show_global_message_local(t('error_render_add_sample_form_deps_missing'), 'error');
            return;
        }

        const page_type = page_type_select.value;
        const description = description_input.value.trim();
        let url_val = url_input.value.trim();
        const selected_content_types = content_type_checkboxes.filter(cb => cb.checked).map(cb => cb.value);

        let is_valid = true;
        if (!page_type) {
            if(NotificationComponent_show_global_message_local) NotificationComponent_show_global_message_local(t('field_is_required', {fieldName: t('page_type')}), 'error');
            if(page_type_select) page_type_select.focus();
            is_valid = false;
        }
        if (!description && is_valid) {
            if(NotificationComponent_show_global_message_local) NotificationComponent_show_global_message_local(t('field_is_required', {fieldName: t('description')}), 'error');
            if(description_input) description_input.focus();
            is_valid = false;
        }
        if (selected_content_types.length === 0 && is_valid) {
            if(NotificationComponent_show_global_message_local) NotificationComponent_show_global_message_local(t('error_min_one_content_type'), 'error');
            if(content_type_checkboxes.length > 0) content_type_checkboxes[0].focus();
            is_valid = false;
        }

        if (!is_valid) return;

        if (url_val && typeof add_protocol_if_missing === 'function') { // Använd importerad
            url_val = add_protocol_if_missing(url_val);
        }

        const sample_payload_data = {
            pageType: page_type,
            description: description,
            url: url_val,
            selectedContentTypes: selected_content_types
        };

        if (current_editing_sample_id) {
            if (!local_StoreActionTypes.UPDATE_SAMPLE) {
                console.error("[AddSampleFormComponent] local_StoreActionTypes.UPDATE_SAMPLE is undefined!");
                if(NotificationComponent_show_global_message_local) NotificationComponent_show_global_message_local("Internal error: Action type for update sample is missing.", "error");
                return;
            }
            local_dispatch({
                type: local_StoreActionTypes.UPDATE_SAMPLE,
                payload: {
                    sampleId: current_editing_sample_id,
                    updatedSampleData: sample_payload_data
                }
            });
            if(NotificationComponent_show_global_message_local) NotificationComponent_show_global_message_local(t('sample_updated_successfully'), "success");
        } else {
            const new_sample_id = typeof generate_uuid_v4 === 'function' ? generate_uuid_v4() : Date.now().toString(); // Använd importerad
            const new_sample_object = {
                ...sample_payload_data,
                id: new_sample_id,
                requirementResults: {}
            };
             if (!local_StoreActionTypes.ADD_SAMPLE) {
                console.error("[AddSampleFormComponent] local_StoreActionTypes.ADD_SAMPLE is undefined!");
                if(NotificationComponent_show_global_message_local) NotificationComponent_show_global_message_local("Internal error: Action type for add sample is missing.", "error");
                return;
            }
            local_dispatch({
                type: local_StoreActionTypes.ADD_SAMPLE,
                payload: new_sample_object
            });
            if(NotificationComponent_show_global_message_local) NotificationComponent_show_global_message_local(t('sample_added_successfully'), "success");
        }

        current_editing_sample_id = null;
        if (form_element) form_element.reset();
        previous_page_type_value = "";
        populate_form_fields(); // Detta kommer att återställa save_button text/ikon

        if (on_sample_saved_callback) {
            on_sample_saved_callback();
        }
    }

    function render(sample_id_to_edit = null) {
        const t = get_t_func_local_scope();
        if (!form_container_ref || typeof create_element !== 'function' || !t || !local_getState) { // Använd importerad create_element
            console.error("AddSampleForm: Core dependencies missing for render. Has init completed?");
            if(form_container_ref) {
                 form_container_ref.innerHTML = `<p>${t('error_render_add_sample_form_deps_missing')}</p>`;
            }
            return;
        }
        form_container_ref.innerHTML = '';
        current_editing_sample_id = sample_id_to_edit;

        const current_global_state = local_getState();
        if (!current_global_state || !current_global_state.ruleFileContent) {
            form_container_ref.textContent = t('error_no_rulefile_for_form', {defaultValue: "Rule file missing. Cannot build form."});
            return;
        }

        let sample_data_for_edit = null;
        if (current_editing_sample_id && current_global_state.samples) {
            sample_data_for_edit = current_global_state.samples.find(s => s.id === current_editing_sample_id);
        }

        const form_wrapper = create_element('div', { class_name: 'add-sample-form' }); // Använd importerad
        const form_title_text = current_editing_sample_id ? t('edit_sample') : t('add_new_sample');
        form_wrapper.appendChild(create_element('h2', { text_content: form_title_text })); // Använd importerad

        form_element = create_element('form'); // Använd importerad
        form_element.addEventListener('submit', validate_and_save_sample);

        const page_type_group_div = create_element('div', { class_name: 'form-group' });
        page_type_group_div.appendChild(create_element('label', { attributes: {for: 'pageTypeSelect'}, text_content: t('page_type') + '*' }));
        page_type_select = create_element('select', { id: 'pageTypeSelect', class_name: 'form-control', attributes: { required: true }});
        page_type_select.innerHTML = `<option value="">${t('select_option')}</option>`;
        page_type_select.addEventListener('change', update_description_from_page_type);
        page_type_group_div.appendChild(page_type_select);
        form_element.appendChild(page_type_group_div);

        const description_group_div = create_element('div', { class_name: 'form-group' });
        description_group_div.appendChild(create_element('label', { attributes: {for: 'sampleDescriptionInput'}, text_content: t('description') + '*' }));
        description_input = create_element('input', { id: 'sampleDescriptionInput', class_name: 'form-control', attributes: { type: 'text', required: true }});
        description_group_div.appendChild(description_input);
        form_element.appendChild(description_group_div);

        const url_group_div = create_element('div', { class_name: 'form-group' });
        url_group_div.appendChild(create_element('label', { attributes: {for: 'sampleUrlInput'}, text_content: t('url') }));
        url_input = create_element('input', { id: 'sampleUrlInput', class_name: 'form-control', attributes: { type: 'url' }});
        url_group_div.appendChild(url_input);
        form_element.appendChild(url_group_div);

        content_types_group_element = create_element('fieldset', { class_name: 'form-group content-types-group' });
        form_element.appendChild(content_types_group_element);

        const actions_div = create_element('div', { class_name: 'form-actions' });
        save_button_text_span_ref = create_element('span');
        save_button_icon_span_ref = create_element('span');

        const save_button = create_element('button', {
            id: 'save-sample-btn',
            class_name: ['button', 'button-primary'],
            attributes: { type: 'submit' }
        });
        save_button.appendChild(save_button_text_span_ref);
        save_button.appendChild(save_button_icon_span_ref);
        actions_div.appendChild(save_button);

        const show_list_icon_svg = typeof get_icon_svg === 'function' ? get_icon_svg('list', ['currentColor'], 18) : '';
        const show_list_button = create_element('button', {
            class_name: ['button', 'button-default'],
            attributes: { type: 'button' },
            html_content: `<span>${t('show_existing_samples')}</span>` + show_list_icon_svg
        });
        show_list_button.addEventListener('click', () => {
            if (toggle_visibility_callback) toggle_visibility_callback(false);
        });
        actions_div.appendChild(show_list_button);
        form_element.appendChild(actions_div);

        form_wrapper.appendChild(form_element);
        form_container_ref.appendChild(form_wrapper);

        populate_form_fields(sample_data_for_edit);
    }

    function destroy() {
        if (form_element) form_element.removeEventListener('submit', validate_and_save_sample);
        if (page_type_select) page_type_select.removeEventListener('change', update_description_from_page_type);

        form_element = null;
        page_type_select = null;
        description_input = null;
        url_input = null;
        content_types_group_element = null;
        content_type_checkboxes = [];
        save_button_text_span_ref = null;
        save_button_icon_span_ref = null;
        previous_page_type_value = "";
        current_editing_sample_id = null;
        local_getState = null;
        local_dispatch = null;
        local_StoreActionTypes = null;
        Translation_t_local = null;
        NotificationComponent_show_global_message_local = null;
    }

    return {
        init,
        render,
        destroy,
        get current_editing_sample_id() { return current_editing_sample_id; }
    };
})();

export const AddSampleFormComponent = AddSampleFormComponent_internal;