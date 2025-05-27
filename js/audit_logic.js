// file: js/audit_logic.js

// KORRIGERAD SÖKVÄG (om det behövs, annars var den redan rätt)
import { t } from './translation_logic.js'; // Båda ligger i js/ så ./ är korrekt

export function calculate_check_status(check_object, pass_criteria_statuses_map, overall_manual_status = 'not_audited') {
    // ... (oförändrad logik)
    if (overall_manual_status === 'failed') return "passed";
    if (!check_object || !check_object.passCriteria || check_object.passCriteria.length === 0) return overall_manual_status === 'passed' ? 'passed' : 'not_audited';
    let audited_criteria_count = 0, passed_criteria_count_for_or_logic = 0, all_criteria_passed_for_and_logic = true, any_criterion_failed = false;
    const current_pass_criteria_map = pass_criteria_statuses_map || {};
    for (const pc of check_object.passCriteria) {
        const status = current_pass_criteria_map[pc.id] || 'not_audited';
        if (status === "passed") { audited_criteria_count++; passed_criteria_count_for_or_logic++; }
        else if (status === "failed") { audited_criteria_count++; any_criterion_failed = true; all_criteria_passed_for_and_logic = false; }
    }
    if (overall_manual_status === 'passed' && audited_criteria_count === 0) return "not_audited";
    if (audited_criteria_count === 0) return "not_audited";
    if (any_criterion_failed) return "failed";
    if (audited_criteria_count < check_object.passCriteria.length) return "partially_audited";
    if (check_object.logic === "OR") return passed_criteria_count_for_or_logic > 0 ? "passed" : "failed";
    else return all_criteria_passed_for_and_logic ? "passed" : "failed";
}

export function calculate_requirement_status(requirement_object, requirement_result_object) {
    // ... (oförändrad logik)
    if (!requirement_object || !requirement_object.checks || requirement_object.checks.length === 0) return requirement_result_object?.status && requirement_result_object.status !== 'not_audited' ? requirement_result_object.status : "not_audited";
    if (!requirement_result_object || !requirement_result_object.checkResults) return "not_audited";
    let all_checks_passed_or_not_audited_or_partial = true, any_check_failed = false, audited_checks_count = 0, partially_audited_check_exists = false;
    let total_checks = requirement_object.checks.length;
    for (const check_definition of requirement_object.checks) {
        const check_result_data = requirement_result_object.checkResults[check_definition.id];
        const current_check_calculated_status = check_result_data ? check_result_data.status : 'not_audited';
        if (current_check_calculated_status === "failed") { any_check_failed = true; audited_checks_count++; }
        else if (current_check_calculated_status === "passed") { audited_checks_count++; }
        else if (current_check_calculated_status === "partially_audited") { partially_audited_check_exists = true; all_checks_passed_or_not_audited_or_partial = false; }
        else { all_checks_passed_or_not_audited_or_partial = false; }
    }
    if (any_check_failed) return "failed";
    if (partially_audited_check_exists) return "partially_audited";
    if (audited_checks_count === 0 && total_checks > 0) return "not_audited";
    if (audited_checks_count < total_checks) return "partially_audited";
    return "passed";
}

export function get_relevant_requirements_for_sample(rule_file_content, sample) {
    // ... (oförändrad logik)
    if (!rule_file_content || !rule_file_content.requirements || !sample || !sample.selectedContentTypes) return [];
    const all_requirements_array = Object.values(rule_file_content.requirements);
    return all_requirements_array.filter(req => {
        if (!req.contentType || !Array.isArray(req.contentType) || req.contentType.length === 0) return true;
        return req.contentType.some(ct => sample.selectedContentTypes.includes(ct));
    });
}

export function get_ordered_relevant_requirement_keys(rule_file_content, sample_object) {
    // Använder den importerade 't'
    const relevant_req_objects = get_relevant_requirements_for_sample(rule_file_content, sample_object);
    if (!relevant_req_objects || relevant_req_objects.length === 0) return [];

    relevant_req_objects.sort((req_a, req_b) => {
        const main_cat_a_text = req_a.metadata?.mainCategory?.text || t('uncategorized', { defaultValue: 'Uncategorized' });
        const main_cat_b_text = req_b.metadata?.mainCategory?.text || t('uncategorized', { defaultValue: 'Uncategorized' });
        let comparison = main_cat_a_text.localeCompare(main_cat_b_text, undefined, { numeric: true, sensitivity: 'base' });
        if (comparison !== 0) return comparison;

        const sub_cat_a_text = req_a.metadata?.subCategory?.text || t('other_requirements', { defaultValue: 'Other Requirements' });
        const sub_cat_b_text = req_b.metadata?.subCategory?.text || t('other_requirements', { defaultValue: 'Other Requirements' });
        comparison = sub_cat_a_text.localeCompare(sub_cat_b_text, undefined, { numeric: true, sensitivity: 'base' });
        if (comparison !== 0) return comparison;

        const title_a = req_a.title || '';
        const title_b = req_b.title || '';
        return title_a.localeCompare(title_b, undefined, { numeric: true, sensitivity: 'base' });
    });
    return relevant_req_objects.map(req => req.key || req.id);
}

export function calculate_overall_audit_progress(current_audit_data) {
    // ... (oförändrad logik)
    if (!current_audit_data || !current_audit_data.samples || !current_audit_data.ruleFileContent || !current_audit_data.ruleFileContent.requirements) return { audited: 0, total: 0 };
    let total_relevant_requirements_across_samples = 0; let total_completed_requirements_across_samples = 0;
    current_audit_data.samples.forEach((sample) => {
        const relevant_reqs_for_this_sample = get_relevant_requirements_for_sample(current_audit_data.ruleFileContent, sample);
        total_relevant_requirements_across_samples += relevant_reqs_for_this_sample.length;
        relevant_reqs_for_this_sample.forEach((req_definition) => {
            const requirement_key_for_results = req_definition.key || req_definition.id;
            const req_result = sample.requirementResults ? sample.requirementResults[requirement_key_for_results] : null;
            const calculated_status = calculate_requirement_status(req_definition, req_result);
            if (calculated_status === 'passed' || calculated_status === 'failed') total_completed_requirements_across_samples++;
        });
    });
    return { audited: total_completed_requirements_across_samples, total: total_relevant_requirements_across_samples };
}

export function find_first_incomplete_requirement_key_for_sample(rule_file_content, sample_object) {
    // ... (oförändrad logik)
    if (!sample_object || !rule_file_content || !rule_file_content.requirements) return null;
    const ordered_req_keys = get_ordered_relevant_requirement_keys(rule_file_content, sample_object);
    if (!ordered_req_keys || ordered_req_keys.length === 0) return null;
    for (const req_key of ordered_req_keys) {
        const requirement_definition = rule_file_content.requirements[req_key];
        if (!requirement_definition) continue;
        const requirement_result = sample_object.requirementResults ? sample_object.requirementResults[req_key] : null;
        const status = calculate_requirement_status(requirement_definition, requirement_result);
        if (status === 'not_audited' || status === 'partially_audited') return req_key;
    }
    return null;
}

console.log("[audit_logic.js] ES6 Module loaded.");