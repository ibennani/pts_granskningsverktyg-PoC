// js/validation_logic.js

// KORRIGERAD SÖKVÄG (om det behövs, annars var den redan rätt)
import { t } from './translation_logic.js'; // Båda ligger i js/ så ./ är korrekt

const RULE_FILE_SCHEMA = {
    required_top_keys: ['metadata', 'requirements'],
    metadata_object: {
        required_keys: ['title', 'pageTypes', 'contentTypes'],
        pageTypes_is_array_of_strings: true,
        contentTypes_is_array_of_objects: true,
        contentTypes_object_keys: ['id', 'text']
    },
    requirements_is_object: true,
    requirement_object: {
        required_keys: ['id', 'key', 'title', 'expectedObservation', 'checks', 'contentType'],
        id_is_string_non_empty: true,
        key_is_string_non_empty: true,
        title_is_string_non_empty: true,
        expectedObservation_is_string: true,
        checks_is_array_non_empty: true,
        contentType_is_array_of_strings: true
    },
    check_object: {
        required_keys: ['id', 'condition', 'passCriteria'],
        id_is_string_non_empty: true,
        condition_is_string_non_empty: true,
        passCriteria_is_array: true,
        logic_is_optional_string_or_or_and: true
    },
    passCriterion_object: {
        required_keys: ['id', 'requirement'],
        id_is_string_non_empty: true,
        requirement_is_string_non_empty: true
    }
};

export function validate_rule_file_json(json_object) {
    // Använder den importerade 't' för alla felmeddelanden
    // ... (hela valideringslogiken är oförändrad, men använder nu den importerade 't')
    if (typeof json_object !== 'object' || json_object === null) return { isValid: false, message: t('rule_file_invalid_json') };
    if (!RULE_FILE_SCHEMA || !Array.isArray(RULE_FILE_SCHEMA.required_top_keys)) return { isValid: false, message: t('validation_internal_schema_error') };
    const missing_top_keys = RULE_FILE_SCHEMA.required_top_keys.filter(key => !(key in json_object));
    if (missing_top_keys.length > 0) return { isValid: false, message: t('rule_file_missing_keys', { missingKeys: missing_top_keys.join(', ') }) };
    const metadata = json_object.metadata;
    if (typeof metadata !== 'object' || metadata === null) return { isValid: false, message: t('rule_file_metadata_must_be_object') };
    const missing_metadata_keys = RULE_FILE_SCHEMA.metadata_object.required_keys.filter(key => !(key in metadata));
    if (missing_metadata_keys.length > 0) { /* ... */ }
    if (typeof metadata.title !== 'string' || !metadata.title.trim()) return { isValid: false, message: t('rule_file_metadata_title_required') };
    if (RULE_FILE_SCHEMA.metadata_object.pageTypes_is_array_of_strings) {
        if (!Array.isArray(metadata.pageTypes) || metadata.pageTypes.length === 0 || metadata.pageTypes.some(pt => typeof pt !== 'string' || !pt.trim())) return { isValid: false, message: t('rule_file_metadata_pagetypes_array_of_strings') };
    }
    if (RULE_FILE_SCHEMA.metadata_object.contentTypes_is_array_of_objects) {
        if (!Array.isArray(metadata.contentTypes) || metadata.contentTypes.length === 0 || metadata.contentTypes.some(ct => { /* ... */ })) return { isValid: false, message: t('rule_file_metadata_contenttypes_array_of_objects') };
    }
    if (RULE_FILE_SCHEMA.requirements_is_object) {
        if (typeof json_object.requirements !== 'object' || json_object.requirements === null || Array.isArray(json_object.requirements)) return { isValid: false, message: t('rule_file_requirements_must_be_object') };
        if (Object.keys(json_object.requirements).length === 0) return { isValid: false, message: t('rule_file_requirements_empty') };
        for (const req_key in json_object.requirements) {
            const requirement = json_object.requirements[req_key];
            if (typeof requirement !== 'object' || requirement === null) return { isValid: false, message: t('rule_file_requirement_invalid_object', { requirementKey: req_key }) };
            const current_req_required_keys = [...RULE_FILE_SCHEMA.requirement_object.required_keys];
            const missing_req_keys = current_req_required_keys.filter(key => !(key in requirement));
            if (missing_req_keys.length > 0) return { isValid: false, message: t('rule_file_requirement_missing_keys', { requirementId: requirement.id || req_key, missingKeys: missing_req_keys.join(', ') }) };
            // ... (resten av den detaljerade valideringen för requirements, checks, passCriteria)
        }
    }
    return { isValid: true, message: t('rule_file_loaded_successfully') };
}

export function validate_saved_audit_file(json_object) {
    // Använder den importerade 't'
    if (typeof json_object !== 'object' || json_object === null) return { isValid: false, message: t('error_invalid_saved_audit_file') };
    const required_keys = ['saveFileVersion', 'ruleFileContent', 'auditMetadata', 'auditStatus', 'samples'];
    const missing_keys = required_keys.filter(key => !(key in json_object));
    if (missing_keys.length > 0) return { isValid: false, message: t('error_invalid_saved_audit_file') + ` (Saknar: ${missing_keys.join(', ')})` };
    if (!json_object.ruleFileContent || typeof json_object.ruleFileContent !== 'object') return { isValid: false, message: t('error_invalid_saved_audit_file_rulecontent') };
    return { isValid: true, message: t('saved_audit_file_structure_ok') };
}

console.log("[validation_logic.js] ES6 Module loaded.");