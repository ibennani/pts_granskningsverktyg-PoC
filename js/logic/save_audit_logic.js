// js/logic/save_audit_logic.js
// Konverterad till ES6-modul

// NYTT: Importera 't' direkt från translation_logic.js (om den skulle behövas direkt här,
// men den tas emot som argument, så ingen direkt import behövs för t-funktionen)
// import { t } from './translation_logic.js';

// Ingen IIFE eller window.SaveAuditLogic behövs längre

// _generate_filename_internal_sal och save_audit_to_json_file
// använder nu den inskickade t_func_param konsekvent.

function _generate_filename_internal_sal(audit_data, t_func_param_for_generate) {
    const now = new Date();
    const date_str = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
    
    // Säkerställ att t_func_param_for_generate är en funktion innan anrop
    const get_t_for_filename = typeof t_func_param_for_generate === 'function'
        ? t_func_param_for_generate
        : (key, rep) => (rep && rep.defaultValue ? rep.defaultValue : key);

    let actor_name_part = get_t_for_filename('default_audit_filename_part', {defaultValue: 'audit'});

    if (audit_data && audit_data.auditMetadata && audit_data.auditMetadata.actorName) {
        actor_name_part = audit_data.auditMetadata.actorName.replace(/[^a-z0-9]/gi, '_').toLowerCase() || actor_name_part;
    }
    return `tillganglighetsgranskning_${actor_name_part}_${date_str}.json`;
}

// Exporterad funktion
export function save_audit_to_json_file(current_audit_data, t_func_param, show_notification_func_param) {
    // Säkerställ att vi har funktioner att anropa, även om de är no-ops eller fallbacks
    const t_effective = typeof t_func_param === 'function'
        ? t_func_param
        : (key, rep) => (rep && rep.defaultValue ? rep.defaultValue : `**${key}** (SAL t missing)`);

    const show_notify_effective = typeof show_notification_func_param === 'function'
        ? show_notification_func_param
        : (msg, type) => console.log(`[SaveAuditLogic] Notify (${type}): ${msg}`);

    if (!current_audit_data) {
        show_notify_effective(t_effective('no_audit_data_to_save'), 'error');
        return;
    }

    const filename = _generate_filename_internal_sal(current_audit_data, t_effective);
    const data_str = JSON.stringify(current_audit_data, null, 2);
    const blob = new Blob([data_str], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    show_notify_effective(t_effective('audit_saved_as_file', { filename: filename }), 'success');
    // console.log(`[SaveAuditLogicMod] Audit saved as ${filename}`);
}

// console.log("[save_audit_logic.js] ES6 Module loaded."); // Redan loggad vid import