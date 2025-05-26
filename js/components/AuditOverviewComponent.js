// file: js/components/AuditOverviewComponent.js
import { SampleListComponent } from './SampleListComponent.js';
import { AddSampleFormComponent } from './AddSampleFormComponent.js';
import { SaveAuditButtonComponent } from './SaveAuditButtonComponent.js';
import { MetadataDisplayComponent } from './MetadataDisplayComponent.js';

// NYTT: Importera specifika hjälpfunktioner
import { create_element, get_icon_svg, load_css, escape_html, add_protocol_if_missing, format_iso_to_local_datetime, get_current_iso_datetime_utc } from '../../utils/helpers.js'; // Justerad sökväg

const AuditOverviewComponent_internal = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/audit_overview_component.css';
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
    let ExportLogic_export_to_csv_local;
    let ExportLogic_export_to_excel_local;
    let AuditLogic_calculate_overall_audit_progress_local;


    let global_message_element_ref;
    let sample_list_component_instance;
    let sample_list_container_element;

    let add_sample_form_component_instance = null;
    let add_sample_form_container_element = null;
    let is_add_sample_form_visible = false;
    let add_sample_button_ref = null;

    let save_audit_button_component_instance = null;
    let save_audit_button_container_element = null;

    let previously_focused_element = null;

    function get_t_func_local_scope() {
        if (Translation_t_local) return Translation_t_local;
        if (window.Translation && typeof window.Translation.t === 'function') {
            Translation_t_local = window.Translation.t;
            return Translation_t_local;
        }
        return (key, replacements) => `**${key}** (AuditOverview t not found)`;
    }

    // assign_globals_once tas bort

    async function init(_app_container, _router, _params, _getState, _dispatch, _StoreActionTypes) {
        app_container_ref = _app_container;
        router_ref = _router;

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
        if (window.ExportLogic) {
            ExportLogic_export_to_csv_local = window.ExportLogic.export_to_csv;
            ExportLogic_export_to_excel_local = window.ExportLogic.export_to_excel;
        }
        if (window.AuditLogic) {
            AuditLogic_calculate_overall_audit_progress_local = window.AuditLogic.calculate_overall_audit_progress;
        }


        if (!local_StoreActionTypes) {
            console.error("[AuditOverviewComponent] CRITICAL: StoreActionTypes was not passed to init or is undefined.");
            local_StoreActionTypes = { /* ... fallback ... */ };
        }
        if (!AuditLogic_calculate_overall_audit_progress_local) {
            console.error("[AuditOverviewComponent] CRITICAL: AuditLogic_calculate_overall_audit_progress_local not set!");
        }


        if (NotificationComponent_get_global_message_element_reference_local) {
            global_message_element_ref = NotificationComponent_get_global_message_element_reference_local();
        }
        await init_sub_components_internal(); // Omdöpt för att undvika konflikt

        // Använd importerad load_css
        if (typeof load_css === 'function') {
            try {
                const link_tag = document.querySelector(`link[href="${CSS_PATH}"]`);
                if (!link_tag) {
                    await load_css(CSS_PATH);
                }
            }
            catch (error) { console.warn("Failed to load CSS for AuditOverviewComponent:", error); }
        } else {
            console.warn("[AuditOverviewComponent] load_css (importerad) not available.");
        }
    }


    function handle_sample_saved_or_updated_in_form() {
        toggle_add_sample_form(false);
    }

    function handle_edit_sample_request_from_list(sample_id) {
        const t = get_t_func_local_scope();
        const current_global_state = local_getState();
        if (current_global_state.auditStatus !== 'in_progress') {
            if(NotificationComponent_show_global_message_local) NotificationComponent_show_global_message_local(t('cannot_edit_sample_audit_not_in_progress', {defaultValue: "Cannot edit sample: Audit not in progress."}), "warning");
            return;
        }
        if (NotificationComponent_clear_global_message_local) NotificationComponent_clear_global_message_local();
        toggle_add_sample_form(true, sample_id);
    }

    function handle_delete_sample_request_from_list(sample_id) {
        const t = get_t_func_local_scope();
        const current_global_state = local_getState();

        if (current_global_state.auditStatus !== 'in_progress') {
            if(NotificationComponent_show_global_message_local) NotificationComponent_show_global_message_local(t('cannot_delete_sample_audit_not_in_progress', {defaultValue: "Cannot delete sample: Audit not in progress."}), "warning");
            return;
        }
        if (current_global_state.samples.length <= 1) {
            if (NotificationComponent_show_global_message_local) NotificationComponent_show_global_message_local(t('error_cannot_delete_last_sample'), "warning");
            return;
        }
        // Använd importerad escape_html
        const sample_to_delete = current_global_state.samples.find(s => s.id === sample_id);
        const sample_name_for_confirm = sample_to_delete && typeof escape_html === 'function' ? escape_html(sample_to_delete.description) : sample_id;

        previously_focused_element = document.activeElement;

        if (confirm(t('confirm_delete_sample', { sampleName: sample_name_for_confirm }))) {
            if (!local_StoreActionTypes || !local_StoreActionTypes.DELETE_SAMPLE) {
                console.error("[AuditOverview] local_StoreActionTypes.DELETE_SAMPLE is undefined!");
                if (NotificationComponent_show_global_message_local) NotificationComponent_show_global_message_local("Internal error: Action type for delete sample is missing.", "error");
                return;
            }
            local_dispatch({
                type: local_StoreActionTypes.DELETE_SAMPLE,
                payload: { sampleId: sample_id }
            });
            if (NotificationComponent_show_global_message_local) NotificationComponent_show_global_message_local(t('sample_deleted_successfully', { sampleName: sample_name_for_confirm }), "success");
            if (is_add_sample_form_visible && add_sample_form_component_instance && add_sample_form_component_instance.current_editing_sample_id === sample_id) {
                toggle_add_sample_form(false);
            }
        } else {
            if (previously_focused_element) {
                previously_focused_element.focus();
                previously_focused_element = null;
            }
        }
    }

    function toggle_add_sample_form(show, sample_id_to_edit = null) {
        const t = get_t_func_local_scope();
        is_add_sample_form_visible = !!show;
        // Använd importerad get_icon_svg
        const icon_list_svg = typeof get_icon_svg === 'function' ? get_icon_svg('list', ['currentColor'], 18) : '';
        const icon_add_svg = typeof get_icon_svg === 'function' ? get_icon_svg('add', ['currentColor'], 18) : '';


        if (add_sample_form_container_element && sample_list_container_element && add_sample_button_ref) {
            if (is_add_sample_form_visible) {
                previously_focused_element = document.activeElement;
                add_sample_form_container_element.removeAttribute('hidden');
                sample_list_container_element.setAttribute('hidden', 'true');
                add_sample_button_ref.innerHTML = `<span>${t('show_existing_samples')}</span>` + icon_list_svg;

                if (add_sample_form_component_instance && typeof add_sample_form_component_instance.render === 'function') {
                    add_sample_form_component_instance.render(sample_id_to_edit);
                } else {
                    console.error("AuditOverview: AddSampleFormComponent instance or render method is missing in toggle_add_sample_form (show).");
                }
                const first_input = add_sample_form_container_element.querySelector('input, select, textarea');
                if (first_input) first_input.focus();

            } else {
                add_sample_form_container_element.setAttribute('hidden', 'true');
                sample_list_container_element.removeAttribute('hidden');
                add_sample_button_ref.innerHTML = `<span>${t('add_new_sample')}</span>` + icon_add_svg;

                if (previously_focused_element) {
                    previously_focused_element.focus();
                    previously_focused_element = null;
                } else if (add_sample_button_ref) {
                    add_sample_button_ref.focus();
                }
                if (sample_list_component_instance && typeof sample_list_component_instance.render === 'function') {
                    sample_list_component_instance.render();
                }
            }
        }
    }

    function handle_lock_audit() {
        const t = get_t_func_local_scope();
        if (!local_StoreActionTypes || !local_StoreActionTypes.SET_AUDIT_STATUS) {
            console.error("[AuditOverview] local_StoreActionTypes.SET_AUDIT_STATUS is undefined!");
            if(NotificationComponent_show_global_message_local) NotificationComponent_show_global_message_local("Internal error: Action type for lock audit is missing.", "error");
            return;
        }
        local_dispatch({
            type: local_StoreActionTypes.SET_AUDIT_STATUS,
            payload: { status: 'locked' }
        });
        if(NotificationComponent_show_global_message_local) NotificationComponent_show_global_message_local(t('audit_locked_successfully'), 'success');
    }

    function handle_unlock_audit() {
        const t = get_t_func_local_scope();
        if (!local_StoreActionTypes || !local_StoreActionTypes.SET_AUDIT_STATUS) {
            console.error("[AuditOverview] local_StoreActionTypes.SET_AUDIT_STATUS is undefined!");
            if(NotificationComponent_show_global_message_local) NotificationComponent_show_global_message_local("Internal error: Action type for unlock audit is missing.", "error");
            return;
        }
        local_dispatch({
            type: local_StoreActionTypes.SET_AUDIT_STATUS,
            payload: { status: 'in_progress' }
        });
        if(NotificationComponent_show_global_message_local) NotificationComponent_show_global_message_local(t('audit_unlocked_successfully'), 'success');
    }

    function handle_export_csv() {
        const t = get_t_func_local_scope();
        const current_global_state = local_getState();
        if (current_global_state.auditStatus !== 'locked') {
            if(NotificationComponent_show_global_message_local) NotificationComponent_show_global_message_local(t('audit_not_locked_for_export', {status: current_global_state.auditStatus}), 'warning');
            return;
        }
        if (ExportLogic_export_to_csv_local) {
            ExportLogic_export_to_csv_local(current_global_state);
        } else {
            console.error("AuditOverview: ExportLogic_export_to_csv_local is not available.");
            if(NotificationComponent_show_global_message_local) NotificationComponent_show_global_message_local(t('error_export_function_missing', {defaultValue: "Export function is missing."}), 'error');
        }
    }
    function handle_export_excel() {
        const t = get_t_func_local_scope();
        const current_global_state = local_getState();
         if (current_global_state.auditStatus !== 'locked') {
            if(NotificationComponent_show_global_message_local) NotificationComponent_show_global_message_local(t('audit_not_locked_for_export', {status: current_global_state.auditStatus}), 'warning');
            return;
        }
        if (ExportLogic_export_to_excel_local) {
            ExportLogic_export_to_excel_local(current_global_state);
        } else {
            console.error("AuditOverview: ExportLogic_export_to_excel_local is not available.");
            if(NotificationComponent_show_global_message_local) NotificationComponent_show_global_message_local(t('error_export_function_missing', {defaultValue: "Export function is missing."}), 'error');
        }
    }


    async function init_sub_components_internal() { // Omdöpt
        // Använd importerad create_element
        if (typeof create_element !== 'function') {
            console.error("AuditOverview: create_element (importerad) not available for init_sub_components_internal.");
            return;
        }
        sample_list_container_element = create_element('div', { id: 'overview-sample-list-area' });
        sample_list_component_instance = SampleListComponent;
        if (sample_list_component_instance && typeof sample_list_component_instance.init === 'function') {
            await sample_list_component_instance.init(
                sample_list_container_element,
                handle_edit_sample_request_from_list,
                handle_delete_sample_request_from_list,
                router_ref,
                local_getState
            );
        } else {
            console.error("AuditOverview: SampleListComponent is not correctly initialized or its init function is missing.");
        }

        add_sample_form_container_element = create_element('div', { id: 'overview-add-sample-form-area' });
        add_sample_form_container_element.setAttribute('hidden', 'true');
        add_sample_form_component_instance = AddSampleFormComponent;
        if (add_sample_form_component_instance && typeof add_sample_form_component_instance.init === 'function') {
            await add_sample_form_component_instance.init(
                add_sample_form_container_element,
                handle_sample_saved_or_updated_in_form,
                () => toggle_add_sample_form(false),
                local_getState,
                local_dispatch,
                local_StoreActionTypes
            );
        } else {
             console.error("AuditOverview: AddSampleFormComponent is not correctly initialized or its init function is missing.");
        }

        save_audit_button_container_element = create_element('div', { id: 'save-audit-button-area-overview' });
        save_audit_button_component_instance = SaveAuditButtonComponent;
        if (save_audit_button_component_instance && typeof save_audit_button_component_instance.init === 'function') {
            if (!window.SaveAuditLogic || typeof window.SaveAuditLogic.save_audit_to_json_file !== 'function') {
                console.error("AuditOverview: SaveAuditLogic or save_audit_to_json_file is missing globally!");
            } else {
                 await save_audit_button_component_instance.init(
                    save_audit_button_container_element,
                    local_getState,
                    window.SaveAuditLogic.save_audit_to_json_file,
                    Translation_t_local, // Skicka med den lokala referensen
                    NotificationComponent_show_global_message_local, // Skicka med den lokala referensen
                    create_element, // Skicka med importerad
                    get_icon_svg,   // Skicka med importerad
                    load_css        // Skicka med importerad
                );
            }
        } else {
            console.error("AuditOverview: SaveAuditButtonComponent is not correctly initialized or its init function is missing.");
        }
    }


    function render() {
        const t = get_t_func_local_scope();
        // Använd importerade create_element, get_icon_svg, etc.
        if (!app_container_ref || typeof create_element !== 'function' || !t || !local_getState) {
            console.error("AuditOverview: Core dependencies missing for render.");
            if(app_container_ref) app_container_ref.innerHTML = `<p>${t('error_render_overview', {defaultValue: "Could not render the overview."})}</p>`;
            return;
        }
        app_container_ref.innerHTML = '';

        const current_global_state = local_getState();
        if (!current_global_state || !current_global_state.ruleFileContent) {
            if(NotificationComponent_show_global_message_local) NotificationComponent_show_global_message_local(t("error_no_active_audit", {defaultValue: "Error: No active audit to display."}), "error");
            const go_to_upload_icon_svg = typeof get_icon_svg === 'function' ? get_icon_svg('start_new', ['currentColor'], 18) : '';
            const go_to_upload_btn = create_element('button', {
                class_name: ['button', 'button-primary'],
                html_content: `<span>${t('start_new_audit')}</span>` + go_to_upload_icon_svg,
                event_listeners: { click: () => router_ref('upload') }
            });
            app_container_ref.appendChild(go_to_upload_btn);
            return;
        }

        const plate_element = create_element('div', { class_name: 'content-plate audit-overview-plate' });
        app_container_ref.appendChild(plate_element);

        if (global_message_element_ref) {
            plate_element.appendChild(global_message_element_ref);
        }
        if (is_add_sample_form_visible && NotificationComponent_show_global_message_local &&
            global_message_element_ref && (global_message_element_ref.hasAttribute('hidden') || !global_message_element_ref.textContent.trim() ||
            (!global_message_element_ref.classList.contains('message-error') && !global_message_element_ref.classList.contains('message-warning')))
        ) {
            NotificationComponent_show_global_message_local(t('add_sample_form_intro'), "info");
        }

        plate_element.appendChild(create_element('h1', { text_content: t('audit_overview_title') }));

        if (AuditLogic_calculate_overall_audit_progress_local && window.ProgressBarComponent) {
            const progress_data = AuditLogic_calculate_overall_audit_progress_local(current_global_state);
            const overall_progress_section = create_element('section', { class_name: 'audit-overview-section overall-progress-section' });
            overall_progress_section.appendChild(create_element('h2', { text_content: t('overall_audit_progress_title', {defaultValue: "Overall Audit Progress"}) }));
            const progress_info_text_p = create_element('p', { class_name: 'info-item' });
            progress_info_text_p.innerHTML = `<strong>${t('total_requirements_audited_label', {defaultValue: "Total requirements reviewed"})}:</strong> <span class="value">${progress_data.audited} / ${progress_data.total}</span>`;
            overall_progress_section.appendChild(progress_info_text_p);
            const overall_progress_bar = window.ProgressBarComponent.create(progress_data.audited, progress_data.total, { id: 'overall-audit-progress-bar' });
            overall_progress_section.appendChild(overall_progress_bar);
            plate_element.appendChild(overall_progress_section);
        }

        const section1 = create_element('section', { class_name: 'audit-overview-section' });
        section1.appendChild(create_element('h2', { text_content: t('audit_info_title') }));

        const audit_metadata_container = create_element('div', { class_name: 'info-grid' });
        section1.appendChild(audit_metadata_container);

        const audit_metadata_config = [
            { labelKey: 'case_number', valuePath: 'auditMetadata.caseNumber', type: 'text', showWhenEmptyAs: { labelKey: 'value_not_set' } },
            { labelKey: 'actor_name', valuePath: 'auditMetadata.actorName', type: 'text', showWhenEmptyAs: { labelKey: 'value_not_set' } },
            { labelKey: 'actor_link', valuePath: 'auditMetadata.actorLink', type: 'link', showWhenEmptyAs: { labelKey: 'value_not_set' } },
            { labelKey: 'auditor_name', valuePath: 'auditMetadata.auditorName', type: 'text', showWhenEmptyAs: { labelKey: 'value_not_set' } },
            { labelKey: 'rule_file_title', valuePath: 'ruleFileContent.metadata.title', type: 'text', showWhenEmptyAs: { labelKey: 'value_not_set' } },
            { labelKey: 'Version (Regelfil)', valuePath: 'ruleFileContent.metadata.version', type: 'text', showWhenEmptyAs: { labelKey: 'value_not_set' } },
            { labelKey: 'status', valuePath: 'auditStatus', type: 'text', formatter: (val) => t(`audit_status_${val}`, {defaultValue: val}) },
            { labelKey: 'start_time', valuePath: 'startTime', type: 'date', showWhenEmptyAs: { labelKey: 'value_not_set' }, formatter: (val) => typeof format_iso_to_local_datetime === 'function' ? format_iso_to_local_datetime(val) : val },
            { labelKey: 'end_time', valuePath: 'endTime', type: 'date', showWhenEmptyAs: { labelKey: 'value_not_set' }, isVisibleWhen: (data) => !!data.endTime, formatter: (val) => typeof format_iso_to_local_datetime === 'function' ? format_iso_to_local_datetime(val) : val }
        ];

        if (MetadataDisplayComponent && typeof MetadataDisplayComponent.init === 'function') {
            MetadataDisplayComponent.init(audit_metadata_container, current_global_state, audit_metadata_config, t, { create_element, escape_html, add_protocol_if_missing, format_iso_to_local_datetime }); // Skicka med importerade helpers
            MetadataDisplayComponent.render();
        } else {
            audit_metadata_container.textContent = "Error: MetadataDisplayComponent not loaded.";
        }

        if (current_global_state.auditMetadata && current_global_state.auditMetadata.internalComment) {
            const comment_header = create_element('h3', { text_content: t('internal_comment'), style: 'font-size: 1rem; margin-top: 1rem; font-weight: 500;' });
            const comment_p = create_element('p', {
                style: 'white-space: pre-wrap; background-color: var(--input-background-color); padding: 0.5rem; border-radius: var(--border-radius); border: 1px solid var(--border-color);'
            });
            const esc_func = typeof escape_html === 'function' ? escape_html : (s) => s;
             current_global_state.auditMetadata.internalComment.split('\n').forEach((line, index) => {
                if (index > 0) comment_p.appendChild(create_element('br'));
                comment_p.appendChild(document.createTextNode(esc_func(line)));
            });
            section1.appendChild(comment_header);
            section1.appendChild(comment_p);
        }
        plate_element.appendChild(section1);


        const section2 = create_element('section', { class_name: 'audit-overview-section' });
        const sample_management_header_div = create_element('div', {style: "display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; margin-bottom: 0.5rem;"});
        const number_of_samples = current_global_state.samples ? current_global_state.samples.length : 0;
        const sample_list_title_text = t('sample_list_title_with_count', { count: number_of_samples });
        sample_management_header_div.appendChild(create_element('h2', { text_content: sample_list_title_text, style: "margin-bottom: 0.5rem;" }));
        const icon_add_for_sample_btn = typeof get_icon_svg === 'function' ? get_icon_svg('add', ['currentColor'], 18) : '';

        add_sample_button_ref = null;
        if (current_global_state.auditStatus === 'in_progress') {
            add_sample_button_ref = create_element('button', {
                class_name: ['button', 'button-default', 'button-small'],
                // html_content sätts i toggle_add_sample_form
            });
            add_sample_button_ref.addEventListener('click', () => {
                toggle_add_sample_form(!is_add_sample_form_visible);
            });
            sample_management_header_div.appendChild(add_sample_button_ref);
        }
        section2.appendChild(sample_management_header_div);

        if(add_sample_form_container_element) {
            section2.appendChild(add_sample_form_container_element);
        }
        if (sample_list_container_element) {
            section2.appendChild(sample_list_container_element);
            if (sample_list_component_instance && typeof sample_list_component_instance.render === 'function') {
                sample_list_component_instance.render();
            }
        }
        plate_element.appendChild(section2);

        toggle_add_sample_form(is_add_sample_form_visible,
            is_add_sample_form_visible && add_sample_form_component_instance ? add_sample_form_component_instance.current_editing_sample_id : null);

        const section3 = create_element('section', { class_name: 'audit-overview-section' });
        section3.appendChild(create_element('h2', { text_content: t('audit_actions_title') }));
        const actions_div = create_element('div', { class_name: 'audit-overview-actions' });
        const left_actions_group = create_element('div', { class_name: 'action-group-left' });
        const right_actions_group = create_element('div', { class_name: 'action-group-right' });

        if (save_audit_button_container_element && save_audit_button_component_instance && typeof save_audit_button_component_instance.render === 'function') {
            left_actions_group.appendChild(save_audit_button_container_element);
            save_audit_button_component_instance.render();
        }

        const icon_lock_svg = typeof get_icon_svg === 'function' ? get_icon_svg('lock_audit', ['currentColor'], 18) : '';
        const icon_unlock_svg = typeof get_icon_svg === 'function' ? get_icon_svg('unlock_audit', ['currentColor'], 18) : '';
        const icon_export_svg = typeof get_icon_svg === 'function' ? get_icon_svg('export', ['currentColor'], 18) : '';

        if (current_global_state.auditStatus === 'in_progress') {
            const lock_btn = create_element('button', {
                class_name: ['button', 'button-warning'],
                html_content: `<span>${t('lock_audit')}</span>` + icon_lock_svg
            });
            lock_btn.addEventListener('click', handle_lock_audit);
            right_actions_group.appendChild(lock_btn);
        }
        if (current_global_state.auditStatus === 'locked') {
            const unlock_btn = create_element('button', {
                class_name: ['button', 'button-secondary'],
                html_content: `<span>${t('unlock_audit')}</span>` + icon_unlock_svg
            });
            unlock_btn.addEventListener('click', handle_unlock_audit);
            left_actions_group.appendChild(unlock_btn);

            if(ExportLogic_export_to_csv_local) {
                const csv_btn = create_element('button', {
                    class_name: ['button', 'button-default'],
                    html_content: `<span>${t('export_to_csv')}</span>` + icon_export_svg
                });
                csv_btn.addEventListener('click', handle_export_csv);
                left_actions_group.appendChild(csv_btn);
            }
            if(ExportLogic_export_to_excel_local) {
                const excel_btn = create_element('button', {
                    class_name: ['button', 'button-default'],
                    html_content: `<span>${t('export_to_excel')}</span>` + icon_export_svg
                });
                excel_btn.addEventListener('click', handle_export_excel);
                left_actions_group.appendChild(excel_btn);
            }
        }

        if (left_actions_group.hasChildNodes()) actions_div.appendChild(left_actions_group);
        if (right_actions_group.hasChildNodes()) actions_div.appendChild(right_actions_group);
        if (actions_div.hasChildNodes()) section3.appendChild(actions_div);
        plate_element.appendChild(section3);
    }

    function destroy() {
        if (sample_list_component_instance && typeof sample_list_component_instance.destroy === 'function') {
            sample_list_component_instance.destroy();
        }
        if (add_sample_form_component_instance && typeof add_sample_form_component_instance.destroy === 'function') {
            add_sample_form_component_instance.destroy();
        }
        if (save_audit_button_component_instance && typeof save_audit_button_component_instance.destroy === 'function') {
            save_audit_button_component_instance.destroy();
        }
        // MetadataDisplayComponent har ingen egen destroy-logik just nu, den bara renderas in i en container som rensas.
        sample_list_container_element = null;
        add_sample_form_container_element = null;
        save_audit_button_container_element = null;
        sample_list_component_instance = null;
        add_sample_form_component_instance = null;
        save_audit_button_component_instance = null;
        is_add_sample_form_visible = false;
        add_sample_button_ref = null;
        previously_focused_element = null;
        global_message_element_ref = null;
        local_getState = null;
        local_dispatch = null;
        local_StoreActionTypes = null;
        Translation_t_local = null;
        NotificationComponent_show_global_message_local = null;
        NotificationComponent_clear_global_message_local = null;
        NotificationComponent_get_global_message_element_reference_local = null;
        ExportLogic_export_to_csv_local = null;
        ExportLogic_export_to_excel_local = null;
        AuditLogic_calculate_overall_audit_progress_local = null;
    }

    return { init, render, destroy };
})();

export const AuditOverviewComponent = AuditOverviewComponent_internal;