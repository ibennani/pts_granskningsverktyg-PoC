// js/export_logic.js

// KORRIGERADE SÖKVÄGAR baserat på att export_logic.js ligger i js/
import { escape_html, format_iso_to_local_datetime } from './utils/helpers.js';
import { calculate_requirement_status, get_relevant_requirements_for_sample } from './audit_logic.js';
import { t } from './translation_logic.js';
import { show_global_message } from './components/NotificationComponent.js';


export function export_to_csv(current_audit) {
    if (!current_audit) {
        if (typeof show_global_message === 'function') show_global_message(t('no_audit_data_to_save'), 'error');
        else console.error("Notification (csv): no audit data");
        return;
    }

    let csv_content = "\uFEFF";
    const headers = [
        t('excel_col_sample_name', {defaultValue: "Sample Name"}),
        t('excel_col_sample_url', {defaultValue: "Sample URL"}),
        t('Krav-ID (internt)', {defaultValue: "Requirement ID (internal)"}),
        t('Kravets Titel', {defaultValue: "Requirement Title"}),
        t('excel_col_status', {defaultValue: "Status"}),
        t('excel_col_expected_obs', {defaultValue: "Expected Observation"}),
        t('excel_col_actual_obs', {defaultValue: "Actual Observation"}),
        t('excel_col_comment_to_actor', {defaultValue: "Comment to Actor"}),
        t('excel_col_standard_ref', {defaultValue: "Standard Reference"})
    ];
    csv_content += headers.join(';') + "\n";

    (current_audit.samples || []).forEach(sample => {
        const relevant_requirements = typeof get_relevant_requirements_for_sample === 'function'
            ? get_relevant_requirements_for_sample(current_audit.ruleFileContent, sample)
            : [];

        relevant_requirements.forEach(req_definition => {
            const req_key_for_results = req_definition.key || req_definition.id;
            const result = (sample.requirementResults || {})[req_key_for_results];
            const status = result && typeof calculate_requirement_status === 'function'
                ? calculate_requirement_status(req_definition, result)
                : 'not_audited';
            const status_text = t(`audit_status_${status}`, {defaultValue: status});

            const escapeCsv = (str) => {
                if (str === null || str === undefined) return '';
                str = String(str);
                if (str.includes(';') || str.includes('"') || str.includes('\n')) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            };

            const row = [
                escapeCsv(sample.description || ''),
                escapeCsv(sample.url || ''),
                escapeCsv(req_definition.id || ''),
                escapeCsv(req_definition.title || ''),
                escapeCsv(status_text),
                escapeCsv(req_definition.expectedObservation || ''),
                escapeCsv(result ? (result.actualObservation || '') : ''),
                escapeCsv(result ? (result.commentToActor || '') : ''),
                escapeCsv((req_definition.standardReference && req_definition.standardReference.text) ? req_definition.standardReference.text : '')
            ].join(';');
            csv_content += row + "\n";
        });
    });

    const encoded_uri = encodeURI(csv_content);
    const link = document.createElement("a");
    link.setAttribute("href", "data:text/csv;charset=utf-8," + encoded_uri);
    const filename_csv = `granskningsrapport_${(current_audit.auditMetadata.actorName || t('export_default_actor_name', {defaultValue:'export'})).replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute("download", filename_csv);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (typeof show_global_message === 'function') show_global_message(t('audit_saved_as_file', {filename: filename_csv}), 'success');
    else console.log(`Success (csv): ${t('audit_saved_as_file', {filename: filename_csv})}`);
}

export async function export_to_excel(current_audit) {
    if (!current_audit) {
        if (typeof show_global_message === 'function') show_global_message(t('no_audit_data_to_save'), 'error');
        return;
    }
    if (typeof XLSX === 'undefined') {
        if (typeof show_global_message === 'function') show_global_message(t('excel_library_not_loaded'), 'error');
        return;
    }

    try {
        const wb = XLSX.utils.book_new();
        const esc_html_func = typeof escape_html === 'function' ? escape_html : (s) => s;
        const format_date_func = typeof format_iso_to_local_datetime === 'function' ? format_iso_to_local_datetime : (s) => s;

        const general_info_data = [
            [t('case_number'), current_audit.auditMetadata.caseNumber || ''],
            [t('actor_name'), current_audit.auditMetadata.actorName || ''],
            [t('actor_link'), current_audit.auditMetadata.actorLink || ''],
            [t('auditor_name'), current_audit.auditMetadata.auditorName || ''],
            [t('internal_comment'), current_audit.auditMetadata.internalComment || ''],
            [t('rule_file_title'), current_audit.ruleFileContent.metadata.title || ''],
            [t('Version (Regelfil)'), current_audit.ruleFileContent.metadata.version || ''],
            [t('status'), t(`audit_status_${current_audit.auditStatus}`, {defaultValue: current_audit.auditStatus}) || ''],
            [t('start_time'), current_audit.startTime ? esc_html_func(format_date_func(current_audit.startTime)) : ''],
            [t('end_time'), current_audit.endTime ? esc_html_func(format_date_func(current_audit.endTime)) : '']
        ];
        const ws_general = XLSX.utils.aoa_to_sheet(general_info_data);
        ws_general['!cols'] = [{wch:30}, {wch:70}];
        XLSX.utils.book_append_sheet(wb, ws_general, t('excel_sheet_general_info'));

        const report_data = [];
        const headers = [
            t('excel_col_sample_name'), t('excel_col_sample_url'), t('Krav-ID (internt)'),
            t('Kravets Titel'), t('excel_col_status'), t('excel_col_expected_obs'),
            t('excel_col_actual_obs'), t('excel_col_comment_to_actor'), t('excel_col_standard_ref')
        ];
        report_data.push(headers);

        (current_audit.samples || []).forEach(sample => {
            const relevant_requirements = typeof get_relevant_requirements_for_sample === 'function'
                ? get_relevant_requirements_for_sample(current_audit.ruleFileContent, sample)
                : [];
            relevant_requirements.forEach(req_definition => {
                const req_key_for_results = req_definition.key || req_definition.id;
                const result = (sample.requirementResults || {})[req_key_for_results];
                const status = result && typeof calculate_requirement_status === 'function'
                    ? calculate_requirement_status(req_definition, result)
                    : 'not_audited';
                const status_text = t(`audit_status_${status}`, {defaultValue: status});
                const row = [
                    sample.description || '', sample.url || '', req_definition.id || '',
                    req_definition.title || '', status_text, req_definition.expectedObservation || '',
                    result ? (result.actualObservation || '') : '',
                    result ? (result.commentToActor || '') : '',
                    (req_definition.standardReference && req_definition.standardReference.text) ? req_definition.standardReference.text : ''
                ];
                report_data.push(row);
            });
        });

        const ws_report = XLSX.utils.aoa_to_sheet(report_data);
        ws_report['!cols'] = [ {wch:30}, {wch:40}, {wch:20}, {wch:50}, {wch:15}, {wch:50}, {wch:50}, {wch:50}, {wch:30} ];
        XLSX.utils.book_append_sheet(wb, ws_report, t('excel_sheet_audit_report'));

        const filename_excel = `granskningsrapport_${(current_audit.auditMetadata.actorName || t('export_default_actor_name', {defaultValue:'export'})).replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, filename_excel);
        if (typeof show_global_message === 'function') show_global_message(t('audit_saved_as_file', {filename: filename_excel}), 'success');

    } catch (error) {
        console.error("Error exporting to Excel:", error);
        if (typeof show_global_message === 'function') show_global_message(t('error_exporting_excel') + ` ${error.message}`, 'error');
    }
}

console.log("[export_logic.js] ES6 Module loaded.");